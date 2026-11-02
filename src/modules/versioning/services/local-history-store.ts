import { JsonStore } from '../../../shared/json-store';
import type { TextStorage } from '../../../shared/storage/ports';
import { textHash } from '../../../shared/storage/text-edits';
import { VERSIONING_RECOVERY_ROOT } from '../../../shared/storage/vault-layout';
import { storageWriteQueue } from '../../../shared/storage/write-queue';
import { isHistoryPath, type HistoryTrigger, type LocalHistoryEntry } from '../core/local-history';
import { CheckpointStore } from './checkpoint-store';
import type { RestoreCheckpointPort } from '../core/restore';
import type { CaptureAllocation } from '../core/history-retention';
import { readRecoveryCopies } from './recovery-metadata';

interface HistoryIndex {
	version: 1;
	paths: Record<string, string>;
	entries: Record<string, LocalHistoryEntry>;
}
const empty = (): HistoryIndex => ({ version: 1, paths: {}, entries: {} });
const identifier = /^[a-zA-Z0-9_-]{1,120}$/;
const hash = /^[a-f0-9]{64}$/;
function validIndex(value: unknown): value is HistoryIndex {
	if (!value || typeof value !== 'object') return false;
	const index = value as Partial<HistoryIndex>;
	return index.version === 1 && !!index.paths && !!index.entries
		&& typeof index.paths === 'object' && !Array.isArray(index.paths)
		&& typeof index.entries === 'object' && !Array.isArray(index.entries)
		&& Object.entries(index.paths).every(([path, id]) => isHistoryPath(path) && typeof id === 'string' && identifier.test(id))
		&& Object.entries(index.entries).every(([id, entry]) => !!entry && typeof entry === 'object'
			&& identifier.test(id) && entry.id === id && identifier.test(entry.documentId)
			&& typeof entry.path === 'string' && isHistoryPath(entry.path) && hash.test(entry.hash)
			&& Number.isSafeInteger(entry.byteLength) && entry.byteLength >= 0
			&& Number.isFinite(entry.createdAt) && ['interval', 'switch', 'important'].includes(entry.trigger));
}

/** Automatic metadata is independent of the restore journal; both refer to verified immutable objects. */
export class LocalHistoryStore {
	readonly objects: CheckpointStore;
	private readonly path: string;
	private readonly writer: JsonStore<HistoryIndex>;
	private index: HistoryIndex = empty();
	private loaded?: Promise<void>;
	private writerLoaded = false;
	constructor(private readonly storage: TextStorage, device: string, private readonly now = () => Date.now(), objects?: CheckpointStore) {
		this.objects = objects ?? new CheckpointStore(storage, device);
		this.path = `${VERSIONING_RECOVERY_ROOT}/${device}/history/index.json`;
		this.writer = new JsonStore(storage, this.path, validIndex);
	}
	/** Read-only browsing may use a valid backup, but never repairs or rewrites either copy. */
	load(): Promise<void> {
		if (!this.loaded) {
			this.loaded = (async () => {
				let present = false;
				for (const path of [this.path, `${this.path}.backup`]) {
					if (!await this.storage.exists(path)) continue;
					present = true;
					const text = await this.storage.read(path);
					let value: unknown;
					try { value = JSON.parse(text); } catch { continue; }
					if (validIndex(value)) { this.index = value; return; }
				}
				if (present) throw new Error('versioning.localHistory.corrupt');
			})();
			void this.loaded.catch(() => { this.loaded = undefined; });
		}
		return this.loaded;
	}
	async list(path: string): Promise<readonly LocalHistoryEntry[]> {
		await this.load();
		const documentId = this.index.paths[path];
		return Object.values(this.index.entries).reverse().filter(entry => documentId && entry.documentId === documentId)
			.sort((a, b) => b.createdAt - a.createdAt).map(entry => ({ ...entry }));
	}
	async readSnapshot(id: string): Promise<string> {
		await this.load();
		const entry = this.index.entries[id];
		if (!entry) throw new Error('versioning.localHistory.missing');
		return this.objects.readObject(entry.hash);
	}
	async capture(path: string, text: string, trigger: HistoryTrigger, signal?: AbortSignal,
		admit?: (allocation: CaptureAllocation, checkpoints: RestoreCheckpointPort) => Promise<void>): Promise<LocalHistoryEntry | undefined> {
		if (!isHistoryPath(path)) throw new Error('versioning.localHistory.path');
		await this.load();
		const contentHash = await textHash(text), byteLength = new TextEncoder().encode(text).byteLength;
		return this.objects.transaction(async checkpoints => {
			await admit?.({ path, hash: contentHash, byteLength }, checkpoints);
			return storageWriteQueue(this.storage).run(`${this.path}:history`, async () => {
			signal?.throwIfAborted();
			await this.loadWriter(true);
			signal?.throwIfAborted();
			const latest = (await this.list(path))[0];
			if (latest?.hash === contentHash) { await checkpoints.readObject(contentHash); return undefined; }
			signal?.throwIfAborted();
			const object = await checkpoints.putObject(text);
			signal?.throwIfAborted();
			const documentId = this.index.paths[path] ?? crypto.randomUUID();
			const entry: LocalHistoryEntry = { id: crypto.randomUUID(), documentId, path, hash: object,
				byteLength: new TextEncoder().encode(text).byteLength, createdAt: this.now(), trigger };
			this.index = await this.writer.commit({ base: this.index, value: { version: 1,
				paths: { ...this.index.paths, [path]: documentId }, entries: { ...this.index.entries, [entry.id]: entry } } });
			return entry;
			});
		});
	}
	/** Only an explicit host rename carries identity. Deletion retires it so a recreated path starts fresh. */
	async rename(from: string, to: string | null): Promise<void> {
		await this.load();
		await this.objects.transaction(() => storageWriteQueue(this.storage).run(`${this.path}:history`, async () => {
			if (!this.index.paths[from]) return;
			await this.loadWriter();
			const documentId = this.index.paths[from];
			if (!documentId) return;
			const paths = { ...this.index.paths };
			delete paths[from];
			if (to && isHistoryPath(to) && !paths[to]) paths[to] = documentId;
			this.index = await this.writer.commit({ base: this.index, value: { ...this.index, paths } });
		}));
	}
	async retentionState() {
		const state = await readRecoveryCopies(this.storage, this.path, validIndex, empty());
		return { ...state, entries: Object.values(state.current.entries),
			references: new Set(state.copies.flatMap(copy => Object.values(copy.value.entries).map(entry => entry.hash))) };
	}
	/** Caller holds objects.transaction(); rotating both copies makes expired entries unavailable after restart too. */
	async pruneEntries(ids: ReadonlySet<string>, rotateBackup = false): Promise<void> {
		if (!ids.size && !rotateBackup) return;
		await storageWriteQueue(this.storage).run(`${this.path}:history`, async () => {
			await this.loadWriter(true);
			const entries = { ...this.index.entries };
			for (const id of ids) delete entries[id];
			for (let pass = 0; pass < 2; pass++)
				this.index = await this.writer.commit({ base: this.index, value: { ...this.index, entries } });
		});
	}
	private async loadWriter(revalidate = false): Promise<void> {
		if (revalidate || !this.writerLoaded) { this.index = await this.writer.load(this.index); this.writerLoaded = true; }
	}
}

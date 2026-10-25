import { JsonStore } from '../../../shared/json-store';
import { ensureDirectory } from '../../../shared/storage/durable-state';
import type { TextStorage } from '../../../shared/storage/ports';
import { textHash } from '../../../shared/storage/text-edits';
import { VERSIONING_RECOVERY_ROOT } from '../../../shared/storage/vault-layout';
import { storageWriteQueue } from '../../../shared/storage/write-queue';
import { RestoreError, type RestoreCheckpointPort, type RestoreReceipt } from '../core/restore';

interface CheckpointIndex {
	version: 1;
	receipts: Record<string, RestoreReceipt>;
}
const hashPattern = /^[a-f0-9]{64}$/;
const identifier = /^[a-zA-Z0-9_-]{1,120}$/;
const nullableHash = (value: unknown) => value === null || (typeof value === 'string' && hashPattern.test(value));
function validReceipt(value: unknown): value is RestoreReceipt {
	if (!value || typeof value !== 'object') return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item['id'] === 'string' &&
		identifier.test(item['id']) &&
		typeof item['path'] === 'string' &&
		typeof item['sourceId'] === 'string' &&
		typeof item['sourceLabel'] === 'string' &&
		['replace-current', 'create-copy', 'undo', 'undo-copy'].includes(String(item['mode'])) &&
		['prepared', 'applying', 'applied', 'verified', 'aborted', 'needs-review'].includes(String(item['stage'])) &&
		typeof item['createdAt'] === 'number' &&
		Number.isFinite(item['createdAt']) &&
		typeof item['updatedAt'] === 'number' &&
		Number.isFinite(item['updatedAt']) &&
		nullableHash(item['beforeObject']) &&
		nullableHash(item['beforeDiskObject']) &&
		nullableHash(item['afterObject']) &&
		(item['actualDiskObject'] === undefined || nullableHash(item['actualDiskObject'])) &&
		(item['acknowledgedAt'] === undefined ||
			(typeof item['acknowledgedAt'] === 'number' && Number.isFinite(item['acknowledgedAt']))) &&
		typeof item['repositoryBaseline'] === 'string'
	);
}
function validIndex(value: unknown): value is CheckpointIndex {
	if (
		!value ||
		typeof value !== 'object' ||
		!('version' in value) ||
		value.version !== 1 ||
		!('receipts' in value) ||
		!value.receipts ||
		typeof value.receipts !== 'object' ||
		Array.isArray(value.receipts)
	)
		return false;
	return Object.entries(value.receipts).every(
		([key, receipt]) => identifier.test(key) && validReceipt(receipt) && receipt.id === key,
	);
}

/** Verified content-addressed snapshots plus a durable phase journal. Reads never repair notes or replay a restore. */
export class CheckpointStore implements RestoreCheckpointPort {
	private readonly root: string;
	private readonly store: JsonStore<CheckpointIndex>;
	private index: CheckpointIndex = { version: 1, receipts: {} };
	private loading?: Promise<void>;
	private writerLoading?: Promise<void>;
	constructor(
		private readonly storage: TextStorage,
		device: string,
	) {
		if (!identifier.test(device)) throw new RestoreError('checkpoint-corrupt');
		this.root = `${VERSIONING_RECOVERY_ROOT}/${device}`;
		this.store = new JsonStore(storage, `${this.root}/journal.json`, validIndex);
	}
	load(): Promise<void> {
		if (!this.loading) {
			const operation = this.readIndex().then((value) => {
				this.index = value;
			});
			this.loading = operation;
			void operation.catch(() => {
				if (this.loading === operation) this.loading = undefined;
			});
		}
		return this.loading;
	}
	/** Browsing checkpoints cannot trigger JsonStore's corrupt-file preservation write. */
	private async readIndex(): Promise<CheckpointIndex> {
		const path = `${this.root}/journal.json`,
			exists = await this.storage.exists(path);
		const decode = (text: string): CheckpointIndex | undefined => {
			try {
				const value: unknown = JSON.parse(text);
				return validIndex(value) ? value : undefined;
			} catch {
				return undefined;
			}
		};
		const primary = exists ? decode(await this.storage.read(path)) : undefined;
		if (primary) return primary;
		if (await this.storage.exists(`${path}.backup`)) {
			const backup = decode(await this.storage.read(`${path}.backup`));
			if (backup) return backup;
			throw new RestoreError('checkpoint-corrupt');
		}
		if (exists) throw new RestoreError('checkpoint-corrupt');
		return { version: 1, receipts: {} };
	}
	private async loadWriter(): Promise<void> {
		if (!this.writerLoading) {
			const operation = this.store.load(this.index).then((value) => {
				this.index = value;
			});
			this.writerLoading = operation;
			void operation.catch(() => {
				if (this.writerLoading === operation) this.writerLoading = undefined;
			});
		}
		await this.writerLoading;
	}
	receipts(): readonly RestoreReceipt[] {
		return Object.values(this.index.receipts)
			.map((receipt) => structuredClone(receipt))
			.sort((a, b) => b.createdAt - a.createdAt);
	}
	async putObject(text: string): Promise<string> {
		const hash = await textHash(text),
			path = `${this.root}/objects/${hash}.txt`;
		await storageWriteQueue(this.storage).run(path, async () => {
			if (await this.storage.exists(path)) {
				if ((await this.storage.read(path)) !== text) throw new RestoreError('checkpoint-corrupt');
				return;
			}
			await ensureDirectory(this.storage, `${this.root}/objects`);
			await this.storage.write(path, text);
			if ((await this.storage.read(path)) !== text) throw new RestoreError('checkpoint-corrupt');
		});
		return hash;
	}
	async readObject(hash: string): Promise<string> {
		if (!hashPattern.test(hash)) throw new RestoreError('checkpoint-corrupt');
		const text = await this.storage.read(`${this.root}/objects/${hash}.txt`);
		if ((await textHash(text)) !== hash) throw new RestoreError('checkpoint-corrupt');
		return text;
	}
	async putReceipt(receipt: RestoreReceipt): Promise<void> {
		await this.load();
		if (!validReceipt(receipt)) throw new RestoreError('checkpoint-corrupt');
		await storageWriteQueue(this.storage).run(`${this.root}:receipts`, async () => {
			await this.loadWriter();
			this.index = await this.store.commit({
				base: this.index,
				value: { version: 1, receipts: { ...this.index.receipts, [receipt.id]: structuredClone(receipt) } },
			});
		});
	}
}

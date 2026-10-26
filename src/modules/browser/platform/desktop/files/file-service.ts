import { constants, promises as fs, type Stats } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { SecretProtector } from '../../../../../host/desktop/secret-protector';
import { BrowserFileError, cloneFileScope, sameFileScope, safeBrowserFilename, validFileScope, type BrowserFile, type BrowserFileScope, type BrowserFileGrant, type BrowserDownload, type BrowserFileServicePort } from '../../../core/files';
import { atomicPrivateFile, isMissing, privateDirectory, sameFile, readPrivateFile, syncDirectory } from '../persistence/private-files';
import { openPayload, sealPayload } from '../persistence/sealed-payload';

const MAX_FILE = 100 * 1024 * 1024, MAX_TOTAL = 512 * 1024 * 1024, MAX_FILES = 128;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
interface StoredFile { file: BrowserFile; persistent: boolean }
const copyFile = (file: BrowserFile): BrowserFile => ({ ...file, scope: cloneFileScope(file.scope) });
const copyDownload = (download: BrowserDownload): BrowserDownload => ({ ...download, scope: cloneFileScope(download.scope) });

/** A fixed, streamed copy rejects links, content replacement and growth; no path is serialized in metadata. */
async function fixedCopy(source: string, target?: string): Promise<{ size: number; sha256: string }> {
	let initial;
	try { initial = await fs.lstat(source); } catch (error) { if (isMissing(error)) throw new BrowserFileError('file_missing'); throw error; }
	if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1) throw new BrowserFileError('file_path_invalid');
	if (initial.size > MAX_FILE) throw new BrowserFileError('file_too_large');
	const input = await fs.open(source, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	let output: Awaited<ReturnType<typeof fs.open>> | undefined;
	try {
		const before = await input.stat(); if (!sameFile(initial, before)) throw new BrowserFileError('file_changed');
		if (target) output = await fs.open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
		const buffer = Buffer.alloc(65536), hash = createHash('sha256'); let total = 0;
		try {
			for (;;) {
				const { bytesRead } = await input.read(buffer, 0, buffer.length, null); if (!bytesRead) break; total += bytesRead;
				if (total > MAX_FILE || total > before.size) throw new BrowserFileError('file_too_large'); hash.update(buffer.subarray(0, bytesRead));
				if (output) { let offset = 0; while (offset < bytesRead) { const written = await output.write(buffer, offset, bytesRead - offset, null); if (!written.bytesWritten) throw new BrowserFileError('file_changed'); offset += written.bytesWritten; } }
			}
			const after = await input.stat(), current = await fs.lstat(source);
			if (total !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || !sameFile(before, current)) throw new BrowserFileError('file_changed');
			await output?.sync(); return { size: total, sha256: hash.digest('hex') };
		} finally { buffer.fill(0); }
	} finally { await input.close(); await output?.close(); }
}
export class DesktopBrowserFileService implements BrowserFileServicePort {
	readonly ready: Promise<void>;
	private readonly files = new Map<string, StoredFile>();
	private readonly grants = new Map<string, BrowserFileGrant>();
	private readonly downloads = new Map<string, BrowserDownload>();
	private readonly removed = new Set<string>();
	private readonly generations = new Map<string, number>();
	private tail: Promise<unknown> = Promise.resolve();
	private closed = false; private secure = false; private directory = '';
	private disposal?: Promise<void>;
	private directoryIdentity?: Stats;
	private dataIdentity?: Stats;
	constructor(private readonly options: {
		directory: string; downloadDirectory: (spaceId: string) => string; metadataProtector: SecretProtector; metadataScope: string;
		assertOwner?: () => void | Promise<void>; allowEphemeralFiles?: (scope: BrowserFileScope) => boolean;
		cancelDownload?: (spaceId: string, id: string) => Promise<void>; now?: () => number;
	}) { this.ready = this.load(); }
	private now(): number { return this.options.now?.() ?? Date.now(); }
	private get metadata(): string { return path.join(this.directory, 'metadata.sealed'); }
	private get purpose(): string { return `huhu-browser-files:${this.options.metadataScope}:v1`; }
	private filePath(id: string): string { if (!UUID.test(id)) throw new BrowserFileError('file_missing'); return path.join(this.directory, 'data', id); }
	private ephemeralMarker(id: string): string { return `${this.filePath(id)}.ephemeral`; }
	private async unlinkManaged(id: string): Promise<void> { await this.owner(); await fs.rm(this.filePath(id), { force: true }); await fs.rm(this.ephemeralMarker(id), { force: true }); }
	private check(scope?: BrowserFileScope, generation?: number): void {
		if (this.closed) throw new BrowserFileError('file_closed');
		if (scope && (!validFileScope(scope) || this.removed.has(scope.spaceId) || generation !== undefined && (this.generations.get(scope.spaceId) ?? 0) !== generation)) throw new BrowserFileError('file_scope_mismatch');
	}
	private async owner(): Promise<void> {
		await this.options.assertOwner?.();
		if (!this.directoryIdentity || !this.dataIdentity || await fs.realpath(this.options.directory) !== this.directory) throw new BrowserFileError('file_path_invalid');
		const current = await fs.lstat(this.directory), data = await fs.lstat(path.join(this.directory, 'data'));
		if (!current.isDirectory() || current.isSymbolicLink() || !sameFile(current, this.directoryIdentity) || !data.isDirectory() || data.isSymbolicLink() || !sameFile(data, this.dataIdentity)) throw new BrowserFileError('file_path_invalid');
	}
	private enqueue<T>(work: () => Promise<T>): Promise<T> { const task = this.tail.then(work, work); this.tail = task.catch(() => undefined); return task; }
	private async load(): Promise<void> {
		await this.options.assertOwner?.(); this.directory = await privateDirectory(this.options.directory);
		const data = await privateDirectory(path.join(this.directory, 'data'));
		this.directoryIdentity = await fs.lstat(this.directory); this.dataIdentity = await fs.lstat(data);
		this.secure = (await this.options.metadataProtector.status()) === 'available';
		let bytes: Buffer | undefined;
		try { bytes = await readPrivateFile(this.metadata, 4 * 1024 * 1024); } catch (error) { if (!isMissing(error)) throw error; }
		if (bytes) {
			if (!this.secure) throw new BrowserFileError('key_unavailable');
			const raw = JSON.parse(await openPayload(this.options.metadataProtector, bytes.toString('utf8'), this.purpose)) as { version: number; files: BrowserFile[] };
			if (raw.version !== 1 || !Array.isArray(raw.files) || raw.files.length > MAX_FILES) throw new BrowserFileError('file_corrupt');
			for (const file of raw.files) {
				if (!file || !UUID.test(file.id) || this.files.has(file.id) || !validFileScope(file.scope) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE || typeof file.name !== 'string' || file.name !== safeBrowserFilename(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256) || !['upload', 'download'].includes(file.kind) || file.state !== 'ready') throw new BrowserFileError('file_corrupt');
				let stored: Stats;
				try { stored = await fs.lstat(this.filePath(file.id)); } catch { throw new BrowserFileError('file_corrupt'); }
				if (!stored.isFile() || stored.isSymbolicLink() || stored.nlink !== 1 || stored.size !== file.size) throw new BrowserFileError('file_corrupt');
				this.files.set(file.id, { file: copyFile(file), persistent: true });
			}
			if (this.total() > MAX_TOTAL) throw new BrowserFileError('file_quota');
		}
		const names = await fs.readdir(data); if (names.length > MAX_FILES * 3) throw new BrowserFileError('file_quota');
		const ephemeral = new Set(names.filter((name) => name.endsWith('.ephemeral') && UUID.test(name.slice(0, -10))).map((name) => name.slice(0, -10))), cleanup: string[] = [];
		for (const name of names) {
			if (this.files.has(name)) continue;
			const markerId = name.endsWith('.ephemeral') ? name.slice(0, -10) : undefined;
			if (!UUID.test(name) && !(name.endsWith('.stage') && UUID.test(name.slice(0, -6))) && !(markerId && ephemeral.has(markerId))) throw new BrowserFileError('file_corrupt');
			const file = path.join(data, name), stat = await fs.lstat(file);
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new BrowserFileError('file_path_invalid');
			if (markerId && (stat.size !== 0 || this.files.has(markerId))) throw new BrowserFileError('file_corrupt');
			if (!bytes && UUID.test(name) && !ephemeral.has(name)) throw new BrowserFileError('file_corrupt');
			cleanup.push(file);
		}
		await this.owner(); for (const file of cleanup) await fs.unlink(file);
		await syncDirectory(data);
		if (!bytes && this.secure) await this.persist();
	}
	private total(): number { return [...this.files.values()].reduce((total, item) => total + item.file.size, 0); }
	private quota(size: number): void { if (size > MAX_FILE) throw new BrowserFileError('file_too_large'); if (this.files.size >= MAX_FILES || this.total() + size > MAX_TOTAL) throw new BrowserFileError('file_quota'); }
	private persistent(scope: BrowserFileScope): boolean {
		const ephemeral = this.options.allowEphemeralFiles?.(scope) === true;
		if (!this.secure && !ephemeral) throw new BrowserFileError('key_unavailable'); return this.secure && !ephemeral;
	}
	private async persist(): Promise<void> {
		if (!this.secure) return; await this.owner();
		const text = JSON.stringify({ version: 1, files: [...this.files.values()].filter((item) => item.persistent).map((item) => item.file) });
		const sealed = await sealPayload(this.options.metadataProtector, text, this.purpose); await this.owner(); await atomicPrivateFile(this.metadata, sealed);
	}
	private async capture(source: string, name: string, scope: BrowserFileScope, kind: BrowserFile['kind'], generation: number): Promise<BrowserFile> {
		this.check(scope, generation); const persistent = this.persistent(scope), id = randomUUID(), temporary = path.join(this.directory, 'data', `${id}.stage`), target = this.filePath(id);
		const parent = await privateDirectory(path.dirname(target)); let published = false;
		try {
			const initial = await fs.lstat(source); this.quota(initial.size);
			if (!persistent) await atomicPrivateFile(this.ephemeralMarker(id), '', true);
			const fixed = await fixedCopy(source, temporary); this.check(scope, generation); await this.owner(); this.quota(fixed.size);
			await fs.link(temporary, target); await fs.unlink(temporary); await syncDirectory(parent); published = true;
			const file: BrowserFile = { id, name: safeBrowserFilename(name), ...fixed, kind, state: 'ready', scope: cloneFileScope(scope), createdAt: this.now() };
			this.files.set(id, { file, persistent });
			try { await this.persist(); this.check(scope, generation); } catch (error) { this.files.delete(id); throw error; }
			return copyFile(file);
		} catch (error) { if (published) { await this.owner(); await fs.rm(target, { force: true }); } throw error; }
		finally { await this.owner(); await fs.rm(temporary, { force: true }); if (!this.files.has(id)) await fs.rm(this.ephemeralMarker(id), { force: true }); }
	}
	grantUpload(source: string, inputScope: BrowserFileScope): Promise<{ file: BrowserFile; grant: BrowserFileGrant }> {
		this.check(inputScope); const scope = cloneFileScope(inputScope), generation = this.generations.get(scope.spaceId) ?? 0;
		return this.enqueue(async () => { await this.ready; this.check(scope, generation); await this.owner();
			const file = await this.capture(source, path.basename(source), scope, 'upload', generation);
			const grant: BrowserFileGrant = { id: randomUUID(), fileId: file.id, scope, expiresAt: this.now() + 300000 }; this.grants.set(file.id, grant);
			return { file, grant: { ...grant, scope: cloneFileScope(scope) } };
		});
	}
	consumeUpload(fileId: string, inputScope: BrowserFileScope): Promise<string> {
		this.check(inputScope); const scope = cloneFileScope(inputScope), generation = this.generations.get(scope.spaceId) ?? 0;
		return this.enqueue(async () => { await this.ready; this.check(scope, generation); await this.owner(); const grant = this.grants.get(fileId), stored = this.files.get(fileId);
			if (!grant || !stored || grant.expiresAt <= this.now()) throw new BrowserFileError('file_grant_invalid');
			if (!sameFileScope(grant.scope, scope)) throw new BrowserFileError('file_scope_mismatch');
			this.grants.delete(fileId);
			const fixed = await fixedCopy(this.filePath(fileId)); this.check(scope, generation);
			if (fixed.size !== stored.file.size || fixed.sha256 !== stored.file.sha256) throw new BrowserFileError('file_changed'); return this.filePath(fileId);
		});
	}
	beginDownload(id: string, pageId: string, inputScope: BrowserFileScope, name: string): void {
		this.check(inputScope); if (!UUID.test(id) || !/^[a-zA-Z0-9_-]{1,160}$/.test(pageId)) throw new BrowserFileError('file_path_invalid');
		const previous = this.downloads.get(id);
		if (previous) { if (!sameFileScope(previous.scope, inputScope) || previous.pageId !== pageId) throw new BrowserFileError('file_scope_mismatch'); return; }
		if (this.downloads.size >= 128) throw new BrowserFileError('file_quota');
		this.downloads.set(id, { id, pageId, scope: cloneFileScope(inputScope), name: safeBrowserFilename(name), state: 'in-progress', receivedBytes: 0, totalBytes: 0 });
	}
	updateDownload(id: string, progress: { state: 'inProgress' | 'completed' | 'canceled'; receivedBytes: number; totalBytes?: number }): Promise<BrowserDownload> {
		const item = this.downloads.get(id); if (!item) return Promise.reject(new BrowserFileError('download_unknown'));
		const generation = this.generations.get(item.scope.spaceId) ?? 0;
		return this.enqueue(async () => { await this.ready; this.check(item.scope, generation);
			if (item.state !== 'in-progress') return copyDownload(item);
			if (!Number.isSafeInteger(progress.receivedBytes) || progress.receivedBytes < 0 || progress.totalBytes !== undefined && (!Number.isSafeInteger(progress.totalBytes) || progress.totalBytes < 0)) throw new BrowserFileError('file_corrupt');
			item.receivedBytes = Math.max(item.receivedBytes, progress.receivedBytes); item.totalBytes = progress.totalBytes ?? item.totalBytes;
			const receiving = [...this.downloads.values()].filter((download) => download.state === 'in-progress').reduce((total, download) => total + download.receivedBytes, 0);
			if (item.receivedBytes > MAX_FILE || item.totalBytes > MAX_FILE || this.total() + receiving > MAX_TOTAL) {
				item.state = 'failed'; item.error = 'file_too_large'; await this.options.cancelDownload?.(item.scope.spaceId, id).catch(() => undefined); return copyDownload(item);
			}
			if (progress.state === 'canceled') { item.state = 'canceled'; return copyDownload(item); }
			if (progress.state === 'completed') {
				try {
					const directory = await privateDirectory(this.options.downloadDirectory(item.scope.spaceId)), source = path.join(directory, id);
					const file = await this.capture(source, item.name, item.scope, 'download', generation);
					this.check(item.scope, generation); item.fileId = file.id; item.state = 'completed'; item.receivedBytes = file.size;
					await fs.rm(source, { force: true }); await syncDirectory(directory);
				} catch (error) { item.state = 'failed'; item.error = error instanceof BrowserFileError ? error.code : 'file_corrupt'; }
			}
			return copyDownload(item);
		});
	}
	listFiles(scope: BrowserFileScope): BrowserFile[] { this.check(scope); return [...this.files.values()].filter((item) => sameFileScope(item.file.scope, scope)).map((item) => copyFile(item.file)); }
	listDownloads(scope: BrowserFileScope): BrowserDownload[] { this.check(scope); return [...this.downloads.values()].filter((item) => sameFileScope(item.scope, scope)).map(copyDownload); }
	listSpaceFiles(spaceId: string): BrowserFile[] { this.check(); return [...this.files.values()].filter((item) => item.file.scope.spaceId === spaceId).map((item) => copyFile(item.file)); }
	listSpaceDownloads(spaceId: string): BrowserDownload[] { this.check(); return [...this.downloads.values()].filter((item) => item.scope.spaceId === spaceId).map(copyDownload); }
	exportForUser(spaceId: string, id: string, destination: string): Promise<void> {
		return this.enqueue(async () => { await this.ready; this.check(); await this.owner(); const stored = this.files.get(id);
			if (!stored || stored.file.scope.spaceId !== spaceId) throw new BrowserFileError('file_scope_mismatch');
			if (!path.isAbsolute(destination)) throw new BrowserFileError('file_path_invalid');
			const directory = await fs.realpath(path.dirname(destination)), target = path.join(directory, path.basename(destination)), temporary = path.join(directory, `.huhu-export-${randomUUID()}.tmp`);
			try {
				const fixed = await fixedCopy(this.filePath(id), temporary);
				await this.owner();
				if (fixed.size !== stored.file.size || fixed.sha256 !== stored.file.sha256) throw new BrowserFileError('file_changed');
				try { await fs.link(temporary, target); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new BrowserFileError('file_exists'); throw error; }
				await fs.unlink(temporary);
				await syncDirectory(directory);
			} finally { await fs.rm(temporary, { force: true }); }
		});
	}
	removeFile(spaceId: string, id: string): Promise<void> {
		if (this.files.get(id)?.file.scope.spaceId === spaceId) this.grants.delete(id);
		return this.enqueue(async () => { await this.ready; this.check(); await this.owner(); const stored = this.files.get(id);
			if (!stored || stored.file.scope.spaceId !== spaceId) throw new BrowserFileError('file_scope_mismatch');
			this.files.delete(id);
			try { await this.persist(); } catch (error) { this.files.set(id, stored); throw error; }
			await this.unlinkManaged(id); await syncDirectory(path.join(this.directory, 'data'));
		});
	}
	removeSpace(spaceId: string): Promise<void> {
		this.removed.add(spaceId); this.generations.set(spaceId, (this.generations.get(spaceId) ?? 0) + 1);
		for (const [id, grant] of this.grants) if (grant.scope.spaceId === spaceId) this.grants.delete(id);
		return this.enqueue(async () => { await this.ready; await this.owner();
			const removed = [...this.files.entries()].filter(([, item]) => item.file.scope.spaceId === spaceId);
			for (const [id] of removed) this.files.delete(id);
			try { await this.persist(); } catch (error) { for (const [id, item] of removed) this.files.set(id, item); throw error; }
			for (const [id] of removed) await this.unlinkManaged(id);
			for (const [id, item] of this.downloads) if (item.scope.spaceId === spaceId) { if (item.state === 'in-progress') await this.options.cancelDownload?.(spaceId, id).catch(() => undefined); this.downloads.delete(id); }
			await syncDirectory(path.join(this.directory, 'data'));
		});
	}
	dispose(): Promise<void> { return this.disposal ??= this.disposeOnce().catch((error: unknown) => { this.disposal = undefined; throw error; }); }
	private async disposeOnce(): Promise<void> {
		this.closed = true; this.grants.clear(); await this.ready; await this.tail; await this.owner();
		for (const [id, item] of this.files) if (!item.persistent) { await this.unlinkManaged(id); this.files.delete(id); }
		await this.persist(); this.downloads.clear();
	}
}

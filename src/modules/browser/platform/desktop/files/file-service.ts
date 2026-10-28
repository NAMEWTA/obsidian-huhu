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
	private readonly consumed = new Map<string, BrowserFileGrant>();
	private readonly downloads = new Map<string, BrowserDownload>();
	private readonly removed = new Set<string>();
	private readonly generations = new Map<string, number>();
	private tail: Promise<unknown> = Promise.resolve();
	private closed = false; private secure = false; private directory = '';
	private disposal?: Promise<void>;
	private directoryIdentity?: Stats;
	private dataIdentity?: Stats;
	private readonly payloadDirectories = new Map<string, Stats>();
	constructor(private readonly options: {
		directory: string; downloadDirectory: (spaceId: string) => string; metadataProtector: SecretProtector; metadataScope: string;
		assertOwner?: () => void | Promise<void>; allowEphemeralFiles?: (scope: BrowserFileScope) => boolean;
		cancelDownload?: (spaceId: string, id: string) => Promise<void>; now?: () => number;
	}) { this.ready = this.load(); }
	private now(): number { return this.options.now?.() ?? Date.now(); }
	private get metadata(): string { return path.join(this.directory, 'metadata.sealed'); }
	private get purpose(): string { return `huhu-browser-files:${this.options.metadataScope}:v2`; }
	private fileDirectory(id: string): string { if (!UUID.test(id)) throw new BrowserFileError('file_missing'); return path.join(this.directory, 'data', id); }
	private filePath(id: string, name = this.files.get(id)?.file.name): string {
		if (!name || name !== safeBrowserFilename(name)) throw new BrowserFileError('file_path_invalid');
		return path.join(this.fileDirectory(id), name);
	}
	private ephemeralMarker(id: string): string { return `${this.fileDirectory(id)}.ephemeral`; }
	private async inspectPayload(id: string, expectedName?: string, bind = false): Promise<string[]> {
		await this.owner();
		const directory = this.fileDirectory(id), stat = await fs.lstat(directory), known = this.payloadDirectories.get(id);
		if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory || known && !sameFile(known, stat) || !known && !bind) throw new BrowserFileError('file_path_invalid');
		const names = await fs.readdir(directory);
		if (names.length > 1 || expectedName !== undefined && (names.length !== 1 || names[0] !== expectedName)) throw new BrowserFileError('file_corrupt');
		for (const name of names) {
			if (name !== safeBrowserFilename(name)) throw new BrowserFileError('file_path_invalid');
			const file = await fs.lstat(this.filePath(id, name));
			if (!file.isFile() || file.isSymbolicLink() || file.nlink !== 1) throw new BrowserFileError('file_path_invalid');
		}
		if (bind) this.payloadDirectories.set(id, stat);
		return names;
	}
	private async unlinkManaged(id: string): Promise<void> {
		await this.owner();
		try {
			const names = await this.inspectPayload(id);
			for (const name of names) await fs.unlink(this.filePath(id, name));
			await fs.rmdir(this.fileDirectory(id));
		} catch (error) { if (!isMissing(error)) throw error; }
		await fs.rm(this.ephemeralMarker(id), { force: true }); this.payloadDirectories.delete(id);
	}
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
			const raw = JSON.parse(await openPayload(this.options.metadataProtector, bytes.toString('utf8'), this.purpose)) as { version: number; files: BrowserFile[]; downloadCleanups?: BrowserDownload[] };
			if (raw.version !== 2 || !Array.isArray(raw.files) || raw.files.length > MAX_FILES) throw new BrowserFileError('file_corrupt');
			for (const file of raw.files) {
				if (!file || !UUID.test(file.id) || this.files.has(file.id) || !validFileScope(file.scope) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE || typeof file.name !== 'string' || file.name !== safeBrowserFilename(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256) || !['upload', 'download'].includes(file.kind) || file.state !== 'ready') throw new BrowserFileError('file_corrupt');
				let stored: Stats;
				try { await this.inspectPayload(file.id, file.name, true); stored = await fs.lstat(this.filePath(file.id, file.name)); } catch { throw new BrowserFileError('file_corrupt'); }
				if (!stored.isFile() || stored.isSymbolicLink() || stored.nlink !== 1 || stored.size !== file.size) throw new BrowserFileError('file_corrupt');
				this.files.set(file.id, { file: copyFile(file), persistent: true });
			}
			if (this.total() > MAX_TOTAL) throw new BrowserFileError('file_quota');
			if (raw.downloadCleanups !== undefined && (!Array.isArray(raw.downloadCleanups) || raw.downloadCleanups.length > 128)) throw new BrowserFileError('file_corrupt');
			for (const row of raw.downloadCleanups ?? []) {
				const file = this.files.get(row?.fileId ?? '')?.file;
				if (!file || !UUID.test(row.id) || this.downloads.has(row.id) || !validFileScope(row.scope) || !sameFileScope(file.scope, row.scope) || row.state !== 'completed' || row.cleanup !== 'pending' || file.kind !== 'download' || !/^[a-zA-Z0-9_-]{1,160}$/.test(row.pageId)) throw new BrowserFileError('file_corrupt');
				this.downloads.set(row.id, { id: row.id, pageId: row.pageId, scope: cloneFileScope(file.scope), name: file.name, state: 'completed', cleanup: 'pending', fileId: file.id, receivedBytes: file.size, totalBytes: file.size });
			}
		}
		const names = await fs.readdir(data); if (names.length > MAX_FILES * 3) throw new BrowserFileError('file_quota');
		const ephemeral = new Set(names.filter((name) => name.endsWith('.ephemeral') && UUID.test(name.slice(0, -10))).map((name) => name.slice(0, -10))), cleanup: string[] = [], directories: string[] = [];
		for (const name of names) {
			if (this.files.has(name)) continue;
			const markerId = name.endsWith('.ephemeral') ? name.slice(0, -10) : undefined;
			if (!UUID.test(name) && !(name.endsWith('.stage') && UUID.test(name.slice(0, -6))) && !(markerId && ephemeral.has(markerId))) throw new BrowserFileError('file_corrupt');
			if (UUID.test(name)) {
				if (!bytes && !ephemeral.has(name)) throw new BrowserFileError('file_corrupt');
				await this.inspectPayload(name, undefined, true); directories.push(name); continue;
			}
			const file = path.join(data, name), stat = await fs.lstat(file);
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new BrowserFileError('file_path_invalid');
			if (markerId && (stat.size !== 0 || this.files.has(markerId))) throw new BrowserFileError('file_corrupt');
			cleanup.push(file);
		}
		await this.owner(); for (const id of directories) await this.unlinkManaged(id); for (const file of cleanup) await fs.rm(file, { force: true });
		await syncDirectory(data);
		if (!bytes && this.secure) await this.persist();
	}
	private total(): number { return [...this.files.values()].reduce((total, item) => total + item.file.size, 0); }
	private quota(size: number): void { if (size > MAX_FILE) throw new BrowserFileError('file_too_large'); if (this.files.size >= MAX_FILES || this.total() + size > MAX_TOTAL) throw new BrowserFileError('file_quota'); }
	private persistent(scope: BrowserFileScope): boolean {
		const ephemeral = this.options.allowEphemeralFiles?.(scope) === true;
		if (!this.secure && !ephemeral) throw new BrowserFileError('key_unavailable'); return this.secure && !ephemeral;
	}
	private async persist(publication?: { state: 'unpublished' | 'published' | 'unknown'; id: string }): Promise<void> {
		if (!this.secure) return; await this.owner();
		const text = JSON.stringify({ version: 2, files: [...this.files.values()].filter((item) => item.persistent).map((item) => item.file), downloadCleanups: [...this.downloads.values()].filter(item => item.cleanup === 'pending' && item.fileId && this.files.get(item.fileId)?.persistent).map(copyDownload) });
		const sealed = await sealPayload(this.options.metadataProtector, text, this.purpose); await this.owner(); if (publication) publication.state = 'unknown';
		try { await atomicPrivateFile(this.metadata, sealed); if (publication) publication.state = 'published'; }
		catch (error) {
			if (publication) {
				// A rejected rename+sync operation does not establish non-publication.
				// Only an authenticated authoritative index can authorize compensation.
				try {
					const current = await readPrivateFile(this.metadata, 4 * 1024 * 1024);
					const raw = JSON.parse(await openPayload(this.options.metadataProtector, current.toString('utf8'), this.purpose)) as { version: number; files: BrowserFile[] };
					if (raw.version !== 2 || !Array.isArray(raw.files)) throw new BrowserFileError('file_corrupt');
					publication.state = raw.files.some(file => file.id === publication.id) ? 'published' : 'unpublished';
				} catch { /* Unreadable authority remains unknown; never unlink possible references. */ }
			}
			throw error;
		}
	}
	private async capture(source: string, name: string, scope: BrowserFileScope, kind: BrowserFile['kind'], generation: number, download?: BrowserDownload): Promise<BrowserFile> {
		this.check(scope, generation); const persistent = this.persistent(scope), id = randomUUID(), safeName = safeBrowserFilename(name), temporary = path.join(this.directory, 'data', `${id}.stage`), target = this.filePath(id, safeName);
		const parent = path.dirname(target); let allocated = false, published = false; const publication = { state: 'unpublished' as 'unpublished' | 'published' | 'unknown', id };
		try {
			const initial = await fs.lstat(source); this.quota(initial.size);
			if (!persistent) await atomicPrivateFile(this.ephemeralMarker(id), '', true);
			await this.owner(); await fs.mkdir(parent, { mode: 0o700 }); await this.inspectPayload(id, undefined, true); allocated = true;
			const fixed = await fixedCopy(source, temporary); this.check(scope, generation); await this.owner(); this.quota(fixed.size);
			await this.inspectPayload(id); await fs.link(temporary, target); await fs.unlink(temporary); await syncDirectory(parent); await syncDirectory(path.dirname(parent));
			const file: BrowserFile = { id, name: safeName, ...fixed, kind, state: 'ready', scope: cloneFileScope(scope), createdAt: this.now() };
			this.files.set(id, { file, persistent });
			const previous = download && copyDownload(download);
			if (download) Object.assign(download, { fileId: id, state: 'completed', receivedBytes: file.size, cleanup: 'pending' });
			try { await this.persist(publication); published = true; } catch (error) {
				if (publication.state !== 'unpublished') {
					published = true; // Preserve possible references; this is not a success receipt.
					if (download) download.error = 'file_publication_unknown';
					throw new BrowserFileError('file_publication_unknown');
				}
				this.files.delete(id); if (download && previous) { delete download.fileId; delete download.cleanup; Object.assign(download, previous); } throw error;
			}
			// The fixed file and its cleanup ownership are published together. A later
			// lease/Space change cannot undo that confirmed fact; consumers still fence dispatch.
			return copyFile(file);
		} catch (error) { if (allocated && !published) await this.unlinkManaged(id); throw error; }
		finally { if (!published) { await this.owner(); await fs.rm(temporary, { force: true }); if (!this.files.has(id)) await fs.rm(this.ephemeralMarker(id), { force: true }); } }
	}
	grantUpload(source: string, inputScope: BrowserFileScope): Promise<{ file: BrowserFile; grant: BrowserFileGrant }> {
		this.check(inputScope); const scope = cloneFileScope(inputScope), generation = this.generations.get(scope.spaceId) ?? 0;
		return this.enqueue(async () => { await this.ready; this.check(scope, generation); await this.owner();
			const file = await this.capture(source, path.basename(source), scope, 'upload', generation);
			this.check(scope, generation);
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
			await this.inspectPayload(fileId, stored.file.name);
			const fixed = await fixedCopy(this.filePath(fileId)); this.check(scope, generation);
			await this.inspectPayload(fileId, stored.file.name);
			if (grant.expiresAt <= this.now()) throw new BrowserFileError('file_grant_invalid');
			if (fixed.size !== stored.file.size || fixed.sha256 !== stored.file.sha256) throw new BrowserFileError('file_changed');
			this.consumed.set(fileId, grant); return this.filePath(fileId);
		});
	}
	uploadDeadline(fileId: string, scope: BrowserFileScope): number {
		this.check(scope); const proof = this.consumed.get(fileId);
		if (!proof || !sameFileScope(proof.scope, scope) || proof.expiresAt <= this.now()) throw new BrowserFileError('file_grant_invalid');
		return proof.expiresAt;
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
					await this.capture(source, item.name, item.scope, 'download', generation, item);
					item.state = 'completed';
				} catch (error) { if (error instanceof BrowserFileError && error.code === 'file_publication_unknown') throw error; item.state = 'failed'; item.error = error instanceof BrowserFileError ? error.code : 'file_corrupt'; }
				if (item.state === 'completed') {
					try { await this.cleanupDownload(item); } catch { /* Captured content remains completed; cleanup is independently retryable. */ }
				}
			}
			return copyDownload(item);
		});
	}
	private async cleanupDownload(item: BrowserDownload): Promise<void> {
		await this.persist(); await this.owner();
		const directory = await privateDirectory(this.options.downloadDirectory(item.scope.spaceId));
		const source = path.join(directory, item.id), stored = this.files.get(item.fileId ?? '')?.file;
		if (!stored) throw new BrowserFileError('file_corrupt');
		// Atomically acquire the pathname's current object into a private claim. From
		// here on deletion touches only this owned slot, never a later GUID occupant.
		// The deterministic fileId slot is recoverable from the authenticated job.
		const claimDirectory = await privateDirectory(path.join(directory, `.huhu-cleanup-${stored.id}`)), claim = path.join(claimDirectory, 'claimed');
		const identity = await fs.lstat(claimDirectory);
		try { await fs.lstat(claim); }
		catch (error) {
			if (!isMissing(error)) throw error;
			try { await fs.rename(source, claim); await syncDirectory(directory); await syncDirectory(claimDirectory); }
			catch (error) { if (!isMissing(error)) throw error; }
		}
		try {
			const actual = await fixedCopy(claim);
			if (actual.size !== stored.size || actual.sha256 !== stored.sha256) {
				// Restore a changed acquired object without overwriting a new GUID file.
				try { await fs.link(claim, source); await fs.unlink(claim); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
				throw new BrowserFileError('file_changed');
			}
			if (!sameFile(identity, await fs.lstat(claimDirectory)) || await fs.realpath(claimDirectory) !== claimDirectory) throw new BrowserFileError('file_path_invalid');
			await fs.rm(claim); await syncDirectory(claimDirectory);
		} catch (error) { if (!(error instanceof BrowserFileError && error.code === 'file_missing')) throw error; }
		await syncDirectory(directory);
		try { await fs.lstat(source); throw new BrowserFileError('file_changed'); } catch (error) { if (!isMissing(error)) throw error; }
		item.cleanup = 'complete'; delete item.error;
		try { await this.persist(); } catch (error) { item.cleanup = 'pending'; throw error; }
	}
	retryDownloadCleanup(spaceId: string, id: string): Promise<void> {
		return this.enqueue(async () => {
			await this.ready; this.check(); const item = this.downloads.get(id);
			if (!item || item.scope.spaceId !== spaceId) throw new BrowserFileError('file_scope_mismatch');
			if (item.state === 'completed' && item.cleanup === 'pending') await this.cleanupDownload(item);
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
			await this.inspectPayload(id, stored.file.name);
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
		if (this.files.get(id)?.file.scope.spaceId === spaceId) { this.grants.delete(id); this.consumed.delete(id); }
		return this.enqueue(async () => { await this.ready; this.check(); await this.owner(); const stored = this.files.get(id);
			if (!stored || stored.file.scope.spaceId !== spaceId) throw new BrowserFileError('file_scope_mismatch');
			for (const download of this.downloads.values()) if (download.fileId === id && download.cleanup === 'pending') await this.cleanupDownload(download);
			await this.inspectPayload(id, stored.file.name);
			this.files.delete(id);
			try { await this.persist(); } catch (error) { this.files.set(id, stored); throw error; }
			await this.unlinkManaged(id); await syncDirectory(path.join(this.directory, 'data'));
		});
	}
	removeSpace(spaceId: string): Promise<void> {
		this.removed.add(spaceId); this.generations.set(spaceId, (this.generations.get(spaceId) ?? 0) + 1);
		for (const [id, grant] of this.grants) if (grant.scope.spaceId === spaceId) this.grants.delete(id);
		for (const [id, grant] of this.consumed) if (grant.scope.spaceId === spaceId) this.consumed.delete(id);
		return this.enqueue(async () => { await this.ready; await this.owner();
			const removed = [...this.files.entries()].filter(([, item]) => item.file.scope.spaceId === spaceId);
			for (const [id, item] of removed) await this.inspectPayload(id, item.file.name);
			for (const [id] of removed) this.files.delete(id);
			try { await this.persist(); } catch (error) { for (const [id, item] of removed) this.files.set(id, item); throw error; }
			for (const [id] of removed) await this.unlinkManaged(id);
			for (const [id, item] of this.downloads) if (item.scope.spaceId === spaceId) { if (item.state === 'in-progress') await this.options.cancelDownload?.(spaceId, id).catch(() => undefined); this.downloads.delete(id); }
			await syncDirectory(path.join(this.directory, 'data'));
		});
	}
	dispose(): Promise<void> { return this.disposal ??= this.disposeOnce().catch((error: unknown) => { this.disposal = undefined; throw error; }); }
	private async disposeOnce(): Promise<void> {
		this.closed = true; this.grants.clear(); this.consumed.clear(); await this.ready; await this.tail; await this.owner();
		for (const item of this.downloads.values()) if (item.cleanup === 'pending') await this.cleanupDownload(item);
		for (const [id, item] of this.files) if (!item.persistent) { await this.unlinkManaged(id); this.files.delete(id); }
		await this.persist(); this.downloads.clear();
	}
}

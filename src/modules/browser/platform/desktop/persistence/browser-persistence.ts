import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:net';
import { promises as fs, type Stats } from 'node:fs';
import path from 'node:path';
import type { SecretProtector } from '../../../../../host/desktop/secret-protector';
import { AgentBrowserError, type BrowserPersistence } from '../../../core/contracts';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile, sameFile, syncDirectory } from './private-files';
import { openPayload, sealPayload } from './sealed-payload';

function keyValid(key: string): void {
	if (!key || key.length > 120 || !/^[a-zA-Z0-9_./-]+$/.test(key) || key.split('/').some((part) => !part || part === '.' || part === '..')) throw new AgentBrowserError('storage_key_invalid');
}
const MAX_TOTAL_BYTES = 256 * 1024 * 1024, MAX_RECORD_BYTES = 64 * 1024 * 1024;
/** Kernel-held canonical-root mutex: crashes release ownership, never infer liveness from a PID. */
export class DesktopBrowserPersistence implements BrowserPersistence {
	private ownerIdentity = '';
	get ownerId(): string { return this.ownerIdentity; }
	private owner?: Server;
	private initialized = false;
	private initializing?: Promise<void>;
	private closed = false;
	private secure = false;
	private root = '';
	private rootIdentity?: Stats;
	private recordsIdentity?: Stats;
	private readonly sizes = new Map<string, number>();
	private tail: Promise<unknown> = Promise.resolve();
	private readonly memory = new Map<string, string>();
	private digestKey = randomBytes(32);
	get readOnly(): boolean { return this.initialized && !this.owner; }
	constructor(private readonly options: { root: string; protector: SecretProtector }) {}
	id(): string { return randomUUID(); }
	initialize(): Promise<void> {
		this.initializing ??= this.open();
		return this.initializing;
	}
	private async open(): Promise<void> {
		let ancestor = path.resolve(this.options.root); const suffix: string[] = [];
		for (;;) {
			try { const stat = await fs.lstat(ancestor); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AgentBrowserError('storage_path_invalid'); break; }
			catch (error) { if (!isMissing(error)) throw error; suffix.unshift(path.basename(ancestor)); const parent = path.dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent; }
		}
		this.root = path.join(await fs.realpath(ancestor), ...suffix);
		const canonical = process.platform === 'win32' ? this.root.toLowerCase() : this.root;
		this.ownerIdentity = createHash('sha256').update(`huhu-browser-owner-v2:${canonical}`).digest('hex');
		// Windows reserves dynamic port ranges (EACCES). Every instance skips the
		// same reserved candidates of this digest, so they still meet on one port.
		const ports = createHash('sha256').update(canonical).digest();
		const server = createServer((socket) => socket.destroy());
		for (let offset = 0; ; offset += 2) {
			const owner = await new Promise<Server | undefined | null>((resolve, reject) => {
				const failed = (error: NodeJS.ErrnoException) => error.code === 'EADDRINUSE' ? resolve(undefined) : error.code === 'EACCES' && offset < 30 ? resolve(null) : reject(error);
				server.once('error', failed);
				server.listen({ host: '127.0.0.1', port: 49152 + (ports.readUInt16BE(offset) % 16384), exclusive: true }, () => { server.off('error', failed); server.unref(); resolve(server); });
			});
			if (owner !== null) { this.owner = owner; break; }
		}
		this.initialized = true;
		if (!this.owner) return;
		try {
			this.root = await privateDirectory(this.root); this.rootIdentity = await fs.lstat(this.root);
			this.secure = (await this.options.protector.status()) === 'available';
			const files = await fs.readdir(this.root);
			if (!this.secure && files.some((name) => name.endsWith('.sealed') || name === 'records')) throw new AgentBrowserError('credential_store_locked');
			if (this.secure) {
				const records = await privateDirectory(path.join(this.root, 'records')); this.recordsIdentity = await fs.lstat(records);
				await this.scanRecords();
				const file = path.join(this.root, 'digest-key.sealed'), purpose = `huhu-browser-digest:${this.root}:v2`;
				try {
					const plain = await openPayload(this.options.protector, (await readPrivateFile(file, 1024 * 1024)).toString('utf8'), purpose);
					const restored = Buffer.from(plain, 'base64');
					if (restored.length !== 32 || restored.toString('base64') !== plain) throw new AgentBrowserError('storage_corrupt');
					this.digestKey.fill(0); this.digestKey = restored;
				} catch (error) {
					if (!isMissing(error)) throw error;
					if (this.sizes.size)
						throw new AgentBrowserError('key_unavailable');
					await atomicPrivateFile(file, await sealPayload(this.options.protector, this.digestKey.toString('base64'), purpose), true);
				}
			}
		} catch (error) { await this.releaseOwner(); throw error; }
	}
	async assertOwner(): Promise<void> {
		if (!this.initialized || this.closed || !this.owner?.listening || !this.rootIdentity) throw new AgentBrowserError('owned_by_other_instance');
		const current = await fs.lstat(this.root);
		if (!current.isDirectory() || current.isSymbolicLink() || !sameFile(current, this.rootIdentity) || await fs.realpath(this.options.root) !== this.root) throw new AgentBrowserError('storage_owner_lost');
		if (this.recordsIdentity) {
			const records = await fs.lstat(path.join(this.root, 'records'));
			if (!records.isDirectory() || records.isSymbolicLink() || !sameFile(records, this.recordsIdentity)) throw new AgentBrowserError('storage_owner_lost');
		}
	}
	private async scanRecords(): Promise<void> {
		const directory = path.join(this.root, 'records'), names = await fs.readdir(directory);
		if (names.length > 10032) throw new AgentBrowserError('storage_quota');
		let total = 0;
		for (const name of names) {
			if (/^[a-f0-9]+\.sealed\.[a-f0-9-]+\.tmp$/.test(name)) {
				const temporary = path.join(directory, name), stat = await fs.lstat(temporary);
				if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new AgentBrowserError('storage_corrupt');
				await fs.unlink(temporary); continue;
			}
			if (!/^(?:[a-f0-9]{2})+\.sealed$/.test(name)) throw new AgentBrowserError('storage_corrupt');
			const key = Buffer.from(name.slice(0, -7), 'hex').toString('utf8'); keyValid(key);
			if (Buffer.from(key).toString('hex') !== name.slice(0, -7)) throw new AgentBrowserError('storage_corrupt');
			const stat = await fs.lstat(path.join(directory, name));
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 96 * 1024 * 1024) throw new AgentBrowserError('storage_corrupt');
			total += stat.size; this.sizes.set(key, stat.size);
			if (total > MAX_TOTAL_BYTES || this.sizes.size > 10000) throw new AgentBrowserError('storage_quota');
		}
	}
	private checkQuota(key: string, bytes: number): void {
		if (!this.sizes.has(key) && this.sizes.size >= 10000 || [...this.sizes.values()].reduce((sum, size) => sum + size, 0) - (this.sizes.get(key) ?? 0) + bytes > MAX_TOTAL_BYTES)
			throw new AgentBrowserError('storage_quota');
	}
	async security(): Promise<'secure' | 'unavailable'> { await this.initialize(); return this.secure ? 'secure' : 'unavailable'; }
	async digest(value: string): Promise<string> { await this.initialize(); await this.assertOwner(); return createHmac('sha256', this.digestKey).update(value).digest('hex'); }
	private enqueue<T>(work: () => Promise<T>): Promise<T> {
		if (this.closed) return Promise.reject(new AgentBrowserError('storage_closed'));
		const operation = this.tail.then(work, work); this.tail = operation.catch(() => undefined); return operation;
	}
	private filename(key: string): string { keyValid(key); return path.join(this.root, 'records', `${Buffer.from(key).toString('hex')}.sealed`); }
	private purpose(key: string): string { return `huhu-browser-record:${this.root}:${key}:v2`; }
	read<T>(key: string): Promise<T | undefined> {
		return this.enqueue(async () => {
			await this.initialize(); await this.assertOwner(); keyValid(key);
			let text: string | undefined;
			if (!this.secure) text = this.memory.get(key);
			else try { text = await openPayload(this.options.protector, (await readPrivateFile(this.filename(key), 128 * 1024 * 1024)).toString('utf8'), this.purpose(key)); }
			catch (error) { if (!isMissing(error)) throw error; }
			await this.assertOwner();
			if (text === undefined) return undefined;
			try { return JSON.parse(text) as T; } catch { throw new AgentBrowserError('storage_corrupt'); }
		});
	}
	write(key: string, value: unknown): Promise<void> {
		keyValid(key); const text = JSON.stringify(value);
		const maximum = key.startsWith('operations/') ? 8 * 1024 * 1024 + 65536 : MAX_RECORD_BYTES;
		if (typeof text !== 'string' || Buffer.byteLength(text) > maximum) return Promise.reject(new AgentBrowserError('storage_quota'));
		return this.enqueue(async () => {
			await this.initialize(); await this.assertOwner();
			if (!this.secure) { const bytes = Buffer.byteLength(text); this.checkQuota(key, bytes); this.memory.set(key, text); this.sizes.set(key, bytes); return; }
			const sealed = await sealPayload(this.options.protector, text, this.purpose(key)); await this.assertOwner();
			const bytes = Buffer.byteLength(sealed); this.checkQuota(key, bytes);
			await atomicPrivateFile(this.filename(key), sealed); await this.assertOwner();
			this.sizes.set(key, bytes);
		});
	}
	remove(key: string): Promise<void> { return this.enqueue(async () => { await this.initialize(); await this.assertOwner(); keyValid(key); if (!this.secure) this.memory.delete(key); else { await fs.rm(this.filename(key), { force: true }); await syncDirectory(path.join(this.root, 'records')); } this.sizes.delete(key); }); }
	keys(prefix: string): Promise<string[]> {
		return this.enqueue(async () => {
			await this.initialize(); await this.assertOwner();
			if (!this.secure) return [...this.memory.keys()].filter((key) => key.startsWith(prefix)).sort();
			const names = await fs.readdir(path.join(this.root, 'records'));
			if (names.length > 10000) throw new AgentBrowserError('storage_quota');
			const result: string[] = [];
			for (const name of names) {
				if (!/^(?:[a-f0-9]{2})+\.sealed$/.test(name)) { if (name.endsWith('.tmp')) continue; throw new AgentBrowserError('storage_corrupt'); }
				const key = Buffer.from(name.slice(0, -7), 'hex').toString('utf8'); keyValid(key);
				if (key.startsWith(prefix)) result.push(key);
			}
			return result.sort();
		});
	}
	private async releaseOwner(): Promise<void> { const owner = this.owner; this.owner = undefined; if (owner?.listening) await new Promise<void>((resolve) => owner.close(() => resolve())); }
	async dispose(): Promise<void> { this.closed = true; await this.initializing?.catch(() => undefined); await this.tail; this.memory.clear(); this.sizes.clear(); this.digestKey.fill(0); await this.releaseOwner(); }
}
export function createBrowserPersistence(options: { root: string; protector: SecretProtector }): DesktopBrowserPersistence { return new DesktopBrowserPersistence(options); }

import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:net';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SecretProtector } from '../../../../../host/desktop/secret-protector';
import { AgentBrowserError, type BrowserPersistence } from '../../../core/contracts';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile, sameFile, syncDirectory } from './private-files';
import { openPayload, sealPayload } from './sealed-payload';

function keyValid(key: string): void {
	if (!key || key.length > 120 || !/^[a-zA-Z0-9_.\/-]+$/.test(key) || key.split('/').some((part) => !part || part === '.' || part === '..')) throw new AgentBrowserError('storage_key_invalid');
}
/** Kernel-held canonical-root mutex: crashes release ownership, never infer liveness from a PID. */
export class DesktopBrowserPersistence implements BrowserPersistence {
	readonly ownerId = randomUUID();
	private owner?: Server;
	private initialized = false;
	private initializing?: Promise<void>;
	private closed = false;
	private secure = false;
	private root = '';
	private rootIdentity?: Awaited<ReturnType<typeof fs.stat>>;
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
		const port = 49152 + (createHash('sha256').update(canonical).digest().readUInt16BE(0) % 16384);
		const server = createServer((socket) => socket.destroy());
		this.owner = await new Promise<Server | undefined>((resolve, reject) => {
			server.once('error', (error) => (error as NodeJS.ErrnoException).code === 'EADDRINUSE' ? resolve(undefined) : reject(error));
			server.listen({ host: '127.0.0.1', port, exclusive: true }, () => { server.unref(); resolve(server); });
		});
		this.initialized = true;
		if (!this.owner) return;
		try {
			this.root = await privateDirectory(this.root); this.rootIdentity = await fs.lstat(this.root);
			this.secure = (await this.options.protector.status()) === 'available';
			const files = await fs.readdir(this.root);
			if (!this.secure && files.some((name) => name.endsWith('.sealed') || name === 'records')) throw new AgentBrowserError('credential_store_locked');
			if (this.secure) {
				const file = path.join(this.root, 'digest-key.sealed'), purpose = `huhu-browser-digest:${this.root}:v2`;
				try {
					const plain = await openPayload(this.options.protector, (await readPrivateFile(file, 1024 * 1024)).toString('utf8'), purpose);
					const restored = Buffer.from(plain, 'base64');
					if (restored.length !== 32 || restored.toString('base64') !== plain) throw new AgentBrowserError('storage_corrupt');
					this.digestKey.fill(0); this.digestKey = restored;
				} catch (error) {
					if (!isMissing(error)) throw error;
					if (files.includes('records') && (await fs.readdir(path.join(this.root, 'records'))).some((name) => name.endsWith('.sealed')))
						throw new AgentBrowserError('key_unavailable');
					await atomicPrivateFile(file, await sealPayload(this.options.protector, this.digestKey.toString('base64'), purpose), true);
				}
				await privateDirectory(path.join(this.root, 'records'));
			}
		} catch (error) { await this.releaseOwner(); throw error; }
	}
	async assertOwner(): Promise<void> {
		if (!this.initialized || this.closed || !this.owner?.listening || !this.rootIdentity) throw new AgentBrowserError('owned_by_other_instance');
		const current = await fs.lstat(this.root);
		if (!current.isDirectory() || current.isSymbolicLink() || !sameFile(current, this.rootIdentity) || await fs.realpath(this.options.root) !== this.root) throw new AgentBrowserError('storage_owner_lost');
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
		if (typeof text !== 'string' || Buffer.byteLength(text) > 64 * 1024 * 1024) return Promise.reject(new AgentBrowserError('storage_quota'));
		return this.enqueue(async () => {
			await this.initialize(); await this.assertOwner();
			if (!this.secure) { if (!this.memory.has(key) && this.memory.size >= 10000) throw new AgentBrowserError('storage_quota'); this.memory.set(key, text); return; }
			const sealed = await sealPayload(this.options.protector, text, this.purpose(key)); await this.assertOwner();
			await atomicPrivateFile(this.filename(key), sealed); await this.assertOwner();
		});
	}
	remove(key: string): Promise<void> { return this.enqueue(async () => { await this.initialize(); await this.assertOwner(); keyValid(key); if (!this.secure) this.memory.delete(key); else { await fs.rm(this.filename(key), { force: true }); await syncDirectory(path.join(this.root, 'records')); } }); }
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
	async dispose(): Promise<void> { this.closed = true; await this.initializing?.catch(() => undefined); await this.tail; this.memory.clear(); this.digestKey.fill(0); await this.releaseOwner(); }
}
export function createBrowserPersistence(options: { root: string; protector: SecretProtector }): DesktopBrowserPersistence { return new DesktopBrowserPersistence(options); }

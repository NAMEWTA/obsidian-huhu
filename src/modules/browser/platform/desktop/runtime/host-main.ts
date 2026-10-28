import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout, clearTimeout } from 'node:timers';
import * as electronModule from 'electron';
import {
	AgentBrowserError,
	type BrowserCommand,
	type BrowserObservation,
	type SnapshotOptions,
	type BrowserRuntime,
	type BrowserRuntimeFactory,
	type ControlLease,
	type JsonValue,
	type RevocationAck,
	type RuntimeAvailability,
	type RuntimeEvent,
	type RuntimeIdentityState,
	type RuntimePage,
} from '../../../core/contracts';
import { isMissing, privateDirectory, readPrivateFile } from '../persistence/private-files';
import { installRuntimeBundle, verifyRuntimeAssets, type RuntimeAssets } from './assets';
import { JsonFrames, writeJsonFrame } from './framing';
import { authenticatedRecord, managedId, ownershipKey, readManagedOwner, writeManagedOwner } from './ownership';
import { prepareProfileVersion } from './profile-version';
import type { WorkerInit, WorkerRequest, WorkerResponse, WorkerResult } from './wire';

interface UtilityProcess {
	on(event: 'message', listener: (message: WorkerResponse) => void): void;
	on(event: 'exit', listener: (code: number) => void): void;
	once(event: 'exit', listener: () => void): void;
	postMessage(message: WorkerInit | WorkerRequest): void;
	kill(): boolean;
}
interface Owner {
	isDestroyed(): boolean;
	once(event: 'destroyed', listener: () => void): void;
	removeListener(event: 'destroyed', listener: () => void): void;
}
interface ElectronHost {
	utilityProcess: {
		fork(
			file: string,
			args: string[],
			options: { serviceName: string; stdio: 'pipe'; env: NodeJS.ProcessEnv },
		): UtilityProcess;
	};
	webContents: { fromId(id: number): Owner | undefined };
	app: { getPath(name: 'userData'): string };
}
type RequestBody = WorkerRequest extends infer T ? (T extends WorkerRequest ? Omit<T, 'id'> : never) : never;
interface Wait<T> {
	resolve(value: T): void;
	reject(error: Error): void;
	timer: ReturnType<typeof setTimeout>;
}
function code(error: unknown): string {
	return error instanceof AgentBrowserError ? error.code : 'browser_runtime_failed';
}
function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

class NativeHost {
	readonly child: ChildProcessWithoutNullStreams;
	private id = 0;
	private pending = new Map<number, Wait<Record<string, unknown>>>();
	private exited = false;
	constructor(
		executable: string,
		private fault: (code: string) => void,
	) {
		this.child = spawn(executable, [], {
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' },
		});
		const frames = new JsonFrames();
		this.child.stdout.on('data', (bytes: Buffer) => {
			try {
				frames.push(bytes, (message) => {
					if (message.type === 'fatal') {
						this.fail(typeof message.code === 'string' ? message.code : 'browser_native_failed');
						return;
					}
					const id = Number(message.id),
						wait = this.pending.get(id);
					if (!wait) return;
					this.pending.delete(id);
					clearTimeout(wait.timer);
					typeof message.error === 'string'
						? wait.reject(new AgentBrowserError(message.error))
						: wait.resolve(object(message.result));
				});
			} catch {
				this.fail('browser_native_protocol');
			}
		});
		this.child.stderr.resume();
		this.child.stdin.on('error', () => this.fail('browser_native_closed'));
		this.child.on('error', () => this.fail('browser_native_spawn_failed'));
		this.child.on('close', () => {
			this.exited = true;
			this.fail('browser_native_closed');
		});
	}
	private fail(error: string): void {
		for (const wait of this.pending.values()) {
			clearTimeout(wait.timer);
			wait.reject(new AgentBrowserError(error));
		}
		this.pending.clear();
		this.fault(error);
	}
	call(message: Record<string, unknown>, timeout = 5000): Promise<Record<string, unknown>> {
		if (this.exited || this.pending.size >= 32)
			return Promise.reject(new AgentBrowserError('browser_native_unavailable'));
		const id = ++this.id;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new AgentBrowserError('outcome_unknown'));
			}, timeout);
			timer.unref();
			this.pending.set(id, { resolve, reject, timer });
			try {
				writeJsonFrame(this.child.stdin, { ...message, id });
			} catch {
				this.pending.delete(id);
				clearTimeout(timer);
				reject(new AgentBrowserError('browser_native_unavailable'));
			}
		});
	}
	async finish(): Promise<void> {
		if (this.exited) return;
		this.child.stdin.end();
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				if (!this.exited) this.child.kill('SIGKILL');
				const final = setTimeout(
					() => (this.exited ? resolve() : reject(new AgentBrowserError('browser_cleanup_pending'))),
					2000,
				);
				final.unref();
			}, 1000);
			timer.unref();
			this.child.once('close', () => {
				clearTimeout(timer);
				resolve();
			});
		});
	}
}

export interface MainRuntime extends BrowserRuntime {
	ackFrame(pageId: string): void;
}
export class ManagedRuntime implements MainRuntime {
	private listeners = new Set<(event: RuntimeEvent) => void>();
	private native: NativeHost;
	private worker?: UtilityProcess;
	private workerExited = true;
	private next = 0;
	private pending = new Map<number, Wait<WorkerResult>>();
	private ready?: Wait<string>;
	private lease: ControlLease | undefined;
	private epoch = 0;
	private provisioning = true;
	private closing = false;
	private stopped = false;
	private stopTask?: Promise<void>;
	readonly provision: ControlLease;
	constructor(
		readonly id: string,
		readonly spaceId: string,
		private assets: RuntimeAssets,
		private profile: string,
		private downloads: string,
		private key: string,
		private ephemeral: boolean,
		private electron: ElectronHost,
		private reclaimNative: () => Promise<void>,
		private released: () => void,
	) {
		this.provision = {
			spaceId,
			runtimeId: id,
			epoch: 0,
			leaseId: randomUUID(),
			controllerId: 'provisioning',
			mode: 'workspace',
			expiresAt: Number.MAX_SAFE_INTEGER,
		};
		this.lease = this.provision;
		this.native = new NativeHost(assets.helper, (error) => {
			if (!this.closing && !this.stopped) this.emit({ kind: 'fault', runtimeId: this.id, code: error });
		});
	}
	async start(fresh: boolean): Promise<void> {
		const token = randomBytes(32).toString('hex');
		const boot = await this.native.call(
			{
				type: 'start',
				protocol: 2,
				executable: this.assets.executable,
				profile: this.profile,
				runtimeId: this.id,
				spaceId: this.spaceId,
				ephemeral: this.ephemeral,
				ownerKey: this.key,
				token,
				provisioningLease: this.provision.leaseId,
			},
			10000,
		);
		if (boot.protocol !== 2 || typeof boot.port !== 'number' || boot.port <= 0 || boot.port > 65535)
			throw new AgentBrowserError('browser_native_protocol');
		if (object(boot.features).composition !== true || object(boot.features).dispatchDeadline !== true)
			throw new AgentBrowserError('browser_runtime_capability_missing');
		this.worker = this.electron.utilityProcess.fork(this.assets.worker, [], {
			serviceName: 'HUHU isolated browser',
			stdio: 'pipe',
			env: { PATH: process.env.PATH, LANG: 'C.UTF-8' },
		});
		this.workerExited = false;
		this.worker.on('message', (message) => this.receive(message));
		this.worker.on('exit', () => {
			this.workerExited = true;
			if (this.ready) {
				clearTimeout(this.ready.timer);
				this.ready.reject(new AgentBrowserError('browser_worker_closed'));
				this.ready = undefined;
			}
			for (const task of this.pending.values()) {
				clearTimeout(task.timer);
				task.reject(new AgentBrowserError('outcome_unknown'));
			}
			this.pending.clear();
			if (!this.closing && !this.stopped) {
				this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_worker_closed' });
				void this.stop().catch(() => undefined);
			}
		});
		const ready = new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.ready = undefined;
				reject(new AgentBrowserError('browser_worker_start_timeout'));
			}, 15000);
			timer.unref();
			this.ready = { resolve, reject, timer };
		});
		this.worker.postMessage({
			type: 'init',
			spaceId: this.spaceId,
			runtimeId: this.id,
			port: boot.port,
			token,
			downloadPath: this.downloads,
			fresh,
			provisioning: this.provision,
		});
		const version = await ready;
		if (!version.endsWith('/' + this.assets.manifest.chromiumVersion))
			throw new AgentBrowserError('browser_runtime_version_mismatch');
	}
	private emit(event: RuntimeEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch {
				/* A view cannot stop ownership cleanup. */
			}
		}
	}
	private receive(message: WorkerResponse): void {
		if (message.type === 'ready') {
			const wait = this.ready;
			this.ready = undefined;
			if (wait) {
				clearTimeout(wait.timer);
				wait.resolve(message.version);
			}
			return;
		}
		if (message.type === 'event') {
			if (this.stopped) return;
			if (message.event.kind === 'fault' && this.ready) {
				const wait = this.ready;
				this.ready = undefined;
				clearTimeout(wait.timer);
				wait.reject(new AgentBrowserError(message.event.code));
			}
			const event =
				message.event.kind === 'frame'
					? {
							kind: 'frame' as const,
							frame: { ...message.event.frame, data: Buffer.from(message.event.frame.data) },
						}
					: message.event;
			this.emit(event);
			return;
		}
		const wait = this.pending.get(message.id);
		if (!wait) return;
		this.pending.delete(message.id);
		clearTimeout(wait.timer);
		message.error ? wait.reject(new AgentBrowserError(message.error)) : wait.resolve(message.value);
	}
	private rpc<T = WorkerResult>(message: RequestBody, timeout = 35000): Promise<T> {
		if (!this.worker || this.workerExited || this.stopped || this.pending.size >= 96)
			return Promise.reject(new AgentBrowserError('browser_worker_unavailable'));
		const id = ++this.next;
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new AgentBrowserError('outcome_unknown'));
			}, timeout);
			timer.unref();
			this.pending.set(id, { resolve: (value) => resolve(value as T), reject, timer });
			try {
				this.worker!.postMessage({ ...message, id });
			} catch {
				clearTimeout(timer);
				this.pending.delete(id);
				reject(new AgentBrowserError('browser_worker_closed'));
			}
		});
	}
	private authority(value: ControlLease): void {
		if (
			this.closing ||
			this.stopped ||
			value.runtimeId !== this.id ||
			value.spaceId !== this.spaceId ||
			value.epoch !== this.epoch ||
			!this.lease ||
			value.leaseId !== this.lease.leaseId ||
			value.controllerId !== this.lease.controllerId ||
			value.mode !== this.lease.mode ||
			!Number.isSafeInteger(value.expiresAt) || Date.now() >= value.expiresAt ||
			Date.now() >= this.lease.expiresAt
		)
			throw new AgentBrowserError('browser_stale_control');
	}
	onEvent(listener: (event: RuntimeEvent) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	ackFrame(pageId: string): void {
		if (!this.worker || this.workerExited || this.stopped) return;
		try {
			this.worker.postMessage({ type: 'frameAck', id: ++this.next, pageId });
		} catch {
			/* Worker exit owns the fault. */
		}
	}
	async setControl(lease: ControlLease | undefined, epoch: number): Promise<RevocationAck> {
		if (
			this.closing ||
			this.stopped ||
			!Number.isSafeInteger(epoch) ||
			epoch < this.epoch ||
			(lease && (lease.spaceId !== this.spaceId || lease.runtimeId !== this.id || lease.epoch !== epoch))
		)
			throw new AgentBrowserError('browser_stale_control');
		const ack = await this.native.call({ type: 'control', epoch, lease: lease ?? null });
		if (ack.epoch !== epoch || !Number.isSafeInteger(ack.lastDispatchedSequence) || Number(ack.lastDispatchedSequence) < 0 || ack.transportState !== 'open')
			throw new AgentBrowserError('browser_native_protocol');
		if (epoch < this.epoch) throw new AgentBrowserError('browser_stale_control');
		// Native revocation is already effective. Worker convergence is a separate,
		// bounded prerequisite for handing control to another writer.
		this.epoch = epoch;
		this.lease = lease;
		this.provisioning = false;
		try { await this.rpc({ type: 'control', epoch, lease }, 5000); }
		catch {
			if (this.epoch === epoch) this.lease = undefined;
			throw new AgentBrowserError('browser_control_unsettled');
		}
		if (this.closing || this.stopped || this.epoch !== epoch || this.lease?.leaseId !== lease?.leaseId)
			throw new AgentBrowserError('browser_stale_control');
		return {
			runtimeId: this.id,
			epoch,
			lastDispatchedSequence: Number(ack.lastDispatchedSequence),
			transportState: 'open',
		};
	}
	async createPage(pageId: string, url: string, authority?: ControlLease): Promise<RuntimePage> {
		if (!managedId(pageId)) throw new AgentBrowserError('browser_page_invalid');
		const lease = authority ?? (this.provisioning ? this.provision : undefined);
		if (!lease) throw new AgentBrowserError('browser_control_required');
		this.authority(lease);
		return this.rpc<RuntimePage>({ type: 'create', pageId, url, authority: lease });
	}
	async closePage(pageId: string, authority: ControlLease): Promise<void> {
		this.authority(authority);
		await this.rpc({ type: 'close', pageId, authority });
	}
	execute(
		pageId: string,
		command: BrowserCommand,
		authority: ControlLease,
		options?: { uploadPaths?: string[] },
	): Promise<JsonValue> {
		this.authority(authority);
		return this.rpc<JsonValue>({ type: 'execute', pageId, command, authority, uploadPaths: options?.uploadPaths });
	}
	observe(pageId: string, authority: ControlLease, scope?: SnapshotOptions): Promise<BrowserObservation> {
		this.authority(authority);
		return this.rpc<BrowserObservation>({ type: 'observe', pageId, authority, scope });
	}
	async watch(pageId: string, enabled: boolean): Promise<void> {
		await this.rpc({ type: 'watch', pageId, enabled });
	}
	readIdentity(): Promise<RuntimeIdentityState> {
		const authority = this.lease;
		if (!authority || authority.mode === 'agent')
			return Promise.reject(new AgentBrowserError('browser_identity_control_required'));
		this.authority(authority);
		return this.rpc<RuntimeIdentityState>({ type: 'readIdentity', authority });
	}
	async writeIdentity(seed: RuntimeIdentityState): Promise<void> {
		if (!this.provisioning) throw new AgentBrowserError('browser_target_not_empty');
		this.authority(this.provision);
		await this.rpc({ type: 'writeIdentity', seed, authority: this.provision });
	}
	async cancelDownload(downloadId: string): Promise<void> {
		await this.rpc({ type: 'cancelDownload', downloadId });
	}
	stop(): Promise<void> {
		if (this.stopped) return Promise.resolve();
		if (this.stopTask) return this.stopTask;
		this.closing = true;
		this.stopTask = (async () => {
			let reclaimed = false;
			try {
				reclaimed = (await this.native.call({ type: 'stop' }, 6000)).reclaimed === true;
			} catch {
				/* Independent receipt reclamation below. */
			}
			if (!reclaimed) await this.reclaimNative();
			await this.native.finish();
			if (this.worker && !this.workerExited) {
				const child = this.worker;
				await new Promise<void>((resolve, reject) => {
					const timer = setTimeout(
						() =>
							this.workerExited ? resolve() : reject(new AgentBrowserError('browser_cleanup_pending')),
						5000,
					);
					timer.unref();
					child.once('exit', () => {
						clearTimeout(timer);
						resolve();
					});
					child.kill();
				});
			}
			for (const task of this.pending.values()) {
				clearTimeout(task.timer);
				task.reject(new AgentBrowserError('browser_runtime_stopped'));
			}
			this.pending.clear();
			this.stopped = true;
			this.listeners.clear();
			this.released();
		})().finally(() => {
			this.stopTask = undefined;
		});
		return this.stopTask;
	}
}

export interface MainFactory extends BrowserRuntimeFactory {
	readerExecutable(): Promise<string>;
	recoverEphemeral(): Promise<void>;
}
interface FactoryOptions {
	dataRoot: string;
	ownerId: number;
	workerHash: string;
}
class RuntimeFactory implements MainFactory {
	private active = new Map<string, ManagedRuntime>();
	private starting = new Set<string>();
	private claimed = new Set<string>();
	private disposed = false;
	private keyPromise?: Promise<{ key: string; rootHash: string }>;
	private assetsPromise?: Promise<RuntimeAssets>;
	private owner: Owner;
	private onOwnerGone: () => void;
	constructor(
		private options: FactoryOptions,
		private electron: ElectronHost,
	) {
		const owner = electron.webContents.fromId(options.ownerId);
		if (!owner || owner.isDestroyed()) throw new AgentBrowserError('browser_owner_missing');
		this.owner = owner;
		this.onOwnerGone = () => {
			void this.dispose().catch(() => undefined);
		};
		owner.once('destroyed', this.onOwnerGone);
	}
	private key(): Promise<{ key: string; rootHash: string }> {
		return (this.keyPromise ??= ownershipKey(this.options.dataRoot, this.electron.app.getPath('userData')));
	}
	private assets(): Promise<RuntimeAssets> {
		return (this.assetsPromise ??= verifyRuntimeAssets(
			path.join(this.options.dataRoot, 'runtime'),
			this.options.workerHash,
		).catch((error) => {
			this.assetsPromise = undefined;
			throw error;
		}));
	}
	private paths(spaceId: string, purpose: 'space' | 'staging'): { profile: string; downloads: string } {
		if (!managedId(spaceId)) throw new AgentBrowserError('browser_space_invalid');
		return purpose === 'staging'
			? {
					profile: path.join(this.options.dataRoot, 'import-staging', spaceId, 'profile'),
					downloads: path.join(this.options.dataRoot, 'import-staging', spaceId, 'downloads'),
				}
			: {
					profile: path.join(this.options.dataRoot, 'profiles', spaceId),
					downloads: path.join(this.options.dataRoot, 'downloads', spaceId),
				};
	}
	async availability(): Promise<RuntimeAvailability> {
		if (process.platform !== 'linux' || process.arch !== 'x64')
			return {
				state: 'unsupported',
				code: 'browser_platform_unsupported',
				platform: process.platform + '-' + process.arch,
			};
		try {
			const assets = await this.assets();
			return { state: 'ready', version: assets.manifest.chromiumVersion, platform: assets.manifest.platform };
		} catch (error) {
			return {
				state: isMissing(error) ? 'missing' : 'invalid',
				code: isMissing(error) ? 'browser_runtime_missing' : code(error),
				platform: process.platform + '-' + process.arch,
			};
		}
	}
	async readerExecutable(): Promise<string> {
		return (await this.assets()).helper;
	}
	async start(options: {
		spaceId: string;
		runtimeId: string;
		ephemeral: boolean;
		purpose?: 'space' | 'staging';
	}): Promise<BrowserRuntime> {
		if (
			this.disposed ||
			this.owner.isDestroyed() ||
			!managedId(options.runtimeId) ||
			this.active.has(options.spaceId) ||
			this.starting.has(options.spaceId)
		)
			throw new AgentBrowserError('browser_runtime_busy');
		this.starting.add(options.spaceId);
		this.claimed.add(options.spaceId);
		let runtime: ManagedRuntime | undefined;
		try {
			const assets = await this.assets(),
				{ key, rootHash } = await this.key(),
				purpose = options.purpose ?? 'space',
				paths = this.paths(options.spaceId, purpose);
			if (purpose === 'staging' && !options.ephemeral)
				throw new AgentBrowserError('browser_staging_must_be_ephemeral');
			await this.reclaim(options.spaceId);
			const previous = await readManagedOwner(paths.profile, key, rootHash, options.spaceId, purpose);
			if (previous && previous.ephemeral !== options.ephemeral)
				throw new AgentBrowserError('browser_retention_mismatch');
			await prepareProfileVersion(paths.profile, assets.manifest.chromiumVersion);
			const fresh = (await fs.readdir(paths.profile)).length === 0;
			if ((await privateDirectory(paths.downloads)) !== paths.downloads)
				throw new AgentBrowserError('browser_storage_path_invalid');
			await writeManagedOwner(
				paths.profile,
				{
					version: 2,
					root: rootHash,
					spaceId: options.spaceId,
					runtimeId: options.runtimeId,
					purpose,
					ephemeral: options.ephemeral,
				},
				key,
			);
			if (this.disposed || this.owner.isDestroyed()) throw new AgentBrowserError('browser_owner_missing');
			runtime = new ManagedRuntime(
				options.runtimeId,
				options.spaceId,
				assets,
				paths.profile,
				paths.downloads,
				key,
				options.ephemeral,
				this.electron,
				() => this.reclaimPath(paths.profile, options.runtimeId),
				() => {
					if (this.active.get(options.spaceId) === runtime) this.active.delete(options.spaceId);
				},
			);
			this.active.set(options.spaceId, runtime);
			await runtime.start(fresh);
			if (this.disposed || this.owner.isDestroyed()) throw new AgentBrowserError('browser_owner_missing');
			return runtime;
		} catch (error) {
			if (runtime) {
				try {
					await runtime.stop();
				} catch {
					throw new AgentBrowserError('browser_cleanup_pending');
				}
			}
			throw error;
		} finally {
			this.starting.delete(options.spaceId);
		}
	}
	private async reclaimPath(profile: string, runtimeId?: string): Promise<void> {
		let bytes: Buffer;
		try {
			bytes = await readPrivateFile(path.join(profile, '.huhu-runtime-owner.json'), 8192);
		} catch (error) {
			if (isMissing(error)) return;
			throw error;
		}
		const { key } = await this.key(),
			owner = authenticatedRecord(bytes, key);
		if (
			owner.version !== 2 ||
			typeof owner.runtimeId !== 'string' ||
			(runtimeId && owner.runtimeId !== runtimeId) ||
			typeof owner.birth !== 'string' ||
			!/^\d+$/.test(owner.birth) ||
			!Number.isSafeInteger(owner.pid) ||
			Number(owner.pid) <= 1
		)
			throw new AgentBrowserError('browser_owner_invalid');
		const executable = (await this.assets()).helper;
		const reclaimed = await new Promise<boolean>((resolve, reject) => {
			const child = spawn(executable, ['--reclaim'], {
				stdio: ['pipe', 'pipe', 'ignore'],
				windowsHide: true,
				env: { PATH: '/usr/bin:/bin' },
			});
			let output = '';
			let timedOut = false;
			const timer = setTimeout(() => {
				timedOut = true;
				child.kill('SIGKILL');
			}, 6000);
			timer.unref();
			child.stdout.on('data', (data: Buffer) => {
				output += data.toString('utf8');
				if (output.length > 8192) {
					timedOut = true;
					child.kill('SIGKILL');
				}
			});
			child.on('error', () => {
				clearTimeout(timer);
				reject(new AgentBrowserError('browser_cleanup_pending'));
			});
			child.once('close', (status) => {
				clearTimeout(timer);
				try {
					resolve(!timedOut && status === 0 && object(JSON.parse(output)).reclaimed === true);
				} catch {
					resolve(false);
				}
			});
			child.stdin.on('error', () => undefined);
			child.stdin.end(JSON.stringify({ profile, runtimeId, key }));
		});
		if (!reclaimed) throw new AgentBrowserError('browser_cleanup_pending');
	}
	async reclaim(spaceId: string, runtimeId?: string): Promise<void> {
		const live = this.active.get(spaceId);
		if (live) {
			if (runtimeId && live.id !== runtimeId) throw new AgentBrowserError('browser_owner_mismatch');
			await live.stop();
		}
		const { key, rootHash } = await this.key();
		for (const purpose of ['space', 'staging'] as const) {
			const { profile } = this.paths(spaceId, purpose);
			const managed = await readManagedOwner(profile, key, rootHash, spaceId, purpose);
			try {
				const stat = await fs.lstat(profile);
				if (!stat.isDirectory() || stat.isSymbolicLink() || (await fs.realpath(profile)) !== profile)
					throw new AgentBrowserError('browser_owner_invalid');
			} catch (error) {
				if (isMissing(error)) continue;
				throw error;
			}
			if (!managed && (await fs.readdir(profile)).length) throw new AgentBrowserError('browser_owner_missing');
			if (managed && runtimeId && managed.runtimeId !== runtimeId)
				throw new AgentBrowserError('browser_owner_mismatch');
			await this.reclaimPath(profile, runtimeId ?? managed?.runtimeId);
		}
	}
	async removeProfile(spaceId: string): Promise<void> {
		await this.reclaim(spaceId);
		for (const purpose of ['space', 'staging'] as const) {
			const { profile, downloads } = this.paths(spaceId, purpose);
			for (const file of [profile, downloads]) {
				try {
					const stat = await fs.lstat(file);
					if (!stat.isDirectory() || stat.isSymbolicLink() || (await fs.realpath(file)) !== file)
						throw new AgentBrowserError('browser_storage_path_invalid');
					await fs.rm(file, { recursive: true });
				} catch (error) {
					if (!isMissing(error)) throw error;
				}
			}
			for (const suffix of ['.huhu-owner.json', '.huhu-version.json']) {
				const file = profile + suffix;
				try {
					await readPrivateFile(file, 8192);
					await fs.unlink(file);
				} catch (error) {
					if (!isMissing(error)) throw error;
				}
			}
		}
	}
	async recoverEphemeral(): Promise<void> {
		if (process.platform !== 'linux' || process.arch !== 'x64') return;
		const { key, rootHash } = await this.key();
		let pending = false;
		for (const purpose of ['space', 'staging'] as const) {
			const base = path.join(this.options.dataRoot, purpose === 'space' ? 'profiles' : 'import-staging');
			let names: string[];
			try {
				names = await fs.readdir(base);
			} catch (error) {
				if (isMissing(error)) continue;
				throw error;
			}
			if (names.length > 4096) throw new AgentBrowserError('browser_cleanup_pending');
			const candidates = new Set(
				names
					.map((name) =>
						purpose === 'space' && name.endsWith('.huhu-owner.json')
							? name.slice(0, -'.huhu-owner.json'.length)
							: name,
					)
					.filter(managedId),
			);
			for (const spaceId of candidates) {
				if (this.claimed.has(spaceId) || this.active.has(spaceId) || this.starting.has(spaceId)) continue;
				const { profile } = this.paths(spaceId, purpose);
				try {
					const managed = await readManagedOwner(profile, key, rootHash, spaceId, purpose);
					if (!managed) {
						try {
							if ((await fs.readdir(profile)).length) pending = true;
						} catch (error) {
							if (!isMissing(error)) throw error;
						}
						continue;
					}
					if (managed.ephemeral) await this.removeProfile(spaceId);
				} catch {
					pending = true;
				}
			}
		}
		if (pending) throw new AgentBrowserError('browser_cleanup_pending');
	}
	async installBundle(): Promise<void> {
		throw new AgentBrowserError('browser_bundle_selection_required');
	}
	async installSelectedBundle(source: string): Promise<void> {
		if (this.disposed || this.active.size || this.starting.size)
			throw new AgentBrowserError('browser_runtime_busy');
		await installRuntimeBundle(source, this.options.dataRoot, this.options.workerHash);
		this.assetsPromise = undefined;
	}
	async dispose(): Promise<void> {
		this.disposed = true;
		const results = await Promise.allSettled([...this.active.values()].map((runtime) => runtime.stop()));
		if (results.some((result) => result.status === 'rejected') || this.starting.size)
			throw new AgentBrowserError('browser_cleanup_pending');
		if (!this.owner.isDestroyed()) this.owner.removeListener('destroyed', this.onOwnerGone);
	}
}

/** Called only from bundledMain with fixed plugin code and the host's own WebContents id. */
export function createMainFactory(
	options: FactoryOptions,
): MainFactory & { installSelectedBundle(source: string): Promise<void> } {
	if (
		!path.isAbsolute(options.dataRoot) ||
		path.resolve(options.dataRoot) !== options.dataRoot ||
		!/^[a-f\d]{64}$/.test(options.workerHash)
	)
		throw new AgentBrowserError('browser_storage_path_invalid');
	const electron = electronModule as unknown as ElectronHost;
	return new RuntimeFactory(options, electron);
}

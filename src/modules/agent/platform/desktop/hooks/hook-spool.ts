import { setTimeout as setPoolTimeout } from 'node:timers';
import { SPOOL_GUARD } from './spool-guard';
import { readerLease } from './reader-lease';

/** Fixed physical limits shared by every publisher and both AutomationHooks instances. */
export const HOOK_SPOOL_LIMITS = Object.freeze({
	scopes: 32,
	collectors: 4,
	inputBytes: 16 * 1024 * 1024,
	inputMs: 3000,
	smallPerScope: 8,
	smallGlobal: 128,
	smallBytes: 64 * 1024,
	largePerScope: 2,
	largeGlobal: 4,
	largeBytes: 16 * 1024 * 1024 + 64 * 1024,
	smallBatch: 16,
	largeBatch: 1,
	idleMs: 300,
	metadataBytes: 256 * 1024,
	retainedGenerations: 32,
});

/** Internal protocol only. A publication is one physical raw event, not an activity DTO. */
export interface SpoolEvent {
	event: string;
	at: number;
	data: Record<string, unknown>;
	provider?: string;
	source?: { provider: string; instance: string; sequence: number; event: string; blockId?: string };
	delivery: string;
}
export interface HookSpoolScope {
	readonly env: Record<string, string>;
	close(): Promise<void>;
}
type Fs = typeof import('node:fs/promises');
type SyncFs = typeof import('node:fs');
type NodePath = typeof import('node:path');
interface Retiring {
	nonce: string;
	slot: number;
	token: string;
	globalDeleted?: boolean;
}
interface ScopeState {
	dir: string;
	token: string;
	receive: (event: SpoolEvent) => void;
	failed: (reason: string) => void;
	active: boolean;
	settled: () => void;
	failures: Map<string, number>;
	retiring: Map<string, Retiring>;
	removedDirs: Set<string>;
	nextKind: 'small' | 'large';
	fault?: string;
	close?: { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void; deadline: number };
}
const pools = new Map<string, Promise<HookSpool>>();
const nonce = () => crypto.randomUUID();
const code = (error: unknown) => (error as NodeJS.ErrnoException)?.code;

/** One reader for the canonical physical pool; the filesystem slots also bind external processes. */
export async function hookSpool(win: Window, root: string): Promise<HookSpool> {
	const fs = win.require('node:fs/promises') as Fs,
		path = win.require('node:path') as NodePath;
	await assertPath(fs, path, root);
	await fs.mkdir(root, { recursive: true, mode: 0o700 });
	const canonical = await fs.realpath(root);
	let pool = pools.get(canonical);
	if (!pool) {
		pool = HookSpool.open(fs, path, canonical, win.require('node:fs') as SyncFs);
		pools.set(canonical, pool);
		pool.catch(() => {
			if (pools.get(canonical) === pool) pools.delete(canonical);
		});
	}
	return pool;
}
async function assertPath(fs: Fs, path: NodePath, file: string, trustedRoot?: string): Promise<void> {
	let cursor = path.resolve(file);
	const stop = trustedRoot ? path.resolve(trustedRoot) : undefined;
	for (;;) {
		// Ancestors at and above the spool root are checked once per round. Re-walking
		// them for every file made a 32-scope drain miss its bound on Windows.
		if (stop && (cursor === stop || (process.platform === 'win32' && cursor.toLowerCase() === stop.toLowerCase())))
			return;
		try {
			if ((await fs.lstat(cursor)).isSymbolicLink()) throw new Error('hookSpoolSymlink');
		} catch (error) {
			if (code(error) !== 'ENOENT') throw error;
		}
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
}
async function claim(
	fs: Fs,
	path: NodePath,
	parent: string,
	count: number,
	captured: ReadonlyMap<string, unknown>,
): Promise<string> {
	for (let i = 0; i < count; i++) {
		const dir = path.join(parent, String(i));
		if (captured.has(dir)) continue;
		try {
			await fs.mkdir(dir, { mode: 0o700 });
			return dir;
		} catch (error) {
			if (code(error) !== 'EEXIST') throw error;
		}
	}
	throw new Error('hookCapacity');
}

export class HookSpool {
	private scopes = new Map<string, ScopeState>();
	// The physical Node pool outlives each pane and both AutomationHooks consumers.
	private timer?: ReturnType<typeof setPoolTimeout>;
	private reading?: Promise<void>;
	private cursor = 0;
	private preparing = 0;
	private readerNonce?: string;
	private readerOpening?: Promise<void>;
	private readerClosing?: Promise<void>;
	private readerRetiring?: { owner: string; dev: bigint; ino: bigint; claimRemoved: boolean };
	private lease?: Awaited<ReturnType<typeof readerLease>>;
	private finished: (NonNullable<ScopeState['close']> & { settled: () => void })[] = [];
	private retiringScopes = 0;
	private continueImmediately = false;
	private constructor(
		private fs: Fs,
		private path: NodePath,
		readonly root: string,
		private sync: SyncFs,
		private physicalRoot: string,
	) {}
	static async open(fs: Fs, path: NodePath, root: string, sync: SyncFs): Promise<HookSpool> {
		const physicalRoot = root;
		// Legacy nonce-only claims cannot establish death. Keep them isolated,
		// while all current readers share a kernel lease on this physical root.
		root = path.join(physicalRoot, 'generations-v2', nonce());
		await assertPath(fs, path, root);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });
		for (const name of ['scopes', 'collectors', 'small', 'large']) {
			await assertPath(fs, path, path.join(root, name));
			await fs.mkdir(path.join(root, name), { recursive: true, mode: 0o700 });
		}
		return new HookSpool(fs, path, root, sync, physicalRoot);
	}
	async prepare(
		receive: (event: SpoolEvent) => void,
		failed: (reason: string) => void,
		settled: () => void = () => {},
	): Promise<HookSpoolScope> {
		if (this.scopes.size + this.preparing + this.retiringScopes >= HOOK_SPOOL_LIMITS.scopes)
			throw new Error('hookCapacity');
		this.preparing++;
		try {
			await this.acquireReader();
			await assertPath(this.fs, this.path, this.root);
			const dir = await claim(
					this.fs,
					this.path,
					this.path.join(this.root, 'scopes'),
					HOOK_SPOOL_LIMITS.scopes,
					this.scopes,
				),
				token = nonce();
			try {
				for (const kind of ['small', 'large']) await this.fs.mkdir(this.path.join(dir, kind), { mode: 0o700 });
				await this.fs.writeFile(this.path.join(dir, 'active.json'), JSON.stringify({ token }), {
					flag: 'wx',
					mode: 0o600,
				});
			} catch (error) {
				await this.fs.rm(dir, { recursive: true, force: true });
				throw error;
			}
			const state: ScopeState = {
				dir,
				token,
				receive,
				failed,
				settled,
				active: true,
				failures: new Map(),
				retiring: new Map(),
				removedDirs: new Set(),
				nextKind: 'small',
			};
			this.scopes.set(dir, state);
			this.schedule(HOOK_SPOOL_LIMITS.idleMs);
			return {
				env: { HUHU_HOOK_ROOT: this.root, HUHU_HOOK_DIR: dir, HUHU_HOOK_TOKEN: token },
				close: () => this.close(state),
			};
		} finally {
			this.preparing--;
			if (!this.scopes.size && !this.preparing) {
				if (this.reading) await this.reading;
				await this.releaseReader();
				await this.removeUnusedGeneration();
			}
		}
	}
	private async removeUnusedGeneration(): Promise<void> {
		if (this.readerNonce || this.readerRetiring || this.retiringScopes) return;
		try {
			await this.fs.access(this.path.join(this.root, 'reader'));
		} catch (error) {
			if (code(error) !== 'ENOENT') throw error;
			// A rejected contender has never published this unique path.
			await assertPath(this.fs, this.path, this.root);
			await this.fs.rm(this.root, { recursive: true, force: true });
		}
	}
	private async acquireReader(): Promise<void> {
		if (this.readerClosing) await this.readerClosing;
		if (this.readerRetiring) await this.releaseReader();
		if (this.readerNonce) {
			this.lease?.assertHeld();
			const owned = JSON.parse(await this.read(this.path.join(this.root, 'reader', 'claim.json'), 256)) as {
				nonce: string;
			};
			if (owned.nonce !== this.readerNonce) throw new Error('hookReaderChanged');
			return;
		}
		if (this.readerOpening) return this.readerOpening;
		const opening = (async () => {
			await assertPath(this.fs, this.path, this.physicalRoot);
			const physical = await this.fs.lstat(this.physicalRoot, { bigint: true });
			this.lease ??= await readerLease(this.physicalRoot, physical.dev, physical.ino);
			this.lease.assertHeld();
			await this.recoverGenerations();
			for (const name of ['', 'scopes', 'collectors', 'small', 'large']) {
				await assertPath(this.fs, this.path, this.path.join(this.root, name));
				await this.fs.mkdir(this.path.join(this.root, name), { recursive: true, mode: 0o700 });
			}
			const dir = this.path.join(this.root, 'reader'),
				owner = nonce();
			await assertPath(this.fs, this.path, dir);
			try {
				await this.fs.mkdir(dir, { mode: 0o700 });
			} catch (error) {
				if (code(error) === 'EEXIST') throw new Error('hookReaderBusy');
				throw error;
			}
			try {
				await this.fs.writeFile(this.path.join(dir, 'claim.json'), JSON.stringify({ nonce: owner }), {
					flag: 'wx',
					mode: 0o600,
				});
			} catch (error) {
				await this.fs.rm(dir, { recursive: true, force: true });
				throw error;
			}
			this.readerNonce = owner;
		})();
		this.readerOpening = opening;
		try {
			await opening;
		} finally {
			if (this.readerOpening === opening) this.readerOpening = undefined;
		}
	}
	private async recoverGenerations(): Promise<void> {
		const parent = this.path.dirname(this.root);
		await assertPath(this.fs, this.path, parent);
		const entries = await this.fs.opendir(parent);
		let retained = 0;
		for await (const entry of entries) {
			if (++retained > HOOK_SPOOL_LIMITS.retainedGenerations) throw new Error('hookRecoveryCapacity');
			if (entry.name === this.path.basename(this.root)) continue;
			if (!/^[\da-f-]{36}$/.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink())
				throw new Error('hookRecoveryInvalid');
			this.lease!.assertHeld();
			// Names are never reused: a late publisher can only retain/write its
			// retired generation, never a newly admitted scope's physical slots.
			await this.fs.rm(this.path.join(parent, entry.name), { recursive: true, force: true });
		}
	}
	private async releaseReader(): Promise<void> {
		if (this.readerClosing) return this.readerClosing;
		if (!this.readerRetiring && (this.scopes.size || this.preparing || this.reading)) return;
		if (!this.readerRetiring && !this.readerNonce) {
			if (this.lease) {
				await this.lease.close();
				this.lease = undefined;
			}
			return;
		}
		const owner = this.readerNonce,
			dir = this.path.join(this.root, 'reader');
		const closing = (async () => {
			if (!this.readerRetiring) {
				const identity = await this.fs.lstat(dir, { bigint: true });
				if (!identity.isDirectory() || identity.isSymbolicLink()) throw new Error('hookReaderChanged');
				this.readerRetiring = { owner: owner!, dev: identity.dev, ino: identity.ino, claimRemoved: false };
				this.readerNonce = undefined;
			}
			const retiring = this.readerRetiring,
				identity = await this.fs.lstat(dir, { bigint: true });
			if (
				!identity.isDirectory() ||
				identity.isSymbolicLink() ||
				identity.dev !== retiring.dev ||
				identity.ino !== retiring.ino
			)
				throw new Error('hookReaderChanged');
			if (!retiring.claimRemoved) {
				const claim = JSON.parse(await this.read(this.path.join(dir, 'claim.json'), 256)) as { nonce: string };
				if (claim.nonce !== retiring.owner) throw new Error('hookReaderChanged');
				await this.fs.unlink(this.path.join(dir, 'claim.json'));
				retiring.claimRemoved = true;
			}
			await this.fs.rmdir(dir);
			this.readerRetiring = undefined;
			if (this.lease) {
				await this.lease.close();
				this.lease = undefined;
			}
		})();
		this.readerClosing = closing;
		try {
			await closing;
		} finally {
			if (this.readerClosing === closing) this.readerClosing = undefined;
		}
	}

	private async settleFinished(): Promise<void> {
		const finished = this.finished.splice(0);
		try {
			await this.releaseReader();
			for (const close of finished) {
				this.retiringScopes--;
				try {
					close.settled();
					close.resolve();
				} catch (error) {
					close.reject(new Error('hookConsumerCleanupFailed', { cause: error }));
				}
			}
		} catch (error) {
			this.finished.unshift(...finished);
			for (const close of finished) close.reject(new Error('hookReaderCleanupFailed', { cause: error }));
		}
	}

	private close(state: ScopeState): Promise<void> {
		if (state.close) return state.close.promise;
		state.active = false; // Callback and physical admission revocation do not return any occupied slots.
		let revocationError: unknown;
		try {
			let cursor = state.dir;
			for (;;) {
				if (this.sync.lstatSync(cursor).isSymbolicLink()) throw new Error('hookSpoolSymlink');
				const parent = this.path.dirname(cursor);
				if (parent === cursor) break;
				cursor = parent;
			}
			const file = this.path.join(state.dir, 'active.json'),
				handle = this.sync.openSync(file, this.sync.constants.O_RDONLY | (this.sync.constants.O_NOFOLLOW ?? 0));
			try {
				const bytes = Buffer.allocUnsafe(257),
					length = this.sync.readSync(handle, bytes, 0, 257, 0);
				const active = JSON.parse(bytes.toString('utf8', 0, length)) as { token?: unknown } | null;
				if (length > 256 || active?.token !== state.token) throw new Error('hookScopeChanged');
			} finally {
				this.sync.closeSync(handle);
			}
			this.sync.unlinkSync(file);
		} catch (error) {
			if (code(error) !== 'ENOENT') revocationError = error;
		}
		let resolve!: () => void, reject!: (error: Error) => void;
		const promise = new Promise<void>((yes, no) => {
			resolve = yes;
			reject = no;
		});
		state.close = { promise, resolve, reject, deadline: Date.now() + HOOK_SPOOL_LIMITS.inputMs + 500 };
		if (revocationError) reject(new Error('hookAdmissionRevocationFailed', { cause: revocationError }));
		this.schedule(0);
		return promise;
	}
	private schedule(delay: number): void {
		if (this.timer || this.reading || (!this.scopes.size && !this.finished.length && !this.readerRetiring)) return;
		this.timer = setPoolTimeout(() => {
			this.timer = undefined;
			this.reading = this.round(delay > 0).finally(async () => {
				this.reading = undefined;
				await this.settleFinished();
				const immediate = this.continueImmediately;
				this.continueImmediately = false;
				if (this.scopes.size || this.finished.length || this.readerRetiring)
					this.schedule(immediate ? 0 : HOOK_SPOOL_LIMITS.idleMs);
			});
		}, delay);
	}
	private report(state: ScopeState, reason: string): void {
		if (state.active) {
			try {
				state.failed(reason);
			} catch {
				/* A consumer cannot poison the shared reader. */
			}
		}
	}
	private async round(idle: boolean): Promise<void> {
		const states = [...this.scopes.values()];
		if (!states.length) return;
		try {
			await assertPath(this.fs, this.path, this.root);
		} catch {
			for (const state of states) this.report(state, 'hookSpoolReadFailed');
			return;
		}
		const start = this.cursor++ % states.length;
		let small = 0,
			large = 0,
			backlog = false,
			retried = false;
		for (let i = 0; i < states.length; i++) {
			const state = states[(start + i) % states.length]!;
			try {
				this.lease!.assertHeld();
				await assertPath(this.fs, this.path, state.dir, this.root);
				if (!state.active)
					await this.fs.unlink(this.path.join(state.dir, 'active.json')).catch((error) => {
						if (code(error) !== 'ENOENT') throw error;
					});
				try {
					const fault = await this.read(this.path.join(state.dir, 'fault.json'), 512, this.root);
					if (fault !== state.fault) {
						state.fault = fault;
						this.report(state, 'hookPublicationFailed');
					}
				} catch (error) {
					if (code(error) !== 'ENOENT') throw error;
				}
				let taken = false;
				const kinds =
					state.nextKind === 'small' ? (['small', 'large'] as const) : (['large', 'small'] as const);
				for (const kind of kinds) {
					// One directory listing per kind instead of probing every slot: each probe is a separate
					// filesystem round trip, which on Windows made a full round over many scopes take seconds.
					const slots = kind === 'small' ? HOOK_SPOOL_LIMITS.smallPerScope : HOOK_SPOOL_LIMITS.largePerScope;
					let entries: string[] = [];
					try {
						entries = await this.fs.readdir(this.path.join(state.dir, kind));
					} catch (error) {
						if (code(error) !== 'ENOENT') throw error;
					}
					const present = new Set(entries);
					const names: string[] = [];
					for (let n = 0; n < slots; n++) if (present.has(String(n))) names.push(String(n));

					if (
						taken ||
						(kind === 'small'
							? small >= HOOK_SPOOL_LIMITS.smallBatch
							: large >= HOOK_SPOOL_LIMITS.largeBatch)
					) {
						if (names.some((name) => (state.failures.get(kind + '/' + name) ?? 0) < 3)) backlog = true;
						continue;
					}
					for (const name of names) {
						if (!/^\d+$/.test(name) || Number(name) >= (kind === 'small' ? 8 : 2))
							throw new Error('hookReferenceInvalid');
						const key = kind + '/' + name,
							tombstone = (state.failures.get(key) ?? 0) >= 3;
						if (tombstone && (!idle || retried)) continue;
						if (tombstone) retried = true;
						const did = await this.consume(state, kind, name, this.root);
						if (
							did &&
							names.some((other) => other !== name && (state.failures.get(kind + '/' + other) ?? 0) < 3)
						)
							backlog = true;
						if (did) {
							taken = true;
							state.nextKind = kind === 'small' ? 'large' : 'small';
							if (kind === 'small') small++;
							else large++;
							break;
						}
					}
				}
				if (!state.active) await this.finishClose(state);
			} catch (error) {
				this.report(state, 'hookSpoolReadFailed');
				if (state.close && Date.now() >= state.close.deadline)
					state.close.reject(new Error('hookCleanupIncomplete', { cause: error }));
			}
		}
		if (backlog && ![...this.scopes.values()].every((s) => !s.active && Date.now() >= (s.close?.deadline ?? 0)))
			this.continueImmediately = true;
	}
	private async read(file: string, limit: number, trustedRoot?: string): Promise<string> {
		await assertPath(this.fs, this.path, file, trustedRoot);
		const handle = await this.fs.open(file, this.fs.constants.O_RDONLY | (this.fs.constants.O_NOFOLLOW ?? 0));
		try {
			if (!(await handle.stat()).isFile()) throw new Error('hookFileInvalid');
			const bytes = Buffer.allocUnsafe(limit + 1);
			let size = 0;
			while (size <= limit) {
				const value = await handle.read(bytes, size, limit + 1 - size, null);
				if (!value.bytesRead) break;
				size += value.bytesRead;
			}
			if (size > limit) throw new Error('hookFileTooLarge');
			return bytes.toString('utf8', 0, size);
		} finally {
			await handle.close();
		}
	}
	private async consume(
		state: ScopeState,
		kind: 'small' | 'large',
		local: string,
		trustedRoot?: string,
	): Promise<boolean> {
		const key = kind + '/' + local,
			refDir = this.path.join(state.dir, kind, local);
		let ref = state.retiring.get(key);
		if (!ref) {
			try {
				ref = JSON.parse(await this.read(this.path.join(refDir, 'ref.json'), 512, trustedRoot)) as Retiring;
			} catch (error) {
				if (code(error) === 'ENOENT') return false;
				throw error;
			}
			if (
				ref.token !== state.token ||
				typeof ref.nonce !== 'string' ||
				!/^[\da-f-]{36}$/.test(ref.nonce) ||
				!Number.isInteger(ref.slot) ||
				ref.slot < 0 ||
				ref.slot >= (kind === 'small' ? 128 : 4)
			)
				throw new Error('hookReferenceInvalid');
			const global = this.path.join(this.root, kind, String(ref.slot));
			const owner = JSON.parse(await this.read(this.path.join(global, 'claim.json'), 512, trustedRoot)) as {
				token: string;
				nonce: string;
				scope: string;
				local: string;
			};
			if (
				owner.token !== state.token ||
				owner.nonce !== ref.nonce ||
				owner.scope !== this.path.basename(state.dir) ||
				owner.local !== local
			)
				throw new Error('hookClaimInvalid');
			const ready = this.path.join(global, ref.nonce + '.ready'),
				consuming = this.path.join(global, ref.nonce + '.consuming');
			try {
				await this.fs.rename(ready, consuming);
			} catch (error) {
				if (code(error) !== 'ENOENT') throw error;
				if (state.active) return false;
				try {
					await this.fs.access(this.path.join(state.dir, 'ingress'));
					return false;
				} catch (missing) {
					if (code(missing) !== 'ENOENT') throw missing;
				}
			}
			state.retiring.set(key, ref); // Consume fence is captured before either consumer can have effects.
			try {
				const event = JSON.parse(
					await this.read(
						consuming,
						kind === 'small' ? HOOK_SPOOL_LIMITS.smallBytes : HOOK_SPOOL_LIMITS.largeBytes,
						trustedRoot,
					),
				) as SpoolEvent & { token: string };
				if (
					event.token !== state.token ||
					event.delivery !== ref.nonce ||
					typeof event.event !== 'string' ||
					typeof event.at !== 'number' ||
					!Number.isFinite(event.at) ||
					!event.data ||
					typeof event.data !== 'object' ||
					Array.isArray(event.data)
				)
					throw new Error('hookEventInvalid');
				if (state.active) {
					try {
						this.lease!.assertHeld();
						state.receive(event);
					} catch {
						this.report(state, 'hookConsumerFailed');
					}
				}
			} catch {
				this.report(state, 'hookEventInvalid');
			}
		}
		const global = this.path.join(this.root, kind, String(ref.slot));
		try {
			if (!ref.globalDeleted) {
				for (const suffix of ['.pending', '.ready', '.consuming'])
					await this.fs.unlink(this.path.join(global, ref.nonce + suffix)).catch((error) => {
						if (code(error) !== 'ENOENT') throw error;
					});
				// A failed reference unlink retains both slots. Never delete a reused global slot on retry.
				await this.fs.unlink(this.path.join(refDir, 'ref.json')).catch((error) => {
					if (code(error) !== 'ENOENT') throw error;
				});
				await this.fs.unlink(this.path.join(global, 'claim.json')).catch((error) => {
					if (code(error) !== 'ENOENT') throw error;
				});
				await this.fs.rmdir(global);
				ref.globalDeleted = true;
			}
			await this.fs.rmdir(refDir);
			state.retiring.delete(key);
			state.failures.delete(key);
		} catch {
			const count = (state.failures.get(key) ?? 0) + 1;
			state.failures.set(key, count);
			if (count === 3) this.report(state, 'hookCleanupFailed');
		}
		return true;
	}

	private async finishClose(state: ScopeState): Promise<void> {
		try {
			await this.fs.access(this.path.join(state.dir, 'ingress'));
			if (Date.now() >= state.close!.deadline) state.close!.reject(new Error('hookIngressOrphan'));
			return;
		} catch (error) {
			if (code(error) !== 'ENOENT') throw error;
		}
		for (const kind of ['small', 'large'])
			for (
				let n = 0;
				n < (kind === 'small' ? HOOK_SPOOL_LIMITS.smallPerScope : HOOK_SPOOL_LIMITS.largePerScope);
				n++
			) {
				try {
					await this.fs.access(this.path.join(state.dir, kind, String(n)));
					if (Date.now() >= state.close!.deadline)
						state.close!.reject(
							new Error('hookCleanupIncomplete', { cause: new Error('hookPublicationOrphan') }),
						);
					return;
				} catch (error) {
					if (code(error) !== 'ENOENT') throw error;
				}
			}
		for (const file of ['fault.json'])
			await this.fs.unlink(this.path.join(state.dir, file)).catch((error) => {
				if (code(error) !== 'ENOENT') throw error;
			});
		for (const kind of ['small', 'large'])
			if (!state.removedDirs.has(kind)) {
				await this.fs.rmdir(this.path.join(state.dir, kind));
				state.removedDirs.add(kind);
			}
		await this.fs.rmdir(state.dir);
		this.scopes.delete(state.dir);
		this.retiringScopes++;
		this.finished.push({ ...state.close!, settled: state.settled });
	}
}

/** Shared generated implementation: command hooks and native extensions use the same physical protocol. */
export const HOOK_PUBLISHER_SCRIPT = `
const hookLimits = ${JSON.stringify(HOOK_SPOOL_LIMITS)};
const root = process.env.HUHU_HOOK_ROOT;
function hookCode(error) { return error && error.code; }
${SPOOL_GUARD}
function hookClaim(parent, count) {
 hookPath(parent);
 for (let i = 0; i < count; i++) { const target = path.join(parent, String(i)); try { fs.mkdirSync(target, { mode: 0o700 }); return target; } catch (error) { if (hookCode(error) !== 'EEXIST') throw error; } }
 throw Error('hookCapacity');
}
function hookFault(reason) {
 try {
  hookGuard(); const file = path.join(dir, 'fault.json'); hookPath(file);
  const handle = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
   if (!fs.fstatSync(handle).isFile()) throw Error('hookMetadataInvalid');
   fs.ftruncateSync(handle, 0);
   fs.writeFileSync(handle, JSON.stringify({ nonce: crypto.randomUUID(), reason: typeof reason === 'string' && /^[a-zA-Z0-9]{1,64}$/.test(reason) ? reason : 'hookPublicationFailed' }));
  } finally { fs.closeSync(handle); }
 } catch {}
}
function hookIngress() {
 let ingress, collector; const owner = crypto.randomUUID();
 hookGuard(); const candidate = path.join(dir, 'ingress'); fs.mkdirSync(candidate, { mode: 0o700 }); ingress = candidate;
 try { fs.writeFileSync(path.join(ingress, 'claim.json'), JSON.stringify({ nonce: owner }), { flag: 'wx', mode: 0o600 }); }
 catch (error) { fs.rmSync(ingress, { recursive: true, force: true }); throw error; }
 let released = false;
 return {
  collect() {
   if (released) throw Error('hookScopeClosed'); if (collector) return true; hookGuard();
   try { collector = hookClaim(path.join(root, 'collectors'), hookLimits.collectors); }
   catch (error) { if (error.message === 'hookCapacity') return false; throw error; }
   try { fs.writeFileSync(path.join(collector, 'claim.json'), JSON.stringify({ nonce: owner, scope: path.basename(dir), token }), { flag: 'wx', mode: 0o600 }); hookGuard(); return true; }
   catch (error) { fs.rmSync(collector, { recursive: true, force: true }); collector = undefined; throw error; }
  },
  release() {
   if (released) return; released = true;
   for (const target of [collector, ingress]) { if (!target) continue; const value = hookMetadata(path.join(target, 'claim.json'), 512); if (value.nonce !== owner) throw Error('hookClaimChanged'); fs.unlinkSync(path.join(target, 'claim.json')); fs.rmdirSync(target); }
  }
 };
}
function hookTicket() {
 const ticket = hookIngress(); try { if (!ticket.collect()) throw Error('hookCapacity'); return () => ticket.release(); } catch (error) { ticket.release(); throw error; }
}

function hookJsonBytes(value, max, depth = 0) {
 let total = 0;
 function add(n) { total += n; if (total > max) throw Error('hookPublicationTooLarge'); }
 function string(text) { add(2); for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); if (c === 34 || c === 92 || c === 8 || c === 9 || c === 10 || c === 12 || c === 13) add(2); else if (c < 32) add(6); else if (c < 128) add(1); else if (c < 2048) add(2); else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { add(4); i++; } else if (c >= 0xd800 && c <= 0xdfff) add(6); else add(3); } }
 function visit(item, level) {
  if (level > 8) throw Error('hookPayloadInvalid');
  if (item === null) return add(4); if (typeof item === 'string') return string(item); if (typeof item === 'number' && Number.isFinite(item)) return add(String(item).length); if (typeof item === 'boolean') return add(item ? 4 : 5);
  if (!item || typeof item !== 'object' || Array.isArray(item) || Object.getPrototypeOf(item) !== Object.prototype) throw Error('hookPayloadInvalid');
  const keys = Object.keys(item); if (keys.length > 32 || Object.prototype.hasOwnProperty.call(item, 'toJSON')) throw Error('hookPayloadInvalid'); add(2); let first = true;
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(item, key); if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw Error('hookPayloadInvalid'); if (!first) add(1); first = false; string(key); add(1); visit(descriptor.value, level + 1); }
 }
 visit(value, depth); return total;
}
function hookPublish(event, data, source, provider) {
 hookGuard(); const publication = crypto.randomUUID();
 const envelope = { token, event, at: Date.now(), data, delivery: publication }; if (source) envelope.source = source; if (provider) envelope.provider = provider;
 const bytes = hookJsonBytes(envelope, hookLimits.largeBytes), kind = bytes <= hookLimits.smallBytes ? 'small' : 'large';
 let local, global, committed = false;
 try {
  local = hookClaim(path.join(dir, kind), kind === 'small' ? hookLimits.smallPerScope : hookLimits.largePerScope);
  global = hookClaim(path.join(root, kind), kind === 'small' ? hookLimits.smallGlobal : hookLimits.largeGlobal);
  const metadata = { token, nonce: publication, scope: path.basename(dir), local: path.basename(local) };
  fs.writeFileSync(path.join(global, 'claim.json'), JSON.stringify(metadata), { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(path.join(local, 'ref.json'), JSON.stringify({ token, nonce: publication, slot: Number(path.basename(global)) }), { flag: 'wx', mode: 0o600 });
  hookGuard(); const body = JSON.stringify(envelope);
  if (Buffer.byteLength(body) !== bytes) throw Error('hookEncodingChanged');
  fs.writeFileSync(path.join(global, publication + '.pending'), body, { flag: 'wx', mode: 0o600 });
  hookGuard(); fs.renameSync(path.join(global, publication + '.pending'), path.join(global, publication + '.ready')); committed = true;
 } finally {
  if (!committed) { if (global) fs.rmSync(global, { recursive: true, force: true }); if (local) fs.rmSync(local, { recursive: true, force: true }); }
 }
}
function post(event, data, source) {
 let release, prepared; try { release = hookTicket(); prepared = typeof data === 'function' ? data() : data; hookPublish(event, prepared, source); return true; } catch (error) { hookFault(error.message); return false; } finally { prepared = undefined; if (release) { try { release(); } catch (error) { hookFault(error.message); } } }
}
`;

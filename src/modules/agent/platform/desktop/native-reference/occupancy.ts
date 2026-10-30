import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { nativeOccupancyDigest, type OccupancyIdentity } from './reference';

/**
 * Cross-instance occupancy of one native conversation.
 *
 * The lock lives in a per-user directory outside every Vault (a Vault may be synchronised, and two HUHU instances
 * of different Vaults share the same provider account). Creation is atomic and exclusive. A lock is reclaimed only
 * when the owner process is proven gone; anything unverifiable is reported as a conflict and never stolen.
 */
export interface OccupancyOwner {
	readonly instanceId: string;
	readonly vaultId: string;
	readonly spaceId: string;
	readonly sessionId: string;
	readonly runtimeId?: string;
}
export interface OccupancyRecord extends OccupancyOwner {
	readonly version: 1;
	readonly digest: string;
	readonly lockId: string;
	readonly provider: string;
	readonly nativeSessionId: string;
	readonly pid: number;
	/** Process start marker; with the pid it distinguishes a recycled pid from the original owner. */
	readonly processStart?: string;
	readonly hostname: string;
	readonly acquiredAt: number;
}
export type Liveness = 'alive' | 'dead' | 'unknown';
export type OccupancyConflictReason = 'held' | 'unverified-owner' | 'unreadable' | 'reclaim-busy';
export type AcquireResult =
	| { readonly kind: 'acquired'; readonly lease: OccupancyLease }
	| {
			readonly kind: 'conflict';
			readonly reason: OccupancyConflictReason;
			/** Present unless the lock file itself could not be read. */
			readonly owner?: OccupancyRecord;
			/** True when the holder is this very instance (the caller should locate its own runtime). */
			readonly self: boolean;
	  };

export interface OccupancyPorts {
	/** Per-user state directory. Never inside a Vault. */
	readonly directory: string;
	readonly pid: number;
	readonly hostname: string;
	now(): number;
	/**
	 * Instances of THIS process that are still alive. A record of this very process whose instance is gone
	 * (plugin reloaded) is stale even though the pid is alive.
	 */
	localInstanceLive?(instanceId: string): boolean;
	/** `null`: no such process. `undefined`: process exists but its start marker is unavailable. */
	processStart(pid: number): Promise<string | null | undefined>;
}

/** Linux and macOS expose a start marker; elsewhere the pid check alone is used and unknown reads as alive. */
export async function processStartMarker(pid: number): Promise<string | null | undefined> {
	try {
		process.kill(pid, 0);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ESRCH') return null;
		if ((error as NodeJS.ErrnoException).code !== 'EPERM') return undefined;
	}
	if (process.platform === 'linux') {
		try {
			const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
			// The command name may contain spaces and parentheses; fields resume after the last ')'.
			const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
			return fields[19] || undefined;
		} catch (error) {
			return (error as NodeJS.ErrnoException).code === 'ENOENT' ? null : undefined;
		}
	}
	if (process.platform === 'darwin')
		return new Promise((resolve) => {
			execFile('ps', ['-o', 'lstart=', '-p', String(pid)], { timeout: 3000 }, (error, stdout) => {
				if (error) resolve(undefined);
				else resolve(stdout.trim() || null);
			});
		});
	return undefined;
}

/**
 * Process-wide, not module-wide: Obsidian evaluates the plugin bundle again on reload, and the earlier load's
 * runtimes may still be stopping. An instance stays registered until its own shutdown has released every claim
 * after confirmed exits; only then is a record of this same process dead.
 */
const INSTANCES = Symbol.for('huhu.native-refs.instances');
function localInstances(): Set<string> {
	const holder = process as unknown as Record<symbol, Set<string> | undefined>;
	return (holder[INSTANCES] ??= new Set<string>());
}
/** Mark an instance of this process alive until the returned function runs. */
export function registerLocalInstance(instanceId: string): () => void {
	localInstances().add(instanceId);
	return () => void localInstances().delete(instanceId);
}
/**
 * The per-user OS application-state directory, deliberately not under the home folder's dot-directories that a
 * Vault opened at the home directory would sync: `$XDG_STATE_HOME/huhu/native-refs` (default
 * `~/.local/state/huhu/native-refs`) on Linux, `%LOCALAPPDATA%\HUHU\native-refs` on Windows and
 * `~/Library/Application Support/HUHU/native-refs` on macOS.
 */
export function defaultOccupancyDirectory(
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = process.env,
	home: string = os.homedir(),
): string {
	if (platform === 'win32')
		return path.win32.join(env.LOCALAPPDATA || path.win32.join(home, 'AppData', 'Local'), 'HUHU', 'native-refs');
	// The directory follows the target platform's rules, not the host's separators.
	if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'HUHU', 'native-refs');
	const state =
		env.XDG_STATE_HOME && path.posix.isAbsolute(env.XDG_STATE_HOME)
			? env.XDG_STATE_HOME
			: path.posix.join(home, '.local', 'state');
	return path.posix.join(state, 'huhu', 'native-refs');
}
/** Canonical spelling of a provider-store path: symlinks resolved, case folded where the filesystem is. */
export async function canonicalStorePath(file: string): Promise<string> {
	let real = path.resolve(file);
	try {
		real = await fs.realpath(file);
	} catch {
		/* A path that cannot be resolved keeps its absolute spelling. */
	}
	return process.platform === 'win32' ? real.toLowerCase() : real;
}
export function defaultOccupancyPorts(directory = defaultOccupancyDirectory()): OccupancyPorts {
	return {
		directory,
		pid: process.pid,
		hostname: os.hostname(),
		now: Date.now,
		localInstanceLive: (id) => localInstances().has(id),
		processStart: processStartMarker,
	};
}

const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
function parseRecord(text: string): OccupancyRecord | undefined {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return undefined;
	}
	if (
		!object(value) ||
		value.version !== 1 ||
		typeof value.digest !== 'string' ||
		typeof value.lockId !== 'string' ||
		typeof value.instanceId !== 'string' ||
		typeof value.vaultId !== 'string' ||
		typeof value.spaceId !== 'string' ||
		typeof value.sessionId !== 'string' ||
		typeof value.provider !== 'string' ||
		typeof value.nativeSessionId !== 'string' ||
		typeof value.hostname !== 'string' ||
		!Number.isSafeInteger(value.pid) ||
		typeof value.acquiredAt !== 'number' ||
		(value.processStart !== undefined && typeof value.processStart !== 'string') ||
		(value.runtimeId !== undefined && typeof value.runtimeId !== 'string')
	)
		return undefined;
	return value as unknown as OccupancyRecord;
}
const errno = (error: unknown) => (error as NodeJS.ErrnoException | undefined)?.code;
const GUARD_STALE_MS = 30_000;
const TEMPORARY_STALE_MS = 60_000;

export class OccupancyLease {
	private released?: Promise<void>;
	constructor(
		private readonly owner: NativeOccupancy,
		private record: OccupancyRecord,
		private readonly file: string,
	) {}
	get runtimeId(): string | undefined {
		return this.record.runtimeId;
	}
	get digest(): string {
		return this.record.digest;
	}
	get identityDigest(): string {
		return this.record.digest;
	}
	/** Record which runtime generation the lock now protects. Refuses to touch a lock another owner holds. */
	async bind(runtimeId: string): Promise<void> {
		if (this.released) return;
		const next = { ...this.record, runtimeId };
		await this.owner.rewrite(this.file, this.record.lockId, next);
		this.record = next;
	}
	/** Remove the lock only if it is still the one this lease created. Idempotent. */
	release(): Promise<void> {
		return (this.released ??= this.owner.remove(this.file, this.record.lockId));
	}
}

export class NativeOccupancy {
	constructor(private readonly ports: OccupancyPorts = defaultOccupancyPorts()) {}
	private file(digest: string): string {
		return path.join(this.ports.directory, `${digest}.lock`);
	}
	/** The current holder, if any. Pure read; never reclaims. */
	async inspect(identity: OccupancyIdentity): Promise<OccupancyRecord | undefined> {
		try {
			return parseRecord(await fs.readFile(this.file(nativeOccupancyDigest(identity)), 'utf8'));
		} catch {
			return undefined;
		}
	}
	/** Verdict on a recorded owner. Only `dead` permits reclaim. */
	async liveness(record: OccupancyRecord): Promise<Liveness> {
		if (record.hostname !== this.ports.hostname) return 'unknown';
		// Same process, but the HUHU instance that took the lock was unloaded: it can no longer run anything.
		if (
			record.pid === this.ports.pid &&
			this.ports.localInstanceLive &&
			!this.ports.localInstanceLive(record.instanceId)
		)
			return 'dead';
		const start = await this.ports.processStart(record.pid);
		if (start === null) return 'dead';
		// Same pid with a different start marker is a recycled pid: the original owner is gone.
		if (start !== undefined && record.processStart !== undefined && start !== record.processStart) return 'dead';
		return 'alive';
	}
	async acquire(identity: OccupancyIdentity, owner: OccupancyOwner): Promise<AcquireResult> {
		const digest = nativeOccupancyDigest(identity);
		const file = this.file(digest);
		await fs.mkdir(this.ports.directory, { recursive: true, mode: 0o700 });
		await this.sweepTemporary();
		const start = await this.ports.processStart(this.ports.pid);
		const make = (): OccupancyRecord => ({
			version: 1,
			digest,
			lockId: randomUUID(),
			provider: identity.provider,
			nativeSessionId: identity.nativeSessionId,
			...owner,
			pid: this.ports.pid,
			...(start ? { processStart: start } : {}),
			hostname: this.ports.hostname,
			acquiredAt: this.ports.now(),
		});
		for (let attempt = 0; attempt < 3; attempt += 1) {
			const record = make();
			try {
				await this.create(file, record);
				return { kind: 'acquired', lease: new OccupancyLease(this, record, file) };
			} catch (error) {
				if (errno(error) !== 'EEXIST') throw error;
			}
			let text: string;
			try {
				text = await fs.readFile(file, 'utf8');
			} catch (error) {
				if (errno(error) === 'ENOENT') continue;
				throw error;
			}
			const existing = parseRecord(text);
			if (!existing) return { kind: 'conflict', reason: 'unreadable', self: false };
			const self = existing.instanceId === owner.instanceId && existing.pid === this.ports.pid;
			if (self) return { kind: 'conflict', reason: 'held', owner: existing, self };
			const verdict = await this.liveness(existing);
			if (verdict !== 'dead')
				return {
					kind: 'conflict',
					reason: verdict === 'alive' ? 'held' : 'unverified-owner',
					owner: existing,
					self: false,
				};
			if (!(await this.reclaim(file, digest, existing)))
				return { kind: 'conflict', reason: 'reclaim-busy', owner: existing, self: false };
		}
		const holder = await this.inspect(identity);
		return { kind: 'conflict', reason: 'held', ...(holder ? { owner: holder } : {}), self: false };
	}
	/** A crash between writing and linking leaves a `.tmp` file; nothing else ever reads one. */
	private async sweepTemporary(): Promise<void> {
		try {
			for (const name of await fs.readdir(this.ports.directory)) {
				if (!name.endsWith('.tmp')) continue;
				const file = path.join(this.ports.directory, name);
				const age = await fs.stat(file).then(
					(value) => this.ports.now() - value.mtimeMs,
					() => 0,
				);
				if (age > TEMPORARY_STALE_MS) await fs.unlink(file).catch(() => {});
			}
		} catch {
			/* Housekeeping only. */
		}
	}
	/** Atomic exclusive create whose content is complete the moment the name becomes visible. */
	private async create(file: string, record: OccupancyRecord): Promise<void> {
		const temporary = `${file}.${randomUUID()}.tmp`;
		const handle = await fs.open(temporary, 'wx', 0o600);
		try {
			await handle.writeFile(JSON.stringify(record));
			await handle.sync();
		} finally {
			await handle.close();
		}
		try {
			await fs.link(temporary, file);
		} catch (error) {
			await fs.unlink(temporary).catch(() => {});
			if (errno(error) === 'EEXIST') throw error;
			// Filesystems without hard links fall back to exclusive create.
			const direct = await fs.open(file, 'wx', 0o600);
			try {
				await direct.writeFile(JSON.stringify(record));
				await direct.sync();
			} finally {
				await direct.close();
			}
			return;
		}
		await fs.unlink(temporary).catch(() => {});
	}
	/** Serialise reclaimers, then remove the lock only if it is still the exact dead one that was observed. */
	private async reclaim(file: string, digest: string, stale: OccupancyRecord): Promise<boolean> {
		const guard = path.join(this.ports.directory, `${digest}.reclaim`);
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				await (await fs.open(guard, 'wx', 0o600)).close();
			} catch (error) {
				if (errno(error) !== 'EEXIST') throw error;
				// A crashed reclaimer leaves its guard behind; any reclaimer re-verifies the lock identity below.
				const age = await fs.stat(guard).then(
					(value) => this.ports.now() - value.mtimeMs,
					() => 0,
				);
				if (age > GUARD_STALE_MS) {
					await fs.unlink(guard).catch(() => {});
					continue;
				}
				return false;
			}
			try {
				const current = parseRecord(await fs.readFile(file, 'utf8').catch(() => ''));
				if (current?.lockId === stale.lockId) await fs.unlink(file);
				return true;
			} finally {
				await fs.unlink(guard).catch(() => {});
			}
		}
		return false;
	}
	/** @internal used by leases */
	async remove(file: string, lockId: string): Promise<void> {
		const current = parseRecord(await fs.readFile(file, 'utf8').catch(() => ''));
		if (current?.lockId === lockId) await fs.unlink(file).catch(() => {});
	}
	/** @internal used by leases */
	async rewrite(file: string, lockId: string, next: OccupancyRecord): Promise<void> {
		const current = parseRecord(await fs.readFile(file, 'utf8').catch(() => ''));
		if (current?.lockId !== lockId) throw new Error('native-reference lock was lost');
		const temporary = `${file}.${randomUUID()}.tmp`;
		await fs.writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
		await fs.rename(temporary, file);
	}
}

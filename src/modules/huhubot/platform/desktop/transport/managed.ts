import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { setTimeout, clearTimeout } from 'node:timers';
import { Readable, Writable } from 'node:stream';
import type { BotClient, BotErrorData, CallOptions } from '../../../api';
import {
	BotRpcError,
	HapConnection,
	type ConnectionLimits,
	type HapTransport,
} from '../../../core/protocol/connection';
import { MAX_FRAME_BYTES } from '../../../core/protocol/codec';
import { DesktopCredentialClient } from '../credentials/client';

export interface ManagedRunnerOptions {
	/** Absolute path to the binary already verified by the install owner; never resolved using PATH. */
	binary: string;
	profileDir: string;
	/** Explicit, existing directory owned by the managed runtime. */
	cwd: string;
	managed?: boolean;
	/** Opt-in private anonymous pipes, available only to the managed owner. */
	credentialChannel?: boolean;
	environment?: Readonly<Record<string, string | undefined>>;
	maxQueuedBytes?: number;
	maxQueuedFrames?: number;
	shutdownGraceMs?: number;
}
interface Write {
	bytes: Uint8Array;
	resolve(): void;
	reject(reason: Error): void;
}
const ENVIRONMENT_KEYS = [
	'HOME',
	'USERPROFILE',
	'LOCALAPPDATA',
	'APPDATA',
	'XDG_STATE_HOME',
	'XDG_CONFIG_HOME',
	'XDG_DATA_HOME',
	'TMPDIR',
	'TEMP',
	'TMP',
	'SystemRoot',
	'SYSTEMROOT',
	'WINDIR',
	'LANG',
	'LC_ALL',
	'TZ',
	'DBUS_SESSION_BUS_ADDRESS',
	'XDG_RUNTIME_DIR',
] as const;

/** Provider/CLI secrets, PATH, runtime injection and SDK credential selectors are never inherited. */
export function managedRunnerEnvironment(
	source: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
	const environment: Record<string, string> = {};
	for (const key of ENVIRONMENT_KEYS) {
		const value = source[key];
		if (value !== undefined && !value.includes('\0')) environment[key] = value;
	}
	return environment;
}

function limit(value: number, maximum: number): number {
	if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error('INVALID_TRANSPORT_LIMIT');
	return value;
}

/** A bounded single-writer stdio transport; stderr content is suppressed so it cannot expose private data. */
export class DesktopHapTransport implements HapTransport {
	private readonly queue: Write[] = [];
	private queuedBytes = 0;
	private active?: Write;
	private dataListener?: (bytes: Uint8Array) => void;
	private closeListener?: (reason: Error) => void;
	private ended?: Error;
	private stderrBytes = 0;
	private stderrTail = '';
	private startupFault?: BotRpcError;
	private killTimer?: ReturnType<typeof setTimeout>;
	private forceKillTimer?: ReturnType<typeof setTimeout>;
	private readonly credentialClient?: DesktopCredentialClient;
	readonly exited: Promise<void>;

	private constructor(
		private readonly child: ChildProcessWithoutNullStreams,
		private readonly maxQueuedBytes: number,
		private readonly maxQueuedFrames: number,
		private readonly shutdownGraceMs: number,
		credentialChannel: boolean,
	) {
		this.exited = new Promise((resolve) =>
			child.once('close', () => {
				this.clearKillTimers();
				resolve();
			}),
		);
		child.stdout.on('data', (chunk: Uint8Array) => {
			if (this.ended) return;
			if (!this.dataListener) {
				this.fail(new Error('UNATTACHED_STDOUT'));
				return;
			}
			try {
				this.dataListener(chunk);
			} catch {
				this.fail(new Error('STDOUT_CONSUMER_FAILED'));
			}
		});
		child.stdout.on('end', () => this.fail(new Error('STDOUT_EOF')));
		child.stderr.on('data', (chunk: Uint8Array) => this.readStderr(chunk));
		child.stdin.on('error', () => this.fail(new Error('STDIN_WRITE_FAILED')));
		child.on('error', () => this.fail(new Error('RUNNER_SPAWN_FAILED')));
		child.on('exit', (code, signal) =>
			this.fail(new Error(signal ? `RUNNER_EXIT_SIGNAL_${signal}` : `RUNNER_EXIT_${code ?? 'UNKNOWN'}`)),
		);
		if (credentialChannel) {
			const output = child.stdio[3];
			const input = child.stdio[4];
			if (output instanceof Writable && input instanceof Readable)
				this.credentialClient = new DesktopCredentialClient(output, input, (reason) => this.fail(reason));
			else this.fail(new Error('CREDENTIAL_PIPE_UNAVAILABLE'));
		}
	}

	static async launch(options: ManagedRunnerOptions): Promise<DesktopHapTransport> {
		if (options.credentialChannel && options.managed === false) throw new Error('CREDENTIAL_MANAGED_OWNER_REQUIRED');
		if (![options.binary, options.profileDir, options.cwd].every(isAbsolute))
			throw new Error('ABSOLUTE_PATH_REQUIRED');
		const maxQueuedBytes = limit(options.maxQueuedBytes ?? MAX_FRAME_BYTES * 2 + 8, MAX_FRAME_BYTES * 16);
		const maxQueuedFrames = limit(options.maxQueuedFrames ?? 32, 256);
		const shutdownGraceMs = limit(options.shutdownGraceMs ?? 4000, 30_000);
		const [binary, cwd] = await Promise.all([realpath(options.binary), realpath(options.cwd)]);
		const [binaryInfo, cwdInfo] = await Promise.all([stat(binary), stat(cwd)]);
		if (!binaryInfo.isFile() || !cwdInfo.isDirectory()) throw new Error('INVALID_MANAGED_LAUNCH_PATH');
		const args = ['--stdio', '--profile', options.profileDir];
		if (options.managed !== false) args.push('--managed');
		if (options.credentialChannel) args.push('--credential-channel=stdio-v1');
		const child = spawn(binary, args, {
			cwd,
			env: managedRunnerEnvironment(options.environment),
			stdio: options.credentialChannel ? ['pipe', 'pipe', 'pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: false,
			detached: false,
		});
		return new DesktopHapTransport(child, maxQueuedBytes, maxQueuedFrames, shutdownGraceMs, options.credentialChannel === true);
	}

	async openCredentials(profileId: string): Promise<DesktopCredentialClient> {
		if (!this.credentialClient) throw new Error('CREDENTIAL_CHANNEL_UNAVAILABLE');
		await this.credentialClient.connect(profileId);
		return this.credentialClient;
	}

	get diagnostics(): { stderrBytes: number; stderr: string } {
		return {
			stderrBytes: this.stderrBytes,
			stderr: this.startupFault?.message ?? (this.stderrBytes ? '[stderr suppressed]' : ''),
		};
	}
	get startupError(): Error | undefined {
		return this.startupFault;
	}

	private readStderr(chunk: Uint8Array): void {
		this.stderrBytes = Math.min(Number.MAX_SAFE_INTEGER, this.stderrBytes + chunk.length);
		this.stderrTail = (this.stderrTail + new TextDecoder().decode(chunk)).slice(-4096);
		const lines = this.stderrTail.split('\n');
		this.stderrTail = lines.pop() ?? '';
		for (const line of lines) {
			try {
				const parsed: unknown = JSON.parse(line);
				if (typeof parsed !== 'object' || parsed === null) continue;
				const data = parsed as Record<string, unknown>;
				const safeReasons = [
					'CLI_ARGUMENTS_INVALID',
					'LOCAL_ROOT_UNAVAILABLE',
					'PROFILE_OPEN_FAILED',
					'PROFILE_ALREADY_OPEN',
					'PROFILE_OUTSIDE_MANAGED_ROOT',
					'PROFILE_DB_OUTSIDE_MANAGED_ROOT',
					'PROFILE_DB_HARDLINK_UNSAFE',
					'PROFILE_SCHEMA_INCOMPATIBLE',
					'PROFILE_MIGRATION_FOREIGN_KEY_FAILED',
				];
				const safeKinds = [
					'INVALID_ARGUMENT',
					'CAPABILITY_DENIED',
					'CONFLICT',
					'INSTANCE_CONFLICT',
					'PROTOCOL_INCOMPATIBLE',
				];
				if (
					typeof data.kind === 'string' &&
					safeKinds.includes(data.kind) &&
					typeof data.reason === 'string' &&
					safeReasons.includes(data.reason)
				)
					this.startupFault = new BotRpcError(-32000, {
						kind: data.kind as BotErrorData['kind'],
						reason: data.reason,
						retryable: false,
						correlationId: 'runner-startup',
					});
			} catch {
				/* Unstructured stderr is deliberately suppressed. */
			}
		}
	}

	onData(listener: (bytes: Uint8Array) => void): () => void {
		if (this.dataListener) throw new Error('TRANSPORT_ALREADY_ATTACHED');
		this.dataListener = listener;
		return () => {
			if (this.dataListener === listener) this.dataListener = undefined;
		};
	}

	onClose(listener: (reason: Error) => void): () => void {
		if (this.closeListener) throw new Error('TRANSPORT_ALREADY_ATTACHED');
		this.closeListener = listener;
		if (this.ended) listener(this.ended);
		return () => {
			if (this.closeListener === listener) this.closeListener = undefined;
		};
	}

	send(bytes: Uint8Array): Promise<void> {
		if (this.ended) return Promise.reject(this.ended);
		if (
			bytes.length > MAX_FRAME_BYTES + 4 ||
			this.queuedBytes + bytes.length > this.maxQueuedBytes ||
			this.queue.length + (this.active ? 1 : 0) >= this.maxQueuedFrames
		) {
			const error = new Error('STREAM_SLOW_CONSUMER');
			this.fail(error);
			return Promise.reject(error);
		}
		return new Promise((resolve, reject) => {
			this.queue.push({ bytes: bytes.slice(), resolve, reject });
			this.queuedBytes += bytes.length;
			this.flush();
		});
	}

	private flush(): void {
		if (this.ended || this.active) return;
		const write = this.queue.shift();
		if (!write) return;
		this.active = write;
		this.child.stdin.write(write.bytes, (error?: Error | null) => {
			if (this.active !== write) return;
			this.active = undefined;
			this.queuedBytes -= write.bytes.length;
			if (error) {
				write.reject(new Error('STDIN_WRITE_FAILED'));
				this.fail(new Error('STDIN_WRITE_FAILED'));
			} else {
				write.resolve();
				this.flush();
			}
		});
	}

	private fail(reason: Error): void {
		if (this.ended) return;
		this.ended = reason;
		this.credentialClient?.close();
		this.active?.reject(reason);
		this.active = undefined;
		for (const write of this.queue.splice(0)) write.reject(reason);
		this.queuedBytes = 0;
		try {
			this.closeListener?.(reason);
		} catch {
			/* A consumer cannot prevent process cleanup. */
		}
		this.child.stdin.end();
		if (this.child.exitCode === null && this.child.signalCode === null && !this.killTimer) {
			this.killTimer = setTimeout(() => {
				if (this.child.exitCode !== null || this.child.signalCode !== null) return;
				this.child.kill();
				this.forceKillTimer = setTimeout(() => {
					if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill('SIGKILL');
				}, 1000);
				this.forceKillTimer.unref();
			}, this.shutdownGraceMs);
			this.killTimer.unref();
		}
	}

	private clearKillTimers(): void {
		if (this.killTimer) clearTimeout(this.killTimer);
		if (this.forceKillTimer) clearTimeout(this.forceKillTimer);
	}
	close(): void {
		this.fail(new Error('TRANSPORT_CLOSED'));
	}
}

/** Starts a new connection. Reconnect callers query existing receipts and choose whether to retry an intent. */
export async function launchBotClient(
	options: ManagedRunnerOptions,
	client: { name: string; version: string },
	callOptions?: CallOptions,
	limits?: ConnectionLimits,
): Promise<BotClient> {
	const transport = await DesktopHapTransport.launch(options);
	try {
		return await new HapConnection(
			transport,
			{
				after: (ms, run) => {
					const timer = setTimeout(run, ms);
					return () => clearTimeout(timer);
				},
			},
			limits,
		).connect(client, callOptions);
	} catch (error) {
		transport.close();
		await transport.exited;
		throw transport.startupError ?? error;
	}
}

/** One managed Runner owns HAP, private registration pipes and their shared shutdown lifecycle. */
export async function launchManagedBotSession(
	options: ManagedRunnerOptions,
	client: { name: string; version: string },
	callOptions?: CallOptions,
	limits?: ConnectionLimits,
	onLaunch?: (transport: Pick<DesktopHapTransport, 'close' | 'exited'>) => void,
): Promise<{ client: BotClient; credentials: DesktopCredentialClient; exited: Promise<void>; close(): void }> {
	if (callOptions?.signal?.aborted) throw new Error('HUHUBOT_RUNTIME_CLOSED');
	const transport = await DesktopHapTransport.launch({ ...options, credentialChannel: true });
	try {
		onLaunch?.(transport);
		if (callOptions?.signal?.aborted) throw new Error('HUHUBOT_RUNTIME_CLOSED');
		const bot = await new HapConnection(transport, {
			after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); },
		}, limits).connect(client, callOptions);
		const credentials = await transport.openCredentials(bot.hello.profile.profileId);
		return { client: bot, credentials, exited: transport.exited, close: () => bot.close() };
	} catch (error) {
		transport.close();
		await transport.exited;
		throw transport.startupError ?? error;
	}
}

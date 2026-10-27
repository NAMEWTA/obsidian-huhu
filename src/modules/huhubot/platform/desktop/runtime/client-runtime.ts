import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type { App } from 'obsidian';
import { vaultIdentity } from '../../../../../host/obsidian/storage/device-id';
import type { BotClient } from '../../../api';
import { launchManagedBotSession, type ManagedRunnerOptions } from '../transport/managed';

export type BotRuntimeState = 'idle' | 'starting' | 'ready' | 'failed' | 'stopping' | 'closed';
export interface BotRuntime {
	readonly state: BotRuntimeState;
	readonly client?: BotClient;
	readonly exited?: Promise<void>;
	start(): Promise<BotClient>;
	stop(): Promise<void>;
}

function defaultProfileRoot(): string {
	if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'HUHU', 'huhubot', 'profiles');
	if (process.platform === 'win32') return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'HUHU', 'huhubot', 'profiles');
	return join(process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state'), 'huhu', 'huhubot', 'profiles');
}

function requireAbsolute(value: string, reason: string): string {
	const trimmed = value.trim();
	if (!trimmed || !isAbsolute(trimmed)) throw new Error(reason);
	return trimmed;
}

export function createBotRuntime(app: App, settings: { get(): { binaryPath: string; workingDirectory: string; profileRoot: string } }, pluginDir: string): BotRuntime {
	let state: BotRuntimeState = 'idle';
	let session: Awaited<ReturnType<typeof launchManagedBotSession>> | undefined;
	let startPromise: Promise<BotClient> | undefined;
	const options = (): ManagedRunnerOptions => {
		const value = settings.get();
		const binary = requireAbsolute(value.binaryPath, 'HUHUBOT_BINARY_MISSING');
		const cwd = value.workingDirectory.trim() ? requireAbsolute(value.workingDirectory, 'HUHUBOT_WORKDIR_INVALID') : requireAbsolute(pluginDir, 'HUHUBOT_PLUGIN_DIR_INVALID');
		const identity = vaultIdentity(app);
		const root = value.profileRoot.trim() ? requireAbsolute(value.profileRoot, 'HUHUBOT_PROFILE_ROOT_INVALID') : defaultProfileRoot();
		return { binary, cwd, profileDir: join(root, identity.vaultId), managed: true, credentialChannel: true };
	};
	const runtime: BotRuntime = {
		get state() { return state; },
		get client() { return session?.client; },
		get exited() { return session?.exited; },
		start: async () => {
			if (session) return session.client;
			if (state === 'closed' || state === 'stopping') throw new Error('HUHUBOT_RUNTIME_CLOSED');
			if (startPromise) return startPromise;
			state = 'starting';
			startPromise = launchManagedBotSession(options(), { name: 'huhu', version: '1' }).then((next) => {
				session = next;
				state = 'ready';
				void next.exited.then(() => { if (session === next) { session = undefined; state = 'closed'; } });
				return next.client;
			}).catch((error: unknown) => { state = 'failed'; throw error; }).finally(() => { startPromise = undefined; });
			return startPromise;
		},
		stop: async () => {
			if (!session) { state = state === 'closed' ? state : 'idle'; return; }
			state = 'stopping';
			const current = session;
			session = undefined;
			current.close();
			await current.exited;
			state = 'closed';
		},
	};
	return runtime;
}

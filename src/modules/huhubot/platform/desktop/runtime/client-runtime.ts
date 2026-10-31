import { homedir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { App, FileSystemAdapter, PluginManifest } from 'obsidian';
import { vaultIdentity } from '../../../../../host/obsidian/storage/device-id';
import { protectedReceipt } from '../../../../../host/desktop/protected-receipt';
import type { ArtifactRef, BotClient, BotRuntimeAccess } from '../../../api';
import { ensureBotBinary } from '../installation/binary';
import { launchManagedBotSession, type ManagedRunnerOptions } from '../transport/managed';
import { PortableFiles } from './portable-files';

export type BotRuntimeState = 'idle' | 'starting' | 'ready' | 'failed' | 'stopping' | 'closed';
export interface BotRuntime extends BotRuntimeAccess {
	readonly state: BotRuntimeState;
	readonly exited?: Promise<void>;
	start(): Promise<BotClient>;
	stop(): Promise<void>;
	refreshHost(): Promise<void>;
	exportArtifact(artifact: ArtifactRef, win: Window): Promise<boolean>;
	importArtifact(win: Window): Promise<ArtifactRef | undefined>;
}

export function defaultProfileRoot(): string {
	if (process.platform === 'darwin')
		return join(homedir(), 'Library', 'Application Support', 'HUHU', 'huhubot', 'profiles');
	if (process.platform === 'win32')
		return join(
			requireAbsolute(process.env.LOCALAPPDATA ?? '', 'HUHUBOT_PROFILE_ROOT_INVALID'),
			'HUHU',
			'huhubot',
			'profiles',
		);
	const root = process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
	return join(requireAbsolute(root, 'HUHUBOT_PROFILE_ROOT_INVALID'), 'huhu', 'huhubot', 'profiles');
}
function requireAbsolute(value: string, reason: string): string {
	const trimmed = value.trim();
	if (!trimmed || !isAbsolute(trimmed)) throw new Error(reason);
	return trimmed;
}

/** The local binding is outside Vault/portable bytes. Copying a Vault cannot
 * silently attach its copy to the original machine's effective Profile.
 */
export function localProfileBinding(app: App, vaultId: string, canonicalVault: string): string {
	const key = `huhu.huhubot.profile.v1.${createHash('sha256').update(`${vaultId}\0${canonicalVault}`).digest('hex')}`;
	const saved: unknown = app.loadLocalStorage(key);
	if (typeof saved === 'string' && /^[a-f0-9]{32}$/.test(saved)) return saved;
	const id = randomBytes(16).toString('hex');
	app.saveLocalStorage(key, id);
	if (app.loadLocalStorage(key) !== id) throw new Error('HUHUBOT_PROFILE_BINDING_UNAVAILABLE');
	return id;
}

/** One module owns the process and secret channel. Settings activation never calls start.
 * Stopping invalidates every pending start before it can publish a client or acquire a Host.
 */
export function createBotRuntime(
	app: App,
	settings: { get(): { binaryPath: string; workingDirectory: string; profileRoot: string } },
	manifest: Pick<PluginManifest, 'dir' | 'version'>,
	onConnect?: (client: BotClient) => Promise<() => void | Promise<void>>,
): BotRuntime {
	let state: BotRuntimeState = 'idle';
	let session: Awaited<ReturnType<typeof launchManagedBotSession>> | undefined;
	let pendingSession: { close(): void; exited: Promise<void> } | undefined;
	let startPromise: Promise<BotClient> | undefined;
	let hostRefresh: Promise<void> | undefined;
	let disposed = false;
	const lifetime = new AbortController();
	let disconnect: (() => void | Promise<void>) | undefined;
	let profileDirectory: string | undefined;
	const portable = (): PortableFiles => {
		const current = session;
		if (!current || !profileDirectory || disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
		const epoch = current.client.hello.profile.commandEpoch;
		const active = () =>
			session === current &&
			!disposed &&
			current.client.state === 'ready' &&
			current.client.hello.profile.commandEpoch === epoch;
		return new PortableFiles(profileDirectory, active, async (bytes) => {
			let uploadId: string | undefined;
			for (let offset = 0; offset < bytes.length; offset += 262_144) {
				if (!active()) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + 262_144));
				const final = offset + chunk.length === bytes.length;
				const result = await current.client.portable.stage({
					profileId: current.client.hello.profile.profileId,
					commandEpoch: epoch,
					...(uploadId ? { uploadId } : {}),
					size: String(bytes.length),
					offset: String(offset),
					dataBase64: Buffer.from(chunk).toString('base64'),
					final,
				});
				if (result.nextOffset !== String(offset + chunk.length) || (uploadId && result.uploadId !== uploadId))
					throw new Error('HUHUBOT_PORTABLE_UPLOAD_INVALID');
				uploadId = result.uploadId;
				if (final && result.artifact) return result.artifact;
			}
			throw new Error('HUHUBOT_PORTABLE_UPLOAD_INVALID');
		});
	};
	const options = async (): Promise<ManagedRunnerOptions> => {
		const value = settings.get();
		const vaultRoot = await realpath((app.vault.adapter as FileSystemAdapter).getBasePath());
		const identity = vaultIdentity(app);
		const profileBinding = localProfileBinding(app, identity.vaultId, vaultRoot);
		const win = app.workspace?.containerEl?.ownerDocument.defaultView;
		const binary = await ensureBotBinary({
			vaultRoot,
			deviceId: identity.deviceId,
			version: manifest.version,
			...(value.binaryPath.trim()
				? { override: requireAbsolute(value.binaryPath, 'HUHUBOT_BINARY_PATH_INVALID') }
				: {}),
			...(win ? { receipt: protectedReceipt(win) } : {}),
		});
		const cwd = value.workingDirectory.trim()
			? requireAbsolute(value.workingDirectory, 'HUHUBOT_WORKDIR_INVALID')
			: resolve(vaultRoot, manifest.dir ?? '.');
		const managedRoot = defaultProfileRoot();
		const root = value.profileRoot.trim()
			? requireAbsolute(value.profileRoot, 'HUHUBOT_PROFILE_ROOT_INVALID')
			: managedRoot;
		const child = relative(managedRoot, root);
		if (child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child))
			throw new Error('HUHUBOT_PROFILE_ROOT_INVALID');
		return { binary, cwd, profileDir: join(root, profileBinding), managed: true, credentialChannel: true };
	};
	const runtime: BotRuntime = {
		get state() {
			return state;
		},
		get client() {
			return session?.client;
		},
		get exited() {
			return session?.exited;
		},
		connect: () => runtime.start(),
		refreshHost: () => {
			if (hostRefresh) return hostRefresh;
			const current = session;
			if (!current || disposed) return Promise.reject(new Error('HUHUBOT_RUNTIME_CLOSED'));
			hostRefresh = (async () => {
				const previous = disconnect;
				disconnect = undefined;
				await previous?.();
				if (disposed || session !== current) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				const next = await onConnect?.(current.client);
				if (disposed || session !== current) {
					await next?.();
					throw new Error('HUHUBOT_RUNTIME_CLOSED');
				}
				disconnect = next;
			})().finally(() => {
				hostRefresh = undefined;
			});
			return hostRefresh;
		},
		exportArtifact: (artifact, win) => portable().save(artifact, win),
		importArtifact: (win) => portable().choose(win),
		registerCredential: async (secret, mode) => {
			try {
				await runtime.start();
				if (!session || disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				return await session.credentials.register(secret, mode);
			} finally {
				secret.fill(0);
			}
		},
		deleteCredential: async (reference) => {
			await runtime.start();
			if (!session || disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
			return session.credentials.delete(reference);
		},
		start: () => {
			if (disposed) return Promise.reject(new Error('HUHUBOT_RUNTIME_CLOSED'));
			if (session?.client.state === 'ready') return Promise.resolve(session.client);
			if (startPromise) return startPromise;
			state = 'starting';
			startPromise = (async () => {
				const obsolete = session;
				if (obsolete) {
					const cleanup = disconnect;
					session = undefined;
					disconnect = undefined;
					pendingSession = obsolete;
					// A closed HAP connection is not a connected Runner. Reap the old
					// managed process before acquiring the same Profile lock again.
					obsolete.close();
					try {
						await Promise.all([obsolete.exited, cleanup?.()]);
					} finally {
						if (pendingSession === obsolete) pendingSession = undefined;
					}
				}
				if (disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				const prepared = await options();
				if (disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				const next = await launchManagedBotSession(
					prepared,
					{ name: 'huhu', version: manifest.version },
					{ signal: lifetime.signal },
					undefined,
					(transport) => {
						pendingSession = transport;
						if (disposed) transport.close();
					},
				);
				pendingSession = next;
				let cleanup: (() => void | Promise<void>) | undefined;
				try {
					if (disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
					cleanup = await onConnect?.(next.client);
					if (disposed || next.client.state === 'closed') throw new Error('HUHUBOT_RUNTIME_CLOSED');
					session = next;
					profileDirectory = prepared.profileDir;
					pendingSession = undefined;
					disconnect = cleanup;
					state = 'ready';
					void next.exited
						.then(async () => {
							if (session !== next) return;
							const activeCleanup = disconnect;
							session = undefined;
							disconnect = undefined;
							state = disposed ? 'closed' : 'failed';
							await activeCleanup?.();
						})
						.catch(() => {
							state = disposed ? 'closed' : 'failed';
						});
					return next.client;
				} catch (error) {
					if (pendingSession === next) pendingSession = undefined;
					try {
						await cleanup?.();
					} finally {
						next.close();
						await next.exited;
					}
					throw error;
				}
			})()
				.catch((error: unknown) => {
					state = disposed ? 'closed' : 'failed';
					throw error;
				})
				.finally(() => {
					startPromise = undefined;
				});
			return startPromise;
		},
		stop: async () => {
			disposed = true;
			lifetime.abort();
			state = 'stopping';
			const current = session ?? pendingSession,
				cleanup = disconnect;
			session = undefined;
			pendingSession = undefined;
			disconnect = undefined;
			try {
				// Close the transport synchronously before awaiting slow Vault cleanup.
				current?.close();
				await Promise.all([current?.exited, cleanup?.()]);
			} finally {
				state = 'closed';
			}
		},
	};
	return runtime;
}

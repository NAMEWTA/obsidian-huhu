import { homedir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { App, FileSystemAdapter, PluginManifest } from 'obsidian';
import { vaultIdentity } from '../../../../../host/obsidian/storage/device-id';
import { protectedReceipt } from '../../../../../host/desktop/protected-receipt';
import type { ArtifactRef, BotClient, BotRuntimeAccess, CallOptions } from '../../../api';
import { ensureBotBinary } from '../installation/binary';
import { launchManagedBotSession, type ManagedRunnerOptions } from '../transport/managed';
import { observeStop, type RunnerExit, type StopFacts } from '../transport/managed-stop';
import { PortableFiles } from './portable-files';

export type BotRuntimeState = 'idle' | 'starting' | 'ready' | 'failed' | 'stopping' | 'closed';
export interface BotRuntime extends BotRuntimeAccess {
	readonly state: BotRuntimeState;
	readonly exited?: Promise<void>;
	readonly stopFacts?: StopFacts;
	start(): Promise<BotClient>;
	stop(options?: CallOptions): Promise<void>;
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
	let pendingSession: { close(): void; exited: Promise<void>; exit: Promise<RunnerExit> } | undefined;
	let stopPromise: Promise<void> | undefined;
	let finalFacts: StopFacts | undefined;
	let recoveryRequired = false;
	let lastExit: Promise<void> | undefined;
	const ignoreStopCancellation = (error: unknown) => {
		if (!(error instanceof Error) || !['HUHUBOT_RUNTIME_CLOSED', 'REQUEST_ABORTED'].includes(error.message)) throw error;
	};
	const hostEnds = new Map<object, (error?: unknown) => void>();
	const stops = new Map<object, Promise<void>>();
	const stopOwned = (owned: NonNullable<typeof pendingSession> | NonNullable<typeof session>): Promise<void> => {
		const previous = stops.get(owned);
		if (previous) return previous;
		const completion = ('stop' in owned ? owned.stop() : (async () => {
			owned.close();
			const exit = await owned.exit;
			if (exit.forced || exit.signal || exit.code !== 0) throw new Error('RUNNER_STOP_EXIT_FAILED');
			throw new Error('STOP_FACTS_UNAVAILABLE');
		})()).catch((error: unknown) => {
			recoveryRequired = true;
			if ('stopFacts' in owned) finalFacts = owned.stopFacts;
			throw error;
		});
		stops.set(owned, completion);
		void completion.catch(() => {});
		return completion;
	};
	let startPromise: Promise<BotClient> | undefined;
	let hostRefresh: Promise<void> | undefined;
	// Every disposer result remains attached to its process owner, including
	// failures that settled before stop was requested. A disposer runs once.
	const hostWork = new Map<object, Promise<void>[]>();
	const ownCleanup = (owner: object, cleanup: (() => void | Promise<void>) | undefined) => {
		if (!cleanup) return undefined;
		let completion: Promise<void> | undefined;
		return () => {
			if (!completion) {
				completion = Promise.resolve().then(cleanup);
				const work = hostWork.get(owner) ?? [];
				work.push(completion);
				hostWork.set(owner, work);
				void completion.catch(() => {});
			}
			return completion;
		};
	};
	const finishHost = async (owner: object, cleanup?: () => void | Promise<void>): Promise<void> => {
		const active = await Promise.allSettled([
			hostRefresh?.catch(ignoreStopCancellation), Promise.resolve().then(() => cleanup?.()),
		]);
		const completed = await Promise.allSettled(hostWork.get(owner) ?? []);
		const failures = [...active, ...completed].flatMap(result => result.status === 'rejected' ? [result.reason as unknown] : []);
		const error = failures.length ? new AggregateError(failures, 'HOST_CLEANUP_FAILED') : undefined;
		hostEnds.get(owner)?.(error);
		if (error) throw error;
	};
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
			return disposed || state !== 'ready' ? undefined : session?.client;
		},
		get stopFacts() {
			const facts = session?.stopFacts ?? finalFacts;
			return facts ? { ...facts, failures: [...facts.failures] } : undefined;
		},
		get exited() {
			return (session ?? pendingSession)?.exited ?? lastExit;
		},
		connect: () => runtime.start(),
		refreshHost: () => {
			if (hostRefresh) return hostRefresh;
			const current = session;
			if (!current || disposed) return Promise.reject(new Error('HUHUBOT_RUNTIME_CLOSED'));
			const inactive = () => disposed || session !== current || current.client.state === 'closed';
			hostRefresh = (async () => {
				const previous = disconnect;
				disconnect = undefined;
				await previous?.();
				if (inactive()) throw new Error('HUHUBOT_RUNTIME_CLOSED');
				const next = ownCleanup(current, await onConnect?.(current.client));
				if (inactive()) {
					await next?.();
					throw new Error('HUHUBOT_RUNTIME_CLOSED');
				}
				disconnect = next;
			})().finally(() => {
				hostRefresh = undefined;
			});
			const result = hostRefresh.catch(ignoreStopCancellation);
			const work = hostWork.get(current) ?? [];
			work.push(result);
			hostWork.set(current, work);
			void result.catch(() => {});
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
			if (recoveryRequired) return Promise.reject(new Error('HUHUBOT_RECOVERY_REQUIRED'));
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
					try {
						const processStop = stopOwned(obsolete);
						const results = await Promise.allSettled([processStop, finishHost(obsolete, cleanup)]);
						const failure = results.find(result => result.status === 'rejected');
						if (failure?.status === 'rejected') throw failure.reason instanceof Error ? failure.reason : new Error('HOST_CLEANUP_FAILED');
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
						lastExit = transport.exited;
						if (disposed) void stopOwned(transport).catch(() => {});
					},
				);
				pendingSession = next;
				lastExit = next.exited;
				const hostDone = new Promise<void>((resolve, reject) => {
					hostEnds.set(next, (error) => {
						if (error === undefined) resolve();
						else reject(error instanceof Error ? error : new Error('HOST_CLEANUP_FAILED'));
					});
				});
				next.retainUntil(hostDone);
				let cleanup: (() => void | Promise<void>) | undefined;
				try {
					if (disposed) throw new Error('HUHUBOT_RUNTIME_CLOSED');
					cleanup = ownCleanup(next, await onConnect?.(next.client));
					if (disposed || next.client.state === 'closed') throw new Error('HUHUBOT_RUNTIME_CLOSED');
					session = next;
					profileDirectory = prepared.profileDir;
					pendingSession = undefined;
					disconnect = cleanup;
					state = 'ready';
					void next.exited
						.then(async () => {
							if (session !== next || disposed) return;
							const activeCleanup = disconnect;
							// Keep the exited owner: a new launch must first classify its stop.
							disconnect = undefined;
							if (!disposed) state = 'failed';
							await finishHost(next, activeCleanup);
						})
						.catch(() => {
							if (!disposed) state = 'failed';
						});
					return next.client;
				} catch (error) {
					if (pendingSession === next) pendingSession = undefined;
					const processStop = stopOwned(next);
					const results = await Promise.allSettled([processStop, finishHost(next, cleanup)]);
					const failure = results.find(result => result.status === 'rejected');
					if (failure?.status === 'rejected') throw failure.reason instanceof Error ? failure.reason : new Error('HOST_CLEANUP_FAILED');
					throw error;
				}
			})()
				.catch((error: unknown) => {
					if (!disposed) state = 'failed';
					throw error;
				})
				.finally(() => {
					startPromise = undefined;
				});
			return startPromise;
		},
		stop: (options) => {
			if (!stopPromise) {
				disposed = true;
				lifetime.abort();
				state = 'stopping';
				const current = session ?? pendingSession, cleanup = disconnect, published = session;
				disconnect = undefined;
				if (current) void stopOwned(current).catch(() => {});
				stopPromise = (async () => {
					// A late launch/registration still belongs to this owner. Its catch
					// joins the process before the shared completion can settle.
					const hostCleanup = published ? finishHost(published, cleanup) : Promise.resolve();
					const pending = await Promise.allSettled([startPromise?.catch(ignoreStopCancellation), hostCleanup]);
					const processes = await Promise.allSettled(stops.values());
					const errors = [...pending, ...processes].flatMap(result => result.status === 'rejected' ? [result.reason as unknown] : []);
					if (errors.length) throw new AggregateError(errors, 'HUHUBOT_STOP_FAILED');
					finalFacts = session?.stopFacts;
					session = undefined;
					pendingSession = undefined;
					state = 'closed';
				})().catch((error: unknown) => { state = 'failed'; throw error; });
				void stopPromise.catch(() => {});
			}
			return observeStop(stopPromise, options);
		},
	};
	return runtime;
}

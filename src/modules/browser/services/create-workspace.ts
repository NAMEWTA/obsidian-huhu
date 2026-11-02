import type { BrowserMaterialConsumer, BrowserWorkspace } from '../api';
import { AgentBrowserError } from '../core/contracts';
import { IdentityError, clearIdentitySeed, identityCookiesFromCdp, type IdentitySummary, type IdentitySaveReceipt } from '../core/identity';
import { createIdentityTarget } from '../platform/desktop/identity/runtime-target';
import type { DesktopBrowserPorts } from '../platform/desktop/composition';
import { BrowserWorkspaceService, type BrowserWorkspaceExtensions } from './workspace';
import { IdentityService } from './identity-service';
import { provisionIdentity } from './identity-provision';
import { BrowserProtocolService, type ConnectionGrant } from './protocol-service';

export function composeBrowserWorkspace(
	ports: DesktopBrowserPorts,
	options: {
		renderViewer: (api: BrowserWorkspace, scope: { spaceId: string; pageId: string }) => Promise<unknown>;
		materials: () => Promise<readonly BrowserMaterialConsumer[]>;
	},
) {
	const identity = new IdentityService(
		ports.credentials,
		() => Date.now(),
		() => ports.persistence.id(),
	);
	let identities: IdentitySummary[] = [], refreshPending = false;
	let identityRevision = 0;
	const connections = new Map<string, ConnectionGrant>();
	let workspace: BrowserWorkspaceService;
	const connection = (id: string) => {
		const grant = connections.get(id);
		if (!grant) throw new AgentBrowserError('connection_invalid');
		return grant;
	};
	const rpc = ports.rpc(
		(method, params, id, remainingMs) => protocol.call(method, params, connection(id), remainingMs),
		(id, scope) => {
			workspace.health(scope.grant.run.id, scope.grant.capability);
			connections.set(id, {
				spaceId: scope.spaceId,
				runId: scope.grant.run.id,
				capability: scope.grant.capability,
				allowTaskCreation: scope.allowTaskCreation,
				created: false,
				runs: new Map(),
			});
		},
		(method, params, id, result) => protocol.finalize(method, params, connection(id), result),
	);
	const refresh = async () => {
		try {
			for (let attempt = 0; attempt < 3; attempt++) {
				const revision = identityRevision, rows = await identity.list(identities.some(item => item.persistent));
				// A later confirmed save/remove must not be replaced by this older read.
				if (revision !== identityRevision) continue;
				identities = rows; refreshPending = false; return;
			}
			throw new Error('identity_refresh_unavailable');
		}
		catch (error) { refreshPending = true; throw error; }
	};
	const committed = async (summary: IdentitySummary): Promise<IdentitySaveReceipt> => {
		// The business owner already confirmed publication. Keep that safe fact
		// visible even if reading the rest of the directory is temporarily unavailable.
		identityRevision++; identities = [{ ...summary }, ...identities.filter(item => item.id !== summary.id)];
		try { await refresh(); return { ...summary, publication: 'committed', catalogRefresh: 'complete' }; }
		catch { return { ...summary, publication: 'committed', catalogRefresh: 'pending' }; }
	};
	const extensions: BrowserWorkspaceExtensions = {
		async seed(versionId, space, runtime, control) {
			const permit = identity.issueUsePermit(versionId, space.id),
				seed = await identity.consumeSeed(permit.id, space.id);
			let stage: Awaited<ReturnType<typeof ports.staging>> | undefined;
			const provisioning = () => {
				if (control.isCancelled()) throw new IdentityError('cancelled');
				return workspace.getState().spaces.find((s) => s.id === space.id)?.status === 'provisioning';
			};
			try {
				if (!provisioning()) throw new IdentityError('cancelled');
				stage = await ports.staging();
				return await provisionIdentity({
					seed,
					staging: createIdentityTarget(stage.runtime, () => true),
					target: createIdentityTarget(runtime, provisioning),
					now: () => Date.now(),
					isCancelled: () => !provisioning(),
					progress: phase => control.progress(phase),
					publish: async () => {},
					cleanupStaging: () => stage!.cleanup(),
					quarantineTarget: () => runtime.stop(),
					recordCleanupFailure: async () => {
						/* Ownership is recorded before either process starts. */
					},
				});
			} finally {
				clearIdentitySeed(seed);
			}
		},
		identities: {
			list: () => identities.map((row) => ({ ...row })),
			refresh,
			refreshPending: () => refreshPending,
			prepareText: async (label, text) => identity.prepareText(label, text),
			prepareFile: async (label, signal) => {
				const captured = await ports.sourceText(label, signal);
				if (signal?.aborted) throw new IdentityError('cancelled');
				return captured ? identity.prepareText(label, captured.text, 'cookie-file', captured.capture) : undefined;
			},
			prepareSource: async (request) => {
				const captured = await ports.sourceSeed(request);
				try {
					if (request.signal?.aborted) throw new IdentityError('cancelled');
					return identity.prepareText(request.label, JSON.stringify(captured.seed), 'browser-source', captured.capture);
				} finally {
					clearIdentitySeed(captured.seed);
				}
			},
			commit: async (request) => {
				const result = await identity.savePrepared(
					request.planId,
					request.persist ? 'persistent' : 'ephemeral',
					request.domains,
				);
				return committed(result);
			},
			discard: (id) => identity.discardPlan(id),
			sources: () => ports.listSources(),
			remove: async (id) => {
				await identity.remove(id);
				identityRevision++; identities = identities.filter(item => item.id !== id);
				await refresh();
			},
			save: async (runtime, label, persist, validate, signal) => {
				const check = () => { if (signal?.aborted) throw new IdentityError('cancelled'); validate(); };
				check();
				const state = await runtime.readIdentity();
				let text = '', planId: string | undefined;
				try {
					check();
					text = JSON.stringify({
						format: 'huhu-browser-identity',
						version: 1,
						cookies: identityCookiesFromCdp(state.cookies, Date.now()),
						origins: [],
					});
					const plan = identity.prepareText(label, text, 'manual-login');
					planId = plan.planId; check();
					const result = await identity.savePrepared(plan.planId, persist ? 'persistent' : 'ephemeral', undefined, { signal, validate: check });
					return await committed(result);
				} finally {
					if (planId) identity.discardPlan(planId);
					for (const cookie of state.cookies) cookie.value = '';
					text = '';
				}
			},
			dispose: async () => {
				identity.dispose();
				await ports.disposeSources();
			},
		},
		files: {
			listFiles: (scope) => ports.fileService().listFiles(scope),
			listDownloads: (scope) => ports.fileService().listDownloads(scope),
			listSpaceFiles: (id) => ports.fileService().listSpaceFiles(id),
			listSpaceDownloads: (id) => ports.fileService().listSpaceDownloads(id),
			chooseUpload: (scope) => ports.chooseUpload(scope),
			consumeUpload: async (id, scope) => ({ path: await ports.fileService().consumeUpload(id, scope), expiresAt: ports.fileService().uploadDeadline(id, scope) }),
			exportFile: (space, id) => ports.exportFile(space, id),
			removeFile: async (id) => {
				for (const s of workspace.getState().spaces) {
					if (
						ports
							.fileService()
							.listSpaceFiles(s.id)
							.some((f) => f.id === id)
					) {
						await ports.fileService().removeFile(s.id, id);
						return;
					}
				}
				throw new AgentBrowserError('file_not_found');
			},
			removeSpace: (id) => ports.fileService().removeSpace(id),
			retryCleanup: async (spaceId) => {
				for (const item of ports.fileService().listSpaceDownloads(spaceId))
					if (item.cleanup === 'pending') await ports.fileService().retryDownloadCleanup(spaceId, item.id);
			},
			dispose: async () => {
				if (!ports.persistence.readOnly) await ports.fileService().dispose();
			},
			download: async (event, scope) => {
				const files = ports.fileService();
				if (!files.listSpaceDownloads(scope.spaceId).some((d) => d.id === event.id))
					files.beginDownload(event.id, event.pageId, scope, event.name);
				const result = await files.updateDownload(event.id, {
					state:
						event.state === 'progressing'
							? 'inProgress'
							: event.state === 'completed'
								? 'completed'
								: 'canceled',
					receivedBytes: event.received,
					totalBytes: event.total,
				});
				if (result.state === 'failed') await workspace.cancelDownload(event.id);
			},
		},
		renderViewer: (scope) => options.renderViewer(workspace, scope),
		materials: options.materials,
		connection: (spaceId, grant, allowTaskCreation) => rpc.create({ spaceId, grant, allowTaskCreation }),
		cleanupPending: ports.cleanupPending,
		retryCleanup: () => ports.retryCleanup(),
		scheduleInterval: (callback, ms) => ports.scheduleInterval(callback, ms),
	};
	workspace = new BrowserWorkspaceService(ports.persistence, ports.runtimeFactory, extensions);
	const protocol = new BrowserProtocolService(workspace);
	return {
		workspace,
		async initialize() {
			if (!ports.persistence.readOnly) await refresh();
			await workspace.initialize();
		},
		async dispose() {
			await rpc.dispose();
			connections.clear();
			await workspace.dispose();
		},
	};
}

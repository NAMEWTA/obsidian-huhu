import { TFolder } from 'obsidian';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { registerMessages } from '../../shared/i18n';
import { BOT_RUNTIME, type HostLease } from './api';
import { messages } from './i18n';
import { huhubotSettings } from './settings';
import { createBotRuntime } from './platform/desktop/runtime/client-runtime';
import { registerObsidianNoteHost } from './services/host-write/obsidian-host';
import { WorkbenchClient, type BotWorkbenchHost } from './services/workbench/workbench-client';
import { BotRpcError } from './core/protocol/connection';

registerMessages(messages);

/** Settings and service discovery are process-free. Only a page or explicit connect starts the Runner. */
export default function createHuhuBotModule(context: ModuleContext): ModuleInstance {
	if (!context.env.desktop) throw new Error('HUHUBOT_DESKTOP_ONLY');
	const settings = context.settings.bind('huhubot', huhubotSettings);
	const controller = new AbortController();
	const timers = {
		after: (ms: number, run: () => void) => {
			const win = context.app.workspace.containerEl.win;
			const timer = win.setTimeout(run, ms);
			return () => win.clearTimeout(timer);
		},
	};
	let noteHost: Awaited<ReturnType<typeof registerObsidianNoteHost>> | undefined;
	const runtime = createBotRuntime(context.app, settings, context.manifest, async (client) => {
		const status = await client.service.status({}, { signal: controller.signal, timeoutMs: 3000 });
		if (status.cleanup?.profile || status.cleanup?.sessionIds.length) return () => {};
		const { vaultIdentity } = await import('../../host/obsidian/storage/device-id');
		const workspaceId = `vault:${vaultIdentity(context.app).vaultId}`;
		const originClientId = `huhu:${crypto.randomUUID()}`;
		const registered = await registerObsidianNoteHost(context.app, client, {
			workspaceId,
			originClientId,
			timers,
			lifetime: context.lifetime,
			signal: controller.signal,
		});
		let lease: HostLease;
		try {
			lease = await client.host.attach(
				{ workspaceId, capabilities: ['note.read', 'note.search', 'note.write'] },
				{ signal: controller.signal, timeoutMs: 3000 },
			);
		} catch (error) {
			registered.dispose();
			if (error instanceof BotRpcError && error.data.reason === 'PROFILE_CLEANUP_PENDING') return () => {};
			throw error;
		}
		noteHost = registered;
		let active = true;
		let cancelRenew: (() => void) | undefined;
		const renew = () => {
			cancelRenew = timers.after(240_000, () => {
				if (!active || controller.signal.aborted) return;
				void client.host
					.attach(
						{ workspaceId, capabilities: lease.capabilities, renewLeaseId: lease.leaseId },
						{ signal: controller.signal, timeoutMs: 3000 },
					)
					.then((next) => {
						if (active) {
							lease = next;
							renew();
						}
					})
					.catch(() => {
						if (active) client.close();
					});
			});
		};
		renew();
		return () => {
			active = false;
			cancelRenew?.();
			if (noteHost === registered) noteHost = undefined;
			registered.dispose();
		};
	});
	const report = (error: unknown) => console.error('[HUHU bot]', error);
	const runContext = () => {
		const leaf = context.app.workspace.getMostRecentLeaf();
		if (!noteHost || !leaf) throw new Error('HOST_UNAVAILABLE');
		const origin = noteHost.sources.captureWriteOrigin(leaf);
		return {
			workspaceId: origin.workspaceId,
			originClientId: origin.originClientId,
			originViewId: origin.originViewId,
			hostConnectionId: origin.hostConnectionId,
			hostLeaseEpoch: origin.hostLeaseEpoch,
		};
	};
	const workspace = new WorkbenchClient({ client: () => runtime.client, report, runContext }, timers);
	const host: BotWorkbenchHost = {
		client: () => runtime.client,
		report,
		workspace,
		runContext,
		openSettings: () => {
			void context.shell.open({ feature: 'settings', section: 'huhubot' });
		},
		openTarget: (section, resourceId) => {
			void context.shell.open({ feature: 'huhubot', section, ...(resourceId ? { resourceId } : {}) });
		},
		captureSource: async () => {
			if (!noteHost) throw new Error('HOST_UNAVAILABLE');
			const { selectBotSource } = await import('./platform/obsidian/sources/selection');
			return selectBotSource(context.app, noteHost.sources, controller.signal);
		},
		captureScope: async (kind) => {
			if (!noteHost) throw new Error('HOST_UNAVAILABLE');
			const { selectBotScope } = await import('./platform/obsidian/sources/selection');
			return selectBotScope(context.app, noteHost.sources, kind, controller.signal);
		},
		writeTarget: async (path) => {
			if (!noteHost) throw new Error('HOST_UNAVAILABLE');
			const parts = path.split('/'),
				filename = parts.pop() ?? '';
			const folder = parts.length
				? context.app.vault.getAbstractFileByPath(parts.join('/'))
				: context.app.vault.getRoot();
			const leaf = context.app.workspace.getMostRecentLeaf();
			if (!(folder instanceof TFolder) || !leaf) throw new Error('NOTE_TARGET_INVALID');
			return noteHost.effects.captureCreate(folder, filename, leaf);
		},
		openSource: (source) => {
			if (noteHost) void noteHost.sources.openSource(source, controller.signal).catch(report);
		},
	};
	const credentials = {
		set: async (secret: string, mode: 'protected' | 'session-memory') => {
			const result = await runtime.registerCredential(new TextEncoder().encode(secret), mode);
			return { credentialRef: result.credentialRef, status: result };
		},
	};
	return {
		services: [[BOT_RUNTIME, runtime]],
		pages: {
			chat: async () => {
				await runtime.start();
				const { createChatPage } = await import('./ui/workbench-page');
				return createChatPage(host);
			},
			agents: async () => {
				await runtime.start();
				const { createAgentPage } = await import('./ui/agent-page');
				return createAgentPage(
					() => runtime.client,
					credentials,
					workspace,
					() => host.openTarget?.('chat'),
				);
			},
			groups: async () => {
				await runtime.start();
				const { createGroupPage } = await import('./ui/group-page');
				return createGroupPage(
					() => runtime.client,
					workspace,
					() => host.openTarget?.('chat'),
				);
			},
			memory: async () => {
				await runtime.start();
				const { createMemoryPage } = await import('./ui/memory/workbench-page');
				return createMemoryPage({
					...host,
					namespace: () => ({ kind: 'global', id: runtime.client!.hello.profile.profileId }),
				});
			},
			tasks: async () => {
				await runtime.start();
				const { createTasksPage } = await import('./ui/tasks/workbench-page');
				return createTasksPage(host);
			},
			access: async () => {
				await runtime.start();
				const { createAccessPage } = await import('./ui/access/workbench-page');
				return createAccessPage(host);
			},
			approvals: async () => {
				await runtime.start();
				const { createApprovalsPage } = await import('./ui/approvals/workbench-page');
				return createApprovalsPage(host);
			},
			data: async () => {
				await runtime.start();
				const { createDataPage } = await import('./ui/data/workbench-page');
				return createDataPage({
					...host,
					exportArtifact: (artifact, owner) => runtime.exportArtifact(artifact, owner.win),
					importArtifact: (owner) => runtime.importArtifact(owner.win),
					cleanupCompleted: async () => {
						workspace.permissionsChanged();
						await runtime.refreshHost();
					},
				});
			},
		},
		settingsPage: async () => {
			const { huhubotSettingsPage } = await import('./ui/settings-page');
			return huhubotSettingsPage(settings, runtime);
		},
		dispose: () => {
			controller.abort();
			workspace.dispose();
			return runtime.stop();
		},
	};
}

import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { registerMessages } from '../../shared/i18n';
import { BOT_CLIENT } from './api';
import { messages } from './i18n';
import { huhubotSettings } from './settings';
import { createBotRuntime } from './platform/desktop/runtime/client-runtime';

registerMessages(messages);

/** On-demand desktop Runner owner. Page consumers acquire BOT_CLIENT and own no process lifecycle. */
export default async function createHuhuBotModule(context: ModuleContext): Promise<ModuleInstance> {
	if (!context.env.desktop) throw new Error('HUHUBOT_DESKTOP_ONLY');
	const settings = context.settings.bind('huhubot', huhubotSettings);
	const runtime = createBotRuntime(context.app, settings, context.manifest.dir ?? '');
	await runtime.start();
	return {
		services: [[BOT_CLIENT, runtime.client!]],
		pages: {
			chat: async () => {
				const { createChatPage } = await import('./ui/workbench-page');
				return createChatPage({
					client: () => context.services.peek(BOT_CLIENT),
					report: error => console.error('[HUHU bot]', error),
					openSettings: () => { void context.shell.open({ feature: 'settings', section: 'huhubot' }); },
				});
			},
			agents: async () => {
				const { createAgentPage } = await import('./ui/agent-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createAgentPage(client);
			},
			groups: async () => {
				const { createGroupPage } = await import('./ui/group-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createGroupPage(client);
			},
			memory: async () => {
				const { createMemoryPage } = await import('./ui/memory/workbench-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createMemoryPage({ client: () => client, namespace: () => ({ kind: 'global', id: 'global' }) });
			},
			tasks: async () => {
				const { createTasksPage } = await import('./ui/tasks/workbench-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createTasksPage({ client: () => client, report: error => console.error('[HUHU bot]', error) });
			},
			access: async () => {
				const { createAccessPage } = await import('./ui/access/workbench-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createAccessPage({ client: () => client, report: error => console.error('[HUHU bot]', error) });
			},
			approvals: async () => {
				const { createApprovalsPage } = await import('./ui/approvals/workbench-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createApprovalsPage({ client: () => client, report: error => console.error('[HUHU bot]', error) });
			},
			data: async () => {
				const { createDataPage } = await import('./ui/data/workbench-page');
				const client = context.services.peek(BOT_CLIENT);
				if (!client) throw new Error('HUHUBOT_CLIENT_UNAVAILABLE');
				return createDataPage({ client: () => client, report: error => console.error('[HUHU bot]', error) });
			},
		},
		settingsPage: async () => {
			const { huhubotSettingsPage } = await import('./ui/settings-page');
			return huhubotSettingsPage(settings);
		},
		dispose: () => runtime.stop(),
	};
}

import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { ICONS_SERVICE, type IconsService } from './api';
import type IconicController from './platform/host/controller';
import { registerMessages, t } from '../../shared/i18n/index';
import { messages } from './i18n';

registerMessages(messages);

/**
 * Icons module (Iconic rules and placement). Each activation creates a controller; its commands, editor
 * hooks, managers and body classes are all released when the module is turned off.
 */
export default function createIconsModule(context: ModuleContext): ModuleInstance {
	let controller: IconicController | undefined;
	const listeners = new Set<() => void>();
	const service: IconsService = {
		resolve: (target) => controller?.resolveIcon(target) ?? { icon: null, emoji: false, color: null },
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
	return {
		services: [[ICONS_SERVICE, service]],
		settingsPage: async () => (await import('./ui/settings-page')).iconsSettingsPage(() => controller),
		async activate() {
			const [{ default: Controller }, { createIconicDialogs }] = await Promise.all([import('./platform/host/controller'), import('./ui/dialog-factory')]);
			const next = new Controller(
				{ app: context.app, manifest: context.manifest, commands: context.commands, editor: context.editor, lifetime: context.lifetime },
				createIconicDialogs,
			);
			next.onRefresh = () => { for (const listener of [...listeners]) listener(); };
			await next.onload();
			controller = next;
			context.commands.add({
				id: 'open-icon-settings', name: t('iconic.openSettings'), nameKey: 'iconic.openSettings',
				callback: () => { void context.shell.open({ feature: 'settings', section: 'iconic' }); },
			});
		},
		async dispose() {
			const current = controller;
			controller = undefined;
			listeners.clear();
			await current?.dispose();
		},
	};
}

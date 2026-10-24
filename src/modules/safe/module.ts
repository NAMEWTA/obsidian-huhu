import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { desktopVaultRoot, privateVaultStorage } from '../../host/obsidian/storage/private-storage';
import { registerMessages, t } from '../../shared/i18n';
import { storageWriteQueue } from '../../shared/storage/write-queue';
import { SafeError } from './core/model';
import { lockPolicyOf } from './core/policy';
import { CipherRepository } from './services/cipher-repository';
import type { SafePreferences } from './services/preferences';
import { SafeService, type LockPolicySource } from './services/safe-service';
import { safeSettings } from './settings';

/** The texts load with the module's own chunk, not with the startup dictionary. */
async function registerScreenMessages(): Promise<void> {
	registerMessages((await import('./i18n')).messages);
}

/** One module-owned session is shared by every workbench surface in this vault. */
export default async function createSafeModule(context: ModuleContext): Promise<ModuleInstance> {
	if (!context.env.desktop) throw new SafeError('crypto-unavailable');
	await registerScreenMessages();
	const vaultRoot = desktopVaultRoot(context.app);
	const win = context.app.workspace.containerEl.win;
	const settings = context.settings.bind('safe', safeSettings);
	const policy: LockPolicySource = {
		get: () => lockPolicyOf(settings.get()),
		subscribe: listener => settings.subscribe(listener),
	};
	const preferences: SafePreferences = {
		viewMode: () => settings.get().viewMode,
		setViewMode: mode => {
			void settings.update(draft => { draft.viewMode = mode; }).catch((error: unknown) => console.error('[HUHU safe]', error));
		},
		subscribe: listener => settings.subscribe(listener),
	};
	const { createCipherFiles } = await import('./platform/desktop/cipher-files');
	const { createDesktopActions } = await import('./platform/desktop/actions');
	const service = new SafeService({
		repository: new CipherRepository(createCipherFiles(vaultRoot)),
		queue: storageWriteQueue(privateVaultStorage(context.app)),
		timers: {
			set: (callback, ms) => win.setTimeout(callback, ms),
			clear: id => win.clearTimeout(id),
		},
		actions: ownerWindow => createDesktopActions(vaultRoot, ownerWindow),
		policy,
	});
	context.commands.add({
		id: 'safe-lock',
		name: t('safe.lock'),
		nameKey: 'safe.lock',
		callback: () => service.lock(),
	});
	return {
		pages: {
			safe: async () => {
				await registerScreenMessages();
				return (await import('./ui/workbench-page')).createSafePage(service, preferences);
			},
		},
		settingsPage: async () => {
			await registerScreenMessages();
			return (await import('./ui/settings-page')).safeSettingsPage(settings);
		},
		activate: async signal => {
			if (signal.aborted) return;
			await service.probe();
			if (signal.aborted) service.lock();
		},
		// Disabling the module and unloading the plugin (closing Obsidian) always lock, whatever the lock rules say.
		dispose: () => service.dispose(),
	};
}

import { Platform, type App, type PluginManifest } from 'obsidian';
import { deviceId } from '../host/obsidian/storage/device-id';
import type { SettingsStore } from '../shared/settings/store';
import { lazyNativeHost } from '../shared/native/lazy-host';

/** Native installation and desktop dependencies are first reached by an explicit capability request. */
export function createAppNativeHost(app: App, manifest: PluginManifest, store: SettingsStore) {
	return lazyNativeHost(async () => {
		if (!Platform.isDesktopApp) throw new Error('Native capabilities require the desktop host');
		const [{ createNativeHost }, { protectedReceipt }, { agentSettings }] = await Promise.all([
			import('../host/desktop/native/runtime'),
			import('../host/desktop/protected-receipt'),
			import('../modules/agent/settings'),
		]);
		const settings = store.bind('agent', agentSettings);
		return createNativeHost(() => ({
			receipt: protectedReceipt(app.workspace.containerEl.win),
			vault: (app.vault.adapter as unknown as { getBasePath(): string }).getBasePath(),
			device: deviceId(app), version: manifest.version, offline: settings.get().offline,
		}), app.workspace.containerEl.win);
	});
}

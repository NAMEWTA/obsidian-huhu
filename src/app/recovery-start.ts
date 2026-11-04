import { Notice, type App } from 'obsidian';
import { registerMessages, t } from '../shared/i18n/index';
import { messages } from '../shared/i18n/lazy/migration';
import type { SettingsStore } from '../shared/settings/store';
import { vaultIdentity } from '../host/obsidian/storage/device-id';
import { createRecoveryHost, settingsOwner, type RecoveryHost } from './recovery';

/**
 * Loaded on demand by `main.ts` so none of the recovery machinery counts against the eager start-up closure.
 * Before any owner loads: finish or undo an interrupted multi-file operation. An unrecoverable journal keeps the gate
 * held and stops start-up so no module reads half-replaced files.
 */
export async function startRecovery(app: App): Promise<RecoveryHost> {
	const host = createRecoveryHost(app);
	try {
		await host.recoverBeforeStart();
	} catch (error) {
		registerMessages(messages);
		new Notice(t('agent.migration.blocked'), 0);
		throw error;
	}
	return host;
}

/** After settings loaded: register the settings owner before modules start. */
export async function afterSettings(app: App, host: RecoveryHost, store: SettingsStore): Promise<void> {
	const { deviceId } = vaultIdentity(app);
	host.register(settingsOwner(store, deviceId, ['agent']));
}

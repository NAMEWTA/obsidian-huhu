import { Notice, Platform, type App } from 'obsidian';
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

/** After settings loaded: register the settings owner, then run the one-shot desktop legacy import before modules start. */
export async function afterSettings(app: App, host: RecoveryHost, store: SettingsStore): Promise<void> {
	const { deviceId } = vaultIdentity(app);
	registerMessages(messages);
	host.register(settingsOwner(store, deviceId, ['agent']));
	if (!Platform.isDesktopApp) return;
	// Cheap gate so vaults without legacy layout (or already imported) never load the agent module here.
	const dir = `.huhu/terminal-agent/${deviceId}`,
		files = host.storage;
	try {
		const legacy =
			(await files.exists(`${dir}/workspace.json`)) || (await files.exists(`${dir}/workspace.json.backup`));
		if (!legacy || (await files.exists(`${dir}/legacy-import.json`))) return;
	} catch (error) {
		console.error('[HUHU migration] legacy probe failed:', error);
		return;
	}
	try {
		const { runStartupLegacyMigration } = await import('../modules/agent/module');
		const result = await runStartupLegacyMigration(app, host);
		if (result.status === 'busy') new Notice(t('agent.migration.busy'));
		else if (result.status === 'refused') console.error('[HUHU migration] legacy import refused:', result.reason);
	} catch (error) {
		// A failed import leaves the legacy files and any valid records untouched; it is retried on the next start.
		console.error('[HUHU migration] legacy import failed:', error);
		if (host.gate.held) {
			new Notice(t('agent.migration.blocked'), 0);
			throw error;
		}
	}
}

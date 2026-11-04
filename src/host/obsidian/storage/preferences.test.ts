import type { App } from 'obsidian';
import { expect, test } from 'vitest';
import { SettingsStore, type SettingsFile } from '../../../shared/settings/store';
import { getVaultPreference, initializeVaultPreferences, setVaultPreference } from './preferences';

test('preferences persist only in device scope and unknown keys are refused', async () => {
	const app = {} as App;
	const files = new Map<string, SettingsFile>();
	const store = new SettingsStore({ load: async scope => files.get(scope) ?? null, save: async (scope, file) => { files.set(scope, structuredClone(file)); return structuredClone(file); } }, { timers: { set: (work, ms) => setTimeout(work, ms), clear: id => clearTimeout(id as ReturnType<typeof setTimeout>) } });
	await store.load();
	await initializeVaultPreferences(app, store);
	expect(getVaultPreference(app, 'huhu.dashboard.sidebar-pinned')).toBeUndefined();
	setVaultPreference(app, 'huhu.dashboard.sidebar-pinned', 'false'); await store.flush();
	expect(getVaultPreference(app, 'huhu.dashboard.sidebar-pinned')).toBe('false');
	expect(files.get('vault')?.namespaces['local-ui']).toBeUndefined();
	expect(files.get('device')!.namespaces['local-ui']!.values).toEqual({ 'huhu.dashboard.sidebar-pinned': 'false' });
	expect(() => setVaultPreference(app, 'unknown.key', 1)).toThrow('unknown-preference');
	await store.dispose();
});

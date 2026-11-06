import { SettingsStore, type SettingsFile } from '../../../shared/settings/store';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { GeneralSettings } from './GeneralSettings';
import { appSchema } from '../app-schema';
import type DashboardPlugin from '../../main';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';

test.each(['zh', 'en'] as const)('module switches retain saved state and recover from write/apply failures (%s)', async language => {
	setLanguage(language);
	let settings = appSchema(language).defaults();
	let failWrite = true, failApply = false;
	const listeners = new Set<() => void>();
	const plugin = {
		appSettings: { get: () => settings, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); } },
		moduleManifests: () => [{ id: 'automations', titleKey: 'automation.title', descriptionKey: 'modules.automationDesc', platforms: { mobile: true } }],
		setModuleEnabled: async (_id: string, value: boolean) => {
			if (failWrite) throw Error('disk full');
			settings = { ...settings, modules: { ...settings.modules, automations: value } };
			for (const listener of listeners) listener();
			if (failApply) throw Error('stop failed');
		},
	} as unknown as DashboardPlugin;
	settings.modules.automations = true;
	const view = render(<TestProviders><GeneralSettings plugin={plugin} navigate={vi.fn()} /></TestProviders>);
	const toggle = screen.getByRole('switch', { name: t('automation.title') });
	expect(toggle.closest('.huhu-design')).toBeNull();
 expect(view.container.querySelectorAll('.huhu-design').length).toBe(2);
	expect(toggle.getAttribute('aria-checked')).toBe('true');
	fireEvent.click(toggle);
	await screen.findByRole('alert');
	await waitFor(() => expect(toggle.hasAttribute('disabled')).toBe(false));
	expect(toggle.getAttribute('aria-checked')).toBe('true');
	failWrite = false; failApply = true;
	await act(async () => fireEvent.click(toggle));
	expect(toggle.getAttribute('aria-checked')).toBe('false');
	expect(toggle.hasAttribute('disabled')).toBe(false);
	failApply = false;
	await act(async () => fireEvent.click(toggle));
	expect(toggle.getAttribute('aria-checked')).toBe('true');
	expect(screen.queryByRole('alert')).toBeNull();
	view.unmount(); expect(listeners.size).toBe(0);
});

test('status bar section only offers per-item visibility and usage preferences', async () => {
	setLanguage('en');
	let settings = appSchema('en').defaults();
	const listeners = new Set<() => void>();
	const plugin = {
		appSettings: {
			get: () => settings,
			subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
			update: async (recipe: (draft: typeof settings) => void) => {
				settings = structuredClone(settings);
				recipe(settings);
				for (const listener of listeners) listener();
			},
		},
		moduleManifests: () => [],
	} as unknown as DashboardPlugin;
	render(<TestProviders><GeneralSettings plugin={plugin} navigate={vi.fn()} /></TestProviders>);
	// The retired in-workbench bar had a master switch and a mirror switch; neither exists any more.
	expect(screen.queryByRole('switch', { name: /show status bar/i })).toBeNull();
	expect(screen.queryByText(/Obsidian status bar$/)).not.toBeNull();
	const usage = screen.getByRole('switch', { name: 'Show Usage' });
	expect(usage.getAttribute('aria-checked')).toBe('true');
	fireEvent.click(usage);
	await waitFor(() => expect(settings.statusBar.segments).toEqual({ usage: false }));
	await waitFor(() => expect(screen.getByRole('switch', { name: 'Show Usage' }).getAttribute('aria-checked')).toBe('false'));
	fireEvent.click(screen.getByRole('switch', { name: 'Show Git sync' }));
	await waitFor(() => expect(settings.statusBar.segments).toEqual({ usage: false, sync: false }));
	fireEvent.click(screen.getByRole('switch', { name: 'Show Usage' }));
	await waitFor(() => expect(settings.statusBar.segments).toEqual({ usage: true, sync: false }));
});

test('visible HUHU content remains reachable from searchable general settings', () => {
	setLanguage('zh');
	const settings = appSchema('zh').defaults(), navigate = vi.fn();
	const plugin = {
		appSettings: { get: () => settings, subscribe: () => () => {} },
		moduleManifests: () => [],
	} as unknown as DashboardPlugin;
	render(<TestProviders><GeneralSettings plugin={plugin} navigate={navigate} /></TestProviders>);
	const browse = screen.getByRole('button', { name: t('content.browse') });
	expect(browse.closest('[data-searchable-setting]')?.textContent).toContain(t('content.settingsHint'));
	fireEvent.click(browse);
	expect(navigate).toHaveBeenCalledExactlyOnceWith({ feature: 'content' });
});


test.each([[false, false], [true, false], [true, true]])('real General failure retries the latest published values without replaying toggles (pending edit=%s, close=%s)', async (pendingEdit, close) => {
	setLanguage('en');
	const original = appSchema('en').defaults();
	const files: Record<string, SettingsFile | null> = { vault: { version: 1, namespaces: { app: structuredClone(original) } }, device: null };
	let reject!: (error: Error) => void;
	let release!: () => void;
	let retryReady = false;
	const vaultSave = vi.fn(async () => {
		if (!retryReady) {
			if (vaultSave.mock.calls.length === 1) await new Promise<void>((_yes, no) => { reject = no; });
			throw Error('disk full');
		}
		await new Promise<void>(yes => { release = yes; });
	});
	const save = async (scope: string, file: SettingsFile) => {
		if (scope === 'vault') await vaultSave();
		files[scope] = structuredClone(file); return file;
	};
	const store = new SettingsStore({ load: async scope => files[scope] ?? null, save }, {
		timers: { set: (fn, ms) => window.setTimeout(fn, ms), clear: timer => window.clearTimeout(timer as number) }, debounceMs: 0,
	});
	await store.load();
	const appSettings = store.bind('app', appSchema('en'));
	const plugin = { appSettings, moduleManifests: () => [] } as unknown as DashboardPlugin;
	const view = render(<TestProviders><GeneralSettings plugin={plugin} navigate={vi.fn()} /></TestProviders>);
	try {
		fireEvent.click(screen.getByRole('switch', { name: t('shell.showStatusItem', { item: t('shell.usage') }) }));
		await waitFor(() => expect(vaultSave).toHaveBeenCalledOnce());
		expect(appSettings.get().statusBar.segments.usage).toBe(false);
		expect(files.vault!.namespaces.app!.statusBar).toEqual(original.statusBar);
		if (pendingEdit) {
			fireEvent.click(screen.getByRole('radio', { name: t('shell.remaining') }));
			await waitFor(() => expect(appSettings.get().statusBar.usageDisplay).toBe('remaining'));
		}
		reject(Error('disk full'));
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain(t('settings.writeFailed'));
		retryReady = true;
		const failedWrites = pendingEdit ? 2 : 1;
		fireEvent.click(screen.getByRole('button', { name: t('workbench.retry') }));
		await waitFor(() => expect(vaultSave).toHaveBeenCalledTimes(failedWrites + 1));
		expect(appSettings.get().statusBar.segments.usage).toBe(false);
		if (close) view.unmount();
		release();
		await waitFor(() => expect(store.status).toBe('idle'));
		expect(files.vault!.namespaces.app!.statusBar).toMatchObject({ usageDisplay: pendingEdit ? 'remaining' : original.statusBar.usageDisplay, segments: { usage: false } });
		expect(screen.queryByRole('alert')).toBeNull();
		expect(vaultSave).toHaveBeenCalledTimes(failedWrites + 1);
	} finally { reject?.(Error('cleanup')); release?.(); view.unmount(); await store.dispose(); }
});

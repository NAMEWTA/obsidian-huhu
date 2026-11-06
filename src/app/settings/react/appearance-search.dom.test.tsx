import { act, render, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type DashboardPlugin from '../../main';
import { SettingsStore, type SettingsFile } from '../../../shared/settings/store';
import { themeSettings } from '../../../theme/settings';
import { appSchema } from '../app-schema';
import { setLanguage, t } from '../../../shared/i18n';
import { TestProviders } from '../../../ui/react/test-providers';
import { collectSettingRows } from '../setting-rows';
import { SettingsPage } from './SettingsPage';
import { resetSettingsIndex, searchSettings } from './settings-search-index';

// MarkdownRenderer's native lifecycle has separate coverage in preview-document.dom.test.tsx.
vi.mock('./appearance/StylePreview', () => ({ StylePreview: () => null }));
afterEach(() => { resetSettingsIndex(); setLanguage('zh'); });

test('conditional search only returns real reachable rows and invalidates on mode and language changes', async () => {
	setLanguage('en');
	const files: Record<string, SettingsFile | null> = {
		vault: { version: 1, namespaces: { app: appSchema('en').defaults(), theme: themeSettings.defaults() } }, device: null,
	};
	const save = vi.fn(async (scope: string, file: SettingsFile) => { files[scope] = structuredClone(file); return file; });
	const store = new SettingsStore({ load: async scope => files[scope] ?? null, save }, {
		timers: { set: (fn, ms) => window.setTimeout(fn, ms), clear: timer => window.clearTimeout(timer as number) }, debounceMs: 0,
	});
	await store.load();
	const theme = store.bind('theme', themeSettings);
	const plugin = { appSettings: store.bind('app', appSchema('en')), theme,
		app: { workspace: { containerEl: { doc: document } } },
		moduleManifests: () => [], moduleState: () => 'active', moduleEnabled: () => false, onModuleChanged: () => () => {},
	} as unknown as DashboardPlugin;
	const categories = [{ id: 'appearance', label: 'Appearance' }];
	const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
	let view: ReturnType<typeof render> | undefined;
	try {
		const initial = await searchSettings(plugin, categories, t('appearance.customBackground'));
		expect(initial.filter(result => result.label === t('appearance.customBackground'))).toEqual([]);
		expect(theme.get().editor).toBe('follow');
		expect(save).not.toHaveBeenCalled();
		for (const language of ['en', 'zh'] as const) {
			act(() => setLanguage(language));
			await act(async () => { await theme.update(draft => { draft.editor = 'custom'; }); });
			const beforeSearch = save.mock.calls.length;
			const results = await searchSettings(plugin, categories, t('appearance.customBackground'));
			const result = results.find(item => item.label === t('appearance.customBackground'))!;
			expect(result).toBeTruthy();
			const target = result.target!;
			scroll.mockClear();
			view = render(<TestProviders><SettingsPage plugin={plugin} category={target.section!} resourceId={target.resourceId} focusId={target.focusId} navigate={() => {}} /></TestProviders>);
			const row = collectSettingRows(view.container).find(item => item.key === target.focusId)!;
			expect(row).toBeTruthy();
			await waitFor(() => expect(scroll).toHaveBeenCalled());
			expect(row.element.classList.contains('ring-2')).toBe(true);
			expect(theme.get().editor).toBe('custom');
			expect(save).toHaveBeenCalledTimes(beforeSearch);
			view.unmount(); view = undefined;
			await act(async () => { await theme.update(draft => { draft.editor = 'follow'; }); });
			expect((await searchSettings(plugin, categories, t('appearance.customBackground'))).filter(item => item.label === t('appearance.customBackground'))).toEqual([]);
		}
	} finally { view?.unmount(); scroll.mockRestore(); await store.dispose(); }
});

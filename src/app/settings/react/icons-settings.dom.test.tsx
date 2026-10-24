import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type DashboardPlugin from '../../main';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import { iconsSettingsPage } from '../../../modules/icons/ui/settings-page';
import type IconicController from '../../../modules/icons/platform/host/controller';
import { DEFAULT_ICONIC_SETTINGS } from '../../../modules/icons/core/settings/model';
import { searchSettings, resetSettingsIndex } from './settings-search-index';

afterEach(() => { resetSettingsIndex(); setLanguage('zh'); });

test.each(['en', 'zh'] as const)('icon searches reach the right settings tab and edit the existing preferences (%s)', async (language) => {
	setLanguage(language);
	const settings = structuredClone(DEFAULT_ICONIC_SETTINGS);
	settings.fileIcons = { 'notes/keep.md': { icon: 'lucide-star', color: 'blue' } };
	settings.fileRules = [{ id: 'kept-rule', name: 'Retained', enabled: true }];
	const controller = {
		settings, isActive: () => true,
		updatePreference: vi.fn(async (key: keyof typeof settings, value: never) => { settings[key] = value; }),
		refreshBody: vi.fn(), refreshManagers: vi.fn(),
	} as unknown as IconicController;
	const Page = iconsSettingsPage(() => controller);
	const instance = { settingsPage: async () => Page };
	const plugin = {
		app: { workspace: { containerEl: { doc: document } } },
		moduleInstance: () => instance,
		moduleManifests: () => [{ id: 'icons' }], moduleState: () => 'active',
	} as unknown as DashboardPlugin;
	const results = await searchSettings(plugin, [{ id: 'iconic', label: t('modules.iconic') }], t('iconic.settings.showTitleIcons.name'));
	const result = results.find((item) => item.label === t('iconic.settings.showTitleIcons.name'))!;
	expect(result.target).toMatchObject({ feature: 'settings', section: 'iconic', resourceId: 'iconic-editor' });
	render(<TestProviders><Page resourceId={result.target!.resourceId} /></TestProviders>);
	expect(screen.getByRole('tab', { name: t('iconic.settings.headingEditor') }).getAttribute('aria-selected')).toBe('true');
	const before = settings.showTitleIcons;
	await userEvent.setup().click(screen.getByRole('switch', { name: t('iconic.settings.showTitleIcons.name') }));
	await waitFor(() => expect(controller.updatePreference).toHaveBeenCalledWith('showTitleIcons', !before));
	expect(settings.fileIcons).toEqual({ 'notes/keep.md': { icon: 'lucide-star', color: 'blue' } });
	expect(settings.fileRules).toEqual([{ id: 'kept-rule', name: 'Retained', enabled: true }]);
});

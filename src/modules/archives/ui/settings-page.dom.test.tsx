import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import type { ContactsController } from '../platform/controller';
import { archivesSettingsPage } from './settings-page';
import { SettingsStore } from '../../../shared/settings/store';
import { archivesSettings } from '../settings';
afterEach(() => setLanguage('zh'));

test('archive settings reject invalid roots and persist column changes through the namespace', async () => {
	const store = new SettingsStore(
		{ load: async () => null, save: async (_scope, file) => file },
		{
			timers: {
				set: (callback, ms) => setTimeout(callback, ms),
				clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
			},
			debounceMs: 0,
		},
	);
	const settings = store.bind('archives', archivesSettings),
		controller = { countFolder: vi.fn() } as unknown as ContactsController;
	const vault = { on: () => ({}), offref: () => {}, getAllLoadedFiles: () => [{ path: '档案', children: [] }] };
	const Page = archivesSettingsPage(
		{ workspace: { containerEl: document.body }, vault } as never,
		controller,
		settings,
	);
	render(
		<TestProviders>
			<Page />
		</TestProviders>,
	);
	const user = userEvent.setup();
	const root = screen.getByRole('combobox', { name: t('contacts.folder') });
	await user.clear(root);
	await user.type(root, '../outside');
	// The path field itself refuses a path that leaves the vault; nothing reaches the controller or the settings.
	expect(await screen.findByRole('alert')).toBeTruthy();
	await user.keyboard('{Enter}');
	expect(controller.countFolder).not.toHaveBeenCalled();
	expect(settings.get().rootFolder).not.toBe('../outside');
	await user.click(screen.getByRole('combobox', { name: t('contacts.columns') }));
	await user.click(screen.getByRole('option', { name: '5' }));
	expect(settings.get().maxColumns).toBe(5);
	await store.dispose();
});

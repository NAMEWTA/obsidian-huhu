// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HuhuProviders } from '../../../ui/react/providers';
import { setLanguage } from '../../../shared/i18n';
import { FakeVault, createTestService, note } from '../services/test-support';
import { navigatorSettingsPage } from './settings-page';
import type { NavigatorRuntime } from './runtime';

vi.mock('obsidian', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), Platform: { isMacOS: false, isPhone: false, isMobile: false } }));

/** The slice of the vault that path fields read: nothing exists yet, so typed folders are created. */
function fakeApp() {
	const folders = new Set<string>(['Templates']);
	return {
		vault: {
			on: () => ({}),
			offref: () => {},
			getAllLoadedFiles: () => [...folders].map((path) => ({ path, children: [] })),
			getAbstractFileByPath: (path: string) => (folders.has(path) ? { path, children: [] } : null),
			createFolder: async (path: string) => { folders.add(path); },
			adapter: { exists: async (path: string) => folders.has(path) },
		},
	} as never;
}

async function page() {
	setLanguage('en');
	const t = await createTestService(new FakeVault([note('a.md')], ['/']));
	const runtime = { templateFiles: () => ['T/Meeting.md'], templaterInstalled: () => false, service: t.service, rebuildCache: () => Promise.resolve() } as unknown as NavigatorRuntime;
	const Page = navigatorSettingsPage(t.settings, () => runtime, fakeApp());
	render(<HuhuProviders ownerDocument={document}><div className="huhu-ui"><Page /></div></HuhuProviders>);
	return t;
}

const blur = (element: HTMLElement, value: string) => { fireEvent.change(element, { target: { value } }); fireEvent.blur(element); };

test('periods are switched and given templates per period, saved when a field loses focus', async () => {
	const t = await page();
	const week = document.querySelector<HTMLElement>('[data-period-rule="week"]')!;
	// daily, weekly and monthly notes are on by default; the fixed path is shown for each
	expect(t.settings.get().periods.week.enabled).toBe(true);
	expect(week.textContent).toContain('Saved as huhu/日志/周记/gggg/gggg-Www.md');
	fireEvent.click(within(week).getByRole('switch', { name: 'Enable Weekly notes' }));
	await waitFor(() => expect(t.settings.get().periods.week.enabled).toBe(false));
	blur(within(week).getByRole('combobox', { name: 'Weekly notes: template' }), ' T/Meeting.md ');
	await waitFor(() => expect(t.settings.get().periods.week).toEqual({ enabled: false, template: 'T/Meeting.md' }));
	// A template that is not one of the listed files is not accepted.
	blur(within(week).getByRole('combobox', { name: 'Weekly notes: template' }), 'T/other.md');
	await waitFor(() => expect(within(week).getByRole<HTMLInputElement>('combobox', { name: 'Weekly notes: template' }).value).toBe('T/Meeting.md'));
	// there is no folder or file name pattern to edit
	expect(within(week).queryByRole('textbox', { name: /folder|pattern/ })).toBeNull();
	const year = document.querySelector<HTMLElement>('[data-period-rule="year"]')!;
	fireEvent.click(within(year).getByRole('switch', { name: 'Enable Yearly notes' }));
	await waitFor(() => expect(t.settings.get().periods.year.enabled).toBe(true));
});

test('the journal folder is a setting, repaired when unusable, and changes the shown paths', async () => {
	const t = await page();
	const root = screen.getByRole<HTMLInputElement>('combobox', { name: 'Journal folder' });
	blur(root, '/Notes/Journal/');
	await waitFor(() => expect(t.settings.get().periodicRoot).toBe('Notes/Journal'));
	const day = document.querySelector<HTMLElement>('[data-period-rule="day"]')!;
	await waitFor(() => expect(day.textContent).toContain('Saved as Notes/Journal/日记/YYYY/MM/YYYY-MM-DD.md'));
	// A hidden folder is refused at the field: the setting keeps its value.
	blur(root, '.huhu/journal');
	await waitFor(() => expect(root.value).toBe('Notes/Journal'));
	expect(t.settings.get().periodicRoot).toBe('Notes/Journal');
	// Emptying the field falls back to the default folder.
	blur(root, '   ');
	await waitFor(() => expect(t.settings.get().periodicRoot).toBe('huhu/日志'));
});

test('the Daily notes core plugin is no longer a source', async () => {
	await page();
	expect(screen.queryByText('Daily note source')).toBeNull();
});

test('template settings, folder templates and the engine choice', async () => {
	const t = await page();
	blur(screen.getByRole('combobox', { name: 'Template folder' }), '/Templates/');
	await waitFor(() => expect(t.settings.get().templateFolder).toBe('Templates'));
	expect(screen.getByText('Templater is not installed or enabled, so the built-in engine fills every template.')).toBeTruthy();
	blur(screen.getByRole('textbox', { name: 'Date format in templates' }), 'DD.MM.YYYY');
	await waitFor(() => expect(t.settings.get().templateDateFormat).toBe('DD.MM.YYYY'));

	const add = screen.getByRole('button', { name: 'Add' });
	expect(add.hasAttribute('disabled')).toBe(true);
	const row = add.closest('div')!;
	fireEvent.change(within(row).getByRole('combobox', { name: 'Template' }), { target: { value: 'T/Meeting.md' } });
	fireEvent.blur(within(row).getByRole('combobox', { name: 'Template' }));
	fireEvent.change(within(row).getByRole('combobox', { name: 'Folder' }), { target: { value: '/Work/' } });
	fireEvent.blur(within(row).getByRole('combobox', { name: 'Folder' }));
	fireEvent.click(add);
	await waitFor(() => expect(t.settings.get().folderTemplates).toEqual([{ folder: 'Work', template: 'T/Meeting.md', exact: false }]));
	const entry = await waitFor(() => { const found = document.querySelector<HTMLElement>('[data-folder-template="Work"]'); expect(found).toBeTruthy(); return found!; });
	fireEvent.click(within(entry).getByRole('switch', { name: 'This folder only (not its subfolders)' }));
	await waitFor(() => expect(t.settings.get().folderTemplates[0]?.exact).toBe(true));
	fireEvent.click(within(entry).getByRole('button', { name: 'Remove' }));
	await waitFor(() => expect(t.settings.get().folderTemplates).toEqual([]));
});

test('create-note commands can be added, edited and removed', async () => {
	const t = await page();
	fireEvent.click(screen.getByRole('button', { name: 'Add command' }));
	const card = await waitFor(() => { const found = document.querySelector<HTMLElement>('[data-create-command]'); expect(found).toBeTruthy(); return found!; });
	expect(t.settings.get().createCommands).toHaveLength(1);
	blur(within(card).getByRole('textbox', { name: 'Name' }), 'Meeting note');
	blur(within(card).getByRole('textbox', { name: 'File name pattern' }), '{{date:YYYYMMDD}} {{prompt:Title}}');
	await waitFor(() => expect(t.settings.get().createCommands[0]).toMatchObject({ name: 'Meeting note', fileName: '{{date:YYYYMMDD}} {{prompt:Title}}', location: 'selected' }));
	fireEvent.click(within(card).getByRole('button', { name: 'Remove' }));
	await waitFor(() => expect(t.settings.get().createCommands).toEqual([]));
});

test('profiles can be added, renamed, given a banner, switched to and removed', async () => {
	const t = await page();
	expect(document.querySelectorAll('[data-profile]')).toHaveLength(1);
	fireEvent.click(screen.getByRole('button', { name: 'Add profile' }));
	await waitFor(() => expect(document.querySelectorAll('[data-profile]')).toHaveLength(2));
	const second = document.querySelectorAll<HTMLElement>('[data-profile]')[1]!;
	blur(within(second).getByRole('textbox', { name: 'Name' }), 'Work');
	// A banner has to be an existing file.
	blur(within(second).getByRole('combobox', { name: 'Banner image' }), 'banner.png');
	await waitFor(() => expect(within(second).getByRole<HTMLInputElement>('combobox', { name: 'Banner image' }).value).toBe(''));
	fireEvent.click(within(second).getByRole('button', { name: 'Use' }));
	await waitFor(() => expect(t.settings.get().activeProfile).not.toBe('default'));
	const first = document.querySelectorAll<HTMLElement>('[data-profile]')[0]!;
	expect(within(first).getByRole('button', { name: 'Remove' })).toBeTruthy();
	fireEvent.click(within(first).getByRole('button', { name: 'Remove' }));
	await waitFor(() => expect(t.settings.get().profiles.map((profile) => profile.name)).toEqual(['Work']));
});

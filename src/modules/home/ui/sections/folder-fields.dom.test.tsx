import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import type { App } from 'obsidian';
import { FolderField, FolderListField } from './P1Controls';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);

const folder = (path: string) => ({ path, children: [] });
function appWith(created: string[] = []) {
	const known = new Set(['Notes', 'Projects']);
	return {
		vault: {
			getAllLoadedFiles: () => [...known].map(folder),
			getAbstractFileByPath: (path: string) => (known.has(path) ? folder(path) : null),
			createFolder: async (path: string) => {
				created.push(path);
				known.add(path);
			},
			adapter: { exists: async () => false },
			on: () => ({}),
			offref: () => {},
		},
	} as unknown as App;
}
const type = (field: HTMLElement, text: string) => {
	fireEvent.focus(field);
	fireEvent.change(field, { target: { value: text } });
	fireEvent.keyDown(field, { key: 'Enter' });
};

test('a folder list shows each folder as a chip that can be removed, and adds the one picked from the vault', () => {
	const onChange = vi.fn();
	render(
		<TestProviders>
			<FolderListField app={appWith()} label="Excluded" folders={['Notes']} onChange={onChange} />
		</TestProviders>,
	);
	const list = document.querySelector<HTMLElement>('[data-folder-list]')!;
	expect(within(list).getByText('Notes')).toBeTruthy();
	type(screen.getByRole('combobox', { name: 'Excluded' }), 'Projects');
	expect(onChange).toHaveBeenLastCalledWith(['Notes', 'Projects']);
	fireEvent.click(within(list).getByRole('button', { name: /Notes/ }));
	expect(onChange).toHaveBeenLastCalledWith([]);
});

test('a folder field creates the folder that was typed once it is accepted', async () => {
	const created: string[] = [];
	const onChange = vi.fn();
	render(
		<TestProviders>
			<FolderField app={appWith(created)} label="Root" value="" onChange={onChange} />
		</TestProviders>,
	);
	type(screen.getByRole('combobox', { name: 'Root' }), 'Work/Plans');
	expect(onChange).toHaveBeenLastCalledWith('Work/Plans');
	await vi.waitFor(() => expect(created).toEqual(['Work', 'Work/Plans']));
});

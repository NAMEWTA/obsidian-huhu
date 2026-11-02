import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { App } from 'obsidian';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { actionDefinitions } from '../../core/actions/registry';
import { actionViews } from '../actions/registry';
import { fixture } from '../test-fixture';
import { openComposer } from './composer-page';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);
const app = {} as App;
const at = new Date(2030, 0, 2, 9, 30).getTime();

test('every action has a form view in the same order as its definition', () => {
	expect(actionViews.map((view) => view.kind)).toEqual(actionDefinitions.map((definition) => definition.kind));
});
test('the dialog is titled "New automation", opens the reminder prefilled and saves it with its link', async () => {
	const f = fixture([]),
		user = userEvent.setup();
	const result = openComposer(app, f.host, {
		action: 'notify',
		prefill: { name: 'Call Ann', at, link: { path: 'Daily/2030-01-02.md', line: 4 } },
		ownerWindow: window,
	});
	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).getByText(t('automation.new'))).toBeTruthy();
	expect((within(dialog).getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Call Ann');
	expect(
		(within(dialog).getByRole('textbox', { name: t('automation.notifyText') }) as HTMLTextAreaElement).value,
	).toBe('Call Ann');
	expect((within(dialog).getByLabelText(t('automation.time')) as HTMLInputElement).value).toBe('2030-01-02T09:30');
	await user.click(within(dialog).getByRole('button', { name: 'Create' }));
	const saved = await result;
	expect(saved).toMatchObject({
		name: 'Call Ann',
		action: { kind: 'notify', body: 'Call Ann' },
		link: { path: 'Daily/2030-01-02.md', line: 4 },
		schedule: { kind: 'once', at },
	});
	expect(f.service.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Call Ann' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	f.view.dispose();
});
test('switching the action swaps the form; cancelling saves nothing', async () => {
	const f = fixture([]),
		user = userEvent.setup();
	const result = openComposer(app, f.host, { action: 'notify', prefill: { name: 'Water' }, ownerWindow: window });
	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).queryByRole('combobox', { name: t('automation.board') })).toBeNull();
	await user.click(within(dialog).getByRole('combobox', { name: t('automation.action') }));
	await user.click(await screen.findByRole('option', { name: t('automation.create-task') }));
	expect(within(dialog).queryByRole('combobox', { name: t('automation.board') })).toBeNull();
	expect(within(dialog).getByLabelText(t('automation.taskDueDate'))).toBeTruthy();
	expect(within(dialog).getByRole('textbox', { name: t('automation.todoText') })).toBeTruthy();
	expect(within(dialog).queryByRole('textbox', { name: t('automation.notifyText') })).toBeNull();
	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	expect(await result).toBeUndefined();
	expect(f.service.save).not.toHaveBeenCalled();
	f.view.dispose();
});
test('a definition kept in a source document can only be a reminder', async () => {
	const f = fixture([]);
	const result = openComposer(app, f.host, {
		action: 'notify',
		source: { kind: 'dashboard', path: 'Board.md', id: 'task' },
		prefill: { name: 'Follow up' },
		ownerWindow: window,
	});
	const dialog = await screen.findByRole('dialog');
	expect((within(dialog).getByRole('combobox', { name: t('automation.action') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Cancel' }));
	await result;
	f.view.dispose();
});
test('closing the module closes an open dialog', async () => {
	const f = fixture([]),
		stop = new AbortController();
	const result = openComposer(app, f.host, { ownerWindow: window }, stop.signal);
	await screen.findByRole('dialog');
	stop.abort();
	expect(await result).toBeUndefined();
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	f.view.dispose();
});

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../shared/i18n';
import { definition, fixture } from './test-fixture';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);
test('opening definition and run details retains the same filtered, scrolled task list', async () => {
	const f = fixture();
	const view = render(<f.Page />),
		user = userEvent.setup();
	const search = screen.getByRole('textbox', { name: t('automation.searchAll') });
	await user.type(search, 'Alpha');
	const table = view.container.querySelector('[role="table"]')!;
	table.scrollTop = 42;
	await user.click(screen.getByRole('button', { name: 'Alpha' }));
	expect(view.container.querySelector('[role="table"]')).toBe(table);
	expect(view.container.querySelector('input[aria-label]')).toBe(search);
	expect((search as HTMLInputElement).value).toBe('Alpha');
	expect(table.scrollTop).toBe(42);
	expect(await screen.findByRole('tab', { name: t('automation.overview') })).toBeTruthy();
	f.view.dispose();
});
test('list and detail share one definition Promise lock and display latest service truth on rejection', async () => {
	const rows = [definition('Alpha')],
		f = fixture(rows);
	let reject!: (cause: Error) => void;
	const gate = new Promise<void>((_resolve, no) => {
		reject = no;
	});
	f.service.save = vi.fn(async () => gate);
	f.service.stop = vi.fn(async () => {});
	const view = render(<f.Page />);
	await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
	const detail = await screen.findByRole('dialog');
	const toggle = within(detail).getByRole('switch');
	fireEvent.click(toggle);
	await waitFor(() => expect(toggle.getAttribute('aria-busy')).toBe('true'));
	const list = view.container.querySelector('[data-automation-row-id="Alpha"] [role="switch"]')!;
	expect(list.getAttribute('aria-busy')).toBe('true');
	expect(list.hasAttribute('disabled')).toBe(true);
	fireEvent.click(list);
	fireEvent.click(toggle);
	expect(f.service.save).toHaveBeenCalledTimes(1);
	rows[0] = { ...rows[0]!, enabled: false };
	f.listeners.forEach((fn) => fn());
	reject(Error('save rejected'));
	await waitFor(() => expect(toggle.getAttribute('aria-busy')).not.toBe('true'));
	expect(toggle.getAttribute('aria-checked')).toBe('false');
	expect(within(detail).getByText('save rejected')).toBeTruthy();
	expect(f.service.stop).not.toHaveBeenCalled();
	f.view.dispose();
});

test('one shared leave decision coalesces close attempts, keeps the real draft on cancel, and discards once', async () => {
	const f = fixture();
	let guard: (() => Promise<boolean>) | null = null;
	render(
		<f.Page
			onGuard={(value) => {
				guard = value;
			}}
		/>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
	const dialog = await screen.findByRole('dialog'),
		name = within(dialog).getByRole('textbox', { name: 'Name' });
	await userEvent.clear(name);
	await userEvent.type(name, 'Unsaved draft');
	let first!: Promise<boolean>, second!: Promise<boolean>;
	await act(() => {
		first = guard!();
		second = guard!();
	});
	expect(first).toBe(second);
	expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
	await userEvent.click(screen.getByRole('button', { name: t('automation.keepEditing') }));
	expect(await first).toBe(false);
	expect((name as HTMLInputElement).value).toBe('Unsaved draft');
	await act(() => {
		first = guard!();
	});
	await userEvent.click(screen.getByRole('button', { name: t('automation.discard') }));
	expect(await first).toBe(true);
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).toBeNull());
	expect(f.service.save).not.toHaveBeenCalled();
	f.view.dispose();
});
test('hide releases the editor layer while retaining the exact form, draft and input selection', async () => {
	const f = fixture(),
		view = render(<f.Page />);
	await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
	const dialog = await screen.findByRole('dialog'),
		name = within(dialog).getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
	await userEvent.clear(name);
	await userEvent.type(name, 'Retained editor draft');
	name.setSelectionRange(2, 7);
	view.rerender(<f.Page visible={false} />);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(name.isConnected).toBe(true);
	view.rerender(<f.Page visible />);
	const reopened = await screen.findByRole('dialog');
	expect(within(reopened).getByRole('textbox', { name: 'Name' })).toBe(name);
	expect(name.value).toBe('Retained editor draft');
	expect(name.selectionStart).toBe(2);
	expect(name.selectionEnd).toBe(7);
	f.view.dispose();
});
test('a delayed run cannot replace a newer definition selection', async () => {
	const f = fixture();
	let finish!: (value: import('../../../shared/automation/types').AutomationRun) => void;
	f.service.run = vi.fn(
		() =>
			new Promise<import('../../../shared/automation/types').AutomationRun>((done) => {
				finish = done;
			}),
	);
	render(<f.Page />);
	await userEvent.click(screen.getByRole('button', { name: 'Run Alpha' }));
	await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
	await act(() =>
		finish({
			id: 'late-run',
			automationId: 'Alpha',
			revision: 1,
			title: 'Alpha',
			status: 'succeeded',
			trigger: 'manual',
			scheduledFor: 1,
			startedAt: 1,
			message: '',
		}),
	);
	await waitFor(() => expect(screen.getByRole('dialog', { name: 'Beta' })).toBeTruthy());
	expect(f.navigate).toHaveBeenLastCalledWith({ feature: 'automations', section: 'tasks', resourceId: 'Beta' });
	f.view.dispose();
});
test('a save resolving after discard cannot close or overwrite the next editor draft', async () => {
	const f = fixture();
	const original = f.service.save;
	let finish!: () => void;
	const gate = new Promise<void>((done) => {
		finish = done;
	});
	f.service.save = vi.fn(async (value) => {
		await gate;
		await original(value);
	});
	render(<f.Page />);
	await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
	let dialog = await screen.findByRole('dialog');
	await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' saved');
	await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(f.service.save).toHaveBeenCalledOnce());
	await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
	await userEvent.click(await screen.findByRole('button', { name: t('automation.discard') }));
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).toBeNull());
	await userEvent.click(screen.getByRole('button', { name: 'Edit Beta' }));
	dialog = await screen.findByRole('dialog');
	const name = within(dialog).getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
	await userEvent.type(name, ' new draft');
	await act(() => finish());
	expect(name.isConnected).toBe(true);
	expect(name.value).toBe('Beta new draft');
	expect(screen.getByRole('dialog')).toBe(dialog);
	f.view.dispose();
});

test('clean retained editor returns focus to its exact edit button after keyboard close', async () => {
	const f = fixture();
	render(<f.Page />);
	const opener = screen.getByRole('button', { name: 'Edit Alpha' });
	opener.focus();
	await userEvent.keyboard('{Enter}');
	await screen.findByRole('dialog');
	await userEvent.keyboard('{Escape}');
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(opener));
	f.view.dispose();
});

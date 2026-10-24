import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { EditorView } from './EditorView';
import { definition, fixture } from '../test-fixture';

beforeEach(() => setLanguage('en'));
const targets = [
	{ path: 'First.md', cardId: 'card-one', title: 'First board/card' },
	{ path: 'Second.md', cardId: 'card-two', title: 'Second board/card' },
];
function setup() {
	const f = fixture();
	f.host.taskTargets = vi.fn(async () => targets);
	const existing = {
		...definition('Task creator'),
		action: { kind: 'create-task' as const, path: 'First.md', cardId: 'card-one', text: 'Test task' },
	};
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing }} onSaved={vi.fn()} onClose={vi.fn()} />
		</TestProviders>,
	);
	return f;
}
test('clearing the actual target blocks save; reselecting another board/card saves only the new target', async () => {
	const f = setup(),
		user = userEvent.setup();
	await user.click(screen.getByRole('combobox', { name: 'Dashboard' }));
	await user.click(await screen.findByRole('option', { name: 'First.md' }));
	expect(screen.getByRole('combobox', { name: 'Dashboard' }).textContent).toBe(t('automation.select'));
	expect(screen.getByRole('combobox', { name: 'To-do card' }).textContent).toBe(t('automation.select'));
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(f.service.save).not.toHaveBeenCalled();
	await user.click(screen.getByRole('combobox', { name: 'Dashboard' }));
	await user.click(await screen.findByRole('option', { name: 'Second.md' }));
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
	await user.click(screen.getByRole('combobox', { name: 'To-do card' }));
	await user.click(await screen.findByRole('option', { name: 'Second board/card' }));
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() =>
		expect(f.service.save).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				action: { kind: 'create-task', path: 'Second.md', cardId: 'card-two', text: 'Test task' },
			}),
		),
	);
	f.view.dispose();
});
test('a target deleted while the editor is open is rejected and cannot save stale identity', async () => {
	const f = setup(),
		user = userEvent.setup();
	await waitFor(() => expect(f.host.taskTargets).toHaveBeenCalled());
	f.host.taskTargets = async () => [];
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect((await screen.findByRole('alert')).textContent).toContain(t('automation.targetRequired'));
	expect(f.service.save).not.toHaveBeenCalled();
	f.view.dispose();
});

test('a calendar can be selected on a board with no task cards and task time remains separate from reminder time', async () => {
	const f = fixture(), user = userEvent.setup();
	f.host.taskTargets = async () => [];
	f.host.calendarTargets = async () => [{ path: 'CalendarOnly.md', title: 'Calendar only', storage: { kind: 'daily' } }];
	const existing = { ...definition('Calendar creator'),
		action: { kind: 'create-task' as const, target: 'calendar' as const, path: '', text: 'Weekly review' } };
	render(<TestProviders><EditorView host={f.host} request={{ existing }} onSaved={vi.fn()} onClose={vi.fn()} /></TestProviders>);
	await waitFor(() => expect((screen.getByRole('combobox', { name: 'Dashboard' }) as HTMLButtonElement).disabled).toBe(false));
	expect(screen.queryByRole('combobox', { name: 'To-do card' })).toBeNull();
	await user.click(screen.getByRole('combobox', { name: 'Dashboard' }));
	await user.click(await screen.findByRole('option', { name: 'Calendar only · CalendarOnly.md' }));
	fireEvent.change(screen.getByLabelText(t('automation.calendarTaskTime')), { target: { value: '14:30' } });
	fireEvent.change(screen.getByLabelText(t('automation.calendarReminderTime')), { target: { value: '13:45' } });
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(f.service.save).toHaveBeenCalledWith(expect.objectContaining({
		action: { kind: 'create-task', target: 'calendar', path: 'CalendarOnly.md', text: 'Weekly review', time: '14:30', reminderTime: '13:45' },
	})));
	f.view.dispose();
});

test('calendar target load failures can be retried without discarding the selected target', async () => {
	const f = fixture(), user = userEvent.setup();
	f.host.calendarTargets = vi.fn().mockRejectedValueOnce(new Error('Read failed')).mockResolvedValue([
		{ path: 'CalendarOnly.md', title: 'Calendar only', storage: { kind: 'file', path: 'Tasks.md' } },
	]);
	const existing = { ...definition('Calendar creator'),
		action: { kind: 'create-task' as const, target: 'calendar' as const, path: 'CalendarOnly.md', text: 'Weekly review' } };
	render(<TestProviders><EditorView host={f.host} request={{ existing }} onSaved={vi.fn()} onClose={vi.fn()} /></TestProviders>);
	expect((await screen.findByRole('alert')).textContent).toContain('Read failed');
	await user.click(screen.getByRole('button', { name: t('automation.retry') }));
	await waitFor(() => expect(screen.queryByText('Error: Read failed')).toBeNull());
	expect(screen.getByRole('combobox', { name: 'Dashboard' }).textContent).toContain('Calendar only');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(f.service.save).toHaveBeenCalledWith(expect.objectContaining({ action: existing.action })));
	f.view.dispose();
});

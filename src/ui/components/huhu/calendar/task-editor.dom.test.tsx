import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../react/test-providers';
import { t } from '../../../../shared/i18n';
import { TaskComposer } from './TaskComposer';
import { TaskEditorForm } from './TaskEditorForm';

afterEach(cleanup);
test('Enter explicitly submits the composer in hosts that consume native form submission', async () => {
	const add = vi.fn(async () => true);
	render(
		<TestProviders>
			<TaskComposer add={add} />
		</TestProviders>,
	);
	const field = screen.getByRole('textbox');
	fireEvent.change(field, { target: { value: 'One task' } });
	fireEvent.keyDown(field, { key: 'Enter' });
	await waitFor(() => expect(add).toHaveBeenCalledExactlyOnceWith('One task'));
	expect((field as HTMLInputElement).value).toBe('');
});
test('clearing a date also clears its dependent time and reminder before saving', async () => {
	const save = vi.fn(async () => true),
		close = vi.fn();
	const view = render(
		<TestProviders>
			<TaskEditorForm
				initial={{ text: 'Read', date: '2026-10-23', time: '10:00', reminder: '2026-10-23 09:00' }}
				save={save}
				close={close}
			/>
		</TestProviders>,
	);
	fireEvent.change(view.container.querySelector('input[type=date]')!, { target: { value: '' } });
	fireEvent.submit(view.container.querySelector('form')!);
	await waitFor(() =>
		expect(save).toHaveBeenCalledWith(
			{ text: 'Read', date: undefined, time: undefined, reminder: undefined, recurrence: undefined },
			false,
		),
	);
	expect(close).toHaveBeenCalledOnce();
});
test('late reminders are bounded by the task time and rejected by the form validator', async () => {
	const save = vi.fn(async () => true);
	const view = render(
		<TestProviders>
			<TaskEditorForm
				initial={{ text: 'Read', date: '2026-10-23', time: '10:00', reminder: '2026-10-23 11:00' }}
				save={save}
				close={vi.fn()}
			/>
		</TestProviders>,
	);
	expect(view.container.querySelector('input[type=datetime-local]')?.getAttribute('max')).toBe('2026-10-23T10:00');
	fireEvent.submit(view.container.querySelector('form')!);
	await screen.findByRole('alert');
	expect(screen.getByRole('alert').textContent).toBe(t('tasks.error.reminder'));
	expect(save).not.toHaveBeenCalled();
});
test('composer keeps unsaved input after failure and IME confirmation does not submit', async () => {
	const add = vi.fn(async () => {
		throw new Error('Write failed');
	});
	render(
		<TestProviders>
			<TaskComposer add={add} options={vi.fn()} />
		</TestProviders>,
	);
	const field = screen.getByRole('textbox');
	fireEvent.change(field, { target: { value: '我的待办' } });
	fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
	expect(add).not.toHaveBeenCalled();
	await userEvent.click(screen.getByRole('button', { name: t('calendarUnified.add') }));
	await screen.findByRole('alert');
	expect((field as HTMLInputElement).value).toBe('我的待办');
	expect(add).toHaveBeenCalledExactlyOnceWith('我的待办');
});

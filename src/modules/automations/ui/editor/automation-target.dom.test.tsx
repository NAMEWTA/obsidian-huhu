import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { EditorView } from './EditorView';
import { definition, fixture } from '../test-fixture';
beforeEach(() => setLanguage('en'));
afterEach(cleanup);
test('task creation no longer requires a dashboard or card and uses explicit deadline fields', async () => {
	const f = fixture(),
		user = userEvent.setup();
	const existing = {
		...definition('Task creator'),
		action: { kind: 'create-task' as const, timezone: 'UTC', text: 'Review' },
	};
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing }} onSaved={vi.fn()} onClose={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.queryByRole('combobox', { name: 'Dashboard' })).toBeNull();
	fireEvent.change(screen.getByLabelText(t('automation.taskDueDate')), { target: { value: '2026-09-30' } });
	fireEvent.change(screen.getByLabelText(t('automation.calendarTaskTime')), { target: { value: '14:30' } });
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() =>
		expect(f.service.save).toHaveBeenCalledWith(
			expect.objectContaining({
				action: { kind: 'create-task', timezone: 'UTC', text: 'Review', date: '2026-09-30', time: '14:30' },
			}),
		),
	);
	f.view.dispose();
});
test('invalid task time zone blocks saving', async () => {
	const f = fixture(),
		user = userEvent.setup();
	const existing = {
		...definition('Task creator'),
		action: { kind: 'create-task' as const, timezone: 'UTC', text: 'Review' },
	};
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing }} onSaved={vi.fn()} onClose={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText(t('automation.timezone')), { target: { value: 'Not/AZone' } });
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(f.service.save).not.toHaveBeenCalled();
	f.view.dispose();
});

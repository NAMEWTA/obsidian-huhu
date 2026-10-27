import type { ReactNode } from 'react';
import { ContainerProviders } from '../../../ui/react/providers';
import { act, cleanup, fireEvent, render as renderRoot, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../shared/i18n';
import { createTaskRepository } from '../platform/repository';
import { createTaskService } from '../services/service';
import { wallTime } from '../core/time';
import type { TaskResources, TaskViews, TaskDraft } from '../api';
import { TaskPage } from './TaskPage';
import { TaskEditor } from './TaskEditor';

const render = (ui: ReactNode) => renderRoot(<ContainerProviders container={document.body}>{ui}</ContainerProviders>);
beforeEach(() => setLanguage('en'));
afterEach(cleanup);
async function fixture() {
	let raw: string | null = null;
	const tasks = createTaskService({
		deviceId: 'ui-device',
		now: () => wallTime('2026-09-20', '10:00', 'Asia/Singapore'),
		remindersAvailable: () => true,
		repository: createTaskRepository({
			read: async () => raw,
			process: async (change) => {
				raw = change(raw);
				return raw;
			},
		}),
	});
	await tasks.load();
	const resources: TaskResources = {
		search: vi.fn(async () => [
			{
				resource: { kind: 'file' as const, path: 'Project/Plan.md' },
				status: 'available' as const,
				label: 'Plan',
				path: 'Project/Plan.md',
			},
		]),
		resolve: async (resource) => ({
			resource,
			label: resource.kind === 'archive' ? 'Customer' : resource.path,
			status: 'available',
		}),
		open: vi.fn(async () => {}),
	};
	const views: TaskViews = { edit: vi.fn(async () => {}), open: vi.fn(async () => {}), mount: () => () => {} };
	const base: TaskDraft = { title: 'Example', description: '', timezone: 'Asia/Singapore', relations: [] };
	return { tasks, resources, views, base };
}
test('independent workspace has genuine All / Incomplete / Completed / Overdue views', async () => {
	const f = await fixture();
	for (const [id, title, date] of [
		['late', 'Overdue report', '2026-09-19'],
		['future', 'Future report', '2026-09-30'],
		['done', 'Finished report', '2026-09-18'],
	])
		await f.tasks.execute({
			kind: 'create',
			commandId: id!,
			draft: { ...f.base, title: title!, due: { date: date! } },
		});
	await f.tasks.execute({ kind: 'complete', commandId: 'complete', id: 'task:done', expectedRevision: 1 });
	render(<TaskPage {...f} />);
	const user = userEvent.setup();
	expect(screen.queryByRole('button', { name: 'Finished report' })).toBeNull();
	expect(screen.getByRole('button', { name: 'Overdue report' })).toBeTruthy();
	await user.click(screen.getByRole('button', { name: /^All 3$/ }));
	expect(screen.getByRole('button', { name: 'Finished report' })).toBeTruthy();
	await user.click(screen.getByRole('button', { name: /^Overdue 1$/ }));
	expect(screen.queryByRole('button', { name: 'Future report' })).toBeNull();
	expect(screen.getByText(/Incomplete · overdue/).textContent).toContain('2026-09-20');
	await user.click(screen.getByRole('button', { name: 'New task' }));
	expect(f.views.edit).toHaveBeenCalled();
	await f.tasks.dispose();
});
test('editor persists three independent times and related resources in the domain, not a note', async () => {
	const f = await fixture(),
		close = vi.fn();
	render(
		<TaskEditor
			{...f}
			close={close}
			initial={{ timezone: 'Asia/Singapore' }}
			signal={new AbortController().signal}
		/>,
	);
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Send report' } });
	fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-09-30' } });
	fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '2026-09-25T09:00' } });
	await userEvent.setup().click(screen.getByRole('button', { name: 'Add relation' }));
	await userEvent.setup().click(await screen.findByRole('button', { name: /Plan.*Project\/Plan.md/ }));
	await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(close).toHaveBeenCalledOnce());
	const task = f.tasks.query({ filter: 'all' }).items[0]!;
	expect(task).toMatchObject({
		title: 'Send report',
		createdAt: wallTime('2026-09-20', '10:00', 'Asia/Singapore'),
		due: { date: '2026-09-30' },
		reminderAt: wallTime('2026-09-25', '09:00', 'Asia/Singapore'),
		relations: [{ kind: 'file', path: 'Project/Plan.md' }],
	});
	await f.tasks.dispose();
});
test('an editor retains its draft and rejects stale revision instead of overwriting another client', async () => {
	const f = await fixture(),
		close = vi.fn();
	await f.tasks.execute({ kind: 'create', commandId: 'shared', draft: f.base });
	render(<TaskEditor {...f} close={close} id="task:shared" signal={new AbortController().signal} />);
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Local draft' } });
	await act(async () => {
		await f.tasks.execute({
			kind: 'update',
			commandId: 'other-client',
			id: 'task:shared',
			expectedRevision: 1,
			fields: { ...f.base, title: 'Remote edit' },
		});
	});
	await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t('task.error.conflict')));
	expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Local draft');
	expect(f.tasks.get('task:shared')?.title).toBe('Remote edit');
	expect(close).not.toHaveBeenCalled();
	await f.tasks.dispose();
});
test('cancellation requires explicit confirmation and closing/aborting never commits a draft', async () => {
	const f = await fixture(),
		controller = new AbortController(),
		close = vi.fn();
	await f.tasks.execute({ kind: 'create', commandId: 'cancel', draft: f.base });
	render(<TaskEditor {...f} close={close} id="task:cancel" signal={controller.signal} />);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Cancel task' }));
	expect(f.tasks.get('task:cancel')?.status).toBe('open');
	await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
	await waitFor(() => expect(f.tasks.get('task:cancel')?.status).toBe('cancelled'));
	cleanup();
	render(<TaskEditor {...f} close={close} signal={controller.signal} />);
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Do not save' } });
	controller.abort();
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(f.tasks.query({ filter: 'all', includeCancelled: true }).total).toBe(1);
	await f.tasks.dispose();
});

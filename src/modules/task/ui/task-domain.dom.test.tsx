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
	let writes = 0,
		fail = false;
	const tasks = createTaskService({
		deviceId: 'ui-device',
		now: () => wallTime('2026-09-20', '10:00', 'Asia/Singapore'),
		remindersAvailable: () => true,
		repository: createTaskRepository({
			read: async () => raw,
			process: async (change) => {
				if (fail) throw Error('controlled repository write failure');
				raw = change(raw);
				writes++;
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
	return {
		tasks,
		resources,
		views,
		base,
		writes: () => writes,
		fail: (value: boolean) => {
			fail = value;
		},
	};
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
	await user.click(screen.getByRole('radio', { name: /^All 3$/ }));
	expect(screen.getByRole('button', { name: 'Finished report' })).toBeTruthy();
	await user.click(screen.getByRole('radio', { name: /^Overdue 1$/ }));
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
	fireEvent.blur(screen.getByLabelText('Due date'));
	fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '2026-09-25' } });
	fireEvent.blur(screen.getByLabelText('Reminder time'));
	fireEvent.change(screen.getByLabelText(t('ui.date.time')), { target: { value: '09:00' } });
	fireEvent.blur(screen.getByLabelText(t('ui.date.time')));
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
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(t('task.error.conflict')));
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

for (const [zone, date, time, reason, epoch] of [
	['America/New_York', '2026-03-08', '02:30', 'nonexistent-time', null],
	['America/New_York', '2026-11-01', '01:30', 'ambiguous-time', null],
	['UTC', '2026-03-08', '02:30', null, '2026-03-08T02:30:00Z'],
	['Asia/Shanghai', '2026-11-01', '01:30', null, '2026-10-31T17:30:00Z'],
] as const)
	test(`real form and task transaction preserve strict ${zone} ${date} ${time}`, async () => {
		const f = await fixture(),
			close = vi.fn();
		render(<TaskEditor {...f} initial={{ timezone: zone }} close={close} signal={new AbortController().signal} />);
		fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'DST joint' } });
		fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: date } });
		fireEvent.blur(screen.getByLabelText('Reminder time'));
		fireEvent.change(screen.getByLabelText(t('ui.date.time')), { target: { value: time } });
		fireEvent.blur(screen.getByLabelText(t('ui.date.time')));
		await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
		if (reason) {
			expect(await screen.findAllByText(t(`task.${reason}`))).not.toHaveLength(0);
			expect(f.writes()).toBe(0);
			expect(f.tasks.query().total).toBe(0);
			expect((screen.getByLabelText(t('ui.date.time')) as HTMLInputElement).value).toBe(time);
		} else {
			await waitFor(() => expect(close).toHaveBeenCalledOnce());
			expect(f.tasks.query().items[0]?.reminderAt).toBe(Date.parse(epoch!));
			expect(f.writes()).toBe(1);
		}
		await f.tasks.dispose();
	});

test('autosave serializes receipts and never replaces a newer edited title', async () => {
	const f = await fixture();
	await f.tasks.execute({ kind: 'create', commandId: 'serial', draft: f.base });
	const original = f.tasks.execute.bind(f.tasks);
	let release!: () => void;
	const gate = new Promise<void>((r) => (release = r));
	let started = 0;
	f.tasks.execute = async (...args) => {
		started++;
		const result = await original(...args);
		if (started === 1) await gate;
		return result;
	};
	render(<TaskEditor {...f} id="task:serial" autoSave close={() => {}} signal={new AbortController().signal} />);
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'First edit' } });
	await waitFor(() => expect(started).toBe(1));
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Second edit' } });
	await act(async () => release());
	expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Second edit');
	await waitFor(() => expect(f.tasks.get('task:serial')?.title).toBe('Second edit'));
	expect(f.tasks.get('task:serial')?.revision).toBe(3);
	await f.tasks.dispose();
});
test('an incomplete reminder blocks unrelated field autosave until raw draft is repaired', async () => {
	const f = await fixture();
	await f.tasks.execute({ kind: 'create', commandId: 'raw', draft: f.base });
	const before = f.writes();
	render(<TaskEditor {...f} id="task:raw" autoSave close={() => {}} signal={new AbortController().signal} />);
	fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '2026-09-25' } });
	fireEvent.blur(screen.getByLabelText('Reminder time'));
	fireEvent.change(screen.getByLabelText(t('ui.date.time')), { target: { value: '09:' } });
	fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Keep draft' } });
	await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
	expect(f.writes()).toBe(before);
	expect(f.tasks.get('task:raw')?.title).toBe('Example');
	fireEvent.change(screen.getByLabelText(t('ui.date.time')), { target: { value: '09:00' } });
	fireEvent.blur(screen.getByLabelText(t('ui.date.time')));
	await waitFor(() => expect(f.tasks.get('task:raw')?.title).toBe('Keep draft'));
	expect(f.tasks.get('task:raw')?.reminderAt).toBe(wallTime('2026-09-25', '09:00', 'Asia/Singapore'));
	await f.tasks.dispose();
});

test('clearing due clears only dependent due time and preserves the independent reminder', async () => {
	const f = await fixture(),
		close = vi.fn(),
		reminderAt = wallTime('2026-09-25', '09:00', 'Asia/Singapore');
	render(
		<TaskEditor
			{...f}
			initial={{ ...f.base, due: { date: '2026-09-30', time: '10:00' }, reminderAt }}
			close={close}
			signal={new AbortController().signal}
		/>,
	);
	fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
	fireEvent.blur(screen.getByLabelText('Due date'));
	await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(close).toHaveBeenCalledOnce());
	const saved = f.tasks.query().items[0]!;
	expect(saved.due).toBeUndefined();
	expect(saved.reminderAt).toBe(reminderAt);
	await f.tasks.dispose();
});
test('a real reminder after deadline is rejected without persistence and retains the draft', async () => {
	const f = await fixture(),
		close = vi.fn();
	render(
		<TaskEditor
			{...f}
			initial={{
				...f.base,
				due: { date: '2026-09-25', time: '10:00' },
				reminderAt: wallTime('2026-09-25', '11:00', 'Asia/Singapore'),
			}}
			close={close}
			signal={new AbortController().signal}
		/>,
	);
	await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByRole('alert');
	expect(f.writes()).toBe(0);
	expect(close).not.toHaveBeenCalled();
	expect((screen.getByLabelText(t('ui.date.time')) as HTMLInputElement).value).toBe('11:00');
	await f.tasks.dispose();
});

test('completion remains briefly in incomplete view then conditional undo reopens through the service', async () => {
	const f = await fixture();
	await f.tasks.execute({
		kind: 'create',
		commandId: 'hold',
		draft: { ...f.base, title: 'Retained title', description: 'Retained description' },
	});
	const v = render(<TaskPage {...f} />),
		start = performance.now();
	await userEvent.click(screen.getByRole('checkbox', { name: 'Complete: Retained title' }));
	expect(
		v.container
			.querySelector('[data-task-id="task:hold"] [data-slot="task-content"]')
			?.getAttribute('data-completed'),
	).toBe('true');
	expect(screen.getByText('Retained description')).toBeTruthy();
	await waitFor(() => expect(v.container.querySelector('[data-task-id="task:hold"]')).toBeNull(), { timeout: 2400 });
	expect(performance.now() - start).toBeGreaterThanOrEqual(1300);
	await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
	await waitFor(() => expect(f.tasks.get('task:hold')?.status).toBe('open'));
	expect(screen.getByText('Retained title')).toBeTruthy();
	await f.tasks.dispose();
});
test('a failed completion restores true state and permits retry after service refresh', async () => {
	const f = await fixture();
	await f.tasks.execute({ kind: 'create', commandId: 'retry', draft: f.base });
	render(<TaskPage {...f} />);
	f.fail(true);
	await userEvent.click(screen.getByRole('checkbox', { name: 'Complete: Example' }));
	await waitFor(() => expect(f.tasks.snapshot().status).toBe('error'));
	expect(f.tasks.get('task:retry')?.status).toBe('open');
	expect(screen.getByRole('checkbox', { name: 'Complete: Example' }).getAttribute('aria-checked')).toBe('false');
	f.fail(false);
	await userEvent.click(screen.getAllByRole('button', { name: 'Retry loading' })[0]!);
	await waitFor(() => expect(f.tasks.snapshot().status).toBe('ready'));
	await userEvent.click(screen.getByRole('checkbox', { name: 'Complete: Example' }));
	await waitFor(() => expect(f.tasks.get('task:retry')?.status).toBe('completed'));
	await f.tasks.dispose();
});
test('undo cannot overwrite a newer domain revision', async () => {
	const f = await fixture();
	await f.tasks.execute({ kind: 'create', commandId: 'undo', draft: f.base });
	render(<TaskPage {...f} />);
	await userEvent.click(screen.getByRole('checkbox', { name: 'Complete: Example' }));
	await act(async () => {
		await f.tasks.execute({
			kind: 'update',
			commandId: 'newer',
			id: 'task:undo',
			expectedRevision: 2,
			fields: { ...f.base, title: 'New revision' },
		});
	});
	const writes = f.writes();
	await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
	expect(await screen.findByText(t('task.undoUnavailable'))).toBeTruthy();
	expect(f.writes()).toBe(writes);
	expect(f.tasks.get('task:undo')?.status).toBe('completed');
	await f.tasks.dispose();
});

test('relation chips preserve provider labels and missing status without changing the resource identity', async () => {
	const f = await fixture();
	const relation = { kind: 'archive' as const, id: 'archive-internal-id' };
	await f.tasks.execute({ kind: 'create', commandId: 'relation', draft: { ...f.base, relations: [relation] } });
	f.resources.resolve = async (resource) => ({ resource, label: 'Customer reference', status: 'missing' });
	render(<TaskPage {...f} />);
	const chip = await screen.findByRole('button', { name: /Customer reference/ });
	expect(chip.textContent).toContain(t('task.missing'));
	await userEvent.click(chip);
	expect(f.resources.open).toHaveBeenCalledWith(relation, window);
	await f.tasks.dispose();
});
test('completion retention does not leak into a different search query', async () => {
	const f = await fixture();
	await f.tasks.execute({ kind: 'create', commandId: 'filter-hold', draft: f.base });
	const v = render(<TaskPage {...f} />);
	await userEvent.click(screen.getByRole('checkbox', { name: 'Complete: Example' }));
	expect(v.container.querySelector('[data-task-id="task:filter-hold"]')).toBeTruthy();
	await userEvent.type(screen.getByRole('textbox', { name: t('task.search') }), 'unrelated search');
	expect(v.container.querySelector('[data-task-id="task:filter-hold"]')).toBeNull();
	await f.tasks.dispose();
});

test('calendar day entry exposes complete task rows and completion outside narrow date cells', async () => {
	const f = await fixture();
	await f.tasks.execute({
		kind: 'create',
		commandId: 'calendar-day',
		draft: {
			...f.base,
			title: 'Readable calendar task',
			description: 'Full description remains available',
			due: { date: '2026-09-30' },
		},
	});
	const v = render(<TaskPage {...f} />);
	await userEvent.click(screen.getByRole('radio', { name: 'Calendar' }));
	const entry = v.container.querySelector('[data-task-calendar-count="2026-09-30"]');
	expect(entry).toBeTruthy();
	await userEvent.click(entry!);
	const agenda = v.container.querySelector('[data-task-calendar-agenda="2026-09-30"]');
	expect(agenda?.textContent).toContain('Full description remains available');
	await userEvent.click(agenda!.querySelector('[role="checkbox"]')!);
	expect(f.tasks.get('task:calendar-day')?.status).toBe('completed');
	await f.tasks.dispose();
});

test.each([true, false])('closing an editor remains closed after a deep-link request, deep=%s', async (deep) => {
	const f = await fixture();
	try {
		await f.tasks.execute({ kind: 'create', commandId: 'alpha', draft: { ...f.base, title: 'Alpha' } });
		render(<TaskPage {...f} selectedId={deep ? 'task:alpha' : undefined} />);
		if (!deep) fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
		await screen.findByLabelText('Task title');
		fireEvent.click(screen.getByRole('button', { name: t('ui.close') }));
		await waitFor(() => expect(document.querySelector('[data-task-editor]')).toBeNull());
	} finally {
		cleanup();
		await f.tasks.dispose();
	}
});
test.each([true, false])(
	'a pending completion remains scoped to its original query, changeQuery=%s',
	async (changeQuery) => {
		const f = await fixture();
		let release = () => {};
		let completion: Promise<unknown> | undefined;
		try {
			for (const id of ['Alpha', 'Beta'])
				await f.tasks.execute({ kind: 'create', commandId: id.toLowerCase(), draft: { ...f.base, title: id } });
			const execute = f.tasks.execute.bind(f.tasks),
				gate = new Promise<void>((r) => {
					release = r;
				});
			vi.spyOn(f.tasks, 'execute').mockImplementation((...args) => {
				const result = gate.then(() => execute(...args));
				completion = result;
				return result;
			});
			render(<TaskPage {...f} />);
			fireEvent.click(screen.getByRole('checkbox', { name: 'Complete: Alpha' }));
			if (changeQuery)
				fireEvent.change(screen.getByRole('textbox', { name: t('task.search') }), {
					target: { value: 'Beta' },
				});
			await act(async () => {
				release();
				await completion;
			});
			const ids = [...document.querySelectorAll('[data-task-id]')].map((n) => n.getAttribute('data-task-id'));
			expect(ids.includes('task:alpha')).toBe(!changeQuery);
		} finally {
			release();
			cleanup();
			await f.tasks.dispose();
		}
	},
);

test('a consumed deep link allows local selection and later external route requests', async () => {
	const f = await fixture();
	try {
		for (const title of ['Alpha', 'Beta'])
			await f.tasks.execute({ kind: 'create', commandId: title.toLowerCase(), draft: { ...f.base, title } });
		const page = (selectedId?: string) => (
			<ContainerProviders container={document.body}>
				<TaskPage {...f} selectedId={selectedId} />
			</ContainerProviders>
		);
		const v = renderRoot(page('task:alpha'));
		expect(((await screen.findByLabelText('Task title')) as HTMLInputElement).value).toBe('Alpha');
		fireEvent.click(screen.getByRole('button', { name: t('ui.close') }));
		await waitFor(() => expect(document.querySelector('[data-task-editor]')).toBeNull());
		fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
		expect(((await screen.findByLabelText('Task title')) as HTMLInputElement).value).toBe('Beta');
		v.rerender(page('task:beta'));
		v.rerender(page('task:alpha'));
		await waitFor(() => expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Alpha'));
		v.rerender(page(undefined));
		fireEvent.click(screen.getByRole('button', { name: t('ui.close') }));
		v.rerender(page('task:alpha'));
		expect(((await screen.findByLabelText('Task title')) as HTMLInputElement).value).toBe('Alpha');
	} finally {
		cleanup();
		await f.tasks.dispose();
	}
});

test.each(['alpha', 'charlie'] as const)(
	'dirty switch confirmation follows the latest external route to %s',
	async (target) => {
		const f = await fixture();
		try {
			for (const title of ['Alpha', 'Beta', 'Charlie'])
				await f.tasks.execute({ kind: 'create', commandId: title.toLowerCase(), draft: { ...f.base, title } });
			const page = (selectedId: string) => (
				<ContainerProviders container={document.body}>
					<TaskPage {...f} selectedId={selectedId} />
				</ContainerProviders>
			);
			const v = renderRoot(page('task:alpha'));
			fireEvent.change(await screen.findByLabelText('Task title'), { target: { value: 'Local draft' } });
			v.rerender(page('task:beta'));
			expect(await screen.findByRole('alertdialog')).toBeTruthy();
			v.rerender(page(`task:${target}`));
			expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Local draft');
			if (target === 'alpha') {
				expect(screen.queryByRole('alertdialog')).toBeNull();
			} else {
				expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
				fireEvent.click(screen.getByRole('button', { name: t('ui.discardChanges') }));
				await waitFor(() =>
					expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Charlie'),
				);
				expect(screen.queryByRole('alertdialog')).toBeNull();
			}
			expect(f.tasks.get('task:alpha')?.title).toBe('Alpha');
		} finally {
			cleanup();
			await f.tasks.dispose();
		}
	},
);

test.each(['filter', 'view', 'selection', 'search-away-and-back'] as const)(
	'late completion stays with its original owner after %s changes',
	async (change) => {
		const f = await fixture();
		let release = () => {};
		let completion: Promise<unknown> | undefined;
		try {
			for (const title of ['Alpha', 'Beta'])
				await f.tasks.execute({ kind: 'create', commandId: title.toLowerCase(), draft: { ...f.base, title } });
			const execute = f.tasks.execute.bind(f.tasks),
				gate = new Promise<void>((resolve) => {
					release = resolve;
				});
			vi.spyOn(f.tasks, 'execute').mockImplementation((...args) => {
				completion = gate.then(() => execute(...args));
				return completion as ReturnType<typeof execute>;
			});
			render(<TaskPage {...f} />);
			fireEvent.click(screen.getByRole('checkbox', { name: 'Complete: Alpha' }));
			if (change === 'filter') fireEvent.click(screen.getByRole('radio', { name: 'Overdue 0' }));
			if (change === 'view') fireEvent.click(screen.getByRole('radio', { name: t('task.view.board') }));
			if (change === 'selection') fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
			if (change === 'search-away-and-back') {
				fireEvent.change(screen.getByRole('textbox', { name: t('task.search') }), {
					target: { value: 'Beta' },
				});
				fireEvent.change(screen.getByRole('textbox', { name: t('task.search') }), { target: { value: '' } });
			}
			await act(async () => {
				release();
				await completion;
			});
			expect(document.querySelector('[data-task-id="task:alpha"]')).toBeNull();
			expect(f.tasks.get('task:alpha')?.status).toBe('completed');
			expect(screen.queryByRole('button', { name: t('task.undo') })).toBeNull();
			if (change === 'selection')
				expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Beta');
		} finally {
			release();
			cleanup();
			await f.tasks.dispose();
		}
	},
);

test('a routed task arriving after the page mounts initializes the actual editor record', async () => {
	const f = await fixture();
	try {
		render(<TaskPage {...f} selectedId="task:late" />);
		await act(async () => {
			await f.tasks.execute({
				kind: 'create',
				commandId: 'late',
				draft: { ...f.base, title: 'Late route record' },
			});
		});
		expect(((await screen.findByLabelText('Task title')) as HTMLInputElement).value).toBe('Late route record');
	} finally {
		cleanup();
		await f.tasks.dispose();
	}
});

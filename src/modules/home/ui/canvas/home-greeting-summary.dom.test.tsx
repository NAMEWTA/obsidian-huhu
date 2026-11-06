import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { VisibilityContext } from '../../../../ui/react/contexts';
import { setLanguage, t } from '../../../../shared/i18n';
import { createTaskService } from '../../../task/services/service';
import { createTaskRepository } from '../../../task/platform/repository';
import { createTaskCalendar } from '../../../task/services/calendar';
import type { TaskViews } from '../../../task/api';
import type { AgentSessionSummary, AgentSessionsPort } from '../../../agent/api';
import type { AutomationUiPort } from '../../../../shared/automation/types';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { HomeGreetingSummary } from './HomeGreetingSummary';
afterEach(() => {
	cleanup();
	delete homeServices.calendar;
	delete homeServices.sessions;
	delete homeServices.watchAgents;
	vi.restoreAllMocks();
});
const emptyStore = { host: {} } as unknown as BoardStore;
test('missing providers are unavailable, never invented zero counts or a future time', () => {
	setLanguage('en');
	render(
		<TestProviders>
			<HomeGreetingSummary store={emptyStore} />
		</TestProviders>,
	);
	for (const key of ['tasksUnavailable', 'sessionsUnavailable', 'automationsUnavailable'])
		expect(screen.getByText(t(`home.greeting.${key}`))).toBeTruthy();
	expect(document.querySelector('[data-home-overdue]')!.textContent).not.toContain('0');
});
test('real task projection drives overdue count; session and automation producer updates retain explicit empty states', async () => {
	setLanguage('en');
	let raw: string | null = null,
		readFailed = false;
	const tasks = createTaskService({
		deviceId: 'summary-test',
		now: () => Date.parse('2030-01-03T12:00:00Z'),
		repository: createTaskRepository({
			read: async () => {
				if (readFailed) throw Error('Summary read rejected');
				return raw;
			},
			process: async (change) => {
				raw = change(raw);
				return raw;
			},
		}),
	});
	await tasks.load();
	await tasks.execute({
		kind: 'create',
		commandId: 'overdue',
		draft: { title: 'Overdue', description: '', timezone: 'UTC', relations: [], due: { date: '2030-01-01' } },
	});
	const views = { open: async () => {}, mount: () => () => {}, edit: async () => {} } as TaskViews;
	const calendar = createTaskCalendar(tasks, views);
	homeServices.calendar = calendar;
	let rows: AgentSessionSummary[] = [
		{ id: 'a', title: 'A' },
		{ id: 'b', title: 'B' },
	];
	const sessions: AgentSessionsPort = { list: async () => rows, attachMaterial: async () => {} };
	homeServices.sessions = () => sessions;
	let refreshAgents = () => {};
	homeServices.watchAgents = (fn) => {
		refreshAgents = fn;
		return () => {};
	};
	let next: { name: string; at: number } | null | undefined = {
		name: 'Morning brief',
		at: Date.parse('2030-01-04T08:00:00Z'),
	};
	const listeners = new Set<() => void>();
	const automation: AutomationUiPort = {
		open: async () => {},
		nextScheduled: () => next,
		subscribe: (fn) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
	};
	const store = { host: { automationHost: automation } } as unknown as BoardStore;
	try {
		render(
			<TestProviders>
				<HomeGreetingSummary store={store} />
			</TestProviders>,
		);
		await waitFor(() => expect(screen.getByText(t('home.greeting.sessions', { count: 2 }))).toBeTruthy());
		expect(screen.getByText(t('home.greeting.overdue', { count: 1 }))).toBeTruthy();
		expect(document.querySelector('[data-home-next-automation]')!.textContent).toContain('Morning brief');
		await act(async () => {
			await tasks.execute({ kind: 'complete', commandId: 'done', id: 'task:overdue', expectedRevision: 1 });
		});
		expect(screen.getByText(t('home.greeting.overdue', { count: 0 }))).toBeTruthy();
		readFailed = true;
		await act(() => tasks.refresh());
		expect(screen.getByText(t('home.greeting.tasksUnavailable'))).toBeTruthy();
		readFailed = false;
		await act(() => tasks.refresh());
		expect(screen.getByText(t('home.greeting.overdue', { count: 0 }))).toBeTruthy();
		rows = [];
		next = null;
		act(() => {
			refreshAgents();
			for (const fn of listeners) fn();
		});
		await waitFor(() => expect(screen.getByText(t('home.greeting.sessions', { count: 0 }))).toBeTruthy());
		expect(screen.getByText(t('home.greeting.noAutomation'))).toBeTruthy();
		next = undefined;
		act(() => {
			for (const fn of listeners) fn();
		});
		expect(screen.getByText(t('home.greeting.automationsUnavailable'))).toBeTruthy();
	} finally {
		calendar.dispose();
		await tasks.dispose();
	}
});
test('hidden summary stops polling and ignores a late session read; visible retry reports failures without stale counts', async () => {
	setLanguage('en');
	let resolve: (rows: AgentSessionSummary[]) => void = () => {};
	const list = vi.fn(
		() =>
			new Promise<AgentSessionSummary[]>((fn) => {
				resolve = fn;
			}),
	);
	const port: AgentSessionsPort = { list, attachMaterial: async () => {} };
	homeServices.sessions = () => port;
	const interval = vi.spyOn(window, 'setInterval'),
		clear = vi.spyOn(window, 'clearInterval');
	const draw = (visible: boolean) => (
		<TestProviders>
			<VisibilityContext value={visible}>
				<HomeGreetingSummary store={emptyStore} />
			</VisibilityContext>
		</TestProviders>
	);
	const view = render(draw(true));
	expect(list).toHaveBeenCalledOnce();
	expect(interval).toHaveBeenCalled();
	view.rerender(draw(false));
	expect(clear).toHaveBeenCalled();
	await act(() => resolve([{ id: 'late', title: 'Late' }]));
	expect(document.querySelector('[data-home-sessions]')!.textContent).not.toContain('1 sessions');
	list.mockImplementationOnce(() => Promise.reject(new Error('Stopped')));
	view.rerender(draw(true));
	await waitFor(() => expect(screen.getByText(t('home.greeting.sessionsUnavailable'))).toBeTruthy());
});

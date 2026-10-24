import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { ClockWidget } from '../canvas/ClockWidget';
import { AnniversaryWidget } from './AnniversaryWidget';
import { CountdownWidget } from './CountdownWidget';
import { HabitWidget } from './HabitWidget';
import { PomodoroWidget } from './PomodoroWidget';
import { QuickActionsWidget } from './QuickActionsWidget';
import { YearProgressWidget } from './YearProgressWidget';

beforeEach(() => setLanguage('en'));
afterEach(() => {
	cleanup();
	delete (homeServices as { habit?: unknown }).habit;
	delete (homeServices as { pomodoro?: unknown }).pomodoro;
});

function fake(over: Record<string, unknown> = {}, settings: Record<string, unknown> = {}) {
	const state = createStore(() => ({
		settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), ...settings },
		data: {
			quickActions: [],
			quickActionOrder: [],
			hiddenPresets: [],
			widgets: [{ memberId: 'home:weather:default', provider: 'home', kind: 'weather', instanceId: 'default' }],
		},
		files: [],
		path: 'Board',
		widgetRevision: 0,
		weatherByInstance: {},
		...over,
	}));
	const store = {
		state,
		image: async () => '',
		settings: vi.fn(async () => {}),
		weather: vi.fn(async () => {}),
		cities: vi.fn(async () => []),
		host: {},
		widgets: homeServices,
	} as unknown as BoardStore;
	return { store, state };
}
const mount = (node: React.ReactNode) => render(<TestProviders>{node}</TestProviders>);

test('the clock is the whole tile: time and date, no title of its own', () => {
	mount(<ClockWidget store={fake().store} />);
	expect(document.querySelector('time')!.textContent).toMatch(/^\d{2}:\d{2}/);
	expect(document.querySelector('h1,h2,h3')).toBeNull();
});

test('year progress is a percentage, the Progress bar and the days that are left', () => {
	mount(<YearProgressWidget />);
	const bar = document.querySelector('[data-slot="progress"]')!;
	const value = Number(bar.getAttribute('aria-valuenow'));
	expect(value).toBeGreaterThan(0);
	expect(document.querySelector('[data-year-progress]')!.textContent).toContain(`${value.toFixed(1)}%`);
	expect(document.querySelector('h3')).toBeNull();
});

test('a countdown is its name, the count large and centered, and the unit; settings and add live in the title bar slot', () => {
	const { store } = fake(
		{},
		{
			countdowns: [
				{ id: 'c1', label: 'Launch', targetDate: '2099-01-01T00:00', displayMode: 'days', reminderDays: 0 },
			],
		},
	);
	mount(<CountdownWidget store={store} entryId="c1" />);
	const body = document.querySelector('[data-countdown]')!;
	expect(body.textContent).toContain('Launch');
	expect(body.textContent).toContain(t('home.dashboard.days'));
	expect(Number(body.querySelector('.tabular-nums')!.textContent)).toBeGreaterThan(1000);
	expect(screen.getByRole('button', { name: t('home.dashboard.settings') })).toBeTruthy();
	// a single instance has no add button; editing opens the editor
	expect(screen.queryByRole('button', { name: t('countdown.add') })).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.settings') }));
	expect(screen.getByRole('dialog')).toBeTruthy();
});

test('without a countdown the tile shows a small empty state', () => {
	mount(<CountdownWidget store={fake().store} />);
	expect(document.querySelector('[data-slot="empty-state"]')!.getAttribute('data-size')).toBe('sm');
	expect(screen.getByText(t('countdown.empty'))).toBeTruthy();
	expect(screen.getByRole('button', { name: t('countdown.add') })).toBeTruthy();
});

test('an anniversary is its name, the elapsed time large and its date, with edit in the title bar slot', () => {
	const { store } = fake(
		{},
		{
			anniversaries: [
				{
					id: 'a1',
					label: 'First commit',
					startDate: '2024-03-01',
					precision: 'ymd',
					calendar: 'solar',
					annualReminder: true,
				},
			],
		},
	);
	mount(<AnniversaryWidget store={store} entryId="a1" />);
	const body = document.querySelector('[data-anniversary]')!;
	expect(body.textContent).toContain('First commit');
	expect(body.textContent).toContain('2024-03-01');
	expect(screen.getByRole('button', { name: t('anniversary.editTitle') })).toBeTruthy();
});

test('habits: today count, one 36px row per habit with its streak, the heat map block, and add/stats in the title bar slot', () => {
	let done = new Set(['h1']);
	const habit = {
		getHabits: () => [
			{ id: 'h1', name: 'Read' },
			{ id: 'h2', name: 'Stretch' },
		],
		getDoneOn: () => [...done],
		isDone: (id: string) => done.has(id),
		toggle: vi.fn((id: string) => {
			done = new Set(done.has(id) ? [] : [id]);
		}),
		getStreak: () => 3,
		getHeatmapDays: (_target: string, days: number) => Array.from({ length: days }, () => 0),
		addHabit: vi.fn(),
	};
	(homeServices as { habit?: unknown }).habit = habit;
	mount(<HabitWidget store={fake().store} />);
	expect(document.querySelector('[data-habit]')!.textContent).toContain('1/2');
	const rows = document.querySelectorAll('[data-habit] li label');
	expect(rows).toHaveLength(2);
	for (const row of rows) expect(row.className).toContain('h-9');
	expect(document.querySelector('[data-habit-heatmap]')).not.toBeNull();
	expect(screen.getByRole('button', { name: t('habit.statsTitle') })).toBeTruthy();
	expect(screen.getByRole('button', { name: t('common.add') })).toBeTruthy();
	fireEvent.click(screen.getByText('Stretch'));
	expect(habit.toggle).toHaveBeenCalledWith('h2');
});

test('habits with none yet show a small empty state', () => {
	(homeServices as { habit?: unknown }).habit = {
		getHabits: () => [],
		getDoneOn: () => [],
		isDone: () => false,
		getStreak: () => 0,
		getHeatmapDays: () => [],
	};
	mount(<HabitWidget store={fake().store} />);
	expect(document.querySelector('[data-slot="empty-state"]')!.getAttribute('data-size')).toBe('sm');
});

test("weather: the city, the large temperature, the state and today's range; the forecast fills equal columns when there is room", () => {
	const weather = {
		temperature: 21.4,
		feelsLike: 20,
		humidity: 56,
		windSpeed: 12,
		weatherCode: 2,
		dailyDates: ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'],
		dailyCodes: [2, 61, 3, 0, 95],
		dailyMax: [24, 19, 22, 26, 21],
		dailyMin: [15, 13, 14, 16, 14],
	};
	const { store, state } = fake(
		{ weatherByInstance: { default: { locationKey: '31.23,121.47', status: 'ready', data: weather, error: '' } } },
		{ widgetWeatherCity: 'Shanghai' },
	);
	mount(<ClockWidget store={store} />);
	const body = document.querySelector('[data-clock-weather]')!;
	expect(body.textContent).toContain('Shanghai');
	expect(body.textContent).toContain('21°');
	expect(body.textContent).toContain('15° / 24°');
	const forecast = body.querySelector('.grid-cols-7')!;
	expect(forecast.children).toHaveLength(5);
	expect(forecast.className).toContain('grid-cols-7');
	expect(screen.getByRole('button', { name: t('weather.configure') })).toBeTruthy();
	act(() =>
		state.setState({
			weatherByInstance: {
				default: { locationKey: '31.23,121.47', status: 'error', data: null, error: 'offline' },
			},
		}),
	);
	expect(body.textContent).toContain('offline');
});

test('quick actions are equal-width grid buttons with an icon and a truncating label, and add is in the title bar slot', () => {
	mount(<QuickActionsWidget store={fake().store} />);
	const grid = document.querySelector('[data-quick-actions]')!;
	expect(grid.className).toContain('grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]');
	const buttons = grid.querySelectorAll('[data-quick-action] > button:first-child');
	expect(buttons.length).toBeGreaterThan(0);
	for (const button of buttons) {
		expect(button.className).toContain('flex-1');
		expect(button.className).toContain('h-10');
		expect(button.querySelector('.truncate')).not.toBeNull();
	}
	expect(screen.getByRole('button', { name: t('common.add') })).toBeTruthy();
});

test('the pomodoro is a ring with the time inside and one button row; stats and settings are in the title bar slot', () => {
	const service = {
		getState: () => ({
			mode: 'countdown',
			status: 'idle',
			elapsedSeconds: 0,
			remainingSeconds: 1500,
			totalSeconds: 1500,
			completedWorkSessions: 1,
		}),
		getTodayCount: () => 2,
		getActivity: () => '',
		getTags: () => [],
		start: vi.fn(),
		pause: vi.fn(),
		skip: vi.fn(),
		setActivity: vi.fn(),
	};
	(homeServices as { pomodoro?: unknown }).pomodoro = service;
	mount(<PomodoroWidget store={fake().store} />);
	expect(document.querySelector('[data-pomodoro-time]')!.textContent).toBe('25:00');
	expect(document.querySelectorAll('[data-pomodoro] svg circle')).toHaveLength(2);
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.focus') }));
	expect(service.start).toHaveBeenCalledTimes(1);
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.skip') }));
	expect(service.skip).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('button', { name: t('pomodoro.statsTitle') })).toBeTruthy();
	expect(screen.getByRole('button', { name: t('home.dashboard.settings') })).toBeTruthy();
});

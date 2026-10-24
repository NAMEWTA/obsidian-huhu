import { expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import { aggregate, emptyStats } from '../../core/stats/aggregate';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { AgentController } from '../../services/controller';
import type { HistoryRow } from '../../services/history-store';
import { UsageHeatmap } from './UsageHeatmap';
import { UsageStatsPage } from './UsageStatsPage';
import { setLanguage } from '../../../../shared/i18n';
vi.mock('./DailyChart', () => ({ DailyChart: () => null }));

test('recent session cells and overview use the same native input-inclusive cache total', () => {
	const rows: HistoryRow[] = Array.from({ length: 3 }, (_, i) => ({
		key: String(i),
		sessionId: String(i),
		accountKey: '{}',
		agentId: 'claude-code',
		cwd: '/vault',
		transcriptPath: '/vault/log',
		modifiedAtMs: Date.now(),
		title: `Session ${i}`,
		inVault: true,
		model: 'sonnet',
		createdAt: null,
		firstPrompt: 'Prompt',
		turns: [],
		messageCount: 2,
		metadata: {},
		// Helper adds the original input (1200) and caches (200 + 100) once.
		usage: { input: 1500, output: 300, cacheRead: 200, cacheWrite: 100, cost: null, known: true },
	}));
	const settings = normalizeTerminalSettings(undefined);
	const controller = {
		stats: { store: createStore(emptyStats) },
		historyStore: {
			store: createStore(() => ({ rows, loading: false, error: '', warnings: [] })),
			refresh: vi.fn(async () => {}),
		},
		settings: { get: () => settings, subscribe: () => () => {} },
	} as unknown as AgentController;
	render(
		<TestProviders>
			<UsageStatsPage controller={controller} />
		</TestProviders>,
	);
	const tableRows = within(screen.getAllByRole('table').at(-1)!).getAllByRole('row').slice(1);
	expect(tableRows).toHaveLength(3);
	const format = (v: number) =>
		new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
	for (const row of tableRows) expect(within(row).getAllByRole('cell')[5]?.textContent).toBe(format(1800));
	const total = screen.getAllByText(t('agent.stats.total')).find((el) => el.tagName === 'P')!.parentElement!;
	expect(total.textContent).toContain(format(5400));
	expect(aggregate(rows).totals.total).toBe(3 * 1800);
});

function pageWith(rows: HistoryRow[]) {
	return render(
		<TestProviders>
			<UsageHeatmap
				sessions={rows}
				now={Date.now()}
				format={(n) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n)}
			/>
		</TestProviders>,
	);
}
const sessionOn = (daysAgo: number, tokens: number, id = String(daysAgo)): HistoryRow => ({
	key: id,
	sessionId: id,
	accountKey: '{}',
	agentId: 'claude-code',
	cwd: '/vault',
	transcriptPath: '/vault/log',
	modifiedAtMs: Date.now() - daysAgo * 86_400_000,
	title: id,
	inVault: true,
	model: 'sonnet',
	createdAt: null,
	firstPrompt: 'Prompt',
	turns: [],
	messageCount: 1,
	metadata: {},
	usage: { input: tokens, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: true },
});

test('heatmap: 26 weeks as week-aligned blocks that start on Monday, five levels from theme variables, a legend and the total', () => {
	setLanguage('en');
	const rows = [0, 1, 2, 9, 30, 60, 100].map((days, index) => sessionOn(days, 1000 * (index + 1) ** 2));
	const { container } = pageWith(rows);
	const heatmap = container.querySelector<HTMLElement>('[data-usage-heatmap]')!;
	const blocks = [...heatmap.querySelectorAll<SVGRectElement>('rect[data-date]')];
	expect(blocks).toHaveLength(182);
	const dates = blocks.map((block) => block.dataset.date!);
	expect(new Set(dates).size).toBe(182);
	expect([...dates].sort()).toEqual(dates);
	// The first row of the grid is Monday: every Monday block sits at the top of its column.
	const top = Math.min(...blocks.map((block) => Number(block.getAttribute('y'))));
	const mondays = blocks.filter((block) => new Date(`${block.dataset.date}T00:00:00Z`).getUTCDay() === 1);
	expect(mondays.length).toBeGreaterThanOrEqual(26);
	for (const block of mondays) expect(Number(block.getAttribute('y'))).toBe(top);
	const sundays = blocks.filter((block) => new Date(`${block.dataset.date}T00:00:00Z`).getUTCDay() === 0);
	for (const block of sundays) expect(Number(block.getAttribute('y'))).toBe(top + 6 * 14);
	// Levels come from CSS variables, so the theme recolours them.
	const fill = (level: number) => blocks.find((block) => block.dataset.level === String(level))?.getAttribute('fill');
	expect(fill(0)).toBe('var(--muted)');
	for (const level of [1, 2, 3, 4]) expect(fill(level)).toContain('var(--chart-1)');
	expect(new Set(blocks.map((block) => block.dataset.level))).toEqual(new Set(['0', '1', '2', '3', '4']));
	// Month labels, the legend ends and the total are the library's, in the current language.
	expect(heatmap.textContent).toContain('Mon');
	expect(heatmap.textContent).toContain('Less');
	expect(heatmap.textContent).toContain('More');
	expect(heatmap.textContent).toMatch(/\d(\.\d)?[KM]? tokens in the last 26 weeks/);
	// No dot grid left behind.
	expect(container.querySelector('.grid-rows-7')).toBeNull();
});
test('heatmap: labels follow the language', () => {
	setLanguage('zh');
	const { container } = pageWith([sessionOn(0, 5000)]);
	const text = container.querySelector('[data-usage-heatmap]')!.textContent!;
	expect(text).toContain('少');
	expect(text).toContain('多');
	expect(text).toMatch(/月/);
	expect(text).toContain('近 26 周共');
	setLanguage('en');
});
test('heatmap: hovering a day shows its date and tokens in the project tooltip, not a native title', async () => {
	setLanguage('en');
	const { container } = pageWith([sessionOn(0, 4200)]);
	const block = [...container.querySelectorAll<SVGRectElement>('rect[data-date]')].at(-1)!;
	expect(block.querySelector('title')).toBeNull();
	await userEvent.setup().hover(block);
	const tip = await screen.findByRole('tooltip');
	expect(tip.textContent).toContain(block.dataset.date);
	expect(tip.textContent).toContain('4.2K tokens');
});

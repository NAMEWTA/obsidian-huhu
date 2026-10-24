import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import type { NavigatorPeriodic, PeriodicNotePreview } from '../../../navigator/api';
import { homeServices } from '../../services/instances';
import { DashboardRenderContext } from '../renderer/render-context';
import { usePeriodicPreviews } from './use-calendar';
import { useDayPreview } from './DayPreview';
import { DayAgendaPanel } from './CalendarModalPanel';
import { t } from '../../../../shared/i18n';

const before = { periodic: homeServices.periodic, watchPeriodic: homeServices.watchPeriodic };
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	Object.assign(homeServices, before);
});
const iso = '2026-10-23';
function source() {
	const listeners = new Set<() => void>();
	const note: PeriodicNotePreview = {
		period: 'day',
		date: iso,
		path: 'Journal/Day.md',
		title: 'Day',
		status: 'existing',
		active: false,
		summary: 'Original summary',
	};
	const preview = vi.fn(async () => note);
	const periodic = { preview } as unknown as NavigatorPeriodic;
	homeServices.periodic = () => periodic;
	homeServices.watchPeriodic = (listener) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	return {
		note,
		preview,
		periodic,
		changed: () => {
			for (const listener of listeners) listener();
		},
	};
}

test('same-date previews invalidate immediately on revision or period changes while replacement content is pending', async () => {
	const f = source();
	const { result, rerender } = renderHook(
		({ period }: { period: 'day' | 'month' }) => usePeriodicPreviews([iso], period, true),
		{ initialProps: { period: 'day' } },
	);
	await vi.waitFor(() => expect(result.current.get(iso)?.summary).toBe('Original summary'));
	let resolve!: (note: PeriodicNotePreview) => void;
	f.preview.mockImplementationOnce(
		() =>
			new Promise((done) => {
				resolve = done;
			}),
	);
	act(f.changed);
	expect(result.current.size).toBe(0);
	await act(async () => {
		resolve({ ...f.note, summary: 'Updated summary' });
	});
	expect(result.current.get(iso)?.summary).toBe('Updated summary');
	f.preview.mockImplementationOnce(
		() =>
			new Promise((done) => {
				resolve = done;
			}),
	);
	rerender({ period: 'month' });
	expect(result.current.size).toBe(0);
	await act(async () => {
		resolve({ ...f.note, period: 'month', summary: 'Month summary' });
	});
	expect(result.current.get(iso)?.summary).toBe('Month summary');
});

test('an open home hover preview closes when its periodic content revision changes', async () => {
	vi.useFakeTimers();
	const f = source(),
		{ app } = memoryVault({}, window),
		context = new DashboardRenderContext(document.createElement('div'));
	function Preview() {
		const preview = useDayPreview(app, context, 'same-date');
		return (
			<>
				<button onMouseEnter={(event) => preview.hover(event.currentTarget, iso, [])}>Date</button>
				{preview.content}
			</>
		);
	}
	render(
		<TestProviders>
			<Preview />
		</TestProviders>,
	);
	fireEvent.mouseEnter(screen.getByRole('button', { name: 'Date' }));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(350);
	});
	expect(screen.getByRole('tooltip').textContent).toContain(iso);
	expect(screen.getByRole('tooltip').textContent).not.toContain('Original summary');
	act(f.changed);
	expect(screen.queryByRole('tooltip')).toBeNull();
});

test('the day agenda keeps the diary entrance without a cover or summary block', () => {
	const f = source(),
		{ app } = memoryVault({}, window),
		context = new DashboardRenderContext(document.createElement('div'));
	f.note.image = 'app://cover.png';
	f.note.title = 'Selected diary';
	Object.assign(f.periodic, { inspect: () => f.note });
	render(
		<TestProviders>
			<DayAgendaPanel
				app={app}
				context={context}
				actions={{ onToggle: vi.fn() }}
				iso={iso}
				tasks={[]}
				addTask={vi.fn()}
				close={vi.fn()}
			/>
		</TestProviders>,
	);
	expect(screen.queryByRole('region', { name: t('calendarUnified.summary') })).toBeNull();
	expect(document.querySelector('img')).toBeNull();
	expect(document.body.textContent).not.toContain('Original summary');
	expect(document.querySelector('[data-calendar-agenda] header')?.textContent).toContain(iso);
	expect(screen.getByRole('button', { name: t('calendarUnified.add') })).toBeTruthy();
});

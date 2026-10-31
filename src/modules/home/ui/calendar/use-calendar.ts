import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { App } from 'obsidian';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import type { CalendarScope, CalendarSnapshot } from '../../../task/api';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { homeServices } from '../../services/instances';
import type { NavigatorPeriodic, PeriodicNotePreview } from '../../../navigator/api';
import { startOfPeriod } from '../../../../shared/periodic-paths';
import { calendarDate, calendarIso } from '../../../../ui/components/huhu/calendar/CalendarMonth';

const unavailable: CalendarSnapshot = {
	status: 'unavailable',
	tasks: [],
	byDay: new Map(),
	unfilteredCount: 0,
	filter: 'all',
	revision: 0,
};
/** The board adapter adds file handles for its existing rich task rows, without rescanning or owning a second index. */
export function useCalendarData(app: App, scope: CalendarScope = {}, enabled = true) {
	const calendar = homeServices.calendar;
	const filter = scope.filter ?? 'all',
		from = scope.from,
		to = scope.to;
	const subscribe = useCallback((listener: () => void) => calendar?.subscribe(listener) ?? (() => {}), [calendar]);
	const read = useCallback(
		() => calendar?.snapshot({ filter, from, to }) ?? unavailable,
		[calendar, filter, from, to],
	);
	const snapshot = useSyncExternalStore(subscribe, read);
	useEffect(() => {
		if (enabled) void calendar?.refresh({ filter, from, to });
	}, [calendar, filter, from, to, enabled]);
	const byDay = useMemo(() => {
		const map = new Map<string, VaultTask[]>();
		const handles = new Map<string, VaultTask>();
		for (const [iso, tasks] of snapshot.byDay)
			map.set(
				iso,
				tasks.flatMap((task) => {
					const key = `${task.path}:${task.line}:${task.id ?? ''}`;
					let value = handles.get(key);
					if (!value) {
						const file = contentFiles(app).getFileByPath(task.path);
						if (!file) return [];
						value = { ...task, file };
						handles.set(key, value);
					}
					return [value];
				}),
			);
		return map;
	}, [app, snapshot]);
	return { calendar, snapshot, byDay, reload: () => calendar?.refresh({ filter, from, to }) };
}

export function usePeriodicNotes() {
	const [revision, update] = useState(0);
	useEffect(() => homeServices.watchPeriodic?.(() => update((value) => value + 1)), []);
	return { periodic: homeServices.periodic?.(), revision };
}

/** A weekly/monthly active note highlights its whole period, independently from the selected day. */
export function periodicDayState(periodic: NavigatorPeriodic | undefined, iso: string) {
	const note = periodic?.inspect('day', calendarDate(iso));
	if (!note) return undefined;
	const active = periodic?.active();
	return {
		...note,
		active:
			note.active ||
			(!!active &&
				calendarIso(startOfPeriod(active.period, calendarDate(iso), periodic?.weekStart() ?? 1)) ===
					active.date),
	};
}

export function usePeriodicPreviews(dates: readonly string[], period: 'day' | 'month', enabled: boolean) {
	const { periodic, revision } = usePeriodicNotes();
	const [loaded, setPreviews] = useState<{
		key: string;
		periodic: NavigatorPeriodic;
		revision: number;
		period: 'day' | 'month';
		previews: ReadonlyMap<string, PeriodicNotePreview>;
	}>();
	const key = dates.join(',');
	useEffect(() => {
		let alive = true;
		if (!periodic || !enabled) return;
		void Promise.all(
			key
				.split(',')
				.filter(Boolean)
				.map(async (iso) => [iso, await periodic.preview(period, calendarDate(iso))] as const),
		)
			.then((entries) => {
				if (alive) setPreviews({ key, periodic, revision, period, previews: new Map(entries) });
			})
			.catch(() => {
				if (alive) setPreviews({ key, periodic, revision, period, previews: new Map() });
			});
		return () => {
			alive = false;
		};
	}, [periodic, revision, key, period, enabled]);
	return periodic &&
		enabled &&
		loaded?.key === key &&
		loaded.periodic === periodic &&
		loaded.revision === revision &&
		loaded.period === period
		? loaded.previews
		: new Map<string, PeriodicNotePreview>();
}

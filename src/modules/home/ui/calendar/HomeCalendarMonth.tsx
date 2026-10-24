import { Notice, Platform } from 'obsidian';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { t } from '../../../../shared/i18n';
import {
	CalendarMonth,
	calendarDate,
	calendarIso,
	calendarRows,
	type CalendarMonthProps,
} from '../../../../ui/components/huhu/calendar/CalendarMonth';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { periodicDayState, usePeriodicNotes, usePeriodicPreviews } from './use-calendar';

/** Home adapter: the reusable calendar knows only day states and commands, never vaults or module services. */
export function HomeCalendarMonth({
	byDay,
	showMonthCover = false,
	...props
}: Omit<CalendarMonthProps, 'day' | 'weekStart'> & {
	byDay: ReadonlyMap<string, readonly VaultTask[]>;
	showMonthCover?: boolean;
}) {
	const { periodic } = usePeriodicNotes();
	const ownerDocument = useOwnerDocument();
	const display = periodic?.display();
	const weekStart = periodic?.weekStart() ?? 1;
	const weeks = props.weeks ?? display?.weeks ?? 6;
	const images = usePeriodicPreviews(
		calendarRows(props.anchor, weekStart, weeks).flat().map(calendarIso),
		'day',
		display?.images ?? false,
	);
	const month = showMonthCover ? images.get(props.selected) : undefined;
	const active = periodic?.active();
	return (
		<CalendarMonth
			showPeriodActions={false}
			{...props}
			weeks={weeks}
			weekStart={weekStart}
			weekNumbers={display?.weekNumbers ?? true}
			canSplit={!Platform.isPhone}
			monthImage={props.monthImage ?? month?.image}
			onNote={(period, iso, action) => {
				if (!periodic) {
					new Notice(t('calendarUnified.periodicUnavailable'));
					return;
				}
				void periodic
					.open(period, calendarDate(iso), {
						create: action === 'create' || action === 'diary',
						newTab: action === 'tab' || action === 'diary',
						split: action === 'split',
						ownerWindow: ownerDocument.defaultView ?? undefined,
					})
					.then((opened) => {
						if (!opened) new Notice(t('calendarUnified.cancelled'));
					})
					.catch(() => {
						new Notice(t('calendarUnified.error.write-failed'));
					});
			}}
			onLocate={
				active
					? () => {
							props.onAnchor(calendarDate(active.date));
							props.onSelect(active.date);
						}
					: undefined
			}
			periods={(['day'] as const).map((period) => ({
				period,
				status: periodic?.inspect(period, calendarDate(props.selected)).status ?? 'unavailable',
				active: periodic?.inspect(period, calendarDate(props.selected)).active,
			}))}
			day={(iso) => {
				const tasks = byDay.get(iso) ?? [];
				const note = periodicDayState(periodic, iso);
				return {
					note: note?.status ?? 'unavailable',
					tasks: tasks.length,
					openTasks: tasks.filter((task) => !task.checked).length,
					active: note?.active,
					image: images.get(iso)?.image,
				};
			}}
		/>
	);
}

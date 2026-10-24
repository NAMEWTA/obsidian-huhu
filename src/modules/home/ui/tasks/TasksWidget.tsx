import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ListFilter } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '../../../../shared/i18n';
import { TaskRow } from '../../../../ui/components/huhu/calendar/TaskRow';
import { TaskComposer } from '../../../../ui/components/huhu/calendar/TaskComposer';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { Button } from '../../../../ui/components/button';
import type { BoardStore } from '../../services/board-store';
import type { CalendarTask } from '../../api';
import { homeServices } from '../../services/instances';
import { nearestSeriesTasks, taskIsOverdue } from '../../core/calendar/recurrence';
import { toIsoDate } from '../../platform/calendar/alltasks-scan';
import { WidgetActions } from '../canvas/widget-frame';
import { useClock } from '../board/hooks';
import { removeTaskDialog } from './task-remove-page';
const filters = ['all', 'overdue', 'today', 'week', 'unscheduled', 'completed'] as const;
export function TasksWidget({ store }: { store: BoardStore }) {
	const calendar = homeServices.calendar!;
	const subscribe = useCallback((listener: () => void) => calendar.subscribe(listener), [calendar]);
	const snapshot = useSyncExternalStore(
		subscribe,
		useCallback(() => calendar.snapshot({ filter: 'all' }), [calendar]),
	);
	const [filter, setFilter] = useState('all'),
		[pending, setPending] = useState<ReadonlySet<string>>(new Set());
	const root = useRef<HTMLDivElement>(null),
		operations = useRef(new Set<string>());
	const clock = useClock(),
		today = toIsoDate(new Date(clock));
	useEffect(() => {
		void calendar.refresh({ filter: 'all' });
	}, [calendar]);
	const week = new Date(clock);
	week.setDate(week.getDate() + 7);
	const end = toIsoDate(week);
	const groups = new Map<string, CalendarTask[]>();
	for (const task of nearestSeriesTasks(snapshot.tasks, today, clock)) {
		const date = task.scheduled ?? task.due ?? task.start ?? '';
		if (filter === 'completed' ? !task.checked : task.checked) continue;
		if (
			(filter === 'overdue' && !taskIsOverdue(task, clock)) ||
			(filter === 'today' && date !== today) ||
			(filter === 'week' && (!date || date < today || date >= end)) ||
			(filter === 'unscheduled' && !!date)
		)
			continue;
		const list = groups.get(date) ?? [];
		list.push(task);
		groups.set(date, list);
	}
	const keys = [...groups.keys()].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b)));
	const id = (task: CalendarTask) => `${task.path}:${task.id ?? task.line}`;
	const edit = (task: CalendarTask) => {
		if (root.current) void calendar.openEditor?.({ task, owner: root.current });
	};
	const toggle = async (task: CalendarTask, checked: boolean) => {
		const key = id(task);
		if (operations.current.has(key)) return;
		operations.current.add(key);
		setPending(new Set(operations.current));
		try {
			const result = await calendar.toggleTask(task, checked);
			if ('code' in result) throw new Error(t(`calendarUnified.error.${result.code}`));
			if (checked)
				toast(t('tasks.completed'), {
					action: {
						label: t('tasks.undo'),
						onClick: () => {
							const current = calendar
								.snapshot({ filter: 'all' })
								.tasks.find((entry) => id(entry) === key);
							if (current) void toggle(current, false);
						},
					},
				});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('calendarUnified.error.write-failed'));
		} finally {
			operations.current.delete(key);
			setPending(new Set(operations.current));
		}
	};
	return (
		<div ref={root} className="flex h-full min-h-0 flex-col gap-2" data-tasks-widget>
			<WidgetActions>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-sm" aria-label={t('calendarUnified.filter')}>
							<ListFilter />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
							{filters.map((key) => (
								<DropdownMenuRadioItem key={key} value={key}>
									{t(`tasks.filter.${key}`)}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</WidgetActions>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{snapshot.status === 'error' ? (
					<Button
						variant="outline"
						onClick={() => {
							void calendar.refresh();
						}}
					>
						{t('calendarUnified.retry')}
					</Button>
				) : !keys.length ? (
					<p className="m-0 py-4 text-sm text-muted-foreground">
						{t(snapshot.status === 'loading' ? 'calendarUnified.loading' : 'tasks.empty')}
					</p>
				) : (
					keys.map((date) => (
						<section key={date} className="mb-4">
							<h3 className="mb-1 mt-0 px-2 text-xs font-medium tabular-nums text-muted-foreground">
								{date === today
									? `${date} · ${t('tasks.filter.today')}`
									: date || t('tasks.filter.unscheduled')}
							</h3>
							<ul className="m-0 list-none p-0">
								{groups
									.get(date)!
									.sort((a, b) =>
										(a.scheduledTime ?? a.time ?? '99:99').localeCompare(
											b.scheduledTime ?? b.time ?? '99:99',
										),
									)
									.map((task) => (
										<TaskRow
											key={id(task)}
											task={{
												...task,
												id: id(task),
												time: task.scheduledTime ?? task.time,
												recurring: !!task.recurrence || !!task.seriesId,
											}}
											pending={pending.has(id(task))}
											onToggle={(checked) => {
												void toggle(task, checked);
											}}
											onEdit={() => edit(task)}
											onRemind={() => edit(task)}
											onSource={() => {
												void calendar
													.openSource(task, store.ownerWindow)
													.catch((error: unknown) => toast.error(String(error)));
											}}
											onRemove={() => {
												if (root.current) removeTaskDialog(root.current, task, calendar);
											}}
										/>
									))}
							</ul>
						</section>
					))
				)}
			</div>
			<TaskComposer
				add={async (text) => {
					const result = await calendar.createTask({ text, date: '', interactive: true });
					if ('code' in result) throw new Error(t(`calendarUnified.error.${result.code}`));
					return true;
				}}
				options={(text, onSaved) => {
					if (root.current) void calendar.openEditor?.({ text, owner: root.current, onSaved });
				}}
			/>
		</div>
	);
}

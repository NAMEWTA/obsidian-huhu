import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type {
	TaskService,
	TaskViews,
	TaskResources,
	TaskQuery,
	TaskFilter,
	TaskView,
	TaskResource,
	TaskResourceResolution,
} from '../api';
import { addDays, zonedStamp } from '../core/time';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Checkbox } from '../../../ui/components/checkbox';
import { Choice } from '../../../ui/components/huhu/Choice';
import { SegmentedControl } from '../../../ui/components/huhu/SegmentedControl';
import { TaskContent } from '../../../ui/components/huhu/TaskContent';
import { Notice } from '../../../ui/components/huhu/Notice';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { DetailPane } from '../../../ui/components/huhu/DetailPane';
import { DateRangeField } from '../../../ui/components/huhu/date';
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';
import { useOwnerWindow } from '../../../ui/react/hooks';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../../../ui/components/alert-dialog';
import { TaskEditor } from './TaskEditor';
import { ProductCalendar } from '../../../ui/components/huhu/calendar/ProductCalendar';

type View = 'list' | 'board' | 'calendar';
export function TaskPage({
	tasks,
	views,
	resources,
	compact = false,
	selectedId,
}: {
	tasks: TaskService;
	views: TaskViews;
	resources: TaskResources;
	compact?: boolean;
	selectedId?: string;
}) {
	const snapshot = useSyncExternalStore(tasks.subscribe, tasks.snapshot),
		win = useOwnerWindow(),
		leaf = useLeafMetrics();
	const root = useRef<HTMLDivElement>(null),
		[filter, setFilter] = useState<TaskFilter>('open'),
		[text, setText] = useState(''),
		[view, setView] = useState<View>('list');
	const [dimension, setDimension] = useState<NonNullable<TaskQuery['timeField']>>('effectiveDate'),
		[range, setRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null }),
		[order, setOrder] = useState<'asc' | 'desc'>('asc'),
		[offset, setOffset] = useState(0);
	const [error, setError] = useState(''),
		[pending, setPending] = useState<ReadonlySet<string>>(new Set()),
		[held, setHeld] = useState<ReadonlyMap<string, TaskView>>(new Map());
	const operations = useRef(new Set<string>()),
		timers = useRef(new Map<string, { owner: Window; id: number }>()),
		alive = useRef(true);
	const deadlines = useRef(new Map<string, number>()),
		currentWindow = useRef(win);
	currentWindow.current = win;
	const removeHeld = useCallback((id: string) => {
		deadlines.current.delete(id);
		timers.current.delete(id);
		setHeld((before) => {
			const next = new Map(before);
			next.delete(id);
			return next;
		});
	}, []);
	const scheduleRemoval = useCallback(
		(id: string, deadline: number) => {
			const old = timers.current.get(id);
			if (old) old.owner.clearTimeout(old.id);
			deadlines.current.set(id, deadline);
			const owner = currentWindow.current;
			timers.current.set(id, {
				owner,
				id: owner.setTimeout(() => removeHeld(id), Math.max(0, deadline - Date.now())),
			});
		},
		[removeHeld],
	);
	const [selected, setSelected] = useState<string | undefined>(selectedId),
		[dirty, setDirty] = useState(false),
		[nextSelection, setNextSelection] = useState<string>();
	const [undo, setUndo] = useState<{ id: string; revision: number } | null>(null),
		[month, setMonth] = useState(() => new Date(snapshot.now)),
		[calendarDay, setCalendarDay] = useState(() =>
			zonedStamp(snapshot.now, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10),
		);
	const routeSelection = useRef(selectedId);
	const completionScope = useMemo(
		() => ({ selected, filter, text, dimension, from: range.from, to: range.to, order, offset, view, compact }),
		[selected, filter, text, dimension, range.from, range.to, order, offset, view, compact],
	);
	const currentCompletionScope = useRef(completionScope);
	currentCompletionScope.current = completionScope;
	const lifetime = useMemo(() => ({ selection: selected, controller: new AbortController() }), [selected]);
	const controller = lifetime.controller;
	useEffect(() => () => controller.abort(), [controller]);
	useEffect(() => {
		alive.current = true;
		const timerMap = timers.current;
		for (const [id, deadline] of deadlines.current) scheduleRemoval(id, deadline);
		return () => {
			alive.current = false;
			for (const timer of timerMap.values()) timer.owner.clearTimeout(timer.id);
			timerMap.clear();
		};
	}, [win, scheduleRemoval]);
	useEffect(() => {
		setOffset(0);
		setHeld(new Map());
		for (const timer of timers.current.values()) timer.owner.clearTimeout(timer.id);
		timers.current.clear();
		deadlines.current.clear();
	}, [filter, text, dimension, range.from, range.to, order, view]);
	useEffect(() => {
		if (routeSelection.current === selectedId) return;
		routeSelection.current = selectedId;
		setNextSelection(undefined);
		if (selectedId && selectedId !== selected) {
			if (dirty) setNextSelection(selectedId);
			else setSelected(selectedId);
		}
	}, [selectedId, selected, dirty]);
	const query: TaskQuery = {
		filter,
		text,
		timeField: dimension,
		from: range.from ?? undefined,
		to: range.to ?? undefined,
		order,
		offset,
		limit: compact ? 20 : 50,
	};
	const leafRef = leaf.ref;
	const attachRoot = useCallback(
		(node: HTMLDivElement | null) => {
			root.current = node;
			leafRef(node);
		},
		[leafRef],
	);
	const page = tasks.query(query);
	const rows = [...page.items, ...[...held.values()].filter((v) => !page.items.some((x) => x.id === v.id))];
	const today = zonedStamp(snapshot.now, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10);
	const labels: Record<TaskFilter, string> = {
		all: 'task.all',
		open: 'task.pending',
		completed: 'task.completed',
		overdue: 'task.overdue',
	};
	const choose = (id: string) => {
		if (dirty && id !== selected) {
			setNextSelection(id);
			return;
		}
		setSelected(id);
	};
	const setEditorDirty = useCallback((value: boolean) => setDirty(value), []);
	const edit = () => {
		if (root.current) void views.edit({ owner: root.current }).catch(() => setError(t('task.unavailable')));
	};
	const toggle = async (task: TaskView) => {
		if (operations.current.has(task.id) || snapshot.status !== 'ready' || task.status === 'cancelled') return;
		operations.current.add(task.id);
		setPending(new Set(operations.current));
		setError('');
		const scope = completionScope;
		try {
			const result = await tasks.execute({
				kind: task.status === 'open' ? 'complete' : 'reopen',
				commandId: crypto.randomUUID(),
				id: task.id,
				expectedRevision: task.revision,
			});
			if (!alive.current || currentCompletionScope.current !== scope) return;
			if (!result.ok) {
				setError(t(`task.error.${result.error.code}`));
				return;
			}
			if (task.status === 'open') {
				const completed = tasks.get(task.id)!;
				setHeld((before) => new Map(before).set(task.id, completed));
				setUndo({ id: task.id, revision: completed.revision });
				scheduleRemoval(task.id, Date.now() + 1400);
			}
		} catch {
			if (alive.current && currentCompletionScope.current === scope) setError(t('task.error.write-failed'));
		} finally {
			operations.current.delete(task.id);
			if (alive.current) setPending(new Set(operations.current));
		}
	};
	const undoCompletion = async () => {
		if (!undo) return;
		const current = tasks.get(undo.id);
		if (!current || current.status !== 'completed' || current.revision !== undo.revision) {
			setUndo(null);
			setError(t('task.undoUnavailable'));
			return;
		}
		setUndo(null);
		await toggle(current);
		setHeld((before) => {
			const next = new Map(before);
			next.delete(current.id);
			return next;
		});
	};
	const row = (task: TaskView, card = false) => (
		<article
			key={task.id}
			role="listitem"
			data-task-id={task.id}
			className={`flex min-w-0 gap-3 border-b border-[var(--hu-line)] p-3 ${card ? 'rounded-lg border bg-[var(--hu-raised)] shadow-[var(--hu-shadow-card)]' : ''}`}
		>
			<span className="flex size-[var(--hu-hit)] shrink-0 items-center justify-center">
				<Checkbox
					checked={task.status === 'completed'}
					disabled={pending.has(task.id) || snapshot.status !== 'ready' || task.status === 'cancelled'}
					aria-label={`${t(task.status === 'open' ? 'task.complete' : 'task.reopen')}: ${task.title}`}
					aria-busy={pending.has(task.id)}
					className={pending.has(task.id) ? 'rounded-full border-dashed' : 'rounded-full'}
					onCheckedChange={() => {
						void toggle(task);
					}}
				/>
			</span>
			<div className="min-w-0 flex-1">
				<Button
					variant="ghost"
					className="h-auto min-w-0 max-w-full justify-start whitespace-normal p-0 text-left"
					onClick={() => choose(task.id)}
					aria-pressed={selected === task.id}
				>
					<TaskContent
						title={task.title}
						description={task.description || undefined}
						completed={task.status === 'completed'}
					/>
				</Button>
				<div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--hu-fg-3)]">
					{task.due && (
						<span>
							{t('task.due')}: {task.due.date} {task.due.time} · {task.timezone}
						</span>
					)}
					{task.planDate && (
						<span>
							{t('task.plan')}: {task.planDate}
						</span>
					)}
					{task.reminderAt !== undefined && (
						<span>
							{t('task.reminder')}: {zonedStamp(task.reminderAt, task.timezone)}
						</span>
					)}
					{task.completedAt !== undefined && (
						<span>
							{t('task.completedAt')}: {zonedStamp(task.completedAt, task.timezone)}
						</span>
					)}
					{task.overdue && (
						<span className="text-[var(--hu-danger)]">
							{t('task.overdueLabel')} · {task.overdueDays} {t('task.daysLate')} · {t('task.effective')}:{' '}
							{task.effectiveDate}
						</span>
					)}
					{pending.has(task.id) && <span role="status">{t('task.saving')}</span>}
				</div>
				{task.relations.length > 0 && (
					<div className="mt-1 flex flex-wrap gap-1">
						{task.relations.map((resource, i) => (
							<ResourceChip
								key={i}
								resource={resource}
								resources={resources}
								onOpen={() => {
									void resources.open(resource, win).catch(() => setError(t('task.missing')));
								}}
							/>
						))}
					</div>
				)}
			</div>
		</article>
	);
	const groupKey = (task: TaskView) =>
		task.status === 'completed'
			? 'completed'
			: task.overdue
				? 'overdue'
				: !task.effectiveDate
					? 'undated'
					: task.effectiveDate <= today
						? 'today'
						: task.effectiveDate === addDays(today, 1)
							? 'tomorrow'
							: 'later';
	const grouped = (keys: string[], board = false) => (
		<div className={board ? 'grid min-w-0 gap-4 [@container(min-width:800px)]:grid-cols-3' : 'space-y-4'}>
			{keys.map((key) => {
				const items = rows.filter((task) =>
					board
						? key === 'completed'
							? task.status === 'completed'
							: task.status !== 'completed' &&
								(key === 'dated' ? !!task.effectiveDate : !task.effectiveDate)
						: groupKey(task) === key,
				);
				return items.length || board ? (
					<section key={key} className="min-w-0">
						<h3 className="mb-2 flex gap-2 text-xs font-semibold text-[var(--hu-fg-3)]">
							{t(
								key === 'completed'
									? 'task.completed'
									: key === 'overdue'
										? 'task.overdue'
										: `task.group.${key}`,
							)}{' '}
							<span>{items.length}</span>
						</h3>
						<div role="list" className={board ? 'space-y-3' : ''}>
							{items.map((task) => row(task, board))}
						</div>
					</section>
				) : null;
			})}
		</div>
	);
	return (
		<div ref={attachRoot} className="@container flex h-full min-h-0 min-w-0 flex-col" data-task-domain>
			<header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--hu-line)] px-4 py-3">
				<h1 className="text-lg font-semibold">{t('task.title')}</h1>
				<div className="flex flex-wrap gap-2">
					{!compact && (
						<SegmentedControl
							ariaLabel={t('task.view')}
							value={view}
							options={(['list', 'board', 'calendar'] as const).map((value) => ({
								value,
								label: t(`task.view.${value}`),
								ariaLabel: t(`task.view.${value}`),
							}))}
							onChange={setView}
						/>
					)}
					<Button size="sm" disabled={snapshot.status !== 'ready'} onClick={edit}>
						<Plus />
						{t('task.new')}
					</Button>
				</div>
			</header>
			<div className="flex shrink-0 flex-wrap gap-3 border-b border-[var(--hu-line)] px-4 py-3">
				<Input
					value={text}
					onChange={(e) => setText(e.currentTarget.value)}
					placeholder={t('task.search')}
					aria-label={t('task.search')}
					className="min-w-0 flex-[1_1_180px]"
				/>
				<SegmentedControl
					ariaLabel={t('task.title')}
					wrap
					value={filter}
					options={(['all', 'open', 'completed', 'overdue'] as const).map((value) => ({
						value,
						label: `${t(labels[value])} ${page.counts[value]}`,
					}))}
					onChange={setFilter}
				/>
				{!compact && (
					<>
						<DateRangeField
							label={t('task.dateRange')}
							value={range}
							onChange={setRange}
							collisionBoundary={leaf.element}
						/>
						<Choice
							label={t('task.sort')}
							value={dimension}
							options={['effectiveDate', 'due', 'createdAt', 'reminderAt', 'completedAt'].map(
								(v) => [v, t(`task.sort.${v}`)] as const,
							)}
							onChange={(v) => setDimension(v as typeof dimension)}
						/>
						<Choice
							label={t('task.order')}
							value={order}
							options={['asc', 'desc'].map((v) => [v, t(`task.${v}`)] as const)}
							onChange={(v) => setOrder(v as typeof order)}
						/>
					</>
				)}
			</div>
			{error && (
				<Notice
					tone="error"
					title={error}
					action={
						<Button
							variant="secondary"
							onClick={() => {
								setError('');
								void tasks.refresh();
							}}
						>
							{t('task.retry')}
						</Button>
					}
				/>
			)}
			{undo && (
				<Notice
					tone="success"
					title={t('task.completedNotice')}
					action={
						<Button
							variant="ghost"
							onClick={() => {
								void undoCompletion();
							}}
						>
							{t('task.undo')}
						</Button>
					}
				/>
			)}
			{snapshot.status !== 'ready' && (
				<Notice
					tone={snapshot.status === 'error' ? 'error' : 'info'}
					title={t(
						snapshot.status === 'loading'
							? 'task.loading'
							: snapshot.error
								? `task.error.${snapshot.error.code}`
								: 'task.unavailable',
					)}
					action={
						<Button
							variant="secondary"
							onClick={() => {
								void tasks.refresh().catch(() => setError(t('task.unavailable')));
							}}
						>
							{t('task.retry')}
						</Button>
					}
				/>
			)}
			{snapshot.catchupPending && <Notice title={t('task.catchup')} />}
			<div className="flex min-h-0 min-w-0 flex-1">
				<main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
					{rows.length === 0 && snapshot.status === 'ready' ? (
						<EmptyState title={t(text || range.from || range.to ? 'task.noResults' : 'task.empty')} />
					) : view === 'board' ? (
						grouped(['undated', 'dated', 'completed'], true)
					) : view === 'calendar' ? (
						<div className="@container min-w-0 space-y-4">
							<div className="-mx-4 min-w-0">
								<ProductCalendar
									month={month}
									onMonthChange={setMonth}
									selected={calendarDay}
									onSelectDate={setCalendarDay}
									renderDayContent={(day) => {
										const items = rows.filter((task) => (task.planDate ?? task.due?.date) === day);
										return (
											items.length > 0 && (
												<>
													<Button
														variant="ghost"
														className="h-[var(--hu-hit)] w-full min-w-0 p-0 text-xs [@container(min-width:896px)]:hidden"
														data-task-calendar-count={day}
														aria-label={`${day} · ${t('task.title')} ${items.length}`}
														onClick={() => setCalendarDay(day)}
													>
														{items.length}
													</Button>
													<div className="hidden space-y-1 [@container(min-width:896px)]:block">
														{items.map((task) => (
															<Button
																key={task.id}
																variant="ghost"
																className="h-auto w-full justify-start whitespace-normal text-left"
																onClick={() => choose(task.id)}
															>
																<TaskContent
																	title={task.title}
																	completed={task.status === 'completed'}
																/>
															</Button>
														))}
													</div>
												</>
											)
										);
									}}
								/>
							</div>
							<section
								aria-label={`${t('task.title')} · ${calendarDay}`}
								data-task-calendar-agenda={calendarDay}
							>
								<h2 className="text-sm font-semibold">{calendarDay}</h2>
								<div role="list">
									{rows
										.filter((task) => (task.planDate ?? task.due?.date) === calendarDay)
										.map((task) => row(task))}
								</div>
							</section>
						</div>
					) : (
						grouped(['overdue', 'today', 'tomorrow', 'later', 'undated', 'completed'])
					)}
				</main>
				<DetailPane
					open={!!selected}
					onOpenChange={(value) => {
						if (!value) {
							setSelected(undefined);
							setDirty(false);
						}
					}}
					leafWidth={leaf.width}
					title={t('task.edit')}
					dirty={dirty}
					onDiscard={() => setDirty(false)}
				>
					{selected && tasks.get(selected) && (
						<TaskEditor
							key={selected}
							tasks={tasks}
							resources={resources}
							id={selected}
							signal={controller.signal}
							autoSave
							onDirtyChange={setEditorDirty}
							logicalLeaf={leaf.element}
							close={() => setSelected(undefined)}
						/>
					)}
				</DetailPane>
			</div>
			<footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--hu-line)] px-4 py-2 text-xs text-[var(--hu-fg-3)]">
				<span>{page.total}</span>
				{compact ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							void views.open();
						}}
					>
						{t('task.showAll')}
					</Button>
				) : (
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							disabled={offset === 0}
							onClick={() => setOffset((v) => Math.max(0, v - 50))}
						>
							<ChevronLeft />
							{t('task.previous')}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={page.nextOffset === undefined}
							onClick={() => setOffset(page.nextOffset ?? offset)}
						>
							{t('task.next')}
							<ChevronRight />
						</Button>
					</div>
				)}
			</footer>
			<AlertDialog
				open={!!nextSelection}
				onOpenChange={(v) => {
					if (!v) setNextSelection(undefined);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('ui.discardTitle')}</AlertDialogTitle>
						<AlertDialogDescription>{t('ui.discardDescription')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('ui.keepEditing')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setDirty(false);
								setSelected(nextSelection);
								setNextSelection(undefined);
							}}
						>
							{t('ui.discardChanges')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function ResourceChip({
	resource,
	resources,
	onOpen,
}: {
	resource: TaskResource;
	resources: TaskResources;
	onOpen(this: void): void;
}) {
	const [resolution, setResolution] = useState<TaskResourceResolution>();
	useEffect(() => {
		let current = true;
		void resources
			.resolve(resource)
			.then((value) => {
				if (current) setResolution(value);
			})
			.catch(() => {
				if (current)
					setResolution({
						resource,
						label: resource.kind === 'archive' ? resource.id : resource.path,
						status: 'unavailable',
					});
			});
		return () => {
			current = false;
		};
	}, [resource, resources]);
	return (
		<Button variant="ghost" size="sm" className="h-auto max-w-full py-1 text-xs" onClick={onOpen}>
			{t(`task.${resource.kind}`)} ·{' '}
			<span className="ml-1 truncate">
				{resolution?.label ?? (resource.kind === 'archive' ? resource.id : resource.path)}
			</span>
			{resolution && resolution.status !== 'available' && (
				<span className="ml-1 text-destructive">
					{t(resolution.status === 'missing' ? 'task.missing' : 'task.providerUnavailable')}
				</span>
			)}
		</Button>
	);
}

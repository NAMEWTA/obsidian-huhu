import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { zonedStamp } from '../core/time';
import { resourceKey } from '../core/resources';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Checkbox } from '../../../ui/components/checkbox';
import { Choice } from '../../../ui/components/huhu/Choice';
import { Label } from '../../../ui/components/label';
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
	const snapshot = useSyncExternalStore(tasks.subscribe, tasks.snapshot);
	const [filter, setFilter] = useState<TaskFilter>('open'),
		[text, setText] = useState(''),
		[dimension, setDimension] = useState<TaskQuery['timeField']>('effectiveDate');
	const [from, setFrom] = useState(''),
		[to, setTo] = useState(''),
		[order, setOrder] = useState<'asc' | 'desc'>('asc');
	const [offset, setOffset] = useState(0),
		[error, setError] = useState(''),
		[pending, setPending] = useState<string>();
	const root = useRef<HTMLDivElement>(null),
		opened = useRef<string | undefined>(undefined),
		operating = useRef(false);
	useEffect(() => {
		if (selectedId && root.current && snapshot.status === 'ready' && opened.current !== selectedId) {
			opened.current = selectedId;
			void views.edit({ id: selectedId, owner: root.current }).catch(() => setError(t('task.error.not-found')));
		}
	}, [selectedId, snapshot.status, views]);
	useEffect(() => {
		setOffset(0);
	}, [filter, text, dimension, from, to, order]);
	const page = tasks.query({
		filter,
		text,
		timeField: dimension,
		...(from ? { from } : {}),
		...(to && (!from || to >= from) ? { to } : {}),
		order,
		offset,
		limit: compact ? 20 : 50,
	});
	const edit = (id?: string) => {
		if (root.current) void views.edit({ owner: root.current, id }).catch(() => setError(t('task.unavailable')));
	};
	const toggle = async (task: TaskView) => {
		if (operating.current) return;
		operating.current = true;
		setPending(task.id);
		setError('');
		try {
			const result = await tasks.execute({
				kind: task.status === 'open' ? 'complete' : 'reopen',
				commandId: crypto.randomUUID(),
				id: task.id,
				expectedRevision: task.revision,
			});
			if (!result.ok) setError(t(`task.error.${result.error.code}`));
		} catch {
			setError(t('task.error.write-failed'));
		} finally {
			operating.current = false;
			setPending(undefined);
		}
	};
	const labels: Record<TaskFilter, string> = {
		all: 'task.all',
		open: 'task.pending',
		completed: 'task.completed',
		overdue: 'task.overdue',
	};
	return (
		<div
			ref={root}
			className={`flex h-full min-h-0 flex-col gap-3 ${compact ? '' : 'p-4 md:p-6'}`}
			data-task-domain
		>
			<header className="flex flex-wrap items-center justify-between gap-2">
				{compact ? (
					<Choice
						className="w-auto min-w-0"
						label={t('task.title')}
						value={filter}
						options={(['all', 'open', 'completed', 'overdue'] as const).map(
							(key) => [key, `${t(labels[key])} ${page.counts[key]}`] as const,
						)}
						onChange={(key) => setFilter(key as TaskFilter)}
					/>
				) : (
					<h2 className="m-0 text-lg font-semibold">{t('task.title')}</h2>
				)}
				<div className="flex gap-2">
					{!compact && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								void tasks.refresh();
							}}
						>
							{t('task.refresh')}
						</Button>
					)}
					<Button size="sm" onClick={() => edit()} disabled={snapshot.status !== 'ready'}>
						{t('task.new')}
					</Button>
				</div>
			</header>
			{!compact && (
				<div className="flex flex-wrap gap-1" role="group" aria-label={t('task.title')}>
					{(['all', 'open', 'completed', 'overdue'] as const).map((key) => (
						<Button
							key={key}
							size="sm"
							variant={filter === key ? 'default' : 'outline'}
							aria-pressed={filter === key}
							onClick={() => setFilter(key)}
						>
							{t(labels[key])} <span className="ml-1 tabular-nums">{page.counts[key]}</span>
						</Button>
					))}
				</div>
			)}
			{!compact && (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<Input
						value={text}
						onChange={(event) => setText(event.currentTarget.value)}
						placeholder={t('task.search')}
						aria-label={t('task.search')}
					/>
					<Choice
						label={t('task.sort')}
						value={dimension ?? 'effectiveDate'}
						options={['effectiveDate', 'due', 'createdAt', 'reminderAt', 'completedAt'].map(
							(key) => [key, t(`task.sort.${key}`)] as const,
						)}
						onChange={(value) => setDimension(value as TaskQuery['timeField'])}
					/>
					<Choice
						label={t('task.order')}
						value={order}
						options={['asc', 'desc'].map((key) => [key, t(`task.${key}`)] as const)}
						onChange={(value) => setOrder(value as 'asc' | 'desc')}
					/>
					<div className="grid grid-cols-2 gap-2">
						<Label>
							{t('task.from')}
							<Input type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} />
						</Label>
						<Label>
							{t('task.to')}
							<Input
								type="date"
								value={to}
								min={from || undefined}
								onChange={(event) => setTo(event.currentTarget.value)}
							/>
						</Label>
					</div>
				</div>
			)}
			{snapshot.status !== 'ready' && (
				<div role="status" className="flex items-center gap-2 text-sm">
					{t(
						snapshot.status === 'loading'
							? 'task.loading'
							: snapshot.error
								? `task.error.${snapshot.error.code}`
								: 'task.unavailable',
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							void tasks.refresh();
						}}
					>
						{t('task.retry')}
					</Button>
				</div>
			)}
			{snapshot.catchupPending && (
				<p role="status" className="text-xs text-muted-foreground">
					{t('task.catchup')}
				</p>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="min-h-0 flex-1 overflow-y-auto">
				<ul className="m-0 grid list-none gap-2 p-0">
					{page.items.map((task) => (
						<li key={task.id} className="rounded-lg border bg-card p-3">
							<div className="flex items-start gap-2">
								<Checkbox
									checked={task.status === 'completed'}
									disabled={pending !== undefined || snapshot.status !== 'ready'}
									aria-label={`${t(task.status === 'open' ? 'task.complete' : 'task.reopen')}: ${task.title}`}
									onCheckedChange={() => {
										void toggle(task);
									}}
								/>
								<Button
									className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left font-medium"
									variant="link"
									onClick={() => edit(task.id)}
								>
									{task.title}
								</Button>
							</div>
							<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
								<span>
									{t('task.due')}:{' '}
									{task.due
										? `${task.due.date} ${task.due.time ?? ''} · ${task.timezone}`
										: t('task.none')}
								</span>
								{task.reminderAt !== undefined && (
									<span>
										{t('task.reminder')}: {zonedStamp(task.reminderAt, task.timezone)}
									</span>
								)}
								{!compact && (
									<span>
										{t('task.created')}: {zonedStamp(task.createdAt, task.timezone)}
									</span>
								)}
								{task.completedAt !== undefined && (
									<span>
										{t('task.completedAt')}: {zonedStamp(task.completedAt, task.timezone)}
									</span>
								)}
							</div>
							{task.overdue && (
								<p className="mb-0 mt-1 text-xs font-medium text-destructive">
									{t('task.overdueLabel')} · {t('task.daysLate')}: {task.overdueDays} ·{' '}
									{t('task.effective')}: {task.effectiveDate}
								</p>
							)}
							{task.relations.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1">
									{task.relations.map((resource) => (
										<ResourceChip
											key={resourceKey(resource)}
											resource={resource}
											resources={resources}
											onOpen={() => {
												void resources
													.open(
														resource,
														root.current?.ownerDocument.defaultView ?? undefined,
													)
													.catch(() => setError(t('task.missing')));
											}}
										/>
									))}
								</div>
							)}
						</li>
					))}
				</ul>
				{page.total === 0 && snapshot.status === 'ready' && (
					<p className="py-6 text-center text-sm text-muted-foreground">{t('task.empty')}</p>
				)}
			</div>
			<footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
				<span>{page.total}</span>
				{compact ? (
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							void views.open();
						}}
					>
						{t('task.showAll')}
					</Button>
				) : (
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={offset === 0}
							onClick={() => setOffset(Math.max(0, offset - 50))}
						>
							{t('task.previous')}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={page.nextOffset === undefined}
							onClick={() => setOffset(page.nextOffset ?? offset)}
						>
							{t('task.next')}
						</Button>
					</div>
				)}
			</footer>
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
		<Button variant="outline" size="sm" className="h-auto max-w-full py-1 text-xs" onClick={onOpen}>
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

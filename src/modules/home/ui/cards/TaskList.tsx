import { observeBoardAction } from '../board/actions';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bell, ChevronDown, GripVertical } from 'lucide-react';
import { Checkbox } from '../../../../ui/components/checkbox';
import { Input } from '../../../../ui/components/input';
import { Progress } from '../../../../ui/components/progress';
import { cn } from '../../../../ui/lib/utils';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import type { DashboardCard, TaskItem } from '../../core/board/types/model';
import { homeServices } from '../../services/instances';
import { DUE_FIELD_REGEX, SCHEDULED_FIELD_REGEX } from '../../core/calendar/syntax';
import { IconButton } from '../board/controls';
import { MarkdownBody } from './MemoBody';
const taskId = (card: string, path: number[]) => `task:${card}:${path.join('.')}`;
function TaskRow({ store, card, task, path }: { store: BoardStore; card: string; task: TaskItem; path: number[] }) {
	const t = useT(),
		ownerWindow = useOwnerWindow(),
		{ attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
			id: taskId(card, path),
			data: { item: { kind: 'task', card, path } },
		});
	const field = task.text.match(SCHEDULED_FIELD_REGEX) ?? task.text.match(DUE_FIELD_REGEX);
	const time = field?.[1]?.slice(11, 16);
	const text = task.text.replace(DUE_FIELD_REGEX, '').replace(SCHEDULED_FIELD_REGEX, '').trim();
	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				opacity: isDragging ? 0.4 : undefined,
			}}
		>
			<div className="group/task relative flex min-h-9 items-start gap-2 rounded-md py-1.5 pr-1 pl-5 hover:bg-accent/50">
				<IconButton
					label={t('home.dashboard.drag')}
					className="absolute top-1.5 left-0 size-4 shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-3" />
				</IconButton>
				<Checkbox
					checked={task.checked}
					aria-label={task.text}
					className="mt-0.5 rounded-full"
					onCheckedChange={(checked) => {
						void observeBoardAction(store.sync.toggleTask(card, path, checked === true));
					}}
				/>
				{time && <span className="text-xs tabular-nums text-muted-foreground">{time}</span>}
				<div
					className={cn(
						'min-w-0 flex-1 text-sm leading-5 [&_p]:m-0',
						task.checked && 'text-muted-foreground line-through',
					)}
				>
					<MarkdownBody store={store} text={text} className="huhu-native markdown-rendered min-w-0" />
				</div>
				<div className="flex shrink-0 items-center opacity-0 group-hover/task:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
					<IconButton
						label={t('home.dashboard.reminder')}
						onClick={() => {
							void observeBoardAction(
								store.sync.taskAutomationSource(card, path).then(async (source) => {
									const calendar = homeServices.calendar;
									const current = (await calendar?.refresh({ filter: 'all' }))?.tasks.find(
										(entry) => entry.id === source.id,
									);
									const owner =
										ownerWindow.document.activeElement?.closest<HTMLElement>('.huhu-ui') ??
										ownerWindow.document.body;
									if (current) await calendar?.openEditor?.({ task: current, owner });
								}),
							);
						}}
					>
						<Bell className="size-3" />
					</IconButton>
					{!!task.children?.length && (
						<IconButton
							label={t('home.dashboard.collapse')}
							aria-expanded={!task.collapsed}
							onClick={() => {
								void observeBoardAction(store.sync.toggleCollapseTask(card, path));
							}}
						>
							<ChevronDown className={task.collapsed ? '-rotate-90' : ''} />
						</IconButton>
					)}
				</div>
			</div>
			{!task.collapsed && !!task.children?.length && (
				<div className="ml-5">
					<TaskRows store={store} card={card} tasks={task.children} parent={path} />
				</div>
			)}
		</div>
	);
}
function TaskRows({
	store,
	card,
	tasks,
	parent = [],
}: {
	store: BoardStore;
	card: string;
	tasks: TaskItem[];
	parent?: number[];
}) {
	return (
		<SortableContext
			items={tasks.map((_, i) => taskId(card, [...parent, i]))}
			strategy={verticalListSortingStrategy}
		>
			{tasks.map((task, i) => (
				<TaskRow key={task.id ?? i} store={store} card={card} task={task} path={[...parent, i]} />
			))}
		</SortableContext>
	);
}
/** `fill`: the card is a tile of its own, so the list takes the height that is left; in a section it is as tall as it is. */
export function TaskList({ store, card, fill = false }: { store: BoardStore; card: DashboardCard; fill?: boolean }) {
	const t = useT(),
		[text, setText] = useState('');
	const flatten = (tasks: TaskItem[]): TaskItem[] => tasks.flatMap((task) => [task, ...flatten(task.children ?? [])]);
	const tasks = flatten(card.tasks),
		progress = tasks.length ? Math.round((tasks.filter((task) => task.checked).length / tasks.length) * 100) : 0;
	return (
		<div className={cn('flex min-h-0 flex-col gap-2', fill && 'flex-1')}>
			<div className={cn('min-h-0 overflow-y-auto', fill && 'flex-1')}>
				<TaskRows store={store} card={card.id} tasks={card.tasks} />
			</div>
			<Input
				aria-label={t('home.dashboard.addTask')}
				placeholder={t('home.dashboard.addTask')}
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.nativeEvent.isComposing && text.trim()) {
						void observeBoardAction(store.sync.addTask(card.id, text).then(() => setText('')));
					}
				}}
			/>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Progress value={progress} aria-label={t('home.dashboard.progress')} className="h-1.5 flex-1" />
				<span className="w-9 shrink-0 text-right tabular-nums">{progress}%</span>
			</div>
		</div>
	);
}

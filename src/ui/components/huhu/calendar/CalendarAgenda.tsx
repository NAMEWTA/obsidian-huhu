import { useRef, useState } from 'react';
import { BookOpen, Clock3, MoreHorizontal } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '../../dropdown-menu';
import type { ReactNode } from 'react';
import { t } from '../../../../shared/i18n';
import { Button } from '../../button';
import { Input } from '../../input';
import { cn } from '../../../lib/utils';
import { type CalendarNoteAction, type CalendarDayState } from './CalendarMonth';

export interface CalendarAgendaItem {
	id: string;
	text: string;
	checked: boolean;
	source: string;
	date?: string;
	time?: string;
	reminder?: string;
	recurring?: boolean;
}
export interface CalendarAgendaProps {
	date: string;
	tasks: readonly CalendarAgendaItem[];
	earlierTasks?: readonly CalendarAgendaItem[];
	status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
	filtered?: boolean;
	note?: { status: CalendarDayState['note']; title?: string; summary?: string; image?: string; active?: boolean };
	canSplit?: boolean;
	onNote?(this: void, action: CalendarNoteAction): void;
	onRetry?(this: void): void;
	onAdd?(this: void, text: string, time: string): Promise<boolean>;
	onToggle?(this: void, id: string, checked: boolean): Promise<void>;
	onRemove?(this: void, id: string): Promise<void>;
	onOpenSource?(this: void, id: string): void;
	onRemind?(this: void, id: string): void;
	onEdit?(this: void, id: string): void;
	composer?: ReactNode;
	message?: string;
	className?: string;
}

/** The same diary content is available from hover-free agendas in every container. */
export function CalendarNoteSummary({ note }: { note: NonNullable<CalendarAgendaProps['note']> }) {
	return (
		<section
			aria-label={t('calendarUnified.summary')}
			className="shrink-0 space-y-1 rounded-md bg-muted/40 p-2"
			data-calendar-note-summary
		>
			{note.image && (
				<img
					key={note.image}
					src={note.image}
					alt=""
					className="h-20 w-full rounded object-cover"
					onError={(event) => {
						event.currentTarget.hidden = true;
					}}
				/>
			)}
			<div className="text-[11px] font-medium text-muted-foreground">{t('calendarUnified.summary')}</div>
			<div className="truncate text-xs font-semibold">{note.title}</div>
			{note.summary && <p className="m-0 line-clamp-3 text-xs text-muted-foreground">{note.summary}</p>}
		</section>
	);
}
/** Presentation only: callers map task identities and execute source-backed commands. */
export function CalendarAgenda(props: CalendarAgendaProps) {
	const [text, setText] = useState(''),
		[time, setTime] = useState(''),
		[timed, setTimed] = useState(false),
		[completed, setCompleted] = useState(true);
	const tasks = props.tasks.filter((task) => completed || !task.checked);
	const [adding, setAdding] = useState(false),
		[pending, setPending] = useState<ReadonlySet<string>>(new Set());
	const busy = useRef(false),
		operations = useRef(new Set<string>());
	const [error, setError] = useState('');
	const run = async (id: string, operation: () => Promise<void>) => {
		if (operations.current.has(id)) return;
		operations.current.add(id);
		setError('');
		setPending((before) => new Set([...before, id]));
		try {
			await operation();
		} catch {
			setError(t('calendarUnified.error.write-failed'));
		} finally {
			operations.current.delete(id);
			setPending((before) => {
				const next = new Set(before);
				next.delete(id);
				return next;
			});
		}
	};
	const add = async () => {
		if (!props.onAdd || busy.current || !text.trim()) return;
		busy.current = true;
		setAdding(true);
		setError('');
		try {
			if (await props.onAdd(text.trim(), time)) {
				setText('');
				setTime('');
			}
		} catch {
			setError(t('calendarUnified.error.write-failed'));
		} finally {
			busy.current = false;
			setAdding(false);
		}
	};
	return (
		<section
			className={cn('flex h-full min-h-0 flex-1 flex-col gap-2 text-foreground', props.className)}
			data-calendar-agenda={props.date}
			aria-label={`${props.date} · ${t('calendarUnified.agenda')}`}
		>
			<header className="flex shrink-0 items-center justify-between gap-2">
				<span className="text-sm font-semibold tabular-nums">{props.date}</span>
				<div className="flex items-center">
					{props.onNote && (
						<Button
							variant="ghost"
							size="sm"
							disabled={props.note?.status === 'disabled' || props.note?.status === 'unavailable'}
							onClick={() => props.onNote!('diary')}
						>
							<BookOpen />
							{t('calendarUnified.period.day')}
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-sm" aria-label={t('tasks.more')}>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuCheckboxItem checked={completed} onCheckedChange={setCompleted}>
								{t('tasks.showCompleted')}
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>
			{error && (
				<p role="alert" className="m-0 text-xs text-destructive">
					{error}
				</p>
			)}
			{props.message && (
				<p role="status" className="m-0 text-xs text-muted-foreground">
					{props.message}
				</p>
			)}
			{props.status === 'error' || props.status === 'unavailable' ? (
				<div role="alert" className="space-y-1 py-2 text-xs text-muted-foreground">
					<p className="m-0">
						{t(props.status === 'error' ? 'calendarUnified.failed' : 'calendarUnified.unavailable')}
					</p>
					{props.onRetry && (
						<Button variant="outline" size="sm" onClick={props.onRetry}>
							{t('calendarUnified.retry')}
						</Button>
					)}
				</div>
			) : (props.status === 'loading' || props.status === 'idle') && !props.tasks.length ? (
				<p role="status" className="m-0 py-2 text-xs text-muted-foreground">
					{t('calendarUnified.loading')}
				</p>
			) : (
				<>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{!tasks.length && (
							<p className="m-0 py-4 text-sm text-muted-foreground">
								{t(props.filtered ? 'calendarUnified.filteredEmpty' : 'calendarUnified.empty')}
							</p>
						)}
						{[
							{ key: 'open', label: '', items: tasks.filter((task) => !task.checked) },
							{ key: 'done', label: t('tasks.completed'), items: tasks.filter((task) => task.checked) },
							...[
								...new Set(
									(props.earlierTasks ?? [])
										.filter(
											(task) =>
												!task.checked && !props.tasks.some((current) => current.id === task.id),
										)
										.map((task) => task.date ?? ''),
								),
							]
								.sort()
								.map((date) => ({
									key: date,
									label: `${t('calendarUnified.earlier')} · ${date}`,
									items: (props.earlierTasks ?? []).filter(
										(task) =>
											!task.checked &&
											task.date === date &&
											!props.tasks.some((current) => current.id === task.id),
									),
								})),
						]
							.filter((group) => group.items.length)
							.map((group) => (
								<section key={group.key} className="mb-3">
									{group.label && (
										<h3 className="m-0 px-2 py-1 text-xs font-medium text-muted-foreground">
											{group.label}
										</h3>
									)}
									<ul className="m-0 list-none p-0">
										{group.items.map((task) => (
											<TaskRow
												key={task.id}
												task={task}
												pending={pending.has(task.id)}
												onToggle={
													props.onToggle
														? (checked) => {
																void run(task.id, () =>
																	props.onToggle!(task.id, checked),
																);
															}
														: undefined
												}
												onEdit={props.onEdit ? () => props.onEdit!(task.id) : undefined}
												onSource={
													props.onOpenSource ? () => props.onOpenSource!(task.id) : undefined
												}
												onRemind={props.onRemind ? () => props.onRemind!(task.id) : undefined}
												onRemove={
													props.onRemove
														? () => {
																void run(task.id, () => props.onRemove!(task.id));
															}
														: undefined
												}
											/>
										))}
									</ul>
								</section>
							))}
					</div>
				</>
			)}
			{props.composer ??
				(props.onAdd && (
					<form
						className="mt-auto grid shrink-0 gap-2 border-t border-border/50 pb-2 pt-3"
						onKeyDown={(event) => {
							if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
								event.preventDefault();
								if (!event.nativeEvent.isComposing) void add();
							}
						}}
						onSubmit={(event) => {
							event.preventDefault();
							void add();
						}}
					>
						<div className="flex items-center gap-1">
							<Input
								className="min-w-0 flex-1"
								aria-label={t('calendarUnified.taskTitle')}
								placeholder={t('calendarUnified.add')}
								value={text}
								onChange={(event) => setText(event.currentTarget.value)}
								disabled={adding}
							/>
							<Button
								variant="ghost"
								size="icon"
								type="button"
								aria-label={t('calendarUnified.taskTime')}
								aria-pressed={timed}
								onClick={() => {
									setTimed(!timed);
									if (timed) setTime('');
								}}
							>
								<Clock3 />
							</Button>
							<Button type="submit" size="sm" disabled={adding || !text.trim()}>
								{t('calendarUnified.add')}
							</Button>
						</div>
						{timed && (
							<Input
								className="w-32"
								type="time"
								aria-label={t('calendarUnified.taskTime')}
								value={time}
								onChange={(event) => setTime(event.currentTarget.value)}
								disabled={adding}
							/>
						)}
					</form>
				))}
		</section>
	);
}

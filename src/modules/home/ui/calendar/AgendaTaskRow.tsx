import { Bell, ExternalLink, Trash2 } from 'lucide-react';
import type { App } from 'obsidian';
import { Checkbox } from '../../../../ui/components/checkbox';
import { cn } from '../../../../ui/lib/utils';
import { t } from '../../../../shared/i18n';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { IconButton } from '../board/controls';
import type { DashboardRenderContext } from '../renderer/render-context';
import { OriginMark } from './CalendarGrids';
import { InlineLinks } from './CalendarLinks';
import { taskDayTime } from './calendar-layout';

/**
 * One task of a day, drawn like a row of the to-do section: a round check box, the text (struck through and muted
 * when done) and, when it has one, the time before it. Ticking writes the source note; clicking the text opens it.
 */
export function AgendaTaskRow({
	task,
	iso,
	app,
	context,
	onToggle,
	onRemind,
	onRemove,
	onOpenNote,
}: {
	task: VaultTask;
	iso: string;
	app: App;
	context: DashboardRenderContext;
	onToggle(this: void, task: VaultTask): void;
	/** Open the "New automation" dialog for this task, as a reminder of the day shown. */
	onRemind?(this: void, task: VaultTask, iso: string): void;
	onRemove?(this: void, task: VaultTask): void;
	onOpenNote?(this: void, file: ContentFile, line?: number, task?: VaultTask): void;
}) {
	const when = taskDayTime(task, iso);
	return (
		<li
			data-agenda-row
			title={task.file.basename}
			className={cn(
				'group/task flex min-h-9 items-start gap-2 rounded-md py-1.5 pr-1 pl-1 hover:bg-accent/50',
				onOpenNote && 'cursor-pointer',
			)}
			onClick={(event) => {
				if (!(event.target as HTMLElement).closest('button,input,[role="checkbox"],a,[role="link"]'))
					onOpenNote?.(task.file, task.line, task);
			}}
		>
			<Checkbox
				checked={task.checked}
				aria-label={task.text}
				className="mt-0.5 rounded-full"
				onCheckedChange={() => onToggle(task)}
				onClick={(event) => event.stopPropagation()}
			/>
			<div className={cn('min-w-0 flex-1 text-sm leading-5', task.checked && 'text-muted-foreground line-through')}>
				{when && <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">{when}</span>}
				<span title={task.text}>
					<InlineLinks text={task.text} app={app} context={context} />
				</span>
			</div>
			<OriginMark task={task} iso={iso} />
			{onOpenNote && <IconButton size="icon-sm" label={t('calendarUnified.source')} className="shrink-0" onClick={(event) => { event.stopPropagation(); onOpenNote(task.file, task.line, task); }}><ExternalLink className="size-3" /></IconButton>}
			{onRemind && (
				<IconButton
					label={t('home.dashboard.reminder')}
					className="size-6 shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
					onClick={(event) => {
						event.stopPropagation();
						onRemind(task, iso);
					}}
				>
					<Bell className="size-3" />
				</IconButton>
			)}
			{onRemove && (
				<IconButton
					label={t('common.delete')}
					className="size-6 shrink-0 opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
					onClick={(event) => {
						event.stopPropagation();
						onRemove(task);
					}}
				>
					<Trash2 className="size-3" />
				</IconButton>
			)}
		</li>
	);
}

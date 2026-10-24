import { Bell, ExternalLink, MoreHorizontal, Repeat2, Trash2 } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { Button } from '../../button';
import { Checkbox } from '../../checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../dropdown-menu';
import { cn } from '../../../lib/utils';

export interface TaskRowItem {
	id: string;
	text: string;
	checked: boolean;
	time?: string;
	reminder?: string;
	recurring?: boolean;
}
/** Compact, shared task presentation. Paths and storage syntax belong in the source command. */
export function TaskRow({
	task,
	pending,
	onToggle,
	onEdit,
	onRemind,
	onSource,
	onRemove,
}: {
	task: TaskRowItem;
	pending?: boolean;
	onToggle?(this: void, checked: boolean): void;
	onEdit?(this: void): void;
	onRemind?(this: void): void;
	onSource?(this: void): void;
	onRemove?(this: void): void;
}) {
	return (
		<li
			className="group flex min-h-9 items-start gap-1 rounded-md px-1 hover:bg-muted/40 [@media(pointer:coarse)]:min-h-11"
			data-task-row
		>
			<label className="flex min-h-9 w-8 shrink-0 items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:w-11">
				<Checkbox
					aria-label={task.text}
					checked={task.checked}
					disabled={pending || !onToggle}
					onCheckedChange={(checked) => onToggle?.(checked === true)}
				/>
			</label>
			{task.time && <span className="pt-2 text-xs tabular-nums text-muted-foreground">{task.time}</span>}
			<Button
				variant="ghost"
				className={cn(
					'h-auto min-h-9 min-w-0 flex-1 justify-start whitespace-normal break-words px-1 py-2 text-left text-sm font-normal [@media(pointer:coarse)]:min-h-11',
					task.checked && 'text-muted-foreground line-through',
				)}
				onClick={onEdit ?? onSource}
				disabled={pending}
			>
				{task.text}
			</Button>
			<div className="flex shrink-0 items-center gap-0.5 pt-0.5">
				{task.recurring && (
					<Repeat2 className="mx-1 size-3.5 text-muted-foreground" aria-label={t('tasks.repeat')} />
				)}
				{onRemind && (
					<Button
						variant="ghost"
						size="icon-sm"
						className={cn(
							'size-8',
							task.reminder
								? 'text-primary'
								: 'text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100',
						)}
						aria-label={t('calendarUnified.remind')}
						title={task.reminder}
						onClick={onRemind}
						disabled={pending}
					>
						<Bell className="size-3.5" />
					</Button>
				)}
				{(onSource || onRemove) && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								className="size-8 text-muted-foreground"
								aria-label={t('tasks.more')}
								disabled={pending}
							>
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{onSource && (
								<DropdownMenuItem onSelect={onSource}>
									<ExternalLink />
									{t('calendarUnified.source')}
								</DropdownMenuItem>
							)}
							{onRemove && (
								<DropdownMenuItem onSelect={onRemove} className="text-destructive">
									<Trash2 />
									{t('calendarUnified.remove')}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</li>
	);
}

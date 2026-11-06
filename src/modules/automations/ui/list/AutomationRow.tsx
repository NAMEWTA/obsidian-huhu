import { useLayoutEffect, useRef, useState } from 'react';
import { VisibleTooltip as Tooltip } from '../parts';
import { useTransient } from '../use-transient';
// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationListLocalRow.tsx
import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Badge } from '../../../../ui/components/badge';
import { Switch } from '../../../../ui/components/switch';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '../../../../ui/components/dropdown-menu';
import { TooltipTrigger, TooltipContent } from '../../../../ui/components/tooltip';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { cn } from '../../../../ui/lib/utils';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { isActiveRun, type AutomationDefinition, type AutomationRun } from '../../../../shared/automation/types';
import { IconButton } from '../parts';
import { actionName, actionView } from '../actions/registry';
import { nextRun, scheduleLabel } from '../format';
import { LastRunCell } from './LastRunCell';
import {
	NARROW_HIDDEN,
	NARROWER_HIDDEN,
	STACK_FULL,
	STACK_ORDER,
	STICKY_CELL,
	TABLE_GRID,
	TABLE_ROW,
} from './table-layout';
export interface RowActions {
	onOpen: (definition: AutomationDefinition) => void;
	onRun: (definition: AutomationDefinition) => void;
	onEdit: (definition: AutomationDefinition) => void;
	onToggle: (definition: AutomationDefinition) => void;
	onDelete: (definition: AutomationDefinition) => void;
}
/** The name wraps to two lines; a longer one gets a control that shows all of it. */
function RowName({ name, onOpen, disabled }: { name: string; onOpen: () => void; disabled: boolean }) {
	const t = useT(),
		win = useOwnerWindow() as Window & { ResizeObserver?: typeof ResizeObserver },
		text = useRef<HTMLSpanElement>(null),
		[expanded, setExpanded] = useState(false),
		[clamped, setClamped] = useState(false);
	useLayoutEffect(() => {
		const el = text.current;
		if (!el || expanded) return;
		const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
		measure();
		if (typeof win.ResizeObserver !== 'function') return;
		const observer = new win.ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [name, expanded, win]);
	return (
		<div className="min-w-24 flex-1">
			<button
				type="button"
				disabled={disabled}
				className="w-full min-w-0 justify-start whitespace-normal text-left font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)]"
				onClick={(event) => {
					event.stopPropagation();
					onOpen();
				}}
			>
				<span
					ref={text}
					className={cn('block w-full min-w-0 text-left break-words', !expanded && 'line-clamp-2')}
				>
					{name}
				</span>
			</button>
			{(clamped || expanded) && (
				<button
					type="button"
					disabled={disabled}
					aria-expanded={expanded}
					className="rounded-sm text-xs text-primary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)]"
					onClick={(event) => {
						event.stopPropagation();
						setExpanded(!expanded);
					}}
				>
					{t(expanded ? 'automation.collapseName' : 'automation.expandName')}
				</button>
			)}
		</div>
	);
}
export function AutomationRow({
	definition: d,
	lastRun,
	selected,
	focused,
	pending,
	disabled,
	...actions
}: RowActions & {
	definition: AutomationDefinition;
	lastRun?: AutomationRun;
	selected: boolean;
	focused: boolean;
	pending: boolean;
	disabled: boolean;
}) {
	const t = useT(),
		layer = useTransient(),
		next = nextRun(d),
		running = !!lastRun && isActiveRun(lastRun);
	const view = actionView(d.action.kind),
		ActionIcon = view.Icon,
		hint = view.hint?.(d.action),
		badge = view.badge?.(d.action);
	return (
		<div
			role="row"
			data-automation-row-id={d.id}
			data-current={focused ? 'true' : undefined}
			data-selected={selected || undefined}
			aria-busy={pending}
			aria-selected={selected}
			className={cn(TABLE_GRID, TABLE_ROW, selected && 'bg-accent text-accent-foreground')}
			onClick={(event) => {
				if (!event.currentTarget.contains(event.target as Node)) return;
				actions.onOpen(d);
			}}
		>
			<span role="cell" className={cn(STICKY_CELL, STACK_FULL)}>
				{running && <span className="absolute -left-3 top-0 bottom-0 w-0.5 bg-primary" />}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-start gap-x-2">
						<RowName name={d.name} disabled={pending} onOpen={() => actions.onOpen(d)} />
						{!d.enabled && (
							<Badge variant="neutral" className="mt-1 text-xs">
								{t('automation.disabled')}
							</Badge>
						)}
					</div>
					{d.source && (
						<div className="break-words text-xs text-muted-foreground">
							{t('automation.sourceLabel', {
								kind: t(`automation.source.${d.source.kind}`),
								name: d.source.path,
							})}
						</div>
					)}
				</div>
			</span>
			<span
				role="cell"
				className={cn(
					'min-w-0 truncate text-muted-foreground @max-[660px]:whitespace-normal @max-[660px]:break-words',
					STACK_ORDER[0],
				)}
			>
				{scheduleLabel(d.schedule)}
			</span>
			<span role="cell" className={cn('min-w-0 text-muted-foreground', NARROWER_HIDDEN)}>
				<span className="flex items-center gap-1.5 truncate">
					<ActionIcon className="size-3.5 shrink-0" />
					{actionName(d.action.kind)}
				</span>
				{hint && <span className="block truncate text-xs">{hint}</span>}
			</span>
			<span role="cell" className={cn('min-w-0 truncate text-muted-foreground', NARROW_HIDDEN)}>
				{next ? <RelativeTime value={next} /> : '—'}
			</span>
			<span role="cell" className={cn('min-w-0', STACK_FULL, STACK_ORDER[2])}>
				<LastRunCell run={lastRun} />
			</span>
			<span
				role="cell"
				className={cn('flex justify-end', STACK_ORDER[1])}
				onClick={(event) => event.stopPropagation()}
			>
				<Switch
					checked={d.enabled}
					aria-busy={pending}
					disabled={disabled}
					aria-label={t(d.enabled ? 'automation.pauseNamed' : 'automation.resumeNamed', { name: d.name })}
					onCheckedChange={() => actions.onToggle(d)}
				/>
			</span>
			<span role="cell" className={cn('flex justify-center', NARROW_HIDDEN)}>
				{badge ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span>{badge.icon}</span>
						</TooltipTrigger>
						{layer.visible && <TooltipContent>{badge.label}</TooltipContent>}
					</Tooltip>
				) : (
					'—'
				)}
			</span>
			<span
				role="cell"
				className={cn(
					'flex flex-wrap items-center justify-end gap-1 @max-[660px]:justify-start',
					STACK_FULL,
					STACK_ORDER[3],
				)}
				onClick={(event) => event.stopPropagation()}
			>
				<IconButton
					label={t('automation.runNamed', { name: d.name })}
					disabled={disabled}
					onClick={() => actions.onRun(d)}
				>
					<Play className="size-4" />
				</IconButton>
				<IconButton
					label={t('automation.editNamed', { name: d.name })}
					disabled={disabled}
					onClick={() => actions.onEdit(d)}
				>
					<Pencil className="size-4" />
				</IconButton>
				<span className="inline-flex size-[var(--hu-hit)] shrink-0 items-center justify-center">
					<DropdownMenu open={layer.open} onOpenChange={layer.onOpenChange}>
						<Tooltip>
							<TooltipTrigger asChild>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={t('automation.actionsFor', { name: d.name })}
										className="text-muted-foreground"
									>
										<MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
							</TooltipTrigger>
							{layer.visible && (
								<TooltipContent>{t('automation.actionsFor', { name: d.name })}</TooltipContent>
							)}
						</Tooltip>
						{layer.visible && (
							<DropdownMenuContent onCloseAutoFocus={layer.onCloseAutoFocus} align="end" className="w-48">
								<DropdownMenuItem disabled={disabled} onSelect={() => actions.onToggle(d)}>
									{d.enabled ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
									{t(d.enabled ? 'automation.pause' : 'automation.resume')}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									disabled={disabled || running}
									onSelect={() => actions.onDelete(d)}
								>
									<Trash2 className="size-3.5" />
									{t('automation.delete')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						)}
					</DropdownMenu>
				</span>
			</span>
		</div>
	);
}

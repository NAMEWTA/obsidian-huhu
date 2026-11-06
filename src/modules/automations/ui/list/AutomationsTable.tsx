// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationsListPanel.tsx, AutomationListTableHeader.tsx, AutomationListSortHeader.tsx
import { Platform } from 'obsidian';
import { actionDefinition } from '../../core/actions/registry';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import type { AutomationDefinition, AutomationRun } from '../../../../shared/automation/types';
import { cn } from '../../../../ui/lib/utils';
import { AutomationRow, type RowActions } from './AutomationRow';
import { NARROW_HIDDEN, NARROWER_HIDDEN, STACK_HEADER_HIDDEN, STICKY_CELL, TABLE_GRID } from './table-layout';
export interface ListSort {
	by: 'name' | 'lastRun';
	direction: 'asc' | 'desc';
}
export function AutomationsTable({
	definitions,
	runs,
	selected,
	focused,
	pending,
	sort,
	onSort,
	disabled,
	deviceId,
	...actions
}: RowActions & {
	definitions: readonly AutomationDefinition[];
	runs: readonly AutomationRun[];
	selected: string;
	focused: string;
	pending: ReadonlySet<string>;
	sort: ListSort;
	onSort: (sort: ListSort) => void;
	disabled: boolean;
	deviceId: string;
}) {
	const t = useT(),
		scroll = useRef<HTMLDivElement>(null);
	useEffect(() => {
		scroll.current?.querySelector('[data-current=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
	}, [focused]);
	const header = (key: ListSort['by']) => (
		<Button
			variant="ghost"
			size="sm"
			className="justify-start px-0 text-xs font-medium"
			onClick={() => onSort({ by: key, direction: sort.by === key && sort.direction === 'asc' ? 'desc' : 'asc' })}
		>
			{t(`automation.${key}`)}
			{sort.by === key &&
				(sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
		</Button>
	);
	return (
		<div
			ref={scroll}
			className="@container min-h-0 flex-1 overflow-auto rounded-lg border border-border/50 bg-muted/20"
			role="table"
			aria-label={t('automation.title')}
		>
			<div className="min-w-0 @min-[661px]:min-w-[26rem]">
				<div
					role="row"
					className={cn(
						TABLE_GRID,
						'sticky top-0 z-10 min-h-9 items-center gap-3 border-b border-border/50 bg-background px-3 text-xs font-medium text-muted-foreground @max-[660px]:flex @max-[660px]:flex-wrap @max-[660px]:gap-y-0',
					)}
				>
					<span
						role="columnheader"
						aria-sort={
							sort.by === 'name' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
						}
						className={STICKY_CELL}
					>
						{header('name')}
					</span>
					{['schedule', 'actionDirectory', 'nextRun'].map((key) => (
						<span
							role="columnheader"
							key={key}
							className={cn(
								STACK_HEADER_HIDDEN,
								key === 'nextRun'
									? NARROW_HIDDEN
									: key === 'actionDirectory'
										? NARROWER_HIDDEN
										: undefined,
							)}
						>
							{t(`automation.${key}`)}
						</span>
					))}
					<span
						role="columnheader"
						className="@max-[660px]:ml-auto"
						aria-sort={
							sort.by === 'lastRun' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
						}
					>
						{header('lastRun')}
					</span>
					{['status', 'agent', 'actions'].map((key) => (
						<span
							role="columnheader"
							key={key}
							className={cn(STACK_HEADER_HIDDEN, key === 'agent' ? NARROW_HIDDEN : undefined)}
						>
							{t(`automation.${key}`)}
						</span>
					))}
				</div>
				<div role="rowgroup" className="divide-y divide-border/50">
					{definitions.map((d) => (
						<AutomationRow
							key={d.id}
							definition={d}
							lastRun={[...runs].reverse().find((run) => run.automationId === d.id)}
							selected={selected === d.id}
							focused={focused === d.id}
							pending={pending.has(d.id)}
							disabled={
								disabled ||
								d.deviceId !== deviceId ||
								pending.has(d.id) ||
								(!!actionDefinition(d.action.kind)?.desktop && !Platform.isDesktopApp)
							}
							{...actions}
						/>
					))}
				</div>
				{!definitions.length && <p className="p-8 text-sm text-muted-foreground">{t('ui.noResults')}</p>}
			</div>
		</div>
	);
}

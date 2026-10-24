// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationsListPanel.tsx, AutomationListTableHeader.tsx, AutomationListSortHeader.tsx
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import type { AutomationDefinition, AutomationRun } from '../../../../shared/automation/types';
import { cn } from '../../../../ui/lib/utils';
import { AutomationRow, type RowActions } from './AutomationRow';
import { NARROW_HIDDEN, NARROWER_HIDDEN, STICKY_CELL, TABLE_GRID } from './table-layout';
export interface ListSort {
	by: 'name' | 'lastRun';
	direction: 'asc' | 'desc';
}
export function AutomationsTable({
	definitions,
	runs,
	selected,
	sort,
	onSort,
	disabled,
	deviceId,
	...actions
}: RowActions & {
	definitions: readonly AutomationDefinition[];
	runs: readonly AutomationRun[];
	selected: string;
	sort: ListSort;
	onSort: (sort: ListSort) => void;
	disabled: boolean;
	deviceId: string;
}) {
	const t = useT(),
		scroll = useRef<HTMLDivElement>(null);
	useEffect(() => {
		scroll.current?.querySelector('[data-current=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
	}, [selected]);
	const header = (key: ListSort['by']) => (
		<Button
			variant="ghost"
			size="xs"
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
			<div className="min-w-[26rem]">
				<div
					role="row"
					className={cn(
						TABLE_GRID,
						'sticky top-0 z-10 h-9 items-center gap-3 border-b border-border/50 bg-background px-3 text-xs font-medium text-muted-foreground',
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
						<span role="columnheader" key={key} className={key === 'nextRun' ? NARROW_HIDDEN : key === 'actionDirectory' ? NARROWER_HIDDEN : undefined}>
							{t(`automation.${key}`)}
						</span>
					))}
					<span
						role="columnheader"
						aria-sort={
							sort.by === 'lastRun' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
						}
					>
						{header('lastRun')}
					</span>
					{['status', 'agent', 'actions'].map((key) => (
						<span role="columnheader" key={key} className={key === 'agent' ? NARROW_HIDDEN : undefined}>
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
							disabled={disabled || d.deviceId !== deviceId}
							{...actions}
						/>
					))}
				</div>
				{!definitions.length && <p className="p-8 text-sm text-muted-foreground">{t('ui.noResults')}</p>}
			</div>
		</div>
	);
}

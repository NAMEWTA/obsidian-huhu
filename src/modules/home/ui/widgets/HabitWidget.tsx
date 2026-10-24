// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/habit-widget.ts
import { lazy, Suspense, useState } from 'react';
import { useStore } from 'zustand';
import { Plus, History, Flame, Target } from 'lucide-react';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Label } from '../../../../ui/components/label';
import { Checkbox } from '../../../../ui/components/checkbox';
import { Input } from '../../../../ui/components/input';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { todayStr } from '../../core/habit/model';
import { IconButton } from '../board/controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { RecordDialog } from '../dialogs/RecordDialog';
import { WidgetActions, useWidgetMenu } from '../canvas/widget-frame';
import { HabitHeatmap } from '../habit/HabitHeatmap';
import { BarChart2 } from 'lucide-react';
const Stats = lazy(() => import('../habit/HabitStatsPanel').then((m) => ({ default: m.HabitStatsPanel })));
export function HabitWidget({ store }: { store: BoardStore }) {
	useStore(store.state, (s) => s.widgetRevision);
	const [stats, setStats] = useState(false);
	const t = useT(),
		service = store.widgets.habit,
		[adding, setAdding] = useState(false),
		[backfill, setBackfill] = useState(false),
		[name, setName] = useState('');
	useWidgetMenu(
		service
			? [
					{
						id: 'backfill',
						label: t('home.dashboard.yesterday'),
						icon: <History />,
						onSelect: () => setBackfill(true),
					},
				]
			: [],
	);
	if (!service) return null;
	const habits = service.getHabits(),
		done = service.getDoneOn(todayStr()).length,
		yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
	return (
		<>
			{stats && (
				<RecordDialog
					title={t('habit.statsTitle')}
					classes="dashboard-habit-stats-modal"
					onClose={() => setStats(false)}
				>
					<Suspense fallback={null}>
						<Stats service={service} close={() => setStats(false)} />
					</Suspense>
				</RecordDialog>
			)}
			<WidgetActions>
				<IconButton label={t('habit.statsTitle')} onClick={() => setStats(true)}>
					<BarChart2 />
				</IconButton>
				<IconButton label={t('common.add')} onClick={() => setAdding(true)}>
					<Plus />
				</IconButton>
			</WidgetActions>
			<div className="flex h-full min-h-0 flex-col gap-3 [@container(min-width:40rem)]:flex-row" data-habit>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
					<div className="flex shrink-0 items-baseline gap-2">
						<span className="text-3xl leading-none font-semibold tabular-nums">
							{done}
							<span className="text-lg font-medium text-muted-foreground">/{habits.length}</span>
						</span>
						<span className="text-xs text-muted-foreground">{t('pomodoro.today')}</span>
					</div>
					{habits.length === 0 ? (
						<EmptyState className="flex-1" size="sm" icon={<Target />} title={t('habit.emptyHint')} />
					) : (
						<ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
							{habits.map((habit) => (
								<li key={habit.id} className="shrink-0">
									<Label className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-normal hover:bg-accent/50">
										<Checkbox
											className="rounded-full"
											checked={service.isDone(habit.id)}
											onCheckedChange={() => service.toggle(habit.id)}
										/>
										<span className="min-w-0 flex-1 truncate" title={habit.name}>
											{habit.name}
										</span>
										<span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
											<Flame className="size-3" />
											{service.getStreak(habit.id)}
										</span>
									</Label>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="hidden shrink-0 [@container(min-height:12.5rem)]:block [@container(min-width:40rem)]:w-[45%] [@container(min-width:40rem)]:self-center">
					<HabitHeatmap service={service} />
				</div>
			</div>
			{adding && (
				<DashboardDialog
					title={t('home.dashboard.widget.habit')}
					onClose={() => setAdding(false)}
					onSave={() => {
						if (service.addHabit(name)) {
							setName('');
							setAdding(false);
						}
					}}
				>
					<Input
						aria-label={t('home.dashboard.name')}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</DashboardDialog>
			)}
			{backfill && (
				<DashboardDialog title={t('home.dashboard.yesterday')} onClose={() => setBackfill(false)}>
					{habits.map((habit) => (
						<label key={habit.id} className="flex gap-2">
							<Checkbox
								checked={service.isDone(habit.id, key)}
								onCheckedChange={() => service.toggle(habit.id, key)}
							/>
							{habit.name}
						</label>
					))}
				</DashboardDialog>
			)}
		</>
	);
}

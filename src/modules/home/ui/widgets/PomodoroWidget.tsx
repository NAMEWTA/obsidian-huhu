// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts (renderSidebarPomodoro)
import { lazy, Suspense, useState } from 'react';
import { useStore } from 'zustand';
import { SkipForward, Settings } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Switch } from '../../../../ui/components/switch';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { IconButton, Choice } from '../board/controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { RecordDialog } from '../dialogs/RecordDialog';
import { WidgetActions } from '../canvas/widget-frame';
import { BarChart2 } from 'lucide-react';
const Tags = lazy(() => import('../pomodoro/PomodoroTagsPanel').then((m) => ({ default: m.PomodoroTagsPanel })));
const Stats = lazy(() => import('../pomodoro/PomodoroStatsPanel').then((m) => ({ default: m.PomodoroStatsPanel })));
const RING = 207.35;
/*
 * Tile layouts: a ring with the time inside and the buttons under it (S, L); in a wide, short tile the ring stands
 * beside a column with the day's count, the activity and the buttons (M).
 */
const ROOT =
	'flex h-full min-h-0 flex-col items-center gap-2 [@container(min-width:24rem)_and_(max-height:12.5rem)]:flex-row [@container(min-width:24rem)_and_(max-height:12.5rem)]:gap-6';
const RING_BOX =
	'relative min-h-0 w-full flex-1 [@container(min-width:24rem)_and_(max-height:12.5rem)]:h-full [@container(min-width:24rem)_and_(max-height:12.5rem)]:w-auto [@container(min-width:24rem)_and_(max-height:12.5rem)]:flex-none [@container(min-width:24rem)_and_(max-height:12.5rem)]:aspect-square';
const SIDE =
	'flex w-full shrink-0 flex-col items-center gap-2 [@container(min-width:24rem)_and_(max-height:12.5rem)]:min-w-0 [@container(min-width:24rem)_and_(max-height:12.5rem)]:flex-1 [@container(min-width:24rem)_and_(max-height:12.5rem)]:items-stretch [@container(min-width:24rem)_and_(max-height:12.5rem)]:justify-center';
const DETAILS =
	'hidden w-full items-center justify-between gap-2 text-xs text-muted-foreground [@container(min-height:12.5rem)]:flex [@container(min-width:24rem)]:flex';

export function PomodoroWidget({ store }: { store: BoardStore }) {
	useStore(store.state, (s) => s.widgetRevision);
	const [stats, setStats] = useState(false),
		[tags, setTags] = useState(false);
	const t = useT(),
		service = store.widgets.pomodoro,
		[open, setOpen] = useState(false),
		settings = useStore(store.state, (s) => s.settings);
	if (!service) return null;
	const state = service.getState(),
		displaySeconds = state.mode === 'stopwatch' ? state.elapsedSeconds : state.remainingSeconds,
		minutes = String(Math.floor(displaySeconds / 60)).padStart(2, '0'),
		seconds = String(displaySeconds % 60).padStart(2, '0');
	return (
		<>
			{tags && (
				<RecordDialog
					title={t('pomodoro.tagTitle')}
					classes="dashboard-pomodoro-stats-modal"
					onClose={() => setTags(false)}
				>
					<Suspense fallback={null}>
						<Tags service={service} close={() => setTags(false)} onChange={() => {}} />
					</Suspense>
				</RecordDialog>
			)}
			{stats && (
				<RecordDialog
					title={t('pomodoro.statsTitle')}
					classes="dashboard-pomodoro-stats-modal dashboard-pomodoro-stats-modal--wide"
					onClose={() => setStats(false)}
				>
					<Suspense fallback={null}>
						<Stats service={service} close={() => setStats(false)} />
					</Suspense>
				</RecordDialog>
			)}
			<WidgetActions>
				<IconButton label={t('pomodoro.statsTitle')} onClick={() => setStats(true)}>
					<BarChart2 />
				</IconButton>
				<IconButton label={t('home.dashboard.settings')} onClick={() => setOpen(true)}>
					<Settings />
				</IconButton>
			</WidgetActions>
			<div className={ROOT} data-pomodoro>
				<div className={RING_BOX}>
					<svg viewBox="0 0 72 72" className="absolute inset-0 size-full" aria-hidden>
						<circle cx="36" cy="36" r="33" strokeWidth="5" fill="none" className="stroke-muted" />
						<circle
							cx="36"
							cy="36"
							r="33"
							strokeWidth="5"
							fill="none"
							className="stroke-primary"
							strokeLinecap="round"
							strokeDasharray={RING}
							strokeDashoffset={RING * (1 - state.remainingSeconds / Math.max(1, state.totalSeconds))}
							transform="rotate(-90 36 36)"
						/>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
						<span
							className="leading-none font-semibold tabular-nums [font-size:clamp(1rem,min(15cqh,12cqw),2.25rem)]"
							data-pomodoro-time
						>
							{minutes}:{seconds}
						</span>
						{state.mode !== 'stopwatch' && (
							<div className="hidden gap-[3px] [@container(min-height:12.5rem)]:flex">
								{Array.from({ length: settings.pomodoroLongBreakInterval }, (_, i) => (
									<span
										key={i}
										className={`size-1.5 rounded-full ${i < state.completedWorkSessions ? 'bg-primary' : 'bg-muted'}`}
									/>
								))}
							</div>
						)}
					</div>
				</div>
				<div className={SIDE}>
					<div className={DETAILS}>
						<span className="shrink-0 tabular-nums">
							{t('pomodoro.today')} {service.getTodayCount()}
						</span>
						<Choice
							className="h-7 w-auto min-w-0 max-w-[65%] border-0 bg-transparent px-1 text-xs text-primary shadow-none data-[size=sm]:h-7"
							label={t('home.dashboard.activity')}
							value={service.getActivity() || '_none'}
							onChange={(value) => service.setActivity(value === '_none' ? '' : value)}
							options={[
								{ value: '_none', label: t('pomodoro.tapToSetActivity') },
								...service.getTags().map((tag) => ({ value: tag.name, label: tag.name })),
							]}
						/>
					</div>
					<div className="flex items-center justify-center gap-2">
						<Button
							size="sm"
							className="min-w-20"
							onClick={() => (state.status === 'running' ? service.pause() : service.start())}
						>
							{t(state.status === 'running' ? 'home.dashboard.pause' : 'home.dashboard.focus')}
						</Button>
						<IconButton label={t('home.dashboard.skip')} onClick={() => service.skip()}>
							<SkipForward />
						</IconButton>
					</div>
				</div>
			</div>
			{open && (
				<DashboardDialog
					title={t('home.dashboard.widget.pomodoro')}
					cancelLabel={t('common.close')}
					onClose={() => setOpen(false)}
				>
					<Choice
						label={t('home.dashboard.mode')}
						value={settings.pomodoroMode}
						onChange={(value) => {
							service.reset();
							void store.settings((s) => {
								s.pomodoroMode = value as 'countdown' | 'stopwatch';
							});
						}}
						options={['countdown', 'stopwatch'].map((value) => ({
							value,
							label: t(`home.dashboard.${value}`),
						}))}
					/>
					{(['pomodoroAutoStartBreak', 'pomodoroSoundEnabled', 'pomodoroMiniPanelEnabled'] as const).map(
						(key) => (
							<Label key={key} className="flex items-center gap-2">
								<Switch
									checked={settings[key]}
									onCheckedChange={(value) => {
										void store.settings((s) => {
											s[key] = value;
										});
									}}
								/>
								{t(`home.dashboard.${key}`)}
							</Label>
						),
					)}
					<div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
						{(
							[
								'pomodoroWorkMinutes',
								'pomodoroShortBreakMinutes',
								'pomodoroLongBreakMinutes',
								'pomodoroLongBreakInterval',
								'pomodoroDailyGoal',
								'pomodoroRemindInterval',
							] as const
						).map((key) => (
							<Label key={key} className="grid gap-1.5">
								{t(`home.dashboard.${key}`)}
								<Input
									type="number"
									min={1}
									value={settings[key]}
									onChange={(e) => {
										const value = Math.max(1, +e.target.value);
										void store.settings((s) => {
											s[key] = value;
										});
									}}
								/>
							</Label>
						))}
					</div>
					<Label className="grid gap-1.5">
						{t('home.dashboard.activity')}
						<Input
							defaultValue={service.getActivity()}
							onBlur={(e) => service.setActivity(e.target.value)}
						/>
					</Label>
					<Button variant="outline" onClick={() => setTags(true)}>
						{t('pomodoro.tagManage')}
					</Button>
				</DashboardDialog>
			)}
		</>
	);
}

import { useEffect, useState } from 'react';
import {
	AnalyticsChart,
	AnalyticsFrame,
	AnalyticsMetric,
	AnalyticsRangeControl,
	inAnalyticsRange,
	useAnalyticsRange,
} from '../../../../ui/components/huhu/analytics/Analytics';
import { analyticsDays, localDay } from '../../../../shared/analytics/range';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { t } from '../../../../shared/i18n';
import type { PomodoroService } from '../../platform/pomodoro/pomodoro-service';
import { RecordSaveStatus } from '../dialogs/RecordSaveStatus';

export function PomodoroStatsPanel({ service, close }: { service: PomodoroService; close?: () => void }) {
	const [, refresh] = useState(0),
		[activity, setActivity] = useState(''),
		[day, setDay] = useState(''),
		[error, setError] = useState('');
	useEffect(() => service.subscribe(() => refresh((n) => n + 1)), [service]);
	const records = service
		.getRecentRecords(Number.MAX_SAFE_INTEGER)
		.filter((r) => Number.isFinite(Date.parse(r.timestamp)));
	const dateOf = (timestamp: string) => localDay(new Date(timestamp));
	const range = useAnalyticsRange('week', records.map((r) => dateOf(r.timestamp)).sort()[0] ?? localDay(new Date()));
	const eligible = records.filter((r) => !activity || r.activity === activity);
	const selected = eligible.filter((r) => inAnalyticsRange(dateOf(r.timestamp), range.range));
	const previous = eligible.filter((r) =>
		inAnalyticsRange(dateOf(r.timestamp), { start: range.range.previousStart, end: range.range.previousEnd }),
	);
	const sum = (rows: typeof records) => rows.reduce((total, r) => total + r.duration, 0);
	const minutes = (value: number) => t('analytics.minutes', { count: Math.round(value * 10) / 10 });
	const days = analyticsDays(range.range),
		totals = days.map((d) => sum(selected.filter((r) => dateOf(r.timestamp) === d)));
	const activities = [...new Set(selected.map((r) => r.activity))].sort();
	const goal = service.getTodayGoal();
	const detail = day ? selected.filter((r) => dateOf(r.timestamp) === day) : selected;
	return (
		<AnalyticsFrame
			title={t('pomodoro.statsTitle')}
			close={close}
			toolbar={
				<>
					<AnalyticsRangeControl state={range} />
					<select
						className="h-9 max-w-48 rounded-md border border-input bg-background px-3 text-sm"
						aria-label={t('analytics.activity')}
						value={activity}
						onChange={(e) => {
							setActivity(e.target.value);
							setDay('');
						}}
					>
						<option value="">{t('analytics.allActivities')}</option>
						{[...new Set(records.map((r) => r.activity))].sort().map((a) => (
							<option key={a} value={a}>
								{a || t('analytics.activity')}
							</option>
						))}
					</select>
				</>
			}
		>
			<div className="grid grid-cols-2 gap-3 @min-[42rem]:grid-cols-4">
				<AnalyticsMetric
					label={t('analytics.focus')}
					value={minutes(sum(selected))}
					previous={minutes(sum(previous))}
				/>
				<AnalyticsMetric
					label={t('analytics.sessions')}
					value={String(selected.length)}
					previous={String(previous.length)}
				/>
				<AnalyticsMetric
					label={t('analytics.interruptions')}
					value={String(selected.reduce((n, r) => n + (r.interruptions ?? 0), 0))}
				/>
				<AnalyticsMetric
					label={t('analytics.break')}
					value={minutes(selected.reduce((n, r) => n + (r.breakMinutes ?? 0), 0))}
				/>
			</div>
			<section className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
				<label className="flex items-center gap-3 text-sm">
					{t('analytics.goal')}
					<Input
						type="number"
						min={1}
						max={16}
						className="w-20"
						defaultValue={goal.goal}
						onBlur={(e) => {
							const value = Number(e.target.value);
							if (!Number.isInteger(value) || value < 1 || value > 16) {
								e.target.value = String(goal.goal);
								return;
							}
							service.getGoalSettings().pomodoroDailyGoal = value;
							void service.saveGoalSettings().catch((reason: unknown) => setError(String(reason)));
						}}
					/>
				</label>
				<span className="text-sm tabular-nums text-muted-foreground">
					{goal.completed} / {goal.goal}
				</span>
				<RecordSaveStatus source={service} />
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
			</section>
			<div className="grid gap-4 @min-[42rem]:grid-cols-2">
				<AnalyticsChart
					title={t('analytics.trend')}
					labels={days}
					series={[{ name: t('analytics.focus'), values: totals }]}
					format={minutes}
					onSelect={setDay}
				/>
				<AnalyticsChart
					title={t('analytics.distribution')}
					labels={activities}
					series={[
						{
							name: t('analytics.focus'),
							values: activities.map((a) => sum(selected.filter((r) => r.activity === a))),
						},
					]}
					kind="doughnut"
					format={minutes}
					onSelect={setActivity}
				/>
			</div>
			<section className="rounded-lg border border-border p-4">
				<h3 className="mb-3 mt-0 text-sm font-semibold">{t('analytics.heatmap')}</h3>
				<div className="flex flex-wrap gap-1">
					{days.map((d, i) => (
						<Button
							key={d}
							size="icon-sm"
							variant={totals[i] ? 'default' : 'secondary'}
							className="h-8 w-8 text-[10px]"
							title={`${d} · ${minutes(totals[i] ?? 0)}`}
							aria-label={`${d} · ${minutes(totals[i] ?? 0)}`}
							onClick={() => setDay(d)}
						>
							{d.slice(-2)}
						</Button>
					))}
				</div>
			</section>
			<section className="rounded-lg border border-border p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="m-0 text-sm font-semibold">
						{t('analytics.details')}
						{day && ` · ${day}`}
					</h3>
					{day && (
						<Button variant="ghost" size="sm" onClick={() => setDay('')}>
							{t('analytics.overview')}
						</Button>
					)}
				</div>
				{detail.length ? (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr>
									<th className="py-2">{t('analytics.start')}</th>
									<th>{t('analytics.activity')}</th>
									<th>{t('analytics.focus')}</th>
									<th>{t('analytics.interruptions')}</th>
								</tr>
							</thead>
							<tbody>
								{detail.map((r, i) => (
									<tr key={`${r.timestamp}:${i}`} className="border-t border-border">
										<td className="py-3 tabular-nums">{new Date(r.timestamp).toLocaleString()}</td>
										<td>{r.activity || '—'}</td>
										<td>{minutes(r.duration)}</td>
										<td>{r.interruptions ?? 0}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">{t('analytics.empty')}</p>
				)}
			</section>
		</AnalyticsFrame>
	);
}

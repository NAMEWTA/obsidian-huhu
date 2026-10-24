// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/stats/StatsPane.tsx, UsageRecentSessionsTable.tsx, usage-overview-sections.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Bot, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import {
	AnalyticsChart,
	AnalyticsRangeControl,
	useAnalyticsRange,
} from '../../../../ui/components/huhu/analytics/Analytics';
import { analyticsDays } from '../../../../shared/analytics/range';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import { useT } from '../../../../ui/react/hooks';
import { useVisible } from '../../../../ui/react/contexts';
import { AGENT_CATALOG } from '../../core/launch/catalog';
import type { AgentId } from '../../core/launch/types';
import type { AgentController } from '../../services/controller';
import { aggregate, totalTokens } from '../../core/stats/aggregate';
import { UsageHeatmap } from './UsageHeatmap';
import { StatCard } from './StatCard';

import { useAgentSettings } from '../settings/settings-context';
export function UsageStatsPage({
	controller,
	provider: initial = 'all',
}: {
	controller: AgentController;
	provider?: string;
}) {
	const t = useT(),
		stats = useStore(controller.stats.store),
		history = useStore((controller.workspaceHistoryStore ?? controller.historyStore).store),
		settings = useAgentSettings(controller.settings),
		visible = useVisible();
	const range = useAnalyticsRange(
		'30',
		history.rows
			.filter((r) => r.inVault)
			.map((r) => new Date(r.modifiedAtMs).toISOString().slice(0, 10))
			.sort()[0] ?? new Date().toISOString().slice(0, 10),
	);
	const days = analyticsDays(range.range);
	const [provider, setProvider] = useState(initial),
		[cwd, setCwd] = useState('all');
	useEffect(() => {
		if (visible) void (controller.workspaceHistoryStore ?? controller.historyStore).refresh(false);
	}, [controller, visible]);
	const rows = useMemo(
		() =>
			history.rows.filter(
				(r) =>
					r.inVault &&
					(provider === 'all' || r.agentId === provider) &&
					settings.usageAnalytics[r.agentId as AgentId] &&
					(cwd === 'all' || r.cwd === cwd) &&
					new Date(r.modifiedAtMs).toISOString().slice(0, 10) >= range.range.start &&
					new Date(r.modifiedAtMs).toISOString().slice(0, 10) <= range.range.end,
			),
		[history.rows, provider, settings.usageAnalytics, cwd, range.range.start, range.range.end],
	);
	const summary = useMemo(() => aggregate(rows), [rows]);
	const disabled = provider !== 'all' && !settings.usageAnalytics[provider as AgentId];
	const format = useCallback(
		(value: number) =>
			new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value),
		[],
	);
	return (
		<div className="@container h-full space-y-5 overflow-y-auto p-5" data-usage-stats="">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold">{t('agent.workspace.nav.stats')}</h2>
				<Button
					variant="ghost"
					size="sm"
					disabled={history.loading}
					onClick={() => {
						void (controller.workspaceHistoryStore ?? controller.historyStore).refresh();
					}}
				>
					<RefreshCw
						className={history.loading ? 'size-3 animate-spin motion-reduce:animate-none' : 'size-3'}
					/>
					{t('agent.refresh')}
				</Button>
			</div>
			<div className="grid grid-cols-1 gap-3 @xl:grid-cols-3">
				<StatCard
					label={t('agent.stats.launched')}
					value={format(stats.agentsLaunched)}
					icon={<Bot className="size-4" />}
				/>
				<StatCard
					label={t('agent.stats.work')}
					value={t('agent.stats.hours', { hours: (stats.agentWorkMs / 3600000).toFixed(1) })}
					icon={<Clock className="size-4" />}
				/>
				<StatCard
					label={t('agent.stats.sessions')}
					value={String(history.rows.filter((r) => r.inVault).length)}
					icon={<MessageSquare className="size-4" />}
				/>
			</div>
			{stats.firstEventAt && (
				<p className="px-1 text-xs text-muted-foreground">
					{t('agent.stats.since', { date: new Date(stats.firstEventAt).toLocaleDateString() })}
				</p>
			)}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3 className="text-sm font-semibold">{t('agent.stats.analytics')}</h3>
				<Select value={provider} onValueChange={setProvider}>
					<SelectTrigger className="w-48" aria-label={t('agent.historyUI.agents')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t('agent.stats.overview')}</SelectItem>
						{AGENT_CATALOG.map((a) => (
							<SelectItem key={a.id} value={a.id}>
								{a.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{disabled ? (
				<Button
					variant="outline"
					onClick={() => {
						void controller.settings
							.update((d) => {
								d.usageAnalytics[provider as AgentId] = true;
							})
							.catch((e) => controller.workspace.report(e));
					}}
				>
					{t('agent.stats.enable', { name: AGENT_CATALOG.find((a) => a.id === provider)?.title || provider })}
				</Button>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-3">
						<AnalyticsRangeControl state={range} />
						<Select value={cwd} onValueChange={setCwd}>
							<SelectTrigger className="max-w-72" aria-label={t('agent.historyUI.group.cwd')}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t('agent.stats.allDirectories')}</SelectItem>
								{[...new Set(history.rows.filter((r) => r.inVault).map((r) => r.cwd))].map((dir) => (
									<SelectItem key={dir} value={dir || '/'}>
										{dir || '/'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{!rows.length ? (
						<div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 text-sm text-muted-foreground">
							{history.loading ? t('agent.historyUI.loading') : t('agent.stats.empty')}
						</div>
					) : (
						<>
							<div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
								{(
									[
										'total',
										'input',
										'output',
										'cacheRead',
										'cacheWrite',
										'reuse',
										'activeDays',
										'turns',
									] as const
								).map((key) => (
									<div key={key} className="rounded-lg border border-border/50 bg-card/60 px-4 py-3">
										<p className="text-lg font-semibold">
											{key === 'reuse'
												? `${Math.round((summary.totals.cacheRead / Math.max(1, summary.totals.input + summary.totals.cacheRead + summary.totals.cacheWrite)) * 100)}%`
												: format(
														key === 'activeDays' ? summary.activeDays : summary.totals[key],
													)}
										</p>
										<p className="text-xs text-muted-foreground">{t(`agent.stats.${key}`)}</p>
									</div>
								))}
							</div>
							<section className="rounded-lg border border-border bg-card p-4">
								<h3 className="mb-3 text-sm font-semibold">{t('agent.stats.heatmap')}</h3>
								<UsageHeatmap sessions={rows} now={Date.parse(range.range.end + 'T12:00:00Z')} range={range.range} format={format} />
							</section>
							<AnalyticsChart
								title={t('analytics.trend')}
								labels={days}
								series={[
									{
										name: t('agent.stats.total'),
										values: days.map((date) =>
											summary.buckets
												.filter((b) => b.date === date)
												.reduce((n, b) => n + b.total, 0),
										),
									},
								]}
								format={format}
							/>
							<div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
								{(['model', 'cwd'] as const).map((key) => {
									const groups = new Map<string, number>();
									for (const row of summary.buckets)
										groups.set(row[key], (groups.get(row[key]) ?? 0) + row.total);
									return (
										<section
											key={key}
											className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4"
										>
											<h3 className="text-sm font-semibold">{t(`agent.stats.by.${key}`)}</h3>
											{[...groups]
												.sort((a, b) => b[1] - a[1])
												.map(([name, total]) => (
													<div key={name} className="space-y-1">
														<div className="flex justify-between gap-2 text-xs">
															<span className="truncate">
																{name || t('agent.stats.unknown')}
															</span>
															<span>
																{Math.round(
																	(total / Math.max(1, summary.totals.total)) * 100,
																)}
																%
															</span>
														</div>
														<div className="h-1 rounded-full bg-muted">
															<div
																className="h-full rounded-full bg-[var(--chart-2)]"
																style={{
																	width: `${(total / Math.max(1, summary.totals.total)) * 100}%`,
																}}
															/>
														</div>
													</div>
												))}
										</section>
									);
								})}
							</div>
							<section className="rounded-lg border border-border/60 bg-card/40 p-4">
								<h3 className="text-sm font-semibold">{t('agent.stats.recent')}</h3>
								<p className="mb-3 text-xs text-muted-foreground">{t('agent.stats.costHint')}</p>
								<div className="overflow-x-auto">
									<table className="min-w-full text-sm">
										<thead>
											<tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
												{[
													'lastActive',
													'provider',
													'model',
													'cwd',
													'turns',
													'total',
													'cost',
												].map((key) => (
													<th key={key} className="px-2 py-2 font-medium">
														{t(`agent.stats.${key}`)}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{rows.slice(0, 100).map((row) => (
												<tr key={row.key} className="border-b border-border/40 last:border-b-0">
													<td className="px-2 py-2 text-muted-foreground">
														{new Date(row.modifiedAtMs).toLocaleDateString()}
													</td>
													<td className="px-2 py-2">{row.agentId}</td>
													<td className="px-2 py-2">
														{row.model || t('agent.stats.unknown')}
													</td>
													<td className="max-w-48 truncate px-2 py-2" title={row.cwd}>
														{row.cwd}
													</td>
													<td className="px-2 py-2">{row.messageCount}</td>
													<td className="px-2 py-2">{format(totalTokens(row.usage))}</td>
													<td className="px-2 py-2">
														{row.usage.cost === null ? '—' : row.usage.cost.toFixed(2)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>
						</>
					)}
				</>
			)}
			{history.error && (
				<p role="alert" className="text-sm text-destructive">
					{history.error}
				</p>
			)}
		</div>
	);
}

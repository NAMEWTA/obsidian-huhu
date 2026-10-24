import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chart } from 'chart.js';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { registerMessages, t } from '../../../../shared/i18n';
import { messages } from '../../../../shared/i18n/lazy/analytics';
import {
	analyticsRange,
	localDay,
	shiftAnalytics,
	type AnalyticsPeriod,
	type AnalyticsRange,
} from '../../../../shared/analytics/range';
import { useOwnerDocument, useVisible } from '../../../react/contexts';
import { Button } from '../../button';
import { Input } from '../../input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../select';
registerMessages(messages);

export function useAnalyticsRange(initial: AnalyticsPeriod, earliest: string) {
	const [period, setPeriod] = useState(initial),
		[anchor, setAnchor] = useState(() => localDay(new Date())),
		[custom, setCustom] = useState(() => ({ start: localDay(new Date()), end: localDay(new Date()) }));
	return {
		period,
		setPeriod,
		anchor,
		setAnchor,
		custom,
		setCustom,
		range: analyticsRange(period, anchor, earliest, custom),
	};
}
export function AnalyticsRangeControl({ state }: { state: ReturnType<typeof useAnalyticsRange> }) {
	return (
		<div className="flex flex-wrap items-center gap-2" data-analytics-range>
			<Select value={state.period} onValueChange={(value) => state.setPeriod(value as AnalyticsPeriod)}>
				<SelectTrigger className="w-36" aria-label={t('analytics.range')}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{(['day', 'week', 'month', 'year', '30', 'all', 'custom'] as const).map((key) => (
						<SelectItem key={key} value={key}>
							{t(`analytics.${key}`)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{state.period !== 'all' && state.period !== 'custom' && (
				<>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('analytics.previous')}
						onClick={() => state.setAnchor(shiftAnalytics(state.period, state.anchor, -1))}
					>
						<ChevronLeft />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('analytics.next')}
						onClick={() => state.setAnchor(shiftAnalytics(state.period, state.anchor, 1))}
					>
						<ChevronRight />
					</Button>
				</>
			)}
			{state.period === 'custom' ? (
				<>
					<Input
						type="date"
						className="w-40"
						aria-label={t('analytics.start')}
						value={state.custom.start}
						max={state.custom.end}
						onChange={(e) => {
							if (e.target.value) state.setCustom({ ...state.custom, start: e.target.value });
						}}
					/>
					<Input
						type="date"
						className="w-40"
						aria-label={t('analytics.end')}
						value={state.custom.end}
						min={state.custom.start}
						onChange={(e) => {
							if (e.target.value) state.setCustom({ ...state.custom, end: e.target.value });
						}}
					/>
				</>
			) : (
				<span className="text-xs tabular-nums text-muted-foreground">
					{state.range.start} — {state.range.end}
				</span>
			)}
		</div>
	);
}
export function AnalyticsFrame({
	title,
	close,
	toolbar,
	children,
	detail,
	back,
}: {
	title: string;
	close?: () => void;
	toolbar: ReactNode;
	children: ReactNode;
	detail?: boolean;
	back?: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 flex-col text-foreground" data-analytics>
			<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
				<div className="flex min-w-0 items-center gap-2">
					{detail && (
						<Button variant="ghost" size="icon-sm" onClick={back} aria-label={t('analytics.overview')}>
							<ArrowLeft />
						</Button>
					)}
					<h2 className="m-0 truncate text-base font-semibold">{title}</h2>
				</div>
				{close && (
					<Button variant="ghost" size="icon-sm" onClick={close} aria-label={t('ui.close')}>
						<X />
					</Button>
				)}
			</header>
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
				{toolbar}
			</div>
			<div className="@container min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
		</div>
	);
}
export function AnalyticsMetric({
	label,
	value,
	previous,
	onClick,
}: {
	label: string;
	value: string;
	previous?: string;
	onClick?: () => void;
}) {
	const content = (
		<>
			<span className="text-xs text-muted-foreground">{label}</span>
			<strong className="truncate text-2xl font-semibold tabular-nums">{value}</strong>
			{previous && (
				<span className="text-xs text-muted-foreground">{t('analytics.compare', { value: previous })}</span>
			)}
		</>
	);
	const classes = 'flex min-w-0 flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left';
	return onClick ? (
		<button
			type="button"
			onClick={onClick}
			className={`${classes} outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent/40`}
		>
			{content}
		</button>
	) : (
		<div className={classes}>{content}</div>
	);
}
export interface AnalyticsSeries {
	name: string;
	values: number[];
}
export function AnalyticsChart({
	title,
	labels,
	series,
	kind = 'bar',
	onSelect,
	format = String,
}: {
	title: string;
	labels: string[];
	series: AnalyticsSeries[];
	kind?: 'bar' | 'line' | 'doughnut';
	onSelect?: (label: string) => void;
	format?: (value: number) => string;
}) {
	const ref = useRef<HTMLCanvasElement>(null),
		doc = useOwnerDocument(),
		visible = useVisible(),
		[theme, setTheme] = useState(0),
		[error, setError] = useState('');
	useEffect(() => {
		const Observer = doc.defaultView?.MutationObserver;
		if (!Observer) return;
		const observer = new Observer(() => setTheme((n) => n + 1));
		observer.observe(doc.body, { attributes: true, attributeFilter: ['class', 'style'] });
		return () => observer.disconnect();
	}, [doc]);
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas || !visible || !labels.length) return;
		let disposed = false,
			chart: Chart | undefined;
		void import('chart.js/auto')
			.then(({ default: ChartJS }) => {
				if (disposed) return;
				const color = (name: string) => {
					const span = doc.createElement('span');
					span.style.color = `var(${name})`;
					canvas.parentElement!.append(span);
					const value = doc.defaultView!.getComputedStyle(span).color;
					span.remove();
					return value;
				};
				const foreground = color('--foreground'),
					muted = color('--muted-foreground'),
					colors = [1, 2, 3, 4, 5].map((n) => color(`--chart-${n}`));
				chart = new ChartJS(canvas, {
					type: kind,
					data: {
						labels,
						datasets: series.map((item, i) => ({
							label: item.name,
							data: item.values,
							borderColor: colors[i % colors.length],
							backgroundColor:
								kind === 'doughnut'
									? labels.map((_, j) => colors[j % colors.length]!)
									: colors[i % colors.length],
							borderWidth: kind === 'line' ? 2 : 0,
							borderRadius: kind === 'bar' ? 3 : undefined,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						animation: false,
						onClick: (_event, points) => {
							const label = labels[points[0]?.index ?? -1];
							if (label) onSelect?.(label);
						},
						plugins: {
							legend: {
								position: 'bottom',
								labels: {
									color: muted,
									boxWidth: 10,
									font: { family: doc.defaultView!.getComputedStyle(canvas).fontFamily },
								},
							},
							tooltip: {
								titleColor: foreground,
								bodyColor: foreground,
								backgroundColor: color('--popover'),
								borderColor: color('--border'),
								borderWidth: 1,
								callbacks: {
									label: (context) =>
										`${context.dataset.label ?? ''}: ${format(Number(context.raw))}`,
								},
							},
						},
						scales:
							kind === 'doughnut'
								? {}
								: {
										x: { ticks: { color: muted, maxTicksLimit: 12 }, grid: { display: false } },
										y: {
											beginAtZero: true,
											ticks: { color: muted },
											grid: { color: color('--border') },
										},
									},
					},
				});
			})
			.catch((reason: unknown) => {
				if (!disposed) setError(String(reason));
			});
		return () => {
			disposed = true;
			chart?.destroy();
		};
	}, [doc, visible, labels, series, kind, onSelect, theme, format]);
	return (
		<section className="min-w-0 rounded-lg border border-border bg-card p-4">
			<h3 className="mb-3 mt-0 text-sm font-semibold">{title}</h3>
			{labels.length ? (
				<>
					<div className="relative h-56">
						<canvas ref={ref} role="img" aria-label={title} />
					</div>
					<details className="mt-3 text-xs">
						<summary className="cursor-pointer text-muted-foreground">{t('analytics.data')}</summary>
						<div className="max-h-60 overflow-auto">
							<table className="w-full text-left">
								<thead>
									<tr>
										<th>{title}</th>
										{series.map((item) => (
											<th key={item.name}>{item.name}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{labels.map((label, i) => (
										<tr key={label} className="border-t border-border">
											<td>
												<Button size="sm" variant="ghost" onClick={() => onSelect?.(label)}>
													{label}
												</Button>
											</td>
											{series.map((item) => (
												<td key={item.name} className="tabular-nums">
													{format(item.values[i] ?? 0)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</>
			) : (
				<p className="text-sm text-muted-foreground">{t('analytics.empty')}</p>
			)}
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}
export function inAnalyticsRange(date: string, range: Pick<AnalyticsRange, 'start' | 'end'>) {
	return date >= range.start && date <= range.end;
}

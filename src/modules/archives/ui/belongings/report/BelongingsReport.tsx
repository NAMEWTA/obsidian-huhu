// Interaction adapted from yeshimei/bz (MIT), d76a0870329403247917a00c43019e203a2560a4.
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/report.ts
// Copyright (c) 2026 叫我包仔
// HUHU: React workbench, read-only owner queries, per-currency exact tables, retained results on errors.
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../../../ui/components/button';
import { Input } from '../../../../../ui/components/input';
import { Label } from '../../../../../ui/components/label';
import { EmptyState } from '../../../../../ui/components/huhu/EmptyState';
import { AnalyticsChart, AnalyticsMetric } from '../../../../../ui/components/huhu/analytics/Analytics';
import { useT } from '../../../../../ui/react/hooks';
import type { BelongingAnnualReport, BelongingMoney } from '../../../api';
import type { ArchivesApplication } from '../../../services/generic/application';
import { rt } from './report-i18n';

export default function BelongingsReport({ application, back }: { application: ArchivesApplication; back(this: void): void }) {
	useT();
	const id = useId(), [year, setYear] = useState(() => new Date().getFullYear()), [draft, setDraft] = useState(String(year)),
		[report, setReport] = useState<BelongingAnnualReport>(), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
	useEffect(() => {
		let disposed = false, generation = 0, scheduled = false;
		const load = async () => {
			const current = ++generation; setLoading(true);
			try {
				const value = await application.query.belongings({ year });
				if (!value.report || application.catalog.snapshot().diagnostics.some(item => item.code === 'read-failed')) throw new Error('Report unavailable');
				if (!disposed && current === generation) { setReport(value.report); setError(false); }
			} catch { if (!disposed && current === generation) setError(true); }
			finally { if (!disposed && current === generation) setLoading(false); }
		};
		// Runtime invalidations can occur before its load promise is installed.
		const release = application.runtime.subscribe(() => {
			if (scheduled || disposed) return;
			scheduled = true;
			void Promise.resolve().then(() => { scheduled = false; if (!disposed) void load(); });
		});
		if (retry) {
			setLoading(true);
			void application.runtime.reload().then(() => { if (!disposed) void load(); }).catch(() => { if (!disposed) { setError(true); setLoading(false); } });
		} else void load();
		return () => { disposed = true; release(); };
	}, [application, year, retry]);
	const yearInput = useRef<HTMLInputElement>(null);
	useEffect(() => { yearInput.current?.focus(); }, []);
	const amount = (value: BelongingMoney | null) => value ? `${value.currency} ${value.amount}` : rt('unknown');
	return <section data-belongings-report className="min-w-0 space-y-5 [overflow-wrap:anywhere] [&_button]:min-h-11 [&_summary]:min-h-11 [&_summary]:py-3" aria-busy={loading}>
		<header className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{rt('title')}</h2><p className="text-sm text-muted-foreground">{rt('policy')}</p></div><Button variant="outline" className="min-h-11 whitespace-normal" onClick={back}>{rt('back')}</Button></header>
		<form className="flex flex-wrap items-end gap-3" onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} onSubmit={event => { event.preventDefault(); const value = Number(draft); if (Number.isInteger(value) && value >= 100 && value <= 9999) { setYear(value); setRetry(value => value + 1); } }}>
			<div className="min-w-0 space-y-2"><Label htmlFor={id}>{rt('year')}</Label><Input ref={yearInput} id={id} type="number" min={100} max={9999} step={1} required value={draft} onChange={event => setDraft(event.target.value)} className="min-h-11 w-40 max-w-full" /></div><Button type="submit" className="min-h-11 whitespace-normal">{rt('update')}</Button>
		</form>
		{loading && <p role="status">{rt('loading')}</p>}
		{error && <div role="alert" className="space-y-2 rounded-lg border border-border bg-muted p-3"><p>{rt('error')}</p><Button className="min-h-11" variant="outline" onClick={() => setRetry(value => value + 1)}>{rt('retry')}</Button></div>}
		{report && <div data-report-result data-report-year={report.year} className="min-w-0 space-y-4">
			<p className="text-sm font-medium">{report.year} · {rt('cutoff', { date: report.asOf })}</p>
			{report.empty ? <EmptyState title={rt('empty')} description={rt('choose')} /> : <>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3"><AnalyticsMetric label={rt('overview')} value={`${report.purchasedCount} / ${report.exitedCount}`} />{(['purchased', 'recovered'] as const).map(key => <section key={key} className="min-w-0 space-y-2 rounded-lg border border-border bg-card p-4"><h3 className="text-xs text-muted-foreground">{rt(key === 'purchased' ? 'purchaseCost' : key)}</h3>{report.currencies.length ? report.currencies.map(group => <p key={group.currency} data-testid={`report-${key}-${group.currency}`} className="text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{group.currency} {group[key]}</p>) : <p>{rt('unknown')}</p>}</section>)}<AnalyticsMetric label={rt('median')} value={report.medianHeldDays === null ? rt('unknown') : String(report.medianHeldDays)} /></div>
				<p className="text-sm text-muted-foreground">{rt('cycles')}</p>
				<p className="text-sm text-muted-foreground">{rt('unknownHolding', { count: report.unknownHoldingDays })}</p>
				{report.unknownPurchases > 0 && <p>{rt('unknownPurchases', { count: report.unknownPurchases })}</p>}
				{report.unknownPurchaseDates > 0 && <p>{rt('unknownDates', { count: report.unknownPurchaseDates })}</p>}
				{report.unknownSaleCurrencies > 0 && <p>{rt('unknownCurrency', { count: report.unknownSaleCurrencies })}</p>}
				<div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-4">{report.currencies.map(group => <section key={group.currency} className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4">
					<h3 className="text-lg font-semibold">{group.currency}</h3>
					{group.unknownSales > 0 && <p>{rt('unknownSale', { count: group.unknownSales })}</p>}
					<AnalyticsChart title={`${rt('monthly')} · ${group.currency}`} labels={group.monthly.map((_, i) => String(i + 1))} series={[{ name: group.currency, values: group.monthly.map(Number) }]} />
					<p className="text-xs text-muted-foreground">{rt('chartNote')}</p>
					<table className="w-full table-fixed text-left text-sm"><caption className="sr-only">{rt('monthly')} · {group.currency}</caption><thead><tr><th scope="col">{rt('month')}</th><th scope="col">{group.currency}</th></tr></thead><tbody>{group.monthly.map((value, index) => <tr key={index} className="border-t border-border"><th scope="row">{index + 1}</th><td className="tabular-nums [overflow-wrap:anywhere]">{value}</td></tr>)}</tbody></table>
				</section>)}</div>
				<section className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"><h3>{rt('categories')}</h3><ul className="space-y-2">{report.categories.map(group => <li key={group.name} className="flex flex-wrap justify-between gap-2"><span>{group.name || rt('uncategorized')}</span><span>{group.count}</span></li>)}</ul></section>
				<section className="space-y-3"><h3>{rt('holding')}</h3><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3">{report.holdings.map(item => <article key={item.id} className="min-w-0 space-y-2 rounded-xl border border-border bg-card p-4"><h4 className="font-medium">{item.name}</h4><dl className="text-sm"><dt>{rt('days')}</dt><dd>{item.heldDays ?? rt('unknown')}</dd><dt>{rt('net')}</dt><dd>{amount(item.netCost)}</dd><dt>{rt('daily')}</dt><dd>{amount(item.dailyCost)}</dd></dl>{item.zeroDays && <p>{rt('zero')}</p>}{item.negativeNet && <p>{rt('negative')}</p>}{item.unknownSale && <p>{rt('unknownSale', { count: 1 })}</p>}</article>)}</div></section>
			</>}
		</div>}
	</section>;
}

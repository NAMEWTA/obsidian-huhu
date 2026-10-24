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
import { t } from '../../../../shared/i18n';
import type { ExpenseService } from '../../platform/expense/expense-service';
import { formatExpenseAmount, type ExpenseRecord, type ExpenseType } from '../../core/expense/model';
import { categoryLabel } from './expense-label';
import { ExpenseEntryPanel } from './ExpenseEntryPanel';
import { ledgerCsv } from './ledger-csv';
import { RecordSaveStatus } from '../dialogs/RecordSaveStatus';
import { RecordConfirm } from '../dialogs/RecordConfirm';

export function ExpenseStatsPanel({ service, close }: { service: ExpenseService; close?: () => void }) {
	const [, refresh] = useState(0),
		[type, setType] = useState<ExpenseType | ''>(''),
		[category, setCategory] = useState(''),
		[level, setLevel] = useState<'primary' | 'secondary'>('secondary'),
		[day, setDay] = useState(''),
		[editing, setEditing] = useState<ExpenseRecord | null>(null),
		[deleting, setDeleting] = useState<string | null>(null);
	useEffect(() => service.subscribe(() => refresh((n) => n + 1)), [service]);
	const records = service.getRecords(),
		range = useAnalyticsRange('month', records.map((r) => r.date).sort()[0] ?? localDay(new Date()));
	const keyOf = (r: ExpenseRecord) =>
		level === 'primary'
			? (service.getCategoryParent(r.type, r.category) ?? t('expense.cat.ungrouped'))
			: r.category;
	const eligible = records.filter((r) => (!type || r.type === type) && (!category || keyOf(r) === category));
	const selected = eligible.filter((r) => inAnalyticsRange(r.date, range.range)),
		previous = eligible.filter((r) =>
			inAnalyticsRange(r.date, { start: range.range.previousStart, end: range.range.previousEnd }),
		);
	const total = (rows: ExpenseRecord[], kind: ExpenseType) =>
		rows.filter((r) => r.type === kind).reduce((n, r) => n + Math.round(r.amount * 100), 0) / 100;
	const money = (n: number) => `${service.getCurrency()}${formatExpenseAmount(n)}`;
	const days = analyticsDays(range.range),
		cats = [...new Set(selected.map(keyOf))].sort(),
		detail = day ? selected.filter((r) => r.date === day) : selected;
	const net = (rows: ExpenseRecord[]) =>
		(Math.round(total(rows, 'income') * 100) - Math.round(total(rows, 'expense') * 100)) / 100;
	const label = (key: string) => (level === 'primary' ? key : categoryLabel(key));
	return (
		<AnalyticsFrame
			title={t('expense.statsTitle')}
			close={close}
			detail={!!editing}
			back={() => setEditing(null)}
			toolbar={
				<>
					<AnalyticsRangeControl state={range} />
					<Button
						variant="outline"
						size="sm"
						disabled={!detail.length}
						onClick={() => {
							void ledgerCsv(service).exportCsv(detail);
						}}
					>
						{t('analytics.export')}
					</Button>
				</>
			}
		>
			{editing ? (
				<ExpenseEntryPanel
					key={editing.id}
					service={service}
					initial={editing}
					close={() => setEditing(null)}
					onSave={(input) => !!service.updateRecord(editing.id, input)}
				/>
			) : (
				<>
					<div className="flex flex-wrap gap-2">
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
							aria-label={t('analytics.allTypes')}
							value={type}
							onChange={(e) => {
								setType(e.target.value as ExpenseType | '');
								setCategory('');
							}}
						>
							<option value="">{t('analytics.allTypes')}</option>
							{(['income', 'expense'] as const).map((kind) => (
								<option key={kind} value={kind}>
									{t(`expense.${kind}Label`)}
								</option>
							))}
						</select>
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
							aria-label={t('analytics.primary')}
							value={level}
							onChange={(e) => {
								setLevel(e.target.value as typeof level);
								setCategory('');
							}}
						>
							<option value="secondary">{t('analytics.secondary')}</option>
							<option value="primary">{t('analytics.primary')}</option>
						</select>
						<select
							className="h-9 max-w-52 rounded-md border border-input bg-background px-3 text-sm"
							aria-label={t('analytics.allCategories')}
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="">{t('analytics.allCategories')}</option>
							{[...new Set(records.filter((r) => !type || r.type === type).map(keyOf))]
								.sort()
								.map((c) => (
									<option key={c} value={c}>
										{label(c)}
									</option>
								))}
						</select>
						<RecordSaveStatus source={service} />
					</div>
					<div className="grid grid-cols-2 gap-3 @min-[42rem]:grid-cols-4">
						{(['income', 'expense'] as const).map((kind) => (
							<AnalyticsMetric
								key={kind}
								label={t(`expense.${kind}Label`)}
								value={money(total(selected, kind))}
								previous={money(total(previous, kind))}
								onClick={() => setType(type === kind ? '' : kind)}
							/>
						))}
						<AnalyticsMetric
							label={t('analytics.net')}
							value={money(net(selected))}
							previous={money(net(previous))}
						/>
						<AnalyticsMetric
							label={t('analytics.count')}
							value={String(selected.length)}
							previous={String(previous.length)}
						/>
					</div>
					<div className="grid gap-4 @min-[42rem]:grid-cols-2">
						<AnalyticsChart
							title={t('analytics.trend')}
							labels={days}
							series={(['income', 'expense'] as const)
								.filter((kind) => !type || type === kind)
								.map((kind) => ({
									name: t(`expense.${kind}Label`),
									values: days.map((d) =>
										total(
											selected.filter((r) => r.date === d),
											kind,
										),
									),
								}))}
							format={money}
							onSelect={setDay}
						/>
						<AnalyticsChart
							title={t('analytics.distribution')}
							labels={cats.map(label)}
							series={[
								{
									name: t('analytics.distribution'),
									values: cats.map(
										(c) =>
											selected
												.filter((r) => keyOf(r) === c)
												.reduce((n, r) => n + Math.round(r.amount * 100), 0) / 100,
									),
								},
							]}
							kind="doughnut"
							format={money}
							onSelect={(value) => setCategory(cats.find((c) => label(c) === value) ?? '')}
						/>
					</div>
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
							<div className="overflow-auto">
								<table className="w-full text-left text-sm">
									<thead>
										<tr>
											<th className="py-2">{t('expense.dateLabel')}</th>
											<th>{t('analytics.allTypes')}</th>
											<th>{t('analytics.distribution')}</th>
											<th>{t('expense.colAmount')}</th>
											<th>{t('expense.colNote')}</th>
											<th className="sr-only">{t('analytics.edit')}</th>
										</tr>
									</thead>
									<tbody>
										{[...detail]
											.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
											.map((r) => (
												<tr key={r.id} className="border-t border-border">
													<td className="py-2 tabular-nums">{r.date}</td>
													<td>{t(`expense.${r.type}Label`)}</td>
													<td>{categoryLabel(r.category)}</td>
													<td className="tabular-nums">{money(r.amount)}</td>
													<td className="max-w-48 truncate">{r.note || '—'}</td>
													<td>
														<div className="flex gap-1">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setEditing(r)}
															>
																{t('analytics.edit')}
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setDeleting(r.id)}
															>
																{t('expense.deleteRecord')}
															</Button>
														</div>
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">{t('analytics.empty')}</p>
						)}
					</section>
				</>
			)}
			{deleting && (
				<RecordConfirm
					title={t('expense.ledger.batchDeleteTitle')}
					open
					onOpenChange={(open) => {
						if (!open) setDeleting(null);
					}}
					description={t('expense.ledger.batchDeleteMessage', { n: 1 })}
					onConfirm={() => {
						service.deleteRecord(deleting);
						setDeleting(null);
					}}
				/>
			)}
		</AnalyticsFrame>
	);
}

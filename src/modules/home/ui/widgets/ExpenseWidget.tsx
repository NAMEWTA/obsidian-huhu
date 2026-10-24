// Adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), src/expense-widget.ts; card layout after the shadcn/ui dashboard blocks (MIT).
import { lazy, Suspense, useState } from 'react';
import { useStore } from 'zustand';
import { ArrowDownRight, ArrowUpRight, ChartColumn, CalendarPlus } from 'lucide-react';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import { Progress } from '../../../../ui/components/progress';
import { ToggleGroup, ToggleGroupItem } from '../../../../ui/components/toggle-group';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { todayStr } from '../../core/habit/model';
import { windowFor } from '../../core/expense/expense-period';
import { sanitizeAmountInput } from '../../core/expense/model';
import { Choice, IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { ExpenseEntryPanel } from '../expense/ExpenseEntryPanel';
import { RecordDialog } from '../dialogs/RecordDialog';
const Categories = lazy(() =>
	import('../expense/ExpenseCategoryPanel').then((m) => ({ default: m.ExpenseCategoryPanel })),
);
const Stats = lazy(() => import('../expense/ExpenseStatsPanel').then((m) => ({ default: m.ExpenseStatsPanel })));
type Kind = 'expense' | 'income';
const money = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/**
 * Spending at a glance. The small tile shows this month's spending and today's net; from 20rem wide a quick-entry form
 * joins it, and a tall tile lists the month's biggest categories.
 */
export function ExpenseWidget({ store }: { store: BoardStore }) {
	useStore(store.state, (s) => s.widgetRevision);
	const [stats, setStats] = useState(false),
		[manage, setManage] = useState(false),
		[backfill, setBackfill] = useState(false);
	const t = useT(),
		service = store.widgets.expense,
		[type, setType] = useState<Kind>('expense'),
		[amount, setAmount] = useState(''),
		[categories, setCategories] = useState({ expense: '', income: '' }),
		[note, setNote] = useState(''),
		[invalid, setInvalid] = useState(false);
	if (!service) return null;
	const today = todayStr(),
		month = windowFor('month', today, today),
		monthly = service.getRangeTotals(month.curStart, month.curEnd),
		daily = service.getTodayTotals(),
		currency = service.getCurrency(),
		options = service.getOrderedCategories(type),
		category = categories[type] || options[0] || '',
		label = (key: string) => (t(`expense.cat.${key}`) === `expense.cat.${key}` ? key : t(`expense.cat.${key}`)),
		breakdown = [...service.getCategoryBreakdown(month.curStart, month.curEnd, 'expense')]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 6);
	const submit = () => {
		const result = service.addRecord({ type, amount: +amount, category, note, date: today });
		setInvalid(!result);
		if (result) {
			setAmount('');
			setNote('');
		}
	};
	return (
		<div
			data-expense
			className="grid h-full min-h-0 grid-cols-1 content-start gap-x-4 gap-y-3 @xs:grid-cols-[11rem_minmax(0,1fr)] @3xl:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)]"
		>
			{manage && (
				<RecordDialog
					title={t('expense.cat.manageTitle')}
					classes="dashboard-expense-stats-modal"
					onClose={() => setManage(false)}
				>
					<Suspense fallback={null}>
						<Categories service={service} close={() => setManage(false)} />
					</Suspense>
				</RecordDialog>
			)}
			{stats && (
				<RecordDialog
					title={t('expense.statsTitle')}
					classes="dashboard-expense-stats-modal dashboard-expense-stats-modal--wide"
					onClose={() => setStats(false)}
				>
					<Suspense fallback={null}>
						<Stats service={service} close={() => setStats(false)} />
					</Suspense>
				</RecordDialog>
			)}
			{backfill && (
				<RecordDialog
					title={t('expense.backfillTitle')}
					classes="dashboard-library-config-modal"
					onClose={() => setBackfill(false)}
				>
					<ExpenseEntryPanel
						service={service}
						close={() => setBackfill(false)}
						onSave={(input) => !!service.addRecord(input)}
					/>
				</RecordDialog>
			)}
			<WidgetActions>
				<IconButton label={t('expense.statsTitle')} onClick={() => setStats(true)}>
					<ChartColumn />
				</IconButton>
				<IconButton label={t('expense.backfillTitle')} onClick={() => setBackfill(true)}>
					<CalendarPlus />
				</IconButton>
			</WidgetActions>
			<div className="flex min-w-0 flex-col justify-center gap-0.5">
				<span className="text-xs text-muted-foreground">{t('expense.monthSpent')}</span>
				<span
					data-testid="expense-month"
					className="truncate text-3xl leading-9 font-semibold tabular-nums"
					title={`${currency}${money(monthly.expense)}`}
				>
					{currency}
					{money(monthly.expense)}
				</span>
				<span className="truncate text-xs text-muted-foreground tabular-nums">
					{t('home.dashboard.today')} {daily.expense || daily.income ? '' : '—'}
					{daily.expense > 0 && `−${currency}${money(daily.expense)}`}
					{daily.expense > 0 && daily.income > 0 && ' · '}
					{daily.income > 0 && `+${currency}${money(daily.income)}`}
				</span>
			</div>
			<div data-expense-form className="hidden min-w-0 flex-col justify-center gap-2 @xs:flex">
				<div className="flex min-w-0 items-center gap-2">
					<ToggleGroup
						type="single"
						variant="outline"
						value={type}
						aria-label={t('home.dashboard.category')}
						onValueChange={(value) => {
							if (value === 'expense' || value === 'income') setType(value);
						}}
					>
						<ToggleGroupItem value="expense" aria-label={t('home.dashboard.expense')}>
							<ArrowDownRight className="text-destructive" />
						</ToggleGroupItem>
						<ToggleGroupItem value="income" aria-label={t('home.dashboard.income')}>
							<ArrowUpRight className="text-primary" />
						</ToggleGroupItem>
					</ToggleGroup>
					<div className="relative min-w-0 flex-1">
						<span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
							{currency}
						</span>
						<Input
							aria-label={t('expense.colAmount')}
							aria-invalid={invalid}
							inputMode="decimal"
							placeholder="0.00"
							className="pl-8 tabular-nums"
							value={amount}
							onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
							}}
						/>
					</div>
					<Choice
						className="w-32 min-w-0 shrink-0 data-[size=sm]:h-9"
						label={t('home.dashboard.category')}
						value={category}
						onChange={(value) => {
							if (value === '_manage') setManage(true);
							else setCategories({ ...categories, [type]: value });
						}}
						options={[
							...options.map((value) => ({ value, label: label(value) })),
							{ value: '_manage', label: t('expense.cat.manageOption') },
						]}
					/>
				</div>
				<div className="flex min-w-0 items-center gap-2">
					<Input
						aria-label={t('expense.notePlaceholder')}
						placeholder={t('expense.notePlaceholder')}
						value={note}
						className="min-w-0 flex-1"
						onChange={(e) => setNote(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
						}}
					/>
					<Button onClick={submit}>{t('expense.submit')}</Button>
				</div>
			</div>
			<div
				data-expense-breakdown
				className="col-span-full hidden min-w-0 flex-col gap-2 [@container(min-height:232px)]:flex @3xl:col-span-1 @3xl:flex"
			>
				<span className="text-xs font-medium text-muted-foreground">{t('expense.topCategories')}</span>
				{breakdown.length === 0 ? (
					<span className="text-xs text-muted-foreground">{t('expense.noSpending')}</span>
				) : (
					breakdown.map(([key, value], index) => (
						<div
							key={key}
							className={cn(
								'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1',
								index >= 4 && 'hidden @3xl:grid',
							)}
						>
							<span className="truncate text-sm">{label(key)}</span>
							<span className="text-sm tabular-nums">
								{currency}
								{money(value)}
							</span>
							<Progress
								value={monthly.expense > 0 ? (value / monthly.expense) * 100 : 0}
								className={cn('col-span-2 h-1.5')}
								aria-label={label(key)}
							/>
						</div>
					))
				)}
			</div>
		</div>
	);
}

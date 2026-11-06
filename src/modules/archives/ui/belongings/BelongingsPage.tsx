// Interaction/layout adapted from yeshimei/bz (MIT), d76a0870329403247917a00c43019e203a2560a4.
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/layouts/poster/render.ts
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/ui.ts
// Copyright (c) 2026 叫我包仔
// HUHU: React/semantic tokens, archive commands, exact shared statistics and owner-authorized compensation.
import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { DateField } from '../../../../ui/components/huhu/date';
import { Label } from '../../../../ui/components/label';
import { Badge } from '../../../../ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { t } from '../../../../shared/i18n';
import { publishFeedback } from '../../../../host/obsidian/feedback';
import { ArchiveError } from '../../core/schema/model';
import { BELONGING_STATUSES } from '../../core/belongings/lifecycle';
import { BELONGING_TYPE_ID } from '../../api';
import type {
	BelongingMetrics,
	BelongingMoney,
	BelongingStatus,
	BelongingsQueryResult,
	UndoBelonging,
} from '../../api';
import type { ArchivesApplication } from '../../services/generic/application';
import { belongingToday } from '../../services/generic/belongings';

import { rt } from './report/report-i18n';
const BelongingsReport = lazy(() => import('./report/BelongingsReport'));

export const bt = (key: string) => t(`archives.belongings.${key}`);
const statusText = (status: BelongingStatus) =>
	t(`archives.preset.belonging${status[0]!.toUpperCase()}${status.slice(1)}`);
const amount = (value?: BelongingMoney | null) => (value ? `${value.currency} ${value.amount}` : bt('unknown'));
async function readBelongings(application: ArchivesApplication): Promise<BelongingsQueryResult> {
	const result = await application.query.belongings();
	if (application.catalog.snapshot().diagnostics.some((diagnostic) => diagnostic.code === 'read-failed'))
		throw new ArchiveError('read-failed');
	return result;
}
function Choice({
	label,
	value,
	options,
	onChange,
	disabled,
}: {
	label: string;
	value: string;
	options: Array<[string, string]>;
	onChange(this: void, value: string): void;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<div className="min-w-0 space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger id={id} className=" w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map(([value, text]) => (
						<SelectItem key={value} value={value}>
							{text}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
function Metrics({ metric, detail = false }: { metric?: BelongingMetrics; detail?: boolean }) {
	return (
		<dl className="grid min-w-0 gap-2 text-sm [overflow-wrap:anywhere]">
			<dt className="text-muted-foreground">{bt('netCost')}</dt>
			<dd data-testid={detail ? 'detail-net-cost' : 'card-net-cost'}>{amount(metric?.netCost)}</dd>
			<dt className="text-muted-foreground">{bt('heldDays')}</dt>
			<dd>{metric?.heldDays ?? bt('impreciseDate')}</dd>
			<dt className="text-muted-foreground">{bt('dailyCost')}</dt>
			<dd>{amount(metric?.dailyCost)}</dd>
			{metric?.zeroDays && <dd>{bt('zeroDays')}</dd>}
			{metric?.negativeNet && <dd>{bt('negativeNet')}</dd>}
			{metric?.unknownSale && <dd>{bt('unknownSale')}</dd>}
		</dl>
	);
}
export function BelongingsPage({
	application,
	owner,
	selectedId,
	search,
	setSearch,
	select,
	edit,
}: {
	application: ArchivesApplication;
	owner: HTMLElement;
	selectedId?: string;
	search: string;
	setSearch(this: void, value: string): void;
	select(this: void, id?: string): void;
	edit(this: void): void;
}) {
	useT();
	const [reportOpen, setReportOpen] = useState(false);
	const reportButton = useRef<HTMLButtonElement>(null),
		wasReportOpen = useRef(false);
	useEffect(() => {
		if (!reportOpen && wasReportOpen.current) reportButton.current?.focus();
		wasReportOpen.current = reportOpen;
	}, [reportOpen]);
	const [result, setResult] = useState<BelongingsQueryResult>(),
		[loading, setLoading] = useState(true),
		[error, setError] = useState(''),
		[status, setStatus] = useState('all'),
		[year, setYear] = useState('all'),
		[sort, setSort] = useState('recent'),
		[transition, setTransition] = useState<BelongingStatus>(),
		[date, setDate] = useState(belongingToday),
		[exitDate, setExitDate] = useState(''),
		[sale, setSale] = useState(''),
		[currency, setCurrency] = useState('CNY'),
		[busy, setBusy] = useState(false),
		[undo, setUndo] = useState<UndoBelonging>(),
		[outcome, setOutcome] = useState(''),
		[compact, setCompact] = useState(false);
	const root = useRef<HTMLElement>(null);
	const lifetime = useRef<AbortController | undefined>(undefined),
		refresh = useRef(0),
		submitting = useRef(false),
		formId = useId();
	useEffect(() => {
		const node = root.current;
		if (!node) return;
		const measure = () => setCompact(node.getBoundingClientRect().width < 300);
		measure();
		const Observer = node.ownerDocument.defaultView?.ResizeObserver;
		const observer = Observer ? new Observer(measure) : undefined;
		observer?.observe(node);
		return () => observer?.disconnect();
	}, [reportOpen]);
	useEffect(() => {
		const controller = new AbortController();
		lifetime.current = controller;
		const load = async () => {
			const generation = ++refresh.current;
			setLoading(true);
			try {
				const value = await readBelongings(application);
				if (!controller.signal.aborted && generation === refresh.current) {
					setResult(value);
					setError('');
				}
			} catch {
				if (!controller.signal.aborted && generation === refresh.current) setError('loadFailed');
			} finally {
				if (!controller.signal.aborted && generation === refresh.current) setLoading(false);
			}
		};
		let scheduled = false;
		// Runtime emits while entering its loader. Defer reads until its load promise is installed.
		const release = application.runtime.subscribe(() => {
			if (scheduled || controller.signal.aborted) return;
			scheduled = true;
			void Promise.resolve().then(() => {
				scheduled = false;
				if (!controller.signal.aborted) void load();
			});
		});
		void load();
		return () => {
			controller.abort();
			release();
		};
	}, [application]);
	const selected = result?.items.find((item) => item.id === selectedId),
		metrics = new Map(result?.statistics.items.map((metric) => [metric.id, metric])),
		summary = result?.statistics.summary;
	const years = [
		...new Set(result?.items.flatMap((item) => (item.purchaseDate ? [item.purchaseDate.slice(0, 4)] : []))),
	]
		.sort()
		.reverse();
	const items =
		result?.items
			.filter(
				(item) =>
					metrics.has(item.id) &&
					(status === 'all' || metrics.get(item.id)?.status === status) &&
					(year === 'all' || item.purchaseDate?.startsWith(year)) &&
					`${item.name} ${item.category} ${item.specification ?? ''} ${item.notes ?? ''}`
						.toLocaleLowerCase()
						.includes(search.trim().toLocaleLowerCase()),
			)
			.sort((a, b) =>
				sort === 'name'
					? a.name.localeCompare(b.name)
					: (sort === 'oldest' ? 1 : -1) * (a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? '') ||
						a.id.localeCompare(b.id),
			) ?? [];
	const operate = async (action: 'transition' | 'undo' | 'install') => {
		const signal = lifetime.current?.signal;
		if (!signal || signal.aborted || submitting.current) return;
		if (action === 'transition' && (!selected || !transition)) return;
		if (action === 'undo' && !undo) return;
		submitting.current = true;
		setBusy(true);
		setError('');
		const operationId = action === 'undo' ? undo!.operationId : crypto.randomUUID();
		const win = owner.ownerDocument.defaultView;
		if (win)
			publishFeedback(win, {
				source: 'archives-belongings',
				operationId,
				message: { key: 'archives.belongings.saving' },
				progress: { completed: 0, total: 1 },
			});
		try {
			if (action === 'install') await application.commands.belongings.install(signal);
			else {
				const receipt =
					action === 'undo'
						? await application.commands.belongings.undo(undo!, signal)
						: await application.commands.belongings.transition(
								{
									operationId,
									id: selected!.id,
									expectedHash: selected!.contentHash,
									status: transition!,
									date,
									...(['sold', 'discard'].includes(transition!) ? { exitDate } : {}),
									...(transition === 'sold'
										? { sale: sale.trim() ? { amount: sale.trim(), currency } : null }
										: {}),
								},
								signal,
							);
				if (!signal.aborted)
					setUndo(
						action === 'undo'
							? undefined
							: {
									operationId: crypto.randomUUID(),
									originalOperationId: operationId,
									id: receipt.id,
									expectedHash: receipt.contentHash,
								},
					);
			}
			if (!signal.aborted) {
				setTransition(undefined);
				setOutcome(action === 'undo' ? 'undone' : 'saved');
				if (win)
					publishFeedback(win, {
						source: 'archives-belongings',
						operationId,
						message: { key: `archives.belongings.${action === 'undo' ? 'undone' : 'saved'}` },
						outcome: 'success',
						receipt: { committed: true },
					});
				try {
					const value = await readBelongings(application);
					if (!signal.aborted) setResult(value);
				} catch {
					if (!signal.aborted) setError('loadFailed');
				}
			}
		} catch (error) {
			if (!signal.aborted) {
				const key =
					error instanceof ArchiveError &&
					['write-conflict', 'field-conflict', 'command-id-conflict'].includes(error.code)
						? 'conflict'
						: error instanceof ArchiveError && error.code === 'belonging-undo-expired'
							? 'undoExpired'
							: 'operationFailed';
				setError(key);
				if (win)
					publishFeedback(win, {
						source: 'archives-belongings',
						operationId,
						message: { key: `archives.belongings.${key}` },
						outcome: 'failed',
					});
			}
		} finally {
			submitting.current = false;
			if (!signal.aborted) setBusy(false);
		}
	};
	const start = (next: BelongingStatus) => {
		setTransition(next);
		setError('');
		setDate(belongingToday());
		setExitDate(selected?.exitDate || belongingToday());
		setSale(selected?.sale?.amount ?? '');
		setCurrency(selected?.sale?.currency ?? selected?.purchase?.currency ?? 'CNY');
	};
	if (reportOpen)
		return (
			<Suspense fallback={<p role="status">{rt('loading')}</p>}>
				<BelongingsReport application={application} back={() => setReportOpen(false)} />
			</Suspense>
		);
	return (
		<section
			ref={root}
			data-belongings-page
			className="min-w-0 space-y-5 [overflow-wrap:anywhere]"
			aria-busy={busy || loading}
		>
			<header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-xl font-semibold">{bt('title')}</h2>
					<p className="text-sm text-muted-foreground">{bt('subtitle')}</p>
				</div>
				<Button
					ref={reportButton}
					variant="secondary"
					className=" whitespace-normal"
					onClick={() => setReportOpen(true)}
				>
					{rt('title')}
				</Button>
				<Button
					className=" whitespace-normal"
					onClick={edit}
					disabled={busy || !application.runtime.index.definition(BELONGING_TYPE_ID)}
				>
					{selectedId ? bt('edit') : bt('add')}
				</Button>
			</header>
			{error && (
				<div role="alert" className="space-y-2 rounded-lg border border-border bg-muted p-3">
					<p>{bt(error)}</p>
					{error === 'loadFailed' && (
						<Button
							onClick={() => {
								void application.runtime.reload().catch(() => setError('loadFailed'));
							}}
						>
							{bt('retry')}
						</Button>
					)}
				</div>
			)}
			{outcome && (
				<div role="status" className="flex flex-wrap items-center gap-3">
					<p>{bt(outcome)}</p>
					{undo && (
						<Button
							className=" whitespace-normal"
							disabled={busy}
							onClick={() => {
								void operate('undo');
							}}
						>
							{bt('undo')}
						</Button>
					)}
				</div>
			)}
			{loading && <p role="status">{bt('loading')}</p>}
			{summary && (
				<div
					data-belongings-kpis
					className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3"
				>
					{(
						[
							['stock', String(summary.inStock)],
							[
								'inventory',
								summary.currencies.map((group) => (
									<p key={group.currency} data-testid={`inventory-${group.currency}`}>
										{group.currency} {group.inventory}
									</p>
								)),
							],
							[
								'dailyCost',
								summary.currencies.map((group) => (
									<p key={group.currency}>
										{group.currency} {group.dailyCost}
										{group.unknownDaily > 0 && (
											<small className="block">
												{bt('unknownExcluded')} {group.unknownDaily}
											</small>
										)}
									</p>
								)),
							],
							[
								'exited',
								<div key="exited">
									{summary.exited}
									{result?.statistics.currencies.map((group) => (
										<p key={group.currency}>
											{group.currency} {group.recovered}
										</p>
									))}
								</div>,
							],
						] satisfies Array<[string, ReactNode]>
					).map(([key, value]) => (
						<section key={key} className="min-w-0 rounded-xl border border-border bg-card p-4">
							<h3 className="text-sm text-muted-foreground">{bt(key)}</h3>
							<div className="text-xl tabular-nums">{value}</div>
						</section>
					))}
				</div>
			)}
			<p className="text-xs text-muted-foreground">{bt('moneyPolicy')}</p>
			{selectedId ? (
				<>
					<Button variant="secondary" disabled={busy} onClick={() => select()}>
						{bt('back')}
					</Button>
					{selected ? (
						<article
							data-belongings-detail
							className={`min-w-0 space-y-4 rounded-xl border border-border bg-card ${compact ? 'p-2' : 'p-4'}`}
						>
							<h3 className="text-lg font-semibold">{selected.name}</h3>
							<Badge>{statusText(metrics.get(selected.id)?.status ?? selected.status)}</Badge>
							<dl className="space-y-2 text-sm">
								{[
									['purchase', amount(selected.purchase)],
									['purchaseDate', selected.purchaseDate || bt('unknown')],
									['exitDate', selected.exitDate || bt('unknown')],
									['sale', amount(selected.sale)],
									['category', selected.category],
									['specification', selected.specification],
									['notes', selected.notes],
									['receipt', selected.receipt],
								].map(([key, value]) => (
									<div key={key}>
										<dt className="text-muted-foreground">{bt(key!)}</dt>
										<dd className="whitespace-pre-wrap">{value || bt('unknown')}</dd>
									</div>
								))}
							</dl>
							{[selected.ownerId, selected.companyId, ...(selected.relatedPeople ?? [])]
								.filter((id): id is string => !!id)
								.map((id) => (
									<Button
										key={id}
										variant="ghost"
										className=" max-w-full whitespace-normal [overflow-wrap:anywhere]"
										onClick={() => select(id)}
									>
										{bt('related')} {id}
									</Button>
								))}
							<Metrics metric={metrics.get(selected.id)} detail />
							<div className="flex flex-wrap gap-2" aria-label={bt('transition')}>
								{BELONGING_STATUSES.map((next) => (
									<Button
										key={next}
										variant="secondary"
										className=" whitespace-normal"
										disabled={
											busy || (next === selected.status && !['sold', 'discard'].includes(next))
										}
										onClick={() => start(next)}
									>
										{statusText(next)}
									</Button>
								))}
							</div>
							{transition && (
								<form
									data-belongings-transition
									className={`min-w-0 space-y-3 rounded-lg border border-border ${compact ? 'py-3' : 'p-3'}`}
									onKeyDown={(event) => {
										if (event.key === 'Enter' && event.nativeEvent.isComposing)
											event.preventDefault();
									}}
									onSubmit={(event) => {
										event.preventDefault();
										void operate('transition');
									}}
								>
									<h4>
										{bt('confirmTransition')} · {statusText(transition)}
									</h4>
									<Label htmlFor={`${formId}-date`}>{bt('effectiveDate')}</Label>
									<DateField
										id={`${formId}-date`}
										required
										value={date || null}
										onDraftChange={setDate}
										onChange={(value) => setDate(value ?? '')}
										disabled={busy}
										collisionBoundary={
											owner.closest('[data-huhu-leaf]') ??
											owner.closest('.workspace-leaf-content')
										}
									/>
									{['sold', 'discard'].includes(transition) && (
										<>
											<Label htmlFor={`${formId}-exit`}>{bt('exitDate')}</Label>
											<DateField
												id={`${formId}-exit`}
												required
												value={exitDate || null}
												onDraftChange={setExitDate}
												onChange={(value) => setExitDate(value ?? '')}
												disabled={
													busy ||
													(selected.status !== transition &&
														['sold', 'discard'].includes(selected.status))
												}
												collisionBoundary={
													owner.closest('[data-huhu-leaf]') ??
													owner.closest('.workspace-leaf-content')
												}
											/>
										</>
									)}
									{transition === 'sold' && (
										<>
											<Label htmlFor={`${formId}-sale`}>{bt('sale')}</Label>
											<Input
												id={`${formId}-sale`}

												inputMode="decimal"
												value={sale}
												placeholder={bt('unknown')}
												onChange={(event) => setSale(event.target.value)}
												disabled={busy}
											/>
											<Label htmlFor={`${formId}-currency`}>{bt('currency')}</Label>
											<Input
												id={`${formId}-currency`}

												value={currency}
												onChange={(event) => setCurrency(event.target.value)}
												disabled={busy}
											/>
										</>
									)}
									<p className="text-sm text-muted-foreground">{bt('undoWindow')}</p>
									<div className="flex flex-wrap gap-2">
										<Button type="submit" className=" whitespace-normal" disabled={busy}>
											{busy ? bt('saving') : bt('confirm')}
										</Button>
										<Button
											type="button"

											variant="secondary"
											disabled={busy}
											onClick={() => setTransition(undefined)}
										>
											{bt('cancel')}
										</Button>
									</div>
								</form>
							)}
							<h4>{bt('history')}</h4>
							<ol className="space-y-2">
								{selected.events.map((event) => (
									<li key={event.rowId} className="text-sm">
										{event.values.date} · {statusText(event.values.status)}
										<span className="block font-mono text-xs">
											{event.rowId}
											{event.undoOf ? ` ← ${event.undoOf}` : ''}
										</span>
									</li>
								))}
							</ol>
						</article>
					) : (
						!loading && <EmptyState title={bt('missing')} />
					)}
				</>
			) : (
				<>
					<nav aria-label={bt('status')} className="flex flex-wrap gap-2">
						{(['all', ...BELONGING_STATUSES] as const).map((value) => (
							<Button
								className=" whitespace-normal"
								variant={status === value ? 'primary' : 'secondary'}
								key={value}
								aria-pressed={status === value}
								onClick={() => setStatus(value)}
							>
								{value === 'all' ? bt('all') : statusText(value)} ·{' '}
								{value === 'all' ? (summary?.total ?? 0) : (summary?.statuses[value] ?? 0)}
							</Button>
						))}
					</nav>
					<div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
						<div className="space-y-2">
							<Label htmlFor={`${formId}-search`}>{bt('search')}</Label>
							<Input
								id={`${formId}-search`}

								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
						<Choice
							label={bt('year')}
							value={year}
							options={[['all', bt('all')], ...years.map((year) => [year, year] as [string, string])]}
							onChange={setYear}
						/>
						<Choice
							label={bt('sort')}
							value={sort}
							options={['recent', 'oldest', 'name'].map((value) => [value, bt(value)])}
							onChange={setSort}
						/>
					</div>
					{!loading && !items.length && (
						<EmptyState
							title={bt(result?.items.length ? 'noResults' : 'empty')}
							action={
								<div className="flex flex-wrap gap-2">
									<Button
										className=" whitespace-normal"
										disabled={busy}
										onClick={() => {
											setSearch('');
											setStatus('all');
											setYear('all');
										}}
									>
										{bt('clear')}
									</Button>
									{!application.runtime.index.definition(BELONGING_TYPE_ID) && (
										<Button
											className=" whitespace-normal"
											disabled={busy}
											onClick={() => {
												void operate('install');
											}}
										>
											{bt('install')}
										</Button>
									)}
								</div>
							}
						/>
					)}
					<div
						data-belongings-grid
						className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))] gap-4"
					>
						{items.map((item) => (
							<article
								key={item.id}
								className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-border bg-card p-4"
							>
								<div
									role="img"
									aria-label={item.image ? `${bt('image')} ${item.name}` : bt('noImage')}
									className="flex min-h-24 items-center justify-center rounded-lg bg-muted p-3 text-sm text-muted-foreground"
								>
									{bt('noImage')}
								</div>
								<Badge>{statusText(metrics.get(item.id)!.status)}</Badge>
								<h3>
									<Button
										variant="ghost"
										className=" max-w-full whitespace-normal p-0 text-lg [overflow-wrap:anywhere]"
										onClick={() => select(item.id)}
									>
										{item.name}
									</Button>
								</h3>
								<p className="text-sm text-muted-foreground">
									{item.category} · {item.purchaseDate || bt('unknown')}
								</p>
								<p>{amount(item.purchase)}</p>
								<Metrics metric={metrics.get(item.id)} />
							</article>
						))}
					</div>
				</>
			)}
		</section>
	);
}

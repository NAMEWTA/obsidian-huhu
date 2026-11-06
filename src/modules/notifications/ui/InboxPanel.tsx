import './i18n';
import { useEffect, useRef, useState } from 'react';
import { Input } from '../../../ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { SegmentedControl } from '../../../ui/components/huhu/SegmentedControl';
import { DetailPane } from '../../../ui/components/huhu/DetailPane';
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';
import { useVisible } from '../../../ui/react/contexts';
import { notificationBody } from '../core/service';
import type { NotificationRecord, NotificationTargetName } from '../api';
import { getLanguage } from '../../../shared/i18n';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { useDesignNotice } from '../../../ui/react/design-scope';
import { Badge } from '../../../ui/components/badge';
import { BellOff, CheckCheck, Copy, Trash2 } from 'lucide-react';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';

/** Presentation only: delivery states map to semantic badge tones. */
const DELIVERY_TONE: Record<string, string> = {
	sent: 'text-status-success',
	failed: 'text-destructive',
	unknown: 'text-status-warning',
};

function IdRow({ label, value }: { label: string; value: string }) {
	const t = useT(),
		win = useOwnerWindow(),
		notice = useDesignNotice();
	const [busy, setBusy] = useState(false);
	const lifecycle = useRef({ alive: true, pending: false });
	useEffect(() => {
		const current = lifecycle.current;
		current.alive = true;
		return () => {
			current.alive = false;
		};
	}, []);
	return (
		<div className="flex min-w-0 items-center gap-2">
			<div className="min-w-0 flex-1">
				<div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
				<code className="block break-all font-mono text-xs">{value}</code>
			</div>
			<ActionButton
				size="icon-sm"
				label={t('notification.copy', { label })}
				disabled={busy}
				onClick={() => {
					if (lifecycle.current.pending) return;
					lifecycle.current.pending = true;
					setBusy(true);
					void Promise.resolve()
						.then(() => win.navigator.clipboard.writeText(value))
						.then(
							() => {
								if (lifecycle.current.alive) notice(t('notification.copied', { label }));
							},
							() => {
								if (lifecycle.current.alive) notice(t('notification.operationFailed'));
							},
						)
						.finally(() => {
							lifecycle.current.pending = false;
							if (lifecycle.current.alive) setBusy(false);
						});
				}}
			>
				<Copy className="size-4" />
			</ActionButton>
		</div>
	);
}

/** The list stays mounted while its selected record is presented in the shared detail pane. */
export function InboxPanel({
	records: all,
	filter,
	markRead,
	clearRead,
	open,
	openable,
	names,
	error,
	busy,
	dismissError,
}: {
	records: readonly NotificationRecord[];
	filter: 'all' | 'unread';
	markRead: (id?: string) => void;
	clearRead: () => void;
	open: (record: NotificationRecord) => void;
	openable: ReadonlySet<string>;
	names?: ReadonlyMap<string, NotificationTargetName | undefined>;
	error?: string;
	busy?: boolean;
	dismissError?: () => void;
}) {
	const t = useT(),
		{ ref: leafRef, width: leafWidth } = useLeafMetrics(),
		visible = useVisible();
	const [query, setQuery] = useState(''),
		[category, setCategory] = useState('all'),
		[page, setPage] = useState(0),
		[selection, setSelection] = useState<string>();
	const [readFilter, setReadFilter] = useState(filter),
		[previousFilter, setPreviousFilter] = useState(filter);
	if (filter !== previousFilter) {
		setPreviousFilter(filter);
		setReadFilter(filter);
		setPage(0);
	}
	const selected = all.find((record) => record.id === selection);
	const categories = [
		...new Set(all.map((record) => record.source?.kind ?? record.target?.kind ?? 'automation-run')),
	];
	const records = [...all]
		.reverse()
		.filter(
			(record) =>
				(readFilter === 'all' || !record.read) &&
				(category === 'all' || (record.source?.kind ?? record.target?.kind ?? 'automation-run') === category) &&
				`${record.title} ${notificationBody(record)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
		);
	const total = Math.max(1, Math.ceil(records.length / 30)),
		currentPage = Math.min(page, total - 1);
	const select = (record: NotificationRecord) => {
		setSelection(record.id);
		if (!record.read) markRead(record.id);
	};
	return (
		<div ref={leafRef} className="flex h-full min-h-0 min-w-0" aria-busy={busy || undefined}>
			<section className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--hu-line)] px-5 py-3">
					<SegmentedControl
						ariaLabel={t('workbench.notifications')}
						value={readFilter}
						onChange={(value) => {
							setReadFilter(value);
							setPage(0);
						}}
						options={[
							{ value: 'all', label: t('workbench.allNotifications') },
							{ value: 'unread', label: t('workbench.unread') },
						]}
					/>
					<Input
						type="search"
						className="min-w-0 flex-1"
						aria-label={t('notification.search')}
						placeholder={t('notification.search')}
						value={query}
						onChange={(event) => {
							setQuery(event.currentTarget.value);
							setPage(0);
						}}
					/>
					<Select
						value={category}
						onValueChange={(value) => {
							setCategory(value);
							setPage(0);
						}}
					>
						<SelectTrigger className="w-auto max-w-full" aria-label={t('notification.category')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t('notification.categoryAll')}</SelectItem>
							{categories.map((kind) => (
								<SelectItem key={kind} value={kind}>
									{kind === 'health'
										? t('health.title')
										: kind === 'automation-run'
											? t('workbench.automations')
											: kind}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="ghost" disabled={busy} onClick={() => markRead()}>
						<CheckCheck />
						{t('automation.readAll')}
					</Button>
					<Button variant="ghost" disabled={busy} onClick={clearRead}>
						<Trash2 />
						{t('automation.clearRead')}
					</Button>
				</div>
				{error && (
					<div
						role="alert"
						className="flex flex-wrap items-center gap-2 border-b border-[var(--hu-danger)] p-4 text-sm"
					>
						<span className="min-w-0 flex-1 break-words">
							{t('notification.actionFailed', { message: error })}
						</span>
						{dismissError && (
							<Button variant="secondary" onClick={dismissError}>
								{t('notification.dismissError')}
							</Button>
						)}
					</div>
				)}
				<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-sleek">
					{!records.length && (
						<EmptyState
							icon={<BellOff />}
							title={t(
								readFilter === 'unread' && all.length ? 'workbench.noUnread' : 'automation.inboxEmpty',
							)}
						/>
					)}
					<ul className="m-0 list-none divide-y divide-[var(--hu-line)] p-0">
						{records.slice(currentPage * 30, (currentPage + 1) * 30).map((record) => (
							<li key={record.id} className="min-w-0">
								<button
									type="button"
									disabled={busy}
									aria-current={selection === record.id ? 'true' : undefined}
									className={`flex min-h-16 w-full min-w-0 items-start gap-3 rounded-[var(--hu-radius-md)] p-4 text-left hover:bg-[var(--hu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-focus)] ${selection === record.id ? 'bg-[var(--hu-selection)]' : ''}`}
									onClick={() => select(record)}
								>
									<span
										className={`mt-1.5 size-2 shrink-0 rounded-full ${record.read ? 'bg-transparent' : 'bg-[var(--hu-accent)]'}`}
										role={record.read ? undefined : 'img'}
										aria-label={record.read ? undefined : t('automation.unread')}
									/>
									<span className="min-w-0 flex-1">
										<span
											className={`block break-words text-sm ${record.read ? 'font-medium' : 'font-semibold'}`}
										>
											{record.title}
										</span>
										{notificationBody(record) !== record.title && (
											<span className="mt-1 block truncate text-xs text-[var(--hu-fg-3)]">
												{notificationBody(record)}
											</span>
										)}
									</span>
									<time
										className="shrink-0 text-xs tabular-nums text-[var(--hu-fg-3)]"
										dateTime={new Date(record.createdAt).toISOString()}
									>
										{new Date(record.createdAt).toLocaleDateString(
											getLanguage() === 'zh' ? 'zh-CN' : 'en-US',
										)}
									</time>
								</button>
							</li>
						))}
					</ul>
				</div>
				{total > 1 && (
					<nav
						className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--hu-line)] px-5 py-3"
						aria-label={t('notification.page', { page: currentPage + 1, total })}
					>
						<Button variant="ghost" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>
							{t('notification.previous')}
						</Button>
						<span className="text-xs tabular-nums">
							{t('notification.page', { page: currentPage + 1, total })}
						</span>
						<Button
							variant="ghost"
							disabled={currentPage + 1 >= total}
							onClick={() => setPage(currentPage + 1)}
						>
							{t('notification.next')}
						</Button>
					</nav>
				)}
			</section>
			<DetailPane
				open={visible && !!selection}
				leafWidth={leafWidth}
				title={selected?.title ?? t('notification.targetDeleted')}
				onOpenChange={(value) => {
					if (!value) setSelection(undefined);
				}}
			>
				{selected ? (
					<div key={selected.id} className="grid min-w-0 gap-5 text-sm">
						<p className="m-0 whitespace-pre-wrap break-words">{notificationBody(selected)}</p>
						<time
							className="text-xs text-[var(--hu-fg-3)]"
							dateTime={new Date(selected.createdAt).toISOString()}
						>
							{new Date(selected.createdAt).toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-US')}
						</time>
						<div className="flex flex-wrap gap-2">
							{selected.channels.map((channel) => {
								const delivery = selected.deliveries[channel] ?? 'pending';
								return (
									<Badge
										variant="neutral"
										className={DELIVERY_TONE[delivery]}
										key={channel}
									>{`${channel === 'in-app' || channel === 'system' ? t(`automation.${channel}`) : channel}${t('automation.colon')}${t(delivery === 'unavailable' ? 'notification.deliveryUnavailable' : `automation.delivery.${delivery}`)}`}</Badge>
								);
							})}
						</div>
						{selected.target && (
							<div className="grid gap-3" data-notification-details>
								<div>
									<h3 className="text-xs text-[var(--hu-fg-3)]">
										{t(
											selected.target.kind === 'health'
												? 'notification.targetNameGeneric'
												: 'notification.targetName',
										)}
									</h3>
									<p className="break-words">
										{(() => {
											const found = names?.get(selected.id);
											return !found
												? t('notification.targetUnknown')
												: found.state === 'deleted'
													? t('notification.targetDeleted')
													: found.name.trim() || t('notification.targetUnknown');
										})()}
									</p>
								</div>
								{selected.target.kind === 'health' ? (
									<IdRow label={t('notification.reportId')} value={selected.target.reportId} />
								) : (
									<>
										<IdRow
											label={t('notification.automationId')}
											value={selected.target.automationId}
										/>
										<IdRow label={t('notification.runId')} value={selected.target.runId} />
									</>
								)}
							</div>
						)}
						{openable.has(selected.id) && (
							<Button disabled={busy} onClick={() => open(selected)}>
								{t('automation.open')}
							</Button>
						)}
						{!selected.read && (
							<Button variant="secondary" disabled={busy} onClick={() => markRead(selected.id)}>
								{t('automation.read')}
							</Button>
						)}
					</div>
				) : (
					<EmptyState title={t('notification.targetDeleted')} />
				)}
			</DetailPane>
		</div>
	);
}

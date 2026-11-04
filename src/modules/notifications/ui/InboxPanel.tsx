import { useState } from 'react';
import { notificationBody } from '../core/service';
import type { NotificationRecord, NotificationTargetName } from '../api';
import { getLanguage } from '../../../shared/i18n';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { useDesignNotice } from '../../../ui/react/design-scope';
import { Badge } from '../../../ui/components/badge';
import { BellOff, CheckCheck, Check, ChevronDown, Clock, Copy, Trash2 } from 'lucide-react';
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
	return (
		<div className="flex min-w-0 items-center gap-2">
			<div className="min-w-0 flex-1">
				<div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
				<code className="block break-all font-mono text-xs">{value}</code>
			</div>
			<ActionButton
				size="icon-sm"
				label={t('notification.copy', { label })}
				onClick={() => {
					void win.navigator.clipboard.writeText(value).then(
						() => notice(t('notification.copied', { label })),
						(error) => notice(error instanceof Error ? error.message : String(error)),
					);
				}}
			>
				<Copy className="size-4" />
			</ActionButton>
		</div>
	);
}

/** The inbox list; the workbench page header already names the page, so there is no heading here. */
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
	/** Current names of the automations records point at, by record id; absent while unresolved. */
	names?: ReadonlyMap<string, NotificationTargetName | undefined>;
	/** The last action failure; stays until dismissed. */
	error?: string;
	busy?: boolean;
	dismissError?: () => void;
}) {
	const t = useT(),
		[shown, setShown] = useState<ReadonlySet<string>>(new Set());
	const records = filter === 'unread' ? all.filter((record) => !record.read) : all;
	return (
		<div className="mx-auto w-full max-w-4xl space-y-4 p-4" aria-busy={busy || undefined}>
			{error && (
				<div role="alert" className="flex flex-wrap items-center gap-2 break-words rounded-md border border-destructive/40 p-3 text-sm">
					<span className="min-w-0 flex-1">{t('notification.actionFailed', { message: error })}</span>
					{dismissError && (
						<Button variant="outline" size="sm" onClick={dismissError}>
							{t('notification.dismissError')}
						</Button>
					)}
				</div>
			)}
			<div className="flex justify-end">
				<div className="flex flex-wrap gap-2">
					<Button variant="ghost" disabled={busy} onClick={() => markRead()}>
						<CheckCheck className="size-4" />
						{t('automation.readAll')}
					</Button>
					<Button variant="ghost" disabled={busy} onClick={clearRead}>
						<Trash2 className="size-4" />
						{t('automation.clearRead')}
					</Button>
				</div>
			</div>
			{!records.length && (
				<EmptyState
					icon={<BellOff />}
					title={t(filter === 'unread' && all.length ? 'workbench.noUnread' : 'automation.inboxEmpty')}
					description=""
				/>
			)}
			{records.length > 0 && (
				<ul className="divide-y divide-border">
					{[...records].reverse().map((record) => {
						const body = notificationBody(record);
						return (
							<li
								className={`flex flex-wrap gap-3 py-4 ${record.read ? 'opacity-70' : ''}`}
								key={record.id}
							>
								{/* The unread marker is a named image so assistive tech keeps the old "●" cue. */}
								{record.read ? (
									<span className="mt-2 size-2 shrink-0" aria-hidden="true" />
								) : (
									<span
										className="mt-2 size-2 shrink-0 rounded-full bg-primary"
										role="img"
										aria-label={t('automation.unread')}
									/>
								)}
								<div className="min-w-0 flex-1 basis-48 space-y-1">
									<div className="break-words text-sm font-medium">{record.title}</div>
									{body !== record.title && (
										<div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
											{body}
										</div>
									)}
									<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<span className="inline-flex items-center gap-1">
											<Clock className="size-3" />
											{new Date(record.createdAt).toLocaleString(
												getLanguage() === 'zh' ? 'zh-CN' : 'en-US',
											)}
										</span>
										{record.channels.map((channel) => {
											const delivery = record.deliveries[channel] ?? 'pending';
											return (
												<Badge
													variant="secondary"
													key={channel}
													className={DELIVERY_TONE[delivery]}
												>
													{`${channel === 'in-app' || channel === 'system' ? t(`automation.${channel}`) : channel}${t('automation.colon')}${t(delivery === 'unavailable' ? 'notification.deliveryUnavailable' : `automation.delivery.${delivery}`)}`}
												</Badge>
											);
										})}
									</div>
									{shown.has(record.id) && (
										<div className="grid gap-3 rounded-md border border-border/50 p-3" data-notification-details>
											{record.target && (
												<div className="min-w-0">
													<div className="text-[11px] font-medium uppercase text-muted-foreground">
													{t(record.target.kind === 'health' ? 'notification.targetNameGeneric' : 'notification.targetName')}
													</div>
													<div className="break-words text-sm">
														{(() => {
															const found = names?.get(record.id);
															if (!found) return t('notification.targetUnknown');
															return found.state === 'deleted'
																? t('notification.targetDeleted')
															: found.name.trim() || t(record.target?.kind === 'health' ? 'notification.targetUnknown' : 'automation.unnamedAutomation');
														})()}
													</div>
												</div>
											)}
											{record.target?.kind === 'health' && <IdRow label={t('notification.reportId')} value={record.target.reportId} />}
											{record.target && record.target.kind !== 'health' && <IdRow label={t('notification.automationId')} value={record.target.automationId} />}
											{record.target && record.target.kind !== 'health' && <IdRow label={t('notification.runId')} value={record.target.runId} />}
										</div>
									)}
								</div>
								<div className="flex flex-wrap items-start gap-2">
									{record.target && (
										<Button
											variant="ghost"
											aria-expanded={shown.has(record.id)}
											onClick={() =>
												setShown((current) => {
													const next = new Set(current);
													if (!next.delete(record.id)) next.add(record.id);
													return next;
												})
											}
										>
											<ChevronDown className="size-4" />
											{t(shown.has(record.id) ? 'notification.hideDetails' : 'notification.details')}
										</Button>
									)}
									{openable.has(record.id) && (
										<Button variant="outline" disabled={busy} onClick={() => open(record)}>
											{t('automation.open')}
										</Button>
									)}
									{!record.read && (
										<Button variant="ghost" disabled={busy} onClick={() => markRead(record.id)}>
											<Check className="size-4" />
											{t('automation.read')}
										</Button>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

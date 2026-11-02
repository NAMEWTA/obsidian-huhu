import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { Check, Eye, Inbox as InboxIcon, RefreshCw, Send, X } from 'lucide-react';
import { useStore } from 'zustand';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import { Textarea } from '../../../../ui/components/textarea';
import { useT } from '../../../../ui/react/hooks';
import type { InboxMessage, InboxMessageSummary, InboxRecipient } from '../../core/inbox/model';
import type { ManagedSessionSummary } from '../../core/workspace/managed-runtime';
import type { AgentController } from '../../services/controller';
import type { InboxObservation } from '../../services/inbox/presentation';
import type { InboxService } from '../../services/inbox/service';

type Scope = 'current' | 'all';

type RecipientOption = InboxRecipient & {
	readonly label: string;
	readonly spaceName: string;
	readonly title: string;
	readonly state: string;
	readonly archived: boolean;
};

const recipientKey = (recipient: InboxRecipient) => `${recipient.spaceId}:${recipient.sessionId}`;
const inboxPageLimit = 100;

async function collectInboxPages(
	inbox: Pick<InboxService, 'listMessages'>,
	target: InboxRecipient,
): Promise<readonly InboxMessageSummary[]> {
	const rows: InboxMessageSummary[] = [];
	const seen = new Set<string>();
	let afterSequence = 0;
	let highWaterSequence: number | undefined;
	let generation: number | undefined;
	for (let page = 0; page < 4096; page += 1) {
		const result = await inbox.listMessages({
			...target,
			afterSequence: afterSequence || undefined,
			...(highWaterSequence === undefined ? {} : { highWaterSequence, generation }),
			limit: inboxPageLimit,
		});
		if (highWaterSequence === undefined) {
			highWaterSequence = result.highWaterSequence;
			generation = result.generation;
		} else if (result.highWaterSequence !== highWaterSequence || result.generation !== generation) {
			throw new Error('inbox-pagination-stale');
		}
		for (const row of result.rows) {
			if (!seen.has(row.messageId)) {
				seen.add(row.messageId);
				rows.push(row);
			}
		}
		const next = result.nextSequence;
		if (next === undefined || next > highWaterSequence) break;
		if (next <= afterSequence) throw new Error('inbox-pagination-stalled');
		afterSequence = next;
	}
	return rows;
}

const makeMessageId = () => {
	try {
		return crypto.randomUUID();
	} catch {
		return `ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}
};

function observationLabel(t: ReturnType<typeof useT>, observation: InboxObservation): string {
	return observation.status === 'pending'
		? t('agent.inbox.pending')
		: observation.status === 'unknown'
			? t('agent.inbox.unknown')
			: observation.status === 'completed'
				? t('agent.inbox.completed')
				: t('agent.inbox.none');
}

function targetState(row: ManagedSessionSummary | undefined, t: ReturnType<typeof useT>): string {
	if (!row) return t('agent.inbox.targetUnknown');
	if (row.archived) return t('agent.inbox.archived');
	if (row.viewState === 'detached') return t('agent.inbox.detached');
	if (row.viewState === 'background') return t('agent.inbox.background');
	if (row.viewState === 'restored') return t('agent.inbox.stopped');
	return row.runtime?.phase === 'connected' ? t('agent.inbox.connected') : t('agent.inbox.stopped');
}

/** Passive mailbox UI. Reading, sending, and acknowledging are separate explicit actions. */
export function InboxPanel({
	controller,
	close,
	onUnreadCount,
	viewId = 'agent-inbox',
}: {
	controller: AgentController;
	close: () => void;
	onUnreadCount?: (count: number | undefined) => void;
	viewId?: string;
}) {
	const t = useT();
	const id = useId();
	const spaces = useStore(controller.spaces.store);
	const managed = useSyncExternalStore(
		controller.workspace.subscribeManaged,
		controller.workspace.getManagedSnapshot,
		controller.workspace.getManagedSnapshot,
	);
	const inbox = (controller as AgentController & { inbox?: InboxService }).inbox;
	const presentation = inbox?.presentation;
	const [observations, setObservations] = useState<readonly InboxObservation[]>(() => presentation?.state() ?? []);
	const [scope, setScope] = useState<Scope>('current');
	const [selectedKey, setSelectedKey] = useState('');
	const [rows, setRows] = useState<readonly InboxMessageSummary[]>([]);
	const [selected, setSelected] = useState<InboxMessage>();
	const [verification, setVerification] = useState<{ status: 'saved' | 'verified' | 'not-found' | 'conflict' | 'unknown'; messageId: string }>();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [body, setBody] = useState('');
	const [source, setSource] = useState('agent-ui');
	const [sendState, setSendState] = useState('');
	const [refreshTick, setRefreshTick] = useState(0);
	useEffect(() => {
		return presentation?.subscribe(() => setObservations(presentation.state())) ?? (() => {});
	}, [presentation]);
	const managedByKey = useMemo(
		() => new Map(managed.sessions.map((row) => [recipientKey(row), row])),
		[managed.sessions],
	);
	const recipients = useMemo<readonly RecipientOption[]>(() => {
		const records = spaces.records;
		const sessionRecords = records.sessions ?? {};
		const spaceRecords = records.spaces ?? {};
		return Object.values(sessionRecords)
			.filter((session) => {
				const space = spaceRecords[session.spaceId];
				return !!space && (scope === 'all' || session.spaceId === records.selectedSpaceId);
			})
			.map((session) => {
				const space = spaceRecords[session.spaceId]!;
				const recipient = { spaceId: session.spaceId, sessionId: session.id };
				const summary = managedByKey.get(recipientKey(recipient));
				const title = summary?.title ?? session.title;
				const provider = summary?.agentId ?? (session.kind === 'agent' ? t('agent.inbox.agent') : t('agent.inbox.shell'));
				return {
					...recipient,
					title,
					spaceName: space.name,
					state: targetState(summary, t),
					archived: !!session.archived || !!space.archived,
					label: `${title} · ${space.name} (${space.id}) · ${provider} · ${session.id}`,
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [managedByKey, scope, spaces.records, t]);
	const safeSelectedKey = recipients.some((row) => recipientKey(row) === selectedKey) ? selectedKey : '';
	const recipient = recipients.find((row) => recipientKey(row) === safeSelectedKey);
	const target = useMemo(() => recipient ? { spaceId: recipient.spaceId, sessionId: recipient.sessionId } : undefined, [recipient]);
	const listAll = useCallback(
		(currentTarget: InboxRecipient) => inbox ? collectInboxPages(inbox, currentTarget) : Promise.resolve<readonly InboxMessageSummary[]>([]),
		[inbox],
	);

	useEffect(() => {
		let cancelled = false;
		const refreshUnread = async () => {
			if (!inbox || !recipients.length) {
				onUnreadCount?.(inbox ? 0 : undefined);
				return;
			}
			try {
				const listed = await Promise.all(recipients.map((row) => listAll(row)));
				if (!cancelled) onUnreadCount?.(listed.reduce((count, result) => count + result.filter((message) => !message.acked).length, 0));
			} catch {
				if (!cancelled) onUnreadCount?.(undefined);
			}
		};
		void refreshUnread();
		return () => {
			cancelled = true;
		};
	}, [inbox, listAll, onUnreadCount, recipients, spaces.records, observations, refreshTick]);

	useEffect(() => {
		let cancelled = false;
		if (!inbox || !target) {
			queueMicrotask(() => {
				if (!cancelled) {
					setRows([]);
					setSelected(undefined);
				}
			});
			return;
		}
		queueMicrotask(() => {
			if (!cancelled) {
				setLoading(true);
				setError('');
			}
		});
		void listAll(target)
			.then((result) => {
				if (!cancelled) setRows(result);
			})
			.catch((reason) => {
				if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [inbox, listAll, target, refreshTick]);

	const read = async (message: InboxMessageSummary) => {
		if (!inbox) return;
		try {
			setError('');
			setVerification(undefined);
			setSelected(await inbox.readMessage(message.messageId, message.recipient));
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		}
	};
	const ack = async (message: InboxMessageSummary) => {
		if (!inbox) return;
		try {
			setError('');
			setVerification(undefined);
			const result = await inbox.ackMessage(message.messageId, message.recipient, { viewId });
			if (result.value) setSelected(result.value);
			setRefreshTick((value) => value + 1);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		}
	};
	const verify = async (observation: InboxObservation) => {
		if (!inbox) return;
		try {
			setError('');
			setVerification(undefined);
			const fresh = await inbox.freshPrimary();
			const message = fresh.freshness === 'fresh' ? fresh.records?.inbox?.messages.find((row) => row.messageId === observation.messageId) : undefined;
			let status: 'saved' | 'verified' | 'not-found' | 'conflict' | 'unknown';
			if (fresh.freshness === 'unknown' || !fresh.records) status = 'unknown';
			else if (!message) status = 'not-found';
			else if (message.recipient.spaceId !== observation.recipient.spaceId || message.recipient.sessionId !== observation.recipient.sessionId) status = 'conflict';
			else if (observation.action === 'ack') status = message.ack ? 'verified' : 'conflict';
			else if (
				message.body !== observation.body ||
				message.source !== observation.source ||
				JSON.stringify(message.references) !== JSON.stringify(observation.references)
			) status = 'conflict';
			else status = 'saved';
			setVerification({ status, messageId: observation.messageId });
			if (message && (status === 'saved' || status === 'verified')) {
				setSelected(message);
				if (inbox.presentation.get(observation.attemptId)?.status === 'unknown' || inbox.presentation.get(observation.attemptId)?.status === 'pending')
					inbox.presentation.complete(observation.attemptId, 'completed', 'completed');
			}
			if (!message && status === 'not-found') setError(t('agent.inbox.verifyMissing'));
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		}
	};
	const send = async () => {
		if (!inbox || !target || !body.trim()) return;
		const messageId = makeMessageId();
		setSendState(t('agent.inbox.sending'));
		setError('');
		try {
			const result = await inbox.sendMessage({ messageId, recipient: target, source: source.trim() || 'agent-ui', body, viewId });
			setSendState(result.status === 'saved' ? t('agent.inbox.savedWithId', { id: messageId }) : t('agent.inbox.unknownWithId', { id: messageId }));
			if (result.status === 'saved') setBody('');
			setRefreshTick((value) => value + 1);
		} catch (reason) {
			setSendState('');
			setError(reason instanceof Error ? reason.message : String(reason));
		}
	};
	const dismissObservation = (attemptId: string) => {
		if (presentation?.remove(attemptId)) setObservations(presentation.state());
	};

	return (
		<section className="flex h-full min-h-0 min-w-0 flex-col bg-card text-foreground" aria-label={t('agent.inbox.title')} data-agent-inbox="">
		<header className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
			<div className="flex min-w-0 items-center gap-2">
				<InboxIcon className="size-4 text-muted-foreground" aria-hidden="true" />
				<h2 className="min-w-0 truncate text-sm font-medium">{t('agent.inbox.title')}</h2>
				<span className="sr-only" data-inbox-availability="true">{t('agent.inbox.passive')}</span>
			</div>
			<Button variant="ghost" size="icon-sm" aria-label={t('agent.inbox.close')} onClick={close}>
				<X className="size-4" />
			</Button>
		</header>
		<div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs">
			<p className="text-muted-foreground">{t('agent.inbox.passive')}</p>
			<label htmlFor={`${id}-scope`}>{t('agent.inbox.scope')}</label>
			<Select value={scope} onValueChange={(value) => { setScope(value as Scope); setSelectedKey(''); }}>
				<SelectTrigger id={`${id}-scope`} className="w-full"><SelectValue /></SelectTrigger>
				<SelectContent>
					<SelectItem value="current">{t('agent.inbox.currentSpace')}</SelectItem>
					<SelectItem value="all">{t('agent.inbox.allSpaces')}</SelectItem>
				</SelectContent>
			</Select>
			{spaces.loading ? <p role="status">{t('agent.inbox.loading')}</p> : spaces.error ? <p role="alert">{t('agent.inbox.error')}</p> : !spaces.records.selectedSpaceId && scope === 'current' ? <p>{t('agent.inbox.chooseSpace')}</p> : null}
			<label htmlFor={`${id}-recipient`}>{t('agent.inbox.recipient')}</label>
			<Select value={safeSelectedKey} onValueChange={setSelectedKey} disabled={spaces.loading || !!spaces.error || !recipients.length}>
				<SelectTrigger id={`${id}-recipient`} className="w-full"><SelectValue placeholder={t('agent.inbox.chooseRecipient')} /></SelectTrigger>
				<SelectContent>{recipients.map((row) => <SelectItem key={recipientKey(row)} value={recipientKey(row)} className="whitespace-normal break-words"><span className="block">{row.label}</span><span className="block text-xs text-muted-foreground">{row.state}</span></SelectItem>)}</SelectContent>
			</Select>
			<div className="flex items-center justify-between gap-2">
				<strong>{t('agent.inbox.messages')}</strong>
				<Button variant="ghost" size="icon-xs" aria-label={t('agent.inbox.refresh')} onClick={() => setRefreshTick((value) => value + 1)}><RefreshCw className="size-3" /></Button>
			</div>
			{loading ? <p role="status">{t('agent.inbox.loadingMessages')}</p> : error ? <p role="alert" className="break-words">{error}</p> : !target ? <p className="text-muted-foreground">{t('agent.inbox.selectRecipient')}</p> : !rows.length ? <div className="rounded-md border border-border p-3 text-muted-foreground"><p>{t('agent.inbox.empty')}</p></div> : <div className="divide-y divide-border rounded-md border border-border">{rows.map((message) => <article key={message.messageId} className="space-y-2 p-3" data-message-id={message.messageId}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-all font-mono text-[10px] text-muted-foreground">{message.messageId}</p><p className="mt-1 break-words text-[11px] text-muted-foreground">{message.source} · #{message.sendSequence}</p></div><Badge variant={message.acked ? 'outline' : 'secondary'}>{message.acked ? t('agent.inbox.acknowledged') : t('agent.inbox.unread')}</Badge></div><p className="break-words text-[11px] text-muted-foreground">{message.recipient.spaceId} · {message.recipient.sessionId}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="xs" onClick={() => void read(message)}><Eye className="size-3" />{t('agent.inbox.read')}</Button>{!message.acked && <Button variant="secondary" size="xs" onClick={() => void ack(message)}><Check className="size-3" />{t('agent.inbox.ack')}</Button>}</div></article>)}</div>}
			{selected && <div className="space-y-2 rounded-md border border-border bg-background p-3" data-inbox-detail=""><p className="font-medium">{t('agent.inbox.detail')}</p><p className="break-all font-mono text-[10px] text-muted-foreground">{selected.messageId}</p><p className="whitespace-pre-wrap break-words">{selected.body}</p><p className="break-words text-[11px] text-muted-foreground">{selected.recipient.spaceId} · {selected.recipient.sessionId} · {selected.source}</p><p>{selected.ack ? t('agent.inbox.acknowledged') : t('agent.inbox.readOnly')}</p>{selected.references.length > 0 && <p className="break-words text-[11px] text-muted-foreground">{selected.references.length} reference(s)</p>}</div>}
			{verification && <p className="break-words text-[11px]" data-inbox-verification={verification.status}>{verification.status === 'saved' ? t('agent.inbox.savedWithId', { id: verification.messageId }) : verification.status === 'verified' ? t('agent.inbox.completed') : verification.status === 'not-found' ? t('agent.inbox.verifyMissing') : verification.status === 'conflict' ? t('agent.inbox.error') : t('agent.inbox.unknown')}</p>}
			{observations.some((observation) => observation.status === 'pending' || observation.status === 'unknown') && <div className="space-y-2 border-t border-border pt-3"><h3 className="font-medium">{t('agent.inbox.pendingTitle')}</h3>{observations.filter((observation) => observation.status === 'pending' || observation.status === 'unknown').map((observation) => <article key={observation.attemptId} className="space-y-1 rounded-md border border-border p-2" data-observation-id={observation.attemptId}><div className="flex items-center justify-between gap-2"><Badge variant="outline">{observationLabel(t, observation)}</Badge><span className="break-all font-mono text-[10px] text-muted-foreground">{observation.messageId}</span></div><p className="break-words">{observation.body ?? t('agent.inbox.ackAttempt')}</p><p className="break-words text-[11px] text-muted-foreground">{observation.recipient.spaceId} · {observation.recipient.sessionId}</p>{observation.diagnostic && <p role="alert" className="break-words text-[11px]">{observation.diagnostic}</p>}<Button variant="outline" size="xs" onClick={() => void verify(observation)}>{t('agent.inbox.verify')}</Button></article>)}</div>}
			{observations.some((observation) => observation.status === 'completed' || observation.status === 'none') && <div className="space-y-2 border-t border-border pt-3"><h3 className="font-medium">{t('agent.inbox.settledTitle')}</h3>{observations.filter((observation) => observation.status === 'completed' || observation.status === 'none').map((observation) => <article key={observation.attemptId} className="flex items-center justify-between gap-2 rounded-md border border-border p-2" data-settled-observation-id={observation.attemptId}><div className="min-w-0"><Badge variant="outline">{observationLabel(t, observation)}</Badge><p className="break-all font-mono text-[10px] text-muted-foreground">{observation.messageId}</p></div><Button variant="ghost" size="xs" onClick={() => dismissObservation(observation.attemptId)}>{t('agent.inbox.dismiss')}</Button></article>)}</div>}
			<div className="space-y-2 border-t border-border pt-3"><h3 className="font-medium">{t('agent.inbox.sendTitle')}</h3><label htmlFor={`${id}-source`}>{t('agent.inbox.source')}</label><Input id={`${id}-source`} value={source} onChange={(event) => setSource(event.target.value)} maxLength={512} /><label htmlFor={`${id}-body`}>{t('agent.inbox.body')}</label><Textarea id={`${id}-body`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={16384} rows={4} placeholder={t('agent.inbox.bodyPlaceholder')} /><Button disabled={!inbox || !target || !body.trim() || !!recipient?.archived} onClick={() => void send()}><Send className="size-4" />{t('agent.inbox.send')}</Button>{sendState && <p role="status" className="break-words">{sendState}</p>}</div>
		</div>
	</section>
);
}


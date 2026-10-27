import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CircleAlert, CircleCheck, LoaderCircle, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react';
import { Badge } from '../../../ui/components/badge';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { Textarea } from '../../../ui/components/textarea';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { useT } from '../../../ui/react/hooks';
import { registerMessages, t } from '../../../shared/i18n';
import type { Agent, BotClient, CommandMeta, Session, VisibleMessage } from '../api';
import { chatMessages } from '../i18n/chat';

registerMessages(chatMessages);

export interface BotWorkbenchHost {
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	openSettings?: () => void;
}

interface BotChatPageProps {
	host: BotWorkbenchHost;
}

type LoadState = 'loading' | 'ready' | 'error';

function commandMeta(client: BotClient): CommandMeta {
	const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
	return {
		commandId: id,
		idempotencyKey: id,
		profileId: client.hello.profile.profileId,
		commandEpoch: client.hello.profile.commandEpoch,
	};
}

function initials(name: string): string {
	return name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function statusLabel(status: Agent['enabled'] extends true ? string : string): string {
	return status === 'ready' || status === 'enabled' ? t('huhubot.chat.ready') : status;
}

function formatCount(count: number): string {
	return t('huhubot.chat.members', { count });
}

export function BotWorkbenchPage({ host }: BotChatPageProps) {
	const translate = useT();
	const client = host.client();
	const [agents, setAgents] = useState<Agent[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string>();
	const [messages, setMessages] = useState<VisibleMessage[]>([]);
	const [draft, setDraft] = useState('');
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState<LoadState>(client ? 'loading' : 'error');
	const [historyLoading, setHistoryLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const [runnerState, setRunnerState] = useState<'ready' | 'offline'>('ready');
	const composing = useRef(false);

	const loadDirectory = useCallback(async () => {
		const current = host.client();
		if (!current) { setRunnerState('offline'); setLoading('error'); return; }
		setLoading('loading');
		setError(undefined);
		try {
			const [agentPage, sessionPage] = await Promise.all([
				current.agents.list({ profileId: current.hello.profile.profileId, limit: 100 }),
				current.sessions.list({ profileId: current.hello.profile.profileId, limit: 100 }),
			]);
			setAgents(agentPage.items);
			setSessions(sessionPage.items);
			setRunnerState('ready');
			setLoading('ready');
		} catch (cause) {
			setRunnerState('offline');
			setLoading('error');
			setError(translate('huhubot.chat.error'));
			host.report?.(cause);
		}
	}, [host, translate]);

	useEffect(() => {
		void loadDirectory();
		if (!client) return;
		return client.onClose(() => setRunnerState('offline'));
	}, [client, loadDirectory]);

	const selectedSession = sessions.find(session => session.id === selectedSessionId);
	const selectedAgent = selectedSession?.memberIds.length === 1 ? agents.find(agent => agent.id === selectedSession.memberIds[0]) : undefined;
	const filteredAgents = useMemo(() => agents.filter(agent => `${agent.name} ${agent.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [agents, query]);
	const filteredSessions = useMemo(() => sessions.filter(session => session.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [sessions, query]);

	const loadHistory = useCallback(async (sessionId: string) => {
		const current = host.client();
		if (!current) return;
		setHistoryLoading(true);
		setError(undefined);
		try {
			const page = await current.sessions.history({ profileId: current.hello.profile.profileId, sessionId, limit: 100 });
			setMessages(page.items);
		} catch (cause) {
			setError(translate('huhubot.chat.error'));
			host.report?.(cause);
		} finally {
			setHistoryLoading(false);
		}
	}, [host, translate]);

	const chooseSession = (session: Session) => {
		setSelectedSessionId(session.id);
		setDraft('');
		void loadHistory(session.id);
	};

	const chooseAgent = async (agent: Agent) => {
		const current = host.client();
		if (!current) { setRunnerState('offline'); return; }
		setError(undefined);
		const existing = sessions.find(session => session.kind === 'direct' && session.memberIds.length === 1 && session.memberIds[0] === agent.id);
		if (existing) { chooseSession(existing); return; }
		try {
			const session = await current.sessions.create({ ...commandMeta(current), kind: 'direct', title: agent.name, memberIds: [agent.id] });
			setSessions(previous => [session, ...previous]);
			chooseSession(session);
		} catch (cause) {
			setError(translate('huhubot.chat.error'));
			host.report?.(cause);
		}
	};

	const send = async () => {
		const text = draft.trim();
		const current = host.client();
		if (!text || !selectedSession || !current || busy) return;
		setBusy(true);
		setError(undefined);
		setDraft('');
		const optimistic: VisibleMessage = {
			id: `draft-${Date.now()}`,
			sessionId: selectedSession.id,
			role: 'user',
			text,
			createdAt: new Date().toISOString(),
			sourceRefs: [],
		};
		setMessages(previous => [...previous, optimistic]);
		try {
			await current.runs.start({
				...commandMeta(current),
				sessionId: selectedSession.id,
				expectedRevision: selectedSession.revision,
				intent: text,
				sourceRefs: [],
				targetAgentIds: selectedSession.memberIds,
			});
			await loadHistory(selectedSession.id);
		} catch (cause) {
			setDraft(text);
			setError(translate('huhubot.chat.error'));
			host.report?.(cause);
		} finally {
			setBusy(false);
		}
	};

	if (loading === 'loading') return <div className="flex h-full min-h-0 items-center justify-center p-6"><EmptyState icon={<LoaderCircle className="animate-spin" />} title={translate('huhubot.chat.title')} description={translate('huhubot.chat.loading')} /></div>;
	if (loading === 'error' && agents.length === 0 && sessions.length === 0 && !client) return <div className="flex h-full min-h-0 items-center justify-center p-6"><EmptyState icon={<CircleAlert />} title={translate('huhubot.chat.title')} description={translate('huhubot.chat.offline')} action={host.openSettings ? <Button onClick={host.openSettings}>{translate('huhubot.chat.configure')}</Button> : undefined} /></div>;

	return <section className="flex h-full min-h-0 flex-col overflow-hidden @container" aria-label={translate('huhubot.chat.title')}>
		<header className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Bot className="size-4 shrink-0" aria-hidden />
				<h1 className="m-0 truncate text-sm font-semibold">{translate('huhubot.chat.title')}</h1>
				<Badge variant={runnerState === 'ready' ? 'outline' : 'destructive'} className="shrink-0" aria-label={`${translate('huhubot.chat.connection')}: ${runnerState === 'ready' ? translate('huhubot.chat.ready') : translate('huhubot.chat.offline')}`}>
					{runnerState === 'ready' ? <CircleCheck className="size-3" aria-hidden /> : <CircleAlert className="size-3" aria-hidden />}
					{runnerState === 'ready' ? translate('huhubot.chat.ready') : translate('huhubot.chat.offline')}
				</Badge>
			</div>
			<Button variant="outline" size="sm" onClick={() => { setSelectedSessionId(undefined); setMessages([]); }}><Plus aria-hidden />{translate('huhubot.chat.newSession')}</Button>
		</header>
		<div className="grid min-h-0 flex-1 grid-cols-1 @3xl:grid-cols-[17rem,minmax(0,1fr)]">
			<aside className="flex min-h-0 flex-col border-b border-border bg-sidebar @3xl:border-r @3xl:border-b-0" aria-label={translate('huhubot.chat.roster')}>
				<div className="flex items-center gap-2 border-b border-border p-3"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden /><Label htmlFor="huhubot-chat-search" className="sr-only">{translate('huhubot.chat.search')}</Label><Input id="huhubot-chat-search" className="h-8" value={query} onChange={event => setQuery(event.currentTarget.value)} placeholder={translate('huhubot.chat.search')} /></div>
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					<div className="mb-1 flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground"><span>{translate('huhubot.chat.roster')}</span><span>{filteredAgents.length}</span></div>
					{filteredAgents.length === 0 ? <p className="m-2 text-xs text-muted-foreground">{translate('huhubot.chat.noBots')}</p> : <ul className="m-0 grid list-none gap-1 p-0">{filteredAgents.map(agent => <li key={agent.id}><button type="button" className="flex min-h-14 w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring" aria-label={agent.name} onClick={() => void chooseAgent(agent)}><span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background text-xs font-semibold" aria-hidden>{initials(agent.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{agent.name}</span><span className="block truncate text-xs text-muted-foreground">{statusLabel(agent.enabled ? 'enabled' : 'disabled')}</span></span>{agent.enabled ? <CircleCheck className="size-3.5 shrink-0 text-status-success" aria-label={translate('huhubot.chat.ready')} /> : <X className="size-3.5 shrink-0 text-muted-foreground" aria-label={translate('huhubot.chat.offline')} />}</button></li>)}</ul>}
					<div className="mb-1 mt-4 flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground"><span>{translate('huhubot.chat.sessions')}</span><span>{filteredSessions.length}</span></div>
					<ul className="m-0 grid list-none gap-1 p-0">{filteredSessions.map(session => <li key={session.id}><button type="button" className="flex min-h-12 w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:bg-sidebar-accent" aria-current={selectedSessionId === session.id ? 'true' : undefined} onClick={() => chooseSession(session)}><span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background" aria-hidden>{session.kind === 'group' ? <Users className="size-4" /> : <MessageCircle className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm">{session.title}</span><span className="block truncate text-xs text-muted-foreground">{session.kind === 'group' ? formatCount(session.memberIds.length) : translate('huhubot.chat.direct')}</span></span></button></li>)}</ul>
				</div>
			</aside>
			<main className="flex min-h-0 min-w-0 flex-col" aria-label={selectedSession ? selectedSession.title : translate('huhubot.chat.selectBot')}>
				{!selectedSession ? <div className="flex min-h-0 flex-1 items-center justify-center p-6"><EmptyState icon={<MessageCircle />} title={translate('huhubot.chat.selectBot')} description={agents.length ? translate('huhubot.chat.empty') : translate('huhubot.chat.noBots')} action={!agents.length && host.openSettings ? <Button onClick={host.openSettings}>{translate('huhubot.chat.configure')}</Button> : undefined} /></div> : <>
					<header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-5"><span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-xs font-semibold" aria-hidden>{selectedSession.kind === 'group' ? <Users className="size-4" /> : initials(selectedAgent?.name ?? selectedSession.title)}</span><div className="min-w-0 flex-1"><h2 className="m-0 truncate text-sm font-semibold">{selectedSession.title}</h2><p className="m-0 truncate text-xs text-muted-foreground">{selectedSession.kind === 'group' ? formatCount(selectedSession.memberIds.length) : selectedAgent?.description ?? translate('huhubot.chat.direct')}</p></div>{busy && <Badge variant="secondary"><LoaderCircle className="size-3 animate-spin" aria-hidden />{translate('huhubot.chat.busy')}</Badge>}</header>
					<div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-8"><div className="mx-auto flex w-full max-w-3xl flex-col gap-5">{historyLoading ? <p role="status" className="text-center text-xs text-muted-foreground">{translate('huhubot.chat.loadingHistory')}</p> : messages.length === 0 ? <p className="text-center text-xs text-muted-foreground">{translate('huhubot.chat.noMessages')}</p> : messages.map(message => <MessageBubble key={message.id} message={message} />)}{error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive" role="alert">{error}<Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={() => void loadDirectory()}>{translate('huhubot.chat.retry')}</Button></div>}</div></div>
					<form className="shrink-0 border-t border-border px-3 py-3 sm:px-8" onSubmit={event => { event.preventDefault(); if (!composing.current) void send(); }}><div className="mx-auto flex w-full max-w-3xl items-end gap-2"><Label htmlFor="huhubot-chat-composer" className="sr-only">{translate('huhubot.chat.placeholder')}</Label><Textarea id="huhubot-chat-composer" className="max-h-36 min-h-16 resize-y" value={draft} onChange={event => setDraft(event.currentTarget.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} placeholder={translate('huhubot.chat.placeholder')} disabled={busy || runnerState === 'offline'} aria-describedby="huhubot-chat-draft-status" /><Button type="submit" size="icon" aria-label={translate('huhubot.chat.send')} title={translate('huhubot.chat.send')} disabled={busy || !draft.trim() || runnerState === 'offline'}><Send aria-hidden /></Button></div><p id="huhubot-chat-draft-status" className="m-1 mx-auto max-w-3xl text-right text-[11px] text-muted-foreground">{draft ? translate('huhubot.chat.draftSaved') : ''}</p></form>
				</>}
			</main>
		</div>
	</section>;
}

function MessageBubble({ message }: { message: VisibleMessage }) {
	const translate = useT();
	const user = message.role === 'user';
	return <article className={`flex gap-2 ${user ? 'flex-row-reverse' : ''}`} aria-label={user ? translate('huhubot.chat.you') : message.agentId ?? translate('huhubot.chat.title')}><span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-secondary text-xs" aria-hidden>{user ? 'Y' : <Bot className="size-3.5" />}</span><div className={`min-w-0 max-w-[88%] rounded-xl border border-border px-3 py-2 text-sm ${user ? 'bg-secondary' : 'bg-card'}`}><p className="m-0 whitespace-pre-wrap break-words">{message.text}</p>{message.sourceRefs.length > 0 && <div className="mt-2 flex flex-wrap gap-1" aria-label={translate('huhubot.chat.sources')}>{message.sourceRefs.map(source => <Badge variant="outline" key={`${source.resourceId}:${source.revision ?? ''}`} title={source.resourceId}>{source.title ?? source.resourceId}</Badge>)}</div>}</div></article>;
}

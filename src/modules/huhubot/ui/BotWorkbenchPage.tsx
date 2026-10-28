import { useVisible } from '../../../ui/react/contexts';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Bot, CircleAlert, LoaderCircle, Menu, Paperclip, Plus, RefreshCw, Send, Users, X } from 'lucide-react';
import { Badge } from '../../../ui/components/badge';
import { Button } from '../../../ui/components/button';
import { Checkbox } from '../../../ui/components/checkbox';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { Textarea } from '../../../ui/components/textarea';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/components/popover';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../../../ui/components/alert-dialog';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import type { Agent, DeletionPreview, Session } from '../api';
import { mentionChoices, resolveMentionTargets, selectMention } from '../core/mentions/mentions';
import {
	EMPTY_THREAD,
	WorkbenchClient,
	runIsActive,
	type BotWorkbenchHost,
} from '../services/workbench/workbench-client';
export type { BotWorkbenchHost } from '../services/workbench/workbench-client';
import { TaskSummary } from './tasks/TaskSummary';
import { InlineApproval } from './approvals/ApprovalsPage';
import { AgentProposals } from './agents/AgentProposals';
import { BotManagementMenu } from './BotNavigation';
import { deletionCategoryLabel } from './deletion-category';

export interface BotChatPageProps {
	host: BotWorkbenchHost;
	selectedSessionId?: string;
	onSessionChanged?: (id: string | undefined) => void;
}
function initials(name: string): string {
	return (
		name
			.trim()
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || '?'
	);
}

export function BotWorkbenchPage({ host, selectedSessionId: initialSelection, onSessionChanged }: BotChatPageProps) {
	const visible = useVisible();
	const t = useT(),
		win = useOwnerWindow(),
		id = useId();
	const [workspace] = useState(
		() =>
			host.workspace ??
			new WorkbenchClient(host, {
				after: (ms, action) => {
					const timer = win.setTimeout(action, ms);
					return () => win.clearTimeout(timer);
				},
			}),
	);
	const view = useStore(workspace.store);
	const [selectedId, setSelectedId] = useState(initialSelection);
	const [query, setQuery] = useState(''),
		[rosterOpen, setRosterOpen] = useState(false);
	const [error, setError] = useState<string>(),
		[scopeConsent, setScopeConsent] = useState<'folder' | 'vault'>();
	const [writePath, setWritePath] = useState('');
	const [taskExpanded, setTaskExpanded] = useState(false);
	const [deletion, setDeletion] = useState<DeletionPreview>(),
		[deleting, setDeleting] = useState(false);
	const [retainedMemoryIds, setRetainedMemoryIds] = useState<string[]>([]);
	const composing = useRef(false),
		selectionGeneration = useRef(0),
		input = useRef<HTMLTextAreaElement>(null);
	const selected = view.sessions.find((session) => session.id === selectedId);
	const thread = (selectedId && view.threads[selectedId]) || EMPTY_THREAD;
	const selectedAgent =
		selected?.kind === 'direct' ? view.agents.find((agent) => agent.id === selected.memberIds[0]) : undefined;
	useEffect(() => {
		void workspace.refreshDirectory().catch((cause) => {
			setError(t('huhubot.chat.error'));
			host.report?.(cause);
		});
		return () => {
			if (!host.workspace) workspace.dispose();
		};
	}, [host, workspace, t]);
	useEffect(() => {
		if (selectedId && view.online) void workspace.refreshHistory(selectedId).catch((cause) => host.report?.(cause));
	}, [selectedId, view.online, workspace, host]);
	const perform = async (action: () => Promise<unknown>) => {
		setError(undefined);
		try {
			await action();
		} catch (cause) {
			setError(t('huhubot.chat.error'));
			host.report?.(cause);
		}
	};
	const chooseSession = (session: Session) => {
		selectionGeneration.current++;
		setSelectedId(session.id);
		onSessionChanged?.(session.id);
		setRosterOpen(false);
		setError(undefined);
	};
	const chooseAgent = (agent: Agent) => {
		const generation = ++selectionGeneration.current;
		void perform(async () => {
			const session = await workspace.chooseAgent(agent);
			if (generation === selectionGeneration.current) chooseSession(session);
		});
	};
	const resetSelection = () => {
		selectionGeneration.current++;
		setSelectedId(undefined);
		onSessionChanged?.(undefined);
	};
	const agents = useMemo(
		() =>
			view.agents.filter((agent) =>
				`${agent.name} ${agent.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
			),
		[view.agents, query],
	);
	const sessions = useMemo(
		() =>
			view.sessions.filter(
				(session) => !session.archived && session.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
			),
		[view.sessions, query],
	);
	const mentions = selected ? mentionChoices(view.agents, selected.memberIds) : [];
	const resolution = selected ? resolveMentionTargets(thread.draft, selected, view.agents) : undefined;
	const projections = Object.values(thread.projections);
	const active = thread.sending || projections.some((projection) => runIsActive(projection.status));
	const lastRunId = thread.latestRunId ?? thread.runIds.at(-1);
	const lastApproval = projections.map((projection) => projection.lastApprovalId).find(Boolean);
	const groupAttachmentNames =
		selected?.kind === 'group'
			? (resolution?.valid && resolution.targetAgentIds.length
					? resolution.targetAgentIds
					: [selected.coordinatorId]
				)
					.flatMap((agentId) =>
						agentId ? [view.agents.find((agent) => agent.id === agentId)?.name ?? agentId] : [],
					)
					.join(', ')
			: '';
	const roster = (
		<div className="flex h-full min-h-0 flex-col gap-2 p-2">
			<Label className="sr-only" htmlFor={`${id}-search`}>
				{t('huhubot.chat.search')}
			</Label>
			<Input
				id={`${id}-search`}
				value={query}
				onChange={(event) => setQuery(event.currentTarget.value)}
				placeholder={t('huhubot.chat.search')}
			/>
			<div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
				<h2 className="m-2 text-xs font-medium text-muted-foreground">{t('huhubot.chat.roster')}</h2>
				<ul className="m-0 grid list-none gap-1 p-0">
					{agents.map((agent) => (
						<li key={agent.id}>
							<button
								type="button"
								disabled={!agent.enabled}
								className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
								aria-label={agent.name}
								onClick={() => chooseAgent(agent)}
							>
								<span
									className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background text-xs"
									aria-hidden
								>
									{initials(agent.name)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm">{agent.name}</span>
									<span className="block truncate text-xs text-muted-foreground">
										{agent.enabled ? agent.description : t('huhubot.common.disabled')}
									</span>
								</span>
							</button>
						</li>
					))}
				</ul>
				{!agents.length && <p className="m-2 text-xs text-muted-foreground">{t('huhubot.chat.noBots')}</p>}
				<h2 className="m-2 mt-4 text-xs font-medium text-muted-foreground">{t('huhubot.chat.sessions')}</h2>
				<ul className="m-0 grid list-none gap-1 p-0">
					{sessions.map((session) => (
						<li key={session.id}>
							<button
								type="button"
								className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:bg-accent"
								aria-label={`${session.title} ${session.kind === 'group' ? t('huhubot.chat.group') : t('huhubot.chat.direct')}`}
								aria-current={selectedId === session.id ? 'true' : undefined}
								onClick={() => chooseSession(session)}
							>
								{session.kind === 'group' ? (
									<Users className="size-4 shrink-0" aria-hidden />
								) : (
									<Bot className="size-4 shrink-0" aria-hidden />
								)}
								<span className="min-w-0 truncate text-sm">{session.title}</span>
							</button>
						</li>
					))}
				</ul>
				{(view.agentCursor || view.sessionCursor) && (
					<Button
						variant="outline"
						size="sm"
						className="mt-3 w-full"
						disabled={view.loading}
						onClick={() => void perform(() => workspace.refreshDirectory(true))}
					>
						{t('huhubot.common.more')}
					</Button>
				)}
			</div>
			<div className="flex flex-wrap gap-1 border-t border-border pt-2">
				<Button size="sm" variant="outline" onClick={() => host.openTarget?.('agents')}>
					{t('huhubot.agent.create')}
				</Button>
				<Button size="sm" variant="outline" onClick={() => host.openTarget?.('groups')}>
					{t('huhubot.chat.newGroup')}
				</Button>
				<BotManagementMenu openTarget={host.openTarget} openSettings={host.openSettings} />
			</div>
		</div>
	);
	const attach = (kind: 'note' | 'folder' | 'vault') =>
		void perform(async () => {
			if (!selectedId) return;
			const source = kind === 'note' ? await host.captureSource?.() : await host.captureScope?.(kind);
			if (source) workspace.attach(selectedId, source);
		});
	const errorText = thread.error?.startsWith('MENTION_')
		? t('huhubot.chat.mentionInvalid')
		: thread.error === 'SESSION_BUSY'
			? t('huhubot.chat.busyError')
			: thread.uncertain
				? t('huhubot.chat.startUncertain')
				: (error ?? (thread.error || view.error ? t('huhubot.chat.error') : undefined));

	if (!host.client())
		return (
			<div className="flex h-full items-center justify-center p-6">
				<EmptyState
					icon={<CircleAlert />}
					title={t('huhubot.chat.title')}
					description={t('huhubot.chat.offline')}
					action={
						host.openSettings ? (
							<Button onClick={host.openSettings}>{t('huhubot.chat.configure')}</Button>
						) : undefined
					}
				/>
			</div>
		);
	if (!view.loaded && view.loading)
		return (
			<EmptyState
				icon={<LoaderCircle className="animate-spin" />}
				title={t('huhubot.chat.title')}
				description={t('huhubot.chat.loading')}
			/>
		);
	return (
		<section
			className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden @container"
			aria-label={t('huhubot.chat.title')}
		>
			<header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
				<Popover open={visible && rosterOpen} onOpenChange={setRosterOpen} modal>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="@min-[960px]:hidden"
							aria-label={t('huhubot.chat.rosterToggle')}
						>
							<Menu aria-hidden />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						onCloseAutoFocus={(event) => {
							if (!visible) event.preventDefault();
						}}
						className="h-[min(75vh,36rem)] w-[min(85vw,20rem)] p-0"
						aria-label={t('huhubot.chat.roster')}
					>
						{roster}
					</PopoverContent>
				</Popover>
				<Bot className="size-4" aria-hidden />
				<h1 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">{t('huhubot.chat.title')}</h1>
				<Badge variant={view.online ? 'outline' : 'destructive'}>
					{view.online ? t('huhubot.chat.ready') : t('huhubot.chat.offline')}
				</Badge>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t('huhubot.chat.renewDirectory')}
					disabled={view.loading}
					onClick={() => void perform(() => workspace.refreshDirectory())}
				>
					<RefreshCw aria-hidden />
				</Button>
				<Button variant="outline" size="sm" onClick={resetSelection}>
					<Plus aria-hidden />
					{t('huhubot.chat.newSession')}
				</Button>
			</header>
			<div className="grid min-h-0 flex-1 grid-cols-1 @min-[960px]:grid-cols-[17rem_minmax(0,1fr)]">
				<aside
					className="hidden min-h-0 border-r border-border bg-sidebar @min-[960px]:block"
					aria-label={t('huhubot.chat.roster')}
				>
					{roster}
				</aside>
				<main
					className="flex min-h-0 min-w-0 flex-col"
					aria-label={selected?.title ?? t('huhubot.chat.selectBot')}
				>
					{!selected ? (
						<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
							<EmptyState
								icon={<Bot />}
								title={t('huhubot.chat.selectBot')}
								description={view.agents.length ? t('huhubot.chat.empty') : t('huhubot.chat.noBots')}
								action={
									<Button
										onClick={() =>
											host.openTarget ? host.openTarget('agents') : host.openSettings?.()
										}
									>
										{t('huhubot.chat.configure')}
									</Button>
								}
							/>
						</div>
					) : (
						<>
							<header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
								<div className="min-w-0 flex-1">
									<h2 className="m-0 truncate text-sm font-semibold">{selected.title}</h2>
									<p className="m-0 text-xs text-muted-foreground">
										{selected.kind === 'group'
											? t('huhubot.chat.members', { count: selected.memberIds.length })
											: selectedAgent?.description}
									</p>
								</div>
								{active && (
									<>
										<Badge variant="secondary">{t('huhubot.chat.busy')}</Badge>
										<Button
											variant="outline"
											size="sm"
											disabled={thread.sending}
											onClick={() => void perform(() => workspace.cancelRun(selected.id))}
										>
											{t('huhubot.chat.stop')}
										</Button>
									</>
								)}
								{lastRunId && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => host.openTarget?.('tasks', lastRunId)}
									>
										{t('huhubot.chat.openTask')}
									</Button>
								)}
								<Button
									size="sm"
									variant="ghost"
									onClick={() =>
										void perform(async () => {
											const generation = selectionGeneration.current;
											const preview = await workspace.deletionPreview(selected.id);
											if (generation === selectionGeneration.current) {
												setRetainedMemoryIds([]);
												setDeletion(preview);
											}
										})
									}
								>
									{t('huhubot.chat.deleteBody')}
								</Button>
							</header>
							<div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
								<div className="mx-auto grid w-full max-w-3xl gap-4">
									{thread.historyLoading && !thread.historyLoaded ? (
										<p role="status" className="text-xs text-muted-foreground">
											{t('huhubot.chat.loadingHistory')}
										</p>
									) : (
										!thread.messages.length &&
										!projections.some((projection) => projection.pendingText) && (
											<p className="text-sm text-muted-foreground">
												{t('huhubot.chat.noMessages')}
											</p>
										)
									)}
									{thread.messages.map((message) => (
										<article
											key={message.id}
											className="min-w-0 rounded-lg border border-border bg-card p-3"
										>
											<header className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
												<span>
													{message.role === 'user'
														? t('huhubot.chat.you')
														: (view.agents.find((agent) => agent.id === message.agentId)
																?.name ??
															selectedAgent?.name ??
															selected.title)}
												</span>
												{message.partial && (
													<Badge variant="outline">{t('huhubot.tasks.partial')}</Badge>
												)}
												{message.runId && (
													<Button
														size="sm"
														variant="link"
														className="ml-auto h-auto p-0"
														onClick={() => host.openTarget?.('tasks', message.runId)}
													>
														{t('huhubot.chat.openTask')}
													</Button>
												)}
											</header>
											<p className="m-0 mt-2 whitespace-pre-wrap break-words text-sm">
												{message.text}
											</p>
											{message.sourceRefs.length > 0 && (
												<div className="mt-2 flex flex-wrap gap-1">
													{message.sourceRefs.map((source) => (
														<Button
															key={source.resourceId}
															size="sm"
															variant="outline"
															onClick={() => host.openSource?.(source)}
														>
															{source.title ?? source.resourceId}
														</Button>
													))}
												</div>
											)}
										</article>
									))}
									{projections
										.filter(
											(projection) => projection.pendingText && runIsActive(projection.status),
										)
										.map((projection) => (
											<article
												key={projection.runId}
												className="rounded-lg border border-border p-3"
												aria-live="polite"
											>
												<Badge variant="outline">{t('huhubot.chat.stream')}</Badge>
												<p className="whitespace-pre-wrap break-words text-sm">
													{projection.pendingText}
												</p>
											</article>
										))}
									{lastRunId && (
										<AgentProposals
											key={`proposals:${lastRunId}`}
											client={host.client()!}
											workspace={workspace}
											runId={lastRunId}
										/>
									)}
									{lastRunId && (
										<details
											className="rounded-lg border border-border p-3"
											onToggle={(event) => setTaskExpanded(event.currentTarget.open)}
										>
											<summary className="cursor-pointer text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
												{t('huhubot.tasks.delegations')}
											</summary>
											{taskExpanded && (
												<TaskSummary key={lastRunId} host={host} runId={lastRunId} />
											)}
										</details>
									)}
									{lastApproval && (
										<InlineApproval
											key={lastApproval}
											workspace={workspace}
											client={host.client()!}
											approvalId={lastApproval}
											onResolved={() => void workspace.refreshHistory(selected.id)}
										/>
									)}
									{thread.historyCursor && (
										<Button
											variant="outline"
											disabled={thread.historyLoading}
											onClick={() =>
												void perform(() => workspace.refreshHistory(selected.id, true))
											}
										>
											{t('huhubot.chat.historyMore')}
										</Button>
									)}
								</div>
							</div>
							<footer className="shrink-0 border-t border-border p-3">
								<div className="mx-auto grid w-full max-w-3xl gap-2">
									{errorText && (
										<p role="alert" className="m-0 text-xs text-destructive">
											{errorText}
											{thread.uncertain ? (
												<Button
													size="sm"
													variant="link"
													onClick={() => void perform(() => workspace.retrySend(selected.id))}
												>
													{t('huhubot.chat.retryOriginal')}
												</Button>
											) : (
												<Button
													size="sm"
													variant="link"
													onClick={() =>
														void perform(() => workspace.refreshHistory(selected.id))
													}
												>
													{t('huhubot.chat.retry')}
												</Button>
											)}
										</p>
									)}
									<div className="flex flex-wrap items-center gap-1">
										{[...thread.sources, ...thread.scopes].map((source) => (
											<span
												key={source.resourceId}
												className="inline-flex max-w-full items-center gap-1 rounded border border-border px-2 text-xs"
											>
												<span className="min-w-0 truncate">
													{source.title ?? source.resourceId}
												</span>
												<Button
													size="icon-sm"
													variant="ghost"
													aria-label={t('huhubot.chat.removeSource')}
													onClick={() =>
														workspace.removeAttachment(selected.id, source.resourceId)
													}
												>
													<X aria-hidden />
												</Button>
											</span>
										))}
									</div>
									{selected.kind === 'group' &&
										(thread.sources.length > 0 || thread.scopes.length > 0) && (
											<p className="m-0 text-xs text-muted-foreground">
												{t('huhubot.chat.groupAttachmentRecipients', {
													names: groupAttachmentNames,
												})}
											</p>
										)}
									{host.writeTarget && (
										<div className="flex flex-wrap items-end gap-2">
											<div className="min-w-0 flex-1">
												<Label htmlFor={`${id}-write-path`} className="text-xs">
													{t('huhubot.chat.writeTarget')}
												</Label>
												<Input
													id={`${id}-write-path`}
													placeholder={t('huhubot.chat.writePath')}
													value={writePath}
													onChange={(event) => setWritePath(event.currentTarget.value)}
												/>
											</div>
											<Button
												variant="outline"
												size="sm"
												disabled={!writePath.trim()}
												onClick={() =>
													void perform(async () => {
														const target = await host.writeTarget!(
															writePath.trim(),
															selected.id,
														);
														if (target) {
															workspace.setWriteTarget(selected.id, {
																target,
																path: writePath.trim(),
															});
															setWritePath('');
														}
													})
												}
											>
												{t('huhubot.chat.authorizeWrite')}
											</Button>
										</div>
									)}
									{thread.writeTarget && (
										<div className="flex items-center gap-2 rounded border border-border p-2 text-xs">
											<span className="min-w-0 flex-1 break-all">
												{t('huhubot.chat.writeTarget')}: {thread.writeTarget.path}
											</span>
											<Button
												size="icon-sm"
												variant="ghost"
												aria-label={t('huhubot.common.close')}
												onClick={() => workspace.setWriteTarget(selected.id, undefined)}
											>
												<X aria-hidden />
											</Button>
										</div>
									)}
									{selected.kind === 'group' && (
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<Label htmlFor={`${id}-mention`}>{t('huhubot.chat.mention')}</Label>
											<select
												id={`${id}-mention`}
												value=""
												className="h-9 max-w-full rounded border border-input bg-background px-2"
												onChange={(event) => {
													const agent = view.agents.find(
														(item) => item.id === event.currentTarget.value,
													);
													if (!agent) return;
													const draft = resolution?.valid
															? thread.draft
															: { ...thread.draft, mentions: [] },
														start = input.current?.selectionStart ?? draft.text.length,
														end = input.current?.selectionEnd ?? start;
													workspace.setDraft(
														selected.id,
														selectMention(draft, start, end, agent),
													);
													input.current?.focus();
												}}
											>
												<option value="">{t('huhubot.chat.mention')}</option>
												{mentions.map((choice) => (
													<option key={choice.agentId} value={choice.agentId}>
														{choice.identityLabel}
													</option>
												))}
											</select>
											{thread.draft.mentions.length > 0 && (
												<Button
													size="sm"
													variant="ghost"
													onClick={() =>
														workspace.setDraft(selected.id, {
															text: thread.draft.text,
															mentions: [],
														})
													}
												>
													{t('huhubot.common.close')} @
												</Button>
											)}
											<span>
												{t('huhubot.chat.target')}:{' '}
												{resolution?.valid && resolution.targetAgentIds.length
													? resolution.targetAgentIds
															.map(
																(target) =>
																	view.agents.find((agent) => agent.id === target)
																		?.name ?? target,
															)
															.join(', ')
													: (view.agents.find((agent) => agent.id === selected.coordinatorId)
															?.name ?? t('huhubot.chat.coordinator'))}
											</span>
										</div>
									)}
									<Label htmlFor={`${id}-composer`} className="sr-only">
										{t('huhubot.chat.placeholder')}
									</Label>
									<Textarea
										ref={input}
										id={`${id}-composer`}
										value={thread.draft.text}
										onChange={(event) => workspace.setText(selected.id, event.currentTarget.value)}
										placeholder={t('huhubot.chat.placeholder')}
										className="min-h-20 max-h-48 resize-y"
										onCompositionStart={() => {
											composing.current = true;
										}}
										onCompositionEnd={() => {
											composing.current = false;
										}}
										onKeyDown={(event) => {
											if (
												event.key === 'Enter' &&
												!event.shiftKey &&
												!event.nativeEvent.isComposing &&
												!composing.current
											) {
												event.preventDefault();
												if (!active && !thread.uncertain && thread.draft.text.trim())
													void perform(() => workspace.send(selected.id));
											}
										}}
									/>
									<div className="flex flex-wrap items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={!host.captureSource}
											onClick={() => attach('note')}
										>
											<Paperclip aria-hidden />
											{t('huhubot.chat.attach')}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={!host.captureScope}
											onClick={() => setScopeConsent('folder')}
										>
											{t('huhubot.chat.attachFolder')}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											disabled={!host.captureScope}
											onClick={() => setScopeConsent('vault')}
										>
											{t('huhubot.chat.attachVault')}
										</Button>
										<span
											data-slot="bot-draft-status"
											className="basis-full text-xs text-muted-foreground @min-[42rem]:min-w-0 @min-[42rem]:flex-1 @min-[42rem]:basis-auto"
										>
											{t('huhubot.chat.draftSaved')}
										</span>
										<Button
											disabled={
												!thread.draft.text.trim() || active || thread.uncertain || !view.online
											}
											onClick={() => void perform(() => workspace.send(selected.id))}
										>
											<Send aria-hidden />
											{t('huhubot.chat.send')}
										</Button>
									</div>
								</div>
							</footer>
						</>
					)}
				</main>
			</div>
			<AlertDialog
				open={visible && !!scopeConsent}
				onOpenChange={(open) => {
					if (!open) setScopeConsent(undefined);
				}}
			>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						if (!visible) event.preventDefault();
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{scopeConsent === 'vault' ? t('huhubot.chat.attachVault') : t('huhubot.chat.attachFolder')}
						</AlertDialogTitle>
						<AlertDialogDescription>{t('huhubot.chat.scopeConsent')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('huhubot.common.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (scopeConsent) attach(scopeConsent);
								setScopeConsent(undefined);
							}}
						>
							{t('huhubot.common.confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog
				open={visible && !!deletion}
				onOpenChange={(open) => {
					if (!open && !deleting) setDeletion(undefined);
				}}
			>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						if (!visible) event.preventDefault();
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('huhubot.chat.deleteBody')}</AlertDialogTitle>
						<AlertDialogDescription>{t('huhubot.chat.deleteConfirm')}</AlertDialogDescription>
					</AlertDialogHeader>
					<ul className="m-0 list-disc pl-5 text-xs">
						{deletion?.categories.map((category) => (
							<li key={category.kind}>
								{deletionCategoryLabel(category.kind)}: {category.count}
								{category.retained ? ` · ${t('huhubot.chat.retained')}` : ''}
							</li>
						))}
					</ul>
					{deletion?.categories
						.filter((category) => category.kind.startsWith('memory:'))
						.map((category) => (
							<label key={category.kind} className="flex min-h-11 items-center gap-2 text-xs">
								<Checkbox
									checked={retainedMemoryIds.includes(category.kind.slice(7))}
									onCheckedChange={(checked) => {
										setRetainedMemoryIds((previous) =>
											checked === true
												? [...previous, category.kind.slice(7)]
												: previous.filter((id) => id !== category.kind.slice(7)),
										);
									}}
								/>
								{t('huhubot.data.retainMemory')}: {category.kind.slice(7)}
							</label>
						))}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>{t('huhubot.common.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={(event) => {
								event.preventDefault();
								if (!selected || !deletion) return;
								setDeleting(true);
								void perform(async () => {
									await workspace.deleteSession(selected.id, deletion, retainedMemoryIds);
									setDeletion(undefined);
									resetSelection();
								}).finally(() => setDeleting(false));
							}}
						>
							{t('huhubot.chat.deleteConfirmAction')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

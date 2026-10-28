import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import {
	Check,
	CircleAlert,
	LoaderCircle,
	Pin,
	RefreshCw,
	RotateCcw,
	Save,
	ShieldCheck,
	Trash2,
	X,
} from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Label } from '../../../../ui/components/label';
import { Textarea } from '../../../../ui/components/textarea';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { t } from '../../../../shared/i18n';
import type {
	Agent,
	BotClient,
	CommandMeta,
	MemoryItem,
	MemoryCandidate,
	MemoryNamespace,
	MemoryObject,
	MemoryProposal,
	Session,
} from '../../api';
import { MemoryClient, type ContextScope } from '../../services/workbench/memory-client';
import { BotRpcError } from '../../core/protocol/connection';
import type { WorkbenchClient, WorkbenchView } from '../../services/workbench/workbench-client';

import { BotBackButton } from '../BotNavigation';
export interface MemoryWorkbenchHost {
	openTarget?: (section: string, id?: string) => void;
	client: () => BotClient | undefined;
	namespace?: () => MemoryNamespace;
	namespaces?: readonly MemoryNamespace[];
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
}

type LoadState = 'loading' | 'ready' | 'error';

function commandMeta(client: BotClient): CommandMeta {
	const id =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random()}`;
	return {
		commandId: id,
		idempotencyKey: id,
		profileId: client.hello.profile.profileId,
		commandEpoch: client.hello.profile.commandEpoch,
	};
}

function namespaceKey(namespace: MemoryNamespace): string {
	return `${namespace.kind}:${namespace.id}`;
}
function namespaceLabel(
	namespace: MemoryNamespace,
	agents: readonly Agent[],
	threads: WorkbenchView['contextThreads'],
): string {
	if (namespace.kind === 'global') return t('huhubot.memory.globalScope');
	if (namespace.kind === 'temporary') {
		let runId: string | undefined;
		for (const thread of threads)
			if (thread.namespace.kind === 'temporary' && thread.namespace.id === namespace.id) runId = thread.runId;
		return `${t('huhubot.memory.temporaryScope')} · ${runId ?? namespace.id}`;
	}
	const agent = agents.find((value) => value.id === namespace.id);
	if (!agent) return `${t('huhubot.memory.agentScope')} · ${namespace.id}`;
	const peers = agents.filter((value) => value.name === agent.name && value.id !== agent.id);
	let suffixLength = Math.min(8, agent.id.length);
	while (
		suffixLength < agent.id.length &&
		peers.some((peer) => peer.id.slice(-suffixLength) === agent.id.slice(-suffixLength))
	)
		suffixLength++;
	return `${t('huhubot.memory.agentScope')} · ${agent.name}${peers.length ? ` · ${agent.id.slice(-suffixLength)}` : ''}`;
}
function itemText(item: MemoryItem): string {
	return item.state === 'active' ? item.body.text : t('huhubot.memory.forgotten');
}
function activeItem(object: MemoryObject): MemoryItem | undefined {
	return object.kind === 'item' && object.item.state === 'active' ? object.item : undefined;
}

export function MemoryWorkbenchPage({ host }: { host: MemoryWorkbenchHost }) {
	const translate = useT();
	const client = host.client(),
		uniqueId = useId();
	const [memory] = useState(() => new MemoryClient(host.client, () => clearPrivateState()));
	const memoryView = useStore(memory.store);
	const [directory, setDirectory] = useState<Agent[]>([]);
	const [directoryCursor, setDirectoryCursor] = useState<string>();
	const [sessions, setSessions] = useState<Session[]>([]);
	const [contextThreads, setContextThreads] = useState<WorkbenchView['contextThreads']>([]);
	const scopeLabel = (namespace: MemoryNamespace) => namespaceLabel(namespace, directory, contextThreads);
	const [, observeConnection] = useState(client);
	const [temporaryIds, setTemporaryIds] = useState<string[]>([]);
	useEffect(() => {
		const update = () => {
			if (!host.workspace) return;
			setDirectory(host.workspace.getSnapshot().agents);
			setDirectoryCursor(host.workspace.getSnapshot().agentCursor ?? host.workspace.getSnapshot().sessionCursor);
			setSessions(host.workspace.getSnapshot().sessions);
			setContextThreads(host.workspace.getSnapshot().contextThreads);
			observeConnection(host.client());
			const ids = [
				...new Set(
					host.workspace
						.getSnapshot()
						.contextThreads.flatMap((thread) =>
							thread.namespace.kind === 'temporary' ? [thread.namespace.id] : [],
						),
				),
			];
			setTemporaryIds((previous) => (JSON.stringify(previous) === JSON.stringify(ids) ? previous : ids));
		};
		update();
		if (host.workspace && !host.workspace.getSnapshot().loaded && !host.workspace.getSnapshot().loading)
			void host.workspace.refreshDirectory();
		return host.workspace?.subscribe(update);
	}, [host]);
	useEffect(() => {
		if (host.workspace) return;
		const controller = new AbortController();
		if (client?.agents?.list)
			void client.agents
				.list({ profileId: client.hello.profile.profileId, limit: 100 }, { signal: controller.signal })
				.then((page) => {
					if (!controller.signal.aborted) setDirectory(page.items);
				})
				.catch((cause) => host.report?.(cause));
		return () => controller.abort();
	}, [client, host]);
	const choices = useMemo(() => {
		const initial = !client
			? []
			: host.namespaces?.length
				? [...host.namespaces]
				: host.namespace
					? [host.namespace()]
					: [];
		const values: MemoryNamespace[] = [
			...initial.map((namespace) =>
				namespace.kind === 'global' && client
					? { ...namespace, id: client.hello.profile.profileId }
					: namespace,
			),
			...directory.map((agent) => ({ kind: 'agent' as const, id: agent.id })),
			...temporaryIds.map((id) => ({ kind: 'temporary' as const, id })),
		];
		if (client) values.push({ kind: 'global', id: client.hello.profile.profileId });
		return [...new Map(values.map((namespace) => [namespaceKey(namespace), namespace])).values()];
	}, [host, client, directory, temporaryIds]);
	const [selectedKey, setSelectedKey] = useState(() => (choices[0] ? namespaceKey(choices[0]) : ''));
	const selectedNamespace = choices.find((namespace) => namespaceKey(namespace) === selectedKey) ?? choices[0];
	const [selectedContextKey, setSelectedContextKey] = useState('');
	const contextChoices = useMemo(() => {
		if (!selectedNamespace || selectedNamespace.kind === 'global') return [];
		return [
			...sessions
				.filter(
					(session) => selectedNamespace.kind === 'agent' && session.memberIds.includes(selectedNamespace.id),
				)
				.map((session) => ({
					key: `session:${session.id}`,
					label: session.title,
					scope: { kind: 'session' as const, id: session.id },
					runId: undefined,
				})),
			...contextThreads
				.filter(
					(thread) =>
						thread.namespace.kind === selectedNamespace.kind &&
						thread.namespace.id === selectedNamespace.id,
				)
				.map((thread) => ({
					key: `run:${thread.runId}`,
					label: thread.runId,
					scope: { kind: 'work_thread' as const, id: thread.workThreadId },
					runId: thread.runId,
				})),
		];
	}, [sessions, selectedNamespace, contextThreads]);
	const contextSelection = contextChoices.find((choice) => choice.key === selectedContextKey);
	const contextScope = useMemo<ContextScope | undefined>(() => contextSelection?.scope, [contextSelection]);
	const page = memoryView.page;
	const loadState: LoadState = memoryView.loading ? 'loading' : memoryView.error ? 'error' : 'ready';
	const [error, setError] = useState<string>();
	const [correction, setCorrection] = useState<{ id: string; text: string }>();
	const [proposalText, setProposalText] = useState('');
	const [proposal, setProposal] = useState<MemoryProposal>();
	const [working, setWorking] = useState<string>();
	const authorizationGeneration = useRef(0);
	const alive = useRef(true);
	useEffect(
		() => () => {
			alive.current = false;
			authorizationGeneration.current++;
		},
		[],
	);
	const clearPrivateState = useCallback(() => {
		authorizationGeneration.current++;
		memory.clear();
		setProposal(undefined);
		setCorrection(undefined);
		setProposalText('');
		setWorking(undefined);
		setError(undefined);
	}, [memory]);

	const load = useCallback(
		async (namespace = selectedNamespace) => {
			if (!namespace) return;
			if (!client || client.state === 'closed') return;
			await memory.load(namespace, undefined, contextScope, contextSelection?.runId);
		},
		[memory, selectedNamespace, contextScope, contextSelection?.runId, client],
	);
	useEffect(() => {
		void load();
	}, [load]);
	useEffect(() => () => memory.dispose(), [memory]);
	useEffect(() => client?.onClose(clearPrivateState), [client, clearPrivateState]);
	useEffect(() => {
		let revision = host.workspace?.getSnapshot().permissionRevision;
		return host.workspace?.subscribe(() => {
			const next = host.workspace?.getSnapshot().permissionRevision;
			if (next !== revision) {
				revision = next;
				clearPrivateState();
			}
		});
	}, [host.workspace, clearPrivateState]);

	const objects = useMemo(() => page?.items ?? [], [page]);
	const items = useMemo(() => objects.map(activeItem).filter((item): item is MemoryItem => !!item), [objects]);
	const settings = page?.settings;
	const pendingObjects = objects.filter((object) => object.kind === 'candidate' || object.kind === 'job');

	const run = async (key: string, action: (isCurrent: () => boolean) => Promise<void>) => {
		const generation = authorizationGeneration.current;
		const isCurrent = () =>
			alive.current && authorizationGeneration.current === generation && host.client()?.state !== 'closed';
		setWorking(key);
		setError(undefined);
		try {
			await action(isCurrent);
		} catch (cause) {
			if (cause instanceof BotRpcError && cause.data.kind === 'CAPABILITY_DENIED') {
				clearPrivateState();
				return;
			}
			if (isCurrent()) {
				setError(translate('huhubot.memory.error'));
				host.report?.(cause);
			}
		} finally {
			if (isCurrent()) setWorking(undefined);
		}
	};
	const pin = (item: MemoryItem) =>
		run(`pin:${item.id}`, async (isCurrent) => {
			const current = host.client();
			if (!current || !selectedNamespace || item.state !== 'active') return;
			await current.memory.pin({
				...commandMeta(current),
				expectedRevision: item.revision,
				namespace: selectedNamespace,
				id: item.id,
				pinned: !item.pinned,
			});
			if (!isCurrent()) return;
			await load();
		});
	const forget = (item: MemoryItem) =>
		run(`forget:${item.id}`, async (isCurrent) => {
			const current = host.client();
			if (!current || !selectedNamespace) return;
			if (selectedNamespace.kind === 'global') {
				const value = await current.memory.proposeGlobal({
					...commandMeta(current),
					expectedRevision: item.revision,
					scope: item.scope,
					operation: 'delete',
					targetItemId: item.id,
					sources: [],
				});
				if (!isCurrent()) return;
				setProposal(value);
				return;
			}
			await current.memory.forget({
				...commandMeta(current),
				expectedRevision: item.revision,
				namespace: selectedNamespace,
				id: item.id,
			});
			if (!isCurrent()) return;
			await load();
		});
	const saveCorrection = (item: MemoryItem) =>
		run(`correct:${item.id}`, async (isCurrent) => {
			const current = host.client();
			if (!current || !selectedNamespace || item.state !== 'active' || !correction?.text.trim()) return;
			if (selectedNamespace.kind === 'global') {
				const value = await current.memory.proposeGlobal({
					...commandMeta(current),
					expectedRevision: item.revision,
					scope: item.scope,
					operation: 'update',
					targetItemId: item.id,
					text: correction.text.trim(),
					sources: [],
				});
				if (!isCurrent()) return;
				setProposal(value);
				setCorrection(undefined);
				return;
			}
			await current.memory.correct({
				...commandMeta(current),
				expectedRevision: item.revision,
				namespace: selectedNamespace,
				action: 'correct',
				id: item.id,
				text: correction.text.trim(),
			});
			if (!isCurrent()) return;
			setCorrection(undefined);
			await load();
		});
	const applyCandidate = (candidate: MemoryCandidate) =>
		run(`candidate:${candidate.id}`, async (isCurrent) => {
			const current = host.client();
			if (!current || !selectedNamespace || candidate.state !== 'pending' || candidate.operation !== 'correct')
				return;
			await current.memory.correct({
				...commandMeta(current),
				namespace: selectedNamespace,
				expectedRevision: candidate.targetRevision,
				action: 'apply_candidate',
				id: candidate.targetItemId,
				candidateId: candidate.id,
				candidateRevision: candidate.revision,
			});
			if (!isCurrent()) return;
			await load();
		});
	const toggleAutomatic = () =>
		run('auto', async (isCurrent) => {
			const current = host.client();
			if (!current || !selectedNamespace || !page) return;
			await current.memory.setAutoMaintenance({
				...commandMeta(current),
				expectedRevision: settings?.revision ?? page.namespaceRevision,
				namespace: selectedNamespace,
				enabled: !(settings?.enabled ?? false),
			});
			if (!isCurrent()) return;
			await load();
		});
	const proposeGlobal = () =>
		run('proposal', async (isCurrent) => {
			const current = host.client();
			if (!current || !proposalText.trim()) return;
			if (selectedNamespace?.kind === 'agent') {
				await current.memory.correct({
					...commandMeta(current),
					expectedRevision: page?.namespaceRevision ?? '1',
					namespace: selectedNamespace,
					action: 'add',
					scope: { kind: 'profile' },
					text: proposalText.trim(),
				});
				if (!isCurrent()) return;
				setProposalText('');
				await load();
				return;
			}
			const result = await current.memory.proposeGlobal({
				...commandMeta(current),
				expectedRevision: page?.namespaceRevision ?? '0',
				scope: { kind: 'profile' },
				operation: 'create',
				text: proposalText.trim(),
				sources: [],
			});
			if (!isCurrent()) return;
			setProposal(result);
			memory.accept({ kind: 'proposal', proposal: result });
			setProposalText('');
		});
	const resolveProposal = (decision: 'approve' | 'reject', chosen = proposal) =>
		run(`proposal:${decision}`, async (isCurrent) => {
			const current = host.client();
			if (!current || !chosen) return;
			await current.memory.resolveGlobal({
				...commandMeta(current),
				expectedRevision: chosen.revision,
				id: chosen.id,
				decision,
				previewHash: chosen.previewHash,
			});
			if (!isCurrent()) return;
			setProposal(undefined);
			await load();
		});

	if (loadState === 'loading')
		return (
			<div className="flex h-full min-h-0 items-center justify-center p-6">
				<EmptyState
					icon={<LoaderCircle className="animate-spin" />}
					title={translate('huhubot.memory.title')}
					description={translate('huhubot.memory.loading')}
				/>
			</div>
		);
	if (loadState === 'error' && !client)
		return (
			<div className="flex h-full min-h-0 items-center justify-center p-6">
				<EmptyState
					icon={<CircleAlert />}
					title={translate('huhubot.memory.title')}
					description={translate('huhubot.memory.offline')}
				/>
			</div>
		);

	return (
		<section
			className="flex h-full min-h-0 flex-col overflow-hidden @container"
			aria-label={translate('huhubot.memory.title')}
		>
			<header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-5">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<div className="min-w-0 flex-1">
					<h1 className="m-0 truncate text-sm font-semibold">{translate('huhubot.memory.title')}</h1>
					<p
						className="m-0 truncate text-xs text-muted-foreground"
						title={
							selectedNamespace
								? `${scopeLabel(selectedNamespace)} (${namespaceKey(selectedNamespace)})`
								: undefined
						}
					>
						{selectedNamespace ? scopeLabel(selectedNamespace) : translate('huhubot.memory.offline')}
					</p>
				</div>
				{choices.length > 1 && (
					<>
						<Label htmlFor={`${uniqueId}-scope`} className="sr-only">
							{translate('huhubot.memory.scopeSelect')}
						</Label>
						<select
							id={`${uniqueId}-scope`}
							className="h-9 max-w-full rounded border border-input bg-background px-2 text-sm"
							value={selectedNamespace ? namespaceKey(selectedNamespace) : ''}
							title={
								selectedNamespace
									? `${scopeLabel(selectedNamespace)} (${namespaceKey(selectedNamespace)})`
									: undefined
							}
							disabled={!!working}
							onChange={(event) => {
								setSelectedKey(event.currentTarget.value);
								setSelectedContextKey('');
								clearPrivateState();
								setProposal(undefined);
								setCorrection(undefined);
								setProposalText('');
							}}
						>
							{choices.map((namespace) => (
								<option
									key={namespaceKey(namespace)}
									value={namespaceKey(namespace)}
									title={`${scopeLabel(namespace)} (${namespaceKey(namespace)})`}
								>
									{scopeLabel(namespace)}
								</option>
							))}
						</select>
					</>
				)}
				{directoryCursor && (
					<Button variant="outline" size="sm" onClick={() => void host.workspace?.refreshDirectory(true)}>
						{translate('huhubot.common.more')}
					</Button>
				)}
				<Button
					size="icon-sm"
					variant="outline"
					aria-label={translate('huhubot.memory.refresh')}
					title={translate('huhubot.memory.refresh')}
					onClick={() => void load()}
					disabled={!!working}
				>
					<RefreshCw aria-hidden />
				</Button>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
				{selectedNamespace && selectedNamespace.kind !== 'global' && (
					<div className="mb-3 min-w-0 space-y-2">
						<Label htmlFor={`${uniqueId}-context-scope`}>{translate('huhubot.memory.contextScope')}</Label>
						<select
							id={`${uniqueId}-context-scope`}
							className="h-9 w-full min-w-0 max-w-full rounded border border-input bg-background px-2 text-sm"
							value={contextSelection?.key ?? ''}
							disabled={!!working}
							onChange={(event) => {
								setSelectedContextKey(event.currentTarget.value);
								clearPrivateState();
							}}
						>
							<option value="">{translate('huhubot.memory.chooseContextScope')}</option>
							{contextChoices.map((choice) => (
								<option key={choice.key} value={choice.key}>
									{choice.scope.kind === 'work_thread'
										? `${translate('huhubot.memory.workThread')} · ${choice.label}`
										: choice.label}
								</option>
							))}
						</select>
						{!contextScope && (
							<p className="m-0 text-xs text-muted-foreground">
								{translate('huhubot.memory.chooseContextScope')}
							</p>
						)}
					</div>
				)}
				{(error || memoryView.error) && (
					<div
						className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
						role="alert"
					>
						<CircleAlert className="size-4" aria-hidden />
						<span className="min-w-0 flex-1">{error ?? translate('huhubot.memory.error')}</span>
						<Button size="sm" variant="link" onClick={() => void load()}>
							{translate('huhubot.memory.retry')}
						</Button>
					</div>
				)}
				<div className="mx-auto grid w-full min-w-0 max-w-5xl gap-4">
					<section
						className="rounded-lg border border-border bg-card p-4"
						aria-label={translate('huhubot.memory.automatic')}
					>
						<div className="flex flex-wrap items-center gap-2">
							<ShieldCheck className="size-4" aria-hidden />
							<h2 className="m-0 text-sm font-semibold">
								{settings?.enabled
									? translate('huhubot.memory.autoOn')
									: translate('huhubot.memory.autoOff')}
							</h2>
							<Badge variant={settings?.eligible ? 'outline' : 'secondary'}>
								{settings?.eligible
									? translate('huhubot.memory.active')
									: translate('huhubot.memory.manual')}
							</Badge>
							<Button
								className="ml-auto"
								size="sm"
								variant="outline"
								onClick={() => void toggleAutomatic()}
								disabled={!settings || !!working}
							>
								{settings?.enabled
									? translate('huhubot.memory.cancel')
									: translate('huhubot.memory.automatic')}
							</Button>
						</div>
						{settings?.reason && (
							<p className="mb-0 mt-2 text-xs text-muted-foreground">
								{translate('huhubot.memory.pauseReason', { reason: settings.reason })}
							</p>
						)}
					</section>
					<section className="grid min-w-0 gap-3" aria-label={translate('huhubot.memory.title')}>
						{items.length === 0 && pendingObjects.length === 0 ? (
							<div className="min-w-0 rounded-lg border border-dashed border-border p-3">
								<EmptyState
									size="sm"
									className="min-w-0 max-w-full [&_h3]:max-w-full [&_h3]:break-words"
									descriptionClassName="max-w-full break-all"
									icon={<RotateCcw />}
									title={translate('huhubot.memory.empty')}
									description={selectedNamespace ? scopeLabel(selectedNamespace) : undefined}
								/>
							</div>
						) : (
							items.map((item) => (
								<MemoryCard
									key={item.id}
									item={item}
									busy={!!working}
									correction={correction?.id === item.id ? correction.text : undefined}
									onCorrection={(text) => setCorrection({ id: item.id, text })}
									onSaveCorrection={() => void saveCorrection(item)}
									onCancelCorrection={() => setCorrection(undefined)}
									onPin={() => void pin(item)}
									onForget={() => void forget(item)}
								/>
							))
						)}
						{pendingObjects.length > 0 && (
							<div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
								<Badge variant="secondary">{translate('huhubot.memory.jobs')}</Badge>
								<span className="ml-2">
									{pendingObjects.length} {translate('huhubot.memory.pending').toLocaleLowerCase()}
								</span>
							</div>
						)}
					</section>
					{selectedNamespace?.kind === 'global' || selectedNamespace?.kind === 'agent' ? (
						<section
							className="rounded-lg border border-border bg-card p-4"
							aria-label={translate('huhubot.memory.propose')}
						>
							<div className="mb-2 flex items-center gap-2">
								<Save className="size-4" aria-hidden />
								<h2 className="m-0 text-sm font-semibold">
									{selectedNamespace?.kind === 'agent'
										? translate('huhubot.memory.add')
										: translate('huhubot.memory.propose')}
								</h2>
							</div>
							<Label htmlFor={`${uniqueId}-proposal`} className="sr-only">
								{translate(
									selectedNamespace?.kind === 'agent'
										? 'huhubot.memory.addPlaceholder'
										: 'huhubot.memory.proposalPlaceholder',
								)}
							</Label>
							<Textarea
								id={`${uniqueId}-proposal`}
								value={proposalText}
								onChange={(event) => setProposalText(event.currentTarget.value)}
								placeholder={translate(
									selectedNamespace?.kind === 'agent'
										? 'huhubot.memory.addPlaceholder'
										: 'huhubot.memory.proposalPlaceholder',
								)}
								className="min-h-20 resize-y"
								disabled={!!proposal || !!working}
							/>
							<Button
								className="mt-2"
								size="sm"
								onClick={() => void proposeGlobal()}
								disabled={!proposalText.trim() || !!proposal || !!working || memoryView.error || !page}
							>
								{selectedNamespace?.kind === 'agent'
									? translate('huhubot.memory.add')
									: translate('huhubot.memory.propose')}
							</Button>
						</section>
					) : null}
					{objects.flatMap((object) =>
						object.kind === 'candidate'
							? [
									<article key={object.candidate.id} className="rounded-lg border border-border p-3">
										<h2 className="text-sm font-semibold">
											{translate('huhubot.memory.candidates')}
										</h2>
										{object.candidate.state === 'pending' ||
										object.candidate.state === 'applied' ? (
											<p className="whitespace-pre-wrap break-words text-sm">
												{object.candidate.body.text}
											</p>
										) : null}
										<p className="text-xs text-muted-foreground">
											{object.candidate.reason ?? object.candidate.id}
										</p>
										{object.candidate.operation === 'correct' &&
											object.candidate.state === 'pending' && (
												<Button
													variant="outline"
													size="sm"
													disabled={!!working}
													onClick={() => void applyCandidate(object.candidate)}
												>
													{translate('huhubot.memory.apply')}
												</Button>
											)}
									</article>,
								]
							: object.kind === 'job'
								? [
										<article key={object.job.id} className="rounded-lg border border-border p-3">
											<h2 className="text-sm font-semibold">
												{translate('huhubot.memory.jobs')}
											</h2>
											<p className="break-all text-xs text-muted-foreground">
												{object.job.sourceRunId}
											</p>
											{object.job.run && (
												<Badge variant="outline">
													{translate(`huhubot.status.${object.job.run.status}`)}
												</Badge>
											)}
											{object.job.reason && <p className="text-xs">{object.job.reason}</p>}
										</article>,
									]
								: object.kind === 'context'
									? [
											<article
												key={object.context.runId}
												className="rounded-lg border border-border p-3"
											>
												<h2 className="text-sm font-semibold">
													{translate('huhubot.memory.context')}
												</h2>
												<p className="break-all text-xs text-muted-foreground">
													{object.context.scope.id} · {object.context.runId}
												</p>
												{!memoryView.contextLoaded[object.context.runId] && (
													<Button
														variant="outline"
														size="sm"
														disabled={
															memoryView.contextLoading[object.context.runId] || !!working
														}
														onClick={() => void memory.loadContext(object.context.runId)}
													>
														{translate('huhubot.memory.inspectContext')}
													</Button>
												)}
												{memoryView.contextLoaded[object.context.runId] &&
													object.context.entries.map((entry) => (
														<div
															key={`${entry.id}:${'partIndex' in entry ? (entry.partIndex ?? 0) : 0}`}
															className="mt-2 border-t border-border pt-2"
														>
															<Badge variant="outline">
																{translate('huhubot.common.revision')} {entry.revision}
															</Badge>
															{entry.state === 'readable' && (
																<p className="whitespace-pre-wrap break-words text-sm">
																	{entry.text}
																</p>
															)}
														</div>
													))}
												{memoryView.contextLoaded[object.context.runId] &&
													object.context.nextCursor && (
														<Button
															variant="outline"
															size="sm"
															disabled={
																memoryView.contextLoading[object.context.runId] ||
																!!working
															}
															onClick={() =>
																void memory.loadContextMore(
																	object.context.runId,
																	object.context.nextCursor!,
																)
															}
														>
															{translate('huhubot.memory.contextMore')}
														</Button>
													)}
											</article>,
										]
									: [],
					)}
					{[
						...new Map(
							[
								...objects.flatMap((object) =>
									object.kind === 'proposal' && object.proposal.state === 'pending'
										? [object.proposal]
										: [],
								),
								...(proposal ? [proposal] : []),
							].map((value) => [value.id, value]),
						).values(),
					].map((value) => (
						<ProposalCard
							key={value.id}
							proposal={value}
							busy={!!working}
							onResolve={(decision) => void resolveProposal(decision, value)}
						/>
					))}
					{Object.entries(memoryView.cursors)
						.filter(([, cursor]) => cursor)
						.map(([kind]) => (
							<Button
								key={kind}
								variant="outline"
								onClick={() => {
									if (selectedNamespace)
										void memory.load(
											selectedNamespace,
											kind as 'item' | 'candidate' | 'job' | 'proposal' | 'context',
											contextScope,
											contextSelection?.runId,
										);
								}}
							>
								{translate('huhubot.common.more')} ·{' '}
								{translate(
									kind === 'item'
										? 'huhubot.memory.title'
										: kind === 'proposal'
											? 'huhubot.memory.proposals'
											: kind === 'candidate'
												? 'huhubot.memory.candidates'
												: kind === 'job'
													? 'huhubot.memory.jobs'
													: 'huhubot.memory.context',
								)}
							</Button>
						))}
				</div>
			</div>
		</section>
	);
}

function MemoryCard({
	item,
	busy,
	correction,
	onCorrection,
	onSaveCorrection,
	onCancelCorrection,
	onPin,
	onForget,
}: {
	item: MemoryItem;
	busy: boolean;
	correction?: string;
	onCorrection: (text: string) => void;
	onSaveCorrection: () => void;
	onCancelCorrection: () => void;
	onPin: () => void;
	onForget: () => void;
}) {
	const translate = useT(),
		cardId = useId();
	const body = item.state === 'active' ? item.body : undefined;
	return (
		<article className="rounded-lg border border-border bg-card p-4" aria-label={itemText(item)}>
			<div className="flex flex-wrap items-start gap-2">
				<div className="min-w-0 flex-1">
					<p className="m-0 whitespace-pre-wrap break-words text-sm">{itemText(item)}</p>
					<div className="mt-2 flex flex-wrap gap-1">
						<Badge variant="outline">
							{translate('huhubot.memory.revision', { revision: item.revision })}
						</Badge>
						<Badge variant="outline">
							{item.pinned ? translate('huhubot.memory.pinned') : translate('huhubot.memory.active')}
						</Badge>
						{body && (
							<Badge variant="secondary">
								{translate('huhubot.memory.provenance', { value: body.provenance })}
							</Badge>
						)}
					</div>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button
						size="icon-sm"
						variant={item.pinned ? 'secondary' : 'outline'}
						aria-label={item.pinned ? translate('huhubot.memory.unpin') : translate('huhubot.memory.pin')}
						title={item.pinned ? translate('huhubot.memory.unpin') : translate('huhubot.memory.pin')}
						onClick={onPin}
						disabled={busy}
					>
						<Pin aria-hidden />
					</Button>
					<Button
						size="icon-sm"
						variant="outline"
						aria-label={translate('huhubot.memory.correct')}
						title={translate('huhubot.memory.correct')}
						onClick={() => onCorrection(body?.text ?? '')}
						disabled={busy || !body}
					>
						<RotateCcw aria-hidden />
					</Button>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label={translate('huhubot.memory.forget')}
						title={translate('huhubot.memory.forget')}
						onClick={onForget}
						disabled={busy}
					>
						<Trash2 aria-hidden />
					</Button>
				</div>
			</div>
			{body && (
				<div className="mt-3 border-t border-border pt-3">
					<p className="m-0 text-xs text-muted-foreground">
						{translate('huhubot.memory.createdBy', { creator: body.creatorKind })}
					</p>
					<div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
						<span>{translate('huhubot.memory.source')}:</span>
						{body.sourceRefs.length ? (
							body.sourceRefs.map((source) => (
								<Badge
									key={`${source.resourceId}:${source.revision ?? ''}`}
									variant="outline"
									title={source.resourceId}
								>
									{source.title ?? source.resourceId}
								</Badge>
							))
						) : (
							<span>{translate('huhubot.memory.sourceNone')}</span>
						)}
					</div>
				</div>
			)}
			{correction !== undefined && (
				<div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
					<Label htmlFor={`${cardId}-correction`}>{translate('huhubot.memory.correct')}</Label>
					<Textarea
						id={`${cardId}-correction`}
						value={correction}
						onChange={(event) => onCorrection(event.currentTarget.value)}
						className="min-h-20 resize-y"
					/>
					<div className="flex flex-wrap gap-2">
						<Button size="sm" onClick={onSaveCorrection} disabled={!correction.trim() || busy}>
							<Check aria-hidden />
							{translate('huhubot.memory.saveCorrection')}
						</Button>
						<Button size="sm" variant="ghost" onClick={onCancelCorrection} disabled={busy}>
							<X aria-hidden />
							{translate('huhubot.memory.cancel')}
						</Button>
					</div>
				</div>
			)}
		</article>
	);
}

function ProposalCard({
	proposal,
	busy,
	onResolve,
}: {
	proposal: MemoryProposal;
	busy: boolean;
	onResolve: (decision: 'approve' | 'reject') => void;
}) {
	const translate = useT();
	return (
		<section
			className="rounded-lg border border-status-warning/50 bg-status-warning/5 p-4"
			aria-label={translate('huhubot.memory.proposalPreview')}
		>
			<div className="flex items-center gap-2">
				<ShieldCheck className="size-4" aria-hidden />
				<h2 className="m-0 text-sm font-semibold">{translate('huhubot.memory.proposalPreview')}</h2>
				<Badge variant="secondary">{translate('huhubot.memory.pending')}</Badge>
			</div>
			<p className="mt-2 whitespace-pre-wrap break-words text-sm">
				{proposal.body?.text ?? translate('huhubot.memory.proposalWarning')}
			</p>
			<p className="text-xs text-muted-foreground">
				{translate('huhubot.memory.proposalWarning')} ·{' '}
				{translate('huhubot.memory.revision', { revision: proposal.revision })}
			</p>
			<div className="flex flex-wrap gap-2">
				<Button size="sm" onClick={() => onResolve('approve')} disabled={busy}>
					<Check aria-hidden />
					{translate('huhubot.memory.confirm')}
				</Button>
				<Button size="sm" variant="outline" onClick={() => onResolve('reject')} disabled={busy}>
					<X aria-hidden />
					{translate('huhubot.memory.reject')}
				</Button>
			</div>
		</section>
	);
}

import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { CircleAlert, LoaderCircle, RefreshCw, RotateCcw, Square } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import type { BotClient } from '../../api';
import { BotBackButton } from '../BotNavigation';
import { TaskClient } from '../../services/workbench/task-client';
import { type WorkbenchClient, runIsActive } from '../../services/workbench/workbench-client';
export interface BotTaskHost {
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
	openTarget?(section: string, id?: string): void;
}

export function TasksPage({ host, runId }: { host: BotTaskHost; runId?: string }) {
	const t = useT(),
		[tasks] = useState(() => new TaskClient(host.client, host.workspace)),
		state = useStore(tasks.store);
	const [selectedId, setSelectedId] = useState(runId);
	const [listSessionId, setListSessionId] = useState<string>();
	const listId = useId();
	const initialHistories = useRef(new Set<string>());

	useEffect(() => {
		if (selectedId) void tasks.load(selectedId);
	}, [tasks, selectedId]);
	useEffect(() => () => tasks.dispose(), [tasks]);
	const [directoryVersion, setDirectoryVersion] = useState(0);
	useEffect(() => host.workspace?.subscribe(() => setDirectoryVersion((value) => value + 1)), [host.workspace]);
	void directoryVersion;
	const directory = host.workspace?.getSnapshot();
	const listSession = directory?.sessions.find((session) => session.id === listSessionId) ?? directory?.sessions[0];
	const listThread = listSession ? directory?.threads[listSession.id] : undefined;
	useEffect(() => {
		if (!selectedId && host.workspace) void host.workspace.refreshDirectory();
	}, [host.workspace, selectedId]);
	useEffect(() => {
		if (!selectedId && listSession && !initialHistories.current.has(listSession.id)) {
			initialHistories.current.add(listSession.id);
			if (!listThread?.historyLoaded && !listThread?.historyLoading)
				void host.workspace?.refreshHistory(listSession.id);
		}
	}, [host.workspace, selectedId, listSession, listThread?.historyLoaded, listThread?.historyLoading]);
	const chooseRun = (id: string) => {
		if (host.openTarget) host.openTarget('tasks', id);
		else setSelectedId(id);
	};
	const run = state.run,
		busy = !!state.action;
	if (!selectedId) {
		const threads = listSession && listThread ? { [listSession.id]: listThread } : {};
		return (
			<section className="h-full overflow-auto p-4">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<h1 className="text-base font-semibold">{t('huhubot.tasks.title')}</h1>
				{directory && (
					<div className="mb-3 flex flex-wrap items-center gap-2">
						<Label htmlFor={listId}>{t('huhubot.chat.sessions')}</Label>
						<select
							id={listId}
							value={listSession?.id ?? ''}
							className="max-w-full rounded border border-input bg-background px-2 py-1 text-sm"
							onChange={(event) => setListSessionId(event.currentTarget.value)}
						>
							{directory.sessions.map((session) => (
								<option key={session.id} value={session.id}>
									{session.title}
								</option>
							))}
						</select>
						{directory.sessionCursor && (
							<Button
								variant="outline"
								disabled={directory.loading}
								onClick={() => void host.workspace?.refreshDirectory(true)}
							>
								{t('huhubot.common.more')}
							</Button>
						)}
					</div>
				)}
				{(listThread?.error || directory?.error) && (
					<p role="alert" className="text-xs text-destructive">
						{t('huhubot.tasks.error')}
						<Button
							variant="link"
							onClick={() => {
								void host.workspace?.refreshDirectory();
								if (listSession) void host.workspace?.refreshHistory(listSession.id);
							}}
						>
							{t('huhubot.tasks.retry')}
						</Button>
					</p>
				)}
				{listThread?.historyLoading && (
					<p role="status" className="text-xs text-muted-foreground">
						{t('huhubot.tasks.loading')}
					</p>
				)}
				{Object.values(threads).some((thread) => thread.runIds.length) ? (
					<div className="grid gap-2">
						{Object.entries(threads).flatMap(([sessionId, thread]) =>
							thread.runIds.map((id) => (
								<Button
									key={id}
									variant="outline"
									className="justify-start"
									onClick={() => chooseRun(id)}
								>
									{
										host.workspace
											?.getSnapshot()
											.sessions.find((session) => session.id === sessionId)?.title
									}{' '}
									· {id}
								</Button>
							)),
						)}
					</div>
				) : (
					<EmptyState
						icon={<RotateCcw />}
						title={t('huhubot.tasks.title')}
						description={t('huhubot.tasks.noRuns')}
					/>
				)}
				{listThread?.historyCursor && listSession && (
					<Button
						variant="outline"
						disabled={listThread.historyLoading}
						onClick={() => void host.workspace?.refreshHistory(listSession.id, true)}
					>
						{t('huhubot.common.more')}
					</Button>
				)}
			</section>
		);
	}
	if (!run && state.loading)
		return (
			<EmptyState
				icon={<LoaderCircle className="animate-spin" />}
				title={t('huhubot.tasks.title')}
				description={t('huhubot.tasks.loading')}
			/>
		);
	if (!run)
		return (
			<EmptyState
				icon={<CircleAlert />}
				title={t('huhubot.tasks.title')}
				description={t('huhubot.tasks.error')}
				action={<Button onClick={() => void tasks.load(selectedId)}>{t('huhubot.tasks.retry')}</Button>}
			/>
		);
	return (
		<section
			className="huhu-bot-tasks flex h-full min-h-0 flex-col gap-3 overflow-auto p-4 @container"
			aria-label={t('huhubot.tasks.title')}
		>
			<header className="flex flex-wrap items-center gap-2">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<div className="min-w-0 flex-1">
					<h1 className="m-0 text-base font-semibold">{t('huhubot.tasks.title')}</h1>
					<p className="m-0 break-all text-xs text-muted-foreground">{run.id}</p>
				</div>
				<Badge variant={run.status === 'failed' || run.status === 'blocked' ? 'destructive' : 'outline'}>
					{t(`huhubot.status.${run.status}`)}
				</Badge>
				<Button
					variant="outline"
					size="sm"
					disabled={state.loading}
					onClick={() => void tasks.load(selectedId)}
				>
					<RefreshCw aria-hidden />
					{t('huhubot.common.refresh')}
				</Button>
			</header>
			{run.effectsUnresolved && (
				<p role="alert" className="text-xs text-status-warning">
					{t('huhubot.tasks.unknown')}
				</p>
			)}
			<div className="grid gap-3 @min-[960px]:grid-cols-2">
				<article className="rounded-lg border border-border p-3">
					<h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.status')}</h2>
					<dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
						<dt>{t('huhubot.tasks.agent')}</dt>
						<dd className="m-0 break-all">{run.agentId}</dd>
						<dt>{t('huhubot.common.revision')}</dt>
						<dd className="m-0">{run.revision}</dd>
						<dt>{t('huhubot.tasks.usage')}</dt>
						<dd className="m-0">
							{run.usage
								? `${run.usage.inputTokens ?? '?'} / ${run.usage.outputTokens ?? '?'} · ${run.usage.knowledge === 'known' ? t('huhubot.tasks.done') : run.usage.estimated ? t('huhubot.common.estimated') : t('huhubot.common.unknown')}`
								: t('huhubot.common.unknown')}
						</dd>
					</dl>
					{run.reason && <p className="text-xs text-muted-foreground">{run.reason}</p>}
				</article>
				<article className="rounded-lg border border-border p-3">
					<h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.recovery')}</h2>
					<p className="text-xs text-muted-foreground">
						{state.recovery?.reason ?? state.recovery?.state ?? '—'}
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={busy || !runIsActive(run.status)}
							onClick={() => void tasks.cancel()}
						>
							<Square aria-hidden />
							{state.action === 'cancel' ? t('huhubot.tasks.canceling') : t('huhubot.tasks.cancel')}
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={busy || state.recovery?.state !== 'ready'}
							onClick={() => void tasks.resume()}
						>
							<RotateCcw aria-hidden />
							{state.action === 'resume' ? t('huhubot.tasks.resuming') : t('huhubot.tasks.resume')}
						</Button>
					</div>
				</article>
			</div>
			<article className="rounded-lg border border-border p-3">
				<h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.delegations')}</h2>
				{!state.children.length ? (
					<p className="text-xs text-muted-foreground">{t('huhubot.tasks.noDelegations')}</p>
				) : (
					<ul className="m-0 mt-2 grid list-none gap-2 p-0">
						{state.children.map((child) => (
							<li key={child.id} className="rounded-md border border-border p-3">
								<div className="flex flex-wrap items-center gap-2">
									<span className="min-w-0 flex-1 break-all text-sm">
										{child.targetAgentId ?? child.executorAgentId}
									</span>
									<Badge variant="outline">{t(`huhubot.status.${child.status}`)}</Badge>
								</div>
								<p className="break-all text-xs text-muted-foreground">
									{t('huhubot.tasks.child')}: {child.childRunId}
								</p>
								{child.result && (
									<div>
										<Badge variant="outline">
											{child.result.partial
												? t('huhubot.tasks.partial')
												: t(`huhubot.status.${child.result.status}`)}
										</Badge>
										<p className="whitespace-pre-wrap break-words text-sm">{child.result.text}</p>
										{child.result.reason && (
											<p className="text-xs text-muted-foreground">{child.result.reason}</p>
										)}
									</div>
								)}
								<div className="flex flex-wrap gap-2">
									<Button variant="outline" size="sm" onClick={() => chooseRun(child.childRunId)}>
										{t('huhubot.tasks.openChild')}
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={busy || !runIsActive(child.status)}
										onClick={() => void tasks.cancelChild(child)}
									>
										{state.action === child.id
											? t('huhubot.tasks.canceling')
											: t('huhubot.tasks.cancelChild')}
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
				{state.cursor && (
					<Button variant="outline" onClick={() => void tasks.load(selectedId, true)}>
						{t('huhubot.common.more')}
					</Button>
				)}
			</article>
			{state.effects.length > 0 && (
				<article className="rounded-lg border border-border p-3">
					<h2 className="text-sm font-semibold">{t('huhubot.tasks.effects')}</h2>
					{state.effects.map((effect) => (
						<div key={effect.id} className="mb-2 flex flex-wrap items-center gap-2 text-xs">
							<span className="min-w-0 flex-1 break-all">{effect.id}</span>
							<Badge variant="outline">{t(`huhubot.status.${effect.status}`)}</Badge>
							{effect.status === 'unknown_outcome' && (
								<Button
									size="sm"
									variant="outline"
									disabled={busy}
									onClick={() => void tasks.reconcile(effect)}
								>
									{state.action === effect.id
										? t('huhubot.tasks.reconciling')
										: t('huhubot.tasks.reconcile')}
								</Button>
							)}
						</div>
					))}
				</article>
			)}
			{state.error && (
				<p role="alert" className="text-xs text-destructive">
					{t('huhubot.tasks.error')}
					<Button variant="link" onClick={() => void tasks.load(selectedId)}>
						{t('huhubot.tasks.retry')}
					</Button>
				</p>
			)}
		</section>
	);
}

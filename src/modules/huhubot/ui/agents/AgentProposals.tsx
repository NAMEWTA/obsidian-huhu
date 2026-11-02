import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import type { BotClient } from '../../api';
import { ProposalClient } from '../../services/workbench/proposal-client';
import type { WorkbenchClient } from '../../services/workbench/workbench-client';

export function AgentProposals({
	client,
	workspace,
	runId,
}: {
	client: BotClient;
	workspace?: WorkbenchClient;
	runId?: string;
}) {
	const t = useT();
	const [proposals] = useState(() => new ProposalClient(() => client, workspace));
	const state = useStore(proposals.store);
	useEffect(() => {
		void proposals.load(runId);
	}, [proposals, runId]);
	useEffect(() => () => proposals.dispose(), [proposals]);
	useEffect(() => client.onClose(() => proposals.clear()), [client, proposals]);
	useEffect(() => {
		let revision = workspace?.getSnapshot().permissionRevision;
		const cursor = () =>
			runId
				? Object.values(workspace?.getSnapshot().threads ?? {})
						.map((thread) => thread.projections[runId]?.seq)
						.find(Boolean)
				: undefined;
		let previous = cursor();
		return workspace?.subscribe(() => {
			const next = workspace.getSnapshot().permissionRevision;
			if (next !== revision) {
				revision = next;
				proposals.clear();
				return;
			}
			const current = cursor();
			if (current !== previous) {
				previous = current;
				void proposals.load(runId);
			}
		});
	}, [workspace, proposals, runId]);
	return (
		<section className="min-w-0 rounded-lg border border-border p-3" aria-label={t('huhubot.agent.proposals')}>
			<header className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="m-0 text-sm font-semibold">{t('huhubot.agent.proposals')}</h2>
				<Button
					size="sm"
					variant="outline"
					disabled={state.loading || !!state.working}
					onClick={() => void proposals.load(runId)}
				>
					{t('huhubot.common.refresh')}
				</Button>
			</header>
			<p className="text-xs text-muted-foreground">{t('huhubot.agent.proposalDescription')}</p>
			{state.loading && (
				<p role="status" className="text-xs">
					{t('huhubot.chat.loading')}
				</p>
			)}
			{state.error && (
				<p role="alert" className="text-xs text-destructive">
					{t('huhubot.agent.error')}
				</p>
			)}
			{!state.items.length && !state.loading && !state.error && (
				<p className="text-xs text-muted-foreground">{t('huhubot.agent.noProposals')}</p>
			)}
			{state.items.map((proposal) => (
				<article key={proposal.proposalId} className="mt-2 min-w-0 rounded-md bg-muted p-3">
					<h3 className="m-0 break-words text-sm font-semibold">{proposal.draft.name}</h3>
					<p className="whitespace-pre-wrap break-words text-xs">{proposal.draft.description}</p>
					<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
						<dt>{t('huhubot.agent.persona')}</dt>
						<dd className="m-0 max-h-52 overflow-auto whitespace-pre-wrap break-words">
							{proposal.draft.persona}
						</dd>
						<dt>{t('huhubot.agent.model')}</dt>
						<dd className="m-0 break-all">
							{proposal.draft.model?.providerId} / {proposal.draft.model?.modelId} /{' '}
							{proposal.draft.model?.protocol}
						</dd>
						<dt>{t('huhubot.agent.endpoint')}</dt>
						<dd className="m-0 break-all">{proposal.draft.model?.endpoint ?? '—'}</dd>
						<dt>{t('huhubot.agent.allowTools')}</dt>
						<dd className="m-0 break-all">{proposal.draft.allowedTools?.join(', ') || '—'}</dd>
						<dt>{t('huhubot.agent.allowTargets')}</dt>
						<dd className="m-0 break-all">
							{proposal.draft.allowedCollaborationTargets?.join(', ') || '—'}
						</dd>
					</dl>
					<div className="mt-2 flex flex-wrap gap-2">
						<Button size="sm" disabled={!!state.working} onClick={() => void proposals.confirm(proposal)}>
							{t('huhubot.agent.confirmProposal')}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={!!state.working}
							onClick={() => void proposals.reject(proposal)}
						>
							{t('huhubot.agent.rejectProposal')}
						</Button>
					</div>
				</article>
			))}
			{state.cursor && (
				<Button variant="outline" disabled={state.loading} onClick={() => void proposals.load(runId, true)}>
					{t('huhubot.common.more')}
				</Button>
			)}
		</section>
	);
}

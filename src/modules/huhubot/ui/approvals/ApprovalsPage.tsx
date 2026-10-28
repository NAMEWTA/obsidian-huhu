import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { ApprovalClient } from '../../services/workbench/approval-client';
import { Check, CircleAlert, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import type { Approval, BotClient } from '../../api';
import { commandMeta, type WorkbenchClient } from '../../services/workbench/workbench-client';

import { BotBackButton } from '../BotNavigation';
export interface BotApprovalHost {
	openTarget?: (section: string, id?: string) => void;
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
}
export function ApprovalCard({
	client,
	approval,
	onResolved,
	resolveCommand,
}: {
	client: BotClient;
	approval: Approval;
	resolveCommand?: (decision: 'approve' | 'reject') => Promise<Approval | undefined>;
	onResolved?: (next: Approval) => void;
}) {
	const t = useT();
	const [action, setAction] = useState<'approve' | 'reject'>(),
		[error, setError] = useState<string>();
	const resolve = async (decision: 'approve' | 'reject') => {
		if (action) return;
		setAction(decision);
		setError(undefined);
		try {
			const accepted = resolveCommand
				? await resolveCommand(decision)
				: await client.approvals.resolve({
						...commandMeta(client),
						id: approval.id,
						effectId: approval.effectId,
						expectedRevision: approval.revision,
						decision,
						previewHash: approval.preview.previewHash,
					});
			if (accepted) onResolved?.(accepted);
		} catch {
			setError(t('huhubot.tasks.error'));
		} finally {
			setAction(undefined);
		}
	};
	return (
		<article className="min-w-0 rounded-lg border border-border p-4" aria-label={t('huhubot.tasks.approvals')}>
			<header className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="m-0 min-w-0 break-all text-sm font-semibold">{approval.preview.target.resourceId}</h2>
				<Badge variant={approval.status === 'pending' ? 'default' : 'outline'}>
					{t(`huhubot.status.${approval.status}`)}
				</Badge>
			</header>
			<dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
				<dt>{t('huhubot.tasks.effect')}</dt>
				<dd className="m-0 break-all">{approval.effectId}</dd>
				<dt>{t('huhubot.common.revision')}</dt>
				<dd className="m-0">{approval.revision}</dd>
				<dt>{t('huhubot.tasks.expires')}</dt>
				<dd className="m-0">{approval.expiresAt}</dd>
			</dl>
			<h3 className="mt-4 text-xs font-semibold">{t('huhubot.tasks.diff')}</h3>
			<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
				{approval.preview.diff}
			</pre>
			<h3 className="mt-4 text-xs font-semibold">{t('huhubot.tasks.source')}</h3>
			<ul className="m-0 list-disc pl-5 text-xs">
				{approval.preview.sourceRefs.map((source) => (
					<li key={source.resourceId}>{source.title ?? source.resourceId}</li>
				))}
			</ul>
			{approval.status === 'pending' && (
				<div className="mt-4 flex flex-wrap gap-2">
					<Button size="sm" disabled={!!action} onClick={() => void resolve('approve')}>
						{action === 'approve' ? (
							<LoaderCircle className="animate-spin" aria-hidden />
						) : (
							<Check aria-hidden />
						)}
						{action === 'approve' ? t('huhubot.tasks.approving') : t('huhubot.tasks.approve')}
					</Button>
					<Button variant="outline" size="sm" disabled={!!action} onClick={() => void resolve('reject')}>
						{action === 'reject' ? (
							<LoaderCircle className="animate-spin" aria-hidden />
						) : (
							<X aria-hidden />
						)}
						{action === 'reject' ? t('huhubot.tasks.rejecting') : t('huhubot.tasks.reject')}
					</Button>
				</div>
			)}
			{error && (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
		</article>
	);
}
export function InlineApproval(props: {
	client: BotClient;
	approvalId: string;
	workspace?: WorkbenchClient;
	onResolved?: () => void;
}) {
	return <InlineApprovalView key={`${props.client.hello.profile.profileId}:${props.approvalId}`} {...props} />;
}
function InlineApprovalView({
	client,
	approvalId,
	workspace,
	onResolved,
}: {
	client: BotClient;
	approvalId: string;
	workspace?: WorkbenchClient;
	onResolved?: () => void;
}) {
	const t = useT();
	const approvals = useMemo(() => new ApprovalClient(() => client, workspace), [client, workspace]);
	const view = useStore(approvals.store);
	useEffect(() => {
		void approvals.loadId(approvalId);
		return () => approvals.dispose();
	}, [approvals, approvalId]);
	if (view.error)
		return (
			<div role="alert">
				<p className="text-xs text-destructive">
					{t(view.error === 'offline' ? 'huhubot.common.offline' : 'huhubot.tasks.error')}
				</p>
				<Button variant="outline" size="sm" onClick={() => void approvals.loadId(approvalId)}>
					{t('huhubot.tasks.retry')}
				</Button>
			</div>
		);
	return view.current ? (
		<ApprovalCard
			client={client}
			approval={view.current}
			resolveCommand={(decision) => approvals.resolve(view.current!, decision)}
			onResolved={() => onResolved?.()}
		/>
	) : (
		<p role="status" className="text-xs text-muted-foreground">
			{t('huhubot.tasks.loading')}
		</p>
	);
}
export function ApprovalsPage({ host }: { host: BotApprovalHost }) {
	const t = useT(),
		client = host.client();
	const [approvals] = useState(() => new ApprovalClient(host.client, host.workspace));
	const view = useStore(approvals.store);
	const { items, loading, error, cursor, selectedId } = view;
	const load = (cursor?: string) => approvals.load(cursor);
	useEffect(() => {
		void approvals.load();
		return () => approvals.dispose();
	}, [approvals]);
	const selected = items.find((item) => item.id === selectedId) ?? items[0];
	return (
		<section
			className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-4 @container"
			aria-label={t('huhubot.tasks.approvals')}
		>
			<header className="flex items-center gap-2">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<h1 className="m-0 flex-1 text-base font-semibold">{t('huhubot.tasks.approvals')}</h1>
				<Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
					<RefreshCw aria-hidden />
					{t('huhubot.common.refresh')}
				</Button>
			</header>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					<CircleAlert className="mr-1 inline size-3" aria-hidden />
					{t(error === 'offline' ? 'huhubot.common.offline' : 'huhubot.tasks.error')}
					<Button size="sm" variant="link" onClick={() => void load()}>
						{t('huhubot.tasks.retry')}
					</Button>
				</p>
			)}
			{loading && !items.length ? (
				<EmptyState
					icon={<LoaderCircle className="animate-spin" />}
					title={t('huhubot.tasks.approvals')}
					description={t('huhubot.tasks.loading')}
				/>
			) : !items.length && !error ? (
				<EmptyState
					icon={<Check />}
					title={t('huhubot.tasks.approvals')}
					description={t('huhubot.tasks.noApprovals')}
				/>
			) : (
				<div className="grid min-h-0 gap-3 @min-[960px]:grid-cols-[16rem_minmax(0,1fr)]">
					<aside>
						<ul className="m-0 grid list-none gap-1 p-0">
							{items.map((item) => (
								<li key={item.id}>
									<Button
										variant={selected?.id === item.id ? 'secondary' : 'ghost'}
										className="w-full justify-start"
										onClick={() => approvals.select(item.id)}
									>
										{item.preview.target.resourceId} · {t(`huhubot.status.${item.status}`)}
									</Button>
								</li>
							))}
						</ul>
						{cursor && (
							<Button variant="outline" disabled={loading} onClick={() => void load(cursor)}>
								{t('huhubot.common.more')}
							</Button>
						)}
					</aside>
					{selected && client && (
						<ApprovalCard
							key={selected.id}
							client={client}
							approval={selected}
							resolveCommand={(decision) => approvals.resolve(selected, decision)}
						/>
					)}
				</div>
			)}
		</section>
	);
}

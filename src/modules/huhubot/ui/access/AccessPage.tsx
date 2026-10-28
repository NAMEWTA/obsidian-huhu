import { useStore } from 'zustand';
import { AccessDirectory } from '../../services/workbench/access-directory';
import { CommandAttempt } from '../../services/workbench/command-attempt';
import { useEffect, useMemo, useState, useId, type SyntheticEvent } from 'react';
import { CircleAlert, LoaderCircle, Plus, ShieldCheck, X } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Checkbox } from '../../../../ui/components/checkbox';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import type { WorkbenchClient } from '../../services/workbench/workbench-client';
import type { BotClient, CommandMeta, Grant, GrantOperation, GrantRecipient, BotMethodMap, Receipt } from '../../api';

import { BotBackButton } from '../BotNavigation';
export interface BotAccessHost {
	openTarget?: (section: string, id?: string) => void;
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
}
function meta(client: BotClient): CommandMeta {
	const id = crypto.randomUUID();
	return {
		commandId: id,
		idempotencyKey: id,
		profileId: client.hello.profile.profileId,
		commandEpoch: client.hello.profile.commandEpoch,
	};
}
const operations: GrantOperation[] = ['read', 'search', 'send', 'summarize', 'memory', 'delegate', 'deliver'];

export function AccessPage({ host }: { host: BotAccessHost }) {
	const t = useT(),
		uniqueId = useId();
	const [directory] = useState(() => new AccessDirectory(host.client));
	const view = useStore(directory.store);
	const { grants, agents, loading } = view;
	const [busy, setBusy] = useState<string>();
	const [revokeAttempts] = useState(
		() => new Map<string, CommandAttempt<BotMethodMap['grants.revoke']['params'], Receipt>>(),
	);
	const [uncertainRevokes, setUncertainRevokes] = useState<string[]>([]);
	const [error, setError] = useState<string>();
	const [workspaceId, setWorkspaceId] = useState('');
	const [resourceId, setResourceId] = useState('');
	const [scope, setScope] = useState<Grant['scope']>('source');
	const [recipientIds, setRecipientIds] = useState<string[]>([]);
	const [selectedOps, setSelectedOps] = useState<GrantOperation[]>(['read']);
	const [notice, setNotice] = useState('');
	const load = () => directory.load();
	useEffect(() => {
		void directory.load();
		return () => directory.dispose();
	}, [directory]);
	const byId = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
	const revoke = async (grant: Grant) => {
		const client = host.client();
		if (!client || busy) return;
		const attempt =
			revokeAttempts.get(grant.id) ?? new CommandAttempt<BotMethodMap['grants.revoke']['params'], Receipt>();
		revokeAttempts.set(grant.id, attempt);
		setBusy(grant.id);
		setError(undefined);
		host.workspace?.permissionsChanged();
		try {
			await attempt.send(
				() => ({ ...meta(client), id: grant.id, expectedRevision: grant.revision }),
				(command) => client.grants.revoke(command),
			);
			directory.revoked(grant.id);
			revokeAttempts.delete(grant.id);
			setUncertainRevokes((previous) => previous.filter((id) => id !== grant.id));
		} catch (cause) {
			if (attempt.uncertain) setUncertainRevokes((previous) => [...new Set([...previous, grant.id])]);
			else revokeAttempts.delete(grant.id);
			setError(t(attempt.uncertain ? 'huhubot.chat.startUncertain' : 'huhubot.access.error'));
			host.report?.(cause);
		} finally {
			host.workspace?.permissionsChanged();
			setBusy(undefined);
		}
	};
	const create = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		const client = host.client();
		if (!client || busy || !workspaceId.trim() || !resourceId.trim() || selectedOps.length === 0) return;
		const ids = recipientIds;
		const recipients: GrantRecipient[] = ids.map((id) => {
			const agent = byId.get(id);
			const model = agent?.model;
			return {
				agentId: id,
				modelBindingRevision: agent?.modelBindingRevision ?? '0',
				providerId: model?.providerId ?? '',
				modelId: model?.modelId ?? '',
				protocol: model?.protocol ?? 'openai-chat-completions',
				endpoint: model?.endpoint ?? '',
			};
		});
		if (
			!recipients.length ||
			recipients.some((recipient) => !recipient.providerId || !recipient.modelId || !recipient.endpoint)
		) {
			setError(t('huhubot.access.error'));
			return;
		}
		setBusy('create');
		setError(undefined);
		setNotice('');
		try {
			const grant = await client.grants.create({
				...meta(client),
				workspaceId: workspaceId.trim(),
				resourceId: resourceId.trim(),
				scope,
				recipients,
				operations: selectedOps,
			});
			directory.accept(grant);
			setNotice(t('huhubot.access.created'));
			setResourceId('');
		} catch (cause) {
			setError(t('huhubot.access.error'));
			host.report?.(cause);
		} finally {
			setBusy(undefined);
		}
	};
	if (loading && !view.loaded)
		return (
			<div className="flex h-full items-center justify-center">
				<EmptyState
					icon={<LoaderCircle className="animate-spin" />}
					title={t('huhubot.access.title')}
					description={t('huhubot.access.loading')}
				/>
			</div>
		);
	return (
		<section
			className="huhu-bot-tasks flex h-full min-h-0 flex-col gap-3 overflow-auto p-4"
			aria-label={t('huhubot.access.title')}
		>
			<header className="flex items-center justify-between gap-2">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<div>
					<h1 className="m-0 text-base font-semibold">{t('huhubot.access.title')}</h1>
					<p className="m-0 text-xs text-muted-foreground">
						{
							grants.filter((grant) => grant.state === 'active' && !uncertainRevokes.includes(grant.id))
								.length
						}{' '}
						{t('huhubot.access.active')}
					</p>
				</div>
				<ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
			</header>
			<form
				onSubmit={(event) => {
					void create(event);
				}}
				className="grid gap-2 rounded-lg border border-border p-3 @3xl:grid-cols-2"
			>
				<h2 className="col-span-full m-0 text-sm font-semibold">{t('huhubot.access.create')}</h2>
				<div className="grid gap-1">
					<Label htmlFor={`${uniqueId}-workspace`}>{t('huhubot.access.workspace')}</Label>
					<Input
						id={`${uniqueId}-workspace`}
						value={workspaceId}
						onChange={(event) => setWorkspaceId(event.currentTarget.value)}
						required
					/>
				</div>
				<div className="grid gap-1">
					<Label htmlFor={`${uniqueId}-resource`}>{t('huhubot.access.newResource')}</Label>
					<Input
						id={`${uniqueId}-resource`}
						value={resourceId}
						onChange={(event) => setResourceId(event.currentTarget.value)}
						required
					/>
				</div>
				<div className="grid gap-1">
					<Label htmlFor={`${uniqueId}-scope`}>{t('huhubot.access.newScope')}</Label>
					<select
						id={`${uniqueId}-scope`}
						className="h-8 rounded-md border border-input bg-background px-2 text-sm"
						value={scope}
						onChange={(event) => setScope(event.currentTarget.value as Grant['scope'])}
					>
						<option value="source">{t('huhubot.common.source')}</option>
						<option value="folder">{t('huhubot.common.folder')}</option>
						<option value="vault">{t('huhubot.common.vault')}</option>
					</select>
				</div>
				<div className="grid gap-1">
					<Label htmlFor={`${uniqueId}-recipients`}>{t('huhubot.access.newRecipients')}</Label>
					<select
						id={`${uniqueId}-recipients`}
						className="min-h-20 min-w-0 w-full max-w-full rounded-md border border-input bg-background px-2 text-sm"
						multiple
						value={recipientIds}
						disabled={!!busy}
						onChange={(event) =>
							setRecipientIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
						}
					>
						{agents.map((agent) => (
							<option key={agent.id} value={agent.id} disabled={!agent.enabled || !agent.model}>
								{agent.name}
							</option>
						))}
					</select>
					{view.agentCursor && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={view.moreLoading.agents}
							onClick={() => void directory.loadMore('agents')}
						>
							{t('huhubot.access.moreAgents')}
						</Button>
					)}
				</div>
				<fieldset className="col-span-full grid gap-1">
					<legend className="text-xs font-medium">{t('huhubot.access.operations')}</legend>
					<div className="flex flex-wrap gap-2">
						{operations.map((operation) => (
							<label key={operation} className="inline-flex items-center gap-1 text-xs">
								<Checkbox
									checked={selectedOps.includes(operation)}
									onCheckedChange={(checked) => {
										setSelectedOps((previous) =>
											checked === true
												? [...previous, operation]
												: previous.filter((item) => item !== operation),
										);
									}}
								/>
								{t(`huhubot.access.operation.${operation}`)}
							</label>
						))}
					</div>
				</fieldset>
				<div className="col-span-full flex items-center gap-2">
					<Button
						size="sm"
						type="submit"
						disabled={
							busy !== undefined || !workspaceId.trim() || !resourceId.trim() || !recipientIds.length
						}
					>
						{busy === 'create' ? <LoaderCircle className="animate-spin" /> : <Plus />}
						{t('huhubot.access.submit')}
					</Button>
					{notice && (
						<span role="status" className="text-xs text-muted-foreground">
							{notice}
						</span>
					)}
				</div>
			</form>
			<div className="grid gap-2">
				{grants.length === 0 ? (
					<p className="text-xs text-muted-foreground">{t('huhubot.access.empty')}</p>
				) : (
					grants.map((grant) => (
						<article key={grant.id} className="rounded-lg border border-border p-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<h2 className="m-0 text-sm font-semibold">{grant.resourceId}</h2>
									<p className="m-0 text-xs text-muted-foreground">
										{grant.workspaceId} ·{' '}
										{t(
											grant.scope === 'source'
												? 'huhubot.common.source'
												: grant.scope === 'folder'
													? 'huhubot.common.folder'
													: 'huhubot.common.vault',
										)}
									</p>
								</div>
								<Badge variant={grant.state === 'active' ? 'secondary' : 'outline'}>
									{uncertainRevokes.includes(grant.id) && grant.state === 'active'
										? t('huhubot.common.unknown')
										: grant.state === 'active'
											? t('huhubot.access.active')
											: t('huhubot.access.revoked')}
								</Badge>
							</div>
							<dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
								<dt className="text-muted-foreground">{t('huhubot.access.recipients')}</dt>
								<dd className="m-0 break-all">{grant.recipientIds.join(', ') || '—'}</dd>
								<dt className="text-muted-foreground">{t('huhubot.access.operations')}</dt>
								<dd className="m-0">
									{grant.operations
										.map((operation) => t(`huhubot.access.operation.${operation}`))
										.join(', ')}
								</dd>
							</dl>
							{grant.state === 'active' && (
								<Button
									size="sm"
									variant="outline"
									className="mt-3"
									disabled={busy !== undefined}
									onClick={() => void revoke(grant)}
								>
									{busy === grant.id ? <LoaderCircle className="animate-spin" /> : <X />}
									{busy === grant.id
										? t('huhubot.access.revoking')
										: uncertainRevokes.includes(grant.id)
											? t('huhubot.chat.retryOriginal')
											: t('huhubot.access.revoke')}
								</Button>
							)}
						</article>
					))
				)}
			</div>
			{view.grantCursor && (
				<Button
					variant="outline"
					size="sm"
					disabled={view.moreLoading.grants}
					onClick={() => void directory.loadMore('grants')}
				>
					{t('huhubot.access.moreGrants')}
				</Button>
			)}
			{(error || view.error) && (
				<p role="alert" className="m-0 rounded border border-destructive/40 p-2 text-xs text-destructive">
					<CircleAlert className="mr-1 inline size-3" />
					{error ?? t('huhubot.access.error')}
					<Button variant="link" size="sm" className="h-auto p-0" onClick={() => void load()}>
						{t('huhubot.access.retry')}
					</Button>
				</p>
			)}
		</section>
	);
}

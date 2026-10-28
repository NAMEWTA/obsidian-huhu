import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
	CheckCircle2,
	CircleAlert,
	LoaderCircle,
	PlugZap,
	Save,
	ShieldCheck,
	ShieldQuestion,
	ShieldX,
} from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { SettingsRow } from '../../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { t } from '../../../../shared/i18n';
import type {
	Agent,
	AgentDraft,
	BotClient,
	CommandMeta,
	ModelBindingDraft,
	ModelBinding,
	BotMethodMap,
} from '../../api';
import type { CredentialEditor } from '../../services/workbench/workbench-client';
import { CommandAttempt } from '../../services/workbench/command-attempt';
import { PROTOCOLS, draftFromAgent, normalizeAgentDraft } from './model';
import { AgentDeletion } from './AgentDeletion';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { BotRpcError } from '../../core/protocol/connection';
import '../../styles/agent.css';

export interface AgentEditorProps {
	client: BotClient;
	profileId?: string;
	agent?: Agent;
	onSaved?: (agent: Agent) => void;
	onDisabled?: (agent: Agent) => void;
	onDeleted?: (id: string) => void;
	onLoaded?: (agent: Agent) => void;
	className?: string;
	credentials?: CredentialEditor;
	onDirtyChanged?: (dirty: boolean) => void;
}

type ProbeState =
	| { kind: 'idle' }
	| { kind: 'running' }
	| { kind: 'ready'; capabilities: string[]; credential: ModelBinding['credentialStatus'] }
	| { kind: 'error'; message: string };

function commandMeta(client: BotClient, profileId: string): CommandMeta {
	return {
		commandId: crypto.randomUUID(),
		idempotencyKey: crypto.randomUUID(),
		profileId,
		commandEpoch: client.hello.profile.commandEpoch,
	};
}
function revisionMeta(
	client: BotClient,
	profileId: string,
	expectedRevision: string,
): CommandMeta & { expectedRevision: string } {
	return { ...commandMeta(client, profileId), expectedRevision };
}

function credentialIcon(state: ModelBinding['credentialStatus'] | undefined) {
	if (state?.state === 'available') return <ShieldCheck className="size-3.5 text-status-success" aria-hidden />;
	if (state?.state === 'missing' || state?.state === 'failed')
		return <ShieldX className="size-3.5 text-status-error" aria-hidden />;
	return <ShieldQuestion className="size-3.5 text-muted-foreground" aria-hidden />;
}

export function AgentEditor(props: AgentEditorProps) {
	return <AgentEditorForm key={props.agent?.id ?? 'new'} {...props} />;
}

function AgentEditorForm({
	client,
	profileId = client.hello.profile.profileId,
	agent,
	onSaved,
	onDisabled,
	onDeleted,
	onLoaded,
	className,
	credentials,
	onDirtyChanged,
}: AgentEditorProps) {
	const id = useId();
	const [draft, setDraft] = useState<AgentDraft>(() => draftFromAgent(agent));
	const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });
	const [saving, setSaving] = useState(false);
	const [disabling, setDisabling] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [secret, setSecret] = useState('');
	const [credentialMode, setCredentialMode] = useState<'protected' | 'session-memory'>('protected');
	const [credentialBusy, setCredentialBusy] = useState(false);
	const [createAttempt] = useState(() => new CommandAttempt<BotMethodMap['agents.create']['params'], Agent>());
	const [updateAttempt] = useState(() => new CommandAttempt<BotMethodMap['agents.update']['params'], Agent>());
	const [uncertain, setUncertain] = useState(false);
	const baseRevision = useRef(agent?.revision);
	const [canReload, setCanReload] = useState(false),
		[reloadConfirmation, setReloadConfirmation] = useState(false),
		[reloading, setReloading] = useState(false);
	const reloadController = useRef<AbortController | undefined>(undefined);
	useEffect(() => () => reloadController.current?.abort(), []);
	useEffect(() => {
		onDirtyChanged?.(JSON.stringify(draft) !== JSON.stringify(draftFromAgent(agent)));
	}, [draft, agent, onDirtyChanged]);
	const model = draft.model;
	const valid =
		draft.name.trim().length > 0 &&
		(!model || (model.modelId.trim() && model.providerId.trim() && model.endpoint.trim()));
	const probeStatus = model?.credentialRef
		? t('huhubot.agent.credentialAvailable')
		: t('huhubot.agent.credentialUnknown');
	const protocolLabel = useMemo(
		() =>
			({
				'openai-chat-completions': 'OpenAI Chat Completions',
				'openai-responses': 'OpenAI Responses',
				'anthropic-messages': 'Anthropic Messages',
			}) satisfies Record<ModelBindingDraft['protocol'], string>,
		[],
	);
	const setField = <K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) =>
		setDraft((previous) => ({ ...previous, [key]: value }));
	const setModel = (patch: Partial<ModelBindingDraft>) =>
		setDraft((previous) => ({ ...previous, model: { ...(previous.model ?? draftFromAgent().model!), ...patch } }));
	const reportError = (reason: unknown, fallback: string) => {
		const changed =
			reason instanceof BotRpcError && reason.data.kind === 'CONFLICT' && /^REVISION_/.test(reason.data.reason);
		setCanReload(changed && !!agent);
		setError(changed ? t('huhubot.agent.conflict') : fallback);
	};
	const reloadSaved = async () => {
		if (!agent || saving || reloading) return;
		const controller = new AbortController();
		reloadController.current?.abort();
		reloadController.current = controller;
		setReloading(true);
		setReloadConfirmation(false);
		try {
			const fresh = await client.agents.get({ profileId, id: agent.id }, { signal: controller.signal });
			if (controller.signal.aborted || client.state === 'closed') return;
			if (fresh.id !== agent.id) throw Error('AGENT_IDENTITY_CHANGED');
			baseRevision.current = fresh.revision;
			createAttempt.discard();
			updateAttempt.discard();
			setDraft(draftFromAgent(fresh));
			setProbe({ kind: 'idle' });
			setSecret('');
			setUncertain(false);
			setCanReload(false);
			setError('');
			setNotice(t('huhubot.common.savedVersionLoaded'));
			onLoaded?.(fresh);
		} catch {
			if (!controller.signal.aborted) setError(t('huhubot.agent.error'));
		} finally {
			if (!controller.signal.aborted) setReloading(false);
		}
	};
	const testConnection = async () => {
		if (!model || !model.modelId.trim() || !model.providerId.trim() || !model.endpoint.trim()) {
			setError(t('huhubot.agent.noModel'));
			return;
		}
		setError('');
		setNotice('');
		setProbe({ kind: 'running' });
		try {
			const result = await client.models.test({
				profileId,
				model: normalizeAgentDraft({ ...draft, model }).model!,
			});
			setProbe(
				result.available
					? { kind: 'ready', capabilities: result.capabilities, credential: result.credentialStatus }
					: { kind: 'error', message: t('huhubot.agent.testFailed') },
			);
			if (result.available) setNotice(t('huhubot.agent.testReady'));
		} catch (reason) {
			setProbe({ kind: 'error', message: t('huhubot.agent.testFailed') });
			reportError(reason, t('huhubot.agent.testFailed'));
		}
	};
	const save = async () => {
		if (!valid || saving) return;
		setSaving(true);
		setError('');
		setNotice('');
		const next = normalizeAgentDraft(draft);
		try {
			const saved = agent
				? await updateAttempt.send(
						() => ({
							...revisionMeta(client, profileId, baseRevision.current ?? agent.revision),
							id: agent.id,
							draft: next,
						}),
						(command) => client.agents.update(command),
					)
				: await createAttempt.send(
						() => ({ ...commandMeta(client, profileId), draft: next }),
						(command) => client.agents.create(command),
					);
			baseRevision.current = saved.revision;
			setCanReload(false);
			setUncertain(false);
			setDraft(draftFromAgent(saved));
			setNotice(t('huhubot.agent.save'));
			onSaved?.(saved);
		} catch (reason) {
			const unknown = agent ? updateAttempt.uncertain : createAttempt.uncertain;
			setUncertain(unknown);
			if (unknown) setError(t('huhubot.chat.startUncertain'));
			else reportError(reason, t('huhubot.agent.error'));
		} finally {
			setSaving(false);
		}
	};
	const disable = async () => {
		if (!agent || disabling) return;
		setDisabling(true);
		setError('');
		try {
			const disabled = await client.agents.disable({
				...revisionMeta(client, profileId, agent.revision),
				id: agent.id,
			});
			baseRevision.current = disabled.revision;
			onDisabled?.(disabled);
		} catch (reason) {
			reportError(reason, t('huhubot.agent.error'));
		} finally {
			setDisabling(false);
		}
	};
	const storeCredential = async () => {
		if (!credentials || !secret || credentialBusy) return;
		setCredentialBusy(true);
		setError('');
		try {
			const value = await credentials.set(secret, credentialMode);
			setModel({ credentialRef: value.credentialRef });
			setNotice(t('huhubot.agent.credentialStored'));
			setSecret('');
		} catch {
			setError(t('huhubot.agent.credentialFailed'));
		} finally {
			setCredentialBusy(false);
		}
	};
	return (
		<section
			className={`huhu-bot-agent-editor flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto p-4 [&_[data-slot=settings-row]]:flex-col [&_[data-slot=settings-row]]:items-stretch [&_[data-slot=settings-row]>div]:min-w-0 [&_[data-slot=settings-row]>div]:w-full @min-[42rem]:[&_[data-slot=settings-row]]:flex-row @min-[42rem]:[&_[data-slot=settings-row]]:items-center @min-[42rem]:[&_[data-slot=settings-row]>div]:w-auto ${className ?? ''}`}
			aria-label={agent ? t('huhubot.agent.edit') : t('huhubot.agent.create')}
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="m-0 text-base font-semibold">
						{agent ? t('huhubot.agent.edit') : t('huhubot.agent.create')}
					</h2>
					<p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.agent.unsaved')}</p>
				</div>
				{agent && (
					<span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
						<span
							className={`size-1.5 rounded-full ${agent.enabled ? 'bg-status-success' : 'bg-status-warning'}`}
							aria-hidden
						/>
						{agent.enabled ? t('huhubot.agent.enabled') : t('huhubot.agent.disabled')} ·{' '}
						{t('huhubot.agent.revision', { revision: agent.revision })}
					</span>
				)}
			</header>
			{(error || notice) && (
				<div
					role={error ? 'alert' : 'status'}
					className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${error ? 'border-destructive/50 text-destructive' : 'border-status-success/40 text-status-success'}`}
				>
					{error ? (
						<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
					) : (
						<CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
					)}
					<span className="min-w-0">{error || notice}</span>
				</div>
			)}
			<fieldset
				disabled={saving || disabling || credentialBusy || probe.kind === 'running' || uncertain || reloading}
				className="m-0 grid min-w-0 gap-5 border-0 p-0"
				aria-label={t('huhubot.agent.edit')}
			>
				<SettingsSection title={t('huhubot.agent.edit')}>
					<div className="huhu-bot-agent-grid grid gap-x-5 gap-y-1 @min-[42rem]:grid-cols-2">
						<SettingsRow
							label={t('huhubot.agent.name')}
							control={
								<Input
									id={`${id}-name`}
									aria-label={t('huhubot.agent.name')}
									value={draft.name}
									onChange={(event) => setField('name', event.currentTarget.value)}
									autoFocus
									required
								/>
							}
						/>
						<SettingsRow
							label={t('huhubot.agent.description')}
							control={
								<Input
									id={`${id}-description`}
									aria-label={t('huhubot.agent.description')}
									value={draft.description}
									onChange={(event) => setField('description', event.currentTarget.value)}
								/>
							}
						/>
						<div className="@min-[42rem]:col-span-2">
							<SettingsRow
								alignTop
								label={t('huhubot.agent.persona')}
								control={
									<Textarea
										id={`${id}-persona`}
										aria-label={t('huhubot.agent.persona')}
										className="min-h-24 w-[min(100%,36rem)]"
										value={draft.persona}
										onChange={(event) => setField('persona', event.currentTarget.value)}
									/>
								}
							/>
						</div>
						<SettingsRow
							label={t('huhubot.agent.allowTools')}
							control={
								<Input
									aria-label={t('huhubot.agent.allowTools')}
									value={draft.allowedTools?.join(', ') ?? ''}
									onChange={(event) =>
										setField(
											'allowedTools',
											event.currentTarget.value
												.split(',')
												.map((value) => value.trim())
												.filter(Boolean),
										)
									}
								/>
							}
						/>
						<SettingsRow
							label={t('huhubot.agent.allowTargets')}
							control={
								<Input
									aria-label={t('huhubot.agent.allowTargets')}
									value={draft.allowedCollaborationTargets?.join(', ') ?? ''}
									onChange={(event) =>
										setField(
											'allowedCollaborationTargets',
											event.currentTarget.value
												.split(',')
												.map((value) => value.trim())
												.filter(Boolean),
										)
									}
								/>
							}
						/>
					</div>
					{credentials && (
						<div className="grid gap-2 border-t border-border pt-3">
							<SettingsRow
								label={t('huhubot.agent.apiKey')}
								control={
									<Input
										type="password"
										autoComplete="new-password"
										aria-label={t('huhubot.agent.apiKey')}
										value={secret}
										onChange={(event) => setSecret(event.currentTarget.value)}
									/>
								}
							/>
							<SettingsRow
								label={t('huhubot.agent.credentialMode')}
								control={
									<select
										aria-label={t('huhubot.agent.credentialMode')}
										className="h-9 max-w-full rounded border border-input bg-background px-2 text-sm"
										value={credentialMode}
										onChange={(event) =>
											setCredentialMode(
												event.currentTarget.value as 'protected' | 'session-memory',
											)
										}
									>
										<option value="protected">{t('huhubot.agent.protected')}</option>
										<option value="session-memory">{t('huhubot.agent.sessionMemory')}</option>
									</select>
								}
							/>
							<Button
								variant="outline"
								disabled={!secret || credentialBusy}
								onClick={() => void storeCredential()}
							>
								{t('huhubot.agent.storeCredential')}
							</Button>
						</div>
					)}
				</SettingsSection>
				<SettingsSection title={t('huhubot.agent.protocol')} description={t('huhubot.agent.credentialHint')}>
					<div className="huhu-bot-agent-grid grid gap-x-5 gap-y-1 @min-[42rem]:grid-cols-2">
						<SettingsRow
							label={t('huhubot.agent.protocol')}
							control={
								<select
									className="h-9 min-w-52 max-w-full rounded-md border border-input bg-transparent px-2 text-sm"
									aria-label={t('huhubot.agent.protocol')}
									value={model?.protocol ?? 'openai-responses'}
									onChange={(event) =>
										setModel({
											protocol: event.currentTarget.value as ModelBindingDraft['protocol'],
										})
									}
								>
									{PROTOCOLS.map((protocol) => (
										<option key={protocol} value={protocol}>
											{protocolLabel[protocol]}
										</option>
									))}
								</select>
							}
						/>
						<SettingsRow
							label={t('huhubot.agent.provider')}
							control={
								<Input
									aria-label={t('huhubot.agent.provider')}
									value={model?.providerId ?? ''}
									onChange={(event) => setModel({ providerId: event.currentTarget.value })}
								/>
							}
						/>
						<SettingsRow
							label={t('huhubot.agent.model')}
							control={
								<Input
									aria-label={t('huhubot.agent.model')}
									value={model?.modelId ?? ''}
									onChange={(event) => setModel({ modelId: event.currentTarget.value })}
								/>
							}
						/>
						<SettingsRow
							label={t('huhubot.agent.endpoint')}
							control={
								<Input
									type="url"
									aria-label={t('huhubot.agent.endpoint')}
									value={model?.endpoint ?? ''}
									onChange={(event) => setModel({ endpoint: event.currentTarget.value })}
								/>
							}
						/>
						<SettingsRow
							label={
								<span className="inline-flex items-center gap-1.5">
									{t('huhubot.agent.credentialRef')} {credentialIcon(agent?.model?.credentialStatus)}
								</span>
							}
							description={probeStatus}
							control={
								<Input
									aria-label={t('huhubot.agent.credentialRef')}
									value={model?.credentialRef ?? ''}
									onChange={(event) => setModel({ credentialRef: event.currentTarget.value })}
									autoComplete="off"
								/>
							}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!valid || probe.kind === 'running'}
							onClick={() => {
								void testConnection();
							}}
						>
							<PlugZap className="size-3.5" />
							{probe.kind === 'running' ? t('huhubot.agent.testing') : t('huhubot.agent.test')}
						</Button>
						{probe.kind === 'running' && (
							<LoaderCircle
								className="size-4 animate-spin text-muted-foreground"
								aria-label={t('huhubot.agent.testing')}
							/>
						)}
						{probe.kind === 'ready' && (
							<span className="flex flex-wrap items-center gap-1.5 text-xs text-status-success">
								<CheckCircle2 className="size-3.5" aria-hidden />
								{t('huhubot.agent.testReady')}
								{probe.capabilities.length ? ` · ${probe.capabilities.join(', ')}` : ''}
							</span>
						)}
						{probe.kind === 'error' && (
							<span role="status" className="text-xs text-destructive">
								{probe.message}
							</span>
						)}
					</div>
				</SettingsSection>
			</fieldset>
			<footer className="huhu-bot-agent-actions flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
				{canReload && (
					<Button
						variant="outline"
						disabled={saving || reloading}
						onClick={() => setReloadConfirmation(true)}
					>
						{t('huhubot.common.reloadSaved')}
					</Button>
				)}
				{agent && (
					<AgentDeletion
						client={client}
						agent={agent}
						disabled={saving || disabling || uncertain || reloading}
						onDeleted={onDeleted}
					/>
				)}
				{uncertain && (
					<Button
						variant="outline"
						disabled={saving}
						onClick={() => {
							createAttempt.discard();
							updateAttempt.discard();
							setUncertain(false);
							baseRevision.current = agent?.revision;
							setDraft(draftFromAgent(agent));
							setError('');
						}}
					>
						{t('huhubot.common.abandonRequest')}
					</Button>
				)}
				{agent && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={saving || disabling || !agent.enabled || reloading}
						onClick={() => {
							void disable();
						}}
					>
						<ShieldX className="size-3.5" />
						{disabling ? t('huhubot.agent.saving') : t('huhubot.agent.disable')}
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					disabled={!valid || saving || disabling || credentialBusy || probe.kind === 'running' || reloading}
					onClick={() => {
						void save();
					}}
				>
					<Save className="size-3.5" />
					{saving
						? t('huhubot.agent.saving')
						: uncertain
							? t('huhubot.chat.retryOriginal')
							: t('huhubot.agent.save')}
				</Button>
			</footer>
			<UnsavedChangesDialog
				open={reloadConfirmation}
				onCancel={() => setReloadConfirmation(false)}
				onDiscard={() => void reloadSaved()}
			/>
		</section>
	);
}

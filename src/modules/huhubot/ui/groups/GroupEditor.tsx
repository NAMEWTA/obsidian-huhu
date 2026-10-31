import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Group, Save } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Checkbox } from '../../../../ui/components/checkbox';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { SegmentedControl, SettingsRow } from '../../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { t } from '../../../../shared/i18n';
import type { Agent, BotClient, CommandMeta, GroupHistoryScope, Session, BotMethodMap } from '../../api';
import { coordinatorIsMember, historyScope } from '../agents/model';
import { CommandAttempt } from '../../services/workbench/command-attempt';
import { BotRpcError } from '../../core/protocol/connection';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';

export interface GroupEditorProps {
	client: BotClient;
	profileId?: string;
	agents: readonly Agent[];
	session?: Session;
	busy?: boolean;
	onSaved?: (session: Session) => void;
	onLoaded?: (session: Session) => void;
	onCommittedSession?: (session: Session) => void;
	onMembershipChanging?: () => void;
	onDirtyChanged?: (dirty: boolean) => void;
}

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

function initialScope(session?: Session): GroupHistoryScope {
	const member = session?.groupMembers?.[0];
	return member?.historyScope ?? { kind: 'none' };
}

export function GroupEditor(props: GroupEditorProps) {
	return <GroupEditorForm key={props.session?.id ?? 'new'} {...props} />;
}

function GroupEditorForm({
	client,
	profileId = client.hello.profile.profileId,
	agents,
	session,
	busy = false,
	onSaved,
	onLoaded,
	onCommittedSession,
	onMembershipChanging,
	onDirtyChanged,
}: GroupEditorProps) {
	const id = useId();
	const [title, setTitle] = useState(session?.title ?? '');
	const [memberIds, setMemberIds] = useState<string[]>(() => [...(session?.memberIds ?? [])]);
	const [coordinatorId, setCoordinatorId] = useState(session?.coordinatorId ?? '');
	const [scopeKind, setScopeKind] = useState<GroupHistoryScope['kind']>(initialScope(session).kind);
	const [after, setAfter] = useState(initialScope(session).afterSeq ?? '');
	const [through, setThrough] = useState(initialScope(session).throughSeq ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const durable = useRef(session);
	const [hasCreated, setHasCreated] = useState(false);
	const [uncertain, setUncertain] = useState(false);
	const [canReload, setCanReload] = useState(false),
		[reloadConfirmation, setReloadConfirmation] = useState(false),
		[reloading, setReloading] = useState(false);
	const reloadController = useRef<AbortController | undefined>(undefined);
	useEffect(() => () => reloadController.current?.abort(), []);
	const [createAttempt] = useState(() => new CommandAttempt<BotMethodMap['sessions.create']['params'], Session>());
	const [memberAttempt] = useState(
		() => new CommandAttempt<BotMethodMap['sessions.updateMembers']['params'], Session>(),
	);
	const [coordinatorAttempt] = useState(
		() => new CommandAttempt<BotMethodMap['sessions.setCoordinator']['params'], Session>(),
	);
	useEffect(() => {
		onDirtyChanged?.(
			title !== (session?.title ?? '') ||
				coordinatorId !== (session?.coordinatorId ?? '') ||
				JSON.stringify(memberIds) !== JSON.stringify(session?.memberIds ?? []) ||
				JSON.stringify(historyScope(scopeKind, after, through)) !== JSON.stringify(initialScope(session)),
		);
	}, [title, coordinatorId, memberIds, scopeKind, after, through, session, onDirtyChanged]);
	const coordinatorValid = coordinatorIsMember(memberIds, coordinatorId);
	const valid = title.trim().length > 0 && memberIds.length > 0 && coordinatorValid;
	const toggleMember = (agentId: string) =>
		setMemberIds((current) => {
			const next = current.includes(agentId)
				? current.filter((idValue) => idValue !== agentId)
				: [...current, agentId];
			if (!next.includes(coordinatorId)) setCoordinatorId(next[0] ?? '');
			return next;
		});
	const reloadSaved = async () => {
		const id = durable.current?.id ?? session?.id;
		if (!id || saving || reloading) return;
		const controller = new AbortController();
		reloadController.current?.abort();
		reloadController.current = controller;
		setReloading(true);
		setReloadConfirmation(false);
		try {
			const fresh = await client.sessions.get({ profileId, id }, { signal: controller.signal });
			if (controller.signal.aborted || client.state === 'closed') return;
			if (fresh.id !== id || fresh.kind !== 'group') throw Error('SESSION_IDENTITY_CHANGED');
			durable.current = fresh;
			createAttempt.discard();
			memberAttempt.discard();
			coordinatorAttempt.discard();
			const scope = initialScope(fresh);
			setTitle(fresh.title);
			setMemberIds([...fresh.memberIds]);
			setCoordinatorId(fresh.coordinatorId ?? '');
			setScopeKind(scope.kind);
			setAfter(scope.afterSeq ?? '');
			setThrough(scope.throughSeq ?? '');
			setUncertain(false);
			setCanReload(false);
			setError('');
			setNotice(t('huhubot.common.savedVersionLoaded'));
			onLoaded?.(fresh);
		} catch {
			if (!controller.signal.aborted) setError(t('huhubot.group.unsaved'));
		} finally {
			if (!controller.signal.aborted) setReloading(false);
		}
	};
	const save = async () => {
		if (!valid || saving || busy) {
			if (!memberIds.length) setError(t('huhubot.group.memberRequired'));
			else if (!coordinatorValid) setError(t('huhubot.group.coordinatorRequired'));
			return;
		}
		setSaving(true);
		setError('');
		setNotice('');
		const scope = historyScope(scopeKind, after, through);
		try {
			if (!durable.current) onMembershipChanging?.();
			let saved =
				durable.current ??
				(await createAttempt
					.send(
						() => ({
							...commandMeta(client, profileId),
							kind: 'group',
							title: title.trim(),
							memberIds: [...memberIds],
							coordinatorId,
						}),
						(command) => client.sessions.create(command),
					)
					.finally(() => onMembershipChanging?.()));
			durable.current = saved;
			onCommittedSession?.(saved);
			if (!session) setHasCreated(true);
			const setCoordinator = async (current: Session) => {
				const next = await coordinatorAttempt.send(
					() => ({ ...revisionMeta(client, profileId, current.revision), id: current.id, coordinatorId }),
					(command) => client.sessions.setCoordinator(command),
				);
				durable.current = next;
				onCommittedSession?.(next);
				return next;
			};
			const setMembers = async (current: Session, ids: string[]) => {
				onMembershipChanging?.();
				const next = await memberAttempt
					.send(
						() => ({
							...revisionMeta(client, profileId, current.revision),
							id: current.id,
							memberIds: [...ids],
							historyScope: scope,
						}),
						(command) => client.sessions.updateMembers(command),
					)
					.finally(() => onMembershipChanging?.());
				durable.current = next;
				onCommittedSession?.(next);
				return next;
			};
			if (saved.coordinatorId !== coordinatorId && saved.memberIds.includes(coordinatorId))
				saved = await setCoordinator(saved);
			const interim =
				saved.coordinatorId && !memberIds.includes(saved.coordinatorId)
					? [...memberIds, saved.coordinatorId]
					: memberIds;
			saved = await setMembers(saved, interim);
			if (saved.coordinatorId !== coordinatorId) {
				saved = await setCoordinator(saved);
				if (interim.length !== memberIds.length) saved = await setMembers(saved, memberIds);
			}
			setUncertain(false);
			setCanReload(false);
			setTitle(saved.title);
			setNotice(t('huhubot.group.save'));
			onSaved?.(saved);
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : String(reason);
			const unknown = createAttempt.uncertain || memberAttempt.uncertain || coordinatorAttempt.uncertain;
			const changed =
				reason instanceof BotRpcError &&
				reason.data.kind === 'CONFLICT' &&
				/^REVISION_/.test(reason.data.reason);
			setCanReload(changed && !!durable.current);
			setUncertain(unknown);
			setError(
				changed
					? t('huhubot.group.conflict')
					: unknown
						? t('huhubot.chat.startUncertain')
						: message.includes('BUSY')
							? t('huhubot.group.busy')
							: t('huhubot.group.unsaved'),
			);
		} finally {
			setSaving(false);
		}
	};
	return (
		<section
			className="flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto p-4 [&_[data-slot=settings-row]]:flex-col [&_[data-slot=settings-row]]:items-stretch [&_[data-slot=settings-row]>div]:min-w-0 [&_[data-slot=settings-row]>div]:w-full @min-[42rem]:[&_[data-slot=settings-row]]:flex-row @min-[42rem]:[&_[data-slot=settings-row]]:items-center @min-[42rem]:[&_[data-slot=settings-row]>div]:w-auto"
			aria-label={session ? t('huhubot.group.edit') : t('huhubot.group.create')}
		>
			<header>
				<h2 className="m-0 text-base font-semibold">
					{session ? t('huhubot.group.edit') : t('huhubot.group.create')}
				</h2>
				<p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.group.unsaved')}</p>
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
					<span>{error || notice}</span>
				</div>
			)}
			<fieldset
				disabled={saving || busy || uncertain || reloading}
				className="m-0 grid min-w-0 gap-5 border-0 p-0"
				aria-label={t('huhubot.group.edit')}
			>
				<SettingsSection title={t('huhubot.group.title')}>
					<SettingsRow
						label={t('huhubot.group.title')}
						description={session ? t('huhubot.group.titleImmutable') : undefined}
						control={
							<Input
								id={`${id}-title`}
								aria-label={t('huhubot.group.title')}
								value={title}
								readOnly={!!session || hasCreated}
								onChange={(event) => setTitle(event.currentTarget.value)}
								autoFocus
								required
							/>
						}
					/>
				</SettingsSection>
				<SettingsSection title={t('huhubot.group.members')}>
					<div role="group" aria-label={t('huhubot.group.members')} className="grid gap-2">
						{agents.length ? (
							agents.map((agent) => (
								<label
									key={agent.id}
									className="flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50"
								>
									<Checkbox
										checked={memberIds.includes(agent.id)}
										disabled={saving || busy || !agent.enabled}
										onCheckedChange={() => toggleMember(agent.id)}
										aria-label={agent.name}
									/>
									<span className="min-w-0 flex-1 truncate" title={agent.name}>
										{agent.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{agent.enabled ? t('huhubot.agent.enabled') : t('huhubot.agent.disabled')}
									</span>
								</label>
							))
						) : (
							<p className="m-0 text-sm text-muted-foreground">{t('huhubot.group.memberRequired')}</p>
						)}
					</div>
					<SettingsRow
						label={t('huhubot.group.coordinator')}
						description={busy ? t('huhubot.group.busy') : undefined}
						control={
							<select
								className="h-9 min-w-52 max-w-full rounded-md border border-input bg-transparent px-2 text-sm"
								aria-label={t('huhubot.group.coordinator')}
								disabled={saving || busy || !memberIds.length}
								value={coordinatorId}
								onChange={(event) => setCoordinatorId(event.currentTarget.value)}
							>
								{memberIds.map((agentId) => {
									const agent = agents.find((item) => item.id === agentId);
									return (
										<option key={agentId} value={agentId}>
											{agent?.name ?? agentId}
										</option>
									);
								})}
							</select>
						}
					/>
				</SettingsSection>
				<SettingsSection title={t('huhubot.group.history')}>
					<SegmentedControl
						value={scopeKind}
						onChange={setScopeKind}
						ariaLabel={t('huhubot.group.history')}
						options={[
							{ value: 'none', label: t('huhubot.group.historyNone') },
							{ value: 'range', label: t('huhubot.group.historyRange') },
						]}
					/>
					{scopeKind === 'range' && (
						<div className="grid gap-3 @min-[42rem]:grid-cols-2">
							<div className="grid gap-1.5">
								<Label htmlFor={`${id}-after`}>{t('huhubot.group.after')}</Label>
								<Input
									id={`${id}-after`}
									inputMode="numeric"
									value={after}
									onChange={(event) => setAfter(event.currentTarget.value.replace(/[^0-9]/g, ''))}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor={`${id}-through`}>{t('huhubot.group.through')}</Label>
								<Input
									id={`${id}-through`}
									inputMode="numeric"
									value={through}
									onChange={(event) => setThrough(event.currentTarget.value.replace(/[^0-9]/g, ''))}
								/>
							</div>
						</div>
					)}
				</SettingsSection>
			</fieldset>
			<footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
				{canReload && (
					<Button
						variant="outline"
						disabled={saving || reloading}
						onClick={() => setReloadConfirmation(true)}
					>
						{t('huhubot.common.reloadSaved')}
					</Button>
				)}
				{uncertain && (
					<Button
						variant="outline"
						disabled={saving}
						onClick={() => {
							createAttempt.discard();
							memberAttempt.discard();
							coordinatorAttempt.discard();
							setUncertain(false);
							setError('');
							if (durable.current) onSaved?.(durable.current);
						}}
					>
						{t('huhubot.common.abandonRequest')}
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					disabled={!valid || saving || busy || reloading}
					onClick={() => {
						void save();
					}}
				>
					<Save className="size-3.5" />
					{saving
						? t('huhubot.group.saving')
						: uncertain
							? t('huhubot.chat.retryOriginal')
							: t('huhubot.group.save')}
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

export function GroupEmptyState() {
	return (
		<div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
			<Group className="size-8 text-muted-foreground" aria-hidden />
			<h2 className="m-0 text-base font-semibold">{t('huhubot.group.create')}</h2>
		</div>
	);
}

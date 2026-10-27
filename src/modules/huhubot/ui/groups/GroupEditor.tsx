import { useId, useState } from 'react';
import { CheckCircle2, CircleAlert, Group, Save } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { SettingsRow } from '../../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { t } from '../../../../shared/i18n';
import type { Agent, BotClient, CommandMeta, GroupHistoryScope, Session } from '../../api';
import '../../i18n/agent';
import { coordinatorIsMember, historyScope } from '../agents/model';

export interface GroupEditorProps {
	client: BotClient;
	profileId?: string;
	agents: readonly Agent[];
	session?: Session;
	busy?: boolean;
	onSaved?: (session: Session) => void;
}

function commandMeta(client: BotClient, profileId: string): CommandMeta {
	return { commandId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), profileId, commandEpoch: client.hello.profile.commandEpoch };
}
function revisionMeta(client: BotClient, profileId: string, expectedRevision: string): CommandMeta & { expectedRevision: string } {
	return { ...commandMeta(client, profileId), expectedRevision };
}

function initialScope(session?: Session): GroupHistoryScope {
	const member = session?.groupMembers?.[0];
	return member?.historyScope ?? { kind: 'none' };
}

export function GroupEditor({ client, profileId = client.hello.profile.profileId, agents, session, busy = false, onSaved }: GroupEditorProps) {
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
	const coordinatorValid = coordinatorIsMember(memberIds, coordinatorId);
	const valid = title.trim().length > 0 && memberIds.length > 0 && coordinatorValid;
	const toggleMember = (agentId: string) => setMemberIds(current => {
		const next = current.includes(agentId) ? current.filter(idValue => idValue !== agentId) : [...current, agentId];
		if (!next.includes(coordinatorId)) setCoordinatorId(next[0] ?? '');
		return next;
	});
	const save = async () => {
		if (!valid || saving || busy) {
			if (!memberIds.length) setError(t('huhubot.group.memberRequired'));
			else if (!coordinatorValid) setError(t('huhubot.group.coordinatorRequired'));
			return;
		}
		setSaving(true); setError(''); setNotice('');
		const scope = historyScope(scopeKind, after, through);
		try {
			const saved = session
				? await client.sessions.updateMembers({ ...revisionMeta(client, profileId, session.revision), id: session.id, memberIds, historyScope: scope })
				: await client.sessions.create({ ...commandMeta(client, profileId), kind: 'group', title: title.trim(), memberIds, coordinatorId });
			if (session && saved.title !== title.trim()) {
				// The title has no separate update method in HAP. Keep the server title as the durable value.
				setTitle(saved.title);
			}
			setNotice(t('huhubot.group.save')); onSaved?.(saved);
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : String(reason);
			setError(message.includes('BUSY') ? t('huhubot.group.busy') : t('huhubot.group.unsaved'));
		} finally { setSaving(false); }
	};
	return <section className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4" aria-label={session ? t('huhubot.group.edit') : t('huhubot.group.create')}>
		<header><h2 className="m-0 text-base font-semibold">{session ? t('huhubot.group.edit') : t('huhubot.group.create')}</h2><p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.group.unsaved')}</p></header>
		{(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${error ? 'border-destructive/50 text-destructive' : 'border-status-success/40 text-status-success'}`}>{error ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}<span>{error || notice}</span></div>}
		<SettingsSection title={t('huhubot.group.title')}>
			<SettingsRow label={t('huhubot.group.title')} control={<Input id={`${id}-title`} aria-label={t('huhubot.group.title')} value={title} onChange={event => setTitle(event.currentTarget.value)} autoFocus required />} />
		</SettingsSection>
		<SettingsSection title={t('huhubot.group.members')}>
			<div role="group" aria-label={t('huhubot.group.members')} className="grid gap-2">
				{agents.length ? agents.map(agent => <label key={agent.id} className="flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50"><input type="checkbox" checked={memberIds.includes(agent.id)} disabled={saving || busy || !agent.enabled} onChange={() => toggleMember(agent.id)} aria-label={agent.name} /><span className="min-w-0 flex-1 truncate" title={agent.name}>{agent.name}</span><span className="text-xs text-muted-foreground">{agent.enabled ? t('huhubot.agent.enabled') : t('huhubot.agent.disabled')}</span></label>) : <p className="m-0 text-sm text-muted-foreground">{t('huhubot.group.memberRequired')}</p>}
			</div>
			<SettingsRow label={t('huhubot.group.coordinator')} description={busy ? t('huhubot.group.busy') : undefined} control={<select className="h-9 min-w-52 max-w-full rounded-md border border-input bg-transparent px-2 text-sm" aria-label={t('huhubot.group.coordinator')} disabled={saving || busy || !memberIds.length} value={coordinatorId} onChange={event => setCoordinatorId(event.currentTarget.value)}>{memberIds.map(agentId => { const agent = agents.find(item => item.id === agentId); return <option key={agentId} value={agentId}>{agent?.name ?? agentId}</option>; })}</select>} />
		</SettingsSection>
		<SettingsSection title={t('huhubot.group.history')}>
			<div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('huhubot.group.history')}>
				<label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"><input type="radio" name={`${id}-history`} value="none" checked={scopeKind === 'none'} onChange={() => setScopeKind('none')} />{t('huhubot.group.historyNone')}</label>
				<label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"><input type="radio" name={`${id}-history`} value="range" checked={scopeKind === 'range'} onChange={() => setScopeKind('range')} />{t('huhubot.group.historyRange')}</label>
			</div>
			{scopeKind === 'range' && <div className="grid gap-3 @min-[42rem]:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor={`${id}-after`}>{t('huhubot.group.after')}</Label><Input id={`${id}-after`} inputMode="numeric" value={after} onChange={event => setAfter(event.currentTarget.value.replace(/[^0-9]/g, ''))} /></div><div className="grid gap-1.5"><Label htmlFor={`${id}-through`}>{t('huhubot.group.through')}</Label><Input id={`${id}-through`} inputMode="numeric" value={through} onChange={event => setThrough(event.currentTarget.value.replace(/[^0-9]/g, ''))} /></div></div>}
		</SettingsSection>
		<footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3"><Button type="button" size="sm" disabled={!valid || saving || busy} onClick={() => { void save(); }}><Save className="size-3.5" />{saving ? t('huhubot.group.saving') : t('huhubot.group.save')}</Button></footer>
	</section>;
}

export function GroupEmptyState() {
	return <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center"><Group className="size-8 text-muted-foreground" aria-hidden /><h2 className="m-0 text-base font-semibold">{t('huhubot.group.create')}</h2></div>;
}

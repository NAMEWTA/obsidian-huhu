import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { Button } from '../../../../ui/components/button';
import { Notice } from '../../../../ui/components/huhu/Notice';
import { DetailPane } from '../../../../ui/components/huhu/DetailPane';
import { Badge } from '../../../../ui/components/badge';
import { useT } from '../../../../ui/react/hooks';
import { useWorkspaceUI } from './workspace-context';
import { sessionState } from '../../services/terminal/status';

/** Only presents existing workspace state. Locating never submits terminal input. */
export function WaitingAnswerBanner() {
	const { controller } = useWorkspaceUI();
	const workspace = controller.workspace;
	const state = useStore(workspace.store);
	const t = useT();
	const managed = useSyncExternalStore(workspace.subscribeManaged, workspace.getManagedSnapshot);
	const waiting = Object.values(state.tabs).flatMap(tab => tab.kind === 'terminal' ? tab.sessionIds.flatMap(sessionId => {
		const session = controller.sessions.get(sessionId);
		const activity = session && sessionState(session);
		return activity === 'waiting' || activity === 'permission' ? [{ tab, sessionId }] : [];
	}) : []).at(0);
	const background = managed.sessions.find(row => !row.archived && row.runtime?.activityDetail?.blocking.state === 'blocked');
	const [busy, setBusy] = useState(false), [error, setError] = useState('');
	const pending = useRef(false), alive = useRef(true);
	useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
	const targetKey = waiting?.sessionId ?? JSON.stringify([background?.spaceId, background?.sessionId, background?.runtime?.runtimeId]);
	const currentTarget = useRef(targetKey); currentTarget.current = targetKey;
	useEffect(() => { pending.current = false; setBusy(false); setError(''); }, [targetKey]);
	if (!waiting && !background) return null;
	const locate = async () => {
		if (pending.current) return;
		if (waiting) { workspace.focusSession(waiting.sessionId); return; }
		if (!background?.runtime) return;
		const captured = targetKey;
		pending.current = true; setBusy(true); setError('');
		try {
			const result = await workspace.attachManaged({ spaceId: background.spaceId, sessionId: background.sessionId }, { expectedRuntimeId: background.runtime.runtimeId, focus: true });
			if (alive.current && captured === currentTarget.current && result.status === 'failed') setError(t(result.error.messageKey));
			else if (alive.current && captured === currentTarget.current && result.status === 'not-running') setError(t('agent.managed.notRunning'));
		} catch (cause) { if (alive.current && captured === currentTarget.current) setError(cause instanceof Error ? cause.message : t('agent.control.failed')); }
		finally { if (captured === currentTarget.current) { pending.current = false; if (alive.current) setBusy(false); } }
	};
	return <div className="shrink-0 space-y-2 px-5 py-3" data-agent-waiting-banner>
		<Notice tone="warning" title={waiting ? waiting.tab.customTitle || waiting.tab.title : background!.title}
			action={<Button variant="secondary" size="sm" busy={busy} onClick={() => { void locate(); }}>{t('agent.activityEvidence.viewTerminal')}</Button>}>{t('agent.waitingBanner')}</Notice>
		{error && <Notice tone="error" title={error} />}
	</div>;
}

export function SessionInformation({ open, onOpenChange, leafWidth }: { open: boolean; onOpenChange: (value: boolean) => void; leafWidth: number }) {
	const { controller } = useWorkspaceUI();
	const workspace = controller.workspace;
	const state = useStore(workspace.store);
	const snapshot = useSyncExternalStore(workspace.subscribeManaged, workspace.getManagedSnapshot);
	const t = useT();
	const group = state.groups.find(group => group.id === state.activeGroupId);
	const tab = state.tabs[group?.activeTabId ?? ''];
	const terminal = tab?.kind === 'terminal' ? tab : undefined;
	const info = terminal && (terminal.panes[terminal.focusedSessionId] ?? terminal.resume);
	const managed = terminal && snapshot.sessions.find(row => row.runtime?.runtimeId === terminal.focusedSessionId || (row.spaceId === info?.spaceId && row.sessionId === info?.persistentSessionId));
	const rows = terminal ? [
		[t('agent.historyUI.detail.provider'), info?.agentId ? controller.agentTitle(info.agentId) : t('agent.inbox.shell')],
		[t('agent.historyUI.detail.account'), info?.accountId],
		[t('agent.historyUI.detail.space'), info?.spaceId],
		[t('agent.quick.cwd'), info?.cwd],
		[t('agent.sessionId'), info?.persistentSessionId ?? terminal.focusedSessionId],
		[t('agent.historyUI.detail.source'), info?.nativeSessionId],
	] : [];
	return <DetailPane open={open && !!terminal} onOpenChange={value => onOpenChange(value)} leafWidth={leafWidth} title={t('agent.sessionInfo')}>
		{terminal && <div className="space-y-5" data-agent-session-information>
			<h3 className="break-words text-lg font-semibold">{terminal.customTitle || terminal.title}</h3>
			<Badge variant={terminal.state === 'waiting' || terminal.state === 'permission' ? 'warning' : terminal.state === 'working' ? 'accent' : 'neutral'}>{t(`agent.workspace.state.${terminal.state}`)}</Badge>
			<dl className="space-y-4">{rows.filter(([, value]) => value !== undefined && value !== '').map(([label, value]) => <div key={label} className="space-y-1"><dt className="text-sm text-[var(--hu-fg-2)]">{label}</dt><dd className="m-0 break-words font-mono text-sm">{value}</dd></div>)}</dl>
			{managed?.runtime?.error && <Notice tone="error" title={t(managed.runtime.error.messageKey)} />}
		</div>}
	</DetailPane>;
}

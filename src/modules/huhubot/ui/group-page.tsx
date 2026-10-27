import { createElement, useEffect, useState } from 'react';
import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { t } from '../../../shared/i18n';
import type { Agent, BotClient, Session } from '../api';
import { GroupEditor } from './groups/GroupEditor';

function GroupEditorView({ client, selectedId }: { client: BotClient; selectedId?: string }) {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [selected, setSelected] = useState<Session>();
	useEffect(() => {
		let alive = true;
		void Promise.all([
			client.agents.list({ profileId: client.hello.profile.profileId, limit: 100 }),
			client.sessions.list({ profileId: client.hello.profile.profileId, limit: 100 }),
		]).then(([agentPage, sessionPage]) => {
			if (!alive) return;
			setAgents(agentPage.items);
			const groups = sessionPage.items.filter(session => session.kind === 'group');
			setSessions(groups);
			setSelected(groups.find(session => session.id === selectedId) ?? groups[0]);
		}).catch(() => { if (alive) { setAgents([]); setSessions([]); setSelected(undefined); } });
		return () => { alive = false; };
	}, [client, selectedId]);
	return <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden @3xl:grid-cols-[15rem,minmax(0,1fr)]">
		<aside className="min-h-0 overflow-y-auto border-b border-border p-2 @3xl:border-r @3xl:border-b-0"><button type="button" className="mb-2 w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => setSelected(undefined)}>{t('huhubot.group.create')}</button><div className="grid gap-1">{sessions.map(session => <button type="button" key={session.id} className={`rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${selected?.id === session.id ? 'bg-accent' : ''}`} onClick={() => setSelected(session)}>{session.title}<span className="block text-xs text-muted-foreground">{session.memberIds.length} {t('huhubot.group.memberCount')}</span></button>)}</div></aside>
		<main className="min-h-0"><GroupEditor client={client} agents={agents} session={selected} onSaved={saved => { setSessions(current => current.some(session => session.id === saved.id) ? current.map(session => session.id === saved.id ? saved : session) : [saved, ...current]); setSelected(saved); }} /></main>
	</div>;
}

class GroupPresentation extends ReactSurface {
	constructor(context: NativeSurfaceContext, private readonly client: BotClient, private readonly selectedId?: string) { super(context); }
	getViewType(): string { return 'huhu-bot-groups'; }
	getDisplayText(): string { return t('huhubot.group.edit'); }
	getIcon(): string { return 'users'; }
	override onOpen(): Promise<void> { void super.onOpen(); this.rerender(); return Promise.resolve(); }
	protected renderContent() { return createElement(GroupEditorView, { client: this.client, selectedId: this.selectedId }); }
}

export const createGroupPage = (client: BotClient): PageCreate => async (context, target, _state, signal) => {
	if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
	const surface = new GroupPresentation(context, client, target.resourceId);
	return { surface, getTarget: () => target, navigate: async () => {} };
};

import { createElement, useEffect, useState } from 'react';
import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { t } from '../../../shared/i18n';
import type { Agent, BotClient } from '../api';
import { AgentEditor } from './agents/AgentEditor';

function AgentEditorView({ client, selectedId }: { client: BotClient; selectedId?: string }) {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [selected, setSelected] = useState<Agent>();
	useEffect(() => {
		let alive = true;
		void client.agents.list({ profileId: client.hello.profile.profileId, limit: 100 }).then(page => {
			if (!alive) return;
			setAgents(page.items);
			setSelected(page.items.find(agent => agent.id === selectedId) ?? page.items[0]);
		}).catch(() => { if (alive) { setAgents([]); setSelected(undefined); } });
		return () => { alive = false; };
	}, [client, selectedId]);
	return <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden @3xl:grid-cols-[15rem,minmax(0,1fr)]">
		<aside className="min-h-0 overflow-y-auto border-b border-border p-2 @3xl:border-r @3xl:border-b-0"><button type="button" className="mb-2 w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => setSelected(undefined)}>{t('huhubot.agent.create')}</button><div className="grid gap-1">{agents.map(agent => <button type="button" key={agent.id} className={`rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${selected?.id === agent.id ? 'bg-accent' : ''}`} onClick={() => setSelected(agent)}>{agent.name}<span className="block text-xs text-muted-foreground">{agent.enabled ? t('huhubot.agent.enabled') : t('huhubot.agent.disabled')}</span></button>)}</div></aside>
		<main className="min-h-0"><AgentEditor client={client} agent={selected} onSaved={saved => { setAgents(current => current.some(agent => agent.id === saved.id) ? current.map(agent => agent.id === saved.id ? saved : agent) : [saved, ...current]); setSelected(saved); }} onDisabled={disabled => { setAgents(current => current.map(agent => agent.id === disabled.id ? disabled : agent)); setSelected(disabled); }} /></main>
	</div>;
}

class AgentPresentation extends ReactSurface {
	constructor(context: NativeSurfaceContext, private readonly client: BotClient, private readonly selectedId?: string) { super(context); }
	getViewType(): string { return 'huhu-bot-agents'; }
	getDisplayText(): string { return t('huhubot.agent.edit'); }
	getIcon(): string { return 'bot'; }
	override onOpen(): Promise<void> { void super.onOpen(); this.rerender(); return Promise.resolve(); }
	protected renderContent() { return createElement(AgentEditorView, { client: this.client, selectedId: this.selectedId }); }
}

export const createAgentPage = (client: BotClient): PageCreate => async (context, target, _state, signal) => {
	if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
	const surface = new AgentPresentation(context, client, target.resourceId);
	return { surface, getTarget: () => target, navigate: async () => {} };
};

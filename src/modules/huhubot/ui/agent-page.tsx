import { createElement, useEffect, useRef, useState } from 'react';
import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { Button } from '../../../ui/components/button';
import { t } from '../../../shared/i18n';
import type { Agent } from '../api';
import type { WorkbenchClient, CredentialEditor } from '../services/workbench/workbench-client';
import { AgentEditor } from './agents/AgentEditor';
import { AgentProposals } from './agents/AgentProposals';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { BotBackButton } from './BotNavigation';
import { useBotDirectory, type BotClientSource } from './useBotDirectory';

export function AgentEditorView({
	getClient: source,
	selectedId,
	credentials,
	shared,
	openChat,
}: {
	getClient: BotClientSource;
	selectedId?: string;
	credentials?: CredentialEditor;
	shared?: WorkbenchClient;
	openChat?: () => void;
}) {
	const { workspace, view, client, getClient, refresh, ready, connectionKey } = useBotDirectory(source, shared);
	const [selection, setSelection] = useState<string | undefined>(selectedId),
		[dirty, setDirty] = useState(false),
		[pending, setPending] = useState<{ id?: string }>();
	const [formGeneration, setFormGeneration] = useState(0);
	const [previousRoute, setPreviousRoute] = useState(selectedId);
	if (previousRoute !== selectedId) {
		setPreviousRoute(selectedId);
		if (dirty) setPending({ id: selectedId });
		else setSelection(selectedId ?? '');
	}
	const selectedIdentity = selection ?? view.agents[0]?.id;
	const selectionRef = useRef(selectedIdentity);
	useEffect(() => {
		selectionRef.current = selectedIdentity;
	}, [selectedIdentity]);

	const choose = (id?: string) => {
		if (dirty) setPending({ id });
		else {
			setSelection(id ?? '');
			if (!id) setFormGeneration((value) => value + 1);
		}
	};
	const saved = (agent: Agent) => {
		if (getClient() !== client) return;
		workspace.acceptAgent(agent);
		if (selectionRef.current === agent.id || !selectionRef.current) {
			setSelection(agent.id);
			setDirty(false);
		}
	};
	if (!client)
		return (
			<div className="p-4">
				<BotBackButton open={openChat} />
				<p role="status" className="text-sm text-muted-foreground">
					{t('huhubot.chat.offline')}
				</p>
			</div>
		);
	if (!ready)
		return (
			<div className="p-4">
				<BotBackButton open={openChat} />
				<p role={view.error ? 'alert' : 'status'} className="text-sm text-muted-foreground">
					{t(view.error ? 'huhubot.chat.error' : 'huhubot.chat.loading')}
				</p>
				{view.error && (
					<Button variant="outline" onClick={() => void refresh()}>
						{t('huhubot.common.refresh')}
					</Button>
				)}
			</div>
		);
	return (
		<div className="grid h-full min-h-0 grid-cols-1 overflow-auto @container @min-[960px]:grid-cols-[15rem_minmax(0,1fr)]">
			<aside className="min-h-0 overflow-y-auto border-b border-border p-2 @min-[960px]:border-r @min-[960px]:border-b-0">
				<BotBackButton open={openChat} />
				<Button variant="outline" className="mb-2 w-full" onClick={() => choose()}>
					{t('huhubot.agent.create')}
				</Button>
				{view.error && (
					<p role="alert" className="text-xs text-destructive">
						{t('huhubot.agent.error')}
						<Button variant="link" onClick={() => void workspace.refreshDirectory()}>
							{t('huhubot.common.refresh')}
						</Button>
					</p>
				)}
				<div className="grid gap-1">
					{view.agents.map((agent) => (
						<Button
							key={agent.id}
							variant={selectedIdentity === agent.id ? 'secondary' : 'ghost'}
							className="w-full justify-start"
							onClick={() => choose(agent.id)}
						>
							{agent.name}
						</Button>
					))}
				</div>
				{view.agentCursor && (
					<Button variant="outline" onClick={() => void workspace.refreshDirectory(true)}>
						{t('huhubot.common.more')}
					</Button>
				)}
			</aside>
			<main className="min-h-0 min-w-0 overflow-auto">
				<div className="p-3">
					<AgentProposals key={connectionKey} client={client} workspace={workspace} />
				</div>
				<AgentEditor
					key={`${connectionKey}:${selectedIdentity ?? 'new'}:${formGeneration}`}
					client={client}
					agent={view.agents.find((agent) => agent.id === selectedIdentity)}
					credentials={credentials}
					onDirtyChanged={setDirty}
					onSaved={saved}
					onLoaded={saved}
					onDisabled={saved}
					onDeleted={(id) => {
						if (getClient() !== client) return;
						workspace.removeAgent(id);
						if (selectionRef.current === id) {
							setSelection('');
							setFormGeneration((value) => value + 1);
							setDirty(false);
						}
					}}
				/>
			</main>
			<UnsavedChangesDialog
				open={!!pending}
				onCancel={() => setPending(undefined)}
				onDiscard={() => {
					setSelection(pending?.id ?? '');
					setFormGeneration((value) => value + 1);
					setDirty(false);
					setPending(undefined);
				}}
			/>
		</div>
	);
}
class AgentPresentation extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly client: BotClientSource,
		private selectedId?: string,
		private readonly credentials?: CredentialEditor,
		private readonly shared?: WorkbenchClient,
		private readonly openChat?: () => void,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-bot-agents';
	}
	getDisplayText(): string {
		return t('huhubot.agent.edit');
	}
	getIcon(): string {
		return 'bot';
	}
	navigate(id?: string): void {
		this.selectedId = id;
		this.rerender();
	}
	protected renderContent() {
		return createElement(AgentEditorView, {
			getClient: this.client,
			selectedId: this.selectedId,
			credentials: this.credentials,
			shared: this.shared,
			openChat: this.openChat,
		});
	}
}
export const createAgentPage =
	(
		client: BotClientSource,
		credentials?: CredentialEditor,
		workspace?: WorkbenchClient,
		openChat?: () => void,
	): PageCreate =>
	async (context, target, _state, signal) => {
		if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
		const surface = new AgentPresentation(context, client, target.resourceId, credentials, workspace, openChat);
		return { surface, getTarget: () => target, navigate: async (next) => surface.navigate(next.resourceId) };
	};

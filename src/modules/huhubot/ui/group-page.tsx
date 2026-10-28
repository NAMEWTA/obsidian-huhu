import { createElement, useEffect, useRef, useState } from 'react';
import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { Button } from '../../../ui/components/button';
import { t } from '../../../shared/i18n';
import type { Session } from '../api';
import type { WorkbenchClient } from '../services/workbench/workbench-client';
import { GroupEditor } from './groups/GroupEditor';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { BotBackButton } from './BotNavigation';
import { useBotDirectory, type BotClientSource } from './useBotDirectory';

export function GroupEditorView({
	getClient: source,
	selectedId,
	shared,
	openChat,
}: {
	getClient: BotClientSource;
	selectedId?: string;
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
	const selectedIdentity = selection ?? view.sessions.find((session) => session.kind === 'group')?.id;
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
	const saved = (session: Session) => {
		if (getClient() !== client) return;
		workspace.acceptSession(session);
		if (selectionRef.current === session.id || !selectionRef.current) {
			setSelection(session.id);
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
					{t('huhubot.group.create')}
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
					{view.sessions
						.filter((session) => session.kind === 'group' && !session.archived)
						.map((session) => (
							<Button
								key={session.id}
								variant={selectedIdentity === session.id ? 'secondary' : 'ghost'}
								className="w-full justify-start"
								onClick={() => choose(session.id)}
							>
								{session.title}
							</Button>
						))}
				</div>
				{view.sessionCursor && (
					<Button variant="outline" onClick={() => void workspace.refreshDirectory(true)}>
						{t('huhubot.common.more')}
					</Button>
				)}
			</aside>
			<main className="min-h-0 min-w-0">
				<GroupEditor
					key={`${connectionKey}:${selectedIdentity || 'new'}:${formGeneration}`}
					client={client}
					agents={view.agents}
					session={view.sessions.find((session) => session.id === selectedIdentity)}
					onDirtyChanged={(value) => {
						setDirty(value);
						if (value && selection === undefined) setSelection(selectedIdentity ?? '');
					}}
					onMembershipChanging={() => {
						if (getClient() !== client) return;
						if (selection === undefined) setSelection(selectedIdentity ?? '');
						workspace.permissionsChanged();
					}}
					onCommittedSession={(committed) => {
						if (getClient() === client) workspace.acceptSession(committed);
					}}
					onSaved={saved}
					onLoaded={saved}
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
class GroupPresentation extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly client: BotClientSource,
		private selectedId?: string,
		private readonly shared?: WorkbenchClient,
		private readonly openChat?: () => void,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-bot-groups';
	}
	getDisplayText(): string {
		return t('huhubot.group.edit');
	}
	getIcon(): string {
		return 'users';
	}
	navigate(id?: string): void {
		this.selectedId = id;
		this.rerender();
	}
	protected renderContent() {
		return createElement(GroupEditorView, {
			getClient: this.client,
			selectedId: this.selectedId,
			shared: this.shared,
			openChat: this.openChat,
		});
	}
}
export const createGroupPage =
	(client: BotClientSource, workspace?: WorkbenchClient, openChat?: () => void): PageCreate =>
	async (context, target, _state, signal) => {
		if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
		const surface = new GroupPresentation(context, client, target.resourceId, workspace, openChat);
		return { surface, getTarget: () => target, navigate: async (next) => surface.navigate(next.resourceId) };
	};

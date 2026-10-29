import { Bell, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../../ui/components/tabs';
import { useT } from '../../../../ui/react/hooks';
import { TerminalControlPanel } from '../control/TerminalControlPanel';
import { InboxPanel } from '../inbox/InboxPanel';
import type { AgentController } from '../../services/controller';
import type { ConfirmFn } from '../../services/workspace-service';

export type WorkspaceTool = 'control' | 'inbox';

/** Shared right-tool frame. The terminal control panel remains the owner of terminal semantics. */
export function WorkspaceTools({
	controller,
	confirm,
	selected,
	onSelectedChange,
	close,
	onUnreadCount,
	compact = false,
}: {
	controller: AgentController;
	confirm: ConfirmFn;
	selected: WorkspaceTool;
	onSelectedChange: (tool: WorkspaceTool) => void;
	close: () => void;
	onUnreadCount?: (count: number | undefined) => void;
	compact?: boolean;
}) {
	const t = useT();
	return (
		<Tabs
			key={selected}
			defaultValue={selected}
			onValueChange={(value) => {
				if (value === 'control' || value === 'inbox') {
					onSelectedChange(value);
				}
			}}
			orientation="horizontal"
			className="flex h-full min-h-0 min-w-0 flex-col gap-0"
			data-agent-workspace-tools=""
			data-selected-tool={selected}
			data-compact={compact || undefined}
		>
			<TabsList variant="line" className="min-h-11 w-full shrink-0 rounded-none border-b border-border bg-card px-2">
			<TabsTrigger value="control" className="justify-start gap-1.5 text-xs"><SlidersHorizontal className="size-3.5" />{t('agent.coordination.title')}</TabsTrigger>
			<TabsTrigger value="inbox" className="justify-start gap-1.5 text-xs"><Bell className="size-3.5" />{t('agent.inbox.title')}</TabsTrigger>
		</TabsList>
			<div role="tabpanel" aria-label={t('agent.coordination.title')} hidden={selected !== 'control'} className="min-h-0 flex-1">
				{selected === 'control' && <TerminalControlPanel controller={controller} confirm={confirm} compact={compact} close={close} />}
			</div>
			<div role="tabpanel" aria-label={t('agent.inbox.title')} hidden={selected !== 'inbox'} className="min-h-0 flex-1">
				{selected === 'inbox' && <InboxPanel controller={controller} close={close} onUnreadCount={onUnreadCount} />}
			</div>
		</Tabs>
	);
}


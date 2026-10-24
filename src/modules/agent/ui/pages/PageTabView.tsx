import { useState } from 'react';
import { VisibilityContext } from '../../../../ui/react/contexts';
import type { PageTabData } from '../../core/workspace/model';
import { AgentBoard } from '../dashboard/AgentBoard';
import { UsageStatsPage } from '../usage/UsageStatsPage';
import { useWorkspaceUI } from '../workspace/workspace-context';

/**
 * A workspace page that is a tab: the board or usage. It mounts the first time its tab is shown and then
 * stays (like a session), so scroll and filters survive tab switches.
 */
export function PageTabView({ tab, active }: { tab: PageTabData; active: boolean }) {
	const { controller } = useWorkspaceUI();
	const [shown, setShown] = useState(active);
	if (active && !shown) setShown(true);
	if (!shown) return null;
	return (
		<VisibilityContext value={active}>
			{tab.page === 'board' ? (
				<AgentBoard controller={controller} select={(id) => controller.workspace.activate(id)} />
			) : (
				<UsageStatsPage key={tab.resourceId ?? 'all'} controller={controller} provider={tab.resourceId} />
			)}
		</VisibilityContext>
	);
}

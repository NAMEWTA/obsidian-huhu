import { useState } from 'react';
import { useStore } from 'zustand';
import { FolderPlus } from 'lucide-react';
import type { WorkspaceService } from '../../services/workspace-service';
import type { SpaceService } from '../../services/spaces/space-service';
import { useT } from '../../../../ui/react/hooks';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Button } from '../../../../ui/components/button';
import { SpaceForm } from './SpaceForm';
import { spaceErrorMessage } from './space-errors';

export function SpaceEmptyState({ spaces, workspace }: { spaces: SpaceService; workspace: WorkspaceService }) {
	const t = useT(), state = useStore(spaces.store), [creating, setCreating] = useState(false);
	const selected = state.records.selectedSpaceId && state.records.spaces[state.records.selectedSpaceId];
	return <>
		<EmptyState className="flex-1" icon={<FolderPlus />} title={t(state.loading ? 'agent.spaces.loading' : state.error ? 'agent.spaces.unavailable' : selected ? 'agent.spaces.empty' : 'agent.spaces.noSpaces')}
			description={state.error ? spaceErrorMessage(state.error) : t(selected ? 'agent.spaces.emptyHint' : 'agent.spaces.noSpacesHint')}
			action={<div className="flex flex-wrap justify-center gap-2 pointer-coarse:[&_button]:min-h-11">
				{spaces.canWrite && (selected ? <Button onClick={() => { void workspace.newTerminal({ spaceId: selected.id }).catch(error => workspace.report(error)); }}>{t('agent.workspace.newTerminal')}</Button> : <Button onClick={() => setCreating(true)}>{t('agent.spaces.create')}</Button>)}
				{workspace.browserAvailable && <Button variant="outline" onClick={() => { try { workspace.newBrowser(); } catch (error) { workspace.report(error); } }}>{t('agent.workspace.newBrowser')}</Button>}
			</div>} />
		{creating && <SpaceForm spaces={spaces} finish={space => { setCreating(false); if (space) void workspace.selectSpace(space.id).catch(error => workspace.report(error)); }} />}
	</>;
}

import { useState } from 'react';
import type { App } from 'obsidian';
import type { SpaceService } from '../../services/spaces/space-service';
import { SpaceForm } from './SpaceForm';
import type { SpaceChoice } from '../../core/space/model';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import { dialogOwner, openReactDialog } from '../../../../ui/react/dialog';

/**
 * The choices, or, with none, the way to make the first one: the same Space form as the workbench's empty state.
 * A Space created here is returned as the choice, so the launch that asked continues in it.
 */
export function SpaceChoices({ choices, choose, spaces }: { choices: readonly SpaceChoice[]; choose: (id: string) => void; spaces?: SpaceService }) {
	const [creating, setCreating] = useState(false);
	if (choices.length === 0 && spaces?.canWrite) return <div className="flex min-w-0 flex-col items-start gap-3">
		<p className="text-sm text-muted-foreground">{t('agent.spaces.noSpacesHint')}</p>
		<Button onClick={() => setCreating(true)}>{t('agent.spaces.create')}</Button>
		{creating && <SpaceForm spaces={spaces} finish={space => { setCreating(false); if (space) choose(space.id); }} />}
	</div>;
	return <div className="flex max-h-80 min-w-0 flex-col gap-1 overflow-y-auto">
		{choices.length === 0 ? <p className="text-sm text-muted-foreground">{t('agent.spaces.noSpacesHint')}</p> : choices.map(choice =>
			<Button key={choice.id} variant="ghost" className="h-auto min-h-11 justify-start py-2 text-left" onClick={() => choose(choice.id)}>
				<span className="flex min-w-0 flex-col"><span className="truncate" title={choice.name}>{choice.name}</span><span className="truncate text-xs text-muted-foreground" title={choice.directoryLabel}>{choice.directoryLabel}</span><span className="truncate font-mono text-2xs text-muted-foreground">{choice.id}</span></span>
			</Button>)}
	</div>;
}

export function pickSpace(app: App, request: { choices: readonly SpaceChoice[]; signal?: AbortSignal }, lifetime?: AbortSignal, spaces?: SpaceService): Promise<string | undefined> {
	if (request.signal?.aborted || lifetime?.aborted) return Promise.resolve(undefined);
	return new Promise(resolve => {
		let settled = false;
		const finish = (id?: string) => { if (!settled) { settled = true; resolve(id); } dialog.close(); };
		const abort = () => finish();
		const dialog = openReactDialog(dialogOwner(app), { title: t('agent.spaces.choose'), description: t('agent.spaces.chooseHint'), content: () => <SpaceChoices choices={request.choices} choose={finish} spaces={spaces} />, onClose: () => { request.signal?.removeEventListener('abort', abort); lifetime?.removeEventListener('abort', abort); if (!settled) { settled = true; resolve(undefined); } } });
		request.signal?.addEventListener('abort', abort, { once: true });
		lifetime?.addEventListener('abort', abort, { once: true });
	});
}

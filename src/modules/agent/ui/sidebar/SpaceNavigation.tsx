import { useState } from 'react';
import { useStore } from 'zustand';
import { Archive, Folder, Pencil, Plus } from 'lucide-react';
import type { SpaceRecord } from '../../core/space/model';
import type { SpaceService } from '../../services/spaces/space-service';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { cn } from '../../../../ui/lib/utils';
import { SpaceForm } from '../create/SpaceForm';
import { spaceErrorMessage } from '../create/space-errors';
import type { ConfirmFn, WorkspaceService } from '../../services/workspace-service';
import { LifecycleFeedback, useLifecycleAction } from './managed-lifecycle';

export function SpaceNavigation({ spaces, select, workspace, confirm }: { spaces: SpaceService; select: (id: string) => Promise<void>; workspace?: WorkspaceService; confirm?: ConfirmFn }) {
	const t = useT(), state = useStore(spaces.store);
	const lifecycle = useLifecycleAction(workspace, confirm);
	const [form, setForm] = useState<SpaceRecord | 'create'>(), [pending, setPending] = useState(false), [error, setError] = useState('');
	const choose = async (id: string) => { setPending(true); setError(''); try { await select(id); } catch (cause) { setError(spaceErrorMessage(cause)); } finally { setPending(false); } };
	return <section className="flex min-w-0 flex-col gap-1 border-b border-sidebar-border px-2 py-2 pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_button]:min-w-11" aria-label={t('agent.spaces.title')} onKeyDown={event => {
		const element = event.target as HTMLElement;
		if (!element.hasAttribute?.('data-space-select')) return;
		const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-space-select]:not(:disabled)')];
		const index = buttons.indexOf(event.target as HTMLButtonElement);
		const target = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : event.key === 'ArrowDown' ? buttons[(index + 1) % buttons.length] : event.key === 'ArrowUp' ? buttons[(index - 1 + buttons.length) % buttons.length] : undefined;
		if (target) { event.preventDefault(); target.focus(); }
	}}>
		<div className="flex min-h-8 items-center gap-2 px-1"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{t('agent.spaces.title')}</span><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={t('agent.spaces.create')} disabled={!spaces.canWrite || pending} onClick={() => setForm('create')}><Plus className="size-4" /></Button></TooltipTrigger><TooltipContent>{t('agent.spaces.create')}</TooltipContent></Tooltip></div>
		{state.loading ? <p role="status" className="px-1 text-xs text-muted-foreground">{t('agent.spaces.loading')}</p> : spaces.list().length === 0 ? <p className="px-1 text-xs text-muted-foreground">{t('agent.spaces.noSpaces')}</p> : spaces.list().map(space => <div key={space.id} className="flex min-w-0 items-center gap-1">
			<Button data-space-select variant="ghost" className={cn('min-h-8 min-w-0 flex-1 justify-start gap-2 px-2', state.records.selectedSpaceId === space.id && 'bg-sidebar-accent text-sidebar-accent-foreground')} aria-current={state.records.selectedSpaceId === space.id ? 'page' : undefined} disabled={pending} onClick={() => { void choose(space.id); }} title={`${space.name}\n${space.id}`}><Folder className="size-4 shrink-0" /><span className="truncate">{space.name}</span></Button>
			<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" disabled={pending || !spaces.canWrite} aria-label={t('agent.spaces.renameNamed', { name: space.name })} onClick={() => setForm(space)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>{t('agent.spaces.renameNamed', { name: space.name })}</TooltipContent></Tooltip>
			{workspace && confirm && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" disabled={pending || !spaces.canWrite} aria-disabled={lifecycle.busy || undefined} aria-label={`${t('agent.managed.archiveSpace')}: ${space.name}`} onClick={() => { void lifecycle.archive({ kind: 'space', spaceId: space.id }, space.name); }}><Archive className="size-3.5" /></Button></TooltipTrigger><TooltipContent>{t('agent.managed.archiveSpace')}</TooltipContent></Tooltip>}
		</div>)}
		{!!(error || state.error) && <p role="alert" className="break-words px-1 text-xs text-destructive">{error || spaceErrorMessage(state.error)}</p>}
		<LifecycleFeedback action={lifecycle} />
		{form && <SpaceForm spaces={spaces} existing={form === 'create' ? undefined : form} finish={space => { setForm(undefined); if (space && form === 'create') void choose(space.id); }} />}
	</section>;
}

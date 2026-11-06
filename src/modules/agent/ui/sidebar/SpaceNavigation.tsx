import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Archive, Pencil, Plus } from 'lucide-react';
import type { SpaceRecord } from '../../core/space/model';
import type { SpaceService } from '../../services/spaces/space-service';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { Tree } from '../../../../ui/components/tree';
import { SpaceForm } from '../create/SpaceForm';
import { spaceErrorMessage } from '../create/space-errors';
import type { ConfirmFn, WorkspaceService } from '../../services/workspace-service';
import { LifecycleFeedback, useLifecycleAction } from './managed-lifecycle';

export function SpaceNavigation({ spaces, select, workspace, confirm }: { spaces: SpaceService; select: (id: string) => Promise<void>; workspace?: WorkspaceService; confirm?: ConfirmFn }) {
	const t = useT(), state = useStore(spaces.store);
	const lifecycle = useLifecycleAction(workspace, confirm);
	const [form, setForm] = useState<SpaceRecord | 'create'>(), [pending, setPending] = useState(false), [error, setError] = useState('');
	const selecting = useRef(false), alive = useRef(true);
	useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
	const choose = async (id: string) => { if (selecting.current) return; selecting.current = true; setPending(true); setError(''); try { await select(id); } catch (cause) { if (alive.current) setError(spaceErrorMessage(cause)); } finally { selecting.current = false; if (alive.current) setPending(false); } };
	return <section className="flex min-w-0 flex-col gap-1 border-b border-[var(--hu-line)] px-2 py-2 pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_button]:min-w-11" aria-label={t('agent.spaces.title')}>
		<div className="flex min-h-8 items-center gap-2 px-1"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--hu-fg-2)]">{t('agent.spaces.title')}</span><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={t('agent.spaces.create')} disabled={!spaces.canWrite || pending} onClick={() => setForm('create')}><Plus className="size-4" /></Button></TooltipTrigger><TooltipContent>{t('agent.spaces.create')}</TooltipContent></Tooltip></div>
		{state.loading ? <p role="status" className="px-1 text-xs text-[var(--hu-fg-2)]">{t('agent.spaces.loading')}</p> : spaces.list().length === 0 ? <p className="px-1 text-xs text-[var(--hu-fg-2)]">{t('agent.spaces.noSpaces')}</p> : <Tree ariaLabel={t('agent.spaces.title')} selectedId={state.records.selectedSpaceId} onSelect={id => { if (!pending) void choose(id); }} nodes={spaces.list().map(space => ({
			id: space.id, label: space.name, icon: 'lucide-folder', title: `${space.name}\n${space.id}`,
			actions: <>
				<Button variant="ghost" size="icon-sm" disabled={pending || !spaces.canWrite} aria-label={t('agent.spaces.renameNamed', { name: space.name })} onClick={() => setForm(space)}><Pencil className="size-3.5" /></Button>
				{workspace && confirm && <Button variant="ghost" size="icon-sm" disabled={pending || !spaces.canWrite || lifecycle.busy} aria-label={`${t('agent.managed.archiveSpace')}: ${space.name}`} onClick={() => { void lifecycle.archive({ kind: 'space', spaceId: space.id }, space.name); }}><Archive className="size-3.5" /></Button>}
			</>,
		}))} />}

		{!!(error || state.error) && <p role="alert" className="break-words px-1 text-xs text-[var(--hu-danger)]">{error || spaceErrorMessage(state.error)}</p>}
		<LifecycleFeedback action={lifecycle} />
		{form && <SpaceForm spaces={spaces} existing={form === 'create' ? undefined : form} finish={space => { setForm(undefined); if (space && form === 'create') void choose(space.id); }} />}
	</section>;
}

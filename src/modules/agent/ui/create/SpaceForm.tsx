import { useEffect, useId, useRef, useState } from 'react';
import type { SpaceRecord } from '../../core/space/model';
import type { SpaceService } from '../../services/spaces/space-service';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../../../ui/components/dialog';
import { spaceErrorMessage } from './space-errors';

export function SpaceForm({ spaces, existing, finish }: { spaces: SpaceService; existing?: SpaceRecord; finish: (space?: SpaceRecord) => void }) {
	const t = useT(), id = useId();
	const [name, setName] = useState(existing?.name ?? ''), [path, setPath] = useState('');
	const [external, setExternal] = useState<{ receipt: string; label: string }>();
	const [pending, setPending] = useState(false), [choosing, setChoosing] = useState(false), [error, setError] = useState('');
	const [lifetime] = useState(() => new AbortController());
	const saving = useRef(false), picking = useRef(false);
	useEffect(() => () => { lifetime.abort(); }, [lifetime]);
	useEffect(() => () => { if (external) spaces.discardChoice(external.receipt); }, [spaces, external]);
	const choose = async () => {
		if (picking.current || saving.current || lifetime.signal.aborted) return;
		picking.current = true;
		setChoosing(true); setError('');
		try { const result = await spaces.chooseExternal(lifetime.signal); if (!lifetime.signal.aborted && result) setExternal(result); }
		catch (cause) { if (!lifetime.signal.aborted) setError(spaceErrorMessage(cause)); }
		finally { picking.current = false; if (!lifetime.signal.aborted) setChoosing(false); }
	};
	const submit = async () => {
		if (saving.current || picking.current || lifetime.signal.aborted || !name.trim()) return;
		saving.current = true;
		setPending(true); setError('');
		try {
			if (existing) { await spaces.rename(existing.id, name); if (!lifetime.signal.aborted) finish(spaces.resolve({ spaceId: existing.id })); }
			else { const created = await spaces.create({ name, ...(external ? { externalReceipt: external.receipt } : { relativePath: path }) }); if (!lifetime.signal.aborted) finish(created); }
		} catch (cause) { if (!lifetime.signal.aborted) { setError(spaceErrorMessage(cause)); setPending(false); } }
		finally { saving.current = false; }
	};
	return <Dialog open onOpenChange={open => { if (!open && !pending) { lifetime.abort(); finish(); } }}>
		<DialogContent className="max-w-lg pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_button]:min-w-11 pointer-coarse:[&_input]:min-h-11">
			<DialogTitle>{t(existing ? 'agent.spaces.rename' : 'agent.spaces.create')}</DialogTitle>
			<DialogDescription>{t('agent.spaces.createHint')}</DialogDescription>
			<form className="flex min-w-0 flex-col gap-3" onSubmit={event => { event.preventDefault(); void submit(); }} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}>
				<div className="flex min-w-0 flex-col gap-1"><Label htmlFor={id}>{t('agent.spaces.name')}</Label><Input id={id} autoFocus maxLength={200} value={name} disabled={pending} onChange={e => setName(e.target.value)} /></div>
				{!existing && <>
					<div className="flex min-w-0 flex-col gap-1"><Label htmlFor={`${id}-path`}>{t('agent.spaces.vaultPath')}</Label><Input id={`${id}-path`} value={path} disabled={pending || choosing || !!external} placeholder={t('agent.spaces.rootPath')} onChange={e => setPath(e.target.value)} /></div>
					<div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={pending || choosing} onClick={() => { void choose(); }}>{t(choosing ? 'agent.spaces.choosing' : 'agent.spaces.chooseExternal')}</Button>{external && <Button type="button" variant="ghost" disabled={pending} onClick={() => setExternal(undefined)}>{t('agent.spaces.useVault')}</Button>}</div>
					{external && <p className="break-all text-xs text-[var(--hu-fg-2)]">{t('agent.spaces.externalConfirm', { path: external.label })}</p>}
				</>}
				{error && <p role="alert" className="text-sm text-[var(--hu-danger)]">{error}</p>}
				<DialogFooter><Button type="button" variant="ghost" disabled={pending} onClick={() => { lifetime.abort(); finish(); }}>{t('common.cancel')}</Button><Button type="submit" disabled={pending || choosing || !name.trim()}>{t(pending ? 'agent.spaces.saving' : 'common.save')}</Button></DialogFooter>
			</form>
		</DialogContent>
	</Dialog>;
}

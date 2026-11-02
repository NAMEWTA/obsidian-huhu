import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from 'zustand';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { ConfirmDialog } from '../../../ui/components/huhu/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { useT } from '../../../ui/react/hooks';
import { collectTags, MAX_ENTRY_TAGS, tagName } from '../core/model';
import type { SafeService } from '../services/safe-service';
import { SafeErrorMessage, safeErrorKey, useSafeAction } from './SafeDialogs';

export function EntryTags({ value, catalog, disabled, onChange }: {
	value: string[]; catalog: string[]; disabled: boolean; onChange: (tags: string[]) => void;
}) {
	const t = useT();
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const add = () => {
		try {
			const tag = tagName(name);
			if (!value.some(item => item.toLowerCase() === tag.toLowerCase()) && value.length < MAX_ENTRY_TAGS) onChange([...value, tag]);
			setName(''); setError('');
		} catch (cause) { setError(safeErrorKey(cause)); }
	};
	return <div className="grid min-w-0 gap-1.5" role="group" aria-label={t('safe.tags')}>
		<span className="text-xs text-muted-foreground">{t('safe.tags')}</span>
		<div className="flex flex-wrap gap-1">
			{collectTags([{ tags: catalog }, { tags: value }]).map(tag => {
				const selected = value.some(item => item.toLowerCase() === tag.toLowerCase());
				return <Button key={tag.toLowerCase()} type="button" size="sm" variant={selected ? 'secondary' : 'outline'} aria-pressed={selected}
					disabled={disabled || (!selected && value.length >= MAX_ENTRY_TAGS)} onClick={() => onChange(selected ? value.filter(item => item.toLowerCase() !== tag.toLowerCase()) : [...value, tag])}>{tag}</Button>;
			})}
		</div>
		<div className="flex gap-1">
			<Input className="h-8" value={name} onChange={event => setName(event.currentTarget.value)} disabled={disabled || value.length >= MAX_ENTRY_TAGS}
				aria-label={t('safe.newTag')} placeholder={t('safe.newTag')} onKeyDown={event => {
					if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add(); }
				}} />
			<ActionButton type="button" size="icon-sm" label={t('safe.addTag')} disabled={disabled || !name.trim() || value.length >= MAX_ENTRY_TAGS} onClick={add}><Plus /></ActionButton>
		</div>
		<SafeErrorMessage error={error} />
	</div>;
}

function TagRow({ tag, service, disabled, changed }: { tag: string; service: SafeService; disabled: boolean; changed: () => void }) {
	const t = useT();
	const [name, setName] = useState(tag);
	const action = useSafeAction(service);
	return <div className="grid gap-1">
		<div className="flex min-w-0 items-center gap-1">
			<Input value={name} onChange={event => setName(event.currentTarget.value)} aria-label={t('safe.renameTag', { tag })} disabled={disabled || action.busy} />
			<Button size="sm" disabled={disabled || action.busy || !name.trim() || name.trim() === tag} onClick={() => { void action.run(() => service.renameTag(tag, name), changed); }}>{t('safe.save')}</Button>
			<ConfirmDialog title={t('safe.removeTag')} description={t('safe.removeTagDescription', { tag })} destructive onConfirm={async () => {
				try { await service.renameTag(tag, null); changed(); } catch (cause) { throw new Error(t(safeErrorKey(cause))); }
			}}><ActionButton size="icon-sm" label={t('safe.removeTag')} disabled={disabled || action.busy}><Trash2 /></ActionButton></ConfirmDialog>
		</div>
		<SafeErrorMessage error={action.error} />
	</div>;
}

export function TagManager({ service, onClose, changed }: { service: SafeService; onClose: () => void; changed: () => void }) {
	const t = useT();
	const state = useStore(service.store);
	return <Dialog open onOpenChange={open => { if (!open && !state.busy) onClose(); }}>
		<DialogContent className="max-h-[85dvh] overflow-y-auto scrollbar-sleek" onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()}>
			<DialogHeader><DialogTitle>{t('safe.manageTags')}</DialogTitle><DialogDescription>{t('safe.manageTagsDescription')}</DialogDescription></DialogHeader>
			{collectTags(state.entries).map(tag => <TagRow key={tag} tag={tag} service={service} disabled={state.busy} changed={changed} />)}
		</DialogContent>
	</Dialog>;
}

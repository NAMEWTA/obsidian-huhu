import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../ui/components/button';
import { Choice } from '../../../ui/components/huhu/Choice';
import type { ArchiveEditBase, ArchiveEntity, ArchiveFormSnapshot, ArchiveValue, ArchivesCommands } from '../api';
import { ArchiveDraftOwner } from '../services/form-drafts';
import { useArchiveDraft } from './use-archive-draft';
import { ContactsError } from '../core/model';
import { conditionMatches } from '../core/form-definitions';
import { textHash } from '../../../shared/storage/text-edits';
import { ArchiveFieldControl, archiveDisplayValue } from './field-renderers';
import { errorText } from './forms';
import { ct } from './labels';

export function ArchiveEntityForm({ snapshot, base: initialBase, commands, onSaved, onLeave, onDirty, onBusy, drafts: providedOwner, draftScope = 'entity', relations, externalBusy = false }: {
	relations?: (entity: ArchiveEntity) => ReactNode;
	externalBusy?: boolean;
	drafts?: ArchiveDraftOwner;
	draftScope?: string;
	snapshot: ArchiveFormSnapshot;
	base?: ArchiveEditBase;
	commands: ArchivesCommands;
	onSaved: (id: string) => void;
	onLeave: () => void;
	onDirty?: (dirty: boolean) => void;
	onBusy?: (busy: boolean) => void;
}) {
	const [localOwner] = useState(() => new ArchiveDraftOwner());
	const drafts = providedOwner ?? localOwner;
	const surface = useRef<HTMLElement>(null);
	useEffect(() => { surface.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
	const [base, setBase] = useArchiveDraft(drafts, draftScope + '/base', () => initialBase), [changes, setChanges] = useArchiveDraft<Record<string, ArchiveValue>>(drafts, draftScope + '/changes', () => ({})),
		[formId, setFormId] = useArchiveDraft(drafts, draftScope + '/form', () => snapshot.design.forms[0]!.id), [templateId, setTemplateId] = useArchiveDraft(drafts, draftScope + '/template', () => ''),
		[ownBusy, setBusy] = useArchiveDraft(drafts, draftScope + '/busy', () => false), [error, setError] = useArchiveDraft(drafts, draftScope + '/error', () => ''), [saved, setSaved] = useArchiveDraft<'draft' | 'complete' | undefined>(drafts, draftScope + '/saved', () => undefined),
		[leaving, setLeaving] = useState(false),
		[conflict, setConflict] = useState<{ field: string; before: ArchiveValue | undefined; current: ArchiveValue | undefined; proposed: ArchiveValue | undefined; known: boolean }>();
	useEffect(() => { onDirty?.(Object.keys(changes).length > 0 || (!base && !!templateId)); }, [changes, templateId, base, onDirty]);
	useEffect(() => { onBusy?.(ownBusy); }, [ownBusy, onBusy]);
	const busy = ownBusy || externalBusy;
	const template = snapshot.design.templates.find((item) => item.id === templateId);
	const values = { ...(base ? base.entity.values : template?.values), ...changes };
	const form = snapshot.design.forms.find((item) => item.id === formId) ?? snapshot.design.forms[0]!;
	const settings = new Map(snapshot.design.fieldSettings.map((item) => [item.fieldId, item]));
	const save = async (intent: 'draft' | 'complete') => {
		if (busy || snapshot.blockedReason) return;
		setBusy(true); setError(''); setConflict(undefined);
		try {
			if (base) {
				const receipt = await commands.updateEntity({ base, changes, intent, formRevisionId: snapshot.revisionId, formContentHash: snapshot.contentHash });
				setBase({ entity: receipt.entity, contentHash: receipt.contentHash, schemaContentHash: base.schemaContentHash });
				setChanges({}); setSaved(intent); onSaved(receipt.entity.id);
			} else {
				const receipt = await commands.createEntity({ typeId: snapshot.type.typeId, values: changes, templateId: templateId || undefined,
					formRevisionId: snapshot.revisionId, formContentHash: snapshot.contentHash, intent });
				const next: ArchiveEditBase = { entity: receipt.entity, contentHash: await textHash(receipt.entity.raw), schemaContentHash: snapshot.type.contentHash };
				setBase(next); setTemplateId(''); setChanges({}); setSaved(intent); onSaved(receipt.entity.id);
			}
		} catch (failure) {
			const field = failure instanceof ContactsError && failure.detail ? snapshot.type.fields.find((field) => field.fieldId === failure.detail) : undefined;
			setError(errorText(failure) + (failure instanceof ContactsError && failure.detail ? ' · ' + (field ? settings.get(field.fieldId)?.label ?? field.label : failure.detail) : ''));
			if (failure instanceof ContactsError && failure.code === 'conflict' && field && base) {
				let current: ArchiveValue | undefined, known = false;
				try { current = (await commands.beginEdit(base.entity.id)).entity.values[field.fieldId]; known = true; } catch { /* Keep the conflict and original draft when current content cannot be read safely. */ }
				setConflict({ field: settings.get(field.fieldId)?.label ?? field.label, before: base.entity.values[field.fieldId], current, proposed: values[field.fieldId], known });
			}
		}
		finally { setBusy(false); }
	};
	return <section ref={surface} className="@container space-y-5" aria-label={ct('entityForm')}>
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div><h1 className="text-2xl font-semibold">{base ? archiveDisplayValue(values[snapshot.type.titleFieldId] ?? snapshot.type.label) : ct('newArchive')}</h1>
				<p className="text-sm text-muted-foreground">{snapshot.type.label} · {ct('revisionNumber', { count: snapshot.type.displayVersion })}</p></div>
			<div className="flex flex-wrap gap-2"><Button className="min-h-11" type="button" variant="outline" disabled={busy} onClick={() => Object.keys(changes).length ? setLeaving(true) : onLeave()}>{ct('back')}</Button>
				<Button className="min-h-11" type="button" disabled={busy || !!snapshot.blockedReason || base?.entity.readOnly} onClick={() => void save('draft')}>{ct('saveDraft')}</Button></div>
		</header>
		<div className="grid min-w-0 gap-7 @4xl:grid-cols-[minmax(0,1fr)_240px]"><div className="min-w-0 space-y-5">
		{leaving && <div role="alert" className="space-y-3 rounded-md border border-border p-4"><p>{ct('unsavedForm')}</p><div className="flex flex-wrap gap-2">
			<Button type="button" onClick={() => setLeaving(false)}>{ct('keepEditing')}</Button>
			<Button type="button" variant="outline" disabled={busy} onClick={onLeave}>{ct('discardDraft')}</Button>
		</div></div>}
		{snapshot.blockedReason && <p role="alert">{ct(snapshot.blockedReason)} · {ct('readOnlyArchive')}</p>}
		{error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}<p>{ct('draftKept')}</p></div>}
		{conflict && <section aria-label={ct('fieldComparison')} className="space-y-3 rounded-md border border-border p-4 text-sm"><h3 className="font-semibold">{conflict.field}</h3><dl className="space-y-3">
			<div><dt className="text-muted-foreground">{ct('openingValue')}</dt><dd className="whitespace-pre-wrap break-words">{archiveDisplayValue(conflict.before)}</dd></div>
			<div><dt className="text-muted-foreground">{ct('currentValue')}</dt><dd className="whitespace-pre-wrap break-words">{conflict.known ? archiveDisplayValue(conflict.current) : ct('comparisonUnavailable')}</dd></div>
			<div><dt className="text-muted-foreground">{ct('draftValue')}</dt><dd className="whitespace-pre-wrap break-words">{archiveDisplayValue(conflict.proposed)}</dd></div>
		</dl></section>}
		{busy && <p role="status">{ct('saving')}</p>}
		<div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{ct('basicFields')}</h2>
			<Choice label={ct('formTemplate')} value={formId} options={snapshot.design.forms.map((item) => [item.id, item.label])} onChange={setFormId} disabled={busy} /></div>
		{!base && <Choice label={ct('creationTemplate')} value={templateId} options={[
			['', ct('blankTemplate')], ...snapshot.design.templates.map((item) => [item.id, item.label] as const),
		]} onChange={setTemplateId} disabled={busy} />}
		<fieldset disabled={busy} className={form.columns === 2 ? 'grid min-w-0 grid-cols-1 gap-5 @2xl:grid-cols-2' : 'grid min-w-0 grid-cols-1 gap-5'}>
			{form.controls.map((control) => {
				const field = snapshot.type.fields.find((item) => item.fieldId === control.fieldId), setting = settings.get(control.fieldId);
				if (!field || setting?.disabled || (control.visibleWhen && !conditionMatches(control.visibleWhen, values))) return null;
				return <div className="min-w-0 space-y-2" key={control.fieldId + ':' + (base ? 'record' : templateId)}>
					{control.group && <h3 className="text-sm text-muted-foreground">{control.group}</h3>}
					<ArchiveFieldControl field={{ ...field, label: setting?.label ?? field.label }} value={values[field.fieldId]}
						readOnly={control.readOnly || base?.entity.readOnly} onChange={(value) => { if (busy) return; setChanges((previous) => ({ ...previous, [field.fieldId]: value })); setSaved(undefined); }} />
					{control.help && <p className="text-sm text-muted-foreground">{control.help}</p>}
				</div>;
			})}
		</fieldset>
		<details className="rounded-md border border-border p-3"><summary className="cursor-pointer text-sm">{ct('retainedValues')}</summary>
			<dl className="space-y-3 pt-3">{snapshot.type.fields.filter((field) => Object.hasOwn(values, field.fieldId)).map((field) => <div key={field.fieldId}><dt className="text-sm font-medium">{settings.get(field.fieldId)?.label ?? field.label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{archiveDisplayValue(values[field.fieldId])}</dd></div>)}</dl>
		</details>
		<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
			<p role="status" className="text-sm text-muted-foreground">{ct(saved === 'complete' ? 'archiveCompleted' : saved === 'draft' ? 'draftSaved' : 'draftNotComplete')}</p>
			<Button className="min-h-11" type="button" variant="outline" disabled={busy || !!snapshot.blockedReason || base?.entity.readOnly} onClick={() => void save('complete')}>{ct('markComplete')}</Button>
		</footer>
		</div><aside className="min-w-0 space-y-4 rounded-md border border-border p-4 text-sm">
			<h2 className="font-semibold">{ct('archiveInfo')}</h2>
			<dl className="space-y-3"><div><dt className="text-muted-foreground">{ct('archiveType')}</dt><dd>{snapshot.type.label}</dd></div>
				<div><dt className="text-muted-foreground">{ct('revision')}</dt><dd>{snapshot.type.displayVersion}</dd></div>
				<div><dt className="text-muted-foreground">{ct('updated')}</dt><dd>{base?.entity.updatedAt ?? ct('unfilled')}</dd></div>
			</dl>
			{base?.entity.readOnly && <p role="alert">{ct('readOnlyArchive')} · {ct('draftKept')}</p>}
			{base && <p className="break-words text-xs text-muted-foreground">{base.entity.path}</p>}
			{base && <details><summary className="cursor-pointer">{ct('rawArchive')}</summary><pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{base.entity.raw}</pre></details>}
		</aside></div>
		{base && relations?.(base.entity)}
	</section>;
}

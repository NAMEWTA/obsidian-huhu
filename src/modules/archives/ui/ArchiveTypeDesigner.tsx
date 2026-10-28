import { useEffect, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Checkbox } from '../../../ui/components/checkbox';
import { Choice } from '../../../ui/components/huhu/Choice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../ui/components/dialog';
import type { ArchiveCondition, ArchiveField, ArchiveFormDesign, ArchiveFormSnapshot, ArchiveValue, ArchivesCommands, ArchivesCatalog, FieldCodecId } from '../api';
import { ArchiveDraftOwner } from '../services/form-drafts';
import { useArchiveDraft } from './use-archive-draft';
import { safeArchiveName } from '../core/resources';
import { ContactsError } from '../core/model';
import { ArchiveFieldControl } from './field-renderers';
import { errorText } from './forms';
import { ct } from './labels';

function committedRevision(failure:unknown):string|undefined {if(!failure||typeof failure!=='object'||!('commit' in failure))return;const commit=failure.commit;if(commit&&typeof commit==='object'&&'state' in commit&&commit.state==='committed-unverified'&&'revisionId' in commit&&typeof commit.revisionId==='string')return commit.revisionId;return undefined;}
const codecs: FieldCodecId[] = ['text', 'markdown', 'integer', 'decimal', 'money', 'boolean', 'date', 'datetime', 'choice', 'multi-choice', 'string-list', 'file', 'subtable'];
const id = () => crypto.randomUUID();
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
	return <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox aria-label={label} checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>;
}
function NewType({ commands, catalog, onCreated, onCancel, onDirty, onBusy, drafts, draftScope }: { commands: ArchivesCommands; catalog:ArchivesCatalog; drafts: ArchiveDraftOwner; draftScope: string; onCreated: (typeId: string) => void; onCancel: () => void; onDirty?: (dirty: boolean) => void; onBusy?: (busy: boolean) => void }) {
	const [typeId] = useArchiveDraft(drafts, draftScope + '/id', () => 'type-' + id()), [name, setName] = useArchiveDraft(drafts, draftScope + '/name', () => ''), [folder, setFolder] = useArchiveDraft(drafts, draftScope + '/folder', () => ''),
		[fields, setFields] = useArchiveDraft<ArchiveField[]>(drafts, draftScope + '/fields', () => [{ fieldId: 'name', storageKey: '', label: ct('name'), codec: 'text', required: true }]),
		[busy, setBusy] = useArchiveDraft(drafts, draftScope + '/busy', () => false), [error, setError] = useArchiveDraft(drafts, draftScope + '/error', () => ''), [preview, setPreview] = useState(false),
		[result, setResult] = useArchiveDraft<string | undefined>(drafts, draftScope + '/result', () => undefined);
	useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
	useEffect(() => { if (result) { drafts.clearScope(draftScope); onDirty?.(false); onCreated(result); } }, [result, drafts, draftScope, onCreated, onDirty]);
	useEffect(() => { onDirty?.(!!name || !!folder || fields.length > 1); }, [name, folder, fields, onDirty]);
	const change = (index: number, field: ArchiveField) => setFields((previous) => previous.map((item, i) => i === index ? field : item));
	const [pending,setPending] = useArchiveDraft<string|undefined>(drafts,draftScope+'/publication',()=>undefined);
	const recover = async () => {if(!pending)return;setBusy(true);try{const state=(await catalog.definitionStates()).find(state=>state.family==='type'&&state.definitionId===typeId);if(!state||state.blocked||state.effectiveRevisionId!==pending)throw new ContactsError('definitionPublicationUnverified');setResult(typeId);}catch(failure){setError(errorText(failure));}finally{setBusy(false);}};
	const publish = async () => {
		if(pending)return;
		setBusy(true); onBusy?.(true); setError('');
		try {
			await commands.publishType({ typeId, label: name, folder: folder || safeArchiveName(name), titleFieldId: 'name',
				fields: fields.map((field) => ({ ...field, storageKey: `${typeId}-${field.fieldId}` })) });
			setResult(typeId);
		} catch (failure) { setPending(committedRevision(failure)); setError(errorText(failure) + (failure instanceof ContactsError && failure.detail ? ' · ' + failure.detail : '')); setPreview(false); }
		finally { setBusy(false); onBusy?.(false); }
	};
	return <section className="space-y-5" aria-label={ct('newType')}><fieldset disabled={busy || !!pending} className="space-y-5">
		<h2 className="text-lg font-semibold">{ct('newType')}</h2>
		<label className="block space-y-2 text-sm">{ct('typeName')}<Input autoFocus aria-label={ct('typeName')} value={name} onChange={(event) => setName(event.target.value)} /></label>
		<label className="block space-y-2 text-sm">{ct('typeFolder')}<Input aria-label={ct('typeFolder')} value={folder} placeholder={name} onChange={(event) => setFolder(event.target.value)} /></label>
		<div className="space-y-4">{fields.map((field, index) => <fieldset key={field.fieldId} className="space-y-3 rounded-md border border-border p-4">
			<legend className="px-1 text-sm">{ct('fieldNumber', { count: index + 1 })}</legend>
			<Input aria-label={ct('fieldLabel', { count: index + 1 })} value={field.label} onChange={(event) => change(index, { ...field, label: event.target.value })} />
			<Choice label={ct('fieldCodec', { count: index + 1 })} value={field.codec} disabled={index === 0} options={codecs.map((codec) => [codec, ct('codec.' + codec)])} onChange={(codec) => change(index, {
				...field, codec: codec as FieldCodecId,
				...(['choice', 'multi-choice'].includes(codec) ? { options: [{ id: 'option-1', label: ct('option') }] } : {}),
				...(codec === 'subtable' ? { columns: [{ fieldId: 'value', storageKey: 'value', label: ct('value'), codec: 'text' }] } : {}),
			})} />
			<Check label={ct('requiredField', { field: field.label })} checked={!!field.required} onChange={(required) => change(index, { ...field, required })} />
			{['choice', 'multi-choice'].includes(field.codec) && <label className="block space-y-2 text-sm">{ct('choiceOptions')}<Textarea aria-label={ct('choiceOptions') + ' · ' + field.label}
				value={field.options?.map((option) => option.label).join('\n') ?? ''} onChange={(event) => change(index, { ...field, options: event.target.value.split('\n').map((label, option) => ({ id: field.options?.[option]?.id ?? 'option-' + id(), label })) })} /></label>}
			{field.codec === 'subtable' && <div className="space-y-3">{field.columns?.map((column, columnIndex) => <div key={column.fieldId} className="flex flex-wrap gap-2">
				<Input aria-label={ct('columnLabel', { count: columnIndex + 1 })} value={column.label} onChange={(event) => change(index, { ...field, columns: field.columns?.map((item, i) => i === columnIndex ? { ...item, label: event.target.value } : item) })} />
				<Choice label={ct('columnCodec', { count: columnIndex + 1 })} value={column.codec} options={codecs.filter((codec) => !['subtable', 'choice', 'multi-choice'].includes(codec)).map((codec) => [codec, ct('codec.' + codec)])}
					onChange={(codec) => change(index, { ...field, columns: field.columns?.map((item, i) => i === columnIndex ? { ...item, codec: codec as FieldCodecId } : item) })} />
			</div>)}<Button type="button" variant="outline" onClick={() => { const columnId = 'column-' + id(); change(index, { ...field, columns: [...field.columns ?? [], { fieldId: columnId, storageKey: columnId, label: ct('value'), codec: 'text' }] }); }}>{ct('addColumn')}</Button></div>}
			{index > 0 && <Button type="button" variant="outline" onClick={() => setFields(fields.filter((_, i) => i !== index))}>{ct('removeItem')}</Button>}
		</fieldset>)}</div>
		<Button type="button" variant="outline" onClick={() => setFields([...fields, { fieldId: 'field-' + id(), storageKey: '', label: ct('newField'), codec: 'text' }])}>{ct('addField')}</Button>
		{busy && <p role="status">{ct('saving')}</p>}
		{error && <p role="alert" className="text-destructive">{error}</p>}
		<div className="flex flex-wrap gap-2"><Button disabled={busy || !!pending || !name.trim()} onClick={() => setPreview(true)}>{ct('previewPublish')}</Button><Button variant="outline" disabled={busy} onClick={onCancel}>{ct('cancel')}</Button></div>
		<Dialog open={preview} onOpenChange={setPreview}><DialogContent><DialogHeader><DialogTitle>{ct('previewPublish')}</DialogTitle><DialogDescription>{ct('newTypeImpact', { name, count: fields.length })}</DialogDescription></DialogHeader><DialogFooter><Button disabled={busy || !!pending} onClick={() => void publish()}>{ct('publishType')}</Button></DialogFooter></DialogContent></Dialog>
	</fieldset>{pending && <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={()=>void recover()}>{ct('verifyPublicationResult')}</Button><Button disabled={busy} variant="outline" onClick={onCancel}>{ct('discardDraft')}</Button></div>}</section>;
}

function DesignEditor({ snapshot: requestedSnapshot, commands, catalog, onPublished, onDirty, onCancel, onBusy, drafts, draftScope }: { snapshot: ArchiveFormSnapshot; commands: ArchivesCommands; catalog:ArchivesCatalog; drafts: ArchiveDraftOwner; draftScope: string; onPublished: (snapshot: ArchiveFormSnapshot) => void; onCancel: () => void; onDirty?: (dirty: boolean) => void; onBusy?: (busy: boolean) => void }) {
	const [snapshot] = useArchiveDraft(drafts, draftScope + '/base', () => requestedSnapshot);
	const [design, setDesign] = useArchiveDraft(drafts, draftScope + '/design', () => snapshot.design), [formId, setFormId] = useArchiveDraft(drafts, draftScope + '/form', () => snapshot.design.forms[0]!.id),
		[templateId, setTemplateId] = useArchiveDraft(drafts, draftScope + '/template', () => snapshot.design.templates[0]?.id ?? ''), [error, setError] = useArchiveDraft(drafts, draftScope + '/error', () => ''),
		[busy, setBusy] = useArchiveDraft(drafts, draftScope + '/busy', () => false), [preview, setPreview] = useState(false),
		[result, setResult] = useArchiveDraft<ArchiveFormSnapshot | undefined>(drafts, draftScope + '/result', () => undefined);
	useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
	useEffect(() => { onDirty?.(JSON.stringify(design) !== JSON.stringify(snapshot.design)); }, [design, snapshot, onDirty]);
	useEffect(() => { if (result) { drafts.clearScope(draftScope); onDirty?.(false); setPreview(false); onPublished(result); } }, [result, drafts, draftScope, onPublished, onDirty]);
	const update = (next: ArchiveFormDesign) => { setDesign(next); onDirty?.(true); };
	const form = design.forms.find((item) => item.id === formId) ?? design.forms[0]!;
	const template = design.templates.find((item) => item.id === templateId);
	const [pending,setPending] = useArchiveDraft<string|undefined>(drafts,draftScope+'/publication',()=>undefined);
	const recover = async () => {if(!pending)return;setBusy(true);try{const current=await catalog.forms(snapshot.type.typeId);if(current.blockedReason||current.revisionId!==pending)throw new ContactsError('formPublicationUnverified');setResult(current);}catch(failure){setError(errorText(failure));}finally{setBusy(false);}};
	const publish = async () => {
		if(pending)return;
		setBusy(true); onBusy?.(true); setError('');
		try {
			const result = await commands.publishForms({ typeId: snapshot.type.typeId, baseRevisionId: snapshot.revisionId, baseContentHash: snapshot.contentHash,
				schemaContentHash: snapshot.type.contentHash, design });
			setResult(result);
		} catch (failure) { setPending(committedRevision(failure)); setError(errorText(failure) + (failure instanceof ContactsError && failure.detail ? ' · ' + failure.detail : '')); setPreview(false); }
		finally { setBusy(false); onBusy?.(false); }
	};
	const updateForm = (next: typeof form) => update({ ...design, forms: design.forms.map((item) => item.id === form.id ? next : item) });
	return <section className="@container space-y-7" aria-label={ct('typeDesigner')}><fieldset disabled={busy || !!pending} className="space-y-7">
		<div className="flex flex-wrap items-center justify-between gap-3">{snapshot.blockedReason && <p role="alert">{ct(snapshot.blockedReason)} · {ct('draftKept')}</p>}<h2 className="text-lg font-semibold">{snapshot.type.label} · {ct('fieldsAndForms')}</h2><div className="flex flex-wrap gap-2"><Button disabled={busy || !!pending || !!snapshot.blockedReason} onClick={() => setPreview(true)}>{ct('previewPublish')}</Button><Button variant="outline" disabled={busy} onClick={onCancel}>{ct('discardChanges')}</Button></div></div>
		<p className="text-sm text-muted-foreground">{ct('presentationHint')}</p>
		<div className="space-y-4">{snapshot.type.fields.map((field) => {
			const setting = design.fieldSettings.find((item) => item.fieldId === field.fieldId)!;
			return <div className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3" key={field.fieldId}>
				<Input className="min-w-40 flex-1" aria-label={ct('displayLabel', { field: field.label })} value={setting.label}
					onChange={(event) => update({ ...design, fieldSettings: design.fieldSettings.map((item) => item.fieldId === field.fieldId ? { ...item, label: event.target.value } : item) })} />
				<span className="text-sm text-muted-foreground">{ct('codec.' + field.codec)}</span>
				<Check label={ct('disableField', { field: field.label })} checked={setting.disabled} onChange={(disabled) => update({ ...design, fieldSettings: design.fieldSettings.map((item) => item.fieldId === field.fieldId ? { ...item, disabled } : item) })} />
			</div>;
		})}</div>
		<section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">{ct('formTemplates')}</h3>
			<Button variant="outline" onClick={() => { const formId = 'form-' + id(); update({ ...design, forms: [...design.forms, { id: formId, label: ct('newForm'), columns: 2, controls: snapshot.type.fields.map((field) => ({ fieldId: field.fieldId, group: '' })) }] }); setFormId(formId); }}>{ct('addForm')}</Button></div>
			<Choice label={ct('formTemplate')} value={form.id} options={design.forms.map((item) => [item.id, item.label])} onChange={setFormId} />
			<Input aria-label={ct('formName')} value={form.label} onChange={(event) => updateForm({ ...form, label: event.target.value })} />
			<Choice label={ct('formColumns')} value={String(form.columns)} options={[["1", "1"], ["2", "2"]]} onChange={(value) => updateForm({ ...form, columns: value === '1' ? 1 : 2 })} />
			{snapshot.type.fields.map((field) => {
				const control = form.controls.find((item) => item.fieldId === field.fieldId);
				const label = design.fieldSettings.find((item) => item.fieldId === field.fieldId)!.label;
				return <fieldset key={field.fieldId} className="space-y-3 rounded-md border border-border p-3"><legend className="px-1 text-sm">{label}</legend>
					<Check label={ct('showInForm', { field: label })} checked={!!control} onChange={(visible) => updateForm({ ...form, controls: visible ? [...form.controls, { fieldId: field.fieldId, group: '' }] : form.controls.filter((item) => item.fieldId !== field.fieldId) })} />
					{control && <>
						<Input aria-label={ct('fieldGroup', { field: label })} placeholder={ct('group')} value={control.group} onChange={(event) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, group: event.target.value } : item) })} />
						<Input aria-label={ct('fieldHelp', { field: label })} placeholder={ct('helpText')} value={control.help ?? ''} onChange={(event) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, help: event.target.value } : item) })} />
						<Check label={ct('readOnlyField', { field: label })} checked={!!control.readOnly} onChange={(readOnly) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, readOnly } : item) })} />
						<Choice label={ct('visibleWhen', { field: label })} value={control.visibleWhen && 'fieldId' in control.visibleWhen ? control.visibleWhen.fieldId : ''}
							options={[["", ct('alwaysVisible')], ...snapshot.type.fields.filter((item) => item.fieldId !== field.fieldId).map((item) => [item.fieldId, item.label] as const)]}
							onChange={(fieldId) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, visibleWhen: fieldId ? { op: 'eq', fieldId, value: '' } : undefined } : item) })} />
						{control.visibleWhen && 'fieldId' in control.visibleWhen && <>
							<Choice label={ct('conditionOperator', { field: label })} value={control.visibleWhen.op} options={[["eq", ct('equals')], ["contains", ct('contains')]]}
								onChange={(op) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, visibleWhen: { ...control.visibleWhen, op } as ArchiveCondition } : item) })} />
							<ArchiveFieldControl field={{ ...snapshot.type.fields.find((field) => field.fieldId === (control.visibleWhen && 'fieldId' in control.visibleWhen ? control.visibleWhen.fieldId : ''))!, label: ct('conditionValue', { field: label }) }} value={control.visibleWhen.value}
								onChange={(value) => updateForm({ ...form, controls: form.controls.map((item) => item === control ? { ...item, visibleWhen: { ...control.visibleWhen, value } as ArchiveCondition } : item) })} />
						</>}
						<div className="flex flex-wrap gap-2">{[-1, 1].map((direction) => <Button key={direction} variant="outline" aria-label={ct(direction < 0 ? 'moveFieldUp' : 'moveFieldDown', { field: label })} onClick={() => {
							const controls = [...form.controls], index = controls.indexOf(control), next = index + direction;
							if (next >= 0 && next < controls.length) { [controls[index], controls[next]] = [controls[next]!, controls[index]!]; updateForm({ ...form, controls }); }
						}}>{ct(direction < 0 ? 'moveUp' : 'moveDown')}</Button>)}</div>
					</>}
				</fieldset>;
			})}
		</section>
		<section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">{ct('creationTemplates')}</h3>
			<Button variant="outline" onClick={() => { const templateId = 'template-' + id(); update({ ...design, templates: [...design.templates, { id: templateId, label: ct('newTemplate'), values: {}, body: '' }] }); setTemplateId(templateId); }}>{ct('addTemplate')}</Button></div>
			{!!design.templates.length && <Choice label={ct('creationTemplate')} value={template?.id ?? ''} options={design.templates.map((item) => [item.id, item.label])} onChange={setTemplateId} />}
			{template && <><Input aria-label={ct('templateName')} value={template.label} onChange={(event) => update({ ...design, templates: design.templates.map((item) => item === template ? { ...item, label: event.target.value } : item) })} />
				{snapshot.type.fields.map((field) => <ArchiveFieldControl key={field.fieldId + template.id} field={field} value={template.values[field.fieldId]} onChange={(value: ArchiveValue) => update({ ...design, templates: design.templates.map((item) => item === template ? { ...item, values: { ...item.values, [field.fieldId]: value } } : item) })} />)}
				{!snapshot.type.legacy && <label className="block space-y-2 text-sm">{ct('bodySkeleton')}<Textarea aria-label={ct('bodySkeleton')} value={template.body} onChange={(event) => update({ ...design, templates: design.templates.map((item) => item === template ? { ...item, body: event.target.value } : item) })} /></label>}
			</>}
		</section>
		{busy && <p role="status">{ct('saving')}</p>}
		{error && <div role="alert" className="text-destructive">{error}<p>{ct('draftKept')}</p></div>}
		<Dialog open={preview} onOpenChange={setPreview}><DialogContent><DialogHeader><DialogTitle>{ct('previewPublish')}</DialogTitle><DialogDescription>{ct('formsImpact', { count: design.forms.length, templates: design.templates.length })}</DialogDescription></DialogHeader><DialogFooter><Button disabled={busy || !!pending || !!snapshot.blockedReason} onClick={() => void publish()}>{ct('publishForms')}</Button></DialogFooter></DialogContent></Dialog>
	</fieldset>{pending && <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={()=>void recover()}>{ct('verifyPublicationResult')}</Button><Button disabled={busy} variant="outline" onClick={onCancel}>{ct('discardDraft')}</Button></div>}</section>;
}
export function ArchiveTypeDesigner(props: { snapshot?: ArchiveFormSnapshot; commands: ArchivesCommands; catalog:ArchivesCatalog; creating?: boolean;
	drafts: ArchiveDraftOwner; draftScope: string;
	onCreated: (typeId: string) => void; onCancel: () => void; onPublished: (snapshot: ArchiveFormSnapshot) => void; onDirty?: (dirty: boolean) => void; onBusy?: (busy: boolean) => void }) {
	// A restored result may already match the loaded revision; consuming it must still replace the old draft baseline.
	const [publication, setPublication] = useState(0);
	const scope = props.creating ? props.draftScope + '/new' : props.draftScope + '/design/' + (props.snapshot?.type.typeId ?? '');
	const cancel = () => { props.drafts.clearScope(scope); props.onCancel(); };
	return props.creating ? <NewType drafts={props.drafts} draftScope={scope} commands={props.commands} catalog={props.catalog} onCreated={props.onCreated} onCancel={cancel} onDirty={props.onDirty} onBusy={props.onBusy} />
		: props.snapshot ? <DesignEditor drafts={props.drafts} draftScope={scope} key={(props.snapshot.revisionId ?? props.snapshot.type.typeId) + ':' + publication} snapshot={props.snapshot} commands={props.commands} catalog={props.catalog} onPublished={(snapshot) => { setPublication((value) => value + 1); props.onPublished(snapshot); }} onCancel={cancel} onDirty={props.onDirty} onBusy={props.onBusy} /> : null;
}

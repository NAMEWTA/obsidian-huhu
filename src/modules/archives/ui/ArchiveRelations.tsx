import { useEffect, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import type { ArchiveEntity, ArchiveField, ArchiveTypeDefinition, ArchiveValue, CreateRelation, RelationDate, RelationEditBase, RelationQuerySnapshot, RelationType, PublishRelationType, UpdateRelation } from '../api';
import type { ArchiveDraftOwner } from '../services/form-drafts';
import type { ArchiveUiServices } from './ArchiveWorkspace';
import { sameRelationValue } from '../core/relation-model';
import { relationPresets } from '../core/relation-presets';
import { useArchiveDraft } from './use-archive-draft';
import { ArchiveFieldControl, archiveDisplayValue } from './field-renderers';
import { RelationTypeDesigner, RelationInput, RelationChoice } from './RelationTypeDesigner';
import { ct } from './labels';
import { errorText } from './forms';
interface Draft {
	id: string; operationId: string; typeId: string; targetId: string; incoming: boolean; values: Record<string, ArchiveValue>;
	contextRefs: Record<string, string>; status: 'current' | 'past'; from: string; to: string; base?: RelationEditBase;
}
const newDefinition = (): PublishRelationType => {
	const id = 'relation-' + crypto.randomUUID();
	return { relationTypeId: id, label: '', inverseLabel: '', direction: 'directed', sourceTypes: ['*'], targetTypes: ['*'], fields: [{ fieldId: 'role', storageKey: id + '-role', label: ct('relationRole'), codec: 'text' }],
		temporal: true, allowSelf: false, acyclic: false, cardinality: { scope: 'overlap', includeDrafts: false }, duplicates: { policy: 'overlap', fieldIds: ['role'], contextRoles: [] }, contextRoles: [], deletePolicy: 'retain' };
};
const presets = relationPresets();
const presetFor = (type: RelationType) => presets.find((preset) => preset.relationTypeId === type.relationTypeId.replace(/^legacy-/, '') && preset.label === type.label && preset.inverseLabel === type.inverseLabel);
const displayLabel = (type: RelationType, inverse = false) => presetFor(type) ? ct('relationPreset.' + type.relationTypeId.replace(/^legacy-/, '') + (inverse ? '.inverse' : '')) : inverse ? type.inverseLabel : type.label;
const displayField = (type: RelationType, field: { fieldId: string; label: string }) => presetFor(type)?.fields.some((preset) => preset.fieldId === field.fieldId && preset.label === field.label) ? ct('relationField.' + field.fieldId) : field.label;
function displayedField(type: RelationType, field: ArchiveField): ArchiveField {
	const preset = presetFor(type)?.fields.find((item) => item.fieldId === field.fieldId);
	return { ...field, label: displayField(type, field), options: field.options?.map((option) => ({ ...option, label: field.fieldId === 'keyRole' && preset?.options?.some((item) => item.id === option.id && item.label === option.label) && ['none', 'leader', 'contact'].includes(option.id) ? ct(option.id) : option.label })) };
}
const date = (value: string): RelationDate | undefined => value ? { value, precision: /^\d{4}-\d{2}$/.test(value) ? 'month' : 'day' } : undefined;
const allowed = (types: string[], entity: ArchiveEntity) => types.includes('*') || types.includes(entity.typeId) || types.includes(entity.typeId.replace(/^type-(person|company)$/, '$1'));
/** Both endpoint surfaces consume the same public relation service. Drafts belong to the module/root/entity scope. */
export function ArchiveRelations({ services, entity, drafts, scope, onDirty, onBusy }: {
	services: ArchiveUiServices; entity: ArchiveEntity; drafts: ArchiveDraftOwner; scope: string; onDirty?: (value: boolean) => void; onBusy?: (value: boolean) => void;
}) {
	const [snapshot, setSnapshot] = useState<RelationQuerySnapshot>(), [types, setTypes] = useState<RelationType[]>([]), [entities, setEntities] = useState<ArchiveEntity[]>([]), [archiveTypes, setArchiveTypes] = useState<ArchiveTypeDefinition[]>([]), [readError, setReadError] = useState(''), [refresh, setRefresh] = useState(0), [preview, setPreview] = useState(false);
	const [draft, setDraft] = useArchiveDraft<Draft | undefined>(drafts, scope + '/draft', () => undefined), [busy, setBusy] = useArchiveDraft(drafts, scope + '/busy', () => false), [error, setError] = useArchiveDraft(drafts, scope + '/error', () => ''),
		[definition, setDefinition] = useArchiveDraft<PublishRelationType | undefined>(drafts, scope + '/definition', () => undefined);
	useEffect(() => { onDirty?.(!!draft || !!definition); }, [draft, definition, onDirty]);
	useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
	useEffect(() => {
		let active = true, request = 0;
		const load = async () => { const token = ++request; try { const [relations, catalog, query, archiveCatalog] = await Promise.all([services.query.relations(entity.id), services.catalog.relationTypes(), services.query.snapshot(), services.catalog.snapshot()]); if (active && token === request) { setSnapshot(relations); setTypes(catalog.types); setEntities(query.entities); setArchiveTypes(archiveCatalog.types); setReadError(''); } } catch (failure) { if (active && token === request) setReadError(errorText(failure)); } };
		void load(); const off = services.query.subscribe(() => void load()); return () => { active = false; request++; off(); };
	}, [services, entity.id, entity.path, scope, refresh]);
	const candidates = types.filter((type) => allowed(type.sourceTypes, entity) || allowed(type.targetTypes, entity)), type = types.find((type) => type.relationTypeId === draft?.typeId);
	const start = () => { const type = candidates[0]; if (!type) { setDefinition(newDefinition()); return; } setError(''); setDraft({ id: crypto.randomUUID(), operationId: crypto.randomUUID(), typeId: type.relationTypeId, targetId: '', incoming: !allowed(type.sourceTypes, entity), values: {}, contextRefs: {}, status: 'current', from: '', to: '' }); };
	const edit = async (id: string) => {
		setBusy(true); setError(''); try { const base = await services.commands.beginRelationEdit(id), relation = base.relation; setDraft({ id: relation.id, operationId: relation.operationId, typeId: relation.relationTypeId, targetId: relation.sourceId === entity.id ? relation.targetId : relation.sourceId, incoming: relation.targetId === entity.id, values: {}, contextRefs: relation.contextRefs, status: relation.status, from: relation.validFrom?.value ?? '', to: relation.validTo?.value ?? '', base }); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
	};
	const save = async (intent: 'draft' | 'complete' | 'archive') => {
		if (!draft || !type) return; setBusy(true); setError('');
		try {
			if (draft.base) {
				const base = draft.base.relation, changes: UpdateRelation['changes'] = { values: draft.values }, from = date(draft.from), to = date(draft.to);
				if (!sameRelationValue(draft.contextRefs, base.contextRefs)) changes.contextRefs = draft.contextRefs;
				if (draft.status !== base.status) changes.status = draft.status;
				if (!sameRelationValue(from, base.validFrom)) changes.validFrom = from ?? null;
				if (!sameRelationValue(to, base.validTo)) changes.validTo = to ?? null;
				await services.commands.updateRelation({ base: draft.base, changes, intent });
			}
			else {
				const request: CreateRelation = { id: draft.id, operationId: draft.operationId, relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash,
					sourceId: draft.incoming ? draft.targetId : entity.id, targetId: draft.incoming ? entity.id : draft.targetId, values: draft.values, contextRefs: draft.contextRefs,
					validFrom: date(draft.from), validTo: date(draft.to), status: draft.status, intent: intent === 'complete' ? 'complete' : 'draft' };
				await services.commands.createRelation(request);
			}
			setDraft(undefined); setRefresh((value) => value + 1);
		} catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
	};
	const [publication,setPublication]=useArchiveDraft<string|undefined>(drafts,scope+'/definition-publication',()=>undefined);
	const acceptPublished = (created:RelationType) => {setPublication(undefined);setDefinition(undefined);setTypes(types=>[...types.filter(type=>type.relationTypeId!==created.relationTypeId),created]);setDraft({id:crypto.randomUUID(),operationId:crypto.randomUUID(),typeId:created.relationTypeId,targetId:'',incoming:false,values:{},contextRefs:{},status:'current',from:'',to:''});};
	const recoverPublication = async () => {if(!definition||!publication||busy)return;setBusy(true);try{const catalog=await services.catalog.relationTypes(),created=catalog.types.find(type=>type.relationTypeId===definition.relationTypeId&&type.revisionId===publication);if(!created||catalog.definitionStates?.some(state=>state.definitionId===created.relationTypeId&&state.blocked))throw new Error(ct('definitionPublicationUnverified'));acceptPublished(created);setError('');}catch(failure){setError(errorText(failure));}finally{setBusy(false);}};
	const publish = async () => {
		if (!definition || publication) return; setBusy(true); setError('');
		try {

			const created = await services.commands.publishRelationType(definition); acceptPublished(created);
		} catch (failure) {if(failure&&typeof failure==='object'&&'commit' in failure){const commit=failure.commit;if(commit&&typeof commit==='object'&&'revisionId' in commit&&typeof commit.revisionId==='string')setPublication(commit.revisionId);} setError(errorText(failure)); } finally { setBusy(false); }
	};
	const name = (id: string) => { const value = entities.find((item) => item.id === id); return value ? archiveDisplayValue(value.values.name ?? Object.values(value.values)[0]) : id + ' · ' + ct('missing'); };
	const targetTypes = type && (draft?.incoming ? type.sourceTypes : type.targetTypes), selected = draft?.base?.relation;
	return <section className="space-y-4 rounded-md border border-border p-4" aria-label={ct('independentRelations')}>
		<header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{ct('independentRelations')}</h2><div className="flex gap-2"><Button variant="outline" disabled={entity.readOnly || busy || !!draft || !!definition || !snapshot || !!readError} onClick={() => { setPreview(false); setDefinition(newDefinition()); }}>{ct('newRelationType')}</Button><Button disabled={entity.readOnly || busy || !!draft || !!readError || !snapshot || !snapshot.isComplete} onClick={start}>{ct('addRelation')}</Button></div></header>
		<p className="text-sm text-muted-foreground">{ct('relationSingleFact')}</p>
		{(readError || (!draft && !definition && error)) && <p role="alert">{readError || error}</p>}
		{readError && <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>{ct('retry')}</Button>}
		{snapshot && !snapshot.isComplete && <p role="alert">{ct('relationIncomplete')}</p>}
		{!snapshot && !readError && <p role="status">{ct('loading')}</p>}
		{snapshot?.projections.map((projection) => <div key={projection.relation.path + projection.direction + (projection.role ?? '')} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
			<div><p>{name(projection.otherId)} · {types.find((type) => type.relationTypeId === projection.relation.relationTypeId) ? displayLabel(types.find((type) => type.relationTypeId === projection.relation.relationTypeId)!, projection.relation.targetId === entity.id && projection.relation.sourceId !== entity.id) : projection.label}</p><p className="text-sm text-muted-foreground">{projection.relation.id} · {ct(projection.relation.lifecycle === 'active' ? projection.relation.status : projection.relation.lifecycle === 'draft' ? 'draft' : 'archivedRelation')} · {projection.relation.validFrom?.value ?? ''} → {projection.relation.validTo?.value ?? ''}</p>
			{projection.relation.readOnly && <details><summary>{projection.relation.path} · {ct('rawArchive')}</summary><pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{projection.relation.raw}</pre></details>}
			{Object.entries(projection.relation.values).map(([key, value]) => <p key={key} className="text-sm">{key}: {archiveDisplayValue(value)}</p>)}</div>
			<Button variant="outline" disabled={busy || projection.relation.readOnly || projection.direction === 'context'} onClick={() => void edit(projection.relation.id)}>{ct('edit')} · {projection.relation.id}</Button>
		</div>)}
		{snapshot?.projections.length === 0 && <p>{ct(snapshot.deletions?.length?'noRemainingRelations':'noIndependentRelations')}</p>}
		{!!snapshot?.deletions?.length && <details><summary>{ct('relationDeletionFacts',{count:snapshot.deletions.length})}</summary>{snapshot.deletions.map(fact=><details key={fact.path}><summary className="cursor-pointer break-words">{fact.relationId} · {fact.operationId}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{fact.raw}</pre></details>)}</details>}
		{!!snapshot?.diagnostics.length && <details><summary>{ct('archiveDiagnostics')}</summary>{snapshot.diagnostics.map((item,index) => <details key={item.path + item.code+index}><summary className="cursor-pointer break-words">{item.path} · {ct(item.code)}{item.detail?' · '+item.detail:''}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{item.raw}</pre></details>)}<Button variant="outline" disabled={busy} onClick={()=>setRefresh(value=>value+1)}>{ct('retry')}</Button></details>}
		<Dialog open={!!draft || !!definition} onOpenChange={(open) => { if (!open && !busy) setError(ct('relationDraftRetained')); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{definition ? ct('newRelationType') : selected ? ct('editRelation') : ct('addRelation')}</DialogTitle><DialogDescription>{ct('relationSingleFact')}</DialogDescription></DialogHeader>
			<fieldset disabled={busy || !!publication} className="space-y-4">
				{definition ? <><RelationTypeDesigner value={definition} onChange={(value) => { setPreview(false); setDefinition(value); }} types={archiveTypes} /><Button disabled={busy || !definition.label.trim() || !definition.inverseLabel.trim()} onClick={() => setPreview(true)}>{ct('previewPublish')}</Button>{preview && <aside className="space-y-3 rounded-md border border-border p-3"><p>{ct('newRelationTypeImpact', { fields: definition.fields.length, contexts: definition.contextRoles.length })}</p><Button disabled={busy} onClick={() => void publish()}>{ct('publishRelationType')}</Button></aside>}</> : draft && <>
					<RelationChoice label={ct('relationType')} disabled={!!selected} value={draft.typeId} options={candidates.map((type) => [type.relationTypeId, displayLabel(type)])} onChange={(id) => { const type = types.find((item) => item.relationTypeId === id)!; setDraft({ ...draft, typeId: id, targetId: '', values: {}, contextRefs: {}, incoming: !allowed(type.sourceTypes, entity) }); }} />
					{type?.direction === 'directed' && <RelationChoice label={ct('relationDirection')} disabled={!!selected} value={draft.incoming ? 'incoming' : 'outgoing'} options={[["outgoing", displayLabel(type)], ["incoming", displayLabel(type, true)]]} onChange={(value) => setDraft({ ...draft, incoming: value === 'incoming', targetId: '' })} />}
					<RelationChoice label={ct('relationTarget')} disabled={!!selected} value={draft.targetId} options={entities.filter((item) => !item.readOnly && (item.id !== entity.id || type?.allowSelf) && targetTypes && allowed(targetTypes, item)).map((item) => [item.id, name(item.id)])} onChange={(targetId) => setDraft({ ...draft, targetId })} />
					<RelationChoice label={ct('employmentStatus')} value={draft.status} options={[["current", ct('current')], ["past", ct('past')]]} onChange={(status) => setDraft({ ...draft, status: status as 'current' | 'past' })} />
					{type?.temporal && <div className="grid gap-3 sm:grid-cols-2"><RelationInput label={ct('validFrom')} placeholder={ct('datePrecisionHint')} value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /><RelationInput label={ct('validTo')} placeholder={ct('datePrecisionHint')} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></div>}
					{type?.contextRoles.map((role) => <RelationChoice key={role.role} label={ct('relationContext') + ' · ' + (role.label ?? role.role)} value={draft.contextRefs[role.role] ?? ''} options={[["", ct('unfilled')], ...entities.filter((entity) => !entity.readOnly && allowed(role.types, entity)).map((entity) => [entity.id, name(entity.id)] as const)]} onChange={(id) => { const refs = { ...draft.contextRefs }; if (id) refs[role.role] = id; else delete refs[role.role]; setDraft({ ...draft, contextRefs: refs }); }} />)}
					{type?.fields.map((field) => <label className="block space-y-2 text-sm" key={field.fieldId}>{displayField(type, field)}<ArchiveFieldControl field={displayedField(type, field)} value={Object.hasOwn(draft.values, field.fieldId) ? draft.values[field.fieldId] : selected?.values[field.fieldId]} onChange={(value) => setDraft({ ...draft, values: { ...draft.values, [field.fieldId]: value } })} /></label>)}
					<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void save('draft')}>{ct('saveDraft')}</Button><Button disabled={busy} onClick={() => void save('complete')}>{ct('markComplete')}</Button>{selected && <Button variant="outline" disabled={busy} onClick={() => void save('archive')}>{ct('archiveRelation')}</Button>}</div>
				</>}
				{busy && <p role="status">{ct('saving')}</p>}{error && <p role="alert">{error} · {ct('draftKept')}</p>}
				<Button variant="outline" disabled={busy} onClick={() => { setDraft(undefined); setDefinition(undefined); setPublication(undefined); setError(''); }}>{ct('discardDraft')}</Button>
			</fieldset>{publication && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void recoverPublication()}>{ct('verifyPublicationResult')}</Button><Button variant="outline" disabled={busy} onClick={()=>{setPublication(undefined);setDefinition(undefined);setError('');}}>{ct('discardDraft')}</Button></div>}
		</DialogContent></Dialog>
	</section>;
}

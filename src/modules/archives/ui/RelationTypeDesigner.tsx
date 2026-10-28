import type { ComponentProps } from 'react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Checkbox } from '../../../ui/components/checkbox';
import { Choice } from '../../../ui/components/huhu/Choice';
import type { ArchiveField, ArchiveTypeDefinition, FieldCodecId, PublishRelationType } from '../api';
import { ct } from './labels';

export function RelationInput({ label, ...props }: Omit<ComponentProps<typeof Input>, 'aria-label'> & { label: string }) {
	return <label className="block space-y-2 text-sm">{label}<Input {...props} aria-label={label} /></label>;
}
export function RelationChoice(props: ComponentProps<typeof Choice>) {
	return <div className="space-y-2 text-sm"><p>{props.label}</p><Choice {...props} /></div>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
	return <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox aria-label={label} checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>;
}
const codecs: FieldCodecId[] = ['text', 'markdown', 'integer', 'decimal', 'money', 'boolean', 'date', 'datetime', 'choice', 'multi-choice', 'string-list', 'file', 'subtable'];
const field = (): ArchiveField => { const id = 'field-' + crypto.randomUUID(); return { fieldId: id, storageKey: 'relation-' + id, label: ct('newField'), codec: 'text' }; };
function Fields({ value, onChange, depth = 0 }: { value: ArchiveField[]; onChange: (value: ArchiveField[]) => void; depth?: number }) {
	return <div className="space-y-4">{value.map((item, index) => {
		const update = (next: ArchiveField) => onChange(value.map((field) => field.fieldId === item.fieldId ? next : field));
		return <fieldset key={item.fieldId} className="space-y-3 rounded-md border border-border p-3"><legend>{ct('relationAttribute', { count: index + 1 })}</legend>
			<RelationInput label={ct('relationAttributeName', { count: index + 1 })} value={item.label} onChange={(event) => update({ ...item, label: event.target.value })} />
			<RelationChoice label={ct('relationAttributeCodec', { count: index + 1 })} value={item.codec} options={codecs.filter((codec) => depth < 4 || codec !== 'subtable').map((codec) => [codec, ct('codec.' + codec)])} onChange={(codec) => update({ ...item, codec: codec as FieldCodecId,
				...(['choice', 'multi-choice'].includes(codec) ? { options: [{ id: 'option-' + crypto.randomUUID(), label: ct('option') }] } : {}), ...(codec === 'subtable' ? { columns: [field()] } : {}) })} />
			<Check label={ct('requiredField', { field: item.label })} checked={!!item.required} onChange={(required) => update({ ...item, required })} />
			{['choice', 'multi-choice'].includes(item.codec) && <Textarea aria-label={ct('choiceOptions') + ' · ' + item.label} value={item.options?.map((option) => option.label).join('\n') ?? ''} onChange={(event) => update({ ...item, options: event.target.value.split('\n').map((label, i) => ({ id: item.options?.[i]?.id ?? 'option-' + crypto.randomUUID(), label })) })} />}
			{item.codec === 'subtable' && <Fields value={item.columns ?? []} depth={depth + 1} onChange={(columns) => update({ ...item, columns })} />}
			<Button variant="outline" onClick={() => onChange(value.filter((field) => field.fieldId !== item.fieldId))}>{ct('removeItem')}</Button>
		</fieldset>;
	})}<Button variant="outline" onClick={() => onChange([...value, field()])}>{ct('addRelationAttribute')}</Button></div>;
}
function Types({ label, value, types, onChange }: { label: string; value: string[]; types: ArchiveTypeDefinition[]; onChange: (value: string[]) => void }) {
	return <fieldset className="space-y-2 rounded-md border border-border p-3"><legend className="text-sm">{label}</legend>
		<Check label={label + ' · ' + ct('anyArchiveType')} checked={value.includes('*')} onChange={(checked) => onChange(checked ? ['*'] : [])} />
		{types.map((type) => <Check key={type.typeId} label={label + ' · ' + type.label} checked={value.includes(type.typeId)} onChange={(checked) => onChange(checked ? [...value.filter((id) => id !== '*'), type.typeId] : value.filter((id) => id !== type.typeId))} />)}
	</fieldset>;
}
/** Definition-only form: stable field/context identities are allocated once; labels never become endpoint identities. */
export function RelationTypeDesigner({ value, onChange, types }: { value: PublishRelationType; onChange: (value: PublishRelationType) => void; types: ArchiveTypeDefinition[] }) {
	const set = (patch: Partial<PublishRelationType>) => onChange({ ...value, ...patch });
	const max = (raw: string) => raw.trim() ? Number(raw) : undefined;
	const validMax = (raw: string) => !raw || /^[0-9]+$/.test(raw) && Number.isSafeInteger(Number(raw));
	return <div className="space-y-5">
		<RelationInput label={ct('relationTypeName')} value={value.label} onChange={(event) => set({ label: event.target.value })} />
		<RelationInput label={ct('inverseRelationName')} value={value.inverseLabel} onChange={(event) => set({ inverseLabel: event.target.value })} />
		<RelationChoice label={ct('relationDirection')} value={value.direction} options={[["directed", ct('directedRelation')], ["symmetric", ct('symmetricRelation')]]} onChange={(direction) => set({ direction: direction as 'directed' | 'symmetric', ...(direction === 'symmetric' ? { targetTypes: value.sourceTypes, acyclic: false, cardinality: { ...value.cardinality, targetMax: value.cardinality.sourceMax } } : {}) })} />
		<Types label={ct('relationSourceTypes')} value={value.sourceTypes} types={types} onChange={(sourceTypes) => set({ sourceTypes, ...(value.direction === 'symmetric' ? { targetTypes: sourceTypes } : {}) })} />
		{value.direction === 'directed' && <Types label={ct('relationTargetTypes')} value={value.targetTypes} types={types} onChange={(targetTypes) => set({ targetTypes })} />}
		<Check label={ct('relationTemporal')} checked={value.temporal} onChange={(temporal) => set({ temporal })} />
		<Check label={ct('relationAllowSelf')} checked={value.allowSelf} onChange={(allowSelf) => set({ allowSelf })} />
		{value.direction === 'directed' && <Check label={ct('relationAcyclic')} checked={value.acyclic} onChange={(acyclic) => set({ acyclic })} />}
		<section className="space-y-3"><h3>{ct('relationAttributes')}</h3><Fields value={value.fields} onChange={(fields) => set({ fields, duplicates: { ...value.duplicates, fieldIds: value.duplicates.fieldIds.filter((id) => fields.some((field) => field.fieldId === id)) } })} /></section>
		<section className="space-y-3"><h3>{ct('relationCardinalitySettings')}</h3>
			<RelationChoice label={ct('relationCardinalityScope')} value={value.cardinality.scope} options={[["all", ct('relationScopeAll')], ["current", ct('relationScopeCurrent')], ["overlap", ct('relationScopeOverlap')]]} onChange={(scope) => set({ cardinality: { ...value.cardinality, scope: scope as 'all' | 'current' | 'overlap' } })} />
			<RelationInput inputMode="numeric" label={ct('relationSourceMax')} placeholder={ct('unlimitedRelations')} value={value.cardinality.sourceMax ?? ''} onChange={(event) => { if (!validMax(event.target.value)) return; set({ cardinality: { ...value.cardinality, sourceMax: max(event.target.value), ...(value.direction === 'symmetric' ? { targetMax: max(event.target.value) } : {}) } }); }} />
			{value.direction === 'directed' && <RelationInput inputMode="numeric" label={ct('relationTargetMax')} placeholder={ct('unlimitedRelations')} value={value.cardinality.targetMax ?? ''} onChange={(event) => { if (!validMax(event.target.value)) return; set({ cardinality: { ...value.cardinality, targetMax: max(event.target.value) } }); }} />}
			<Check label={ct('relationIncludeDrafts')} checked={value.cardinality.includeDrafts} onChange={(includeDrafts) => set({ cardinality: { ...value.cardinality, includeDrafts } })} />
		</section>
		<section className="space-y-3"><h3>{ct('relationContexts')}</h3>
			{value.contextRoles.map((role, index) => <fieldset key={role.role} className="space-y-3 rounded-md border border-border p-3"><legend>{ct('relationContextNumber', { count: index + 1 })}</legend>
				<RelationInput label={ct('relationContextName', { count: index + 1 })} value={role.label ?? role.role} onChange={(event) => set({ contextRoles: value.contextRoles.map((item) => item.role === role.role ? { ...item, label: event.target.value } : item) })} />
				<Types label={ct('relationContextTypes', { count: index + 1 })} value={role.types} types={types} onChange={(types) => set({ contextRoles: value.contextRoles.map((item) => item.role === role.role ? { ...item, types } : item) })} />
				<Check label={ct('relationContextRequired', { count: index + 1 })} checked={role.required} onChange={(required) => set({ contextRoles: value.contextRoles.map((item) => item.role === role.role ? { ...item, required } : item) })} />
				<Button variant="outline" onClick={() => set({ contextRoles: value.contextRoles.filter((item) => item.role !== role.role), duplicates: { ...value.duplicates, contextRoles: value.duplicates.contextRoles.filter((id) => id !== role.role) } })}>{ct('removeItem')}</Button>
			</fieldset>)}
			<Button variant="outline" onClick={() => set({ contextRoles: [...value.contextRoles, { role: 'context-' + crypto.randomUUID(), label: ct('relationContext'), types: ['*'], required: false }] })}>{ct('addRelationContext')}</Button>
		</section>
		<RelationChoice label={ct('relationDuplicatePolicy')} value={value.duplicates.policy} options={[["allow", ct('relationDuplicateAllow')], ["ever", ct('relationDuplicateEver')], ["overlap", ct('relationDuplicateOverlap')]]} onChange={(policy) => set({ duplicates: { ...value.duplicates, policy: policy as 'allow' | 'ever' | 'overlap' } })} />
		<p className="text-sm text-muted-foreground">{ct('relationDuplicateDimensions')}</p>
		{value.fields.map((field) => <Check key={field.fieldId} label={ct('relationDuplicateField', { field: field.label })} checked={value.duplicates.fieldIds.includes(field.fieldId)} onChange={(checked) => set({ duplicates: { ...value.duplicates, fieldIds: checked ? [...value.duplicates.fieldIds, field.fieldId] : value.duplicates.fieldIds.filter((id) => id !== field.fieldId) } })} />)}
		{value.contextRoles.map((role) => <Check key={role.role} label={ct('relationDuplicateContext', { role: role.label ?? role.role })} checked={value.duplicates.contextRoles.includes(role.role)} onChange={(checked) => set({ duplicates: { ...value.duplicates, contextRoles: checked ? [...value.duplicates.contextRoles, role.role] : value.duplicates.contextRoles.filter((id) => id !== role.role) } })} />)}
		<RelationChoice label={ct('relationDeletePolicy')} value={value.deletePolicy} options={[["retain", ct('relationDeleteRetain')], ["restrict", ct('relationDeleteRestrict')]]} onChange={(deletePolicy) => set({ deletePolicy: deletePolicy as 'retain' | 'restrict' })} />
	</div>;
}

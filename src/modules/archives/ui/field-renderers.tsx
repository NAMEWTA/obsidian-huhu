import type { ComponentType } from 'react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Checkbox } from '../../../ui/components/checkbox';
import { Choice } from '../../../ui/components/huhu/Choice';
import type { ArchiveField, ArchiveValue, FieldCodecId } from '../api';
import { MultiValueField } from './form-fields';
import { ct } from './labels';

export interface ArchiveFieldInputProps {
	field: ArchiveField;
	value: ArchiveValue | undefined;
	onChange: (value: ArchiveValue) => void;
}
const text = (value: ArchiveValue | undefined) => value == null ? '' : typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value);
function TextField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <Input aria-label={field.label} value={text(value)} onChange={(event) => onChange(event.target.value)} />;
}
function MarkdownField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <Textarea aria-label={field.label} value={text(value)} onChange={(event) => onChange(event.target.value)} />;
}
function IntegerField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <Input aria-label={field.label} inputMode="numeric" value={text(value)} onChange={(event) => {
		const raw = event.target.value, number = Number(raw);
		onChange(/^-?\d+$/.test(raw) && Number.isSafeInteger(number) ? number : raw);
	}} />;
}
function BooleanField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <Choice label={field.label} value={value == null ? '' : value === true ? 'true' : 'false'} options={[
		['', ct('unfilled')], ['true', ct('yes')], ['false', ct('no')],
	]} onChange={(next) => onChange(next === '' ? null : next === 'true')} />;
}
function DateField({ field, value, onChange }: ArchiveFieldInputProps) {
	const date = value && typeof value === 'object' && !Array.isArray(value) ? value.value : value;
	return <Input aria-label={field.label} placeholder={ct('datePrecisionHint')} value={text(date)} onChange={(event) => {
		const raw = event.target.value;
		onChange({ value: raw, precision: /^\d{4}-\d{2}$/.test(raw) ? 'month' : 'day' });
	}} />;
}
function MoneyField({ field, value, onChange }: ArchiveFieldInputProps) {
	const money = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	return <div className="flex flex-wrap gap-2">
		<Input className="min-w-32 flex-1" aria-label={field.label + ' · ' + ct('amount')} inputMode="decimal" value={text(money.amount)}
			onChange={(event) => onChange({ amount: event.target.value, currency: money.currency ?? 'CNY' })} />
		<Input className="min-w-24 flex-1" aria-label={field.label + ' · ' + ct('currency')} value={text(money.currency ?? 'CNY')}
			onChange={(event) => onChange({ amount: money.amount ?? '', currency: event.target.value })} />
	</div>;
}
function ChoiceField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <Choice label={field.label} value={text(value)} options={[
		['', ct('unfilled')], ...(field.options ?? []).map((item) => [item.id, item.label] as const),
	]} onChange={(next) => onChange(next || null)} />;
}
function MultiChoiceField({ field, value, onChange }: ArchiveFieldInputProps) {
	const values = Array.isArray(value) ? value : [];
	return <div className="flex flex-wrap gap-3">{field.options?.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-2">
		<Checkbox aria-label={option.label} checked={values.includes(option.id)} disabled={option.disabled && !values.includes(option.id)}
			onCheckedChange={(checked) => onChange(checked ? [...values, option.id] : values.filter((item) => item !== option.id))} />
		{option.label}
	</label>)}</div>;
}
function StringListField({ field, value, onChange }: ArchiveFieldInputProps) {
	return <MultiValueField label={field.label} value={Array.isArray(value) ? value as string[] : []} chips onChange={onChange} />;
}
function SubtableField({ field, value, onChange }: ArchiveFieldInputProps) {
	const rows = (Array.isArray(value) ? value : []) as Array<{ rowId: string; values: Record<string, ArchiveValue> }>;
	return <div className="space-y-3">{rows.map((row, index) => <fieldset className="space-y-3 rounded-md border border-border p-3" key={row.rowId}>
		<legend className="px-1 text-sm">{field.label} {index + 1}</legend>
		{field.columns?.map((column) => <ArchiveFieldControl key={column.fieldId} field={column} value={row.values[column.fieldId]} onChange={(next) =>
			onChange(rows.map((item) => item.rowId === row.rowId ? { ...item, values: { ...item.values, [column.fieldId]: next } } : item))} />)}
		<Button type="button" variant="outline" onClick={() => onChange(rows.filter((item) => item.rowId !== row.rowId))}>{ct('removeItem')}</Button>
	</fieldset>)}<Button type="button" variant="outline" onClick={() => onChange([...rows, { rowId: crypto.randomUUID(), values: {} }])}>{ct('addItem')}</Button></div>;
}
/** Field UI and codec registries share the same closed set; all inputs use existing HUHU controls. */
export const fieldRendererRegistry: Readonly<Record<FieldCodecId, ComponentType<ArchiveFieldInputProps>>> = {
	text: TextField, markdown: MarkdownField, integer: IntegerField, decimal: TextField, money: MoneyField,
	boolean: BooleanField, date: DateField, datetime: TextField, choice: ChoiceField,
	'multi-choice': MultiChoiceField, 'string-list': StringListField, file: TextField, subtable: SubtableField,
};
export function archiveDisplayValue(value: ArchiveValue | undefined): string {
	if (value === undefined) return ct('unfilled');
	if (value === null) return ct('nullValue');
	if (typeof value === 'boolean') return ct(value ? 'yes' : 'no');
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
export function ArchiveFieldControl({ field, value, onChange, readOnly = false }: ArchiveFieldInputProps & { readOnly?: boolean }) {
	const Renderer = fieldRendererRegistry[field.codec];
	if (!Renderer) return <p role="alert">{ct('invalidField')}: {field.label}</p>;
	return <div className="min-w-0 space-y-2">
		<div className="text-sm font-medium">{field.label}{field.required ? ' *' : ''}</div>
		{readOnly ? <p className="whitespace-pre-wrap break-words text-sm">{archiveDisplayValue(value)}</p> : <>
			<Renderer field={field} value={value} onChange={onChange} />
			{value !== null && <Button type="button" variant="ghost" className="min-h-11 text-xs" onClick={() => onChange(null)} aria-label={ct('clearField', { field: field.label })}>{ct('nullValue')}</Button>}
		</>}
	</div>;
}

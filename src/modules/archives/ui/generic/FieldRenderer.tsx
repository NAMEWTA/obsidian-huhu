import { useId, type ReactNode } from 'react';
import { FuzzySuggestModal, type App, type TFile } from 'obsidian';
import type {
	ArchiveTypeDefinition,
	FieldDefinition,
	FieldKind,
	FormTemplate,
	FormGroup,
	Values,
} from '../../core/schema/model';
import { matches } from '../../core/schema/fields';
import { object, own } from '../../core/schema/value';
import { at, Button, Check, Input, Select, Textarea } from './common';

export function displayValue(value: unknown): string {
	return value === undefined
		? at('missing')
		: value === null
			? at('null')
			: value === ''
				? at('empty')
				: typeof value === 'string'
					? value
					: JSON.stringify(value);
}
interface ControlProps {
	field: FieldDefinition;
	value: unknown;
	onChange(this: void, value: unknown): void;
	disabled: boolean;
	id: string;
	app?: App;
}
class FilePicker extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly choose: (path: string) => void,
	) {
		super(app);
		this.setPlaceholder(at('chooseFile'));
	}
	getItems(): TFile[] {
		return this.app.vault.getFiles();
	}
	getItemText(file: TFile): string {
		return file.path;
	}
	onChooseItem(file: TFile): void {
		this.choose(file.path);
	}
}
const plainControl = ({ value, onChange, disabled, id }: ControlProps) => (
	<Input
		id={id}
		value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
		disabled={disabled}
		onChange={(event) => onChange(event.target.value)}
	/>
);
function numericControl(props: ControlProps): ReactNode {
	return (
		<Input
			id={props.id}
			inputMode="decimal"
			value={props.value === undefined || props.value === null ? '' : displayValue(props.value)}
			disabled={props.disabled}
			onChange={(event) => {
				const text = event.target.value;
				props.onChange(
					/^-?(?:\d+\.?\d*|\d*\.\d+)$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : text,
				);
			}}
		/>
	);
}
function StringListControl({ value, onChange, disabled, id }: ControlProps) {
	const items: string[] = Array.isArray(value) ? value.map(String) : [];
	return (
		<div id={id} className="space-y-2">
			{items.map((item, index) => (
				<div key={index} className="flex gap-2">
					<Input
						aria-label={`${at('value')} ${index + 1}`}
						value={item}
						disabled={disabled}
						onChange={(event) => onChange(items.map((old, i) => (i === index ? event.target.value : old)))}
					/>
					<Button
						variant="outline"
						disabled={disabled}
						onClick={() => onChange(items.filter((_item, i) => i !== index))}
					>
						{at('remove')}
					</Button>
				</div>
			))}
			<Button variant="outline" disabled={disabled} onClick={() => onChange([...items, ''])}>
				{at('add')}
			</Button>
		</div>
	);
}
function MoneyControl({ value, onChange, disabled, id }: ControlProps) {
	const money = object(value) ? value : {};
	return (
		<div id={id} className="grid gap-2 sm:grid-cols-2">
			<Input
				aria-label={at('amount')}
				inputMode="decimal"
				placeholder={at('amount')}
				value={typeof money.amount === 'string' ? money.amount : ''}
				disabled={disabled}
				onChange={(event) => onChange({ ...money, amount: event.target.value })}
			/>
			<Input
				aria-label={at('currency')}
				placeholder={at('currency')}
				value={typeof money.currency === 'string' ? money.currency : ''}
				disabled={disabled}
				onChange={(event) => onChange({ ...money, currency: event.target.value })}
			/>
		</div>
	);
}
function SelectControl({ field, value, onChange, disabled }: ControlProps) {
	const selected = field.options?.find((option) => option.value === value);
	return (
		<Select
			label={field.label}
			value={selected?.id ?? ''}
			options={[
				['', at('missing')],
				...(field.options ?? [])
					.filter((option) => !option.archived || option.value === value)
					.map((option) => [option.id, option.label] as const),
			]}
			disabled={disabled}
			onChange={(id) => {
				const option = field.options?.find((option) => option.id === id);
				onChange(option?.value);
			}}
		/>
	);
}
function MultiSelectControl({ field, value, onChange, disabled, id }: ControlProps) {
	const values: string[] = Array.isArray(value) ? value.map(String) : [];
	return (
		<div id={id} className="flex flex-wrap gap-3">
			{field.options
				?.filter((option) => !option.archived || values.includes(option.value))
				.map((option) => (
					<Check
						key={option.id}
						label={option.label}
						disabled={disabled || !!option.archived}
						checked={values.includes(option.value)}
						onChange={(checked) =>
							onChange(
								checked ? [...values, option.value] : values.filter((value) => value !== option.value),
							)
						}
					/>
				))}
		</div>
	);
}
function TableControl({ field, value, onChange, disabled, id, app }: ControlProps) {
	const rows = Array.isArray(value)
		? value
				.filter(object)
				.map((row) => ({ rowId: String(row.rowId), values: object(row.values) ? row.values : {} }))
		: [];
	return (
		<div id={id} className="space-y-3">
			{rows.map((row, index) => (
				<fieldset key={row.rowId} className="space-y-2 rounded-md border p-3">
					<legend className="px-1 text-xs">
						{at('row')} {index + 1}
					</legend>
					<div className="grid gap-3 sm:grid-cols-2">
						{field.columns?.map((column) => (
							<FieldEditor
								key={column.fieldId}
								app={app}
								field={column}
								value={row.values[column.fieldId]}
								stored={own(row.values, column.fieldId)}
								disabled={disabled}
								onChange={(value) =>
									onChange(
										rows.map((item) => {
											if (item.rowId !== row.rowId) return item;
											const values = { ...item.values };
											if (value === undefined) delete values[column.fieldId];
											else values[column.fieldId] = value;
											return { ...item, values };
										}),
									)
								}
							/>
						))}
					</div>
					<Button
						variant="outline"
						disabled={disabled}
						onClick={() => onChange(rows.filter((item) => item.rowId !== row.rowId))}
					>
						{at('remove')}
					</Button>
				</fieldset>
			))}
			<Button
				variant="outline"
				disabled={disabled}
				onClick={() => onChange([...rows, { rowId: crypto.randomUUID(), values: {} }])}
			>
				{at('addRow')}
			</Button>
		</div>
	);
}
/** Renderer registry is UI-only. Persisted values still pass the independent core codecs. */
export const FieldRendererRegistry: Readonly<Record<FieldKind, (props: ControlProps) => ReactNode>> = {
	text: plainControl,
	markdown: (props) => (
		<Textarea
			id={props.id}
			rows={5}
			value={typeof props.value === 'string' ? props.value : ''}
			disabled={props.disabled}
			onChange={(event) => props.onChange(event.target.value)}
		/>
	),
	integer: numericControl,
	decimal: numericControl,
	money: MoneyControl,
	boolean: (props) => (
		<Check
			label={props.field.label}
			checked={props.value === true}
			disabled={props.disabled}
			onChange={props.onChange}
		/>
	),
	date: (props) => (
		<div className="space-y-1">
			{plainControl(props)}
			<p className="text-xs text-muted-foreground">
				{at('dateHint')} · {at(props.field.precision ?? 'mixed')}
			</p>
		</div>
	),
	datetime: (props) => (
		<div className="space-y-1">
			{plainControl(props)}
			<p className="text-xs text-muted-foreground">{at('timezoneHint')}</p>
		</div>
	),
	select: SelectControl,
	multiselect: MultiSelectControl,
	strings: StringListControl,
	file: (props) => (
		<div className="space-y-1">
			<div className="flex gap-2">
				{plainControl(props)}
				{props.app && (
					<Button
						variant="outline"
						disabled={props.disabled}
						onClick={() => new FilePicker(props.app!, props.onChange).open()}
					>
						{at('chooseFile')}
					</Button>
				)}
			</div>
			<p className="text-xs text-muted-foreground">{at('fileHint')}</p>
		</div>
	),
	table: TableControl,
};
function emptyValue(field: FieldDefinition): unknown {
	switch (field.kind) {
		case 'integer':
		case 'decimal':
			return '';
		case 'boolean':
			return false;
		case 'money':
			return { amount: '', currency: '' };
		case 'multiselect':
		case 'strings':
		case 'table':
			return [];
		default:
			return '';
	}
}
export function FieldEditor({
	field,
	value,
	stored,
	disabled = false,
	error = false,
	app,
	onChange,
	help,
}: {
	field: FieldDefinition;
	value: unknown;
	stored: boolean;
	disabled?: boolean;
	error?: boolean;
	app?: App;
	onChange(this: void, value: unknown): void;
	help?: string;
}) {
	const id = useId(),
		Control = FieldRendererRegistry[field.kind],
		grouped = ['money', 'boolean', 'strings', 'select', 'multiselect', 'table'].includes(field.kind);
	return (
		<div
			data-field-id={field.fieldId}
			role={grouped ? 'group' : undefined}
			aria-labelledby={grouped ? `${id}-label` : undefined}
			className={`space-y-2 rounded-md p-2 ${error ? 'border border-destructive' : ''}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<label id={`${id}-label`} htmlFor={grouped ? undefined : id} className="text-sm font-medium">
					{field.label}
					{field.required ? ' *' : ''}
					{field.archived ? ` · ${at('archived')}` : ''}
				</label>
				<Select
					label={`${field.label} · ${at('fieldState')}`}
					value={!stored || value === undefined ? 'missing' : value === null ? 'null' : 'value'}
					options={['missing', 'null', 'value'].map((key) => [key, at(key)])}
					disabled={disabled || field.archived}
					onChange={(state) =>
						onChange(state === 'missing' ? undefined : state === 'null' ? null : emptyValue(field))
					}
				/>
			</div>
			{value !== null ? (
				<Control
					id={id}
					app={app}
					field={field}
					value={value}
					disabled={disabled || !!field.archived}
					onChange={onChange}
				/>
			) : (
				<p className="text-xs text-muted-foreground">{displayValue(value)}</p>
			)}
			{(help || field.help) && <p className="text-xs text-muted-foreground">{help || field.help}</p>}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{at('invalidValues')}
				</p>
			)}
		</div>
	);
}
export function ValueForm({
	fields,
	values,
	onChange,
	disabled = false,
	errors = [],
	form,
	app,
}: {
	fields: readonly FieldDefinition[];
	values: Values;
	onChange: (fieldId: string, value: unknown) => void;
	disabled?: boolean;
	errors?: readonly string[];
	form?: FormTemplate;
	app?: App;
}) {
	const groups: FormGroup[] = form?.groups ?? [
		{
			id: 'all-fields',
			label: at('fields'),
			columns: 1 as const,
			controls: fields
				.filter((field) => !field.archived || own(values, field.fieldId))
				.map((field) => ({ fieldId: field.fieldId })),
		},
	];
	return (
		<div className="space-y-4">
			{groups
				.filter((group) => matches(group.visibleWhen, values))
				.map((group) => (
					<fieldset key={group.id} className="space-y-2">
						<legend className="text-sm font-semibold">{group.label}</legend>
						<div
							className={`grid gap-3 ${group.columns === 3 ? 'lg:grid-cols-3' : group.columns === 2 ? 'md:grid-cols-2' : ''}`}
						>
							{group.controls
								.filter((control) => matches(control.visibleWhen, values))
								.map((control) => {
									const field = fields.find((field) => field.fieldId === control.fieldId);
									return field ? (
										<FieldEditor
											key={field.fieldId}
											field={field}
											stored={own(values, field.fieldId)}
											value={values[field.fieldId]}
											onChange={(value) => onChange(field.fieldId, value)}
											disabled={disabled || control.readOnly}
											error={errors.includes(field.fieldId)}
											help={control.help}
											app={app}
										/>
									) : (
										<p key={control.fieldId} role="alert">
											{at('unknownDefinition')} {control.fieldId}
										</p>
									);
								})}
						</div>
					</fieldset>
				))}
		</div>
	);
}
export function RecordValues({ type, values }: { type: ArchiveTypeDefinition; values: Values }) {
	return (
		<dl className="grid gap-3 sm:grid-cols-2">
			{type.fields
				.filter((field) => own(values, field.fieldId))
				.map((field) => (
					<div key={field.fieldId} className="min-w-0">
						<dt className="text-xs text-muted-foreground">{field.label}</dt>
						<dd className="mt-1 whitespace-pre-wrap break-words text-sm">
							{displayValue(values[field.fieldId])}
						</dd>
					</div>
				))}
		</dl>
	);
}

import type { Condition, FieldDefinition, Filter, RelationTypeDefinition } from '../../core/schema/model';
import { at, Button, Input, Select, Section } from './common';
import { FieldEditor } from './FieldRenderer';
export function QueryBuilder({
	value,
	onChange,
	fields,
	relations = [],
	conditionsOnly = false,
	depth = 0,
}: {
	value?: Filter;
	onChange: (value: Filter | undefined) => void;
	fields: readonly FieldDefinition[];
	relations?: readonly RelationTypeDefinition[];
	conditionsOnly?: boolean;
	depth?: number;
}) {
	const leaf = (): Filter | undefined => (fields[0] ? { fieldId: fields[0].fieldId, op: 'present' } : undefined);
	if (!value)
		return (
			<div className="flex flex-wrap gap-2">
				<Button variant="outline" disabled={!fields.length} onClick={() => onChange(leaf())}>
					{at('addCondition')}
				</Button>
				{depth < 8 && (
					<Button variant="outline" onClick={() => onChange({ all: [] })}>
						{at('addGroup')}
					</Button>
				)}
				{!conditionsOnly && relations[0] && (
					<Button
						variant="outline"
						onClick={() => onChange({ relationTypeId: relations[0]!.id, direction: 'either' })}
					>
						{at('relationFilter')}
					</Button>
				)}
			</div>
		);
	if ('all' in value || 'any' in value) {
		const key = 'all' in value ? 'all' : 'any',
			children = 'all' in value ? value.all : value.any;
		return (
			<Section title={at('group')}>
				<div className="flex flex-wrap items-end gap-2">
					<Select
						label={at('operator')}
						value={key}
						options={['all', 'any'].map((key) => [key, at(key)])}
						onChange={(key) => onChange(key === 'all' ? { all: children } : { any: children })}
					/>
					<Button variant="outline" onClick={() => onChange(undefined)}>
						{at('remove')}
					</Button>
				</div>
				{children.map((child, index) => (
					<QueryBuilder
						key={index}
						value={child}
						fields={fields}
						relations={relations}
						conditionsOnly={conditionsOnly}
						depth={depth + 1}
						onChange={(next) =>
							onChange({
								[key]: next
									? children.map((child, i) => (i === index ? next : child))
									: children.filter((_child, i) => i !== index),
							} as Filter)
						}
					/>
				))}
				{depth < 8 && children.length < 32 && (
					<QueryBuilder
						fields={fields}
						relations={relations}
						conditionsOnly={conditionsOnly}
						depth={depth + 1}
						onChange={(next) => {
							if (next) onChange({ [key]: [...children, next] } as Filter);
						}}
					/>
				)}
			</Section>
		);
	}
	if ('relationTypeId' in value)
		return (
			<div className="space-y-2 rounded-md border p-3">
				<Select
					label={at('relation-type')}
					value={value.relationTypeId}
					options={relations.map((type) => [type.id, type.label])}
					onChange={(relationTypeId) => onChange({ ...value, relationTypeId })}
				/>
				<Select
					label={at('direction')}
					value={value.direction}
					options={['out', 'in', 'either'].map((key) => [key, at(key)])}
					onChange={(direction) => onChange({ ...value, direction: direction as 'out' | 'in' | 'either' })}
				/>
				<Input
					aria-label={at('targetId')}
					placeholder={at('targetId')}
					value={value.targetId ?? ''}
					onChange={(event) => onChange({ ...value, targetId: event.target.value || undefined })}
				/>
				<Button variant="outline" onClick={() => onChange(undefined)}>
					{at('remove')}
				</Button>
			</div>
		);
	const field = fields.find((field) => field.fieldId === value.fieldId),
		operators = conditionsOnly
			? ['eq', 'ne', 'contains', 'present']
			: ['eq', 'ne', 'contains', 'present', 'gt', 'gte', 'lt', 'lte'];
	const scalar =
		field?.kind === 'strings' || field?.kind === 'multiselect'
			? { ...field, kind: (field.kind === 'strings' ? 'text' : 'select') as FieldDefinition['kind'] }
			: field;
	return (
		<div className="space-y-2 rounded-md border p-3">
			<div className="grid gap-2 sm:grid-cols-2">
				<Select
					label={at('fields')}
					value={value.fieldId}
					options={fields.map((field) => [field.fieldId, field.label])}
					onChange={(fieldId) => onChange({ fieldId, op: 'present' })}
				/>
				<Select
					label={at('operator')}
					value={value.op}
					options={operators.map((key) => [key, at(key)])}
					onChange={(op) => onChange({ ...value, op: op as typeof value.op })}
				/>
			</div>
			{value.op !== 'present' && scalar && (
				<FieldEditor
					field={{ ...scalar, archived: false, required: false }}
					stored={Object.hasOwn(value, 'value')}
					value={value.value}
					onChange={(next) => onChange({ ...value, value: next })}
				/>
			)}
			<Button variant="outline" onClick={() => onChange(undefined)}>
				{at('remove')}
			</Button>
		</div>
	);
}
export function ConditionBuilder({
	value,
	onChange,
	fields,
}: {
	value?: Condition;
	onChange(this: void, value: Condition | undefined): void;
	fields: readonly FieldDefinition[];
}) {
	return (
		<QueryBuilder
			value={value}
			onChange={(value) => onChange(value as Condition | undefined)}
			fields={fields}
			conditionsOnly
		/>
	);
}

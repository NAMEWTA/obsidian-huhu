import type { FieldDefinition } from '../../core/schema/model';
import { FIELD_KINDS } from '../../core/schema/fields';
import { at, Button, Check, Reorder, Select, TextField, reordered } from './common';
export function newField(): FieldDefinition {
	const id = `field-${crypto.randomUUID()}`;
	return {
		fieldId: id,
		storageKey: 'field_' + id.slice(6, 14).replaceAll('-', '_'),
		label: at('fields'),
		kind: 'text',
	};
}
export function FieldDesigner({
	fields,
	onChange,
	locked = [],
	depth = 0,
}: {
	fields: FieldDefinition[];
	onChange(this: void, fields: FieldDefinition[]): void;
	locked?: readonly FieldDefinition[];
	depth?: number;
}) {
	const patch = (index: number, value: Partial<FieldDefinition>) =>
		onChange(fields.map((field, i) => (i === index ? { ...field, ...value } : field)));
	return (
		<div className="space-y-3">
			{fields.map((field, index) => {
				const original = locked.find((item) => item.fieldId === field.fieldId);
				return (
					<details key={field.fieldId} className="rounded-md border p-3" open={!original}>
						<summary className="cursor-pointer text-sm font-medium">
							{field.label} · {field.storageKey}
							{field.archived ? ` · ${at('archived')}` : ''}
						</summary>
						<div className="mt-3 space-y-3">
							<TextField label={at('id')} value={field.fieldId} readOnly />
							<div className="grid gap-3 sm:grid-cols-2">
								<TextField
									label={at('label')}
									value={field.label}
									onChange={(label) => patch(index, { label })}
								/>
								<TextField
									label={at('storageKey')}
									value={field.storageKey}
									onChange={(storageKey) => patch(index, { storageKey })}
								/>
								<Select
									label={at('fieldKind')}
									value={field.kind}
									options={FIELD_KINDS.filter((kind) => depth === 0 || kind !== 'table').map(
										(kind) => [kind, kind],
									)}
									onChange={(kind) => {
										const next: FieldDefinition = {
											...field,
											kind: kind as FieldDefinition['kind'],
										};
										delete next.options;
										delete next.columns;
										delete next.precision;
										if (kind === 'select' || kind === 'multiselect') next.options = [];
										if (kind === 'table') next.columns = [newField()];
										if (kind === 'date') next.precision = 'mixed';
										onChange(fields.map((item, i) => (i === index ? next : item)));
									}}
								/>
								<TextField
									label={at('help')}
									value={field.help ?? ''}
									onChange={(help) => patch(index, { help })}
								/>
							</div>
							<div className="flex flex-wrap gap-3">
								<Check
									label={at('required')}
									checked={!!field.required}
									onChange={(required) => patch(index, { required })}
								/>
								<Check
									label={at('archived')}
									checked={!!field.archived}
									onChange={(archived) => patch(index, { archived })}
								/>
								{field.kind === 'strings' && (
									<Check
										label={at('unique')}
										checked={!!field.uniqueItems}
										onChange={(uniqueItems) => patch(index, { uniqueItems })}
									/>
								)}
							</div>
							{field.kind === 'date' && (
								<Select
									label={at('precision')}
									value={field.precision ?? 'mixed'}
									options={['month', 'day', 'mixed'].map((key) => [key, at(key)])}
									onChange={(precision) =>
										patch(index, { precision: precision as FieldDefinition['precision'] })
									}
								/>
							)}
							{field.options && (
								<div className="space-y-2">
									{field.options.map((option, optionIndex) => (
										<div
											key={option.id}
											className="grid gap-2 rounded-md border p-2 sm:grid-cols-3"
										>
											<TextField
												label={at('value')}
												value={option.value}
												readOnly={!!original?.options?.some((item) => item.id === option.id)}
												onChange={(value) =>
													patch(index, {
														options: field.options!.map((item, i) =>
															i === optionIndex ? { ...item, value } : item,
														),
													})
												}
											/>
											<TextField
												label={at('label')}
												value={option.label}
												onChange={(label) =>
													patch(index, {
														options: field.options!.map((item, i) =>
															i === optionIndex ? { ...item, label } : item,
														),
													})
												}
											/>
											<Check
												label={at('archived')}
												checked={!!option.archived}
												onChange={(archived) =>
													patch(index, {
														options: field.options!.map((item, i) =>
															i === optionIndex ? { ...item, archived } : item,
														),
													})
												}
											/>
										</div>
									))}
									<Button
										variant="outline"
										onClick={() => {
											const id = crypto.randomUUID();
											patch(index, {
												options: [...field.options!, { id, value: id, label: at('value') }],
											});
										}}
									>
										{at('addOption')}
									</Button>
								</div>
							)}
							{field.kind === 'table' && (
								<FieldDesigner
									fields={field.columns ?? []}
									locked={original?.columns}
									depth={depth + 1}
									onChange={(columns) => patch(index, { columns })}
								/>
							)}
							<div className="flex flex-wrap gap-2">
								<Reorder
									index={index}
									length={fields.length}
									move={(to) => onChange(reordered(fields, index, to))}
								/>
								{!original && (
									<Button
										variant="outline"
										onClick={() => onChange(fields.filter((_field, i) => i !== index))}
									>
										{at('remove')}
									</Button>
								)}
							</div>
						</div>
					</details>
				);
			})}
			<Button variant="outline" onClick={() => onChange([...fields, newField()])}>
				{at('addField')}
			</Button>
		</div>
	);
}

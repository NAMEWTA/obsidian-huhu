import { useEffect, useMemo, useState } from 'react';
import type { App } from 'obsidian';
import type { ArchivesApplication } from '../../services/generic/application';
import {
	ArchiveError,
	type ArchiveTypeDefinition,
	type Definition,
	type DefinitionRevision,
	type FieldDefinition,
	type FormTemplate,
	type RelationTypeDefinition,
	type Values,
} from '../../core/schema/model';
import { revisionGraph, validateDefinition } from '../../core/schema/definitions';
import { canonical, copy } from '../../core/schema/value';
import { useT } from '../../../../ui/react/hooks';
import {
	at,
	Button,
	Check,
	ErrorBox,
	JsonDraft,
	Reorder,
	Section,
	Select,
	TextField,
	confirmAt,
	reordered,
} from './common';
import { FieldDesigner, newField } from './FieldDesigner';
import { ConditionBuilder, QueryBuilder } from './QueryBuilder';
import { ValueForm } from './FieldRenderer';
import { useArchiveVersion } from './hooks';

function makeDefinition(kind: Definition['kind'], typeId: string): Definition {
	const id = `${kind}-${crypto.randomUUID()}`,
		label = at(kind);
	switch (kind) {
		case 'type': {
			const field = { ...newField(), storageKey: 'name', label: at('label'), required: true };
			return {
				kind,
				id,
				label,
				enabled: true,
				folder: id,
				icon: 'folder',
				nameFieldId: field.fieldId,
				fields: [field],
			};
		}
		case 'form':
			return { kind, id, label, typeId, groups: [] };
		case 'template':
			return { kind, id, label, typeId, defaults: {}, body: '' };
		case 'view':
			return { kind, id, label, typeId, layout: 'table', columns: [], query: { typeId } };
		case 'relation-type':
			return {
				kind,
				id,
				label,
				enabled: true,
				directed: true,
				sourceTypes: typeId ? [typeId] : [],
				targetTypes: typeId ? [typeId] : [],
				forwardLabel: label,
				inverseLabel: label,
				sourceCardinality: { scope: 'active' },
				targetCardinality: { scope: 'active' },
				allowSelf: false,
				acyclic: false,
				onDelete: 'retain',
				duplicatePolicy: 'values',
				contextRoles: [],
				fields: [],
			};
	}
}
function TypeSet({
	title,
	values,
	types,
	change,
}: {
	title: string;
	values: string[];
	types: ArchiveTypeDefinition[];
	change(this: void, values: string[]): void;
}) {
	return (
		<fieldset className="space-y-2">
			<legend className="text-sm font-medium">{title}</legend>
			<div className="flex flex-wrap gap-3">
				{types.map((type) => (
					<Check
						key={type.id}
						label={type.label}
						checked={values.includes(type.id)}
						onChange={(checked) =>
							change(checked ? [...values, type.id] : values.filter((id) => id !== type.id))
						}
					/>
				))}
			</div>
		</fieldset>
	);
}
function FormDesigner({
	form,
	fields,
	change,
}: {
	form: FormTemplate;
	fields: FieldDefinition[];
	change(this: void, form: FormTemplate): void;
}) {
	const used = new Set(form.groups.flatMap((group) => group.controls.map((control) => control.fieldId)));
	return (
		<div className="space-y-3">
			{form.groups.map((group, groupIndex) => {
				const update = (next: typeof group) =>
					change({ ...form, groups: form.groups.map((item, index) => (index === groupIndex ? next : item)) });
				return (
					<Section key={group.id} title={group.label}>
						<div className="grid gap-2 sm:grid-cols-2">
							<TextField
								label={at('label')}
								value={group.label}
								onChange={(label) => update({ ...group, label })}
							/>
							<Select
								label={at('columns')}
								value={String(group.columns)}
								options={['1', '2', '3'].map((value) => [value, value])}
								onChange={(columns) => update({ ...group, columns: Number(columns) as 1 | 2 | 3 })}
							/>
						</div>
						<details>
							<summary>{at('visibleWhen')}</summary>
							<ConditionBuilder
								fields={fields}
								value={group.visibleWhen}
								onChange={(visibleWhen) => update({ ...group, visibleWhen })}
							/>
						</details>
						{group.controls.map((control, controlIndex) => (
							<div key={control.fieldId} className="space-y-2 rounded-md border p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span>
										{fields.find((field) => field.fieldId === control.fieldId)?.label ??
											control.fieldId}
									</span>
									<Reorder
										index={controlIndex}
										length={group.controls.length}
										move={(to) =>
											update({ ...group, controls: reordered(group.controls, controlIndex, to) })
										}
									/>
								</div>
								<Check
									label={at('readOnly')}
									checked={!!control.readOnly}
									onChange={(readOnly) =>
										update({
											...group,
											controls: group.controls.map((item, i) =>
												i === controlIndex ? { ...item, readOnly } : item,
											),
										})
									}
								/>
								<TextField
									label={at('help')}
									value={control.help ?? ''}
									onChange={(help) =>
										update({
											...group,
											controls: group.controls.map((item, i) =>
												i === controlIndex ? { ...item, help } : item,
											),
										})
									}
								/>
								<details>
									<summary>{at('visibleWhen')}</summary>
									<ConditionBuilder
										fields={fields}
										value={control.visibleWhen}
										onChange={(visibleWhen) =>
											update({
												...group,
												controls: group.controls.map((item, i) =>
													i === controlIndex ? { ...item, visibleWhen } : item,
												),
											})
										}
									/>
								</details>
								<Button
									variant="outline"
									onClick={() =>
										update({
											...group,
											controls: group.controls.filter((_item, i) => i !== controlIndex),
										})
									}
								>
									{at('remove')}
								</Button>
							</div>
						))}
						<Select
							label={at('addField')}
							value=""
							options={[
								['', at('addField')],
								...fields
									.filter((field) => !used.has(field.fieldId) && !field.archived)
									.map((field) => [field.fieldId, field.label] as const),
							]}
							onChange={(fieldId) => {
								if (fieldId) update({ ...group, controls: [...group.controls, { fieldId }] });
							}}
						/>
						<div className="flex gap-2">
							<Reorder
								index={groupIndex}
								length={form.groups.length}
								move={(to) => change({ ...form, groups: reordered(form.groups, groupIndex, to) })}
							/>
							<Button
								variant="outline"
								onClick={() =>
									change({ ...form, groups: form.groups.filter((_item, i) => i !== groupIndex) })
								}
							>
								{at('remove')}
							</Button>
						</div>
					</Section>
				);
			})}
			<Button
				variant="outline"
				onClick={() =>
					change({
						...form,
						groups: [
							...form.groups,
							{ id: crypto.randomUUID(), label: at('group'), columns: 1, controls: [] },
						],
					})
				}
			>
				{at('addGroup')}
			</Button>
		</div>
	);
}
function RelationDesigner({
	definition,
	types,
	locked,
	change,
}: {
	definition: RelationTypeDefinition;
	types: ArchiveTypeDefinition[];
	locked: FieldDefinition[];
	change(this: void, definition: RelationTypeDefinition): void;
}) {
	const patch = (value: Partial<RelationTypeDefinition>) => change({ ...definition, ...value });
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-4">
				<Check label={at('enabled')} checked={definition.enabled} onChange={(enabled) => patch({ enabled })} />
				<Check
					label={at('directed')}
					checked={definition.directed}
					onChange={(directed) => patch({ directed })}
				/>
				<Check
					label={at('allowSelf')}
					checked={definition.allowSelf}
					onChange={(allowSelf) => patch({ allowSelf })}
				/>
				<Check label={at('acyclic')} checked={definition.acyclic} onChange={(acyclic) => patch({ acyclic })} />
			</div>
			<TypeSet
				title={at('sourceTypes')}
				values={definition.sourceTypes}
				types={types}
				change={(sourceTypes) => patch({ sourceTypes })}
			/>
			<TypeSet
				title={at('targetTypes')}
				values={definition.targetTypes}
				types={types}
				change={(targetTypes) => patch({ targetTypes })}
			/>
			<div className="grid gap-3 sm:grid-cols-2">
				<TextField
					label={at('forwardLabel')}
					value={definition.forwardLabel}
					onChange={(forwardLabel) => patch({ forwardLabel })}
				/>
				<TextField
					label={at('inverseLabel')}
					value={definition.inverseLabel}
					onChange={(inverseLabel) => patch({ inverseLabel })}
				/>
				{(['sourceCardinality', 'targetCardinality'] as const).map((key) => (
					<Section key={key} title={at(key === 'sourceCardinality' ? 'source' : 'target')}>
						<TextField
							label={at('cardinality')}
							value={definition[key].max === undefined ? '' : String(definition[key].max)}
							onChange={(value) =>
								patch({ [key]: { ...definition[key], max: value === '' ? undefined : Number(value) } })
							}
						/>
						<Select
							label={at('scope')}
							value={definition[key].scope}
							options={['active', 'all'].map((key) => [key, at(key)])}
							onChange={(scope) => patch({ [key]: { ...definition[key], scope } })}
						/>
					</Section>
				))}
				<Select
					label={at('duplicatePolicy')}
					value={definition.duplicatePolicy}
					options={['allow', 'endpoints', 'values'].map((key) => [key, at(key)])}
					onChange={(duplicatePolicy) =>
						patch({ duplicatePolicy: duplicatePolicy as RelationTypeDefinition['duplicatePolicy'] })
					}
				/>
				<Select
					label={at('onDelete')}
					value={definition.onDelete}
					options={['restrict', 'retain'].map((key) => [key, at(key)])}
					onChange={(onDelete) => patch({ onDelete: onDelete as 'restrict' | 'retain' })}
				/>
			</div>
			<FieldDesigner fields={definition.fields} locked={locked} onChange={(fields) => patch({ fields })} />
			<Section title={at('activeWhen')}>
				<ConditionBuilder
					fields={definition.fields}
					value={definition.activeWhen}
					onChange={(activeWhen) => patch({ activeWhen })}
				/>
			</Section>
			<Section title={at('contextRoles')}>
				{definition.contextRoles.map((role, index) => (
					<div key={index} className="space-y-2 rounded-md border p-3">
						<TextField
							label={at('role')}
							value={role.role}
							onChange={(value) =>
								patch({
									contextRoles: definition.contextRoles.map((item, i) =>
										i === index ? { ...item, role: value } : item,
									),
								})
							}
						/>
						<TextField
							label={at('label')}
							value={role.label}
							onChange={(label) =>
								patch({
									contextRoles: definition.contextRoles.map((item, i) =>
										i === index ? { ...item, label } : item,
									),
								})
							}
						/>
						<TypeSet
							title={at('type')}
							values={role.typeIds}
							types={types}
							change={(typeIds) =>
								patch({
									contextRoles: definition.contextRoles.map((item, i) =>
										i === index ? { ...item, typeIds } : item,
									),
								})
							}
						/>
						<Check
							label={at('required')}
							checked={!!role.required}
							onChange={(required) =>
								patch({
									contextRoles: definition.contextRoles.map((item, i) =>
										i === index ? { ...item, required } : item,
									),
								})
							}
						/>
					</div>
				))}
				<Button
					variant="outline"
					onClick={() =>
						patch({
							contextRoles: [
								...definition.contextRoles,
								{
									role: `role-${crypto.randomUUID()}`,
									label: at('contextRoles'),
									typeIds: types[0] ? [types[0].id] : [],
								},
							],
						})
					}
				>
					{at('add')}
				</Button>
			</Section>
		</div>
	);
}
export function DefinitionStudio({
	application,
	owner,
	app,
	guard,
}: {
	application: ArchivesApplication;
	owner: HTMLElement;
	app: App;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
}) {
	useT();
	const version = useArchiveVersion(application),
		[revisions, setRevisions] = useState<DefinitionRevision[]>([]),
		[draft, setDraft] = useState<Definition>(),
		[base, setBase] = useState<Definition>(),
		[parents, setParents] = useState<string[]>([]),
		[kind, setKind] = useState<Definition['kind']>('type'),
		[error, setError] = useState<unknown>(),
		[busy, setBusy] = useState(false),
		[preview, setPreview] = useState<ReturnType<typeof application.commands.previewDefinition>>(),
		[values, setValues] = useState<Values>({}),
		[notice, setNotice] = useState('');
	useEffect(() => {
		let alive = true;
		void application.query.revisions().then(
			(value) => {
				if (alive) setRevisions(value);
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, version]);
	const types = useMemo(() => {
		const ids = [
			...new Set(
				revisions
					.filter((revision) => revision.definition.kind === 'type')
					.map((revision) => revision.definition.id),
			),
		];
		return ids.flatMap((id) => {
			const versions = revisions.filter((revision) => revision.definition.id === id),
				head = revisionGraph(versions).heads;
			const found =
				head.length === 1
					? versions.find((revision) => revision.revisionId === head[0])?.definition
					: undefined;
			return found?.kind === 'type' ? [found] : [];
		});
	}, [revisions]);
	const dirty = !!draft && canonical(draft) !== canonical(base);
	useEffect(() => {
		guard(dirty ? () => confirmAt(owner, at('leaveDesigner'), at('designer')) : undefined);
		return () => guard(undefined);
	}, [dirty, guard, owner]);
	const load = async (definition: Definition) => {
		if (dirty && !(await confirmAt(owner, at('leaveDesigner'), at('designer')))) return;
		setDraft(copy(definition));
		setBase(copy(definition));
		setParents(revisionGraph(revisions.filter((item) => item.definition.id === definition.id)).heads);
		setPreview(undefined);
		setError(undefined);
		setValues({});
		setNotice('');
	};
	const update = (definition: Definition) => {
		setDraft(definition);
		setPreview(undefined);
		setError(undefined);
	};
	const publish = async () => {
		if (!draft || !preview || preview.fingerprint !== canonical(draft)) return;
		setBusy(true);
		setError(undefined);
		try {
			const result = await application.commands.publishDefinition({
				operationId: crypto.randomUUID(),
				definition: draft,
				expectedHeads: parents,
			});
			setBase(copy(draft));
			setParents([result.revision.revisionId]);
			setPreview(undefined);
			setNotice(at(result.pointer === 'updated' ? 'published' : 'pointerConflict'));
		} catch (error) {
			setError(error);
		} finally {
			setBusy(false);
		}
	};
	const definitionOptions = [
		...new Map(revisions.map((revision) => [revision.definition.id, revision.definition])).values(),
	];
	const type = draft && 'typeId' in draft ? types.find((type) => type.id === draft.typeId) : undefined;
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">{at('designer')}</h2>
			<p className="text-sm text-muted-foreground">{at('initializeHint')}</p>
			<div className="grid gap-3 sm:grid-cols-3">
				<Select
					label={at('definition')}
					value={draft?.id ?? ''}
					options={[
						['', at('none')],
						...definitionOptions.map(
							(definition) => [definition.id, `${definition.label} · ${at(definition.kind)}`] as const,
						),
					]}
					onChange={(id) => {
						const versions = revisions.filter((item) => item.definition.id === id),
							heads = revisionGraph(versions).heads,
							chosen = versions.find((item) => item.revisionId === heads[0]);
						if (chosen) void load(chosen.definition);
					}}
				/>
				<Select
					label={at('newDefinition')}
					value={kind}
					options={['type', 'form', 'template', 'relation-type', 'view'].map((key) => [key, at(key)])}
					onChange={(kind) => setKind(kind as Definition['kind'])}
				/>
				<Button
					className="self-end"
					disabled={busy || (kind !== 'type' && !types.length)}
					onClick={() => {
						void load(makeDefinition(kind, types[0]?.id ?? ''));
					}}
				>
					{at('newDefinition')}
				</Button>
			</div>
			<ErrorBox error={error} />
			{notice && (
				<p role="status" className="rounded-md border p-3">
					{notice}
				</p>
			)}
			{draft && (
				<fieldset disabled={busy} className="space-y-4">
					<TextField label={at('id')} value={draft.id} readOnly />
					<TextField
						label={at('label')}
						value={draft.label}
						onChange={(label) => update({ ...draft, label })}
					/>
					{'typeId' in draft && (
						<Select
							label={at('type')}
							value={draft.typeId}
							options={types.map((type) => [type.id, type.label])}
							onChange={(typeId) => update({ ...draft, typeId })}
						/>
					)}
					{draft.kind === 'type' && (
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<TextField
									label={at('folder')}
									value={draft.folder}
									onChange={(folder) => update({ ...draft, folder })}
								/>
								<TextField
									label={at('icon')}
									value={draft.icon}
									onChange={(icon) => update({ ...draft, icon })}
								/>
								<Select
									label={at('nameField')}
									value={draft.nameFieldId}
									options={draft.fields
										.filter((field) => field.kind === 'text' && !field.archived)
										.map((field) => [field.fieldId, field.label])}
									onChange={(nameFieldId) => update({ ...draft, nameFieldId })}
								/>
								<Select
									label={at('defaultForm')}
									value={draft.defaultFormId ?? ''}
									options={[
										['', at('none')],
										...definitionOptions
											.filter(
												(definition) =>
													definition.kind === 'form' && definition.typeId === draft.id,
											)
											.map((definition) => [definition.id, definition.label] as const),
									]}
									onChange={(defaultFormId) =>
										update({ ...draft, defaultFormId: defaultFormId || undefined })
									}
								/>
								<Select
									label={at('defaultTemplate')}
									value={draft.defaultTemplateId ?? ''}
									options={[
										['', at('none')],
										...definitionOptions
											.filter(
												(definition) =>
													definition.kind === 'template' && definition.typeId === draft.id,
											)
											.map((definition) => [definition.id, definition.label] as const),
									]}
									onChange={(defaultTemplateId) =>
										update({ ...draft, defaultTemplateId: defaultTemplateId || undefined })
									}
								/>
							</div>
							<Check
								label={at('enabled')}
								checked={draft.enabled}
								onChange={(enabled) => update({ ...draft, enabled })}
							/>
							<FieldDesigner
								fields={draft.fields}
								locked={base?.kind === 'type' ? base.fields : []}
								onChange={(fields) => update({ ...draft, fields })}
							/>
						</>
					)}
					{draft.kind === 'form' && <FormDesigner form={draft} fields={type?.fields ?? []} change={update} />}
					{draft.kind === 'template' && (
						<>
							<ValueForm
								fields={type?.fields ?? []}
								values={draft.defaults}
								app={app}
								onChange={(id, value) => {
									const defaults = { ...draft.defaults };
									if (value === undefined) delete defaults[id];
									else defaults[id] = value;
									update({ ...draft, defaults });
								}}
							/>
							<TextField
								label={at('body')}
								value={draft.body}
								multiline
								onChange={(body) => update({ ...draft, body })}
							/>
						</>
					)}
					{draft.kind === 'relation-type' && (
						<RelationDesigner
							definition={draft}
							types={types}
							locked={base?.kind === 'relation-type' ? base.fields : []}
							change={update}
						/>
					)}
					{draft.kind === 'view' && (
						<>
							<Select
								label={at('layout')}
								value={draft.layout}
								options={['table', 'card'].map((key) => [key, at(key)])}
								onChange={(layout) => update({ ...draft, layout: layout as 'table' | 'card' })}
							/>
							<Section title={at('columns')}>
								<div className="flex flex-wrap gap-3">
									{type?.fields.map((field) => (
										<Check
											key={field.fieldId}
											label={field.label}
											checked={draft.columns.includes(field.fieldId)}
											onChange={(checked) =>
												update({
													...draft,
													columns: checked
														? [...draft.columns, field.fieldId]
														: draft.columns.filter((id) => id !== field.fieldId),
												})
											}
										/>
									))}
								</div>
								{draft.columns.map((id, index) => (
									<div key={id} className="flex items-center justify-between gap-3">
										<span>{type?.fields.find((field) => field.fieldId === id)?.label ?? id}</span>
										<Reorder
											index={index}
											length={draft.columns.length}
											move={(to) =>
												update({ ...draft, columns: reordered(draft.columns, index, to) })
											}
										/>
									</div>
								))}
							</Section>
							<QueryBuilder
								fields={type?.fields ?? []}
								relations={definitionOptions.filter(
									(definition): definition is RelationTypeDefinition =>
										definition.kind === 'relation-type',
								)}
								value={draft.query.filter}
								onChange={(filter) =>
									update({ ...draft, query: { ...draft.query, typeId: draft.typeId, filter } })
								}
							/>
							<Select
								label={at('sort')}
								value={draft.query.sort?.fieldId ?? ''}
								options={[
									['', at('none')],
									...(type?.fields ?? []).map((field) => [field.fieldId, field.label] as const),
								]}
								onChange={(fieldId) =>
									update({
										...draft,
										query: {
											...draft.query,
											sort: fieldId
												? { fieldId, direction: draft.query.sort?.direction ?? 'asc' }
												: undefined,
										},
									})
								}
							/>
							<Select
								label={at('direction')}
								value={draft.query.sort?.direction ?? 'asc'}
								options={['asc', 'desc'].map((key) => [key, at(key)])}
								onChange={(direction) => {
									if (draft.query.sort)
										update({
											...draft,
											query: {
												...draft.query,
												sort: { ...draft.query.sort, direction: direction as 'asc' | 'desc' },
											},
										});
								}}
							/>
						</>
					)}
					<JsonDraft
						key={canonical(draft)}
						value={draft}
						apply={(value) => {
							validateDefinition(value, types);
							if (value.id !== draft.id || value.kind !== draft.kind)
								throw new ArchiveError('identity-conflict');
							update(value);
						}}
					/>
					<Section title={at('versions')}>
						<p className="break-all text-xs">
							{at('heads')}: {parents.join(', ') || at('none')}
						</p>
						{parents.length > 1 && (
							<p role="alert" className="text-sm">
								{at('schemaFork')}
							</p>
						)}
						{revisions
							.filter((revision) => revision.definition.id === draft.id)
							.map((revision) => (
								<div
									key={revision.revisionId}
									className="flex flex-wrap items-center justify-between gap-2"
								>
									<code className="break-all text-xs">
										v{revision.displayVersion} · {revision.revisionId}
									</code>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											void load(revision.definition);
										}}
									>
										{at('loadRevision')}
									</Button>
								</div>
							))}
					</Section>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onClick={() => {
								try {
									validateDefinition(draft, types);
									setPreview(application.commands.previewDefinition(draft));
									setError(undefined);
								} catch (error) {
									setError(error);
								}
							}}
						>
							{at('preview')}
						</Button>
						<Button
							disabled={!preview || busy}
							onClick={() => {
								void publish();
							}}
						>
							{at('publish')}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">{at('previewRequired')}</p>
					{preview && (
						<Section title={at('preview')}>
							<p>
								{at('breaking')}: {preview.incompatibleFields.join(', ') || at('none')}
							</p>
							<p>
								{at('affected')}: {preview.affectedIds.length}
							</p>
							{(draft.kind === 'type' || draft.kind === 'relation-type' || draft.kind === 'form') && (
								<>
									<h4 className="text-sm">{at('previewData')}</h4>
									<ValueForm
										fields={draft.kind === 'form' ? (type?.fields ?? []) : draft.fields}
										values={values}
										form={draft.kind === 'form' ? draft : undefined}
										app={app}
										onChange={(id, value) => {
											const next = { ...values };
											if (value === undefined) delete next[id];
											else next[id] = value;
											setValues(next);
										}}
									/>
								</>
							)}
						</Section>
					)}
				</fieldset>
			)}
		</div>
	);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { App } from 'obsidian';
import type { ArchivesApplication } from '../../services/generic/application';
import {
	ArchiveError,
	type EntitySummary,
	type FormSession,
	type PrecisionDate,
	type RelationRecord,
	type RelationResult,
	type RelationTypeDefinition,
	type Values,
} from '../../core/schema/model';
import { copy, digest } from '../../core/schema/value';
import { relationPath } from '../../core/generic/paths';
import { at, ct, Button, ErrorBox, Section, Select, TextField, confirmAt } from './common';
import { ValueForm, displayValue } from './FieldRenderer';
import { UpgradePanel } from './RecoveryPanel';
import { useArchiveVersion } from './hooks';

export function EntityPicker({
	application,
	typeIds,
	label,
	value,
	change,
	disabled = false,
}: {
	application: ArchivesApplication;
	typeIds: readonly string[];
	label: string;
	value: string;
	change(this: void, id: string): void;
	disabled?: boolean;
}) {
	const [search, setSearch] = useState(''),
		[items, setItems] = useState<EntitySummary[]>([]),
		[selected, setSelected] = useState<EntitySummary>(),
		[error, setError] = useState<unknown>();
	const key = typeIds.join('|');
	useEffect(() => {
		let alive = true;
		void Promise.all(
			key
				.split('|')
				.filter(Boolean)
				.map((typeId) =>
					application.query.entities({ typeId, search, states: ['active', 'draft'], limit: 50 }),
				),
		).then(
			(results) => {
				if (alive) setItems(results.flatMap((result) => result.items).slice(0, 150));
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, key, search]);
	useEffect(() => {
		let alive = true;
		void application.query.entity(value).then(
			(record) => {
				if (alive) setSelected(record);
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, value]);
	const choices = selected && !items.some((item) => item.id === selected.id) ? [selected, ...items] : items;
	return (
		<div className="space-y-2">
			<TextField label={`${label} · ${at('search')}`} value={search} onChange={setSearch} readOnly={disabled} />
			<Select
				label={label}
				value={value}
				disabled={disabled}
				options={[
					['', at('none')],
					...choices.map(
						(item) =>
							[item.id, `${item.name} · ${item.typeId} · ${item.id.slice(0, 8)} · ${item.path}`] as const,
					),
					...(value && !choices.some((item) => item.id === value)
						? [[value, `${at('unknownDefinition')} · ${value}`] as const]
						: []),
				]}
				onChange={change}
			/>
			<ErrorBox error={error} />
		</div>
	);
}
function dateValue(value: string): PrecisionDate | undefined {
	return value ? { value, precision: value.length === 7 ? 'month' : 'day' } : undefined;
}
function CreateTarget({
	application,
	app,
	typeIds,
	created,
}: {
	application: ArchivesApplication;
	app: App;
	typeIds: string[];
	created(this: void, id: string): void;
}) {
	const [typeId, setTypeId] = useState(typeIds[0] ?? ''),
		[values, setValues] = useState<Values>({}),
		[error, setError] = useState<unknown>(),
		[busy, setBusy] = useState(false),
		operationId = useRef(crypto.randomUUID());
	const type = application.runtime.index.definition(typeId)?.definition;
	return (
		<Section title={at('newTarget')}>
			<Select
				label={at('type')}
				value={typeId}
				options={application.catalog
					.snapshot()
					.types.filter((type) => type.enabled && typeIds.includes(type.id))
					.map((type) => [type.id, type.label])}
				onChange={(id) => {
					setTypeId(id);
					setValues({});
					operationId.current = crypto.randomUUID();
				}}
			/>
			<ErrorBox error={error} />
			{type?.kind === 'type' && (
				<fieldset disabled={busy}>
					<ValueForm
						fields={type.fields}
						values={values}
						app={app}
						onChange={(id, value) => {
							const next = { ...values };
							if (value === undefined) delete next[id];
							else next[id] = value;
							setValues(next);
						}}
					/>
					<Button
						onClick={() => {
							setBusy(true);
							void application.commands
								.create({ operationId: operationId.current, typeId, values })
								.then((receipt) => created(receipt.id), setError)
								.finally(() => setBusy(false));
						}}
					>
						{at('newTarget')}
					</Button>
				</fieldset>
			)}
		</Section>
	);
}
function RelationEditor({
	application,
	initial,
	type,
	app,
	owner,
	close,
	guard,
}: {
	application: ArchivesApplication;
	initial: FormSession;
	type: RelationTypeDefinition;
	app: App;
	owner: HTMLElement;
	close(this: void): void;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
}) {
	const [session, setSession] = useState(() => copy(initial)),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>(),
		[newTarget, setNewTarget] = useState(false),
		[targetCreated, setTargetCreated] = useState(false),
		current = useRef(session),
		finished = useRef(false),
		alive = useRef(true),
		pending = useRef(Promise.resolve());
	const context = session.relationContext!;
	const persist = useCallback(
		(value: FormSession) => {
			const operation = application.commands.saveDraft(value);
			pending.current = operation;
			void operation.catch((error) => {
				if (alive.current) setError(error);
			});
			return operation;
		},
		[application],
	);
	const leave = useCallback(async () => {
		if (finished.current) return true;
		if (!(await confirmAt(owner, at('dirtyPrompt'), at('keepDraft')))) return false;
		try {
			await persist(current.current);
			return true;
		} catch {
			return false;
		}
	}, [owner, persist]);
	useEffect(() => {
		alive.current = true;
		guard(leave);
		return () => {
			alive.current = false;
			guard(undefined);
		};
	}, [guard, leave]);
	const update = (next: FormSession) => {
		current.current = next;
		setSession(next);
		setError(undefined);
		void persist(next);
	};
	const patch = (values: Partial<NonNullable<FormSession['relationContext']>>) =>
		update({ ...current.current, relationContext: { ...current.current.relationContext!, ...values } });
	const save = async () => {
		setBusy(true);
		setError(undefined);
		try {
			await pending.current.catch(() => {});
			const value = current.current,
				context = value.relationContext!;
			if (value.creating) await application.commands.createRelation({ ...context, values: value.draft });
			else
				await application.commands.updateRelation({
					operationId: context.operationId,
					id: value.entityId,
					expectedHash: context.expectedHash!,
					values: value.draft,
					contextRefs: context.contextRefs,
					validFrom: context.validFrom,
					validTo: context.validTo,
					lifecycle: context.lifecycle,
				});
			finished.current = true;
			await application.commands
				.discardDraft(value.id)
				.catch((error) => console.warn('[HUHU archives draft cleanup]', error));
			close();
		} catch (error) {
			if (alive.current) setError(error);
		} finally {
			if (alive.current) setBusy(false);
		}
	};
	return (
		<Section title={type.label}>
			<ErrorBox error={error} />
			<fieldset disabled={busy} className="space-y-4">
				<EntityPicker
					application={application}
					typeIds={type.sourceTypes}
					label={at('source')}
					value={context.sourceId}
					disabled={!session.creating}
					change={(sourceId) => patch({ sourceId })}
				/>
				<EntityPicker
					application={application}
					typeIds={type.targetTypes}
					label={at('target')}
					value={context.targetId}
					disabled={!session.creating}
					change={(targetId) => patch({ targetId })}
				/>
				{session.creating && (
					<Button variant="outline" onClick={() => setNewTarget(!newTarget)}>
						{at('newTarget')}
					</Button>
				)}
				{newTarget && (
					<CreateTarget
						application={application}
						app={app}
						typeIds={type.targetTypes}
						created={(id) => {
							patch({ targetId: id });
							setNewTarget(false);
							setTargetCreated(true);
						}}
					/>
				)}
				{targetCreated && (
					<p role="status" className="text-sm">
						{at('targetCreated')}
					</p>
				)}
				<div className="grid gap-3 sm:grid-cols-2">
					<TextField
						label={at('validFrom')}
						value={context.validFrom?.value ?? ''}
						onChange={(value) => patch({ validFrom: dateValue(value) })}
					/>
					<TextField
						label={at('validTo')}
						value={context.validTo?.value ?? ''}
						onChange={(value) => patch({ validTo: dateValue(value) })}
					/>
				</div>
				<Select
					label={at('lifecycle')}
					value={context.lifecycle}
					options={['draft', 'active', 'archived'].map((key) => [key, at(key)])}
					onChange={(lifecycle) => patch({ lifecycle: lifecycle as RelationRecord['lifecycle'] })}
				/>
				{type.contextRoles.map((role) => (
					<EntityPicker
						key={role.role}
						application={application}
						typeIds={role.typeIds}
						label={role.label}
						value={context.contextRefs[role.role] ?? ''}
						change={(id) => {
							const contextRefs = { ...context.contextRefs };
							if (id) contextRefs[role.role] = id;
							else delete contextRefs[role.role];
							patch({ contextRefs });
						}}
					/>
				))}
				<ValueForm
					app={app}
					fields={type.fields}
					values={session.draft}
					onChange={(id, value) => {
						const draft = { ...session.draft };
						if (value === undefined) delete draft[id];
						else draft[id] = value;
						update({ ...current.current, draft, dirtyFields: [...new Set([...session.dirtyFields, id])] });
					}}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={() => {
							void save();
						}}
					>
						{ct('save')}
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							void leave().then((allowed) => {
								if (allowed) close();
							});
						}}
					>
						{at('keepDraft')}
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							void confirmAt(owner, at('discardDraft'), at('discardDraft'))
								.then(async (accepted) => {
									if (!accepted) return;
									await pending.current.catch(() => {});
									await application.commands.discardDraft(current.current.id);
									finished.current = true;
									close();
								})
								.catch(setError);
						}}
					>
						{at('discardDraft')}
					</Button>
				</div>
			</fieldset>
		</Section>
	);
}
export function RelationPanel({
	application,
	entity,
	app,
	owner,
	guard,
	open,
}: {
	application: ArchivesApplication;
	entity: EntitySummary;
	app: App;
	owner: HTMLElement;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
	open(this: void, id: string): void;
}) {
	const version = useArchiveVersion(application),
		[result, setResult] = useState<RelationResult>(),
		[typeId, setTypeId] = useState(''),
		[session, setSession] = useState<FormSession>(),
		[upgrade, setUpgrade] = useState<RelationRecord>(),
		[error, setError] = useState<unknown>(),
		[drafts, setDrafts] = useState<FormSession[]>([]);
	useEffect(() => {
		let alive = true;
		void Promise.all([application.query.relations(entity.id), application.commands.drafts()]).then(
			([result, drafts]) => {
				if (alive) {
					setResult(result);
					setDrafts(
						drafts.filter(
							(draft) =>
								draft.relationContext &&
								[draft.relationContext.sourceId, draft.relationContext.targetId].includes(entity.id),
						),
					);
				}
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, entity.id, version, session?.id]);
	const types = application.catalog
		.snapshot()
		.relationTypes.map((revision) => revision.definition)
		.filter(
			(definition): definition is RelationTypeDefinition =>
				definition.kind === 'relation-type' &&
				definition.enabled &&
				(definition.sourceTypes.includes(entity.typeId) || definition.targetTypes.includes(entity.typeId)),
		);
	const begin = async (relation?: RelationRecord, restored?: FormSession) => {
		try {
			if (restored) {
				setSession(restored);
				return;
			}
			if (relation?.legacy) throw new ArchiveError('migration-required');
			const schema = relation
				? await application.query.definition(relation.schemaRevisionId)
				: application.runtime.index.definition(typeId || types[0]?.id || '');
			if (schema?.definition.kind !== 'relation-type') throw new ArchiveError('missing-definition');
			const type = schema.definition,
				id = relation?.id ?? crypto.randomUUID(),
				raw = relation
					? await application.runtime.read(relation.path, application.runtime.context(), true)
					: '';
			setSession({
				id: crypto.randomUUID(),
				entityId: id,
				typeId: type.id,
				schemaRevisionId: schema.revisionId,
				baseHash: await digest(raw),
				baseValues: copy(relation?.values ?? {}),
				baseLifecycle: 'active',
				baseRaw: raw,
				path: relation?.path ?? relationPath(application.runtime.root, type.id, id),
				draft: copy(relation?.values ?? {}),
				dirtyFields: [],
				creating: !relation,
				relationContext: {
					operationId: relation ? crypto.randomUUID() : id,
					relationTypeId: type.id,
					sourceId: relation?.sourceId ?? (type.sourceTypes.includes(entity.typeId) ? entity.id : ''),
					targetId: relation?.targetId ?? (!type.sourceTypes.includes(entity.typeId) ? entity.id : ''),
					contextRefs: copy(relation?.contextRefs ?? {}),
					validFrom: relation?.validFrom,
					validTo: relation?.validTo,
					lifecycle: relation?.lifecycle ?? 'active',
					expectedHash: relation?.contentHash,
				},
			});
		} catch (error) {
			setError(error);
		}
	};
	const currentType = session ? application.runtime.index.schema(session.schemaRevisionId)?.definition : undefined;
	if (session && currentType?.kind === 'relation-type')
		return (
			<RelationEditor
				key={session.id}
				application={application}
				initial={session}
				type={currentType}
				app={app}
				owner={owner}
				guard={guard}
				close={() => setSession(undefined)}
			/>
		);
	return (
		<Section title={at('relations')}>
			<ErrorBox error={error} />
			{result && !result.isComplete && (
				<p role="status" className="text-sm">
					{at('incomplete')}
				</p>
			)}
			{drafts.map((draft) => (
				<Button
					key={draft.id}
					variant="outline"
					onClick={() => {
						void begin(undefined, draft);
					}}
				>
					{at('restoreDraft')} · {draft.typeId}
				</Button>
			))}
			<div className="flex flex-wrap items-end gap-2">
				<Select
					label={at('relation-type')}
					value={typeId || types[0]?.id || ''}
					options={types.map((type) => [type.id, type.label])}
					onChange={setTypeId}
				/>
				<Button
					disabled={!types.length}
					onClick={() => {
						void begin();
					}}
				>
					{at('newRelation')}
				</Button>
			</div>
			{result?.items.map((relation) => {
				const type = application.runtime.index.schema(relation.schemaRevisionId)?.definition,
					forward = relation.sourceId === entity.id,
					otherId = forward ? relation.targetId : relation.sourceId,
					other = application.runtime.index.get(otherId),
					label =
						type?.kind === 'relation-type'
							? forward || !type.directed
								? type.forwardLabel
								: type.inverseLabel
							: relation.relationTypeId;
				const latest = application.runtime.index.definition(relation.relationTypeId);
				return (
					<article key={relation.id} className="space-y-2 rounded-md border p-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="min-w-0">
								<span className="mr-2 text-sm">{label}</span>
								<Button variant="link" onClick={() => open(otherId)}>
									{other?.name ?? otherId}
								</Button>
								<span className="text-xs text-muted-foreground">
									{relation.validFrom?.value}{' '}
									{relation.validTo?.value ? `— ${relation.validTo.value}` : ''} ·{' '}
									{at(relation.lifecycle)}
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									disabled={!!relation.legacy}
									onClick={() => {
										void begin(relation);
									}}
								>
									{ct('edit')}
								</Button>
								{!relation.legacy &&
									latest?.definition.kind === 'relation-type' &&
									latest.revisionId !== relation.schemaRevisionId && (
										<Button variant="outline" onClick={() => setUpgrade(relation)}>
											{at('upgrade')}
										</Button>
									)}
								{!relation.legacy && (
									<Button
										variant="outline"
										onClick={() => {
											void confirmAt(owner, at('deleteRelationPrompt'), at('deleteRelation'))
												.then(async (accepted) => {
													if (accepted)
														await application.commands.updateRelation({
															operationId: crypto.randomUUID(),
															id: relation.id,
															expectedHash: relation.contentHash,
															values: relation.values,
															contextRefs: relation.contextRefs,
															validFrom: relation.validFrom,
															validTo: relation.validTo,
															lifecycle: 'deleted',
														});
												})
												.catch(setError);
										}}
									>
										{at('deleteRelation')}
									</Button>
								)}
							</div>
						</div>
						{upgrade?.id === relation.id && latest?.definition.kind === 'relation-type' && (
							<UpgradePanel
								application={application}
								entity={relation}
								type={latest.definition}
								app={app}
								owner={owner}
								finished={() => setUpgrade(undefined)}
							/>
						)}
						{relation.legacy && <p className="text-xs text-muted-foreground">{at('legacyRelation')}</p>}
						<dl className="grid gap-2 sm:grid-cols-2">
							{Object.entries(relation.values).map(([id, value]) => (
								<div key={id}>
									<dt className="text-xs text-muted-foreground">
										{type?.kind === 'relation-type'
											? (type.fields.find((field) => field.fieldId === id)?.label ?? id)
											: id}
									</dt>
									<dd className="whitespace-pre-wrap break-words text-sm">{displayValue(value)}</dd>
								</div>
							))}
						</dl>
						{Object.entries(relation.contextRefs).map(([role, id]) => (
							<Button key={role} variant="link" onClick={() => open(id)}>
								{role} · {application.runtime.index.get(id)?.name ?? id}
							</Button>
						))}
					</article>
				);
			})}
		</Section>
	);
}

import { PrecisionDateControl } from './PrecisionDateControl';
import {
	displayLabel,
	displayRelationLabel,
	at,
	ct,
	Button,
	ErrorBox,
	Section,
	Select,
	TextField,
	useArchiveConfirm,
} from './common';
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

import { ValueForm, displayValue } from './FieldRenderer';
import { UpgradePanel } from './RecoveryPanel';
import { useArchiveVersion } from './hooks';
import { useT } from '../../../../ui/react/hooks';
import { Notice } from '../../../../ui/components/huhu/Notice';

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
	const t = useT();
	const [search, setSearch] = useState(''),
		[bounds, setBounds] = useState({ pages: 1, count: 0 }),
		[page, setPage] = useState(0),
		[more, setMore] = useState(false),
		[loadedKey, setLoadedKey] = useState<string>(),
		[items, setItems] = useState<EntitySummary[]>([]),
		[selected, setSelected] = useState<EntitySummary>(),
		[error, setError] = useState<unknown>();
	const key = typeIds.join('|');
	const requestKey = JSON.stringify([key, search, page]);
	const loading = loadedKey !== requestKey;
	useEffect(() => {
		let alive = true;
		void Promise.all(
			key
				.split('|')
				.filter(Boolean)
				.map((typeId) =>
					application.query.entities({
						typeId,
						search,
						states: ['active', 'draft'],
						offset: page * 50,
						limit: 50,
					}),
				),
		).then(
			(results) => {
				if (alive) {
					setItems(results.flatMap((result) => result.items));
					setError(undefined);
					setMore(results.some((result) => result.total > (page + 1) * 50));
					setBounds({
						pages: Math.max(1, ...results.map((result) => Math.ceil(result.total / 50))),
						count: results.reduce((sum, result) => sum + result.total, 0),
					});
					setLoadedKey(requestKey);
				}
			},
			(error) => {
				if (alive) {
					setError(error);
					setLoadedKey(requestKey);
				}
			},
		);
		return () => {
			alive = false;
		};
	}, [application, key, search, page, requestKey]);
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
			<TextField
				label={`${label} · ${at('search')}`}
				value={search}
				onChange={(value) => {
					setSearch(value);
					setPage(0);
				}}
				readOnly={disabled}
			/>
			<Select
				label={label}
				value={value}
				disabled={disabled || loading}
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
			<div className="flex gap-2">
				<Button
					variant="secondary"
					disabled={disabled || loading || page === 0}
					onClick={() => setPage((value) => value - 1)}
				>
					{ct('previous')}
				</Button>
				<Button
					variant="secondary"
					disabled={disabled || loading || !more}
					onClick={() => setPage((value) => value + 1)}
				>
					{ct('next')}
				</Button>
				<span role="status">
					{t('contacts.page', { page: page + 1, total: bounds.pages, count: bounds.count })}
				</span>
			</div>
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
					.map((type) => [type.id, displayLabel(type)])}
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
	const confirm = useArchiveConfirm(owner, initial.id);
	useArchiveVersion(application);
	const unavailable =
		!application.runtime.ready ||
		application.runtime.loading ||
		application.runtime.index.diagnostics().some((item) => item.code === 'read-failed');
	const saving = useRef(false);
	const context = session.relationContext!;
	const persist = useCallback(
		(value: FormSession) => {
			const operation = pending.current.catch(() => {}).then(() => application.commands.saveDraft(value));
			pending.current = operation;
			void operation.catch((error) => {
				if (alive.current && current.current === value) setError(error);
			});
			return operation;
		},
		[application],
	);
	const leave = useCallback(async () => {
		if (saving.current) return false;
		if (finished.current) return true;
		if (!(await confirm(at('dirtyPrompt'), at('keepDraft')))) return false;
		try {
			await persist(current.current);
			return alive.current;
		} catch {
			return false;
		}
	}, [confirm, persist]);
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
		if (saving.current || unavailable) return;
		saving.current = true;
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
			if (alive.current) close();
		} catch (error) {
			if (alive.current) setError(error);
		} finally {
			saving.current = false;
			if (alive.current) setBusy(false);
		}
	};
	return (
		<Section title={displayLabel(type)}>
			<ErrorBox error={error} />
			{unavailable && <Notice tone="warning" title={at('incomplete')} />}
			<fieldset disabled={busy || unavailable} className="space-y-4">
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
					<Button variant="secondary" onClick={() => setNewTarget(!newTarget)}>
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
				<div className="grid gap-3 @min-[560px]:grid-cols-2">
					<PrecisionDateControl
						label={at('validFrom')}
						value={context.validFrom?.value ?? ''}
						onChange={(value) => patch({ validFrom: dateValue(value) })}
					/>
					<PrecisionDateControl
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
						label={displayLabel(role)}
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
						variant="secondary"
						onClick={() => {
							void leave().then((allowed) => {
								if (allowed && alive.current) close();
							});
						}}
					>
						{at('keepDraft')}
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							void confirm(at('discardDraft'), at('discardDraft'))
								.then(async (accepted) => {
									if (!accepted || !alive.current) return;
									const discarded = current.current.id;
									await pending.current.catch(() => {});
									await application.commands.discardDraft(discarded);
									if (!alive.current || current.current.id !== discarded) return;
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
	const confirm = useArchiveConfirm(owner, entity.id);
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
	const [editorSnapshot, setEditorSnapshot] = useState<{ id: string; type: RelationTypeDefinition }>();
	if (session && editorSnapshot?.id !== session.id) {
		const definition = application.runtime.index.schema(session.schemaRevisionId)?.definition;
		if (definition?.kind === 'relation-type') setEditorSnapshot({ id: session.id, type: definition });
	}
	const currentType = editorSnapshot?.id === session?.id ? editorSnapshot?.type : undefined;
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
				close={() => setSession((current) => (current?.id === session.id ? undefined : current))}
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
					variant="secondary"
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
					options={types.map((type) => [type.id, displayLabel(type)])}
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
								? displayRelationLabel(type, true)
								: displayRelationLabel(type, false)
							: relation.relationTypeId;
				const latest = application.runtime.index.definition(relation.relationTypeId);
				return (
					<article key={relation.id} className="space-y-2 rounded-md border p-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="min-w-0">
								<span className="mr-2 text-sm">{label}</span>
								<Button variant="ghost" onClick={() => open(otherId)}>
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
									variant="secondary"
									onClick={() => {
										void begin(relation);
									}}
								>
									{ct('edit')}
								</Button>
								{latest?.definition.kind === 'relation-type' &&
									latest.revisionId !== relation.schemaRevisionId && (
										<Button variant="secondary" onClick={() => setUpgrade(relation)}>
											{at('upgrade')}
										</Button>
									)}
								<Button
									variant="secondary"
									onClick={() => {
										void confirm(at('deleteRelationPrompt'), at('deleteRelation'))
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
						<dl className="grid gap-2 @min-[560px]:grid-cols-2">
							{Object.entries(relation.values).map(([id, value]) => (
								<div key={id}>
									<dt className="text-xs text-muted-foreground">
										{type?.kind === 'relation-type'
											? displayLabel(
													type.fields.find((field) => field.fieldId === id),
													id,
												)
											: id}
									</dt>
									<dd className="whitespace-pre-wrap break-words text-sm">{displayValue(value)}</dd>
								</div>
							))}
						</dl>
						{Object.entries(relation.contextRefs).map(([role, id]) => (
							<Button key={role} variant="ghost" onClick={() => open(id)}>
								{role} · {application.runtime.index.get(id)?.name ?? id}
							</Button>
						))}
					</article>
				);
			})}
		</Section>
	);
}

import {
	displayLabel,
	at,
	ct,
	Button,
	Check,
	ErrorBox,
	Input,
	Section,
	Select,
	TextField,
	useArchiveConfirm,
} from './common';
import { VISIBLE_NAMES } from '../../../../shared/storage/vault-layout';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { App } from 'obsidian';
import { openNoteAt } from '../../../../host/obsidian/open-note';
import { useT } from '../../../../ui/react/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../ui/components/table';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import type { ArchivesApplication } from '../../services/generic/application';
import {
	ArchiveError,
	type EntityQuery,
	type EntitySummary,
	type ArchiveTypeDefinition,
	type FormSession,
	type FormTemplate,
	type QueryResult,
} from '../../core/schema/model';
import { copy, digest } from '../../core/schema/value';
import { entityPath, underRoot } from '../../core/generic/paths';

import { displayValue, RecordValues } from './FieldRenderer';
import { ArchiveCardGrid } from '../ArchiveCardGrid';
import { RecordEditor } from './RecordEditor';
import { RelationPanel } from './RelationPanel';
import { Diagnostics, UpgradePanel } from './RecoveryPanel';
import { QueryBuilder } from './QueryBuilder';
import { useArchiveVersion } from './hooks';
import type { ArchivePageState } from './page-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../ui/components/tabs';
import { SegmentedControl } from '../../../../ui/components/huhu/SegmentedControl';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Notice } from '../../../../ui/components/huhu/Notice';
import { Skeleton } from '../../../../ui/components/skeleton';
import { RevisionPanel } from './RevisionPanel';
import { displayFields } from './display-fields';

function recordTime(value: number | undefined): string {
	return value !== undefined && value > 0 && Number.isFinite(new Date(value).getTime())
		? new Date(value).toLocaleString() : at('unknownTime');
}

const PersonReadingPage = lazy(() => import('../person/PersonReadingPage'));

export function Resources({
	application,
	entity,
	app,
	owner,
}: {
	application: ArchivesApplication;
	entity: EntitySummary;
	app: App;
	owner: HTMLElement;
}) {
	const [search, setSearch] = useState(''),
		[offset, setOffset] = useState(0),
		[noteName, setNoteName] = useState(''),
		[error, setError] = useState<unknown>(),
		[busy, setBusy] = useState(false),
		[revision, setRevision] = useState(0),
		input = useRef<HTMLInputElement>(null);
	const version = useArchiveVersion(application),
		alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const unavailable =
		!application.runtime.ready ||
		application.runtime.loading ||
		application.catalog.snapshot().diagnostics.some((item) => item.code === 'read-failed');
	const [snapshot, setSnapshot] = useState<{
		id: string;
		key: string;
		items: ReturnType<typeof application.entities.resources>;
	}>();
	const key = version + ':' + revision;
	let items: ReturnType<typeof application.entities.resources> = [],
		resourceError: unknown;
	try {
		items = application.entities.resources(entity.id);
		if (!unavailable && (snapshot?.key !== key || snapshot.id !== entity.id))
			setSnapshot({ id: entity.id, key, items });
	} catch (error) {
		resourceError = error;
		if (unavailable && snapshot?.id === entity.id) items = snapshot.items;
	}
	const resources = items.filter((item) =>
		item.relativePath.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
	);
	const open = async (path: string) => {
		const file = app.vault.getFileByPath(path);
		if (file) await openNoteAt(app, file, { owner: owner.ownerDocument.defaultView ?? undefined });
	};
	return (
		<Section title={at('resources')}>
			<ErrorBox error={error ?? (unavailable ? undefined : resourceError)} />
			{unavailable && <Notice tone="warning" title={at('staleResults')} />}
			<Input
				aria-label={ct('searchResources')}
				placeholder={ct('searchResources')}
				value={search}
				onChange={(event) => {
					setSearch(event.target.value);
					setOffset(0);
				}}
			/>
			<div className="flex flex-wrap items-end gap-2">
				<TextField label={at('newNoteName')} value={noteName} onChange={setNoteName} />
				<Button
					variant="secondary"
					disabled={busy || unavailable || !noteName.trim()}
					onClick={() => {
						setBusy(true);
						void application.entities
							.createNote({ operationId: crypto.randomUUID(), id: entity.id, name: noteName, body: '' })
							.then(async (receipt) => {
								if (!alive.current) return;
								setNoteName('');
								setRevision((value) => value + 1);
								await open(receipt.path);
							}, setError)
							.finally(() => {
								if (alive.current) setBusy(false);
							});
					}}
				>
					{at('newNote')}
				</Button>
				<Button variant="secondary" disabled={busy || unavailable} onClick={() => input.current?.click()}>
					{at('import')}
				</Button>
				<input
					ref={input}
					type="file"
					disabled={busy || unavailable}
					multiple
					className="sr-only"
					aria-label={at('import')}
					onChange={(event) => {
						const files = Array.from(event.target.files ?? []);
						event.target.value = '';
						if (!files.length) return;
						setBusy(true);
						void application.entities
							.importResources(
								entity.id,
								files.map((file) => ({ name: file.name, read: () => file.arrayBuffer() })),
							)
							.then((results) => {
								if (!alive.current) return;
								setRevision((value) => value + 1);
								const failed = results.filter((result) => result.error);
								if (failed.length)
									setError(
										new ArchiveError(
											'import-partial',
											failed.map((result) => `${result.name}: ${result.error}`).join('\n'),
										),
									);
							}, setError)
							.finally(() => {
								if (alive.current) setBusy(false);
							});
					}}
				/>
			</div>
			<div className="space-y-1">
				{resources
					.slice(
						Math.min(offset, Math.max(0, Math.ceil(resources.length / 60) - 1) * 60),
						Math.min(offset, Math.max(0, Math.ceil(resources.length / 60) - 1) * 60) + 60,
					)
					.map((resource) => (
						<div
							key={resource.path}
							data-resource-path={resource.path}
							className="flex flex-wrap items-center justify-between gap-2"
						>
							<Button
								variant="ghost"
								onClick={() => {
									void open(resource.path).catch(setError);
								}}
							>
								{resource.relativePath}
							</Button>
							<span className="text-xs text-muted-foreground">{resource.size.toLocaleString()} B</span>
						</div>
					))}
			</div>
			<div className="flex gap-2">
				<Button
					variant="secondary"
					disabled={!offset}
					onClick={() => setOffset((value) => Math.max(0, value - 60))}
				>
					{ct('previous')}
				</Button>
				<Button
					variant="secondary"
					disabled={offset + 60 >= resources.length}
					onClick={() => setOffset((value) => value + 60)}
				>
					{ct('next')}
				</Button>
				<span className="self-center text-xs">{resources.length}</span>
			</div>
		</Section>
	);
}
export function ArchivePage({
	host,
	app,
	owner,
	state,
	updateState,
	navigate,
	guard,
}: {
	host: GenericArchivesHost;
	app: App;
	owner: HTMLElement;
	state: ArchivePageState;
	updateState(this: void, value: Partial<ArchivePageState>): void;
	navigate(this: void, section?: string, resourceId?: string): Promise<void>;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
}) {
	useT();
	const confirm = useArchiveConfirm(owner, state.selectedId);
	const [detailTab, setDetailTab] = useState('fields');
	const lifecycle = useRef({ request: 0, mounted: true });
	useEffect(() => {
		const current = lifecycle.current;
		current.mounted = true;
		return () => {
			current.mounted = false;
			current.request++;
		};
	}, []);
	const childLeave = useRef<(() => Promise<boolean>) | undefined>(undefined);
	const detailGuard = useCallback(
		(callback: (() => Promise<boolean>) | undefined) => {
			childLeave.current = callback;
			guard(callback);
		},
		[guard],
	);
	const application = host.application,
		version = useArchiveVersion(application),
		liveCatalog = application.catalog.snapshot(),
		catalogKey = JSON.stringify([
			version,
			liveCatalog.types.map((type) => [type.id, type.revisionId, type.count, type.enabled]),
			[...liveCatalog.forms, ...liveCatalog.views, ...liveCatalog.templates, ...liveCatalog.relationTypes].map(
				(revision) => revision.revisionId,
			),
		]),
		[catalogSnapshot, setCatalogSnapshot] = useState(() => ({ key: catalogKey, catalog: liveCatalog })),
		[result, setResult] = useState<QueryResult>(),
		[queryLoading, setQueryLoading] = useState(true),
		[staleResults, setStaleResults] = useState(false),
		[selectedRecord, setSelected] = useState<EntitySummary>(),
		[recordSnapshot, setRecordSnapshot] = useState<{ entity: EntitySummary; type: ArchiveTypeDefinition }>(),
		[error, setError] = useState<unknown>(),
		[session, setSession] = useState<FormSession>(),
		[drafts, setDrafts] = useState<FormSession[]>([]),
		[templateId, setTemplateId] = useState(''),
		[showUpgrade, setShowUpgrade] = useState(false),
		[busy, setBusy] = useState(false),
		[generation, setGeneration] = useState(0);
	// A rescan replaces the index before revisions arrive. Keep the same person's editor mounted.
	const recovering =
		!application.runtime.ready ||
		application.runtime.loading ||
		application.runtime.index.diagnostics().some((item) => item.code === 'read-failed');
	const catalog = recovering ? catalogSnapshot.catalog : liveCatalog;
	if (!recovering && catalogSnapshot.key !== catalogKey)
		setCatalogSnapshot({ key: catalogKey, catalog: liveCatalog });
	const selected =
		selectedRecord ??
		(recordSnapshot && recordSnapshot.entity.id === state.selectedId ? recordSnapshot.entity : undefined);
	const view = catalog.views.find((item) => item.definition.id === state.section)?.definition,
		viewDefinition = view?.kind === 'view' ? view : undefined;
	const typeId =
		viewDefinition?.typeId ??
		(catalog.types.some((type) => type.id === state.section) ? state.section : undefined) ??
		(state.section ? undefined : catalog.types.find((type) => type.enabled)?.id);
	const liveSchema = typeId ? application.runtime.index.definition(typeId) : undefined;
	const [schemaSnapshot, setSchemaSnapshot] = useState(liveSchema);
	if (!recovering && liveSchema && liveSchema.revisionId !== schemaSnapshot?.revisionId)
		setSchemaSnapshot(liveSchema);
	const schema = liveSchema ?? (recovering && schemaSnapshot?.definition.id === typeId ? schemaSnapshot : undefined),
		type = schema?.definition.kind === 'type' ? schema.definition : undefined;
	useEffect(() => setTemplateId(type?.defaultTemplateId ?? ''), [typeId, type?.defaultTemplateId]);
	const query: EntityQuery = {
		...viewDefinition?.query,
		typeId,
		search: state.search || viewDefinition?.query.search,
		offset: state.offset,
		limit: 50,
		filter:
			state.filter && viewDefinition?.query.filter
				? { all: [viewDefinition.query.filter, state.filter] }
				: (state.filter ?? viewDefinition?.query.filter),
		sort: state.sort ?? viewDefinition?.query.sort,
		states: state.states ?? viewDefinition?.query.states,
	};
	const queryKey = JSON.stringify(query),
		selectedId = state.selectedId;
	const resultQuery = useRef<string | null>(null);
	useEffect(() => {
		let alive = true;
		setQueryLoading(true);
		if (resultQuery.current !== queryKey) {
			setResult(undefined);
			setStaleResults(false);
		}
		void application.query.entities(JSON.parse(queryKey) as EntityQuery).then(
			(value) => {
				if (alive) {
					if (value.diagnostics.some((item) => item.code === 'read-failed')) {
						if (resultQuery.current === queryKey) setStaleResults(true);
						else {
							setResult(undefined);
							resultQuery.current = null;
							setStaleResults(false);
						}
						setError(new ArchiveError('read-failed'));
					} else {
						setResult(value);
						resultQuery.current = queryKey;
						setStaleResults(false);
						setError(undefined);
					}
					setQueryLoading(false);
				}
			},
			(error) => {
				if (alive) {
					setError(error);
					if (resultQuery.current === queryKey) setStaleResults(true);
					else {
						setResult(undefined);
						resultQuery.current = null;
						setStaleResults(false);
					}
					setQueryLoading(false);
				}
			},
		);
		return () => {
			alive = false;
		};
	}, [application, version, queryKey]);
	useEffect(() => {
		let alive = true;
		void application.query.entity(selectedId ?? '').then(
			(value) => {
				if (alive) {
					setSelected(value);
					if (
						!value &&
						application.runtime.ready &&
						!application.runtime.loading &&
						!application.catalog.snapshot().diagnostics.some((item) => item.code === 'read-failed')
					)
						setRecordSnapshot(undefined);
					const definition = value
						? application.runtime.index.schema(value.schemaRevisionId)?.definition
						: undefined;
					if (value && definition?.kind === 'type') setRecordSnapshot({ entity: value, type: definition });
				}
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, version, selectedId]);
	useEffect(() => {
		let alive = true;
		void application.commands.drafts().then(
			(value) => {
				if (alive) setDrafts(value.filter((draft) => !draft.relationContext));
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, generation, version]);
	// Navigation owns the editor lifetime. Drafts are never serialized into workspace state.
	const previousTarget = useRef(`${state.section}:${state.selectedId}`);
	useEffect(() => {
		const target = `${state.section}:${state.selectedId}`;
		if (target !== previousTarget.current) {
			previousTarget.current = target;
			lifecycle.current.request++;
			setBusy(false);
			setSession(undefined);
			setShowUpgrade(false);
		}
	}, [state.section, state.selectedId]);
	const begin = async (restored?: FormSession) => {
		const request = ++lifecycle.current.request;
		setBusy(true);
		const current = () => lifecycle.current.mounted && request === lifecycle.current.request;
		try {
			if (restored) {
				if (current()) setSession(restored);
				return;
			}
			if (selectedId) {
				const session = await application.commands.beginEdit(selectedId);
				if (current()) setSession(session);
				return;
			}
			if (!type || !schema) throw new ArchiveError('missing-or-forked-definition');
			const id = crypto.randomUUID(),
				template = catalog.templates.find((item) => item.definition.id === templateId)?.definition;
			const defaults = template?.kind === 'template' ? copy(template.defaults) : {};
			const next: FormSession = {
				id: crypto.randomUUID(),
				entityId: id,
				typeId: type.id,
				schemaRevisionId: schema.revisionId,
				baseHash: await digest(''),
				baseRaw: '',
				baseValues: {},
				baseLifecycle: 'draft',
				path: entityPath(application.runtime.root, type.folder, VISIBLE_NAMES.untitled, id),
				draft: defaults,
				dirtyFields: Object.keys(defaults),
				creating: true,
				templateId,
			};
			await application.commands.saveDraft(next);
			if (current()) setSession(next);
		} catch (error) {
			if (current()) setError(error);
		} finally {
			if (current()) setBusy(false);
		}
	};
	const open = useCallback(
		(id: string) => {
			void navigate(undefined, id).catch(setError);
		},
		[navigate],
	);
	const closeEditor = () => {
		setSession(undefined);
		setGeneration((value) => value + 1);
	};
	const [editorSnapshot, setEditorSnapshot] = useState<{
		id: string;
		type: ArchiveTypeDefinition;
		forms: FormTemplate[];
	}>();
	if (session && editorSnapshot?.id !== session.id) {
		const definition = application.runtime.index.schema(session.schemaRevisionId)?.definition;
		if (definition?.kind === 'type')
			setEditorSnapshot({
				id: session.id,
				type: definition,
				forms: catalog.forms
					.map((item) => item.definition)
					.filter(
						(definition): definition is FormTemplate =>
							definition.kind === 'form' && definition.typeId === session.typeId,
					),
			});
	}
	const editorType = editorSnapshot?.id === session?.id ? editorSnapshot?.type : undefined;
	if (session && editorType?.kind === 'type')
		return (
			<RecordEditor
				key={session.id}
				initial={session}
				application={application}
				type={editorType}
				forms={editorSnapshot?.forms ?? []}
				owner={owner}
				app={app}
				guard={guard}
				committed={(receipt) => {
					guard(undefined);
					closeEditor();
					void navigate(session.typeId, receipt.id).catch(setError);
				}}
				cancel={() => {
					setSession((current) => (current?.id === session.id ? undefined : current));
					setGeneration((value) => value + 1);
				}}
			/>
		);
	if (session)
		return (
			<>
				<p role="alert">{at('unknownDefinition')}</p>
				<Button variant="secondary" onClick={closeEditor}>
					{ct('back')}
				</Button>
			</>
		);
	const selectedSchema = selected
			? application.runtime.index.schema(selected.schemaRevisionId)?.definition
			: undefined,
		currentType = selected ? application.runtime.index.definition(selected.typeId) : undefined;
	const selectedType =
		selectedSchema?.kind === 'type'
			? selectedSchema
			: recovering &&
				  recordSnapshot &&
				  recordSnapshot.entity.id === selectedId &&
				  selected?.schemaRevisionId === recordSnapshot.entity.schemaRevisionId
				? recordSnapshot.type
				: undefined;
	const readSource = async (path: string) => {
		if (!underRoot(application.runtime.root, path)) return;
		const file = app.vault.getFileByPath(path);
		if (file) await openNoteAt(app, file, { owner: owner.ownerDocument.defaultView ?? undefined });
	};
	if (selectedId && selected && selectedType && selected.typeId === 'type-person')
		return (
			<Suspense fallback={<p role="status">{ct('loading')}</p>}>
				<ErrorBox
					error={
						recovering && error instanceof ArchiveError && error.code === 'read-failed' ? undefined : error
					}
				/>
				<PersonReadingPage
					key={selected.id}
					application={application}
					entity={selected}
					type={selectedType}
					app={app}
					owner={owner}
					guard={guard}
					back={() => {
						void navigate(state.section).catch(setError);
					}}
					edit={() => {
						void begin();
					}}
					open={open}
					source={() => {
						void readSource(selected.path).catch(setError);
					}}
					resources={
						<>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="secondary"
									disabled={busy}
									onClick={() => {
										setBusy(true);
										void application.commands
											.impact(selected.id)
											.then(async (impact) => {
												if (
													!(await confirm(
														`${at('impact')}: ${at('relations')} ${impact.relations}, ${at('contextRoles')} ${impact.contexts}, ${at('resources')} ${impact.attachments}, ${at('reminder')} ${impact.reminders}`,
														at(selected.lifecycle === 'archived' ? 'activate' : 'archive'),
													))
												)
													return;
												await application.commands.setState({
													operationId: crypto.randomUUID(),
													id: selected.id,
													expectedHash: impact.contentHash,
													lifecycle:
														selected.lifecycle === 'archived' ? 'active' : 'archived',
												});
											})
											.catch(setError)
											.finally(() => setBusy(false));
									}}
								>
									{at(selected.lifecycle === 'archived' ? 'activate' : 'archive')}
								</Button>
								{currentType?.definition.kind === 'type' &&
									currentType.revisionId !== selected.schemaRevisionId && (
										<Button variant="secondary" onClick={() => setShowUpgrade(!showUpgrade)}>
											{at('upgrade')}
										</Button>
									)}
							</div>
							{drafts
								.filter((draft) => !draft.creating && draft.entityId === selected.id)
								.map((draft) => (
									<Button
										key={draft.id}
										variant="secondary"
										onClick={() => {
											void begin(draft);
										}}
									>
										{at('restoreDraft')}
									</Button>
								))}
							{showUpgrade && currentType?.definition.kind === 'type' && (
								<UpgradePanel
									application={application}
									entity={selected}
									type={currentType.definition}
									app={app}
									owner={owner}
									finished={() => setShowUpgrade(false)}
								/>
							)}
							<Resources application={application} entity={selected} app={app} owner={owner} />
						</>
					}
					actions={
						host.newReminder ? (
							<Button variant="secondary" onClick={() => host.newReminder?.(selected)}>
								{at('reminder')}
							</Button>
						) : undefined
					}
				/>
			</Suspense>
		);
	if (selectedId)
		return (
			<div className="space-y-4">
				<Button
					variant="secondary"
					onClick={() => {
						void navigate(state.section).catch(setError);
					}}
				>
					{ct('back')}
				</Button>
				<ErrorBox error={error} />
				{selected ? (
					<>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<h2 className="break-words text-2xl font-semibold">{selected.name}</h2>
								<p className="break-all text-xs text-muted-foreground">
									{selected.id} · {at(selected.lifecycle)} · {selected.schemaRevisionId}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									disabled={!selectedType || busy || recovering}
									onClick={() => {
										void begin();
									}}
								>
									{ct('edit')}
								</Button>
								<Button
									variant="secondary"
									onClick={() => {
										void readSource(selected.path).catch(setError);
									}}
								>
									{at('openRaw')}
								</Button>
								{host.newReminder && (
									<Button variant="secondary" onClick={() => host.newReminder?.(selected)}>
										{at('reminder')}
									</Button>
								)}
								<Button
									variant="secondary"
									disabled={busy}
									onClick={() => {
										setBusy(true);
										void application.commands
											.impact(selected.id)
											.then(async (impact) => {
												if (
													!(await confirm(
														`${at('impact')}: ${at('relations')} ${impact.relations}, ${at('contextRoles')} ${impact.contexts}, ${at('resources')} ${impact.attachments}, ${at('reminder')} ${impact.reminders}`,
														at(selected.lifecycle === 'archived' ? 'activate' : 'archive'),
													))
												)
													return;
												await application.commands.setState({
													operationId: crypto.randomUUID(),
													id: selected.id,
													expectedHash: impact.contentHash,
													lifecycle:
														selected.lifecycle === 'archived' ? 'active' : 'archived',
												});
											})
											.catch(setError)
											.finally(() => setBusy(false));
									}}
								>
									{at(selected.lifecycle === 'archived' ? 'activate' : 'archive')}
								</Button>
								{currentType?.definition.kind === 'type' &&
									currentType.revisionId !== selected.schemaRevisionId && (
										<Button variant="secondary" onClick={() => setShowUpgrade(!showUpgrade)}>
											{at('upgrade')}
										</Button>
									)}
							</div>
						</div>
						{result && !result.items.some((item) => item.id === selected.id) && (
							<p className="text-xs text-muted-foreground">{at('selectedOutside')}</p>
						)}
						{drafts
							.filter((draft) => !draft.creating && draft.entityId === selected.id)
							.map((draft) => (
								<Button
									key={draft.id}
									variant="secondary"
									onClick={() => {
										void begin(draft);
									}}
								>
									{at('restoreDraft')}
								</Button>
							))}
						<Diagnostics items={selected.diagnostics} app={app} owner={owner} />
						{showUpgrade && currentType?.definition.kind === 'type' && (
							<UpgradePanel
								application={application}
								entity={selected}
								type={currentType.definition}
								app={app}
								owner={owner}
								finished={() => setShowUpgrade(false)}
							/>
						)}
						<Tabs
							value={detailTab}
							onValueChange={(value) => {
								void (async () => {
									if (!childLeave.current || (await childLeave.current())) setDetailTab(value);
								})().catch(setError);
							}}
						>
							<TabsList className="max-w-full overflow-x-auto">
								<TabsTrigger value="fields">{at('fields')}</TabsTrigger>
								<TabsTrigger value="relations">{at('relations')}</TabsTrigger>
								<TabsTrigger value="revisions">{at('revisions')}</TabsTrigger>
								<TabsTrigger value="resources">{at('resources')}</TabsTrigger>
							</TabsList>
							<TabsContent value="fields">
								{selectedType ? (
									<Section title={at('fields')}>
										<RecordValues type={selectedType} values={selected.values} app={app} path={selected.path} />
									</Section>
								) : (
									<p role="alert">{at('unknownDefinition')}</p>
								)}
							</TabsContent>
							<TabsContent value="relations">
								<RelationPanel
									key={selected.id}
									application={application}
									entity={selected}
									owner={owner}
									app={app}
									guard={detailGuard}
									open={open}
								/>
							</TabsContent>
							<TabsContent value="revisions">
								<RevisionPanel
									application={application}
									typeId={selected.typeId}
									currentRevision={selected.schemaRevisionId}
								/>
							</TabsContent>
							<TabsContent value="resources">
								<Resources application={application} entity={selected} app={app} owner={owner} />
							</TabsContent>
						</Tabs>
					</>
				) : (
					<>
						<p role="status">{application.runtime.loading ? ct('loading') : ct('missing')}</p>
						<Button
							variant="secondary"
							onClick={() => {
								void readSource(selectedId).catch(setError);
							}}
						>
							{at('openRaw')}
						</Button>
						<Diagnostics
							items={catalog.diagnostics.filter(
								(item) => item.id === selectedId || item.path === selectedId,
							)}
							app={app}
							owner={owner}
						/>
					</>
				)}
			</div>
		);
	if (state.section && !typeId)
		return (
			<Notice
				tone="error"
				title={at('unknownDefinition')}
				action={
					<Button
						variant="secondary"
						onClick={() => {
							void navigate('archive-recovery').catch(setError);
						}}
					>
						{at('recovery')}
					</Button>
				}
			/>
		);

	const layout =
			state.layout ??
			viewDefinition?.layout ??
			(host.settings.get().layouts[typeId ?? ''] === 'card' ? 'card' : 'table'),
		columns = (viewDefinition?.columns ?? (type ? displayFields(type) : []))
			.filter((id) => id !== type?.nameFieldId);
	return (
		<div data-archive-list aria-busy={queryLoading} className="space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-xl font-semibold">{displayLabel(viewDefinition ?? type, at('type'))}</h2>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="secondary"
						onClick={() => {
							void navigate('archive-designer').catch(setError);
						}}
					>
						{at('designer')}
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							void navigate('archive-recovery').catch(setError);
						}}
					>
						{at('recovery')}
					</Button>
					<Button
						disabled={!type?.enabled || recovering}
						onClick={() => {
							void begin();
						}}
					>
						{at('newRecord')}
					</Button>
				</div>
			</div>
			<ErrorBox error={error} />
			{queryLoading && !result && (
				<div role="status" aria-label={ct('loading')} className="space-y-3">
					{[0, 1, 2].map((id) => (
						<Skeleton key={id} className="h-[var(--hu-list-row-h)] w-full" />
					))}
				</div>
			)}
			{(staleResults || !liveCatalog.isComplete) && (
				<Notice
					tone="warning"
					title={at(staleResults ? 'staleResults' : 'incomplete')}
					action={
						<Button
							variant="secondary"
							disabled={queryLoading}
							onClick={() => {
								void application.runtime.reload().catch(setError);
							}}
						>
							{ct('retry')}
						</Button>
					}
				/>
			)}
			{drafts
				.filter((draft) => draft.creating && draft.typeId === typeId)
				.map((draft) => (
					<Button
						key={draft.id}
						variant="secondary"
						onClick={() => {
							void begin(draft);
						}}
					>
						{at('restoreDraft')} · {displayValue(draft.draft[type?.nameFieldId ?? ''] ?? draft.entityId)}
					</Button>
				))}
			<div className="grid gap-3 @min-[560px]:grid-cols-2">
				<Input
					aria-label={at('search')}
					placeholder={at('search')}
					value={state.search}
					onChange={(event) => updateState({ search: event.target.value, offset: 0 })}
				/>
				<SegmentedControl
					ariaLabel={at('layout')}
					value={layout}
					options={(['table', 'card'] as const).map((value) => ({ value, label: at(value) }))}
					onChange={(layout) => {
						updateState({ layout });
						if (typeId)
							void host.settings
								.update((settings) => {
									settings.layouts[typeId] = layout === 'card' ? 'card' : 'list';
								})
								.catch(setError);
					}}
				/>
				<Select
					label={at('template')}
					value={templateId}
					options={[
						['', at('none')],
						...catalog.templates
							.filter((item) => item.definition.kind === 'template' && item.definition.typeId === typeId)
							.map((item) => [item.definition.id, displayLabel(item.definition)] as const),
					]}
					onChange={setTemplateId}
				/>
				<Select
					label={at('sort')}
					value={state.sort?.fieldId ?? viewDefinition?.query.sort?.fieldId ?? ''}
					options={[
						['', at('none')],
						...(type?.fields ?? []).map((field) => [field.fieldId, displayLabel(field)] as const),
					]}
					onChange={(fieldId) =>
						updateState({
							sort: fieldId ? { fieldId, direction: state.sort?.direction ?? 'asc' } : undefined,
							offset: 0,
						})
					}
				/>
			</div>
			<details className="rounded-md border p-3">
				<summary className="flex min-h-[var(--hu-hit)] cursor-pointer items-center text-sm">
					{at('filter')}
				</summary>
				<div className="mt-3 space-y-3">
					<div className="flex flex-wrap gap-3">
						{(['active', 'draft', 'archived'] as const).map((value) => (
							<Check
								key={value}
								label={at(value)}
								checked={(state.states ?? ['active', 'draft']).includes(value)}
								onChange={(checked) => {
									const states = checked
										? [...(state.states ?? ['active', 'draft']), value]
										: (state.states ?? ['active', 'draft']).filter((item) => item !== value);
									updateState({ states: states.length ? states : undefined, offset: 0 });
								}}
							/>
						))}
						<Select
							label={at('direction')}
							value={state.sort?.direction ?? 'asc'}
							options={['asc', 'desc'].map((key) => [key, at(key)])}
							onChange={(direction) => {
								if (state.sort)
									updateState({
										sort: { ...state.sort, direction: direction as 'asc' | 'desc' },
										offset: 0,
									});
							}}
						/>
					</div>
					<QueryBuilder
						fields={type?.fields ?? []}
						relations={catalog.relationTypes.flatMap((item) =>
							item.definition.kind === 'relation-type' ? [item.definition] : [],
						)}
						value={state.filter}
						onChange={(filter) => updateState({ filter, offset: 0 })}
					/>
					<Button
						variant="secondary"
						onClick={() =>
							updateState({
								filter: undefined,
								states: undefined,
								sort: undefined,
								search: '',
								offset: 0,
							})
						}
					>
						{at('clear')}
					</Button>
				</div>
			</details>
			{result ? (
				<>
					<p className="text-sm text-muted-foreground">
						{at('total')}: {result.total}
						{!result.isComplete ? ` · ${at('incomplete')}` : ''}
					</p>
					{result.total === 0 && result.isComplete ? (
						<EmptyState
							title={ct(
								state.search || state.filter || viewDefinition?.query.filter ? 'noResults' : 'empty',
							)}
							action={
								<Button
									variant="secondary"
									onClick={() => {
										if (state.search || state.filter)
											updateState({ search: '', filter: undefined, offset: 0 });
										else void begin();
									}}
									disabled={!type?.enabled || recovering}
								>
									{state.search || state.filter ? at('clear') : at('newRecord')}
								</Button>
							}
						/>
					) : layout === 'table' ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{displayLabel(
											type?.fields.find((field) => field.fieldId === type.nameFieldId),
											at('label'),
										)}
									</TableHead>
									{columns.map((id) => (
										<TableHead key={id}>
											{displayLabel(
												type?.fields.find((field) => field.fieldId === id),
												id,
											)}
										</TableHead>
									))}
									<TableHead>{at('createdAt')}</TableHead>
									<TableHead>{at('updatedAt')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.items.map((item) => (
									<TableRow key={item.path} data-path={item.path}>
										<TableCell>
											<Button
												variant="ghost"
												className="h-auto min-h-[var(--hu-ctl-h)] max-w-full justify-start whitespace-normal break-words text-left"
												onClick={() => open(item.id)}
											>
												{item.name}
											</Button>
										</TableCell>
										{columns.map((id) => (
											<TableCell key={id} className="max-w-64 whitespace-pre-wrap break-words">
												{displayValue(item.values[id])}
											</TableCell>
										))}
										<TableCell>{recordTime(item.createdAt)}</TableCell>
										<TableCell>{recordTime(item.modified)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<ArchiveCardGrid columns={host.settings.get().maxColumns}>
							{result.items.map((item) => (
								<article
									key={item.path}
									data-path={item.path}
									className="space-y-2 rounded-lg border bg-card p-4"
								>
									<Button
										variant="ghost"
										className="h-auto min-h-[var(--hu-ctl-h)] whitespace-normal break-words text-lg"
										onClick={() => open(item.id)}
									>
										{item.name}
									</Button>
									{columns.map((id) => (
										<div key={id}>
											<div className="text-xs text-muted-foreground">
												{displayLabel(
													type?.fields.find((field) => field.fieldId === id),
													id,
												)}
											</div>
											<div className="whitespace-pre-wrap break-words text-sm">
												{displayValue(item.values[id])}
											</div>
										</div>
									))}
									<dl className="space-y-1 text-xs text-muted-foreground">
										<div><dt>{at('createdAt')}</dt><dd>{recordTime(item.createdAt)}</dd></div>
										<div><dt>{at('updatedAt')}</dt><dd>{recordTime(item.modified)}</dd></div>
									</dl>
								</article>
							))}
						</ArchiveCardGrid>
					)}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<Button
							variant="secondary"
							disabled={state.offset === 0}
							onClick={() => updateState({ offset: Math.max(0, state.offset - 50) })}
						>
							{ct('previous')}
						</Button>
						<span className="text-sm">
							{Math.floor(state.offset / 50) + 1} / {Math.max(1, Math.ceil(result.total / 50))}
						</span>
						<Button
							variant="secondary"
							disabled={state.offset + 50 >= result.total}
							onClick={() => updateState({ offset: state.offset + 50 })}
						>
							{ct('next')}
						</Button>
					</div>
				</>
			) : (
				!error && <p role="status">{ct('loading')}</p>
			)}
		</div>
	);
}

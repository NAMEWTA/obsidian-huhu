import { useCallback, useEffect, useRef, useState } from 'react';
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
	type FormSession,
	type FormTemplate,
	type QueryResult,
} from '../../core/schema/model';
import { copy, digest } from '../../core/schema/value';
import { entityPath, underRoot } from '../../core/generic/paths';
import { at, ct, Button, Check, ErrorBox, Input, Section, Select, TextField, confirmAt } from './common';
import { displayValue, RecordValues } from './FieldRenderer';
import { ArchiveCardGrid } from '../ArchiveCardGrid';
import { RecordEditor } from './RecordEditor';
import { RelationPanel } from './RelationPanel';
import { Diagnostics, UpgradePanel } from './RecoveryPanel';
import { QueryBuilder } from './QueryBuilder';
import { useArchiveVersion } from './hooks';
import type { ArchivePageState } from './page-state';

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
	void revision; // Local attachment imports invalidate the render without mutating the archive entity.
	let resources: ReturnType<typeof application.entities.resources> = [],
		resourceError: unknown;
	try {
		resources = application.entities
			.resources(entity.id)
			.filter((item) => item.relativePath.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
	} catch (error) {
		resourceError = error;
	}
	const open = async (path: string) => {
		const file = app.vault.getFileByPath(path);
		if (file) await openNoteAt(app, file, { owner: owner.ownerDocument.defaultView ?? undefined });
	};
	return (
		<Section title={at('resources')}>
			<ErrorBox error={error ?? resourceError} />
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
					variant="outline"
					disabled={busy || !noteName.trim()}
					onClick={() => {
						setBusy(true);
						void application.entities
							.createNote({ operationId: crypto.randomUUID(), id: entity.id, name: noteName, body: '' })
							.then(async (receipt) => {
								setNoteName('');
								setRevision((value) => value + 1);
								await open(receipt.path);
							}, setError)
							.finally(() => setBusy(false));
					}}
				>
					{at('newNote')}
				</Button>
				<Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>
					{at('import')}
				</Button>
				<input
					ref={input}
					type="file"
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
							.finally(() => setBusy(false));
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
								variant="link"
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
					variant="outline"
					disabled={!offset}
					onClick={() => setOffset((value) => Math.max(0, value - 60))}
				>
					{ct('previous')}
				</Button>
				<Button
					variant="outline"
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
	const application = host.application,
		version = useArchiveVersion(application),
		catalog = application.catalog.snapshot(),
		[result, setResult] = useState<QueryResult>(),
		[selected, setSelected] = useState<EntitySummary>(),
		[error, setError] = useState<unknown>(),
		[session, setSession] = useState<FormSession>(),
		[drafts, setDrafts] = useState<FormSession[]>([]),
		[templateId, setTemplateId] = useState(''),
		[showUpgrade, setShowUpgrade] = useState(false),
		[busy, setBusy] = useState(false),
		[generation, setGeneration] = useState(0);
	const view = catalog.views.find((item) => item.definition.id === state.section)?.definition,
		viewDefinition = view?.kind === 'view' ? view : undefined;
	const typeId =
		viewDefinition?.typeId ??
		(catalog.types.some((type) => type.id === state.section) ? state.section : undefined) ??
		catalog.types.find((type) => type.enabled)?.id;
	const schema = typeId ? application.runtime.index.definition(typeId) : undefined,
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
	useEffect(() => {
		let alive = true;
		void application.query.entities(JSON.parse(queryKey) as EntityQuery).then(
			(value) => {
				if (alive) {
					setResult(value);
					setError(undefined);
				}
			},
			(error) => {
				if (alive) setError(error);
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
				if (alive) setSelected(value);
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
			setSession(undefined);
			setShowUpgrade(false);
		}
	}, [state.section, state.selectedId]);
	const begin = async (restored?: FormSession) => {
		try {
			if (restored) {
				setSession(restored);
				return;
			}
			if (selectedId) {
				setSession(await application.commands.beginEdit(selectedId));
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
				path: entityPath(application.runtime.root, type.folder, type.label, id),
				draft: defaults,
				dirtyFields: Object.keys(defaults),
				creating: true,
				templateId,
			};
			await application.commands.saveDraft(next);
			setSession(next);
		} catch (error) {
			setError(error);
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
	const editorType = session ? application.runtime.index.schema(session.schemaRevisionId)?.definition : undefined;
	if (session && editorType?.kind === 'type')
		return (
			<RecordEditor
				key={session.id}
				initial={session}
				application={application}
				type={editorType}
				forms={catalog.forms
					.map((item) => item.definition)
					.filter(
						(definition): definition is FormTemplate =>
							definition.kind === 'form' && definition.typeId === session.typeId,
					)}
				owner={owner}
				app={app}
				guard={guard}
				committed={(receipt) => {
					guard(undefined);
					closeEditor();
					void navigate(session.typeId, receipt.id).catch(setError);
				}}
				cancel={closeEditor}
			/>
		);
	if (session)
		return (
			<>
				<p role="alert">{at('unknownDefinition')}</p>
				<Button variant="outline" onClick={closeEditor}>
					{ct('back')}
				</Button>
			</>
		);
	const selectedSchema = selected
			? application.runtime.index.schema(selected.schemaRevisionId)?.definition
			: undefined,
		currentType = selected ? application.runtime.index.definition(selected.typeId) : undefined;
	const selectedType = selectedSchema?.kind === 'type' ? selectedSchema : undefined;
	const readSource = async (path: string) => {
		if (!underRoot(application.runtime.root, path)) return;
		const file = app.vault.getFileByPath(path);
		if (file) await openNoteAt(app, file, { owner: owner.ownerDocument.defaultView ?? undefined });
	};
	if (selectedId)
		return (
			<div className="space-y-4">
				<Button
					variant="outline"
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
									disabled={!selectedType || busy}
									onClick={() => {
										void begin();
									}}
								>
									{ct('edit')}
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										void readSource(selected.path).catch(setError);
									}}
								>
									{at('openRaw')}
								</Button>
								{host.newReminder && (
									<Button variant="outline" onClick={() => host.newReminder?.(selected)}>
										{at('reminder')}
									</Button>
								)}
								{selected.format === 2 && (
									<Button
										variant="outline"
										disabled={busy}
										onClick={() => {
											setBusy(true);
											void application.commands
												.impact(selected.id)
												.then(async (impact) => {
													if (
														!(await confirmAt(
															owner,
															`${at('impact')}: ${at('relations')} ${impact.relations}, ${at('contextRoles')} ${impact.contexts}, ${at('resources')} ${impact.attachments}, ${at('reminder')} ${impact.reminders}`,
															at(
																selected.lifecycle === 'archived'
																	? 'activate'
																	: 'archive',
															),
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
								)}
								{selected.format === 1 ? (
									<Button
										variant="outline"
										onClick={() => {
											void navigate('archive-recovery').catch(setError);
										}}
									>
										{at('migrate')}
									</Button>
								) : currentType?.definition.kind === 'type' &&
								  currentType.revisionId !== selected.schemaRevisionId ? (
									<Button variant="outline" onClick={() => setShowUpgrade(!showUpgrade)}>
										{at('upgrade')}
									</Button>
								) : null}
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
									variant="outline"
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
						{selectedType ? (
							<Section title={at('fields')}>
								<RecordValues type={selectedType} values={selected.values} />
							</Section>
						) : (
							<p role="alert">{at('unknownDefinition')}</p>
						)}
						<RelationPanel
							key={selected.id}
							application={application}
							entity={selected}
							owner={owner}
							app={app}
							guard={guard}
							open={open}
						/>
						<Resources application={application} entity={selected} app={app} owner={owner} />
					</>
				) : (
					<>
						<p role="status">{application.runtime.loading ? ct('loading') : ct('missing')}</p>
						<Button
							variant="outline"
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
	const layout =
			state.layout ??
			viewDefinition?.layout ??
			(host.settings.get().layouts[typeId ?? ''] === 'card' ? 'card' : 'table'),
		columns = (
			viewDefinition?.columns ??
			type?.fields
				.filter((field) => !field.archived)
				.slice(0, 5)
				.map((field) => field.fieldId) ??
			[]
		).filter((id) => id !== type?.nameFieldId);
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-xl font-semibold">{viewDefinition?.label ?? type?.label ?? at('type')}</h2>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={() => {
							void navigate('archive-designer').catch(setError);
						}}
					>
						{at('designer')}
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							void navigate('archive-recovery').catch(setError);
						}}
					>
						{at('recovery')}
					</Button>
					<Button
						disabled={!type?.enabled || application.runtime.loading}
						onClick={() => {
							void begin();
						}}
					>
						{at('newRecord')}
					</Button>
				</div>
			</div>
			<ErrorBox error={error} />
			{!catalog.isComplete && (
				<p role="status" className="text-sm text-muted-foreground">
					{at('incomplete')}
				</p>
			)}
			{drafts
				.filter((draft) => draft.creating && draft.typeId === typeId)
				.map((draft) => (
					<Button
						key={draft.id}
						variant="outline"
						onClick={() => {
							void begin(draft);
						}}
					>
						{at('restoreDraft')} · {displayValue(draft.draft[type?.nameFieldId ?? ''] ?? draft.entityId)}
					</Button>
				))}
			<div className="grid gap-3 sm:grid-cols-2">
				<Input
					aria-label={at('search')}
					placeholder={at('search')}
					value={state.search}
					onChange={(event) => updateState({ search: event.target.value, offset: 0 })}
				/>
				<Select
					label={at('layout')}
					value={layout}
					options={['table', 'card'].map((key) => [key, at(key)])}
					onChange={(layout) => {
						updateState({ layout: layout as 'table' | 'card' });
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
							.map((item) => [item.definition.id, item.definition.label] as const),
					]}
					onChange={setTemplateId}
				/>
				<Select
					label={at('sort')}
					value={state.sort?.fieldId ?? viewDefinition?.query.sort?.fieldId ?? ''}
					options={[
						['', at('none')],
						...(type?.fields ?? []).map((field) => [field.fieldId, field.label] as const),
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
				<summary className="cursor-pointer text-sm">{at('filter')}</summary>
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
						variant="outline"
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
					{layout === 'table' ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{type?.fields.find((field) => field.fieldId === type.nameFieldId)?.label ??
											at('label')}
									</TableHead>
									{columns.map((id) => (
										<TableHead key={id}>
											{type?.fields.find((field) => field.fieldId === id)?.label ?? id}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.items.map((item) => (
									<TableRow key={item.path} data-path={item.path}>
										<TableCell>
											<Button variant="link" onClick={() => open(item.id)}>
												{item.name}
											</Button>
										</TableCell>
										{columns.map((id) => (
											<TableCell key={id} className="max-w-64 whitespace-pre-wrap break-words">
												{displayValue(item.values[id])}
											</TableCell>
										))}
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
										variant="link"
										className="h-auto whitespace-normal break-words text-lg"
										onClick={() => open(item.id)}
									>
										{item.name}
									</Button>
									{columns.map((id) => (
										<div key={id}>
											<div className="text-xs text-muted-foreground">
												{type?.fields.find((field) => field.fieldId === id)?.label ?? id}
											</div>
											<div className="whitespace-pre-wrap break-words text-sm">
												{displayValue(item.values[id])}
											</div>
										</div>
									))}
								</article>
							))}
						</ArchiveCardGrid>
					)}
					<div className="flex items-center justify-between gap-3">
						<Button
							variant="outline"
							disabled={state.offset === 0}
							onClick={() => updateState({ offset: Math.max(0, state.offset - 50) })}
						>
							{ct('previous')}
						</Button>
						<span className="text-sm">
							{Math.floor(state.offset / 50) + 1} / {Math.max(1, Math.ceil(result.total / 50))}
						</span>
						<Button
							variant="outline"
							disabled={state.offset + 50 >= result.total}
							onClick={() => updateState({ offset: state.offset + 50 })}
						>
							{ct('next')}
						</Button>
					</div>
				</>
			) : (
				<p role="status">{ct('loading')}</p>
			)}
		</div>
	);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Choice } from '../../../ui/components/huhu/Choice';
import type { ArchivesCatalog, ArchivesCommands, ArchivesQuery, ArchiveCatalogSnapshot, ArchiveQuerySnapshot, ArchiveFormSnapshot, ArchiveEditBase } from '../api';
import { textHash } from '../../../shared/storage/text-edits';
import { ArchiveDraftOwner } from '../services/form-drafts';
import { useArchiveDraft } from './use-archive-draft';
import type { ArchiveEntity } from '../api';
import { ArchiveTypeDesigner } from './ArchiveTypeDesigner';
import { ArchiveRelations } from './ArchiveRelations';
import { DefinitionDiagnostics } from './DefinitionDiagnostics';
import { ArchiveMigration } from './ArchiveMigration';
import { ArchiveEntityForm } from './ArchiveEntityForm';
import { archiveDisplayValue } from './field-renderers';
import { errorText } from './forms';
import { ct } from './labels';

export interface ArchiveUiServices { catalog: ArchivesCatalog; commands: ArchivesCommands; query: ArchivesQuery }
/** T19's page-local entry uses the public services. Type tree and persisted dynamic routing remain owned by T23. */
export function ArchiveWorkspace({ services, settings = false, onClose, registerLeave, drafts, draftScope = "workspace", initialPath }: {
	initialPath?: string;
	services: ArchiveUiServices; drafts?: ArchiveDraftOwner; draftScope?: string; settings?: boolean; onClose?: () => void;
	registerLeave?: (check: (() => Promise<boolean>) | undefined) => void;
}) {
	const [localOwner] = useState(() => new ArchiveDraftOwner());
	const owner = drafts ?? localOwner, scope = draftScope;
	const [catalog, setCatalog] = useState<ArchiveCatalogSnapshot>({ types: [], diagnostics: [] }),
		[query, setQuery] = useState<ArchiveQuerySnapshot>({ entities: [], diagnostics: [], isComplete: true }),
		[typeId, setTypeId] = useArchiveDraft(owner, scope + '/view/type', () => ''), [section, setSection] = useArchiveDraft<'records' | 'design' | 'migration'>(owner, scope + '/view/section', () => settings ? 'design' : 'records'),
		[forms, setForms] = useState<ArchiveFormSnapshot>(), [creatingType, setCreatingType] = useArchiveDraft(owner, scope + '/view/creating', () => false),
		[session, setSession] = useArchiveDraft<{ key: string; forms: ArchiveFormSnapshot; base?: ArchiveEditBase } | undefined>(owner, scope + '/view/session', () => undefined),
		[search, setSearch] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true),
		[formError, setFormError] = useState(''), [busyState, setBusyState] = useState(false), [refresh, setRefresh] = useState(0), [leaveRequest, setLeaveRequest] = useState(false), [dirtyState, setDirtyState] = useState(false);
	const [entityMigrationBusy] = useArchiveDraft(owner, scope + '/migration/' + (session?.base?.entity.id ?? '') + '/busy', () => false);
	const parts = useRef({ entityDirty: false, relationDirty: false, entityBusy: false, relationBusy: false, migrationBusy: false }), initialOpened = useRef(false);
	const dirty = useRef(false), busy = useRef(false), leaveResolver = useRef<((value: boolean) => void) | undefined>(undefined),
		request = useRef(0), selection = useRef(0), formLoaded = useRef(false);
	useEffect(() => {
		registerLeave?.(() => {
			if (busy.current) return Promise.resolve(false);
			if (!dirty.current) { onClose?.(); return Promise.resolve(true); }
			setLeaveRequest(true);
			return new Promise<boolean>((resolve) => { leaveResolver.current?.(false); leaveResolver.current = resolve; });
		});
		return () => { registerLeave?.(undefined); leaveResolver.current?.(false); };
	}, [registerLeave, onClose]);
	useEffect(() => {
		let active = true;
		const load = async () => {
			const token = ++request.current; setLoading(true);
			try {
				const [nextCatalog, nextQuery] = await Promise.all([services.catalog.snapshot(), services.query.snapshot()]);
				if (!active || token !== request.current) return;
				setCatalog(nextCatalog); setQuery(nextQuery); setError('');
				setTypeId((previous) => previous || nextCatalog.types.find((type) => !type.legacy)?.typeId || nextCatalog.types[0]?.typeId || '');
			} catch (failure) { if (active && token === request.current) setError(errorText(failure)); }
			finally { if (active && token === request.current) setLoading(false); }
		};
		void load(); const off = services.query.subscribe(() => void load());
		return () => { active = false; off(); };
	}, [services, refresh, setTypeId]);
	useEffect(() => {
		if (!typeId || (dirty.current && formLoaded.current)) return;
		const token = ++selection.current;
		let active = true;
		void services.catalog.forms(typeId).then((value) => { if (active && token === selection.current) { formLoaded.current = true; setForms(value); setFormError(''); } })
			.catch((failure: unknown) => { if (active && token === selection.current) { setFormError(errorText(failure)); } });
		return () => { active = false; };
	}, [services, typeId, refresh]);
	const setBusy = (value: boolean) => { busy.current = value; setBusyState(value); };
	const setDirty = (value: boolean) => { dirty.current = value; setDirtyState(value); };
	const exit = () => { parts.current = { entityDirty: false, relationDirty: false, entityBusy: false, relationBusy: false, migrationBusy: false }; if (session) owner.clearScope(scope + '/entity/' + session.key); setDirty(false); setSession(undefined); setRefresh((value) => value + 1); };
	const open = useCallback(async (entity?: ArchiveEntity) => {
		const requestedType = entity?.typeId ?? typeId;
		if (!requestedType) return;
		setError(''); busy.current = true;
		try {
			const nextForms = await services.catalog.forms(requestedType, entity?.schemaRevisionId);
			const base = entity ? entity.readOnly ? { entity, schemaContentHash: nextForms.type.contentHash, contentHash: await textHash(entity.raw) }
				: await services.commands.beginEdit(entity.id) : undefined;
			if (base && base.entity.schemaRevisionId !== nextForms.type.revisionId) throw new Error(ct('definitionConflict'));
			dirty.current = false; setDirtyState(false); setSession({ key: crypto.randomUUID(), forms: nextForms, base });
		} catch (failure) { setError(errorText(failure)); }
		finally { busy.current = false; }
	}, [services, typeId, setSession]);
	useEffect(() => {
		if (initialOpened.current || loading || !initialPath || session) return;
		initialOpened.current = true;
		const entity = query.entities.find((entity) => entity.path === initialPath);
		if (entity) { setTypeId(entity.typeId); void open(entity); }
	}, [initialPath, loading, query, session, open, setTypeId]);
	const fieldDirty = (value: boolean) => { parts.current.entityDirty = value; setDirty(value || parts.current.relationDirty); };
	const relationDirty = (value: boolean) => { parts.current.relationDirty = value; setDirty(value || parts.current.entityDirty); };
	const fieldBusy = (value: boolean) => { parts.current.entityBusy = value; setBusy(value || parts.current.relationBusy || parts.current.migrationBusy); };
	const relationBusy = (value: boolean) => { parts.current.relationBusy = value; setBusy(value || parts.current.entityBusy || parts.current.migrationBusy); };
	const migrationBusy = (value: boolean) => { parts.current.migrationBusy = value; setBusy(value || parts.current.entityBusy || parts.current.relationBusy); };
	const confirmDiscard = (discard: boolean) => {
		setLeaveRequest(false); leaveResolver.current?.(discard); leaveResolver.current = undefined;
		if (discard) { owner.clearScope(scope); setDirty(false); setSession(undefined); onClose?.(); }
	};
	const type = catalog.types.find((type) => type.typeId === typeId);
	const entities = query.entities.filter((entity) => entity.typeId === typeId && (!search || JSON.stringify(entity.values).toLocaleLowerCase().includes(search.toLocaleLowerCase())));
	return <div className="@container mx-auto w-full max-w-6xl space-y-6 p-4 @3xl:p-8 [&_[data-slot=select-trigger]]:min-h-11 [&_input]:min-h-11">
		{leaveRequest && <div role="alert" className="space-y-3 rounded-md border border-border p-4"><p>{ct('unsavedForm')}</p><div className="flex flex-wrap gap-2"><Button onClick={() => confirmDiscard(false)}>{ct('keepEditing')}</Button><Button variant="outline" disabled={busyState} onClick={() => confirmDiscard(true)}>{ct('discardDraft')}</Button></div></div>}
		{session ? <ArchiveEntityForm externalBusy={entityMigrationBusy || parts.current.migrationBusy} drafts={owner} draftScope={scope + "/entity/" + session.key} key={session.key} snapshot={session.forms} base={session.base} commands={services.commands} onSaved={() => setRefresh((value) => value + 1)} onLeave={exit}
			onDirty={fieldDirty} onBusy={fieldBusy} relations={(entity) => <><ArchiveMigration services={services} entity={entity} entities={query.entities} drafts={owner} scope={scope + '/migration/' + entity.id} blocked={dirtyState || parts.current.entityBusy || parts.current.relationBusy} onBusy={migrationBusy} onChanged={(receipt) => { exit(); setTypeId(receipt.phase === 'rolled-back' ? entity.typeId.replace(/^type-/, '') : entity.formatVersion === 1 ? 'type-' + entity.typeId : entity.typeId); }} /><fieldset disabled={entityMigrationBusy || parts.current.migrationBusy}><ArchiveRelations services={services} entity={entity} drafts={owner} scope={scope + "/relations/" + entity.id} onDirty={relationDirty} onBusy={relationBusy} /></fieldset></>} /> : <>
			<header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{ct(section === 'migration' ? 'legacyMigration' : section === 'design' ? 'typesAndForms' : 'allArchiveTypes')}</h1>
				<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={dirtyState || busyState} onClick={() => setSection(section === 'migration' ? 'records' : 'migration')}>{ct(section === 'migration' ? 'viewArchives' : 'legacyMigration')}</Button>{onClose && <Button className="min-h-11" variant="outline" disabled={busyState} onClick={() => { if (dirty.current) setLeaveRequest(true); else onClose(); }}>{ct('back')}</Button>}
					<Button className="min-h-11" variant="outline" disabled={dirtyState || busyState} onClick={() => { setSection(section === 'design' ? 'records' : 'design'); setCreatingType(false); }}>{ct(section === 'design' ? 'viewArchives' : 'typesAndForms')}</Button>
					<Button className="min-h-11" disabled={dirtyState || busyState} onClick={() => { setFormError(''); setCreatingType(true); setSection('design'); }}>{ct('newType')}</Button></div></header>
			{!creatingType && !!catalog.types.length && <Choice label={ct('archiveType')} value={typeId} options={catalog.types.map((type) => [type.typeId, type.label])} disabled={dirtyState || busyState}
				onChange={(next) => { setTypeId(next); formLoaded.current = false; setForms(undefined); setSearch(''); }} />}
			{(error || formError) && <div role="alert" className="space-y-2 rounded-md border border-destructive p-3 text-destructive"><p>{error || formError}</p><Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>{ct('retry')}</Button></div>}
			{loading && <p role="status">{ct('loading')}</p>}
			{(section === 'design' || section === 'migration') && <DefinitionDiagnostics services={services} />}
			{section === 'migration' ? <ArchiveMigration services={services} entities={query.entities} drafts={owner} scope={scope + '/migration'} onBusy={setBusy} onChanged={() => setRefresh(value => value + 1)} /> : section === 'design' ? <fieldset disabled={!!formError}><ArchiveTypeDesigner drafts={owner} draftScope={scope} snapshot={forms} commands={services.commands} catalog={services.catalog} creating={creatingType} onCancel={() => { setDirty(false); setCreatingType(false); formLoaded.current = false; setForms(undefined); setRefresh((value) => value + 1); }}
				onCreated={(next) => { setDirty(false); formLoaded.current = false; setForms(undefined); setCreatingType(false); setTypeId(next); setRefresh((value) => value + 1); }} onPublished={(value) => { setForms(value); setRefresh((previous) => previous + 1); }} onDirty={setDirty} onBusy={setBusy} /></fieldset> : <>
				<div className="flex flex-wrap items-center justify-between gap-3"><Input type="search" className="min-w-40 flex-1" aria-label={ct('searchArchives')} value={search} onChange={(event) => setSearch(event.target.value)} />
					<Button className="min-h-11" disabled={!forms || !!forms.blockedReason || !!formError || loading || busyState} onClick={() => void open()}>{ct('newArchive')}</Button></div>
				<div role="list" className="divide-y divide-border rounded-md border border-border">{entities.map((entity) => <Button key={entity.id + entity.path} variant="ghost" className="min-h-11 w-full justify-start gap-3 rounded-none" onClick={() => void open(entity)}>
					<span className="truncate">{archiveDisplayValue(entity.values[type?.titleFieldId ?? 'name'])}</span><span className="truncate text-xs text-muted-foreground">{entity.readOnly ? entity.path : ""}</span><span className="text-xs text-muted-foreground">{entity.readOnly ? ct('readOnlyArchive') : ''}</span>
				</Button>)}</div>
				{!entities.length && !loading && <p role="status" className="text-muted-foreground">{ct(search ? 'noResults' : 'empty')}</p>}
				{search && !entities.length && <Button variant="outline" onClick={() => setSearch('')}>{ct('clear')}</Button>}
			</>}
			{!!query.diagnostics.length && <section aria-label={ct('archiveDiagnostics')} className="space-y-3"><h2 className="text-lg font-semibold">{ct('archiveDiagnostics')}</h2>{query.diagnostics.map((item, index) => <details key={item.path + index} className="rounded-md border border-border p-3">
				<summary className="cursor-pointer text-sm">{item.path} · {ct(item.code)}{item.detail ? ' · ' + item.detail : ''}</summary><pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{item.raw}</pre>
			</details>)}</section>}
		</>}
	</div>;
}

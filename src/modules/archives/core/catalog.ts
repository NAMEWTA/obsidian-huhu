import type { AutomationDefinition } from '../../../shared/automation/types';
import { patchReminders, readReminders } from './reminders';
import { textHash } from '../../../shared/storage/text-edits';
import { validContactsFolder } from '../../../shared/contacts-settings';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import type { ContactsFile, ContactsFiles } from './files';
import { ContactsError, cloneRecord, type ArchiveRecord } from './model';
import { validateFieldDefinitions, validateFieldValue, nativePropertyKind, storedPropertyKind } from './field-codecs';
import { legacyArchiveTypes, legacyArchiveEntity, type LegacyArchiveCreator } from './legacy-adapter';
import { archiveLocation, safeArchiveName } from './resources';
import { parseRecord } from './persist/markdown';
import { patchYamlValues } from './persist/yaml-values';
import { ArchiveFormStore } from './form-store';
import { DefinitionGraph, DefinitionPublicationError, type DefinitionState } from './definition-graph';
import { RelationRepository } from './relation-store';
import { ArchiveMigrationStore } from './migration-store';
import { migrationAuthority, legacyMigrationState } from './migration-authority';
import type { ArchiveFormSnapshot, PublishArchiveForms } from './form-definitions';
import { completeFields, readEntityMarkdown, patchEntityMarkdown } from './persist/v2/patch';
import { archiveFrontmatter, archiveMarkdown, createEntityMarkdown, entityValues } from './persist/v2/markdown';
import type {
	ArchiveCatalogSnapshot,
	ArchiveCreateReceipt,
	ArchiveDiagnostic,
	ArchiveEntity,
	ArchiveField,
	ArchiveQuerySnapshot,
	ArchiveTypeDefinition,
	CreateArchiveEntity,
	PublishArchiveType,
	ArchiveEditBase,
	ArchiveUpdateReceipt,
	UpdateArchiveEntity,
} from './schema';

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const definitionRoot = '档案定义/类型';
interface DefinitionProof {
	file: ContactsFile;
	raw: string;
	mtime: number;
	size: number;
	version: number;
}
export function validateArchiveType(input: PublishArchiveType): void {
	if (
		!input ||
		typeof input.typeId !== 'string' ||
		!idPattern.test(input.typeId) ||
		typeof input.label !== 'string' ||
		!input.label.trim() ||
		typeof input.folder !== 'string' ||
		safeArchiveName(input.folder) !== input.folder ||
		['档案定义', '关联记录', '迁移记录', '迁移恢复'].includes(input.folder)
	)
		throw new ContactsError('invalidDefinition');
	validateFieldDefinitions(input.fields);
	if (!input.fields.some((field) => field.fieldId === input.titleFieldId && field.codec === 'text'))
		throw new ContactsError('invalidDefinition');
}
function definitionContent(definition: Omit<ArchiveTypeDefinition, 'contentHash'>): string {
	return canonicalJson({
		typeId: definition.typeId,
		label: definition.label,
		folder: definition.folder,
		titleFieldId: definition.titleFieldId,
		fields: definition.fields,
		revisionId: definition.revisionId,
		parentRevisionIds: definition.parentRevisionIds,
		displayVersion: definition.displayVersion,
	});
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => a.localeCompare(b, 'en'))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
			.join(',')}}`;
	return JSON.stringify(value);
}

function entityPath(root: string, path: string): boolean {
	if (!path.startsWith(`${root}/`)) return false;
	const parts = path.slice(root.length + 1).split('/');
	return (
		parts.length >= 3 &&
		parts.at(-1) === '基本信息.md' &&
		!['档案定义', '关联记录', '迁移记录', '迁移恢复'].includes(parts[0]!)
	);
}

/** Owns the generic archive protocol using the same Vault port and write queue as legacy forms. Reads never publish or migrate. */
export class ArchiveRepository {
	private active = true;
	private dirty = true;
	private version = 0;
	private mutationGeneration = 0;
	private revisions: ArchiveTypeDefinition[] = [];
	private definitionProofs = new Map<string, DefinitionProof>();
	private loadedRoot = '';
	private types: ArchiveTypeDefinition[] = [];
	private entities: ArchiveEntity[] = [];
	private diagnostics: ArchiveDiagnostic[] = [];
	private unknownIdentityPaths: string[] = [];
	private occupiedIds = new Set<string>();
	private listeners = new Set<() => void>();
	private readonly formStore: ArchiveFormStore;
	readonly relations: RelationRepository;
	readonly graph: DefinitionGraph;
	private typeStates = new Map<string, DefinitionState>();
	readonly migrations: ArchiveMigrationStore;
	constructor(
		private files: ContactsFiles,
		private getRoot: () => string,
		private queue: WriteQueue,
		private createLegacy: LegacyArchiveCreator,
		private saveLegacy: (base: ArchiveRecord, draft: ArchiveRecord, beforeCommit?: () => void) => Promise<ArchiveRecord>,
	) {
		this.graph = new DefinitionGraph(files, getRoot, root => this.guard(root), () => this.mutationGeneration);
		this.relations = new RelationRepository(files, queue, getRoot, (root) => this.guard(root), (migrationScope) => this.provedSnapshot(migrationScope), () => this.mutationGeneration, () => this.invalidate(), (fields, root) => this.checkPropertyMappings({ typeId: 'relation', label: 'Relation', folder: 'Relations', titleFieldId: '', fields }, root), async () => (await this.catalog()).types.map((type) => type.typeId), this.graph);
		this.migrations = new ArchiveMigrationStore(files, queue, getRoot, (root) => this.guard(root), () => this.mutationGeneration, () => this.invalidate(), this.relations, () => this.catalog(), (scope) => this.provedSnapshot(scope), (type, root) => this.checkPropertyMappings(type, root), this.graph);
		this.formStore = new ArchiveFormStore(files, queue, getRoot, (root) => this.guard(root), (type) => this.captureType(type), () => this.invalidate(), () => this.mutationGeneration, this.graph);
	}
	private async provedSnapshot(migrationScope?: ReadonlySet<string>): Promise<ArchiveQuerySnapshot & { proofs: Array<{ file: ContactsFile; path: string; raw: string; mtime: number; size: number }> }> {
			this.dirty = true; this.version++;
			const snapshot = await this.snapshot();
			const proofs = [...this.definitionProofs.values()].map((proof) => ({ ...proof, path: proof.file.path }));
            if (!migrationScope) return { ...snapshot, proofs };
            const root = this.getRoot();
            for (const file of this.files.getMarkdownFiles().filter(file => entityPath(root, file.path))) {
                let raw: string; try { raw = await this.files.read(file); } catch { return { ...snapshot, isComplete: false, proofs, diagnostics: [...snapshot.diagnostics, { path: file.path, code: 'identityUnverified' }] }; }
                const proof = { file, path: file.path, mtime: file.stat.mtime, size: file.stat.size, raw, version: this.version };
                const known = snapshot.entities.some(entity => entity.path === file.path && entity.raw === proof.raw) || snapshot.diagnostics.some(item => item.path === file.path && item.raw === proof.raw);
                if (/^['"]?huhu-type['"]?:/m.test(proof.raw) && !known) return { ...snapshot, isComplete: false, proofs, diagnostics: [...snapshot.diagnostics, { path: file.path, code: 'identityUnverified' }] };
                proofs.push(proof);
            }
            const isComplete = !this.unknownIdentityPaths.length && snapshot.diagnostics.every(item => {
                if (item.severity === 'warning') return true;
                if (item.definitionFamily) return !snapshot.entities.some(entity => migrationScope.has(entity.id) && entity.typeId === item.definitionId);
                const entity = snapshot.entities.find(entity => entity.path === item.path && entity.id === item.entityId);
                return !!entity && idPattern.test(entity.id) && !migrationScope.has(entity.id) && ['nameRequired', 'invalidField'].includes(item.code);
            });
            this.guard(root); return { ...snapshot, isComplete, proofs };

	}

	invalidate(): void {
		this.version++;
		this.mutationGeneration++;
		this.dirty = true;
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (error) {
				console.error('[HUHU archives listener]', error);
			}
		}
	}
	dispose(): void {
		this.active = false;
		this.types = [];
		this.entities = [];
		this.listeners.clear();
	}
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	private guard(root = this.getRoot()): void {
		if (!this.active) throw new ContactsError('disabled');
		if (!validContactsFolder(root) || root !== this.getRoot()) throw new ContactsError('folderChanged');
	}
	private async load(): Promise<void> {
		const root = this.getRoot(),
			version = this.version;
		this.guard(root);
		if (!this.dirty && this.loadedRoot === root) return;
		await this.files.ready();
		this.guard(root);
		const revisions: ArchiveTypeDefinition[] = [],
			types: ArchiveTypeDefinition[] = [],
			pointers: Array<{ path: string; raw: string; typeId: string; revisionId: string }> = [],
			entities: ArchiveEntity[] = [],
			diagnostics: ArchiveDiagnostic[] = [];
		const unknownIdentityPaths = new Set<string>();
		const definitionProofs = new Map<string, DefinitionProof>();
		const occupiedIdentities = new Map<string, Set<string>>();
		const entries: Array<{ path: string; raw: string; values: Record<string, unknown>; modified: number }> = [];
		for (const file of this.files.getMarkdownFiles().filter((file) => file.path.startsWith(root + '/'))) {
			const stat = { mtime: file.stat.mtime, size: file.stat.size };
			const relative = file.path.slice(root.length + 1);
			// Recovery copies are evidence, never a second active entity with the same identity.
			if (relative.startsWith('迁移记录/') || relative.startsWith('迁移恢复/')) continue;
			let raw: string;
			try {
				raw = await this.files.cachedRead(file);
			} catch {
				this.guard(root);
				if (entityPath(root, file.path)) unknownIdentityPaths.add(file.path);
				diagnostics.push({ path: file.path, code: 'readFailed', ...(relative.startsWith(definitionRoot + '/') ? {definitionFamily:'type' as const,definitionId:relative.slice(definitionRoot.length+1).split('/')[0]} : {}) });
				continue;
			}
			this.guard(root);
			if (!/^['"]?huhu-type['"]?:/m.test(raw)) continue;
			try {
				const values = archiveFrontmatter(raw);
				if (relative.startsWith(definitionRoot + '/') && relative.includes('/修订/')) {
					if (values['huhu-type'] !== 'archive-type-definition' || values['huhu-format-version'] !== 2)
						throw new ContactsError('futureFormat');
					const definition = values.definition as ArchiveTypeDefinition;
					validateArchiveType(definition);
					if (
						!idPattern.test(definition.revisionId) ||
						!Array.isArray(definition.parentRevisionIds) ||
						!definition.parentRevisionIds.every((id) => typeof id === 'string' && idPattern.test(id)) ||
						!Number.isInteger(definition.displayVersion) ||
						definition.displayVersion < 1 ||
						definition.contentHash !== (await textHash(definitionContent(definition))) ||
						relative !== `${definitionRoot}/${definition.typeId}/修订/${definition.revisionId}.md`
					)
						throw new ContactsError('invalidDefinition');
					revisions.push(definition);
					definitionProofs.set(file.path, { file, raw, ...stat, version });
				} else if (values['huhu-type'] === 'archive-type-current') {
					if (values['huhu-format-version'] !== 2) throw new ContactsError('futureFormat');
					const typeId = values['huhu-archive-type-id'],
						revisionId = values['huhu-schema-revision'];
					if (
						typeof typeId !== 'string' ||
						typeof revisionId !== 'string' ||
						!idPattern.test(typeId) ||
						!idPattern.test(revisionId) ||
						relative !== `${definitionRoot}/${typeId}/当前.md`
					)
						throw new ContactsError('invalidDefinition');
					pointers.push({ path: file.path, raw, typeId, revisionId });
				} else if (values['huhu-type'] !== 'archive-type-current')
					entries.push({ path: file.path, raw, values, modified: file.stat.mtime });
			} catch (error) {
				if (entityPath(root, file.path)) unknownIdentityPaths.add(file.path);
				diagnostics.push({
					path: file.path,
					raw,
					...(relative.startsWith(definitionRoot + '/') ? {definitionFamily:'type' as const,definitionId:relative.slice(definitionRoot.length+1).split('/')[0]} : {}),
					code: error instanceof ContactsError ? error.code : 'invalidDefinition',
					detail: error instanceof ContactsError ? error.detail : '',
				});
			}
		}
		const typeStates = new Map<string, DefinitionState>();
		for (const id of new Set([...revisions.map(type => type.typeId), ...pointers.map(pointer => pointer.typeId)])) {
			const state = await this.graph.read('type', id); typeStates.set(id, state);
			diagnostics.push(...state.diagnostics.map(item => ({ ...item, definitionFamily: 'type' as const, definitionId: id })));
			const selected = revisions.find(type => type.typeId === id && type.revisionId === state.effectiveRevisionId && state.revisions.some(node => node.revisionId === type.revisionId && node.contentHash === type.contentHash));
			if (selected) types.push(selected);
		}

		for (const entry of entries) {
			const { values, path, raw, modified } = entry;
			const kind = values['huhu-type'],
				id = values['huhu-id'];
			if (
				entityPath(root, path) &&
				typeof kind === 'string' &&
				['archive-record', 'person', 'company'].includes(kind)
			) {
				if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) unknownIdentityPaths.add(path);
				else {
					const paths = occupiedIdentities.get(id) ?? new Set<string>();
					paths.add(path);
					occupiedIdentities.set(id, paths);
				}
			}
			try {
				if (values['huhu-type'] === 'archive-record') {
					if (values['huhu-format-version'] !== 2) throw new ContactsError('futureFormat');
					const id = values['huhu-id'],
						typeId = values['huhu-archive-type-id'],
						revisionId = values['huhu-schema-revision'];
					if (
						typeof id !== 'string' ||
						!idPattern.test(id) ||
						typeof typeId !== 'string' ||
						typeof revisionId !== 'string'
					)
						throw new ContactsError('invalidId');
					const type = revisions.find((type) => type.typeId === typeId && type.revisionId === revisionId);
					if (!type) throw new ContactsError('missingDefinition');
					if (
						!path.endsWith('/基本信息.md') ||
						path.slice(root.length + 1).split('/').length < 3 ||
						['档案定义', '关联记录'].includes(path.slice(root.length + 1).split('/')[0]!)
					)
						throw new ContactsError('invalidRecord');
					const createdAt = values['huhu-created-at'],
						updatedAt = values['huhu-updated-at'];
					if (
						(createdAt !== null && (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)))) ||
						typeof updatedAt !== 'string' ||
						!Number.isFinite(Date.parse(updatedAt))
					)
						throw new ContactsError('invalidDate');
					let readOnly = false;
					const decoded = entityValues(values, type, raw, (fieldId) => {
						readOnly = true;
						diagnostics.push({ path, raw, entityId: id, code: 'invalidField', detail: fieldId });
					});
					entities.push({
						id,
						typeId,
						schemaRevisionId: revisionId,
						formatVersion: 2,
						path,
						folderPath: path.slice(0, path.lastIndexOf('/')),
						values: decoded,
						createdAt,
						updatedAt,
						raw,
						readOnly,
					});
				} else if (values['huhu-type'] === 'person' || values['huhu-type'] === 'company') {
					if (values['huhu-format-version'] !== undefined && values['huhu-format-version'] !== 1)
						throw new ContactsError('futureFormat');
					if (!archiveLocation(root, path)) throw new ContactsError('wrongCategory');
					const record = parseRecord(raw, path, modified)!;
					if (record.errors.length) {
						for (const code of record.errors) diagnostics.push({ path, raw, code, entityId: record.id });
					}
					entities.push(legacyArchiveEntity(record));
				}
			} catch (error) {
				diagnostics.push({
					path,
					raw,
					code: error instanceof ContactsError ? error.code : 'invalidRecord',
					detail: error instanceof ContactsError ? error.detail : '',
					entityId: typeof values['huhu-id'] === 'string' ? values['huhu-id'] : undefined,
				});
			}
		}
		for (const [id, paths] of occupiedIdentities)
			if (paths.size > 1) {
				for (const entity of entities) if (entity.id === id) entity.readOnly = true;
				for (const path of paths) diagnostics.push({ path, entityId: id, code: 'duplicateId' });
			}
		const authority = await migrationAuthority(this.files, root);
		diagnostics.push(...authority.diagnostics);
		for (const entity of entities) if (authority.diagnostics.some(item => item.entityId === entity.id)) entity.readOnly = true;
		this.guard(root);
		if (version !== this.version) return this.load();
		this.revisions = revisions;
		this.definitionProofs = definitionProofs;
		this.types = types; this.typeStates = typeStates;
		this.entities = entities;
		this.diagnostics = diagnostics;
		this.unknownIdentityPaths = [...unknownIdentityPaths];
		this.occupiedIds = new Set(occupiedIdentities.keys());
		this.dirty = false;
		this.loadedRoot = root;
	}
	/** Caller holds the shared create queue; this refresh is a precondition check, not an identity reservation. */
	async assertIdentityAvailable(id: string): Promise<void> {
		this.dirty = true;
		this.version++;
		try {
			await this.load();
		} catch (error) {
			if (error instanceof ContactsError) throw error;
			throw new ContactsError('identityUnverified', this.getRoot());
		}
		if (this.unknownIdentityPaths.length)
			throw new ContactsError('identityUnverified', this.unknownIdentityPaths[0]);
		if (this.occupiedIds.has(id)) throw new ContactsError('duplicateId');
	}

	async catalog(): Promise<ArchiveCatalogSnapshot> {
		await this.load();
		return structuredClone({ types: [...legacyArchiveTypes(), ...this.types], diagnostics: this.diagnostics, definitionStates: [...this.typeStates.values()] });
	}
	async snapshot(): Promise<ArchiveQuerySnapshot> {
		await this.load();
		return structuredClone({
			entities: this.entities,
			diagnostics: this.diagnostics,
			isComplete: this.diagnostics.every(item => item.severity === 'warning' || !!item.definitionFamily),
		});
	}
	async definitionStates(): Promise<DefinitionState[]> {
		await this.load(); const result: DefinitionState[] = [];
		for (const item of await this.graph.families()) {
			const state = await this.graph.read(item.family, item.id);
			state.affected = item.family === 'relation' ? 0 : this.entities.filter(entity => entity.typeId === item.id).length;
			if (item.family === 'relation') for (const file of this.files.getMarkdownFiles().filter(file => file.path.startsWith(this.getRoot() + '/关联记录/'))) { try { if (archiveFrontmatter(await this.files.read(file))['huhu-relation-type-id'] === item.id) state.affected++; } catch { /* The relation query retains unreadable facts separately. */ } }
			result.push(state);
		}
		return structuredClone(result);
	}

	private async currentType(typeId: string): Promise<ArchiveTypeDefinition> {
		await this.load();
		const type = [...legacyArchiveTypes(), ...this.types].find((type) => type.typeId === typeId);
		if (!type) throw new ContactsError('missingDefinition');
		return type;
	}
	async forms(typeId: string, revisionId?: string): Promise<ArchiveFormSnapshot> {
		await this.load();
		const type = revisionId && revisionId !== 'legacy-v1' ? this.revisions.find(type => type.typeId === typeId && type.revisionId === revisionId) : await this.currentType(typeId);
		if (!type) throw new ContactsError('missingDefinition');
		const snapshot = await this.formStore.read(type), state = type.legacy ? undefined : await this.graph.read('type',typeId);
		if(state?.blocked) snapshot.blockedReason = state.diagnostics.find(item=>item.code!=='definitionPointerLag')?.code;
		return snapshot;
	}
	async publishForms(input: PublishArchiveForms): Promise<ArchiveFormSnapshot> {
		const root = this.getRoot();
		this.guard(root);
		const type = await this.currentType(input.typeId);
		this.guard(root);
		return this.formStore.publish(input, type);
	}
	private async captureType(expected: ArchiveTypeDefinition): Promise<() => void> {
		const root = this.getRoot();
		this.dirty = true; this.version++;
		const type = await this.currentType(expected.typeId);
		if (type.revisionId !== expected.revisionId || type.contentHash !== expected.contentHash) throw new ContactsError('definitionConflict');
		const graph = type.legacy ? () => {} : await this.graph.capture('type', type.typeId, type.revisionId);
		const proof = this.definitionProofs.get(`${root}/${definitionRoot}/${type.typeId}/修订/${type.revisionId}.md`), version = this.version;
		if (!type.legacy && (!proof || proof.version !== version || await this.files.read(proof.file) !== proof.raw)) throw new ContactsError('definitionConflict');
		const editors = await this.files.captureEditors(proof ? [proof.file] : []);
		const check = () => {
			this.guard(root); editors(); graph();
			if (version !== this.version || (proof && (this.files.getFileByPath(proof.file.path) !== proof.file || proof.mtime !== proof.file.stat.mtime || proof.size !== proof.file.stat.size))) throw new ContactsError('definitionConflict');
		};
		check(); return check;
	}
	private async checkPropertyMappings(input: PublishArchiveType, root: string): Promise<void> {
		const properties = (fields: ArchiveField[]): ArchiveField[] =>
			fields.flatMap((field) =>
				field.codec === 'date'
					? [field, { ...field, storageKey: `${field.storageKey}-precision`, codec: 'text' }]
					: [field],
			);
		const fields = properties(input.fields);
		for (const field of fields) {
			const kind = nativePropertyKind(field.codec);
			if ((field.storageKey === 'tags' || field.storageKey === 'aliases') && field.codec !== 'string-list')
				throw new ContactsError('propertyConflict', field.storageKey);
			for (const type of [...legacyArchiveTypes(), ...this.revisions]) {
				const existing = properties(type.fields).find((other) => other.storageKey === field.storageKey);
				if (existing && nativePropertyKind(existing.codec) !== kind)
					throw new ContactsError('propertyConflict', field.storageKey);
			}
		}
		for (const file of this.files.getMarkdownFiles()) {
			const raw = await this.files.cachedRead(file);
			this.guard(root);
			if (!/^(?:\uFEFF)?---\r?\n/.test(raw) || !fields.some((field) => raw.includes(field.storageKey))) continue;
			let values: Record<string, unknown>;
			try {
				values = archiveFrontmatter(raw);
			} catch {
				throw new ContactsError('propertyConflict', file.path);
			}
			for (const field of fields) {
				const kind = storedPropertyKind(values[field.storageKey]);
				if (kind !== undefined && kind !== nativePropertyKind(field.codec))
					throw new ContactsError('propertyConflict', `${file.path}:${field.storageKey}`);
			}
		}
	}

	private async createVerified(path: string, content: string, root: string, beforeCommit?: () => void): Promise<void> {
		this.guard(root);
		beforeCommit?.();
		await this.files.create(path, content, beforeCommit);
		const file = this.files.getFileByPath(path);
		if (
			!file ||
			file.path !== path ||
			(await this.files.read(file)) !== content ||
			this.files.getFileByPath(path) !== file
		)
			throw new ContactsError('writeUnverified', path);
	}

	async publishType(input: PublishArchiveType): Promise<ArchiveTypeDefinition> {
		const root = this.getRoot();
		const draft = structuredClone(input);
		validateArchiveType(draft);
		return this.queue
			.run('archives:definitions', async () => {
				this.guard(root);
				await this.load();
				this.graph.assertWritable(await this.graph.read('type', draft.typeId));
				const previous = this.types.find(type => type.typeId === draft.typeId);
				if (['person', 'company', 'type-person', 'type-company'].includes(draft.typeId) || previous && (draft.baseRevisionId !== previous.revisionId || draft.baseContentHash !== previous.contentHash))
					throw new ContactsError('definitionConflict');
				if (previous && (previous.folder !== draft.folder || previous.titleFieldId !== draft.titleFieldId || JSON.stringify(previous.fields) !== JSON.stringify(draft.fields))) throw new ContactsError('definitionCompatibility');
				await this.checkPropertyMappings(draft, root);
				const revisionId = crypto.randomUUID();
				const content = {
					typeId: draft.typeId,
					label: draft.label,
					folder: draft.folder,
					titleFieldId: draft.titleFieldId,
					fields: draft.fields,
					revisionId,
					parentRevisionIds: previous ? [previous.revisionId] : [] as string[],
					displayVersion: previous ? previous.displayVersion + 1 : 1,
				};
				const definition: ArchiveTypeDefinition = {
					...content,
					contentHash: await textHash(definitionContent(content)),
				};
				const path = `${root}/${definitionRoot}/${draft.typeId}/修订/${revisionId}.md`, raw = archiveMarkdown({ 'huhu-type': 'archive-type-definition', 'huhu-format-version': 2, 'huhu-publication': 'staged', definition });
				this.guard(root);
				await this.createVerified(
					path,
					raw,
					root,
				);
				const pointerPath = `${root}/${definitionRoot}/${draft.typeId}/当前.md`, pointer = this.files.getFileByPath(pointerPath), pointerRaw = pointer ? await this.files.read(pointer) : undefined;
				await this.graph.publish('type', draft.typeId, revisionId, definition.contentHash, previous?.revisionId ?? null, () => this.guard(root),raw);
				try {
					const published = await this.graph.capture('type', draft.typeId, revisionId);
					const check = () => { published(); if (this.files.getFileByPath(pointerPath) !== pointer) throw new ContactsError('definitionConflict'); };
					if (pointer) await this.files.process(pointer, latest => { check(); if (latest !== pointerRaw) throw new ContactsError('definitionConflict'); return patchYamlValues(latest, new Map([['huhu-schema-revision', revisionId]])); }, check);
					else await this.createVerified(pointerPath, archiveMarkdown({'huhu-type':'archive-type-current','huhu-format-version':2,'huhu-archive-type-id':draft.typeId,'huhu-schema-revision':revisionId}), root, check);
				} catch(error) { throw new DefinitionPublicationError('type', draft.typeId, revisionId, pointerPath, `${root}/${definitionRoot}/${draft.typeId}/发布/${revisionId}.md`,error); }

				this.invalidate();
				return structuredClone(definition);
			})
			.finally(() => this.invalidate());
	}
	private async editableEntity(id: string): Promise<ArchiveEntity> {
		this.dirty = true;
		this.version++;
		await this.load();
		if (this.unknownIdentityPaths.length)
			throw new ContactsError('identityUnverified', this.unknownIdentityPaths[0]);
		const matches = this.entities.filter((entity) => entity.id === id);
		if (matches.length !== 1 || matches[0]!.readOnly) throw new ContactsError('invalidRecord', id);
		return structuredClone(matches[0]!);
	}
	async legacyProjection(record: ArchiveRecord): Promise<ArchiveRecord> {
		const root = this.getRoot(), authority = await migrationAuthority(this.files, root, false);
		this.guard(root); const state = legacyMigrationState(authority, record.path, record.id);
		if (!state.code) return record;
		const next = cloneRecord(record); next.errors.push(state.code);
		if (state.hideInline) { next.employments = []; next.relations = []; }
		return next;
	}
	/** Freezes the same visible authority used by projections; a late receipt cannot reopen the legacy write route. */
	async captureLegacyAuthority(path: string, id: string): Promise<() => void> { return this.captureAuthority(path, id, true); }
	private async captureEntityAuthority(path: string, id: string): Promise<() => void> { return this.captureAuthority(path, id, false); }
	private async captureAuthority(path: string, id: string, legacy: boolean): Promise<() => void> {
		const root = this.getRoot(); this.guard(root);
		const generation = this.mutationGeneration, inventory = this.files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/')).map(file => ({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size }));
		const authority = await migrationAuthority(this.files, root, !legacy), state = legacyMigrationState(authority, path, id, !legacy);
		if (state.code) throw new ContactsError(state.code, path);
		const proofs = authority.proofs.filter(proof => proof.path === path || proof.path.startsWith(root + '/迁移记录/'));
		const check = () => {
			this.guard(root);
			if (generation !== this.mutationGeneration || inventory.length !== this.files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/')).length || inventory.some(proof => this.files.getFileByPath(proof.path) !== proof.file || proof.file.path !== proof.path || proof.mtime !== proof.file.stat.mtime || proof.size !== proof.file.stat.size)) throw new ContactsError('migrationChanged');
		};
		check();
		for (const proof of proofs) { if (await this.files.read(proof.file) !== proof.raw || proof.file.stat.mtime !== proof.mtime || proof.file.stat.size !== proof.size) throw new ContactsError('migrationChanged'); check(); }
		const native = await this.files.captureEditors(proofs.map(proof => proof.file)); check();
		return () => { check(); native(); };
	}

	async saveMigratedReminder(definition: AutomationDefinition, remove: boolean): Promise<boolean> {
		const root = this.getRoot(), source = definition.source;
		if (!source || source.kind !== 'contacts') return false;
		const entity = (await this.snapshot()).entities.find(entity => entity.id === source.id && entity.path === source.path);
		if (!entity || entity.formatVersion !== 2 || !['type-person', 'type-company'].includes(entity.typeId)) return false;
		await this.queue.run(source.id, async () => {
			const current = await this.editableEntity(source.id), type = this.revisions.find(type => type.typeId === current.typeId && type.revisionId === current.schemaRevisionId);
			if (!type || current.path !== source.path) throw new ContactsError('invalidRecord');
			const checkType = await this.captureType(type), file = this.files.getFileByPath(current.path)!;
			const checkAuthority = await this.captureEntityAuthority(current.path, current.id), native = await this.files.captureEditors([file]);
			const guard = () => { this.guard(root); native(); checkType(); checkAuthority(); if (this.files.getFileByPath(source.path) !== file || file.path !== source.path) throw new ContactsError('invalidRecord'); };
			await this.files.process(file, raw => {
				guard(); const actual = readEntityMarkdown(raw, source.path, type);
				if (actual.id !== source.id || actual.schemaRevisionId !== current.schemaRevisionId || archiveFrontmatter(raw)['huhu-migration-id'] !== archiveFrontmatter(current.raw)['huhu-migration-id']) throw new ContactsError('invalidRecord');
				const patched = patchReminders(raw, definition, remove), saved = readReminders(patched).filter(item => item.id === definition.id);
				if (remove ? saved.length !== 0 : saved.length !== 1 || JSON.stringify(saved[0]) !== JSON.stringify(definition)) throw new ContactsError('invalidRecord');
				readEntityMarkdown(patched, source.path, type); guard(); return patched;
			}, guard);
		}); this.invalidate(); return true;
	}

	async beginEdit(entityId: string): Promise<ArchiveEditBase> {
		const entity = await this.editableEntity(entityId),
			file = this.files.getFileByPath(entity.path);
		if (!file) throw new ContactsError('missing');
		const raw = await this.files.read(file);
		this.files.checkEditor(file, raw);
		const type =
			entity.formatVersion === 1
				? legacyArchiveTypes().find((type) => type.typeId === entity.typeId)
				: this.revisions.find(
						(type) => type.typeId === entity.typeId && type.revisionId === entity.schemaRevisionId,
					);
		if (!type) throw new ContactsError('missingDefinition');
		const current =
			entity.formatVersion === 1
				? parseRecord(raw, file.path, file.stat.mtime)
				: readEntityMarkdown(raw, file.path, type);
		if (!current || ('errors' in current && current.errors.length) || current.id !== entity.id)
			throw new ContactsError('invalidRecord');
		return {
			entity: 'errors' in current ? legacyArchiveEntity(current) : current,
			contentHash: await textHash(raw),
			schemaContentHash: type.contentHash,
		};
	}
	async updateEntity(input: UpdateArchiveEntity): Promise<ArchiveUpdateReceipt> {
		const request = structuredClone(input),
			root = this.getRoot(),
			operationId = crypto.randomUUID();
		this.guard(root);
		if (
			!['draft', 'complete'].includes(request.intent) ||
			!request.base?.entity ||
			(await textHash(request.base.entity.raw)) !== request.base.contentHash
		)
			throw new ContactsError('invalidRecord');
		const base = request.base.entity;
		if (base.formatVersion === 1) {
			if (request.formRevisionId !== undefined) {
				const form = await this.forms(base.typeId);
				if (form.revisionId !== request.formRevisionId || form.contentHash !== request.formContentHash) throw new ContactsError('formChanged');
			}
			const current = await this.editableEntity(base.id),
				type = legacyArchiveTypes().find((type) => type.typeId === base.typeId);
			if (
				!type ||
				base.schemaRevisionId !== 'legacy-v1' ||
				current.formatVersion !== 1 ||
				current.typeId !== base.typeId ||
				request.base.schemaContentHash !== type.contentHash
			)
				throw new ContactsError('definitionConflict');
			const record = parseRecord(base.raw, base.path);
			if (!record || record.errors.length || record.id !== base.id || record.kind !== base.typeId)
				throw new ContactsError('invalidRecord');
			const draft = cloneRecord(record);
			for (const [id, value] of Object.entries(request.changes)) {
				const field = type.fields.find((field) => field.fieldId === id);
				if (!field || value === null) throw new ContactsError('invalidField', id);
				validateFieldValue(field, value);
				Object.assign(draft.fields, { [id]: value });
			}
			const checkType = request.formRevisionId !== undefined ? await this.captureType(type) : () => {};
			const checkForm = request.formRevisionId !== undefined ? await this.formStore.capture(type, request.formRevisionId, request.formContentHash ?? null) : () => {};
			const saved = await this.saveLegacy(record, draft, () => { checkType(); checkForm(); });
			this.invalidate();
			return { entity: legacyArchiveEntity(saved), operationId, contentHash: await textHash(saved.raw) };
		}
		if (base.formatVersion !== 2) throw new ContactsError('futureFormat');
		return this.queue
			.run(base.id, async () => {
				this.guard(root);
				if (request.formRevisionId !== undefined) {
				const form = await this.forms(base.typeId);
				if (form.revisionId !== request.formRevisionId || form.contentHash !== request.formContentHash) throw new ContactsError('formChanged');
			}
				const current = await this.editableEntity(base.id),
					type = this.revisions.find(
						(type) => type.typeId === current.typeId && type.revisionId === current.schemaRevisionId,
					);
				if (
					!type ||
					current.formatVersion !== 2 ||
					current.typeId !== base.typeId ||
					current.schemaRevisionId !== base.schemaRevisionId ||
					type.contentHash !== request.base.schemaContentHash
				)
					throw new ContactsError('definitionConflict');
				const baseline = readEntityMarkdown(base.raw, base.path, type);
				if (baseline.id !== base.id) throw new ContactsError('invalidRecord');
				const file = this.files.getFileByPath(current.path),
					definitionPath = `${root}/${definitionRoot}/${type.typeId}/修订/${type.revisionId}.md`,
					proof = this.definitionProofs.get(definitionPath);
				if (!file || !proof) throw new ContactsError('missing');
				const checkSchema = () => {
					this.guard(root);
					if (
						this.version !== proof.version ||
						this.files.getFileByPath(definitionPath) !== proof.file ||
						proof.mtime !== proof.file.stat.mtime ||
						proof.size !== proof.file.stat.size
					)
						throw new ContactsError('definitionConflict');
				};
				checkSchema();
				// The load proof owns the bytes that validated this type, never a later stat sample.
				if ((await this.files.read(proof.file)) !== proof.raw) throw new ContactsError('definitionConflict');
				checkSchema();
				const definitionState = await this.graph.read('type',type.typeId); this.graph.assertWritable(definitionState);
				const checkGraph = await this.graph.capture('type',type.typeId,definitionState.effectiveRevisionId ?? null);
				const checkForm = request.formRevisionId !== undefined ? await this.formStore.capture(type, request.formRevisionId, request.formContentHash ?? null) : () => {};
				const checkAuthority = archiveFrontmatter(current.raw)['huhu-migration-id'] !== undefined ? await this.captureEntityAuthority(current.path, current.id) : () => {};
				const checkEditors = await this.files.captureEditors([file, proof.file]);
				const beforeCommit = () => {
					checkSchema(); checkGraph();
					checkForm();
					checkEditors(); checkAuthority();
				};
				beforeCommit();
				const time = new Date().toISOString();
				const written = await this.files.process(
					file,
					(latest) => {
						beforeCommit();
						return patchEntityMarkdown(
							latest,
							{ ...baseline, path: file.path },
							request.changes,
							type,
							request.intent,
							time,
						);
					},
					beforeCommit,
				);
				if ((await this.files.read(file)) !== written)
					throw new ContactsError('writeUnverified', `${operationId}:${file.path}`);
				return {
					entity: readEntityMarkdown(written, file.path, type),
					operationId,
					contentHash: await textHash(written),
				};
			})
			.finally(() => this.invalidate());
	}

	async createEntity(input: CreateArchiveEntity): Promise<ArchiveCreateReceipt> {
		const root = this.getRoot(),
			draft = structuredClone(input),
			id = draft.id ?? crypto.randomUUID(),
			operationId = crypto.randomUUID();
		if (!idPattern.test(id)) throw new ContactsError('invalidId');
		if (draft.intent !== undefined && !['draft', 'complete'].includes(draft.intent)) throw new ContactsError('invalidRecord');
		let templateBody = '';
		let creationSchema: string | undefined;
		if (draft.formRevisionId !== undefined || draft.templateId) {
			const forms = await this.forms(draft.typeId);
			if (draft.formRevisionId !== forms.revisionId || draft.formContentHash !== forms.contentHash) throw new ContactsError('formChanged');
			creationSchema = forms.type.contentHash;
			if (draft.templateId) {
				const template = forms.design.templates.find((template) => template.id === draft.templateId);
				if (!template) throw new ContactsError('invalidDefinition');
				draft.values = { ...template.values, ...draft.values };
				templateBody = template.body;
			}
		}
		if (draft.typeId === 'person' || draft.typeId === 'company') {
			if (templateBody) throw new ContactsError('migrationRequired');
			this.guard(root);
			const preset = legacyArchiveTypes().find((type) => type.typeId === draft.typeId)!;
			for (const [fieldId, value] of Object.entries(draft.values)) {
				const field = preset.fields.find((field) => field.fieldId === fieldId);
				if (!field) throw new ContactsError('invalidField', fieldId);
				validateFieldValue(field, value);
				if (value === null) throw new ContactsError('invalidField', fieldId);
			}
			const prepareCommit = async () => {
				this.guard(root);
				const checkType = await this.captureType(preset);
				const form = await this.formStore.read(preset); if (form.blockedReason) throw new ContactsError(form.blockedReason);
				const checkForms = await this.formStore.capture(preset, draft.formRevisionId ?? form.revisionId, draft.formContentHash ?? form.contentHash);
				return () => { this.guard(root); checkType(); checkForms(); };
			};
			const entity = legacyArchiveEntity(await this.createLegacy(draft.typeId, id, draft.values, prepareCommit));
			this.invalidate();
			return { entity, operationId };
		}
		return this.queue
			.run('create', async () => {
				this.guard(root);
				await this.assertIdentityAvailable(id);
				const definitions = this.types.filter((type) => type.typeId === draft.typeId);
				if (definitions.length !== 1) throw new ContactsError('missingDefinition');
				const type = definitions[0]!;
				const state = this.typeStates.get(type.typeId); if (state) this.graph.assertWritable(state);
				this.graph.assertWritable(await this.graph.read('form', type.typeId));
				if (creationSchema && type.contentHash !== creationSchema) throw new ContactsError('definitionConflict');
				if (draft.formRevisionId !== undefined) {
					const form = await this.forms(draft.typeId);
					if (form.revisionId !== draft.formRevisionId || form.contentHash !== draft.formContentHash) throw new ContactsError('formChanged');
				}
				if (draft.intent === 'complete') completeFields(type.fields, draft.values);
				if (
					Object.keys(draft.values).some((fieldId) => !type.fields.some((field) => field.fieldId === fieldId))
				)
					throw new ContactsError('invalidField');
				const title = draft.values[type.titleFieldId];
				if (typeof title !== 'string' || !title.trim()) throw new ContactsError('nameRequired');
				const folderPath = `${root}/${type.folder}/${safeArchiveName(title)}-${id}`;
				const time = new Date().toISOString();
				const entity: ArchiveEntity = {
					id,
					typeId: type.typeId,
					schemaRevisionId: type.revisionId,
					formatVersion: 2,
					path: `${folderPath}/基本信息.md`,
					folderPath,
					values: draft.values,
					createdAt: time,
					updatedAt: time,
					raw: '',
					readOnly: false,
				};
				entity.raw = createEntityMarkdown(entity, type) + templateBody;
				if (draft.intent === 'complete') entity.raw = patchEntityMarkdown(entity.raw, entity, {}, type, 'complete', time);
				this.guard(root);
				await this.files.mkdir(`${root}/${type.folder}`);
				this.guard(root);
				await this.files.createFolder(folderPath);
				this.guard(root);
				const checkType = await this.captureType(type);
				const graphForm = await this.graph.read('form', type.typeId), checkGraphForm = await this.graph.capture('form', type.typeId, graphForm.effectiveRevisionId ?? null);
				const checkForms = draft.formRevisionId !== undefined ? await this.formStore.capture(type, draft.formRevisionId, draft.formContentHash ?? null) : () => {};
				await this.createVerified(entity.path, entity.raw, root, () => { checkType(); checkForms(); checkGraphForm(); });
				this.invalidate();
				return structuredClone({ entity, operationId });
			})
			.finally(() => this.invalidate());
	}
}

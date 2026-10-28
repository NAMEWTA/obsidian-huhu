import type { ArchiveRecord } from '../model';
import { parseRecord, resolveRelative as legacyLinkPath } from '../persist/markdown';
import {
	ArchiveError,
	type ArchiveDiagnostic,
	type CatalogSnapshot,
	type Definition,
	type DefinitionRevision,
	type EntityQuery,
	type EntityRecord,
	type EntitySummary,
	type QueryResult,
	type RelationRecord,
	type RelationResult,
	type RelationTypeDefinition,
	type ResourceClass,
} from '../schema/model';
import { revisionGraph } from '../schema/definitions';
import { canonical, copy, digest, identifier, displayName } from '../schema/value';
import { adaptLegacy, projectLegacy } from './legacy';
import {
	COLLECTION_TAG,
	decodeDefinition,
	decodeEntity,
	decodeRelation,
	DEFINITION_TAG,
	ENTITY_TAG,
	envelope,
	frontmatter,
	HEAD_TAG,
	MIGRATION_TAG,
	parseDiagnostic,
	RELATION_TAG,
} from './markdown';
import { decodeOperation, type ArchiveOperation } from './operations';
import { compareValues, filterMatches, validateQuery } from './query';
import { activeRelation } from './relations';
import { ARCHIVE_PATHS, isDiscoveryPath, underRoot } from './paths';

export interface IndexedArchive {
	path: string;
	hash: string;
	modified: number;
	tag: string;
	diagnostics: ArchiveDiagnostic[];
	entity?: EntityRecord;
	relation?: RelationRecord;
	legacy?: ArchiveRecord;
	definition?: DefinitionRevision;
	operation?: ArchiveOperation;
	collectionId?: string;
	collectionReady?: boolean;
}
function add(map: Map<string, Set<string>>, id: string, path: string): void {
	const paths = map.get(id) ?? new Set();
	paths.add(path);
	map.set(id, paths);
}
function remove(map: Map<string, Set<string>>, id: string, path: string): void {
	const paths = map.get(id);
	paths?.delete(path);
	if (!paths?.size) map.delete(id);
}
/** Incremental metadata/value index. Original Markdown is read on demand; no all-vault raw-content cache. */
export class ArchiveIndex {
	private readonly entries = new Map<string, IndexedArchive>();
	private readonly entityIds = new Map<string, Set<string>>();
	private readonly types = new Map<string, Set<string>>();
	private readonly folders = new Map<string, Set<string>>();
	private readonly schemaPaths = new Map<string, Set<string>>();
	private readonly collections = new Map<string, string>();
	private readonly edges = new Map<string, RelationRecord>();
	private readonly edgeIds = new Map<string, Set<string>>();
	private readonly edgeTypes = new Map<string, Set<string>>();
	private readonly adjacency = new Map<string, Set<string>>();
	private readonly virtualByOwner = new Map<string, Set<string>>();
	private readonly legacyDependents = new Map<string, Set<string>>();
	private readonly legacyKeysByOwner = new Map<string, Set<string>>();
	private readonly operationIds = new Map<string, Set<string>>();
	private readonly ownerOperations = new Map<string, Set<string>>();
	private schemaCache?: {
		revisions: Map<string, DefinitionRevision>;
		current: Map<string, DefinitionRevision>;
		all: Map<string, DefinitionRevision[]>;
		diagnostics: ArchiveDiagnostic[];
	};
	private diagnosticCache?: ArchiveDiagnostic[];
	private queryCache?: { key: string; result: QueryResult };
	entityRevision = 0;
	schemaRevision = 0;
	private isLoading = false;
	get loading(): boolean {
		return this.isLoading;
	}
	set loading(value: boolean) {
		if (value !== this.isLoading) {
			this.isLoading = value;
			this.queryCache = undefined;
			this.entityRevision++;
		}
	}
	constructor(
		readonly root: string,
		private readonly presets: readonly DefinitionRevision[],
	) {}

	private schemas(): NonNullable<ArchiveIndex['schemaCache']> {
		if (this.schemaCache) return this.schemaCache;
		const revisions = new Map<string, DefinitionRevision>(),
			current = new Map<string, DefinitionRevision>(),
			all = new Map<string, DefinitionRevision[]>(),
			diagnostics: ArchiveDiagnostic[] = [];
		const candidates = new Map<string, { revision: DefinitionRevision; path: string }[]>();
		for (const entry of this.entries.values())
			if (entry.definition) {
				const group = candidates.get(entry.definition.revisionId) ?? [];
				group.push({ revision: entry.definition, path: entry.path });
				candidates.set(entry.definition.revisionId, group);
			}
		for (const preset of this.presets)
			if (!this.collectionIds().length && !candidates.has(preset.revisionId))
				revisions.set(preset.revisionId, preset);
		for (const [id, entries] of candidates) {
			const preset = this.presets.find((item) => item.revisionId === id);
			if (entries.length !== 1 || (preset && preset.contentHash !== entries[0]!.revision.contentHash)) {
				for (const entry of entries)
					diagnostics.push({
						code: 'duplicate-id',
						id: entry.revision.definition.id,
						path: entry.path,
						detail: `revision ${id}`,
					});
			} else revisions.set(id, entries[0]!.revision);
		}
		for (const revision of revisions.values())
			all.set(revision.definition.id, [...(all.get(revision.definition.id) ?? []), revision]);
		for (const [id, versions] of all) {
			const graph = revisionGraph(versions);
			if (
				graph.heads.length !== 1 ||
				graph.cycle ||
				new Set(versions.map((version) => version.definition.kind)).size !== 1
			)
				diagnostics.push({ code: 'schema-fork', id, path: '', relatedIds: graph.heads });
			if (graph.missing.length)
				diagnostics.push({ code: 'schema-parent-missing', id, path: '', relatedIds: graph.missing });
			if (
				graph.heads.length === 1 &&
				!graph.cycle &&
				!graph.missing.length &&
				!diagnostics.some((item) => item.id === id)
			)
				current.set(id, revisions.get(graph.heads[0]!)!);
		}
		return (this.schemaCache = { revisions, current, all, diagnostics });
	}
	schema(id: string): DefinitionRevision | undefined {
		const schema = this.schemas().revisions.get(id);
		return schema ? copy(schema) : undefined;
	}
	definition(id: string): DefinitionRevision | undefined {
		const schema = this.schemas().current.get(id);
		return schema ? copy(schema) : undefined;
	}
	revisions(id?: string): DefinitionRevision[] {
		return copy(id ? (this.schemas().all.get(id) ?? []) : [...this.schemas().revisions.values()]);
	}
	definitions(): DefinitionRevision[] {
		return copy([...this.schemas().current.values()]);
	}
	/** Parsing has no side effects: callers can discard a result after a newer event or module disposal. */
	async parse(path: string, raw: string, modified = 0): Promise<IndexedArchive> {
		const result: IndexedArchive = { path, hash: await digest(raw), modified, tag: '', diagnostics: [] };
		if (!isDiscoveryPath(this.root, path)) return result;
		try {
			const properties = frontmatter(raw),
				tag = properties['huhu-type'];
			if (typeof tag !== 'string') return result;
			result.tag = tag;
			if (tag === 'person' || tag === 'company') {
				const legacy = parseRecord(raw, path, modified);
				if (!legacy) throw new ArchiveError('invalid-legacy');
				result.legacy = { ...legacy, raw: '' }; // The parser's raw is intentionally not retained in the index.
				if (identifier(legacy.id)) result.entity = adaptLegacy(legacy, result.hash);
				result.diagnostics.push(
					...legacy.errors.map((detail) => ({
						code: 'invalid-format' as const,
						path,
						id: legacy.id,
						detail,
					})),
				);
			} else if (tag === DEFINITION_TAG) result.definition = await decodeDefinition(raw);
			else if (tag === ENTITY_TAG)
				result.entity = decodeEntity(
					raw,
					path,
					result.hash,
					modified,
					this.schema(String(properties['huhu-schema-revision'])),
				);
			else if (tag === RELATION_TAG)
				result.relation = decodeRelation(
					raw,
					path,
					result.hash,
					modified,
					this.schema(String(properties['huhu-schema-revision'])),
				);
			else if (tag === MIGRATION_TAG) result.operation = decodeOperation(raw);
			else if (tag === COLLECTION_TAG) {
				envelope(properties, tag);
				result.collectionId = properties['huhu-id'] as string;
				result.collectionReady = properties['huhu-presets-ready'] === true;
			} else if (tag === HEAD_TAG) {
				envelope(properties, tag);
				if (!identifier(properties['huhu-revision-id'])) throw new ArchiveError('invalid-revision');
			} else result.diagnostics.push({ code: 'unknown-record', path, detail: tag });
		} catch (error) {
			// Ordinary notes without HUHU metadata are not silently claimed by this domain.
			if (result.tag || /huhu-(type|id|format-version)/.test(raw.slice(0, 65536)))
				result.diagnostics.push(parseDiagnostic(error, path));
		}
		return result;
	}
	private invalidate(schema = false): void {
		this.entityRevision++;
		if (schema) {
			this.schemaRevision++;
			this.schemaCache = undefined;
		}
		this.diagnosticCache = undefined;
		this.queryCache = undefined;
	}
	apply(entry: IndexedArchive, deferLegacy = false): void {
		const previous = this.entries.get(entry.path),
			affected = new Set<string>([entry.path]);
		for (const key of [entry.path, previous?.entity?.id, entry.entity?.id])
			if (key) for (const owner of this.legacyDependents.get(key) ?? []) affected.add(owner);
		this.detach(entry.path);
		this.entries.set(entry.path, entry);
		if (entry.entity) {
			add(this.entityIds, entry.entity.id, entry.path);
			add(this.types, entry.entity.typeId, entry.path);
			add(this.folders, entry.path.slice(0, entry.path.lastIndexOf('/')), entry.path);
		}
		if (entry.definition) add(this.schemaPaths, entry.definition.revisionId, entry.path);
		if (entry.collectionId) this.collections.set(entry.path, entry.collectionId);
		if (entry.relation) this.attachEdge(entry.path, entry.relation);
		if (entry.legacy) this.trackLegacy(entry.legacy);
		if (entry.operation) {
			add(this.operationIds, entry.operation.id, entry.path);
			add(this.ownerOperations, entry.operation.ownerId, entry.path);
		}
		this.invalidate(!!(entry.definition || previous?.definition || entry.collectionId || previous?.collectionId));
		if (!deferLegacy) for (const owner of affected) this.refreshLegacy(owner);
	}
	delete(path: string, folder = false): void {
		const paths = folder
				? [...this.entries.keys()].filter((item) => item === path || item.startsWith(path + '/'))
				: [path],
			affected = new Set<string>();
		let schema = false;
		for (const item of paths) {
			const previous = this.entries.get(item);
			schema ||= !!(previous?.definition || previous?.collectionId);
			for (const key of [item, previous?.entity?.id])
				if (key) for (const owner of this.legacyDependents.get(key) ?? []) affected.add(owner);
			this.detach(item);
		}
		this.invalidate(schema);
		for (const owner of affected) this.refreshLegacy(owner);
	}
	private detach(path: string): void {
		const previous = this.entries.get(path);
		if (previous?.entity) {
			remove(this.entityIds, previous.entity.id, path);
			remove(this.types, previous.entity.typeId, path);
			remove(this.folders, path.slice(0, path.lastIndexOf('/')), path);
		}
		if (previous?.definition) remove(this.schemaPaths, previous.definition.revisionId, path);
		this.collections.delete(path);
		if (previous?.relation) this.detachEdge(path);
		for (const key of this.virtualByOwner.get(path) ?? []) this.detachEdge(key);
		this.virtualByOwner.delete(path);
		if (previous?.legacy) {
			for (const key of this.legacyKeysByOwner.get(path) ?? []) remove(this.legacyDependents, key, path);
			this.legacyKeysByOwner.delete(path);
		}
		if (previous?.operation) {
			remove(this.operationIds, previous.operation.id, path);
			remove(this.ownerOperations, previous.operation.ownerId, path);
		}
		this.entries.delete(path);
	}
	private trackLegacy(record: ArchiveRecord): void {
		const keys = new Set<string>();
		for (const ref of [
			...record.employments.map((job) => job.company),
			...record.relations.flatMap((relation) => [relation.person, relation.company]),
		]) {
			if (ref.id) keys.add(ref.id);
			if (ref.link) {
				// The resolver below handles .. and encoded links; dependencies also index the exact resolved path.
				const path = legacyLinkPath(record.path, ref.link);
				if (path) keys.add(path);
			}
		}
		this.legacyKeysByOwner.set(record.path, keys);
		for (const key of keys) add(this.legacyDependents, key, record.path);
	}
	private attachEdge(key: string, edge: RelationRecord): void {
		this.edges.set(key, edge);
		add(this.edgeIds, edge.id, key);
		add(this.edgeTypes, edge.relationTypeId, key);
		for (const id of new Set([edge.sourceId, edge.targetId, ...Object.values(edge.contextRefs)]))
			add(this.adjacency, id, key);
	}
	private detachEdge(key: string): void {
		const edge = this.edges.get(key);
		if (!edge) return;
		this.edges.delete(key);
		remove(this.edgeIds, edge.id, key);
		remove(this.edgeTypes, edge.relationTypeId, key);
		for (const id of new Set([edge.sourceId, edge.targetId, ...Object.values(edge.contextRefs)]))
			remove(this.adjacency, id, key);
	}
	private refreshLegacy(path: string): void {
		for (const key of this.virtualByOwner.get(path) ?? []) this.detachEdge(key);
		this.virtualByOwner.delete(path);
		const entry = this.entries.get(path);
		if (!entry?.legacy) return;
		const projection = projectLegacy(entry.legacy, {
			byId: (id) => this.entitiesById(id),
			byPath: (path) => this.entries.get(path)?.entity,
		});
		entry.diagnostics = entry.diagnostics.filter(
			(item) => !['missing-endpoint', 'reference-conflict', 'duplicate-id'].includes(item.code),
		);
		entry.diagnostics.push(...projection.diagnostics);
		const keys = new Set<string>();
		for (const edge of projection.relations) {
			const key = `virtual:${path}:${edge.id}`;
			keys.add(key);
			this.attachEdge(key, edge);
		}
		this.virtualByOwner.set(path, keys);
		this.diagnosticCache = undefined;
		this.queryCache = undefined;
	}
	refreshAllLegacy(): void {
		for (const entry of this.entries.values()) if (entry.legacy) this.refreshLegacy(entry.path);
	}
	entry(path: string): IndexedArchive | undefined {
		const item = this.entries.get(path);
		return item ? copy(item) : undefined;
	}
	paths(): string[] {
		return [...this.entries.keys()];
	}
	entitiesById(id: string): EntityRecord[] {
		return [...(this.entityIds.get(id) ?? [])].flatMap((path) => this.entries.get(path)?.entity ?? []);
	}
	entity(idOrPath: string): EntityRecord | undefined {
		const direct = this.entries.get(idOrPath)?.entity,
			matches = direct ? this.entitiesById(direct.id) : this.entitiesById(idOrPath);
		return matches.length === 1 ? copy(matches[0]!) : undefined;
	}
	allEntities(): EntityRecord[] {
		return copy([...this.entries.values()].flatMap((entry) => entry.entity ?? []));
	}
	operations(): ArchiveOperation[] {
		return copy(
			[...this.operationIds.values()].flatMap((paths) =>
				[...paths].flatMap((path) => this.entries.get(path)?.operation ?? []),
			),
		);
	}
	private operationValue(id: string): ArchiveOperation | undefined {
		const paths = [...(this.operationIds.get(id) ?? [])];
		return paths.length === 1 ? this.entries.get(paths[0]!)?.operation : undefined;
	}
	operation(id: string): ArchiveOperation | undefined {
		const operation = this.operationValue(id);
		return operation ? copy(operation) : undefined;
	}
	collectionIds(): string[] {
		return [...this.collections.values()];
	}
	definitionPaths(id: string): string[] {
		return [...(this.schemaPaths.get(id) ?? [])];
	}
	collectionPaths(): string[] {
		return [...this.collections.keys()];
	}
	private visible(edge: RelationRecord): boolean {
		if (edge.legacy)
			return ![...(this.ownerOperations.get(edge.legacy.ownerId) ?? [])].some((path) => {
				const operation = this.entries.get(path)?.operation;
				return (
					operation?.kind === 'migration' &&
					(operation.state === 'committed' ||
						(operation.state === 'rolling-back' && operation.verified.includes(operation.owner.path)))
				);
			});
		if (!edge.provenance) return true;
		const operation = this.operationValue(edge.provenance.migrationId),
			owner = this.entity(edge.provenance.legacyOwnerId);
		if (operation?.state === 'rolled-back') return false;
		if (owner?.format === 2 && owner.migrationId === edge.provenance.migrationId) return true;
		return (
			operation?.state === 'committed' ||
			(operation?.state === 'rolling-back' && operation.verified.includes(operation.owner.path))
		);
	}
	allRelations(typeId?: string, includeDeleted = false, includeStaged = false): RelationRecord[] {
		const values = typeId
			? [...(this.edgeTypes.get(typeId) ?? [])].map((key) => this.edges.get(key)!)
			: [...this.edges.values()];
		return copy(
			values.filter(
				(edge) => (includeDeleted || edge.lifecycle !== 'deleted') && (includeStaged || this.visible(edge)),
			),
		);
	}
	relationCount(id: string): number {
		return this.edgeIds.get(id)?.size ?? 0;
	}
	relation(id: string): RelationRecord | undefined {
		const keys = [...(this.edgeIds.get(id) ?? [])];
		return keys.length === 1 ? copy(this.edges.get(keys[0]!)!) : undefined;
	}
	private adjacent(id: string): RelationRecord[] {
		return [...(this.adjacency.get(id) ?? [])]
			.map((key) => this.edges.get(key)!)
			.filter((edge) => this.visible(edge) && edge.lifecycle !== 'deleted');
	}
	relations(id: string): RelationResult {
		const diagnostics = this.diagnostics().filter((item) => item.id === id || item.relatedIds?.includes(id));
		return {
			items: copy(this.adjacent(id)),
			entityRevision: this.entityRevision,
			schemaRevision: this.schemaRevision,
			isComplete: !this.loading && !diagnostics.length,
			diagnostics,
		};
	}
	private summary(record: EntityRecord, diagnostics: readonly ArchiveDiagnostic[]): EntitySummary {
		const schema = this.schemas().revisions.get(record.schemaRevisionId),
			type = schema?.definition;
		const ownDiagnostics = diagnostics.filter(
			(item) =>
				item.path === record.path ||
				item.id === record.id ||
				item.id === record.typeId ||
				item.relatedIds?.includes(record.id),
		);
		return {
			...record,
			name: displayName(record.values[type?.kind === 'type' ? type.nameFieldId : 'name'], record.id),
			diagnostics: ownDiagnostics,
			isComplete: !this.loading && !ownDiagnostics.length,
		};
	}
	get(idOrPath: string): EntitySummary | undefined {
		const entity = this.entity(idOrPath);
		return entity ? copy(this.summary(entity, this.diagnostics())) : undefined;
	}
	query(input: EntityQuery): QueryResult {
		validateQuery(input);
		const key = canonical(input);
		if (this.queryCache?.key === key) return copy(this.queryCache.result);
		const diagnostics = this.diagnostics(),
			offset = input.offset ?? 0,
			limit = input.limit ?? 50,
			states = input.states ?? ['draft', 'active'];
		const candidates = input.typeId
			? [...(this.types.get(input.typeId) ?? [])]
					.map((path) => this.entries.get(path)?.entity)
					.filter((item): item is EntityRecord => !!item)
			: [...this.entries.values()].flatMap((entry) => entry.entity ?? []);
		const search = input.search?.trim().toLocaleLowerCase();
		const items = candidates
			.filter((record) => states.includes(record.lifecycle))
			.map((record) => this.summary(record, diagnostics))
			.filter(
				(record) =>
					(!search || `${record.name}\n${canonical(record.values)}`.toLocaleLowerCase().includes(search)) &&
					filterMatches(
						record,
						input.filter,
						(id) => this.adjacent(id),
						(typeId) =>
							this.schemas().current.get(typeId)?.definition.kind === 'relation-type' &&
							!(this.schemas().current.get(typeId)!.definition as RelationTypeDefinition).directed,
					),
			);
		items.sort((a, b) => {
			const byValue = input.sort
				? compareValues(a.values[input.sort.fieldId], b.values[input.sort.fieldId]) *
					(input.sort.direction === 'desc' ? -1 : 1)
				: a.name.localeCompare(b.name);
			return byValue || a.id.localeCompare(b.id) || a.path.localeCompare(b.path);
		});
		const result = {
			items: copy(items.slice(offset, offset + limit)),
			total: items.length,
			offset,
			limit,
			entityRevision: this.entityRevision,
			schemaRevision: this.schemaRevision,
			isComplete: !this.loading && !diagnostics.length,
			diagnostics,
		};
		this.queryCache = { key, result };
		return copy(result);
	}
	catalog(): CatalogSnapshot {
		const { all, current } = this.schemas(),
			definitions = [...current.values()],
			diagnostics = this.diagnostics();
		const types = [...all].flatMap(([id, revisions]) => {
			const revision =
				current.get(id) ??
				[...revisions].sort(
					(a, b) => b.displayVersion - a.displayVersion || a.revisionId.localeCompare(b.revisionId),
				)[0];
			if (revision?.definition.kind !== 'type') return [];
			const type = revision.definition;
			return [
				{
					id,
					label: type.label,
					icon: type.icon,
					enabled: type.enabled && current.has(id),
					revisionId: revision.revisionId,
					count: this.types.get(id)?.size ?? 0,
					diagnostics: diagnostics.filter((item) => item.id === id),
				},
			];
		});
		// Unknown types remain navigable to their raw/read-only records instead of becoming "person".
		for (const [id, paths] of this.types)
			if (!types.some((type) => type.id === id))
				types.push({
					id,
					label: id,
					icon: 'file-question',
					enabled: false,
					revisionId: '',
					count: paths.size,
					diagnostics: [{ code: 'missing-definition', path: '', id }],
				});
		const byKind = (kind: Definition['kind']) =>
			definitions.filter((revision) => revision.definition.kind === kind);
		return copy({
			types,
			forms: byKind('form'),
			views: byKind('view'),
			relationTypes: byKind('relation-type'),
			templates: byKind('template'),
			schemaRevision: this.schemaRevision,
			isComplete: !this.loading && !diagnostics.length,
			diagnostics,
		});
	}
	diagnostics(): ArchiveDiagnostic[] {
		if (this.diagnosticCache) return copy(this.diagnosticCache);
		const result = [
			...this.schemas().diagnostics,
			...[...this.entries.values()].flatMap((entry) => entry.diagnostics),
		];
		const report = (code: ArchiveDiagnostic['code'], edge: RelationRecord, detail?: string) =>
			result.push({
				code,
				path: edge.path,
				id: edge.id,
				relatedIds: [edge.sourceId, edge.targetId, ...Object.values(edge.contextRefs)],
				detail,
			});
		for (const [id, paths] of this.entityIds)
			if (paths.size > 1) for (const path of paths) result.push({ code: 'duplicate-id', path, id });
		for (const [id, keys] of this.edgeIds)
			if (keys.size > 1) for (const key of keys) report('duplicate-id', this.edges.get(key)!, id);
		const collection = this.collectionIds();
		if (collection.length > 1) result.push({ code: 'duplicate-id', path: this.root, detail: 'collection' });
		for (const entry of this.entries.values())
			if (entry.entity) {
				const entity = entry.entity;
				if (!this.schemas().revisions.has(entity.schemaRevisionId))
					result.push({
						code: 'missing-definition',
						path: entity.path,
						id: entity.id,
						detail: entity.schemaRevisionId,
					});
				if (entity.migrationId) {
					const operation = this.operation(entity.migrationId);
					if (!operation || operation.state !== 'committed')
						result.push({
							code: 'pending-migration',
							path: entity.path,
							id: entity.id,
							detail: entity.migrationId,
						});
					for (const id of entity.expectedRelationIds ?? []) {
						const edge = this.relation(id);
						if (
							!edge ||
							edge.provenance?.migrationId !== entity.migrationId ||
							edge.provenance.legacyOwnerId !== entity.id
						)
							result.push({ code: 'pending-migration', path: entity.path, id: entity.id, detail: id });
					}
				}
			}
		const cardinalities = new Map<string, { max: number; edges: RelationRecord[] }>(),
			duplicates = new Map<string, RelationRecord[]>(),
			graphs = new Map<string, RelationRecord[]>();
		for (const edge of this.edges.values()) {
			if (!this.visible(edge) || edge.lifecycle === 'deleted') continue;
			const type = this.schemas().revisions.get(edge.schemaRevisionId)?.definition;
			if (type?.kind !== 'relation-type') {
				report('missing-definition', edge, edge.schemaRevisionId);
				continue;
			}
			for (const id of [edge.sourceId, edge.targetId, ...Object.values(edge.contextRefs)])
				if (!this.entity(id))
					report(this.entityIds.get(id)?.size ? 'duplicate-id' : 'missing-endpoint', edge, id);
			const source = this.entity(edge.sourceId),
				target = this.entity(edge.targetId);
			if (
				(source && !type.sourceTypes.includes(source.typeId)) ||
				(target && !type.targetTypes.includes(target.typeId)) ||
				(!type.allowSelf && edge.sourceId === edge.targetId)
			)
				report('invalid-value', edge, 'endpoint type/self');
			for (const role of type.contextRoles) {
				const id = edge.contextRefs[role.role],
					context = id ? this.entity(id) : undefined;
				if ((role.required && !id) || (context && !role.typeIds.includes(context.typeId)))
					report('invalid-value', edge, role.role);
			}
			for (const side of ['source', 'target'] as const) {
				const cardinality = type[side === 'source' ? 'sourceCardinality' : 'targetCardinality'];
				if (cardinality.max === undefined || (cardinality.scope === 'active' && !activeRelation(edge, type)))
					continue;
				const id = side === 'source' ? edge.sourceId : edge.targetId,
					key = `${type.id}:${type.directed ? side : 'either'}:${id}`;
				const group = cardinalities.get(key) ?? { max: cardinality.max, edges: [] };
				group.edges.push(edge);
				cardinalities.set(key, group);
			}
			if (type.duplicatePolicy !== 'allow') {
				const endpoints = type.directed
					? [edge.sourceId, edge.targetId]
					: [edge.sourceId, edge.targetId].sort();
				const key = canonical([
					type.id,
					endpoints,
					...(type.duplicatePolicy === 'values'
						? [edge.values, edge.contextRefs, edge.validFrom, edge.validTo]
						: []),
				]);
				duplicates.set(key, [...(duplicates.get(key) ?? []), edge]);
			}
			if (type.acyclic && edge.lifecycle === 'active') {
				const group = graphs.get(type.id) ?? [];
				group.push(edge);
				graphs.set(type.id, group);
			}
		}
		for (const group of cardinalities.values())
			if (group.edges.length > group.max) for (const edge of group.edges) report('cardinality', edge);
		for (const group of duplicates.values())
			if (group.length > 1) for (const edge of group) report('duplicate-relation', edge);
		for (const edges of graphs.values()) {
			const incoming = new Map<string, number>(),
				next = new Map<string, string[]>();
			for (const edge of edges) {
				incoming.set(edge.sourceId, incoming.get(edge.sourceId) ?? 0);
				incoming.set(edge.targetId, (incoming.get(edge.targetId) ?? 0) + 1);
				const targets = next.get(edge.sourceId) ?? [];
				targets.push(edge.targetId);
				next.set(edge.sourceId, targets);
			}
			const queue = [...incoming].filter(([, count]) => count === 0).map(([id]) => id);
			for (let index = 0; index < queue.length; index++)
				for (const target of next.get(queue[index]!) ?? []) {
					incoming.set(target, incoming.get(target)! - 1);
					if (incoming.get(target) === 0) queue.push(target);
				}
			for (const edge of edges)
				if ((incoming.get(edge.sourceId) ?? 0) > 0 && (incoming.get(edge.targetId) ?? 0) > 0)
					report('cycle', edge);
		}
		for (const operation of this.operations()) {
			const owner = this.entity(operation.ownerId);
			if (
				operation.state === 'committed' &&
				operation.kind === 'migration' &&
				owner &&
				(owner.format !== 2 || owner.migrationId !== operation.id)
			)
				result.push({ code: 'migration-conflict', path: owner.path, id: owner.id, detail: operation.id });
			if (operation.state !== 'committed' && operation.state !== 'rolled-back')
				result.push({
					code: 'pending-migration',
					path: operation.owner.path,
					id: operation.ownerId,
					detail: operation.id,
				});
		}
		const unique = new Map(result.map((item) => [canonical(item), item]));
		this.diagnosticCache = [...unique.values()];
		return copy(this.diagnosticCache);
	}
	classify(path: string): ResourceClass {
		if (!underRoot(this.root, path)) return 'ordinary';
		const entry = this.entries.get(path);
		if (entry?.entity) return 'entity';
		if (entry?.relation) return 'relation';
		if (entry?.tag === DEFINITION_TAG || entry?.tag === HEAD_TAG) return 'definition';
		if (entry?.tag === COLLECTION_TAG) return 'collection';
		if (entry?.tag === MIGRATION_TAG || path.startsWith(`${this.root}/${ARCHIVE_PATHS.migrations}/`))
			return 'migration';
		if (entry?.diagnostics.length && entry.tag) return 'definition'; // Unknown/damaged managed files are not ordinary notes.
		let folder = path.slice(0, path.lastIndexOf('/'));
		while (underRoot(this.root, folder)) {
			if (this.folders.has(folder)) return 'attachment';
			folder = folder.slice(0, folder.lastIndexOf('/'));
		}
		return 'ordinary';
	}
}

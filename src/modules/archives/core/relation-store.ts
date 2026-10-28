import { DefinitionGraph, DefinitionPublicationError, type DefinitionState } from './definition-graph';
import { textHash } from '../../../shared/storage/text-edits';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import type { ContactsFile, ContactsFiles } from './files';
import type { ArchiveDiagnostic, ArchiveField, ArchiveQuerySnapshot } from './schema';
import { ContactsError } from './model';
import { archiveFrontmatter, archiveMarkdown } from './persist/v2/markdown';
import { readRelation, createRelationMarkdown, patchRelation } from './relation-markdown';
import { canonicalRelation, relationId, sameRelationValue, validateRelationType, validateRelationEndpoints, validateRelationGraph, validateRelationRecord,
	type ArchiveRelation, type CreateRelation, type PublishRelationType, type RelationCatalogSnapshot, type RelationEditBase, type RelationQuerySnapshot, type RelationProjection, type RelationReceipt, type RelationType, type UpdateRelation } from './relation-model';
import { patchYamlValues } from './persist/yaml-values';
import { relationPresets } from './relation-presets';
import { readRelationDeletions, deletionMarkdown, deletionContent, type RelationDeletion, type DeleteRelation } from './relation-deletion';
import { migrationAuthority } from './migration-authority';

interface FileProof { file: ContactsFile; path: string; raw: string; mtime: number; size: number }
interface ScanBaseline { root: string; generation: number; files: Array<{ file: ContactsFile; path: string; mtime: number; size: number }> }
interface Scan { baseline: ScanBaseline; types: RelationType[]; revisions: RelationType[]; relations: ArchiveRelation[]; diagnostics: ArchiveDiagnostic[]; complete: boolean; ids: Map<string, string[]>; operations: Map<string, string[]>; proofs: FileProof[]; definitionStates: Map<string, DefinitionState>; blockedTypes: Set<string>; deletions: RelationDeletion[]; blockedDeletionIds: Set<string>; deletionIncomplete: boolean }
const revisionContent = (type: RelationType): string => { const { contentHash: _hash, ...content } = type; return canonicalRelation(content); };
const errorCode = (error: unknown) => error instanceof ContactsError ? error.code : 'invalidRelation';
/** One file owns each relation. Endpoint and context indexes contain identities, never mirrored writable records. */
export class RelationRepository {
	private parseCache = new Map<string, { raw: string; revision: string; relation: ArchiveRelation }>();
	private adjacency = new Map<string, Set<string>>();
	private indexed = new Map<string, ArchiveRelation>();
	constructor(private files: ContactsFiles, private queue: WriteQueue, private root: () => string,
		private guard: (root: string) => void, private entities: (migrationScope?: ReadonlySet<string>) => Promise<ArchiveQuerySnapshot & { proofs: FileProof[] }>, private generation: () => number, private invalidate: () => void, private validateFields: (fields: ArchiveField[], root: string) => Promise<void>, private entityTypes: () => Promise<string[]>, private graph: DefinitionGraph) {}
	private async definition(request: PublishRelationType, parent?: RelationType): Promise<RelationType> {
		const {baseRevisionId:_base,baseContentHash:_baseHash,...input}=request;
		validateRelationType(input);
		const revisionId = 'r-' + (await textHash(canonicalRelation(parent ? {input,parent:parent.revisionId} : input))).slice(0, 40), content = { ...structuredClone(input), revisionId, parentRevisionIds: parent ? [parent.revisionId] : [] as string[], displayVersion: parent ? parent.displayVersion + 1 : 1 };
		return { ...content, contentHash: await textHash(canonicalRelation(content)) };
	}
	private async proof(file: ContactsFile): Promise<FileProof> {
		const proof = { file, path: file.path, mtime: file.stat.mtime, size: file.stat.size, raw: '' };
		proof.raw = await this.files.read(file);
		if (this.files.getFileByPath(proof.path) !== file || proof.mtime !== file.stat.mtime || proof.size !== file.stat.size) throw new ContactsError('relationChanged', proof.path);
		return proof;
	}
	private baseline(root: string): ScanBaseline {
		const generation = this.generation(), files = this.files.getMarkdownFiles().filter((file) => file.path.startsWith(root + '/'))
			.map((file) => ({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size }));
		const baseline = { root, generation, files }; this.checkBaseline(baseline); return baseline;
	}
	private checkBaseline(baseline: ScanBaseline): void {
		this.guard(baseline.root);
		if (baseline.generation !== this.generation() || this.files.getMarkdownFiles().filter((file) => file.path.startsWith(baseline.root + '/')).length !== baseline.files.length ||
			baseline.files.some((proof) => proof.file.path !== proof.path || this.files.getFileByPath(proof.path) !== proof.file || proof.file.stat.mtime !== proof.mtime || proof.file.stat.size !== proof.size)) throw new ContactsError('relationChanged');
	}
	private async capture(proofs: FileProof[], baseline: ScanBaseline): Promise<() => void> {
		const check = () => { this.checkBaseline(baseline); if (proofs.some((proof) => proof.file.path !== proof.path || this.files.getFileByPath(proof.path) !== proof.file || proof.file.stat.mtime !== proof.mtime || proof.file.stat.size !== proof.size)) throw new ContactsError('relationChanged'); };
		check();
		for (const proof of proofs) { if (await this.files.read(proof.file) !== proof.raw) throw new ContactsError('relationChanged', proof.path); check(); }
		const editors = await this.files.captureEditors(proofs.map((proof) => proof.file)); check();
		return () => { check(); editors(); };
	}
	private index(relations: ArchiveRelation[]): void {
		const next = new Map(relations.map((relation) => [relation.path, relation]));
		const refs = (relation: ArchiveRelation) => new Set([relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)]);
		for (const [path, old] of this.indexed) if (next.get(path)?.raw !== old.raw) for (const id of refs(old)) { const paths = this.adjacency.get(id); paths?.delete(path); if (!paths?.size) this.adjacency.delete(id); }
		for (const [path, relation] of next) if (this.indexed.get(path)?.raw !== relation.raw) for (const id of refs(relation)) { const paths = this.adjacency.get(id) ?? new Set<string>(); paths.add(path); this.adjacency.set(id, paths); }
		this.indexed = next;
	}
	private async scan(): Promise<Scan> {
		const root = this.root(); this.guard(root); await this.files.ready(); this.guard(root);
		const baseline = this.baseline(root);
		const state: Scan = { baseline, types: [], revisions: [], relations: [], diagnostics: [], complete: true, ids: new Map(), operations: new Map(), proofs: [], definitionStates: new Map(), blockedTypes: new Set(), deletions: [], blockedDeletionIds: new Set(), deletionIncomplete: false };
		const pointers: Array<{ path: string; typeId: string; revisionId: string }> = [], pending: FileProof[] = [];
		const paths = new Set<string>();
		for (const { file } of baseline.files.filter(({ path }) => path.startsWith(root + '/档案定义/关系/') || path.startsWith(root + '/关联记录/'))) {
			if (file.path.startsWith(root + '/关联记录/删除事实/')) continue;
			paths.add(file.path);
			let raw: string | undefined;
			try {
				const proof = await this.proof(file); raw = proof.raw; state.proofs.push(proof); this.guard(root);
				const data = archiveFrontmatter(raw);
				if (file.path.startsWith(root + '/关联记录/')) {
					if (relationId(data['huhu-id'])) state.ids.set(data['huhu-id'], [...state.ids.get(data['huhu-id']) ?? [], file.path]);
					if (relationId(data['huhu-operation-id'])) state.operations.set(data['huhu-operation-id'], [...state.operations.get(data['huhu-operation-id']) ?? [], file.path]);
					pending.push(proof); continue;
				}
				if (data['huhu-format-version'] !== 2) throw new ContactsError('futureFormat');
				if (data['huhu-type'] === 'archive-relation-type') {
					const type = data.definition as RelationType; validateRelationType(type);
					if (!relationId(type.revisionId) || !Array.isArray(type.parentRevisionIds) || type.parentRevisionIds.some((id) => !relationId(id)) || !Number.isSafeInteger(type.displayVersion) || type.displayVersion < 1 ||
						file.path !== `${root}/档案定义/关系/${type.relationTypeId}/修订/${type.revisionId}.md` || type.contentHash !== await textHash(revisionContent(type))) throw new ContactsError('invalidRelationDefinition');
					state.revisions.push(type);
				} else if (data['huhu-type'] === 'archive-relation-current' && relationId(data['huhu-relation-type-id']) && relationId(data['huhu-schema-revision']) && file.path === `${root}/档案定义/关系/${data['huhu-relation-type-id']}/当前.md`)
					pointers.push({ path: file.path, typeId: data['huhu-relation-type-id'], revisionId: data['huhu-schema-revision'] });
				else if (data['huhu-type'] !== 'archive-definition-publication') throw new ContactsError('invalidRelationDefinition');
			} catch (error) { if (file.path.startsWith(root + '/档案定义/关系/')) { const id = file.path.slice((root + '/档案定义/关系/').length).split('/')[0]!; state.blockedTypes.add(id); state.diagnostics.push({path:file.path,raw,code:errorCode(error),definitionFamily:'relation',definitionId:id}); } else { state.complete = false; state.diagnostics.push({ path: file.path, raw, code: errorCode(error) }); } }
		}
		const deleted = await readRelationDeletions(this.files, root); state.deletions = deleted.facts; state.blockedDeletionIds = deleted.blockedIds; state.deletionIncomplete = deleted.diagnostics.length > 0; state.proofs.push(...deleted.proofs); state.diagnostics.push(...deleted.diagnostics); if (deleted.unsafe) state.complete = false;
		for (const path of this.parseCache.keys()) if (!paths.has(path)) this.parseCache.delete(path);
		for (const id of new Set([...state.revisions.map(type => type.relationTypeId), ...pointers.map(pointer => pointer.typeId)])) {
			const status = await this.graph.read('relation', id); state.definitionStates.set(id, status);
			state.diagnostics.push(...status.diagnostics.map(item => ({...item,definitionFamily:'relation' as const,definitionId:id})));
			if(status.blocked)state.blockedTypes.add(id);
			const type = state.revisions.find(type => type.relationTypeId === id && type.revisionId === status.effectiveRevisionId);
			if(type)state.types.push(type);
		}

		for (const fact of state.deletions) state.operations.set(fact.operationId,[...state.operations.get(fact.operationId)??[],fact.path]);
		const authority = await migrationAuthority(this.files, root);
		state.proofs.push(...authority.proofs); state.diagnostics.push(...authority.diagnostics);
		if (authority.diagnostics.length) state.complete = false;
		for (const proof of pending) {
			try {
				const data = archiveFrontmatter(proof.raw), migrationId = data['huhu-migration-id'];
				if (migrationId !== undefined) {
					const plan = authority.plans.find(plan => plan.migrationId === migrationId);
					if (!plan || !plan.relations.some(row => row.path === proof.path && row.id === data['huhu-id'])) throw new ContactsError('migrationInvalid');
					if (['staged', 'retired'].includes(authority.states.get(typeof migrationId === 'string' ? migrationId : '') ?? '') || authority.states.get(typeof migrationId === 'string' ? migrationId : '') === 'rollback-pending' && authority.activations.get(typeof migrationId === 'string' ? migrationId : '') === false) continue;
				}
				const type = state.revisions.find((type) => type.relationTypeId === data['huhu-relation-type-id'] && type.revisionId === data['huhu-schema-revision']);
				if (!type) throw new ContactsError('missingDefinition');
				const cached = this.parseCache.get(proof.path), relation = cached?.raw === proof.raw && cached.revision === type.contentHash ? structuredClone(cached.relation) : readRelation(proof.raw, proof.path, type);
				this.parseCache.set(proof.path, { raw: proof.raw, revision: type.contentHash, relation: structuredClone(relation) });
				state.relations.push(relation);
			} catch (error) { state.complete = false; state.diagnostics.push({ path: proof.path, raw: proof.raw, code: errorCode(error) }); }
		}
		for (const relation of state.relations) if ((state.ids.get(relation.id)?.length ?? 0) !== 1 || (state.operations.get(relation.operationId)?.length ?? 0) !== 1) {
			relation.readOnly = true; state.complete = false; state.diagnostics.push({ path: relation.path, raw: relation.raw, code: 'relationIdentityConflict' });
		}
		for (const relation of state.relations) if (state.deletions.some(fact => fact.relationId === relation.id)) { const hash=await textHash(relation.raw); if (state.deletions.some(fact=>fact.relationId===relation.id&&(fact.previousHash!==hash||fact.relationTypeId!==relation.relationTypeId||fact.sourceId!==relation.sourceId||fact.targetId!==relation.targetId||!sameRelationValue(fact.contextRefs,relation.contextRefs)||fact.migrationId!==archiveFrontmatter(relation.raw)['huhu-migration-id']))) { state.deletionIncomplete=true; state.blockedDeletionIds.add(relation.id); state.diagnostics.push({path:relation.path,raw:relation.raw,relationId:relation.id,code:'relationDeletionConflict'}); } relation.lifecycle = 'deleted'; relation.readOnly = true; }
		this.checkBaseline(baseline); return state;
	}
	async catalog(): Promise<RelationCatalogSnapshot> {
		const state = await this.scan(), occupied = new Set(state.revisions.map((type) => type.relationTypeId));
		const presets = await Promise.all(relationPresets().filter((type) => !occupied.has(type.relationTypeId) && !state.diagnostics.some((item) => item.path.includes('/' + type.relationTypeId + '/'))).map((type) => this.definition(type)));
		return structuredClone({ types: [...state.types, ...presets], diagnostics: state.diagnostics, isComplete: state.complete, definitionStates: [...state.definitionStates.values()] });
	}
	private checkEndpoints(relation: ArchiveRelation, type: RelationType, entities: ArchiveQuerySnapshot['entities']): void {
		validateRelationEndpoints(relation, type, entities);
		for (const id of new Set([relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)])) {
			const entity = entities.find((entity) => entity.id === id)!;
			if (entity.formatVersion === 2) {
				const lifecycle = archiveFrontmatter(entity.raw)['huhu-state'];
				if (typeof lifecycle !== 'string' || !['draft', 'active', 'archived'].includes(lifecycle)) throw new ContactsError('relationEndpoint', id);
			}
		}
	}
	async queryForMigration(entityId?: string): Promise<RelationQuerySnapshot> { return this.query(entityId, true); }
	async query(entityId?: string, migration = false): Promise<RelationQuerySnapshot> {
		const root = this.root(), state = await this.scan(), entities = await this.entities(migration ? new Set(entityId ? [entityId] : []) : undefined); this.guard(root);
		for (const relation of state.relations) {
			if(state.blockedTypes.has(relation.relationTypeId) || state.blockedDeletionIds.has(relation.id)) relation.readOnly = true;
			const type = state.revisions.find((type) => type.relationTypeId === relation.relationTypeId && type.revisionId === relation.schemaRevisionId)!;
			if(relation.lifecycle==='deleted') continue;
			try { this.checkEndpoints(relation, type, entities.entities); validateRelationGraph(relation, type, state.relations); }
			catch (error) { relation.readOnly = true; state.diagnostics.push({ path: relation.path, raw: relation.raw, code: errorCode(error), detail: error instanceof ContactsError ? error.detail : '' }); state.complete = false; }
		}
		this.checkBaseline(state.baseline);
		this.index(state.relations);
		const relations = state.relations.filter((relation) => relation.lifecycle !== 'deleted' && (!entityId || this.adjacency.get(entityId)?.has(relation.path)));
		const projections = entityId ? relations.flatMap<RelationProjection>((relation) => {
			const type = state.revisions.find((type) => type.relationTypeId === relation.relationTypeId && type.revisionId === relation.schemaRevisionId)!;
			if (relation.sourceId === entityId || relation.targetId === entityId) return [{ relation, direction: type.direction === 'symmetric' ? 'symmetric' as const : relation.sourceId === entityId ? 'outgoing' as const : 'incoming' as const,
				label: relation.sourceId === entityId ? type.label : type.inverseLabel, otherId: relation.sourceId === entityId ? relation.targetId : relation.sourceId }];
			return Object.entries(relation.contextRefs).filter(([, id]) => id === entityId).map(([role]) => ({ relation, direction: 'context' as const, label: type.label, otherId: relation.sourceId, role }));
		}) : [];
		return structuredClone({ relations, projections, diagnostics: state.diagnostics, isComplete: state.complete && entities.isComplete && !state.deletionIncomplete, deletions: state.deletions.filter(fact => !entityId || [fact.sourceId,fact.targetId,...Object.values(fact.contextRefs)].includes(entityId)) });
	}
	async publishType(input: PublishRelationType): Promise<RelationType> {
		const request = structuredClone(input), {baseRevisionId,baseContentHash,...draft}=request, root = this.root();
		return this.queue.run('archives:relations', async () => {
			this.guard(root);
			const available = await this.entityTypes();
			if ([...draft.sourceTypes, ...draft.targetTypes, ...draft.contextRoles.flatMap((role) => role.types)].some((type) => type !== '*' && !available.includes(type))) throw new ContactsError('invalidRelationDefinition');
			await this.validateFields(draft.fields, root);
			const state = await this.scan(), existing = state.types.find((item) => item.relationTypeId === draft.relationTypeId);
			const proposed = await this.definition(draft);
			if (existing && existing.contentHash === proposed.contentHash) return structuredClone(existing);
			if (existing && (baseRevisionId !== existing.revisionId || baseContentHash !== existing.contentHash)) throw new ContactsError('definitionConflict');
			if (existing) { const {label:_label,inverseLabel:_inverse,revisionId:_rev,parentRevisionIds:_parents,contentHash:_hash,displayVersion:_version,...previous}=existing, {label:_nextLabel,inverseLabel:_nextInverse,...next}=draft; if (!sameRelationValue(previous,next)) throw new ContactsError('definitionCompatibility'); }
			const type = existing ? await this.definition(draft,existing) : proposed;
			const directory = `${root}/档案定义/关系/${type.relationTypeId}`, path = `${directory}/修订/${type.revisionId}.md`, raw = archiveMarkdown({ 'huhu-type': 'archive-relation-type', 'huhu-format-version': 2, 'huhu-publication': 'staged', definition: type });
			if (state.diagnostics.some((item) => item.path.startsWith(directory + '/') && item.severity !== 'warning') || state.definitionStates.get(type.relationTypeId)?.blocked) throw new ContactsError('definitionConflict');
			const present = this.files.getFileByPath(path);
			if (!present) await this.files.create(path, raw, () => this.guard(root));
			const file = this.files.getFileByPath(path); if (!file) throw new ContactsError('writeUnverified', path);
			const baseline = this.baseline(root), proof = await this.proof(file);
			if (proof.raw !== raw) throw new ContactsError('definitionConflict');
			const check = await this.capture([proof], baseline), pointerPath = directory + '/当前.md';
			const pointer = this.files.getFileByPath(pointerPath), pointerRaw = pointer ? await this.files.read(pointer) : undefined;
			await this.graph.publish('relation', type.relationTypeId, type.revisionId, type.contentHash, existing?.revisionId ?? null, check,raw);
			try {
				const published = await this.graph.capture('relation', type.relationTypeId, type.revisionId, [{path,raw}]);
				const final = () => { published(); if (this.files.getFileByPath(pointerPath) !== pointer) throw new ContactsError('definitionConflict'); };
				if (pointer) await this.files.process(pointer, latest => { final(); if (latest !== pointerRaw) throw new ContactsError('definitionConflict'); return patchYamlValues(latest,new Map([['huhu-schema-revision',type.revisionId]])); },final);
				else await this.files.create(pointerPath, archiveMarkdown({ 'huhu-type': 'archive-relation-current', 'huhu-format-version': 2, 'huhu-relation-type-id': type.relationTypeId, 'huhu-schema-revision': type.revisionId }), final);
			} catch(error) { throw new DefinitionPublicationError('relation',type.relationTypeId,type.revisionId,pointerPath,`${directory}/发布/${type.revisionId}.md`,error); }

			const verified = (await this.scan()).types.find((item) => item.relationTypeId === type.relationTypeId);
			if (verified?.contentHash !== type.contentHash) throw new ContactsError('writeUnverified', pointerPath);
			return structuredClone(type);
		}).finally(this.invalidate);
	}
	private async ensureType(id: string, revision: string, hash: string, root: string): Promise<void> {
		this.guard(root);
		if ((await this.scan()).types.some((type) => type.relationTypeId === id)) return;
		const preset = relationPresets().find((type) => type.relationTypeId === id);
		if (preset) { const type = await this.definition(preset); this.guard(root); if (type.revisionId === revision && type.contentHash === hash) await this.publishType(preset); }
	}
	private async prepare(state: Scan, relation: ArchiveRelation, type: RelationType, root: string, migration = false): Promise<() => void> {
		this.checkBaseline(state.baseline);
		if (!state.complete) throw new ContactsError('relationIncomplete');
		if (state.blockedDeletionIds.has(relation.id) || state.relations.some(item => item.relationTypeId === type.relationTypeId && state.blockedDeletionIds.has(item.id))) throw new ContactsError('relationDeletionConflict');
		if (state.blockedTypes.has(type.relationTypeId)) throw new ContactsError('definitionFork', type.relationTypeId);
		const entities = await this.entities(migration ? new Set([relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)]) : undefined);
		this.checkBaseline(state.baseline);
		if (!entities.isComplete) throw new ContactsError('identityUnverified');
		validateRelationRecord(relation, type, relation.lifecycle === 'active'); this.checkEndpoints(relation, type, entities.entities); validateRelationGraph(relation, type, state.relations);
		const proofs = [...state.proofs, ...entities.proofs];
		for (const id of new Set([relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)])) {
			const entity = entities.entities.find((entity) => entity.id === id)!, file = this.files.getFileByPath(entity.path);
			if (!file) throw new ContactsError('relationEndpoint', id);
			const proof = await this.proof(file); if (proof.raw !== entity.raw) throw new ContactsError('relationChanged', id); proofs.push(proof);
		}
		this.guard(root);
		return this.capture(proofs, state.baseline);
	}
	/** Only a visible migration plan may reserve inactive facts. The same final semantic/native gate protects owner switch. */
	async rollbackProof(ownerId: string, allowed: string[]): Promise<() => void> {
		const state = await this.scan();
		if(state.deletions.some(fact=>[fact.sourceId,fact.targetId,...Object.values(fact.contextRefs)].includes(ownerId)))throw new ContactsError('migrationConflict');
		if (state.diagnostics.some(item => !(['migrationConflict', 'migrationRollbackPending'].includes(item.code) && item.entityId === ownerId)) || state.relations.some(relation => [relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)].includes(ownerId) && !allowed.includes(relation.path))) throw new ContactsError('migrationConflict');
		return this.capture(state.proofs, state.baseline);
	}

	async migrationProof(candidates: ArchiveRelation[], migrationId: string, ownerId: string): Promise<() => void> {
		const state = await this.scan(), root = this.root();
		if (!state.complete) throw new ContactsError('relationIncomplete');
		const checks: Array<() => void> = [];
		for (const candidate of candidates) {
			if (state.deletions.some(fact => fact.relationId === candidate.id) || state.blockedDeletionIds.has(candidate.id)) throw new ContactsError('relationDeleted');
			for (const path of state.ids.get(candidate.id) ?? []) if (path !== candidate.path) throw new ContactsError('relationIdentityConflict');
			for (const path of state.operations.get(candidate.operationId) ?? []) if (path !== candidate.path) throw new ContactsError('relationIdentityConflict');
			const present = this.files.getFileByPath(candidate.path);
			if (present && archiveFrontmatter(await this.files.read(present))['huhu-migration-id'] !== migrationId) throw new ContactsError('relationIdentityConflict');
			const type = state.revisions.find(type => type.relationTypeId === candidate.relationTypeId && type.revisionId === candidate.schemaRevisionId);
			if (!type) throw new ContactsError('missingDefinition');
			validateRelationGraph(candidate, type, [...state.relations, ...candidates.filter(relation => relation.id !== candidate.id)]);
			checks.push(await this.prepare(state, candidate, type, root, true));
		}
		if (!candidates.length) {
			const entities = await this.entities(new Set([ownerId])); this.checkBaseline(state.baseline);
			if (!entities.isComplete || entities.entities.filter(entity => entity.id === ownerId && !entity.readOnly).length !== 1) throw new ContactsError('identityUnverified');
			checks.push(await this.capture([...state.proofs, ...entities.proofs], state.baseline));
		}
		return () => { for (const check of checks) check(); };
	}

	async create(input: CreateRelation): Promise<RelationReceipt> {
		const request = structuredClone(input), root = this.root();
		if (!request || !relationId(request.id) || !relationId(request.operationId) || !['draft', 'complete'].includes(request.intent)) throw new ContactsError('invalidRelation');
		const requestHash = await textHash(canonicalRelation(request));
		this.guard(root);
		await this.ensureType(request.relationTypeId, request.schemaRevisionId, request.schemaContentHash, root);
		return this.queue.run('archives:relations', async () => {
			this.guard(root); const state = await this.scan(); if (state.deletions.some(fact => fact.relationId === request.id) || state.blockedDeletionIds.has(request.id)) throw new ContactsError('relationDeleted'); if (!state.complete) throw new ContactsError('relationIncomplete'); const matches = state.relations.filter((relation) => relation.id === request.id || relation.operationId === request.operationId);
			if (matches.length) {
				const relation = matches[0]!; if (matches.length !== 1 || relation.readOnly || relation.id !== request.id || relation.operationId !== request.operationId || relation.requestHash !== requestHash) throw new ContactsError('relationIdentityConflict');
				return { relation: structuredClone(relation), operationId: relation.operationId, contentHash: await textHash(relation.raw), replayed: true };
			}
			if (state.ids.has(request.id) || state.operations.has(request.operationId)) throw new ContactsError('relationIdentityConflict');
			const type = state.types.find((type) => type.relationTypeId === request.relationTypeId && type.revisionId === request.schemaRevisionId && type.contentHash === request.schemaContentHash);
			if (!type) throw new ContactsError('definitionConflict');
			const path = `${root}/关联记录/${type.relationTypeId}/${request.id}.md`;
			const relation: ArchiveRelation = { ...request, contextRefs: request.contextRefs ?? {}, lifecycle: request.intent === 'complete' ? 'active' : 'draft', operationId: request.operationId, requestHash, path, raw: '', readOnly: false };
			const check = await this.prepare(state, relation, type, root), raw = createRelationMarkdown(relation, type);
			const file = await this.files.create(path, raw, () => { check(); if (this.files.getFileByPath(path)) throw new ContactsError('relationIdentityConflict'); });
			if (await this.files.read(file) !== raw) throw new ContactsError('writeUnverified', `${request.operationId}:${path}`);
			return { relation: readRelation(raw, path, type), operationId: request.operationId, contentHash: await textHash(raw), replayed: false };
		}).finally(this.invalidate);
	}
	async delete(input: DeleteRelation): Promise<RelationDeletion> {
		const request = structuredClone(input), root = this.root();
		if (!relationId(request?.operationId) || !request.base?.relation || await textHash(request.base.relation.raw) !== request.base.contentHash) throw new ContactsError('invalidRelation');
		return this.queue.run('archives:relations', async () => {
			this.guard(root); const state = await this.scan(), base = request.base.relation;
			const replay = state.deletions.find(fact => fact.operationId === request.operationId);
			if (replay) { if (state.blockedDeletionIds.has(base.id) || (state.operations.get(request.operationId)?.length??0)!==1 || replay.relationTypeId!==base.relationTypeId || replay.sourceId!==base.sourceId || replay.targetId!==base.targetId || !sameRelationValue(replay.contextRefs,base.contextRefs) || replay.relationId !== base.id || replay.previousHash !== request.base.contentHash) throw new ContactsError('relationIdentityConflict'); return structuredClone(replay); }
			if (state.deletions.some(fact => fact.relationId === base.id) || state.operations.has(request.operationId)) throw new ContactsError('relationDeleted');
			const current = state.relations.find(relation => relation.id === base.id), type = state.revisions.find(type => type.relationTypeId === base.relationTypeId && type.revisionId === base.schemaRevisionId && type.contentHash === request.base.schemaContentHash);
			if (!current || current.readOnly || current.raw !== base.raw || !type) throw new ContactsError('relationChanged');
			const decoded = readRelation(base.raw, base.path, type); if (!sameRelationValue(decoded, base)) throw new ContactsError('invalidRelation');
			const check = await this.prepare(state, current, type, root), metadata = archiveFrontmatter(base.raw), migrationId = metadata['huhu-migration-id'];
			const content = { relationId: base.id, operationId: request.operationId, relationTypeId: base.relationTypeId, sourceId: base.sourceId, targetId: base.targetId, contextRefs: base.contextRefs, ...(typeof migrationId === 'string' ? { migrationId } : {}), previousHash: request.base.contentHash };
			const fact = { ...content, contentHash: await textHash(deletionContent(content)) }, path = `${root}/关联记录/删除事实/${base.id}/${request.operationId}.md`, raw = deletionMarkdown(fact);
			const file = await this.files.create(path, raw, () => { check(); if (this.files.getFileByPath(path)) throw new ContactsError('relationChanged'); });
			if (await this.files.read(file) !== raw) throw new ContactsError('writeUnverified'); return { ...fact, path, raw };
		}).finally(this.invalidate);
	}

	async deletion(id: string): Promise<{ count: number; check: () => void }> {
		const state = await this.scan();
		if (!state.complete || [...state.blockedDeletionIds].some(blocked=>{const relation=state.relations.find(row=>row.id===blocked);return !relation||[relation.sourceId,relation.targetId,...Object.values(relation.contextRefs)].includes(id)||state.deletions.some(fact=>fact.relationId===blocked&&[fact.sourceId,fact.targetId,...Object.values(fact.contextRefs)].includes(id));})) throw new ContactsError('relationIncomplete');
		const references = state.relations.filter((relation) => relation.lifecycle !== 'deleted' && [relation.sourceId, relation.targetId, ...Object.values(relation.contextRefs)].includes(id));
		if (references.some((relation) => state.revisions.find((type) => type.relationTypeId === relation.relationTypeId && type.revisionId === relation.schemaRevisionId)?.deletePolicy === 'restrict')) throw new ContactsError('relationDeleteRestricted');
		return { count: references.length, check: await this.capture(state.proofs, state.baseline) };
	}
	async beginEdit(id: string): Promise<RelationEditBase> {
		const state = await this.scan(), relation = state.relations.find((relation) => relation.id === id);
		if (!relation || relation.readOnly || !state.complete) throw new ContactsError('relationIncomplete');
		const file = this.files.getFileByPath(relation.path)!; this.files.checkEditor(file, relation.raw);
		const type = state.revisions.find((type) => type.relationTypeId === relation.relationTypeId && type.revisionId === relation.schemaRevisionId)!;
		return { relation: structuredClone(relation), contentHash: await textHash(relation.raw), schemaContentHash: type.contentHash };
	}
	async update(input: UpdateRelation): Promise<RelationReceipt> {
		const request = structuredClone(input), root = this.root(), operationId = crypto.randomUUID();
		if (!request?.base?.relation || !request.changes || typeof request.changes !== 'object' || Array.isArray(request.changes) || Object.keys(request.changes).some((key) => !['values', 'contextRefs', 'validFrom', 'validTo', 'status'].includes(key)) || !['draft', 'complete', 'archive'].includes(request.intent) || await textHash(request.base.relation.raw) !== request.base.contentHash) throw new ContactsError('invalidRelation');
		return this.queue.run('archives:relations', async () => {
			this.guard(root); const state = await this.scan(), base = request.base.relation, current = state.relations.find((relation) => relation.id === base.id);
			if (!current || current.readOnly || current.path !== base.path) throw new ContactsError('relationIdentityConflict');
			const type = state.revisions.find((type) => type.relationTypeId === base.relationTypeId && type.revisionId === base.schemaRevisionId && type.contentHash === request.base.schemaContentHash);
			if (!type) throw new ContactsError('definitionConflict');
			const decoded = readRelation(base.raw, base.path, type); if (!sameRelationValue(decoded, base)) throw new ContactsError('invalidRelation');
			const time = new Date().toISOString(), raw = patchRelation(current.raw, decoded, request, type, time), next = readRelation(raw, current.path, type), check = await this.prepare(state, next, type, root);
			const file = this.files.getFileByPath(current.path)!;
			const written = await this.files.process(file, (latest) => { check(); if (latest !== current.raw) throw new ContactsError('relationChanged'); const patch = patchRelation(latest, decoded, request, type, time); if (patch !== raw) throw new ContactsError('writeUnverified'); return patch; }, check);
			if (await this.files.read(file) !== written) throw new ContactsError('writeUnverified', `${operationId}:${current.path}`);
			return { relation: readRelation(written, current.path, type), operationId, contentHash: await textHash(written), replayed: false };
		}).finally(this.invalidate);
	}
}

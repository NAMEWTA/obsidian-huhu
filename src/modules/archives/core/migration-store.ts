import { readRelationDeletions } from './relation-deletion';
import { DefinitionGraph, DefinitionPublicationError } from './definition-graph';
import { textHash } from '../../../shared/storage/text-edits';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import type { ContactsFiles } from './files';
import { ContactsError, legacyFieldKeys, proseSections, type EntityRef } from './model';
import { parseRecord, resolveRelative } from './persist/markdown';
import { archiveFrontmatter, archiveMarkdown } from './persist/v2/markdown';
import { patchYamlValues } from './persist/yaml-values';
import { legacyArchiveTypes } from './legacy-adapter';
import { archiveLocation } from './resources';
import { canonicalRelation, sameRelationValue, relationId, validateRelationRecord, validateRelationGraph, type ArchiveRelation, type PublishRelationType, type RelationType } from './relation-model';
import { relationPresets } from './relation-presets';
import { createRelationMarkdown, readRelation } from './relation-markdown';
import type { RelationRepository } from './relation-store';
import type { ArchiveTypeDefinition, PublishArchiveType, ArchiveQuerySnapshot, ArchiveCatalogSnapshot } from './schema';
import { readReminders } from './reminders';
import { readEntityMarkdown } from './persist/v2/patch';
import { migrationPaths, type MigrationPlan, type MigrationPreflight, type MigrationReceipt, type MigrateArchive } from './migration-model';
import { migrationAuthority, planContent, ownerSwitched, rollbackActivation, type RollbackActivation } from './migration-authority';
const code = (error: unknown) => error instanceof ContactsError ? error.code : 'readFailed';
const date = (value: string) => value ? { value, precision: value.length === 7 ? 'month' as const : 'day' as const } : undefined;
export function migratedType(kind: 'person' | 'company'): PublishArchiveType {
    const base = legacyArchiveTypes().find(type => type.typeId === kind)!;
    return { typeId: 'type-' + kind, label: base.label, folder: base.folder, titleFieldId: 'name', fields: [...base.fields, ...(kind === 'person' ? proseSections : ['notes'] as const).map(fieldId => ({ fieldId, storageKey: 'legacy-' + fieldId, label: fieldId, codec: 'markdown' as const }))] };
}
function relationDefinitions(): PublishRelationType[] {
    const employment = structuredClone(relationPresets().find(type => type.relationTypeId === 'employment')!);
    employment.relationTypeId = 'legacy-employment';
    employment.duplicates.policy = 'allow';
    employment.fields = employment.fields.map(field => field.fieldId === 'keyRole' ? { fieldId: 'keyRole', storageKey: 'key-role', label: 'Key role', codec: 'text' } : field);
    const reports = structuredClone(relationPresets().find(type => type.relationTypeId === 'reportsTo')!);
    reports.relationTypeId = 'legacy-reportsTo';
    reports.contextRoles = [{ role: 'company', types: ['company'], required: false }];
    reports.fields = [{ fieldId: 'notes', storageKey: 'legacy-relation-notes', label: 'Notes', codec: 'text' }];
    reports.duplicates.policy = 'allow';
    const custom: PublishRelationType = { ...structuredClone(reports), relationTypeId: 'legacy-person-relation', label: 'Legacy relationship', inverseLabel: 'Legacy relationship source', acyclic: false, fields: [...reports.fields, { fieldId: 'kind', storageKey: 'legacy-kind', label: 'Original relationship', codec: 'text' }] };
    const symmetric = ['friend', 'colleague'].map(id => { const preset = structuredClone(relationPresets().find(type => type.relationTypeId === id)!); preset.relationTypeId = 'legacy-' + id; preset.fields = structuredClone(reports.fields); preset.contextRoles = structuredClone(reports.contextRoles); preset.duplicates.policy = 'allow'; return preset; });
    return [employment, reports, custom, ...symmetric];
}
/** A portable immutable plan freezes IDs and bytes. Each write rechecks actual Vault/native facts; memory is never commit evidence. */
export class ArchiveMigrationStore {
    constructor(private files: ContactsFiles, private queue: WriteQueue, private root: () => string, private guard: (root: string) => void, private generation: () => number, private invalidate: () => void, private relations: RelationRepository, private catalog: () => Promise<ArchiveCatalogSnapshot>, private snapshot: (scope?: ReadonlySet<string>) => Promise<ArchiveQuerySnapshot>, private validateType: (type: PublishArchiveType, root: string) => Promise<void>, private graph: DefinitionGraph) { }
    private async read(path: string): Promise<string> { const file = this.files.getFileByPath(path); if (!file)
        throw new ContactsError('missing', path); return this.files.read(file); }
    private async capture(root: string, expected: Array<{
        path: string;
        hash: string;
    }> = []): Promise<() => void> {
        this.guard(root);
        const generation = this.generation(), inventory = this.files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/')).map(file => ({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size }));
        const check = () => { this.guard(root); if (generation !== this.generation() || inventory.length !== this.files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/')).length || inventory.some(p => this.files.getFileByPath(p.path) !== p.file || p.file.path !== p.path || p.mtime !== p.file.stat.mtime || p.size !== p.file.stat.size))
            throw new ContactsError('migrationChanged'); };
        for (const proof of expected) {
            if (await textHash(await this.read(proof.path)) !== proof.hash)
                throw new ContactsError('migrationChanged', proof.path);
            check();
        }
        const editors = await this.files.captureEditors(inventory.map(p => p.file));
        check();
        return () => { check(); editors(); };
    }
    async preflight(path: string): Promise<MigrationPreflight> {
        const root = this.root();
        this.guard(root);
        if (!archiveLocation(root, path)) throw new ContactsError('invalidRecord');
        await this.files.ready();
        const check = await this.capture(root), raw = await this.read(path), record = parseRecord(raw, path), location = archiveLocation(root, path);
        const result: MigrationPreflight = { root, path, ownerId: record?.id ?? '', kind: record?.kind ?? 'person', sourceHash: await textHash(raw), canMigrate: false, rows: [], diagnostics: [], counts: { valid: 0, damaged: 0, duplicates: 0, employments: 0, relations: 0, reminders: 0 }, supersedes: [], dependencies: [], dependencyHashes: [], newFiles: 0, backupDirectory: root + '/迁移恢复/' };
        const rawHashes = new Map<string, string>(), ids = new Map<string, string[]>(), byPath = new Map<string, {
            id: string;
            kind: string;
        }>();
        for (const file of this.files.getMarkdownFiles().filter(file => archiveLocation(root, file.path))) {
            try {
                const bytes = await this.files.read(file), data = archiveFrontmatter(bytes), id = data['huhu-id'];
                rawHashes.set(file.path, await textHash(bytes));
                if (typeof id === 'string')
                    ids.set(id, [...ids.get(id) ?? [], file.path]);
                const parsed = parseRecord(bytes, file.path);
                if (parsed) {
                    if (parsed.errors.length) {
                        result.counts.damaged++;
                        result.diagnostics.push({ path: file.path, code: parsed.errors[0]! });
                    }
                    else {
                        result.counts.valid++;
                        byPath.set(file.path, { id: parsed.id, kind: parsed.kind });
                    }
                }
                else if (data['huhu-type'] === 'archive-record' && typeof id === 'string') {
                    byPath.set(file.path, { id, kind: String(data['huhu-archive-type-id']).replace(/^type-(person|company)$/, '$1') });
                    result.counts.valid++;
                }
            }
            catch (error) {
                result.counts.damaged++;
                result.diagnostics.push({ path: file.path, code: code(error) });
            }
        }
        for (const [id, paths] of ids)
            if (paths.length > 1) {
                result.counts.duplicates += paths.length;
                for (const path of paths)
                    result.diagnostics.push({ path, entityId: id, code: 'duplicateId' });
            }
        if (!record || !location || location.kind !== record.kind || record.errors.length || !relationId(record.id))
            result.diagnostics.push({ path, code: 'invalidRecord' });
        if (record && !record.errors.length) {
            const resolve = (ref: EntityRef, kind: string, optional = false): string => {
                if (!ref.id && !ref.link && optional)
                    return '';
                const targetPath = resolveRelative(path, ref.link), target = byPath.get(targetPath);
                if (!ref.id) {
                    result.diagnostics.push({ path, code: 'migrationMissingRef', detail: ref.link });
                    return '';
                }
                if (!target || target.id !== ref.id || target.kind !== kind || ids.get(ref.id)?.length !== 1) {
                    result.diagnostics.push({ path, code: 'migrationAmbiguousRef', detail: ref.link });
                    return '';
                }
                result.dependencies.push(targetPath);
                return ref.id;
            };
            result.counts.employments = record.employments.length;
            result.counts.relations = record.relations.length;
            try {
                result.counts.reminders = readReminders(raw).length;
            }
            catch (error) {
                result.diagnostics.push({ path, code: code(error) });
            }
            record.employments.forEach((job, position) => result.rows.push({ section: 'employments', rowId: job.id, manual: job.id.startsWith('manual-'), position, relationTypeId: 'legacy-employment', sourceId: record.id, targetId: resolve(job.company, 'company'), contextRefs: {}, values: { department: job.department, title: job.title, keyRole: job.keyRole, notes: job.notes }, status: job.status, validFrom: date(job.start), validTo: date(job.end) }));
            record.relations.forEach((relation, position) => { const target = resolve(relation.person, 'person'), company = resolve(relation.company, 'company', true); result.rows.push({ section: 'relations', rowId: relation.id, manual: relation.id.startsWith('manual-'), position, relationTypeId: ['leader', 'report'].includes(relation.kind) ? 'legacy-reportsTo' : ['friend', 'colleague'].includes(relation.kind) ? 'legacy-' + relation.kind : 'legacy-person-relation', sourceId: relation.kind === 'report' ? target : record.id, targetId: relation.kind === 'report' ? record.id : target, contextRefs: company ? { company } : {}, values: { notes: relation.notes, ...(!['leader', 'report', 'friend', 'colleague'].includes(relation.kind) ? { kind: relation.kind } : {}) }, status: 'current', legacyKind: relation.kind }); });
            const body = raw.slice(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0].length ?? 0);
            let fence: {
                char: string;
                length: number;
            } | undefined, open: string | undefined;
            const seen = new Set<string>(), markers = new Set<string>();
            for (const line of body.split(/\r?\n/)) {
                const boundary = /^[ \t]{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
                if (boundary) {
                    const run = boundary[1]!;
                    if (!fence)
                        fence = { char: run[0]!, length: run.length };
                    else if (fence.char === run[0] && run.length >= fence.length && !boundary[2]?.trim())
                        fence = undefined;
                }
                const marker = /^<!-- (\/?)huhu:(employments|relations|traits|habits|notes) -->$/.exec(line);
                if (marker && !fence) {
                    const key = marker[2]!;
                    markers.add(line);
                    if (marker[1]) {
                        if (open !== key)
                            result.diagnostics.push({ path, code: 'invalidSection', detail: key });
                        open = undefined;
                    }
                    else {
                        if (open || seen.has(key))
                            result.diagnostics.push({ path, code: 'invalidSection', detail: key });
                        seen.add(key);
                        open = key;
                    }
                }
                else if (/<!-- \/?huhu:(employments|relations|traits|habits|notes) -->/.test(line))
                    result.diagnostics.push({ path, code: 'invalidSection' });
            }
            if (open)
                result.diagnostics.push({ path, code: 'invalidSection', detail: open });
            for (const section of ['employments', 'relations', ...proseSections])
                for (const closing of ['', '/']) {
                    const marker = `<!-- ${closing}huhu:${section} -->`;
                    if ((raw.split(marker).length - 1) !== (markers.has(marker) ? 1 : 0))
                        result.diagnostics.push({ path, code: 'invalidSection', detail: section });
                }
            for (const row of result.rows) {
                const text = body.split(`<!-- huhu:${row.section} -->`)[1]?.split(`<!-- /huhu:${row.section} -->`)[0] ?? '';
                row.manual = !text.includes(`<!-- huhu:row ${row.rowId} -->`);
            }
        }
        const existingRelations = await this.relations.queryForMigration().catch(error => ({ relations: [], isComplete: false, diagnostics: [{ path, code: code(error) }], projections: [] }));
        if (!existingRelations.isComplete) result.diagnostics.push({ path, code: 'relationIncomplete' });
        const definitions = relationDefinitions(), candidates = result.rows.map((row, index): ArchiveRelation => ({ ...row, id: 'preflight-' + index, schemaRevisionId: 'preflight', operationId: 'preflight-' + index, requestHash: 'preflight', path, raw: '', lifecycle: 'active', readOnly: false }));
        for (const candidate of candidates)
            try {
                const definition = definitions.find(type => type.relationTypeId === candidate.relationTypeId)!, type = { ...definition, revisionId: 'preflight', contentHash: 'preflight', displayVersion: 1, parentRevisionIds: [] };
                validateRelationRecord(candidate, type, true);
                validateRelationGraph({ ...candidate, id: '$candidate-' + candidate.id }, type, [...existingRelations.relations, ...candidates.filter(row => row.id !== candidate.id)]);
            }
            catch (error) {
                result.diagnostics.push({ path, code: code(error) });
            }
        for (const [family,id] of [['type','type-'+result.kind],...result.rows.map(row=>['relation',row.relationTypeId])] as Array<['type'|'relation',string]>) try { this.graph.assertWritable(await this.graph.read(family,id)); } catch(error) { result.diagnostics.push({path,code:code(error)}); }
        const authority = await migrationAuthority(this.files, root);
        result.diagnostics.push(...authority.diagnostics.map(item => ({ ...item, path, detail: item.path })));
        const supersededProofs: Array<{ path: string; hash: string }> = [], deleted = await readRelationDeletions(this.files,root);
        for (const prior of authority.plans.filter(plan => plan.ownerPath === path && plan.ownerId === result.ownerId)) {
            const paths = migrationPaths(root, prior.migrationId), state = authority.states.get(prior.migrationId);
            if (state === 'retired') continue;
            if (state !== 'staged' || this.files.getFileByPath(paths.complete) || this.files.getFileByPath(paths.rollback) || this.files.getFileByPath(paths.rollbackIntent)) { result.diagnostics.push({ path, code: 'migrationConflict', detail: prior.migrationId }); continue; }
            try {
                const loaded = await this.load(prior.migrationId);
                if(deleted.unsafe || loaded.relations.some(row=>deleted.blockedIds.has(row.id)||deleted.facts.some(fact=>fact.relationId===row.id))) throw new ContactsError('migrationConflict');
                for (const row of loaded.relations) if (this.files.getFileByPath(row.path)) {
                    if (await this.read(row.path) !== row.raw) throw new ContactsError('migrationConflict');
                    supersededProofs.push({ path: row.path, hash: row.hash });
                }
                supersededProofs.push(...await this.planProof(loaded));
                result.supersedes.push(prior.migrationId);
            } catch (error) { result.diagnostics.push({ path, code: code(error), detail: prior.migrationId }); }
        }
        const snapshot = await this.snapshot(new Set([result.ownerId, ...result.rows.flatMap(row => [row.sourceId, row.targetId, ...Object.values(row.contextRefs)])]));
        for (const diagnostic of snapshot.diagnostics)
            if (diagnostic.path === path || result.dependencies.includes(diagnostic.path))
                result.diagnostics.push(diagnostic);
        result.dependencies = [...new Set(result.dependencies)];
        result.dependencyHashes = [...result.dependencies.map(path => ({ path, hash: rawHashes.get(path)! })), ...supersededProofs];
        if (!snapshot.isComplete) result.diagnostics.push({ path, code: 'identityUnverified' });
        result.canMigrate = snapshot.isComplete && !!record && !result.diagnostics.some(item => item.path === path || result.dependencies.includes(item.path)) && result.rows.every(row => row.sourceId && row.targetId);
        result.newFiles = result.rows.length + 3;
        check();
        return result;
    }
    private async load(id: string): Promise<MigrationPlan> {
        if (!relationId(id))
            throw new ContactsError('migrationInvalid');
        const root = this.root(), data = archiveFrontmatter(await this.read(migrationPaths(root, id).plan)), plan = data.plan as MigrationPlan;
        if (data['huhu-type'] !== 'archive-migration' || data['huhu-format-version'] !== 2 || !plan || plan.root !== root || plan.migrationId !== id || plan.hash !== await textHash(planContent(plan)))
            throw new ContactsError('migrationInvalid');
        if (plan.operationId !== id || plan.backupPath !== migrationPaths(root, id).backup || archiveLocation(root, plan.ownerPath)?.kind !== plan.kind || !relationId(plan.ownerId) || plan.type.typeId !== 'type-' + plan.kind || !Array.isArray(plan.relations) || !Array.isArray(plan.supersedes) || !Array.isArray(plan.dependencies) || new Set(plan.relations.map(row => row.id)).size !== plan.relations.length || plan.dependencies.some(item => typeof item.path !== 'string' || !item.path.startsWith(root + '/')))
            throw new ContactsError('migrationInvalid');
        const backup = await this.read(plan.backupPath);
        if (await textHash(backup) !== plan.sourceHash || plan.owner.hash !== await textHash(plan.owner.raw) || plan.relations.some(row => row.path !== `${root}/关联记录/${row.row.relationTypeId}/${row.id}.md`))
            throw new ContactsError('migrationInvalid');
        const source = parseRecord(backup, plan.ownerPath), owner = archiveFrontmatter(plan.owner.raw);
        if (!source || source.errors.length || source.id !== plan.ownerId || source.kind !== plan.kind || source.employments.length + source.relations.length !== plan.relations.length || owner['huhu-id'] !== plan.ownerId || owner['huhu-type'] !== 'archive-record' || owner['huhu-format-version'] !== 2 || owner['huhu-migration-id'] !== id || !sameRelationValue(owner['huhu-migration-relations'], plan.relations.map(row => row.id)))
            throw new ContactsError('migrationInvalid');
        const migrated = readEntityMarkdown(plan.owner.raw, plan.ownerPath, plan.type);
        const expectedValues = { ...Object.fromEntries(legacyFieldKeys[source.kind].map(key => [key, source.fields[key]])), ...Object.fromEntries((source.kind === 'person' ? proseSections : ['notes'] as const).map(key => [key, source.prose[key]])) };
        if (migrated.createdAt !== null || !sameRelationValue(migrated.values, expectedValues)) throw new ContactsError('migrationInvalid');
        for (const row of plan.relations) {
            const metadata = archiveFrontmatter(row.raw);
            if (row.hash !== await textHash(row.raw) || metadata['huhu-id'] !== row.id || metadata['huhu-migration-id'] !== id || metadata['huhu-source-id'] !== row.row.sourceId || metadata['huhu-target-id'] !== row.row.targetId)
                throw new ContactsError('migrationInvalid');
        }
        return plan;
    }
    private async put(root: string, path: string, raw: string, expected: Array<{
        path: string;
        hash: string;
    }>, extra?: () => void): Promise<void> {
        const present = this.files.getFileByPath(path);
        if (present) {
            const check = await this.capture(root, [...expected, { path, hash: await textHash(raw) }]);
            if (await this.files.read(present) !== raw)
                throw new ContactsError('migrationConflict', path);
            check();
            extra?.();
            return;
        }
        const check = await this.capture(root, expected);
        const file = await this.files.create(path, raw, () => { check(); extra?.(); if (this.files.getFileByPath(path))
            throw new ContactsError('migrationConflict', path); });
        if (await this.files.read(file) !== raw)
            throw new ContactsError('writeUnverified', path);
    }
    private async ensureEntityType(kind: 'person' | 'company', root: string): Promise<ArchiveTypeDefinition> {
        this.guard(root); const input = migratedType(kind);
        return this.queue.run('archives:definitions', async () => {
            this.graph.assertWritable(await this.graph.read('type', input.typeId));
            const current = (await this.catalog()).types.find(type => type.typeId === input.typeId);
            if (current) {
                this.guard(root);
                if (current.folder !== input.folder || current.titleFieldId !== input.titleFieldId || !sameRelationValue(current.fields.map(({ fieldId, storageKey, codec }) => ({ fieldId, storageKey, codec })), input.fields.map(({ fieldId, storageKey, codec }) => ({ fieldId, storageKey, codec }))))
                    throw new ContactsError('definitionConflict');
                return current;
            }
            await this.validateType(input, root);
            const revisionId = 'r-' + (await textHash(canonicalRelation(input))).slice(0, 40), content = { ...input, revisionId, parentRevisionIds: [] as string[], displayVersion: 1 }, type = { ...content, contentHash: await textHash(canonicalRelation(content)) };
            const directory = `${root}/档案定义/类型/${type.typeId}`, path = `${directory}/修订/${revisionId}.md`, raw = archiveMarkdown({ 'huhu-type': 'archive-type-definition', 'huhu-format-version': 2, 'huhu-publication': 'staged', definition: type });
            await this.put(root, path, raw, []);
            const check = await this.capture(root, [{ path, hash: await textHash(raw) }]), pointerPath = directory + '/当前.md', pointerRaw = archiveMarkdown({ 'huhu-type': 'archive-type-current', 'huhu-format-version': 2, 'huhu-archive-type-id': type.typeId, 'huhu-schema-revision': revisionId });
            await this.graph.publish('type', type.typeId, revisionId, type.contentHash, null, check,raw);
            try { const published = await this.graph.capture('type', type.typeId, revisionId, [{path,raw}]); await this.files.create(pointerPath, pointerRaw, () => { published(); if (this.files.getFileByPath(pointerPath)) throw new ContactsError('definitionConflict'); }); }
            catch(error) { throw new DefinitionPublicationError('type',type.typeId,revisionId,pointerPath,`${directory}/发布/${revisionId}.md`,error); }
            if (await this.read(pointerPath) !== pointerRaw)
                throw new ContactsError('writeUnverified');
            this.invalidate();
            return type;
        });
    }
    private checkRequest(plan: MigrationPlan, request: MigrateArchive): void {
        if (plan.ownerPath !== request.preflight.path || plan.root !== request.preflight.root || plan.ownerId !== request.preflight.ownerId || plan.sourceHash !== request.preflight.sourceHash || !sameRelationValue(plan.relations.map(row => row.row), request.preflight.rows))
            throw new ContactsError('migrationConflict');
    }
    async migrate(input: MigrateArchive): Promise<MigrationReceipt> {
        const request = structuredClone(input), root = this.root();
        if (!request?.preflight || typeof request.preflight.path !== 'string' || !Array.isArray(request.preflight.rows) || !relationId(request.operationId))
            throw new ContactsError('migrationInvalid');
        this.guard(root);
        const paths = migrationPaths(root, request.operationId);
        if (this.files.getFileByPath(paths.plan)) {
            const plan = await this.load(request.operationId);
            this.checkRequest(plan, request);
            return this.resume(request.operationId);
        }
        const preflight = await this.preflight(request.preflight.path);
        if (!preflight.canMigrate || !sameRelationValue(preflight, request.preflight))
            throw new ContactsError('migrationChanged');
        const type = await this.ensureEntityType(preflight.kind, root);
        const types: RelationType[] = [];
        for (const definition of relationDefinitions().filter(type => preflight.rows.some(row => row.relationTypeId === type.relationTypeId))) { this.guard(root); types.push(await this.relations.publishType(definition)); }
        return this.queue.run('archives:relations', async () => {
            this.guard(root);
            if (this.files.getFileByPath(paths.plan)) {
                const plan = await this.load(request.operationId);
                this.checkRequest(plan, request);
                return this.run(plan);
            }
            const source = await this.read(preflight.path);
            if (await textHash(source) !== preflight.sourceHash)
                throw new ContactsError('migrationChanged');
            const record = parseRecord(source, preflight.path)!;
            const relations: MigrationPlan['relations'] = [];
            for (const row of preflight.rows) {
                const schema = types.find(type => type.relationTypeId === row.relationTypeId)!, id = 'mr-' + (await textHash(canonicalRelation([root, request.operationId, preflight.ownerId, row.section, row.rowId, row.manual ? row.position : null, preflight.sourceHash]))).slice(0, 48), operationId = 'mo-' + (await textHash(request.operationId + id)).slice(0, 48), path = `${root}/关联记录/${schema.relationTypeId}/${id}.md`;
                const relation: ArchiveRelation = { ...row, id, operationId, schemaRevisionId: schema.revisionId, requestHash: await textHash(canonicalRelation(row)), lifecycle: 'active', path, raw: '', readOnly: false };
                const raw = patchYamlValues(createRelationMarkdown(relation, schema), new Map<string, unknown>([['huhu-migration-id', request.operationId], ['huhu-legacy-provenance', { ownerId: record.id, path: record.path, sourceHash: preflight.sourceHash, section: row.section, rowId: row.rowId, position: row.position, manual: row.manual, kind: row.legacyKind ?? null }]]));
                relations.push({ id, path, raw, hash: await textHash(raw), row });
            }
            const yaml = new Map<string, unknown>([['huhu-type', 'archive-record'], ['huhu-format-version', 2], ['huhu-archive-type-id', type.typeId], ['huhu-schema-revision', type.revisionId], ['huhu-created-at', null], ['huhu-updated-at', new Date().toISOString()], ['huhu-state', 'active'], ['huhu-migration-id', request.operationId], ['huhu-migration-relations', relations.map(row => row.id)], ['huhu-migration-supersedes', preflight.supersedes]]);
            for (const key of legacyFieldKeys[record.kind])
                yaml.set(key, record.fields[key]);
            let ownerRaw = patchYamlValues(source, yaml);
            for (const section of record.kind === 'person' ? proseSections : ['notes'] as const) {
                if (/<!--\s*\/?huhu:field\b/.test(record.prose[section]))
                    throw new ContactsError('invalidSection');
                ownerRaw += `\n<!-- huhu:field ${section} -->\n${record.prose[section]}\n<!-- /huhu:field ${section} -->\n`;
            }
            readEntityMarkdown(ownerRaw, record.path, type);
            const definitionFiles: Array<{path:string;raw:string}> = [];
            for (const [family,id] of [['type',type.typeId],...types.map(type => ['relation',type.relationTypeId])] as Array<['type'|'relation',string]>) {
                const state = await this.graph.read(family,id); this.graph.assertWritable(state);
                for (const file of this.files.getMarkdownFiles().filter(file=>file.path.startsWith(this.graph.directory(family,id)+'/'))) definitionFiles.push({path:file.path,raw:await this.read(file.path)});
            }

            const dependent: string[] = preflight.supersedes.map(id => migrationPaths(root, id).plan);
            const existing = await this.relations.queryForMigration(record.id);
            if (!existing.isComplete)
                throw new ContactsError('relationIncomplete');
            dependent.push(...existing.relations.map(relation => relation.path));
            const dependencies = [...preflight.dependencyHashes, ...await Promise.all(definitionFiles.map(async (file) => ({ path: file.path, hash: await textHash(file.raw) }))), ...await Promise.all([...new Set(dependent)].map(async (path) => ({ path, hash: await textHash(await this.read(path)) })))];
            const plan: MigrationPlan = { migrationId: request.operationId, operationId: request.operationId, root, ownerId: record.id, kind: record.kind, ownerPath: record.path, sourceHash: preflight.sourceHash, supersedes: preflight.supersedes, backupPath: paths.backup, type, owner: { path: record.path, raw: ownerRaw, hash: await textHash(ownerRaw) }, relations, dependencies, hash: '' };
            plan.hash = await textHash(planContent(plan));
            await this.put(root, paths.backup, source, [{ path: record.path, hash: plan.sourceHash }, ...dependencies]);
            await this.put(root, paths.plan, archiveMarkdown({ 'huhu-type': 'archive-migration', 'huhu-format-version': 2, plan }), [{ path: record.path, hash: plan.sourceHash }, ...dependencies]);
            return this.run(plan);
        }).finally(this.invalidate);
    }
    async resume(id: string): Promise<MigrationReceipt> { return this.queue.run('archives:relations', async () => { const plan = await this.load(id); return this.run(plan); }).finally(this.invalidate); }
    private async planProof(plan: MigrationPlan): Promise<Array<{
        path: string;
        hash: string;
    }>> {
        const raw = archiveMarkdown({ 'huhu-type': 'archive-migration', 'huhu-format-version': 2, plan });
        return [{ path: migrationPaths(plan.root, plan.migrationId).plan, hash: await textHash(raw) }, { path: plan.backupPath, hash: plan.sourceHash }];
    }
    private receipt(plan: MigrationPlan, phase: MigrationReceipt['phase'], verified: number): MigrationReceipt { return { migrationId: plan.migrationId, phase, ownerPath: plan.ownerPath, relations: plan.relations.map(row => row.id), verified, total: plan.relations.length, diagnostics: [] }; }
    private async verifyReceipt(path: string, kind: string, plan: MigrationPlan): Promise<void> {
        const data = archiveFrontmatter(await this.read(path));
        if (data['huhu-type'] !== kind || data['huhu-format-version'] !== 2 || data['huhu-plan-hash'] !== plan.hash) throw new ContactsError('migrationInvalid', path);
        if (kind === 'archive-migration-rollback-intent') rollbackActivation(data, plan);
    }
    private async run(plan: MigrationPlan): Promise<MigrationReceipt> {
        const root = plan.root, paths = migrationPaths(root, plan.migrationId);
        this.guard(root);
        if (this.files.getFileByPath(paths.rollback)) { await this.verifyReceipt(paths.rollback, 'archive-migration-rollback', plan); return this.receipt(plan, 'rolled-back', 0); }
        if (this.files.getFileByPath(paths.rollbackIntent)) { await this.verifyReceipt(paths.rollbackIntent, 'archive-migration-rollback-intent', plan); return this.receipt(plan, 'rollback-pending', 0); }
        const owner = await this.read(plan.ownerPath), switched = archiveFrontmatter(owner)['huhu-migration-id'] === plan.migrationId && archiveFrontmatter(owner)['huhu-type'] === 'archive-record';
        if (!switched && await textHash(owner) !== plan.sourceHash)
            throw new ContactsError('migrationChanged', plan.ownerPath);
        const expected = [...await this.planProof(plan), { path: plan.ownerPath, hash: switched ? plan.owner.hash : plan.sourceHash }, ...plan.dependencies];
        const catalog = await this.relations.catalog(), candidates = plan.relations.map(row => { const schema = catalog.types.find(type => type.relationTypeId === row.row.relationTypeId); if (!schema)
            throw new ContactsError('missingDefinition'); return readRelation(row.raw, row.path, schema); });
        if (!switched) {
            for (let index = 0; index < plan.relations.length; index++) {
                const row = plan.relations[index]!, proof = await this.relations.migrationProof(candidates, plan.migrationId, plan.ownerId), schema = await this.graph.capture('type', plan.type.typeId, plan.type.revisionId);
                const guard = await this.capture(root, expected), present = this.files.getFileByPath(row.path);
                if (present) {
                    if (await this.read(row.path) !== row.raw)
                        throw new ContactsError('migrationConflict', row.path);
                }
                else {
                    const file = await this.files.create(row.path, row.raw, () => { guard(); proof(); schema(); });
                    if (await this.files.read(file) !== row.raw)
                        throw new ContactsError('writeUnverified', row.path);
                }
            }
            const proof = await this.relations.migrationProof(candidates, plan.migrationId, plan.ownerId), schema = await this.graph.capture('type', plan.type.typeId, plan.type.revisionId), guard = await this.capture(root, [...expected, ...plan.relations]);
            const file = this.files.getFileByPath(plan.ownerPath)!;
            await this.files.process(file, latest => { guard(); proof(); schema(); if (latest !== owner)
                throw new ContactsError('migrationChanged'); return plan.owner.raw; }, () => { guard(); proof(); schema(); });
        }
        for (const row of plan.relations)
            if (await this.read(row.path) !== row.raw)
                throw new ContactsError('migrationConflict', row.path);
        if (await this.read(plan.ownerPath) !== plan.owner.raw)
            throw new ContactsError('migrationConflict', plan.ownerPath);
        this.invalidate();
        const query = await this.relations.queryForMigration(plan.ownerId);
        if (!query.isComplete || plan.relations.some(row => !query.relations.some(relation => relation.id === row.id && !relation.readOnly)))
            throw new ContactsError('migrationIncomplete');
        await this.put(root, paths.complete, archiveMarkdown({ 'huhu-type': 'archive-migration-complete', 'huhu-format-version': 2, 'huhu-plan-hash': plan.hash, 'huhu-migration-id': plan.migrationId }), [...await this.planProof(plan), { path: plan.ownerPath, hash: plan.owner.hash }, ...plan.relations, ...plan.dependencies]);
        return this.receipt(plan, 'complete', plan.relations.length);
    }
    async list(): Promise<MigrationReceipt[]> {
        const root = this.root(); this.guard(root); await this.files.ready();
        const authority = await migrationAuthority(this.files, root), list: MigrationReceipt[] = [];
        for (const file of this.files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/迁移记录/'))) {
            try {
                const data = archiveFrontmatter(await this.files.read(file)); if (data['huhu-type'] !== 'archive-migration') continue;
                const plan = await this.load((data.plan as MigrationPlan).migrationId), paths = migrationPaths(root, plan.migrationId), state = authority.states.get(plan.migrationId);
                const diagnostics = authority.diagnostics.filter(item => item.entityId === plan.ownerId || item.path === plan.ownerPath || [paths.plan, paths.complete, paths.rollback, paths.rollbackIntent, ...plan.relations.map(row => row.path)].includes(item.path));
                const owner = await this.read(plan.ownerPath).catch(() => undefined), verified = (await Promise.all(plan.relations.map(async row => await this.read(row.path).catch(() => undefined) === row.raw))).filter(Boolean).length;
                const phase: MigrationReceipt['phase'] = state === 'retired' ? this.files.getFileByPath(paths.rollback) ? 'rolled-back' : 'superseded' : state === 'rollback-pending' ? 'rollback-pending' : state === 'active' ? this.files.getFileByPath(paths.complete) ? 'complete' : 'switched' : state === 'staged' ? 'staged' : 'conflict';
                if (phase === 'switched' && owner !== undefined && await textHash(owner) !== plan.owner.hash) diagnostics.push({ path: plan.ownerPath, entityId: plan.ownerId, code: 'migrationChanged' });
                if ((phase === 'switched' || phase === 'complete') && owner === undefined) diagnostics.push({ path: plan.ownerPath, entityId: plan.ownerId, code: 'migrationIncomplete' });
                list.push({ ...this.receipt(plan, phase, verified), diagnostics });
            } catch (error) { list.push({ migrationId: file.path, phase: 'conflict', ownerPath: file.path, relations: [], verified: 0, total: 0, diagnostics: [{ path: file.path, code: code(error) }] }); }
        }
        this.guard(root); return list;
    }
    async rollback(id: string): Promise<MigrationReceipt> {
        return this.queue.run('archives:relations', async () => {
            const plan = await this.load(id), root = plan.root, paths = migrationPaths(root, id);
            this.guard(root);
            if (this.files.getFileByPath(paths.rollback)) {
                await this.verifyReceipt(paths.rollback, 'archive-migration-rollback', plan);
                if (await textHash(await this.read(plan.ownerPath)) !== plan.sourceHash)
                    throw new ContactsError('migrationConflict');
                return this.receipt(plan, 'rolled-back', 0);
            }
            const intent = this.files.getFileByPath(paths.rollbackIntent), ownerRaw = await this.read(plan.ownerPath), unchangedSource = await textHash(ownerRaw) === plan.sourceHash;
            if (intent) await this.verifyReceipt(paths.rollbackIntent, 'archive-migration-rollback-intent', plan);
            const activation: RollbackActivation = intent ? rollbackActivation(archiveFrontmatter(await this.files.read(intent)), plan) : { sourcePhase: ownerSwitched(archiveFrontmatter(ownerRaw), plan) || this.files.getFileByPath(paths.complete) ? 'active' : 'staged', ownerId: plan.ownerId, migrationId: id, relationIds: plan.relations.map(row => row.id), ownerHash: ownerSwitched(archiveFrontmatter(ownerRaw), plan) || this.files.getFileByPath(paths.complete) ? plan.owner.hash : plan.sourceHash };
            const expectedOwner = unchangedSource && (intent || activation.sourcePhase === 'staged') ? plan.sourceHash : plan.owner.hash;
            const query = await this.relations.queryForMigration(plan.ownerId), allowed = new Set([...plan.relations.map(row => row.path), ...plan.dependencies.map(p => p.path)]);
            if (query.relations.some(relation => !allowed.has(relation.path)))
                throw new ContactsError('migrationConflict');
            const rollbackRelations = expectedOwner === plan.sourceHash && !intent ? plan.relations.filter(row => this.files.getFileByPath(row.path)) : plan.relations;
            const expected = [...await this.planProof(plan), { path: plan.ownerPath, hash: expectedOwner }, ...rollbackRelations, ...plan.dependencies];
            await this.capture(root, expected);
            const intentRaw = archiveMarkdown({ 'huhu-type': 'archive-migration-rollback-intent', 'huhu-format-version': 2, 'huhu-plan-hash': plan.hash, 'huhu-activation': activation });
            await this.put(root, paths.rollbackIntent, intentRaw, expected, await this.relations.rollbackProof(plan.ownerId, [...allowed]));
            expected.push({ path: paths.rollbackIntent, hash: await textHash(intentRaw) });
            const relationsGuard = await this.relations.rollbackProof(plan.ownerId, [...allowed]), check = await this.capture(root, expected), guard = () => { relationsGuard(); check(); }, file = this.files.getFileByPath(plan.ownerPath)!, backup = await this.read(plan.backupPath);
            if (expectedOwner !== plan.sourceHash)
                await this.files.process(file, latest => { guard(); if (latest !== ownerRaw)
                    throw new ContactsError('migrationChanged'); return backup; }, guard);
            await this.put(root, paths.rollback, archiveMarkdown({ 'huhu-type': 'archive-migration-rollback', 'huhu-format-version': 2, 'huhu-plan-hash': plan.hash, 'huhu-migration-id': id }), [...await this.planProof(plan), { path: paths.rollbackIntent, hash: await textHash(intentRaw) }, { path: plan.ownerPath, hash: plan.sourceHash }, ...rollbackRelations, ...plan.dependencies], await this.relations.rollbackProof(plan.ownerId, [...allowed]));
            return this.receipt(plan, 'rolled-back', 0);
        }).finally(this.invalidate);
    }
}

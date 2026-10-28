import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { ContactsApplication } from './core/application';
import { archiveServices } from './services/archive-services';
import type { ContactsFile, ContactsFiles } from './core/files';
import type { PublishRelationType, CreateRelation } from './core/relation-model';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function fixture() {
	const directory = await mkdtemp(join(tmpdir(), 'huhu-relations-')), entries = new Map<string, ContactsFile>();
	cleanup.push(() => rm(directory, { recursive: true, force: true }));
	const update = async (path: string) => { const info = await stat(join(directory, path)); const file = entries.get(path) ?? { path, extension: 'md', stat: { mtime: 0, size: 0 } }; file.stat.mtime = info.mtimeMs; file.stat.size = info.size; entries.set(path, file); return file; };
	const scan = async (folder = ''): Promise<void> => { for (const item of await readdir(join(directory, folder), { withFileTypes: true })) { const path = folder ? folder + '/' + item.name : item.name; if (item.isDirectory()) await scan(path); else await update(path); } };
	const files: ContactsFiles = {
		formatGuide: '', ready: () => scan(), getMarkdownFiles: () => [...entries.values()], getFileByPath: (path) => entries.get(path) ?? null, getAbstractFileByPath: (path) => entries.get(path) ?? null,
		read: (file) => readFile(join(directory, file.path), 'utf8'), cachedRead: (file) => readFile(join(directory, file.path), 'utf8'),
		create: async (path, raw, guard) => { await mkdir(dirname(join(directory, path)), { recursive: true }); guard?.(); await writeFile(join(directory, path), raw, { flag: 'wx' }); return update(path); },
		process: async (file, patch, guard) => { const raw = await files.read(file); guard?.(); const next = patch(raw); await writeFile(join(directory, file.path), next); await update(file.path); return next; },
		mkdir: async (path) => { await mkdir(join(directory, path), { recursive: true }); }, createFolder: async () => {}, createBinary: async () => { throw new Error('unused'); }, listFolder: () => [], trashFolder: async () => {},
		checkFolderEditors: async () => () => {}, captureEditors: async () => () => {}, checkEditor: () => {},
	};
	let root = 'huhu/档案'; const app = () => { const application = new ContactsApplication(files, () => ({ rootFolder: root, maxColumns: 6, layouts: {} })); cleanup.push(async () => application.dispose()); return application; };
	const application = app(), services = archiveServices(() => application.archives);
	return { directory, files, entries, app, application, services, changeRoot: (value: string) => { root = value; } };
}
const relationType = (overrides: Partial<PublishRelationType> = {}): PublishRelationType => ({
	relationTypeId: 'participates', label: 'Participates', inverseLabel: 'Participants', direction: 'directed', sourceTypes: ['*'], targetTypes: ['*'], fields: [{ fieldId: 'role', storageKey: 'role', label: 'Role', codec: 'text' }], temporal: true, allowSelf: false, acyclic: false,
	cardinality: { scope: 'overlap', includeDrafts: false }, duplicates: { policy: 'overlap', fieldIds: ['role'], contextRoles: ['company'] }, contextRoles: [{ role: 'company', types: ['company'], required: false }], deletePolicy: 'retain', ...overrides,
});
async function entities(f: Awaited<ReturnType<typeof fixture>>) {
	const person = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Person' } })).entity;
	const company = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Company' } })).entity;
	await f.services.commands.publishType({ typeId: 'project', label: 'Project', folder: 'Projects', titleFieldId: 'name', fields: [{ fieldId: 'name', storageKey: 'project-name', label: 'Name', codec: 'text' }] });
	const project = (await f.services.commands.createEntity({ typeId: 'project', values: { name: 'Project' } })).entity;
	return { person, company, project };
}
test('public relations use one visible fact and the same identity from both endpoints and context after reload', async () => {
	const f = await fixture(), e = await entities(f);
	expect(f.services.commands).toHaveProperty('publishRelationType');
	const type = await f.services.commands.publishRelationType(relationType());
	const request = { id: 'relation-1', operationId: 'operation-1', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: e.person.id, targetId: e.project.id, values: { role: '000123' }, contextRefs: { company: e.company.id }, validFrom: { value: '2024-05', precision: 'month' as const }, status: 'current' as const, intent: 'complete' as const };
	const receipt = await f.services.commands.createRelation(request);
	expect(receipt.relation.raw).toContain('huhu-type: archive-relation');
	expect(receipt.relation.values.role).toBe('000123');
	expect((await f.services.query.relations(e.person.id)).projections[0]?.direction).toBe('outgoing');
	expect((await f.services.query.relations(e.project.id)).projections[0]?.direction).toBe('incoming');
	expect((await f.services.query.relations(e.company.id)).projections[0]?.direction).toBe('context');
	expect((await f.services.commands.createRelation(request)).replayed).toBe(true);
	const reopenedApp = f.app(), reopened = archiveServices(() => reopenedApp.archives);
	expect((await reopened.query.relations()).relations.map((relation) => relation.id)).toEqual(['relation-1']);
	expect(await readFile(join(f.directory, e.person.path), 'utf8')).toBe(e.person.raw);
});

async function requestFor(f: Awaited<ReturnType<typeof fixture>>, overrides: Partial<PublishRelationType> = {}) {
	const e = await entities(f), type = await f.services.commands.publishRelationType(relationType(overrides));
	let next = 0;
	const request = () => ({ id: 'edge-' + ++next, operationId: 'op-' + next, relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: e.person.id, targetId: e.project.id, values: { role: 'Engineer' }, contextRefs: {}, status: 'past' as 'current' | 'past', intent: 'complete' as 'draft' | 'complete', validFrom: { value: '2020-01', precision: 'month' as const }, validTo: { value: '2020-12', precision: 'month' as const } });
	return { ...e, type, request };
}
test('history, concurrent roles and context remain separate facts; overlap duplicates reject without tuple-wide uniqueness', async () => {
	const f = await fixture(), e = await requestFor(f);
	await f.services.commands.createRelation(e.request());
	await f.services.commands.createRelation({ ...e.request(), validFrom: { value: '2022-01', precision: 'month' }, validTo: { value: '2022-12', precision: 'month' } });
	await f.services.commands.createRelation({ ...e.request(), values: { role: 'Director' } });
	await f.services.commands.createRelation({ ...e.request(), contextRefs: { company: e.company.id } });
	await expect(f.services.commands.createRelation(e.request())).rejects.toMatchObject({ code: 'relationDuplicate' });
	expect((await f.services.query.relations()).relations).toHaveLength(4);
});
test('cardinality counts current and draft separately and checks simultaneous intervals instead of all history', async () => {
	const f = await fixture(), e = await requestFor(f, { cardinality: { sourceMax: 1, scope: 'current', includeDrafts: false }, duplicates: { policy: 'allow', fieldIds: [], contextRoles: [] } });
	await f.services.commands.createRelation(e.request());
	const active = { ...e.request(), status: 'current' as const, validTo: undefined };
	await f.services.commands.createRelation(active);
	await f.services.commands.createRelation({ ...e.request(), targetId: e.company.id, status: 'current', validTo: undefined, intent: 'draft' });
	await expect(f.services.commands.createRelation({ ...e.request(), targetId: e.company.id, status: 'current', validTo: undefined })).rejects.toMatchObject({ code: 'relationCardinality' });
	const overlap = await f.services.commands.publishRelationType(relationType({ relationTypeId: 'limited', cardinality: { sourceMax: 2, scope: 'overlap', includeDrafts: false }, duplicates: { policy: 'allow', fieldIds: [], contextRoles: [] } }));
	const edge = () => ({ ...e.request(), relationTypeId: overlap.relationTypeId, schemaRevisionId: overlap.revisionId, schemaContentHash: overlap.contentHash });
	await f.services.commands.createRelation(edge());
	await f.services.commands.createRelation({ ...edge(), targetId: e.company.id, validTo: { value: '2020-06', precision: 'month' } });
	const third = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Later target' } })).entity;
	await f.services.commands.createRelation({ ...edge(), targetId: third.id, validFrom: { value: '2020-07', precision: 'month' } });
	await expect(f.services.commands.createRelation({ ...edge(), targetId: third.id, validFrom: { value: '2020-05', precision: 'month' } })).rejects.toMatchObject({ code: 'relationCardinality' });
	await expect(f.services.commands.createRelation({ ...edge(), targetId: e.person.id, sourceId: e.person.id, validFrom: { value: '2020-07', precision: 'month' } })).rejects.toMatchObject({ code: 'selfRelation' });
});
test('direction, declared context roles, endpoint types, self links and cycles are enforced by public commands', async () => {
	const f = await fixture(), e = await requestFor(f, { sourceTypes: ['person'], targetTypes: ['project'], acyclic: true });
	await expect(f.services.commands.createRelation({ ...e.request(), sourceId: e.company.id })).rejects.toMatchObject({ code: 'relationEndpointType' });
	await expect(f.services.commands.createRelation({ ...e.request(), contextRefs: { unknown: e.company.id } })).rejects.toMatchObject({ code: 'invalidContext' });
	await expect(f.services.commands.createRelation({ ...e.request(), contextRefs: { company: e.person.id } })).rejects.toMatchObject({ code: 'relationEndpointType' });
	const types = await f.services.catalog.relationTypes(), reports = types.types.find((type) => type.relationTypeId === 'reportsTo')!;
	const second = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Manager' } })).entity;
	const request = { ...e.request(), relationTypeId: reports.relationTypeId, schemaRevisionId: reports.revisionId, schemaContentHash: reports.contentHash, targetId: second.id, values: {} };
	await f.services.commands.createRelation(request);
	expect((await f.services.query.relations(second.id)).projections[0]?.label).toBe('Direct reports');
	await expect(f.services.commands.createRelation({ ...request, id: 'cycle', operationId: 'cycle-op', sourceId: second.id, targetId: e.person.id })).rejects.toMatchObject({ code: 'relationCycle' });
	const friend = (await f.services.catalog.relationTypes()).types.find((type) => type.relationTypeId === 'friend')!;
	await f.services.commands.createRelation({ ...e.request(), relationTypeId: friend.relationTypeId, schemaRevisionId: friend.revisionId, schemaContentHash: friend.contentHash, targetId: second.id, values: {} });
	expect((await f.services.query.relations(second.id)).projections.some((item) => item.direction === 'symmetric')).toBe(true);
});
test('field updates merge separately, preserve unknown YAML/comments/CRLF/body, conflict without losing base, and archive one fact', async () => {
	const f = await fixture(), e = await requestFor(f, { fields: [{ fieldId: 'role', storageKey: 'role', label: 'Role', codec: 'text' }, { fieldId: 'flag', storageKey: 'flag', label: 'Flag', codec: 'boolean' }] });
	const created = await f.services.commands.createRelation(e.request()), path = created.relation.path;
	const raw = '\uFEFF' + created.relation.raw.replace('role: Engineer', 'role: Engineer # author\ncustom: { future: 000123 } # keep').replaceAll('\n', '\r\n') + '\r\nFREE BODY\r\n';
	await writeFile(join(f.directory, path), raw); await f.files.ready(); f.application.archives.invalidate();
	const base = await f.services.commands.beginRelationEdit(created.relation.id);
	await f.services.commands.updateRelation({ base, changes: { values: { flag: false } }, intent: 'complete' });
	const saved = await f.services.commands.updateRelation({ base, changes: { values: { role: 'New' } }, intent: 'complete' });
	expect(saved.relation.values).toEqual({ role: 'New', flag: false });
	expect(saved.relation.raw).toContain('custom: { future: 000123 } # keep\r\n'); expect(saved.relation.raw).toContain(' # author'); expect(saved.relation.raw).toContain('FREE BODY\r\n'); expect(saved.relation.raw.startsWith('\uFEFF')).toBe(true);
	await expect(f.services.commands.updateRelation({ base, changes: { values: { role: 'Other draft' } }, intent: 'complete' })).rejects.toMatchObject({ code: 'conflict' });
	expect(base.relation.values.role).toBe('Engineer');
	const latest = await f.services.commands.beginRelationEdit(created.relation.id), archived = await f.services.commands.updateRelation({ base: latest, changes: {}, intent: 'archive' });
	expect(archived.relation.lifecycle).toBe('archived'); expect((await f.services.query.relations()).relations).toHaveLength(1);
});
test('post-create failure is reconciled by the same operation and relation IDs after reopening, never duplicated', async () => {
	const f = await fixture(), e = await requestFor(f), request = e.request(), original = f.files.create;
	f.files.create = async (path, raw, guard) => { const file = await original(path, raw, guard); if (path.includes('/关联记录/')) throw new Error('after commit EIO'); return file; };
	await expect(f.services.commands.createRelation(request)).rejects.toThrow('after commit EIO');
	f.files.create = original; const app = f.app(), services = archiveServices(() => app.archives);
	expect((await services.commands.createRelation(request)).replayed).toBe(true);
	await expect(services.commands.createRelation({ ...request, values: { role: 'changed intent' } })).rejects.toMatchObject({ code: 'relationIdentityConflict' });
	expect((await services.query.relations()).relations).toHaveLength(1);
});
test('orphans and damaged duplicate identities stay visible and never authorize another write', async () => {
	const f = await fixture(), e = await requestFor(f), request = e.request(), created = await f.services.commands.createRelation(request);
	const personFile = f.entries.get(e.person.path)!; f.entries.delete(e.person.path); await rm(join(f.directory, e.person.path));
	const orphan = await f.services.query.relations(); expect(orphan.relations[0]?.readOnly).toBe(true); expect(orphan.diagnostics.some((item) => item.code === 'relationEndpoint')).toBe(true);
	await writeFile(join(f.directory, e.person.path), e.person.raw); f.entries.set(e.person.path, personFile);
	const duplicate = created.relation.path.replace(request.id + '.md', 'future-copy.md'); await f.files.create(duplicate, created.relation.raw.replace('huhu-format-version: 2', 'huhu-format-version: 99'));
	const snapshot = await f.services.query.relations(); expect(snapshot.relations[0]?.readOnly).toBe(true); expect(snapshot.isComplete).toBe(false);
	await expect(f.services.commands.createRelation(e.request())).rejects.toMatchObject({ code: 'relationIncomplete' });
});

test('final native and endpoint guards refuse late edits, new duplicate files, root changes and disposal without creating a fact', async () => {
	for (const fault of ['native', 'duplicate', 'root', 'dispose'] as const) {
		const f = await fixture(), e = await requestFor(f), request = e.request(), original = f.files.create;
		let dirty = false;
		f.files.captureEditors = async () => () => { if (dirty) throw new Error('native ABA'); };
		f.files.create = async (path, raw, guard) => {
			if (path.includes('/关联记录/')) {
				if (fault === 'native') dirty = true;
				if (fault === 'duplicate') await original(e.person.path.replace('基本信息.md', 'Duplicate/基本信息.md'), e.person.raw);
				if (fault === 'root') f.changeRoot('OtherRoot');
				if (fault === 'dispose') f.application.dispose();
			}
			return original(path, raw, guard);
		};
		await expect(f.services.commands.createRelation(request)).rejects.toThrow();
		expect([...f.entries.keys()].some((path) => path.includes('/关联记录/'))).toBe(false);
	}
});
test('endpoint definition drift during native capture and relation definition drift at process both reject', async () => {
	const f = await fixture(), e = await requestFor(f), request = e.request(), capture = f.files.captureEditors;
	let armed = true;
	f.files.captureEditors = async (files) => {
		if (armed && files.some((file) => file.path.includes('/Projects/'))) { armed = false; const schema = files.find((file) => file.path.includes('/档案定义/类型/'))!; await f.files.process(schema, (raw) => raw + '\nexternal change\n'); }
		return capture(files);
	};
	await expect(f.services.commands.createRelation(request)).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	f.files.captureEditors = capture;
	const created = await f.services.commands.createRelation(request), base = await f.services.commands.beginRelationEdit(created.relation.id), process = f.files.process;
	f.files.process = async (file, patch, guard) => { if (file.path.includes('/关联记录/')) { const definition = [...f.entries.values()].find((file) => file.path.includes('/档案定义/关系/') && file.path.includes('/修订/'))!; await process(definition, (raw) => raw + '\nchanged\n'); } return process(file, patch, guard); };
	await expect(f.services.commands.updateRelation({ base, changes: { values: { role: 'DRAFT' } }, intent: 'complete' })).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	expect(await f.files.read(f.entries.get(created.relation.path)!)).toBe(created.relation.raw);
});
test('partial relation definition creation resumes the identical revision; tampered staged bytes never become current', async () => {
	const f = await fixture(); await entities(f); const original = f.files.create;
	let failed = false;
	f.files.create = async (path, raw, guard) => { if (path.includes('/档案定义/关系/') && path.endsWith('/当前.md') && !failed) { failed = true; throw new Error('pointer EIO'); } return original(path, raw, guard); };
	await expect(f.services.commands.publishRelationType(relationType())).rejects.toThrow('pointer EIO');
	const type = await f.services.commands.publishRelationType(relationType());
	expect([...f.entries.keys()].filter((path) => path.includes('/档案定义/关系/participates/修订/'))).toHaveLength(1);
	expect((await f.services.catalog.relationTypes()).types.find((item) => item.relationTypeId === type.relationTypeId)?.contentHash).toBe(type.contentHash);
	const capture = f.files.captureEditors;
	f.files.captureEditors = async (files) => { const staged = files.find((file) => file.path.includes('/tampered/修订/')); if (staged) await f.files.process(staged, () => 'BROKEN'); return capture(files); };
	await expect(f.services.commands.publishRelationType(relationType({ relationTypeId: 'tampered' }))).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	expect(f.entries.has('huhu/档案/档案定义/关系/tampered/当前.md')).toBe(false);
});
test('unknown relation reads cannot authorize creation and partial writes keep their original retry identity', async () => {
	const f = await fixture(), e = await requestFor(f), originalRead = f.files.read;
	await f.services.commands.createRelation(e.request());
	f.files.read = async (file) => { if (file.path.includes('/关联记录/')) throw new Error('read EIO'); return originalRead(file); };
	const snapshot = await f.services.query.relations(); expect(snapshot.isComplete).toBe(false); expect(snapshot.diagnostics).not.toHaveLength(0);
	await expect(f.services.commands.createRelation(e.request())).rejects.toMatchObject({ code: 'relationIncomplete' });
});
test('reverse context deletion policy restricts the actual legacy deletion entry, while retain leaves an orphan fact', async () => {
	const f = await fixture(), e = await requestFor(f, { deletePolicy: 'restrict' });
	await f.services.commands.createRelation({ ...e.request(), contextRefs: { company: e.company.id } });
	await expect(f.application.deletion(e.company.id)).rejects.toMatchObject({ code: 'relationDeleteRestricted' });
	const retained = await f.services.commands.publishRelationType(relationType({ relationTypeId: 'retained', deletePolicy: 'retain' }));
	const other = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Retained company' } })).entity;
	await f.services.commands.createRelation({ ...e.request(), relationTypeId: retained.relationTypeId, schemaRevisionId: retained.revisionId, schemaContentHash: retained.contentHash, contextRefs: { company: other.id } });
	const deletion = await f.application.deletion(other.id); expect(deletion.relations).toBe(1);
});

test('acyclic temporal relations reject simultaneous cycles and allow a historical chain with no common time', async () => {
	const f = await fixture(), e = await requestFor(f, { acyclic: true, duplicates: { policy: 'allow', fieldIds: [], contextRoles: [] } });
	const edge = () => ({ ...e.request(), validTo: { value: '2020-12', precision: 'month' as const } });
	await f.services.commands.createRelation({ ...edge(), sourceId: e.person.id, targetId: e.company.id, validTo: { value: '2020-05', precision: 'month' } });
	await f.services.commands.createRelation({ ...edge(), sourceId: e.company.id, targetId: e.project.id, validFrom: { value: '2020-06', precision: 'month' } });
	await f.services.commands.createRelation({ ...edge(), sourceId: e.project.id, targetId: e.person.id });
	expect((await f.services.query.relations()).isComplete).toBe(true);
});

test('a root change during lazy preset lookup cannot publish a definition into the next root', async () => {
	const f = await fixture(), e = await entities(f), type = (await f.services.catalog.relationTypes()).types.find((type) => type.relationTypeId === 'employment')!;
	const original = f.files.ready; let armed = true;
	f.files.ready = async () => { await original(); if (armed) { armed = false; f.changeRoot('OtherRoot'); } };
	await expect(f.services.commands.createRelation({ id: 'root-edge', operationId: 'root-op', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: e.person.id, targetId: e.company.id, values: {}, status: 'current', intent: 'complete' })).rejects.toMatchObject({ code: 'folderChanged' });
	expect([...f.entries.keys()].some((path) => path.startsWith('OtherRoot/'))).toBe(false);
});

test.each(['unsupported-state', '[active]', 'null', '99'])('a v2 endpoint with invalid lifecycle %s is not authorized merely because its fields and ID still parse', async (lifecycle) => {
	const f = await fixture(), e = await requestFor(f), file = f.entries.get(e.project.path)!;
	await f.files.process(file, (raw) => raw.replace('huhu-state: draft', 'huhu-state: ' + lifecycle));
	f.application.archives.invalidate();
	await expect(f.services.commands.createRelation(e.request())).rejects.toMatchObject({ code: 'relationEndpoint' });
	expect([...f.entries.keys()].some((path) => path.includes('/关联记录/'))).toBe(false);
});

test.each([
	{ action: 'create', fault: 'cardinality', event: true },
	{ action: 'create', fault: 'duplicate-id', event: true },
	{ action: 'create', fault: 'duplicate-operation', event: true },
	{ action: 'create', fault: 'cycle', event: true },
	{ action: 'create', fault: 'cardinality', event: false },
	{ action: 'update', fault: 'cardinality', event: true },
	{ action: 'update', fault: 'duplicate-id', event: true },
	{ action: 'update', fault: 'duplicate-operation', event: true },
	{ action: 'update', fault: 'cycle', event: true },
	{ action: 'delete', fault: 'restrict-context', event: true },
	{ action: 'delete', fault: 'restrict-context', event: false },
	{ action: 'create', fault: 'cardinality', event: true, final: true },
	{ action: 'update', fault: 'cardinality', event: true, final: true },
	{ action: 'delete', fault: 'restrict-context', event: true, final: true },
])('a $fault fact arriving during the $action scan/final commit cannot be omitted from its final proof (event=$event, final=$final)', async ({ action, fault, event, final = false }) => {
	const f = await fixture(), e = await requestFor(f, {
		cardinality: { scope: 'current', includeDrafts: false, ...(fault === 'cardinality' ? { sourceMax: 1 } : {}) },
		duplicates: { policy: 'allow', fieldIds: [], contextRoles: [] }, acyclic: fault === 'cycle', deletePolicy: fault === 'restrict-context' ? 'restrict' : 'retain',
	});
	const externalRequest: CreateRelation = { ...e.request(), id: 'arriving-id', operationId: 'arriving-operation', sourceId: fault === 'cycle' ? e.company.id : e.person.id, targetId: fault === 'cycle' ? e.person.id : e.project.id,
		status: 'current' as const, validTo: undefined, contextRefs: fault === 'restrict-context' ? { company: e.company.id } : {} };
	const external = await f.services.commands.createRelation(externalRequest);
	await rm(join(f.directory, external.relation.path)); f.entries.delete(external.relation.path); f.application.archives.invalidate();
	const candidate = { ...e.request(), id: fault === 'duplicate-id' ? externalRequest.id : 'candidate-id', operationId: fault === 'duplicate-operation' ? externalRequest.operationId : 'candidate-operation', targetId: e.company.id };
	const base = action === 'update' ? await f.services.commands.beginRelationEdit((await f.services.commands.createRelation(candidate)).relation.id) : undefined;
	const deletion = action === 'delete' ? await f.application.deletion(e.company.id) : undefined;
	const read = f.files.read, create = f.files.create, process = f.files.process;
	let reads = 0, injected = false, trashCalls = 0;
	const inject = async () => {
		injected = true;
		await create(external.relation.path.replace(/[^/]+$/, 'external-arrival.md'), external.relation.raw);
		if (event) f.application.archives.invalidate();
	};
	f.files.trashFolder = async (path, guard) => { if (final) await inject(); guard?.(); trashCalls++; await rm(join(f.directory, path), { recursive: true }); };
	if (final && action === 'create') f.files.create = async (path, raw, guard) => { if (path.includes('/关联记录/')) await inject(); return create(path, raw, guard); };
	if (final && action === 'update') f.files.process = async (file, patch, guard) => { if (file.path === base!.relation.path) await inject(); return process(file, patch, guard); };
	f.files.read = async (file) => {
		const raw = await read(file);
		if (!final && file.path.endsWith('/' + e.type.relationTypeId + '/当前.md') && ++reads === (action === 'create' ? 2 : 1)) await inject();
		return raw;
	};
	if (action === 'create') await expect(f.services.commands.createRelation({ ...candidate, status: 'current', validTo: undefined })).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	else if (action === 'update') await expect(f.services.commands.updateRelation({ base: base!, changes: { status: 'current', validTo: null, values: { role: 'CANDIDATE DRAFT' } }, intent: 'complete' })).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	else await expect(f.application.remove(deletion!)).rejects.toMatchObject({ code: expect.stringMatching(/relationChanged|definitionChanged/) });
	expect(injected).toBe(true); expect(trashCalls).toBe(0);
	if (base) expect(await read(f.entries.get(base.relation.path)!)).toBe(base.relation.raw);
	else if (action === 'create') expect(f.entries.has(`huhu/档案/关联记录/${e.type.relationTypeId}/${candidate.id}.md`)).toBe(false);
	expect(await read(f.entries.get(e.company.path)!)).toBe(e.company.raw);
});

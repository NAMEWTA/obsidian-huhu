import { expect, test, vi } from 'vitest';
import { memoryArchives } from '../services/generic/test-port';
import { ArchivesApplication } from '../services/generic/application';
import { PERSON, COMPANY, EMPLOYMENT } from '../core/schema/presets';
import { patchProperties } from '../core/generic/markdown';
import { createArchivesHealth } from './health';
import { BELONGING_TYPE_ID } from '../api';

test('archive diagnostics locate duplicate IDs and dangling endpoints without changing source bytes', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		const person = await app.commands.create({ operationId: 'health-person', typeId: PERSON.id, values: { name: 'Private name' } });
		const company = await app.commands.create({ operationId: 'health-company', typeId: COMPANY.id, values: { name: 'Private company' } });
		await app.commands.createRelation({ operationId: 'health-edge', relationTypeId: EMPLOYMENT.id, sourceId: person.id, targetId: company.id, contextRefs: {}, values: { status: 'current' } });
		f.files.external(person.path.replace('profile.md', 'copy.md'), f.files.text.get(person.path)!);
		f.files.external(company.path, patchProperties(f.files.text.get(company.path)!, { 'huhu-id': 'moved-id' }));
		await f.runtime.flushEvents();
		const before = new Map(f.files.text), writes = f.files.writes.length;
		const health = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => true });
		const chunks = [];
		for await (const chunk of health.archives.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 100 })) chunks.push(chunk);
		const issues = chunks.flatMap(chunk => chunk.issues ?? []);
		expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['duplicate-id', 'dangling-reference']));
		expect(issues.every(issue => issue.reference && health.resolve(issue.reference))).toBe(true);
		expect(JSON.stringify(chunks)).not.toMatch(/Private|profile\.md|health-person/);
		expect(f.files.writes.length).toBe(writes);
		expect(f.files.text).toEqual(before);
	} finally { f.runtime.dispose(); }
});

test('belonging scans do not read ahead and honor changing slice budgets and cancellation', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.commands.belongings.install();
		for (let n = 0; n < 4; n++) await app.commands.create({ operationId: `budget-${n}`, typeId: BELONGING_TYPE_ID, values: { name: `Item ${n}` } });
		const query = vi.spyOn(app.query, 'entities'), controller = new AbortController();
		let size = 2, remaining = 4;
		const health = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => true });
		const iterator = health.belongings.scan({ signal: controller.signal, get batchSize() { return size; }, get remainingItems() { return remaining; } })[Symbol.asyncIterator]();
		expect((await iterator.next()).value?.checked).toBe(2);
		expect(query).toHaveBeenCalledTimes(1);
		size = 1; remaining = 1;
		expect((await iterator.next()).value?.checked).toBe(1);
		expect(query.mock.calls.map(([input]) => input.limit)).toEqual([2, 1]);
		remaining = 0;
		expect((await iterator.next()).done).toBe(true);
		expect(query).toHaveBeenCalledTimes(2);
		controller.abort();
		const cancelled = health.belongings.scan({ signal: controller.signal, batchSize: 1, remainingItems: 1 })[Symbol.asyncIterator]();
		await expect(cancelled.next()).rejects.toThrow();
		expect(query).toHaveBeenCalledTimes(2);
	} finally { f.runtime.dispose(); }
});

test('archive parsing failures, future versions and divergent schema heads remain read-only diagnostics', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		const created = await app.commands.create({ operationId: 'parse-item', typeId: PERSON.id, values: { name: 'Private' } });
		const head = f.runtime.index.definition(PERSON.id)!;
		const { createRevision } = await import('../core/schema/definitions');
		const { encodeDefinition } = await import('../core/generic/markdown');
		const { definitionPath } = await import('../core/generic/paths');
		await app.commands.publishDefinition({ operationId: 'branch-a', definition: { ...PERSON, label: 'Branch A' }, expectedHeads: [head.revisionId] });
		const branch = await createRevision({ ...PERSON, label: 'Branch B' }, [head.revisionId], 2, 'branch-b');
		f.files.external(definitionPath(f.runtime.root, branch.definition.kind, branch.definition.id, branch.revisionId), encodeDefinition(branch));
		f.files.external('huhu/archives/broken/profile.md', '---\nhuhu-type: archive-record\nmalformed: [\n---\nPRIVATE BODY');
		f.files.external(created.path.replace('profile.md', 'future.md'), f.files.text.get(created.path)!.replace('"huhu-format-version": 2', '"huhu-format-version": 999'));
		await f.runtime.flushEvents();
		const before = new Map(f.files.text), writes = f.files.writes.length;
		const health = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => true });
		const codes: string[] = [];
		for await (const chunk of health.archives.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 100 })) codes.push(...(chunk.issues ?? []).map(issue => issue.code));
		expect(codes).toEqual(expect.arrayContaining(['revision-conflict', 'unparseable', 'unsupported-version']));
		expect(f.files.writes.length).toBe(writes); expect(f.files.text).toEqual(before);
	} finally { f.runtime.dispose(); }
});

test('an incomplete owner query cannot make excluded invalid belongings look healthy', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.commands.belongings.install();
		const created = await app.commands.create({ operationId: 'invalid-item', typeId: BELONGING_TYPE_ID, values: { name: 'Invalid item' } });
		f.files.external(created.path, patchProperties(f.files.text.get(created.path)!, { status: 'unknown-state' }));
		await f.runtime.flushEvents();
		const health = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => true }), chunks = [];
		for await (const chunk of health.belongings.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 10 })) chunks.push(chunk);
		expect(chunks.some(chunk => chunk.status === 'incomplete')).toBe(true);
	} finally { f.runtime.dispose(); }
});

test('belonging projection mismatches are reported per entity without repair or private values', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.commands.belongings.install();
		const created = await app.commands.create({ operationId: 'private-item', typeId: BELONGING_TYPE_ID, values: { name: 'SECRET ITEM' } });
		f.files.external(created.path, patchProperties(f.files.text.get(created.path)!, { status: 'idle' }));
		await f.runtime.flushEvents();
		const before = new Map(f.files.text), writes = f.files.writes.length;
		const health = createArchivesHealth({ catalog: app.catalog, query: app.query, available: () => true });
		const chunks = [];
		for await (const chunk of health.belongings.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 100 })) chunks.push(chunk);
		const issues = chunks.flatMap(chunk => chunk.issues ?? []);
		expect(issues.map(issue => issue.code)).toEqual(['projection-mismatch']);
		expect(health.resolve(issues[0]!.reference!)?.path).toBe(created.path);
		expect(JSON.stringify(chunks)).not.toContain('SECRET ITEM');
		expect(f.files.writes.length).toBe(writes);
		expect(f.files.text).toEqual(before);
	} finally { f.runtime.dispose(); }
});

import { expect, test } from 'vitest';
import { memoryArchives } from './test-port';
import { ArchivesApplication } from './application';
import { PERSON } from '../../core/schema/presets';

test('journal preset is published as a new revision without rewriting old entities or immutable v2 definitions', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		const person = await app.commands.create({ operationId: 'legacy-person', typeId: PERSON.id, values: { name: 'Same name', notes: 'Legacy notes' } });
		const before = new Map(f.files.text), old = await app.query.entity(person.id);
		const installed = await app.personJournal.install();
		expect(installed).toMatchObject({ installed: true, preserved: false, revisionId: 'preset-type-person-journal-v3' });
		const head = f.runtime.index.definition(PERSON.id)!;
		expect(head.parentRevisionIds).toEqual(['preset-type-person-v2']);
		if (head.definition.kind !== 'type') throw new Error('Expected person type');
		expect(head.definition.fields.find(field => field.fieldId === 'journal')).toMatchObject({ kind: 'table', columns: [
			expect.objectContaining({ fieldId: 'date', kind: 'date' }), expect.objectContaining({ fieldId: 'title', kind: 'text' }),
			expect.objectContaining({ fieldId: 'content', kind: 'markdown' }), expect.objectContaining({ fieldId: 'relatedEntityIds', kind: 'strings' }),
		] });
		expect(f.files.text.get(person.path)).toBe(before.get(person.path));
		expect((await app.query.entity(person.id))?.schemaRevisionId).toBe(old?.schemaRevisionId);
		for (const [path, raw] of before) if (path.includes('/revisions/')) expect(f.files.text.get(path)).toBe(raw);
		const writes = f.files.writes.length;
		expect(await app.personJournal.install()).toMatchObject({ installed: false, preserved: false, revisionId: head.revisionId });
		expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

test('same-name people own distinct row IDs; journal CRUD preserves other fields and free body bytes', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.personJournal.install();
		const first = await app.commands.create({ operationId: 'person-one', typeId: PERSON.id, values: { name: 'Same name', notes: '**Untouched**\nline two' } });
		const second = await app.commands.create({ operationId: 'person-two', typeId: PERSON.id, values: { name: 'Same name' } });
		const raw = f.files.text.get(first.path)!.replace('---\n', '---\nuser-key: "00123" # keep comment\n') + '\n# Free Markdown\nUnchanged  \r\nlast line\n';
		f.files.external(first.path, raw); await f.runtime.flushEvents();
		const original = (await app.query.entity(first.id))!;
		const added = await app.personJournal.add({ operationId: 'add-one', entityId: first.id, rowId: 'shared-row', expectedHash: original.contentHash, values: { date: '2026-11-05', title: 'First', content: '**My note**', relatedEntityIds: [second.id] } });
		const other = await app.personJournal.add({ operationId: 'add-two', entityId: second.id, rowId: 'shared-row', expectedHash: second.contentHash, values: { date: '2026-11-05', title: 'Other person', content: 'Other note', relatedEntityIds: [] } });
		const edited = await app.personJournal.update({ operationId: 'edit-one', entityId: first.id, rowId: 'shared-row', expectedHash: added.contentHash, values: { date: '2026-11-04', title: 'Edited', content: 'Updated\nbody', relatedEntityIds: [] } });
		expect((await app.query.entity(first.id))?.values.journal).toEqual([{ rowId: 'shared-row', values: { date: '2026-11-04', title: 'Edited', content: 'Updated\nbody', relatedEntityIds: [] } }]);
		expect((await app.query.entity(second.id))?.values.journal).toEqual([{ rowId: 'shared-row', values: { date: '2026-11-05', title: 'Other person', content: 'Other note', relatedEntityIds: [] } }]);
		expect((await app.query.entity(second.id))?.contentHash).toBe(other.contentHash);
		const removed = await app.personJournal.remove({ operationId: 'delete-one', entityId: first.id, rowId: 'shared-row', expectedHash: edited.contentHash });
		expect(removed.committed).toBe(true);
		const latest = f.files.text.get(first.path)!;
		expect(latest).toContain('user-key: "00123" # keep comment');
		expect(latest.slice(latest.indexOf('\n# Free Markdown'))).toBe(raw.slice(raw.indexOf('\n# Free Markdown')));
		expect((await app.query.entity(first.id))?.values).toMatchObject({ notes: '**Untouched**\nline two', journal: [] });
		expect((await app.query.entity(second.id))?.values.journal).toHaveLength(1);
	} finally { f.runtime.dispose(); }
});

test('old people require an explicit backed-up schema upgrade; edited presets and forms are preserved', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		const old = await app.commands.create({ operationId: 'old-person', typeId: PERSON.id, values: { name: 'Old', notes: 'Original note' } });
		const raw = f.files.text.get(old.path)! + '\n# Keep free body\nText unchanged.\n';
		f.files.external(old.path, raw); await f.runtime.flushEvents();
		const current = (await app.query.entity(old.id))!;
		const form = f.runtime.index.definition('form-person-full')!;
		await app.commands.publishDefinition({ operationId: 'user-form', definition: { ...form.definition, label: 'My form' }, expectedHeads: [form.revisionId] });
		expect(await app.personJournal.install()).toMatchObject({ installed: true, preserved: true });
		expect(f.runtime.index.definition('form-person-full')?.revisionId).toBe('user-form');
		await expect(app.personJournal.add({ operationId: 'premature', entityId: old.id, rowId: 'row', expectedHash: current.contentHash, values: { date: '2026-11-05', title: 'New', content: '', relatedEntityIds: [] } })).rejects.toThrow('person-journal-upgrade-required');
		const plan = await app.personJournal.prepareUpgrade({ operationId: 'person-journal-upgrade', entityId: old.id, expectedHash: current.contentHash });
		expect(plan.state).toBe('prepared');
		expect(f.files.text.get(old.path)).toBe(raw);
		const backup = plan.owner.backupPath;
		if (!backup) throw new Error('Expected original entity backup');
		expect(f.files.text.get(backup)).toBe(raw);
		await app.commands.resumeOperation({ operationId: plan.id });
		expect((await app.query.entity(old.id))?.schemaRevisionId).toBe('preset-type-person-journal-v3');
		expect(f.files.text.get(old.path)?.slice(f.files.text.get(old.path)!.indexOf('\n# Keep free body'))).toBe(raw.slice(raw.indexOf('\n# Keep free body')));
	} finally { f.runtime.dispose(); }
	const other = await memoryArchives(), custom = new ArchivesApplication(other.runtime);
	try {
		await custom.commands.initialize();
		await custom.commands.publishDefinition({ operationId: 'user-person', definition: { ...PERSON, label: 'My people' }, expectedHeads: ['preset-type-person-v2'] });
		const before = new Map(other.files.text), writes = other.files.writes.length;
		expect(await custom.personJournal.install()).toMatchObject({ installed: false, preserved: true, revisionId: 'user-person' });
		expect(other.files.writes.length).toBe(writes); expect(other.files.text).toEqual(before);
	} finally { other.runtime.dispose(); }
});

test('stale hashes, wrong types, invalid rows, duplicates and racing journal edits never overwrite data', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.personJournal.install();
		const person = await app.commands.create({ operationId: 'concurrent-person', typeId: PERSON.id, values: { name: 'One' } });
		const values = { date: '2026-11-05', title: 'Keep', content: 'Body', relatedEntityIds: [] };
		const added = await app.personJournal.add({ operationId: 'initial-row', entityId: person.id, rowId: 'row-one', expectedHash: person.contentHash, values });
		const writes = f.files.writes.length;
		await expect(app.personJournal.remove({ operationId: 'stale-delete', entityId: person.id, rowId: 'row-one', expectedHash: person.contentHash })).rejects.toThrow('write-conflict');
		await expect(app.personJournal.add({ operationId: 'duplicate-row', entityId: person.id, rowId: 'row-one', expectedHash: added.contentHash, values })).rejects.toThrow('duplicate-row-id');
		await expect(app.personJournal.remove({ operationId: 'missing-row', entityId: person.id, rowId: 'absent', expectedHash: added.contentHash })).rejects.toThrow('missing-journal-row');
		for (const patch of [{ date: '2026-02-30' }, { title: ' ' }, { relatedEntityIds: ['bad/path'] }, { relatedEntityIds: ['same', 'same'] }])
			await expect(app.personJournal.add({ operationId: 'invalid-row', entityId: person.id, rowId: 'row-two', expectedHash: added.contentHash, values: { ...values, ...patch } })).rejects.toThrow('invalid-person-journal');
		expect(f.files.writes.length).toBe(writes);
		const { COMPANY } = await import('../../core/schema/presets');
		const company = await app.commands.create({ operationId: 'company', typeId: COMPANY.id, values: { name: 'One' } });
		await expect(app.personJournal.add({ operationId: 'not-a-person', entityId: company.id, rowId: 'row', expectedHash: company.contentHash, values })).rejects.toThrow('invalid-person');
		const { patchProperties } = await import('../../core/generic/markdown');
		f.files.beforeProcess = path => { if (path === person.path) { f.files.beforeProcess = undefined; f.files.external(path, patchProperties(f.files.text.get(path)!, { 'person-journal': [{ rowId: 'row-one', values: { ...values, title: 'External' } }] })); } };
		await expect(app.personJournal.update({ operationId: 'racing-edit', entityId: person.id, rowId: 'row-one', expectedHash: added.contentHash, values: { ...values, title: 'Our edit' } })).rejects.toThrow('field-conflict');
		expect((await app.query.entity(person.id))?.values.journal).toEqual([{ rowId: 'row-one', values: { ...values, title: 'External' } }]);
	} finally { f.runtime.dispose(); }
});

test('concurrent unrelated edits merge, extension columns survive and removing one journal row keeps all others', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		await app.personJournal.install();
		const head = f.runtime.index.definition(PERSON.id)!;
		if (head.definition.kind !== 'type') throw new Error('Expected person');
		await app.commands.publishDefinition({ operationId: 'extended-journal', definition: { ...head.definition, fields: head.definition.fields.map(field => field.fieldId === 'journal' ? { ...field, columns: [...field.columns!, { fieldId: 'custom', storageKey: 'custom', label: 'Custom', kind: 'text' }] } : field) }, expectedHeads: [head.revisionId] });
		const first = { date: '2026-11-01', title: 'First', content: '', relatedEntityIds: [], custom: '00123' };
		const second = { date: '2026-11-02', title: 'Second', content: 'Other row', relatedEntityIds: [], custom: 'keep' };
		const person = await app.commands.create({ operationId: 'extended-person', typeId: PERSON.id, values: { name: 'One', journal: [{ rowId: 'first', values: first }, { rowId: 'second', values: second }] } });
		const { patchProperties } = await import('../../core/generic/markdown');
		f.files.beforeProcess = path => { if (path === person.path) { f.files.beforeProcess = undefined; f.files.external(path, patchProperties(f.files.text.get(path)!, { region: 'Concurrent region' })); } };
		const updated = await app.personJournal.update({ operationId: 'update-first', entityId: person.id, rowId: 'first', expectedHash: person.contentHash, values: { date: first.date, title: 'Updated', content: 'New', relatedEntityIds: [] } });
		expect((await app.query.entity(person.id))?.values).toMatchObject({ region: 'Concurrent region', journal: [{ rowId: 'first', values: { custom: '00123' } }, { rowId: 'second', values: second }] });
		await app.personJournal.remove({ operationId: 'remove-first', entityId: person.id, rowId: 'first', expectedHash: updated.contentHash });
		expect((await app.query.entity(person.id))?.values.journal).toEqual([{ rowId: 'second', values: second }]);
	} finally { f.runtime.dispose(); }
});

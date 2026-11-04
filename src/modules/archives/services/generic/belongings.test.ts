import { expect, test } from 'vitest';
import { memoryArchives } from './test-port';
import { ArchivesApplication } from './application';
import { BelongingsService } from './belongings';
import { BELONGING_TYPE_ID } from '../../api';

test('installation publishes the belonging type and full form through real definitions', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime), belongings = new BelongingsService(f.runtime, app.entities);
	try {
		await belongings.install();
		expect(f.runtime.index.definition(BELONGING_TYPE_ID)?.definition.kind).toBe('type');
		expect(f.runtime.index.definition('form-belonging-full')?.definition.kind).toBe('form');
		const details = { name: 'Full item', image: 'huhu/archives/photo.png', specification: '**Specs**', notes: 'Notes', receipt: 'huhu/archives/receipt.pdf', ownerId: 'person-one', relatedPeople: ['person-two'], companyId: 'company-one' };
		await app.commands.create({ operationId: 'full-item', typeId: BELONGING_TYPE_ID, values: details });
		expect((await app.query.belongings()).items[0]).toMatchObject(details);
	} finally { f.runtime.dispose(); }
});

async function setupItem() {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	await app.commands.belongings.install();
	const created = await app.commands.create({ operationId: 'item-one', typeId: BELONGING_TYPE_ID, values: { name: 'One', purchaseDate: '2026-01-01', purchase: { amount: '100.00', currency: 'CNY' } } });
	return { ...f, app, created };
}

test('transitions are hash guarded and concurrent retries append one stable event', async () => {
	const f = await setupItem();
	try {
		const input = { operationId: 'sold-one', id: f.created.id, expectedHash: f.created.contentHash, status: 'sold' as const, date: '2026-01-03', sale: { amount: '40', currency: 'CNY' } };
		const receipts = await Promise.all([f.app.commands.belongings.transition(input), f.app.commands.belongings.transition(input)]);
		expect(receipts.every(receipt => receipt.committed)).toBe(true);
		const query = await f.app.query.belongings({ asOf: '2026-01-04' });
		expect(query.items[0]?.events.map(event => event.rowId)).toEqual(['sold-one']);
		await expect(f.app.commands.belongings.transition({ ...input, operationId: 'stale', status: 'discard', sale: undefined })).rejects.toThrow('write-conflict');
		await expect(f.app.commands.belongings.transition({ ...input, sale: { amount: '41', currency: 'CNY' } })).rejects.toThrow('command-id-conflict');
	} finally { f.runtime.dispose(); }
});

test('sold/discarded interchange keeps the exit date and returning retains all lifecycle rows', async () => {
	const f = await setupItem();
	try {
		const sold = await f.app.commands.belongings.transition({ operationId: 'sold', id: f.created.id, expectedHash: f.created.contentHash, status: 'sold', date: '2026-01-05', exitDate: '2026-01-03', sale: { amount: '40', currency: 'CNY' } });
		const discarded = await f.app.commands.belongings.transition({ operationId: 'discard', id: sold.id, expectedHash: sold.contentHash, status: 'discard', date: '2026-01-06' });
		let result = await f.app.query.belongings({ asOf: '2026-01-06' });
		expect(result.items[0]).toMatchObject({ exitDate: '2026-01-03', sale: { amount: '40', currency: 'CNY' } });
		await f.app.commands.belongings.transition({ operationId: 'return', id: sold.id, expectedHash: discarded.contentHash, status: 'using', date: '2026-01-07' });
		result = await f.app.query.belongings({ asOf: '2026-01-08' });
		expect(result.items[0]?.events.map(event => event.rowId)).toEqual(['sold', 'discard', 'return']);
		expect(result.statistics.items[0]).toMatchObject({ status: 'using', heldDays: 3, netCost: { amount: '60', currency: 'CNY' } });
	} finally { f.runtime.dispose(); }
});

test('stale generic editing preserves transitions, untouched YAML and free Markdown byte-for-byte', async () => {
	const f = await setupItem();
	try {
		let raw = f.files.text.get(f.created.path)!;
		raw = raw.replace('---\n', '---\ncustom-preserved: "00123"\n') + '\n# Free body\nA user paragraph.\n';
		f.files.external(f.created.path, raw);
		await f.runtime.flushEvents();
		const session = await f.app.commands.beginEdit(f.created.id);
		session.draft.category = 'Devices'; session.dirtyFields = ['category'];
		await f.app.commands.belongings.transition({ operationId: 'to-idle', id: f.created.id, expectedHash: session.baseHash, status: 'idle', date: '2026-01-02' });
		await f.app.commands.save({ operationId: 'generic-category', session });
		const next = (await f.app.query.belongings({ asOf: '2026-01-03' })).items[0]!;
		expect(next).toMatchObject({ category: 'Devices', status: 'idle' });
		expect(next.events.map(event => event.rowId)).toEqual(['to-idle']);
		expect(f.files.text.get(f.created.path)).toContain('custom-preserved: "00123"');
		expect(f.files.text.get(f.created.path)).toContain('\n# Free body\nA user paragraph.\n');
		const forged = await f.app.commands.beginEdit(f.created.id);
		forged.draft.status = 'sold'; forged.dirtyFields = ['status'];
		await expect(f.app.commands.save({ operationId: 'forged-state', session: forged })).rejects.toThrow('belonging-transition-required');
	} finally { f.runtime.dispose(); }
});

test('install never overwrites a user-modified definition', async () => {
	const f = await setupItem();
	try {
		const { BELONGING } = await import('../../core/belongings/preset');
		const head = f.runtime.index.definition(BELONGING_TYPE_ID)!;
		await f.app.commands.publishDefinition({ operationId: 'custom-belonging', definition: { ...BELONGING, label: 'My equipment' }, expectedHeads: [head.revisionId] });
		const writes = f.files.writes.length;
		expect(await f.app.commands.belongings.install()).toEqual({ installed: false, preserved: true });
		expect(f.files.writes.length).toBe(writes);
		expect(f.runtime.index.definition(BELONGING_TYPE_ID)?.definition.label).toBe('My equipment');
	} finally { f.runtime.dispose(); }
});

test('reinstall preserves a user-customized belonging starter template', async () => {
	const f = await setupItem();
	try {
		const head = f.runtime.index.definition('template-belonging-default')!;
		if (head.definition.kind !== 'template') throw new Error('Expected starter template');
		const definition = { ...head.definition, label: 'My starter', body: 'User body', defaults: { ...head.definition.defaults, category: 'User category' } };
		await f.app.commands.publishDefinition({ operationId: 'custom-starter', definition, expectedHeads: [head.revisionId] });
		const writes = f.files.writes.length;
		expect(await f.app.commands.belongings.install()).toEqual({ installed: false, preserved: true });
		expect(f.files.writes.length).toBe(writes);
		expect(f.runtime.index.definition(head.definition.id)?.definition).toEqual(definition);
	} finally { f.runtime.dispose(); }
});

test('generic same-field edits still conflict and create cannot forge a lifecycle projection', async () => {
	const f = await setupItem();
	try {
		const first = await f.app.commands.beginEdit(f.created.id), stale = await f.app.commands.beginEdit(f.created.id);
		first.draft.category = 'First'; first.dirtyFields = ['category'];
		stale.draft.category = 'Second'; stale.dirtyFields = ['category'];
		await f.app.commands.save({ operationId: 'first-category', session: first });
		await expect(f.app.commands.save({ operationId: 'second-category', session: stale })).rejects.toThrow('field-conflict');
		await expect(f.app.commands.create({ operationId: 'forged-create', typeId: BELONGING_TYPE_ID, values: { name: 'Forged', status: 'sold' } })).rejects.toThrow('belonging-transition-required');
		expect((await f.app.query.belongings()).items[0]?.category).toBe('First');
	} finally { f.runtime.dispose(); }
});

test('schema upgrades preserve lifecycle values and cannot bypass the transition command', async () => {
	const f = await setupItem();
	try {
		const { BELONGING } = await import('../../core/belongings/preset');
		const head = f.runtime.index.definition(BELONGING_TYPE_ID)!;
		const next = await f.app.commands.publishDefinition({ operationId: 'belonging-v2', definition: { ...BELONGING, label: 'Equipment' }, expectedHeads: [head.revisionId] });
		const session = await f.app.commands.beginEdit(f.created.id);
		await expect(f.app.commands.prepareUpgrade({ operationId: 'upgrade-forged', id: f.created.id, expectedHash: session.baseHash, revisionId: next.revision.revisionId, values: { ...session.draft, status: 'idle' } })).rejects.toThrow('belonging-transition-required');
		const prepared = await f.app.commands.prepareUpgrade({ operationId: 'upgrade-valid', id: f.created.id, expectedHash: session.baseHash, revisionId: next.revision.revisionId, values: session.draft });
		expect(prepared.state).toBe('prepared');
	} finally { f.runtime.dispose(); }
});

test('a change between transition read and process is rejected without overwriting the other edit', async () => {
	const f = await setupItem();
	try {
		const { patchProperties } = await import('../../core/generic/markdown');
		f.files.beforeProcess = path => { if (path === f.created.path) { f.files.beforeProcess = undefined; f.files.external(path, patchProperties(f.files.text.get(path)!, { category: 'External edit' })); } };
		await expect(f.app.commands.belongings.transition({ operationId: 'racing', id: f.created.id, expectedHash: f.created.contentHash, status: 'idle', date: '2026-01-02' })).rejects.toThrow('write-conflict');
		await f.runtime.flushEvents();
		const item = (await f.app.query.belongings()).items[0]!;
		expect(item).toMatchObject({ category: 'External edit', status: 'using', events: [] });
	} finally { f.runtime.dispose(); }
});

test('committed belonging changes use the injected event port with IDs/hashes only', async () => {
	const f = await setupItem();
	const { DomainEvents } = await import('../../../../shared/events/domain-events');
	const { bindArchiveFileChanges } = await import('./file-changes');
	const { BELONGINGS_CHANGED } = await import('../../api');
	const events = new DomainEvents(), cleanups: Array<() => void> = [], changes: unknown[] = [];
	bindArchiveFileChanges(f.runtime, events, { register: cleanup => { cleanups.push(cleanup); } });
	events.on(BELONGINGS_CHANGED, value => { changes.push(value); });
	try {
		const receipt = await f.app.commands.belongings.transition({ operationId: 'event-transition', id: f.created.id, expectedHash: f.created.contentHash, status: 'idle', date: '2026-01-02' });
		expect(changes).toEqual([{ id: f.created.id, contentHash: receipt.contentHash }]);
		await expect(f.app.commands.belongings.transition({ operationId: 'no-event', id: f.created.id, expectedHash: f.created.contentHash, status: 'using', date: '2026-01-03' })).rejects.toThrow('write-conflict');
		expect(changes).toHaveLength(1);
	} finally { for (const cleanup of cleanups) cleanup(); events.dispose(); f.runtime.dispose(); }
});

test('exit correction and return append history without erasing user-defined columns or missing optional values', async () => {
	const f = await memoryArchives(), app = new ArchivesApplication(f.runtime);
	try {
		const { BELONGING } = await import('../../core/belongings/preset');
		const { patchProperties } = await import('../../core/generic/markdown');
		await app.commands.belongings.install();
		const head = f.runtime.index.definition(BELONGING_TYPE_ID)!;
		await app.commands.publishDefinition({ operationId: 'custom-history', expectedHeads: [head.revisionId], definition: {
			...BELONGING, fields: BELONGING.fields.map(field => field.fieldId === 'events' ? { ...field, columns: [...field.columns!,
				{ fieldId: 'customNote', storageKey: 'customNote', label: 'Custom note', kind: 'text' as const },
			] } : field),
		} });
		const created = await app.commands.create({ operationId: 'extended-item', typeId: BELONGING_TYPE_ID, values: { name: 'Extended item', purchaseDate: '2026-01-01' } });
		await app.commands.belongings.transition({ operationId: 'original-sale', id: created.id, expectedHash: created.contentHash, status: 'sold', date: '2026-01-03' });
		const session = await app.commands.beginEdit(created.id);
		const rows = session.draft.events as Array<{ rowId: string; values: Record<string, unknown> }>;
		rows[0]!.values.customNote = 'USER-HISTORY-NOTE';
		delete rows[0]!.values.sale;
		f.files.external(created.path, patchProperties(f.files.text.get(created.path)!, { events: rows }));
		await f.runtime.flushEvents();
		const before = await app.commands.beginEdit(created.id);
		const corrected = await app.commands.belongings.transition({ operationId: 'correct-exit', id: created.id, expectedHash: before.baseHash, status: 'sold', date: '2026-01-04', exitDate: '2026-01-02' });
		const afterCorrection = await app.commands.beginEdit(created.id);
		expect((afterCorrection.draft.events as unknown[])[0]).toEqual(rows[0]);
		expect(afterCorrection.draft.events).toHaveLength(2);
		await app.commands.belongings.transition({ operationId: 'return-extended', id: created.id, expectedHash: corrected.contentHash, status: 'using', date: '2026-01-05' });
		const returned = await app.commands.beginEdit(created.id);
		expect((returned.draft.events as unknown[]).slice(0, 2)).toEqual(afterCorrection.draft.events);
		expect(returned.draft.events).toHaveLength(3);
		expect((await app.query.belongings()).items[0]?.events[0]?.values.customNote).toBe('USER-HISTORY-NOTE');
	} finally { f.runtime.dispose(); }
});

test('owner undo restores a returned holding cycle without deleting history and rejects changed objects', async () => {
	const f = await setupItem();
	try {
		const sold = await f.app.commands.belongings.transition({ operationId: 'undo-sale', id: f.created.id, expectedHash: f.created.contentHash, status: 'sold', date: '2026-01-05', exitDate: '2026-01-03', sale: { amount: '40', currency: 'CNY' } });
		const returned = await f.app.commands.belongings.transition({ operationId: 'undo-return', id: sold.id, expectedHash: sold.contentHash, status: 'using', date: '2026-01-07' });
		const undone = await f.app.commands.belongings.undo({ operationId: 'undo-return-command', originalOperationId: 'undo-return', id: sold.id, expectedHash: returned.contentHash });
		const result = await f.app.query.belongings();
		expect(result.items[0]).toMatchObject({ status: 'sold', exitDate: '2026-01-03', sale: { amount: '40', currency: 'CNY' } });
		expect(result.items[0]?.events.map(event => event.rowId)).toEqual(['undo-sale', 'undo-return', 'undo-return-command']);
		expect(result.statistics.items[0]).toMatchObject({ status: 'sold', heldDays: 2, netCost: { amount: '60', currency: 'CNY' } });
		expect(await f.app.commands.belongings.undo({ operationId: 'undo-return-command', originalOperationId: 'undo-return', id: sold.id, expectedHash: returned.contentHash })).toMatchObject({ contentHash: undone.contentHash });
		const second = await f.app.commands.belongings.transition({ operationId: 'second-return', id: sold.id, expectedHash: undone.contentHash, status: 'using' });
		const edit = await f.app.commands.beginEdit(sold.id); edit.draft.category = 'External'; edit.dirtyFields = ['category'];
		await f.app.commands.save({ operationId: 'other-edit', session: edit });
		const writes = f.files.writes.length;
		await expect(f.app.commands.belongings.undo({ operationId: 'stale-undo', originalOperationId: 'second-return', id: sold.id, expectedHash: second.contentHash })).rejects.toThrow('write-conflict');
		expect(f.files.writes.length).toBe(writes);
		expect((await f.app.query.belongings()).items[0]).toMatchObject({ status: 'using', category: 'External' });
	} finally { f.runtime.dispose(); }
});

test('undo authority expires, cannot target another operation, and guards a race at commit', async () => {
	const { vi } = await import('vitest');
	vi.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z'), toFake: ['Date'] });
	const f = await setupItem();
	try {
		const receipt = await f.app.commands.belongings.transition({ operationId: 'time-bound', id: f.created.id, expectedHash: f.created.contentHash, status: 'idle' });
		await expect(f.app.commands.belongings.undo({ operationId: 'wrong-op', originalOperationId: 'not-the-op', id: receipt.id, expectedHash: receipt.contentHash })).rejects.toThrow('belonging-undo-expired');
		vi.setSystemTime(new Date('2026-11-05T10:05:00.001Z'));
		const writes = f.files.writes.length;
		await expect(f.app.commands.belongings.undo({ operationId: 'too-late', originalOperationId: 'time-bound', id: receipt.id, expectedHash: receipt.contentHash })).rejects.toThrow('belonging-undo-expired');
		expect(f.files.writes.length).toBe(writes);
		const current = await f.app.commands.belongings.transition({ operationId: 'another-operation', id: receipt.id, expectedHash: receipt.contentHash, status: 'using' });
		const { patchProperties } = await import('../../core/generic/markdown');
		f.files.beforeProcess = path => { if (path === current.path) { f.files.beforeProcess = undefined; f.files.external(path, patchProperties(f.files.text.get(path)!, { category: 'Concurrent change' })); } };
		await expect(f.app.commands.belongings.undo({ operationId: 'racing-undo', originalOperationId: 'another-operation', id: current.id, expectedHash: current.contentHash })).rejects.toThrow('write-conflict');
		expect((await f.app.query.belongings()).items[0]).toMatchObject({ category: 'Concurrent change', status: 'using' });
	} finally { f.runtime.dispose(); vi.useRealTimers(); }
});

test('annual query exposes owner-produced report without writing and preserves the card snapshot', async () => {
	const f = await setupItem();
	try {
		const writes = f.files.writes.length;
		const query = await f.app.query.belongings({ year: 2026, asOf: '2026-01-03' });
		expect(query.report).toMatchObject({ year: 2026, asOf: '2026-01-03', purchasedCount: 1 });
		expect(query.report?.holdings[0]).toMatchObject(query.statistics.items[0]!);
		expect(f.files.writes.length).toBe(writes);
	} finally { f.runtime.dispose(); }
});

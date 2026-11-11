import { afterEach, expect, test } from 'vitest';
import { memoryArchives } from './test-port';
import { ArchivesApplication } from './application';
import { PERSON } from '../../core/schema/presets';
import { validateDefinition } from '../../core/schema/definitions';
import { patchProperties, decodeEntity } from '../../core/generic/markdown';
import type { ArchiveRuntime } from './runtime';

const runtimes: ArchiveRuntime[] = [];
afterEach(() => runtimes.splice(0).forEach((runtime) => runtime.dispose()));

test('display choices are portable definition data and never discard hidden entity values', async () => {
	const { runtime, files } = await memoryArchives();
	runtimes.push(runtime);
	const application = new ArchivesApplication(runtime);
	const definition = { ...PERSON, id: 'presentation', folder: 'Presentation', displayFields: ['region'] };
	await application.commands.publishDefinition({ operationId: 'presentation-v1', expectedHeads: [], definition });
	const created = await application.commands.create({ operationId: 'presentation-record', typeId: definition.id, values: { name: 'Name', region: 'Hidden later' } });
	const first = (await application.query.entity(created.id))!;
	expect(first.createdAt).toBeGreaterThan(0);
	const head = runtime.index.definition(definition.id)!;
	await application.commands.publishDefinition({ operationId: 'presentation-v2', expectedHeads: [head.revisionId], definition: { ...definition, displayFields: [] } });
	await runtime.reload();
	expect(runtime.index.definition(definition.id)?.definition).toMatchObject({ displayFields: [] });
	const session = await application.commands.beginEdit(created.id);
	session.draft.name = 'Updated'; session.dirtyFields = ['name'];
	await application.commands.save({ operationId: 'presentation-save', session });
	const reopened = (await application.query.entity(created.id))!;
	expect(reopened.createdAt).toBe(first.createdAt);
	expect(reopened.values.region).toBe('Hidden later');
	const raw = patchProperties(files.text.get(created.path)!, { 'huhu-created-at': undefined });
	expect(decodeEntity(raw, created.path, '', Date.now()).createdAt).toBeUndefined();
	expect(decodeEntity(patchProperties(raw, { 'huhu-created-at': 'yesterday' }), created.path, '', Date.now()).createdAt).toBeUndefined();
});

test('display projection rejects unknown and duplicate field identities but permits hiding all optional fields', () => {
	expect(() => validateDefinition({ ...PERSON, displayFields: [] })).not.toThrow();
	for (const displayFields of [['unknown'], ['name', 'name'], [42]])
		expect(() => validateDefinition({ ...PERSON, displayFields })).toThrow();
});

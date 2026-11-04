import { describe, expect, test } from 'vitest';
import { setLanguage } from '../../../../shared/i18n';
import { memoryArchives } from './test-port';
import { EntityCommands } from './entities';
import { ArchivesApplication } from './application';
import { DefinitionCommands } from './definitions';
import { RelationCommands } from './relation-commands';
import { RecoveryCommands } from './recovery';
import { PERSON, COMPANY, EMPLOYMENT } from '../../core/schema/presets';
import { decodeOperation } from '../../core/generic/operations';
import { encodeDefinition, frontmatter, patchProperties } from '../../core/generic/markdown';
import { createRevision } from '../../core/schema/definitions';
import { definitionPath, migrationPath } from '../../core/generic/paths';
import { digest } from '../../core/schema/value';
const root = 'huhu/archives';
async function createPair() {
	const fixture = await memoryArchives(),
		entities = new EntityCommands(fixture.runtime);
	const person = await entities.create({ operationId: 'person-a', typeId: PERSON.id, values: { name: '0012' } });
	const company = await entities.create({ operationId: 'company-a', typeId: COMPANY.id, values: { name: 'Org' } });
	return {
		...fixture,
		entities,
		person,
		company,
		relations: new RelationCommands(fixture.runtime),
		definitions: new DefinitionCommands(fixture.runtime),
		recovery: new RecoveryCommands(fixture.runtime),
	};
}
describe('generic archives command boundary', () => {
	test('bootstrap is explicit, portable; create is idempotent, no implicit reads write files', async () => {
		const fixture = await memoryArchives();
		expect(fixture.files.writes).toEqual([]);
		const entities = new EntityCommands(fixture.runtime),
			input = {
				operationId: 'entity-a',
				typeId: PERSON.id,
				values: { name: '0012', mobiles: ['00123'], tags: [] },
			};
		const receipt = await entities.create(input);
		expect(receipt.committed).toBe(true);
		const writes = fixture.files.writes.length;
		expect((await entities.create(input)).id).toBe(receipt.id);
		expect(fixture.files.writes.length).toBe(writes);
		await expect(entities.create({ ...input, values: { name: 'different' } })).rejects.toThrow(
			'command-id-conflict',
		);
		const copy = await memoryArchives(fixture.files.text);
		expect(copy.runtime.index.get(receipt.id)?.values).toEqual(input.values);
		expect(copy.files.writes).toEqual([]);
		expect(copy.runtime.index.classify(receipt.path)).toBe('entity');
		expect(copy.runtime.index.catalog().types.map((type) => type.id)).toContain(PERSON.id);
	});
	test('three-way saves preserve unknown YAML/body and independent edits; same-field conflicts keep the draft', async () => {
		const { runtime, files, entities, person } = await createPair(),
			session = await entities.beginEdit(person.id);
		session.draft.name = 'Panel';
		session.dirtyFields = ['name'];
		files.external(
			person.path,
			patchProperties(files.text.get(person.path)!, { region: 'External', custom: '001234' }) +
				'\nFree external body\n',
		);
		await entities.save({ operationId: 'save-a', session });
		expect(runtime.index.get(person.id)?.values.region).toBe('External');
		expect(files.text.get(person.path)).toContain('Free external body');
		expect(frontmatter(files.text.get(person.path)!).custom).toBe('001234');
		const conflict = await entities.beginEdit(person.id);
		conflict.draft.name = 'My draft';
		conflict.dirtyFields = ['name'];
		await entities.saveDraft(conflict);
		files.external(person.path, patchProperties(files.text.get(person.path)!, { name: 'Other writer' }));
		await expect(entities.save({ operationId: 'save-b', session: conflict })).rejects.toThrow('field-conflict');
		expect((await entities.drafts())[0]?.draft.name).toBe('My draft');
		expect(frontmatter(files.text.get(person.path)!).name).toBe('Other writer');
	});
	test('arguments are owned before queueing; lifecycle and editor buffers block uncommitted writes', async () => {
		const { runtime, files, entities, person } = await createPair();
		const session = await entities.beginEdit(person.id);
		session.draft.name = 'Committed input';
		session.dirtyFields = ['name'];
		const save = entities.save({ operationId: 'immutable-input', session });
		session.draft.name = 'Mutated afterwards';
		await save;
		expect(runtime.index.get(person.id)?.name).toBe('Committed input');
		const next = await entities.beginEdit(person.id);
		next.draft.name = 'Unsaved';
		next.dirtyFields = ['name'];
		files.unsaved.add(person.path);
		await expect(entities.save({ operationId: 'unsaved', session: next })).rejects.toThrow('unsavedEditor');
		files.unsaved.clear();
		const before = files.writes.length;
		const promise = entities.save({ operationId: 'disposed', session: next });
		runtime.dispose();
		await expect(promise).rejects.toThrow('unavailable');
		expect(files.writes.length).toBe(before);
	});
	test('drafts permit incomplete required values but never invalid types; activation is explicit', async () => {
		const fixture = await memoryArchives(),
			entities = new EntityCommands(fixture.runtime);
		const receipt = await entities.create({
			operationId: 'draft-a',
			typeId: PERSON.id,
			values: {},
			lifecycle: 'draft',
		});
		expect(fixture.runtime.index.get(receipt.id)?.lifecycle).toBe('draft');
		await expect(
			entities.setState({
				operationId: 'activate',
				id: receipt.id,
				expectedHash: receipt.contentHash,
				lifecycle: 'active',
			}),
		).rejects.toThrow('required-field');
		await expect(
			entities.create({ operationId: 'draft-b', typeId: PERSON.id, values: { name: 123 }, lifecycle: 'draft' }),
		).rejects.toThrow('invalid-value');
	});
	test('metadata discovery survives arbitrary paths, duplicate IDs and missing target files', async () => {
		const { runtime, files, person, company } = await createPair();
		files.rename(person.path, `${root}/custom/deep/a.md`);
		await runtime.flushEvents();
		expect(runtime.index.get(person.id)?.path).toBe(`${root}/custom/deep/a.md`);
		files.external(`${root}/duplicate.md`, files.text.get(`${root}/custom/deep/a.md`)!);
		await runtime.flushEvents();
		expect(runtime.index.get(person.id)).toBeUndefined();
		expect(runtime.index.query({ typeId: PERSON.id }).isComplete).toBe(false);
		files.delete(`${root}/duplicate.md`);
		await runtime.flushEvents();
		expect(runtime.index.get(person.id)?.id).toBe(person.id);
		expect(runtime.index.get(company.id)?.id).toBe(company.id);
	});
	test('definition forks are detected from immutable DAG, not a last-writer-wins pointer; explicit merge resolves them', async () => {
		const { runtime, files, definitions, entities } = await createPair();
		const base = runtime.index.definition(PERSON.id)!;
		const left = await createRevision({ ...PERSON, label: 'Left' }, [base.revisionId], 2, 'revision-left'),
			right = await createRevision({ ...PERSON, label: 'Right' }, [base.revisionId], 2, 'revision-right');
		for (const revision of [left, right])
			files.external(definitionPath(root, 'type', PERSON.id, revision.revisionId), encodeDefinition(revision));
		await runtime.flushEvents();
		expect(runtime.index.definition(PERSON.id)).toBeUndefined();
		expect(runtime.index.catalog().diagnostics.some((item) => item.code === 'schema-fork')).toBe(true);
		await expect(
			entities.create({ operationId: 'blocked-new', typeId: PERSON.id, values: { name: 'new' } }),
		).rejects.toThrow('missing-or-forked-definition');
		const merged = await definitions.publish({
			operationId: 'merge-revision',
			definition: { ...PERSON, label: 'Merged' },
			expectedHeads: [left.revisionId, right.revisionId],
		});
		expect(merged.revision.parentRevisionIds).toHaveLength(2);
		expect(runtime.index.definition(PERSON.id)?.revisionId).toBe('merge-revision');
	});
	test('relations are stored once, queried from both sides, enforce both cardinalities and tombstones', async () => {
		const { runtime, entities, relations, definitions, person, company } = await createPair();
		const constrained = {
			...EMPLOYMENT,
			id: 'relation-constrained',
			sourceCardinality: { max: 1, scope: 'active' as const },
			targetCardinality: { max: 1, scope: 'active' as const },
		};
		await definitions.publish({ operationId: 'relation-schema', definition: constrained, expectedHeads: [] });
		const input = {
			operationId: 'edge-a',
			relationTypeId: constrained.id,
			sourceId: person.id,
			targetId: company.id,
			values: { status: 'current', keyRole: '', notes: 'once' },
		};
		const receipt = await relations.create(input);
		expect((await relations.create(input)).id).toBe(receipt.id);
		expect(runtime.index.relations(person.id).items.map((edge) => edge.id)).toEqual(['edge-a']);
		expect(runtime.index.relations(company.id).items.map((edge) => edge.id)).toEqual(['edge-a']);
		const other = await entities.create({ operationId: 'person-b', typeId: PERSON.id, values: { name: 'Other' } });
		await expect(relations.create({ ...input, operationId: 'edge-b', sourceId: other.id })).rejects.toThrow(
			'cardinality',
		);
		await relations.update({
			operationId: 'delete-edge',
			id: receipt.id,
			expectedHash: receipt.contentHash,
			values: input.values,
			contextRefs: {},
			lifecycle: 'deleted',
		});
		expect(runtime.index.relations(person.id).items).toEqual([]);
		expect(runtime.index.relation(receipt.id)?.lifecycle).toBe('deleted');
		await expect(
			relations.update({
				operationId: 'revive',
				id: receipt.id,
				expectedHash: runtime.index.relation(receipt.id)!.contentHash,
				values: input.values,
				contextRefs: {},
				lifecycle: 'active',
			}),
		).rejects.toThrow('relation-tombstoned');
	});
});
describe('recoverable schema upgrades', () => {
	test('every execution write can fail before or after commit; a restart resumes to one committed upgrade', async () => {
		const pair = await createPair(),
			revision = pair.runtime.index.definition(PERSON.id)!;
		await pair.definitions.publish({
			operationId: 'resume-schema',
			definition: {
				...PERSON,
				fields: PERSON.fields.map((field) =>
					field.fieldId === 'name' ? { ...field, storageKey: 'client-name' } : field,
				),
			},
			expectedHeads: [revision.revisionId],
		});
		const before = pair.files.text.get(pair.person.path)!;
		const plan = await pair.recovery.prepareUpgrade({
			operationId: 'upgrade-resume',
			id: pair.person.id,
			expectedHash: await digest(before),
			revisionId: 'resume-schema',
			values: pair.runtime.index.get(pair.person.id)!.values,
		});
		const prepared = new Map(pair.files.text);
		for (const after of [false, true])
			for (let failAt = 1; failAt <= 5; failAt++) {
				const fault = await memoryArchives(prepared);
				let writes = 0;
				const fail = () => {
					if (++writes === failAt) throw new Error('injected failure');
				};
				if (after) fault.files.afterWrite = fail;
				else fault.files.beforeWrite = fail;
				try {
					await new RecoveryCommands(fault.runtime).execute({ operationId: plan.id });
				} catch {
					/* Restart at each crash boundary. */
				}
				fault.files.beforeWrite = undefined;
				fault.files.afterWrite = undefined;
				await fault.runtime.flushEvents();
				fault.runtime.dispose();
				const resumed = await memoryArchives(fault.files.text);
				await new RecoveryCommands(resumed.runtime).execute({ operationId: plan.id });
				expect(
					frontmatter(resumed.files.text.get(pair.person.path)!)['client-name'],
					`after=${after}, write=${failAt}`,
				).toBe('0012');
				expect(decodeOperation(resumed.files.text.get(migrationPath(root, plan.id))!).state).toBe('committed');
			}
	}, 30000);
	test('a source change aborts the upgrade; rollback never overwrites a later owner edit', async () => {
		const { runtime, files, person, definitions, recovery } = await createPair();
		await definitions.publish({
			operationId: 'conflict-schema',
			definition: {
				...PERSON,
				fields: PERSON.fields.map((field) =>
					field.fieldId === 'name' ? { ...field, storageKey: 'client-name' } : field,
				),
			},
			expectedHeads: [runtime.index.definition(PERSON.id)!.revisionId],
		});
		const before = files.text.get(person.path)!;
		const plan = await recovery.prepareUpgrade({
			operationId: 'upgrade-conflict',
			id: person.id,
			expectedHash: await digest(before),
			revisionId: 'conflict-schema',
			values: runtime.index.get(person.id)!.values,
		});
		files.external(person.path, before + '\nExternal edit\n');
		await expect(recovery.execute({ operationId: plan.id })).rejects.toThrow('source-changed');
		await recovery.rollback({ operationId: plan.id });
		expect(files.text.get(person.path)).toContain('External edit');
	});
	test('breaking upgrades are explicit, backed up and reversible; label-only publishing does not rewrite notes', async () => {
		const { runtime, files, person, definitions, recovery } = await createPair();
		const before = files.text.get(person.path)!,
			revision = runtime.index.definition(PERSON.id)!;
		const changed = {
			...PERSON,
			label: 'Clients',
			fields: PERSON.fields.map((field) =>
				field.fieldId === 'name' ? { ...field, storageKey: 'client-name' } : field,
			),
		};
		await definitions.publish({
			operationId: 'schema-v2',
			definition: changed,
			expectedHeads: [revision.revisionId],
		});
		expect(files.text.get(person.path)).toBe(before);
		expect(runtime.index.get(person.id)?.schemaRevisionId).toBe(revision.revisionId);
		const plan = await recovery.prepareUpgrade({
			operationId: 'upgrade-a',
			id: person.id,
			expectedHash: await digest(before),
			revisionId: 'schema-v2',
			values: runtime.index.get(person.id)!.values,
		});
		await recovery.execute({ operationId: plan.id });
		expect(frontmatter(files.text.get(person.path)!)['client-name']).toBe('0012');
		expect(frontmatter(files.text.get(person.path)!).name).toBeUndefined();
		await recovery.rollback({ operationId: plan.id });
		expect(files.text.get(person.path)).toBe(before);
	});
});

describe('generic archives additional safety boundaries', () => {
	test('a relation schema upgrade has an exact backup and preserves both projections on rollback', async () => {
		const { runtime, files, relations, definitions, recovery, person, company } = await createPair();
		const edge = await relations.create({
			operationId: 'upgrade-edge',
			relationTypeId: EMPLOYMENT.id,
			sourceId: person.id,
			targetId: company.id,
			values: { status: 'current', department: 'R&D' },
		});
		const before = files.text.get(edge.path)!,
			revision = runtime.index.definition(EMPLOYMENT.id)!;
		const changed = {
			...EMPLOYMENT,
			fields: EMPLOYMENT.fields.map((field) =>
				field.fieldId === 'department' ? { ...field, storageKey: 'job-department' } : field,
			),
		};
		await definitions.publish({
			operationId: 'relation-revision-2',
			definition: changed,
			expectedHeads: [revision.revisionId],
		});
		const plan = await recovery.prepareUpgrade({
			operationId: 'relation-upgrade',
			id: edge.id,
			expectedHash: await digest(before),
			revisionId: 'relation-revision-2',
			values: runtime.index.relation(edge.id)!.values,
		});
		expect(plan.kind).toBe('relation-upgrade');
		await recovery.execute({ operationId: plan.id });
		expect(frontmatter(files.text.get(edge.path)!)['job-department']).toBe('R&D');
		expect(runtime.index.relations(person.id).items[0]?.schemaRevisionId).toBe('relation-revision-2');
		expect(runtime.index.relations(company.id).items[0]?.id).toBe(edge.id);
		await recovery.rollback({ operationId: plan.id });
		expect(files.text.get(edge.path)).toBe(before);
	});
	test('duplicate stored relationship IDs reject a third create, including a renamed file', async () => {
		const { runtime, files, relations, person, company } = await createPair();
		const input = {
			operationId: 'duplicate-edge',
			relationTypeId: EMPLOYMENT.id,
			sourceId: person.id,
			targetId: company.id,
			values: { status: 'current' },
		};
		const edge = await relations.create(input),
			raw = files.text.get(edge.path)!;
		files.rename(edge.path, edge.path.replace('.md', '-moved.md'));
		files.external(edge.path.replace('.md', '-copy.md'), raw);
		await runtime.flushEvents();
		const writes = files.writes.length;
		await expect(relations.create(input)).rejects.toThrow('duplicate-id');
		expect(files.writes.length).toBe(writes);
	});
	test('loading changes invalidate cached completeness without any disk write', async () => {
		const { runtime, files, person } = await createPair();
		expect(runtime.index.query({ typeId: PERSON.id }).items[0]?.id).toBe(person.id);
		const writes = files.writes.length;
		runtime.index.loading = true;
		expect(runtime.index.query({ typeId: PERSON.id }).isComplete).toBe(false);
		runtime.index.loading = false;
		expect(runtime.index.query({ typeId: PERSON.id }).isComplete).toBe(true);
		expect(files.writes.length).toBe(writes);
	});
	test('schema migration refuses to overwrite an unmanaged property at the new storage key', async () => {
		const { runtime, files, person, definitions, recovery } = await createPair();
		files.external(
			person.path,
			patchProperties(files.text.get(person.path)!, { 'client-name': 'unmanaged value' }),
		);
		await runtime.flushEvents();
		await definitions.publish({
			operationId: 'collision-revision',
			definition: {
				...PERSON,
				fields: PERSON.fields.map((field) =>
					field.fieldId === 'name' ? { ...field, storageKey: 'client-name' } : field,
				),
			},
			expectedHeads: [runtime.index.definition(PERSON.id)!.revisionId],
		});
		const before = files.text.get(person.path)!,
			writes = files.writes.length;
		await expect(
			recovery.prepareUpgrade({
				operationId: 'collision-upgrade',
				id: person.id,
				expectedHash: await digest(before),
				revisionId: 'collision-revision',
				values: runtime.index.get(person.id)!.values,
			}),
		).rejects.toThrow('unknown-property-conflict');
		expect(files.text.get(person.path)).toBe(before);
		expect(files.writes.length).toBe(writes);
	});
});

test('a v1 person/company file is reported as an unknown record and never rewritten', async () => {
	const path = `${root}/people/Old/profile.md`,
		raw = '---\nhuhu-type: "person"\nhuhu-id: "old-person"\nname: "Old"\n---\n\n## Notes\n';
	const { runtime, files } = await memoryArchives(new Map([[path, raw]]));
	expect(runtime.index.get('old-person')).toBeUndefined();
	expect(runtime.index.diagnostics().some((item) => item.path === path && item.code === 'unknown-record')).toBe(true);
	expect(files.text.get(path)).toBe(raw);
	expect(files.writes).toEqual([]);
});

test('public read APIs reject a retained service after module disposal', async () => {
	const { runtime } = await memoryArchives();
	const application = new ArchivesApplication(runtime);
	runtime.dispose();
	await expect(application.query.entities({})).rejects.toThrow('unavailable');
	await expect(application.query.entity('missing')).rejects.toThrow('unavailable');
	await expect(application.query.relations('missing')).rejects.toThrow('unavailable');
	await expect(application.query.revisions()).rejects.toThrow('unavailable');
});

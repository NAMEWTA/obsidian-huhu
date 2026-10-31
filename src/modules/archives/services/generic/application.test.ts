import { describe, expect, test } from 'vitest';
import { memoryArchives } from './test-port';
import { EntityCommands } from './entities';
import { ArchivesApplication } from './application';
import { DefinitionCommands } from './definitions';
import { RelationCommands } from './relation-commands';
import { RecoveryCommands } from './recovery';
import { newRecord, emptyRef } from '../../core/model';
import { createMarkdown, parseRecord, relativeLink } from '../../core/persist/markdown';
import { createRevision } from '../../core/schema/definitions';
import { PERSON, COMPANY, EMPLOYMENT } from '../../core/schema/presets';
import { decodeOperation } from '../../core/generic/operations';
import { encodeDefinition, frontmatter, patchProperties } from '../../core/generic/markdown';
import { definitionPath, migrationPath } from '../../core/generic/paths';
import { digest } from '../../core/schema/value';
const root = 'huhu/档案';
function legacyFixture() {
	const company = newRecord('company');
	company.id = 'company-a';
	company.path = `${root}/Moved/Organisation.md`;
	company.fields.name = '001 Company';
	const leader = newRecord('person');
	leader.id = 'person-leader';
	leader.path = `${root}/People/Leader.md`;
	leader.fields.name = 'Leader';
	const person = newRecord('person');
	person.id = 'person-a';
	person.path = `${root}/任意层级/原档案.md`;
	person.fields.name = '0012';
	person.fields.mobiles = ['00123'];
	person.employments = [
		{
			id: 'job-1',
			company: { id: company.id, label: company.fields.name, link: relativeLink(person.path, company.path) },
			department: '研发',
			title: 'Engineer',
			start: '2020-02',
			end: '',
			status: 'past',
			keyRole: '',
			notes: 'raw | note',
		},
	];
	person.relations = [
		{
			id: 'relation-1',
			person: { id: leader.id, label: leader.fields.name, link: relativeLink(person.path, leader.path) },
			company: emptyRef(),
			kind: 'leader',
			notes: 'A reports to B',
		},
	];
	const raw =
		createMarkdown(person).replace('name: "0012"', 'name: "0012" # preserved') +
		'\n## Custom\nFree notes unchanged.\n';
	return {
		person,
		company,
		leader,
		raw,
		initial: new Map([
			[person.path, raw],
			[company.path, createMarkdown(company)],
			[leader.path, createMarkdown(leader)],
		]),
	};
}
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
describe('legacy authority and recoverable migration', () => {
	test('legacy reads are non-writing and source-direction correct; ordinary edits remain v1', async () => {
		const source = legacyFixture(),
			{ runtime, files } = await memoryArchives(source.initial),
			entities = new EntityCommands(runtime);
		expect(files.writes).toEqual([]);
		const edges = runtime.index.relations(source.person.id).items;
		expect(edges).toHaveLength(2);
		const reports = edges.find((edge) => edge.relationTypeId === 'relation-reports-to')!;
		expect([reports.sourceId, reports.targetId]).toEqual([source.person.id, source.leader.id]);
		expect(edges.find((edge) => edge.relationTypeId === 'relation-employment')).toMatchObject({
			validFrom: { value: '2020-02', precision: 'month' },
			values: { status: 'past', keyRole: '' },
		});
		const session = await entities.beginEdit(source.person.id);
		session.draft.region = 'Taipei';
		session.dirtyFields = ['region'];
		await entities.save({ operationId: 'legacy-save', session });
		expect(parseRecord(files.text.get(source.person.path)!, source.person.path)?.fields.region).toBe('Taipei');
		expect(files.text.get(source.person.path)).toContain('Free notes unchanged.');
		expect(runtime.index.get(source.person.id)?.format).toBe(1);
	});
	test('migration persists stable maps/backups, preserves original data, rebuilds from visible root and rolls back exactly', async () => {
		const source = legacyFixture(),
			{ runtime, files } = await memoryArchives(source.initial),
			recovery = new RecoveryCommands(runtime);
		const before = await recovery.preflight();
		expect(before.blocked).toBe(0);
		expect(before.relations).toBe(2);
		const plan = await recovery.prepareMigration({
			operationId: 'migration-a',
			id: source.person.id,
			expectedHash: await digest(source.raw),
		});
		expect(plan.edges).toHaveLength(2);
		expect(runtime.index.allEntities()).toHaveLength(3);
		expect(runtime.index.relations(source.person.id).items).toHaveLength(2);
		await recovery.execute({ operationId: plan.id });
		expect(parseRecord(files.text.get(source.person.path)!, source.person.path)).toBeNull();
		expect(runtime.index.get(source.person.id)?.format).toBe(2);
		expect(runtime.index.relations(source.person.id).items).toHaveLength(2);
		expect(runtime.index.relations(source.person.id).isComplete).toBe(true);
		expect(files.text.get(source.person.path)).toContain('Free notes unchanged.');
		expect(files.text.get(plan.owner.backupPath!)).toBe(source.raw);
		const reopened = await memoryArchives(files.text);
		expect(reopened.runtime.index.allEntities()).toHaveLength(3);
		expect(
			reopened.runtime.index
				.relations(source.person.id)
				.items.map((edge) => edge.id)
				.sort(),
		).toEqual(plan.edges.map((edge) => edge.record.id).sort());
		await new RecoveryCommands(reopened.runtime).rollback({ operationId: plan.id });
		expect(reopened.files.text.get(source.person.path)).toBe(source.raw);
		expect(reopened.runtime.index.get(source.person.id)?.format).toBe(1);
		expect(reopened.runtime.index.relations(source.person.id).items).toHaveLength(2);
		for (const edge of plan.edges)
			expect(frontmatter(reopened.files.text.get(edge.write.path)!)['huhu-state']).toBe('deleted');
	});
	test('every execution write can fail before or after commit; a restart resumes without duplicating rows', async () => {
		const source = legacyFixture(),
			initial = await memoryArchives(source.initial),
			recovery = new RecoveryCommands(initial.runtime);
		const plan = await recovery.prepareMigration({
			operationId: 'migration-resume',
			id: source.person.id,
			expectedHash: await digest(source.raw),
		});
		const prepared = new Map(initial.files.text);
		for (const after of [false, true])
			for (let failAt = 1; failAt <= 9; failAt++) {
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
				expect(resumed.runtime.index.get(source.person.id)?.format, `after=${after}, write=${failAt}`).toBe(2);
				expect(resumed.runtime.index.relations(source.person.id).items).toHaveLength(2);
				expect(decodeOperation(resumed.files.text.get(migrationPath(root, plan.id))!).state).toBe('committed');
			}
	}, 30000);
	test('source changes abort before authority flip; rollback never overwrites later owner or edge edits', async () => {
		const source = legacyFixture(),
			fixture = await memoryArchives(source.initial),
			recovery = new RecoveryCommands(fixture.runtime);
		const plan = await recovery.prepareMigration({
			operationId: 'migration-conflicts',
			id: source.person.id,
			expectedHash: await digest(source.raw),
		});
		fixture.files.external(source.person.path, source.raw + '\nExternal edit\n');
		await expect(recovery.execute({ operationId: plan.id })).rejects.toThrow('source-changed');
		await recovery.rollback({ operationId: plan.id });
		expect(fixture.files.text.get(source.person.path)).toContain('External edit');
		const clean = await memoryArchives(source.initial),
			committed = new RecoveryCommands(clean.runtime),
			operation = await committed.prepareMigration({
				operationId: 'migration-later',
				id: source.person.id,
				expectedHash: await digest(source.raw),
			});
		await committed.execute({ operationId: operation.id });
		const path = operation.edges[0]!.write.path;
		clean.files.external(path, clean.files.text.get(path)! + '\nNewer edge note\n');
		await expect(committed.rollback({ operationId: operation.id })).rejects.toThrow('rollback-conflict');
		expect(clean.runtime.index.get(source.person.id)?.format).toBe(2);
		expect(clean.files.text.get(path)).toContain('Newer edge note');
	});
	test('missing synced edges remain pending; a manual v1 restore is a conflict, not a duplicate migration', async () => {
		const source = legacyFixture(),
			{ runtime, files } = await memoryArchives(source.initial),
			recovery = new RecoveryCommands(runtime),
			plan = await recovery.prepareMigration({
				operationId: 'migration-sync',
				id: source.person.id,
				expectedHash: await digest(source.raw),
			});
		await recovery.execute({ operationId: plan.id });
		const missing = plan.edges[0]!;
		files.delete(missing.write.path);
		await runtime.flushEvents();
		expect(runtime.index.relations(source.person.id).isComplete).toBe(false);
		expect(runtime.index.relations(source.person.id).items).toHaveLength(1);
		files.external(missing.write.path, missing.write.after);
		files.external(source.person.path, source.raw);
		await runtime.flushEvents();
		expect(runtime.index.diagnostics().some((item) => item.code === 'migration-conflict')).toBe(true);
		expect(runtime.index.relations(source.person.id).items).toHaveLength(2);
		await expect(new EntityCommands(runtime).beginEdit(source.person.id)).rejects.toThrow('migration-conflict');
		await expect(
			recovery.prepareMigration({
				operationId: 'duplicate-migration',
				id: source.person.id,
				expectedHash: await digest(source.raw),
			}),
		).rejects.toThrow('migration-conflict');
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

test('public read APIs reject a retained service after module disposal', async () => {
	const { runtime } = await memoryArchives();
	const application = new ArchivesApplication(runtime);
	runtime.dispose();
	await expect(application.query.entities({})).rejects.toThrow('unavailable');
	await expect(application.query.entity('missing')).rejects.toThrow('unavailable');
	await expect(application.query.relations('missing')).rejects.toThrow('unavailable');
	await expect(application.query.revisions()).rejects.toThrow('unavailable');
});

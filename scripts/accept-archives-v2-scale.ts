/** Deterministic in-memory IO benchmark of the production v2 runtime (not a host-render/disk claim). */
import assert from 'node:assert/strict';
import { cpus, platform } from 'node:os';
import { memoryArchives } from '../src/modules/archives/services/generic/test-port';
import { ArchivesApplication } from '../src/modules/archives/services/generic/application';
import { encodeEntity, encodeRelation, patchProperties } from '../src/modules/archives/core/generic/markdown';
import { PERSON, RELATION_PRESETS } from '../src/modules/archives/core/schema/presets';
import { entityPath, relationPath } from '../src/modules/archives/core/generic/paths';
const round = (value: number) => Math.round(value * 100) / 100;
function percentiles(values: number[]) {
	values.sort((a, b) => a - b);
	return {
		p50Ms: round(values[Math.ceil(values.length * 0.5) - 1]!),
		p95Ms: round(values[Math.ceil(values.length * 0.95) - 1]!),
	};
}
async function main(): Promise<void> {
	const samples = [];
	for (const count of [1000, 5000]) {
		const seed = await memoryArchives(),
			app = new ArchivesApplication(seed.runtime);
		await app.commands.initialize();
		const root = seed.runtime.root,
			relation = RELATION_PRESETS.find((type) => type.id === 'relation-colleague')!,
			initial = new Map(seed.files.text);
		for (let i = 0; i < count; i++) {
			const id = `person-${i}`,
				path = entityPath(root, PERSON.folder, `Person ${i}`, id);
			initial.set(
				path,
				encodeEntity(
					{
						id,
						path,
						typeId: PERSON.id,
						schemaRevisionId: `preset-${PERSON.id}-v1`,
						lifecycle: 'active',
						values: {
							name: `Person ${String(i).padStart(5, '0')}`,
							region: `region-${i % 10}`,
							notes: `needle-${i}`,
						},
						format: 2,
						contentHash: '',
						modified: 0,
					},
					PERSON,
					'\nFree body is not indexed as a second canonical entity.\n',
				),
			);
			for (let n = 1; n <= 5; n++) {
				const id = `edge-${i}-${n}`,
					path = relationPath(root, relation.id, id);
				initial.set(
					path,
					encodeRelation(
						{
							id,
							path,
							relationTypeId: relation.id,
							schemaRevisionId: `preset-${relation.id}-v1`,
							sourceId: `person-${i}`,
							targetId: `person-${(i + n) % count}`,
							values: { notes: `Relationship ${n}` },
							contextRefs: {},
							lifecycle: 'active',
							contentHash: '',
							modified: 0,
						},
						relation,
					),
				);
			}
		}
		seed.runtime.dispose();
		globalThis.gc?.();
		const memory = process.memoryUsage().heapUsed,
			started = performance.now(),
			fixture = await memoryArchives(initial),
			coldIndexMs = round(performance.now() - started);
		const { runtime, files } = fixture,
			query = { typeId: PERSON.id, search: '', limit: 50 };
		const firstAt = performance.now(),
			first = runtime.index.query(query),
			firstQueryMs = round(performance.now() - firstAt);
		assert.equal(first.total, count);
		assert.equal(first.isComplete, true);
		const timings = [],
			repeated = [],
			readsBeforeQueries = files.reads;
		for (let n = 0; n < 50; n++) {
			const search = `needle-${(n * 37) % count}`,
				at = performance.now();
			assert.ok(runtime.index.query({ ...query, search }).total >= 1);
			timings.push(performance.now() - at);
			const warmAt = performance.now();
			runtime.index.query({ ...query, search });
			repeated.push(performance.now() - warmAt);
		}
		assert.equal(files.reads, readsBeforeQueries);
		const entity = runtime.index.entity('person-0')!,
			readsBeforeUpdate = files.reads,
			updateAt = performance.now();
		files.external(entity.path, patchProperties(files.text.get(entity.path)!, { region: 'updated' }));
		await runtime.flushEvents();
		const incrementalMs = round(performance.now() - updateAt),
			incrementalReads = files.reads - readsBeforeUpdate;
		assert.equal(runtime.index.get(entity.id)?.values.region, 'updated');
		assert.equal(runtime.index.relations(entity.id).items.length, 10);
		assert.ok(incrementalReads <= 2, 'an entity edit must not reread every relation');
		globalThis.gc?.();
		samples.push({
			entities: count,
			relations: count * 5,
			files: initial.size,
			coldIndexMs,
			coldReads: readsBeforeQueries,
			firstQueryMs,
			query: percentiles(timings),
			repeatedQuery: percentiles(repeated),
			incrementalMs,
			incrementalReads,
			heapDeltaBytes: process.memoryUsage().heapUsed - memory,
		});
		runtime.dispose();
	}
	console.log(
		JSON.stringify(
			{
				kind: 'in-memory IO; production runtime and codecs; no UI/disk latency claim',
				node: process.version,
				platform: platform(),
				cpu: cpus()[0]?.model,
				samples,
			},
			null,
			2,
		),
	);
}
void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

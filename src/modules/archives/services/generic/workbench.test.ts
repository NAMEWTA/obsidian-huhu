import { afterEach, expect, test, vi } from 'vitest';
import { genericArchivesWorkbench } from './workbench';
import { ArchivesApplication } from './application';
import { memoryArchives } from './test-port';
import { PERSON } from '../../core/schema/presets';
import { encodeEntity } from '../../core/generic/markdown';
import type { ArchiveRuntime } from './runtime';
const runtimes: ArchiveRuntime[] = [];
afterEach(() => {
	runtimes.splice(0).forEach((runtime) => runtime.dispose());
});
async function fixture(count = 1201) {
	const base = await memoryArchives();
	runtimes.push(base.runtime);
	const schema = base.runtime.index.definition(PERSON.id)!;
	const initial = new Map(base.files.text);
	for (let i = 0; i < count; i++) {
		const id = 'entity-' + String(i).padStart(4, '0'),
			path = 'huhu/archives/people/' + id + '/profile.md';
		initial.set(
			path,
			encodeEntity(
				{
					id,
					typeId: PERSON.id,
					schemaRevisionId: schema.revisionId,
					lifecycle: 'active',
					values: {
						name: 'Person ' + String(i).padStart(4, '0'),
						notes: i === 1200 ? 'Deep unique phrase' : '',
					},
					path,
					contentHash: '',
					modified: 0,
				},
				PERSON,
			),
		);
	}
	const result = await memoryArchives(initial);
	runtimes.push(result.runtime);
	return { ...result, workbench: genericArchivesWorkbench(() => new ArchivesApplication(result.runtime)) };
}
test('tree pages through more than500 with exact totals, stable IDs and no writes', async () => {
	const { workbench, files } = await fixture();
	const tree = workbench.panel({ feature: 'contacts', section: PERSON.id }).tree!;
	expect(tree).not.toHaveProperty('folderClick');
	const first = await tree.data!.load({ search: '', limits: {} });
	expect(first.pages.find((page) => page.id === PERSON.id)).toMatchObject({ loaded: 100, total: 1201 });
	const all = await tree.data!.load({ search: '', limits: { [PERSON.id]: 1300 } });
	const nodes = all.nodes.find((node) => node.id === PERSON.id)!.children!;
	expect(nodes).toHaveLength(1201);
	expect(new Set(nodes.map((node) => node.id)).size).toBe(1201);
	expect(nodes.at(-1)?.id).toBe('entity-1200');
	expect(files.writes).toEqual([]);
});
test('full-domain search finds value-only hits beyond500 and pins selection without truncating result totals', async () => {
	const { workbench } = await fixture();
	const tree = workbench.panel({ feature: 'contacts', section: PERSON.id, resourceId: 'entity-1200' }).tree!;
	const initial = await tree.data!.load({ search: '', limits: {} });
	expect(
		initial.nodes.find((node) => node.id === PERSON.id)?.children?.some((node) => node.id === 'entity-1200'),
	).toBe(true);
	expect(initial.pages.find((page) => page.id === PERSON.id)).toMatchObject({ loaded: 100, total: 1201 });
	const found = await tree.data!.load({ search: 'Deep unique phrase', limits: {} });
	expect(found.pages.find((page) => page.id === PERSON.id)).toMatchObject({ loaded: 1, total: 1 });
	expect(found.nodes.find((node) => node.id === PERSON.id)?.children?.map((node) => node.id)).toEqual([
		'entity-1200',
	]);
});

test('the same loader reads a rebuilt index and exposes real failures for retry', async () => {
	const { workbench, files, runtime } = await fixture(4);
	const tree = workbench.panel({ feature: 'contacts', section: PERSON.id }).tree!;
	const initial = await tree.data!.load({ search: '', limits: {} });
	expect(initial.pages.find((page) => page.id === PERSON.id)?.total).toBe(4);
	files.delete('huhu/archives/people/entity-0003/profile.md');
	await runtime.reload();
	expect((await tree.data!.load({ search: '', limits: {} })).pages.find((page) => page.id === PERSON.id)?.total).toBe(
		3,
	);
	const query = vi.spyOn(runtime.index, 'query').mockImplementationOnce(() => {
		throw new Error('actual read failure');
	});
	await expect(tree.data!.load({ search: '', limits: {} })).rejects.toThrow('actual read failure');
	query.mockRestore();
	expect((await tree.data!.load({ search: '', limits: {} })).pages.find((page) => page.id === PERSON.id)?.total).toBe(
		3,
	);
});

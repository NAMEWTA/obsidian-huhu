import { afterEach, expect, test, vi } from 'vitest';
import { SkillLibrary } from './skill-library';
import { homeServices } from './instances';
import type { AgentSkillCatalog, SkillCatalogEntry } from '../../agent/api';

afterEach(() => {
	delete homeServices.skillCatalog;
	delete homeServices.skills;
});

const entry = (patch: Partial<SkillCatalogEntry>): SkillCatalogEntry => ({
	name: 'review',
	description: 'Review a change',
	scope: 'global',
	agents: ['claude-code', 'codex'],
	folders: [],
	...patch,
});

function bind(entries: SkillCatalogEntry[], read = vi.fn(async (dir: string) => ({ text: `---\ndescription: from ${dir}\n---\n`, mtime: 5 }))) {
	const reveal = vi.fn(async () => {});
	const catalog: AgentSkillCatalog = { list: async () => entries, read, reveal };
	homeServices.skillCatalog = () => catalog;
	homeServices.skills = () => ({
		targets: () => [
			{ id: 'claude-code', title: 'Claude Code' },
			{ id: 'codex', title: 'Codex' },
		],
		capability: () => ({}) as never,
		list: async () => ({ entries: [], unavailable: [] }),
		remember: async () => {},
		forget: async () => {},
	});
	return { read, reveal };
}

test('lists the agent module\'s discovered skills by name, merging scopes and keeping per-agent folders', async () => {
	bind([
		entry({
			folders: [
				{ dir: '/home/me/.claude/skills/review', target: 'claude-code' },
				{ dir: '/home/me/.agents/skills/review', target: 'agents' },
			],
		}),
		entry({ scope: 'vault', folders: [{ dir: '/vault/.codex/skills/review', target: 'codex' }], agents: ['codex'] }),
	]);
	const library = new SkillLibrary();
	await library.refresh();
	const [row] = library.state.getState().entries;
	expect(library.state.getState().entries).toHaveLength(1);
	expect(row!.description).toBe('Review a change');
	expect(row!.sources.map((s) => [s.path, s.scope, s.agents])).toEqual([
		['/home/me/.claude/skills/review', 'global', ['claude-code']],
		['/home/me/.agents/skills/review', 'global', ['claude-code', 'codex']],
		['/vault/.codex/skills/review', 'vault', ['codex']],
	]);
	expect(row!.sources[0]!.mtime).toBe(5);
});

test('without the agent module the list is empty and an unreadable folder is still listed', async () => {
	const library = new SkillLibrary();
	await library.refresh();
	expect(library.state.getState()).toMatchObject({ entries: [], loading: false, error: '' });
	const { read } = bind([entry({ folders: [{ dir: '/x/review', target: 'agents' }] })], vi.fn(async () => { throw new Error('gone'); }));
	await library.refresh();
	expect(read).toHaveBeenCalled();
	expect(library.state.getState().entries[0]!.sources[0]!.text).toBeUndefined();
});

test('revealing a folder goes through the agent catalog', async () => {
	const { reveal } = bind([]);
	await new SkillLibrary().reveal({ path: '/x/review', target: 'agents', scope: 'global', agents: [] });
	expect(reveal).toHaveBeenCalledWith('/x/review');
});

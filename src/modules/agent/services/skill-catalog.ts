import type { AgentSkillCatalog, SkillCatalogEntry } from '../api';
import { AGENT_IDS } from '../core/launch/defaults';
import type { AgentId } from '../core/launch/types';
import type { SkillRecord } from '../core/skills/library';
import type { SkillManager, SkillManagerState } from './skill-manager';

/** The agents a record's folders put the skill in front of. */
export function recordAgents(record: SkillRecord): AgentId[] {
	const found = new Set<AgentId>();
	for (const location of record.locations) {
		if (location.target === 'agents' || location.target === 'extra') return [...AGENT_IDS];
		found.add(location.target);
	}
	return AGENT_IDS.filter(id => found.has(id));
}

export function catalogEntry(record: SkillRecord): SkillCatalogEntry {
	return {
		name: record.name,
		description: record.description,
		scope: record.scope,
		agents: recordAgents(record),
		folders: record.locations.map(location => ({ dir: location.dir, target: location.target })),
	};
}

/** Wait until no scan is running: a scan started by the settings page may have replaced ours. */
async function settled(manager: SkillManager, signal?: AbortSignal): Promise<SkillManagerState> {
	signal?.throwIfAborted();
	await manager.refresh();
	signal?.throwIfAborted();
	const now = manager.state.getState();
	if (!now.loading) return now;
	return new Promise<SkillManagerState>((resolve, reject) => {
		const stop = manager.state.subscribe(state => { if (!state.loading) { done(); resolve(state); } });
		const abort = () => { done(); reject(signal!.reason instanceof Error ? signal!.reason : new Error('aborted')); };
		const done = () => { stop(); signal?.removeEventListener('abort', abort); };
		signal?.addEventListener('abort', abort, { once: true });
	});
}

/**
 * The skills manager's findings as a read-only service for other modules. `manager` is undefined where there is no
 * native side (mobile); `readDoc` reads a skill folder's SKILL.md.
 */
export function createSkillCatalog(
	manager: () => Promise<SkillManager | undefined>,
	readDoc: (dir: string) => Promise<{ text: string; mtime: number }>,
): AgentSkillCatalog {
	const known = async (dir: string): Promise<SkillManager> => {
		const current = await manager();
		if (!current || !current.state.getState().records.some(record => record.locations.some(location => location.dir === dir))) throw new Error('unavailable');
		return current;
	};
	return {
		async list(signal) {
			const current = await manager();
			if (!current) return [];
			const state = await settled(current, signal);
			if (state.error) throw new Error(state.error);
			return state.records.map(catalogEntry);
		},
		async read(dir) { await known(dir); return readDoc(dir); },
		async reveal(dir) { await (await known(dir)).open(dir); },
	};
}

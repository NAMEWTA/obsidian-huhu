// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/skill-store.ts
import { createStore } from 'zustand/vanilla';
import { readMarkdownDocument, readYaml } from '../../../shared/storage/markdown-document';
import { homeServices } from './instances';

/** One folder holding a skill. `agents` are the agents that read it (and can be sent it). */
export interface LibrarySource {
	/** Absolute folder path. */
	path: string;
	/** The directory kind it was found in: an agent id, `agents` (shared) or `extra`. */
	target: string;
	scope: 'global' | 'vault';
	agents: string[];
	mtime?: number;
	text?: string;
}
export interface LibrarySkill {
	name: string;
	sources: LibrarySource[];
	description?: string;
}

/**
 * The skills the agent module discovers, listed by name for the skills section. Nothing is stored here: enabling a
 * skill for an agent, copying and removing happen in the agent settings.
 */
export class SkillLibrary {
	readonly state = createStore(() => ({ entries: [] as LibrarySkill[], loading: false, error: '' }));
	private abort?: AbortController;
	dispose(): void {
		this.abort?.abort();
	}
	async refresh(): Promise<void> {
		this.abort?.abort();
		const abort = new AbortController();
		this.abort = abort;
		this.state.setState({ loading: true, error: '' });
		try {
			const catalog = homeServices.skillCatalog?.();
			const directory = homeServices.skills?.();
			const capable = new Set<string>(
				(directory?.targets() ?? []).filter((target) => directory?.capability(target.id)).map((target) => target.id),
			);
			const found = catalog ? await catalog.list(abort.signal) : [];
			const merged = new Map<string, LibrarySkill>();
			for (const item of found) {
				const row = merged.get(item.name) ?? { name: item.name, sources: [] };
				row.description ||= item.description || undefined;
				for (const folder of item.folders) {
					const shared = folder.target === 'agents' || folder.target === 'extra';
					const agents = (shared ? item.agents : [folder.target]).filter((id) => capable.has(id));
					if (!row.sources.some((source) => source.path === folder.dir))
						row.sources.push({ path: folder.dir, target: folder.target, scope: item.scope, agents });
				}
				merged.set(item.name, row);
			}
			for (const entry of merged.values())
				for (const source of entry.sources) {
					if (abort.signal.aborted) return;
					try {
						const detail = await catalog!.read(source.path);
						source.text = detail.text;
						source.mtime = detail.mtime;
						const description = readYaml(readMarkdownDocument(detail.text).yaml).get('description');
						if (typeof description === 'string') entry.description ||= description;
					} catch {
						/* A folder that cannot be read still has a usable invocation. */
					}
				}
			if (!abort.signal.aborted)
				this.state.setState({
					entries: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
					loading: false,
				});
		} catch (e) {
			if (!abort.signal.aborted) this.state.setState({ loading: false, error: String(e) });
		}
	}
	/** Show one of the folders `refresh` found in the file manager. */
	async reveal(source: LibrarySource): Promise<void> {
		await homeServices.skillCatalog?.()?.reveal(source.path);
	}
}

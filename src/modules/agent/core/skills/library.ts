// Discovery and per-agent enable model adapted from xingkongliang/skills-manager 7f92c21 (MIT), Copyright (c) 2026 Tianliang Zhang: src-tauri/src/core/tool_adapters.rs, sync_engine.rs, skill_metadata.rs, content_hash.rs
import type { AgentId } from '../launch/types';

/** Directory skills are copied into. `agents` is the shared `.agents/skills` location; `extra` is discovery only. */
export type SkillTargetId = 'agents' | AgentId;
export type SkillScope = 'global' | 'vault';
export type SkillLocationTarget = SkillTargetId | 'extra';

/** Order in which the icon row is drawn and in which an original is preferred as the copy source. */
export const SKILL_TARGET_ORDER: readonly SkillTargetId[] = ['agents', 'claude-code', 'codex', 'grok', 'opencode', 'gemini', 'pi'];

export const SKILL_COPY_MARKER = '.huhu-skill-copy.json';

export interface SkillRoot { target: SkillLocationTarget; scope: SkillScope; dir: string; }

/** The record HUHU writes inside every directory it copies. Only a directory carrying a valid one may ever be replaced or removed. */
export interface SkillCopyMarker { version: 1; name: string; source: string; hash: string; copiedAt: number; }

export interface SkillLocation {
	target: SkillLocationTarget;
	scope: SkillScope;
	/** Absolute path of the skill folder. */
	dir: string;
	/** Absolute path of the skills directory it was found in. */
	root: string;
	folder: string;
	name: string;
	description: string;
	/** Content hash of the folder without the marker file. */
	hash: string;
	/** Present only for a real directory (never a link) that carries a valid marker. */
	copy?: SkillCopyMarker;
	/** The folder is a link to somewhere else; it is never replaced or removed. */
	link?: boolean;
}

export interface SkillRecord {
	key: string;
	name: string;
	scope: SkillScope;
	description: string;
	/** The original the copies come from; absent when only copies remain. */
	source?: SkillLocation;
	locations: SkillLocation[];
}

export type SkillCell =
	| { state: 'off' }
	/** Placed by hand (or the original itself): shown as on, never toggled. */
	| { state: 'manual'; origin: boolean; location: SkillLocation }
	| { state: 'copy'; location: SkillLocation }
	| { state: 'stale'; location: SkillLocation };

const rank = (target: SkillLocationTarget): number => {
	const index = SKILL_TARGET_ORDER.indexOf(target as SkillTargetId);
	return index < 0 ? SKILL_TARGET_ORDER.length : index;
};

export function recordKey(scope: SkillScope, name: string): string { return `${scope}:${name}`; }

/** One record per skill name and scope; every location of that name in that scope is merged into it. */
export function buildRecords(locations: readonly SkillLocation[]): SkillRecord[] {
	const records = new Map<string, SkillRecord>();
	for (const location of locations) {
		const key = recordKey(location.scope, location.name);
		const record = records.get(key) ?? { key, name: location.name, scope: location.scope, description: '', locations: [] };
		record.locations.push(location);
		records.set(key, record);
	}
	for (const record of records.values()) {
		record.locations.sort((a, b) => rank(a.target) - rank(b.target) || a.dir.localeCompare(b.dir));
		const originals = record.locations.filter(location => !location.copy);
		record.source = originals[0];
		record.description = (record.source ?? record.locations[0]!).description;
	}
	return [...records.values()].sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope));
}

export function skillCell(record: SkillRecord, target: SkillTargetId): SkillCell {
	const location = record.locations.find(item => item.target === target);
	if (!location) return { state: 'off' };
	if (!location.copy) return { state: 'manual', origin: location === record.source, location };
	return record.source && record.source.hash !== location.copy.hash ? { state: 'stale', location } : { state: 'copy', location };
}

export function filterRecords(records: readonly SkillRecord[], query: string, scope: SkillScope | 'all'): SkillRecord[] {
	const needle = query.trim().toLowerCase();
	return records.filter(record => (scope === 'all' || record.scope === scope)
		&& (!needle || record.name.toLowerCase().includes(needle) || record.description.toLowerCase().includes(needle)));
}

export class SkillError extends Error {
	constructor(readonly code: 'exists' | 'not-owned' | 'no-source' | 'unavailable' | 'trash-failed' | 'unknown-target' | 'too-large', message = code) { super(message); }
}

export function parseMarker(text: string): SkillCopyMarker | undefined {
	try {
		const value: unknown = JSON.parse(text);
		if (typeof value !== 'object' || value === null) return undefined;
		const { version, name, source, hash, copiedAt } = value as Record<string, unknown>;
		return version === 1 && typeof name === 'string' && typeof source === 'string' && typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash)
			? { version, name, source, hash, copiedAt: typeof copiedAt === 'number' ? copiedAt : 0 } : undefined;
	} catch { return undefined; }
}

/** What the desktop side offers the skills manager; everything that touches disk lives behind it. */
export interface SkillOps {
	roots(): Promise<SkillRoot[]>;
	scan(roots: readonly SkillRoot[], extra: readonly string[], signal: AbortSignal): Promise<{ locations: SkillLocation[]; unavailable: string[] }>;
	copy(source: SkillLocation, root: SkillRoot): Promise<void>;
	update(source: SkillLocation, copy: SkillLocation): Promise<void>;
	/** `trash` moves the copy to the system trash; `delete` removes it for good. */
	remove(copy: SkillLocation, mode: 'trash' | 'delete'): Promise<void>;
	/** Open a folder in the file manager. */
	open(dir: string): Promise<void>;
}

import type { SpaceRecord, VaultDirectoryBinding } from '../space/model';
import type { WorkspaceState } from '../workspace/model';

/** Pure planning for the one-shot legacy workbench import (T-15). No I/O, no clocks, no localization. */

export type LegacyLayoutStatus = 'absent' | 'empty' | 'importable' | 'unsupported-version' | 'corrupt';

export interface LayoutCounts {
	readonly tabs: number;
	readonly terminal: number;
	readonly browser: number;
	readonly page: number;
	readonly groups: number;
	readonly closedTabs: number;
	/** Terminal panes across all terminal tabs (identity-bearing leaves). */
	readonly panes: number;
}
export interface LegacyLayoutInspection {
	readonly status: LegacyLayoutStatus;
	readonly counts: LayoutCounts;
	/** The validated source layout, byte-for-byte as parsed. Present only when importable. */
	readonly layout?: WorkspaceState;
}
const ZERO: LayoutCounts = { tabs: 0, terminal: 0, browser: 0, page: 0, groups: 0, closedTabs: 0, panes: 0 };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function countLayout(layout: WorkspaceState): LayoutCounts {
	const tabs = Object.values(layout.tabs);
	let panes = 0;
	for (const tab of tabs)
		if (tab.kind === 'terminal') panes += Array.isArray(tab.sessionIds) ? tab.sessionIds.length : 0;
	return {
		tabs: tabs.length,
		terminal: tabs.filter((t) => t.kind === 'terminal').length,
		browser: tabs.filter((t) => t.kind === 'browser').length,
		page: tabs.filter((t) => t.kind === 'page').length,
		groups: layout.groups.length,
		closedTabs: layout.closedTabs.length,
		panes,
	};
}

/** Never throws and never substitutes a default: damaged or newer data is reported, not replaced. */
export function inspectLegacyLayout(text: string | null): LegacyLayoutInspection {
	if (text === null) return { status: 'absent', counts: ZERO };
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { status: 'corrupt', counts: ZERO };
	}
	if (!object(parsed)) return { status: 'corrupt', counts: ZERO };
	if (parsed.version !== 1)
		return { status: typeof parsed.version === 'number' ? 'unsupported-version' : 'corrupt', counts: ZERO };
	if (!object(parsed.tabs) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.closedTabs))
		return { status: 'corrupt', counts: ZERO };
	for (const [id, tab] of Object.entries(parsed.tabs)) {
		if (!object(tab) || tab.id !== id || !['terminal', 'browser', 'page'].includes(String(tab.kind)))
			return { status: 'corrupt', counts: ZERO };
	}
	const layout = parsed as unknown as WorkspaceState;
	const counts = countLayout(layout);
	// A layout with no tab and no closed-tab history has nothing to import.
	return counts.tabs === 0 && counts.closedTabs === 0
		? { status: 'empty', counts }
		: { status: 'importable', counts, layout };
}

/** Same source bytes always give the same Space id, so a repeated run can recognise its own import. */
export function legacySpaceId(sourceDigest: string): string {
	return `legacy-import-${sourceDigest.slice(0, 16)}`;
}

/** Annotation keys written by the account-aware history are `[agent, account, session]` tuples; others cannot be attributed. */
export function classifyAnnotations(history: unknown): { total: number; attributable: number; unattributable: number } {
	if (!object(history)) return { total: 0, attributable: 0, unattributable: 0 };
	let attributable = 0;
	const keys = Object.keys(history);
	for (const key of keys) {
		try {
			const tuple: unknown = JSON.parse(key);
			// The account part may be empty: that is the system account, still an attributable identity.
			if (
				Array.isArray(tuple) &&
				tuple.length === 3 &&
				tuple.every((v) => typeof v === 'string') &&
				tuple[0] &&
				tuple[2]
			)
				attributable++;
		} catch {
			/* a bare legacy id is not attributable */
		}
	}
	return { total: keys.length, attributable, unattributable: keys.length - attributable };
}

/** Minimal structural view of the v2 records this planner extends; the full codec stays with the Space owner. */
export interface RecordsLike {
	spaces: Record<string, SpaceRecord>;
	layouts: Record<string, WorkspaceState>;
	selectedSpaceId?: string;
}

export interface ImportSpaceInput {
	readonly spaceId: string;
	readonly name: string;
	readonly directory: VaultDirectoryBinding;
	readonly layout: WorkspaceState;
	readonly now: number;
}
export interface ImportSpaceResult<R extends RecordsLike> {
	readonly records: R;
	readonly created: boolean;
}

/**
 * Adds the "Import Space" with the untouched legacy layout. Existing Spaces, even with the same directory, are never
 * merged into or modified; an existing Space with the deterministic id means this source was already imported.
 */
export function addImportSpace<R extends RecordsLike>(records: R, input: ImportSpaceInput): ImportSpaceResult<R> {
	if (Object.hasOwn(records.spaces, input.spaceId)) return { records, created: false };
	const next = structuredClone(records);
	const hadActive = Object.values(next.spaces).some((space) => !space.archived);
	next.spaces[input.spaceId] = {
		id: input.spaceId,
		name: input.name,
		directory: input.directory,
		archived: false,
		createdAt: input.now,
		updatedAt: input.now,
	};
	next.layouts[input.spaceId] = structuredClone(input.layout);
	if (next.selectedSpaceId === undefined && !hadActive) next.selectedSpaceId = input.spaceId;
	return { records: next, created: true };
}

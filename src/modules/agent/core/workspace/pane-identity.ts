import type { LayoutNode } from '../terminal/layout';
import type { TerminalTabData, WorkspaceState } from './model';

export interface PaneIdentityScope { readonly kind: 'space' | 'shared'; readonly spaceId?: string }
export type PaneIdentityIssue = 'invalid-id' | 'capacity' | 'unaddressable' | 'duplicate-leaf' | 'duplicate-id';
export interface PaneIdentity {
	readonly paneId?: string;
	readonly spaceId?: string;
	readonly tabId: string;
	readonly leafKey: string;
	readonly path: readonly ('first' | 'second')[];
	readonly ratio?: number;
	readonly issue?: PaneIdentityIssue;
}
export class PaneIdentityError extends Error {
	constructor(readonly reason: PaneIdentityIssue) { super(`Pane identity ${reason}`); }
}
export class PaneCommandError extends Error {
	constructor(readonly code: string, readonly reason: string, options?: ErrorOptions) {
		super(`Pane ${reason}`, options); this.name = 'PaneCommandError';
	}
}
export const MAX_INDEXED_PANES = 4096;
/** Counts actual reachable leaves, including old over-limit layouts that can still be reduced. */
export function paneLeafCount(view: WorkspaceState): number {
	return Object.values(view.tabs).reduce((total, tab) => total + (tab.kind === 'terminal' ? paneLeaves(tab.paneLayout).length : 0), 0);
}
export function assertPaneCapacity(views: Iterable<WorkspaceState>, additional = 0): void {
	if (!Number.isSafeInteger(additional) || additional < 0) throw new PaneIdentityError('capacity');
	let total = additional;
	for (const view of views) {
		if (Object.keys(view.tabs).length > 200) throw new PaneIdentityError('capacity');
		total += paneLeafCount(view);
		if (total > MAX_INDEXED_PANES) throw new PaneIdentityError('capacity');
	}
}
export function validPaneId(value: unknown): value is string {
	if (typeof value !== 'string' || !value.length || value.length > 4096) return false;
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code < 32 || code === 127) return false;
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(++i);
			if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
		} else if (code >= 0xdc00 && code <= 0xdfff) return false;
	}
	return new TextEncoder().encode(value).length <= 4096;
}
/** Canonical full tuple. The 3069-byte ceiling includes JSON syntax and escaping. */
export function legacyPaneId(scope: PaneIdentityScope, tabId: string, leafKey: string): string {
	const space = scope.kind === 'space' ? scope.spaceId ?? '' : '';
	if (!tabId || !leafKey || (scope.kind === 'space' && !space)) throw new PaneIdentityError('unaddressable');
	if (scope.kind.length + space.length + tabId.length + leafKey.length > 3069) throw new PaneIdentityError('capacity');
	const bytes = new TextEncoder().encode(JSON.stringify([scope.kind, space, tabId, leafKey]));
	if (bytes.length > 3069) throw new PaneIdentityError('capacity');
	return 'lp1.' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function paneLeaves(root: LayoutNode): Array<{ leafKey: string; path: ('first' | 'second')[]; ratio?: number }> {
	const leaves: Array<{ leafKey: string; path: ('first' | 'second')[]; ratio?: number }> = [];
	let visited = 0;
	const walk = (node: LayoutNode, path: ('first' | 'second')[], ratio?: number) => {
		if (++visited > 2048 || path.length > 16) throw new PaneIdentityError('capacity');
		if (!node || typeof node !== 'object') throw new PaneIdentityError('unaddressable');
		if (node.kind === 'pane' && typeof node.session === 'string') { leaves.push({ leafKey: node.session, path, ratio }); return; }
		if (node.kind !== 'split') throw new PaneIdentityError('unaddressable');
		walk(node.first, [...path, 'first'], node.ratio);
		walk(node.second, [...path, 'second'], 1 - node.ratio);
	};
	walk(root, []);
	return leaves;
}
/** Describes actual view leaves while using the raw baseline solely to authenticate missing legacy identities. */
export function projectPaneIdentities(view: WorkspaceState, scope: PaneIdentityScope, baseline: WorkspaceState): PaneIdentity[] {
	const result: PaneIdentity[] = [];
	const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
	if (!record(view.tabs) || !record(baseline.tabs)) throw new PaneIdentityError('unaddressable');
	const tabs = Object.entries(view.tabs);
	if (tabs.length > 200 || Object.keys(baseline.tabs).length > 200) throw new PaneIdentityError('capacity');
	for (const [key, tab] of tabs) {
		if (!tab || tab.kind !== 'terminal') continue;
		const raw = baseline.tabs[key];
		let rawLeaves: ReturnType<typeof paneLeaves> = [], rawIssue: PaneIdentityIssue | undefined;
		try { rawLeaves = raw?.kind === 'terminal' ? paneLeaves(raw.paneLayout) : []; }
		catch (error) { rawIssue = error instanceof PaneIdentityError ? error.reason : 'unaddressable'; }
		for (const leaf of paneLeaves(tab.paneLayout)) {
			const entry = { ...leaf, spaceId: scope.spaceId, tabId: key };
			const info = tab.panes[leaf.leafKey];
			if (tab.id !== key || !info || !tab.sessionIds.includes(leaf.leafKey)) { result.push({ ...entry, issue: 'unaddressable' }); continue; }
			const known = validPaneId(info.paneId) ? { paneId: info.paneId } : {};
			if (rawIssue) { result.push({ ...entry, ...known, issue: rawIssue }); continue; }
			if (rawLeaves.filter(row => row.leafKey === leaf.leafKey).length > 1) { result.push({ ...entry, ...known, issue: 'duplicate-leaf' }); continue; }
			if (info.paneId !== undefined) {
				result.push(validPaneId(info.paneId) ? { ...entry, paneId: info.paneId } : { ...entry, issue: 'invalid-id' });
				continue;
			}
			if (raw?.kind !== 'terminal' || raw.id !== key || !Array.isArray(raw.sessionIds)
				|| !raw.sessionIds.every(id => typeof id === 'string') || !raw.sessionIds.includes(leaf.leafKey)
				|| !rawLeaves.some(row => row.leafKey === leaf.leafKey)) {
				result.push({ ...entry, issue: 'unaddressable' }); continue;
			}
			const rawInfo: unknown = record(raw.panes) ? (Object.hasOwn(raw.panes, leaf.leafKey) ? raw.panes[leaf.leafKey] : raw.resume) : raw.panes === undefined ? raw.resume : undefined;
			if (!record(rawInfo)) { result.push({ ...entry, issue: 'unaddressable' }); continue; }
			const savedId = rawInfo.paneId;
			if (savedId !== undefined) {
				result.push(validPaneId(savedId) ? { ...entry, paneId: savedId } : { ...entry, issue: 'invalid-id' });
				continue;
			}
			try { result.push({ ...entry, paneId: legacyPaneId(scope, key, leaf.leafKey) }); }
			catch (error) { result.push({ ...entry, issue: error instanceof PaneIdentityError ? error.reason : 'unaddressable' }); }
		}
	}
	const counts = new Map<string, number>();
	for (const row of result) if (row.paneId) counts.set(row.paneId, (counts.get(row.paneId) ?? 0) + 1);
	return result.map(row => row.paneId && counts.get(row.paneId)! > 1 ? { ...row, issue: 'duplicate-id' } : row);
}
export function newPaneId(used: Set<string>, allocate: () => string = () => `pn1.${crypto.randomUUID()}`): string {
	for (let attempt = 0; attempt < 16; attempt++) {
		const id = allocate();
		if (validPaneId(id) && !used.has(id)) { used.add(id); return id; }
	}
	throw new PaneIdentityError('capacity');
}
/** Explicit mutations only. Invalid legacy data stays diagnosable instead of silently gaining a new alias. */
export function materializePaneIdentities(
	view: WorkspaceState, scope: PaneIdentityScope, baseline: WorkspaceState,
	allocate?: () => string, previous?: WorkspaceState,
): WorkspaceState {
	const rows = projectPaneIdentities(view, scope, baseline);
	const used = new Set(rows.flatMap(row => row.paneId ? [row.paneId] : []));
	let tabs = view.tabs;
	for (const row of rows) {
		const original = view.tabs[row.tabId] as TerminalTabData;
		if (original.panes[row.leafKey]?.paneId !== undefined) continue;
		const old = previous?.tabs[row.tabId];
		const inherited = old?.kind === 'terminal' ? old.panes[row.leafKey]?.paneId : undefined;
		const raw = baseline.tabs[row.tabId];
		const newlyAdded = raw?.kind !== 'terminal' || (Array.isArray(raw.sessionIds) && !raw.sessionIds.includes(row.leafKey));
		const id = validPaneId(inherited) ? inherited : row.paneId ?? (newlyAdded ? newPaneId(used, allocate) : undefined);
		if (!id) continue;
		if (tabs === view.tabs) tabs = { ...tabs };
		const tab = tabs[row.tabId] as TerminalTabData;
		const info = { ...tab.panes[row.leafKey]!, paneId: id };
		tabs[row.tabId] = { ...tab, panes: { ...tab.panes, [row.leafKey]: info }, resume: tab.focusedSessionId === row.leafKey && tab.resume ? { ...tab.resume, paneId: id } : tab.resume };
	}
	return tabs === view.tabs ? view : { ...view, tabs };
}

import { expect, test } from 'vitest';
import { legacyPaneId, materializePaneIdentities, newPaneId, projectPaneIdentities } from './pane-identity';
import { emptyWorkspace, type TerminalTabData } from './model';
import { closeTab, normalizeWorkspace, openTab, renameTab } from './ops';

test('legacy identity is the complete lossless scoped tuple rather than an index or hash', () => {
	expect(legacyPaneId({ kind: 'space', spaceId: 's' }, 't', 'r')).toBe('lp1.WyJzcGFjZSIsInMiLCJ0IiwiciJd');
});

const scope = { kind: 'space' as const, spaceId: 's' };
const terminal = (id = 't', key = 'r'): TerminalTabData => ({
	id, kind: 'terminal', title: id, createdAt: 1, updatedAt: 1, state: 'idle', unread: false,
	sessionIds: [key], focusedSessionId: key, paneLayout: { kind: 'pane', session: key }, panes: { [key]: { cwd: '/' } },
});
const layout = () => openTab(emptyWorkspace(), 'g', terminal());

test('legacy 3069-byte JSON fits the complete ID and 3070 bytes is rejected without truncation', () => {
	expect(legacyPaneId(scope, 't', 'r'.repeat(3049))).toHaveLength(4096);
	expect(() => legacyPaneId(scope, 't', 'r'.repeat(3050))).toThrow('capacity');
	const tuple = ['space', '原 空间', 't"\\', '🙂\ud800'];
	const id = legacyPaneId({ kind: 'space', spaceId: tuple[1]! }, tuple[2]!, tuple[3]!);
	expect(JSON.parse(Buffer.from(id.slice(4), 'base64url').toString('utf8'))).toEqual(tuple);
	expect(legacyPaneId({ kind: 'shared' }, 't', 'r')).not.toBe(legacyPaneId(scope, 't', 'r'));
	expect(legacyPaneId({ kind: 'space', spaceId: 'S' }, 't', 'r')).not.toBe(legacyPaneId(scope, 't', 'r'));
});

test('projection allocates no identities and never changes the raw baseline or clean normalized view', () => {
	const raw = layout(), view = normalizeWorkspace(raw), before = structuredClone({ raw, view });
	expect(projectPaneIdentities(view, scope, raw)[0]).toMatchObject({ paneId: 'lp1.WyJzcGFjZSIsInMiLCJ0IiwiciJd', leafKey: 'r', path: [] });
	expect({ raw, view }).toEqual(before);
	const candidate = materializePaneIdentities(renameTab(view, 't', 'edit'), scope, raw);
	expect((candidate.tabs.t as TerminalTabData).panes.r?.paneId).toBe(projectPaneIdentities(view, scope, raw)[0]?.paneId);
	expect((raw.tabs.t as TerminalTabData).panes.r?.paneId).toBeUndefined();
});

test('explicit opaque identities survive, invalid values remain diagnostic and duplicates are never chosen', () => {
	for (const value of ['', 'x'.repeat(4097), 7, 'bad\u0000id', 'bad\u007fid', '\ud800']) {
		const raw = layout(); Reflect.set((raw.tabs.t as TerminalTabData).panes.r!, 'paneId', value);
		expect(projectPaneIdentities(normalizeWorkspace(raw), scope, raw)[0]?.issue).toBe('invalid-id');
	}
	let raw = layout();
	(raw.tabs.t as TerminalTabData).panes.r!.paneId = '__proto__';
	raw = openTab(raw, 'g', terminal('other', 'another'));
	(raw.tabs.other as TerminalTabData).panes.another!.paneId = '__proto__';
	expect(projectPaneIdentities(raw, scope, raw).map(row => row.issue)).toEqual(['duplicate-id', 'duplicate-id']);
});

test('normalized synthetic and duplicate original leaves have no invented legacy identity', () => {
	const raw = layout(), tab = raw.tabs.t as TerminalTabData;
	tab.sessionIds = []; tab.paneLayout = { kind: 'pane', session: 'not-original' };
	expect(projectPaneIdentities(normalizeWorkspace(raw), scope, raw)[0]).toMatchObject({ issue: 'unaddressable' });
	const duplicate = layout(), duplicated = duplicate.tabs.t as TerminalTabData;
	duplicated.paneLayout = { kind: 'split', direction: 'row', ratio: 0.5, first: duplicated.paneLayout, second: duplicated.paneLayout };
	expect(projectPaneIdentities(normalizeWorkspace(duplicate), scope, duplicate)[0]?.issue).toBe('duplicate-leaf');
});

test('shallow-valid raw records with malformed pane metadata are diagnosed without throwing TypeError', () => {
	for (const change of [{ panes: undefined }, { panes: null }, { panes: 7 }, { panes: { r: null } }, { sessionIds: undefined }, { sessionIds: {} }]) {
		const raw = layout(); Object.assign(raw.tabs.t!, change);
		const rows = projectPaneIdentities(normalizeWorkspace(raw), scope, raw);
		expect(rows[0]?.issue).toBe('unaddressable');
		expect(rows[0]?.paneId).toBeUndefined();
	}
});

test('only explicit mutation allocates new display identities, and an exhausted allocator fails finitely', () => {
	const raw = emptyWorkspace(), view = layout();
	let count = 0;
	const first = materializePaneIdentities(view, scope, raw, () => { count++; return 'pn1.fixture'; });
	expect(count).toBe(1);
	expect(materializePaneIdentities(first, scope, raw)).toBe(first);
	expect(projectPaneIdentities(closeTab(first, 't'), scope, raw)).toEqual([]);
	let attempts = 0;
	expect(() => newPaneId(new Set(['duplicate']), () => { attempts++; return 'duplicate'; })).toThrow('capacity');
	expect(attempts).toBe(16);
});

test('raw duplicate and oversized trees retain known explicit IDs as unusable diagnostics', () => {
	const view = layout(), raw = layout();
	(view.tabs.t as TerminalTabData).panes.r!.paneId = 'opaque';
	const tab = raw.tabs.t as TerminalTabData;
	tab.paneLayout = { kind: 'split', direction: 'row', ratio: 0.5, first: tab.paneLayout, second: tab.paneLayout };
	expect(projectPaneIdentities(view, scope, raw)[0]).toMatchObject({ paneId: 'opaque', issue: 'duplicate-leaf' });
	for (let i = 0; i < 17; i++) tab.paneLayout = { kind: 'split', direction: 'row', ratio: 0.5, first: tab.paneLayout, second: { kind: 'pane', session: `other-${i}` } };
	expect(projectPaneIdentities(view, scope, raw)[0]).toMatchObject({ paneId: 'opaque', issue: 'capacity' });
});

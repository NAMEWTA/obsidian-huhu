import { describe, expect, test } from 'vitest';
import {
	BACKUP_VERSION,
	EXCLUSION_CATEGORIES,
	MAX_PACKAGE_CHARS,
	buildPackage,
	parsePackage,
	serializePackage,
	type PackageInput,
} from '../../src/modules/agent/core/backup/format';
import { mergePortableAgentSettings, portableAgentSettings } from '../../src/modules/agent/core/backup/settings-codec';
import {
	InvalidSection,
	isEmptyDocument,
	restoreAutomationRuntime,
	restoreDefinitionDocument,
	restoreNotificationInbox,
	rewriteDeviceId,
	validateStats,
} from '../../src/modules/agent/core/backup/transforms';
import { sectionPath } from '../../src/modules/agent/core/backup/paths';
import { SECRET, agentSettingsFile, definitionDocument } from './fixtures';

const input = (): PackageInput => ({
	createdAt: 5,
	source: { vaultName: 'V', device: 'dev-a', devices: ['dev-a'] },
	notes: [],
	exclusions: EXCLUSION_CATEGORIES,
	entries: [{ section: 'workspace-stats', device: 'dev-a', text: '{"version":1}', via: 'live' }],
});

describe('package format', () => {
	test('round-trips and verifies every digest', async () => {
		const pkg = await buildPackage(input());
		const parsed = await parsePackage(serializePackage(pkg));
		expect(parsed.digest).toBe(pkg.digest);
		expect(parsed.version).toBe(BACKUP_VERSION);
		expect(parsed.manifest.entries[0]).toMatchObject({ section: 'workspace-stats', device: 'dev-a', bytes: 13 });
	});
	test('the digest covers the manifest header, not just the payload', async () => {
		const pkg = JSON.parse(serializePackage(await buildPackage(input())));
		for (const edit of [
			(p: any) => (p.source.vaultName = 'Other'),
			(p: any) => (p.manifest.exclusions = []),
			(p: any) => (p.manifest.entries[0].via = 'offline'),
			(p: any) => (p.manifest.notes = [{ code: 'section-absent' }]),
		]) {
			const copy = structuredClone(pkg);
			edit(copy);
			await expect(parsePackage(JSON.stringify(copy))).rejects.toMatchObject({ code: 'digest-mismatch' });
		}
	});
	test('refuses an oversized document before parsing it', async () => {
		await expect(parsePackage('x'.repeat(MAX_PACKAGE_CHARS + 1))).rejects.toMatchObject({ code: 'too-large' });
	});
	test('a manifest that names an unknown exclusion is rejected', async () => {
		const pkg = JSON.parse(serializePackage(await buildPackage(input())));
		pkg.manifest.exclusions = ['everything'];
		await expect(parsePackage(JSON.stringify(pkg))).rejects.toMatchObject({ code: 'invalid-structure' });
	});
	test('section paths come from the device id, and a hostile device id cannot form a path', () => {
		expect(sectionPath('workbench-records', 'dev-a')).toBe('.huhu/terminal-agent/dev-a/workbench-v2.json');
		expect(() => sectionPath('workbench-records', '../x')).toThrow();
		expect(() => sectionPath('notifications-inbox', 'a/b')).toThrow();
	});
});

describe('portable agent settings', () => {
	const agent = (JSON.parse(agentSettingsFile()) as any).namespaces.agent;
	test('keeps appearance, command text, accounts and permission intent; drops env, arguments, paths and acknowledgements', () => {
		const portable = portableAgentSettings(agent);
		const text = JSON.stringify(portable);
		expect(portable).toMatchObject({ fontSize: 17, permissionMode: 'yolo' });
		expect((portable.quickCommands as unknown[])[0]).toMatchObject({ content: 'pnpm build' });
		for (const gone of [
			SECRET,
			'env',
			'extraArgs',
			'cliPath',
			'customShellPath',
			'skillDirectories',
			'yoloAcknowledged',
			'overrides',
		])
			expect(text).not.toContain(gone);
		expect((portable.agents as any).agents.codex).toEqual({
			enabled: true,
			permissionMode: 'yolo',
			accountId: 'acct-A',
			showUsage: true,
		});
	});
	test('an unknown new field is never carried (allow list, not block list)', () => {
		expect(portableAgentSettings({ fontSize: 12, apiToken: SECRET, nested: { token: SECRET } })).toEqual({
			fontSize: 12,
		});
	});
	test('merging keeps machine fields and never raises a permission mode', () => {
		const portable = portableAgentSettings(agent);
		const merged = mergePortableAgentSettings(
			{
				customShellPath: '/mine',
				permissionMode: 'manual',
				agents: {
					yoloAcknowledged: false,
					globalPermissionMode: 'manual',
					agents: { codex: { cliPath: '/c', permissionMode: 'inherit' } },
				},
			},
			portable,
		);
		expect(merged.agent).toMatchObject({
			customShellPath: '/mine',
			permissionMode: 'manual',
			fontSize: 17,
			agents: {
				yoloAcknowledged: false,
				globalPermissionMode: 'manual',
				agents: { codex: { cliPath: '/c', permissionMode: 'inherit', accountId: 'acct-A' } },
			},
		});
		expect(merged.permissionRaisesSkipped).toBe(3);
		// Lowering is applied.
		const lowered = mergePortableAgentSettings({ permissionMode: 'yolo' }, { permissionMode: 'manual' });
		expect(lowered.agent.permissionMode).toBe('manual');
		expect(lowered.permissionRaisesSkipped).toBe(0);
	});
});

describe('effective permission (L5)', () => {
	test('inherit cannot raise an agent to YOLO through a global YOLO', () => {
		const target = {
			agents: {
				globalPermissionMode: 'yolo',
				yoloAcknowledged: false,
				agents: { codex: { permissionMode: 'manual' } },
			},
		};
		const merged = mergePortableAgentSettings(target, {
			agents: { agents: { codex: { permissionMode: 'inherit' } } },
		});
		expect((merged.agent.agents as any).agents.codex.permissionMode).toBe('manual');
		expect(merged.permissionRaisesSkipped).toBe(1);
		// Lowering through inherit is fine.
		const lowered = mergePortableAgentSettings(
			{ agents: { globalPermissionMode: 'manual', agents: { codex: { permissionMode: 'yolo' } } } },
			{ agents: { agents: { codex: { permissionMode: 'inherit' } } } },
		);
		expect((lowered.agent.agents as any).agents.codex.permissionMode).toBe('inherit');
		expect(lowered.permissionRaisesSkipped).toBe(0);
	});
});

describe('manifest hygiene (L9, L3)', () => {
	test('unknown note codes are refused', async () => {
		const pkg = await buildPackage({ ...input(), notes: [] });
		const raw = JSON.parse(serializePackage(pkg));
		raw.manifest.notes = [{ code: 'run-this' }];
		await expect(parsePackage(JSON.stringify(raw))).rejects.toMatchObject({ code: 'invalid-structure' });
	});
	test('records are empty only when nothing at all is stored', () => {
		const base = {
			spaces: {},
			sessions: {},
			grants: {},
			layouts: {},
			historyOwners: {},
			sharedLayout: { version: 1, tabs: {}, groups: [], closedTabs: [] },
		};
		expect(isEmptyDocument('records', JSON.stringify(base))).toBe(true);
		for (const change of [
			{ grants: { g: {} } },
			{ historyOwners: { a: 's' } },
			{ selectedSpaceId: 's' },
			{ layouts: { s: {} } },
			{ sharedLayout: { version: 1, tabs: { t: {} }, groups: [], closedTabs: [] } },
			{ sharedLayout: { version: 1, tabs: {}, groups: [{}], closedTabs: [] } },
		])
			expect(isEmptyDocument('records', JSON.stringify({ ...base, ...change }))).toBe(false);
	});
});

describe('restore transforms', () => {
	const runtime = JSON.stringify({
		definitions: [{ id: 'd', deviceId: 'dev-a' }],
		runs: [
			{
				id: 'a',
				status: 'running',
				definition: { deviceId: 'dev-a', other: 'dev-a' },
				notificationAttempted: false,
			},
			{ id: 'b', status: 'unknown', notificationAttempted: true },
			{ id: 'c', status: 'succeeded', notificationAttempted: true, output: 'kept' },
			{ id: 'd', status: 'failed' },
		],
		cursors: { 'x:1': 4 },
	});
	test('automation runtime: activity becomes history, results stay, unsent notifications are suppressed, ids are re-bound', () => {
		const restored = restoreAutomationRuntime(runtime, { fromDevice: 'dev-a', toDevice: 'dev-b', at: 9 });
		const state = JSON.parse(restored.text);
		expect(restored.demoted).toBe(2);
		expect(state.runs.map((r: any) => r.status)).toEqual(['interrupted', 'interrupted', 'succeeded', 'failed']);
		expect(state.runs[0]).toMatchObject({ endedAt: 9, definition: { deviceId: 'dev-b', other: 'dev-a' } });
		expect(state.runs[2].output).toBe('kept');
		expect(state.restored).toEqual({ a: { at: 9, from: 'running' }, b: { at: 9, from: 'unknown' }, d: { at: 9 } });
		expect(state.definitions[0].deviceId).toBe('dev-b');
		expect(state.cursors).toEqual({ 'x:1': 4 });
		// Deterministic: restoring the same text twice gives the same bytes, which is what makes a retry idempotent.
		expect(restoreAutomationRuntime(runtime, { fromDevice: 'dev-a', toDevice: 'dev-b', at: 9 }).text).toBe(
			restored.text,
		);
	});
	test('automation runtime: shape errors and duplicate runs are refused', () => {
		for (const text of [
			'x',
			'[]',
			'{"runs":[]}',
			JSON.stringify({ definitions: [], runs: [{ id: 'a' }], cursors: {} }),
			JSON.stringify({
				definitions: [],
				runs: [
					{ id: 'a', status: 's' },
					{ id: 'a', status: 's' },
				],
				cursors: {},
			}),
		])
			expect(() => restoreAutomationRuntime(text, { fromDevice: 'a', toDevice: 'b', at: 1 })).toThrow(
				InvalidSection,
			);
	});
	test('inbox: pending is shown as unknown everywhere, tombstones are kept', () => {
		const text = JSON.stringify({
			records: [{ id: 'r', channels: ['in-app'], deliveries: { 'in-app': 'pending' } }],
			receipts: { r: { 'in-app': 'pending' }, gone: { 'in-app': 'sent' } },
		});
		const restored = restoreNotificationInbox(text);
		expect(JSON.parse(restored.text)).toEqual({
			records: [{ id: 'r', channels: ['in-app'], deliveries: { 'in-app': 'unknown' } }],
			receipts: { r: { 'in-app': 'unknown' }, gone: { 'in-app': 'sent' } },
		});
		expect(restored).toMatchObject({ records: 1, receipts: 2 });
		expect(() => restoreNotificationInbox('{"records":[],"receipts":{"x":{"in-app":"delivered-ish"}}}')).toThrow(
			InvalidSection,
		);
	});
	test('definition: disabled and re-bound, path derived from id and name, hostile input contained', () => {
		const doc = restoreDefinitionDocument(definitionDocument('auto-12345678', 'My Task', 'dev-a'), {
			fromDevice: 'dev-a',
			toDevice: 'dev-b',
		});
		expect(doc).toMatchObject({
			id: 'auto-12345678',
			wasEnabled: true,
			path: '.huhu/automation/definitions/My-Task-12345678/操作.md',
		});
		expect(doc.text).toContain('enabled: false');
		expect(doc.text).toContain('deviceId: dev-b');
		expect(doc.text).toContain('Body of My Task');
		const off = restoreDefinitionDocument(definitionDocument('auto-12345678', 'My Task', 'dev-a', false), {
			fromDevice: 'dev-a',
			toDevice: 'dev-a',
		});
		expect(off.text).toBe(definitionDocument('auto-12345678', 'My Task', 'dev-a', false));
		const evil = restoreDefinitionDocument(definitionDocument('auto-12345678', '../../x/..', 'dev-a'), {
			fromDevice: 'dev-a',
			toDevice: 'dev-a',
		});
		expect(evil.path).toMatch(/^\.huhu\/automation\/definitions\/[^/]+\/操作\.md$/);
		expect(evil.path).not.toContain('..');
		for (const text of [
			'no frontmatter',
			'---\nhuhu-type: note\nhuhu-id: abcdefgh\nname: x\n---\n',
			definitionDocument('a/b/../c-12345', 'n', 'dev-a'),
			'---\nhuhu-type: automation\n',
			`---\nhuhu-type: automation\nhuhu-id: abcdefgh12\nname: ""\n---\n`,
		])
			expect(() => restoreDefinitionDocument(text, { fromDevice: 'a', toDevice: 'a' })).toThrow(InvalidSection);
	});
	test('device rewrite touches only deviceId properties equal to the source', () => {
		const value = { deviceId: 'a', list: [{ deviceId: 'a' }, { deviceId: 'c' }], other: 'a' };
		expect(rewriteDeviceId(value, 'a', 'b')).toBe(2);
		expect(value).toEqual({ deviceId: 'b', list: [{ deviceId: 'b' }, { deviceId: 'c' }], other: 'a' });
	});
	test('empty-target recognition is strict: real data is never treated as empty', () => {
		expect(isEmptyDocument('runtime', '{"definitions":[],"runs":[],"cursors":{}}')).toBe(true);
		expect(isEmptyDocument('runtime', '{"definitions":[],"runs":[{"id":"a"}],"cursors":{}}')).toBe(false);
		expect(isEmptyDocument('inbox', '{"records":[],"receipts":{"x":{}}}')).toBe(false);
		expect(isEmptyDocument('history', '{}')).toBe(true);
		expect(isEmptyDocument('history', 'garbage')).toBe(false);
		expect(
			validateStats(
				'{"version":1,"firstEventAt":null,"agentsLaunched":0,"agentWorkMs":0,"daily":{},"byAgent":{}}',
			).count,
		).toBe(0);
		expect(() => validateStats('{"version":2}')).toThrow(InvalidSection);
	});
});

test('portable dictionaries consume only own fields and never retain inherited provider or account aliases', () => {
	const inheritedRow = Object.create({ enabled: true, permissionMode: 'yolo', accountId: 'inherited-account' }) as Record<string, unknown>;
	const agents = Object.assign(Object.create({ globalPermissionMode: 'yolo' }) as Record<string, unknown>, { agents: { codex: inheritedRow } });
	const raw = Object.assign(Object.create({ fontSize: 30, permissionMode: 'yolo' }) as Record<string, unknown>, {
		agents,
		enabled: Object.create({ codex: false }), usageAnalytics: Object.create({ codex: false }),
		accounts: Object.create({ codex: ['inherited-account'] }),
		accountLabels: { codex: Object.create({ inherited: 'inherited label' }) },
		quickCommands: [Object.assign(Object.create({ content: 'inherited command', agentId: 'codex' }), { id: 'owned', name: 'Owned' })],
	});
	const portable = portableAgentSettings(raw);
	expect(Object.hasOwn(portable, 'fontSize')).toBe(false);
	expect(Object.hasOwn(portable, 'permissionMode')).toBe(false);
	expect(portable).toMatchObject({ enabled: {}, usageAnalytics: {}, accounts: {}, accountLabels: { codex: {} },
		quickCommands: [{ id: 'owned', name: 'Owned' }], agents: { agents: { codex: {} } } });
	expect(JSON.stringify(portable)).not.toContain('inherited');
	const target = { agents: { globalPermissionMode: 'manual', agents: { codex: { permissionMode: 'manual', accountId: 'mine' } } } };
	const merged = mergePortableAgentSettings(target, raw);
	expect(merged.agent).toMatchObject(target);
	expect(merged.permissionRaisesSkipped).toBe(0);
	expect(Object.hasOwn(inheritedRow, 'enabled')).toBe(false);
	const reserved = JSON.parse('{"agents":{"agents":{"__proto__":{"enabled":true},"constructor":{"enabled":false},"prototype":{"enabled":true}}}}');
	const safe = mergePortableAgentSettings({}, reserved).agent.agents as { agents: Record<string, unknown> };
	expect(Object.getPrototypeOf(safe.agents)).toBeNull();
	for (const key of ['__proto__', 'constructor', 'prototype']) expect(Object.hasOwn(safe.agents, key)).toBe(true);
});

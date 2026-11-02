import { describe, expect, test, vi } from 'vitest';
import { createBackupActions } from '../../src/modules/agent/services/backup/actions';
import { exportBackup } from '../../src/modules/agent/services/backup/export';
import {
	inspectPackage,
	preflightImport,
	runImport,
	type ImportEnv,
} from '../../src/modules/agent/services/backup/import';
import { buildPackage, serializePackage } from '../../src/modules/agent/core/backup/format';
import type { WorkbenchRecords } from '../../src/modules/agent/services/spaces/records';
import { automationRuntimePath } from '../../src/modules/automations/api';
import { notificationInboxPath } from '../../src/modules/notifications/api';
import { agentWorkbenchPath } from '../../src/shared/storage/vault-layout';
import { DST, HISTORY, REGISTRY, RUNS, SECRET, SRC, STATS, definitionDocument, definitionFolder, request, seedSource } from './fixtures';
import { ListStorage, World, settingsDeviceFile } from './world';

export const envOf = (world: World, extra: Partial<ImportEnv> = {}): ImportEnv => ({
	recovery: world.host,
	storage: world.storage,
	device: world.device,
	vaultName: 'Test vault',
	now: () => 1_800_000_000_000,
	target: world.vault,
	directories: world.directories,
	...extra,
});
const json = <T>(storage: ListStorage, path: string) => JSON.parse(storage.files.get(path)!) as T;
const targetSettings = () =>
	JSON.stringify({
		version: 1,
		namespaces: {
			browser: { homepage: 'keep-me' },
			agent: { customShellPath: '/mine/shell', permissionMode: 'manual' },
		},
	});

/** A source vault exported by live owners. */
async function exported(
	options: Parameters<typeof seedSource>[1] = {},
	modules?: ConstructorParameters<typeof World>[1]['modules'],
) {
	const src = new ListStorage();
	seedSource(src, options);
	const source = await new World(src, { vault: SRC, automationsExecute: false, modules }).boot();
	const result = await exportBackup(envOf(source));
	await source.close();
	return { src, ...result };
}

describe('package contents', () => {
	test('lists every collection and every exclusion, and carries no secret, env value or path', async () => {
		const { pkg, text } = await exported({ otherDevice: true });
		const sections = pkg.manifest.entries.map((e) => `${e.section}@${e.device}`).sort();
		expect(sections).toEqual(
			[
				'settings-agent@dev-a',
				'workbench-records@dev-a',
				'history-annotations@dev-a',
				'workspace-stats@dev-a',
				'automation-sessions@dev-a',
				'automation-runtime@dev-a',
				'notifications-inbox@dev-a',
				'history-annotations@dev-c',
				'notifications-inbox@dev-c',
				'automation-definition@null',
				'automation-definition@null',
			].sort(),
		);
		expect(pkg.source.devices).toEqual(['dev-a', 'dev-c']);
		expect(pkg.manifest.exclusions).toEqual(
			expect.arrayContaining([
				'native-transcripts',
				'account-credentials',
				'env-values',
				'caches',
				'endpoints-locks',
				'browser-data',
				'yolo-acknowledgement',
			]),
		);
		for (const secret of [
			SECRET,
			'OPENAI_API_KEY',
			'/home/me/skills',
			'/usr/local/bin/fish',
			'/opt/codex',
			'yoloAcknowledged',
		])
			expect(text).not.toContain(secret);
		// Live owners produced the current device's entries.
		expect(pkg.manifest.entries.filter((e) => e.device === 'dev-a' && e.via === 'live')).toHaveLength(7);
		expect(pkg.manifest.entries.filter((e) => e.device === 'dev-c').every((e) => e.via === 'offline')).toBe(true);
		// The package names no file path at all.
		expect(text).not.toMatch(/\.huhu\//);
		const again = await inspectPackage(text);
		expect(again.view.digest).toBe(pkg.digest);
	});
});

describe('export to an empty vault, with live owners on both sides', () => {
	test('own data arrives complete, nothing starts, and a restart starts nothing either', async () => {
		const { text } = await exported();
		const { pkg } = await inspectPackage(text);
		const dst = new ListStorage();
		dst.files.set(settingsDeviceFile(DST.deviceId), targetSettings());
		const target = await new World(dst, { vault: DST, automationsExecute: false }).boot();

		const before = dst.mutations;
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems).toEqual([]);
		expect(view.warnings.map((w) => w.code)).toEqual(
			expect.arrayContaining(['directory-reauthorize', 'automations-disabled', 'permission-raise-skipped']),
		);
		expect(view.reauthorize).toEqual([{ spaceId: 'space-3', name: 'External', path: '/home/someone/project' }]);
		expect(dst.mutations).toBe(before);

		const outcome = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(outcome.status).toBe('done');

		// Records: ids, same-folder Spaces, accounts, mailbox acks and references survive, re-bound to this vault.
		const records = json<WorkbenchRecords>(dst, agentWorkbenchPath(DST.deviceId));
		expect(Object.keys(records.spaces).sort()).toEqual(['space-1', 'space-2', 'space-3']);
		expect(records.vaultId).toBe(DST.vaultId);
		expect(records.deviceId).toBe(DST.deviceId);
		expect(records.physicalRoot).toEqual(DST.root);
		expect(records.spaces['space-1']!.directory).toMatchObject({ kind: 'vault', relativePath: 'work' });
		expect(records.spaces['space-2']!.directory).toMatchObject({ kind: 'vault', relativePath: 'work' });
		expect(Object.values(records.sessions).map((s) => [s.accountId, s.nativeSessionId])).toEqual([
			['acct-A', 'dup-native'],
			['acct-B', 'dup-native'],
		]);
		expect(records.sessions['ses-1']!.nativeImport).toEqual({
			sourceRef: 'codex/acct-A/dup-native', accountKey: 'acct-A', deviceId: SRC.deviceId, importedAt: 21,
		});
		expect(records.sessions['ses-2']!.nativeImport!.deviceId).toBe(SRC.deviceId);
		expect(records.inbox!.messages.map((m) => [m.messageId, m.ack?.ackedAt])).toEqual([
			['msg-1', 31],
			['msg-2', undefined],
		]);
		expect(records.inbox!.messages[0]!.references[0]).toMatchObject({ vaultId: DST.vaultId, path: 'notes/a.md' });
		expect(records.historyOwners).toEqual({
			'codex/acct-A/dup-native': 'space-1',
			'codex/acct-B/dup-native': 'space-2',
		});
		expect(Object.keys(records.layouts['space-1']!.tabs)).toEqual(['tab-1']);
		// No directory authorization is carried over.
		expect(records.grants['grant-1']).toMatchObject({ revokedAt: expect.any(Number), deviceId: DST.deviceId });

		// Verbatim data.
		const dir = `.huhu/terminal-agent/${DST.deviceId}`;
		expect(dst.files.get(`${dir}/history.json`)).toBe(HISTORY);
		expect(dst.files.get(`${dir}/workspace-stats.json`)).toBe(STATS);
		expect(dst.files.get(`${dir}/automation-sessions.json`)).toBe(REGISTRY);

		// Automation results: every field survives, activity does not.
		const runtime = json<{
			runs: Array<Record<string, unknown>>;
			restored: Record<string, { from?: string }>;
			cursors: Record<string, number>;
		}>(dst, automationRuntimePath(DST.deviceId));
		expect(runtime.runs.map((r) => r.id)).toEqual(RUNS.map((r) => r.id));
		const done = runtime.runs.find((r) => r.id === 'run-done')!;
		expect(done).toMatchObject({
			output: 'Full result text',
			usage: { inputTokens: 5, outputTokens: 9 },
			retryOf: 'run-earlier',
			taskDelivery: { effectKey: 'effect-1' },
			invocation: { request, receipt: { delivery: 'started', terminalId: 'term-1' } },
			session: { accountKey: 'acct-A', sessionId: 'dup-native' },
		});
		expect(done.definition).toMatchObject({ deviceId: DST.deviceId });
		expect(runtime.cursors).toEqual({ 'auto-aaaaaaaa:1': 1000 });
		expect(runtime.runs.filter((r) => ['pending', 'running', 'unknown'].includes(r.status as string))).toEqual([]);
		expect(Object.keys(runtime.restored).sort()).toEqual([
			'run-failed-unsent',
			'run-pending-unsent',
			'run-running',
		]);

		// Notifications: records, read state and the tombstone of a cleared record; pending is never shown as sent.
		const inbox = json<{
			records: Array<{ id: string; read: boolean; deliveries: Record<string, string> }>;
			receipts: Record<string, Record<string, string>>;
		}>(dst, notificationInboxPath(DST.deviceId));
		expect(inbox.records.map((r) => [r.id, r.read])).toEqual([
			['run-done', true],
			['run-pending', false],
		]);
		expect(Object.keys(inbox.receipts).sort()).toEqual(['run-cleared', 'run-done', 'run-pending']);
		expect(inbox.receipts['run-pending']).toEqual({ 'in-app': 'sent', system: 'unknown' });

		// Definitions come back disabled and re-bound to this device; the rest of the document is untouched.
		const doc = dst.files.get(`${definitionFolder('Daily-review', 'auto-00000000')}/操作.md`)!;
		expect(doc).toContain('enabled: false');
		expect(doc).toContain('deviceId: dev-b');
		expect(doc).toContain('Body of Daily-review');

		// Settings: portable part merged, machine fields and other namespaces untouched, no secrets, no silent YOLO.
		const settings = json<{ namespaces: Record<string, Record<string, unknown>> }>(
			dst,
			settingsDeviceFile(DST.deviceId),
		);
		expect(settings.namespaces.browser).toEqual({ homepage: 'keep-me' });
		expect(settings.namespaces.agent).toMatchObject({
			fontSize: 17,
			fontFamily: 'Fira Code',
			customShellPath: '/mine/shell',
			permissionMode: 'manual',
		});
		expect(JSON.stringify(settings)).not.toContain(SECRET);

		// The live settings handle was rebuilt from the restored file.
		expect(target.agent.get()).toMatchObject({
			fontSize: 17,
			customShellPath: '/mine/shell',
			permissionMode: 'manual',
		});
		// Live owners adopted the restored files without a single side effect.
		expect(
			target
				.spaces!.list()
				.map((s) => s.id)
				.sort(),
		).toEqual(['space-1', 'space-2', 'space-3']);
		expect(target.notifications!.records).toHaveLength(2);
		expect(target.automations!.state.runs).toHaveLength(4);
		expect(target.adopted.sort()).toEqual(['agent-automation-sessions', 'agent-history', 'agent-workspace-stats']);
		expect(target.definitionsListed).toBeGreaterThan(1);
		// The automations module's own codec reads every restored document back, disabled and bound to this device.
		const decoded = await (
			target.automations as unknown as {
				options: {
					definitions: { list(): Promise<Array<{ id: string; enabled: boolean; deviceId: string }>> };
				};
			}
		).options.definitions.list();
		expect(decoded.map((d) => [d.id, d.enabled, d.deviceId]).sort()).toEqual([
			['auto-00000000', false, DST.deviceId],
			['auto-00000001', false, DST.deviceId],
		]);
		expect(target.counters).toEqual({ notified: [], delivered: [], started: 0, stopped: 0, scans: 0 });
		await target.close();

		// A full restart of every service, with execution enabled: still nothing is published, delivered or started.
		const restarted = await new World(dst.reboot(), { vault: DST }).boot();
		expect(restarted.counters).toEqual({ notified: [], delivered: [], started: 0, stopped: 0, scans: 0 });
		expect(restarted.spaces!.list()).toHaveLength(3);
		// Negative control: without the restore marker the same file would have published the unsent results.
		const stripped = dst.reboot();
		const state = json<Record<string, unknown>>(stripped, automationRuntimePath(DST.deviceId));
		delete state.restored;
		stripped.files.set(automationRuntimePath(DST.deviceId), JSON.stringify(state));
		const control = await new World(stripped, { vault: DST }).boot();
		expect(control.counters.notified.sort()).toEqual(['run-failed-unsent', 'run-pending-unsent', 'run-running']);
		await control.close();

		// Original invocation: same request -> the preserved receipt without a new execution; different request -> conflict.
		const receipt = await restarted.automations!.invokeAgent(structuredClone(request) as never);
		expect(receipt).toMatchObject({ invocationId: 'inv-1', delivery: 'started', terminalId: 'term-1' });
		const conflict = await restarted.automations!.invokeAgent({
			...structuredClone(request),
			finalPrompt: 'other',
		} as never);
		expect(conflict.errorCode).toBe('invocationConflict');
		expect(restarted.counters.started).toBe(0);
		// A notification id that was delivered (even one whose record was cleared) is never sent again.
		for (const id of ['run-cleared', 'run-done', 'run-pending'])
			await restarted.notifications!.send({ id, title: 't', body: 'b', channels: ['in-app'] });
		expect(restarted.counters.delivered).toEqual([]);
		expect(restarted.notifications!.records).toHaveLength(2);
		await restarted.close();
	});

	test('repeating the same import is a no-op and other devices are archived only when asked', async () => {
		const { text } = await exported({ otherDevice: true });
		const { pkg } = await inspectPackage(text);
		const dst = new ListStorage();
		const target = await new World(dst, { vault: DST, automationsExecute: false }).boot();
		await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(dst.files.has(`.huhu/terminal-agent/${'dev-c'}/history.json`)).toBe(false);
		const after = new Map(dst.files);
		const again = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(again.status).toBe('unchanged');
		expect([...dst.files]).toEqual([...after]);
		const archived = await runImport(pkg, { adoptDevice: SRC.deviceId, includeDevices: ['dev-c'] }, envOf(target));
		expect(archived.status).toBe('done');
		expect(dst.files.get('.huhu/terminal-agent/dev-c/history.json')).toContain('other device');
		expect(JSON.parse(dst.files.get(notificationInboxPath('dev-c'))!).receipts.z).toEqual({ 'in-app': 'sent' });
	});
});

describe('modules that are switched off', () => {
	test('automations and notifications off at the source: read offline, activity shown as history, nothing starts', async () => {
		const { pkg, text } = await exported({}, { automations: false, notifications: false });
		const offline = pkg.manifest.entries.filter(
			(e) => e.section === 'automation-runtime' || e.section === 'notifications-inbox',
		);
		expect(offline.map((e) => e.via)).toEqual(['offline', 'offline']);
		// The raw running run is still `running` in the source file: the package keeps the source fact verbatim.
		const raw = JSON.parse(pkg.payload[pkg.manifest.entries.find((e) => e.section === 'automation-runtime')!.id]!);
		expect(raw.runs.map((r: { status: string }) => r.status)).toEqual([
			'succeeded',
			'pending',
			'running',
			'failed',
		]);

		// The target has those modules off as well: the files are replaced offline, then read when the module starts.
		const dst = new ListStorage();
		const target = await new World(dst, {
			vault: DST,
			modules: { automations: false, notifications: false },
		}).boot();
		const parsed = (await inspectPackage(text)).pkg;
		const outcome = await runImport(parsed, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(outcome.status).toBe('done');
		const runtime = json<{
			runs: Array<{ id: string; status: string; endedAt?: number }>;
			restored: Record<string, { from?: string }>;
		}>(dst, automationRuntimePath(DST.deviceId));
		expect(runtime.runs.map((r) => [r.id, r.status])).toEqual([
			['run-done', 'succeeded'],
			['run-pending-unsent', 'interrupted'],
			['run-running', 'interrupted'],
			['run-failed-unsent', 'failed'],
		]);
		expect(runtime.restored['run-running']).toEqual({ at: parsed.createdAt, from: 'running' });
		expect(runtime.restored['run-pending-unsent']!.from).toBe('pending');
		await target.close();

		// Switching the modules on later starts nothing from the imported history.
		const later = await new World(dst.reboot(), { vault: DST }).boot();
		expect(later.counters).toEqual({ notified: [], delivered: [], started: 0, stopped: 0, scans: 0 });
		expect(
			later.automations!.state.runs.filter((r) => ['pending', 'running', 'unknown'].includes(r.status)),
		).toEqual([]);
		await later.close();
	});
});

describe('retention', () => {
	test('an import keeps every run the package holds; only the normal commit later applies the usual limit', async () => {
		const src = new ListStorage();
		seedSource(src);
		const many = Array.from({ length: 150 }, (_, i) => ({
			...JSON.parse(JSON.stringify(RUNS[0])),
			id: `old-${i}`,
			notificationAttempted: true,
		}));
		src.files.set(
			automationRuntimePath(SRC.deviceId),
			JSON.stringify({ definitions: [], runs: many, cursors: {} }),
		);
		const source = await new World(src, {
			vault: SRC,
			automationsExecute: false,
			modules: { automations: false },
		}).boot();
		const { text } = await exportBackup(envOf(source));
		const dst = new ListStorage();
		const target = await new World(dst, { vault: DST, automationsExecute: false }).boot();
		await runImport((await inspectPackage(text)).pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(json<{ runs: unknown[] }>(dst, automationRuntimePath(DST.deviceId)).runs).toHaveLength(150);
		expect(target.automations!.state.runs).toHaveLength(150);
		await source.close();
		await target.close();
	});
});


describe('untrusted portable settings', () => {
	test('a valid package cannot replace machine permissions, paths or nested executable configuration', async () => {
		const storage = new ListStorage();
		const machine = {
			customShellPath: '/mine/shell', shellArgs: '--mine', skillDirectories: ['/mine/skills'],
			overrides: { codex: { command: '/mine/codex', env: { TOKEN: 'mine' } } },
			agents: { globalPermissionMode: 'manual', yoloAcknowledged: true,
				agents: { codex: { permissionMode: 'manual', cliPath: '/mine/codex', env: { TOKEN: 'mine' } } } },
		};
		storage.files.set(settingsDeviceFile(DST.deviceId), JSON.stringify({ version: 1, namespaces: { agent: machine } }));
		const target = await new World(storage, { vault: DST, modules: { agent: false, automations: false, notifications: false } }).boot();
		try {
			const pkg = await buildPackage({ createdAt: 1, exclusions: [], notes: [], source: { vaultName: 'source', device: SRC.deviceId, devices: [SRC.deviceId] },
				entries: [{ section: 'settings-agent', device: SRC.deviceId, via: 'offline', text: JSON.stringify({ agent: {
					fontSize: 19, customShellPath: '/untrusted/shell', shellArgs: '--untrusted', skillDirectories: ['/untrusted/skills'],
					overrides: { codex: { command: '/untrusted/codex', env: { TOKEN: 'untrusted' } } },
					enabled: { codex: { env: { TOKEN: 'untrusted' } } }, accounts: { codex: [{ env: 'untrusted' }] },
					agents: { yoloAcknowledged: false, agents: { codex: { permissionMode: 'manual', cliPath: '/untrusted/codex', env: { TOKEN: 'untrusted' }, accountId: { env: 'untrusted' } } } },
				} }) }] });
			const inspected = await inspectPackage(serializePackage(pkg));
			await runImport(inspected.pkg, { adoptDevice: SRC.deviceId }, envOf(target));
			const saved = json<{ namespaces: { agent: Record<string, unknown> } }>(storage, settingsDeviceFile(DST.deviceId)).namespaces.agent;
			expect(saved).toMatchObject({ ...machine, fontSize: 19 });
			expect(JSON.stringify(saved)).not.toContain('untrusted');
		} finally { await target.close(); }
	});
});

describe('complete source snapshots', () => {
	test('a backup-only workbench loaded by the real Space owner is carried to the destination', async () => {
		const storage = new ListStorage();
		seedSource(storage);
		const path = agentWorkbenchPath(SRC.deviceId);
		storage.files.set(`${path}.backup`, storage.files.get(path)!);
		storage.files.delete(path);
		const source = await new World(storage, { vault: SRC, automationsExecute: false }).boot();
		const destination = new ListStorage();
		const target = await new World(destination, { vault: DST, automationsExecute: false }).boot();
		try {
			expect(source.spaces!.list().map((space) => space.id)).toContain('space-1');
			const { text } = await exportBackup(envOf(source));
			const { pkg } = await inspectPackage(text);
			expect(pkg.manifest.entries.some((entry) => entry.section === 'workbench-records')).toBe(true);
			await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
			expect(target.spaces!.list().map((space) => space.id)).toContain('space-1');
		} finally { await source.close(); await target.close(); }
	});
});

test.each(['device', 'missing-section', 'definition'] as const)('export rejects an external writer adding a %s during the snapshot', async (kind) => {
	const storage = new ListStorage();
	seedSource(storage);
	const source = await new World(storage, { vault: SRC, modules: { automations: false, notifications: false } }).boot();
	if (kind === 'missing-section') storage.files.delete(automationRuntimePath(SRC.deviceId));
	let changed = false;
	storage.onRead = (path) => {
		const trigger = kind === 'definition' ? path.endsWith('/操作.md') : kind === 'missing-section' ? path.endsWith('/inbox.json') : path.endsWith('/history.json');
		if (!trigger || changed) return;
		changed = true;
		if (kind === 'device') storage.files.set('.huhu/terminal-agent/new-device/history.json', '{}');
		if (kind === 'missing-section') storage.files.set(automationRuntimePath(SRC.deviceId), JSON.stringify({ definitions: [], runs: [], cursors: {} }));
		if (kind === 'definition') storage.files.set(`${definitionFolder('Late', 'auto-12345678')}/操作.md`, definitionDocument('auto-12345678', 'Late', SRC.deviceId));
	};
	try { await expect(exportBackup(envOf(source))).rejects.toMatchObject({ code: 'source-drift' }); }
	finally { storage.onRead = undefined; await source.close(); }
});


test('backup actions propagate cancellation to an admitted export and cannot save a late package', async () => {
	const storage = new ListStorage();
	const source = await new World(storage, { vault: SRC, modules: { agent: false, automations: false, notifications: false } }).boot();
	let enter!: () => void, finish!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const barrier = new Promise<void>((resolve) => { finish = resolve; });
	let released = false;
	source.host.register({ id: 'slow', owns: () => false, preflight: async () => ({ busy: [] }), quiesce: async () => {},
		drain: async () => { enter(); await barrier; }, adopt: async () => { throw new Error('must not adopt'); }, release: async () => { released = true; } });
	const actions = createBackupActions(envOf(source));
	const abort = new AbortController();
	const exporting = actions.exportPackage(abort.signal);
	await ready;
	try {
		abort.abort();
		await expect(exporting).rejects.toMatchObject({ code: 'cancelled' });
		await vi.waitFor(() => expect(released).toBe(true));
		await expect(actions.exportPackage()).rejects.toMatchObject({ code: 'recovery-pending' });
		expect([...storage.files.keys()].some((path) => path.startsWith('.huhu/exports/'))).toBe(false);
	} finally { finish(); await source.close(); }
});

test('restoring duplicate native ids from distinct source devices preserves both complete references', async () => {
	const storage = new ListStorage();
	seedSource(storage);
	const records = json<WorkbenchRecords>(storage, agentWorkbenchPath(SRC.deviceId));
	const original = records.sessions['ses-1']!;
	records.sessions['ses-other-device'] = { ...original, id: 'ses-other-device',
		nativeImport: { ...original.nativeImport!, deviceId: 'dev-c' } };
	storage.files.set(agentWorkbenchPath(SRC.deviceId), JSON.stringify(records));
	const source = await new World(storage, { vault: SRC, automationsExecute: false }).boot();
	const target = await new World(new ListStorage(), { vault: DST, automationsExecute: false }).boot();
	try {
		const { text } = await exportBackup(envOf(source));
		await runImport((await inspectPackage(text)).pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		const restored = json<WorkbenchRecords>(target.storage, agentWorkbenchPath(DST.deviceId));
		expect(restored.sessions['ses-1']!.nativeImport).toEqual(original.nativeImport);
		expect(restored.sessions['ses-other-device']!.nativeImport).toEqual({ ...original.nativeImport!, deviceId: 'dev-c' });
		expect(Object.keys(restored.sessions)).toContain('ses-other-device');
	} finally { await source.close(); await target.close(); }
});

test('an offline settings device represented only by its backup is enumerated and exported', async () => {
	const storage = new ListStorage();
	storage.files.set(`${settingsDeviceFile('dev-extra')}.backup`, JSON.stringify({ version: 1, namespaces: { agent: { fontSize: 23 } } }));
	const source = await new World(storage, { vault: SRC, modules: { agent: false, automations: false, notifications: false } }).boot();
	try {
		const { pkg } = await exportBackup(envOf(source));
		expect(pkg.source.devices).toContain('dev-extra');
		const entry = pkg.manifest.entries.find((item) => item.section === 'settings-agent' && item.device === 'dev-extra')!;
		expect(entry.via).toBe('offline');
		expect(JSON.parse(pkg.payload[entry.id]!)).toEqual({ agent: { fontSize: 23 } });
	} finally { await source.close(); }
});

test('a valid package with prototype-shaped dictionary keys cannot mutate prototypes during preflight or import', async () => {
	const storage = new ListStorage();
	storage.files.set(settingsDeviceFile(DST.deviceId), JSON.stringify({ version: 1, namespaces: { agent: { customShellPath: '/mine/shell', fontSize: 14 } } }));
	const target = await new World(storage, { vault: DST, modules: { agent: false, automations: false, notifications: false } }).boot();
	const keys = ['enabled', 'permissionMode', 'accountId'];
	const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(Object.prototype, key));
	const prototype = Object.getPrototypeOf({}) as object;
	const unchanged = () => {
		keys.forEach((key, i) => expect(Object.getOwnPropertyDescriptor(Object.prototype, key)).toEqual(descriptors[i]));
		expect(Object.getPrototypeOf({})).toBe(prototype);
	};
	try {
		const source = JSON.parse('{"fontSize":18,"enabled":{"__proto__":true,"constructor":false,"prototype":true,"codex":false},"usageAnalytics":{"__proto__":false,"constructor":true,"codex":false},"accounts":{"__proto__":["reserved"],"constructor":["reserved"],"prototype":["reserved"],"codex":["acct-Z"]},"accountLabels":{"__proto__":{"constructor":"reserved"},"codex":{"__proto__":"safe label","constructor":"Constructor account","prototype":"Prototype account","acct-Z":"Z"}},"agents":{"globalPermissionMode":"manual","agents":{"__proto__":{"enabled":true,"permissionMode":"manual","accountId":"polluted"},"constructor":{"enabled":false,"permissionMode":"manual","accountId":"constructor-account"},"prototype":{"enabled":true,"permissionMode":"manual","accountId":"prototype-account"},"codex":{"enabled":true,"permissionMode":"inherit","accountId":"acct-Z"}}}}');
		const pkg = await buildPackage({ createdAt: 1, exclusions: [], notes: [], source: { vaultName: 'source', device: SRC.deviceId, devices: [SRC.deviceId] },
			entries: [{ section: 'settings-agent', device: SRC.deviceId, via: 'offline', text: JSON.stringify({ agent: source }) }] });
		const inspected = await inspectPackage(serializePackage(pkg));
		const before = structuredClone(target.agent.get()), mutations = storage.mutations;
		expect((await preflightImport(inspected.pkg, { adoptDevice: SRC.deviceId }, envOf(target))).problems).toEqual([]);
		unchanged();
		expect(target.agent.get()).toEqual(before);
		expect(storage.mutations).toBe(mutations);
		await runImport(inspected.pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		unchanged();
		expect(target.agent.get()).toMatchObject({ customShellPath: '/mine/shell', fontSize: 18,
			enabled: { codex: false }, accounts: { codex: ['acct-Z'] }, agents: { agents: { codex: { accountId: 'acct-Z', permissionMode: 'inherit' } } } });
		const labels = (target.agent.get() as { accountLabels: { codex: Record<string, string> } }).accountLabels.codex;
		expect(Object.hasOwn(labels, '__proto__')).toBe(true);
		expect(labels.constructor).toBe('Constructor account');
	} finally {
		keys.forEach((key, i) => { const previous = descriptors[i]; if (previous) Object.defineProperty(Object.prototype, key, previous); else Reflect.deleteProperty(Object.prototype, key); });
		await target.close();
	}
});

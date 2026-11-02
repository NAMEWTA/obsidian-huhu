import { describe, expect, test, vi } from 'vitest';
import { serializePackage, type BackupPackage } from '../../src/modules/agent/core/backup/format';
import { BackupError } from '../../src/modules/agent/core/backup/model';
import { exportBackup, saveExport } from '../../src/modules/agent/services/backup/export';
import {
	inspectPackage,
	preflightImport,
	readImportReport,
	runImport,
} from '../../src/modules/agent/services/backup/import';
import { checkAutomationDocument } from '../../src/modules/automations/api';
import { emptyRecords } from '../../src/modules/agent/services/spaces/records';
import { openTab } from '../../src/modules/agent/core/workspace/ops';
import { planImport } from '../../src/modules/agent/services/backup/plan';
import { recoverPending } from '../../src/shared/storage/recovery-transaction';
import { automationRuntimePath } from '../../src/modules/automations/api';
import { notificationInboxPath } from '../../src/modules/notifications/api';
import { agentWorkbenchPath } from '../../src/shared/storage/vault-layout';
import { DST, SRC, definitionDocument, definitionFolder, seedSource } from './fixtures';
import { envOf } from './roundtrip.test';
import { ListStorage, World, settingsDeviceFile } from './world';

async function makePackage(
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
/** Business files only: the recovery area legitimately gains copies, a journal and the last report. */
const snapshot = (storage: ListStorage) =>
	JSON.stringify([...storage.files].filter(([path]) => !path.startsWith('.huhu/recovery/')).sort());
const rejects = async (promise: Promise<unknown>, code: string, detail?: Record<string, unknown>) => {
	const error = await promise.then(
		() => undefined,
		(e: unknown) => e,
	);
	expect(error, `expected ${code}`).toBeInstanceOf(BackupError);
	expect((error as BackupError).code).toBe(code);
	if (detail) expect((error as BackupError).detail).toMatchObject(detail);
	return error as BackupError;
};

async function freshTarget(options: ConstructorParameters<typeof World>[1] extends infer T ? Partial<T> : never = {}) {
	const dst = new ListStorage();
	const target = await new World(dst, { vault: DST, automationsExecute: false, ...options }).boot();
	return { dst, target };
}
/** A target whose settings were saved once, so the settings store has nothing of its own left to write. */
async function settledTarget() {
	const made = await freshTarget();
	await made.target.agent.update(
		(draft) => {
			(draft as { fontSize: number }).fontSize = 14;
		},
		{ persist: 'immediate' },
	);
	return made;
}

describe('hostile or damaged packages are refused before any data is touched', () => {
	const mutate = (text: string, edit: (pkg: Record<string, any>) => void) => {
		const pkg = JSON.parse(text) as Record<string, any>;
		edit(pkg);
		return JSON.stringify(pkg);
	};
	test.each([
		['not json', (t: string) => t.slice(0, 40), 'not-json'],
		['another file type', (t: string) => mutate(t, (p) => (p.format = 'something-else')), 'wrong-format'],
		['unsupported version', (t: string) => mutate(t, (p) => (p.version = 2)), 'unsupported-version'],
		[
			'changed payload',
			(t: string) => mutate(t, (p) => (p.payload.e2 = p.payload.e2 + ' ')),
			'entry-digest-mismatch',
		],
		['changed manifest', (t: string) => mutate(t, (p) => (p.createdAt = 1)), 'digest-mismatch'],
		['unlisted payload', (t: string) => mutate(t, (p) => (p.payload.e999 = '{}')), 'invalid-structure'],
		['path as device', (t: string) => mutate(t, (p) => (p.source.device = '../../etc')), 'invalid-structure'],
		[
			'traversal device in an entry',
			(t: string) => mutate(t, (p) => (p.manifest.entries[0].device = 'a/../b')),
			'invalid-structure',
		],
		[
			'unknown section',
			(t: string) => mutate(t, (p) => (p.manifest.entries[0].section = 'shell-history')),
			'invalid-structure',
		],
		[
			'duplicate identity',
			(t: string) => mutate(t, (p) => (p.manifest.entries[1] = { ...p.manifest.entries[0], id: 'e1' })),
			'duplicate-identity',
		],
	])('%s', async (_name, damage, code) => {
		const { text } = await makePackage();
		const { dst, target } = await freshTarget();
		const before = snapshot(dst);
		const mutations = dst.mutations;
		await rejects(inspectPackage(damage(text)), 'package-invalid', { packageCode: code });
		expect(snapshot(dst)).toBe(before);
		expect(dst.mutations).toBe(mutations);
		await target.close();
	});

	test('a duplicate identity that keeps a valid digest is still refused', async () => {
		const { pkg } = await makePackage();
		const entries = [...pkg.manifest.entries, { ...pkg.manifest.entries[0]!, id: 'e90' }];
		const copy = {
			...pkg,
			manifest: { ...pkg.manifest, entries },
			payload: { ...pkg.payload, e90: pkg.payload.e0! },
		};
		await rejects(inspectPackage(JSON.stringify(copy)), 'package-invalid');
	});
});

describe('preflight refuses conflicts without touching valid data', () => {
	test('different content at an existing identity is a collision; nothing is merged or overwritten', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		// This device already has its own business data.
		dst.files.set(
			notificationInboxPath(DST.deviceId),
			JSON.stringify({ records: [], receipts: { mine: { 'in-app': 'sent' } } }),
		);
		await target.notifications!.load();
		const before = snapshot(dst);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems).toContainEqual({
			code: 'identity-collision',
			section: 'notifications-inbox',
			device: SRC.deviceId,
			subject: notificationInboxPath(DST.deviceId),
		});
		const error = await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'preflight-failed');
		expect(JSON.stringify(error.detail)).toContain('identity-collision');
		expect(snapshot(dst)).toBe(before);
		// The user can leave that collection out and import the rest.
		const rest = await runImport(
			pkg,
			{ adoptDevice: SRC.deviceId, skipSections: ['notifications-inbox'] },
			envOf(target),
		);
		expect(rest.status).toBe('done');
		expect(dst.files.get(notificationInboxPath(DST.deviceId))).toContain('"mine"');
		await target.close();
	});

	test('a definition with the same id but different content is a collision', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		const folder = definitionFolder('Renamed', 'auto-00000000');
		dst.files.set(`${folder}/操作.md`, definitionDocument('auto-00000000', 'Renamed', DST.deviceId));
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.map((p) => p.code)).toContain('definition-collision');
		await target.close();
	});

	test('the source device must be chosen when this device is not in the package', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		const view = await preflightImport(pkg, {}, envOf(target));
		expect(view.problems.map((p) => p.code)).toEqual(['adopt-device-required']);
		await rejects(runImport(pkg, {}, envOf(target)), 'preflight-failed');
		expect([...dst.files.keys()].some((k) => k.includes('workbench-v2'))).toBe(false);
		await target.close();
	});

	test('a Space directory that is missing here, or no longer authorized, refuses; archiving it is an explicit choice', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget({ dirs: new Set() });
		const before = snapshot(dst);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.filter((p) => p.code === 'directory-missing')).toHaveLength(2);
		await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'preflight-failed');
		expect(snapshot(dst)).toBe(before);
		const archived = await runImport(
			pkg,
			{ adoptDevice: SRC.deviceId, archiveMissingDirectories: true },
			envOf(target),
		);
		expect(archived.status).toBe('done');
		const records = JSON.parse(dst.files.get(agentWorkbenchPath(DST.deviceId))!);
		expect(records.spaces['space-1'].archived).toBe(true);
		expect(records.spaces['space-3'].archived).toBe(false);
		await target.close();
	});

	test('records need the desktop Space owner; without it that section is refused, not guessed', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target, { target: undefined }));
		expect(view.problems.map((p) => p.code)).toEqual(['records-needs-desktop']);
		expect(dst.files.has(agentWorkbenchPath(DST.deviceId))).toBe(false);
		await target.close();
	});

	test('a malicious definition cannot choose its own path or id', async () => {
		const { pkg } = await makePackage();
		const evil = definitionDocument('auto-evil0001', '../../../.obsidian/evil', SRC.deviceId);
		const text = serializePackage({ ...pkg } as BackupPackage);
		const parsed = JSON.parse(text);
		const entry = parsed.manifest.entries.find((e: { section: string }) => e.section === 'automation-definition');
		parsed.payload[entry.id] = evil;
		// Re-sign the way a hostile producer would (the digest only proves integrity, not safety).
		const { buildPackage } = await import('../../src/modules/agent/core/backup/format');
		const forged = await buildPackage({
			createdAt: 1,
			source: parsed.source,
			notes: [],
			exclusions: [],
			entries: parsed.manifest.entries.map((e: any) => ({
				section: e.section,
				device: e.device,
				text: parsed.payload[e.id],
				via: e.via,
			})),
		});
		const { dst, target } = await freshTarget();
		const view = await preflightImport(
			(await inspectPackage(serializePackage(forged))).pkg,
			{ adoptDevice: SRC.deviceId },
			envOf(target),
		);
		const paths = view.outcomes.filter((o) => o.section === 'automation-definition').map((o) => o.path);
		expect(paths.every((p) => /^\.huhu\/automation\/definitions\/[^/.][^/]*\/操作\.md$/.test(p))).toBe(true);
		expect(paths.some((p) => p.includes('..'))).toBe(false);
		expect(paths.length).toBeGreaterThan(0);
		expect(view.problems).toEqual([]);
		await target.close();
	});
});

describe('active work and live writers', () => {
	test('an active automation run makes the import BUSY: it lists the work, stops nothing and leaves every owner open', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		target.automations!.state.runs.push({
			id: 'live-1',
			automationId: 'x',
			revision: 1,
			title: 'Running now',
			scheduledFor: 1,
			trigger: 'manual',
			status: 'running',
			startedAt: 1,
			message: '',
		});
		const before = snapshot(dst);
		const error = await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'busy');
		expect(JSON.stringify(error.detail)).toContain('Running now');
		expect(snapshot(dst)).toBe(before);
		expect(target.counters.stopped).toBe(0);
		// Nothing is left closed: a normal write still works.
		await target.notifications!.send({ id: 'after-busy', title: 't', body: 'b', channels: ['in-app'] });
		expect(target.counters.delivered).toEqual(['after-busy']);
		await target.close();
	});

	test('export is BUSY too, and a source that changes during the snapshot aborts it', async () => {
		const src = new ListStorage();
		seedSource(src);
		const source = await new World(src, { vault: SRC, automationsExecute: false }).boot();
		source.automations!.state.runs.push({
			id: 'live-1',
			automationId: 'x',
			revision: 1,
			title: 'Working',
			scheduledFor: 1,
			trigger: 'manual',
			status: 'running',
			startedAt: 1,
			message: '',
		});
		await rejects(exportBackup(envOf(source)), 'busy');
		source.automations!.state.runs.pop();
		// Another process edits the notifications file between the first and the second read.
		let reads = 0;
		const inbox = notificationInboxPath(SRC.deviceId);
		src.onRead = (path) => {
			if (path === inbox && ++reads === 2)
				src.files.set(inbox, JSON.stringify({ records: [], receipts: { late: { 'in-app': 'sent' } } }));
		};
		await rejects(exportBackup(envOf(source)), 'source-drift');
		src.onRead = undefined;
		await exportBackup(envOf(source));
		await source.close();
	});

	test('a notification being delivered makes the export BUSY; once it settled the receipt and the run are in one snapshot', async () => {
		const src = new ListStorage();
		seedSource(src);
		const source = await new World(src, { vault: SRC, automationsExecute: false }).boot();
		let finish!: () => void;
		source.deliveryGate = new Promise<void>((resolve) => (finish = resolve));
		const sending = source.notifications!.send({ id: 'run-new', title: 't', body: 'b', channels: ['in-app'] });
		await vi.waitFor(() => expect(source.notifications!.busyWork()).toEqual(['notifications:1']));
		const error = await rejects(exportBackup(envOf(source)), 'busy');
		expect(JSON.stringify(error.detail)).toContain('notifications:1');
		finish();
		await sending;
		const { pkg } = await exportBackup(envOf(source));
		const inbox = pkg.manifest.entries.find(
			(e) => e.section === 'notifications-inbox' && e.device === SRC.deviceId,
		)!;
		expect(JSON.parse(pkg.payload[inbox.id]!).receipts['run-new']).toEqual({ 'in-app': 'sent' });
		await source.close();
	});

	test('a collection that exists but is unreadable fails the export; it is never exported as empty', async () => {
		const src = new ListStorage();
		seedSource(src);
		src.files.set(automationRuntimePath(SRC.deviceId), '{"runs": [');
		const source = await new World(src, {
			vault: SRC,
			automationsExecute: false,
			modules: { automations: false },
		}).boot();
		await rejects(exportBackup(envOf(source)), 'source-invalid', { section: 'automation-runtime' });
		src.files.set(automationRuntimePath(SRC.deviceId), JSON.stringify({ definitions: 'x', runs: [], cursors: {} }));
		await rejects(exportBackup(envOf(source)), 'source-invalid', { section: 'automation-runtime' });
		await source.close();
	});
});

describe('failures during the replacement', () => {
	test('a disk that refuses a write rolls everything back; the same import then succeeds', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		const before = snapshot(dst);
		const runtime = automationRuntimePath(DST.deviceId);
		dst.failWrite = (path) => path === runtime;
		// The definitions step finished first; the core step (last) fails and rolls back.
		const failure = await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'partial-import', {
			failure: 'write-failed',
		});
		expect(failure.detail).toBeDefined();
		dst.failWrite = undefined;
		// Everything the failed step touched is back to its previous bytes (definitions of the finished step stay).
		const business = (storage: ListStorage) =>
			[...storage.files].filter(
				([path]) =>
					!path.startsWith('.huhu/recovery/') &&
					!path.startsWith('.huhu/config/') &&
					!path.startsWith('.huhu/automation/definitions/'),
			);
		expect(JSON.stringify(business(dst).sort())).toBe(
			JSON.stringify(
				(JSON.parse(before) as Array<[string, string]>).filter(
					([p]) => !p.startsWith('.huhu/config/') && !p.startsWith('.huhu/automation/definitions/'),
				),
			),
		);
		expect((await readImportReport(envOf(target)))?.status).toBe('partial');
		// Owners are open again and the retry works.
		const retry = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(retry.status).toBe('done');
		expect(dst.files.get(runtime)).toBeDefined();
		expect((await readImportReport(envOf(target)))?.status).toBe('done');
		await target.close();
	});

	test('a file another process changed after the preflight is a refusal, not an overwrite', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		const racing = {
			...envOf(target),
			recovery: {
				storage: target.host.storage,
				register: target.host.register.bind(target.host),
				has: target.host.has.bind(target.host),
				settled: target.host.settled.bind(target.host),
				run: (options: Parameters<typeof target.host.run>[0]) => {
					dst.files.set(
						notificationInboxPath(DST.deviceId),
						JSON.stringify({ records: [], receipts: { theirs: { 'in-app': 'sent' } } }),
					);
					return target.host.run(options);
				},
			},
		};
		await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, racing), 'partial-import', {
			failure: 'preflight-failed',
		});
		expect(dst.files.get(notificationInboxPath(DST.deviceId))).toContain('theirs');
		expect(dst.files.has(agentWorkbenchPath(DST.deviceId))).toBe(false);
		await target.close();
	});

	test('power loss at every step: after restart the vault is all old or all new, and the import can be repeated', async () => {
		const { pkg } = await makePackage();
		const probe = await settledTarget();
		const start = probe.dst.mutations;
		await runImport(
			pkg,
			{ adoptDevice: SRC.deviceId, skipSections: ['automation-definition'] },
			envOf(probe.target),
		);
		const total = probe.dst.mutations - start;
		expect(total).toBeGreaterThan(10);
		// Imported markers: present only when the new generation of that file is on disk.
		const markers: Array<[string, string]> = [
			[agentWorkbenchPath(DST.deviceId), 'space-3'],
			[automationRuntimePath(DST.deviceId), 'run-done'],
			[notificationInboxPath(DST.deviceId), 'run-cleared'],
			[`.huhu/terminal-agent/${DST.deviceId}/history.json`, 'Annotated A'],
		];
		const outcomes = new Set<string>();
		for (const torn of [false, true]) {
			for (let at = 1; at <= total; at++) {
				const { dst, target } = await settledTarget();
				const baseline = new Map(dst.files);
				dst.crashAt = dst.mutations + at;
				dst.torn = torn;
				await runImport(
					pkg,
					{ adoptDevice: SRC.deviceId, skipSections: ['automation-definition'] },
					envOf(target),
				).catch(() => undefined);
				const restarted = dst.reboot();
				await recoverPending(restarted);
				const present = markers.map(([path, marker]) => restarted.files.get(path)?.includes(marker) ?? false);
				const label = `step ${at} torn=${torn}`;
				expect(present.every(Boolean) || present.every((v) => !v), label).toBe(true);
				outcomes.add(present[0] ? 'new' : 'old');
				if (!present[0])
					for (const [path, text] of baseline)
						if (!path.startsWith('.huhu/config/'))
							expect(restarted.files.get(path), `${label} ${path}`).toBe(text);
				// A restarted process can finish the import.
				const second = await new World(restarted, { vault: DST, automationsExecute: false }).boot();
				const again = await runImport(
					pkg,
					{ adoptDevice: SRC.deviceId, skipSections: ['automation-definition'] },
					envOf(second),
				);
				expect(['done', 'unchanged'], label).toContain(again.status);
				await second.close();
			}
		}
		expect([...outcomes].sort()).toEqual(['new', 'old']);
	});
});

describe('large definition sets run as an ordered plan that can resume', () => {
	test('130 definitions need several transactions; a failure in the second leaves the first done and a retry finishes', async () => {
		const { pkg } = await makePackage({ documents: 130 });
		const { dst, target } = await freshTarget();
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.batches).toBe(1 + Math.ceil(130 / 48));
		// The 49th..96th documents (second chunk) fail to write.
		const folderOf = (i: number) =>
			definitionFolder(i === 0 ? 'Daily-review' : `Doc-${i}`, `auto-${String(i).padStart(8, '0')}`);
		const sorted = Array.from({ length: 130 }, (_, i) => `${folderOf(i)}/操作.md`).sort();
		const doomed = sorted[60]!;
		dst.failWrite = (path) => path === doomed;
		const error = await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'partial-import', {
			done: 1,
			total: 4,
		});
		expect(error.detail.failure).toBe('write-failed');
		expect(dst.files.has(doomed)).toBe(false);
		const written = sorted.filter((p) => dst.files.has(p)).length;
		expect(written).toBe(48);
		const report = await readImportReport(envOf(target));
		expect(report).toMatchObject({ status: 'partial', errorCode: 'write-failed' });
		expect(report!.batches.map((b) => b.status)).toEqual(['done', 'pending', 'pending', 'pending']);
		// Retry: finished steps are found unchanged, the rest completes; nothing is dropped.
		dst.failWrite = undefined;
		const retry = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(retry.status).toBe('done');
		expect(sorted.filter((p) => dst.files.has(p))).toHaveLength(130);
		await target.close();
	});
});

describe('resuming a partial import (durable progress)', () => {
	const docPath = (i: number) =>
		`${definitionFolder(i === 0 ? 'Daily-review' : `Doc-${i}`, `auto-${String(i).padStart(8, '0')}`)}/操作.md`;

	/** Core step fails once; the definition steps before it are committed. */
	async function partial() {
		const { pkg } = await makePackage({ documents: 60 });
		const { dst, target } = await freshTarget();
		const runtime = automationRuntimePath(DST.deviceId);
		dst.failWrite = (path) => path === runtime;
		await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'partial-import', {
			failure: 'write-failed',
		});
		dst.failWrite = undefined;
		return { pkg, dst, target };
	}

	test('a live edit of a file a finished step wrote, and a restart, do not stop the retry', async () => {
		const { pkg, dst, target } = await partial();
		expect(JSON.parse(dst.files.get('.huhu/recovery/backup-import/progress.json')!)).toMatchObject({
			packageDigest: pkg.digest,
			steps: [{ key: 'defs-0' }, { key: 'defs-1' }],
		});
		const edited = `${dst.files.get(docPath(3))!}\nEdited by the user\n`;
		dst.files.set(docPath(3), edited);
		await target.close();
		const restarted = await new World(dst.reboot(), { vault: DST, automationsExecute: false }).boot();
		const retry = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(restarted));
		expect(retry.status).toBe('done');
		expect(dst.files.get(docPath(3))).toBe(edited);
		expect(dst.files.get(automationRuntimePath(DST.deviceId))).toContain('run-done');
		expect(dst.files.has('.huhu/recovery/backup-import/progress.json')).toBe(false);
		expect((await readImportReport(envOf(restarted)))?.status).toBe('done');
		await restarted.close();
	});

	test('within one run, a live write to an already committed file does not abort the later steps', async () => {
		const { pkg } = await makePackage({ documents: 60 });
		const { dst, target } = await freshTarget();
		let steps = 0;
		const live = {
			...envOf(target),
			recovery: {
				storage: target.host.storage,
				register: target.host.register.bind(target.host),
				has: target.host.has.bind(target.host),
				settled: target.host.settled.bind(target.host),
				run: async (options: Parameters<typeof target.host.run>[0]) => {
					// After the first definitions step is committed, something else writes to it.
					if (++steps === 2) dst.files.set(docPath(1), `${dst.files.get(docPath(1))!}\nlive edit\n`);
					return target.host.run(options);
				},
			},
		};
		const result = await runImport(pkg, { adoptDevice: SRC.deviceId }, live);
		expect(result.status).toBe('done');
		expect(dst.files.get(docPath(1))).toContain('live edit');
		expect(dst.files.get(agentWorkbenchPath(DST.deviceId))).toContain('space-3');
		await target.close();
	});

	test('the final report of a resumed import keeps the full re-enable and re-authorize lists of the first run (N1)', async () => {
		const { pkg, dst, target } = await partial();
		const first = (await readImportReport(envOf(target)))!;
		expect(first.status).toBe('partial');
		expect(first.disabledAutomations).toHaveLength(30);
		expect(first.reauthorize.map((r) => r.name)).toEqual(['External']);
		await target.close();
		const restarted = await new World(dst.reboot(), { vault: DST, automationsExecute: false }).boot();
		// The resume skips all 60 finished definitions, so it could not rebuild the list itself.
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(restarted));
		expect(view.disabledAutomations).toHaveLength(30);
		expect(view.reauthorize).toHaveLength(1);
		const done = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(restarted));
		expect(done.status).toBe('done');
		expect(done.report.disabledAutomations).toHaveLength(30);
		expect(done.report.reauthorize.map((r) => r.name)).toEqual(['External']);
		expect(done.report.warnings.filter((w) => w.code === 'automations-disabled')).toEqual([
			{ code: 'automations-disabled', count: 30 },
		]);
		const saved = (await readImportReport(envOf(restarted)))!;
		expect(saved.status).toBe('done');
		expect(saved.disabledAutomations).toHaveLength(30);
		expect(saved.reauthorize).toHaveLength(1);
		await restarted.close();
	});

	test('a changed file of a finished step is reported and kept; a file the person removed is reported and not recreated', async () => {
		const { pkg, dst, target } = await partial();
		// Steps are chunks of the sorted paths: the first and the last document are in different steps.
		const sorted = Array.from({ length: 60 }, (_, i) => docPath(i)).sort();
		const [changed, gone] = [sorted[0]!, sorted[59]!];
		const edited = `${dst.files.get(changed)!}\nMine\n`;
		dst.files.set(changed, edited);
		dst.files.delete(gone);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.warnings).toContainEqual({ code: 'step-file-changed', subject: changed });
		const done = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(done.status).toBe('done');
		expect(done.report.warnings).toContainEqual({ code: 'step-file-changed', subject: changed });
		expect(dst.files.get(changed)).toBe(edited);
		expect(dst.files.has(gone)).toBe(false);
		expect(done.report.warnings).toContainEqual({ code: 'step-file-missing', subject: gone });
		await target.close();
	});

	test('a tampered record that claims everything is done cannot make an import report done with nothing written', async () => {
		const { pkg } = await makePackage({ documents: 3 });
		const { dst, target } = await freshTarget();
		const forged = {
			format: 1,
			packageDigest: pkg.digest,
			options: JSON.stringify([DST.deviceId, SRC.deviceId, [], [], false]),
			steps: [
				{ key: 'defs-0', written: { [docPath(1)]: 'a'.repeat(64) } },
				{ key: 'core-0', written: { [agentWorkbenchPath(DST.deviceId)]: 'b'.repeat(64) } },
			],
		};
		dst.files.set('.huhu/recovery/backup-import/progress.json', JSON.stringify(forged));
		const result = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(result.status).toBe('done');
		expect(dst.files.get(agentWorkbenchPath(DST.deviceId))).toContain('space-3');
		expect(dst.files.has(docPath(1))).toBe(true);
		await target.close();
	});

	test('progress made for another device is ignored, and the last report never stays `partial` after an unchanged retry', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		const report = JSON.parse(dst.files.get('.huhu/recovery/backup-import/last.json')!);
		dst.files.set('.huhu/recovery/backup-import/last.json', JSON.stringify({ ...report, status: 'partial' }));
		const again = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(again.status).toBe('unchanged');
		expect((await readImportReport(envOf(target)))!.status).toBe('done');
		await target.close();
	});

	/** What a crash right after the last step would leave: the progress record of a fully written import. */
	async function finishedWithRecord(documents: number) {
		const { pkg } = await makePackage({ documents });
		const { dst, target } = await freshTarget();
		await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		const { sha256 } = await import('../../src/shared/storage/recovery-transaction');
		const written = async (match: (path: string) => boolean) =>
			Object.fromEntries(
				await Promise.all(
					[...dst.files.keys()]
						.filter(match)
						.map(async (path) => [path, await sha256(dst.files.get(path)!)] as const),
				),
			);
		const defs = await written((p) => p.startsWith('.huhu/automation/definitions/'));
		const core = await written(
			(p) =>
				!p.startsWith('.huhu/recovery/') &&
				!p.startsWith('.huhu/automation/definitions/') &&
				!p.startsWith('.huhu/config/settings.json') &&
				!p.includes('.huhu/config/devices/dev-b.json.'),
		);
		const steps = [
			{ key: 'defs-0', written: defs },
			{ key: 'core-0', written: core },
		];
		const lists = (await readImportReport(envOf(target)))!;
		dst.files.set(
			'.huhu/recovery/backup-import/progress.json',
			JSON.stringify({
				format: 1,
				packageDigest: pkg.digest,
				options: JSON.stringify([DST.deviceId, SRC.deviceId, [], [], false]),
				steps,
				lists: {
					disabledAutomations: lists.disabledAutomations,
					reauthorize: lists.reauthorize,
					warnings: lists.warnings,
				},
			}),
		);
		return { pkg, dst, target, steps };
	}

	test('S1: a settings file the user changed after its step is kept (not re-merged) and a removed file is not recreated', async () => {
		const { pkg, dst, target, steps } = await finishedWithRecord(0);
		const settings = settingsDeviceFile(DST.deviceId);
		const mine = JSON.parse(dst.files.get(settings)!);
		mine.namespaces.agent.fontSize = 21;
		dst.files.set(settings, JSON.stringify(mine));
		const inboxBackup = `${notificationInboxPath(DST.deviceId)}.backup`;
		expect(Object.keys(steps[1]!.written)).toContain(settings);
		expect(Object.keys(steps[1]!.written)).toContain(inboxBackup);
		dst.files.delete(inboxBackup);
		const result = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(result.status).toBe('unchanged');
		expect(JSON.parse(dst.files.get(settings)!).namespaces.agent.fontSize).toBe(21);
		expect(dst.files.has(inboxBackup)).toBe(false);
		const codes = result.report.warnings.map((w) => [w.code, w.subject]);
		expect(codes).toContainEqual(['step-file-changed', settings]);
		expect(codes).toContainEqual(['step-file-missing', inboxBackup]);
		expect((await readImportReport(envOf(target)))!.status).toBe('done');
		await target.close();
	});

	test('S2: one imported definition deleted and another edited in the same step do not block the retry', async () => {
		const { pkg, dst, target } = await finishedWithRecord(6);
		const paths = [...dst.files.keys()].filter((p) => p.startsWith('.huhu/automation/definitions/')).sort();
		const edited = `${dst.files.get(paths[1]!)!}\nMine\n`;
		dst.files.set(paths[1]!, edited);
		dst.files.delete(paths[0]!);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems).toEqual([]);
		const result = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(['done', 'unchanged']).toContain(result.status);
		expect(dst.files.get(paths[1]!)).toBe(edited);
		expect(dst.files.has(paths[0]!)).toBe(false);
		const codes = result.report.warnings.map((w) => [w.code, w.subject]);
		expect(codes).toContainEqual(['step-file-changed', paths[1]]);
		expect(codes).toContainEqual(['step-file-missing', paths[0]]);
		await target.close();
	});

	test.each([
		['an empty step', () => ({ key: 'core-0', written: {} })],
		[
			'a step naming unrelated files',
			() => ({ key: 'core-0', written: { '.huhu/config/settings.json': 'c'.repeat(64) } }),
		],
		[
			'a step naming files that do not exist',
			() => ({ key: 'core-0', written: { '.huhu/x/none.json': 'c'.repeat(64) } }),
		],
	])('P4c: a tampered all-done record with %s still imports and saves the final report', async (_name, step) => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		dst.files.set(
			'.huhu/recovery/backup-import/progress.json',
			JSON.stringify({
				format: 1,
				packageDigest: pkg.digest,
				options: JSON.stringify([DST.deviceId, SRC.deviceId, [], [], false]),
				steps: [step(), { key: 'defs-0', written: {} }],
			}),
		);
		dst.files.set(
			'.huhu/recovery/backup-import/last.json',
			JSON.stringify({
				format: 1,
				status: 'partial',
				batches: [],
				packageDigest: 'old',
				finishedAt: 1,
				disabledAutomations: [],
				reauthorize: [],
				warnings: [],
			}),
		);
		const result = await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(result.status).toBe('done');
		expect(dst.files.get(agentWorkbenchPath(DST.deviceId))).toContain('space-3');
		const saved = (await readImportReport(envOf(target)))!;
		expect(saved).toMatchObject({ status: 'done', packageDigest: pkg.digest });
		await target.close();
	});

	test('progress that belongs to another package is not trusted: an edited document is then a real collision', async () => {
		const { pkg, dst, target } = await partial();
		dst.files.set(docPath(3), `${dst.files.get(docPath(3))!}\nEdited\n`);
		const progress = JSON.parse(dst.files.get('.huhu/recovery/backup-import/progress.json')!);
		dst.files.set(
			'.huhu/recovery/backup-import/progress.json',
			JSON.stringify({ ...progress, packageDigest: 'x' }),
		);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.map((p) => p.code)).toEqual(['definition-collision']);
		await target.close();
	});
});

describe('exported files', () => {
	test('saveExport writes a verified file in the vault and never overwrites an earlier one', async () => {
		const { text } = await makePackage();
		const storage = new ListStorage();
		const first = await saveExport(storage, text, 1_800_000_000_000);
		const second = await saveExport(storage, text, 1_800_000_000_000);
		expect(first).not.toBe(second);
		expect(storage.files.get(first)).toBe(text);
		storage.failWrite = () => true;
		await rejects(saveExport(storage, text, 1_800_000_000_001), 'write-failed');
	});
	test('settings of the importing device are untouched when the settings section is skipped', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		await runImport(pkg, { adoptDevice: SRC.deviceId, skipSections: ['settings-agent'] }, envOf(target));
		const agent = JSON.parse(dst.files.get(settingsDeviceFile(DST.deviceId))!).namespaces.agent;
		expect(agent.fontSize).toBe(14);
		expect(agent.quickCommands).toEqual([]);
		await target.close();
	});
});

describe('damaged settings on the target (T-15 N-3)', () => {
	test('planning over an unreadable device settings file replaces it whole and tells the user', async () => {
		const { pkg } = await makePackage();
		const path = settingsDeviceFile(DST.deviceId);
		const damaged = '{"version":1,"namespaces": [';
		const plan = await planImport(
			pkg,
			{ adoptDevice: SRC.deviceId, skipSections: ['workbench-records'] },
			{
				targetDevice: DST.deviceId,
				read: async (p) => (p === path ? damaged : null),
				listDefinitionFolders: async () => [],
			},
		);
		expect(plan.problems).toEqual([]);
		expect(plan.warnings.map((w) => w.code)).toContain('settings-damaged-replaced');
		const write = plan.writes.find((w) => w.path === path)!;
		const settings = JSON.parse(write.content);
		expect(Object.keys(settings.namespaces)).toEqual(['agent']);
		expect(settings.namespaces.agent.fontSize).toBe(17);
		expect(plan.outcomes.find((o) => o.path === path)!.action).toBe('merge');
	});

	test('a live settings store that finds its file damaged by someone else refuses the import and nothing is written', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await settledTarget();
		const path = settingsDeviceFile(DST.deviceId);
		dst.files.set(path, '{"version":1,"namespaces": [');
		const error = await rejects(runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target)), 'drain-failed', {
			owner: 'settings',
		});
		expect(error.code).toBe('drain-failed');
		// The damaged bytes are exactly as they were, and no business file was created.
		expect(dst.files.get(path)).toBe('{"version":1,"namespaces": [');
		expect(dst.files.has(agentWorkbenchPath(DST.deviceId))).toBe(false);
		expect(dst.files.has(notificationInboxPath(DST.deviceId))).toBe(false);
		await target.close();
	});
});

describe('definitions must be readable by the automations repository (M2)', () => {
	/** Re-signs a package after editing a payload, the way a hostile producer would (the digest proves integrity only). */
	async function forge(pkg: BackupPackage, edit: (section: string, text: string) => string) {
		const { buildPackage } = await import('../../src/modules/agent/core/backup/format');
		const forged = await buildPackage({
			createdAt: pkg.createdAt,
			source: pkg.source,
			notes: [],
			exclusions: pkg.manifest.exclusions,
			entries: pkg.manifest.entries.map((e) => ({
				section: e.section,
				device: e.device,
				text: edit(e.section, pkg.payload[e.id]!),
				via: e.via,
			})),
		});
		return (await inspectPackage(serializePackage(forged))).pkg;
	}

	test('the real codec accepts the documents the repository writes and refuses an unknown action before any write', async () => {
		const { pkg } = await makePackage();
		const { dst, target } = await freshTarget();
		expect(
			await checkAutomationDocument('x/操作.md', definitionDocument('auto-00000009', 'Fine', 'dev-a')),
		).toBeUndefined();
		const future = await forge(pkg, (section, text) =>
			section === 'automation-definition' && text.includes('Daily-review')
				? text.replace(/action: notify/, 'action: future-kind')
				: text,
		);
		const view = await preflightImport(future, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems).toContainEqual({
			code: 'section-invalid',
			section: 'automation-definition',
			device: null,
			subject: expect.stringContaining('definition:'),
		});
		const before = snapshot(dst);
		await rejects(runImport(future, { adoptDevice: SRC.deviceId }, envOf(target)), 'preflight-failed');
		expect(snapshot(dst)).toBe(before);
		await target.close();
	});

	test.each([
		['missing required fields', (t: string) => t.replace(/graceMinutes: 0\n/, '')],
		['an unreadable schedule', (t: string) => t.replace(/schedule: manual/, 'schedule: whenever')],
		['broken frontmatter', (t: string) => t.replace('---\n', '---\n: : :\n')],
	])('%s is refused', async (_name, damage) => {
		const { pkg } = await makePackage();
		const { target } = await freshTarget();
		const bad = await forge(pkg, (section, text) => (section === 'automation-definition' ? damage(text) : text));
		const view = await preflightImport(bad, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.some((p) => p.code === 'section-invalid' && p.section === 'automation-definition')).toBe(
			true,
		);
		await target.close();
	});
});

describe('what counts as data in the target (L3, L4)', () => {
	test('a Space-less web layout, a grant, a history owner or a selection is data, not an empty target', async () => {
		const { pkg } = await makePackage();
		const dst = new ListStorage();
		const records = emptyRecords(DST);
		records.sharedLayout = openTab({ version: 1, tabs: {}, groups: [], closedTabs: [] }, undefined, {
			kind: 'browser',
			id: 'tab-x',
			title: 'x',
			spaceId: 'browser-space',
			pageId: 'p',
			createdAt: 1,
		});
		dst.files.set(agentWorkbenchPath(DST.deviceId), JSON.stringify(records));
		const target = await new World(dst, { vault: DST, automationsExecute: false }).boot();
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.map((p) => [p.code, p.section])).toEqual([['identity-collision', 'workbench-records']]);
		await target.close();
	});

	test('a missing primary with a valid .backup holds data; an empty one does not; the import refreshes the sidecar', async () => {
		const { pkg } = await makePackage();
		const runtime = automationRuntimePath(DST.deviceId);
		const dst = new ListStorage();
		const target = await new World(dst, {
			vault: DST,
			automationsExecute: false,
			modules: { automations: false },
		}).boot();
		dst.files.set(
			`${runtime}.backup`,
			JSON.stringify({ definitions: [], runs: [{ id: 'mine', status: 'failed' }], cursors: {} }),
		);
		const view = await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		expect(view.problems.map((p) => [p.code, p.section])).toEqual([['identity-collision', 'automation-runtime']]);
		dst.files.set(`${runtime}.backup`, JSON.stringify({ definitions: [], runs: [], cursors: {} }));
		expect((await preflightImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target))).problems).toEqual([]);
		await runImport(pkg, { adoptDevice: SRC.deviceId }, envOf(target));
		// The store would fall back to `.backup` if the primary were damaged: it must hold the imported data, not older.
		for (const path of [
			runtime,
			notificationInboxPath(DST.deviceId),
			`.huhu/terminal-agent/${DST.deviceId}/history.json`,
		])
			expect(dst.files.get(`${path}.backup`), path).toBe(dst.files.get(path));
		expect(dst.files.get(`${agentWorkbenchPath(DST.deviceId)}.backup`)).toBe(
			dst.files.get(agentWorkbenchPath(DST.deviceId)),
		);
		await target.close();
	});
});

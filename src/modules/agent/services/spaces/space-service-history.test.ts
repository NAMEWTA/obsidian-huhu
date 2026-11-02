import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { DirectoryPort, WriterLease, WriterOwnerPort } from '../../core/space/ports';
import type { VaultBinding } from '../../core/space/model';
import { isWorkbenchRecords } from './records';
import { SpaceService } from './space-service';

const vault: VaultBinding = {
	vaultId: 'v',
	deviceId: 'd',
	rootPath: '/vault',
	root: { canonicalPath: '/vault', dev: '1', ino: '2' },
};
function fixture() {
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, text) => {
			files.set(p, text);
		},
		mkdir: async () => {},
	};
	const lease: WriterLease = {
		instanceId: 'i',
		port: 1,
		lost: new AbortController().signal,
		assertHeld: async () => {},
		close: async () => {},
	};
	const directories: DirectoryPort = {
		inspectVault: async () => vault,
		assertVault: async () => {},
		bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }),
		chooseExternalDirectory: async () => undefined,
		resolveDirectory: async () => ({ cwd: '/same-cwd' }),
	};
	const owners: WriterOwnerPort = { acquire: vi.fn(async () => lease) };
	const make = (instanceId: string) =>
		new SpaceService({ storage, directories, owners, instanceId, report: vi.fn() });
	return { make, files };
}

test('history source binding: unbound lookup, same-cwd Spaces, idempotent rebind and owner conflict', async () => {
	const f = fixture();
	const service = f.make('i');
	const a = await service.create({ name: 'A', relativePath: '' }),
		b = await service.create({ name: 'B', relativePath: '' });
	expect(service.historySpaceFor('ref')).toBeUndefined();
	expect(service.historySpaceFor('')).toBeUndefined();
	await service.bindHistorySource('ref', a.id);
	// Both Spaces resolve to the same cwd; ownership must stay with the explicit binding.
	expect(service.historySpaceFor('ref')).toBe(a.id);
	expect(service.historySpaceFor('other')).toBeUndefined();
	await service.bindHistorySource('ref', a.id);
	await expect(service.bindHistorySource('ref', b.id)).rejects.toThrow('OWNER_CONFLICT:history-source-owned');
	expect(service.historySpaceFor('ref')).toBe(a.id);
	await expect(service.bindHistorySource('x', 'missing')).rejects.toThrow('TARGET_NOT_FOUND');
	await expect(service.bindHistorySource(' ', a.id)).rejects.toThrow('INVALID_ARGUMENT');
	await service.dispose();
});

test('history owners persist across restart and reject dangling Space references', async () => {
	const f = fixture();
	const first = f.make('i');
	const a = await first.create({ name: 'A', relativePath: '' });
	await first.bindHistorySource('ref', a.id);
	await first.dispose();
	const second = f.make('second');
	await second.ready;
	expect(second.historySpaceFor('ref')).toBe(a.id);
	const records = structuredClone(second.store.getState().records);
	expect(isWorkbenchRecords(records)).toBe(true);
	records.historyOwners = { ref: 'deleted-space' };
	expect(isWorkbenchRecords(records)).toBe(false);
	await second.dispose();
});

test('archived Space keeps its attribution and may still bind its own sessions; capacity and invalid refs are skipped in a batch', async () => {
	const f = fixture();
	const service = f.make('i');
	const a = await service.create({ name: 'A', relativePath: '' }),
		b = await service.create({ name: 'B', relativePath: '' });
	await service.bindHistorySource('ref', a.id);
	const plan = await service.inspectArchive({ kind: 'space', spaceId: a.id });
	await service.commitArchive(await service.acquireArchive(plan));
	expect(service.historySpaceFor('ref')).toBe(a.id);
	// S-4: a session of the archived Space is attributed, not rejected.
	await service.bindHistorySource('late', a.id);
	expect(service.historySpaceFor('late')).toBe(a.id);
	const result = await service.bindHistorySources([
		{ sourceRef: 'ok', spaceId: b.id },
		{ sourceRef: 'x'.repeat(4097), spaceId: b.id },
		{ sourceRef: ' ', spaceId: b.id },
		{ sourceRef: 'ref', spaceId: b.id },
		{ sourceRef: 'nowhere', spaceId: 'missing' },
		{ sourceRef: 'late', spaceId: a.id },
	]);
	expect(result.bound).toBe(1);
	expect(result.skipped.map((item) => item.reason)).toEqual([
		'history-source-invalid',
		'history-source-invalid',
		'history-source-owned',
		'missing-space',
	]);
	expect(service.historySpaceFor('ok')).toBe(b.id);
	expect(service.historySpaceFor('ref')).toBe(a.id);
	await service.dispose();
});

const importInput = (spaceId: string, extra: Record<string, unknown> = {}) => ({
	spaceId,
	sourceRef: 'codex:acct:/log/one.jsonl',
	accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
	deviceId: 'd',
	agentId: 'codex' as const,
	accountId: 'work',
	nativeSessionId: 'native-1',
	transcriptPath: '/log/one.jsonl',
	title: 'One',
	...extra,
});

test('explicit import persists source evidence and ownership, and re-import is the same record', async () => {
	const f = fixture();
	const service = f.make('i');
	const a = await service.create({ name: 'A', relativePath: '' }),
		b = await service.create({ name: 'B', relativePath: '' });
	const first = await service.importHistorySession(importInput(a.id));
	expect(first.created).toBe(true);
	expect(first.session).toMatchObject({
		spaceId: a.id,
		kind: 'agent',
		nativeSessionId: 'native-1',
		nativeImport: {
			sourceRef: 'codex:acct:/log/one.jsonl',
			accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
			deviceId: 'd',
		},
	});
	expect(first.session.lastAttempt).toBeUndefined();
	expect(service.historySpaceFor('codex:acct:/log/one.jsonl')).toBe(a.id);
	const again = await service.importHistorySession(importInput(a.id));
	expect(again.created).toBe(false);
	expect(again.session.id).toBe(first.session.id);
	expect(Object.keys(service.store.getState().records.sessions)).toHaveLength(1);
	// Another Space cannot take the same full reference.
	await expect(service.importHistorySession(importInput(b.id))).rejects.toThrow('OWNER_CONFLICT');
	// Same native id under another account (different source/account key) is a different reference.
	const other = await service.importHistorySession(
		importInput(a.id, {
			sourceRef: 'codex:other:/log/one.jsonl',
			accountKey: '{"HUHU_ACCOUNT_NAME":"home"}',
			accountId: 'home',
		}),
	);
	expect(other.created).toBe(true);
	expect(other.session.id).not.toBe(first.session.id);
	await service.dispose();
	// Evidence survives a restart and passes the record codec.
	const restarted = f.make('second');
	await restarted.ready;
	expect(restarted.store.getState().records.sessions[first.session.id]?.nativeImport?.deviceId).toBe('d');
	expect(isWorkbenchRecords(restarted.store.getState().records)).toBe(true);
	await restarted.dispose();
});

test('import adopts a proven-identical HUHU session instead of duplicating it, and never crosses Spaces', async () => {
	const f = fixture();
	const service = f.make('i');
	const a = await service.create({ name: 'A', relativePath: '' }),
		b = await service.create({ name: 'B', relativePath: '' });
	const admission = await service.prepareSession(a.id, {
		kind: 'agent',
		title: 'live',
		agentId: 'codex',
		accountId: 'work',
		nativeSessionId: 'native-1',
		transcriptPath: '/log/one.jsonl',
	});
	const adopted = await service.importHistorySession(importInput(a.id, { adopt: [admission.record.id] }));
	expect(adopted.created).toBe(false);
	expect(adopted.session.id).toBe(admission.record.id);
	expect(adopted.session.lastAttempt?.runtimeId).toBe(admission.runtimeId);
	expect(adopted.session.nativeImport?.sourceRef).toBe('codex:acct:/log/one.jsonl');
	await expect(service.importHistorySession(importInput(b.id, { adopt: [admission.record.id] }))).rejects.toThrow(
		'OWNER_CONFLICT',
	);
	await expect(service.importHistorySession(importInput('missing'))).rejects.toThrow('TARGET_NOT_FOUND');
	await service.dispose();
});

test('an imported Session with no earlier attempt can be prepared for its first resume generation; a plain one cannot', async () => {
	const f = fixture();
	const service = f.make('i');
	const a = await service.create({ name: 'A', relativePath: '' });
	const { session } = await service.importHistorySession(importInput(a.id));
	const admission = await service.prepareSession(
		a.id,
		{
			kind: 'agent',
			title: 'One',
			agentId: 'codex',
			accountId: 'work',
			nativeSessionId: 'native-1',
			transcriptPath: '/log/one.jsonl',
		},
		session.id,
	);
	expect(admission.record.id).toBe(session.id);
	expect(admission.record.nativeImport).toBeDefined();
	expect(await service.resolveSpaceCwd(a.id)).toBe('/same-cwd');
	await service.dispose();
});

test('fresh-import proof survives restart but is consumed before the first launch and cannot revive on recovery', async () => {
	const f = fixture();
	const first = f.make('first');
	const space = await first.create({ name: 'Imported' });
	const { session } = await first.importHistorySession({ spaceId: space.id, sourceRef: 'source', accountKey: '{}', deviceId: 'd', agentId: 'codex', accountId: '', nativeSessionId: 'native', transcriptPath: '/native.jsonl', title: 'Imported' });
	expect(session.nativeImport?.neverStarted).toBe(true);
	await first.dispose();
	const second = f.make('second');
	try {
		await second.ready;
		const restored = second.store.getState().records.sessions[session.id]!;
		expect(restored.nativeImport?.neverStarted).toBe(true);
		const admitted = await second.prepareSession(space.id, restored, session.id);
		expect(admitted.record.nativeImport?.neverStarted).toBeUndefined();
		const saved = JSON.parse(f.files.get(second.path)!);
		expect(saved.sessions[session.id].nativeImport.neverStarted).toBeUndefined();
		delete saved.sessions[session.id].lastAttempt;
		f.files.set(second.path, JSON.stringify(saved));
		await second.reloadFromDisk();
		const permit = await second.acquireArchive(await second.inspectArchive({ kind: 'session', spaceId: space.id, sessionId: session.id }));
		try { await expect(second.commitArchive(permit)).rejects.toMatchObject({ code: 'EFFECT_UNKNOWN' }); }
		finally { second.releaseArchive(permit); }
	} finally { await second.dispose(); }
});

import { expect, test } from 'vitest';
import {
	sameDocumentSnapshot,
	type DocumentChangeParticipant,
	type DocumentMutationPort,
	type DocumentSnapshot,
} from '../../../shared/storage/document-mutation';
import type { TextStorage } from '../../../shared/storage/ports';
import { WriteQueue } from '../../../shared/storage/write-queue';
import type { RestoreGate } from '../core/restore';
import { CheckpointStore } from './checkpoint-store';
import { RestoreService } from './restore-service';
import { LocalHistoryStore } from './local-history-store';
import { HistoryRetention } from './history-retention';
import { AutomaticHistory } from './automatic-history';
import { syncSettings } from '../settings';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { SyncSettings } from '../settings';
import { restoreHunks, type HunkDiff } from '../core/hunk-restore';

function memoryRecoveryFiles(files: Map<string, string>) {
	return {
		async inventory() { return [...files].map(([path, text]) => ({ path, byteLength: new TextEncoder().encode(text).byteLength, stamp: text,
			...(/\/objects\/([a-f0-9]{64})\.txt$/.test(path) ? { hash: /\/objects\/([a-f0-9]{64})\.txt$/.exec(path)![1]! } : {}) })); },
		async remove(file: { path: string; stamp: string }) {
			if (files.get(file.path) !== file.stamp) throw new Error('changed'); files.delete(file.path);
		},
	};
}

function fixture(disk = 'disk before', buffer = disk) {
	const files = new Map<string, string>(),
		objects = new Map<string, DocumentSnapshot>();
	const initial: DocumentSnapshot = {
		path: 'note.md',
		documentKey: 'original-file',
		exists: true,
		text: buffer,
		diskText: disk,
		buffers: [{ id: 'editor', generation: 1, text: buffer }],
		originLeafId: 'source-leaf',
	};
	objects.set('note.md', initial);
	let writes = 0,
		failStorage: ((path: string, text: string) => boolean) | undefined,
		applyHook: (() => void) | undefined;
	let fingerprint = 'HEAD:one,index:staged-content';
	const holds: string[] = [],
		queue = new WriteQueue(),
		events: string[] = [];
	const storage: TextStorage = {
		exists: async (path) => files.has(path),
		mkdir: async () => {},
		read: async (path) => {
			if (!files.has(path)) throw new Error('ENOENT');
			return files.get(path)!;
		},
		write: async (path, text) => {
			if (failStorage?.(path, text)) throw new Error('disk-full');
			files.set(path, text);
		},
	};
	const documents: DocumentMutationPort = {
		capture: async (path) =>
			structuredClone(
				objects.get(path) ?? {
					path,
					documentKey: `missing:${path}`,
					exists: false,
					text: null,
					diskText: null,
					buffers: [],
				},
			),
		exclusive: (_path, work) => work(),
		editableText: (text) => text,
		apply: async (expected, text) => {
			if (!sameDocumentSnapshot(expected, await documents.capture(expected.path))) throw new Error('changed');
			writes++;
			events.push('apply');
			const after: DocumentSnapshot = {
				...expected,
				documentKey:
					text === null ? `missing:${expected.path}` : expected.exists ? expected.documentKey : 'new-file',
				exists: text !== null,
				text,
				diskText: text,
				buffers:
					text === null
						? []
						: expected.buffers.map((item) => ({ ...item, text, generation: item.generation + 1 })),
			};
			objects.set(expected.path, after);
			applyHook?.();
			return structuredClone(after);
		},
	};
	const gate: RestoreGate = {
		run: (_id, work) => queue.run('repo', work),
		hold: async (id) => {
			holds.push(id);
			events.push('hold');
		},
		capture: async () => fingerprint,
		assertCheckpointProtection: async () => {
			events.push('protection');
		},
	};
	const checkpoints = new CheckpointStore(storage, 'device-1'),
		service = new RestoreService({ documents, gate, checkpoints, assertHunkOrigin: origin => {
			if (origin.id !== 'editor-context' || origin.path !== 'note.md' || origin.leafId !== 'source-leaf'
				|| origin.generation !== objects.get('note.md')?.buffers[0]?.generation) throw new Error('versioning.restore.changed');
		} });
	return {
		files,
		objects,
		storage,
		documents,
		gate,
		checkpoints,
		service,
		holds,
		events,
		writes: () => writes,
		fail: (fn?: typeof failStorage) => {
			failStorage = fn;
		},
		onApply: (fn?: typeof applyHook) => {
			applyHook = fn;
		},
		repo: (value: string) => {
			fingerprint = value;
		},
		edit: (text: string) => {
			const previous = objects.get('note.md')!;
			objects.set('note.md', {
				...previous,
				text,
				buffers: previous.buffers.map((item) => ({ ...item, text, generation: item.generation + 1 })),
			});
		},
	};
}
const request = (text = 'historical contents') => ({
	source: { id: 'commit:path', text, label: 'Earlier version' },
	targetPath: 'note.md',
	originLeafId: 'source-leaf',
	mode: 'replace-current' as const,
});

test('partial preparation validates the original B identity and generations before using exact raw selections', async () => {
	const before = '\uFEFF新一\r\n保持😀\r\n新二', historical = '\uFEFF旧一\r\n保持😀\r\n旧二';
	const diff: HunkDiff = { left: '旧一\n保持😀\n旧二', right: '新一\n保持😀\n新二', precise: true,
		chunks: [{ fromA: 0, toA: 3, fromB: 0, toB: 3, precise: true }, { fromA: 8, toA: 11, fromB: 8, toB: 11, precise: true }] };
	for (const drift of ['replace', 'ABA-before-prepare', 'ABA-after-prepare', 'none'] as const) {
		const f = fixture(before), target = await f.service.captureTarget('note.md', 'source-leaf');
		const hunks = { target, origin: { id: 'editor-context', path: 'note.md', leafId: 'source-leaf', generation: 1 },
			diff, selected: [restoreHunks(historical, before, diff)[0]!.id] };
		if (drift === 'replace') f.objects.set('note.md', { ...target, documentKey: 'same-bytes-new-file' });
		if (drift === 'ABA-before-prepare') { f.edit('new draft'); f.edit(before); }
		if (drift === 'replace' || drift === 'ABA-before-prepare') {
			await expect(f.service.prepare({ ...request(historical), hunks })).rejects.toThrow('versioning.restore.changed');
			expect(f.writes()).toBe(0); continue;
		}
		const plan = await f.service.prepare({ ...request(historical), hunks });
		expect(plan.afterText).toBe('\uFEFF旧一\r\n保持😀\r\n新二');
		if (drift === 'ABA-after-prepare') {
			f.edit('new draft'); f.edit(before);
			await expect(f.service.apply(plan.id)).rejects.toThrow('versioning.restore.changed');
			expect(f.writes()).toBe(0);
		} else {
			const receipt = await f.service.apply(plan.id);
			expect(receipt.selectedHunks).toEqual(hunks.selected);
			await f.service.undo(receipt.id);
			expect(f.objects.get('note.md')!.text).toBe(before);
		}
	}
});

test('preparing and cancelling is read-only; recovery hold begins only on apply', async () => {
	const f = fixture('disk', 'unsaved');
	const plan = await f.service.prepare(request());
	expect(plan.dirty).toBe(true);
	expect(f.files.size).toBe(0);
	expect(f.holds).toEqual([]);
	expect(f.writes()).toBe(0);
	f.service.cancel(plan.id);
	await expect(f.service.apply(plan.id)).rejects.toThrow('plan-missing');
	expect(f.objects.get('note.md')!.text).toBe('unsaved');
	await f.service.dispose();
});

test('dirty buffer and disk are separately checkpointed; apply is idempotent; undo restores the full previous draft', async () => {
	const f = fixture('disk old', 'unsaved draft');
	const plan = await f.service.prepare(request());
	const [receipt, duplicate] = await Promise.all([f.service.apply(plan.id), f.service.apply(plan.id)]);
	expect(receipt).toEqual(duplicate);
	expect(f.writes()).toBe(1);
	expect(receipt.stage).toBe('verified');
	expect(await f.service.readSnapshot(receipt.beforeObject!)).toBe('unsaved draft');
	expect(await f.service.readSnapshot(receipt.beforeDiskObject!)).toBe('disk old');
	expect(f.events.slice(0, 3)).toEqual(['hold', 'protection', 'apply']);
	const inverse = await f.service.undo(receipt.id);
	expect(inverse.stage).toBe('verified');
	expect(f.objects.get('note.md')!.text).toBe('unsaved draft');
	expect(f.service.receipts().find((item) => item.id === receipt.id)!.undoneBy).toBe(inverse.id);
	await expect(f.service.undo(receipt.id)).rejects.toThrow('undo-unavailable');
	await f.service.dispose();
});

test('new edits, same-path replacement and a changed index invalidate prepared restores without overwriting', async () => {
	for (const scenario of ['edit', 'identity', 'index'] as const) {
		const f = fixture();
		const plan = await f.service.prepare(request());
		if (scenario === 'edit') f.edit('new typing');
		if (scenario === 'identity')
			f.objects.set('note.md', { ...f.objects.get('note.md')!, documentKey: 'replacement-file' });
		if (scenario === 'index') f.repo('HEAD:one,index:new-staging');
		await expect(f.service.apply(plan.id)).rejects.toThrow('changed');
		expect(f.writes()).toBe(0);
		await f.service.dispose();
	}
});

test('autosave of the captured draft is accepted without discarding its separate preparation', async () => {
	const f = fixture('disk', 'draft');
	const plan = await f.service.prepare(request());
	f.objects.set('note.md', { ...f.objects.get('note.md')!, diskText: 'draft' });
	const receipt = await f.service.apply(plan.id);
	expect(await f.service.readSnapshot(receipt.beforeDiskObject!)).toBe('draft');
	expect(receipt.stage).toBe('verified');
	await f.service.dispose();
});

test('failed checkpoints prohibit the note write and retain the durable synchronization hold', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	f.fail((path) => path.includes('/objects/'));
	await expect(f.service.apply(plan.id)).rejects.toThrow('disk-full');
	expect(f.writes()).toBe(0);
	expect(f.holds).toHaveLength(1);
	expect(f.objects.get('note.md')!.text).toBe('disk before');
	await f.service.dispose();
});

test('a crash after the document write is classified on restart and never replayed', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	f.onApply(() => {
		throw new Error('save-or-host-failure');
	});
	await expect(f.service.apply(plan.id)).rejects.toThrow('save-or-host-failure');
	expect(f.service.pending()[0]!.stage).toBe('needs-review');
	f.onApply();
	const restarted = new RestoreService({
		documents: f.documents,
		gate: f.gate,
		checkpoints: new CheckpointStore(f.storage, 'device-1'),
	});
	expect((await restarted.recoverPending())[0]!.recoveryObservation).toBe('after');
	expect(f.writes()).toBe(1);
	f.edit('newer work');
	f.objects.set('note.md', { ...f.objects.get('note.md')!, diskText: 'newer work' });
	expect((await restarted.recoverPending())[0]!.recoveryObservation).toBe('diverged');
	expect(f.writes()).toBe(1);
	await restarted.dispose();
	await f.service.dispose();
});

test('failure to persist an applied receipt leaves a durable applying journal, never a false success', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	f.fail(
		(path, text) =>
			path.endsWith('/journal.json') &&
			(text.includes('"stage":"applied"') || text.includes('"stage":"needs-review"')),
	);
	await expect(f.service.apply(plan.id)).rejects.toThrow('disk-full');
	expect(f.writes()).toBe(1);
	f.fail();
	const recovered = new RestoreService({
		documents: f.documents,
		gate: f.gate,
		checkpoints: new CheckpointStore(f.storage, 'device-1'),
	});
	expect((await recovered.recoverPending())[0]!.recoveryObservation).toBe('after');
	expect(f.writes()).toBe(1);
	await recovered.dispose();
	await f.service.dispose();
});

test('an external Git mutation during restore is reported without resetting its index', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	f.onApply(() => f.repo('external-index'));
	await expect(f.service.apply(plan.id)).rejects.toThrow('repository-changed');
	expect(await f.gate.capture()).toBe('external-index');
	expect(f.service.pending()[0]!.stage).toBe('needs-review');
	await f.service.dispose();
});

test('undo refuses newer edits; copy creation and copy undo preserve the original note', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	const receipt = await f.service.apply(plan.id);
	f.edit('later edit');
	await expect(f.service.undo(receipt.id)).rejects.toThrow('changed');
	expect(f.writes()).toBe(1);
	const copy = await f.service.prepare({ ...request('copied history'), mode: 'create-copy', copyPath: 'copy.md' });
	const created = await f.service.apply(copy.id);
	expect(f.objects.get('note.md')!.text).toBe('later edit');
	expect(f.objects.get('copy.md')!.text).toBe('copied history');
	await f.service.undo(created.id);
	expect(f.objects.get('copy.md')!.exists).toBe(false);
	expect(f.objects.get('note.md')!.text).toBe('later edit');
	await f.service.dispose();
});

test('content-addressed recovery verifies hashes and rejects tampered checkpoints', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	const receipt = await f.service.apply(plan.id);
	const path = [...f.files.keys()].find((key) => key.endsWith(`/${receipt.beforeObject}.txt`))!;
	f.files.set(path, 'tampered');
	await expect(f.service.undo(receipt.id)).rejects.toThrow('checkpoint-corrupt');
	expect(f.writes()).toBe(1);
	await f.service.dispose();
});

test('previewing recovery with a corrupt primary journal reads the backup without repairing or writing', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	await f.service.apply(plan.id);
	const journal = [...f.files.keys()].find((path) => path.endsWith('/journal.json'))!;
	f.files.set(journal, '{invalid');
	const baseline = [...f.files];
	const restarted = new RestoreService({
		documents: f.documents,
		gate: f.gate,
		checkpoints: new CheckpointStore(f.storage, 'device-1'),
	});
	const preview = await restarted.prepare(request('another version'));
	restarted.cancel(preview.id);
	expect([...f.files]).toEqual(baseline);
	expect(f.holds).toHaveLength(1);
	expect(f.writes()).toBe(1);
	await restarted.dispose();
	await f.service.dispose();
});

test('explicit acknowledgement closes a pending review across restarts without claiming verification or writing notes', async () => {
	const f = fixture();
	const plan = await f.service.prepare(request());
	f.onApply(() => {
		throw new Error('uncertain save');
	});
	await expect(f.service.apply(plan.id)).rejects.toThrow();
	f.onApply();
	// The host acknowledgement already owns the Git queue; the service must not try to acquire it recursively.
	const acknowledged = await f.gate.run('acknowledge', () => f.service.acknowledgePending(plan.id));
	expect(acknowledged.stage).toBe('needs-review');
	expect(acknowledged.acknowledgedAt).toBeTypeOf('number');
	expect(f.service.pending()).toEqual([]);
	expect(f.holds).toHaveLength(1);
	expect(f.writes()).toBe(1);
	const restarted = new RestoreService({
		documents: f.documents,
		gate: f.gate,
		checkpoints: new CheckpointStore(f.storage, 'device-1'),
	});
	expect(await restarted.recoverPending()).toEqual([]);
	expect(f.holds).toHaveLength(1);
	expect(f.writes()).toBe(1);
	await expect(restarted.undo(plan.id)).rejects.toThrow('undo-unavailable');
	await restarted.dispose();
	await f.service.dispose();
});

test('collection preserves the actual restore and restart undo chain while reclaiming unrelated expired history', async () => {
	const f = fixture('disk before', 'unsaved draft before');
	const receipt = await f.service.apply((await f.service.prepare(request())).id);
	let now = 1_000_000;
	const history = new LocalHistoryStore(f.storage, 'device-1', () => now, f.checkpoints);
	const old = await history.capture('old.md', 'unrelated expired text', 'interval');
	now += 31 * 86_400_000;
	const retention = new HistoryRetention(f.storage, 'device-1', history, memoryRecoveryFiles(f.files), () => ({ days: 30, quotaBytes: 1024 * 1024 }), () => now);
	await retention.collect();
	expect([...f.files.keys()].some(path => path.endsWith(`${old!.hash}.txt`))).toBe(false);
	const restarted = new RestoreService({ documents: f.documents, gate: f.gate, checkpoints: new CheckpointStore(f.storage, 'device-1') });
	await restarted.initialize();
	expect((await restarted.undo(receipt.id)).stage).toBe('verified');
	expect(f.objects.get('note.md')!.text).toBe('unsaved draft before');
	await restarted.dispose(); await f.service.dispose();
});

test('an actual restore holds unpublished checkpoint objects until its recovery journal is durable', async () => {
	const f = fixture();
	let entered!: () => void, release!: () => void;
	const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
	const blocked = new Promise<void>(resolve => { release = resolve; });
	const write = f.storage.write;
	let first = true;
	f.storage.write = async (path, text) => {
		if (first && path.includes('/objects/')) { first = false; entered(); await blocked; }
		await write(path, text);
	};
	const plan = await f.service.prepare(request());
	const applying = f.service.apply(plan.id); await enteredPromise;
	const history = new LocalHistoryStore(f.storage, 'device-1', undefined, f.checkpoints);
	const retention = new HistoryRetention(f.storage, 'device-1', history, memoryRecoveryFiles(f.files), () => ({ days: 30, quotaBytes: 1024 * 1024 }));
	let complete = false;
	const collecting = retention.collect().then(() => { complete = true; });
	await Promise.resolve(); expect(complete).toBe(false);
	release(); const [receipt] = await Promise.all([applying, collecting]);
	expect(receipt.stage).toBe('verified');
	expect(await f.checkpoints.readObject(receipt.beforeObject!)).toBe('disk before');
	await f.service.dispose();
});

test('quota-paused automatic history cannot waive forced checkpoints, and checkpoint write failure still refuses note overwrite', async () => {
	const f = fixture();
	await f.service.apply((await f.service.prepare(request())).id);
	const history = new LocalHistoryStore(f.storage, 'device-1', undefined, f.checkpoints);
	const retention = new HistoryRetention(f.storage, 'device-1', history, memoryRecoveryFiles(f.files), () => ({ days: 30, quotaBytes: 1 }));
	const settings = { get: () => ({ ...syncSettings.defaults(), localHistoryEnabled: true }), subscribe: () => () => {} } as unknown as SettingsHandle<SyncSettings>;
	const automatic = new AutomaticHistory({ settings, history, capture: () => [{ path: 'note.md', text: 'another sample', sourceId: 'leaf' }],
		assertProtection: async () => {}, timers: { setTimeout: () => 1, clearTimeout() {} } as unknown as Window,
		admit: (allocation, scope, signal) => retention.admit(allocation, scope, signal) });
	try {
		automatic.start(); await automatic.sample('important');
		expect(automatic.snapshot).toMatchObject({ phase: 'error', error: 'versioning.localHistory.quota' });
		const successful = await f.service.apply((await f.service.prepare(request('second restored text'))).id);
		expect(successful.stage).toBe('verified'); expect(f.objects.get('note.md')!.text).toBe('second restored text');
		const count = f.writes();
		f.fail(path => path.includes('/objects/'));
		await expect(f.service.apply((await f.service.prepare(request('cannot checkpoint this version'))).id)).rejects.toThrow('disk-full');
		expect(f.writes()).toBe(count); expect(f.objects.get('note.md')!.text).toBe('second restored text');
	} finally { await automatic.stop(); await f.service.dispose(); }
});

test.each(['open-to-closed', 'closed-to-open'] as const)(
	'undo distinguishes native LF buffers from exact CRLF disk content: %s',
	async (mode) => {
		const f = fixture('before\r\n', 'before\n');
		f.documents.editableText = (text, expected) => (expected.buffers.length ? text.replace(/\r\n?/g, '\n') : text);
		if (mode === 'closed-to-open')
			f.objects.set('note.md', { ...f.objects.get('note.md')!, buffers: [], text: 'before\r\n' });
		const plan = await f.service.prepare(request('history\r\n'));
		expect(plan.dirty).toBe(false);
		const apply = f.documents.apply;
		f.documents.apply = async (...args) => {
			const after = await apply(...args),
				raw = after.diskText?.replace(/\r?\n/g, '\r\n') ?? null;
			const actual = { ...after, diskText: raw, text: after.buffers.length ? after.text : raw };
			f.objects.set(actual.path, actual);
			return actual;
		};
		const receipt = await f.service.apply(plan.id),
			current = f.objects.get('note.md')!;
		f.objects.set(
			'note.md',
			mode === 'open-to-closed'
				? { ...current, buffers: [], text: current.diskText }
				: { ...current, text: 'history\n', buffers: [{ id: 'new-editor', generation: 0, text: 'history\n' }] },
		);
		expect((await f.service.undo(receipt.id)).stage).toBe('verified');
		expect(f.objects.get('note.md')!.diskText).toBe('before\r\n');
		await f.service.dispose();
	},
);

test('annotation participants can refuse copy removal before any note or checkpoint body is overwritten', async () => {
	const f = fixture();
	let removalRequests = 0;
	const participant: DocumentChangeParticipant = {
		prepare: async (change) => {
			if (change.kind === 'remove') {
				removalRequests++;
				throw new Error('annotations changed');
			}
			return {};
		},
		commit: async () => ({}),
		abort: async () => {},
	};
	const service = new RestoreService({
		documents: f.documents,
		gate: f.gate,
		checkpoints: f.checkpoints,
		participant: () => participant,
	});
	const plan = await service.prepare({ ...request('copied text'), mode: 'create-copy', copyPath: 'copy.md' }),
		receipt = await service.apply(plan.id);
	await expect(service.undo(receipt.id)).rejects.toThrow('annotations changed');
	expect(removalRequests).toBe(1);
	expect(f.writes()).toBe(1);
	expect(f.objects.get('copy.md')!.text).toBe('copied text');
	await service.dispose();
	await f.service.dispose();
});

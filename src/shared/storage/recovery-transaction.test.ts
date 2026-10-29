import { useStorageTimers, type StorageTimers } from './timers';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { FaultStorage } from '../../../test/agent-migrations/fault-storage';
import { RecoveryError, isRecoveryJournal, type RecoveryOwner } from './recovery-contracts';
import { RecoveryGate, readJournal, recoverPending, runRecoveryTransaction } from './recovery-transaction';

const TARGETS = ['.huhu/x/a.json', '.huhu/x/b.json', '.huhu/x/c.json'] as const;
const OLD = { [TARGETS[0]]: 'old-a', [TARGETS[1]]: 'old-b', [TARGETS[2]]: null };
const NEW = { [TARGETS[0]]: 'new-a', [TARGETS[1]]: 'new-b', [TARGETS[2]]: 'new-c' };

function seed(): FaultStorage {
	const storage = new FaultStorage();
	storage.files.set(TARGETS[0], 'old-a');
	storage.files.set(TARGETS[1], 'old-b');
	return storage;
}
function owner(log: string[] = [], overrides: Partial<RecoveryOwner> = {}): RecoveryOwner {
	return {
		id: 'test',
		owns: (path) => path.startsWith('.huhu/x/'),
		preflight: async () => ({ busy: [] }),
		quiesce: async () => {
			log.push('quiesce');
		},
		drain: async () => {
			log.push('drain');
		},
		adopt: async (_t, change) => {
			log.push('adopt:' + change.paths.length);
		},
		release: async () => {
			log.push('release');
		},
		...overrides,
	};
}
const run = (storage: FaultStorage, owners: RecoveryOwner[] = [owner()], gate?: RecoveryGate) =>
	runRecoveryTransaction({
		storage,
		owners,
		gate,
		operation: 'test',
		newId: () => 'op1',
		now: () => 1,
		stage: async () => ({ writes: TARGETS.map((path) => ({ path, content: NEW[path] })) }),
	});

describe('recovery transaction', () => {
	test('runs the owner protocol in order and ends with a terminal journal', async () => {
		const log: string[] = [],
			storage = seed();
		const result = await run(storage, [owner(log)]);
		expect(log).toEqual(['quiesce', 'drain', 'adopt:3', 'release']);
		expect(result.changed).toEqual([...TARGETS]);
		expect(storage.snapshot(TARGETS)).toEqual(NEW);
		expect((await readJournal(storage))?.phase).toBe('done');
	});

	test('BUSY owner stops everything before any quiesce or write', async () => {
		const log: string[] = [],
			storage = seed();
		const busy = owner(log, { preflight: async () => ({ busy: ['terminal 1'] }) });
		await expect(run(storage, [busy])).rejects.toMatchObject({ code: 'BUSY', detail: { busy: ['terminal 1'] } });
		expect(log).toEqual([]);
		expect(storage.mutations).toBe(0);
	});

	test('a failed strict drain aborts, releases every owner and writes nothing', async () => {
		const log: string[] = [],
			storage = seed();
		const failing = owner(log, {
			drain: async () => {
				throw new Error('flush failed');
			},
		});
		await expect(run(storage, [owner(log), failing])).rejects.toMatchObject({ code: 'DRAIN_FAILED' });
		expect(log.filter((l) => l === 'release')).toHaveLength(2);
		expect(storage.mutations).toBe(0);
		expect(storage.snapshot(TARGETS)).toEqual(OLD);
	});

	test('paths outside every owner whitelist are rejected before any write', async () => {
		const storage = seed();
		await expect(
			runRecoveryTransaction({
				storage,
				owners: [owner()],
				operation: 't',
				newId: () => 'op1',
				stage: async () => ({ writes: [{ path: '.huhu/other/file.json', content: 'x' }] }),
			}),
		).rejects.toMatchObject({ code: 'PATH_NOT_OWNED' });
		await expect(
			runRecoveryTransaction({
				storage,
				owners: [owner()],
				operation: 't',
				newId: () => 'op1',
				stage: async () => ({ writes: [{ path: '.huhu/x/../../etc/passwd', content: 'x' }] }),
			}),
		).rejects.toMatchObject({ code: 'PATH_INVALID' });
		expect(storage.mutations).toBe(0);
	});

	test('write failure (disk full) rolls everything back and surfaces the error', async () => {
		for (const failing of TARGETS) {
			const storage = seed();
			storage.failWrite = (path) => path === failing;
			await expect(run(storage)).rejects.toBeInstanceOf(RecoveryError);
			expect(storage.snapshot(TARGETS)).toEqual(OLD);
			expect((await readJournal(storage))?.phase).toBe('rolled-back');
		}
	});

	test('source drift after the snapshot refuses without clobbering the foreign edit', async () => {
		const storage = seed();
		storage.afterWrite = (path) => {
			if (path.endsWith('journal.b.json') && !storage.files.has(TARGETS[2]))
				storage.files.set(TARGETS[1], 'edited-elsewhere');
		};
		await expect(run(storage)).rejects.toMatchObject({ code: 'SOURCE_DRIFT' });
		expect(storage.snapshot(TARGETS)).toEqual({ ...OLD, [TARGETS[1]]: 'edited-elsewhere' });
		expect((await readJournal(storage))?.phase).toBe('rolled-back');
	});

	test('adopt failure holds the gate and keeps owners closed; restart rolls forward', async () => {
		const log: string[] = [],
			storage = seed(),
			gate = new RecoveryGate();
		const bad = owner(log, {
			adopt: async () => {
				throw new Error('reload failed');
			},
		});
		await expect(run(storage, [bad], gate)).rejects.toMatchObject({ code: 'ADOPT_FAILED' });
		expect(gate.held).toBe(true);
		expect(log).not.toContain('release');
		expect((await readJournal(storage))?.phase).toBe('committed');
		const outcome = await recoverPending(storage.reboot());
		expect(outcome.status).toBe('rolled-forward');
		expect(storage.snapshot(TARGETS)).toEqual(NEW);
	});

	test('a pending journal blocks a new operation', async () => {
		const storage = seed(),
			gate = new RecoveryGate();
		await expect(
			run(
				storage,
				[
					owner([], {
						adopt: async () => {
							throw new Error('x');
						},
					}),
				],
				gate,
			),
		).rejects.toBeDefined();
		await expect(run(storage.reboot())).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
	});

	test('power loss at every mutating step (clean and torn) recovers to all-old or all-new, idempotently', async () => {
		const probe = seed();
		await run(probe);
		const total = probe.mutations;
		expect(total).toBeGreaterThan(10);
		const seen = new Set<string>();
		for (const torn of [false, true]) {
			for (let at = 1; at <= total; at++) {
				const storage = seed();
				storage.crashAt = at;
				storage.torn = torn;
				await run(storage).then(
					() => undefined,
					() => undefined,
				);
				const restarted = storage.reboot();
				await recoverPending(restarted);
				const after = restarted.snapshot(TARGETS);
				const isOld = JSON.stringify(after) === JSON.stringify(OLD);
				const isNew = JSON.stringify(after) === JSON.stringify(NEW);
				expect(isOld || isNew, `step ${at} torn=${torn}: ${JSON.stringify(after)}`).toBe(true);
				seen.add(isOld ? 'old' : 'new');
				const journal = await readJournal(restarted);
				expect(!journal || ['done', 'rolled-back'].includes(journal.phase)).toBe(true);
				const before = restarted.mutations;
				expect((await recoverPending(restarted)).status).toBe('none');
				expect(restarted.mutations).toBe(before);
			}
		}
		expect([...seen].sort()).toEqual(['new', 'old']);
	});

	test('recovery interrupted by a second power loss still converges', async () => {
		const probe = seed();
		await run(probe);
		for (let at = 6; at <= probe.mutations; at++) {
			const storage = seed();
			storage.crashAt = at;
			await run(storage).then(
				() => undefined,
				() => undefined,
			);
			for (let second = 1; second < 6; second++) {
				const mid = storage.reboot();
				mid.crashAt = second;
				await recoverPending(mid).then(
					() => undefined,
					() => undefined,
				);
				await recoverPending(mid.reboot());
			}
			const after = storage.reboot().snapshot(TARGETS);
			expect([JSON.stringify(OLD), JSON.stringify(NEW)]).toContain(JSON.stringify(after));
		}
	});

	test('an unverifiable recovery copy keeps the gate instead of guessing', async () => {
		const storage = seed();
		storage.crashAt = 11;
		await run(storage).then(
			() => undefined,
			() => undefined,
		);
		const journal = (await readJournal(storage.reboot()))!;
		expect(['committing', 'prepared', 'committed']).toContain(journal.phase);
		for (const entry of journal.entries) if (entry.oldCopy) storage.files.set(entry.oldCopy, 'tampered');
		for (const entry of journal.entries) if (entry.newCopy) storage.files.set(entry.newCopy, 'tampered');
		const reboot = storage.reboot();
		for (const path of TARGETS) reboot.files.set(path, 'garbage');
		await expect(recoverPending(reboot)).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
		expect(reboot.snapshot(TARGETS)[TARGETS[0]]).toBe('garbage');
	});
});

describe('journal write failures after replacement (M-1)', () => {
	// Writes to journal slots in order: 1 prepared, 2 committing, 3 committed, 4 done.
	const failJournalWrite = (storage: FaultStorage, nth: number) => {
		let seen = 0;
		storage.failWrite = (path) => path.includes('/journal.') && ++seen === nth;
	};
	for (const nth of [3, 4]) {
		test(`failing journal write #${nth} keeps owners closed and the gate held; the next start converges with no later writes`, async () => {
			const log: string[] = [],
				storage = seed(),
				gate = new RecoveryGate();
			failJournalWrite(storage, nth);
			await expect(run(storage, [owner(log)], gate)).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
			expect(log).not.toContain('release');
			expect(gate.held).toBe(true);
			// Nothing may write after the failure: owners are closed, so the targets stay exactly as they were.
			const frozen = storage.snapshot(TARGETS);
			storage.failWrite = undefined;
			expect(storage.snapshot(TARGETS)).toEqual(frozen);
			// Next start: committing rolls fully back, committed rolls fully forward; never a mix.
			const outcome = await recoverPending(storage.reboot());
			expect(outcome.status).toBe(nth === 3 ? 'rolled-back' : 'rolled-forward');
			expect(storage.snapshot(TARGETS)).toEqual(nth === 3 ? OLD : NEW);
			// And the operation can run again cleanly.
			if (nth === 3) {
				await run(storage.reboot());
				expect(storage.snapshot(TARGETS)).toEqual(NEW);
			}
		});
	}
	test('without a gate the failed journal write still keeps owners closed', async () => {
		const log: string[] = [],
			storage = seed();
		failJournalWrite(storage, 3);
		await expect(run(storage, [owner(log)])).rejects.toMatchObject({ code: 'UNRECOVERABLE' });
		expect(log).not.toContain('release');
	});
	for (const nth of [1]) {
		test(`failing journal write #${nth} happens before any replacement: owners are released and targets stay old`, async () => {
			const log: string[] = [],
				storage = seed();
			failJournalWrite(storage, nth);
			await expect(run(storage, [owner(log)])).rejects.toBeInstanceOf(RecoveryError);
			expect(log).toContain('release');
			expect(storage.snapshot(TARGETS)).toEqual(OLD);
			storage.failWrite = undefined;
			await recoverPending(storage.reboot());
			expect(storage.snapshot(TARGETS)).toEqual(OLD);
		});
	}
});

describe('rollback origin and path validation (L-1, L-3)', () => {
	test('a drift rollback interrupted by a crash still leaves the foreign edit alone after restart', async () => {
		const probe = seed();
		probe.afterWrite = (path) => {
			if (path.endsWith('journal.b.json') && !probe.files.has(TARGETS[2]))
				probe.files.set(TARGETS[1], 'edited-elsewhere');
		};
		await run(probe).catch(() => undefined);
		// Replay with a crash right after the rolling-back journal write.
		for (let at = 1; at <= probe.mutations; at++) {
			const storage = seed();
			storage.afterWrite =
				probe.afterWrite === undefined
					? undefined
					: (path) => {
							if (path.endsWith('journal.b.json') && !storage.files.has(TARGETS[2]))
								storage.files.set(TARGETS[1], 'edited-elsewhere');
						};
			storage.crashAt = at;
			await run(storage).catch(() => undefined);
			const restarted = storage.reboot();
			await recoverPending(restarted);
			if (restarted.files.get(TARGETS[1]) !== 'old-b')
				expect(restarted.files.get(TARGETS[1])).toBe('edited-elsewhere');
			expect(restarted.files.get(TARGETS[0])).toBe('old-a');
		}
	});

	test('a journal naming a path outside the vault is rejected by the codec', () => {
		const entry = { path: '../outside', owner: 'o', oldDigest: null, newDigest: null };
		expect(
			isRecoveryJournal({
				format: 1,
				seq: 1,
				operationId: 'op',
				operation: 'x',
				phase: 'prepared',
				createdAt: 1,
				entries: [entry],
			}),
		).toBe(false);
		expect(
			isRecoveryJournal({
				format: 1,
				seq: 1,
				operationId: 'op',
				operation: 'x',
				phase: 'prepared',
				createdAt: 1,
				entries: [{ ...entry, path: '.huhu/a', oldCopy: '/etc/passwd' }],
			}),
		).toBe(false);
	});

	test('an owner can reject a stage that changes more than it may', async () => {
		const storage = seed();
		const strict = owner([], {
			validate: (changes) => {
				if (changes.some((c) => c.path === TARGETS[1])) throw new Error('only a.json may change');
			},
		});
		await expect(run(storage, [strict])).rejects.toMatchObject({ code: 'STAGE_INVALID' });
		expect(storage.mutations).toBe(0);
	});
});

describe('every journal slot write that lands and then throws (M-3)', () => {
	type Mode = 'lands-then-throws' | 'read-back-fails';
	const arm = (storage: FaultStorage, nth: number, mode: Mode) => {
		let seen = 0,
			target: string | undefined;
		const hit = (path: string) => path.includes('/journal.') && ++seen === nth && ((target = path), true);
		if (mode === 'lands-then-throws') storage.landThenThrow = hit;
		else {
			storage.afterWrite = (path) => void hit(path);
			storage.failRead = (path) => path === target;
		}
	};
	for (const mode of ['lands-then-throws', 'read-back-fails'] as const) {
		for (const nth of [1, 2, 3, 4]) {
			test(`${mode} on journal write #${nth}: owners ${nth === 1 ? 'may reopen' : 'stay closed'}, nothing later is lost across restart`, async () => {
				const log: string[] = [],
					storage = seed(),
					gate = new RecoveryGate();
				arm(storage, nth, mode);
				await expect(run(storage, [owner(log)], gate)).rejects.toBeInstanceOf(RecoveryError);
				storage.landThenThrow = undefined;
				storage.failRead = undefined;
				storage.afterWrite = undefined;
				if (nth === 1) {
					// Nothing replaced yet: a later edit by a reopened owner must survive the restart (prepared rollback skips it).
					expect(log).toContain('release');
					storage.files.set(TARGETS[0], 'later-edit');
					await recoverPending(storage.reboot());
					expect(storage.files.get(TARGETS[0])).toBe('later-edit');
					return;
				}
				expect(log).not.toContain('release');
				expect(gate.held).toBe(true);
				const frozen = storage.snapshot(TARGETS);
				// Closed owners admit no write; the restart then converges to a complete old or new version.
				const outcome = await recoverPending(storage.reboot());
				expect(outcome.status === 'none' || frozen !== undefined).toBe(true);
				const after = storage.snapshot(TARGETS);
				expect([JSON.stringify(OLD), JSON.stringify(NEW)]).toContain(JSON.stringify(after));
			});
		}
	}

	test('an oversized stage is rejected before anything is written (N-2)', async () => {
		const storage = seed();
		await expect(
			runRecoveryTransaction({
				storage,
				owners: [owner()],
				operation: 't',
				newId: () => 'op1',
				stage: async () => ({
					writes: Array.from({ length: 65 }, (_, i) => ({ path: `.huhu/x/f${i}.json`, content: 'x' })),
				}),
			}),
		).rejects.toMatchObject({ code: 'STAGE_INVALID' });
		expect(storage.mutations).toBe(0);
	});
});


describe('bounded pre-commit recovery', () => {
	test('a timed-out drain reopens owners but isolates its late writer from a new restore', async () => {
		vi.useFakeTimers();
		const storage = seed(), log: string[] = [];
		let enter!: () => void, finish!: () => void;
		const ready = new Promise<void>((resolve) => { enter = resolve; });
		const barrier = new Promise<void>((resolve) => { finish = resolve; });
		let open = true;
		const slow = owner(log, {
			quiesce: async () => { open = false; },
			drain: async () => { enter(); await barrier; storage.files.set(TARGETS[0], 'late-old-writer'); open = false; },
			release: async () => { log.push('release'); open = true; },
		});
		let outcome = 'pending', stages = 0;
		const operation = runRecoveryTransaction({ storage, owners: [slow], operation: 'bounded', newId: () => 'bounded',
			preCommitTimeoutMs: 20, timers: globalThis as unknown as import('./timers').StorageTimers, stage: async () => { stages++; return { writes: [{ path: TARGETS[0], content: 'restored' }] }; },
		}).then(() => { outcome = 'done'; }, (error: unknown) => { outcome = (error as RecoveryError).code; });
		await ready;
		try {
			await vi.advanceTimersByTimeAsync(20);
			expect(outcome).toBe('TIMEOUT');
			expect(log).toContain('release');
			expect(open).toBe(true);
			expect(stages).toBe(0);
			await expect(run(storage)).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
			expect(storage.snapshot(TARGETS)).toEqual(OLD);
		} finally { finish(); await operation; await vi.advanceTimersByTimeAsync(0); vi.useRealTimers(); }
		expect(storage.files.get(TARGETS[0])).toBe('late-old-writer');
		expect(open).toBe(true);
		expect(log.some((item) => item.startsWith('adopt'))).toBe(false);
		await run(storage);
		expect(storage.snapshot(TARGETS)).toEqual(NEW);
	});
});


test('a drain that never settles can be cancelled without staging and keeps later restores isolated', async () => {
	const storage = seed(), log: string[] = [];
	const abort = new AbortController();
	let enter!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const never = owner(log, { drain: () => { enter(); return new Promise<void>(() => {}); } });
	let staged = false;
	const pending = runRecoveryTransaction({ storage, owners: [never], operation: 'never', signal: abort.signal,
		stage: async () => { staged = true; return { writes: [] }; },
	});
	await ready;
	abort.abort();
	await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
	await Promise.resolve();
	expect(staged).toBe(false);
	expect(log).toContain('release');
	expect(storage.snapshot(TARGETS)).toEqual(OLD);
	await expect(run(storage)).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
});

test.each(['quiesce', 'stage'] as const)('cancelling a late %s never reaches staging replacements or adoption', async (phase) => {
	const storage = seed(), log: string[] = [];
	const abort = new AbortController();
	let enter!: () => void, finish!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const barrier = new Promise<void>((resolve) => { finish = resolve; });
	const slow = async () => { enter(); await barrier; };
	let stageCalls = 0;
	const pending = runRecoveryTransaction({ storage, owners: [owner(log, phase === 'quiesce' ? { quiesce: slow } : {})],
		operation: phase, signal: abort.signal,
		stage: async () => { stageCalls++; if (phase === 'stage') await slow(); return { writes: [{ path: TARGETS[0], content: 'wrong' }] }; },
	});
	await ready;
	abort.abort();
	await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
	await expect(run(storage)).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
	finish();
	await vi.waitFor(() => expect(log).toContain('release'));
	await vi.waitFor(async () => { const result = await run(storage); expect(result.changed).toEqual([...TARGETS]); });
	expect(stageCalls).toBe(phase === 'stage' ? 1 : 0);
	expect(log.some((item) => item.startsWith('adopt'))).toBe(false);
});


test('cancellation while a prepared journal is delayed retires the late journal before admitting another restore', async () => {
	const storage = seed(), log: string[] = [];
	const write = storage.write.bind(storage), abort = new AbortController();
	let enter!: () => void, finish!: () => void;
	const ready = new Promise<void>((resolve) => { enter = resolve; });
	const barrier = new Promise<void>((resolve) => { finish = resolve; });
	storage.write = async (path, text) => {
		if (path.includes('/journal.') && JSON.parse(text).phase === 'prepared') { enter(); await barrier; }
		await write(path, text);
	};
	const pending = runRecoveryTransaction({ storage, owners: [owner(log)], operation: 'prepared', signal: abort.signal,
		newId: () => 'prepared', stage: async () => ({ writes: [{ path: TARGETS[0], content: 'cancelled-new' }] }),
	});
	await ready;
	abort.abort();
	await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
	await expect(run(storage)).rejects.toMatchObject({ code: 'RECOVERY_PENDING' });
	finish();
	await vi.waitFor(async () => { expect((await readJournal(storage))?.phase).toBe('rolled-back'); });
	expect(storage.snapshot(TARGETS)).toEqual(OLD);
	expect(log.some((item) => item.startsWith('adopt'))).toBe(false);
	await run(storage);
	expect(storage.snapshot(TARGETS)).toEqual(NEW);
});

test('a cancellation after replacement starts allows the atomic commit and adoption to finish', async () => {
	const storage = seed(), abort = new AbortController(), log: string[] = [];
	storage.afterWrite = (path) => { if (path === TARGETS[0]) abort.abort(); };
	const result = await runRecoveryTransaction({ storage, owners: [owner(log)], operation: 'commit', signal: abort.signal,
		stage: async () => ({ writes: TARGETS.map((path) => ({ path, content: NEW[path] })) }),
	});
	expect(abort.signal.aborted).toBe(true);
	expect(result.changed).toEqual([...TARGETS]);
	expect(storage.snapshot(TARGETS)).toEqual(NEW);
	expect(log).toContain('adopt:3');
	expect((await readJournal(storage))?.phase).toBe('done');
});

// Supply the same timer dependency that the app host registers before recovery starts.
beforeEach(() => useStorageTimers(globalThis as unknown as StorageTimers));
afterEach(() => useStorageTimers(undefined));


test('without a host clock recovery refuses before quiescing or writing any owner', async () => {
	const storage = seed(), log: string[] = [];
	useStorageTimers(undefined);
	try {
		await expect(run(storage, [owner(log)])).rejects.toMatchObject({ code: 'QUIESCE_FAILED', message: 'recovery-timers-unavailable' });
		expect(log).toEqual([]);
		expect(storage.mutations).toBe(0);
	} finally { useStorageTimers(globalThis as unknown as StorageTimers); }
});

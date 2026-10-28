import { ensureDirectory } from './durable-state';
import {
	JOURNAL_SLOTS,
	RECOVERY_ROOT,
	RecoveryError,
	TERMINAL_PHASES,
	isRecoveryJournal,
	isSafeRelativePath,
	type RecoveryEntry,
	type RecoveryJournal,
	type RecoveryOutcome,
	type RecoveryOwner,
	type RecoveryPhase,
	type RecoveryResult,
	type RecoveryStorage,
	type StagedWrite,
} from './recovery-contracts';

/** Admission gate for readers of recovered files: held until recovery finished or while a hold is unresolved. */
export class RecoveryGate {
	private reason?: RecoveryError;
	private waiters: Array<() => void> = [];
	get held(): boolean {
		return this.reason !== undefined;
	}
	hold(reason: RecoveryError): void {
		this.reason = reason;
	}
	release(): void {
		this.reason = undefined;
		for (const waiter of this.waiters.splice(0)) waiter();
	}
	assertOpen(): void {
		if (this.reason) throw this.reason;
	}
	whenOpen(): Promise<void> {
		if (!this.reason) return Promise.resolve();
		return new Promise((resolve) => this.waiters.push(resolve));
	}
}

export async function sha256(text: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
const digestOf = async (text: string | null) => (text === null ? null : sha256(text));

/** Missing is `null`; an unreadable file rejects (unreadable is never evidence of absence). */
export async function readOrNull(storage: RecoveryStorage, path: string): Promise<string | null> {
	return (await storage.exists(path)) ? storage.read(path) : null;
}

async function writeVerified(storage: RecoveryStorage, path: string, text: string): Promise<void> {
	try {
		await ensureDirectory(storage, path.split('/').slice(0, -1).join('/'));
		await storage.write(path, text);
		if ((await storage.read(path)) !== text) throw new Error('verification mismatch');
	} catch (cause) {
		throw new RecoveryError('WRITE_FAILED', `write-failed:${path}`, { path }, { cause });
	}
}
async function replace(storage: RecoveryStorage, path: string, text: string | null): Promise<void> {
	if (text === null) {
		try {
			if (await storage.exists(path)) await storage.remove(path);
			if (await storage.exists(path)) throw new Error('still present');
		} catch (cause) {
			throw new RecoveryError('WRITE_FAILED', `remove-failed:${path}`, { path }, { cause });
		}
		return;
	}
	await writeVerified(storage, path, text);
}

/** Highest-seq valid journal. Two alternating slots mean a torn write only ever damages the newest phase. */
export async function readJournal(storage: RecoveryStorage): Promise<RecoveryJournal | undefined> {
	let best: RecoveryJournal | undefined;
	let present = 0,
		invalid = 0;
	for (const slot of JOURNAL_SLOTS) {
		if (!(await storage.exists(slot))) continue;
		present++;
		let parsed: unknown;
		try {
			parsed = JSON.parse(await storage.read(slot));
		} catch {
			parsed = undefined;
		}
		if (isRecoveryJournal(parsed)) {
			if (!best || parsed.seq > best.seq) best = parsed;
		} else invalid++;
	}
	// One torn slot with no valid sibling can only be the very first write, before any target was touched.
	if (!best && present === 2 && invalid === 2) throw new RecoveryError('JOURNAL_UNREADABLE');
	return best;
}

async function writeJournal(storage: RecoveryStorage, journal: RecoveryJournal): Promise<void> {
	await writeVerified(storage, JOURNAL_SLOTS[journal.seq % 2]!, JSON.stringify(journal));
}
const advance = (journal: RecoveryJournal, phase: RecoveryPhase, note?: string): RecoveryJournal => ({
	...journal,
	seq: journal.seq + 1,
	phase,
	...(note === undefined ? {} : { note }),
});

async function restore(storage: RecoveryStorage, entry: RecoveryEntry, which: 'old' | 'new'): Promise<void> {
	const want = which === 'old' ? entry.oldDigest : entry.newDigest;
	const copy = which === 'old' ? entry.oldCopy : entry.newCopy;
	const current = await readOrNull(storage, entry.path);
	if ((await digestOf(current)) === want) return;
	if (want === null) return replace(storage, entry.path, null);
	if (!copy || !isSafeRelativePath(copy))
		throw new RecoveryError('UNRECOVERABLE', 'copy-missing', { path: entry.path });
	let text: string | null = null;
	try {
		text = await readOrNull(storage, copy);
	} catch (cause) {
		throw new RecoveryError('UNRECOVERABLE', 'copy-unreadable', { path: entry.path }, { cause });
	}
	if (text === null || (await sha256(text)) !== want)
		throw new RecoveryError('UNRECOVERABLE', 'copy-invalid', { path: entry.path });
	await replace(storage, entry.path, text);
}

async function rollBack(storage: RecoveryStorage, journal: RecoveryJournal): Promise<RecoveryJournal> {
	// The phase the rollback started from survives restarts: a prepared rollback must never clobber a foreign edit.
	const origin = journal.phase === 'rolling-back' ? journal.from : journal.phase;
	let current = journal;
	if (current.phase !== 'rolling-back') {
		current = { ...advance(current, 'rolling-back'), from: origin };
		await writeJournal(storage, current);
	}
	for (const entry of [...current.entries].reverse()) {
		if (origin === 'prepared') {
			const now = await digestOf(await readOrNull(storage, entry.path));
			if (now !== entry.newDigest || entry.newDigest === entry.oldDigest) continue;
		}
		await restore(storage, entry, 'old');
	}
	const finished = advance(current, 'rolled-back');
	await writeJournal(storage, finished);
	return finished;
}
async function rollForward(storage: RecoveryStorage, journal: RecoveryJournal): Promise<void> {
	for (const entry of journal.entries) await restore(storage, entry, 'new');
	await writeJournal(storage, advance(journal, 'done'));
}

/**
 * Startup recovery: run before any owner loads its files. Prepared/committing/rolling-back go fully back to the old
 * version; committed goes fully forward. Repeating it is a no-op once the journal is terminal.
 * Unrecoverable states reject with `UNRECOVERABLE`; the caller keeps its gate held and shows the report.
 */
export async function recoverPending(storage: RecoveryStorage): Promise<RecoveryOutcome> {
	const journal = await readJournal(storage);
	if (!journal || TERMINAL_PHASES.includes(journal.phase)) return { status: 'none' };
	if (journal.phase === 'committed') {
		await rollForward(storage, journal);
		return { status: 'rolled-forward', operationId: journal.operationId };
	}
	await rollBack(storage, journal);
	return { status: 'rolled-back', operationId: journal.operationId };
}

export interface RecoveryTransactionOptions {
	readonly storage: RecoveryStorage;
	/** Every participating owner; all of them are quiesced and drained before the common snapshot. */
	readonly owners: readonly RecoveryOwner[];
	readonly operation: string;
	/**
	 * Runs after all owners are quiet. `read` returns the exact current bytes (null when missing).
	 * `copies` are files kept unchanged but saved as recovery copies. Return `writes: []` for a no-op.
	 */
	readonly stage: (
		read: (path: string) => Promise<string | null>,
	) => Promise<{ writes: readonly StagedWrite[]; copies?: readonly string[] }>;
	readonly gate?: RecoveryGate;
	readonly newId?: () => string;
	readonly now?: () => number;
}
export async function runRecoveryTransaction(options: RecoveryTransactionOptions): Promise<RecoveryResult> {
	const { storage, owners } = options;
	const now = options.now ?? Date.now;
	const operationId = (options.newId ?? (() => crypto.randomUUID()))();
	if (!/^[A-Za-z0-9_-]{1,80}$/.test(operationId)) throw new RecoveryError('PATH_INVALID', 'operation-id');
	const pending = await readJournal(storage);
	if (pending && !TERMINAL_PHASES.includes(pending.phase))
		throw new RecoveryError('RECOVERY_PENDING', 'pending-journal', { operationId: pending.operationId });
	options.gate?.assertOpen();
	// 1. Preflight: nothing is stopped for the user.
	const busy: string[] = [];
	for (const owner of owners) busy.push(...(await owner.preflight()).busy);
	if (busy.length) throw new RecoveryError('BUSY', 'busy', { busy });
	// 2. Quiesce every owner, then strict-drain every owner, before anything is read.
	const quiet: RecoveryOwner[] = [];
	let keepClosed = false;
	/** Hold the gate (start-up stops), keep every owner closed; the next start converges from the journal. */
	const closeFailed = (reason: string, cause: unknown) => {
		keepClosed = true;
		const error = new RecoveryError('UNRECOVERABLE', reason, { operationId }, { cause });
		options.gate?.hold(error);
		return error;
	};
	const releaseAll = async () => {
		const failures: unknown[] = [];
		for (const owner of quiet.splice(0)) await owner.release(operationId).catch((e: unknown) => failures.push(e));
		return failures;
	};
	try {
		for (const owner of owners) {
			try {
				await owner.quiesce(operationId);
				quiet.push(owner);
			} catch (cause) {
				quiet.push(owner);
				throw new RecoveryError('QUIESCE_FAILED', owner.id, { owner: owner.id }, { cause });
			}
		}
		for (const owner of owners) {
			try {
				await owner.drain(operationId);
			} catch (cause) {
				throw new RecoveryError('DRAIN_FAILED', owner.id, { owner: owner.id }, { cause });
			}
		}
		// 3. Common snapshot + staging.
		const read = (path: string) => readOrNull(storage, path);
		const staged = await options.stage(read);
		const writes = new Map<string, string | null>();
		for (const w of staged.writes) {
			if (writes.has(w.path)) throw new RecoveryError('STAGE_INVALID', 'duplicate-path', { path: w.path });
			writes.set(w.path, w.content);
		}
		const paths = [...new Set([...writes.keys(), ...(staged.copies ?? [])])];
		// The journal codec caps entries; refuse an oversized stage before anything is written.
		if (paths.length > 64) throw new RecoveryError('STAGE_INVALID', 'too-many-entries', { count: paths.length });
		const ownerOf = new Map<string, string>();
		for (const path of paths) {
			if (!isSafeRelativePath(path)) throw new RecoveryError('PATH_INVALID', path, { path });
			const matches = owners.filter((o) => o.owns(path));
			if (matches.length !== 1)
				throw new RecoveryError('PATH_NOT_OWNED', path, { path, owners: matches.map((o) => o.id) });
			ownerOf.set(path, matches[0]!.id);
		}
		const entries: RecoveryEntry[] = [];
		for (const owner of owners) {
			if (!owner.validate) continue;
			const changes = [];
			for (const path of paths.filter((p) => owner.owns(p)))
				changes.push({
					path,
					before: await read(path),
					after: writes.has(path) ? writes.get(path)! : await read(path),
				});
			try {
				owner.validate(changes);
			} catch (cause) {
				throw new RecoveryError('STAGE_INVALID', `validate:${owner.id}`, { owner: owner.id }, { cause });
			}
		}
		const olds: Array<string | null> = [],
			news: Array<string | null> = [];
		for (const [index, path] of paths.entries()) {
			const before = await read(path);
			const after = writes.has(path) ? writes.get(path)! : before;
			olds.push(before);
			news.push(after);
			entries.push({
				path,
				owner: ownerOf.get(path)!,
				oldDigest: await digestOf(before),
				newDigest: await digestOf(after),
				...(before === null ? {} : { oldCopy: `${RECOVERY_ROOT}/${operationId}/old-${index}.txt` }),
				...(after === null || after === before
					? {}
					: { newCopy: `${RECOVERY_ROOT}/${operationId}/new-${index}.txt` }),
			});
		}
		const changedEntries = entries.filter((e) => e.oldDigest !== e.newDigest);
		if (!changedEntries.length && !staged.copies?.length)
			return { operationId, changed: [], copied: [], noop: true };
		// 4. Verified recovery copies, then the journal; only then any target is touched.
		for (const [index, entry] of entries.entries()) {
			if (entry.oldCopy) await writeVerified(storage, entry.oldCopy, olds[index]!);
			if (entry.newCopy) await writeVerified(storage, entry.newCopy, news[index]!);
		}
		const lastSeq = pending?.seq ?? 0;
		let journal: RecoveryJournal = {
			format: 1,
			seq: lastSeq + 1,
			operationId,
			operation: options.operation,
			phase: 'prepared',
			entries,
			createdAt: now(),
		};
		await writeJournal(storage, journal);
		// Source drift between the snapshot and the first replacement aborts without writing.
		for (const [index, entry] of entries.entries()) {
			if ((await digestOf(await read(entry.path))) !== entry.oldDigest) {
				await rollBack(storage, journal);
				throw new RecoveryError('SOURCE_DRIFT', entry.path, { path: entry.path, index });
			}
		}
		// 5. Replace.
		journal = advance(journal, 'committing');
		// A `committing` write that lands and then fails (read-back EBUSY/EPERM) would make the next start roll back
		// unconditionally: owners must stay closed and start-up must stop, exactly as after the first replacement.
		try {
			await writeJournal(storage, journal);
		} catch (cause) {
			throw closeFailed('journal-committing-failed', cause);
		}
		try {
			for (const [index, entry] of entries.entries())
				if (entry.oldDigest !== entry.newDigest) await replace(storage, entry.path, news[index]!);
		} catch (error) {
			try {
				await rollBack(storage, journal);
			} catch (cause) {
				throw closeFailed('rollback-failed', cause);
			}
			throw error;
		}
		journal = advance(journal, 'committed');
		// From here the targets may be new while the journal still says committing: a failed journal write must not
		// reopen owners or let start-up continue, or the next restart would roll back work done in between.
		try {
			await writeJournal(storage, journal);
		} catch (cause) {
			throw closeFailed('journal-committed-failed', cause);
		}
		// 6. Adopt: reload memory, queues and baselines. A failure keeps the gate held; restart rolls forward.
		const changed = changedEntries.map((e) => e.path);
		for (const owner of owners) {
			const mine = changed.filter((p) => owner.owns(p));
			if (!mine.length) continue;
			try {
				await owner.adopt(operationId, { paths: mine });
			} catch (cause) {
				const error = new RecoveryError('ADOPT_FAILED', owner.id, { owner: owner.id }, { cause });
				keepClosed = true;
				options.gate?.hold(error);
				throw error;
			}
		}
		try {
			await writeJournal(storage, advance(journal, 'done'));
		} catch (cause) {
			throw closeFailed('journal-done-failed', cause);
		}
		return {
			operationId,
			changed,
			copied: entries.filter((e) => e.oldDigest === e.newDigest).map((e) => e.path),
			noop: false,
		};
	} finally {
		// Owners stay closed after a failed adoption: only a restart (journal recovery) may reopen them.
		if (!keepClosed && !options.gate?.held) await releaseAll();
	}
}

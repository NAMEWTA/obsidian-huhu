import { createStore } from 'zustand/vanilla';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import { normalizeWebUrl } from '../../../shared/web-url';
import {
	CLIPBOARD_CLEAR_MS, SafeError, createEntry, editEntry,
	deleteEntry as moveToTrash, restoreEntry as restoreFromTrash, pruneExpiredTrash, makePayload,
	validateEntryInput, validateMasterPassword, validatePayload, validateNewRelations, renameEntryTag, tagName,
	type EntryInput, type SafeEntry, type SafeErrorCode, type SafePayload,
} from '../core/model';
import { emptyMergeSummary, mergeChangesAnything, mergeEntries, type MergeSummary } from '../core/merge';
import { DEFAULT_LOCK_POLICY, sameLockPolicy, type LockPolicy } from '../core/policy';
import {
	createContainer, openContainer, sealPayload, parseEnvelope,
	changePassword as rotatePassword,
	type CreatedContainer, type SafeEnvelope,
} from '../platform/crypto';
import type { SafeClipboard, SafeDesktopActions } from '../platform/desktop/actions';
import { generatePassword } from '../platform/password';
import { CipherRepository, SAFE_MAIN_PATH } from './cipher-repository';

export interface SafeState {
	status: 'loading' | 'absent' | 'locked' | 'unlocked' | 'error';
	entries: SafeEntry[];
	busy: boolean;
	error: SafeErrorCode | null;
	generation: number;
	/** True once this session wrote an older vault back in the current schema (an encrypted copy was kept first). */
	upgraded: boolean;
}

/** The lock rules the user chose. Changes apply to a running session at once. */
export interface LockPolicySource {
	get(): LockPolicy;
	subscribe(listener: () => void): () => void;
}

export interface SafeServiceOptions {
	repository: CipherRepository;
	queue: WriteQueue;
	timers: { set(callback: () => void, delay: number): number; clear(id: number): void };
	actions(ownerWindow: Window): SafeDesktopActions;
	now?: () => number;
	policy?: LockPolicySource;
}

export type LeaveReason = 'switch' | 'close';

interface PendingImport {
	token: string;
	generation: number;
	incoming: { read(this: void): SafeEntry[]; clear(this: void): void };
}

interface PendingRestore {
	token: string;
	raw: string;
	expectedRaw: string | null;
	generation: number;
}

interface ClipboardCopy {
	id: number;
	fingerprint: string;
	port: SafeClipboard;
}

/** One in-memory session for every safe page in this vault. Never persisted or exposed as an API. */
export class SafeService {
	readonly store = createStore<SafeState>(() => ({
		status: 'loading', entries: [], busy: false, error: null, generation: 0, upgraded: false,
	}));
	private key?: CryptoKey;
	private envelope?: SafeEnvelope;
	private raw?: string;
	private pendingPayload?: SafePayload;
	private pendingCreation?: CreatedContainer;
	private pendingRestore?: PendingRestore;
	private restoreSequence = 0;
	private restoreClear?: () => void;
	private pendingImport?: PendingImport;
	private importSequence = 0;
	private importClear?: () => void;
	/** The opened vault used an older schema: the next write keeps the original file as its own copy first. */
	private upgradePending = false;
	private policyCache?: LockPolicy;
	private readonly policyListeners = new Set<() => void>();
	private unsubscribePolicy?: () => void;
	private readonly sensitiveInputs = new Set<() => void>();
	private expiresAt = 0;
	private lastActivity = 0;
	private idleTimer?: number;
	private clipboardTimer?: number;
	private clipboardCopy?: ClipboardCopy;
	private clipboardSequence = 0;
	private clipboardTail: Promise<void> = Promise.resolve();
	private readonly pending = new Map<number, number>();
	private disposed = false;
	private readonly now: () => number;

	constructor(private readonly options: SafeServiceOptions) {
		this.now = options.now ?? Date.now;
		this.unsubscribePolicy = options.policy?.subscribe(() => this.policyChanged());
	}

	/** A stable reference while the rules do not change, so views can subscribe to it. */
	lockPolicy(): LockPolicy {
		const next = this.options.policy?.get() ?? DEFAULT_LOCK_POLICY;
		if (this.policyCache && sameLockPolicy(this.policyCache, next)) return this.policyCache;
		this.policyCache = next;
		return next;
	}

	subscribePolicy(listener: () => void): () => void {
		this.policyListeners.add(listener);
		return () => { this.policyListeners.delete(listener); };
	}

	/** A changed idle time applies to the running session from its last activity. */
	private policyChanged(): void {
		if (!this.disposed && this.store.getState().status === 'unlocked' && this.expiresAt !== 0) {
			this.armIdle();
			this.checkDeadline();
		}
		for (const listener of [...this.policyListeners]) listener();
	}

	/**
	 * A safe page left the screen (`switch`: another page or tab was shown, or its window was hidden) or was closed.
	 * Whether that locks is the user's choice; otherwise only the idle deadline is enforced.
	 */
	leave(reason: LeaveReason): void {
		const policy = this.lockPolicy();
		if (reason === 'close' ? policy.lockOnClose : policy.lockOnSwitch) this.lock();
		else this.checkDeadline();
	}

	/** Includes the queue barrier: a previous instance may still be publishing admitted ciphertext. */
	async probe(): Promise<void> {
		if (this.disposed) return;
		this.lock();
		const generation = this.generation();
		this.store.setState({ status: 'loading' });
		try {
			await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
				this.assertCurrent(generation);
				const main = await this.options.repository.readCurrent();
				const backup = main === null ? await this.options.repository.readBackup() : null;
				this.assertCurrent(generation);
				if (main !== null) parseEnvelope(main);
				this.store.setState({
					status: main === null && backup === null ? 'absent' : 'locked',
					error: main === null && backup !== null ? 'missing' : null,
				});
			}));
		} catch (error) {
			if (this.isCurrent(generation)) this.store.setState({ status: 'error', error: this.errorCode(error) });
		}
	}

	async create(password: string): Promise<void> {
		validateMasterPassword(password);
		this.assertCurrent(this.generation());
		if (this.store.getState().status !== 'absent') throw new SafeError('exists');
		const generation = this.generation();
		const secret = this.holdSensitive(password);
		password = '';
		await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			this.assertCurrent(generation);
			await this.prepareCreation(secret.read(), generation);
			secret.clear();
			const raw = this.pendingCreation?.raw;
			if (raw === undefined) throw new SafeError('canceled');
			// Everything after admission can finish while locked. The queue holds only ciphertext.
			try {
				await this.options.repository.create(raw);
				this.assertCurrent(generation);
				const created = this.pendingCreation;
				if (!created) throw new SafeError('canceled');
				this.key = created.key;
				this.envelope = created.envelope;
				this.raw = raw;
				this.store.setState({ status: 'unlocked', entries: [], error: null });
				this.touch();
			} finally {
				this.pendingCreation = undefined;
			}
		})).finally(secret.clear);
	}

	private async prepareCreation(password: string, generation: number): Promise<void> {
		const created = await createContainer(password, makePayload([]));
		this.assertCurrent(generation);
		this.pendingCreation = created;
	}

	async unlock(password: string): Promise<void> {
		this.assertCurrent(this.generation());
		this.lock();
		const generation = this.generation();
		const secret = this.holdSensitive(password);
		password = '';
		await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			this.assertCurrent(generation);
			const raw = await this.options.repository.readCurrent();
			if (raw === null) throw new SafeError('missing');
			const opened = await openContainer(raw, secret.read());
			secret.clear();
			this.assertCurrent(generation);
			this.key = opened.key;
			this.envelope = opened.envelope;
			this.raw = raw;
			this.upgradePending = opened.upgradedFrom !== null;
			this.store.setState({ status: 'unlocked', entries: opened.payload.entries, error: null });
			this.touch();
		})).finally(secret.clear);
		if (!this.isCurrent(generation)) return;
		// An older vault is shown from its upgraded in-memory form while the file is rewritten; a failure stays visible and
		// is retried by the next write, which then also keeps the original as its own copy.
		if (this.upgradePending) await this.mutate(entries => makePayload(entries)).catch(() => {});
		if (!this.isCurrent(generation)) return;
		const entries = this.store.getState().entries;
		if (pruneExpiredTrash(makePayload(entries), this.now()).entries.length !== entries.length) {
			// A cleanup failure must remain visible without denying access to authenticated records.
			await this.mutate(current => pruneExpiredTrash(makePayload(current), this.now())).catch(() => {});
		}
	}

	lock(): void {
		const creationAdmitted = this.pendingCreation !== undefined;
		this.clearIdleTimer();
		this.key = undefined;
		this.envelope = undefined;
		this.raw = undefined;
		this.pendingPayload = undefined;
		this.pendingCreation = undefined;
		this.cancelRestore();
		this.cancelImport();
		for (const clear of this.sensitiveInputs) clear();
		this.sensitiveInputs.clear();
		this.upgradePending = false;
		this.expiresAt = 0;
		this.lastActivity = 0;
		const state = this.store.getState();
		this.store.setState({
			status: state.status === 'absent' && !creationAdmitted ? 'absent' : 'locked',
			entries: [], busy: false, error: null, generation: state.generation + 1, upgraded: false,
		});
		this.clearClipboardTimer();
		void this.enqueueClipboard(() => this.clearCopiedText()).catch(() => {});
	}

	dispose(): void {
		this.disposed = true;
		this.unsubscribePolicy?.();
		this.unsubscribePolicy = undefined;
		this.policyListeners.clear();
		this.lock();
	}

	clearError(): void { this.store.setState({ error: null }); }
	cancelRestore(): void {
		this.pendingRestore = undefined;
		this.restoreSequence++;
		this.restoreClear?.();
		this.restoreClear = undefined;
	}

	/** Called on focus/resume and before each sensitive action; timer throttling cannot extend the session. */
	checkDeadline(): boolean {
		if (this.disposed || this.store.getState().status !== 'unlocked') return false;
		if (this.now() >= this.expiresAt) { this.lock(); return false; }
		return true;
	}

	touch(): void {
		if (this.disposed || this.store.getState().status !== 'unlocked') return;
		if (this.expiresAt !== 0 && !this.checkDeadline()) return;
		this.lastActivity = this.now();
		this.armIdle();
	}

	/** Never: no deadline and no timer. Otherwise the deadline is the last activity plus the chosen idle time. */
	private armIdle(): void {
		this.clearIdleTimer();
		const idle = this.lockPolicy().idleMs;
		if (idle === null) {
			this.expiresAt = Number.POSITIVE_INFINITY;
			return;
		}
		this.expiresAt = this.lastActivity + idle;
		this.idleTimer = this.options.timers.set(() => { this.checkDeadline(); }, Math.max(0, this.expiresAt - this.now()));
	}

	saveEntry(input: EntryInput, base?: SafeEntry, newEntryId?: string): Promise<void> {
		const value = validateEntryInput(input);
		const previous = base ? structuredClone(base) : undefined;
		return this.mutate(entries => {
			if (!previous) {
				const created = createEntry(value, newEntryId ?? crypto.randomUUID(), this.now());
				validateNewRelations(entries, created);
				return makePayload([...entries, created]);
			}
			const current = this.currentEntry(entries, previous);
			const edited = editEntry(current, value, this.now());
			validateNewRelations(entries, edited, current);
			return makePayload(entries.map(entry => entry.id === current.id ? edited : entry));
		});
	}

	generatePassword(): string {
		this.assertOpen(this.generation());
		this.touch();
		return generatePassword();
	}

	renameTag(from: string, to: string | null): Promise<void> {
		const name = tagName(from);
		const replacement = to === null ? null : tagName(to);
		return this.mutate(entries => makePayload(renameEntryTag(entries, name, replacement, this.now())));
	}

	trashEntry(base: SafeEntry): Promise<void> {
		return this.updateEntry(base, entry => moveToTrash(entry, this.now()));
	}

	restoreEntry(base: SafeEntry): Promise<void> {
		return this.updateEntry(base, entry => restoreFromTrash(entry, this.now()));
	}

	deleteEntry(base: SafeEntry): Promise<void> {
		const previous = { ...base };
		return this.mutate(entries => {
			const current = this.currentEntry(entries, previous);
			if (current.deletedAt === null) throw new SafeError('invalid-entry');
			return makePayload(entries.filter(entry => entry.id !== current.id));
		});
	}

	private updateEntry(base: SafeEntry, update: (entry: SafeEntry) => SafeEntry): Promise<void> {
		const previous = { ...base };
		return this.mutate(entries => {
			const current = this.currentEntry(entries, previous);
			return makePayload(entries.map(entry => entry.id === current.id ? update(entry) : entry));
		});
	}

	private currentEntry(entries: SafeEntry[], base: SafeEntry): SafeEntry {
		const current = entries.find(entry => entry.id === base.id);
		if (!current) throw new SafeError('not-found');
		if (JSON.stringify(current) !== JSON.stringify(base)) throw new SafeError('stale-entry');
		return current;
	}

	private async prepareChange(change: (entries: SafeEntry[]) => SafePayload | undefined, generation: number) {
		this.assertOpen(generation);
		const changed = change(this.store.getState().entries);
		if (changed === undefined) return undefined;
		const payload = validatePayload(changed);
		const sealed = await sealPayload(payload, this.key!, this.envelope!);
		this.assertOpen(generation);
		this.pendingPayload = payload;
		return { ...sealed, expectedRaw: this.raw! };
	}

	/**
	 * Every write goes through here. `keep` names an encrypted copy of the file this change starts from that must stay
	 * on disk (a merge import); while an older vault is still waiting to be upgraded the copy is always kept. A change
	 * that returns nothing writes nothing.
	 */
	private async mutate(change: ((entries: SafeEntry[]) => SafePayload | undefined) | undefined, keep?: 'preimport'): Promise<void> {
		const generation = this.generation();
		this.assertOpen(generation);
		const input = this.holdSensitive(change!);
		change = undefined;
		await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			const prepared = await this.prepareChange(input.read(), generation);
			input.clear();
			if (!prepared) return;
			try {
				await this.commitPrepared(prepared.raw, prepared.expectedRaw, keep);
				this.assertOpen(generation);
				if (!this.pendingPayload) throw new SafeError('canceled');
				this.raw = prepared.raw;
				this.envelope = prepared.envelope;
				const upgraded = this.upgradePending;
				this.upgradePending = false;
				this.store.setState({ entries: this.pendingPayload.entries, error: null, upgraded: upgraded || this.store.getState().upgraded });
			} finally {
				this.pendingPayload = undefined;
			}
		})).finally(input.clear);
	}

	private commitPrepared(raw: string, expectedRaw: string, keep?: 'preimport'): Promise<void> {
		const kind = this.upgradePending ? 'preupgrade' : keep;
		return kind ? this.options.repository.commitKeeping(kind, raw, expectedRaw) : this.options.repository.commit(raw, expectedRaw);
	}

	async changePassword(oldPassword: string, newPassword: string): Promise<void> {
		validateMasterPassword(newPassword);
		const generation = this.generation();
		this.assertOpen(generation);
		const secret = this.holdSensitive([oldPassword, newPassword] as const);
		oldPassword = '';
		newPassword = '';
		await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			this.assertOpen(generation);
			const expectedRaw = this.raw!;
			const raw = (await rotatePassword(expectedRaw, secret.read()[0], secret.read()[1], makePayload(this.store.getState().entries))).raw;
			secret.clear();
			this.assertOpen(generation);
			// The replacement key is never installed: success always requires a fresh unlock.
			await this.commitPrepared(raw, expectedRaw);
			if (this.isCurrent(generation)) this.lock();
		})).finally(secret.clear);
	}

	async pickBackup(ownerWindow: Window): Promise<string | null> {
		const generation = this.generation();
		return this.operation(generation, async () => {
			this.assertSession(generation);
			const raw = await this.options.actions(ownerWindow).pickBackup();
			this.assertSession(generation);
			return raw;
		});
	}

	async prepareRestore(raw: string, password: string): Promise<{ token: string; entryCount: number }> {
		const generation = this.generation();
		this.cancelRestore();
		const sequence = this.restoreSequence;
		const secret = this.holdSensitive(password);
		this.restoreClear = secret.clear;
		password = '';
		return this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			this.assertSession(generation);
			const expectedRaw = await this.options.repository.readCurrent();
			const opened = await openContainer(raw, secret.read());
			secret.clear();
			this.assertSession(generation);
			if (sequence !== this.restoreSequence) throw new SafeError('canceled');
			const token = crypto.randomUUID();
			this.pendingRestore = { token, raw, expectedRaw, generation };
			return { token, entryCount: opened.payload.entries.length };
		})).finally(() => {
			secret.clear();
			if (sequence === this.restoreSequence) this.restoreClear = undefined;
		});
	}

	async commitRestore(token: string): Promise<void> {
		const generation = this.generation();
		await this.operation(generation, () => this.options.queue.run(SAFE_MAIN_PATH, async () => {
			this.assertSession(generation);
			const prepared = this.pendingRestore;
			if (!prepared || prepared.token !== token || prepared.generation !== generation) throw new SafeError('canceled');
			this.pendingRestore = undefined;
			// Admission ends cancellation: only these authenticated ciphertext bytes may finish after lock.
			await this.options.repository.restore(prepared.raw, prepared.expectedRaw);
			if (this.isCurrent(generation)) this.lock();
		}));
	}

	/**
	 * Merge import, step one: authenticate the backup with its own master password and report what a merge would do.
	 * The backup's records stay in memory (cleared on lock or cancel); nothing is written yet.
	 */
	async prepareImport(raw: string, password: string): Promise<{ token: string; entryCount: number; summary: MergeSummary }> {
		const generation = this.generation();
		this.assertOpen(generation);
		this.cancelImport();
		const sequence = this.importSequence;
		const secret = this.holdSensitive(password);
		this.importClear = secret.clear;
		password = '';
		return this.operation(generation, async () => {
			this.assertOpen(generation);
			const opened = await openContainer(raw, secret.read());
			secret.clear();
			this.assertOpen(generation);
			if (sequence !== this.importSequence) throw new SafeError('canceled');
			const incoming = this.holdSensitive(opened.payload.entries);
			const preview = mergeEntries(this.store.getState().entries, incoming.read(), { now: this.now(), newId: () => crypto.randomUUID() });
			const token = crypto.randomUUID();
			this.pendingImport = { token, generation, incoming };
			this.importClear = incoming.clear;
			return { token, entryCount: opened.payload.entries.length, summary: preview.summary };
		}).finally(() => {
			secret.clear();
			if (sequence === this.importSequence && !this.pendingImport) this.importClear = undefined;
		});
	}

	/**
	 * Merge import, step two: merge the verified backup into the current safe as it is now. The file this starts from
	 * is first kept as its own encrypted copy (`preimport-*.enc`); nothing is written when the backup holds nothing new.
	 */
	async commitImport(token: string): Promise<MergeSummary> {
		const generation = this.generation();
		this.assertOpen(generation);
		const prepared = this.pendingImport;
		if (!prepared || prepared.token !== token || prepared.generation !== generation) throw new SafeError('canceled');
		this.pendingImport = undefined;
		let summary = emptyMergeSummary();
		try {
			await this.mutate(entries => {
				const merged = mergeEntries(entries, prepared.incoming.read(), { now: this.now(), newId: () => crypto.randomUUID() });
				summary = merged.summary;
				return mergeChangesAnything(summary) ? makePayload(merged.entries) : undefined;
			}, 'preimport');
		} finally {
			prepared.incoming.clear();
			this.importClear = undefined;
		}
		return summary;
	}

	cancelImport(): void {
		this.pendingImport = undefined;
		this.importSequence++;
		this.importClear?.();
		this.importClear = undefined;
	}

	async exportBackup(ownerWindow: Window): Promise<boolean> {
		const generation = this.generation();
		this.assertOpen(generation);
		return this.operation(generation, async () => {
			const actions = this.options.actions(ownerWindow);
			const destination = await actions.pickExport();
			this.assertOpen(generation);
			if (destination === null) return false;
			await this.options.queue.run(SAFE_MAIN_PATH, async () => {
				this.assertOpen(generation);
				const raw = this.raw!;
				if (await this.options.repository.readCurrent() !== raw) throw new SafeError('changed');
				this.assertOpen(generation);
				await actions.exportCiphertext(destination, raw);
			});
			return true;
		});
	}

	async openUrl(input: string, ownerWindow: Window): Promise<void> {
		const generation = this.generation();
		await this.operation(generation, async () => {
			this.assertOpen(generation);
			const url = normalizeWebUrl(input);
			if (!url || !/^https?:\/\//i.test(url)) throw new SafeError('invalid-url');
			await this.options.actions(ownerWindow).openUrl(url);
		});
	}

	async copy(value: string, ownerWindow: Window): Promise<void> {
		const generation = this.generation();
		const secret = this.holdSensitive(value);
		value = '';
		await this.operation(generation, () => this.enqueueClipboard(async () => {
			this.assertOpen(generation);
			const port = this.options.actions(ownerWindow).clipboard;
			const fingerprint = await this.fingerprint(secret.read());
			this.assertOpen(generation);
			const copy = { id: ++this.clipboardSequence, fingerprint, port };
			try { await port.writeText(secret.read()); }
			catch { throw new SafeError('clipboard'); }
			finally { secret.clear(); }
			this.clearClipboardTimer();
			this.clipboardCopy = copy;
			if (!this.isCurrent(generation) || !this.checkDeadline()) {
				await this.clearCopiedText();
				throw new SafeError('canceled');
			}
			this.clipboardTimer = this.options.timers.set(() => {
				void this.enqueueClipboard(() => this.clearCopiedText(copy.id)).catch(() => {});
			}, CLIPBOARD_CLEAR_MS);
		})).finally(secret.clear);
	}

	private async fingerprint(text: string): Promise<string> {
		const bytes = new TextEncoder().encode(text);
		try {
			const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
			return Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
		} finally { bytes.fill(0); }
	}

	/** Clipboard APIs have no compare-and-swap; two reads narrow, but cannot remove, external races. */
	private async clearCopiedText(id = this.clipboardCopy?.id): Promise<void> {
		const copy = this.clipboardCopy;
		if (!copy || copy.id !== id) return;
		try {
			if (await this.fingerprint(await copy.port.readText()) !== copy.fingerprint) return;
			if (this.clipboardCopy !== copy) return;
			if (await this.fingerprint(await copy.port.readText()) !== copy.fingerprint) return;
			if (this.clipboardCopy === copy) await copy.port.writeText('');
		} finally {
			if (this.clipboardCopy === copy) this.clipboardCopy = undefined;
		}
	}

	private enqueueClipboard(run: () => Promise<void>): Promise<void> {
		const result = this.clipboardTail.then(run, run);
		this.clipboardTail = result.catch(() => {});
		return result;
	}

	private clearIdleTimer(): void {
		if (this.idleTimer !== undefined) this.options.timers.clear(this.idleTimer);
		this.idleTimer = undefined;
	}
	private clearClipboardTimer(): void {
		if (this.clipboardTimer !== undefined) this.options.timers.clear(this.clipboardTimer);
		this.clipboardTimer = undefined;
	}
	private generation(): number { return this.store.getState().generation; }
	private isCurrent(generation: number): boolean { return !this.disposed && this.generation() === generation; }
	private assertCurrent(generation: number): void {
		if (!this.isCurrent(generation)) throw new SafeError('canceled');
	}
	private assertOpen(generation: number): void {
		this.assertCurrent(generation);
		if (!this.checkDeadline() || !this.key || !this.envelope || this.raw === undefined) throw new SafeError('locked');
	}
	private assertSession(generation: number): void {
		this.assertCurrent(generation);
		if (this.store.getState().status === 'unlocked') this.assertOpen(generation);
	}
	private errorCode(error: unknown): SafeErrorCode { return error instanceof SafeError ? error.code : 'storage'; }

	/** Queued work captures a clearable cell, so locking also drops inputs waiting behind slow IO. */
	private holdSensitive<T>(value: T): { read(this: void): T; clear(this: void): void } {
		let current: T | undefined = value;
		const clear = () => { current = undefined; this.sensitiveInputs.delete(clear); };
		this.sensitiveInputs.add(clear);
		return {
			read: () => { if (current === undefined) throw new SafeError('canceled'); return current; },
			clear,
		};
	}

	private async operation<T>(generation: number, run: () => Promise<T>): Promise<T> {
		this.assertCurrent(generation);
		this.pending.set(generation, (this.pending.get(generation) ?? 0) + 1);
		this.store.setState({ busy: true, error: null });
		try { return await run(); }
		catch (error) {
			const code = this.errorCode(error);
			if (this.isCurrent(generation) && code !== 'canceled') this.store.setState({ error: code });
			throw new SafeError(code);
		} finally {
			const count = (this.pending.get(generation) ?? 1) - 1;
			if (count === 0) this.pending.delete(generation);
			else this.pending.set(generation, count);
			if (this.isCurrent(generation)) this.store.setState({ busy: count > 0 });
		}
	}
}

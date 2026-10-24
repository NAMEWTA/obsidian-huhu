import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { WriteQueue } from '../../../shared/storage/write-queue';
import { CLIPBOARD_CLEAR_MS, TRASH_RETENTION_MS, SafeError, createEntry, deleteEntry, makePayload, type CredentialInput, type EntryInput } from '../core/model';
import { DEFAULT_LOCK_POLICY, lockPolicyOf, type LockPolicy, type LockSettings } from '../core/policy';
import { createContainer, openContainer, parseEnvelope } from '../platform/crypto';
import type { CipherFiles } from '../platform/desktop/cipher-files';
import type { SafeDesktopActions } from '../platform/desktop/actions';
import { CipherRepository, SAFE_MAIN_PATH } from './cipher-repository';
import { SafeService, type LockPolicySource, type SafeServiceOptions } from './safe-service';

const MAIN = 'vault.enc';
const BACKUP = 'vault.enc.backup';
const master = 'a long test master password';
const backupPassword = 'a different backup password';
const initialTime = Date.parse('2026-10-21T00:00:00.000Z');
const ownerWindow = {} as Window;
const IDLE_LOCK_MS = DEFAULT_LOCK_POLICY.idleMs!;
const credential = (n: number, extra: Partial<CredentialInput> = {}): CredentialInput => ({
	id: `c${n.toString(16).padStart(7, '0')}-1111-4111-8111-111111111111`,
	username: ' private-username-sentinel ', password: ' private-password-sentinel ', notes: 'private-notes-sentinel 工作', ...extra,
});
const input: EntryInput = {
	title: 'private-title-sentinel', url: 'https://private-url-sentinel.test', notes: '', icon: null,
	credentials: [credential(1)],
};
const secret = ' private-password-sentinel ';
const v1 = JSON.parse(readFileSync(new URL('../fixtures/v1-vault.json', import.meta.url), 'utf8')) as { master: string; raw: string; entries: Array<Record<string, unknown>> };

/** A policy the test can change while a session is running. */
function policySource(initial: LockPolicy = DEFAULT_LOCK_POLICY) {
	let current = initial;
	const listeners = new Set<() => void>();
	const source: LockPolicySource = { get: () => current, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
	return { source, set: (settings: Partial<LockSettings>) => { current = lockPolicyOf({ idlePreset: '20', idleCustomMinutes: 30, lockOnSwitch: false, lockOnClose: false, ...settings }); for (const listener of [...listeners]) listener(); } };
}

function deferred<T = void>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}

class MemoryCipherFiles implements CipherFiles {
	readonly values = new Map<string, string>();
	readonly publications: string[] = [];
	beforeRead?: (name: string) => Promise<void> | void;
	beforePublish?: (name: string) => Promise<void> | void;
	private next = 0;
	async read(name: string): Promise<string | null> {
		await this.beforeRead?.(name);
		return this.values.get(name) ?? null;
	}
	async stage(raw: string): Promise<string> {
		const name = `.tmp-${++this.next}`;
		this.values.set(name, raw);
		return name;
	}
	async publish(staged: string, name: string): Promise<void> {
		await this.beforePublish?.(name);
		const raw = this.values.get(staged);
		if (raw === undefined) throw new SafeError('storage');
		this.values.set(name, raw);
		this.values.delete(staged);
		this.publications.push(name);
	}
	async discard(staged: string): Promise<void> { this.values.delete(staged); }
}

class Clock {
	now = initialTime;
	private next = 0;
	readonly scheduled = new Map<number, { at: number; callback: () => void }>();
	readonly timers = {
		set: (callback: () => void, delay: number): number => {
			const id = ++this.next;
			this.scheduled.set(id, { at: this.now + delay, callback });
			return id;
		},
		clear: (id: number): void => { this.scheduled.delete(id); },
	};
	advance(delay: number, fire = true): void {
		this.now += delay;
		if (!fire) return;
		for (const [id, timer] of [...this.scheduled]) {
			if (timer.at <= this.now && this.scheduled.delete(id)) timer.callback();
		}
	}
}

const services: SafeService[] = [];
let emptyRaw: string;
let restoreRaw: string;

beforeAll(async () => {
	emptyRaw = (await createContainer(master, makePayload([]))).raw;
	restoreRaw = (await createContainer(backupPassword, makePayload([createEntry(
		{ ...input, title: 'restored entry' }, '11111111-1111-4111-8111-111111111111', initialTime,
	)]))).raw;
});

afterEach(() => {
	for (const service of services.splice(0)) service.dispose();
	vi.restoreAllMocks();
});

async function fixture(raw: string | null = emptyRaw, unlock = true, password = master, policy?: LockPolicySource) {
	const files = new MemoryCipherFiles();
	if (raw !== null) { files.values.set(MAIN, raw); files.values.set(BACKUP, raw); }
	const repository = new CipherRepository(files);
	const queue = new WriteQueue();
	const clock = new Clock();
	const clipboard = { text: '', writes: [] as string[], failNext: false };
	const actions: SafeDesktopActions = {
		pickBackup: vi.fn(async () => null),
		pickExport: vi.fn(async () => null),
		exportCiphertext: vi.fn(async () => {}),
		openUrl: vi.fn(async () => {}),
		clipboard: {
			readText: async () => clipboard.text,
			writeText: async value => {
				if (clipboard.failNext) { clipboard.failNext = false; throw new Error('private-password-sentinel'); }
				clipboard.text = value;
				clipboard.writes.push(value);
			},
		},
	};
	const options: SafeServiceOptions = { repository, queue, timers: clock.timers, actions: () => actions, now: () => clock.now, policy };
	const newService = () => {
		const value = new SafeService(options);
		services.push(value);
		return value;
	};
	const service = newService();
	await service.probe();
	if (raw !== null && unlock) await service.unlock(password);
	return { service, files, repository, queue, clock, clipboard, actions, newService };
}

function blockPrimary(files: MemoryCipherFiles) {
	const entered = deferred();
	const release = deferred();
	files.beforePublish = async name => {
		if (name !== MAIN) return;
		files.beforePublish = undefined;
		entered.resolve();
		await release.promise;
	};
	return { entered: entered.promise, release: () => release.resolve() };
}

describe('safe session and ciphertext lifecycle', () => {
	test.each(['短', ' ', '  e\u0301密🔑'.repeat(40)])('accepts a user-chosen master password throughout create, reopen, change, backup import and restore: %s', async (password) => {
		const { service, files, newService } = await fixture(null);
		await service.create(password);
		await service.saveEntry(input);
		const backup = files.values.get(MAIN)!;
		service.dispose();
		const reopened = newService();
		await reopened.probe();
		await reopened.unlock(password);
		expect(reopened.store.getState().entries[0]!.credentials[0]!.password).toBe(secret);
		const replacement = password.length < 12 ? '新的密🔑'.repeat(40) : '短';
		await reopened.changePassword(password, replacement);
		await reopened.unlock(replacement);
		const imported = await reopened.prepareImport(backup, password);
		expect(imported.entryCount).toBe(1);
		await reopened.commitImport(imported.token);
		reopened.lock();
		const restored = await reopened.prepareRestore(backup, password);
		await reopened.commitRestore(restored.token);
		await reopened.unlock(password);
		expect(reopened.store.getState().entries).toHaveLength(1);
		expect(reopened.store.getState().entries[0]!.credentials[0]!.password).toBe(secret);
	});

	test('creates, saves, edits, locks, reopens and uses the encrypted trash without plaintext persistence', async () => {
		const { service, files } = await fixture(null);
		expect(service.store.getState().status).toBe('absent');
		await service.create(master);
		await service.saveEntry(input);
		let entry = service.store.getState().entries[0]!;
		expect(entry.credentials[0]!.username).toBe(input.credentials[0]!.username);
		await service.saveEntry({ ...input, notes: '更新备注' }, entry);
		entry = service.store.getState().entries[0]!;
		await service.trashEntry(entry);
		expect(service.store.getState().entries[0]!.deletedAt).not.toBeNull();
		service.lock();
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [], busy: false });
		await service.unlock(master);
		entry = service.store.getState().entries[0]!;
		await service.restoreEntry(entry);
		expect(service.store.getState().entries[0]!.deletedAt).toBeNull();
		for (const raw of files.values.values()) {
			for (const marker of ['private-title-sentinel', 'private-url-sentinel', 'private-username-sentinel', 'private-password-sentinel', '更新备注']) expect(raw).not.toContain(marker);
		}
		await service.trashEntry(service.store.getState().entries[0]!);
		await service.deleteEntry(service.store.getState().entries[0]!);
		expect(service.store.getState().entries).toEqual([]);
		expect((await openContainer(files.values.get(MAIN)!, master)).payload.entries).toEqual([]);
	});

	test('serializes concurrent additions against the latest committed state and rejects a stale editor', async () => {
		const { service, files } = await fixture();
		await Promise.all([service.saveEntry(input), service.saveEntry({ ...input, credentials: [credential(2, { username: 'another account' })] })]);
		expect(service.store.getState().entries).toHaveLength(2);
		const firstWindow = { ...service.store.getState().entries[0]! };
		const secondWindow = { ...firstWindow };
		await service.saveEntry({ ...input, notes: 'first window saved' }, firstWindow);
		await expect(service.saveEntry({ ...input, notes: 'stale second window' }, secondWindow)).rejects.toMatchObject({ code: 'stale-entry' });
		expect((await openContainer(files.values.get(MAIN)!, master)).payload.entries[0]!.notes).toBe('first window saved');
		await expect(service.saveEntry(input, { ...firstWindow, id: '22222222-2222-4222-8222-222222222222' })).rejects.toMatchObject({ code: 'not-found' });
	});

	test('rejects a wrong password and unknown container without replacing files or publishing plaintext', async () => {
		const { service, files } = await fixture(emptyRaw, false);
		await expect(service.unlock('incorrect long password')).rejects.toMatchObject({ code: 'unlock-failed' });
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		files.values.set(MAIN, JSON.stringify({ ...JSON.parse(emptyRaw), version: 2 }));
		await service.probe();
		expect(service.store.getState()).toMatchObject({ status: 'error', error: 'invalid-format', entries: [] });
		expect(files.publications).toEqual([]);
	});

	test('cancels an unlock that completes after locking', async () => {
		const { service, files } = await fixture(emptyRaw, false);
		const entered = deferred(), release = deferred();
		files.beforeRead = async name => {
			if (name !== MAIN) return;
			files.beforeRead = undefined;
			entered.resolve();
			await release.promise;
		};
		const opening = service.unlock(master).catch(error => error as SafeError);
		await entered.promise;
		service.lock();
		release.resolve();
		expect(await opening).toMatchObject({ code: 'canceled' });
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [], busy: false });
	});

	test('cancels queued plaintext changes before encryption when locked', async () => {
		const { service, files, queue } = await fixture();
		const release = deferred();
		const blocker = queue.run(SAFE_MAIN_PATH, () => release.promise);
		const saving = service.saveEntry(input).catch(error => error as SafeError);
		service.lock();
		release.resolve();
		await blocker;
		expect(await saving).toMatchObject({ code: 'canceled' });
		expect(files.publications).toEqual([]);
		expect(files.values.get(MAIN)).toBe(emptyRaw);
	});

	test('drops a late successful key derivation instead of reviving a locked session', async () => {
		const { service } = await fixture(emptyRaw, false);
		const entered = deferred(), release = deferred();
		const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
		vi.spyOn(crypto.subtle, 'deriveKey').mockImplementationOnce(async (...args) => {
			entered.resolve();
			await release.promise;
			return derive(...args);
		});
		const opening = service.unlock(master).catch(error => error as SafeError);
		await entered.promise;
		service.lock();
		release.resolve();
		expect(await opening).toMatchObject({ code: 'canceled' });
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [], busy: false });
	});

	test('does not admit a save whose encryption finishes after locking', async () => {
		const { service, files } = await fixture();
		const entered = deferred(), release = deferred();
		const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
		vi.spyOn(crypto.subtle, 'encrypt').mockImplementationOnce(async (...args) => {
			entered.resolve();
			await release.promise;
			return encrypt(...args);
		});
		const saving = service.saveEntry(input).catch(error => error as SafeError);
		await entered.promise;
		service.lock();
		release.resolve();
		expect(await saving).toMatchObject({ code: 'canceled' });
		expect(files.publications).toEqual([]);
		expect(files.values.get(MAIN)).toBe(emptyRaw);
	});

	test('finishes admitted ciphertext after lock and makes an immediate unlock wait for that commit', async () => {
		const { service, files } = await fixture();
		const blocked = blockPrimary(files);
		const saving = service.saveEntry(input).catch(error => error as SafeError);
		await blocked.entered;
		service.lock();
		const opening = service.unlock(master);
		expect(service.store.getState().entries).toEqual([]);
		blocked.release();
		expect(await saving).toMatchObject({ code: 'canceled' });
		await opening;
		expect(service.store.getState()).toMatchObject({ status: 'unlocked', entries: [expect.objectContaining({ credentials: [expect.objectContaining({ password: input.credentials[0]!.password })] })] });
	});

	test('waits for an old admitted commit when the module is disposed and recreated', async () => {
		const { service, files, newService } = await fixture();
		const blocked = blockPrimary(files);
		const saving = service.saveEntry(input).catch(error => error as SafeError);
		await blocked.entered;
		service.dispose();
		const reopened = newService();
		const probing = reopened.probe();
		blocked.release();
		expect(await saving).toMatchObject({ code: 'canceled' });
		await probing;
		await reopened.unlock(master);
		expect(reopened.store.getState().entries).toHaveLength(1);
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
	});

	test('allows admitted initial creation to finish after lock without reopening the session', async () => {
		const { service, files } = await fixture(null);
		const blocked = blockPrimary(files);
		const creating = service.create(master).catch(error => error as SafeError);
		await blocked.entered;
		service.lock();
		expect(service.store.getState().status).toBe('locked');
		blocked.release();
		expect(await creating).toMatchObject({ code: 'canceled' });
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		await service.unlock(master);
		expect(service.store.getState().status).toBe('unlocked');
	});

	test('does not republish plaintext after a slow commit passes the idle deadline', async () => {
		const { service, files, clock } = await fixture();
		const blocked = blockPrimary(files);
		const saving = service.saveEntry(input).catch(error => error as SafeError);
		await blocked.entered;
		clock.advance(IDLE_LOCK_MS + 1, false);
		blocked.release();
		expect(await saving).toMatchObject({ code: 'locked' });
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		expect((await openContainer(files.values.get(MAIN)!, master)).payload.entries).toHaveLength(1);
	});

	test('checks the deadline on sensitive actions even if the timer never fires', async () => {
		const { service, clock, clipboard } = await fixture();
		clock.advance(IDLE_LOCK_MS + 1, false);
		await expect(service.copy(secret, ownerWindow)).rejects.toMatchObject({ code: 'locked' });
		expect(clipboard.writes).toEqual([]);
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
	});

	test('preserves an external version and a fully decryptable local conflict candidate', async () => {
		const { service, files } = await fixture();
		files.values.set(MAIN, restoreRaw);
		await expect(service.saveEntry(input)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(restoreRaw);
		expect(service.store.getState()).toMatchObject({ status: 'unlocked', entries: [], error: 'conflict' });
		const candidate = [...files.values].find(([name]) => name.startsWith('conflict-'))?.[1];
		expect(candidate).toBeDefined();
		expect((await openContainer(candidate!, master)).payload.entries[0]!.credentials[0]!.password).toBe(secret);
	});

	test('rotates the master password and requires a new unlock while preserving the old backup', async () => {
		const { service, files } = await fixture();
		await service.saveEntry(input);
		const before = files.values.get(MAIN)!;
		await service.changePassword(master, backupPassword);
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		expect(files.values.get(BACKUP)).toBe(before);
		await expect(service.unlock(master)).rejects.toMatchObject({ code: 'unlock-failed' });
		await service.unlock(backupPassword);
		expect(service.store.getState().entries[0]!.credentials[0]!.password).toBe(secret);
		expect((await openContainer(files.values.get(BACKUP)!, master)).payload.entries).toHaveLength(1);
	});

	test('keeps verified records readable and reports failed expiry cleanup instead of silently deleting them', async () => {
		const oldTime = initialTime - TRASH_RETENTION_MS - 1000;
		const expired = deleteEntry(createEntry(input, '11111111-1111-4111-8111-111111111111', oldTime), oldTime + 1);
		const raw = (await createContainer(master, makePayload([expired]))).raw;
		const { service, files } = await fixture(raw, false);
		files.values.set(BACKUP, emptyRaw);
		files.beforePublish = name => { if (name === BACKUP) throw new Error('disk full'); };
		await service.unlock(master);
		expect(service.store.getState()).toMatchObject({ status: 'unlocked', error: 'storage', entries: [expired] });
		expect(files.values.get(MAIN)).toBe(raw);
	});

	test('authenticates restore, respects cancellation and restores complete ciphertext while staying locked', async () => {
		const { service, files } = await fixture();
		await expect(service.prepareRestore(restoreRaw, master)).rejects.toMatchObject({ code: 'unlock-failed' });
		const canceled = await service.prepareRestore(restoreRaw, backupPassword);
		service.cancelRestore();
		await expect(service.commitRestore(canceled.token)).rejects.toMatchObject({ code: 'canceled' });
		expect(files.publications).toEqual([]);
		const prepared = await service.prepareRestore(restoreRaw, backupPassword);
		expect(prepared.entryCount).toBe(1);
		await service.commitRestore(prepared.token);
		expect(files.values.get(MAIN)).toBe(restoreRaw);
		expect([...files.values].find(([name]) => name.startsWith('preserved-'))?.[1]).toBe(emptyRaw);
		expect(files.values.get(BACKUP)).toBe(emptyRaw);
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		await service.unlock(backupPassword);
		expect(service.store.getState().entries[0]!.title).toBe('restored entry');
	});

	test('invalidates restore authentication that finishes after the user canceled it', async () => {
		const { service, files } = await fixture();
		const entered = deferred(), release = deferred();
		const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
		vi.spyOn(crypto.subtle, 'deriveKey').mockImplementationOnce(async (...args) => {
			entered.resolve();
			await release.promise;
			return derive(...args);
		});
		const preparing = service.prepareRestore(restoreRaw, backupPassword).catch(error => error as SafeError);
		await entered.promise;
		service.cancelRestore();
		release.resolve();
		expect(await preparing).toMatchObject({ code: 'canceled' });
		expect(files.publications).toEqual([]);
		expect(files.values.get(MAIN)).toBe(emptyRaw);
	});

	test('does not export or restore a late file-dialog result after locking', async () => {
		const { service, actions, files } = await fixture();
		const dialog = deferred<string | null>();
		actions.pickExport = () => dialog.promise;
		const exporting = service.exportBackup(ownerWindow).catch(error => error as SafeError);
		service.lock();
		dialog.resolve('/tmp/selected-safe.enc');
		expect(await exporting).toMatchObject({ code: 'canceled' });
		expect(actions.exportCiphertext).not.toHaveBeenCalled();
		expect(files.publications).toEqual([]);
	});

	test('exports exactly the last committed container and only opens HTTP(S) URLs', async () => {
		const { service, actions, files } = await fixture();
		await service.saveEntry(input);
		actions.pickExport = async () => '/tmp/selected-safe.enc';
		await expect(service.exportBackup(ownerWindow)).resolves.toBe(true);
		expect(actions.exportCiphertext).toHaveBeenCalledWith('/tmp/selected-safe.enc', files.values.get(MAIN));
		for (const value of ['javascript:alert(1)', 'file:///secret', '', 'search my private notes']) {
			await expect(service.openUrl(value, ownerWindow)).rejects.toMatchObject({ code: 'invalid-url' });
		}
		expect(actions.openUrl).not.toHaveBeenCalled();
		await service.openUrl('github.com', ownerWindow);
		expect(actions.openUrl).toHaveBeenCalledWith('https://github.com/');
	});

	test('conditionally clears copied text and preserves text replaced outside HUHU', async () => {
		const { service, clipboard, clock } = await fixture();
		await service.copy(secret, ownerWindow);
		clock.advance(CLIPBOARD_CLEAR_MS);
		await vi.waitFor(() => expect(clipboard.text).toBe(''));
		await service.copy(secret, ownerWindow);
		clipboard.text = 'external clipboard text';
		clock.advance(CLIPBOARD_CLEAR_MS);
		// This copy queues behind cleanup, so the complete write history proves no intervening clear.
		const offset = clipboard.writes.length;
		await service.copy('next intentional copy', ownerWindow);
		expect(clipboard.writes.slice(offset)).toEqual(['next intentional copy']);
	});

	test('keeps the previous clipboard cleanup scheduled when a new write fails', async () => {
		const { service, clipboard, clock } = await fixture();
		await service.copy(secret, ownerWindow);
		clipboard.failNext = true;
		await expect(service.copy('new secret', ownerWindow)).rejects.toMatchObject({ code: 'clipboard', message: 'clipboard' });
		expect(service.store.getState().error).toBe('clipboard');
		expect(clipboard.text).toBe(secret);
		clock.advance(CLIPBOARD_CLEAR_MS);
		await vi.waitFor(() => expect(clipboard.text).toBe(''));
	});

	test('a stale clipboard timer cannot clear a later copy even when both secrets are identical', async () => {
		const { service, clipboard, clock } = await fixture();
		await service.copy(secret, ownerWindow);
		const staleTimer = [...clock.scheduled.values()].find(timer => timer.at === clock.now + CLIPBOARD_CLEAR_MS)!;
		await service.copy(secret, ownerWindow);
		const offset = clipboard.writes.length;
		staleTimer.callback();
		// A new public copy serves as a queue barrier after the stale callback.
		await service.copy('next intentional copy', ownerWindow);
		expect(clipboard.writes.slice(offset)).toEqual(['next intentional copy']);
	});
});

describe('accounts inside one entry', () => {
	test('stores several accounts per entry in order and keeps them through edits, reordering and removal', async () => {
		const { service, files } = await fixture();
		const apple = { ...input, title: '苹果账号', credentials: [credential(1, { username: 'first@icloud.test' }), credential(2, { username: 'second@icloud.test', notes: '孩子的' }), credential(3, { username: 'third@icloud.test' })] };
		await service.saveEntry(apple);
		let entry = service.store.getState().entries[0]!;
		expect(entry.credentials.map(item => item.username)).toEqual(['first@icloud.test', 'second@icloud.test', 'third@icloud.test']);
		await service.saveEntry({ ...apple, credentials: [apple.credentials[2]!, apple.credentials[0]!, { ...apple.credentials[1]!, password: 'changed' }, credential(4, { username: 'fourth@icloud.test' })] }, entry);
		entry = service.store.getState().entries[0]!;
		expect(entry.credentials.map(item => item.username)).toEqual(['third@icloud.test', 'first@icloud.test', 'second@icloud.test', 'fourth@icloud.test']);
		await service.saveEntry({ ...apple, credentials: [apple.credentials[0]!] }, entry);
		const saved = (await openContainer(files.values.get(MAIN)!, master)).payload.entries;
		expect(saved).toHaveLength(1);
		expect(saved[0]!.credentials.map(item => item.username)).toEqual(['first@icloud.test']);
		expect(saved[0]).toEqual(service.store.getState().entries[0]);
	});

	test('rejects an entry without accounts and a stale editor of a multi-account entry', async () => {
		const { service } = await fixture();
		expect(() => service.saveEntry({ ...input, credentials: [] })).toThrow('invalid-entry');
		await service.saveEntry({ ...input, credentials: [credential(1), credential(2, { username: 'other' })] });
		const stale = { ...service.store.getState().entries[0]! };
		await service.saveEntry({ ...input, credentials: [credential(1)] }, stale);
		await expect(service.saveEntry({ ...input, credentials: [credential(2, { username: 'other' })] }, stale)).rejects.toMatchObject({ code: 'stale-entry' });
	});
});

describe('upgrading a vault using payload schema 1', () => {
	const kept = (files: MemoryCipherFiles) => [...files.values].filter(([name]) => name.startsWith('preupgrade-')).map(([, raw]) => raw);

	test('shows every record, writes the new schema once and keeps the original ciphertext as its own copy', async () => {
		const { service, files } = await fixture(v1.raw, true, v1.master);
		const state = service.store.getState();
		expect(state).toMatchObject({ status: 'unlocked', upgraded: true, error: null });
		expect(state.entries).toHaveLength(v1.entries.length);
		state.entries.forEach((entry, index) => {
			const old = v1.entries[index]!;
			expect(entry).toMatchObject({ id: old.id, title: old.title, url: old.url, deletedAt: old.deletedAt, createdAt: old.createdAt, updatedAt: old.updatedAt });
			expect(entry.credentials).toEqual([expect.objectContaining({ username: old.username, password: old.password, notes: old.notes })]);
		});
		expect(kept(files)).toEqual([v1.raw]);
		expect(files.values.get(BACKUP)).toBe(v1.raw);
		expect(files.values.get(MAIN)).not.toBe(v1.raw);
		const reopened = await openContainer(files.values.get(MAIN)!, v1.master);
		expect(reopened.upgradedFrom).toBeNull();
		expect(reopened.payload.entries).toEqual(state.entries);
		expect(parseEnvelope(files.values.get(MAIN)!)).toMatchObject({ format: 'huhu-safe', version: 1 });
		expect((await openContainer(kept(files)[0]!, v1.master)).upgradedFrom).toBe(1);
		for (const raw of files.values.values()) for (const marker of ['apple-pass-1', 'octo', 'no-title-user', '苹果账号']) expect(raw).not.toContain(marker);
		service.lock();
		await service.unlock(v1.master);
		expect(kept(files)).toHaveLength(1);
		expect(service.store.getState()).toMatchObject({ status: 'unlocked', upgraded: false });
	});

	test('a failed upgrade still opens the records, leaves the old file as it was and retries with a kept copy on the next write', async () => {
		const { service, files } = await fixture(v1.raw, false, v1.master);
		files.beforePublish = name => { if (name.startsWith('preupgrade-')) throw new Error('disk full'); };
		await service.unlock(v1.master);
		expect(service.store.getState()).toMatchObject({ status: 'unlocked', error: 'storage', upgraded: false });
		expect(service.store.getState().entries).toHaveLength(v1.entries.length);
		expect(files.values.get(MAIN)).toBe(v1.raw);
		expect(kept(files)).toEqual([]);
		files.beforePublish = undefined;
		await service.saveEntry(input);
		expect(kept(files)).toEqual([v1.raw]);
		expect(service.store.getState()).toMatchObject({ upgraded: true, error: null });
		const reopened = await openContainer(files.values.get(MAIN)!, v1.master);
		expect(reopened.upgradedFrom).toBeNull();
		expect(reopened.payload.entries).toHaveLength(v1.entries.length + 1);
	});

	test('locking before the upgrade was written changes nothing on disk and the next unlock upgrades', async () => {
		const { service, files } = await fixture(v1.raw, false, v1.master);
		files.beforePublish = name => { if (name.startsWith('preupgrade-')) throw new Error('disk full'); };
		await service.unlock(v1.master);
		service.lock();
		expect(files.values.get(MAIN)).toBe(v1.raw);
		files.beforePublish = undefined;
		await service.unlock(v1.master);
		expect(service.store.getState()).toMatchObject({ upgraded: true, error: null });
		expect(kept(files)).toEqual([v1.raw]);
	});

	test('does not upgrade over an external change and reports the conflict', async () => {
		const { service, files } = await fixture(v1.raw, false, v1.master);
		files.beforeRead = async name => {
			if (name === MAIN && files.values.get(MAIN) === v1.raw && files.publications.length === 0) return;
		};
		await service.unlock(v1.master);
		files.values.set(MAIN, emptyRaw);
		await expect(service.saveEntry(input)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(emptyRaw);
	});

	test('changing the master password of a not yet upgraded vault keeps the original copy under the old password', async () => {
		const { service, files } = await fixture(v1.raw, false, v1.master);
		files.beforePublish = name => { if (name.startsWith('preupgrade-')) throw new Error('disk full'); };
		await service.unlock(v1.master);
		files.beforePublish = undefined;
		await service.changePassword(v1.master, backupPassword);
		expect(kept(files)).toEqual([v1.raw]);
		await service.unlock(backupPassword);
		expect(service.store.getState().entries).toHaveLength(v1.entries.length);
		expect((await openContainer(kept(files)[0]!, v1.master)).payload.entries).toHaveLength(v1.entries.length);
	});
});

describe('merge import', () => {
	const preimport = (files: MemoryCipherFiles) => [...files.values].filter(([name]) => name.startsWith('preimport-')).map(([, raw]) => raw);
	const apple = { ...input, title: 'Apple', url: 'https://appleid.apple.com', credentials: [credential(1, { username: 'a@x.test', password: 'p1' })] };
	async function backup(entries: EntryInput[], password = backupPassword) {
		return (await createContainer(password, makePayload(entries.map((entry, index) => createEntry(entry, `${(index + 1).toString(16).padStart(8, '0')}-2222-4222-8222-222222222222`, initialTime))))).raw;
	}

	test('adds new entries and merges accounts into a matching entry, after keeping an encrypted copy of the current file', async () => {
		const { service, files } = await fixture();
		await service.saveEntry(apple);
		const before = files.values.get(MAIN)!;
		const raw = await backup([
			{ ...apple, title: ' apple ', url: 'appleid.apple.com/', credentials: [credential(5, { username: 'b@x.test', password: 'p2' })] },
			{ ...apple, title: 'Bank', url: 'https://bank.test' },
		]);
		const prepared = await service.prepareImport(raw, backupPassword);
		expect(prepared.entryCount).toBe(2);
		expect(prepared.summary).toMatchObject({ addedEntries: 1, mergedEntries: 1, addedCredentials: 1 });
		expect(files.values.get(MAIN)).toBe(before);
		expect(preimport(files)).toEqual([]);
		const summary = await service.commitImport(prepared.token);
		expect(summary).toEqual(prepared.summary);
		const entries = service.store.getState().entries;
		expect(entries.map(entry => entry.title)).toEqual(['Apple', 'Bank']);
		expect(entries[0]!.credentials.map(item => item.username)).toEqual(['a@x.test', 'b@x.test']);
		expect(preimport(files)).toEqual([before]);
		expect((await openContainer(files.values.get(MAIN)!, master)).payload.entries).toEqual(entries);
		expect(service.store.getState().status).toBe('unlocked');
	});

	test('authenticates the backup first and writes nothing for a wrong password', async () => {
		const { service, files } = await fixture();
		const raw = await backup([apple]);
		await expect(service.prepareImport(raw, 'wrong backup password')).rejects.toMatchObject({ code: 'unlock-failed' });
		await expect(service.commitImport('no-such-token')).rejects.toMatchObject({ code: 'canceled' });
		expect(files.publications).toEqual([]);
	});

	test('a token works once, a canceled import cannot be committed and locking discards the decrypted backup', async () => {
		const { service, files } = await fixture();
		const raw = await backup([apple]);
		const first = await service.prepareImport(raw, backupPassword);
		await service.commitImport(first.token);
		await expect(service.commitImport(first.token)).rejects.toMatchObject({ code: 'canceled' });
		const second = await service.prepareImport(await backup([{ ...apple, title: 'Other', url: 'other.test' }]), backupPassword);
		service.cancelImport();
		await expect(service.commitImport(second.token)).rejects.toMatchObject({ code: 'canceled' });
		const third = await service.prepareImport(await backup([{ ...apple, title: 'Third', url: 'third.test' }]), backupPassword);
		const published = files.publications.length;
		service.lock();
		await expect(service.commitImport(third.token)).rejects.toMatchObject({ code: expect.stringMatching(/canceled|locked/) });
		expect(files.publications).toHaveLength(published);
	});

	test('importing the same backup again writes nothing and reports everything as skipped', async () => {
		const { service, files } = await fixture();
		const raw = await backup([apple, { ...apple, title: 'Bank', url: 'bank.test' }]);
		await service.commitImport((await service.prepareImport(raw, backupPassword)).token);
		const published = files.publications.length;
		const again = await service.prepareImport(raw, backupPassword);
		expect(again.summary).toMatchObject({ addedEntries: 0, mergedEntries: 0, skippedEntries: 2 });
		expect(await service.commitImport(again.token)).toMatchObject({ skippedEntries: 2 });
		expect(files.publications).toHaveLength(published);
		expect(preimport(files)).toHaveLength(1);
	});

	test('merges the records of a schema-1 backup', async () => {
		const { service } = await fixture();
		const prepared = await service.prepareImport(v1.raw, v1.master);
		expect(prepared.summary).toMatchObject({ addedEntries: 3, skippedTrashed: 1 });
		await service.commitImport(prepared.token);
		expect(service.store.getState().entries.map(entry => entry.title)).toEqual(['苹果账号', 'github', '']);
	});

	test('a merge based on a changed file is refused as a conflict and keeps the candidate', async () => {
		const { service, files } = await fixture();
		const prepared = await service.prepareImport(await backup([apple]), backupPassword);
		files.values.set(MAIN, restoreRaw);
		await expect(service.commitImport(prepared.token)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(restoreRaw);
		expect(preimport(files)).toEqual([]);
	});

	test('replacing the safe from a backup still works and stays an explicit, authenticated step', async () => {
		const { service, files } = await fixture();
		await service.saveEntry(apple);
		const before = files.values.get(MAIN)!;
		const prepared = await service.prepareRestore(restoreRaw, backupPassword);
		await service.commitRestore(prepared.token);
		expect(files.values.get(MAIN)).toBe(restoreRaw);
		expect([...files.values].find(([name]) => name.startsWith('preserved-'))?.[1]).toBe(before);
		expect(service.store.getState().status).toBe('locked');
	});
});

describe('lock policy', () => {
	const MINUTE = 60_000;

	test.each([
		['5', 5], ['20', 20], ['60', 60], ['custom', 45],
	] as const)('locks after the %s preset of idle time and not a moment before', async (idlePreset, minutes) => {
		const policy = policySource(lockPolicyOf({ idlePreset, idleCustomMinutes: 45, lockOnSwitch: false, lockOnClose: false }));
		const { service, clock } = await fixture(emptyRaw, true, master, policy.source);
		clock.advance(minutes * MINUTE - 1);
		expect(service.store.getState().status).toBe('unlocked');
		service.touch();
		clock.advance(minutes * MINUTE - 1);
		expect(service.store.getState().status).toBe('unlocked');
		clock.advance(1);
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
	});

	test('never keeps the session open without any timer or deadline, until it is locked explicitly', async () => {
		const policy = policySource();
		policy.set({ idlePreset: 'never' });
		const { service, clock } = await fixture(emptyRaw, true, master, policy.source);
		expect(clock.scheduled.size).toBe(0);
		clock.advance(400 * 24 * 60 * MINUTE);
		expect(service.checkDeadline()).toBe(true);
		await service.saveEntry(input);
		expect(service.store.getState().status).toBe('unlocked');
		service.lock();
		expect(service.store.getState().status).toBe('locked');
	});

	test('a changed idle time applies to the running session from its last activity', async () => {
		const policy = policySource();
		const { service, clock } = await fixture(emptyRaw, true, master, policy.source);
		clock.advance(10 * MINUTE);
		policy.set({ idlePreset: '60' });
		clock.advance(30 * MINUTE);
		expect(service.store.getState().status).toBe('unlocked');
		clock.advance(20 * MINUTE);
		expect(service.store.getState().status).toBe('locked');
		const again = await fixture(emptyRaw, true, master, policy.source);
		again.clock.advance(10 * MINUTE);
		policy.set({ idlePreset: '5' });
		expect(again.service.store.getState().status).toBe('locked');
	});

	test('the page-leaving rules are independent switches and the defaults lock on neither', async () => {
		for (const [lockOnSwitch, lockOnClose] of [[false, false], [true, false], [false, true], [true, true]] as const) {
			const policy = policySource();
			policy.set({ lockOnSwitch, lockOnClose });
			const switched = await fixture(emptyRaw, true, master, policy.source);
			switched.service.leave('switch');
			expect(switched.service.store.getState().status).toBe(lockOnSwitch ? 'locked' : 'unlocked');
			const closed = await fixture(emptyRaw, true, master, policy.source);
			closed.service.leave('close');
			expect(closed.service.store.getState().status).toBe(lockOnClose ? 'locked' : 'unlocked');
		}
		const { service } = await fixture();
		service.leave('switch');
		service.leave('close');
		expect(service.store.getState().status).toBe('unlocked');
	});

	test('leaving a page without locking still enforces an idle deadline that already passed', async () => {
		const { service, clock } = await fixture();
		clock.advance(IDLE_LOCK_MS + 1, false);
		service.leave('switch');
		expect(service.store.getState().status).toBe('locked');
	});

	test('disposing the module locks whatever the policy says, and a disposed service ignores policy changes', async () => {
		const policy = policySource();
		policy.set({ idlePreset: 'never', lockOnSwitch: false, lockOnClose: false });
		const { service } = await fixture(emptyRaw, true, master, policy.source);
		service.dispose();
		expect(service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
		policy.set({ idlePreset: '5' });
		expect(service.store.getState().status).toBe('locked');
	});

	test('subscribers hear about policy changes until they unsubscribe', async () => {
		const policy = policySource();
		const { service } = await fixture(emptyRaw, true, master, policy.source);
		const heard = vi.fn();
		const stop = service.subscribePolicy(heard);
		policy.set({ lockOnClose: true });
		expect(heard).toHaveBeenCalledTimes(1);
		expect(service.lockPolicy().lockOnClose).toBe(true);
		stop();
		policy.set({ lockOnClose: false });
		expect(heard).toHaveBeenCalledTimes(1);
	});
});

import { expect, test, vi } from 'vitest';
import { musicVaultFixture } from '../../../../../scripts/music-vault-fixture';
import { localSession, setCookies } from '../../../../../scripts/music-electron-stub';
import { NeteaseAccount } from './netease-account';

const pause = vi.hoisted(() => ({ enter: undefined as (() => void) | undefined, wait: undefined as Promise<void> | undefined }));
vi.mock('node:fs/promises', async original => {
	const fs = await original<typeof import('node:fs/promises')>();
	return { ...fs, mkdir: async (...args: Parameters<typeof fs.mkdir>) => {
		if (pause.enter && String(args[0]).endsWith('downloads')) { const enter = pause.enter; pause.enter = undefined; enter(); await pause.wait; }
		return fs.mkdir(...args);
	} };
});

test('destroy while the owned download directory is pending cannot attach a late session lease', async () => {
	const fixture = await musicVaultFixture(), account = new NeteaseAccount(fixture.app);
	let entered!: () => void, resume!: () => void;
	const started = new Promise<void>(resolve => { entered = resolve; }); pause.wait = new Promise<void>(resolve => { resume = resolve; }); pause.enter = entered;
	try {
		setCookies([{ name: 'MUSIC_U', value: 'fixture' }]);
		const restoring = account.restore(); await started; account.destroy(); resume(); await restoring;
		expect(account.loggedIn).toBe(false); expect(localSession.listenerCount('will-download')).toBe(0);
	} finally { resume(); pause.enter = undefined; pause.wait = undefined; account.destroy(); await fixture.dispose(); }
});

test('the owned background deadline rejects late cookies without using wall-clock sleeps', async () => {
	const fixture = await musicVaultFixture(), get = localSession.cookies.get;
	const callbacks = new Map<number, () => void>(); let id = 0;
	Object.assign(fixture.app.workspace.containerEl.win, {
		setTimeout: (fn: () => void) => { callbacks.set(++id, fn); return id; },
		clearTimeout: (key: number) => callbacks.delete(key),
	});
	const account = new NeteaseAccount(fixture.app);
	let enter!: () => void, release!: (value: { name: string; value: string }[]) => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	localSession.cookies.get = () => { enter(); return new Promise(resolve => { release = resolve; }); };
	try {
		const restoring = account.restore(); await started;
		expect(account.restore()).toBe(restoring);
		for (const fire of [...callbacks.values()]) fire(); await restoring;
		expect(account.error).toBe('browser_session_timeout');
		expect(callbacks.size).toBe(0);
		release([{ name: 'MUSIC_U', value: 'fixture' }]);
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(account.loggedIn).toBe(false);
	} finally { localSession.cookies.get = get; account.destroy(); await fixture.dispose(); }
});

test('destroy during the native cookie read cannot publish a late logged-in state', async () => {
	const fixture = await musicVaultFixture(), account = new NeteaseAccount(fixture.app), get = localSession.cookies.get;
	let entered!: () => void, resume!: () => void;
	const started = new Promise<void>(resolve => { entered = resolve; }), pending = new Promise<void>(resolve => { resume = resolve; });
	localSession.cookies.get = async () => { entered(); await pending; return [{ name: 'MUSIC_U', value: 'fixture' }]; };
	try {
		const restoring = account.restore(); await started; account.destroy(); resume(); await restoring;
		expect(account.loggedIn).toBe(false); expect(localSession.listenerCount('will-download')).toBe(0);
	} finally { resume(); localSession.cookies.get = get; account.destroy(); await fixture.dispose(); }
});

test('logout invalidates a pending restore before its cookie can publish', async () => {
	const fixture = await musicVaultFixture(), account = new NeteaseAccount(fixture.app), get = localSession.cookies.get;
	let enter!: () => void, release!: (cookies: { name: string; value: string }[]) => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	localSession.cookies.get = () => { enter(); return new Promise(resolve => { release = resolve; }); };
	try {
		const restoring = account.restore(); await started;
		await account.logout();
		release([{ name: 'MUSIC_U', value: 'old-account' }]); await restoring;
		expect(account.loggedIn).toBe(false);
		expect(account.error).toBe('');
	} finally { localSession.cookies.get = get; account.destroy(); await fixture.dispose(); }
});

test('destroy settles owned restoration and clears its window timer without waiting for native cookies', async () => {
	const fixture = await musicVaultFixture(), get = localSession.cookies.get;
	const timers = new Set<ReturnType<typeof setTimeout>>();
	Object.assign(fixture.app.workspace.containerEl.win, {
		setTimeout: (fn: () => void, ms: number) => { const id = setTimeout(fn, ms); timers.add(id); return id; },
		clearTimeout: (id: ReturnType<typeof setTimeout>) => { timers.delete(id); clearTimeout(id); },
	});
	const account = new NeteaseAccount(fixture.app);
	let enter!: () => void, release!: (value: { name: string; value: string }[]) => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	localSession.cookies.get = () => { enter(); return new Promise(resolve => { release = resolve; }); };
	try {
		let settled = false;
		const restoring = account.restore().then(() => { settled = true; }); await started;
		account.destroy(); await new Promise<void>(resolve => setImmediate(resolve));
		expect(timers.size).toBe(0);
		expect(settled).toBe(true);
		release([{ name: 'MUSIC_U', value: 'late' }]); await restoring;
		expect(account.loggedIn).toBe(false);
	} finally { release?.([]); account.destroy(); for (const timer of timers) clearTimeout(timer); localSession.cookies.get = get; await fixture.dispose(); }
});


test('closing the owning window cancels restoration and removes its close listener', async () => {
	const fixture = await musicVaultFixture(), get = localSession.cookies.get, target = new EventTarget();
	const listeners = new Set<EventListenerOrEventListenerObject>();
	Object.assign(fixture.app.workspace.containerEl.win, {
		addEventListener: (name: string, fn: EventListenerOrEventListenerObject) => { listeners.add(fn); target.addEventListener(name, fn); },
		removeEventListener: (name: string, fn: EventListenerOrEventListenerObject) => { listeners.delete(fn); target.removeEventListener(name, fn); },
	});
	const account = new NeteaseAccount(fixture.app);
	let enter!: () => void, release!: (value: { name: string; value: string }[]) => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	localSession.cookies.get = () => { enter(); return new Promise(resolve => { release = resolve; }); };
	try {
		const restoring = account.restore(); await started;
		target.dispatchEvent(new Event('unload')); await restoring;
		expect(listeners.size).toBe(0);
		release([{ name: 'MUSIC_U', value: 'late-window' }]);
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(account.loggedIn).toBe(false);
		expect(localSession.listenerCount('will-download')).toBe(0);
	} finally { localSession.cookies.get = get; account.destroy(); await fixture.dispose(); }
});

test('destroy cancels login even while session acquisition is still pending', async () => {
	const fixture = await musicVaultFixture(), account = new NeteaseAccount(fixture.app);
	let enter!: () => void, resume!: () => void;
	const started = new Promise<void>(resolve => { enter = resolve; });
	pause.wait = new Promise<void>(resolve => { resume = resolve; }); pause.enter = enter;
	let outcome = 'pending';
	const loggingIn = account.login().then(() => { outcome = 'success'; }, () => { outcome = 'cancelled'; });
	try {
		await started; account.destroy();
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(outcome).toBe('cancelled');
	} finally {
		resume(); await loggingIn; pause.enter = undefined; pause.wait = undefined;
		account.destroy(); await fixture.dispose();
	}
});

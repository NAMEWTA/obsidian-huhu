import type { App } from 'obsidian';
import { expect, test } from 'vitest';
import type { ModuleContext } from '../../app/contracts/module';
import { initializeTestDevice } from '../../../test/fixtures/vault-storage';
import { BROWSER_OPEN, BROWSER_WORKSPACE } from './api';
import createBrowserModule from './module';

async function fixture(desktop: boolean) {
	const acquired: string[] = [];
	let native = 0;
	const files = new Map<string, string>();
	const app = {
		vault: {
			adapter: {
				exists: async (path: string) => files.has(path),
				read: async (path: string) => files.get(path) ?? '',
				write: async (path: string, text: string) => {
					files.set(path, text);
				},
				mkdir: async () => {},
				remove: async (path: string) => {
					files.delete(path);
				},
			},
		},
		workspace: { containerEl: { win: globalThis }, on: () => ({}), offref: () => {}, iterateAllLeaves: () => {} },
		loadLocalStorage: () => null,
	} as unknown as App;
	await initializeTestDevice(app);
	const cleanups: Array<() => void> = [];
	const instance = createBrowserModule({
		app,
		env: { desktop, mobile: false, phone: false },
		native: { acquire: async () => { native++; throw new Error('browser must not use the terminal helper'); } },
		lifetime: { register: (fn: () => void) => cleanups.push(fn) },
		settings: { bind: () => ({ get: () => ({ interceptNoteLinks: false }), subscribe: () => () => {} }) },
		services: {
			acquire: async (owner: string) => {
				acquired.push(owner);
				throw new Error('Browser must not acquire Agent');
			},
			peek: () => undefined,
			watch: () => () => {},
		},
		shell: { open: async () => {} },
		contributions: { collect: async () => [] },
	} as unknown as ModuleContext);
	return {
		instance,
		acquired,
		get native() { return native; },
		async dispose() {
			for (const cleanup of cleanups) cleanup();
			await instance.dispose('disabled');
		},
	};
}

test('Browser stays closed and does not acquire Agent or the terminal helper when desktop is unavailable', async () => {
	const f = await fixture(false);
	try {
		await f.instance.activate?.(new AbortController().signal);
		expect(f.instance.services ?? []).toEqual([]);
		expect(f.acquired).toEqual([]);
		expect(f.native).toBe(0);
		expect(f.instance.services?.some(([key]) => key === BROWSER_OPEN || key === BROWSER_WORKSPACE)).toBeFalsy();
	} finally {
		await f.dispose();
	}
});

test('without an activated workspace, Browser publishes no opener and does not reach Agent', async () => {
	const f = await fixture(false);
	try {
		expect(f.instance.services ?? []).toEqual([]);
		expect(f.acquired).toEqual([]);
		expect(f.native).toBe(0);
	} finally {
		await f.dispose();
	}
});

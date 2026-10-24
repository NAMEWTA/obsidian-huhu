import { act } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import type { SafeService, SafeState } from '../services/safe-service';
import { SafeSurface, createSafePage } from './workbench-page';

vi.mock('obsidian', async original => ({
	...(await original<typeof import('obsidian')>()),
	Component: class {
		private cleanups: (() => void)[] = [];
		register(cleanup: () => void) { this.cleanups.push(cleanup); }
		unload() { for (const cleanup of this.cleanups.splice(0)) cleanup(); }
	},
}));

function fixture() {
	const store = createStore<SafeState>(() => ({ status: 'locked', entries: [], busy: false, error: null, generation: 0, upgraded: false }));
	const lock = vi.fn(() => store.setState(state => ({ status: 'locked', entries: [], generation: state.generation + 1 })));
	const checkDeadline = vi.fn(() => false);
	const leave = vi.fn((_reason: string) => lock());
	const service = { store, lock, leave, checkDeadline, touch: vi.fn(), lockPolicy: () => ({ idleMs: 1, lockOnSwitch: true, lockOnClose: true }), subscribePolicy: () => () => {} } as unknown as SafeService;
	const preferences = { viewMode: () => 'list' as const, setViewMode: vi.fn(), subscribe: () => () => {} };
	const contentEl = document.createElement('div');
	const migrationCleanup = vi.fn();
	let migrated = () => {};
	Object.assign(contentEl, {
		addClass: (...names: string[]) => contentEl.classList.add(...names),
		removeClass: (...names: string[]) => contentEl.classList.remove(...names),
		onWindowMigrated: (callback: () => void) => { migrated = callback; return migrationCleanup; },
	});
	document.body.append(contentEl);
	const context = { app: {}, leaf: {}, contentEl, containerEl: contentEl, close() {} } as unknown as NativeSurfaceContext;
	return { service, preferences, leave, context, contentEl, lock, checkDeadline, migrationCleanup, migrate: () => migrated() };
}

test('hiding, owner-window migration and closing each lock the shared session and release the React root', async () => {
	const f = fixture();
	const surface = new SafeSurface(f.context, f.service, f.preferences);
	try {
		await act(async () => { await surface.onOpen(); });
		f.lock.mockClear();
		await act(async () => surface.setVisible(false));
		expect(f.lock).toHaveBeenCalled();
		await act(async () => surface.setVisible(true));
		expect(f.checkDeadline).toHaveBeenCalled();
		f.lock.mockClear();
		await act(async () => f.migrate());
		expect(f.lock).toHaveBeenCalledOnce();
		await act(async () => { await surface.onClose(); });
		expect(f.lock).toHaveBeenCalledTimes(2);
		expect(f.contentEl.childElementCount).toBe(0);
		expect(f.migrationCleanup).toHaveBeenCalledOnce();
	} finally {
		await act(async () => { await surface.onClose(); });
		f.contentEl.remove();
	}
});

test('page binding never echoes an incoming sensitive route or restored page state', async () => {
	const f = fixture();
	const create = createSafePage(f.service, f.preferences);
	const signal = new AbortController().signal;
	const binding = await create(f.context, { feature: 'safe', resourceId: 'private-account', focusId: 'private-password' }, { query: 'private-query' }, signal);
	expect(binding.getState?.()).toEqual({});
	expect(binding.getTarget?.()).toEqual({ feature: 'safe' });
	await binding.navigate({ feature: 'safe', resourceId: 'another-account' }, signal);
	expect(binding.getTarget?.()).toEqual({ feature: 'safe' });
	const canceled = new AbortController(); canceled.abort();
	await expect(create(f.context, { feature: 'safe' }, {}, canceled.signal)).rejects.toMatchObject({ code: 'canceled' });
	f.contentEl.remove();
});

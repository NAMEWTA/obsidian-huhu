import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';
import type { ModuleContext } from '../../../app/contracts/module';
import type { SettingsHandle } from '../../../shared/settings/store';
import { initializeTestDevice } from '../../../../test/fixtures/vault-storage';
import { normalizeTerminalSettings, type TerminalSettings } from '../core/terminal/settings';
import { AgentController } from './controller';
import createAgentModule from '../module';
import { AGENT_WORKBENCH, AGENT_USAGE, NATIVE_HELPER_SQLITE } from '../api';

vi.mock('electron', () => ({ shell: {}, webUtils: {} }));

const native = vi.hoisted(() => ({ probes: 0 }));
vi.mock('node:child_process', async importOriginal => {
	const actual = await importOriginal<typeof import('node:child_process')>();
	return { ...actual, execFile: (...args: unknown[]) => {
		native.probes++;
		const callback = args.at(-1) as (error: null, output: Buffer) => void;
		queueMicrotask(() => callback(null, Buffer.alloc(0)));
		return { stdin: { end: () => {} } };
	} };
});

async function withTemporaryVault(run: (root: string) => Promise<void>): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), 'huhu-controller-native-'));
	try { await run(root); }
	finally { await rm(root, { recursive: true, force: true }); }
}

test('an enabled unused Agent leaves Provider discovery and login-shell probing dormant', () => withTemporaryVault(async root => {
	const files = new Map<string, string>();
	const adapter = { getBasePath: () => root, exists: async (p: string) => files.has(p), read: async (p: string) => files.get(p)!, write: async (p: string, s: string) => { files.set(p, s); }, mkdir: async () => {} };
	const scheduled: Array<() => void> = [], cleanups: Array<() => void> = [];
	const win = { ...globalThis, setTimeout, clearTimeout, setInterval, clearInterval, requestIdleCallback: (callback: () => void) => { scheduled.push(callback); return 1; }, cancelIdleCallback: () => {} };
	const app = { vault: { adapter }, workspace: { containerEl: { win } }, loadLocalStorage: () => null } as unknown as App;
	await initializeTestDevice(app);
	const value = normalizeTerminalSettings({});
	const settings = { get: () => value, subscribe: () => () => {}, update: async () => {} } as unknown as SettingsHandle<TerminalSettings>;
	const context = { app, manifest: { version: '0.0.1' }, native: { acquire: async () => { throw new Error('unused native capability'); } }, lifetime: { register: (fn: () => void) => cleanups.push(fn) }, settings: { bind: () => settings }, services: { peek: () => undefined, watch: () => () => {} }, shell: { refresh: () => {} } } as unknown as ModuleContext;
	const before = native.probes;
	const controller = new AgentController(context, settings, { confirm: async () => false });
	try {
		await controller.workspace.persistence.ready;
		expect(scheduled).toEqual([]);
		expect(native.probes).toBe(before);
		expect(controller.agents.store.getState().detected).toEqual({});
	} finally { try { for (const close of cleanups.reverse()) close(); } finally { await controller.dispose(); } }
}));


test('desktop Agent module activation publishes passive ports without preparing Provider accounts', () => withTemporaryVault(async root => {
	const files = new Map<string, string>(), cleanups: Array<() => void> = [];
	const adapter = { getBasePath: () => root, exists: async (p: string) => files.has(p), read: async (p: string) => files.get(p)!, write: async (p: string, s: string) => { files.set(p, s); }, mkdir: async () => {} };
	const scheduled: Array<() => void> = [];
	const win = { ...globalThis, setTimeout, clearTimeout, setInterval, clearInterval, requestIdleCallback: (callback: () => void) => { scheduled.push(callback); return 1; }, cancelIdleCallback: () => {} };
	const app = { vault: { adapter }, workspace: { containerEl: { win } }, loadLocalStorage: () => null } as unknown as App;
	await initializeTestDevice(app);
	const value = normalizeTerminalSettings({});
	const settings = { get: () => value, subscribe: () => () => {}, update: async () => {} };
	let acquisitions = 0;
	const instance = createAgentModule({ app, env: { desktop: true }, manifest: { version: '0.0.1', dir: 'unused' }, native: { acquire: async () => { acquisitions++; throw new Error('unused native capability'); } }, lifetime: { register: (fn: () => void) => cleanups.push(fn) }, settings: { bind: () => settings }, commands: { add: (command: unknown) => command }, services: { peek: () => undefined, watch: () => () => {} }, shell: { refresh: () => {} } } as unknown as ModuleContext);
	const probes = native.probes;
	try {
		await instance.activate?.(new AbortController().signal);
		const services = instance.services ?? [];
		expect(services.map(([key]) => key)).toContain(NATIVE_HELPER_SQLITE);
		const workbench = services.find(([key]) => key === AGENT_WORKBENCH)?.[1] as import('../api').AgentWorkbench;
		const usage = services.find(([key]) => key === AGENT_USAGE)?.[1] as import('../api').AgentUsage;
		expect(workbench.status()).toEqual([]);
		expect(usage.snapshot().providers).toEqual([]);
		expect(scheduled).toEqual([]);
		expect(native.probes).toBe(probes);
		expect(acquisitions).toBe(0);
	} finally { try { for (const close of cleanups.reverse()) close(); } finally { await instance.dispose('disabled'); } }
}));

import type { App } from 'obsidian';
import { expect, test } from 'vitest';
import type { ModuleContext } from '../../app/contracts/module';
import { NativeReleaseError, type NativeEvents, type NativeTransport } from '../../shared/native/host';
import { NativeHost } from '../../host/desktop/native/host';
import { initializeTestDevice } from '../../../test/fixtures/vault-storage';
import { normalizeBrowserSettings } from './core/model';
import { normalizeTerminalSettings } from '../agent/core/terminal/settings';
import { TerminalSessions } from '../agent/services/terminal/sessions';
import { BROWSER_HOST, BROWSER_OPEN } from './api';
import type { BrowserEngine } from './services/host';
import createBrowserModule from './module';

// Only framed-process I/O is replaced; module assembly, BrowserEngine and TerminalSessions are real.
async function fixture(protocol: 'confirmed' | 'legacy', sharedWorkspace?: ModuleContext['sharedWorkspace']) {
	const files = new Map<string, string>(),
		cleanups: Array<() => void> = [];
	const document = { addEventListener: () => {}, removeEventListener: () => {} };
	const adapter = {
		exists: async (p: string) => files.has(p),
		read: async (p: string) => files.get(p)!,
		write: async (p: string, s: string) => {
			files.set(p, s);
		},
		mkdir: async () => {},
	};
	const app = {
		vault: { adapter },
		workspace: {
			containerEl: { win: globalThis, ownerDocument: document },
			on: () => ({}),
			offref: () => {},
			iterateAllLeaves: () => {},
		},
		loadLocalStorage: () => null,
	} as unknown as App;
	await initializeTestDevice(app);
	let complete!: (value: { rows: Array<Record<string, unknown>> }) => void;
	let admitted!: () => void;
	const accepted = new Promise<void>((resolve) => {
		admitted = resolve;
	});
	let connected = false,
		starts = 0;
	const ended: number[] = [];
	const host = new NativeHost(async (events: NativeEvents) => {
		connected = true;
		starts++;
		const end = (sid: number) => {
			ended.push(sid);
			if (protocol === 'confirmed')
				events.termination?.(sid, {
					version: 1,
					sequence: 1,
					evidence: {
						root: { state: 'exited', code: 0, signal: null },
						cleanup: {
							state: 'confirmed',
							scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
							remainingKnown: 0,
						},
						output: 'drained',
					},
				});
			events.exit(sid, 0, null);
		};
		return {
			...(protocol === 'confirmed'
				? { terminalTermination: 1 as const, requestStop: (sid: number) => end(sid) }
				: {}),
			get alive() {
				return connected;
			},
			version: 'fixture',
			spawnSession: async () => 42,
			input: () => {},
			resize: () => {},
			acknowledge: () => {},
			end,
			history: async <T>() => [] as T,
			request: <T>() => {
				admitted();
				return new Promise<T>((resolve) => {
					complete = (value) => resolve(value as T);
				});
			},
			dispose: async () => {
				connected = false;
				events.closed('closed');
			},
		} satisfies NativeTransport;
	});
	const value = normalizeBrowserSettings({});
	const instance = createBrowserModule({
		app,
		env: { desktop: true },
		native: host,
		sharedWorkspace,
		lifetime: { register: (fn: () => void) => cleanups.push(fn) },
		settings: { bind: () => ({ get: () => value, subscribe: () => () => {} }) },
		services: {
			acquire: async () => {
				throw new Error('Browser must not acquire Agent');
			},
			peek: () => undefined,
		},
		shell: {},
	} as unknown as ModuleContext);
	await instance.activate?.(new AbortController().signal);
	const browser = instance.services?.find(([key]) => key === BROWSER_HOST)?.[1] as BrowserEngine;
	return {
		host,
		instance,
		browser,
		accepted,
		complete: (rows: { rows: Array<Record<string, unknown>> }) => complete(rows),
		get connected() {
			return connected;
		},
		get starts() {
			return starts;
		},
		ended,
		async dispose() {
			for (const cleanup of cleanups) cleanup();
			await instance.dispose('disabled');
			await host.dispose();
		},
	};
}

test('Browser opens through the app-owned shared port while Agent is unavailable', async () => {
	const opened: string[] = [];
	const sharedWorkspace = {
		browser: {
			open: async (tab: { pageId: string }) => {
				opened.push(tab.pageId);
				return tab.pageId;
			},
			close: async () => {},
			list: () => [],
			activate: () => {},
			update: () => {},
			subscribe: () => () => {},
		},
		ready: Promise.resolve(),
		spaces: {},
		workspaceStore: {},
		dispose: async () => {},
	} as ModuleContext['sharedWorkspace'];
	const f = await fixture('confirmed', sharedWorkspace);
	try {
		const opener = f.instance.services?.find(([key]) => key === BROWSER_OPEN)?.[1] as {
			open(request: { url: string }): Promise<string>;
		};
		const pageId = await opener.open({ url: 'https://example.com' });
		expect(opened).toEqual([pageId]);
		expect(f.starts).toBe(0);
	} finally {
		await f.dispose();
	}
});

for (const protocol of ['confirmed', 'legacy'] as const)
	test(`Browser stays native-lazy and its admitted Cookie read survives ${protocol} Agent cleanup`, async () => {
		const f = await fixture(protocol);
		const agent = new TerminalSessions({
			native: f.host,
			environment: async () => ({}),
			platform: 'linux',
			settings: () => normalizeTerminalSettings({}),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		let stopping: Promise<void> | undefined;
		try {
			expect(f.starts).toBe(0);
			const session = await agent.create({ kind: 'shell', title: 'shell', file: 'sh', args: [], cwd: '/vault' });
			const reading = f.browser.readCookies('/snapshot', 'chromium');
			await f.accepted;
			stopping = agent.dispose();
			if (protocol === 'confirmed') await expect(stopping).resolves.toBeUndefined();
			else {
				await expect(stopping).rejects.toBeInstanceOf(AggregateError);
				await expect(stopping).rejects.toMatchObject({ errors: [expect.any(NativeReleaseError)] });
				await expect(stopping).rejects.toMatchObject({
					errors: [{ outcomes: [{ sid: session.sid, notice: undefined, reason: 'cleanup-incomplete' }] }],
				});
			}
			expect(f.ended).toContain(session.sid);
			expect(f.connected).toBe(true);
			expect(f.starts).toBe(1);
			f.complete({ rows: [{ name: 'browser-survives' }] });
			await expect(reading).resolves.toEqual({ rows: [{ name: 'browser-survives' }] });
			expect(f.connected).toBe(false);
			expect(f.starts).toBe(1);
		} finally {
			try {
				if (stopping && protocol === 'legacy') await expect(stopping).rejects.toBeInstanceOf(AggregateError);
				else await agent.dispose();
			} finally {
				await f.dispose();
			}
		}
	});

test('without the shared workspace owner, pages are unavailable instead of reaching the Agent module', async () => {
	const f = await fixture('confirmed');
	try {
		const workspace = Reflect.get(f.browser, 'workspace') as {
			open(): Promise<string>;
			list(): unknown[];
			close(id: string): Promise<void>;
			activate(id: string): void;
		};
		await expect(workspace.open()).rejects.toThrow();
		expect(workspace.list()).toEqual([]);
		await expect(workspace.close('x')).resolves.toBeUndefined();
		expect(() => workspace.activate('x')).not.toThrow();
	} finally {
		await f.dispose();
	}
});


test('a rejected shared layout open disposes the newly allocated Browser page', async () => {
	let allocated = '';
	const sharedWorkspace = {
		browser: {
			open: async (tab: { pageId: string }) => { allocated = tab.pageId; throw new Error('recovery-busy'); },
			close: async () => {}, list: () => [], activate: () => {}, update: () => {}, subscribe: () => () => {},
		}, ready: Promise.resolve(), spaces: {}, workspaceStore: {}, dispose: async () => {},
	} as ModuleContext['sharedWorkspace'];
	const f = await fixture('confirmed', sharedWorkspace);
	try {
		const opener = f.instance.services?.find(([key]) => key === BROWSER_OPEN)?.[1] as { open(request: { url: string }): Promise<string> };
		await expect(opener.open({ url: 'https://example.com' })).rejects.toThrow('recovery-busy');
		expect(allocated).not.toBe('');
		expect(f.browser.getPage(allocated)).toBeUndefined();
		expect(f.starts).toBe(0);
	} finally { await f.dispose(); }
});

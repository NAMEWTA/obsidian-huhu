import { expect, test, vi } from 'vitest';
import { Terminal } from '@xterm/xterm';
import {
	SCREEN_ENGINE,
	type ScreenCell,
	type ScreenPatch,
	type ScreenSnapshot,
	type ScreenState,
} from '../../core/terminal/frames-screen';
import { XtermScreenTarget } from './terminal-screen-xterm';

const bootstrap = vi.hoisted(() => ({ constructed: 0, failOpen: false }));
vi.mock('@xterm/xterm', async (importOriginal) => {
	const original = await importOriginal<typeof import('@xterm/xterm')>();
	return {
		...original,
		Terminal: class extends original.Terminal {
			constructor(options?: ConstructorParameters<typeof original.Terminal>[0]) {
				super(options);
				bootstrap.constructed++;
			}
			override open(parent: HTMLElement): void {
				if (bootstrap.failOpen) throw new Error('deliberate bootstrap failure');
				super.open(parent);
			}
		},
	};
});
vi.mock('../../platform/desktop/files', () => ({
	droppedFilePath: () => undefined,
	openPath: async () => {},
	resolveReference: async () => null,
	vaultFilePath: (vault: string, path: string) => vault + '/' + path,
}));

const blank: ScreenCell = { content: 1 << 22, fg: 0, bg: 0, chars: '', width: 1 };
const state: ScreenState = {
	applicationCursorKeys: true,
	applicationKeypad: false,
	bracketedPaste: true,
	sendFocus: false,
	mouseProtocol: 'NONE',
	mouseEncoding: 'DEFAULT',
	cursorHidden: false,
	cursorInitialized: true,
	synchronizedOutput: false,
	lastSyncCommandId: 0,
	colors: [],
};
function snapshot(): ScreenSnapshot {
	return {
		version: 1,
		engine: SCREEN_ENGINE,
		at: { runtimeId: 'runtime', contentSequence: 3 },
		geometry: { cols: 4, rows: 2 },
		active: 'normal',
		state,
		links: [],
		output: 'complete',
		buffers: [
			{
				name: 'normal',
				length: 2,
				baseY: 0,
				cursorX: 2,
				cursorY: 0,
				rows: [
					{
						key: 'a',
						isWrapped: false,
						cells: [
							{ content: (2 << 22) | 0x4e2d, fg: 0, bg: 0, chars: '中', width: 2 },
							{ content: 0, fg: 0, bg: 0, chars: '', width: 0 },
							blank,
							blank,
						],
					},
					{ key: 'b', isWrapped: false, cells: [blank, blank, blank, blank] },
				],
			},
			{ name: 'alternate', length: 0, baseY: 0, cursorX: 0, cursorY: 0, rows: [] },
		],
	};
}

test('a parsed snapshot imports wide cells and input modes without VT replay', () => {
	const terminal = new Terminal({ cols: 4, rows: 2, allowProposedApi: true });
	const target = new XtermScreenTarget(terminal);
	try {
		target.installSnapshot(snapshot());
		expect(terminal.buffer.normal.getLine(0)?.getCell(0)?.getChars()).toBe('中');
		expect(terminal.buffer.normal.getLine(0)?.getCell(1)?.getWidth()).toBe(0);
		expect(terminal.buffer.normal.cursorX).toBe(2);
		expect(terminal.modes.applicationCursorKeysMode).toBe(true);
		expect(terminal.modes.bracketedPasteMode).toBe(true);
	} finally {
		target.dispose();
		terminal.dispose();
	}
});

test('a continuous cell patch updates the display and refuses a duplicate watermark', () => {
	const terminal = new Terminal({ cols: 4, rows: 2, allowProposedApi: true });
	const target = new XtermScreenTarget(terminal),
		initial = snapshot();
	try {
		target.installSnapshot(initial);
		const patch: ScreenPatch = {
			kind: 'patch',
			from: initial.at,
			to: { ...initial.at, contentSequence: 4 },
			geometry: initial.geometry,
			active: initial.active,
			state: initial.state,
			links: [],
			output: 'complete',
			buffers: initial.buffers.map(({ rows: _rows, ...header }) => header),
			effects: [],
			operations: [
				{
					kind: 'cells',
					buffer: 'normal',
					row: 1,
					start: 0,
					cells: [{ content: (1 << 22) | 88, chars: 'X', width: 1, fg: 0, bg: 0 }],
				},
			],
		};
		target.applyPatch(patch);
		expect(terminal.buffer.normal.getLine(1)?.translateToString(true)).toBe('X');
		expect(target.watermark).toEqual(patch.to);
		expect(() => target.applyPatch(patch)).toThrow(/discontinuous/);
	} finally {
		target.dispose();
		terminal.dispose();
	}
});

test('a late production projection joins incomplete parser state and receives one parsed continuation', async () => {
	const { TerminalSession } = await import('../../services/terminal/session');
	const session = new TerminalSession({
		id: 'late-view',
		sid: 1,
		kind: 'shell',
		title: 'Fixture',
		cwd: '/',
		cols: 20,
		rows: 4,
		scrollback: 20,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
	});
	const replies: string[] = [];
	session.attach({ input: (_, data) => replies.push(String(data)), resize() {}, acknowledge() {}, end() {} }, 1);
	const terminals = [
		new Terminal({ cols: 20, rows: 4, allowProposedApi: true }),
		new Terminal({ cols: 20, rows: 4, allowProposedApi: true }),
	];
	const targets = terminals.map((terminal) => new XtermScreenTarget(terminal));
	const { TerminalPresentation } = await import('./terminal-presentation');
	const errors: unknown[] = [];
	const presentations = targets.map(
		(target) =>
			new TerminalPresentation({
				open: (options, sink) => session.openScreen(options, sink),
				installSnapshot: (snapshot) => target.installSnapshot(snapshot),
				applyPatch: (patch) => target.applyPatch(patch),
				error: (error) => errors.push(error),
			}),
	);
	try {
		session.receive(new TextEncoder().encode('before\x1b['));
		await session.whenParsed();
		presentations.forEach((presentation) => presentation.setVisible(true));
		session.receive(new TextEncoder().encode('31mAFTER\x1b[6n'));
		await session.whenParsed();
		for (const terminal of terminals) {
			expect(terminal.buffer.normal.getLine(0)?.translateToString(true)).toBe('beforeAFTER');
			expect(terminal.buffer.normal.getLine(0)?.getCell(6)?.getFgColor()).toBe(1);
		}
		expect(replies).toHaveLength(1);
		expect(errors).toEqual([]);
	} finally {
		presentations.forEach((p) => p.dispose());
		targets.forEach((t) => t.dispose());
		terminals.forEach((t) => t.dispose());
		session.dispose();
	}
});

test('projection limits reject an invalid grid before importing any cells', () => {
	const terminal = new Terminal({ cols: 4, rows: 2, allowProposedApi: true }),
		target = new XtermScreenTarget(terminal);
	try {
		expect(() => target.installSnapshot({ ...snapshot(), geometry: { cols: Infinity, rows: 2 } })).toThrow(
			/geometry/,
		);
		expect(target.watermark).toBeUndefined();
	} finally {
		target.dispose();
		terminal.dispose();
	}
});

test.each([true, false])(
	'view admission precedes bootstrap and failure releases every acquired lease (rejected=%s)',
	async (rejected) => {
		const { TerminalView } = await import('./terminal-view');
		const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
		const { DEFAULT_TERMINAL_SETTINGS } = await import('../../core/terminal/settings');
		const { DEFAULT_SCREEN_PROFILE } = await import('../../core/terminal/frames-screen');
		const { t } = await import('../../../../shared/i18n');
		const lease = { runtimeId: 'bootstrap', viewId: 'view', leaseId: 'lease' };
		const register = vi.fn(() => {
				if (rejected) throw new Error('admission rejected');
				return lease;
			}),
			unregister = vi.fn();
		const session = {
			id: 'bootstrap',
			cols: 20,
			rows: 4,
			onChange: () => () => {},
			registerView: register,
			unregisterView: unregister,
			getScreenProfile: () => DEFAULT_SCREEN_PROFILE,
		} as unknown as import('../../services/terminal/session').TerminalSession;
		const settings = vi.fn(() => ({ ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom' as const }));
		const beforeWin = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'win'),
			beforeToggle = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'toggleClass');
		Object.defineProperty(HTMLElement.prototype, 'win', {
			configurable: true,
			get(this: HTMLElement) {
				return this.ownerDocument.defaultView;
			},
		});
		Object.defineProperty(HTMLElement.prototype, 'toggleClass', {
			configurable: true,
			value(this: HTMLElement, name: string, enabled: boolean) {
				this.classList.toggle(name, enabled);
			},
		});
		const parent = document.createElement('div');
		document.body.append(parent);
		const view = new TerminalView(parent, session, {
			app: {} as import('obsidian').App,
			settings,
			retention: new HiddenRendererRetention(),
			vaultPath: () => undefined,
			focused() {},
		});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {}),
			baseline = bootstrap.constructed;
		bootstrap.failOpen = true;
		try {
			expect(view.hasRenderer).toBe(false);
			let thrown: unknown;
			try {
				view.setVisible(true);
			} catch (failure) {
				thrown = failure;
			}
			expect(view.hasRenderer).toBe(false);
			expect(register).toHaveBeenCalledOnce();
			expect(bootstrap.constructed - baseline).toBe(rejected ? 0 : 1);
			expect(thrown).toBeUndefined();
			expect(parent.querySelector('.xterm')).toBeNull();
			expect(parent.querySelector('[role=status]')?.textContent).toBe(t('agent.screen.unavailable'));
			expect(unregister).toHaveBeenCalledTimes(rejected ? 0 : 1);
			if (!rejected) expect(unregister).toHaveBeenCalledWith(lease);
			view.dispose();
			expect(view.hasRenderer).toBe(false);
			expect(unregister).toHaveBeenCalledTimes(rejected ? 0 : 1);
		} finally {
			bootstrap.failOpen = false;
			error.mockRestore();
			view.dispose();
			parent.remove();
			for (const [name, descriptor] of [
				['win', beforeWin],
				['toggleClass', beforeToggle],
			] as const) {
				if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
				else Reflect.deleteProperty(HTMLElement.prototype, name);
			}
		}
	},
);

test('disposing a view completes every cleanup after a disposer throws and returns its lease last', async () => {
	const { TerminalView } = await import('./terminal-view');
	const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
	const { DEFAULT_TERMINAL_SETTINGS } = await import('../../core/terminal/settings');
	const log: string[] = [];
	const lease = { runtimeId: 'cleanup', viewId: 'view', leaseId: 'lease' };
	const session = {
		id: 'cleanup',
		onChange: () => () => log.push('onChange'),
		unregisterView: () => log.push('unregister'),
	} as unknown as import('../../services/terminal/session').TerminalSession;
	const retention = new HiddenRendererRetention();
	vi.spyOn(retention, 'release').mockImplementation(() => {
		log.push('retention');
	});
	const parent = document.createElement('div');
	document.body.append(parent);
	const view = new TerminalView(parent, session, {
		app: {} as import('obsidian').App,
		settings: () => DEFAULT_TERMINAL_SETTINGS,
		retention,
		vaultPath: () => undefined,
		focused() {},
	});
	const remove = view.el.remove.bind(view.el);
	vi.spyOn(view.el, 'remove').mockImplementation(() => {
		log.push('element');
		remove();
	});
	Object.assign(view, {
		lease,
		presentation: {
			dispose() {
				log.push('presentation');
				throw new Error('deliberate disposer failure');
			},
		},
		fitter: { cancel: () => log.push('fitter') },
		observer: { disconnect: () => log.push('observer') },
		webgl: { dispose: () => log.push('webgl') },
		target: { dispose: () => log.push('target') },
		term: { dispose: () => log.push('term') },
	});
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		expect(() => view.dispose()).not.toThrow();
		expect(log).toEqual([
			'presentation',
			'fitter',
			'observer',
			'onChange',
			'webgl',
			'target',
			'term',
			'retention',
			'element',
			'unregister',
		]);
		expect(error).toHaveBeenCalledOnce();
		expect(Reflect.get(view, 'term')).toBeUndefined();
		expect(Reflect.get(view, 'lease')).toBeUndefined();
		view.dispose();
		expect(log.filter((value) => value === 'unregister')).toHaveLength(1);
	} finally {
		error.mockRestore();
		parent.remove();
	}
});

test.each([
	['normal', 'raw'],
	['normal', 'fragmented'],
	['normal', 'menu'],
	['alternate', 'raw'],
	['alternate', 'fragmented'],
	['alternate', 'menu'],
] as const)('parsed %s %s RIS clears selection and synchronized output like stock xterm', async (buffer, route) => {
	const { TerminalSession } = await import('../../services/terminal/session');
	const { TerminalPresentation } = await import('./terminal-presentation');
	const session = new TerminalSession({
		id: `reset-${buffer}-${route}`,
		sid: 1,
		kind: 'shell',
		title: 'Fixture',
		cwd: '/',
		cols: 20,
		rows: 4,
		scrollback: 20,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
	});
	session.attach({ input() {}, resize() {}, acknowledge() {}, end() {} }, 1);
	const terminals = [0, 1].map(() => new Terminal({ cols: 20, rows: 4, allowProposedApi: true }));
	const containers = terminals.map(() => document.body.appendChild(document.createElement('div')));
	terminals.forEach((terminal, index) => terminal.open(containers[index]!));
	const [projected, stock] = terminals as [Terminal, Terminal];
	const target = new XtermScreenTarget(projected),
		errors: unknown[] = [];
	const presentation = new TerminalPresentation({
		open: (options, sink) => session.openScreen(options, sink),
		installSnapshot: (value) => target.installSnapshot(value),
		applyPatch: (patch) => target.applyPatch(patch),
		error: (error) => errors.push(error),
	});
	const feed = async (raw: string) => {
		session.receive(new TextEncoder().encode(raw));
		await session.whenParsed();
		await new Promise<void>((resolve) => stock.write(raw, resolve));
	};
	try {
		presentation.setVisible(true);
		await feed(`${buffer === 'alternate' ? '\x1b[?1049h' : ''}SELECTME\x1b[?2026h`);
		projected.select(0, 0, 8);
		stock.select(0, 0, 8);
		expect(projected.getSelection()).toBe('SELECTME');
		if (route === 'menu') {
			session.reset();
			await session.whenParsed();
			await new Promise<void>((resolve) => stock.write('\x1bc', resolve));
			await feed('NEW TEXT');
		} else if (route === 'fragmented') {
			await feed('\x1b');
			await feed('cNEW TEXT');
		} else await feed('\x1bcNEW TEXT');
		expect(errors).toEqual([]);
		expect(stock.hasSelection()).toBe(false);
		expect(projected.hasSelection()).toBe(false);
		expect(projected.modes.synchronizedOutputMode).toBe(stock.modes.synchronizedOutputMode);
		expect(projected.modes.synchronizedOutputMode).toBe(false);
		expect(projected.buffer.active.type).toBe(stock.buffer.active.type);
		expect(projected.buffer.normal.getLine(0)?.translateToString(true)).toBe('NEW TEXT');
	} finally {
		presentation.dispose();
		target.dispose();
		terminals.forEach((terminal) => terminal.dispose());
		session.dispose();
		containers.forEach((container) => container.remove());
	}
});

test.each(['throw', 'none', 'unknown'] as const)(
	'running resize %s remains visible to both views until the current native request applies',
	async (failure) => {
		const { TerminalSession } = await import('../../services/terminal/session');
		const { TerminalView } = await import('./terminal-view');
		const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
		const { DEFAULT_TERMINAL_SETTINGS } = await import('../../core/terminal/settings');
		const session = new TerminalSession({
			id: `resize-status-${failure}`,
			sid: 1,
			kind: 'shell',
			title: 'Fixture',
			cwd: '/',
			cols: 20,
			rows: 4,
			scrollback: 20,
			platform: 'linux',
			colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
		});
		let op = 0;
		let applied:
			((value: import('../../../../shared/native/input').NativeResizeFinishedResult) => void) | undefined;
		session.attach(
			{
				input() {},
				resize() {},
				acknowledge() {},
				end() {},
				submitResize() {
					op++;
					if (op === 1) {
						if (failure === 'throw') throw new Error('fixture native resize admission failure');
						const result =
							failure === 'none'
								? ({ op, state: 'none', reason: 'capacity' } as const)
								: ({ op, state: 'unknown', reason: 'transport-lost' } as const);
						return { op, queued: Promise.resolve(result), finished: Promise.resolve(result), cancel() {} };
					}
					return {
						op,
						queued: Promise.resolve({ op, state: 'queued' } as const),
						finished: new Promise((resolve) => {
							applied = resolve;
						}),
						cancel() {},
					};
				},
			},
			1,
		);
		const parents = [0, 1].map(() => document.body.appendChild(document.createElement('div')));
		const views = parents.map(
			(parent) =>
				new TerminalView(parent, session, {
					app: {} as import('obsidian').App,
					settings: () => DEFAULT_TERMINAL_SETTINGS,
					retention: new HiddenRendererRetention(),
					vaultPath: () => undefined,
					focused() {},
				}),
		);
		const statuses = parents.map((parent) => parent.querySelector<HTMLElement>('[role=status]')!);
		const owner = session.registerView('resize-owner'),
			follower = session.registerView('resize-follower');
		session.setViewVisible(owner, true);
		session.setViewVisible(follower, true);
		session.setViewFocused(owner, true);
		try {
			expect((await session.requestViewSize(owner, { cols: 21, rows: 4 })).status).toBe('accepted');
			await session.whenParsed();
			await Promise.resolve();
			expect(session.running).toBe(true);
			for (const status of statuses) {
				expect(status.hidden).toBe(false);
				expect(status.textContent).toContain(session.resizeDiagnostic!.message);
			}
			const unresolved = session.resizeDiagnostic!.message;
			expect(await session.requestViewSize(follower, { cols: 40, rows: 4 })).toEqual({
				status: 'rejected',
				reason: 'not-owner',
			});
			expect((await session.requestViewSize(owner, { cols: 22, rows: 4 })).status).toBe('accepted');
			await session.whenParsed();
			statuses.forEach((status) => expect(status.textContent).toContain(unresolved));
			views[0]!.dispose();
			const disposedText = statuses[0]!.textContent;
			applied!({ op: 2, state: 'applied' });
			await Promise.resolve();
			await session.whenParsed();
			expect(session.resizeDiagnostic).toBeUndefined();
			expect(statuses[1]!.hidden).toBe(true);
			expect(statuses[1]!.textContent).toBe('');
			expect(statuses[0]!.textContent).toBe(disposedText);
		} finally {
			views.forEach((view) => view.dispose());
			session.unregisterView(owner);
			session.unregisterView(follower);
			session.dispose();
			parents.forEach((parent) => parent.remove());
		}
	},
);

test('running input, resize and sticky reply diagnostics keep their own visible messages', async () => {
	const { TerminalSession } = await import('../../services/terminal/session');
	const { TerminalView } = await import('./terminal-view');
	const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
	const { DEFAULT_TERMINAL_SETTINGS } = await import('../../core/terminal/settings');
	const session = new TerminalSession({
		id: 'diagnostic-channels',
		sid: 1,
		kind: 'shell',
		title: 'Fixture',
		cwd: '/',
		cols: 20,
		rows: 4,
		scrollback: 20,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
	});
	const replies: Array<string | Uint8Array> = [],
		stops: string[] = [];
	session.attach(
		{
			input() {},
			reply: (_, data) => replies.push(data),
			resize() {},
			acknowledge() {},
			end() {},
			resourceLimit: (reason) => stops.push(reason),
			submitResize() {
				const value = { op: 1, state: 'none', reason: 'capacity' } as const;
				return { op: 1, queued: Promise.resolve(value), finished: Promise.resolve(value), cancel() {} };
			},
		},
		1,
	);
	const parent = document.body.appendChild(document.createElement('div'));
	const view = new TerminalView(parent, session, {
		app: {} as import('obsidian').App,
		settings: () => DEFAULT_TERMINAL_SETTINGS,
		retention: new HiddenRendererRetention(),
		vaultPath: () => undefined,
		focused() {},
	});
	const owner = session.registerView('diagnostics-owner');
	session.setViewVisible(owner, true);
	session.setViewFocused(owner, true);
	try {
		await session.requestViewSize(owner, { cols: 21, rows: 4 });
		await session.whenParsed();
		session.inputFailure({ op: 8, state: 'none', reason: 'capacity' });
		session.replyFailure({ state: 'none', reason: 'capacity' });
		const first = session.replyDiagnostic;
		session.replyFailure({ state: 'unknown', reason: 'transport-lost' });
		session.receive(new TextEncoder().encode('still parsed\x1b[5n'));
		await session.whenParsed();
		const status = parent.querySelector<HTMLElement>('[role=status]')!;
		for (const diagnostic of [session.inputDiagnostic, session.resizeDiagnostic, session.replyDiagnostic])
			expect(status.textContent).toContain(diagnostic!.message);
		expect(status.hidden).toBe(false);
		expect(session.replyDiagnostic).toBe(first);
		expect(replies).toHaveLength(1);
		expect(stops).toHaveLength(1);
		expect(session.getScreenUsage().status).toBe('ok');
	} finally {
		view.dispose();
		session.unregisterView(owner);
		session.dispose();
		parent.remove();
	}
});

async function activityViewFixture(starting = false) {
	const { TerminalSession } = await import('../../services/terminal/session');
	const { TerminalView } = await import('./terminal-view');
	const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
	const { DEFAULT_TERMINAL_SETTINGS } = await import('../../core/terminal/settings');
	const session = new TerminalSession({
		id: 'activity-view',
		sid: 1,
		kind: 'shell',
		title: 'Activity',
		cwd: '/',
		cols: 20,
		rows: 4,
		scrollback: 20,
		platform: 'linux',
		colors: () => ({ foreground: '#ccc', background: '#111', cursor: '#fff' }),
	});
	if (!starting) session.attach({ input() {}, resize() {}, acknowledge() {}, end() {} }, 1);
	const before = ['win', 'toggleClass'].map(
		(name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const,
	);
	Object.defineProperty(HTMLElement.prototype, 'win', {
		configurable: true,
		get(this: HTMLElement) {
			return this.ownerDocument.defaultView;
		},
	});
	Object.defineProperty(HTMLElement.prototype, 'toggleClass', {
		configurable: true,
		value(this: HTMLElement, name: string, on: boolean) {
			this.classList.toggle(name, on);
		},
	});
	const io = new Map<Element, IntersectionObserverCallback>();
	class Observer {
		constructor(private callback: IntersectionObserverCallback) {}
		observe(el: Element) {
			io.set(el, this.callback);
		}
		unobserve(el: Element) {
			io.delete(el);
		}
		disconnect() {
			for (const [el, callback] of io) if (callback === this.callback) io.delete(el);
		}
	}
	const oldIO = window.IntersectionObserver;
	Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
	const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 400,
		bottom: 120,
		width: 400,
		height: 120,
		toJSON() {},
	});
	const renders: Array<(event: { start: number; end: number }) => void> = [];
	const beforeRender = Object.getOwnPropertyDescriptor(Terminal.prototype, 'onRender');
	Object.defineProperty(Terminal.prototype, 'onRender', {
		configurable: true,
		get: () => (listener: Parameters<Terminal['onRender']>[0]) => {
			renders.push(listener);
			return {
				dispose() {
					const index = renders.indexOf(listener);
					if (index >= 0) renders.splice(index, 1);
				},
			};
		},
	});
	const refresh = vi.spyOn(Terminal.prototype, 'refresh');
	const presented = vi.fn();
	const parent = document.body.appendChild(document.createElement('div'));
	const view = new TerminalView(parent, session, {
		app: {} as import('obsidian').App,
		settings: () => ({ ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom' }),
		retention: new HiddenRendererRetention(),
		vaultPath: () => undefined,
		focused() {},
		presented,
	});
	return {
		view,
		session,
		presented,
		refresh,
		renders,
		focus,
		intersect(on: boolean) {
			for (const [target, callback] of io)
				callback(
					[{ target, isIntersecting: on, intersectionRatio: on ? 1 : 0 } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				);
		},
		async ready() {
			view.setVisible(true);
			session.receive(new TextEncoder().encode('rendered activity'));
			await session.whenParsed();
			await Promise.resolve();
			this.intersect(true);
		},
		cleanup() {
			view.dispose();
			session.dispose();
			parent.remove();
			if (beforeRender) Object.defineProperty(Terminal.prototype, 'onRender', beforeRender);
			else Reflect.deleteProperty(Terminal.prototype, 'onRender');
			refresh.mockRestore();
			rect.mockRestore();
			focus.mockRestore();
			Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: oldIO });
			for (const [name, descriptor] of before) {
				if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
				else Reflect.deleteProperty(HTMLElement.prototype, name);
			}
		},
	};
}

/** Third-party event boundary: xterm restores redraw-only after all public render listeners return. */
function publicRenderTailGate(f: Awaited<ReturnType<typeof activityViewFixture>>) {
	let inside = false,
		queued = false,
		redrawOnly = true;
	const reentrant: number[] = [];
	f.refresh.mockImplementation(() => {
		if (inside) reentrant.push(f.refresh.mock.calls.length);
		queued = true;
		redrawOnly = false;
	});
	return {
		reentrant,
		paint() {
			if (!queued) return;
			queued = false;
			inside = true;
			try {
				if (!redrawOnly) for (const listener of [...f.renders]) listener({ start: 0, end: f.session.rows - 1 });
			} finally {
				inside = false;
				redrawOnly = true;
			}
		},
	};
}

test.each(['pending', 'receipt reentry', 'rows mismatch'] as const)(
	'public render tail requires one stack-external rearm for %s',
	async (mode) => {
		const f = await activityViewFixture();
		const lease = mode === 'rows mismatch' ? f.session.registerView('explicit-owner') : undefined;
		try {
			await f.ready();
			const gate = publicRenderTailGate(f);
			f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 7 });
			if (mode === 'pending') {
				f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 8 });
				f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 9 });
			} else if (mode === 'receipt reentry') {
				f.presented.mockImplementationOnce(() => {
					f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 8 });
					f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 9 });
				});
			} else if (lease) {
				f.session.setViewVisible(lease, true);
				f.session.setViewFocused(lease, true);
				await f.session.requestViewSize(lease, { cols: 18, rows: 6 });
				await f.session.whenParsed();
			}
			const before = f.refresh.mock.calls.length;
			gate.paint();
			expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual(
				mode === 'rows mismatch' ? [] : [7],
			);
			await Promise.resolve();
			expect(gate.reentrant).toEqual([]);
			expect(f.refresh.mock.calls.length - before).toBe(1);
			gate.paint();
			expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual(
				mode === 'rows mismatch' ? [7] : [7, 9],
			);
			const settled = f.refresh.mock.calls.length;
			await Promise.resolve();
			gate.paint();
			expect(f.refresh).toHaveBeenCalledTimes(settled);
		} finally {
			if (lease) f.session.unregisterView(lease);
			f.cleanup();
		}
	},
);

test.each(['clear', 'hide', 'offscreen', 'blur', 'dispose', 'adoption', 'generation'] as const)(
	'a deferred public render rearm is invalidated by %s',
	async (cancel) => {
		const f = await activityViewFixture();
		try {
			await f.ready();
			const gate = publicRenderTailGate(f);
			f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 7 });
			f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 9 });
			gate.paint();
			expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual([7]);
			if (cancel === 'clear' || cancel === 'generation') f.view.presentActivity(undefined);
			if (cancel === 'hide') f.view.setVisible(false);
			if (cancel === 'offscreen') f.intersect(false);
			if (cancel === 'blur') {
				f.focus.mockReturnValue(false);
				window.dispatchEvent(new Event('blur'));
			}
			if (cancel === 'dispose') f.view.dispose();
			if (cancel === 'adoption') {
				const doc = document.implementation.createHTMLDocument('another owner');
				doc.body.append(doc.adoptNode(f.view.el));
			}
			if (cancel === 'generation') f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 11 });
			const cancelled = f.refresh.mock.calls.length;
			await Promise.resolve();
			expect(gate.reentrant).toEqual([]);
			expect(f.refresh).toHaveBeenCalledTimes(cancelled);
			gate.paint();
			expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual(
				cancel === 'generation' ? [7, 11] : [7],
			);
			await Promise.resolve();
			expect(f.refresh).toHaveBeenCalledTimes(cancelled);
		} finally {
			f.cleanup();
		}
	},
);

test('activity ready is not presentation; only a complete public render reports the immutable captured mark', async () => {
	const f = await activityViewFixture();
	try {
		const at = { runtimeId: f.session.id, activitySequence: 7 };
		f.view.presentActivity(at);
		expect(f.presented).not.toHaveBeenCalled();
		await f.ready();
		expect(f.presented).not.toHaveBeenCalled();
		expect(f.refresh).toHaveBeenCalledWith(0, 3);
		at.activitySequence = 99;
		for (const render of [...f.renders]) render({ start: 0, end: 1 });
		expect(f.presented).not.toHaveBeenCalled();
		for (const render of [...f.renders]) render({ start: 2, end: 3 });
		expect(f.presented).toHaveBeenCalledOnce();
		expect(f.presented.mock.calls[0]?.[1]).toEqual({
			at: { runtimeId: f.session.id, activitySequence: 7 },
			installed: expect.objectContaining({ runtimeId: f.session.id }),
		});
	} finally {
		f.cleanup();
	}
});

test('one render and one latest activity mark preserve N and coalesce N+1 without acquiring a size owner', async () => {
	const f = await activityViewFixture();
	const size = vi.spyOn(f.session, 'requestViewSize');
	try {
		await f.ready();
		f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 7 });
		f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 8 });
		f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 9 });
		for (const render of [...f.renders]) render({ start: 0, end: 3 });
		expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual([7]);
		await Promise.resolve();
		for (const render of [...f.renders]) render({ start: 0, end: 3 });
		expect(f.presented.mock.calls.map((call) => call[1].at.activitySequence)).toEqual([7, 9]);
		f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 9 });
		for (const render of [...f.renders]) render({ start: 0, end: 3 });
		expect(f.presented).toHaveBeenCalledTimes(2);
		expect(size).not.toHaveBeenCalled();
	} finally {
		size.mockRestore();
		f.cleanup();
	}
});

test.each(['hidden', 'offscreen', 'blur', 'inert', 'dispose'] as const)(
	'activity rendering while %s cannot produce a presentation receipt',
	async (gate) => {
		const f = await activityViewFixture();
		try {
			await f.ready();
			f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 7 });
			const callbacks = [...f.renders];
			if (gate === 'hidden') f.view.setVisible(false);
			if (gate === 'offscreen') f.intersect(false);
			if (gate === 'blur') {
				f.focus.mockReturnValue(false);
				window.dispatchEvent(new Event('blur'));
			}
			if (gate === 'inert') f.view.el.parentElement!.inert = true;
			if (gate === 'dispose') f.view.dispose();
			for (const render of callbacks) render({ start: 0, end: 3 });
			expect(f.presented).not.toHaveBeenCalled();
			if (gate !== 'dispose') {
				f.view.el.parentElement!.inert = false;
				f.focus.mockReturnValue(true);
				window.dispatchEvent(new Event('focus'));
				f.view.setVisible(true);
				f.intersect(true);
				await f.session.whenParsed();
				for (const render of [...f.renders]) render({ start: 0, end: 3 });
				expect(f.presented).toHaveBeenCalledOnce();
			}
		} finally {
			f.cleanup();
		}
	},
);

test('a geometry change during an activity refresh rearms the full new viewport without acknowledging a partial old render', async () => {
	const f = await activityViewFixture();
	const lease = f.session.registerView('external-explicit-owner');
	try {
		await f.ready();
		f.view.presentActivity({ runtimeId: f.session.id, activitySequence: 7 });
		f.session.setViewVisible(lease, true);
		f.session.setViewFocused(lease, true);
		expect(await f.session.requestViewSize(lease, { cols: 18, rows: 6 })).toMatchObject({ status: 'accepted' });
		await f.session.whenParsed();
		for (const render of [...f.renders]) render({ start: 0, end: 3 });
		expect(f.presented).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(f.refresh).toHaveBeenLastCalledWith(0, 5);
		for (const render of [...f.renders]) render({ start: 0, end: 5 });
		expect(f.presented).toHaveBeenCalledOnce();
	} finally {
		f.session.unregisterView(lease);
		f.cleanup();
	}
});

test('a mounted View offers only its exact textarea and one synchronous focus within the presenter stack', async () => {
	const f = await activityViewFixture();
	const present = vi.fn(() => true),
		focus = vi.spyOn(Terminal.prototype, 'focus');
	try {
		expect(f.view.hasRenderer).toBe(false);
		expect(f.view.presentFocus(present)).toBe(false);
		expect(present).not.toHaveBeenCalled();
		await f.ready();
		expect(f.view.hasRenderer).toBe(true);
		const focused = vi.spyOn(f.session, 'setViewFocused');
		expect(
			f.view.presentFocus((textarea, commit) => {
				expect(textarea).toBe(f.view.el.querySelector('textarea'));
				expect(focused).not.toHaveBeenCalled();
				commit();
				commit();
				return true;
			}),
		).toBe(true);
		expect(focus).toHaveBeenCalledOnce();
		// The synchronous grant and the real textarea focus event are idempotent for the same lease.
		expect(focused).toHaveBeenCalled();
		expect(focused.mock.calls.every(([lease, on]) => lease.runtimeId === f.session.id && on)).toBe(true);
		expect(document.activeElement).toBe(f.view.el.querySelector('textarea'));
		focus.mockClear();
		let deferred: (() => void) | undefined;
		f.view.presentFocus((_textarea, commit) => {
			deferred = commit;
			return false;
		});
		deferred?.();
		expect(focus).not.toHaveBeenCalled();
		f.view.dispose();
		expect(f.view.hasRenderer).toBe(false);
		expect(f.view.presentFocus(present)).toBe(false);
	} finally {
		focus.mockRestore();
		f.cleanup();
	}
});

test.each(['hide', 'dispose', 'adopt', 'term', 'lease'] as const)(
	'View synchronous focus rechecks the exact live renderer at commit: %s',
	async (change) => {
		const f = await activityViewFixture(),
			focus = vi.spyOn(Terminal.prototype, 'focus');
		try {
			await f.ready();
			const focused = vi.spyOn(f.session, 'setViewFocused');
			const owned = f.view as unknown as {
				term?: Terminal;
				lease?: import('../../core/terminal/frames-screen').ScreenViewLease;
			};
			const term = owned.term,
				lease = owned.lease;
			f.view.presentFocus((_textarea, commit) => {
				if (change === 'hide') f.view.setVisible(false);
				if (change === 'dispose') f.view.dispose();
				if (change === 'adopt') {
					const doc = document.implementation.createHTMLDocument('other');
					doc.body.append(doc.adoptNode(f.view.el));
				}
				// These two independent lifetime substitutions test captured identity, not parser state.
				if (change === 'term') owned.term = undefined;
				if (change === 'lease') owned.lease = undefined;
				focused.mockClear();
				commit();
				if (change === 'term') owned.term = term;
				if (change === 'lease') owned.lease = lease;
				return true;
			});
			expect(focus).not.toHaveBeenCalled();
			expect(focused).not.toHaveBeenCalled();
		} finally {
			focus.mockRestore();
			f.cleanup();
		}
	},
);

test.each(['quota', 'pending'] as const)(
	'actual Host focus subscription needs a successful screen lease and releases before the renderer lease (%s)',
	async (boundary) => {
		const f = await activityViewFixture(boundary === 'pending');
		const { render } = await import('@testing-library/react');
		const { TestProviders } = await import('../../../../ui/react/test-providers');
		const { WorkspaceUIContext } = await import('../workspace/workspace-context');
		const { TerminalHost } = await import('./TerminalTabView');
		const { HiddenRendererRetention } = await import('./hidden-renderer-retention');
		const { normalizeTerminalSettings } = await import('../../core/terminal/settings');
		const { createStore } = await import('zustand/vanilla');
		const held: import('../../core/terminal/frames-screen').ScreenViewLease[] = [];
		// Exhaust the actual profile/accounting boundary; no new capacity constant or fake denial.
		while (boundary === 'quota' && held.length < f.session.getScreenProfile().maxObservers) {
			try {
				held.push(f.session.registerView(`reserved-${held.length}`));
			} catch {
				break;
			}
		}
		const { t } = await import('../../../../shared/i18n');
		const subscribers = new Set<() => void>(),
			snapshot = Object.freeze({ navigationGeneration: 0 });
		const subscribe = vi.fn((listener: () => void) => {
			subscribers.add(listener);
			return () => {
				subscribers.delete(listener);
			};
		});
		const tab: import('../../core/workspace/model').TerminalTabData = {
			kind: 'terminal',
			id: 'resource-host',
			title: 'Resource',
			createdAt: 0,
			updatedAt: 0,
			sessionIds: [f.session.id],
			focusedSessionId: f.session.id,
			paneLayout: { kind: 'pane', session: f.session.id },
			panes: { [f.session.id]: { cwd: '/' } },
			state: 'idle',
			unread: false,
		};
		const managed = { revision: 0, sessions: [] };
		const settings = normalizeTerminalSettings({ renderer: 'dom' });
		const workspace = {
			focusSession() {},
			getManagedSnapshot: () => managed,
			subscribeManaged: () => () => {},
			getFocusPresentation: () => snapshot,
			subscribeFocusPresentation: subscribe,
			presentManagedFocus: () => false,
			store: createStore(() => ({ tabs: { [tab.id]: tab } })),
		};
		const controller = {
			workspace,
			sessions: { get: () => f.session },
			app: { workspace: { on: () => ({}), offref() {} } },
			settings: { get: () => settings, subscribe: () => () => {} },
			vaultPath: () => undefined,
		} as unknown as import('../../services/controller').AgentController;
		const retention = new HiddenRendererRetention();
		const content = (active: boolean) => (
			<TestProviders>
				<WorkspaceUIContext value={{ controller, confirm: async () => false, close() {} }}>
					<TerminalHost tab={tab} sessionId={f.session.id} active={active} focused retention={retention} />
				</WorkspaceUIContext>
			</TestProviders>
		);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		let ui: ReturnType<typeof render> | undefined;
		try {
			ui = render(content(false));
			expect(subscribe).not.toHaveBeenCalled();
			ui.rerender(content(true));
			expect(subscribe).not.toHaveBeenCalled();
			expect(ui.container.querySelector('[role=status]')?.textContent).toContain(
				t(boundary === 'quota' ? 'agent.screen.unavailable' : 'agent.managed.starting'),
			);
			for (const lease of held) f.session.unregisterView(lease);
			held.length = 0;
			if (boundary === 'pending') {
				f.session.attach({ input() {}, resize() {}, acknowledge() {}, end() {} }, 1);
				ui.rerender(content(true)); // Same Session/active/focused/doc/navigation generation.
			} else {
				ui.rerender(content(false));
				ui.rerender(content(true));
			}
			expect(subscribe).toHaveBeenCalledOnce();
			expect(subscribers.size).toBe(1);
			ui.rerender(content(false));
			ui.rerender(content(true));
			expect(subscribe).toHaveBeenCalledOnce();
			const release = f.session.unregisterView.bind(f.session);
			const unregister = vi.spyOn(f.session, 'unregisterView');
			unregister.mockImplementation((lease) => {
				expect(subscribers.size).toBe(0);
				release(lease);
			});
			ui.unmount();
			ui = undefined;
			expect(unregister).toHaveBeenCalledOnce();
			expect(subscribers.size).toBe(0);
		} finally {
			ui?.unmount();
			for (const lease of held) f.session.unregisterView(lease);
			error.mockRestore();
			f.cleanup();
		}
	},
);

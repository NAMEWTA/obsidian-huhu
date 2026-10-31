import { useSyncExternalStore } from 'react';
import { expect, test, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { OwnerDocumentContext } from '../../../../ui/react/contexts';
import { WorkspaceUIContext } from '../workspace/workspace-context';
import type { AgentController } from '../../services/controller';
import type { TerminalTabData } from '../../core/workspace/model';
import { HiddenRendererRetention } from './hidden-renderer-retention';
import { TerminalHost } from './TerminalTabView';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { ManagedSnapshot } from '../../core/workspace/managed-runtime';
const terminalSettings = normalizeTerminalSettings(undefined);
import { getLanguage, setLanguage, t } from '../../../../shared/i18n';
const emptyManaged: ManagedSnapshot = { revision: 0, sessions: [] };
const ordinaryFocus = Object.freeze({ navigationGeneration: 0 });
const projection = {
	getManagedSnapshot: () => emptyManaged,
	subscribeManaged: () => () => {},
	getFocusPresentation: () => ordinaryFocus,
	subscribeFocusPresentation: () => () => {},
	presentManagedFocus: (_captured: unknown, _id: string, _textarea: HTMLElement, focus: () => void) => {
		focus();
		return true;
	},
};
const renderer = vi.hoisted(() => ({ allowed: true, beforeVisible: undefined as (() => void) | undefined }));
vi.mock('../../platform/desktop/files', () => ({ openPath: vi.fn() }));
vi.mock('./material-picker', () => ({ pickMaterial: vi.fn() }));
const created = vi.hoisted(
	() =>
		[] as Array<{
			setVisible: ReturnType<typeof vi.fn>;
			focus: ReturnType<typeof vi.fn>;
			hasRenderer: boolean;
			presentFocus: ReturnType<typeof vi.fn>;
			setFocused: ReturnType<typeof vi.fn>;
			dispose: ReturnType<typeof vi.fn>;
			presentActivity: ReturnType<typeof vi.fn>;
			presented?: (at: import('../../core/workspace/managed-runtime').ActivityMark) => void;
		}>,
);
vi.mock('./terminal-view', () => ({
	TerminalView: class {
		applySettings = vi.fn();
		private mounted = false;
		private dead = false;
		readonly el: HTMLElement;
		private textarea: HTMLTextAreaElement;
		readonly sessionId: string;
		get hasRenderer() {
			return this.mounted && !this.dead;
		}
		setVisible = vi.fn((visible: boolean) => {
			if (visible && renderer.allowed) this.mounted = true;
			renderer.beforeVisible?.();
		});
		setFocused = vi.fn();
		focus = vi.fn(() => this.textarea.focus());
		dispose = vi.fn(() => {
			this.dead = true;
			this.textarea.remove();
		});
		presentFocus = vi.fn((present: (textarea: HTMLTextAreaElement, focus: () => void) => boolean) => {
			if (!this.hasRenderer) return false;
			return present(this.textarea, () => {
				this.setFocused(true);
				this.focus();
			});
		});
		presentActivity = vi.fn();
		presented?: (at: import('../../core/workspace/managed-runtime').ActivityMark) => void;
		constructor(_parent: HTMLElement, _session: unknown, host: import('./terminal-view').TerminalViewHost) {
			this.el = _parent;
			this.sessionId = (_session as { id: string }).id;
			this.textarea = _parent.appendChild(_parent.ownerDocument.createElement('textarea'));
			this.textarea.addEventListener('focus', () =>
				host.focused(this as unknown as import('./terminal-view').TerminalView),
			);
			this.presented = (at) =>
				host.presented?.(this as unknown as import('./terminal-view').TerminalView, {
					at,
					installed: { runtimeId: at.runtimeId, contentSequence: 1 },
				});
			created.push(this);
		}
	},
}));
test('adopting a live terminal into another document disposes the old renderer and mounts the new visible renderer', () => {
	const session = { id: 'session', running: true },
		off = vi.fn();
	const controller = {
		app: { workspace: { on: vi.fn(() => ({})), offref: vi.fn() } },
		sessions: { get: () => session },
		settings: { get: () => terminalSettings, subscribe: () => off },
		workspace: { focusSession: vi.fn(), ...projection },
	} as unknown as AgentController;
	const tab: TerminalTabData = {
		kind: 'terminal',
		id: 'tab',
		title: 'Shell',
		createdAt: 0,
		updatedAt: 0,
		sessionIds: ['session'],
		focusedSessionId: 'session',
		paneLayout: { kind: 'pane', session: 'session' },
		panes: { session: { cwd: '/vault' } },
		state: 'idle',
		unread: false,
	};
	const retention = new HiddenRendererRetention();
	const content = (doc: Document) => (
		<TestProviders>
			<OwnerDocumentContext value={doc}>
				<WorkspaceUIContext value={{ controller, confirm: async () => false, close: () => {} }}>
					<TerminalHost tab={tab} sessionId="session" active focused retention={retention} />
				</WorkspaceUIContext>
			</OwnerDocumentContext>
		</TestProviders>
	);
	const view = render(content(document));
	expect(created[0]?.setVisible).toHaveBeenCalledWith(true);
	expect(created[0]?.setFocused).toHaveBeenCalledWith(true);
	const popout = document.implementation.createHTMLDocument('popout');
	popout.body.append(popout.adoptNode(view.container));
	view.rerender(content(popout));
	expect(created[0]?.dispose).toHaveBeenCalledOnce();
	expect(created[1]?.setVisible).toHaveBeenCalledWith(true);
	expect(created[1]?.setFocused).toHaveBeenCalledWith(true);
	expect(off).toHaveBeenCalledOnce();
	view.unmount();
	expect(created[1]?.dispose).toHaveBeenCalledOnce();
	expect(off).toHaveBeenCalledTimes(3);
});

test.each([
	{ live: true, agent: true },
	{ live: true, agent: false },
	{ live: false, agent: true },
	{ live: false, agent: false },
])('pane status follows its own session or recovery metadata: live=$live agent=$agent', ({ live, agent }) => {
	const agentId = agent ? ('claude-code' as const) : undefined;
	const controller = {
		app: { workspace: { on: vi.fn(() => ({})), offref: vi.fn() } },
		sessions: {
			get: () =>
				live
					? {
							id: 'pane',
							running: true,
							agentId,
							connection: 'connected',
							activity: 'idle',
							getActivitySnapshot: () => ({ sources: [], source: {} }),
						}
					: undefined,
		},
		settings: { get: () => terminalSettings, subscribe: () => () => {} },
		workspace: { focusSession: vi.fn(), ...projection },
	} as unknown as AgentController;
	const tab: TerminalTabData = {
		kind: 'terminal',
		id: 'tab',
		title: 'Claude',
		agentId: 'claude-code',
		createdAt: 0,
		updatedAt: 0,
		sessionIds: ['primary-agent', 'pane'],
		focusedSessionId: 'pane',
		paneLayout: {
			kind: 'split',
			direction: 'row',
			ratio: 0.5,
			first: { kind: 'pane', session: 'primary-agent' },
			second: { kind: 'pane', session: 'pane' },
		},
		panes: { pane: { cwd: '/vault', agentId } },
		resume: { cwd: '/vault', agentId: 'claude-code' },
		state: 'idle',
		unread: false,
	};
	render(
		<TestProviders>
			<WorkspaceUIContext value={{ controller, confirm: async () => false, close: () => {} }}>
				<TerminalHost tab={tab} sessionId="pane" active focused retention={new HiddenRendererRetention()} />
			</WorkspaceUIContext>
		</TestProviders>,
	);
	if (agent) expect(screen.getByRole('img', { name: t(live ? 'ui.idle' : 'ui.unknown') })).toBeTruthy();
	else expect(screen.queryByRole('img')).toBeNull();
});

function managedFixture(
	phase: 'connected' | 'launch-pending' | 'failed' | 'disconnected' | 'restored',
	unconfirmed = false,
) {
	const session =
		phase === 'restored'
			? undefined
			: {
					id: 'r',
					title: 'Shell',
					cwd: '/vault',
					running: phase === 'connected' || phase === 'launch-pending',
					connection: phase === 'launch-pending' ? 'starting' : phase,
					activity: 'idle',
				};
	const snapshot: ManagedSnapshot = {
		revision: 1,
		sessions: [
			{
				spaceId: 'a',
				sessionId: 's',
				title: 'Shell',
				kind: 'shell',
				createdAt: 1,
				restore: unconfirmed ? { state: 'unconfirmed', canRequestContinue: false } : undefined,
				viewState: phase === 'restored' ? 'restored' : 'attached',
				runtime:
					phase === 'restored' ? undefined : { runtimeId: 'r', phase, activity: 'idle', inputReady: false },
			},
		],
	};
	const workspace = {
		...projection,
		focusSession: vi.fn(),
		closePane: vi.fn(async () => {}),
		restore: vi.fn(async () => {}),
		report: vi.fn(),
		getManagedSnapshot: () => snapshot,
		subscribeManaged: () => () => {},
	};
	const controller = {
		app: { workspace: { on: vi.fn(() => ({})), offref: vi.fn() } },
		sessions: { get: () => session },
		settings: { get: () => terminalSettings, subscribe: () => () => {} },
		workspace,
	} as unknown as AgentController;
	const tab: TerminalTabData = {
		kind: 'terminal',
		id: 'tab',
		title: 'Shell',
		createdAt: 1,
		updatedAt: 1,
		sessionIds: ['r'],
		focusedSessionId: 'r',
		paneLayout: { kind: 'pane', session: 'r' },
		panes: { r: { cwd: '/vault', spaceId: 'a', persistentSessionId: 's' } },
		state: 'idle',
		unread: false,
	};
	render(
		<TestProviders>
			<WorkspaceUIContext value={{ controller, confirm: async () => true, close: () => {} }}>
				<TerminalHost tab={tab} sessionId="r" active focused retention={new HiddenRendererRetention()} />
			</WorkspaceUIContext>
		</TestProviders>,
	);
	return { workspace };
}

test('a live pane explains view-only close and retains terminal context operations', async () => {
	const f = managedFixture('connected'),
		user = userEvent.setup();
	expect(screen.getByText(t('agent.managed.closeViewHint'))).toBeTruthy();
	fireEvent.contextMenu(document.querySelector('[data-terminal-host="r"]')!);
	for (const key of [
		'agent.copy',
		'agent.copyPlain',
		'agent.paste',
		'agent.search',
		'agent.copyId',
		'agent.copyPath',
		'agent.paneTitle',
		'agent.splitRight',
		'agent.splitDown',
		'agent.fontLarger',
		'agent.managed.closeView',
	])
		expect(screen.getByRole('menuitem', { name: t(key) })).toBeTruthy();
	await user.click(screen.getByRole('menuitem', { name: t('agent.managed.closeView') }));
	expect(f.workspace.closePane).toHaveBeenCalledWith('r', expect.any(Function));
	expect(f.workspace.restore).not.toHaveBeenCalled();
});

test.each(['launch-pending', 'failed', 'disconnected', 'restored'] as const)(
	'%s is accurately labelled and ordinary rendering never starts a runtime',
	(phase) => {
		const count = created.length;
		const f = managedFixture(phase);
		const key = phase === 'launch-pending' ? 'starting' : phase;
		expect(screen.getByText(t(`agent.managed.${key}`))).toBeTruthy();
		expect(screen.queryByText(t('agent.managed.closeViewHint'))).toBeNull();
		expect(f.workspace.restore).not.toHaveBeenCalled();
		if (phase === 'launch-pending' || phase === 'restored') expect(created).toHaveLength(count);
	},
);

test('connected inputReady=false is not treated as a generic terminal keyboard readiness gate', () => {
	const count = created.length;
	managedFixture('connected');
	expect(created).toHaveLength(count + 1);
});

test('a restored placeholder only starts after the explicit restart action', async () => {
	const f = managedFixture('restored'),
		user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: t('agent.managed.restart') }));
	await waitFor(() => expect(f.workspace.restore).toHaveBeenCalledWith('tab', 'r', true));
});

test.each(['disconnected', 'restored'] as const)(
	'%s with unconfirmed cleanup blocks blind restart and retains the record',
	async (phase) => {
		const f = managedFixture(phase, true),
			user = userEvent.setup();
		expect(screen.getByText(t('agent.managed.recoveryUnconfirmed'))).toBeTruthy();
		const restart =
			screen.queryByRole('button', { name: t('agent.managed.restart') }) ??
			screen.queryByRole('button', { name: t('agent.workspace.restart') });
		if (restart) {
			expect((restart as HTMLButtonElement).disabled).toBe(true);
			await user.click(restart);
		}
		expect(f.workspace.restore).not.toHaveBeenCalled();
	},
);

async function activityHostFixture(restored: boolean | 'retained' = false) {
	const { createStore } = await import('zustand/vanilla');
	const base = {
		spaceId: 'a',
		sessionId: 's',
		kind: 'shell' as const,
		title: 'Shell',
		createdAt: 1,
		viewState: 'attached' as const,
	};
	const activity = (sequence: number) => ({
		at: { runtimeId: 'r', activitySequence: sequence },
		revision: sequence,
		state: 'done' as const,
		observedAt: 1,
		source: {
			health: 'unknown' as const,
			capabilities: {
				activity: 'unknown' as const,
				blocking: 'unknown' as const,
				foreground: 'unknown' as const,
			},
		},
		sources: [],
		blocking: { state: 'unknown' as const },
		promptEvidence: { foreground: 'unknown' as const, inputReady: false },
		seenThrough: 0,
		unreadCompletion: true,
	});
	let snapshot: ManagedSnapshot = {
		revision: 1,
		sessions: [
			{
				...base,
				completionHint: restored
					? { runtimeId: 'r', activitySequence: 7, observedAt: 1, seenThrough: 0 }
					: undefined,
				runtime:
					restored === true
						? undefined
						: {
								runtimeId: 'r',
								phase: restored === 'retained' ? 'exited' : 'connected',
								activity: 'done',
								inputReady: false,
								activityDetail: activity(7),
							},
			},
		],
	};
	const listeners = new Set<() => void>();
	const paneId = restored ? 'record-pane' : 'r';
	const tab: TerminalTabData = {
		id: 'activity-tab',
		kind: 'terminal',
		title: 'Shell',
		createdAt: 1,
		updatedAt: 1,
		sessionIds: [paneId],
		focusedSessionId: paneId,
		paneLayout: { kind: 'pane', session: paneId },
		panes: { [paneId]: { spaceId: 'a', persistentSessionId: 's', cwd: '/' } },
		state: 'done',
		unread: true,
	};
	const mark = vi.fn<
		(
			request: import('../../core/workspace/managed-runtime').ManagedSeenRequest,
			options?: import('../../core/workspace/managed-runtime').ManagedSeenOptions,
		) => Promise<import('../../core/workspace/managed-runtime').ManagedSeenResult>
	>(async (request) => ({
		status: 'updated' as const,
		target: request.target,
		at: request.at,
		seenThrough: request.at.activitySequence,
		mode: 'runtime' as const,
		persisted: true as const,
	}));
	const workspace = {
		...projection,
		active: tab,
		store: createStore(() => ({ tabs: { [tab.id]: tab } })),
		focusSession: vi.fn(),
		getManagedSnapshot: () => snapshot,
		subscribeManaged: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		markManagedSeen: mark,
	};
	const leafContainer = document.body.appendChild(document.createElement('div'));
	const leaf = { view: { containerEl: leafContainer } };
	let recentLeaf: unknown = leaf;
	const stableSession = { id: 'r', running: true, connection: 'connected' };
	let replacement: { id: string; running: boolean } | undefined;
	const controller = {
		workspace,
		app: { workspace: { on: vi.fn(() => ({})), offref: vi.fn(), getMostRecentLeaf: () => recentLeaf } },
		sessions: {
			get: (id: string) => (restored ? (replacement?.id === id ? replacement : undefined) : stableSession),
		},
		settings: { get: () => terminalSettings, subscribe: () => () => {} },
		vaultPath: () => undefined,
	} as unknown as AgentController;
	const io = new Map<Element, IntersectionObserverCallback>();
	const oldIO = window.IntersectionObserver;
	Object.defineProperty(window, 'IntersectionObserver', {
		configurable: true,
		value: class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(el: Element) {
				io.set(el, this.callback);
			}
			disconnect() {
				for (const [el, cb] of io) if (cb === this.callback) io.delete(el);
			}
		},
	});
	const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(true),
		rect = vi
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockReturnValue({ width: 400, height: 120 } as DOMRect);
	const count = created.length;
	const context = {
		controller,
		confirm: async () => false,
		close() {},
		chrome: {
			context: { app: controller.app, leaf, contentEl: leafContainer, containerEl: leafContainer, close() {} },
			menu: undefined,
			setMenu() {},
		},
	} as unknown as import('../workspace/workspace-context').WorkspaceUI;
	const ui = render(
		<TestProviders>
			<WorkspaceUIContext value={context}>
				<TerminalHost tab={tab} sessionId={paneId} active focused retention={new HiddenRendererRetention()} />
			</WorkspaceUIContext>
		</TestProviders>,
		{ container: leafContainer },
	);
	return {
		mark,
		tab,
		ui,
		instance: created[count],
		io,
		focus,
		leaf(current: boolean) {
			recentLeaf = current ? leaf : {};
		},
		intersect(on: boolean) {
			for (const [target, cb] of io)
				cb(
					[{ target, isIntersecting: on, intersectionRatio: on ? 1 : 0 } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				);
		},
		async replaceRuntime() {
			const { act } = await import('@testing-library/react');
			act(() => {
				replacement = { id: 'r-new', running: true };
				snapshot = {
					revision: snapshot.revision + 1,
					sessions: [
						{
							...base,
							completionHint: { runtimeId: 'r', activitySequence: 7, observedAt: 1, seenThrough: 0 },
							runtime: { runtimeId: 'r-new', phase: 'connected', activity: 'unknown', inputReady: false },
						},
					],
				};
				listeners.forEach((listener) => listener());
			});
		},
		async publish(sequence: number, unread = true) {
			const { act } = await import('@testing-library/react');
			act(() => {
				snapshot = {
					revision: snapshot.revision + 1,
					sessions: [
						{
							...base,
							completionHint: restored
								? {
										runtimeId: 'r',
										activitySequence: sequence,
										observedAt: 1,
										seenThrough: unread ? 0 : sequence,
									}
								: undefined,
							runtime: restored
								? undefined
								: {
										runtimeId: 'r',
										phase: 'connected',
										activity: 'done',
										inputReady: false,
										activityDetail: {
											...activity(sequence),
											unreadCompletion: unread,
											seenThrough: unread ? 0 : sequence,
										},
									},
						},
					],
				};
				listeners.forEach((listener) => listener());
			});
		},
		cleanup() {
			ui.unmount();
			leafContainer.remove();
			focus.mockRestore();
			rect.mockRestore();
			Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: oldIO });
		},
	};
}

test('committed activity N waits for the View receipt and cannot mark a newer N+1 from a late callback', async () => {
	const f = await activityHostFixture();
	try {
		f.intersect(true);
		expect(f.mark).not.toHaveBeenCalled();
		expect(f.instance?.presentActivity).toHaveBeenCalledWith({ runtimeId: 'r', activitySequence: 7 });
		await f.publish(8);
		const { act } = await import('@testing-library/react');
		await act(async () => {
			f.instance?.presented?.({ runtimeId: 'r', activitySequence: 7 });
		});
		expect(f.mark).toHaveBeenCalledWith(
			{
				target: { spaceId: 'a', sessionId: 's', runtimeId: 'r' },
				at: { runtimeId: 'r', activitySequence: 7 },
				view: { tabId: f.tab.id, paneSessionId: 'r' },
			},
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
		expect(f.mark.mock.calls[0]?.[0].at.activitySequence).toBe(7);
	} finally {
		f.cleanup();
	}
});

test('hiding a pane cancels only its pending seen observation even after the in-memory unread flag clears', async () => {
	const f = await activityHostFixture();
	let release!: () => void;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	let signal: AbortSignal | undefined;
	f.mark.mockImplementation(async (request, options?: { signal?: AbortSignal }) => {
		signal = options?.signal;
		await held;
		return {
			status: 'updated',
			target: request.target,
			at: request.at,
			seenThrough: request.at.activitySequence,
			mode: 'runtime',
			persisted: true,
		};
	});
	try {
		const { act } = await import('@testing-library/react');
		f.intersect(true);
		act(() => f.instance?.presented?.({ runtimeId: 'r', activitySequence: 7 }));
		await f.publish(7, false);
		f.intersect(false);
		expect(signal?.aborted).toBe(true);
		expect(f.mark).toHaveBeenCalledOnce();
		await act(async () => {
			release();
			await held;
		});
	} finally {
		release();
		f.cleanup();
	}
});

test('a late pane receipt is rejected while offscreen, in another leaf, blurred or disposed', async () => {
	const f = await activityHostFixture();
	try {
		const report = () => f.instance?.presented?.({ runtimeId: 'r', activitySequence: 7 });
		f.intersect(false);
		report();
		f.intersect(true);
		f.leaf(false);
		report();
		f.leaf(true);
		f.focus.mockReturnValue(false);
		window.dispatchEvent(new Event('blur'));
		report();
		expect(f.mark).not.toHaveBeenCalled();
		f.ui.unmount();
		report();
		expect(f.mark).not.toHaveBeenCalled();
		expect(f.io.size).toBe(0);
	} finally {
		f.cleanup();
	}
});

test.each([
	['en', 'Retry'],
	['zh', '重试'],
] as const)(
	'a failed seen observation remains attached to N and retry repaints without replaying terminal input (%s)',
	async (language, retryLabel) => {
		const previousLanguage = getLanguage();
		setLanguage(language);
		const f = await activityHostFixture();
		f.mark.mockImplementationOnce(async (request) => ({
			status: 'failed',
			target: request.target,
			at: request.at,
			persisted: false,
			effect: 'unknown',
			error: {
				code: 'PERSISTENCE_FAILED',
				reason: 'save-failed',
				messageKey: 'agent.spaces.error.save',
				nextAction: 'retry-explicitly',
				details: {},
			},
		}));
		try {
			const { act } = await import('@testing-library/react');
			f.intersect(true);
			await act(async () => f.instance?.presented?.({ runtimeId: 'r', activitySequence: 7 }));
			expect(screen.getByRole('alert').textContent).toContain(t('agent.activityEvidence.seenFailed'));
			expect(screen.getByRole('alert').textContent).toContain('7');
			await f.publish(7, false);
			expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull();
			await userEvent.setup().click(screen.getByRole('button', { name: retryLabel }));
			expect(f.mark).toHaveBeenCalledOnce();
			expect(f.instance?.presentActivity).toHaveBeenLastCalledWith({ runtimeId: 'r', activitySequence: 7 });
			await act(async () => f.instance?.presented?.({ runtimeId: 'r', activitySequence: 7 }));
			expect(f.mark).toHaveBeenCalledTimes(2);
			expect(screen.queryByRole('alert')).toBeNull();
		} finally {
			f.cleanup();
			setLanguage(previousLanguage);
		}
	},
);

test.each([true, 'retained'] as const)(
	'a read-only completion hint is presented with no terminal (retained runtime=%s)',
	async (restored) => {
		const count = created.length,
			f = await activityHostFixture(restored);
		try {
			expect(created).toHaveLength(count);
			expect(screen.getByText(new RegExp(t('agent.activityEvidence.previousCompletion')))).toBeTruthy();
			expect(f.mark).not.toHaveBeenCalled();
			f.intersect(true);
			await waitFor(() => expect(f.mark).toHaveBeenCalledOnce());
			expect(f.mark.mock.calls[0]?.[0]).toEqual({
				target: { spaceId: 'a', sessionId: 's', runtimeId: 'r' },
				at: { runtimeId: 'r', activitySequence: 7 },
				view: { tabId: f.tab.id, paneSessionId: f.tab.focusedSessionId },
			});
			expect(created).toHaveLength(count);
		} finally {
			f.cleanup();
		}
	},
);

test('a replacement live runtime cannot lend its summary to an old readonly completion hint', async () => {
	const f = await activityHostFixture(true);
	try {
		f.intersect(true);
		await f.replaceRuntime();
		await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
		expect(f.mark).not.toHaveBeenCalled();
		expect(document.querySelector('[data-completion-hint]')).toBeNull();
	} finally {
		f.cleanup();
	}
});

// Actual Workspace/SpaceService/TerminalSessions and capture authority; the View double only
// supplies a native textarea focus event. Real xterm/View lifetime is verified in the sibling suite.
async function focusHostFixture() {
	const { WorkspaceService } = await import('../../services/workspace-service');
	const { SpaceService } = await import('../../services/spaces/space-service');
	const { createSpaceWorkspaceStore } = await import('../../services/workspace-store');
	const { TerminalSessions } = await import('../../services/terminal/sessions');
	const { NativeHost } = await import('../../../../host/desktop/native/host');
	const { captureForegroundIntent } = await import('../../services/launch/foreground-intent');
	const files = new Map<string, string>(),
		errors: unknown[] = [];
	const root = { canonicalPath: '/fixture', dev: '1', ino: '2' },
		vault = { vaultId: 'v', deviceId: 'd', rootPath: '/fixture', root };
	const spaces = new SpaceService({
		storage: {
			exists: async (p) => files.has(p),
			read: async (p) => files.get(p)!,
			write: async (p, text) => {
				files.set(p, text);
			},
			mkdir: async () => {},
		},
		instanceId: 'focus-host',
		report: (e) => errors.push(e),
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/fixture' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'focus-host',
				port: 1,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	let nativeEvents!: import('../../../../shared/native/host').NativeEvents,
		sequence = 0;
	const spawn = vi.fn(async () => 42);
	const native = new NativeHost(async (events) => {
		nativeEvents = events;
		const end = (sid: number) => {
			events.termination?.(sid, {
				version: 1,
				sequence: ++sequence,
				evidence: {
					root: { state: 'exited', code: 0, signal: null },
					cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 },
					output: 'drained',
				},
			});
			events.exit(sid, 0, null);
		};
		return {
			alive: true,
			version: 'controlled-host',
			terminalTermination: 1,
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge() {},
			end,
			requestStop: end,
			history: async <T,>() => [] as T,
			request: async <T,>() => ({}) as T,
			dispose: async () => {
				nativeEvents.closed('closed');
			},
		};
	});
	const sessions = new TerminalSessions({
		native,
		environment: async () => ({}),
		platform: 'linux',
		settings: () => terminalSettings,
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const container = document.body.appendChild(document.createElement('section')),
		anchor = container.appendChild(document.createElement('button')),
		leaf = { view: { containerEl: container } };
	let currentLeaf: unknown = leaf,
		closed = false;
	const refs = new Set<{ kind: string; listener: () => void }>();
	const app = {
		workspace: {
			on: (kind: string, listener: () => void) => {
				const ref = { kind, listener };
				refs.add(ref);
				return ref;
			},
			offref: (ref: { kind: string; listener: () => void }) => refs.delete(ref),
			getMostRecentLeaf: () => currentLeaf,
		},
	};
	const launch: import('../../services/workspace-service').WorkspaceLaunchPort = {
		foreground: () =>
			captureForegroundIntent({
				container,
				document,
				window,
				isCurrent: () => !closed && currentLeaf === leaf,
				onTargetChange: (listener) => {
					const ref = app.workspace.on('active-leaf-change', listener);
					return () => app.workspace.offref(ref);
				},
			}),
		shell: (o) =>
			sessions.create({
				kind: 'shell',
				title: 'Shell',
				file: 'sh',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		agent: (agentId, o) =>
			sessions.create({
				kind: 'agent',
				agentId,
				title: 'Agent',
				file: 'agent',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		resume: async () => undefined,
		account: () => '',
		report: (e) => errors.push(e),
	};
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(
			spaces,
			{ setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id) },
			(e) => errors.push(e),
		),
		sessions,
		launch,
		() => undefined,
		spaces,
	);
	await workspace.persistence.ready;
	const a = await spaces.create({ name: 'A', relativePath: '' }),
		b = await spaces.create({ name: 'B', relativePath: '' });
	await workspace.selectSpace(b.id);
	const result = await workspace.createManaged({ spaceId: b.id, kind: 'shell' });
	if (result.status !== 'created') throw Error('fixture create failed');
	const target = { spaceId: b.id, sessionId: result.session.sessionId, runtimeId: result.session.runtime.runtimeId };
	await workspace.attachManaged(target, { focus: false });
	await workspace.splitPane(target.runtimeId, 'row');
	const tab = workspace.active;
	if (tab?.kind !== 'terminal') throw Error('fixture split missing');
	const companion = tab.focusedSessionId;
	await workspace.selectSpace(a.id);
	const controller = {
		app,
		workspace,
		sessions,
		settings: { get: () => terminalSettings, subscribe: () => () => {} },
		vaultPath: () => undefined,
	} as unknown as AgentController;
	const retention = new HiddenRendererRetention();
	let context = {
		controller,
		confirm: async () => false,
		close() {},
		chrome: {
			context: { app: controller.app, leaf, contentEl: container, containerEl: container, close() {} },
			menu: undefined,
			setMenu() {},
		},
	} as unknown as import('../workspace/workspace-context').WorkspaceUI;
	function Hosts({ visible }: { visible: boolean }) {
		const layout = useSyncExternalStore(workspace.store.subscribe, workspace.store.getState);
		const active = layout.tabs[layout.groups.find((g) => g.id === layout.activeGroupId)?.activeTabId ?? ''];
		return (
			<TestProviders>
				<WorkspaceUIContext value={context}>
					{active?.kind === 'terminal' &&
						active.sessionIds.map((id) => (
							<TerminalHost
								key={id}
								tab={active}
								sessionId={id}
								active={visible}
								focused={active.focusedSessionId === id}
								retention={retention}
							/>
						))}
				</WorkspaceUIContext>
			</TestProviders>
		);
	}
	const subscribe = vi.spyOn(workspace, 'subscribeFocusPresentation');
	let ui: Pick<import('@testing-library/react').RenderResult, 'rerender' | 'unmount'> | undefined;
	const shown = (visible = true) => {
		if (ui) ui.rerender(<Hosts visible={visible} />);
		else ui = render(<Hosts visible={visible} />, { container });
	};
	return {
		workspace,
		target,
		companion,
		spawn,
		anchor,
		container,
		leaf,
		subscribe,
		shown,
		rewrapChrome() {
			const originalContext = context.chrome!.context;
			context = { ...context, chrome: { ...context.chrome!, context: originalContext } };
			shown();
		},
		instance(id: string) {
			return created.findLast((value) => (value as unknown as { sessionId: string }).sessionId === id);
		},
		leafChange() {
			currentLeaf = {};
			for (const ref of refs) if (ref.kind === 'active-leaf-change') ref.listener();
		},
		async close() {
			if (closed) return;
			closed = true;
			ui?.unmount();
			container.remove();
			await workspace.dispose();
			await sessions.dispose();
			await native.dispose();
		},
	};
}

test('Host consumes original real foreground once across Space/split and same-state requests without cleanup fallback', async () => {
	const f = await focusHostFixture();
	try {
		f.shown();
		f.anchor.focus();
		let result: unknown;
		await act(async () => {
			result = await f.workspace.attachManaged(f.target, { expectedRuntimeId: f.target.runtimeId, focus: true });
		});
		expect(result).toMatchObject({ status: 'attached', focused: true });
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('consumed');
		const target = f.instance(f.target.runtimeId)!,
			companion = f.instance(f.companion)!;
		expect(companion.focus).not.toHaveBeenCalled();
		expect(target.focus).toHaveBeenCalledOnce();
		const layout = f.workspace.store.getState();
		f.anchor.focus();
		await act(async () => {
			await f.workspace.attachManaged(f.target, { expectedRuntimeId: f.target.runtimeId, focus: true });
		});
		expect(f.workspace.store.getState()).toBe(layout);
		expect(target.focus).toHaveBeenCalledTimes(2);
		// Genuine later pane navigation restores ordinary focus; request terminal cleanup alone did not.
		act(() => f.workspace.focusSession(f.companion));
		expect(companion.focus).toHaveBeenCalledOnce();
		expect(target.focus).toHaveBeenCalledTimes(2);
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		await f.close();
	}
});

test.each(['pointer', 'key', 'focus', 'leaf'] as const)(
	'Host never falls back after original commit is revoked before mount: %s',
	async (reason) => {
		const f = await focusHostFixture();
		const outside = document.body.appendChild(document.createElement('button'));
		try {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
			f.anchor.focus();
			await f.workspace.attachManaged(f.target, { expectedRuntimeId: f.target.runtimeId, focus: true });
			const id = f.workspace.getFocusPresentation().request!.id;
			if (reason === 'pointer') f.anchor.dispatchEvent(new Event('pointerdown', { bubbles: true }));
			if (reason === 'key') f.anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
			if (reason === 'focus') outside.focus();
			if (reason === 'leaf') f.leafChange();
			f.shown();
			expect(f.instance(f.target.runtimeId)?.focus).not.toHaveBeenCalled();
			expect(f.workspace.getFocusPresentation().request).toMatchObject({ id });
			expect(f.workspace.getFocusPresentation().request?.phase).not.toBe('consumed');
			f.shown(false);
			f.shown(true);
			expect(f.instance(f.target.runtimeId)?.focus).not.toHaveBeenCalled();
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1000);
			});
			expect(f.workspace.getFocusPresentation().request).toMatchObject({ id, phase: 'cancelled' });
			f.shown(false);
			f.shown(true);
			expect(f.instance(f.target.runtimeId)?.focus).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
			outside.remove();
			await f.close();
		}
	},
);

test('an older Host effect cannot read a newer snapshot to focus after synchronous pane navigation', async () => {
	const f = await focusHostFixture();
	try {
		f.anchor.focus();
		await f.workspace.attachManaged(f.target, { expectedRuntimeId: f.target.runtimeId, focus: true });
		const captured = f.workspace.getFocusPresentation(),
			present = vi.spyOn(f.workspace, 'presentManagedFocus');
		renderer.beforeVisible = () => {
			renderer.beforeVisible = undefined;
			f.workspace.focusSession(f.companion);
		};
		f.shown();
		expect(f.instance(f.target.runtimeId)?.focus).not.toHaveBeenCalled();
		expect(f.instance(f.companion)?.focus).toHaveBeenCalledOnce();
		expect(present.mock.calls.some(([snapshot, id]) => snapshot === captured && id === f.target.runtimeId)).toBe(
			true,
		);
		expect(f.workspace.getFocusPresentation().navigationGeneration).toBeGreaterThan(captured.navigationGeneration);
	} finally {
		renderer.beforeVisible = undefined;
		await f.close();
	}
});

test('Host focus subscriptions follow mounted renderers, remain single across hide/show and clear before disposal', async () => {
	const f = await focusHostFixture();
	try {
		await f.workspace.selectSpace(f.target.spaceId);
		await f.workspace.attachManaged(f.target, { focus: false });
		f.shown(false);
		expect(f.subscribe).not.toHaveBeenCalled();
		renderer.allowed = false;
		f.shown(true);
		expect(f.subscribe).not.toHaveBeenCalled();
		renderer.allowed = true;
		f.shown(false);
		f.shown(true);
		expect(f.subscribe).toHaveBeenCalledTimes(2);
		const listeners = () => (f.workspace as unknown as { focusListeners: Set<() => void> }).focusListeners.size;
		expect(listeners()).toBe(2);
		f.shown(false);
		f.shown(true);
		expect(f.subscribe).toHaveBeenCalledTimes(2);
		const instances = [f.instance(f.target.runtimeId)!, f.instance(f.companion)!],
			counts: number[] = [];
		for (const instance of instances) {
			const dispose = instance.dispose.getMockImplementation() as (() => void) | undefined;
			instance.dispose.mockImplementation(() => {
				counts.push(listeners());
				dispose?.();
			});
		}
		await f.close();
		expect(listeners()).toBe(0);
		expect(counts).toEqual([1, 0]);
	} finally {
		renderer.allowed = true;
		await f.close();
	}
});

test.each(['retention', 'controller', 'workspace'] as const)(
	'replacing the View lifetime owner remounts and rebinds exactly once: %s',
	(change) => {
		const listeners = new Set<() => void>();
		const workspace = {
			...projection,
			focusSession: vi.fn(),
			subscribeFocusPresentation: (listener: () => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		};
		const session = { id: 'replacement', running: true, connection: 'connected' };
		const controller = {
			app: { workspace: { on: () => ({}), offref() {} } },
			sessions: { get: () => session },
			workspace,
			settings: { get: () => terminalSettings, subscribe: () => () => {} },
		} as unknown as AgentController;
		const tab: TerminalTabData = {
			kind: 'terminal',
			id: 'replacement-tab',
			title: 'Shell',
			createdAt: 0,
			updatedAt: 0,
			sessionIds: [session.id],
			focusedSessionId: session.id,
			paneLayout: { kind: 'pane', session: session.id },
			panes: { [session.id]: { cwd: '/' } },
			state: 'idle',
			unread: false,
		};
		let currentController = controller,
			retention = new HiddenRendererRetention();
		const content = () => (
			<TestProviders>
				<WorkspaceUIContext value={{ controller: currentController, confirm: async () => false, close() {} }}>
					<TerminalHost tab={tab} sessionId={session.id} active focused retention={retention} />
				</WorkspaceUIContext>
			</TestProviders>
		);
		const index = created.length,
			ui = render(content());
		expect(listeners.size).toBe(1);
		if (change === 'retention') retention = new HiddenRendererRetention();
		if (change === 'controller') currentController = { ...controller } as AgentController;
		if (change === 'workspace')
			currentController = { ...controller, workspace: { ...workspace } } as unknown as AgentController;
		ui.rerender(content());
		expect(created[index]?.dispose).toHaveBeenCalledOnce();
		expect(created[index + 1]?.setVisible).toHaveBeenCalledWith(true);
		expect(listeners.size).toBe(1);
		ui.unmount();
		expect(listeners.size).toBe(0);
	},
);

test.each(['initial', 'after-navigation'] as const)(
	'a parent chrome wrapper rerender preserves external focus without granting owner focus again (%s)',
	async (mode) => {
		const f = await focusHostFixture(),
			outside = document.body.appendChild(document.createElement('input'));
		try {
			if (mode === 'after-navigation') {
				f.shown();
				f.anchor.focus();
				await act(async () => {
					await f.workspace.attachManaged(f.target, { expectedRuntimeId: f.target.runtimeId, focus: true });
				});
				act(() => f.workspace.focusSession(f.companion));
			} else {
				await f.workspace.selectSpace(f.target.spaceId);
				f.shown();
			}
			const snapshot = f.workspace.getFocusPresentation(),
				instance = f.instance(f.companion)!;
			if (mode === 'after-navigation')
				expect(snapshot.navigationGeneration).toBeGreaterThan(snapshot.request!.navigationGeneration);
			else expect(snapshot.request).toBeUndefined();
			expect(instance.focus).toHaveBeenCalledOnce();
			outside.focus();
			const focuses = instance.focus.mock.calls.length,
				grants = instance.setFocused.mock.calls.length;
			f.rewrapChrome();
			expect(f.workspace.getFocusPresentation()).toBe(snapshot);
			expect(document.activeElement).toBe(outside);
			expect(instance.focus).toHaveBeenCalledTimes(focuses);
			expect(instance.setFocused).toHaveBeenCalledTimes(grants);
		} finally {
			outside.remove();
			await f.close();
		}
	},
);

test('a single terminal keeps a named pane header with its exact persistent identity and reachable close control', async () => {
	const f = managedFixture('connected');
	const header = document.querySelector<HTMLElement>('[data-pane-header]');
	expect(header).not.toBeNull();
	expect(header!.querySelector('[data-pane-title]')?.getAttribute('title')).toContain('r');
	const close = header!.querySelector<HTMLButtonElement>('button[data-pane-close]');
	expect(close).not.toBeNull();
	expect(close!.getAttribute('aria-label')).toContain(t('agent.managed.closeView'));
	await userEvent.setup().click(close!);
	expect(f.workspace.closePane).toHaveBeenCalledWith('r', expect.any(Function));
	expect(f.workspace.restore).not.toHaveBeenCalled();
});

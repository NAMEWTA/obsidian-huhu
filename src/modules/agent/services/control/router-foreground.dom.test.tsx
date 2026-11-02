// @vitest-environment happy-dom
import { useSyncExternalStore } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { WorkspaceUIContext } from '../../ui/workspace/workspace-context';
import { TerminalTabView } from '../../ui/terminal/TerminalTabView';
import { HiddenRendererRetention } from '../../ui/terminal/hidden-renderer-retention';
import type { AgentController } from '../controller';
import type { TerminalTabData } from '../../core/workspace/model';
import { expect, test, vi } from 'vitest';
import { captureForegroundIntent } from '../launch/foreground-intent';
import { SpaceService } from '../spaces/space-service';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { TerminalSessions } from '../terminal/sessions';
import { NativeHost } from '../../../../host/desktop/native/host';
import type { NativeEvents } from '../../../../shared/native/host';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { WorkspaceService, type WorkspaceLaunchPort } from '../workspace-service';
import type { TextStorage } from '../../../../shared/storage/ports';

async function fixture(options: { deferStop?: boolean } = {}) {
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, s) => {
			files.set(p, s);
		},
		mkdir: async () => {},
	};
	const root = { canonicalPath: '/fixture', dev: '1', ino: '2' },
		vault = { vaultId: 'v', deviceId: 'd', rootPath: '/fixture', root };
	const spaces = new SpaceService({
		storage,
		instanceId: 'activity',
		report: vi.fn(),
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/fixture' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'activity',
				port: 12345,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	let events!: NativeEvents,
		sequence = 0;
	const spawn = vi.fn(async () => 42);
	const exit = (sid: number) => {
		events.termination?.(sid, {
			version: 1,
			sequence: ++sequence,
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
	const requestStop = vi.fn((sid: number) => {
		if (!options.deferStop) exit(sid);
	});
	const acknowledge = vi.fn();
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			version: 'fixture',
			terminalTermination: 1,
			requestStop,
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge,
			end: exit,
			history: async <T,>() => [] as T,
			request: async <T,>() => ({}) as T,
			dispose: async () => {
				e.closed('closed');
			},
		};
	});
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({
		native,
		environment,
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const launch: WorkspaceLaunchPort = {
		shell: (o) =>
			sessions.create({
				kind: 'shell',
				title: 'shell',
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
				title: 'agent',
				file: 'agent',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		resume: async () => undefined,
		account: () => '',
		report: vi.fn(),
	};
	const clock = {
		setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
		clearTimeout: (id: number) => clearTimeout(id),
	};
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(spaces, clock, vi.fn()),
		sessions,
		launch,
		() => undefined,
		spaces,
	);
	await workspace.persistence.ready;
	return {
		environment,
		workspace,
		spaces,
		sessions,
		spawn,
		launch,
		storage,
		exit,
		requestStop,
		acknowledge,
		output(sid: number, bytes: Uint8Array) {
			events.output(sid, bytes);
		},
		async close() {
			await workspace.dispose();
			await sessions.dispose();
			await native.dispose();
		},
	};
}

import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import type { ControlRequest, ControlResponse } from '../../../../shared/native/control-wire';
import type { NativeControlCall, NativeControlRegistration } from '../../../../shared/native/host';

function registration() {
	const responses: ControlResponse[] = [];
	const value: NativeControlRegistration = {
		route: { type: 'control-registered', controlId: 'control', endpoint: 'fixture', locator: 'fixture' },
		current: () => true,
		admit: vi.fn(() => true),
		progress: vi.fn(() => true),
		result: vi.fn(async (_call, value) => {
			responses.push(value);
		}),
		close: async () => {},
	};
	return { value, responses };
}
const call = (request: ControlRequest, signal = new AbortController().signal): NativeControlCall => ({
	wire: { type: 'control-request', controlId: 'control', bridgeId: 'call', request },
	signal,
});

test('real foreground permission captured before scope wait cannot be reacquired after a user navigates elsewhere', async () => {
	const f = await fixture();
	let release!: () => void;
	const container = document.createElement('section'),
		anchor = document.createElement('button'),
		elsewhere = document.createElement('button');
	container.append(anchor, elsewhere);
	document.body.append(container);
	anchor.focus();
	try {
		const space = await f.spaces.create({ name: 'B' }),
			scope = await f.spaces.getControlScope();
		const show = vi.fn(async () => {}),
			foreground = vi.fn(() =>
				captureForegroundIntent({
					document,
					window,
					container,
					isCurrent: () => true,
					onTargetChange: () => () => {},
				}),
			);
		f.launch.foreground = foreground;
		f.launch.show = show;
		const router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions)),
			reg = registration(),
			assert = f.spaces.assertControlScope.bind(f.spaces);
		vi.spyOn(f.spaces, 'assertControlScope').mockImplementationOnce(async (original) => {
			await new Promise<void>((r) => {
				release = r;
			});
			await assert(original);
		});
		// agent.start is the v1 foreground-capable start; this fixture keeps real Workspace/Session and only replaces Provider execution.
		router.forward(
			call({
				protocolVersion: 1,
				requestId: 'foreground',
				operation: 'agent.start',
				target: { spaceId: space.id },
				params: { provider: 'pi', foreground: true },
			}),
			reg.value,
			scope,
		);
		expect(foreground).toHaveBeenCalledOnce();
		elsewhere.focus();
		elsewhere.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		release();
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({ ok: true, effect: 'completed' });
		expect(foreground).toHaveBeenCalledOnce();
		expect(show).not.toHaveBeenCalled();
		expect(Object.keys(f.workspace.store.getState().tabs)).toHaveLength(0);
		expect(document.activeElement).toBe(elsewhere);
		await router.close();
	} finally {
		release?.();
		await f.close();
		container.remove();
	}
});

// Only the device renderer is controlled. The production terminal leaf and every focus gate remain real.
const renderers = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../ui/terminal/terminal-view', () => ({
	TerminalView: class {
		readonly el: HTMLElement;
		private textarea: HTMLTextAreaElement;
		private mounted = false;
		applySettings() {}
		setFocused() {}
		presentActivity() {}
		get hasRenderer() {
			return this.mounted;
		}
		setVisible(value: boolean) {
			this.mounted = value;
		}
		presentFocus(present: (textarea: HTMLTextAreaElement, focus: () => void) => boolean) {
			return renderers.enabled && this.mounted && present(this.textarea, () => this.textarea.focus());
		}
		dispose() {
			this.mounted = false;
			this.el.remove();
		}
		constructor(parent: HTMLElement, session: { id: string }, host: { focused(view: unknown): void }) {
			this.el = parent.appendChild(parent.ownerDocument.createElement('div'));
			this.textarea = this.el.appendChild(parent.ownerDocument.createElement('textarea'));
			this.textarea.dataset.runtime = session.id;
			this.textarea.addEventListener('focus', () => host.focused(this));
		}
	},
}));
vi.mock('../../platform/desktop/files', () => ({ openPath: vi.fn() }));
vi.mock('../../ui/terminal/material-picker', () => ({ pickMaterial: vi.fn() }));

async function paneDOM() {
	const f = await fixture();
	const a = await f.spaces.create({ name: 'A' });
	await f.workspace.selectSpace(a.id);
	const value = await f.workspace.createManaged({ kind: 'shell', spaceId: a.id });
	if (value.status !== 'created') throw Error('fixture');
	const attached = await f.workspace.panes.attach(value.session),
		paneId = attached.pane!.paneId!;
	const container = document.body.appendChild(document.createElement('section')),
		anchor = container.appendChild(document.createElement('button'));
	const elsewhere = container.appendChild(document.createElement('button'));
	const foreground = vi.fn(() =>
		captureForegroundIntent({ document, window, container, isCurrent: () => true, onTargetChange: () => () => {} }),
	);
	f.launch.foreground = foreground;
	f.launch.show = async () => {};
	const settings = normalizeTerminalSettings({});
	const controller = {
		workspace: f.workspace,
		sessions: f.sessions,
		spaces: f.spaces,
		app: { workspace: { on: () => ({}), offref() {} } },
		vaultPath: () => '/fixture',
		settings: { get: () => settings, subscribe: () => () => {} },
	} as unknown as AgentController;
	const retention = new HiddenRendererRetention();
	function OriginalLeaf() {
		const state = useSyncExternalStore(f.workspace.store.subscribe, f.workspace.store.getState);
		const tab = Object.values(state.tabs).find((tab) => tab.kind === 'terminal') as TerminalTabData | undefined;
		return (
			<TestProviders>
				<WorkspaceUIContext value={{ controller, confirm: async () => false, close: () => {} }}>
					{tab && <TerminalTabView tab={tab} active retention={retention} />}
				</WorkspaceUIContext>
			</TestProviders>
		);
	}
	const rendered = render(<OriginalLeaf />, { container: container.appendChild(document.createElement('div')) });
	await vi.waitFor(() => expect(container.querySelector('textarea')).toBeTruthy());
	anchor.focus();
	const router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions)),
		scope = await f.spaces.getControlScope();
	const present = vi.spyOn(f.workspace, 'presentManagedFocus');
	const forward = (timeoutMs = 1000, signal = new AbortController().signal) => {
		const reg = registration();
		router.forward(
			call(
				{ protocolVersion: 1, requestId: 'pane-focus', operation: 'pane.focus', target: { paneId }, timeoutMs },
				signal,
			),
			reg.value,
			scope,
		);
		return reg;
	};
	return {
		...f,
		container,
		anchor,
		elsewhere,
		paneId,
		ref: value.session,
		router,
		scope,
		rendered,
		present,
		foreground,
		forward,
		async dispose() {
			rendered.unmount();
			await router.close();
			await f.close();
			container.remove();
			renderers.enabled = true;
		},
	};
}

test('Router pane.focus traverses the real TerminalTabView leaf, original request, commitFocus and consumed receipt', async () => {
	const f = await paneDOM();
	try {
		const phases: string[] = [];
		const ids: number[] = [];
		const off = f.workspace.subscribeFocusPresentation(() => {
			const request = f.workspace.getFocusPresentation().request;
			if (request) {
				phases.push(request.phase);
				ids.push(request.id);
			}
		});
		const reg = f.forward();
		await waitFor(() => expect(reg.responses).toHaveLength(1), { timeout: 2000 });
		off();
		expect(reg.responses[0]).toMatchObject({
			ok: true,
			effect: 'completed',
			target: { paneId: f.paneId, sessionId: f.ref.sessionId, runtimeId: f.ref.runtime.runtimeId },
			data: { focused: true, focusRequestId: expect.any(Number) },
		});
		const response = reg.responses[0]!;
		expect(new Set(ids).size).toBe(1);
		expect(phases).toContain('committed');
		expect(phases).toContain('consumed');
		expect((response.data as { focusRequestId: number }).focusRequestId).toBe(ids[0]);
		expect(document.activeElement).toBe(f.container.querySelector('textarea'));
		expect(f.present.mock.calls.some((args) => args[4] === 'committed')).toBe(true);
		expect(f.foreground).toHaveBeenCalledOnce();
	} finally {
		await f.dispose();
	}
});

test.each(['blur', 'cancel', 'expired'] as const)(
	'real Pane leaf cannot acquire focus after %s and retains actual layout facts',
	async (reason) => {
		const f = await paneDOM();
		renderers.enabled = false;
		const abort = new AbortController();
		try {
			const reg = f.forward(reason === 'expired' ? 200 : 1000, abort.signal);
			await waitFor(() => expect(f.workspace.getFocusPresentation().request?.phase).toBe('committed'), {
				interval: 5,
			});
			const id = f.workspace.getFocusPresentation().request!.id;
			if (reason === 'blur') {
				f.elsewhere.focus();
				window.dispatchEvent(new Event('blur'));
			}
			if (reason === 'cancel') abort.abort();
			await waitFor(() => expect(reg.responses).toHaveLength(1), { timeout: 2000 });
			expect(reg.responses[0]).toMatchObject({
				effect: 'partial',
				data: { focused: false, persisted: expect.any(Boolean) },
			});
			renderers.enabled = true;
			act(() => f.rendered.rerender(<div />));
			expect(f.workspace.getFocusPresentation().request?.id).toBe(id);
			expect(document.activeElement?.tagName).not.toBe('TEXTAREA');
			expect(f.spawn).toHaveBeenCalledOnce();
		} finally {
			await f.dispose();
		}
	},
);

test('Router preserves a real consumed focus when the later domain observer reports an error', async () => {
	const f = await paneDOM();
	renderers.enabled = false;
	const input = f.container.querySelector('textarea')!;
	let once = true;
	// Isolate result mapping with the original presentation owner; the separate positive test exercises the production leaf callback.
	const off = f.workspace.subscribeFocusPresentation(() => {
		const snapshot = f.workspace.getFocusPresentation();
		if (snapshot.request?.phase === 'committed')
			f.workspace.presentManagedFocus(snapshot, f.ref.runtime.runtimeId, input, () => input.focus(), 'committed');
		else if (snapshot.request?.phase === 'consumed' && once) {
			once = false;
			throw Error('confirmed observer diagnostic');
		}
	});
	try {
		const reg = f.forward();
		await waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			ok: false,
			effect: 'completed',
			target: { paneId: f.paneId },
			data: { focused: true, diagnostic: { code: 'SOURCE_UNAVAILABLE' } },
			error: { code: 'SOURCE_UNAVAILABLE' },
		});
		expect(document.activeElement).toBe(input);
		expect(f.foreground).toHaveBeenCalledOnce();
	} finally {
		off();
		await f.dispose();
	}
});

test('a late abort after the production leaf consumes focus cannot overwrite the confirmed Router outcome', async () => {
	const f = await paneDOM(),
		abort = new AbortController();
	const off = f.workspace.subscribeFocusPresentation(() => {
		if (f.workspace.getFocusPresentation().request?.phase === 'consumed')
			abort.abort(new Error('late observer abort'));
	});
	try {
		const reg = f.forward(1000, abort.signal);
		await waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			effect: 'completed',
			target: { paneId: f.paneId },
			data: { focused: true },
		});
		expect(document.activeElement).toBe(f.container.querySelector('textarea'));
	} finally {
		off();
		await f.dispose();
	}
});

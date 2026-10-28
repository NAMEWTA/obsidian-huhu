// @vitest-environment happy-dom
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
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
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
import type { ControlJson, ControlRequest, ControlResponse } from '../../../../shared/native/control-wire';
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
test('router captures synchronously before scope await and reservation observer failure does not revoke the admitted process', async () => {
	const f = await fixture();
	let release!: () => void;
	try {
		const space = await f.spaces.create({ name: 'B' }),
			scope = await f.spaces.getControlScope();
		const commands = new ControlCommands(f.spaces, f.workspace, f.sessions),
			router = new ControlRouter(commands),
			reg = registration();
		const capture = vi.spyOn(f.workspace, 'captureManagedCreate'),
			assert = f.spaces.assertControlScope.bind(f.spaces);
		vi.spyOn(f.spaces, 'assertControlScope').mockImplementationOnce(async (s) => {
			await new Promise<void>((r) => {
				release = r;
			});
			await assert(s);
		});
		reg.value.progress = vi.fn(() => {
			throw Error('observer gone');
		});
		router.forward(
			call({ protocolVersion: 1, requestId: 'r', operation: 'terminal.start', target: { spaceId: space.id } }),
			reg.value,
			scope,
		);
		expect(capture).toHaveBeenCalledOnce();
		expect(reg.value.admit).not.toHaveBeenCalled();
		release();
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			ok: true,
			effect: 'completed',
			target: { spaceId: space.id, sessionId: expect.any(String), runtimeId: expect.any(String) },
		});
		expect(router.observationError?.message).toBe('observer gone');
		expect(f.spawn).toHaveBeenCalledOnce();
		await router.close();
	} finally {
		release?.();
		await f.close();
	}
});
test('cancel before admission proves none; cancellation after reservation only ends observation and never retries or stops', async () => {
	const f = await fixture();
	let release!: () => void;
	try {
		const space = await f.spaces.create({ name: 'B' }),
			scope = await f.spaces.getControlScope();
		const commands = new ControlCommands(f.spaces, f.workspace, f.sessions),
			router = new ControlRouter(commands);
		const first = registration(),
			abort = new AbortController();
		abort.abort();
		router.forward(
			call(
				{ protocolVersion: 1, requestId: 'cancel', operation: 'terminal.start', target: { spaceId: space.id } },
				abort.signal,
			),
			first.value,
			scope,
		);
		await vi.waitFor(() => expect(first.responses).toHaveLength(1));
		expect(first.responses[0]).toMatchObject({ ok: false, effect: 'none', error: { code: 'WAIT_CANCELLED' } });
		expect(f.spawn).not.toHaveBeenCalled();
		const second = registration(),
			observer = new AbortController();
		f.spawn.mockImplementationOnce(async () => {
			observer.abort();
			await new Promise<void>((r) => {
				release = r;
			});
			return 42;
		});
		router.forward(
			call(
				{ protocolVersion: 1, requestId: 'late', operation: 'terminal.start', target: { spaceId: space.id } },
				observer.signal,
			),
			second.value,
			scope,
		);
		await vi.waitFor(() => expect(second.value.progress).toHaveBeenCalledOnce());
		expect(second.responses).toHaveLength(0);
		expect(f.requestStop).not.toHaveBeenCalled();
		release();
		await vi.waitFor(() => expect(second.responses).toHaveLength(1));
		expect(second.responses[0]).toMatchObject({ ok: true, effect: 'completed' });
		expect(f.spawn).toHaveBeenCalledOnce();
		await router.close();
	} finally {
		release?.();
		await f.close();
	}
});

test('lost spawn response retains the reserved target and launch-pending stage with unknown effect rather than a confirmed failure', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'B' }),
			scope = await f.spaces.getControlScope(),
			reg = registration(),
			router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
		f.spawn.mockRejectedValueOnce(Error('captured spawn reply lost'));
		router.forward(
			call({ protocolVersion: 1, requestId: 'lost', operation: 'terminal.start', target: { spaceId: space.id } }),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			ok: false,
			effect: 'unknown',
			phase: 'launch-pending',
			target: { spaceId: space.id, sessionId: expect.any(String), runtimeId: expect.any(String) },
			error: { code: 'EFFECT_UNKNOWN' },
		});
		expect(f.spawn).toHaveBeenCalledOnce();
		await router.close();
	} finally {
		await f.close();
	}
});
test('confirmed early exit remains exited in a launch receipt instead of being reported running', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'B' }),
			scope = await f.spaces.getControlScope(),
			reg = registration(),
			router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
		f.spawn.mockImplementationOnce(async () => {
			f.exit(1);
			return 42;
		});
		router.forward(
			call({ protocolVersion: 1, requestId: 'exit', operation: 'terminal.start', target: { spaceId: space.id } }),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			ok: true,
			effect: 'completed',
			phase: 'exited',
			data: { runtime: { phase: 'exited', exit: { code: 0, confirmed: true } } },
		});
		await router.close();
	} finally {
		await f.close();
	}
});
test('stop observation timeout preserves its effect and unconfirmed per-target data', async () => {
	const f = await fixture({ deferStop: true });
	try {
		const space = await f.spaces.create({ name: 'B' }),
			created = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture failed');
		const scope = await f.spaces.getControlScope(),
			reg = registration(),
			router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
		vi.useFakeTimers();
		router.forward(
			call({
				protocolVersion: 1,
				requestId: 'stop',
				operation: 'terminal.stop',
				target: { sessionId: created.session.sessionId, runtimeId: created.session.runtime.runtimeId },
			}),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(f.requestStop).toHaveBeenCalledOnce());
		await vi.advanceTimersByTimeAsync(10001);
		expect(reg.responses).toHaveLength(1);
		expect(reg.responses[0]).toMatchObject({
			ok: false,
			effect: 'unknown',
			data: { status: 'pending', effect: 'unknown', persisted: true },
			error: { code: 'EFFECT_UNKNOWN' },
		});
		await router.close();
	} finally {
		vi.useRealTimers();
		f.exit(1);
		await f.close();
	}
});

test('a stale runtime rejected by the production capture carries none despite the legacy error default', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'B' }),
			created = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture failed');
		const scope = await f.spaces.getControlScope(),
			reg = registration(),
			router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
		router.forward(
			call({
				protocolVersion: 1,
				requestId: 'stale',
				operation: 'terminal.get',
				target: { sessionId: created.session.sessionId, runtimeId: 'old-runtime' },
			}),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({ ok: false, effect: 'none', error: { code: 'STALE_RUNTIME' } });
		expect(reg.value.admit).not.toHaveBeenCalled();
		expect(f.spawn).toHaveBeenCalledOnce();
		await router.close();
	} finally {
		await f.close();
	}
});

test('router preserves the first input receipt when its business port emits conflicting later progress and final', async () => {
	const f = await fixture();
	try {
		const scope = await f.spaces.getControlScope();
		const target = {
			vaultId: scope.vaultId,
			instanceId: scope.instanceId,
			spaceId: 'space',
			sessionId: 'session',
			runtimeId: 'runtime',
		};
		const first = { kind: 'adapter-applied' as const, op: 7 };
		const router = new ControlRouter({
			spaces: f.spaces,
			close() {},
			capture: () => ({
				target,
				mutation: true,
				preflight: async () => {},
				run: async (progress) => {
					progress({ target, phase: 'input-submitted', effect: 'completed', data: { receipt: first } });
					progress({
						target,
						phase: 'input-submitted',
						effect: 'completed',
						data: { receipt: { kind: 'adapter-applied', op: 8 } },
					});
					return {
						phase: 'input-submitted',
						effect: 'completed',
						data: { receipt: { kind: 'adapter-applied', op: 8 } },
					};
				},
				dispose() {},
			}),
		});
		const reg = registration();
		router.forward(
			call({
				protocolVersion: 1,
				requestId: 'conflict',
				operation: 'agent.prompt',
				target,
				params: { text: 'body' },
			}),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({ target, effect: 'completed', data: { receipt: first } });
		await router.close();
	} finally {
		await f.close();
	}
});

test.each([{ kind: 'pty-written', op: 7 }, { kind: 'adapter-applied', op: 0 }, null])(
	'router does not claim completed input from an untrusted business receipt %j',
	async (receipt) => {
		const f = await fixture();
		try {
			const scope = await f.spaces.getControlScope();
			const target = {
				vaultId: scope.vaultId,
				instanceId: scope.instanceId,
				spaceId: 'space',
				sessionId: 'session',
				runtimeId: 'runtime',
			};
			const data: ControlJson = receipt === null ? {} : { receipt };
			const router = new ControlRouter({
				spaces: f.spaces,
				close() {},
				capture: () => ({
					target,
					mutation: true,
					preflight: async () => {},
					run: async (progress) => {
						progress({ target, phase: 'input-submitted', effect: 'completed', data });
						return { phase: 'input-submitted', effect: 'completed', data };
					},
					dispose() {},
				}),
			});
			const reg = registration();
			router.forward(
				call({
					protocolVersion: 1,
					requestId: 'invalid-proof',
					operation: 'agent.prompt',
					target,
					params: { text: 'body' },
				}),
				reg.value,
				scope,
			);
			await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
			expect(reg.value.progress).not.toHaveBeenCalled();
			expect(reg.responses[0]).toMatchObject({
				target,
				ok: false,
				effect: 'unknown',
				error: { code: 'EFFECT_UNKNOWN' },
			});
			expect(reg.responses[0]?.data).toBeUndefined();
			await router.close();
		} finally {
			await f.close();
		}
	},
);

test.each(['scope', 'preflight'] as const)(
	'local Router ends its pending %s observation on abort/deadline before that port completes',
	async (stage) => {
		const f = await fixture();
		try {
			const scope = await f.spaces.getControlScope(),
				target = { spaceId: 'space', sessionId: 'session', runtimeId: 'runtime' };
			for (const cause of ['cancel', 'deadline']) {
				vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
				let release!: () => void;
				const held = new Promise<void>((resolve) => {
					release = resolve;
				});
				const run = vi.fn(async () => ({ phase: 'input-submitted' as const, effect: 'none' as const })),
					dispose = vi.fn();
				const asserted =
					stage === 'scope'
						? vi.spyOn(f.spaces, 'assertControlScope').mockImplementationOnce(() => held)
						: undefined;
				const router = new ControlRouter({
					spaces: f.spaces,
					close() {},
					capture: () => ({
						target,
						mutation: true,
						preflight: () => (stage === 'preflight' ? held : Promise.resolve()),
						run,
						dispose,
					}),
				});
				const abort = new AbortController();
				let settled = false;
				const pending = router.invokeLocal(
					{
						protocolVersion: 1,
						requestId: cause,
						operation: 'agent.prompt',
						target,
						params: { text: 'no input' },
					},
					scope,
					{ signal: abort.signal, deadline: performance.now() + 100 },
				);
				const rejection = expect(pending).rejects.toMatchObject({
					code: cause === 'cancel' ? 'WAIT_CANCELLED' : 'WAIT_TIMEOUT',
				});
				void pending.then(
					() => {
						settled = true;
					},
					() => {
						settled = true;
					},
				);
				await vi.advanceTimersByTimeAsync(0);
				if (cause === 'cancel') abort.abort();
				else await vi.advanceTimersByTimeAsync(101);
				await vi.advanceTimersByTimeAsync(0);
				try {
					expect(settled).toBe(true);
					expect(dispose).toHaveBeenCalledOnce();
					expect(run).not.toHaveBeenCalled();
				} finally {
					release();
					await rejection;
				}
				await vi.advanceTimersByTimeAsync(0);
				expect(run).not.toHaveBeenCalled();
				await router.close();
				asserted?.mockRestore();
				vi.useRealTimers();
			}
		} finally {
			vi.useRealTimers();
			await f.close();
		}
	},
);

test('native admission checks the original deadline even when a fulfilled microtask beats its timer', async () => {
	const f = await fixture();
	try {
		const scope = await f.spaces.getControlScope(),
			target = { spaceId: 'space', sessionId: 'session', runtimeId: 'runtime' };
		const now = vi.spyOn(performance, 'now').mockReturnValue(0),
			run = vi.fn(async () => ({ phase: 'input-submitted' as const, effect: 'none' as const }));
		const router = new ControlRouter({
				spaces: f.spaces,
				close() {},
				capture: () => ({
					target,
					mutation: true,
					preflight: async () => {
						now.mockReturnValue(200);
					},
					run,
					dispose() {},
				}),
			}),
			reg = registration();
		try {
			router.forward(
				call({
					protocolVersion: 1,
					requestId: 'microtask',
					operation: 'agent.prompt',
					target,
					params: { text: 'no input' },
					timeoutMs: 100,
				}),
				reg.value,
				scope,
			);
			await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
			expect(reg.responses[0]).toMatchObject({ ok: false, effect: 'none', error: { code: 'WAIT_TIMEOUT' } });
			expect(reg.value.admit).not.toHaveBeenCalled();
			expect(run).not.toHaveBeenCalled();
		} finally {
			now.mockRestore();
			await router.close();
		}
	} finally {
		await f.close();
	}
});

test('direct Router rejects invalid opaque IDs, wrong Space, stale runtime, missing and duplicate Panes without effects', async () => {
	const f = await fixture();
	const router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
	try {
		const a = await f.spaces.create({ name: 'A' }),
			b = await f.spaces.create({ name: 'B' });
		await f.workspace.selectSpace(a.id);
		const value = await f.workspace.createManaged({ kind: 'shell', spaceId: a.id });
		if (value.status !== 'created') throw Error('fixture');
		const attached = await f.workspace.panes.attach(value.session);
		const paneId = attached.pane!.paneId!;
		const scope = await f.spaces.getControlScope(),
			writes = vi.spyOn(f.storage, 'write');
		const run = async (target: ControlRequest['target']) => {
			const reg = registration();
			router.forward(
				call({ protocolVersion: 1, requestId: 'pane-negative', operation: 'pane.close', target }),
				reg.value,
				scope,
			);
			await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
			return reg.responses[0];
		};
		for (const bad of ['', 'a\u0000b', 'a\u001fb', 'a\u007fb', '中'.repeat(1366), '\ud800'])
			expect(await run({ paneId: bad })).toMatchObject({
				ok: false,
				effect: 'none',
				error: { code: !bad ? 'TARGET_REQUIRED' : bad === '\ud800' ? 'CAPACITY_EXCEEDED' : 'INVALID_ARGUMENT' },
			});
		expect(await run({ paneId: 'missing' })).toMatchObject({
			ok: false,
			effect: 'none',
			error: { code: 'TARGET_NOT_FOUND' },
		});
		expect(await run({ paneId, spaceId: b.id })).toMatchObject({
			ok: false,
			effect: 'none',
			error: { code: 'SCOPE_MISMATCH' },
		});
		expect(await run({ paneId, runtimeId: 'old' })).toMatchObject({
			ok: false,
			effect: 'none',
			error: { code: 'STALE_RUNTIME' },
		});
		expect(writes).not.toHaveBeenCalled();
		expect(f.requestStop).not.toHaveBeenCalled();
		const other = await f.workspace.createManaged({ kind: 'shell', spaceId: a.id });
		if (other.status !== 'created') throw Error('fixture');
		await f.workspace.panes.attach(other.session);
		f.workspace.store.setState(
			(view) => ({
				...view,
				tabs: Object.fromEntries(
					Object.entries(view.tabs).map(([id, tab]) => [
						id,
						tab.kind === 'terminal'
							? {
									...tab,
									panes: Object.fromEntries(
										Object.entries(tab.panes).map(([key, info]) => [key, { ...info, paneId }]),
									),
								}
							: tab,
					]),
				),
			}),
			true,
		);
		writes.mockClear();
		expect(await run({ paneId, spaceId: a.id })).toMatchObject({
			ok: false,
			effect: 'none',
			error: { code: 'TARGET_AMBIGUOUS' },
		});
		expect(writes).not.toHaveBeenCalled();
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		await router.close();
		await f.close();
	}
});

test('a synchronously captured Pane cannot follow replacement across scope admission', async () => {
	const f = await fixture();
	const router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions));
	let release!: () => void;
	try {
		const space = await f.spaces.create({ name: 'A' });
		await f.workspace.selectSpace(space.id);
		const value = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (value.status !== 'created') throw Error('fixture');
		const attached = await f.workspace.panes.attach(value.session),
			paneId = attached.pane!.paneId!;
		const scope = await f.spaces.getControlScope(),
			original = f.spaces.assertControlScope.bind(f.spaces);
		vi.spyOn(f.spaces, 'assertControlScope').mockImplementationOnce(async (input) => {
			await new Promise<void>((r) => {
				release = r;
			});
			await original(input);
		});
		const reg = registration();
		router.forward(
			call({ protocolVersion: 1, requestId: 'captured-pane', operation: 'pane.close', target: { paneId } }),
			reg.value,
			scope,
		);
		await f.workspace.panes.close({ paneId });
		const replacement = await f.workspace.panes.attach(value.session);
		release();
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({
			ok: false,
			effect: 'none',
			target: { paneId },
			error: { code: 'TARGET_NOT_FOUND' },
			data: { layoutPublished: false, persisted: false },
		});
		expect((await f.workspace.panes.list()).panes[0]!.paneId).toBe(replacement.pane!.paneId);
		expect(f.requestStop).not.toHaveBeenCalled();
	} finally {
		release?.();
		await router.close();
		await f.close();
	}
});

import { ControlProtocolError } from '../../../../shared/native/control-wire';
import type { HistoryCommands } from './history';

test('a history/resume ControlProtocolError message reaches the response with its stable code and no side effect', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'A' }),
			scope = await f.spaces.getControlScope(),
			reg = registration();
		const localized = 'Another HUHU instance is running this conversation.';
		const history = {
			resumeSource: vi.fn(async () => {
				throw new ControlProtocolError(localized, 'OWNER_CONFLICT');
			}),
		} as unknown as HistoryCommands;
		const router = new ControlRouter(new ControlCommands(f.spaces, f.workspace, f.sessions, undefined, history));
		router.forward(
			call({
				protocolVersion: 1,
				requestId: 'resume',
				operation: 'history.resume',
				target: { spaceId: space.id },
				params: { source: 'ref' },
			}),
			reg.value,
			scope,
		);
		await vi.waitFor(() => expect(reg.responses).toHaveLength(1));
		expect(reg.responses[0]).toMatchObject({ ok: false, error: { code: 'OWNER_CONFLICT', message: localized } });
		expect(history.resumeSource).toHaveBeenCalledOnce();
		expect(f.spawn).not.toHaveBeenCalled();
		await router.close();
	} finally {
		await f.close();
	}
});

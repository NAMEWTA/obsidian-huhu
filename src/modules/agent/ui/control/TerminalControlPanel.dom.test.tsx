import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, onTestFinished, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { HuhuProviders } from '../../../../ui/react/providers';
import { t } from '../../../../shared/i18n';
import type { AgentController } from '../../services/controller';
import type { ManagedSnapshot } from '../../core/workspace/managed-runtime';
import type { ControlRequest } from '../../../../shared/native/control-wire';
import { TerminalControlPanel } from './TerminalControlPanel';

type Result = Awaited<ReturnType<AgentController['terminalControl']>>;
type Options = Parameters<AgentController['terminalControl']>[1];
function fixture(handler?: (request: ControlRequest, options: Options) => Promise<Result>) {
	const listeners = new Set<() => void>();
	const source = {
		bindingId: 'binding',
		programEpoch: 'epoch',
		health: 'current',
		meta: {
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'source' },
		},
	};
	const detail = {
		source: { bindingId: 'binding', health: 'current' },
		blocking: { state: 'unknown' },
		sources: [source],
	};
	let managed = {
		revision: 1,
		sessions: ['a', 'b'].map((id) => ({
			spaceId: id,
			sessionId: 'session-' + id,
			title: 'Twin',
			agentId: 'pi',
			kind: 'agent',
			createdAt: 1,
			viewState: 'background',
			runtime: {
				runtimeId: 'runtime-' + id,
				phase: 'connected',
				activity: 'idle',
				inputReady: false,
				activityDetail: detail,
			},
		})),
	} as unknown as ManagedSnapshot;
	const spaces = createStore(() => ({
		records: { selectedSpaceId: 'a', spaces: { a: { name: 'Space A' }, b: { name: 'Space B' } } },
		loading: false,
	}));
	const terminalControl = vi.fn(
		handler ??
			(async (request: ControlRequest) => ({
				target: request.target!,
				phase: 'input-submitted' as const,
				effect: 'completed' as const,
				receipt: { kind: 'adapter-applied' as const, op: 7 },
			})),
	);
	const show = vi.fn();
	const controller = {
		spaces: { store: spaces },
		workspace: {
			getManagedSnapshot: () => managed,
			subscribeManaged: (listener: () => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		},
		sessions: { get: () => ({ getEditorReadiness: () => ({ status: 'ready' }) }) },
		terminalControl,
		show,
	} as unknown as AgentController;
	const confirm = vi.fn(async () => false),
		close = vi.fn();
	const content = () => (
		<HuhuProviders ownerDocument={document}>
			<TerminalControlPanel controller={controller} close={close} confirm={confirm} />
		</HuhuProviders>
	);
	const view = render(content());
	onTestFinished(() => view.unmount());
	return {
		view,
		content,
		terminalControl,
		close,
		confirm,
		show,
		spaces,
		listeners,
		updateSource() {
			act(() => {
				managed = {
					...managed,
					revision: managed.revision + 1,
					sessions: managed.sessions.map((row) => ({
						...row,
						runtime: {
							...row.runtime!,
							activityDetail: {
								...row.runtime!.activityDetail!,
								source: { ...row.runtime!.activityDetail!.source, bindingId: 'reload' },
								sources: [
									...row.runtime!.activityDetail!.sources,
									{
										...row.runtime!.activityDetail!.sources[0]!,
										bindingId: 'reload',
										programEpoch: 'next',
									},
								],
							},
						},
					})),
				};
				for (const listener of listeners) listener();
			});
		},
		updateRuntime(runtimeId: string) {
			act(() => {
				managed = {
					...managed,
					revision: managed.revision + 1,
					sessions: managed.sessions.map((row) =>
						row.spaceId === 'b' ? { ...row, runtime: { ...row.runtime!, runtimeId } } : row,
					),
				};
				for (const listener of listeners) listener();
			});
		},
	};
}
async function chooseB(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.scope') }));
	await user.click(screen.getByRole('option', { name: t('agent.coordination.allSpaces') }));
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.target') }));
	await user.click(screen.getByRole('option', { name: /Space B/ }));
}

function matchedInput(request: ControlRequest): Result {
	return {
		target: request.target!,
		phase: 'state-matched',
		effect: 'completed',
		receipt: { kind: 'adapter-applied', op: 7 },
		observation: {
			status: 'matched',
			condition: 'done',
			at: { runtimeId: 'runtime-b', activitySequence: 43 },
			baseline: {
				at: { runtimeId: 'runtime-b', activitySequence: 42 },
				initialState: 'working',
				initialWorking: true,
			},
			state: 'done',
			blocking: { state: 'clear' },
			source: { health: 'current' },
			observedAt: 2,
		},
	};
}

for (const [operation, label] of [
	['agent.prompt', 'agent.coordination.promptMode'],
	['terminal.send-text', 'agent.coordination.textMode'],
	['terminal.send-keys', 'agent.coordination.keysMode'],
] as const)
	for (const failure of ['none', 'unknown', 'throw'] as const)
		test(`new ${operation} ${failure} does not inherit the previous input receipt or matched result`, async () => {
			let calls = 0,
				finish = () => {};
			let previousProgress: Options['progress'];
			const f = fixture(async (request, options) => {
				if (++calls === 1) {
					previousProgress = options.progress;
					return matchedInput(request);
				}
				return new Promise<Result>((resolve, reject) => {
					finish = () =>
						failure === 'throw'
							? reject(new Error('new input threw'))
							: resolve({
									target: request.target!,
									phase: 'failed',
									effect: failure,
									error: {
										code: failure === 'unknown' ? 'EFFECT_UNKNOWN' : 'INPUT_NOT_READY',
										message: 'new input rejected',
									},
								});
				});
			});
			onTestFinished(() => finish());
			const user = userEvent.setup();
			await chooseB(user);
			await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'first');
			await user.click(screen.getByRole('button', { name: t('agent.coordination.sendWait') }));
			expect(await screen.findByText(t('agent.coordination.submitted'))).toBeTruthy();
			expect(screen.getByText(t('agent.coordination.matched'))).toBeTruthy();
			if (operation !== 'agent.prompt') {
				await user.click(screen.getByRole('combobox', { name: t('agent.coordination.mode') }));
				await user.click(screen.getByRole('option', { name: t(label) }));
			}
			await user.clear(screen.getByRole('textbox', { name: t('agent.coordination.input') }));
			await user.type(
				screen.getByRole('textbox', { name: t('agent.coordination.input') }),
				operation === 'terminal.send-keys' ? 'Enter' : 'second',
			);
			await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
			expect(calls).toBe(2);
			expect(screen.queryByText(t('agent.coordination.submitted'))).toBeNull();
			expect(screen.queryByText(t('agent.coordination.matched'))).toBeNull();
			expect(screen.queryByText(t('agent.coordination.initialWorking'))).toBeNull();
			act(() =>
				previousProgress?.({
					target: f.terminalControl.mock.calls[0]![0].target,
					phase: 'input-submitted',
					effect: 'completed',
					data: { receipt: { kind: 'adapter-applied', op: 7 }, initialWorking: true },
				}),
			);
			expect(screen.queryByText(t('agent.coordination.submitted'))).toBeNull();
			act(() => finish());
			await screen.findByText(/new input (rejected|threw)/);
			expect(screen.queryByText(t('agent.coordination.submitted'))).toBeNull();
			expect(screen.queryByText(t('agent.coordination.matched'))).toBeNull();
			expect(f.terminalControl.mock.calls[1]![0]).toMatchObject({
				operation,
				target: { spaceId: 'b', sessionId: 'session-b', runtimeId: 'runtime-b' },
			});
		});

test('a late completed final from a deselected request cannot overwrite the new rejected input', async () => {
	let finish!: (value: Result) => void;
	const original = new Promise<Result>((resolve) => {
		finish = resolve;
	});
	const f = fixture(async (request) =>
		request.target?.spaceId === 'b'
			? original
			: {
					target: request.target!,
					phase: 'failed',
					effect: 'none',
					error: { code: 'INPUT_NOT_READY', message: 'new target rejected' },
				},
	);
	onTestFinished(() => finish(matchedInput(f.terminalControl.mock.calls[0]![0])));
	const user = userEvent.setup();
	await chooseB(user);
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'one');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.target') }));
	await user.click(screen.getByRole('option', { name: /Space A/ }));
	expect(f.terminalControl.mock.calls[0]?.[1]?.signal.aborted).toBe(true);
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	await screen.findByText(/new target rejected/);
	await act(async () => {
		finish(matchedInput(f.terminalControl.mock.calls[0]![0]));
		await original;
	});
	expect(screen.queryByText(t('agent.coordination.submitted'))).toBeNull();
	expect(screen.queryByText(t('agent.coordination.matched'))).toBeNull();
	expect(screen.getByText(/new target rejected/)).toBeTruthy();
	expect(f.terminalControl.mock.calls.map(([request]) => request.target?.spaceId)).toEqual(['b', 'a']);
});

test('requires explicit exact target, distinguishes duplicate names across Spaces and never follows focus', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), '中文{enter}任务');
	expect((screen.getByRole('button', { name: t('agent.coordination.send') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	await chooseB(user);
	f.view.rerender(f.content());
	expect(screen.getByText(/session-b[\s\S]*runtime-b/)).toBeTruthy();
	expect(screen.getByText(t('agent.coordination.blockingUnknown'))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	expect(f.terminalControl).toHaveBeenCalledWith(
		expect.objectContaining({
			operation: 'agent.prompt',
			target: { spaceId: 'b', sessionId: 'session-b', runtimeId: 'runtime-b' },
			params: { text: '中文\n任务' },
		}),
		expect.any(Object),
	);
	expect(f.show).not.toHaveBeenCalled();
});

for (const interruption of ['cancel', 'timeout'] as const)
	test(`${interruption} and continue keep the original target and N, even after a passive read, and never resend input`, async () => {
		const baseline = {
			at: { runtimeId: 'runtime-b', activitySequence: 42 },
			source: { bindingId: 'binding', programEpoch: 'epoch' },
			initialState: 'working' as const,
			initialWorking: true,
		};
		const f = fixture(async (request, options) => {
				if (request.operation === 'terminal.read')
					return {
						target: request.target!,
						phase: 'read',
						effect: 'none',
						data: { text: 'bounded screen', range: { startRow: 0, endRow: 3 }, truncated: true },
					};
				if (request.operation === 'agent.wait')
					return { target: request.target!, phase: 'state-matched', effect: 'none', continuation: baseline };
				options.progress?.({
					target: request.target,
					phase: 'input-submitted',
					effect: 'completed',
					data: { receipt: { kind: 'adapter-applied', op: 7 }, initialWorking: true },
				});
				if (interruption === 'timeout')
					return {
						target: request.target!,
						phase: 'input-submitted',
						effect: 'completed',
						receipt: { kind: 'adapter-applied', op: 7 },
						continuation: baseline,
						error: { code: 'WAIT_TIMEOUT', message: 'timed out observation' },
					};
				return new Promise((resolve) =>
					options.signal.addEventListener(
						'abort',
						() =>
							resolve({
								target: request.target!,
								phase: 'input-submitted',
								effect: 'completed',
								receipt: { kind: 'adapter-applied', op: 7 },
								continuation: baseline,
								error: { code: 'WAIT_CANCELLED', message: 'cancelled observation' },
							}),
						{ once: true },
					),
				);
			}),
			user = userEvent.setup();
		await chooseB(user);
		await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'one input');
		await user.click(screen.getByRole('button', { name: t('agent.coordination.sendWait') }));
		expect(await screen.findByText(t('agent.coordination.initialWorking'))).toBeTruthy();
		expect(screen.getByText(t('agent.coordination.submitted'))).toBeTruthy();
		if (interruption === 'cancel')
			await user.click(screen.getByRole('button', { name: t('agent.coordination.cancelWait') }));
		await screen.findByRole('button', { name: t('agent.coordination.continueWait') });
		await user.click(screen.getByRole('button', { name: t('agent.coordination.read') }));
		expect(await screen.findByText('bounded screen')).toBeTruthy();
		expect(screen.getByText(new RegExp(t('agent.coordination.truncated')))).toBeTruthy();
		expect(screen.getByText(t('agent.coordination.submitted'))).toBeTruthy();
		await user.click(screen.getByRole('button', { name: t('agent.coordination.continueWait') }));
		expect(screen.getByText(t('agent.coordination.submitted'))).toBeTruthy();
		expect(screen.getByText(t('agent.coordination.initialWorking'))).toBeTruthy();
		expect(f.terminalControl.mock.calls.filter(([request]) => request.operation === 'agent.prompt')).toHaveLength(
			1,
		);
		expect(f.terminalControl.mock.calls[2]?.[0]).toMatchObject({
			operation: 'agent.wait',
			target: { spaceId: 'b', sessionId: 'session-b', runtimeId: 'runtime-b' },
			params: { state: 'done' },
		});
		expect(f.terminalControl.mock.calls[2]?.[1]?.after).toBe(baseline);
		expect(f.confirm).not.toHaveBeenCalled();
		expect(f.show).not.toHaveBeenCalled();
	});

test('runtime replacement revokes the selected target and closing releases only the tool observation', async () => {
	let captured!: AbortSignal;
	const f = fixture(async (request, options) => {
			captured = options.signal;
			options.progress?.({
				target: request.target,
				phase: 'input-submitted',
				effect: 'completed',
				data: { receipt: { kind: 'adapter-applied', op: 7 } },
			});
			return new Promise(() => {});
		}),
		user = userEvent.setup();
	await chooseB(user);
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'one');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.sendWait') }));
	f.updateRuntime('replacement');
	await screen.findByText(t('agent.coordination.stale'));
	expect(captured.aborted).toBe(true);
	expect((screen.getByRole('button', { name: t('agent.coordination.send') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	f.view.unmount();
	expect(f.listeners.size).toBe(0);
	expect(f.terminalControl).toHaveBeenCalledOnce();
});

test('unmount aborts only the current observation and removes its one subscription', async () => {
	let signal!: AbortSignal;
	const f = fixture(async (request, options) => {
			signal = options.signal;
			options.progress?.({
				target: request.target,
				phase: 'input-submitted',
				effect: 'completed',
				data: { receipt: { kind: 'adapter-applied', op: 7 } },
			});
			return new Promise((resolve) =>
				options.signal.addEventListener(
					'abort',
					() =>
						resolve({
							target: request.target!,
							phase: 'input-submitted',
							effect: 'completed',
							receipt: { kind: 'adapter-applied', op: 7 },
							error: { code: 'WAIT_CANCELLED', message: 'cancelled observation' },
						}),
					{ once: true },
				),
			);
		}),
		user = userEvent.setup();
	await chooseB(user);
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'one');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.sendWait') }));
	expect(signal.aborted).toBe(false);
	f.view.unmount();
	expect(signal.aborted).toBe(true);
	expect(f.listeners.size).toBe(0);
	expect(f.terminalControl).toHaveBeenCalledOnce();
});

test('raw modes require explicit selection; locate uses the original runtime and stop keeps its confirmation', async () => {
	const f = fixture(async (request) => ({
			target: request.target!,
			phase: request.operation === 'terminal.stop' ? 'stop-requested' : 'input-submitted',
			effect: 'completed',
			...(request.operation === 'terminal.stop' ? {} : { receipt: { kind: 'pty-written', op: 8 } }),
		})),
		user = userEvent.setup();
	await chooseB(user);
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.mode') }));
	await user.click(screen.getByRole('option', { name: t('agent.coordination.textMode') }));
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'material{enter}only');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	expect(f.terminalControl.mock.calls[0]?.[0]).toMatchObject({
		operation: 'terminal.send-text',
		params: { text: 'material\nonly' },
	});
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.mode') }));
	await user.click(screen.getByRole('option', { name: t('agent.coordination.keysMode') }));
	await user.clear(screen.getByRole('textbox', { name: t('agent.coordination.input') }));
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'Enter');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	expect(f.terminalControl.mock.calls[1]?.[0]).toMatchObject({
		operation: 'terminal.send-keys',
		params: { keys: 'Enter' },
	});
	expect(f.terminalControl.mock.calls.every(([request]) => request.operation !== 'agent.prompt')).toBe(true);
	await user.click(screen.getByRole('button', { name: t('agent.coordination.locate') }));
	expect(f.show).toHaveBeenCalledExactlyOnceWith('runtime-b');
	await user.click(screen.getByRole('button', { name: t('agent.coordination.stop') }));
	expect(f.confirm).toHaveBeenCalledOnce();
	expect(f.terminalControl).toHaveBeenCalledTimes(2);
	f.confirm.mockResolvedValueOnce(true);
	await user.click(screen.getByRole('button', { name: t('agent.coordination.stop') }));
	await waitFor(() => expect(f.terminalControl).toHaveBeenCalledTimes(3));
	expect(f.terminalControl.mock.calls[2]?.[0]).toMatchObject({
		operation: 'terminal.stop',
		target: { spaceId: 'b', sessionId: 'session-b', runtimeId: 'runtime-b' },
	});
});

test('a changed selected source invalidates the tool even when an older source still appears current', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await chooseB(user);
	f.updateSource();
	await screen.findByText(t('agent.coordination.stale'));
	expect((screen.getByRole('button', { name: t('agent.coordination.send') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	expect(f.terminalControl).not.toHaveBeenCalled();
});

test('changing the displayed Space preserves the selected target identity visibly and disables sending until reselected', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await user.click(screen.getByRole('combobox', { name: t('agent.coordination.target') }));
	await user.click(screen.getByRole('option', { name: /Space A/ }));
	await user.type(screen.getByRole('textbox', { name: t('agent.coordination.input') }), 'keep exact target');
	act(() => f.spaces.setState((state) => ({ records: { ...state.records, selectedSpaceId: 'b' } })));
	const selected = screen.getByRole('combobox', { name: t('agent.coordination.target') });
	expect(selected.textContent).toContain('Space A');
	expect(selected.textContent).toContain('pi');
	expect(selected.textContent).toContain('session-a');
	expect(selected.textContent).not.toContain('Space B');
	expect(screen.getByRole('alert').textContent).toContain(t('agent.coordination.stale'));
	const send = screen.getByRole('button', { name: t('agent.coordination.send') });
	expect((send as HTMLButtonElement).disabled).toBe(true);
	await user.click(send);
	expect(f.terminalControl).not.toHaveBeenCalled();
	await user.click(selected);
	const stale = screen.getByRole('option', { name: /Space A/ });
	expect(stale.getAttribute('aria-disabled')).toBe('true');
	await user.click(screen.getByRole('option', { name: /Space B/ }));
	await user.click(screen.getByRole('button', { name: t('agent.coordination.send') }));
	await waitFor(() => expect(f.terminalControl).toHaveBeenCalledTimes(1));
	expect(f.terminalControl.mock.calls[0]![0].target).toEqual({
		spaceId: 'b',
		sessionId: 'session-b',
		runtimeId: 'runtime-b',
	});
});

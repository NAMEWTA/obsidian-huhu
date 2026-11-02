import { afterEach, expect, test, vi } from 'vitest';
import { createAgentDispatch } from './prompt-port';
import type { AgentDispatchRequest, AgentDispatchReceipt } from '../api';
import type { AutomationInvocations } from '../../automations/api';

const input: AgentDispatchRequest = { invocationId: 'one', title: 'Review', agentId: 'codex', source: { kind: 'widget', path: 'A.md', id: 'skill' },
	destination: { kind: 'fresh', cwd: '', spaceId: 'space-a' }, finalPrompt: '$review\nEdited', files: [] };
function fixture(spaces: { active?: string[]; choice?: () => Promise<string | undefined> } = {}) {
	vi.useFakeTimers();
	const active = new Set(spaces.active ?? ['space-a', 'space-b']);
	const choose = vi.fn((_signal?: AbortSignal) => (spaces.choice ?? (async () => 'space-b'))());
	const invoke = vi.fn<AutomationInvocations['invoke']>(async request => ({ invocationId: request.invocationId, delivery: 'started', runId: 'run', terminalId: 'terminal' }));
	const agents = [{ id: 'codex' as const, title: 'Codex', enabled: true, installed: true }];
	let available = true;
	const port = createAgentDispatch({ agents: () => agents, invocations: () => available ? { invoke, receipt: () => undefined } : undefined,
		spaces: { has: id => active.has(id), choose }, clock: { setTimeout: (fn, ms) => Number(setTimeout(fn, ms)), clearTimeout: id => clearTimeout(id) } });
	return { port, invoke, agents, choose, active, off: () => { available = false; } };
}
afterEach(() => vi.useRealTimers());

test('fresh routes the selected agent and literal final text through the shared journal', async () => {
	const f = fixture(); expect((await f.port.dispatch(input)).delivery).toBe('started');
	expect(f.invoke.mock.calls[0]?.[0]).toEqual(input);
	expect(input.destination).toEqual({ kind: 'fresh', cwd: '', spaceId: 'space-a' }); expect(vi.getTimerCount()).toBe(0);
	expect(f.choose).not.toHaveBeenCalled();
});

test('unavailable, disabled, unknown and missing CLI targets never start a journal invocation', async () => {
	const f = fixture();
	expect((await f.port.dispatch({ ...input, agentId: 'chat' })).errorCode).toBe('unsupported');
	f.agents[0]!.enabled = false; expect((await f.port.dispatch(input)).errorCode).toBe('agentDisabled');
	f.agents[0]!.enabled = true; f.agents[0]!.installed = false; expect((await f.port.dispatch(input)).errorCode).toBe('cliMissing');
	f.agents[0]!.installed = true; f.off(); expect((await f.port.dispatch(input)).errorCode).toBe('moduleOff');
	expect(f.invoke).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});

test('ten second delivery timeout does not report cancellation or completion of an accepted task', async () => {
	const f = fixture(); let finish!: (receipt: AgentDispatchReceipt) => void;
	f.invoke.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
	const pending = f.port.dispatch(input); await vi.advanceTimersByTimeAsync(10_000);
	expect(await pending).toMatchObject({ delivery: 'timeout', errorCode: 'timeout' });
	expect(f.invoke.mock.calls[0]?.[1]?.signal?.reason).toBe('timeout');
	finish({ invocationId: 'one', delivery: 'started', runId: 'run' }); await Promise.resolve();
	expect(vi.getTimerCount()).toBe(0); expect(f.invoke).toHaveBeenCalledTimes(1);
});

test('page abort and module disposal release listeners and waits; no request starts after pre-cancel', async () => {
	const f = fixture(); const abort = new AbortController(); abort.abort();
	expect((await f.port.dispatch(input, { signal: abort.signal })).errorCode).toBe('cancelled'); expect(f.invoke).not.toHaveBeenCalled();
	f.invoke.mockImplementation(() => new Promise(() => {}));
	const active = new AbortController(); const pending = f.port.dispatch(input, { signal: active.signal });
	await Promise.resolve(); active.abort(); expect((await pending).errorCode).toBe('cancelled');
	const next = f.port.dispatch(input); await Promise.resolve(); f.port.dispose(); expect((await next).errorCode).toBe('cancelled');
	expect(vi.getTimerCount()).toBe(0); expect((await f.port.dispatch(input)).delivery).toBe('rejected');
});

const unbound: AgentDispatchRequest = { ...input, destination: { kind: 'fresh', cwd: '' } };

test('a fresh request without a Space is rejected unless the caller is interactive; nothing is guessed', async () => {
	const f = fixture();
	expect(await f.port.dispatch(unbound)).toMatchObject({ delivery: 'rejected', errorCode: 'spaceRequired' });
	expect(f.choose).not.toHaveBeenCalled(); expect(f.invoke).not.toHaveBeenCalled();
});

test('interactive dispatch settles the Space in the existing chooser before the invocation is created', async () => {
	const f = fixture();
	expect((await f.port.dispatch(unbound, { interactive: true })).delivery).toBe('started');
	expect(f.choose).toHaveBeenCalledTimes(1);
	expect(f.invoke.mock.calls[0]?.[0].destination).toEqual({ kind: 'fresh', cwd: '', spaceId: 'space-b' });
	expect(unbound.destination).toEqual({ kind: 'fresh', cwd: '' });
});

test('cancelling the Space chooser starts nothing and leaves no accepted delivery', async () => {
	const f = fixture({ choice: async () => undefined });
	expect(await f.port.dispatch(unbound, { interactive: true })).toMatchObject({ delivery: 'rejected', errorCode: 'cancelled' });
	expect(f.invoke).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});

test('a page that leaves while the chooser is open, or a disposed module, never starts the delivery', async () => {
	let pick!: (id: string | undefined) => void;
	const f = fixture({ choice: () => new Promise(resolve => { pick = resolve; }) });
	const page = new AbortController();
	const pending = f.port.dispatch(unbound, { interactive: true, signal: page.signal });
	page.abort(); pick('space-b');
	expect((await pending).errorCode).toBe('cancelled');
	const second = f.port.dispatch(unbound, { interactive: true });
	f.port.dispose(); pick('space-a');
	expect((await second).errorCode).toBe('cancelled');
	expect(f.invoke).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});

test('an archived or deleted Space is rejected, never replaced by another Space', async () => {
	const f = fixture({ active: ['space-b'] });
	expect(await f.port.dispatch(input)).toMatchObject({ delivery: 'rejected', errorCode: 'spaceUnavailable' });
	expect(f.choose).not.toHaveBeenCalled(); expect(f.invoke).not.toHaveBeenCalled();
});

test('an existing session needs no Space in the request: its owner comes from the stable session id', async () => {
	const f = fixture();
	const existing: AgentDispatchRequest = { ...input, destination: { kind: 'existing', sessionId: 'terminal-1' } };
	expect((await f.port.dispatch(existing)).delivery).toBe('started');
	expect(f.choose).not.toHaveBeenCalled();
});

test('an unbound retry of an invocation the journal already holds gets the journal answer, not spaceRequired, and starts nothing new', async () => {
	const f = fixture();
	const original: AgentDispatchReceipt = { invocationId: 'one', delivery: 'started', runId: 'old' };
	const port = createAgentDispatch({ agents: () => f.agents, invocations: () => ({ invoke: async () => original, receipt: id => id === 'one' ? original : undefined }),
		spaces: { has: () => true, choose: f.choose }, clock: { setTimeout: (fn, ms) => Number(setTimeout(fn, ms)), clearTimeout: id => clearTimeout(id) } });
	expect(await port.dispatch(unbound)).toEqual(original);
	expect(await port.dispatch({ ...unbound, invocationId: 'brand-new' })).toMatchObject({ errorCode: 'spaceRequired' });
	expect(f.invoke).not.toHaveBeenCalled();
});

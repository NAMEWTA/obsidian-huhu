import { expect, test, vi } from 'vitest';
import { AutomationService } from './service';
import { AutomationError } from '../../../shared/automation/errors';
import type { AgentDispatchRequest } from '../../../shared/agent-dispatch';
import type { AgentRunHandle, AgentRuntimePort, AutomationDefinition, AutomationRun, AutomationSourcePort } from '../../../shared/automation/types';
import type { TextStorage } from '../../../shared/storage/ports';

const request = (kind: 'fresh' | 'existing' = 'fresh'): AgentDispatchRequest => ({ invocationId: 'one', title: 'Review', agentId: 'codex',
	source: { kind: 'widget', path: 'A.md', id: 'button' }, destination: kind === 'fresh' ? { kind, cwd: '/vault', spaceId: 'space-a' } : { kind, sessionId: 'selected' },
	finalPrompt: '$review\nEdited {{literal}}', files: ['A.md'] });
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

async function fixture() {
	const files = new Map<string, string>(); let fail = false;
	const storage: TextStorage = { exists: async path => files.has(path), read: async path => files.get(path)!, mkdir: async () => {},
		write: async (path, text) => { if (fail) throw Error('disk full'); files.set(path, text); } };
	const sources: AutomationSourcePort = { list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {}, createTask: async () => {} };
	const completion = deferred<Awaited<AgentRunHandle['completion']>>();
	const started = deferred<void>();
	const start = vi.fn<AgentRuntimePort['start']>(async (_action, run) => {
		const disk = JSON.parse(files.get('runtime.json')!);
		expect(disk.runs.some((row: AutomationRun) => row.id === run.id && row.invocation?.request.finalPrompt === request().finalPrompt)).toBe(true);
		started.resolve(); return { terminalId: 'terminal', completion: completion.promise };
	});
	const agent: AgentRuntimePort = { listAgents: () => [], listSessions: async () => [], start, stop: vi.fn(async () => {}), open: vi.fn(async () => {}) };
	const paste = vi.fn(async (_request: AgentDispatchRequest, _signal: AbortSignal) => {});
	const notify = vi.fn(async () => {});
	const make = (extra: Partial<ConstructorParameters<typeof AutomationService>[7]> = {}) => new AutomationService(storage, 'runtime.json', 'device', sources, () => agent, notify, true, { attachMaterial: paste, ...extra });
	const service = make(); await service.load();
	return { service, make, files, start, started, completion, paste, notify, agent, fail: (value: boolean) => { fail = value; } };
}

test('fresh delivery persists its exact request first, deduplicates concurrently, and follows real completion', async () => {
	const f = await fixture(); const input = request();
	const first = f.service.invokeAgent(input), second = f.service.invokeAgent(input); input.finalPrompt = 'mutated later';
	const [receipt, duplicate] = await Promise.all([first, second]);
	expect(receipt).toEqual(duplicate); expect(receipt.delivery).toBe('started'); expect(f.start).toHaveBeenCalledTimes(1);
	expect(f.start.mock.calls[0]?.[0].prompt).toBe('$review\nEdited {{literal}}\nA.md');
	expect(f.service.state.runs[0]?.status).toBe('unknown');
	expect(f.service.state.runs[0]?.invocation?.request.finalPrompt).toBe(request().finalPrompt);
	f.completion.resolve({ status: 'succeeded', message: 'Native result' });
	await vi.waitFor(() => expect(f.service.state.runs[0]?.status).toBe('succeeded'));
	expect(f.service.state.runs[0]?.invocation?.receipt?.delivery).toBe('started');
	await f.service.shutdown(); const restarted = f.make(); await restarted.load();
	expect(await restarted.invokeAgent(request())).toEqual(receipt); expect(f.start).toHaveBeenCalledTimes(1);
	expect((await restarted.invokeAgent({ ...request(), finalPrompt: 'different' })).errorCode).toBe('invocationConflict');
	await restarted.shutdown();
});

test('existing delivery records pasted without model success or ownership of the interactive terminal', async () => {
	const f = await fixture();
	f.paste.mockImplementation(async input => { const disk = JSON.parse(f.files.get('runtime.json')!); expect(disk.runs[0].invocation.request).toEqual(input); });
	const receipt = await f.service.invokeAgent(request('existing'));
	expect(receipt).toMatchObject({ delivery: 'pasted', terminalId: 'selected' });
	expect(f.start).not.toHaveBeenCalled(); expect(f.paste).toHaveBeenCalledTimes(1);
	expect(f.service.state.runs[0]?.status).toBe('delivered');
	await f.service.stop(f.service.state.runs[0]!); await f.service.shutdown(); expect(f.agent.stop).not.toHaveBeenCalled();
});

test('failed persistence cannot launch or paste and a corrected retry starts only once', async () => {
	const f = await fixture(); f.fail(true);
	await expect(f.service.invokeAgent(request())).rejects.toThrow('disk full');
	expect(f.start).not.toHaveBeenCalled(); expect(f.service.state.runs).toHaveLength(0);
	f.fail(false); await f.service.invokeAgent(request()); expect(f.start).toHaveBeenCalledTimes(1);
	f.completion.resolve({ status: 'failed', message: 'Native failure' });
	await vi.waitFor(() => expect(f.service.state.runs[0]?.status).toBe('failed')); await f.service.shutdown();
});

test('material that would be truncated or changed by the terminal formatter is rejected before recording', async () => {
	const f = await fixture();
	expect((await f.service.invokeAgent({ ...request('existing'), finalPrompt: 'x'.repeat(64_001) })).errorCode).toBe('promptTooLarge');
	expect((await f.service.invokeAgent({ ...request('existing'), finalPrompt: 'unsafe\u001b[201~\r' })).errorCode).toBe('invalid');
	expect(f.service.state.runs).toHaveLength(0); expect(f.paste).not.toHaveBeenCalled(); expect(f.start).not.toHaveBeenCalled(); await f.service.shutdown();
});

test('cancelling pending material delivery leaves the session alive and keeps a truthful receipt', async () => {
	const f = await fixture(); const entered = deferred<void>();
	f.paste.mockImplementation((_input, signal) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(Object.assign(Error('cancelled'), { code: 'cancelled' })), { once: true }); entered.resolve(); }));
	const pending = f.service.invokeAgent(request('existing')); await entered.promise;
	await f.service.setExecutionEnabled(false);
	expect(await pending).toMatchObject({ delivery: 'rejected', errorCode: 'cancelled' });
	expect(f.service.state.runs[0]?.status).toBe('cancelled'); expect(f.agent.stop).not.toHaveBeenCalled(); await f.service.shutdown();
});

test('readiness timeout and notification failure do not masquerade as model completion or another delivery', async () => {
	const f = await fixture(); f.paste.mockRejectedValueOnce(Object.assign(Error('not ready'), { code: 'timeout' }));
	expect(await f.service.invokeAgent(request('existing'))).toMatchObject({ delivery: 'timeout', errorCode: 'timeout' });
	expect(f.service.state.runs[0]?.status).toBe('failed'); expect(f.start).not.toHaveBeenCalled();
	f.notify.mockRejectedValueOnce(Error('notification failed'));
	const input = { ...request('existing'), invocationId: 'next' };
	expect((await f.service.invokeAgent(input)).delivery).toBe('pasted');
	expect((await f.service.invokeAgent(input)).delivery).toBe('pasted'); expect(f.paste).toHaveBeenCalledTimes(2);
	await f.service.shutdown();
});

const freshIn = (spaceId: string | undefined, extra: Partial<AgentDispatchRequest> = {}): AgentDispatchRequest => ({
	...request(),
	...extra,
	destination: { kind: 'fresh', cwd: '/vault', ...(spaceId ? { spaceId } : {}) },
});
const saved = (action: Partial<Extract<AutomationDefinition['action'], { kind: 'agent' }>> = {}): AutomationDefinition => ({
	id: 'saved', name: 'Saved', enabled: true, deviceId: 'device', revision: 1, schedule: { kind: 'manual' },
	action: { kind: 'agent', agentId: 'codex', cwd: '/vault', prompt: 'go', sessionMode: 'fresh', ...action },
	channels: ['in-app'], notifyOn: 'never', graceMinutes: 0, createdAt: 1, updatedAt: 1,
});

test('a fresh delivery without an explicit Space is rejected before anything is recorded or started', async () => {
	const f = await fixture();
	expect(await f.service.invokeAgent(freshIn(undefined))).toMatchObject({ delivery: 'rejected', errorCode: 'spaceRequired' });
	expect(f.service.state.runs).toHaveLength(0); expect(f.start).not.toHaveBeenCalled();
	// An existing session needs none: its owner is resolved from the stable session id.
	expect((await f.service.invokeAgent(request('existing'))).delivery).toBe('pasted');
	await f.service.shutdown();
});

test('the same cwd in two Spaces is two different targets; each start carries its own Space', async () => {
	const f = await fixture();
	await f.service.invokeAgent(freshIn('space-a', { invocationId: 'a' }));
	await f.service.invokeAgent(freshIn('space-b', { invocationId: 'b' }));
	expect(f.start).toHaveBeenCalledTimes(2);
	expect(f.start.mock.calls.map(call => [call[0].cwd, call[0].spaceId])).toEqual([['/vault', 'space-a'], ['/vault', 'space-b']]);
	await f.service.shutdown();
});

test('one invocation id with a different Space conflicts, in flight and after restart; the original receipt is never resent', async () => {
	const f = await fixture();
	const first = f.service.invokeAgent(freshIn('space-a'));
	expect((await f.service.invokeAgent(freshIn('space-b'))).errorCode).toBe('invocationConflict');
	const receipt = await first;
	expect(f.start).toHaveBeenCalledTimes(1);
	await f.service.shutdown();
	const restarted = f.make(); await restarted.load();
	expect((await restarted.invokeAgent(freshIn('space-b'))).errorCode).toBe('invocationConflict');
	expect(await restarted.invokeAgent(freshIn('space-a'))).toEqual(receipt);
	expect(f.start).toHaveBeenCalledTimes(1);
	await restarted.shutdown();
});

test('an old accepted request without a Space is kept as history: a bound retry conflicts instead of rewriting or replaying it', async () => {
	const f = await fixture();
	const legacy = freshIn(undefined);
	f.service.state.runs.push({ id: 'old', automationId: 'invocation:one', revision: 1, title: 'Review', scheduledFor: 1, trigger: 'manual', status: 'succeeded', startedAt: 1, message: '',
		invocation: { request: legacy, receipt: { invocationId: 'one', delivery: 'started', runId: 'old' } } });
	expect((await f.service.invokeAgent(freshIn('space-a'))).errorCode).toBe('invocationConflict');
	// The exact old request gets its recorded receipt back; nothing starts or is rewritten.
	expect(await f.service.invokeAgent(legacy)).toEqual({ invocationId: 'one', delivery: 'started', runId: 'old' });
	expect(await f.service.invokeAgent({ ...legacy, invocationId: 'fresh-id' })).toMatchObject({ errorCode: 'spaceRequired' });
	expect(f.start).not.toHaveBeenCalled();
	expect(f.service.state.runs[0]?.invocation?.request.destination).toEqual({ kind: 'fresh', cwd: '/vault' });
	await f.service.shutdown();
});

test('page unload after the target was accepted neither cancels the started run nor lets it start again', async () => {
	const f = await fixture(); const page = new AbortController();
	const receipt = await f.service.invokeAgent(freshIn('space-a'), page.signal);
	page.abort();
	expect(receipt.delivery).toBe('started');
	expect(await f.service.invokeAgent(freshIn('space-a'))).toEqual(receipt);
	expect(f.start).toHaveBeenCalledTimes(1); expect(f.agent.stop).not.toHaveBeenCalled();
	await f.service.shutdown();
});

test('a saved terminal action with no Space fails the run before the precheck or any process, and is recorded for the user', async () => {
	const f = await fixture();
	const precheck = vi.fn(async () => ({ exitCode: 0, timedOut: false, output: '' }));
	const service = f.make({ precheck }); await f.service.shutdown();
	await service.load();
	const run = await service.run({ ...saved(), precheck: { command: 'echo side-effect', shell: 'bash' } });
	expect(run).toMatchObject({ status: 'failed', errorCode: 'spaceRequired' });
	expect(precheck).not.toHaveBeenCalled(); expect(f.start).not.toHaveBeenCalled();
	await service.shutdown();
});

test('a background trigger runs against the Space frozen in the definition, whatever changes afterwards', async () => {
	const f = await fixture(); const definition = saved({ spaceId: 'space-a' });
	const entered = deferred<void>(), release = deferred<void>();
	f.start.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { terminalId: 'terminal', completion: f.completion.promise }; });
	const running = f.service.run(definition);
	await entered.promise;
	if (definition.action.kind === 'agent') definition.action.spaceId = 'space-b';
	release.resolve(); await running;
	expect(f.start.mock.calls[0]?.[0]).toMatchObject({ spaceId: 'space-a' });
	expect(f.service.state.runs[0]?.definition?.action).toMatchObject({ spaceId: 'space-a' });
	f.completion.resolve({ status: 'succeeded', message: 'done' }); await f.service.shutdown();
});

test('the precheck runs in the Space-bound directory, and an unusable binding fails the run before the precheck', async () => {
	const f = await fixture();
	const precheck = vi.fn(async (_input: { cwd?: string }) => ({ exitCode: 0, timedOut: false, output: '' }));
	const boundCwd = vi.fn(async (spaceId: string | undefined, cwd: string) => {
		if (spaceId === 'gone') throw new AutomationError('spaceUnavailable');
		return `/space/${spaceId}${cwd}`;
	});
	f.agent.boundCwd = boundCwd;
	const service = f.make({ precheck });
	await f.service.shutdown();
	await service.load();
	const withCheck = (spaceId: string) => ({ ...saved({ spaceId, cwd: '/vault' }), precheck: { command: 'echo ok', shell: 'bash' as const } });
	await service.run(withCheck('space-a'));
	expect(precheck.mock.calls[0]?.[0].cwd).toBe('/space/space-a/vault');
	const failed = await service.run({ ...withCheck('gone'), id: 'other' });
	expect(failed).toMatchObject({ status: 'failed', errorCode: 'spaceUnavailable' });
	expect(precheck).toHaveBeenCalledTimes(1);
	await service.shutdown();
});

import { expect, it, vi } from 'vitest';
import type { BotClient, BotMethodMap, EventCursorRecovery, EventPage, GroupBinding, Run, RunEvent, Session } from '../../api';
import fixtures from '../../../../../contracts/hap/v0.1/fixtures/golden.json';
import { BotRpcError } from '../../core/protocol/connection';
import { EventClient } from './event-client';

type Tail = BotMethodMap['runs.subscribe']['params'];
function page(seq: string, extra: Partial<RunEvent> = {}): EventPage {
	return { runId: 'run:one', subscriptionId: 'subscription:one', events: [{ runId: 'run:one', seq, type: 'delta', createdAt: '2026-10-25T00:00:00Z', ...extra }],
		nextSeq: seq, headSeq: seq, hasMore: false };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function fixture(poll = false) {
	const tail = vi.fn(async (_query: Tail, _options?: unknown): Promise<EventPage> => ({ ...page('2'), events: [page('1', { type: 'running', status: 'running' }).events[0]!, page('2', { text: 'private text' }).events[0]!] }));
	const cancel = vi.fn();
	const get = vi.fn<(...args: unknown[]) => Promise<Run>>();
	const closeListeners = new Set<() => void>();
	const bot = { onClose: (run: () => void) => { closeListeners.add(run); return () => { closeListeners.delete(run); }; }, hello: { profile: { profileId: 'profile:one' } }, runs: { subscribe: tail, cancel, get } } as unknown as BotClient;
	const callbacks = new Set<() => void>();
	const events = new EventClient(bot, { after: (_ms, run) => { callbacks.add(run); return () => { callbacks.delete(run); }; } }, { poll });
	return { events, bot, tail, cancel, get, callbacks, closeListeners, stream: events.attach('run:one') };
}
function denied() { return new BotRpcError(-32000, { kind: 'CAPABILITY_DENIED', reason: 'READ_GRANT_REVOKED', retryable: false, correlationId: 'safe' }); }

it('invalidates removed group incarnations and reanchors siblings without canceling Runs or reviving an old generation', async () => {
	const current = fixture(); current.stream.dispose();
	const session: Session = { id: 'group:one', revision: '1', kind: 'group', title: 'group', memberIds: ['agent:b', 'agent:c'], coordinatorId: 'agent:b', archived: false,
		groupMembers: [{ agentId: 'agent:b', incarnation: '1', historyRevision: '1', historyScope: { kind: 'none' } }, { agentId: 'agent:c', incarnation: '1', historyRevision: '1', historyScope: { kind: 'none' } }] };
	const binding = (agentId: string): GroupBinding => ({ sessionId: session.id, members: [{ agentId, incarnation: '1', historyRevision: '1' }] });
	const removed = current.events.attach('run:one', binding('agent:b')), sibling = current.events.attach('run:two', binding('agent:c'));
	current.events.sessionChanged(session);
	current.get.mockResolvedValue({ id: 'run:two', sessionId: session.id, agentId: 'agent:c', status: 'running', revision: '1', personaRevision: '1', modelBindingRevision: '1', group: binding('agent:c') });
	try {
		await removed.refresh();
		const late = deferred<EventPage>(); current.tail.mockReturnValueOnce(late.promise);
		const reading = removed.refresh(); await Promise.resolve();
		current.events.sessionChanged({ ...session, revision: '2', memberIds: ['agent:c'], groupMembers: session.groupMembers!.filter(item => item.agentId !== 'agent:b') });
		late.resolve(page('3', { text: 'old-incarnation-private-body' })); await reading;
		expect(removed.getSnapshot()).toMatchObject({ state: 'paused', projection: { access: 'denied', pendingText: '' }, error: { reason: 'GROUP_MEMBERSHIP_CHANGED' } });
		current.tail.mockResolvedValueOnce({ ...page('1', { text: 'sibling-current' }), runId: 'run:two', events: [{ ...page('1', { text: 'sibling-current' }).events[0]!, runId: 'run:two' }] });
		await sibling.refresh(); expect(sibling.getSnapshot().projection.pendingText).toBe('sibling-current');
		current.events.sessionChanged({ ...session, revision: '3', groupMembers: session.groupMembers!.map(item => item.agentId === 'agent:b' ? { ...item, incarnation: '2' } : item) });
		const before = current.tail.mock.calls.length, getBefore = current.get.mock.calls.length;
		await current.events.reanchor('run:one'); await removed.refresh();
		expect(current.tail.mock.calls.length).toBe(before); expect(current.get.mock.calls.length).toBe(getBefore);
		expect(JSON.stringify(removed.getSnapshot())).not.toContain('old-incarnation-private-body'); expect(current.cancel).not.toHaveBeenCalled();
	} finally { removed.dispose(); sibling.dispose(); current.events.dispose(); }
});

it('rejects conflicting group bindings for one Run instead of resetting its authorization generation', () => {
	const current = fixture(); current.stream.dispose();
	const first: GroupBinding = { sessionId: 'group:one', members: [{ agentId: 'agent:b', incarnation: '1', historyRevision: '1' }] };
	const stream = current.events.attach('run:group', first);
	try { expect(() => current.events.attach('run:group', { ...first, members: [{ ...first.members[0]!, incarnation: '2' }] })).toThrow('EVENT_GROUP_BINDING_CONFLICT'); }
	finally { stream.dispose(); current.events.dispose(); }
});

it('accepts only higher-revision proof supersets, aborts their old page, and checks every contributor', async () => {
	const current = fixture(); current.stream.dispose();
	const members = Array.from({ length: 100 }, (_, index) => ({ agentId: `agent:${index}`, incarnation: '1', historyRevision: '1' }));
	const session: Session = { id: 'group:closure', revision: '1', kind: 'group', title: 'group', archived: false, coordinatorId: members[0]!.agentId,
		memberIds: members.map(member => member.agentId), groupMembers: members.map(member => ({ ...member, historyScope: { kind: 'none' } })) };
	const binding: GroupBinding = { sessionId: session.id, members: members.slice(0, 1) };
	const stream = current.events.attach('run:one', binding, '1'); current.events.sessionChanged(session);
	try {
		await stream.refresh(); const late = deferred<EventPage>(); current.tail.mockReturnValueOnce(late.promise);
		const reading = stream.refresh(); await Promise.resolve();
		const expanded = current.events.attach('run:one', { ...binding, members }, '2');
		expect(stream.getSnapshot().projection.pendingText).toBe('');
		late.resolve(page('3', { text: 'old-proof-body' })); await reading;
		expect(JSON.stringify(stream.getSnapshot())).not.toContain('old-proof-body');
		// Stale snapshots never overwrite the expanded proof; same-revision mismatch cannot amend it.
		const stale = current.events.attach('run:one', binding, '1'); stale.dispose();
		expect(() => current.events.attach('run:one', binding, '2')).toThrow('EVENT_GROUP_BINDING_CONFLICT');
		expect(() => current.events.attach('run:one', binding, '3')).toThrow('EVENT_GROUP_BINDING_CONFLICT');
		current.events.sessionChanged({ ...session, revision: '2', memberIds: session.memberIds.slice(0, 99), groupMembers: session.groupMembers!.slice(0, 99) });
		expect(stream.getSnapshot()).toMatchObject({ projection: { access: 'denied', pendingText: '' } }); expanded.dispose();
	} finally { stream.dispose(); current.events.dispose(); }
});

it('clears every group Run when an unknown contributor may have changed and reanchors through current runs.get', async () => {
	const current = fixture(); current.stream.dispose();
	const member = (agentId: string) => ({ agentId, incarnation: '1', historyRevision: '1', historyScope: { kind: 'none' as const } });
	const session: Session = { id: 'group:one', revision: '1', kind: 'group', title: 'group', memberIds: ['agent:b', 'agent:c'], coordinatorId: 'agent:b', archived: false,
		groupMembers: [member('agent:b'), member('agent:c')] };
	const binding: GroupBinding = { sessionId: session.id, members: [member('agent:b')] };
	const stream = current.events.attach('run:one', binding, '1'); current.events.sessionChanged(session);
	const get = current.get;
	try {
		await stream.refresh(); const late = deferred<EventPage>(); current.tail.mockReturnValueOnce(late.promise);
		const reading = stream.refresh(); await Promise.resolve();
		current.events.sessionChanged({ ...session, revision: '2', memberIds: ['agent:b'], groupMembers: [member('agent:b')] });
		expect(stream.getSnapshot()).toMatchObject({ state: 'paused', projection: { access: 'unknown', pendingText: '' } });
		late.resolve(page('3', { text: 'hidden-contributor-stale-body' })); await reading;
		get.mockRejectedValueOnce(denied()); await stream.refresh();
		expect(get).toHaveBeenCalledWith({ profileId: 'profile:one', id: 'run:one' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
		expect(stream.getSnapshot()).toMatchObject({ projection: { access: 'denied', pendingText: '' } });
		get.mockResolvedValueOnce({ id: 'run:one', sessionId: session.id, agentId: 'agent:b', status: 'running', revision: '2', personaRevision: '1', modelBindingRevision: '1', group: binding });
		current.tail.mockResolvedValueOnce(page('1', { text: 'currently-authorized' })); await stream.refresh();
		expect(stream.getSnapshot().projection.pendingText).toBe('currently-authorized');
		expect(current.tail.mock.calls.at(-1)![0].afterSeq).toBe('0'); expect(current.cancel).not.toHaveBeenCalled();
	} finally { stream.dispose(); current.events.dispose(); }
});

it('rejects stale or same-revision conflicting snapshot proofs before accepting higher-revision contributor recovery', async () => {
	const current = fixture(); current.stream.dispose();
	const members = ['agent:b', 'agent:c'].map(agentId => ({ agentId, incarnation: '1', historyRevision: '1' }));
	const session: Session = { id: 'group:one', revision: '1', kind: 'group', title: 'group', memberIds: members.map(member => member.agentId), coordinatorId: 'agent:b', archived: false,
		groupMembers: members.map(member => ({ ...member, historyScope: { kind: 'none' } })) };
	const initial: GroupBinding = { sessionId: session.id, members: members.slice(0, 1) };
	const stream = current.events.attach('run:one', initial, '2'); current.events.sessionChanged(session);
	const template = fixtures.valid.find(item => item.name === 'cursor-expired')!.payload as unknown as { error: { data: { details: EventCursorRecovery } } };
	const restore = async (revision: string, group: GroupBinding) => {
		const recovery = structuredClone(template.error.data.details);
		recovery.runId = recovery.snapshot.run.id = 'run:one'; recovery.snapshot.run.sessionId = session.id;
		recovery.snapshot.run.revision = revision; recovery.snapshot.run.group = group; recovery.snapshot.events = []; recovery.snapshot.pendingText = 'snapshot-private-text';
		current.tail.mockRejectedValueOnce(new BotRpcError(-32000, { kind: 'CURSOR_EXPIRED', reason: 'EVENT_CURSOR_EXPIRED', retryable: false, correlationId: 'safe', details: recovery }));
		await stream.refresh();
	};
	try {
		await restore('1', initial); expect(stream.getSnapshot()).toMatchObject({ state: 'paused', error: { reason: 'EVENT_SNAPSHOT_INVALID' }, projection: { pendingText: '' } });
		await restore('2', { ...initial, members }); expect(stream.getSnapshot().projection.pendingText).toBe('');
		await restore('3', { ...initial, members }); expect(stream.getSnapshot().projection.pendingText).toBe('snapshot-private-text');
		current.events.sessionChanged({ ...session, revision: '2', memberIds: ['agent:b'], groupMembers: session.groupMembers!.slice(0, 1) });
		expect(stream.getSnapshot()).toMatchObject({ projection: { access: 'denied', pendingText: '' } });
	} finally { stream.dispose(); current.events.dispose(); }
});

it('reanchors only the selected Run through current server facts, aborting its old page without disturbing a sibling', async () => {
	const current = fixture(), sibling = current.events.attach('run:two');
	const old = deferred<EventPage>(), anchor = deferred<Run>(); let reading: Promise<void> | undefined;
	try {
		await current.stream.refresh();
		current.tail.mockResolvedValueOnce({ ...page('1', { text: 'sibling-body' }), runId: 'run:two', events: [{ ...page('1', { text: 'sibling-body' }).events[0]!, runId: 'run:two' }] });
		await sibling.refresh(); current.tail.mockReturnValueOnce(old.promise);
		reading = current.stream.refresh(); await Promise.resolve();
		const oldSignal = (current.tail.mock.calls.at(-1)![1] as { signal: AbortSignal }).signal;
		current.get.mockReturnValueOnce(anchor.promise);
		const rebuilding = current.events.reanchor('run:one'); await Promise.resolve();
		expect(oldSignal.aborted).toBe(true); expect(current.stream.getSnapshot().projection.pendingText).toBe('');
		expect(sibling.getSnapshot().projection.pendingText).toBe('sibling-body');
		old.resolve(page('3', { text: 'stale-before-resume' })); await reading;
		current.tail.mockResolvedValueOnce(page('1', { text: 'current-after-resume' }));
		anchor.resolve({ id: 'run:one', sessionId: 'session:one', agentId: 'agent:one', revision: '3', status: 'running', personaRevision: '1', modelBindingRevision: '1' });
		await rebuilding;
		expect(current.get).toHaveBeenCalledWith({ profileId: 'profile:one', id: 'run:one' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
		expect(current.tail.mock.calls.at(-1)![0].afterSeq).toBe('0');
		expect(current.stream.getSnapshot().projection.pendingText).toBe('current-after-resume');
		expect(JSON.stringify(current.stream.getSnapshot())).not.toContain('stale-before-resume'); expect(current.cancel).not.toHaveBeenCalled();
	} finally { old.resolve(page('3')); anchor.resolve({ id: 'run:one' } as Run); await reading; sibling.dispose(); current.events.dispose(); }
});

it('does not recreate an unattached or disposed stream when asked to reanchor it', async () => {
	const current = fixture();
	await current.events.reanchor('run:missing'); current.stream.dispose();
	await current.events.reanchor('run:one'); current.events.dispose(); await current.events.reanchor('run:one');
	expect(current.get).not.toHaveBeenCalled(); expect(current.tail).not.toHaveBeenCalled(); expect(current.callbacks.size).toBe(0);
});

it('isolates two concurrent Run reanchors and discards only the detached target while both current reads settle', async () => {
	const current = fixture(), sibling = current.events.attach('run:two');
	const one = deferred<Run>(), two = deferred<Run>();
	const run = (id: string): Run => ({ id, sessionId: 'session:one', agentId: 'agent:one', revision: '2', status: 'running', personaRevision: '1', modelBindingRevision: '1' });
	current.get.mockImplementation(query => (query as { id: string }).id === 'run:one' ? one.promise : two.promise);
	const first = current.events.reanchor('run:one'), second = current.events.reanchor('run:two'); await Promise.resolve();
	try {
		expect(current.get).toHaveBeenCalledTimes(2);
		const signals = current.get.mock.calls.map(call => (call[1] as { signal: AbortSignal }).signal);
		current.stream.dispose(); expect(signals[0]!.aborted).toBe(true); expect(signals[1]!.aborted).toBe(false);
		one.resolve(run('run:one')); await first;
		current.tail.mockResolvedValueOnce({ ...page('1', { text: 'only-sibling-current' }), runId: 'run:two', events: [{ ...page('1', { text: 'only-sibling-current' }).events[0]!, runId: 'run:two' }] });
		two.resolve(run('run:two')); await second;
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'closed', projection: { pendingText: '' } });
		expect(sibling.getSnapshot().projection.pendingText).toBe('only-sibling-current'); expect(current.cancel).not.toHaveBeenCalled();
	} finally { one.resolve(run('run:one')); two.resolve(run('run:two')); await Promise.allSettled([first, second]); sibling.dispose(); current.events.dispose(); }
});

it('calls the bound BotClient with one pending page per Run, and page detach never cancels the Run', async () => {
	const current = fixture();
	const pending = deferred<EventPage>(); current.tail.mockReturnValue(pending.promise);
	try {
		const first = current.stream.refresh();
		expect(current.stream.refresh()).toBe(first);
		await Promise.resolve();
		expect(current.tail).toHaveBeenCalledTimes(1);
		expect(current.tail.mock.calls[0]![0]).toEqual({ profileId: 'profile:one', runId: 'run:one', afterSeq: '0', limit: 64, maxBytes: 65536, waitMillis: 0 });
		pending.resolve(page('1', { text: 'body' })); await first;
		expect(current.stream.getSnapshot().projection.pendingText).toBe('body');
		current.stream.dispose();
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'closed', projection: { pendingText: '', messages: [] } });
		expect(current.cancel).not.toHaveBeenCalled();
	} finally { pending.resolve(page('1')); current.events.dispose(); }
});

it.each(['detach', 'dispose', 'lease', 'reconnect'] as const)('discards late body after %s and clears local cache', async (action) => {
	const current = fixture();
	const pending = deferred<EventPage>(); current.tail.mockReturnValue(pending.promise);
	const reading = current.stream.refresh(); await Promise.resolve();
	const signal = (current.tail.mock.calls[0]![1] as { signal: AbortSignal }).signal;
	if (action === 'detach') current.stream.dispose();
	else if (action === 'dispose') current.events.dispose();
	else if (action === 'lease') current.events.leaseChanged();
	else current.events.setClient(undefined);
	expect(signal.aborted).toBe(true);
	pending.resolve(page('1', { text: 'late private body' })); await reading;
	expect(JSON.stringify(current.stream.getSnapshot())).not.toContain('late private');
	current.events.dispose();
});

it('clears cached body on permission failure, retains status and cannot resurrect it from an old connection', async () => {
	const current = fixture();
	try {
		await current.stream.refresh();
		current.tail.mockRejectedValue(denied());
		await current.stream.refresh();
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'paused', error: { kind: 'CAPABILITY_DENIED' }, projection: { access: 'denied', pendingText: '', status: 'running' } });
		const old = deferred<EventPage>(); current.tail.mockReturnValue(old.promise);
		const stale = current.stream.refresh(); await Promise.resolve();
		const fresh = vi.fn(async () => page('1', { text: 'newly authorized body' }));
		current.events.setClient({ ...current.bot, runs: { ...current.bot.runs, subscribe: fresh } });
		await current.stream.refresh();
		old.resolve(page('2', { text: 'stale private body' })); await stale;
		expect(current.stream.getSnapshot().projection.pendingText).toBe('newly authorized body');
	} finally { current.events.dispose(); }
});

it('installs an expired cursor snapshot and requests only events after its snapshotSeq', async () => {
	const current = fixture();
	try {
		const template = fixtures.valid.find((item) => item.name === 'cursor-expired')!.payload as unknown as { error: { data: { details: EventCursorRecovery } } };
		const recovery = structuredClone(template.error.data.details);
		recovery.runId = recovery.snapshot.run.id = 'run:one'; recovery.snapshotSeq = '9007199254740993';
		recovery.snapshot.events = []; recovery.snapshot.pendingText = 'restored';
		current.tail.mockRejectedValueOnce(new BotRpcError(-32000, { kind: 'CURSOR_EXPIRED', reason: 'EVENT_CURSOR_EXPIRED', retryable: false, correlationId: 'safe', details: recovery }));
		await current.stream.refresh();
		expect(current.stream.getSnapshot().projection).toMatchObject({ seq: '9007199254740993', pendingText: 'restored' });
		current.tail.mockResolvedValue(page('9007199254740994', { text: ' next' }));
		await current.stream.refresh();
		expect(current.tail.mock.calls[1]![0].afterSeq).toBe('9007199254740993');
		expect(current.stream.getSnapshot().projection.pendingText).toBe('restored next');
	} finally { current.events.dispose(); }
});

it('recovers a future cursor through zero and exposes a slow consumer failure for explicit retry', async () => {
	const current = fixture();
	try {
		await current.stream.refresh();
		current.tail.mockRejectedValueOnce(new BotRpcError(-32000, { kind: 'INVALID_ARGUMENT', reason: 'EVENT_CURSOR_AHEAD', retryable: false, correlationId: 'safe' }));
		await current.stream.refresh();
		expect(current.stream.getSnapshot().projection.seq).toBe('0');
		current.tail.mockRejectedValueOnce(new BotRpcError(-32000, { kind: 'STREAM_SLOW_CONSUMER', reason: 'EVENT_SLOW', retryable: true, correlationId: 'safe' }));
		await current.stream.refresh();
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'paused', projection: { pendingText: '' }, error: { kind: 'STREAM_SLOW_CONSUMER' } });
		current.tail.mockResolvedValue(page('1', { text: 'rebuilt' }));
		await current.stream.refresh();
		expect(current.tail.mock.calls.at(-1)![0].afterSeq).toBe('0');
		expect(current.stream.getSnapshot().projection.pendingText).toBe('rebuilt');
	} finally { current.events.dispose(); }
});

it('continues bounded polling after terminal and tears down every timer and listener on detach', async () => {
	const current = fixture(true);
	const listener = vi.fn(() => { throw new Error('view failed'); });
	current.stream.subscribe(listener);
	current.tail.mockResolvedValueOnce(page('1', { type: 'succeeded', status: 'succeeded' }));
	try {
		for (let step = 0; step < 2; step++) {
			const callback = [...current.callbacks][0]!; current.callbacks.delete(callback); callback();
			await current.stream.refresh();
			if (step === 0) current.tail.mockResolvedValue(page('2', { type: 'reconciled', effectId: 'effect:late' }));
		}
		expect(current.stream.getSnapshot().projection).toMatchObject({ seq: '2', status: 'succeeded', lastEffectId: 'effect:late' });
		expect(current.tail.mock.calls[1]![0].afterSeq).toBe('1');
		current.stream.dispose();
		expect(current.callbacks.size).toBe(0);
		const count = listener.mock.calls.length;
		current.events.leaseChanged();
		expect(listener).toHaveBeenCalledTimes(count);
		expect(current.cancel).not.toHaveBeenCalled();
	} finally { current.events.dispose(); }
});

it('immediately clears all cached Runs on actual BotClient close notification, including idle pages', async () => {
	const current = fixture();
	const other = current.events.attach('run:two');
	try {
		await current.stream.refresh();
		current.tail.mockResolvedValue({ ...page('1', { text: 'other private body' }), runId: 'run:two', events: [{ ...page('1').events[0]!, runId: 'run:two', text: 'other private body' }] });
		await other.refresh();
		for (const listener of [...current.closeListeners]) listener();
		expect(current.stream.getSnapshot().projection.pendingText).toBe('');
		expect(other.getSnapshot().projection.pendingText).toBe('');
		expect(current.closeListeners.size).toBe(0);
	} finally { current.events.dispose(); }
});

it('backfills a page hole from the last contiguous cursor and bounds caller-visible copies', async () => {
	const current = fixture();
	try {
		const third = page('3', { text: 'C' }).events[0]!;
		current.tail.mockResolvedValueOnce({ ...page('3'), events: [page('1', { text: 'A' }).events[0]!, third] });
		await current.stream.refresh();
		expect(current.stream.getSnapshot().projection).toMatchObject({ seq: '1', pendingText: 'A' });
		current.tail.mockResolvedValueOnce({ ...page('3'), events: [page('2', { text: 'B' }).events[0]!, third] });
		await current.stream.refresh();
		expect(current.tail.mock.calls[1]![0].afterSeq).toBe('1');
		const view = current.stream.getSnapshot();
		expect(current.stream.getSnapshot()).toBe(view);
		expect(() => { view.projection.pendingText = 'external mutation'; }).toThrow(TypeError);
		expect(current.stream.getSnapshot().projection.pendingText).toBe('ABC');
	} finally { current.events.dispose(); }
});

it('clears private ledger facts as well as streamed text and resets state when changing Profile', async () => {
	const current = fixture();
	try {
		await current.stream.refresh();
		current.tail.mockResolvedValueOnce(page('3', { type: 'reconciled', effectId: 'effect:one', status: 'committed', text: 'private ledger body' }));
		await current.stream.refresh();
		expect(current.stream.getSnapshot().projection.facts).toHaveLength(1);
		current.tail.mockRejectedValueOnce(denied()); await current.stream.refresh();
		expect(JSON.stringify(current.stream.getSnapshot())).not.toContain('private');
		expect(current.stream.getSnapshot().projection).toMatchObject({ lastEffectId: 'effect:one', status: 'running' });
		current.events.setClient({ ...current.bot, hello: { ...current.bot.hello, profile: { ...current.bot.hello.profile, profileId: 'profile:other' } } });
		expect(current.stream.getSnapshot().projection.status).toBeUndefined();
		expect(current.stream.getSnapshot().projection.lastEffectId).toBeUndefined();
	} finally { current.events.dispose(); }
});

function pageTooSmall() { return new BotRpcError(-32000, { kind: 'RESOURCE_LIMIT', reason: 'EVENT_PAGE_TOO_SMALL', retryable: false, correlationId: 'safe' }); }

it.each(['x'.repeat(65536), '\0'.repeat(65536), `${'"\\'.repeat(32768)}`])('retries an indivisible legal text event once with a bounded larger page', async (text) => {
	const current = fixture();
	try {
		await current.stream.refresh();
		const large = { ...page('4'), events: [page('3', { type: 'text.delta', text }).events[0]!, page('4', { type: 'succeeded', status: 'succeeded' }).events[0]!] };
		expect(new TextEncoder().encode(text)).toHaveLength(65536);
		expect(new TextEncoder().encode(JSON.stringify(large)).length).toBeGreaterThan(65536);
		current.tail.mockRejectedValueOnce(pageTooSmall()).mockResolvedValueOnce(large);
		await current.stream.refresh();
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'ready', projection: { seq: '4', status: 'succeeded', pendingText: `private text${text}` } });
		const calls = current.tail.mock.calls.slice(1);
		expect(calls.map(([query]) => ({ afterSeq: query.afterSeq, maxBytes: query.maxBytes }))).toEqual([
			{ afterSeq: '2', maxBytes: 65536 }, { afterSeq: '2', maxBytes: 524288 },
		]);
		expect(calls[0]![1]).toBe(calls[1]![1]);
		current.tail.mockResolvedValue({ ...large, events: [] });
		await current.stream.refresh();
		expect(current.tail.mock.calls.at(-1)![0]).toMatchObject({ afterSeq: '4', maxBytes: 524288 });
		expect(current.stream.getSnapshot().projection.pendingText).toBe(`private text${text}`);
	} finally { current.events.dispose(); }
});

it('pauses when the maximum page cannot fit, with no automatic loop and one bounded explicit retry', async () => {
	const current = fixture(true);
	try {
		current.tail.mockRejectedValue(pageTooSmall());
		await current.stream.refresh();
		expect(current.tail.mock.calls.map(([query]) => query.maxBytes)).toEqual([65536, 524288]);
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'paused', error: { kind: 'RESOURCE_LIMIT', reason: 'EVENT_PAGE_TOO_SMALL' } });
		expect(current.callbacks.size).toBe(0);
		await current.stream.refresh();
		expect(current.tail.mock.calls.map(([query]) => query.maxBytes)).toEqual([65536, 524288, 524288]);
		expect(current.callbacks.size).toBe(0);
	} finally { current.events.dispose(); }
});

it('does not grow a page for unrelated resource errors', async () => {
	const current = fixture();
	try {
		current.tail.mockRejectedValue(new BotRpcError(-32000, { kind: 'RESOURCE_LIMIT', reason: 'EVENT_WAITER_LIMIT', retryable: true, correlationId: 'safe' }));
		await current.stream.refresh();
		expect(current.tail).toHaveBeenCalledTimes(1);
		expect(current.tail.mock.calls[0]![0].maxBytes).toBe(65536);
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'paused', error: { reason: 'EVENT_WAITER_LIMIT' } });
	} finally { current.events.dispose(); }
});

it.each(['lease', 'client', 'profile', 'close', 'dispose', 'detach'] as const)('discards a large-page response after %s invalidates its generation', async (action) => {
	const current = fixture();
	const response = deferred<EventPage>();
	current.tail.mockRejectedValueOnce(pageTooSmall()).mockReturnValueOnce(response.promise);
	try {
		const reading = current.stream.refresh();
		await vi.waitFor(() => expect(current.tail).toHaveBeenCalledTimes(2));
		const signal = (current.tail.mock.calls[1]![1] as { signal: AbortSignal }).signal;
		if (action === 'lease') current.events.leaseChanged();
		else if (action === 'client') current.events.setClient(current.bot);
		else if (action === 'profile') current.events.setClient({ ...current.bot, hello: { ...current.bot.hello, profile: { ...current.bot.hello.profile, profileId: 'other' } } });
		else if (action === 'close') { for (const listener of [...current.closeListeners]) listener(); }
		else if (action === 'dispose') current.events.dispose();
		else current.stream.dispose();
		expect(signal.aborted).toBe(true);
		response.resolve(page('1', { text: 'late private large body' })); await reading;
		expect(JSON.stringify(current.stream.getSnapshot())).not.toContain('late private');
		if (action === 'lease' || action === 'client' || action === 'profile') {
			current.tail.mockResolvedValueOnce(page('1', { text: 'current authorized body' }));
			await current.stream.refresh();
			expect(current.tail.mock.calls.at(-1)![0].maxBytes).toBe(65536);
		}
	} finally { response.resolve(page('1')); current.events.dispose(); }
});

it('preserves permission failure cleanup on the larger-page request', async () => {
	const current = fixture();
	try {
		await current.stream.refresh();
		current.tail.mockRejectedValueOnce(pageTooSmall()).mockRejectedValueOnce(denied());
		await current.stream.refresh();
		expect(current.tail.mock.calls.slice(1).map(([query]) => query.afterSeq)).toEqual(['2', '2']);
		expect(current.stream.getSnapshot()).toMatchObject({ state: 'paused', projection: { access: 'denied', pendingText: '', messages: [], facts: [], status: 'running' } });
	} finally { current.events.dispose(); }
});

it('does not issue the larger-page request if a lease was lost before the first error settles', async () => {
	const current = fixture();
	try {
		current.tail.mockImplementationOnce(async () => { current.events.leaseChanged(); throw pageTooSmall(); });
		await current.stream.refresh();
		expect(current.tail).toHaveBeenCalledTimes(1);
		expect(current.stream.getSnapshot().projection.pendingText).toBe('');
	} finally { current.events.dispose(); }
});

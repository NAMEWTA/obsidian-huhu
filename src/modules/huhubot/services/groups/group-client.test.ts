import { expect, it } from 'vitest';
import type { Agent, BotMethodMap, Run, Session, VisibleMessage } from '../../api';
import { HapConnection, type HapTransport } from '../../core/protocol/connection';
import { encodeHapFrame, HapDecoder, type HapMessage } from '../../core/protocol/codec';
import { selectMention } from '../../core/mentions/mentions';
import { GroupClient } from './group-client';

class Peer implements HapTransport {
	data: (bytes: Uint8Array) => void = () => {};
	ended: (error: Error) => void = () => {};
	messages: HapMessage[] = [];
	onData(run: (bytes: Uint8Array) => void) { this.data = run; return () => { this.data = () => {}; }; }
	onClose(run: (error: Error) => void) { this.ended = run; return () => { this.ended = () => {}; }; }
	async send(bytes: Uint8Array) { for (const value of new HapDecoder().push(bytes)) this.messages.push(...(Array.isArray(value) ? value : [value])); }
	close() { this.ended(new Error('EOF')); }
	reply(id: string, value: object) { this.data(encodeHapFrame({ jsonrpc: '2.0', id, result: value as never })); }
	deny(id: string, reason: string, kind = 'CAPABILITY_DENIED') { this.data(encodeHapFrame({ jsonrpc: '2.0', id, error: { code: -32000, message: reason, data: { kind, reason, retryable: false, correlationId: 'safe' } } } as never)); }
}
const agents: Pick<Agent, 'id' | 'name' | 'enabled'>[] = [{ id: 'agent:a', name: 'A', enabled: true }, { id: 'agent:b', name: 'Same', enabled: true }, { id: 'agent:c', name: 'Same', enabled: true }];
const session: Session = { id: 'group:one', revision: '1', kind: 'group', title: 'group', archived: false, coordinatorId: 'agent:a', memberIds: agents.map(item => item.id),
	groupMembers: agents.map(item => ({ agentId: item.id, incarnation: '1', historyRevision: '1', historyScope: { kind: 'none' } })) };
const timers = { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
const meta = { profileId: 'profile:one', commandEpoch: '1', commandId: 'command:one', idempotencyKey: 'idem:one' };
const receipt = { commandId: meta.commandId, receiptId: 'receipt:one', revision: '2', runId: 'run:root', targetRunIds: ['run:b', 'run:c'], status: 'accepted' } satisfies BotMethodMap['runs.start']['result'];
async function ready(capabilities = ['runs.start', 'runs.get', 'runs.subscribe', 'sessions.get', 'sessions.history', 'sessions.updateMembers', 'sessions.setCoordinator']) {
	const peer = new Peer(), connection = new HapConnection(peer, timers), opening = connection.connect({ name: 'group-client', version: '1' });
	peer.reply('c:1', { protocolVersion: '0.1', buildVersion: 'dev', schemaVersion: 1, profile: { profileId: meta.profileId, commandEpoch: '1', revision: '1', createdAt: '2026-10-26T00:00:00Z' },
		capabilities, limits: { maxFrameBytes: 1048576, maxBatchItems: 8 } });
	const bot = await opening, groups = new GroupClient(bot, session, agents, timers, { poll: false });
	return { peer, bot, groups, dispose: async () => { groups.dispose(); bot.close(); await groups.drained(); } };
}
async function request(peer: Peer, method: string) { await expect.poll(() => peer.messages.filter(item => 'method' in item && item.method === method).at(-1)).toBeDefined(); return peer.messages.filter(item => 'method' in item && item.method === method).at(-1)!; }
function message(id: string, seq: string): VisibleMessage { return { id, seq, sessionId: session.id, role: 'assistant', text: id, sourceRefs: [], createdAt: '2026-10-26T00:00:00Z', runId: `run:${id}` }; }

it('submits all explicit stable IDs once through real HapConnection and preserves the same command/draft across busy retry', async () => {
	const f = await ready();
	try {
		let draft = selectMention({ text: '@b @c', mentions: [] }, 0, 2, agents[1]!); draft = selectMention(draft, 6, 8, agents[2]!);
		f.groups.setDraft(draft);
		const sending = f.groups.send(meta, { sourceRefs: [] }); const first = await request(f.peer, 'runs.start');
		expect(first).toMatchObject({ params: { intent: '@Same @Same', targetAgentIds: ['agent:b', 'agent:c'], expectedRevision: '1', sessionId: session.id } });
		f.peer.deny(first.id!, 'SESSION_BUSY', 'CONFLICT'); await expect(sending).rejects.toThrow('SESSION_BUSY');
		expect(f.groups.getSnapshot().draft).toEqual(draft);
		const retry = f.groups.retrySend(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'runs.start').length).toBe(2);
		const second = f.peer.messages.at(-1)!; expect((second as { params: unknown }).params).toEqual((first as { params: unknown }).params);
		f.peer.reply(second.id!, receipt); await expect(retry).resolves.toEqual(receipt);
		expect(f.groups.getSnapshot()).toMatchObject({ draft: { text: '', mentions: [] }, send: { state: 'accepted', receipt } });
	} finally { await f.dispose(); }
});

it('rejects an invalid member batch without fallback and preserves typed names as ordinary intent', async () => {
	const f = await ready();
	try {
		const invalid = selectMention({ text: '@outside', mentions: [] }, 0, 8, { id: 'agent:outside', name: 'Same' }); f.groups.setDraft(invalid);
		await expect(f.groups.send(meta, { sourceRefs: [] })).rejects.toThrow('MENTION_UNKNOWN_AGENT'); expect(f.peer.messages).toHaveLength(1);
		expect(f.groups.getSnapshot().draft).toEqual(invalid);
		f.groups.setDraft({ text: 'Same and @Same are ordinary text', mentions: [] });
		const sending = f.groups.send(meta, { sourceRefs: [] }), call = await request(f.peer, 'runs.start');
		expect(call).toMatchObject({ params: { targetAgentIds: [] } }); f.peer.reply(call.id!, { ...receipt, targetRunIds: ['run:a'] }); await sending;
	} finally { await f.dispose(); }
});

it('keeps edits made while the original intent is in flight and never replays after client close', async () => {
	const f = await ready();
	try {
		f.groups.setDraft({ text: 'first', mentions: [] }); const pending = f.groups.send(meta, { sourceRefs: [] }), call = await request(f.peer, 'runs.start');
		f.groups.setDraft({ text: 'new unsent draft', mentions: [] }); f.peer.reply(call.id!, receipt); await pending;
		expect(f.groups.getSnapshot().draft.text).toBe('new unsent draft'); f.bot.close();
		await expect(f.groups.retrySend()).rejects.toThrow('GROUP_CONNECTION_UNAVAILABLE'); expect(f.peer.messages).toHaveLength(2);
	} finally { await f.dispose(); }
});

it('orders/deduplicates public history by seq and uses opaque cursors, retaining published messages on member removal', async () => {
	const f = await ready();
	try {
		const initial = f.groups.refreshHistory(), read = await request(f.peer, 'sessions.history');
		f.peer.reply(read.id!, { items: [message('a-later', '3'), message('z-earlier', '2')], nextCursor: 'opaque:not-a-message-id' }); await initial;
		const more = f.groups.loadMoreHistory(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'sessions.history').length).toBe(2);
		const page = f.peer.messages.at(-1)!; expect(page).toMatchObject({ params: { cursor: 'opaque:not-a-message-id' } });
		f.peer.reply(page.id!, { items: [message('z-earlier', '2'), message('first', '1')] }); await more;
		expect(f.groups.getSnapshot().history.transcript.messages.map(item => item.seq)).toEqual(['1', '2', '3']);
		const removing = f.groups.updateMembers({ ...meta, memberIds: ['agent:a', 'agent:c'], historyScope: { kind: 'none' } }); const mutation = await request(f.peer, 'sessions.updateMembers');
		expect(mutation).toMatchObject({ params: { expectedRevision: '1', historyScope: { kind: 'none' } } });
		f.peer.reply(mutation.id!, { ...session, revision: '2', memberIds: ['agent:a', 'agent:c'], groupMembers: session.groupMembers!.filter(item => item.agentId !== 'agent:b') }); await removing;
		expect(f.groups.getSnapshot().history.transcript.messages).toHaveLength(3);
		f.groups.permissionsChanged(); expect(f.groups.getSnapshot().history.transcript.messages).toHaveLength(0);
	} finally { await f.dispose(); }
});

it('drops an old-generation history page on authorization change and refreshes after denial without cached private text', async () => {
	const f = await ready();
	try {
		const reading = f.groups.refreshHistory(), call = await request(f.peer, 'sessions.history'); f.groups.permissionsChanged(); await reading;
		f.peer.reply(call.id!, { items: [{ ...message('late-private', '1'), text: 'stale-body' }] });
		expect(f.groups.getSnapshot().history.transcript.messages).toHaveLength(0);
		const fresh = f.groups.refreshHistory(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'sessions.history').length).toBe(2);
		f.peer.deny(f.peer.messages.at(-1)!.id!, 'GROUP_HISTORY_DENIED'); await fresh;
		expect(f.groups.getSnapshot().history).toMatchObject({ state: 'paused', error: { kind: 'CAPABILITY_DENIED' }, transcript: { messages: [] } });
	} finally { await f.dispose(); }
});

it('clears all group Run caches on membership change and reanchors a valid sibling without canceling it', async () => {
	const f = await ready();
	const run = (agentId: string): Run => ({ id: `run:${agentId}`, sessionId: session.id, agentId, status: 'running', revision: '1', personaRevision: '1', modelBindingRevision: '1',
		role: 'execution', group: { sessionId: session.id, members: [{ agentId, incarnation: '1', historyRevision: '1' }] } });
	const b = f.groups.watchRun(run('agent:b')), c = f.groups.watchRun(run('agent:c'));
	const answer = (id: string, runId: string, body: string) => f.peer.reply(id, { runId, subscriptionId: `subscription:${runId}`, events: [{ runId, seq: '1', type: 'delta', text: body, createdAt: '2026-10-26T00:00:00Z' }], nextSeq: '1', headSeq: '1', hasMore: false });
	try {
		const readingB = b.refresh(), callB = await request(f.peer, 'runs.subscribe'); answer(callB.id!, 'run:agent:b', 'unpublished-B'); await readingB;
		const readingC = c.refresh(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'runs.subscribe').length).toBe(2);
		answer(f.peer.messages.at(-1)!.id!, 'run:agent:c', 'unpublished-C'); await readingC;
		const removing = f.groups.updateMembers({ ...meta, memberIds: ['agent:a', 'agent:c'], historyScope: { kind: 'none' } }), call = await request(f.peer, 'sessions.updateMembers');
		f.peer.reply(call.id!, { ...session, revision: '2', memberIds: ['agent:a', 'agent:c'], groupMembers: session.groupMembers!.filter(item => item.agentId !== 'agent:b') }); await removing;
		expect(b.getSnapshot().projection.pendingText).toBe(''); expect(c.getSnapshot()).toMatchObject({ projection: { pendingText: '', access: 'unknown' } });
		const rebuilding = c.refresh(), anchor = await request(f.peer, 'runs.get'); f.peer.reply(anchor.id!, run('agent:c'));
		await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'runs.subscribe').length).toBe(3);
		answer(f.peer.messages.at(-1)!.id!, 'run:agent:c', 'revalidated-C'); await rebuilding;
		expect(c.getSnapshot().projection.pendingText).toBe('revalidated-C');
		expect(f.peer.messages.filter(item => 'method' in item && item.method === 'runs.cancel')).toHaveLength(0);
		f.groups.permissionsChanged(); expect(c.getSnapshot().projection.pendingText).toBe('');
	} finally { b.dispose(); c.dispose(); await f.dispose(); }
});

it('preserves source attachment metadata in published user history and clears it on connection/permission loss', async () => {
	const f = await ready();
	try {
		const source = { kind: 'note' as const, resourceId: 'source:one', scopeResourceIds: [], revision: '1', hash: `sha256:${'a'.repeat(64)}`, workspaceId: 'workspace:one',
			originClientId: 'client:one', originViewId: 'view:original', hostConnectionId: 'host:one', hostLeaseId: 'lease:one', hostLeaseEpoch: '1' };
		const user = { ...message('user-input', '1'), role: 'user' as const, text: 'user original intent', sourceRefs: [], attachments: { sourceRefs: [source], sourceScopes: [] } };
		const reading = f.groups.refreshHistory(), call = await request(f.peer, 'sessions.history'); f.peer.reply(call.id!, { items: [user] }); await reading;
		expect(f.groups.getSnapshot().history.transcript.messages[0]!.attachments?.sourceRefs[0]).toEqual(source);
		f.bot.close(); expect(f.groups.getSnapshot().history.transcript.messages).toHaveLength(0);
	} finally { await f.dispose(); }
});

it('uses current coordinator CAS and surfaces busy/conflict without altering the user draft', async () => {
	const f = await ready();
	try {
		const draft = selectMention({ text: '@b', mentions: [] }, 0, 2, agents[1]!); f.groups.setDraft(draft);
		const changing = f.groups.setCoordinator({ ...meta, coordinatorId: 'agent:c' }), call = await request(f.peer, 'sessions.setCoordinator');
		expect(call).toMatchObject({ params: { expectedRevision: '1', coordinatorId: 'agent:c' } });
		f.peer.deny(call.id!, 'SESSION_BUSY', 'CONFLICT'); await expect(changing).rejects.toThrow('SESSION_BUSY');
		expect(f.groups.getSnapshot().draft).toEqual(draft); expect(f.groups.getSnapshot().session?.coordinatorId).toBe('agent:a');
	} finally { await f.dispose(); }
});

it('keeps a bounded history window and resumes from the same opaque cursor only after an explicit window reset', async () => {
	const f = await ready();
	try {
		const first = f.groups.refreshHistory(), call = await request(f.peer, 'sessions.history');
		f.peer.reply(call.id!, { items: [{ ...message('one', '1'), text: 'x'.repeat(524_288) }], nextCursor: 'opaque:page-two' }); await first;
		const more = f.groups.loadMoreHistory(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'sessions.history').length).toBe(2);
		f.peer.reply(f.peer.messages.at(-1)!.id!, { items: [{ ...message('two', '2'), text: 'y'.repeat(524_288) }] }); await more;
		expect(f.groups.getSnapshot().history).toMatchObject({ state: 'paused', nextCursor: 'opaque:page-two', error: { kind: 'RESOURCE_LIMIT', reason: 'GROUP_HISTORY_WINDOW_LIMIT' } });
		expect(f.groups.getSnapshot().history.transcript.messages).toHaveLength(1);
		f.groups.resetHistoryWindow(f.groups.getSnapshot().history.nextCursor);
		const next = f.groups.loadMoreHistory(); await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'sessions.history').length).toBe(3);
		expect(f.peer.messages.at(-1)).toMatchObject({ params: { cursor: 'opaque:page-two' } });
		f.peer.reply(f.peer.messages.at(-1)!.id!, { items: [{ ...message('two', '2'), text: 'y'.repeat(524_288) }] }); await next;
		expect(f.groups.getSnapshot().history.transcript.messages.map(item => item.id)).toEqual(['two']);
	} finally { await f.dispose(); }
});

it('does not advertise or call predeclared group operations that the actual Runner has not enabled', async () => {
	const f = await ready([]);
	try {
		f.groups.setDraft({ text: 'keep this', mentions: [] });
		await expect(f.groups.send(meta, { sourceRefs: [] })).rejects.toThrow('GROUP_METHOD_UNAVAILABLE');
		expect(f.groups.getSnapshot()).toMatchObject({ draft: { text: 'keep this' }, send: { state: 'error', error: { kind: 'CAPABILITY_DENIED', reason: 'GROUP_METHOD_UNAVAILABLE' } } });
		expect(f.peer.messages).toHaveLength(1);
	} finally { await f.dispose(); }
});

it('uses the sole strict command schema for runtime caller input and preserves invalid drafts without sending', async () => {
	const f = await ready();
	try {
		const draft = selectMention({ text: '@b', mentions: [] }, 0, 2, agents[1]!); f.groups.setDraft(draft);
		await expect(f.groups.send(meta, { sourceRefs: [], principal: 'forged' } as never)).rejects.toThrow('GROUP_COMMAND_INVALID');
		expect(f.groups.getSnapshot().draft).toEqual(draft); expect(f.peer.messages).toHaveLength(1);
	} finally { await f.dispose(); }
});

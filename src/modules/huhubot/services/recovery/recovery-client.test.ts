import { expect, it } from 'vitest';
import type { BotErrorData, BotMethodMap, RecoveryStatus } from '../../api';
import { HapConnection, type HapTransport } from '../../core/protocol/connection';
import { encodeHapFrame, HapDecoder, type HapMessage } from '../../core/protocol/codec';
import { EventClient } from '../events/event-client';
import { RecoveryClient } from './recovery-client';

class Timers {
	private now = 0;
	readonly active = new Map<() => void, number>();
	after(ms: number, run: () => void) { const wrapped = () => { this.active.delete(wrapped); run(); }; this.active.set(wrapped, this.now + ms); return () => { this.active.delete(wrapped); }; }
	advance(ms: number) { this.now += ms; for (const [run, when] of [...this.active]) if (when <= this.now) run(); }
}
class Peer implements HapTransport {
	data: (bytes: Uint8Array) => void = () => {};
	ended: (error: Error) => void = () => {};
	messages: HapMessage[] = [];
	onData(run: (bytes: Uint8Array) => void) { this.data = run; return () => { this.data = () => {}; }; }
	onClose(run: (error: Error) => void) { this.ended = run; return () => { this.ended = () => {}; }; }
	async send(bytes: Uint8Array) { for (const value of new HapDecoder().push(bytes)) this.messages.push(...(Array.isArray(value) ? value : [value])); }
	close() { this.ended(new Error('EOF')); }
	reply(id: string, result: object) { this.data(encodeHapFrame({ jsonrpc: '2.0', id, result: result as never })); }
	deny(id: string, reason: string, kind: BotErrorData['kind'] = 'RECOVERY_BLOCKED') { this.data(encodeHapFrame({ jsonrpc: '2.0', id, error: { code: -32000, message: reason, data: { kind, reason, retryable: false, correlationId: 'safe' } } })); }
}
const command: BotMethodMap['runs.resume']['params'] = { profileId: 'profile:one', commandEpoch: '1', commandId: 'command:one', idempotencyKey: 'key:one', id: 'run:one', expectedRevision: '4', recoveryGeneration: '2' };
const status: RecoveryStatus = { runId: 'run:one', rootRunId: 'run:root', revision: '4', state: 'ready', generation: '2', treeRevision: `sha256:${'a'.repeat(64)}`, affectedRunIds: ['run:one', 'run:other'] };
async function ready(capabilities = ['runs.recovery', 'runs.resume', 'runs.get', 'runs.subscribe'], profileId = 'profile:one', commandEpoch = '1') {
	const peer = new Peer(), timers = new Timers(), connection = new HapConnection(peer, timers), opening = connection.connect({ name: 'recovery-client', version: '1' });
	peer.reply('c:1', { protocolVersion: '0.1', buildVersion: 'dev', schemaVersion: 1, profile: { profileId, commandEpoch, revision: '1', createdAt: '2026-10-26T00:00:00Z' }, capabilities, limits: { maxFrameBytes: 1048576, maxBatchItems: 8 } });
	const bot = await opening, events = new EventClient(bot, timers, { poll: false }), recovery = new RecoveryClient(bot, 'run:one', events);
	return { peer, timers, bot, events, recovery, dispose: async () => { recovery.dispose(); events.dispose(); bot.close(); await recovery.drained(); expect(timers.active.size).toBe(0); } };
}
async function request(peer: Peer, method: string) { await expect.poll(() => peer.messages.filter(item => 'method' in item && item.method === method).at(-1)).toBeDefined(); return peer.messages.filter(item => 'method' in item && item.method === method).at(-1)!; }

it('requires actual recovery capabilities and disposes only its local consumer without canceling or closing the client', async () => {
	const f = await ready([]);
	try {
		await expect(f.recovery.inspect()).rejects.toThrow('RECOVERY_METHOD_UNAVAILABLE');
		await expect(f.recovery.resume(command)).rejects.toThrow('RECOVERY_METHOD_UNAVAILABLE');
		expect(f.peer.messages).toHaveLength(1); f.recovery.dispose(); expect(f.bot.state).toBe('ready');
	} finally { await f.dispose(); }
});

it('keeps the full server qualification and coalesces one explicit resume action with its original CAS and identity', async () => {
	const f = await ready();
	const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
	try {
		const reading = f.recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status);
		await expect(reading).resolves.toEqual(status);
		expect(f.recovery.getSnapshot().recovery?.affectedRunIds).toEqual(['run:one', 'run:other']);
		expect(() => { f.recovery.getSnapshot().recovery!.affectedRunIds.pop(); }).toThrow(TypeError);
		const first = f.recovery.resume(command), second = f.recovery.resume({ ...command }); expect(second).toBe(first);
		const call = await request(f.peer, 'runs.resume'); expect(call).toMatchObject({ params: command }); f.peer.reply(call.id!, receipt);
		await expect(first).resolves.toEqual(receipt);
		expect(f.recovery.getSnapshot().command).toMatchObject({ state: 'accepted', params: command, receipt });
		expect(f.peer.messages.filter(item => 'method' in item && item.method === 'runs.resume')).toHaveLength(1);
	} finally { await f.dispose(); }
});

it('preserves an uncertain action and retries only its exact original command even after a fresh qualification read', async () => {
	const f = await ready();
	try {
		const reading = f.recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		const first = f.recovery.resume(command, { timeoutMs: 20 }); await request(f.peer, 'runs.resume');
		const failed = expect(first).rejects.toThrow('REQUEST_TIMEOUT'); f.timers.advance(21); await failed;
		expect(f.recovery.getSnapshot().command).toMatchObject({ state: 'uncertain', params: command });
		const refreshing = f.recovery.inspect(); await Promise.resolve(); const refreshed = f.peer.messages.at(-1)!;
		f.peer.reply(refreshed.id!, { ...status, revision: '5', generation: '3' }); await refreshing;
		const replacement = f.recovery.resume({ ...command, commandId: 'command:replacement', idempotencyKey: 'key:replacement', expectedRevision: '5', recoveryGeneration: '3' });
		await Promise.resolve();
		const leaked = f.peer.messages.filter(item => 'method' in item && item.method === 'runs.resume').at(1);
		if (leaked) f.peer.deny(leaked.id!, 'REPLACEMENT_WAS_FORWARDED');
		await expect(replacement).rejects.toThrow('RECOVERY_OUTCOME_UNKNOWN');
		const retry = f.recovery.retry(); await Promise.resolve(); const retried = f.peer.messages.at(-1)!;
		expect(retried).toMatchObject({ method: 'runs.resume', params: command });
		const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
		f.peer.reply(retried.id!, receipt); await expect(retry).resolves.toEqual(receipt);
		expect(f.recovery.getSnapshot().command.state).toBe('accepted');
	} finally { await f.dispose(); }
});

it('keeps only the latest qualification when concurrent inspect replies arrive in reverse order', async () => {
	const f = await ready();
	try {
		const first = f.recovery.inspect(), firstOutcome = first.then(() => 'resolved', () => 'rejected'), old = await request(f.peer, 'runs.recovery');
		const second = f.recovery.inspect(); await Promise.resolve(); const fresh = f.peer.messages.at(-1)!;
		f.peer.reply(fresh.id!, { ...status, revision: '5', generation: '3' }); await second;
		f.peer.reply(old.id!, status); expect(await firstOutcome).toBe('rejected');
		expect(f.recovery.getSnapshot().recovery).toMatchObject({ revision: '5', generation: '3' });
	} finally { await f.dispose(); }
});

it('disposes an active inspection without closing the client or accepting its late qualification', async () => {
	const f = await ready();
	try {
		const reading = f.recovery.inspect(), outcome = reading.then(() => 'resolved', () => 'rejected'), call = await request(f.peer, 'runs.recovery');
		f.recovery.dispose(); f.peer.reply(call.id!, status); expect(await outcome).toBe('rejected');
		expect(f.recovery.getSnapshot()).toMatchObject({ readState: 'closed', recovery: undefined }); expect(f.bot.state).toBe('ready');
	} finally { await f.dispose(); }
});

it('keeps durable acceptance distinct from a failed projection reanchor and preserves the original rejection on denied recovery', async () => {
	const f = await ready(), anchored: string[] = [];
	const recovery = new RecoveryClient(f.bot, 'run:one', { reanchor: async id => { anchored.push(id); throw new Error('projection failed'); } });
	const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
	try {
		const reading = recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		const accepted = recovery.resume(command), call = await request(f.peer, 'runs.resume'); f.peer.reply(call.id!, receipt);
		await expect(accepted).resolves.toEqual(receipt);
		expect(recovery.getSnapshot()).toMatchObject({ command: { state: 'accepted', receipt }, error: { kind: 'HOST_UNAVAILABLE' } });
		const replay = recovery.retry(); await Promise.resolve(); const retry = f.peer.messages.at(-1)!; f.peer.deny(retry.id!, 'RECOVERY_ACCESS_REVOKED', 'CAPABILITY_DENIED');
		await expect(replay).rejects.toThrow('RECOVERY_ACCESS_REVOKED');
		expect(recovery.getSnapshot().command).toMatchObject({ state: 'rejected', error: { kind: 'CAPABILITY_DENIED', reason: 'RECOVERY_ACCESS_REVOKED' } });
		expect(anchored).toEqual(['run:one', 'run:one']);
	} finally { recovery.dispose(); await recovery.drained(); await f.dispose(); }
});

it('reconnects the same controller without replaying or replacing an uncertain command and rejects another Profile or epoch', async () => {
	const f = await ready(), same = await ready(), other = await ready(undefined, 'profile:other'), epoch = await ready(undefined, 'profile:one', '2');
	try {
		const reading = f.recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		const first = f.recovery.resume(command), outcome = first.then(() => 'resolved', () => 'rejected'), sent = await request(f.peer, 'runs.resume');
		f.bot.close(); expect(await outcome).toBe('rejected');
		expect(f.recovery.getSnapshot().command).toMatchObject({ state: 'uncertain', params: command });
		f.recovery.setClient(other.bot); await expect(f.recovery.retry()).rejects.toThrow('RECOVERY_PROFILE_CHANGED'); expect(other.peer.messages).toHaveLength(1);
		f.recovery.setClient(epoch.bot); const changed = f.recovery.inspect(); await Promise.resolve();
		const leaked = epoch.peer.messages.find(item => 'method' in item && item.method === 'runs.recovery'); if (leaked) epoch.peer.deny(leaked.id!, 'EPOCH_QUERY_WAS_FORWARDED');
		await expect(changed).rejects.toThrow('RECOVERY_COMMAND_EPOCH_CHANGED');
		await expect(f.recovery.retry()).rejects.toThrow('RECOVERY_COMMAND_EPOCH_CHANGED'); expect(epoch.peer.messages).toHaveLength(1);
		f.events.setClient(same.bot); f.recovery.setClient(same.bot); await Promise.resolve(); expect(same.peer.messages).toHaveLength(1);
		const retry = f.recovery.retry(), joined = f.recovery.retry(); expect(joined).toBe(retry);
		const call = await request(same.peer, 'runs.resume'); expect(call).toMatchObject({ params: command });
		const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
		f.peer.reply(sent.id!, receipt); same.peer.reply(call.id!, receipt); await expect(retry).resolves.toEqual(receipt);
		expect(f.recovery.getSnapshot().command).toMatchObject({ state: 'accepted', params: command, receipt });
	} finally { await f.dispose(); await same.dispose(); await other.dispose(); await epoch.dispose(); }
});

it('does not revive a disposed consumer when its already accepted receipt is still reanchoring', async () => {
	const f = await ready(); let finish!: () => void, started = false;
	const recovery = new RecoveryClient(f.bot, 'run:one', { reanchor: () => { started = true; return new Promise<void>(resolve => { finish = resolve; }); } });
	try {
		const reading = recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		const accepting = recovery.resume(command), call = await request(f.peer, 'runs.resume');
		const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
		f.peer.reply(call.id!, receipt); await expect.poll(() => started).toBe(true);
		recovery.dispose(); finish(); await expect(accepting).resolves.toEqual(receipt);
		expect(recovery.getSnapshot()).toMatchObject({ readState: 'closed', command: { state: 'accepted', receipt } }); expect(f.bot.state).toBe('ready');
	} finally { finish?.(); recovery.dispose(); await recovery.drained(); await f.dispose(); }
});

it('requires a ready qualification and exact canonical CAS before sending, including while another action is pending', async () => {
	const f = await ready();
	try {
		await expect(f.recovery.resume(command)).rejects.toThrow('RECOVERY_NOT_READY');
		const reading = f.recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		for (const [value, reason] of [
			[{ ...command, expectedRevision: undefined }, 'RECOVERY_COMMAND_INVALID'],
			[{ ...command, recoveryGeneration: '02' }, 'RECOVERY_COMMAND_INVALID'],
			[{ ...command, expectedRevision: '3' }, 'RECOVERY_QUALIFICATION_STALE'],
			[{ ...command, recoveryGeneration: '1' }, 'RECOVERY_QUALIFICATION_STALE'],
			[{ ...command, id: 'run:other' }, 'RECOVERY_RUN_MISMATCH'],
			[{ ...command, profileId: 'profile:other' }, 'RECOVERY_PROFILE_CHANGED'],
			[{ ...command, commandEpoch: '2' }, 'RECOVERY_COMMAND_EPOCH_CHANGED'],
		] as const) await expect(f.recovery.resume(value as typeof command)).rejects.toThrow(reason);
		expect(f.peer.messages.filter(item => 'method' in item && item.method === 'runs.resume')).toHaveLength(0);
		const sending = f.recovery.resume(command), call = await request(f.peer, 'runs.resume');
		await expect(f.recovery.resume({ ...command, commandId: 'command:second', idempotencyKey: 'key:second' })).rejects.toThrow('RECOVERY_COMMAND_PENDING');
		f.peer.deny(call.id!, 'RECOVERY_GENERATION_CHANGED'); await expect(sending).rejects.toThrow('RECOVERY_GENERATION_CHANGED');
		expect(f.recovery.getSnapshot()).toMatchObject({ recovery: undefined, command: { state: 'rejected', params: command } });
		expect(f.peer.messages.filter(item => 'method' in item && (item.method === 'runs.start' || item.method === 'runs.cancel'))).toHaveLength(0);
	} finally { await f.dispose(); }
});

it('clears the target projection on blocked or denied qualification without discarding the server affected set or resuming work', async () => {
	const f = await ready(), stream = f.events.attach('run:one');
	try {
		const refreshing = stream.refresh(), tail = await request(f.peer, 'runs.subscribe');
		f.peer.reply(tail.id!, { runId: 'run:one', subscriptionId: 'subscription:one', events: [{ runId: 'run:one', seq: '1', type: 'delta', text: 'previous-private-body', createdAt: '2026-10-26T00:00:00Z' }], nextSeq: '1', headSeq: '1', hasMore: false }); await refreshing;
		const reading = f.recovery.inspect(), query = await request(f.peer, 'runs.recovery');
		const blocked = { ...status, state: 'blocked', reason: 'RECOVERY_SOURCE_REVOKED' } satisfies RecoveryStatus; f.peer.reply(query.id!, blocked);
		const current = await request(f.peer, 'runs.get'); expect(stream.getSnapshot().projection.pendingText).toBe('');
		f.peer.deny(current.id!, 'READ_GRANT_REVOKED', 'CAPABILITY_DENIED'); await expect(reading).resolves.toEqual(blocked);
		expect(stream.getSnapshot()).toMatchObject({ state: 'paused', projection: { access: 'denied', pendingText: '' } });
		expect(f.recovery.getSnapshot().recovery?.affectedRunIds).toEqual(['run:one', 'run:other']);
		await expect(f.recovery.resume(command)).rejects.toThrow('RECOVERY_NOT_READY');
		const inspecting = f.recovery.inspect(), outcome = inspecting.then(() => '', error => (error as Error).message); await Promise.resolve();
		const deniedQuery = f.peer.messages.at(-1)!; f.peer.deny(deniedQuery.id!, 'RECOVERY_OWNER_REVOKED', 'CAPABILITY_DENIED');
		await expect.poll(() => f.peer.messages.filter(item => 'method' in item && item.method === 'runs.get').length).toBe(2);
		const deniedAnchor = f.peer.messages.at(-1)!; f.peer.deny(deniedAnchor.id!, 'READ_GRANT_REVOKED', 'CAPABILITY_DENIED');
		expect(await outcome).toContain('RECOVERY_OWNER_REVOKED'); expect(stream.getSnapshot().projection.pendingText).toBe('');
		expect(f.peer.messages.some(item => 'method' in item && item.method === 'runs.resume')).toBe(false);
	} finally { stream.dispose(); await f.dispose(); }
});

it('retains a receipt received before caller abort and starts no reanchor when an acceptance listener disposes the consumer', async () => {
	const f = await ready(), caller = new AbortController(), anchored: string[] = [];
	const recovery = new RecoveryClient(f.bot, 'run:one', { reanchor: async id => { anchored.push(id); } });
	recovery.subscribe(() => { if (recovery.getSnapshot().command.state === 'accepted') recovery.dispose(); });
	try {
		const reading = recovery.inspect(), query = await request(f.peer, 'runs.recovery'); f.peer.reply(query.id!, status); await reading;
		const accepting = recovery.resume(command, { signal: caller.signal }), call = await request(f.peer, 'runs.resume');
		const receipt = { runId: command.id, status: 'accepted', commandId: command.commandId, receiptId: 'receipt:one', revision: '5' } satisfies BotMethodMap['runs.resume']['result'];
		f.peer.reply(call.id!, receipt); caller.abort(); await expect(accepting).resolves.toEqual(receipt);
		expect(recovery.getSnapshot()).toMatchObject({ readState: 'closed', command: { state: 'accepted', receipt } }); expect(anchored).toEqual([]);
	} finally { recovery.dispose(); await recovery.drained(); await f.dispose(); }
});

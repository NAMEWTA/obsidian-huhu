import { expect, test, vi } from 'vitest';
import { type ControlRequest } from '../../../../shared/native/control-wire';
import type { InboxMessage, InboxRecipient } from '../../core/inbox/model';
import { ControlPaging } from './paging';
import { ControlInboxHandler } from './inbox';
import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import { InboxService } from '../inbox/service';
import { captureControlExecutionContext } from './terminal-coordination';

const scope = { vaultId: 'v', deviceId: 'd', instanceId: 'i', rootPath: '/', physicalRoot: { canonicalPath: '/', dev: '1', ino: '2' } };
const recipient: InboxRecipient = { spaceId: 'space-a', sessionId: 'session-a' };
const alternateRecipient: InboxRecipient = { spaceId: 'space-b', sessionId: 'session-b' };
function fixture() {
	const records: any = {
		vaultId: 'v', deviceId: 'd', rootPath: '/', spaces: {
			[recipient.spaceId]: { id: recipient.spaceId, name: 'A', archived: false, directory: { kind: 'vault', relativePath: '' } },
			[alternateRecipient.spaceId]: { id: alternateRecipient.spaceId, name: 'B', archived: false, directory: { kind: 'vault', relativePath: '' } },
		},
		sessions: {
			[recipient.sessionId]: { id: recipient.sessionId, spaceId: recipient.spaceId, archived: false, kind: 'shell', cwd: '/same-cwd' },
			[alternateRecipient.sessionId]: { id: alternateRecipient.sessionId, spaceId: alternateRecipient.spaceId, archived: false, kind: 'shell', cwd: '/same-cwd' },
		},
		inbox: { version: 1, messages: [], nextSequence: 1 },
	};
	const state = { records };
	const spaces = { store: { getState: () => state } } as any;
	const service: any = {
		freshPrimary: vi.fn(async () => ({ freshness: 'fresh', records })),
		send: vi.fn(async (input: any) => {
			const message: InboxMessage = { ...input, references: input.references ?? [], sendSequence: records.inbox.nextSequence++, createdAt: 1 };
			records.inbox.messages.push(message);
			return { value: message, effect: 'completed', status: 'saved' };
		}),
		read: vi.fn(async (id: string, target?: InboxRecipient) => {
			const message = records.inbox.messages.find((row: InboxMessage) => row.messageId === id);
			if (!message) throw Object.assign(new Error('missing'), { code: 'TARGET_NOT_FOUND' });
			if (target && (target.spaceId !== message.recipient.spaceId || target.sessionId !== message.recipient.sessionId)) throw Object.assign(new Error('scope'), { code: 'SCOPE_MISMATCH' });
			return message;
		}),
		ack: vi.fn(async (id: string) => {
			const message = records.inbox.messages.find((row: InboxMessage) => row.messageId === id)!;
			if (message.ack) return { value: message, effect: 'none', status: 'already-acked' };
			message.ack = { ackedAt: 2 };
			return { value: message, effect: 'completed', status: 'saved' };
		}),
	};
	return { records, spaces, service, handler: new ControlInboxHandler(service, spaces, new ControlPaging()) };
}
const request = (operation: ControlRequest['operation'], target: ControlRequest['target'] = {}, params: ControlRequest['params'] = {}): ControlRequest => ({ protocolVersion: 1, requestId: 'r', operation, target, params });

test('session-only send/list resolve the persisted Space, while an old request without Session stays required', async () => {
	const f = fixture();
	const command = f.handler.capture(request('message.send', { sessionId: alternateRecipient.sessionId }, { message: 'm', text: 'body' }), {} as any);
	await command.preflight(scope);
	await expect(command.run(() => {})).resolves.toMatchObject({ data: { messageId: 'm', fact: 'record-saved', recipient: alternateRecipient } });
	expect(command.target).toMatchObject(alternateRecipient);
	const list = f.handler.capture(request('inbox.list', { sessionId: alternateRecipient.sessionId }, { limit: 1 }), {} as any);
	await list.preflight(scope);
	expect(await list.run(() => {})).toMatchObject({ data: { recipient: alternateRecipient, items: [{ messageId: 'm' }] } });
	expect(() => f.handler.capture(request('message.send', {}, { message: 'missing', text: 'body' }), {} as any)).toThrowError(expect.objectContaining({ code: 'TARGET_REQUIRED' }));
});

test('explicit Space mismatch, missing Session, and read target mismatch are stable errors', async () => {
	const f = fixture();
	expect(() => f.handler.capture(request('message.send', { spaceId: recipient.spaceId, sessionId: alternateRecipient.sessionId }, { message: 'm', text: 'body' }), {} as any)).toThrowError(expect.objectContaining({ code: 'SCOPE_MISMATCH' }));
	expect(() => f.handler.capture(request('inbox.list', { spaceId: recipient.spaceId }, {}), {} as any)).toThrowError(expect.objectContaining({ code: 'TARGET_REQUIRED' }));
	const send = f.handler.capture(request('message.send', recipient, { message: 'm', text: 'body' }), {} as any);
	await send.preflight(scope);
	await send.run(() => {});
	const read = f.handler.capture(request('inbox.read', { sessionId: alternateRecipient.sessionId }, { message: 'm' }), {} as any);
	await read.preflight(scope);
	await expect(read.run(() => {})).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
});

test('send and read use the InboxService seam and preserve the saved fact', async () => {
	const f = fixture();
	const command = f.handler.capture(request('message.send', recipient, { message: 'm', text: 'body' }), {} as any);
	await command.preflight(scope);
	const sent = await command.run(() => {});
	expect(sent).toMatchObject({ phase: 'record-saved', effect: 'completed', data: { messageId: 'm', fact: 'record-saved' } });
	expect(f.service.send).toHaveBeenCalledOnce();
	const read = f.handler.capture(request('inbox.read', {}, { message: 'm' }), {} as any);
	await read.preflight(scope);
	expect(await read.run(() => {})).toMatchObject({ phase: 'read', data: { messageId: 'm', text: 'body' } });
	expect(f.service.read).toHaveBeenCalledWith('m', undefined);
});

test('message.send propagates the captured AbortSignal to the controller-owned InboxService', async () => {
	const f = fixture();
	const signal = new AbortController().signal;
	const command = f.handler.capture(request('message.send', recipient, { message: 'signal', text: 'body' }), { signal } as any);
	await command.preflight(scope);
	await command.run(() => {});
	expect(f.service.send).toHaveBeenCalledWith(expect.anything(), { signal });
});

test('ack is idempotent and list cursor keeps its generation across append and ack', async () => {
	const f = fixture();
	for (const id of ['a', 'b', 'c']) {
		const command = f.handler.capture(request('message.send', recipient, { message: id, text: id }), {} as any);
		await command.preflight(scope);
		await command.run(() => {});
	}
	const first = f.handler.capture(request('inbox.list', recipient, { limit: 1 }), {} as any);
	await first.preflight(scope);
	const page = await first.run(() => {});
	expect(page.data).toMatchObject({ generation: 1, highWaterSequence: 3, items: [{ messageId: 'a' }] });
	const cursor = (page.data as any).nextCursor;
	const append = f.handler.capture(request('message.send', recipient, { message: 'd', text: 'd' }), {} as any);
	await append.preflight(scope);
	await append.run(() => {});
	const next = f.handler.capture(request('inbox.list', recipient, { limit: 1, cursor }), {} as any);
	await next.preflight(scope);
	expect(await next.run(() => {})).toMatchObject({ data: { generation: 1, highWaterSequence: 3, items: [{ messageId: 'b' }] } });
	const ack = f.handler.capture(request('inbox.ack', {}, { message: 'a' }), {} as any);
	await ack.preflight(scope);
	expect(await ack.run(() => {})).toMatchObject({ data: { fact: 'ack-saved' } });
	const duplicate = f.handler.capture(request('inbox.ack', {}, { message: 'a' }), {} as any);
	await duplicate.preflight(scope);
	expect(await duplicate.run(() => {})).toMatchObject({ data: { fact: 'already-acked' }, effect: 'none' });
});

test('unknown send retains message identity and diagnostic without retry', async () => {
	const f = fixture();
	f.service.send.mockResolvedValueOnce({ status: 'unknown', effect: 'unknown', error: { diagnostic: 'after-id' } });
	const command = f.handler.capture(request('message.send', recipient, { message: 'unknown-id', text: 'body' }), {} as any);
	await command.preflight(scope);
	const result = await command.run(() => {});
	expect(result).toMatchObject({ effect: 'unknown', error: { code: 'EFFECT_UNKNOWN' }, data: { messageId: 'unknown-id', text: 'body', diagnostic: 'after-id' } });
	expect(f.service.send).toHaveBeenCalledOnce();
});

test('post-ID disappearing target and malformed local body/reference failures retain message identity', async () => {
	const f = fixture();
	const disappearing = f.handler.capture(request('message.send', { sessionId: recipient.sessionId }, { message: 'vanish', text: 'body' }), {} as any);
	await disappearing.preflight(scope);
	delete f.records.sessions[recipient.sessionId];
	expect(await disappearing.run(() => {})).toMatchObject({ phase: 'failed', effect: 'none', data: { messageId: 'vanish', recipient, diagnostic: expect.any(String) } });
	const malformedBody = f.handler.capture(request('message.send', { sessionId: alternateRecipient.sessionId }, { message: 'bad-body' }), {} as any);
	await malformedBody.preflight(scope);
	expect(await malformedBody.run(() => {})).toMatchObject({ phase: 'failed', effect: 'none', data: { messageId: 'bad-body' } });
	const malformedRefs = f.handler.capture(request('message.send', { sessionId: alternateRecipient.sessionId }, { message: 'bad-refs', text: 'body', references: 'not-an-array' }), {} as any);
	await malformedRefs.preflight(scope);
	expect(await malformedRefs.run(() => {})).toMatchObject({ phase: 'failed', effect: 'none', data: { messageId: 'bad-refs', text: 'body' } });
});

test('real Router to ControlCommands to InboxService seam keeps explicit target and no spawn path', async () => {
	const f = fixture();
	const service = new InboxService({ spaces: {
		store: f.spaces.store,
		sendInbox: async (input: any) => (await f.service.send(input)).value,
		freshInboxPrimary: f.service.freshPrimary,
	} as any });
	const spaces = { ...f.spaces, assertControlScope: vi.fn(async () => {}) } as any;
	const commands = new ControlCommands(spaces, {} as any, {} as any, service);
	const router = new ControlRouter(commands);
	const result = await router.invokeLocal(
		request('message.send', recipient, { message: 'router-id', text: 'via router' }),
		scope,
		captureControlExecutionContext(new AbortController().signal, 1000),
	);
	expect(result).toMatchObject({ phase: 'record-saved', effect: 'completed', target: { spaceId: recipient.spaceId, sessionId: recipient.sessionId }, data: { messageId: 'router-id', fact: 'record-saved' } });
	expect(f.service.send).toHaveBeenCalledOnce();
	await router.close();
});

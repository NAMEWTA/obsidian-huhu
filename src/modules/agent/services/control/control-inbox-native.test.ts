import { expect, test } from 'vitest';
import { controlDescriptor, encodeControlRequest, parseControlRequest, encodeControlResponse, parseControlResponse } from '../../../../shared/native/control-wire';

test('canonical native control wire preserves explicit inbox target and message identity', () => {
	const requests = [
		{ protocolVersion: 1 as const, requestId: 'send', operation: 'message.send' as const, target: { sessionId: 'session' }, params: { message: 'm', text: 'body' } },
		{ protocolVersion: 1 as const, requestId: 'list', operation: 'inbox.list' as const, target: { sessionId: 'session' }, params: { limit: 1 } },
		{ protocolVersion: 1 as const, requestId: 'read', operation: 'inbox.read' as const, params: { message: 'm' } },
		{ protocolVersion: 1 as const, requestId: 'ack', operation: 'inbox.ack' as const, params: { message: 'm' } },
	] as const;
	for (const request of requests) expect(parseControlRequest(encodeControlRequest(request).body)).toEqual(request);
	for (const operation of ['message.send', 'inbox.list', 'inbox.read', 'inbox.ack'] as const)
		expect(controlDescriptor().operations[operation].available).toBe(true);
	const response = { protocolVersion: 1 as const, requestId: 'r', operation: 'message.send' as const, ok: false as const, phase: 'failed' as const, effect: 'unknown' as const, error: { code: 'EFFECT_UNKNOWN' as const, message: 'unknown', details: { messageId: 'm', diagnostic: 'lost' } } };
	expect(parseControlResponse(encodeControlResponse(response).body)).toEqual(response);
});

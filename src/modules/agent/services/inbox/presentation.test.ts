import { expect, test } from 'vitest';
import { InboxPresentation } from './presentation';

test('presentation retains unknown observations across detach and bounds attempts', () => {
	const presentation = new InboxPresentation();
	const attempt = presentation.reserve({ action: 'send', messageId: 'm', recipient: { spaceId: 's', sessionId: 'x' }, body: 'body', viewId: 'leaf' });
	expect(() => presentation.reserve({ action: 'send', messageId: 'm2', recipient: { spaceId: 's', sessionId: 'x' }, viewId: 'leaf' })).toThrow('inbox-view-pending');
	presentation.complete(attempt.attemptId, 'unknown', 'unknown', 'primary readback unavailable');
	presentation.detach('leaf');
	expect(presentation.list()).toMatchObject([{ messageId: 'm', status: 'unknown', body: 'body', diagnostic: 'primary readback unavailable' }]);
	const second = presentation.reserve({ action: 'send', messageId: 'm2', recipient: { spaceId: 's', sessionId: 'x' }, viewId: 'leaf' });
	expect(second.attemptId).not.toBe(attempt.attemptId);
});

test('diagnostics are bounded by UTF-8 bytes even when many multi-byte characters arrive', () => {
	const presentation = new InboxPresentation();
	const attempt = presentation.reserve({ action: 'send', messageId: 'utf8', recipient: { spaceId: 's', sessionId: 'x' } });
	const result = presentation.complete(attempt.attemptId, 'unknown', 'unknown', '😀'.repeat(4096));
	expect(new TextEncoder().encode(result.diagnostic ?? '').byteLength).toBeLessThanOrEqual(4096);
	expect(result.diagnostic).toHaveLength(2048);
});

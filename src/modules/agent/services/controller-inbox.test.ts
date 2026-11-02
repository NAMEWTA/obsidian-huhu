import { expect, test } from 'vitest';
import { InboxPresentation } from './inbox/presentation';

test('controller-owned inbox presentation has bounded activation state and never reports availability early', () => {
	const presentation = new InboxPresentation();
	const attempt = presentation.reserve({ action: 'send', messageId: 'm', recipient: { spaceId: 'space', sessionId: 'session' }, body: 'body' });
	presentation.complete(attempt.attemptId, 'unknown', 'unknown', 'unverified write');
	presentation.detach('closed-leaf');
	expect(presentation.list()).toHaveLength(1);
	expect(presentation.list()[0]).toMatchObject({ messageId: 'm', status: 'unknown' });
});

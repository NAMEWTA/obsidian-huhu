import { expect, it } from 'vitest';
import type { VisibleMessage } from '../../api';
import { emptyTranscript, mergePublicMessages } from './transcript';

function message(id: string, seq: string, agentId = 'agent:b'): VisibleMessage {
	return { id, seq, runId: `run:${id}`, sessionId: 'group:one', role: 'assistant', text: `public ${id}`, agentId, sourceRefs: [], createdAt: '2026-10-26T00:00:00Z' };
}
it('uses durable public sequence across reversed completion/arrival and duplicated history pages', () => {
	const first = message('a-later', '3'), second = message('z-earlier', '2', 'agent:c');
	const previous = mergePublicMessages(emptyTranscript('group:one'), [first]);
	const result = mergePublicMessages(previous, [first, second, second]);
	expect(result.messages.map(item => item.id)).toEqual(['z-earlier', 'a-later']);
	expect(previous.messages).toEqual([first]);
	const latest = { ...second, text: '' };
	expect(mergePublicMessages(result, [latest]).messages[0]!.text).toBe(''); // A current authorized/redacted history fact replaces its own body.
});
it('keeps public sequence exact beyond JS safe integers, permits authorization-filtered gaps and never guesses from IDs', () => {
	const result = mergePublicMessages(emptyTranscript('group:one'), [message('a', '9007199254740994'), message('z', '9007199254740992')]);
	expect(result.messages.map(item => item.seq)).toEqual(['9007199254740992', '9007199254740994']);
	const missing = message('message:999', '1'); delete missing.seq;
	expect(() => mergePublicMessages(result, [missing])).toThrow('GROUP_HISTORY_INVALID');
});
it('rejects cross-session and conflicting durable identities without changing already accepted public history', () => {
	const original = mergePublicMessages(emptyTranscript('group:one'), [message('one', '1')]);
	for (const invalid of [message('two', '1'), message('one', '2'), { ...message('other', '3'), sessionId: 'private:other' }, message('zero', '0')])
		expect(() => mergePublicMessages(original, [invalid])).toThrow('GROUP_HISTORY_INVALID');
	expect(original.messages.map(item => item.text)).toEqual(['public one']);
});
it('bounds the client window explicitly rather than silently evicting or duplicating message bodies', () => {
	const large = { ...message('one', '1'), text: 'x'.repeat(524_288) };
	const original = mergePublicMessages(emptyTranscript('group:one'), [large]);
	expect(() => mergePublicMessages(original, [{ ...large, id: 'two', seq: '2' }])).toThrow('GROUP_HISTORY_WINDOW_LIMIT');
	expect(original.messages).toHaveLength(1);
});

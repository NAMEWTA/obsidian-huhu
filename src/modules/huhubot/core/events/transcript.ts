import type { VisibleMessage } from '../../api';
import { sequence } from './reducer';

const MAX_MESSAGES = 512;
const MAX_BYTES = 1_048_576;
const encoder = new TextEncoder();
export interface PublicTranscript { sessionId: string; messages: readonly VisibleMessage[] }
export class TranscriptError extends Error {
	constructor(readonly reason: 'GROUP_HISTORY_INVALID' | 'GROUP_HISTORY_WINDOW_LIMIT') { super(reason); this.name = 'TranscriptError'; }
}
export function emptyTranscript(sessionId: string): PublicTranscript { return { sessionId, messages: [] }; }
function publicSequence(message: VisibleMessage): bigint {
	try {
		if (message.seq !== undefined) {
			const value = sequence(message.seq);
			if (value > 0n) return value;
		}
	} catch { /* Public message sequence is independent of a Run event cursor or an opaque history cursor. */ }
	throw new TranscriptError('GROUP_HISTORY_INVALID');
}

/** Only server-published History messages enter this window. Stream chunks never become public transcript facts. */
export function mergePublicMessages(previous: PublicTranscript, messages: readonly VisibleMessage[]): PublicTranscript {
	const byId = new Map<string, VisibleMessage>(), bySeq = new Map<bigint, string>();
	for (const message of [...previous.messages, ...messages]) {
		const seq = publicSequence(message), original = byId.get(message.id), owner = bySeq.get(seq);
		if (!message.id || message.sessionId !== previous.sessionId || original && original.seq !== message.seq || owner !== undefined && owner !== message.id)
			throw new TranscriptError('GROUP_HISTORY_INVALID');
		bySeq.set(seq, message.id);
		// A later authorized read can redact an existing body. Never retain a second copy under the same stable identity.
		byId.set(message.id, message);
	}
	if (byId.size > MAX_MESSAGES) throw new TranscriptError('GROUP_HISTORY_WINDOW_LIMIT');
	const ordered = [...byId.values()].sort((a, b) => publicSequence(a) < publicSequence(b) ? -1 : publicSequence(a) > publicSequence(b) ? 1 : 0);
	const result: PublicTranscript = { sessionId: previous.sessionId, messages: ordered };
	if (encoder.encode(JSON.stringify(result)).length > MAX_BYTES) throw new TranscriptError('GROUP_HISTORY_WINDOW_LIMIT');
	return structuredClone(result);
}

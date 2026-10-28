import type { Decimal, EventCursorRecovery, EventPage, Run, RunEvent, RunUsage, VisibleMessage } from '../../api';

const MAX_SEQUENCE = 9_223_372_036_854_775_807n;
const MAX_TEXT_BYTES = 262_144;
const MAX_PROJECTION_BYTES = 1_048_576;
const encoder = new TextEncoder();
const textTypes = new Set(['text', 'delta', 'token', 'text.delta', 'chunk']);
const statuses = new Set(['accepted', 'preparing', 'running', 'waiting_approval', 'waiting_children', 'interrupted',
	'recovering', 'blocked', 'canceling', 'succeeded', 'failed', 'canceled']);

export interface EventProjection {
	runId: string;
	seq: Decimal;
	metadataSeq: Decimal;
	access: 'unknown' | 'allowed' | 'denied';
	pendingText: string;
	messages: VisibleMessage[];
	facts: RunEvent[];
	run?: Run;
	status?: string;
	reason?: string;
	usage?: RunUsage;
	messageId?: string;
	lastEffectId?: string;
	lastApprovalId?: string;
	lastEventType?: string;
}
export interface ProjectionUpdate { projection: EventProjection; needsBackfill: boolean }
export class EventProjectionError extends Error {
	constructor(readonly reason: string) { super(reason); this.name = 'EventProjectionError'; }
}
export function sequence(value: Decimal): bigint {
	if (!/^(0|[1-9][0-9]{0,18})$/.test(value)) throw new EventProjectionError('INVALID_EVENT_SEQUENCE');
	const parsed = BigInt(value);
	if (parsed > MAX_SEQUENCE) throw new EventProjectionError('INVALID_EVENT_SEQUENCE');
	return parsed;
}
export function emptyProjection(runId: string): EventProjection {
	return { runId, seq: '0', metadataSeq: '0', access: 'unknown', pendingText: '', messages: [], facts: [] };
}
function bounded(projection: EventProjection): EventProjection {
	if (projection.facts.length > 128 || encoder.encode(projection.pendingText).length > MAX_TEXT_BYTES || encoder.encode(JSON.stringify(projection)).length > MAX_PROJECTION_BYTES)
		throw new EventProjectionError('EVENT_PROJECTION_LIMIT');
	return projection;
}
/** Cursor is per Run. Future items behind a hole are discarded and fetched again from the last applied cursor. */
export function applyEventPage(previous: EventProjection, page: EventPage): ProjectionUpdate {
	if (page.runId !== previous.runId || page.events.length > 128) throw new EventProjectionError('EVENT_PAGE_INVALID');
	const head = sequence(page.headSeq), next = sequence(page.nextSeq);
	if (next > head) throw new EventProjectionError('EVENT_PAGE_INVALID');
	let cursor = sequence(previous.seq);
	const events = [...page.events].sort((a, b) => sequence(a.seq) < sequence(b.seq) ? -1 : sequence(a.seq) > sequence(b.seq) ? 1 : 0);
	const projection = structuredClone(previous);
	projection.access = 'allowed';
	for (const event of events) {
		const seq = sequence(event.seq);
		if (event.runId !== previous.runId || seq > head || seq > next) throw new EventProjectionError('EVENT_PAGE_INVALID');
		if (seq <= cursor) continue;
		if (seq !== cursor + 1n) return { projection: bounded(projection), needsBackfill: true };
		if (event.text && textTypes.has(event.type)) projection.pendingText += event.text;
		if (!textTypes.has(event.type) && !statuses.has(event.type)) {
			const index = projection.facts.findIndex((fact) => fact.seq === event.seq);
			if (index < 0) projection.facts.push(structuredClone(event));
			else projection.facts[index] = structuredClone(event);
		}
		if (seq > sequence(projection.metadataSeq)) {
			// Ledger statuses belong to their fact; they cannot replace the Run's terminal state.
			if (statuses.has(event.type)) {
				projection.status = event.type;
				if (event.reason !== undefined) projection.reason = event.reason;
				if (event.usage !== undefined) projection.usage = structuredClone(event.usage);
				if (event.messageId !== undefined) projection.messageId = event.messageId;
			}
			if (event.type === 'usage.settled' && event.usage !== undefined) projection.usage = structuredClone(event.usage);
			if (event.effectId !== undefined) projection.lastEffectId = event.effectId;
			if (event.approvalId !== undefined) projection.lastApprovalId = event.approvalId;
			projection.lastEventType = event.type;
			projection.metadataSeq = event.seq;
		}
		projection.seq = event.seq;
		cursor = seq;
	}
	return { projection: bounded(projection), needsBackfill: cursor < next };
}
/** The server authorizes this entire snapshot and snapshotSeq in one short read. */
export function restoreEventSnapshot(previous: EventProjection, recovery: EventCursorRecovery): EventProjection {
	if (recovery.runId !== previous.runId || recovery.snapshot.run.id !== previous.runId ||
		sequence(recovery.snapshotSeq) < sequence(previous.metadataSeq)) throw new EventProjectionError('EVENT_SNAPSHOT_INVALID');
	const facts = [...recovery.snapshot.events].sort((a, b) => sequence(a.seq) < sequence(b.seq) ? -1 : 1);
	let prior = -1n;
	for (const event of facts) {
		const seq = sequence(event.seq);
		if (event.runId !== previous.runId || seq > sequence(recovery.snapshotSeq) || seq <= prior) throw new EventProjectionError('EVENT_SNAPSHOT_INVALID');
		prior = seq;
	}
	const last = facts.at(-1);
	return bounded({ ...emptyProjection(previous.runId), access: 'allowed', seq: recovery.snapshotSeq, metadataSeq: recovery.snapshotSeq, facts: structuredClone(facts),
		lastEventType: last?.type, lastEffectId: [...facts].reverse().find((event) => event.effectId)?.effectId,
		lastApprovalId: [...facts].reverse().find((event) => event.approvalId)?.approvalId,
		run: structuredClone(recovery.snapshot.run), status: recovery.snapshot.run.status, reason: recovery.snapshot.run.reason,
		usage: structuredClone(recovery.snapshot.run.usage), messages: structuredClone(recovery.snapshot.messages), pendingText: recovery.snapshot.pendingText });
}
/** Local projection only: no server facts or user-owned notes/messages are deleted. Rebuild text from zero after reauthorization. */
export function clearEventBodies(previous: EventProjection, access: EventProjection['access'] = 'unknown'): EventProjection {
	return { ...previous, seq: '0', access, pendingText: '', messages: [], facts: [] };
}

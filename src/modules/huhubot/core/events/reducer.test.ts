import { expect, it } from 'vitest';
import type { EventCursorRecovery, EventPage, RunEvent } from '../../api';
import fixtures from '../../../../../contracts/hap/v0.1/fixtures/golden.json';
import { applyEventPage, clearEventBodies, emptyProjection, restoreEventSnapshot, sequence } from './reducer';

function event(runId: string, seq: string, extra: Partial<RunEvent> = {}): RunEvent {
	return { runId, seq, type: 'delta', createdAt: '2026-10-25T00:00:00Z', ...extra };
}
function page(runId: string, events: RunEvent[], nextSeq = events.at(-1)?.seq ?? '0'): EventPage {
	return { runId, events, subscriptionId: 'subscription:one', nextSeq, headSeq: nextSeq, hasMore: false };
}
function recovery(runId: string, seq: string): EventCursorRecovery {
	const fixture = fixtures.valid.find((item) => item.name === 'cursor-expired')!;
	const data = structuredClone((fixture.payload as unknown as { error: { data: { details: EventCursorRecovery } } }).error.data.details);
	data.runId = runId; data.snapshot.run.id = runId; data.snapshotSeq = seq;
	data.snapshot.messages = []; data.snapshot.pendingText = ''; data.snapshot.events = [];
	return data;
}

it('applies late measured usage without reopening a canceled Run', () => {
	const canceled = applyEventPage(emptyProjection('a'), page('a', [event('a', '1', { type: 'canceled', usage: { knowledge: 'unknown', estimated: true } })])).projection;
	const measured = applyEventPage(canceled, page('a', [event('a', '2', { type: 'usage.settled', usage: { knowledge: 'known', inputTokens: '5', outputTokens: '2', estimated: false } })])).projection;
	expect(measured.status).toBe('canceled');
	expect(measured.usage).toEqual({ knowledge: 'known', inputTokens: '5', outputTokens: '2', estimated: false });
	expect(applyEventPage(measured, page('a', [event('a', '2', { type: 'usage.settled' })])).projection).toEqual(measured);
});

it('orders and deduplicates large decimal sequences per Run without Number precision loss', () => {
	let first = restoreEventSnapshot(emptyProjection('a'), recovery('a', '9007199254740993'));
	first = applyEventPage(first, page('a', [event('a', '9007199254740995', { text: '!' }),
		event('a', '9007199254740994', { text: '甲😀' }), event('a', '9007199254740994', { text: '甲😀' })], '9007199254740995')).projection;
	expect(first.pendingText).toBe('甲😀!');
	expect(first.seq).toBe('9007199254740995');
	const second = applyEventPage(emptyProjection('b'), page('b', [event('b', '1', { type: 'running', status: 'running' })])).projection;
	expect(second.status).toBe('running');
	expect(first.pendingText).toBe('甲😀!');
	expect(() => applyEventPage(first, page('b', [event('b', '2')]))).toThrow('EVENT_PAGE_INVALID');
});

it('holds the cursor at a hole, backfills it, and applies ledger updates after terminal without adding ledger text', () => {
	const first = applyEventPage(emptyProjection('a'), page('a', [event('a', '1', { text: 'A' }), event('a', '3', { text: 'C' })]));
	expect(first).toMatchObject({ projection: { seq: '1', pendingText: 'A' }, needsBackfill: true });
	const filled = applyEventPage(first.projection, page('a', [event('a', '2', { text: 'B' }), event('a', '3', { text: 'C' })])).projection;
	const terminal = applyEventPage(filled, page('a', [event('a', '4', { type: 'succeeded', status: 'succeeded', reason: 'DONE', messageId: 'message:final' }),
		event('a', '5', { type: 'reconciled', status: 'committed', reason: 'EFFECT_RECONCILED', effectId: 'effect:one', text: 'private preview' })])).projection;
	expect(terminal).toMatchObject({ pendingText: 'ABC', status: 'succeeded', reason: 'DONE', messageId: 'message:final', lastEffectId: 'effect:one', seq: '5' });
	expect(terminal.facts).toHaveLength(1);
	expect(applyEventPage(terminal, page('a', [event('a', '2', { text: 'overwrite' })])).projection.pendingText).toBe('ABC');
});

it('replaces a projection at snapshotSeq including late facts and resumes strictly after that snapshot', () => {
	const initial = applyEventPage(emptyProjection('a'), page('a', [event('a', '1', { text: 'old' })])).projection;
	const snapshot = recovery('a', '8');
	snapshot.snapshot.events = [event('a', '7', { type: 'reconciled', effectId: 'effect:late', text: 'ledger only' })];
	snapshot.snapshot.pendingText = 'snapshot';
	const restored = restoreEventSnapshot(initial, snapshot);
	expect(restored).toMatchObject({ seq: '8', pendingText: 'snapshot', lastEffectId: 'effect:late' });
	const next = applyEventPage(restored, page('a', [event('a', '8', { text: 'duplicate' }), event('a', '9', { text: ' next' })])).projection;
	expect(next.pendingText).toBe('snapshot next');
	expect(next.facts).toHaveLength(1);
	expect(() => restoreEventSnapshot(next, snapshot)).toThrow('EVENT_SNAPSHOT_INVALID');
	snapshot.snapshot.events[0]!.seq = '10';
	expect(() => restoreEventSnapshot(initial, snapshot)).toThrow('EVENT_SNAPSHOT_INVALID');
	expect(initial.pendingText).toBe('old');
});

it('clears every cached body on invalidation while preserving non-body status and avoiding replay regression', () => {
	const snapshot = recovery('a', '5');
	snapshot.snapshot.pendingText = 'private stream';
	snapshot.snapshot.run.status = 'succeeded';
	snapshot.snapshot.events = [event('a', '4', { type: 'reconciled', effectId: 'effect:one', text: 'private ledger', sourceRefs: [] })];
	const cleared = clearEventBodies(restoreEventSnapshot(emptyProjection('a'), snapshot), 'denied');
	expect(JSON.stringify(cleared)).not.toContain('private');
	expect(cleared).toMatchObject({ access: 'denied', seq: '0', status: 'succeeded', lastEffectId: 'effect:one' });
	const replay = applyEventPage(cleared, page('a', [event('a', '1', { type: 'running', status: 'running' })])).projection;
	expect(replay.status).toBe('succeeded');
});

it('rejects resource/sequence overflow without mutating the previous projection', () => {
	const initial = emptyProjection('a');
	expect(() => applyEventPage(initial, page('a', [event('a', '1', { text: '😀'.repeat(65537) })]))).toThrow('EVENT_PROJECTION_LIMIT');
	expect(initial.pendingText).toBe('');
	for (const value of ['01', '-1', '1.5', '9223372036854775808']) expect(() => sequence(value)).toThrow('INVALID_EVENT_SEQUENCE');
	expect(sequence('9223372036854775807')).toBe(9223372036854775807n);
});

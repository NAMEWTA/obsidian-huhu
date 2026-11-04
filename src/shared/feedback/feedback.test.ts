import { expect, test } from 'vitest';
import { createFeedback, type FeedbackUpdate, type FeedbackView } from './index';

function fixture() {
	const active = new Map<string, FeedbackView>();
	const timers = new Map<number, () => void>();
	let sequence = 0;
	let now = 1000;
	const feedback = createFeedback({
		translate: (key, params) => `${key}${params ? JSON.stringify(params) : ''}`,
		present: view => { active.set(view.id, view); },
		remove: id => { active.delete(id); },
		now: () => now,
		timers: { set: (_target, callback) => { timers.set(++sequence, callback); return sequence; }, clear: (_target, id) => { timers.delete(id); } },
	});
	return { feedback, active, timers, setNow: (next: number) => { now = next; } };
}
const input: FeedbackUpdate = { operationId: 'save-1', source: 'archives', target: 'main', message: { key: 'saving' } };

test('100 progress updates and the committed result replace one activity', () => {
	const { feedback, active } = fixture();
	for (let completed = 0; completed < 100; completed++) feedback.publish({ ...input, progress: { completed, total: 100 } });
	expect(active.size).toBe(1);
	const id = [...active.keys()][0];
	feedback.publish({ ...input, message: { key: 'saved' }, outcome: 'success', receipt: { committed: true } });
	expect([...active.values()]).toEqual([expect.objectContaining({ id, text: 'saved', outcome: 'success', progress: undefined })]);
});

test('source dedupe merges only scoped information within its window; durations follow readable length', () => {
	const { feedback, active } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const, windowMs: 1000 };
	feedback.publish({ ...input, operationId: 'one', dedupe });
	feedback.publish({ ...input, operationId: 'two', dedupe });
	expect(active.size).toBe(1);
	feedback.publish({ ...input, operationId: 'two', target: 'popout', dedupe });
	feedback.publish({ ...input, operationId: 'two', source: 'safe', dedupe });
	expect(active.size).toBe(3);
	feedback.publish({ ...input, operationId: 'long', message: { key: 'x'.repeat(1000) }, level: 'error' });
	expect([...active.values()].at(-1)?.durationMs).toBe(15000);
});

test('target close and disposal release timers and reject late callbacks without touching another target', () => {
	const { feedback, active, timers } = fixture();
	feedback.publish(input);
	feedback.publish({ ...input, target: 'popout' });
	expect(timers.size).toBe(2);
	feedback.closeTarget('popout');
	feedback.publish({ ...input, target: 'popout' });
	expect([...active.values()].map(view => view.target)).toEqual(['main']);
	expect(timers.size).toBe(1);
	feedback.dispose();
	feedback.dispose();
	feedback.publish(input);
	expect(active.size).toBe(0);
	expect(timers.size).toBe(0);
});

test('marked parameters and whole private messages never reach any output or translator', () => {
	const { feedback, active } = fixture();
	feedback.publish({ ...input, message: { key: 'failed', params: { account: { sensitive: true, value: 'SECRET-ACCOUNT' }, count: 2 } }, actions: [{ id: 'retry', label: { key: 'retry', params: { value: { sensitive: true, value: 'SECRET-ACTION' } } }, run: () => {} }] });
	expect([...active.values()][0]?.text).toBe('failed{"account":"[redacted]","count":2}');
	feedback.publish({ ...input, privacy: 'sensitive', message: { key: 'SECRET-MESSAGE' }, publicMessage: { key: 'public' } });
	expect([...active.values()][0]?.text).toBe('public');
	expect(JSON.stringify([...active.values()])).not.toContain('SECRET-');
});

test('success waits for an owner receipt and late progress cannot undo a terminal result', async () => {
	const { feedback, active } = fixture();
	let commit!: () => void;
	const owner = new Promise<void>(resolve => { commit = resolve; });
	feedback.publish({ ...input, progress: { completed: 0 } });
	const operation = owner.then(() => feedback.publish({ ...input, outcome: 'success', receipt: { committed: true } }));
	expect([...active.values()][0]?.outcome).toBeUndefined();
	expect([...active.values()][0]?.durationMs).toBe(0);
	commit();
	await operation;
	feedback.publish({ ...input, progress: { completed: 1 } });
	expect([...active.values()][0]?.outcome).toBe('success');
});

test('all non-success outcomes stay distinct and different failures with identical text survive dedupe', () => {
	const { feedback, active } = fixture();
	for (const outcome of ['partial', 'failed', 'cancelled', 'locked'] as const) feedback.publish({ ...input, operationId: outcome, outcome, dedupe: { key: 'same', scope: 'source' } });
	feedback.publish({ ...input, operationId: 'other-failure', outcome: 'failed', dedupe: { key: 'same', scope: 'source' } });
	expect([...active.values()].map(view => view.outcome)).toEqual(['partial', 'failed', 'cancelled', 'locked', 'failed']);
	expect([...active.values()].find(view => view.outcome === 'failed')?.level).toBe('error');
	expect([...active.values()].find(view => view.outcome === 'partial')?.level).toBe('warning');
});

test('dedupe suppression expires, instances do not share state, and dismissing a result cannot resurrect it inside the window', () => {
	const first = fixture(), second = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const, windowMs: 1000 };
	first.feedback.publish({ ...input, dedupe });
	const id = [...first.active.keys()][0]!;
	first.feedback.dismiss(id);
	first.feedback.publish({ ...input, operationId: 'duplicate', dedupe });
	expect(first.active.size).toBe(0);
	second.feedback.publish({ ...input, dedupe });
	expect(second.active.size).toBe(1);
	first.setNow(2001);
	first.feedback.publish({ ...input, operationId: 'after-window', dedupe });
	expect(first.active.size).toBe(1);
});

test('a runtime success without a committed receipt and a private message without a public replacement are rejected', () => {
	const { feedback, active } = fixture();
	feedback.publish({ ...input, outcome: 'success' } as unknown as FeedbackUpdate);
	feedback.publish({ ...input, privacy: 'sensitive', message: { key: 'SECRET-NO-FALLBACK' } });
	expect(active.size).toBe(0);
});

test.each(['success', 'failed'] as const)('source-coalesced operations keep independent progress and results after the first %s', firstOutcome => {
	const { feedback, active } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const };
	feedback.publish({ ...input, operationId: 'A', dedupe });
	feedback.publish({ ...input, operationId: 'B', dedupe });
	expect(active.size).toBe(1);
	feedback.publish({ ...input, operationId: 'A', progress: { completed: 1, total: 2 } });
	feedback.publish({ ...input, operationId: 'B', progress: { completed: 2, total: 3 } });
	expect(active.size).toBe(2);
	expect([...active.values()].map(view => view.progress)).toEqual(expect.arrayContaining([{ completed: 1, total: 2 }, { completed: 2, total: 3 }]));
	if (firstOutcome === 'success') feedback.publish({ ...input, operationId: 'A', message: { key: 'same result' }, outcome: 'success', receipt: { committed: true } });
	else feedback.publish({ ...input, operationId: 'A', message: { key: 'same result' }, outcome: 'failed' });
	feedback.publish({ ...input, operationId: 'B', message: { key: 'same result' }, outcome: 'failed' });
	expect([...active.values()].map(view => view.outcome).sort()).toEqual([firstOutcome, 'failed'].sort());
	expect(new Set([...active.values()].map(view => view.id)).size).toBe(2);
});

test('source-coalesced ordinary messages can finish independently without intermediate progress', () => {
	const { feedback, active } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const };
	feedback.publish({ ...input, operationId: 'A', dedupe });
	feedback.publish({ ...input, operationId: 'B', dedupe });
	feedback.publish({ ...input, operationId: 'A', outcome: 'success', receipt: { committed: true } });
	feedback.publish({ ...input, operationId: 'B', outcome: 'failed' });
	expect([...active.values()].map(view => view.outcome).sort()).toEqual(['failed', 'success']);
});

test.each(['success', 'partial', 'failed', 'cancelled', 'locked'] as const)('first %s result survives the expiry of its ordinary start message', outcome => {
	const { feedback, active, timers, setNow } = fixture();
	feedback.publish(input);
	setNow(4000);
	for (const [id, expire] of [...timers]) { timers.delete(id); expire(); }
	expect(active.size).toBe(0);
	setNow(5000);
	if (outcome === 'success') feedback.publish({ ...input, message: { key: 'result' }, outcome, receipt: { committed: true } });
	else feedback.publish({ ...input, message: { key: 'result' }, outcome });
	expect([...active.values()]).toEqual([expect.objectContaining({ text: 'result', outcome })]);
});

test('first progress after its start message expires still appears and is replaced by its result', () => {
	const { feedback, active, timers, setNow } = fixture();
	feedback.publish(input);
	setNow(4000);
	for (const [id, expire] of [...timers]) { timers.delete(id); expire(); }
	feedback.publish({ ...input, progress: { completed: 1 } });
	expect([...active.values()]).toEqual([expect.objectContaining({ progress: { completed: 1 } })]);
	const id = [...active.keys()][0];
	feedback.publish({ ...input, outcome: 'failed' });
	expect([...active.values()]).toEqual([expect.objectContaining({ id, outcome: 'failed', progress: undefined })]);
});

test.each(['success', 'partial', 'failed', 'cancelled', 'locked'] as const)('expired %s remains terminal after the dedupe window; retry needs a new operation ID', outcome => {
	const { feedback, active, timers, setNow } = fixture();
	feedback.publish({ ...input, progress: { completed: 1, total: 10 } });
	if (outcome === 'success') feedback.publish({ ...input, outcome, receipt: { committed: true } });
	else feedback.publish({ ...input, outcome });
	setNow(61000);
	for (const [id, expire] of [...timers]) { timers.delete(id); expire(); }
	expect(active.size).toBe(0);
	feedback.publish({ ...input, progress: { completed: 2, total: 10 } });
	feedback.publish(input);
	feedback.publish({ ...input, outcome: 'failed' });
	expect(active.size).toBe(0);
	expect(timers.size).toBe(0);
	feedback.publish({ ...input, operationId: 'retry-2', progress: { completed: 0, total: 10 } });
	expect([...active.values()]).toEqual([expect.objectContaining({ progress: { completed: 0, total: 10 }, outcome: undefined })]);
	feedback.publish({ ...input, target: 'other-window', progress: { completed: 0 } });
	feedback.publish({ ...input, source: 'other-source', progress: { completed: 0 } });
	expect(active.size).toBe(3);
	feedback.dispose();
	expect(timers.size).toBe(0);
	expect(active.size).toBe(0);
});

test('a later source hint cannot replace another operation progress or expire its display', () => {
	const { feedback, active, timers, setNow } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const };
	feedback.publish({ ...input, operationId: 'A', message: { key: 'A starting' }, dedupe });
	feedback.publish({ ...input, operationId: 'A', message: { key: 'A scanning' }, dedupe, progress: { completed: 1, total: 100 } });
	const id = [...active.keys()][0]!;
	feedback.publish({ ...input, operationId: 'B', message: { key: 'B starting' }, dedupe });
	expect(active.size).toBe(2);
	expect(active.get(id)).toEqual(expect.objectContaining({ text: 'A scanning', progress: { completed: 1, total: 100 }, durationMs: 0 }));
	expect(timers.size).toBe(1);
	setNow(4000);
	for (const [timerId, expire] of [...timers]) { timers.delete(timerId); expire(); }
	expect([...active.values()]).toEqual([expect.objectContaining({ id, text: 'A scanning', progress: { completed: 1, total: 100 }, durationMs: 0 })]);
	feedback.publish({ ...input, operationId: 'A', message: { key: 'A saved' }, outcome: 'success', receipt: { committed: true } });
	expect([...active.values()]).toEqual([expect.objectContaining({ id, text: 'A saved', outcome: 'success', progress: undefined })]);
});

function interleave(left: readonly string[], right: readonly string[]): string[][] {
	if (!left.length) return [[...right]];
	if (!right.length) return [[...left]];
	return [
		...interleave(left.slice(1), right).map(order => [left[0]!, ...order]),
		...interleave(left, right.slice(1)).map(order => [right[0]!, ...order]),
	];
}

const sourceOrders = interleave(['A:start', 'A:progress', 'A:result'], ['B:start', 'B:progress', 'B:result']);
test.each(sourceOrders.map(order => [order.join(' '), order] as const))('interleaved source operations retain unique progress and results: %s', (_name, order) => {
	const { feedback, active } = fixture();
	const expected = new Map<string, { id: string; phase: string }>();
	const dedupe = { key: 'scan', scope: 'source' as const };
	for (const event of order) {
		const [operationId, phase] = event.split(':');
		const base = { ...input, operationId: operationId!, message: { key: event }, dedupe };
		if (phase === 'start') feedback.publish(base);
		else {
			if (phase === 'progress') feedback.publish({ ...base, progress: { completed: 1, total: 100 } });
			else if (operationId === 'A') feedback.publish({ ...base, outcome: 'success', receipt: { committed: true } });
			else feedback.publish({ ...base, outcome: 'failed' });
			const current = [...active.values()].filter(view => view.text === event);
			expect(current).toHaveLength(1);
			const previous = expected.get(operationId!);
			if (previous) expect(current[0]!.id).toBe(previous.id);
			expected.set(operationId!, { id: current[0]!.id, phase: phase! });
		}
		for (const [owner, state] of expected) {
			const current = active.get(state.id);
			expect(current?.text).toBe(`${owner}:${state.phase}`);
			if (state.phase === 'progress') expect(current).toEqual(expect.objectContaining({ progress: { completed: 1, total: 100 }, outcome: undefined, durationMs: 0 }));
			else expect(current).toEqual(expect.objectContaining({ progress: undefined, outcome: owner === 'A' ? 'success' : 'failed' }));
		}
		expect(new Set([...expected.values()].map(state => state.id)).size).toBe(expected.size);
	}
	expect(active.size).toBe(2);
	feedback.dispose();
});

test.each(['indeterminate', 'error', 'success', 'partial', 'failed', 'cancelled', 'locked'] as const)('a source hint cannot merge into another operation %s display', status => {
	const { feedback, active } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const };
	feedback.publish({ ...input, operationId: 'A', dedupe });
	const base = { ...input, operationId: 'A', message: { key: status }, dedupe };
	if (status === 'indeterminate') feedback.publish({ ...base, progress: { completed: 1 } });
	else if (status === 'error') feedback.publish({ ...base, level: 'error' });
	else if (status === 'success') feedback.publish({ ...base, outcome: status, receipt: { committed: true } });
	else feedback.publish({ ...base, outcome: status });
	const original = [...active.values()][0]!;
	feedback.publish({ ...input, operationId: 'B', message: { key: 'B starting' }, dedupe });
	expect(active.size).toBe(2);
	expect(active.get(original.id)).toEqual(original);
	expect([...active.values()].filter(view => view.text === 'B starting')).toHaveLength(1);
});

test.each(['error', 'success', 'failed'] as const)('expired %s status leaves no source hint that suppresses a later operation', status => {
	const { feedback, active, timers, setNow } = fixture();
	const dedupe = { key: 'scan', scope: 'source' as const };
	feedback.publish({ ...input, operationId: 'A', dedupe });
	const base = { ...input, operationId: 'A', dedupe };
	if (status === 'error') feedback.publish({ ...base, level: 'error' });
	else if (status === 'success') feedback.publish({ ...base, outcome: status, receipt: { committed: true } });
	else feedback.publish({ ...base, outcome: status });
	setNow(10000);
	for (const [id, expire] of [...timers]) { timers.delete(id); expire(); }
	feedback.publish({ ...input, operationId: 'B', message: { key: 'B starting' }, dedupe });
	expect([...active.values()]).toEqual([expect.objectContaining({ text: 'B starting', progress: undefined, outcome: undefined })]);
});

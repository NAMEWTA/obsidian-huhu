import { describe, expect, it } from 'vitest';
import { RunEvents } from './run-events';

const pageEvent = (pageId: string, runtimeId = 'runtime-A'): Parameters<RunEvents['append']>[1] => ({
	kind: 'page',
	spaceId: 'space-A',
	runtimeId,
	pageId,
});

describe('Run event recovery cursors', () => {
	it('binds replay to an explicit stream and takes a coherent snapshot/cursor across a reentrant update', () => {
		const events = new RunEvents(); events.open('run-A'); let version = 1, reads = 0;
		const snapshot = events.snapshot('run-A', () => {
			const captured = version;
			if (++reads === 1) { version++; events.append('run-A', pageEvent('page-changed')); }
			return { version: captured };
		});
		expect(snapshot).toMatchObject({ cursor: 1, projection: { version: 2 } });
		const [event] = events.poll('run-A', 0, snapshot.streamId);
		expect(event).toMatchObject({ eventId: expect.any(String), streamId: snapshot.streamId, streamSequence: 1, entityVersion: 1, type: 'pageChanged' });
		expect(() => events.poll('run-A', 0, 'another-stream')).toThrow('resync_required');
	});
	it('keeps independent cursors and returns event copies with their source runtime', () => {
		const events = new RunEvents();
		events.open('run-A');
		events.open('run-B');
		expect(events.cursor('run-A')).toBe(0);
		expect(events.poll('run-A')).toEqual([]);
		const input = pageEvent('page-A');
		events.append('run-A', input);
		input.runtimeId = 'changed-after-append';
		const [received] = events.poll('run-A');
		expect(received).toMatchObject({ sequence: 1, runtimeId: 'runtime-A', pageId: 'page-A' });
		received!.pageId = 'changed-after-poll';
		expect(events.poll('run-A')[0]?.pageId).toBe('page-A');
		expect(events.cursor('run-A')).toBe(1);
		expect(events.cursor('run-B')).toBe(0);
		expect(events.poll('run-B')).toEqual([]);
	});

	it('requires resync after eviction but accepts the exact retained boundary', () => {
		const events = new RunEvents();
		events.open('run-A');
		for (let i = 1; i <= 300; i++) events.append('run-A', pageEvent(`page-${i}`));
		expect(events.cursor('run-A')).toBe(300);
		expect(() => events.poll('run-A')).toThrowError('resync_required');
		expect(() => events.poll('run-A', 43)).toThrowError('resync_required');
		const retained = events.poll('run-A', 44);
		expect(retained).toHaveLength(256);
		expect(retained[0]?.sequence).toBe(45);
		expect(retained.at(-1)?.sequence).toBe(300);
		expect(events.poll('run-A', 300)).toEqual([]);
	});

	it('rejects future and malformed cursors instead of silently waiting past missing events', () => {
		const events = new RunEvents();
		events.open('run-A');
		expect(() => events.poll('run-A', 1)).toThrowError('invalid_event_cursor');
		events.append('run-A', pageEvent('page-A'));
		for (const cursor of [2, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
			expect(() => events.poll('run-A', cursor)).toThrowError('invalid_event_cursor');
	});

	it('replays changes during projection reads from the preceding health cursor without losing the next update', () => {
		const events = new RunEvents();
		events.open('run-A');
		events.append('run-A', pageEvent('page-before-projection'));
		const healthCursor = events.cursor('run-A');
		// The same update may already be present in a projection read after health.
		events.append('run-A', pageEvent('page-during-projection'));
		const replay = events.poll('run-A', healthCursor);
		expect(replay.map((event) => event.pageId)).toEqual(['page-during-projection']);
		const nextCursor = replay.at(-1)!.sequence;
		events.append('run-A', pageEvent('page-after-projection'));
		expect(events.poll('run-A', nextCursor).map((event) => event.pageId)).toEqual(['page-after-projection']);
	});

	it('revokes both polling and cursor reads and never resurrects a closed Run on late append', () => {
		const events = new RunEvents();
		events.open('run-A');
		events.append('run-A', pageEvent('page-A'));
		events.close('run-A');
		events.append('run-A', pageEvent('late-page'));
		expect(() => events.cursor('run-A')).toThrowError('resync_required');
		expect(() => events.poll('run-A')).toThrowError('resync_required');
		events.open('run-B');
		events.clear();
		expect(() => events.cursor('run-B')).toThrowError('resync_required');
	});
	it('bounds retained streams and permits only control/history notifications after sealing', () => {
		const events = new RunEvents(); events.open('retired'); events.append('retired', pageEvent('before')); events.seal('retired');
		events.append('retired', pageEvent('human-page')); events.append('retired', { kind: 'controlChanged', spaceId: 'space-A', runtimeId: 'runtime-A', state: 'human' });
		expect(events.poll('retired').map(row => row.type)).toEqual(['controlChanged']);
		for (let index = 0; index < 128; index++) { events.open(`run-${index}`); events.seal(`run-${index}`); }
		expect(() => events.poll('retired')).toThrow('resync_required');
	});
});

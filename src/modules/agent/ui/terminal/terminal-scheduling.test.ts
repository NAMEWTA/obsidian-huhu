import assert from 'node:assert/strict';
import { test } from 'vitest';
import { TerminalPresentation } from './terminal-presentation';
import { StableTerminalFit, type TerminalGrid } from './stable-terminal-fit';
import { HiddenRendererRetention } from './hidden-renderer-retention';
import {
	DEFAULT_SCREEN_PROFILE,
	SCREEN_ENGINE,
	type ScreenFrame,
	type ScreenPatch,
	type ScreenSnapshot,
	type ScreenStream,
} from '../../core/terminal/frames-screen';
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));
const at = { runtimeId: 'runtime', contentSequence: 1 };
const state: ScreenSnapshot['state'] = {
	applicationCursorKeys: false,
	applicationKeypad: false,
	bracketedPaste: false,
	sendFocus: false,
	mouseProtocol: 'NONE',
	mouseEncoding: 'DEFAULT',
	cursorHidden: false,
	cursorInitialized: true,
	synchronizedOutput: false,
	lastSyncCommandId: 0,
	colors: [],
};
const headers: ScreenSnapshot['buffers'] = [
	{
		name: 'normal',
		length: 1,
		baseY: 0,
		cursorX: 0,
		cursorY: 0,
		rows: [
			{
				key: 'row',
				isWrapped: false,
				cells: Array.from({ length: 2 }, () => ({ content: 1 << 22, fg: 0, bg: 0, chars: '', width: 1 })),
			},
		],
	},
	{ name: 'alternate', length: 0, baseY: 0, cursorX: 0, cursorY: 0, rows: [] },
];
function frames(): ScreenFrame[] {
	const header = {
		version: 1 as const,
		engine: SCREEN_ENGINE,
		at,
		geometry: { cols: 2, rows: 1 },
		active: 'normal' as const,
		state,
		output: 'complete' as const,
		buffers: headers.map(({ rows: _rows, ...h }) => h),
	};
	return [
		{ kind: 'snapshot-begin', snapshotId: 'snapshot', header },
		{
			kind: 'snapshot-row',
			snapshotId: 'snapshot',
			buffer: 'normal',
			index: 0,
			key: 'row',
			isWrapped: false,
			start: 0,
			cells: headers[0]!.rows[0]!.cells,
		},
		{ kind: 'snapshot-end', snapshotId: 'snapshot', at },
	];
}
function patch(): ScreenPatch {
	return {
		kind: 'patch',
		from: at,
		to: { ...at, contentSequence: 2 },
		geometry: { cols: 2, rows: 1 },
		active: 'normal',
		buffers: headers.map(({ rows: _rows, ...h }) => h),
		state,
		links: [],
		output: 'complete',
		operations: [],
		effects: [],
	};
}
function presentationFixture(initial = true, profile = DEFAULT_SCREEN_PROFILE) {
	const log: string[] = [],
		errors: unknown[] = [],
		receipts: unknown[] = [],
		statuses: string[] = [];
	let listener: (frame: ScreenFrame) => void = () => {},
		disposed = 0,
		recoveries = 0;
	const stream: ScreenStream = {
		runtimeId: at.runtimeId,
		applied: (mark) => receipts.push(mark),
		dispose: () => {
			disposed++;
		},
		resync: () => {
			recoveries++;
		},
	};
	const presentation = new TerminalPresentation(
		{
			open: (_, sink) => {
				listener = sink;
				if (initial) frames().forEach(sink);
				return stream;
			},
			installSnapshot: () => log.push('snapshot'),
			applyPatch: () => log.push('patch'),
			error: (error) => errors.push(error),
			status: (status) => statuses.push(status),
		},
		profile,
	);
	return {
		presentation,
		log,
		errors,
		receipts,
		statuses,
		emit: (frame: ScreenFrame) => listener(frame),
		get disposed() {
			return disposed;
		},
		get recoveries() {
			return recoveries;
		},
	};
}

test('synchronous initial delivery acknowledges only after the stream exists and complete commit', async () => {
	const f = presentationFixture();
	f.presentation.setVisible(true);
	assert.deepEqual(f.log, ['snapshot']);
	assert.deepEqual(f.receipts, []);
	await settled();
	assert.deepEqual(f.receipts, [at]);
	f.emit(patch());
	await settled();
	assert.deepEqual(f.log, ['snapshot', 'patch']);
	assert.deepEqual(f.errors, []);
	f.presentation.dispose();
});
test('fragmented snapshots and patch parts commit atomically before dependent actions or receipts', async () => {
	const f = presentationFixture(false);
	f.presentation.setVisible(true);
	const initial = frames();
	f.emit(initial[0]!);
	f.presentation.afterParsed(() => f.log.push('action'));
	f.emit(initial[1]!);
	assert.deepEqual(f.log, []);
	f.emit(initial[2]!);
	assert.deepEqual(f.log, ['snapshot', 'action']);
	const { operations, effects, links, ...header } = patch();
	f.emit({ kind: 'patch-part', patchId: 'p', index: 0, count: 2, header, operations, effects, links });
	f.presentation.afterParsed(() => f.log.push('patch-action'));
	assert.equal(f.log.at(-1), 'action');
	f.emit({ kind: 'patch-part', patchId: 'p', index: 1, count: 2, header, operations, effects, links });
	assert.deepEqual(f.log, ['snapshot', 'action', 'patch', 'patch-action']);
	await settled();
	assert.equal(f.receipts.length, 2);
	f.presentation.dispose();
});
test('hide and disposal fence stale frame callbacks and deferred receipts', async () => {
	const f = presentationFixture();
	f.presentation.setVisible(true);
	f.presentation.setVisible(false);
	f.emit(patch());
	await settled();
	assert.deepEqual(f.log, ['snapshot']);
	assert.deepEqual(f.receipts, []);
	assert.equal(f.disposed, 1);
	f.presentation.setVisible(true);
	f.presentation.dispose();
	await settled();
	assert.equal(f.disposed, 2);
	assert.deepEqual(f.receipts, []);
});
test('a gap requests one finite resync and a repeated failure stops without a retry loop', async () => {
	const f = presentationFixture();
	f.presentation.setVisible(true);
	await settled();
	f.emit({ ...patch(), from: { ...at, contentSequence: 99 } });
	await settled();
	assert.equal(f.recoveries, 1);
	assert.deepEqual(f.log, ['snapshot']);
	f.emit({ kind: 'resync-required', at, reason: 'pressure' });
	await settled();
	assert.equal(f.recoveries, 1);
	assert.equal(f.disposed, 1);
	assert.equal(f.statuses.at(-1), 'unavailable');
	f.presentation.dispose();
});
test('oversized snapshot headers and resource-limit cannot allocate rows or restart subscriptions', async () => {
	const f = presentationFixture(false);
	f.presentation.setVisible(true);
	const initial = frames()[0]!;
	if (initial.kind !== 'snapshot-begin') throw new Error('fixture');
	f.emit({
		...initial,
		header: {
			...initial.header,
			buffers: [{ ...initial.header.buffers[0]!, length: Number.MAX_SAFE_INTEGER }, initial.header.buffers[1]!],
		},
	});
	await settled();
	assert.deepEqual(f.log, []);
	assert.equal(f.disposed, 1);
	assert.equal(f.recoveries, 0);
	const g = presentationFixture();
	g.presentation.setVisible(true);
	g.emit({ kind: 'resync-required', at, reason: 'resource-limit' });
	await settled();
	assert.equal(g.statuses.at(-1), 'resource-limit');
	assert.equal(g.recoveries, 0);
	g.presentation.dispose();
	f.presentation.dispose();
});

function windowFrames() {
	let id = 0;
	const frames = new Map<number, FrameRequestCallback>(),
		cancelled: number[] = [];
	const win = {
		requestAnimationFrame(cb: FrameRequestCallback) {
			frames.set(++id, cb);
			return id;
		},
		cancelAnimationFrame(frame: number) {
			cancelled.push(frame);
			frames.delete(frame);
		},
	} as unknown as Window;
	return {
		win,
		frames,
		cancelled,
		tick() {
			const queued = [...frames.values()];
			frames.clear();
			for (const frame of queued) frame(0);
		},
	};
}

test('fit coalesces requests, waits for two stable grids and avoids unchanged native resizes', () => {
	const f = windowFrames(),
		applied: TerminalGrid[] = [];
	let current = { cols: 80, rows: 24 },
		proposed = { cols: 90, rows: 25 };
	const fit = new StableTerminalFit({
		propose: () => proposed,
		current: () => current,
		measurable: () => true,
		apply: (grid) => {
			applied.push(grid);
			current = grid;
		},
	});
	fit.request(f.win);
	fit.request(f.win);
	assert.equal(f.frames.size, 1);
	f.tick();
	assert.deepEqual(applied, []);
	proposed = { cols: 92, rows: 26 };
	f.tick();
	assert.deepEqual(applied, []);
	f.tick();
	assert.deepEqual(applied, [{ cols: 92, rows: 26 }]);
	fit.request(f.win);
	f.tick();
	assert.equal(applied.length, 1);
	assert.equal(f.frames.size, 0);
});

test('fit bounds an unstable layout to eight frames and cancels in its originating window', () => {
	const first = windowFrames(),
		second = windowFrames(),
		applied: TerminalGrid[] = [];
	let samples = 0;
	const fit = new StableTerminalFit({
		propose: () => ({ cols: 90 + samples++, rows: 24 }),
		current: () => ({ cols: 80, rows: 24 }),
		measurable: () => true,
		apply: (grid) => applied.push(grid),
	});
	fit.request(first.win);
	fit.request(second.win);
	assert.equal(first.cancelled.length, 1);
	assert.equal(first.frames.size, 0);
	for (let i = 0; i < 8; i++) second.tick();
	assert.equal(samples, 8);
	assert.deepEqual(applied, [{ cols: 97, rows: 24 }]);
	assert.equal(second.frames.size, 0);
	fit.request(second.win);
	fit.cancel();
	assert.equal(second.cancelled.length, 1);
});

test('hidden WebGL retention evicts the least recently hidden renderer with a budget of two', () => {
	const retention = new HiddenRendererRetention(2),
		evicted: string[] = [];
	const a = {},
		b = {},
		c = {},
		d = {};
	retention.retain(a, () => evicted.push('a'));
	retention.retain(b, () => evicted.push('b'));
	retention.retain(a, () => evicted.push('a'));
	retention.retain(c, () => evicted.push('c'));
	assert.deepEqual(evicted, ['b']);
	retention.release(a);
	retention.retain(d, () => evicted.push('d'));
	assert.deepEqual(evicted, ['b']);
	retention.retain(b, () => evicted.push('b'));
	assert.deepEqual(evicted, ['b', 'c']);
});

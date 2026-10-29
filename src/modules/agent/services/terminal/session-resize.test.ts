import assert from 'node:assert/strict';
import type { Terminal as Model } from '@xterm/headless';
import { test } from 'vitest';
import { TerminalSession } from './session';

function sessionFixture(scrollback = 100) {
	const encoder = new TextEncoder();
	const writes: string[] = [];
	const sizes: Array<{ cols: number; rows: number }> = [];
	let sent = 0;
	let acked = 0;
	const waiting = new Set<{
		target: number;
		resolve(): void;
		reject(error: Error): void;
		timer: ReturnType<typeof setTimeout>;
	}>();
	const session = new TerminalSession({
		id: 'k03-runtime',
		sid: 7,
		kind: 'shell',
		title: 'K03',
		cwd: '/fixture',
		cols: 39,
		rows: 18,
		scrollback,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
	});
	session.attach(
		{
			input: (_sid, data) => writes.push(typeof data === 'string' ? data : new TextDecoder().decode(data)),
			resize: (_sid, cols, rows) => {
				sizes.push({ cols, rows });
			},
			acknowledge: (_sid, bytes) => {
				acked += bytes;
				for (const entry of waiting) {
					if (acked < entry.target) continue;
					clearTimeout(entry.timer);
					waiting.delete(entry);
					entry.resolve();
				}
			},
			end: () => undefined,
		},
		1234,
	);
	// Read-only engine instrumentation checks missing rows that Session.text alone cannot expose.
	const model = (session as unknown as { model: Model }).model;
	const feedBytes = (bytes: Uint8Array) => {
		sent += bytes.length;
		const target = sent;
		const done = new Promise<void>((resolve, reject) => {
			const entry = {
				target,
				resolve,
				reject,
				timer: setTimeout(() => {
					waiting.delete(entry);
					reject(new Error(`Parse ACK stalled: ${acked}/${target}`));
				}, 2000),
			};
			waiting.add(entry);
		});
		session.receive(bytes);
		return done;
	};
	return {
		session,
		model,
		writes,
		sizes,
		feedBytes,
		feed: (text: string) => feedBytes(encoder.encode(text)),
		counts: () => ({ sent, acked }),
		dispose: () => {
			for (const entry of waiting) {
				clearTimeout(entry.timer);
				entry.reject(new Error('K03 fixture disposed before parse ACK'));
			}
			waiting.clear();
			session.dispose();
		},
	};
}

function liveViewport(model: Model, label: string): void {
	for (const buffer of [model.buffer.normal, model.buffer.alternate]) {
		if (!buffer.length) continue;
		assert.ok(
			buffer.length >= buffer.baseY + model.rows,
			`${label}: ${buffer.type} ${buffer.length} < ${buffer.baseY}+${model.rows}`,
		);
		assert.ok(buffer.baseY + buffer.cursorY < buffer.length, `${label}: cursor has no line`);
		for (let row = 0; row < model.rows; row++)
			assert.ok(buffer.getLine(buffer.baseY + row), `${label}: ${buffer.type} missing ${row}`);
	}
}

test.each([100, 5000, 10000])(
	'K03 natural production scrollback %i row growth preserves every viewport line and answers size queries',
	async (scrollback) => {
		const f = sessionFixture(scrollback);
		try {
			await f.feed(Array.from({ length: 22 }, (_, n) => `line-${n}\r\n`).join('') + '\x1b[4A');
			assert.equal(f.model.buffer.active.baseY, 5);
			assert.equal(f.model.buffer.active.length, 23);
			f.session.resize(37, 23);
			liveViewport(f.model, 'natural resized');
			console.info(
				'K03 natural after resize',
				JSON.stringify({
					scrollback,
					cols: f.session.cols,
					rows: f.session.rows,
					baseY: f.model.buffer.active.baseY,
					cursorY: f.model.buffer.active.cursorY,
					length: f.model.buffer.active.length,
				}),
			);
			for (let row = 18; row <= 22; row++) {
				await f.feed(`\x1b[${row + 1};1H\x1b[2Kbottom-${row}`);
				assert.equal(
					f.model.buffer.active.getLine(f.model.buffer.active.baseY + row)?.translateToString(true),
					`bottom-${row}`,
				);
			}
			await f.feed('\x1b[18t');
			assert.equal(f.writes.filter((data) => data === '\x1b[8;23;37t').length, 1);
			assert.deepEqual(f.sizes, [{ cols: 37, rows: 23 }]);
			assert.deepEqual(f.counts(), { sent: 297, acked: 297 });
		} finally {
			f.dispose();
		}
	},
);

test('K03 natural alternate growth keeps the alternate viewport and restores normal scrollback', async () => {
	const f = sessionFixture();
	try {
		await f.feed(Array.from({ length: 24 }, (_, n) => `normal-${n}\r\n`).join(''));
		const normal = f.session.text(200);
		await f.feed('\x1b[?1049hALT-TOP');
		assert.equal(f.model.buffer.active.type, 'alternate');
		f.session.resize(37, 23);
		liveViewport(f.model, 'alternate grown');
		await f.feed('\x1b[23;1H\x1b[2KALT-BOTTOM');
		assert.equal(f.model.buffer.active.getLine(22)?.translateToString(true), 'ALT-BOTTOM');
		await f.feed('\x1b[?1049l');
		liveViewport(f.model, 'normal restored');
		assert.equal(f.session.text(200), normal);
		assert.equal(f.model.buffer.active.type, 'normal');
	} finally {
		f.dispose();
	}
});

test('K03 natural sustained output keeps tokens through serialized shrink and growth', async () => {
	const f = sessionFixture(200);
	try {
		const grids = [
			{ cols: 39, rows: 18 },
			{ cols: 37, rows: 23 },
			{ cols: 48, rows: 6 },
			{ cols: 32, rows: 29 },
		];
		for (let n = 0; n < 60; n++) {
			await f.feed(`tick-${String(n).padStart(3, '0')}\r\n`);
			const grid = grids[n % grids.length]!;
			f.session.resize(grid.cols, grid.rows);
			liveViewport(f.model, `serialized operation ${n}`);
		}
		assert.deepEqual(
			f.session.text(300).match(/tick-\d{3}/g),
			Array.from({ length: 60 }, (_, n) => `tick-${String(n).padStart(3, '0')}`),
		);
		assert.equal(f.counts().acked, f.counts().sent);
	} finally {
		f.dispose();
	}
});

test('K03 natural queued UTF-8 and ANSI fragments survive adjacent resize calls', async () => {
	const f = sessionFixture(200);
	try {
		await f.feed(Array.from({ length: 22 }, (_, n) => `before-${n}\r\n`).join(''));
		for (let n = 0; n < 30; n++) {
			const bytes = new TextEncoder().encode(`\x1b[32mtick-${String(n).padStart(3, '0')}中文\x1b[0m\r\n`);
			const pending = [f.feedBytes(bytes.slice(0, 3)), f.feedBytes(bytes.slice(3, bytes.length - 8))];
			f.session.resize(37 + (n % 3), 18 + (n % 6));
			pending.push(f.feedBytes(bytes.slice(bytes.length - 8)));
			await Promise.all(pending);
			liveViewport(f.model, `queued operation ${n}`);
		}
		assert.deepEqual(
			f.session.text(300).match(/tick-\d{3}中文/g),
			Array.from({ length: 30 }, (_, n) => `tick-${String(n).padStart(3, '0')}中文`),
		);
		assert.ok(!f.session.text(300).includes('\ufffd'));
		assert.equal(f.counts().acked, f.counts().sent);
	} finally {
		f.dispose();
	}
});

test('K03 natural row growth at scrollback retention limit retains live rows', async () => {
	const f = sessionFixture(3);
	try {
		await f.feed(Array.from({ length: 40 }, (_, n) => `retained-${n}\r\n`).join(''));
		assert.equal(f.model.buffer.active.baseY, 3);
		assert.equal(f.model.buffer.active.length, 21);
		const before = f.session.text(100);
		f.session.resize(39, 26);
		liveViewport(f.model, 'retention limit growth');
		assert.equal(f.session.text(100), before);
		await f.feed('after-growth\r\n');
		liveViewport(f.model, 'retention limit after output');
		assert.ok(f.session.text(100).includes('after-growth'));
	} finally {
		f.dispose();
	}
});

function resizeSubmissionFixture() {
	const f = sessionFixture();
	type Result = import('../../../../shared/native/input').NativeResizeFinishedResult;
	type Queued = import('../../../../shared/native/input').NativeResizeQueuedResult;
	const operations: Array<{ op: number; queued(value: Queued): void; finished(value: Result): void }> = [];
	let throwing = false;
	f.session.bindPort({
		input() {},
		resize() {},
		acknowledge() {},
		end() {},
		submitResize() {
			if (throwing) throw new Error('unconfirmed resize');
			const op = operations.length + 1;
			let queued!: (value: Queued) => void, finished!: (value: Result) => void;
			const submission = {
				op,
				queued: new Promise<Queued>((resolve) => {
					queued = resolve;
				}),
				finished: new Promise<Result>((resolve) => {
					finished = resolve;
				}),
				cancel() {},
			};
			operations.push({ op, queued, finished });
			return submission;
		},
	});
	const lease = f.session.registerView('resize-owner');
	f.session.setViewVisible(lease, true);
	f.session.setViewFocused(lease, true);
	return {
		...f,
		lease,
		operations,
		throwing(value: boolean) {
			throwing = value;
		},
		request: (cols: number) => f.session.requestViewSize(lease, { cols, rows: 18 }),
		settled: async () => {
			await Promise.resolve();
			await f.session.whenParsed();
		},
	};
}

test('native resize diagnostics retain unresolved failure until the latest applied result', async () => {
	const f = resizeSubmissionFixture();
	try {
		await f.request(40);
		f.operations[0]!.finished({ op: 1, state: 'none', reason: 'capacity' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic?.state, 'none');
		assert.equal(f.session.resizeDiagnostic?.requestSequence, 1);
		assert.ok(f.session.resizeDiagnostic?.message);
		const failure = f.session.resizeDiagnostic;
		await f.request(41);
		assert.equal(f.session.resizeDiagnostic, failure);
		f.operations[1]!.finished({ op: 2, state: 'superseded' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic, failure);
		f.throwing(true);
		await f.request(42);
		await f.settled();
		assert.equal(f.session.resizeDiagnostic?.state, 'unknown');
		assert.equal(f.session.resizeDiagnostic?.requestSequence, 3);
		assert.equal(f.session.resizeDiagnostic?.op, undefined);
		f.throwing(false);
		await f.request(43);
		f.operations[2]!.finished({ op: 3, state: 'applied' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic, undefined);
		// An already completed operation cannot regress the current native geometry to queued.
		f.operations[2]!.queued({ op: 3, state: 'queued' });
		await f.settled();
		const frames: import('../../core/terminal/frames-screen').ScreenFrame[] = [];
		const stream = f.session.openScreen({}, (frame) => frames.push(frame));
		try {
			assert.equal(
				frames.find((frame) => frame.kind === 'snapshot-begin')?.header.nativeGeometry?.state,
				'applied',
			);
		} finally {
			stream.dispose();
		}
	} finally {
		f.dispose();
	}
});

test('late old resize failure cannot overwrite a newer applied request or another view owner', async () => {
	const f = resizeSubmissionFixture();
	try {
		await f.request(40);
		const next = f.session.registerView('new-owner');
		f.session.setViewVisible(next, true);
		f.session.setViewFocused(next, true);
		await f.session.requestViewSize(next, { cols: 41, rows: 18 });
		f.operations[1]!.finished({ op: 2, state: 'applied' });
		await f.settled();
		f.operations[0]!.finished({ op: 1, state: 'unknown', reason: 'transport-lost' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic, undefined);
		assert.equal(f.session.cols, 41);
		assert.equal((await f.request(42)).status, 'rejected');
	} finally {
		f.dispose();
	}
});

test('applied resize clears only its own compatibility error and preserves another channel message', async () => {
	const f = resizeSubmissionFixture();
	try {
		await f.request(40);
		f.operations[0]!.finished({ op: 1, state: 'none', reason: 'capacity' });
		await f.settled();
		assert.equal(f.session.error, f.session.resizeDiagnostic?.message);
		await f.request(41);
		f.operations[1]!.finished({ op: 2, state: 'applied' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic, undefined);
		assert.equal(f.session.error, undefined);
		await f.request(42);
		f.operations[2]!.finished({ op: 3, state: 'unknown', reason: 'timeout' });
		await f.settled();
		f.session.inputFailure({ op: 9, state: 'unknown', reason: 'write-failed' });
		const input = f.session.inputDiagnostic?.message;
		assert.ok(input);
		await f.request(43);
		f.operations[3]!.finished({ op: 4, state: 'applied' });
		await f.settled();
		assert.equal(f.session.resizeDiagnostic, undefined);
		assert.equal(f.session.error, input);
	} finally {
		f.dispose();
	}
});

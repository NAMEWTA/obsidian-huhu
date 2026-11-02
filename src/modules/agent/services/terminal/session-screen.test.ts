import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { TerminalSession, type SessionPort } from './session';
import { DEFAULT_SCREEN_PROFILE, screenGridAllowed, type ScreenFrame } from '../../core/terminal/frames-screen';

function fixture(over: Partial<ConstructorParameters<typeof TerminalSession>[0]> = {}) {
	let parsed: () => void = () => undefined;
	const session = new TerminalSession({
		id: 'screen-runtime',
		sid: 7,
		kind: 'shell',
		title: 'Shell',
		cwd: '/fixture',
		cols: 20,
		rows: 4,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }),
		...over,
	});
	session.attach(
		{ input: () => undefined, resize: () => undefined, acknowledge: () => parsed(), end: () => undefined },
		1234,
	);
	return {
		session,
		feed: (text: string) =>
			new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => reject(new Error('parse ACK timeout')), 2000);
				parsed = () => {
					clearTimeout(timer);
					resolve();
				};
				session.receive(new TextEncoder().encode(text));
			}),
	};
}

test('a screen subscriber joins one parsed watermark without replaying an incomplete CSI', async () => {
	const f = fixture();
	try {
		await f.feed('before\x1b[');
		const target = f.session;
		assert.equal(typeof target.openScreen, 'function', 'the authority must provide a typed parsed screen stream');
		const frames: ScreenFrame[] = [];
		const stream = target.openScreen({}, (frame) => frames.push(frame));
		const end = frames.find((frame) => frame.kind === 'snapshot-end');
		assert.equal(end?.kind, 'snapshot-end');
		if (end?.kind !== 'snapshot-end') throw new Error('Missing join watermark');
		assert.deepEqual(end.at, { runtimeId: 'screen-runtime', contentSequence: 1 });
		const row = frames.find(
			(frame) => frame.kind === 'snapshot-row' && frame.buffer === 'normal' && frame.index === 0,
		);
		assert.equal(row?.kind === 'snapshot-row' ? row.cells.map((cell) => cell.chars).join('') : '', 'before');
		stream.applied(end.at);
		await f.feed('31mAFTER');
		const patch = frames.find((frame) => frame.kind === 'patch');
		assert.equal(patch?.kind, 'patch');
		if (patch?.kind !== 'patch') throw new Error('Missing continuous patch');
		assert.deepEqual(patch.from, end.at);
		assert.deepEqual(patch.to, { runtimeId: 'screen-runtime', contentSequence: 2 });
		const cells = patch.operations.flatMap((op) => (op.kind === 'cells' ? op.cells : []));
		assert.equal(cells.map((cell) => cell.chars).join(''), 'AFTER');
		assert.ok(
			cells.every((cell) => (cell.fg & 255) === 1),
			'SGR completed in the authority before export',
		);
		assert.ok(
			!JSON.stringify(frames).includes('31mAFTER'),
			'view frames must contain parsed cells, never a raw continuation',
		);
		stream.dispose();
	} finally {
		f.session.dispose();
	}
});

test.each(['b', 'S', 'T', 'I', 'Z', 'L', 'M'])(
	'a completed CSI %s above the finite work budget fails before engine expansion',
	async (final) => {
		const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxCommandWork: 8 } });
		try {
			await f.feed('X');
			f.session.receive(new TextEncoder().encode(`\x1b[9${final}`));
			await f.session.readScreen({ expectedRuntimeId: f.session.id });
			assert.equal(f.session.getScreenUsage().status, 'resource-limit');
		} finally {
			f.session.dispose();
		}
	},
);

test('screen geometry rejects non-finite values and total cell overflow before allocation', () => {
	for (const grid of [
		{ cols: Infinity, rows: 4 },
		{ cols: 20, rows: NaN },
		{ cols: 0, rows: 1 },
		{ cols: 512, rows: 256 },
	])
		assert.equal(screenGridAllowed(grid, 10000, DEFAULT_SCREEN_PROFILE), false);
	assert.equal(screenGridAllowed({ cols: 80, rows: 24 }, 5000, DEFAULT_SCREEN_PROFILE), true);
});

test('numeric exit observers see earlier output and the final local notice already parsed', async () => {
	const f = fixture();
	const events: string[] = [];
	let atExit = '';
	try {
		f.session.observe((event) => {
			events.push(event.kind);
			if (event.kind === 'exit') atExit = f.session.text();
		});
		const output = f.feed('last-output');
		f.session.exit(7, null);
		await output;
		await f.session.readScreen({ expectedRuntimeId: f.session.id });
		assert.deepEqual(events, ['data', 'exit']);
		assert.ok(atExit.includes('last-output'));
		assert.ok(atExit.includes('Process exited: 7'));
	} finally {
		f.session.dispose();
	}
});

test('structural edits are replayable against the prior rows after one batch trims history repeatedly', async () => {
	const f = fixture({ rows: 2, scrollback: 20 });
	try {
		const frames: ScreenFrame[] = [];
		const stream = f.session.openScreen({}, (frame) => frames.push(frame));
		const end = frames.find((frame) => frame.kind === 'snapshot-end');
		assert.equal(end?.kind, 'snapshot-end');
		if (end?.kind !== 'snapshot-end') throw new Error('No join');
		stream.applied(end.at);
		const keys: Record<string, string[]> = { normal: [], alternate: [] };
		for (const frame of frames)
			if (frame.kind === 'snapshot-row' && frame.start === 0) keys[frame.buffer]!.push(frame.key);
		await f.feed('\r\n'.repeat(28));
		for (const frame of frames)
			if (frame.kind === 'patch')
				for (const op of frame.operations) {
					const rows = keys[op.buffer]!;
					if (op.kind === 'trim-start') {
						assert.ok(op.count <= rows.length, 'trim is a real operation on the prior rows');
						rows.splice(0, op.count);
					} else if (op.kind === 'delete-rows') {
						assert.ok(op.index + op.count <= rows.length);
						rows.splice(op.index, op.count);
					} else if (op.kind === 'insert-rows') {
						assert.ok(op.index <= rows.length);
						rows.splice(op.index, 0, ...op.keys);
					} else if (op.kind === 'replace-buffer') keys[op.buffer] = [...op.keys];
					else if (op.kind === 'truncate-end') rows.length = op.length;
				}
		assert.equal(keys.normal!.length, 22);
		stream.dispose();
	} finally {
		f.session.dispose();
	}
});

test('explicit repeated focus on the same lease remains its size owner', async () => {
	const f = fixture();
	try {
		const lease = f.session.registerView('one');
		f.session.setViewVisible(lease, true);
		assert.equal(f.session.setViewFocused(lease, true), true);
		assert.equal(f.session.setViewFocused(lease, true), true);
		assert.equal((await f.session.requestViewSize(lease, { cols: 30, rows: 5 })).status, 'accepted');
	} finally {
		f.session.dispose();
	}
});

test('cursor blink tracks DEC mode 12 while DECSCUSR overrides and reset restores its option', async () => {
	const f = fixture();
	const states: Array<boolean | undefined> = [];
	let stream: ReturnType<TerminalSession['openScreen']> | undefined;
	try {
		stream = f.session.openScreen({}, (frame) => {
			if (frame.kind === 'snapshot-end') queueMicrotask(() => stream?.applied(frame.at));
			if (frame.kind === 'patch') {
				states.push(frame.state.cursorBlink);
				queueMicrotask(() => stream?.applied(frame.to));
			}
		});
		await f.feed('\x1b[?12h');
		await f.feed('\x1b[?12l');
		await f.feed('\x1b[5 q');
		await f.feed('\x1b[0 q');
		assert.deepEqual(states, [true, false, true, false]);
	} finally {
		stream?.dispose();
		f.session.dispose();
	}
});

test('reusing a read cursor repeats the same stable page after new output', async () => {
	const f = fixture();
	try {
		await f.feed('abcdefghijklmno\r\nsecond-line');
		const first = await f.session.readScreen({ expectedRuntimeId: f.session.id, maxBytes: 4, maxRows: 1 });
		assert.equal(first.status, 'ok');
		if (first.status !== 'ok' || !first.nextCursor) throw new Error('No cursor');
		const next = await f.session.readScreen({
			expectedRuntimeId: f.session.id,
			cursor: first.nextCursor,
			maxBytes: 4,
		});
		await f.feed('\r\nnew-output');
		assert.deepEqual(
			await f.session.readScreen({ expectedRuntimeId: f.session.id, cursor: first.nextCursor, maxBytes: 4 }),
			next,
		);
	} finally {
		f.session.dispose();
	}
});

test('read page never skips a codepoint that does not fit its UTF8 byte budget', async () => {
	const f = fixture();
	try {
		await f.feed('a😀b');
		const first = await f.session.readScreen({ expectedRuntimeId: f.session.id, maxBytes: 4 });
		assert.equal(first.status, 'ok');
		if (first.status !== 'ok' || !first.nextCursor) throw new Error('No next page');
		assert.equal(first.text, 'a');
		const second = await f.session.readScreen({
			expectedRuntimeId: f.session.id,
			maxBytes: 4,
			cursor: first.nextCursor,
		});
		assert.equal(second.status === 'ok' ? second.text : '', '😀');
		assert.deepEqual(
			await f.session.readScreen({ expectedRuntimeId: f.session.id, maxBytes: 4, cursor: first.nextCursor }),
			second,
		);
	} finally {
		f.session.dispose();
	}
});

test('historical read snapshots consume the runtime budget and expire without advancing cursors', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	const start = Date.now();
	const f = fixture({
		cols: 80,
		rows: 24,
		screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxRuntimeBytes: 5_800_000, readTtlMs: 10_000 },
	});
	try {
		await f.feed('first');
		let rejected = false;
		for (let i = 0; i < 16; i++) {
			await f.feed(`\r\n${i}`);
			const result = await f.session.readScreen({ expectedRuntimeId: f.session.id, maxBytes: 4 });
			if (result.status === 'rejected' && result.reason === 'resource-limit') {
				rejected = true;
				break;
			}
		}
		assert.equal(rejected, true);
		const usage = f.session.getScreenUsage();
		assert.ok(usage.readTokens < 16, 'old versions must participate in the same runtime allocation admission');
		vi.setSystemTime(start + 10_001);
		const next = await f.session.readScreen({ expectedRuntimeId: f.session.id, maxBytes: 4 });
		assert.equal(next.status, 'ok');
		assert.equal(f.session.getScreenUsage().readTokens, 1);
	} finally {
		f.session.dispose();
		vi.useRealTimers();
	}
});

test('one slow or throwing screen observer cannot block parse ACK or the fast observer', async () => {
	const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxObserverBytes: 20000 } });
	const slow: ScreenFrame[] = [],
		fast: ScreenFrame[] = [];
	let quick: ReturnType<TerminalSession['openScreen']> | undefined;
	try {
		const stuck = f.session.openScreen({}, (frame) => slow.push(frame));
		f.session.openScreen({}, () => {
			throw new Error('hostile sink');
		});
		quick = f.session.openScreen({}, (frame) => {
			fast.push(frame);
			const at =
				frame.kind === 'snapshot-end'
					? frame.at
					: frame.kind === 'patch'
						? frame.to
						: frame.kind === 'patch-part' && frame.index === frame.count - 1
							? frame.header.to
							: undefined;
			if (at) queueMicrotask(() => quick?.applied(at));
		});
		for (let i = 0; i < 24; i++) await f.feed(`\r\nline${i}\x1b[6n`);
		assert.equal(f.session.getScreenUsage().status, 'ok');
		assert.ok(slow.some((frame) => frame.kind === 'resync-required' && frame.reason === 'pressure'));
		const gap = slow.findIndex((frame) => frame.kind === 'resync-required');
		assert.equal(slow.length, gap + 1, 'a pressure observer stays paused until its explicit resync');
		assert.ok(fast.some((frame) => frame.kind === 'patch' && frame.to.contentSequence >= 24));
		assert.ok(f.session.getScreenUsage().observerBytes <= 40000);
		stuck.resync();
		assert.equal(slow.at(-1)?.kind, 'snapshot-end');
		stuck.dispose();
	} finally {
		quick?.dispose();
		f.session.dispose();
	}
});

test('a resource fault abandons only unparsed display bytes, never acknowledges them as parsed', async () => {
	const session = new TerminalSession({
		id: 'resource',
		sid: 11,
		kind: 'shell',
		title: 'Shell',
		cwd: '/fixture',
		cols: 20,
		rows: 4,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxCommandWork: 8 },
	});
	const events: string[] = [];
	session.attach(
		{
			outputAbandon: 1,
			abandonOutput: (sid) => {
				assert.equal(sid, 11);
				events.push('abandon');
			},
			resourceLimit: () => events.push('stop'),
			input: () => undefined,
			resize: () => undefined,
			acknowledge: () => events.push('ack'),
			end: () => undefined,
		},
		1234,
	);
	try {
		session.receive(new TextEncoder().encode('X\x1b[9bTAIL'));
		await session.whenParsed();
		assert.equal(session.getScreenUsage().status, 'resource-limit');
		assert.equal(session.getScreenUsage().pendingRawBytes, 0);
		assert.deepEqual(events, ['stop', 'abandon']);
		const read = await session.readScreen({ expectedRuntimeId: session.id });
		assert.equal(read.status === 'ok' ? read.output : '', 'truncated');
		session.receive(new TextEncoder().encode('after abandon'));
		assert.equal(session.getScreenUsage().pendingRawBytes, 0);
	} finally {
		session.dispose();
	}
});

test('geometry and scrollback reserve bytes before changing the model; stale focus cannot regain a queued request', async () => {
	const f = fixture({
		screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxRuntimeBytes: 8_000_000, maxModelBytes: 100000 },
	});
	try {
		const a = f.session.registerView('a'),
			b = f.session.registerView('b');
		f.session.setViewVisible(a, true);
		f.session.setViewVisible(b, true);
		f.session.setViewFocused(a, true);
		assert.equal((await f.session.requestViewSize(a, { cols: 400, rows: 200 })).status, 'rejected');
		assert.equal(f.session.cols, 20);
		assert.equal(f.session.rows, 4);
		const output = f.feed('queued');
		const request = f.session.requestViewSize(a, { cols: 21, rows: 4 });
		f.session.setViewFocused(b, true);
		f.session.setViewFocused(a, true);
		assert.deepEqual(await request, { status: 'rejected', reason: 'not-owner' });
		await output;
		let stops = 0;
		f.session.bindPort({
			...(Reflect.get(f.session, 'port') as SessionPort),
			resourceLimit: () => {
				stops++;
			},
			end: () => {
				stops++;
			},
		});
		f.session.setScrollback(10000);
		await f.session.whenParsed();
		assert.equal(stops, 0);
		assert.equal(f.session.getScreenUsage().status, 'ok');
		assert.equal(f.session.cols, 20);
		assert.match(f.session.error ?? '', /回滚行数|scrollback/i);
		assert.equal((Reflect.get(f.session, 'model') as { options: { scrollback: number } }).options.scrollback, 100);
	} finally {
		f.session.dispose();
	}
});

test('extended underline color changes invalidate cached cells even when packed style bits stay equal', async () => {
	const f = fixture();
	let stream: ReturnType<TerminalSession['openScreen']> | undefined;
	const colors: number[] = [];
	try {
		stream = f.session.openScreen({}, (frame) => {
			if (frame.kind === 'snapshot-end') queueMicrotask(() => stream?.applied(frame.at));
			if (frame.kind === 'patch') {
				for (const op of frame.operations)
					if (op.kind === 'cells')
						for (const cell of op.cells)
							if (cell.chars === 'X') colors.push(cell.extended?.underlineColor ?? -1);
				queueMicrotask(() => stream?.applied(frame.to));
			}
		});
		await f.feed('\x1b[4:3;58:2::255:0:0mX');
		await f.feed('\r\x1b[4:3;58:2::0:255:0mX');
		assert.equal(colors.length, 2);
		assert.notEqual(colors[0], colors[1]);
	} finally {
		stream?.dispose();
		f.session.dispose();
	}
});

test('disposed queued queries settle and a disposed runtime rejects new reads', async () => {
	const f = fixture();
	f.session.receive(new TextEncoder().encode('pending'));
	const read = f.session.readScreen({ expectedRuntimeId: f.session.id });
	f.session.dispose();
	assert.deepEqual(await read, { status: 'rejected', reason: 'disposed' });
	assert.deepEqual(await f.session.readScreen({ expectedRuntimeId: f.session.id }), {
		status: 'rejected',
		reason: 'disposed',
	});
});

test('default profile accounts two built-in view leases, retains hidden copies and releases only on unregister', async () => {
	const f = fixture({ cols: 80, rows: 24, scrollback: 5000 });
	const budget = Reflect.get(Reflect.get(f.session, 'screen') as object, 'budget') as {
		readonly bytes: number;
		readonly allocations: Map<object, number>;
	};
	try {
		const a = f.session.registerView('primary'),
			b = f.session.registerView('follower');
		f.session.setViewVisible(a, true);
		f.session.setViewFocused(a, true);
		f.session.setViewVisible(b, true);
		await f.feed(Array.from({ length: 60 }, (_, i) => `view-line-${i}:中😀\r\n`).join(''));
		const withBoth = budget.allocations.get(f.session)!;
		f.session.setViewVisible(b, false);
		assert.equal(
			budget.allocations.get(f.session),
			withBoth,
			'hidden renderer/shadow/Search ownership is retained',
		);
		f.session.unregisterView(b);
		assert.ok(budget.allocations.get(f.session)! < withBoth);
		assert.ok(withBoth < DEFAULT_SCREEN_PROFILE.maxRuntimeBytes);
		assert.ok(budget.bytes < DEFAULT_SCREEN_PROFILE.maxAgentBytes);
		console.info(
			'[T05 two view allocation]',
			JSON.stringify({
				formula: '6P_high+2M_high+4frame+links/markers',
				views: 2,
				lines: 60,
				cols: 80,
				rows: 24,
				scrollback: 5000,
				withBoth,
				afterUnregister: budget.allocations.get(f.session),
				runtimeRemaining: DEFAULT_SCREEN_PROFILE.maxRuntimeBytes - withBoth,
				agentBytes: budget.bytes,
				usage: f.session.getScreenUsage(),
				rss: process.memoryUsage().rss,
			}),
		);
	} finally {
		f.session.dispose();
	}
});

test('native geometry receipts retain the latest operation while old late receipts cannot replace it', async () => {
	const f = fixture();
	const operations: Array<{
		op: number;
		queue(value: { op: number; state: 'queued' }): void;
		finish(value: { op: number; state: 'applied' }): void;
	}> = [];
	const frames: ScreenFrame[] = [];
	let stream: ReturnType<TerminalSession['openScreen']> | undefined;
	f.session.bindPort({
		input: () => undefined,
		resize: () => assert.fail('legacy resize'),
		acknowledge: () => undefined,
		end: () => undefined,
		submitResize: () => {
			const op = operations.length + 1;
			let queue!: (value: { op: number; state: 'queued' }) => void,
				finish!: (value: { op: number; state: 'applied' }) => void;
			const queued = new Promise<{ op: number; state: 'queued' }>((resolve) => {
				queue = resolve;
			});
			const finished = new Promise<{ op: number; state: 'applied' }>((resolve) => {
				finish = resolve;
			});
			operations.push({ op, queue, finish });
			return { op, queued, finished, cancel: () => undefined };
		},
	});
	try {
		stream = f.session.openScreen({}, (frame) => {
			frames.push(frame);
			const at = frame.kind === 'snapshot-end' ? frame.at : frame.kind === 'patch' ? frame.to : undefined;
			if (at) queueMicrotask(() => stream?.applied(at));
		});
		const lease = f.session.registerView('owner');
		f.session.setViewVisible(lease, true);
		f.session.setViewFocused(lease, true);
		await f.session.requestViewSize(lease, { cols: 30, rows: 5 });
		await f.session.requestViewSize(lease, { cols: 31, rows: 5 });
		operations[1]!.queue({ op: 2, state: 'queued' });
		operations[1]!.finish({ op: 2, state: 'applied' });
		await Promise.resolve();
		await f.session.whenParsed();
		operations[0]!.queue({ op: 1, state: 'queued' });
		operations[0]!.finish({ op: 1, state: 'applied' });
		await Promise.resolve();
		await f.session.whenParsed();
		const latest = frames.filter((frame) => frame.kind === 'patch').at(-1);
		assert.equal(latest?.kind, 'patch');
		assert.deepEqual(latest?.kind === 'patch' ? latest.nativeGeometry : undefined, { op: 2, state: 'applied' });
		f.session.bindPort({
			...(Reflect.get(f.session, 'port') as SessionPort),
			submitResize: () => {
				throw new Error('captured transport lost');
			},
		});
		const lost = await f.session.requestViewSize(lease, { cols: 32, rows: 5 });
		assert.equal(lost.status === 'accepted' ? lost.native : '', 'unknown');
	} finally {
		stream?.dispose();
		f.session.dispose();
	}
});

test('REP reserves the repeated combining text before changing the model', async () => {
	const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxCombiningUnits: 12 } });
	try {
		await f.feed('x\u0301');
		f.session.receive(new TextEncoder().encode('\x1b[6b'));
		await f.session.whenParsed();
		assert.equal(f.session.getScreenUsage().status, 'resource-limit');
		assert.ok(
			f.session.getScreenUsage().combiningUnits <= 12,
			'pre-admission must protect the retained model, not only report an oversized model afterwards',
		);
	} finally {
		f.session.dispose();
	}
});

test('fragmented OSC8 URI capacity is admitted before a retained link is created', async () => {
	const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxLinkUnits: 64 } });
	try {
		const text = `\x1b]8;;https://example.invalid/${'a'.repeat(100)}\x07X`;
		f.session.receive(new TextEncoder().encode(text));
		await f.session.whenParsed();
		assert.equal(f.session.getScreenUsage().status, 'resource-limit');
		assert.ok(f.session.getScreenUsage().linkUnits <= 64);
	} finally {
		f.session.dispose();
	}
});

test('legacy asynchronous join delivers pending output exactly once and cancellation prevents a late initial callback', async () => {
	const f = fixture();
	const seen: string[] = [];
	try {
		f.session.receive(new TextEncoder().encode('pending-watermark'));
		const off = f.session.subscribe((text) => seen.push(text));
		let cancelled = 0;
		const cancel = f.session.subscribe(() => {
			cancelled++;
		});
		cancel();
		await f.session.whenParsed();
		await Promise.resolve();
		assert.equal(seen.join('').split('pending-watermark').length - 1, 1);
		assert.equal(cancelled, 0);
		off();
	} finally {
		f.session.dispose();
	}
});

test('legacy initial/backlog reservations share screen usage and release when cancelled', async () => {
	const f = fixture();
	try {
		const off = f.session.subscribe(() => undefined);
		assert.equal(f.session.getScreenUsage().observers, 1);
		assert.ok(f.session.getScreenUsage().observerBytes >= DEFAULT_SCREEN_PROFILE.maxObserverBytes * 3);
		off();
		await Promise.resolve();
		assert.equal(f.session.getScreenUsage().observers, 0);
		assert.equal(f.session.getScreenUsage().observerBytes, 0);
	} finally {
		f.session.dispose();
	}
});

test('legacy serialization rejects link expansion before allocating the result while parsed reads remain usable', async () => {
	const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxSnapshotBytes: 65536 } });
	try {
		for (let i = 0; i < 20; i++)
			await f.feed(`\x1b]8;id=${i % 2};https://example.invalid/${'a'.repeat(5000)}${i % 2}\x07X\x1b]8;;\x07`);
		assert.equal(f.session.getScreenUsage().status, 'ok');
		const serializer = Reflect.get(f.session, 'serializer') as { serialize(): string };
		const serialize = vi.spyOn(serializer, 'serialize');
		assert.throws(() => f.session.snapshot());
		assert.equal(
			serialize.mock.calls.length,
			0,
			'capacity is checked before SerializeAddon constructs any URI expansion',
		);
		assert.equal((await f.session.readScreen({ expectedRuntimeId: f.session.id })).status, 'ok');
		assert.equal(f.session.getScreenUsage().observerBytes, 0);
	} finally {
		f.session.dispose();
	}
});

test('CSI work admission reads the main value even when the parameter has subparameters', async () => {
	const f = fixture({ screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxCommandWork: 8 } });
	try {
		f.session.receive(new TextEncoder().encode('\x1b[9:1S'));
		await f.session.whenParsed();
		assert.equal(f.session.getScreenUsage().status, 'resource-limit');
	} finally {
		f.session.dispose();
	}
});

test('parsed RIS exports reset semantics and a new ordered synchronized-output token', async () => {
	const f = fixture();
	const frames: ScreenFrame[] = [];
	const stream = f.session.openScreen({}, (frame) => frames.push(frame));
	const acknowledge = () => {
		for (const frame of frames)
			if (frame.kind === 'snapshot-end' || frame.kind === 'patch')
				stream.applied(frame.kind === 'patch' ? frame.to : frame.at);
	};
	try {
		acknowledge();
		frames.length = 0;
		await f.feed('\x1b[?2026hSELECTME');
		const enabled = frames.find((frame) => frame.kind === 'patch');
		assert.ok(enabled?.kind === 'patch');
		const priorToken = enabled.state.lastSyncCommandId;
		acknowledge();
		frames.length = 0;
		await f.feed('\x1b');
		assert.ok(
			frames.every(
				(frame) =>
					frame.kind !== 'patch' ||
					!frame.operations.some((op) => op.kind === 'replace-buffer' && op.reason === 'reset'),
			),
		);
		acknowledge();
		frames.length = 0;
		await f.feed('cNEW TEXT');
		const reset = frames.find((frame) => frame.kind === 'patch');
		assert.ok(reset?.kind === 'patch');
		assert.deepEqual(
			reset.operations.filter((op) => op.kind === 'replace-buffer').map((op) => op.reason),
			['reset', 'reset'],
		);
		assert.equal(reset.state.synchronizedOutput, false);
		assert.ok(reset.state.lastSyncCommandId > priorToken);
		assert.deepEqual(
			reset.effects.filter((effect) => effect.kind === 'sync-output').map((effect) => effect.enabled),
			[false],
		);
		acknowledge();
		frames.length = 0;
		await f.feed('\x1b[?2026h\x1bc\x1b[?2026h\x1bc\x1b[?2026l');
		const ordered = frames.find((frame) => frame.kind === 'patch');
		assert.ok(ordered?.kind === 'patch');
		assert.deepEqual(
			ordered.effects.filter((effect) => effect.kind === 'sync-output').map((effect) => effect.enabled),
			[true, false, true, false, false],
		);
		assert.equal(ordered.state.lastSyncCommandId, ordered.effects.at(-1)!.id);
		assert.equal(ordered.state.synchronizedOutput, false);
		acknowledge();
		frames.length = 0;
		f.session.reset();
		await f.session.whenParsed();
		const menu = frames.find((frame) => frame.kind === 'patch');
		assert.ok(menu?.kind === 'patch');
		assert.ok(menu.operations.some((op) => op.kind === 'replace-buffer' && op.reason === 'reset'));
	} finally {
		stream.dispose();
		f.session.dispose();
	}
});

import assert from 'node:assert/strict';
import { activitySummaryAllowed, type ActivitySourceMeta } from '../../core/workspace/managed-runtime';
import { test, vi } from 'vitest';
import { oscColor, TerminalSession, type SessionEvent } from './session';
import { hookActivity } from './sessions';
import { hookActivityConsumer } from '../../platform/desktop/hooks/automation-hooks';
import { NativeReplyError } from '../../../../shared/native/host';

const ESC = '\x1b';
const encoder = new TextEncoder();

test('disposed terminals stop readiness waits and reject late prompt writes', () => {
	const { session, sent } = fixture();
	session.dispose();
	assert.equal(session.running, false);
	session.input('late prompt\r');
	assert.deepEqual(sent, []);
});

function fixture(over: Partial<ConstructorParameters<typeof TerminalSession>[0]> = {}) {
	const sent: string[] = [];
	const acks: number[] = [];
	const session = new TerminalSession({
		id: 'terminal-test',
		sid: 7,
		kind: 'shell',
		title: 'Shell',
		cwd: '/vault',
		cols: 80,
		rows: 24,
		scrollback: 1000,
		platform: 'linux',
		colors: () => ({ foreground: '#d4d4d4', background: '#1e1e1e', cursor: '#ffffff' }),
		...over,
	});
	session.attach(
		{
			input: (_sid, data) => sent.push(typeof data === 'string' ? data : new TextDecoder().decode(data)),
			resize: () => {},
			acknowledge: (_sid, bytes) => acks.push(bytes),
			end: () => {},
		},
		1234,
	);
	/** Feed output and wait until the model parsed it. */
	const feed = (text: string) =>
		new Promise<void>((resolve) => {
			session.receive(encoder.encode(text));
			session.subscribe(() => {})();
			setTimeout(resolve, 20);
		});
	return { session, sent, acks, feed };
}

test('the model answers device queries, color queries and size reports exactly once', async () => {
	const { sent, feed } = fixture();
	await feed(`${ESC}[c${ESC}[6n${ESC}]11;?\x07${ESC}[18t`);
	assert.ok(sent.includes(`${ESC}[?1;2c`), JSON.stringify(sent));
	assert.ok(sent.includes(`${ESC}[1;1R`));
	assert.ok(sent.includes(`${ESC}]11;rgb:1e1e/1e1e/1e1e${ESC}\\`));
	assert.ok(sent.includes(`${ESC}[8;24;80t`));
	assert.equal(sent.filter((reply) => reply === `${ESC}[1;1R`).length, 1);
});

test('kitty flags and win32-input-mode follow the application', async () => {
	const { session, sent, feed } = fixture();
	await feed(`${ESC}[>1u${ESC}[?u`);
	assert.equal(session.keyboard.kitty, 1);
	assert.ok(sent.includes(`${ESC}[?1u`));
	await feed(`${ESC}[?1049h`);
	assert.equal(session.keyboard.kitty, 0, 'the alternate screen has its own stack');
	await feed(`${ESC}[?1049l${ESC}[<u`);
	assert.equal(session.keyboard.kitty, 0);
	await feed(`${ESC}[?9001h`);
	assert.equal(session.keyboard.win32, true);
	await feed(`${ESC}[?9001l`);
	assert.equal(session.keyboard.win32, false);
});

test('bracketed paste decides input readiness; paste is sanitized', async () => {
	const { session, sent, feed } = fixture();
	assert.equal(session.inputReady(), false);
	await feed(`${ESC}[?2004h`);
	assert.equal(session.inputReady(), true);
	session.paste('a\x1b[31mb\r\n');
	assert.equal(sent.at(-1), `${ESC}[200~a[31mb\r${ESC}[201~`);
});

test('shell integration marks give prompts, failures and the working directory', async () => {
	const { session, feed } = fixture();
	await feed(`${ESC}]133;A\x07$ false\r\n${ESC}]133;D;1\x07${ESC}]7;file://host/tmp/a%20b\x07\r\n${ESC}]133;A\x07$ `);
	const prompts = session.prompts();
	assert.equal(prompts.lines.length, 2);
	assert.equal(prompts.lastFailed(), prompts.lines[0]);
	assert.equal(session.cwd, '/tmp/a b');
	await feed(`${ESC}]633;P;Cwd=/srv/x\x07`);
	assert.equal(session.cwd, '/srv/x');
});

test('subscribers get one snapshot then live output, with nothing lost or repeated', async () => {
	const { session, acks, feed } = fixture();
	await feed('before ');
	const seen: string[] = [];
	const off = session.subscribe((text) => seen.push(text));
	session.receive(encoder.encode('after'));
	// Acks follow xterm's asynchronous write callbacks; a loaded CI worker can take longer than one fixed delay.
	const acked = () => acks.reduce((sum, value) => sum + value, 0);
	for (let waited = 0; acked() < 'before after'.length && waited < 2000; waited += 10)
		await new Promise((resolve) => setTimeout(resolve, 10));
	off();
	assert.equal(seen.length, 2);
	assert.ok(seen[0]!.includes('before') && !seen[0]!.includes('after'), JSON.stringify(seen));
	assert.equal(seen[1], 'after');
	assert.ok(acked() >= 'before after'.length);
});

test('exit reaches observers after the output and the title follows OSC 2 unless renamed', async () => {
	const { session, feed } = fixture({ agentId: 'codex', kind: 'agent' });
	const events: SessionEvent[] = [];
	session.observe((event) => events.push(event));
	await feed(`${ESC}]2;Working title\x07done`);
	assert.equal(session.title, 'Working title');
	session.rename('Mine');
	await feed(`${ESC}]2;Other\x07`);
	assert.equal(session.title, 'Mine');
	session.exit(3, null);
	await session.whenParsed();
	assert.equal(events.at(-1)?.kind, 'exit');
	assert.equal(session.connection, 'exited');
	assert.equal(session.exitCode, 3);
	assert.ok(events.some((event) => event.kind === 'data' && event.text.includes('done')));
});

test('helpers: OSC color format and native lifecycle activity', () => {
	assert.equal(oscColor('#abc'), 'rgb:aaaa/bbbb/cccc');
	assert.equal(oscColor('#102030'), 'rgb:1010/2020/3030');
	assert.equal(oscColor('blue'), undefined);
	assert.equal(hookActivity('UserPromptSubmit'), 'running');
	assert.equal(hookActivity('Notification'), 'waiting');
	assert.equal(hookActivity('Stop'), 'done');
	assert.equal(hookActivity('Whatever'), undefined);
});

test('terminal reset clears the authoritative output and keyboard modes, and reaches attached renderers', async () => {
	const { session, feed } = fixture();
	const rendered: string[] = [],
		off = session.subscribe((text) => rendered.push(text));
	await feed(`${ESC}[>1u${ESC}[?9001hOld output`);
	assert.ok(session.text().includes('Old output'));
	assert.equal(session.keyboard.win32, true);
	session.reset();
	await feed('');
	assert.ok(!session.text().includes('Old output'));
	assert.deepEqual(session.keyboard, { kitty: 0, win32: false });
	assert.ok(rendered.includes(`${ESC}c`));
	off();
	session.dispose();
});

test('a typed parser reply fault is sticky, closes user input and retains parse ACK drain', async () => {
	const { session } = fixture();
	let replies = 0,
		stops = 0,
		acked = 0,
		user = 0;
	session.bindPort({
		input() {
			user++;
		},
		resize() {},
		acknowledge(_sid, bytes) {
			acked += bytes;
		},
		end() {},
		reply() {
			if (++replies === 1) throw new NativeReplyError({ state: 'none', reason: 'capacity' });
		},
		resourceLimit() {
			stops++;
		},
	});
	try {
		const raw = encoder.encode('before\x1b[5n\x1b[5nafter中文');
		session.receive(raw);
		await session.whenParsed();
		assert.equal(session.replyDiagnostic?.state, 'none');
		assert.equal(session.replyDiagnostic?.reason, 'capacity');
		assert.equal(session.replyDiagnostic?.runtimeId, session.id);
		assert.equal(session.replyDiagnostic?.sid, session.sid);
		assert.ok(session.replyDiagnostic?.message);
		assert.equal(stops, 1);
		assert.equal(replies, 2);
		assert.equal(acked, raw.length);
		assert.equal(session.getScreenUsage().status, 'ok');
		assert.ok(session.text().includes('after中文'));
		const first = session.replyDiagnostic;
		session.input('must not reach the TUI');
		assert.equal(user, 0);
		assert.ok(session.inputDiagnostic?.message);
		assert.equal(session.replyDiagnostic, first, 'a new input diagnostic cannot replace the lost reply message');
		session.replyFailure({ state: 'unknown', reason: 'write-failed' });
		assert.equal(session.replyDiagnostic, first);
		assert.equal(stops, 1);
		session.receive(encoder.encode('\x1b[5n'));
		await session.whenParsed();
		assert.equal(replies, 3);
		assert.equal(session.replyDiagnostic, first);
	} finally {
		session.dispose();
	}
});

test('remote reply failures route to the captured Session only and late generations do not stop a replacement', async () => {
	const { TerminalSessions } = await import('./sessions');
	const { normalizeTerminalSettings } = await import('../../core/terminal/settings');
	type NativeEvents = import('../../../../shared/native/host').NativeEvents;
	const routes: Array<Partial<NativeEvents>> = [];
	const ended: Array<[number, number]> = [];
	let generation = 0;
	const sessions = new TerminalSessions({
		native: {
			async acquire(_capability, events) {
				const captured = generation++;
				routes.push(events ?? {});
				let sid = 0;
				return {
					value: {
						alive: true,
						version: 'fixture',
						spawnSession: async () => 123,
						input() {},
						resize() {},
						acknowledge() {},
						end(id) {
							ended.push([captured, id]);
						},
						history: async <T>() => [] as T,
						request: async <T>() => ({}) as T,
						dispose: async () => undefined,
					},
					allocateSessionId: () => ++sid,
					release: async () => undefined,
				};
			},
		},
		platform: 'linux',
		environment: async () => ({}),
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	try {
		const first = await sessions.create({
			kind: 'shell',
			title: 'first',
			file: 'fixture',
			args: [],
			cwd: '/fixture',
			cols: 20,
			rows: 4,
		});
		const sibling = await sessions.create({
			kind: 'shell',
			title: 'sibling',
			file: 'fixture',
			args: [],
			cwd: '/fixture',
			cols: 20,
			rows: 4,
		});
		routes[0]!.replyFailure?.(first.sid, { state: 'unknown', reason: 'write-failed' });
		assert.equal(first.replyDiagnostic?.reason, 'write-failed');
		assert.equal(sibling.replyDiagnostic, undefined);
		assert.deepEqual(ended, [[0, first.sid]]);
		routes[0]!.replyFailure?.(999999, { state: 'none', reason: 'invalid' });
		assert.equal(sessions.list().length, 2);
		routes[0]!.closed?.('old helper gone');
		await first.whenParsed();
		await sibling.whenParsed();
		const replacement = await sessions.create({
			kind: 'shell',
			title: 'replacement',
			file: 'fixture',
			args: [],
			cwd: '/fixture',
			cols: 20,
			rows: 4,
		});
		const before = ended.length;
		routes[0]!.replyFailure?.(replacement.sid, { state: 'none', reason: 'closed' });
		assert.equal(replacement.replyDiagnostic, undefined);
		assert.equal(ended.length, before);
	} finally {
		await sessions.dispose();
	}
});

test('reply failure after accepted exit records its fact without another stop or parser failure', async () => {
	const { session } = fixture();
	let stop = 0;
	session.bindPort({
		input() {},
		resize() {},
		acknowledge() {},
		end() {
			stop++;
		},
		resourceLimit() {
			stop++;
		},
	});
	try {
		session.exit(0, null);
		await session.whenParsed();
		session.replyFailure({ state: 'none', reason: 'closed' });
		assert.equal(stop, 0);
		assert.equal(session.connection, 'exited');
		assert.equal(session.exitCode, 0);
		assert.equal(session.replyDiagnostic?.reason, 'closed');
		assert.equal(session.getScreenUsage().status, 'ok');
	} finally {
		session.dispose();
	}
});

test('T06 command facts never manufacture current completion; registered facts join atomically', () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const runtime = session.bindActivityRuntime();
		const command = runtime.bindSource({
			provider: 'codex',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'unproven' },
		})!;
		command.observe({ deliveryId: 'old-stop', event: 'Stop', state: 'done', completion: 'turn-finished' });
		assert.equal(session.getActivitySnapshot().source.health, 'unknown');
		assert.equal(session.getActivitySnapshot().sources[0]?.lastFact?.state, 'done');
		assert.equal(session.getActivitySnapshot().completion, undefined);
		command.close();
		const source = runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'pi-one' },
		})!;
		const updates: number[] = [];
		const join = session.observeActivity((value) => updates.push(value.at.activitySequence));
		const before = join.snapshot.at.activitySequence;
		source.observe({ deliveryId: 'one', sourceSequence: 1, event: 'agent_start', state: 'working' });
		source.observe({
			deliveryId: 'two',
			sourceSequence: 2,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		const snapshot = session.getActivitySnapshot();
		assert.deepEqual(updates, [before + 1, before + 2]);
		assert.equal(snapshot.completion?.activitySequence, before + 2);
		assert.equal(snapshot.promptEvidence.foreground, 'unknown');
		assert.equal(snapshot.unreadCompletion, true);
		assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.sources));
		join.dispose();
	} finally {
		session.dispose();
	}
});

test('T06 matching block evidence and captured seen never clear later completion or revive stopped sources', () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const runtime = session.bindActivityRuntime();
		const source = runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'paired' },
		})!;
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'ui_prompt_start',
			state: 'waiting',
			blocking: { state: 'blocked', reason: 'question', blockId: 'q' },
		});
		source.observe({
			deliveryId: '2',
			sourceSequence: 2,
			event: 'PreToolUse',
			state: 'working',
			blocking: { state: 'clear', blockId: 'q' },
		});
		assert.equal(session.getActivitySnapshot().blocking.state, 'blocked');
		source.observe({
			deliveryId: '3',
			sourceSequence: 3,
			event: 'ui_prompt_end',
			blocking: { state: 'clear', blockId: 'q' },
		});
		assert.equal(session.getActivitySnapshot().blocking.state, 'clear');
		source.observe({
			deliveryId: '4',
			sourceSequence: 4,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		const at = session.getActivitySnapshot().at;
		source.observe({
			deliveryId: '5',
			sourceSequence: 5,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		session.markActivitySeen(at);
		assert.equal(session.getActivitySnapshot().unreadCompletion, true);
		session.closeInput();
		assert.equal(source.active(), false);
		assert.equal(
			source.observe({ deliveryId: '6', sourceSequence: 6, event: 'Stop', state: 'done' }).status,
			'rejected',
		);
		assert.equal(session.getActivitySnapshot().source.health, 'unknown');
	} finally {
		session.dispose();
	}
});

test('T06 fresh atomic join, removed listeners, historical block and adapter lifetime are strict', () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		let calls = 0;
		const first = session.observeActivity(() => calls++);
		assert.equal(calls, 0);
		first.dispose();
		const runtime = session.bindActivityRuntime();
		assert.equal(
			runtime.bindSource({
				provider: 'codex',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'spoof' },
			}),
			undefined,
		);
		const legacy = runtime.bindSource({
			provider: 'claude-code',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'unproven' },
		})!;
		legacy.observe({
			deliveryId: 'blocked',
			event: 'PermissionRequest',
			state: 'permission',
			blocking: { state: 'blocked', reason: 'permission', blockId: 'q' },
		});
		legacy.observe({ deliveryId: 'stop', event: 'Stop', state: 'done' });
		assert.equal(session.getActivitySnapshot().lastFact?.blocking.state, 'blocked');
		legacy.close();
		const source = runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'pi' },
		})!;
		assert.equal(session.getActivitySnapshot().source.health, 'unknown');
		let secondCalls = 0;
		const a = session.observeActivity(() => b.dispose());
		const b = session.observeActivity(() => secondCalls++);
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'Stop',
			state: 'done',
			completion: 'turn-finished',
		});
		assert.equal(secondCalls, 0);
		assert.equal(session.getActivitySnapshot().completion, undefined);
		a.dispose();
	} finally {
		session.dispose();
	}
});

test('T06 source lifetime slots never recycle and activity JSON counts escaped bytes plus host identity', () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const runtime = session.bindActivityRuntime();
		for (let n = 0; n < 8; n++)
			runtime
				.bindSource({
					provider: 'pi',
					kind: 'native-hook',
					adapterRevision: '1',
					lifetime: { kind: 'registration', sourceInstance: String(n) },
				})!
				.close();
		assert.equal(
			runtime.bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'ninth' },
			}),
			undefined,
		);
		assert.equal(session.getActivitySnapshot().source.reason, 'capacity');
	} finally {
		session.dispose();
	}
});

test('T06 whole activity summary counts JSON escaping and real binding identity before encoding', () => {
	const meta: ActivitySourceMeta = {
		provider: 'pi',
		kind: 'native-hook',
		adapterRevision: '1',
		lifetime: { kind: 'registration', sourceInstance: 'p' },
	};
	const identity = { runtimeId: 'r', bindingId: 'b', programEpoch: 'e' };
	assert.equal(
		activitySummaryAllowed(
			meta,
			{ deliveryId: 'd', event: 'e', resume: { transcriptPath: 'x'.repeat(4096) } },
			identity,
		),
		true,
	);
	assert.equal(
		activitySummaryAllowed(
			meta,
			{ deliveryId: 'd', event: 'e', resume: { transcriptPath: '\0'.repeat(2000) } },
			identity,
		),
		false,
	);
	assert.equal(
		activitySummaryAllowed(meta, { deliveryId: 'd', event: 'e' }, { ...identity, bindingId: 'x'.repeat(257) }),
		false,
	);
});

test('T06 unattributed HookError is sticky uncertainty but does not hide later registered lastFact', () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const runtime = session.bindActivityRuntime();
		runtime.invalidate('hook-error');
		assert.equal(runtime.active(), true);
		const source = runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'later' },
		})!;
		assert.ok(source);
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		const snapshot = session.getActivitySnapshot();
		assert.equal(snapshot.lastFact?.state, 'done');
		assert.equal(snapshot.source.reason, 'hook-error');
		assert.equal(snapshot.state, 'unknown');
		assert.equal(snapshot.completion, undefined);
		source.close();
		const newer = runtime.bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'newer' },
		})!;
		newer.observe({
			deliveryId: '2',
			sourceSequence: 1,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		assert.equal(session.getActivitySnapshot().source.reason, 'hook-error');
		assert.equal(session.getActivitySnapshot().completion, undefined);
		runtime.invalidate('stop-requested');
		assert.equal(runtime.active(), false);
		assert.equal(newer.observe({ deliveryId: '3', sourceSequence: 2, event: 'agent_settled' }).status, 'rejected');
	} finally {
		session.dispose();
	}
});

test('T06 expiry preserves last blocked fact; active listener capacity and source ambiguity fail closed', async () => {
	vi.useFakeTimers();
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const runtime = session.bindActivityRuntime(),
			source = runtime.bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'p' },
			})!;
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'ui_prompt_start',
			state: 'waiting',
			blocking: { state: 'blocked', reason: 'question', blockId: 'q' },
		});
		await vi.advanceTimersByTimeAsync(30001);
		assert.equal(session.getActivitySnapshot().source.reason, 'expired');
		assert.equal(session.getActivitySnapshot().lastFact?.blocking.state, 'blocked');
		assert.equal(session.getActivitySnapshot().blocking.state, 'unknown');
		const joins = Array.from({ length: 32 }, () => session.observeActivity(() => {}));
		assert.throws(() => session.observeActivity(() => {}));
		joins.forEach((j) => j.dispose());
		source.observe({
			deliveryId: '2',
			sourceSequence: 2,
			event: 'ui_prompt_end',
			blocking: { state: 'clear', blockId: 'q' },
		});
		const other = runtime.bindSource({
			provider: 'opencode',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'other' },
		})!;
		other.observe({
			deliveryId: '3',
			sourceSequence: 1,
			event: 'Stop',
			state: 'done',
			completion: 'turn-finished',
		});
		assert.equal(session.getActivitySnapshot().source.reason, 'source-mismatch');
		assert.equal(session.getActivitySnapshot().completion, undefined);
	} finally {
		session.dispose();
		vi.useRealTimers();
	}
});

test('T06 observer seen feedback retains its subscription and coalesces only reentrant notifications', async () => {
	const { session } = fixture({ kind: 'agent', agentId: 'pi' });
	try {
		const source = session.bindActivityRuntime().bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'p' },
		})!;
		let calls = 0;
		const join = session.observeActivity((value) => {
			calls++;
			if (value.completion) session.markActivitySeen(value.at);
		});
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		await Promise.resolve();
		const before = calls;
		source.observe({
			deliveryId: '2',
			sourceSequence: 2,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		await Promise.resolve();
		assert.ok(calls > before);
		assert.equal(session.getActivitySnapshot().unreadCompletion, false);
		join.dispose();
	} finally {
		session.dispose();
	}
});

test('T06 actual consumer immediately revokes current while seq4 waits for seq3', () => {
	const { session } = fixture();
	const consumer = hookActivityConsumer(session.bindActivityRuntime());
	const row = (sequence: number, event: string) => ({
		delivery: `gap-${sequence}`,
		at: Date.now(),
		event,
		data: {},
		source: {
			provider: 'pi',
			instance: '00000000-0000-4000-8000-000000000001',
			sequence,
			event: sequence === 1 ? 'registration' : event === 'Stop' ? 'agent_settled' : 'agent_start',
		},
	});
	try {
		consumer.receive(row(1, 'SessionStart'));
		consumer.receive(row(2, 'UserPromptSubmit'));
		const before = session.getActivitySnapshot();
		assert.equal(before.state, 'working');
		consumer.receive(row(4, 'Stop'));
		const gap = session.getActivitySnapshot();
		assert.equal(gap.state, 'unknown');
		assert.equal(gap.source.reason, 'sequence-gap');
		assert.equal(gap.lastFact?.state, 'working');
		assert.equal(gap.completion, before.completion);
	} finally {
		consumer.close();
		consumer.settle();
		session.dispose();
	}
});

function orderedFixture() {
	const f = fixture();
	const runtime = f.session.bindActivityRuntime();
	const source = runtime.bindSource({
		provider: 'pi',
		kind: 'native-hook',
		adapterRevision: '1',
		lifetime: { kind: 'registration', sourceInstance: 'ordered' },
	})!;
	const fact = (sequence: number, event = 'agent_start', state: 'working' | 'done' = 'working') => ({
		deliveryId: `ordered-${sequence}`,
		sourceSequence: sequence,
		event,
		state,
		...(event === 'agent_settled' ? { completion: 'turn-finished' as const } : {}),
	});
	source.observe(fact(1));
	return { ...f, runtime, source, fact };
}

test('ordered source gap is temporary but direct observe cannot clear it or complete', () => {
	const f = orderedFixture();
	const notices: ReturnType<typeof f.session.getActivitySnapshot>[] = [];
	const join = f.session.observeActivity((snapshot) => notices.push(snapshot));
	try {
		const before = f.session.getActivitySnapshot(),
			gap = f.source.observeOrdered([], true);
		assert.equal(gap.status, 'accepted');
		const unknown = f.session.getActivitySnapshot();
		assert.equal(unknown.state, 'unknown');
		assert.equal(unknown.source.reason, 'sequence-gap');
		assert.equal(unknown.sources[0]?.health, 'unknown');
		assert.equal(unknown.sources[0]?.capabilities.activity, 'unknown');
		assert.equal(unknown.lastFact, before.lastFact);
		assert.equal(f.source.active(), true);
		assert.equal(f.source.observeOrdered([], true).status, 'duplicate');
		assert.equal(f.session.getActivitySnapshot(), unknown);
		assert.equal(f.source.observe(f.fact(2, 'agent_settled', 'done')).status, 'rejected');
		assert.equal(f.session.getActivitySnapshot().completion, undefined);
		notices.length = 0;
		const adopted = f.source.observeOrdered([f.fact(2, 'agent_settled', 'done'), f.fact(3)], false);
		assert.equal(adopted.status, 'accepted');
		assert.equal(notices.length, 1);
		const result = f.session.getActivitySnapshot();
		assert.equal(result.state, 'working');
		assert.equal(result.at.activitySequence, unknown.at.activitySequence + 2);
		assert.equal(result.completion?.activitySequence, unknown.at.activitySequence + 1);
		assert.equal(result.seenThrough, before.seenThrough);
		assert.equal(result.unreadCompletion, true);
		assert.equal(adopted.at.activitySequence, result.at.activitySequence);
	} finally {
		join.dispose();
		f.session.dispose();
	}
});

test.each(['empty-clear', 'nonempty-pending', 'too-many', 'sequence', 'oversized'] as const)(
	'ordered batch rejects entire invalid %s before applying its prefix',
	(reason) => {
		const f = orderedFixture();
		try {
			f.source.observeOrdered([], true);
			const before = f.session.getActivitySnapshot();
			const values =
				reason === 'empty-clear'
					? []
					: reason === 'too-many'
						? Array.from({ length: 9 }, (_, i) => f.fact(i + 2))
						: [
								f.fact(2, 'agent_settled', 'done'),
								{
									...f.fact(reason === 'sequence' ? 4 : 3),
									...(reason === 'oversized' ? { title: 'x'.repeat(9000) } : {}),
								},
							];
			const result = f.source.observeOrdered(values, reason === 'nonempty-pending');
			assert.equal(result.status, 'rejected');
			const after = f.session.getActivitySnapshot();
			assert.equal(after.state, 'unknown');
			assert.equal(after.completion, before.completion);
			assert.equal(after.lastFact, before.lastFact);
			assert.equal(after.seenThrough, before.seenThrough);
		} finally {
			f.session.dispose();
		}
	},
);

test.each(['HookError', 'session_shutdown', 'adapter_closed'] as const)(
	'ordered %s retains an earlier real completion, closes before notifying and rejects later facts',
	(event) => {
		const f = orderedFixture(),
			notices: ReturnType<typeof f.session.getActivitySnapshot>[] = [];
		const join = f.session.observeActivity((s) => notices.push(s));
		try {
			f.source.observeOrdered([], true);
			const gap = f.session.getActivitySnapshot();
			notices.length = 0;
			const result = f.source.observeOrdered(
				[f.fact(2, 'agent_settled', 'done'), { ...f.fact(3), event }, f.fact(4)],
				false,
			);
			assert.equal(result.status, 'rejected');
			assert.equal(notices.length, 1);
			assert.equal(notices[0]?.state, 'unknown');
			const ended = f.session.getActivitySnapshot();
			assert.equal(ended.completion?.activitySequence, gap.at.activitySequence + 1);
			assert.equal(ended.sources[0]?.lastFact?.event, event === 'HookError' ? 'agent_settled' : event);
			if (event !== 'HookError') assert.equal(ended.lastFact, undefined);
			assert.equal(f.source.active(), false);
			assert.equal(f.source.observeOrdered([f.fact(4)], false).status, 'rejected');
			assert.equal(f.session.getActivitySnapshot(), ended);
		} finally {
			join.dispose();
			f.session.dispose();
		}
	},
);

test('ordered batch returns its own watermark even if its final listener stops the runtime', () => {
	const f = orderedFixture();
	let stopped = false;
	const join = f.session.observeActivity((s) => {
		if (!stopped && s.state === 'working' && s.at.activitySequence > 3) {
			stopped = true;
			f.runtime.invalidate('stop-requested');
		}
	});
	try {
		f.source.observeOrdered([], true);
		const start = f.session.getActivitySnapshot().at.activitySequence;
		const adopted = f.source.observeOrdered([f.fact(2), f.fact(3)], false);
		assert.equal(stopped, true);
		assert.equal(adopted.status, 'accepted');
		assert.equal(adopted.at.activitySequence, start + 2);
		assert.equal(f.session.getActivitySnapshot().source.reason, 'stop-requested');
		assert.equal(f.source.active(), false);
	} finally {
		join.dispose();
		f.session.dispose();
	}
});

test('temporary gap never renews freshness and only real contiguous evidence can recover expired', async () => {
	vi.useFakeTimers();
	const f = orderedFixture();
	try {
		await vi.advanceTimersByTimeAsync(20000);
		f.source.observeOrdered([], true);
		await vi.advanceTimersByTimeAsync(10001);
		assert.equal(f.session.getActivitySnapshot().source.reason, 'expired');
		const old = f.session.getActivitySnapshot().lastFact;
		f.source.observeOrdered([], true);
		assert.equal(f.session.getActivitySnapshot().source.reason, 'expired');
		assert.equal(f.session.getActivitySnapshot().lastFact, old);
		assert.equal(f.source.observeOrdered([f.fact(2)], false).status, 'accepted');
		assert.equal(f.session.getActivitySnapshot().source.health, 'current');
	} finally {
		f.session.dispose();
		vi.useRealTimers();
	}
});

test.each([
	'stop-requested',
	'runtime-ended',
	'transport-lost',
	'closed',
	'hook-error',
	'source-mismatch',
	'capacity',
] as const)('pending gap cannot restore %s runtime authority', (reason) => {
	const f = orderedFixture();
	try {
		f.source.observeOrdered([], true);
		f.runtime.invalidate(reason);
		const invalid = f.session.getActivitySnapshot();
		assert.equal(f.source.observeOrdered([f.fact(2, 'agent_settled', 'done')], false).status, 'rejected');
		assert.equal(f.session.getActivitySnapshot(), invalid);
		assert.equal(invalid.state, 'unknown');
		assert.equal(invalid.completion, undefined);
	} finally {
		f.session.dispose();
	}
});

test('full eight-fact ordered batch has eight activity marks, one notification, and the Stop keeps its own mark', () => {
	const f = orderedFixture();
	let changes = 0;
	const stop = f.session.onChange(() => {
		changes++;
	});
	const notices: ReturnType<typeof f.session.getActivitySnapshot>[] = [];
	const join = f.session.observeActivity((s) => notices.push(s));
	try {
		f.source.observeOrdered([], true);
		const before = f.session.getActivitySnapshot();
		notices.length = 0;
		changes = 0;
		const values = Array.from({ length: 8 }, (_, i) =>
			f.fact(i + 2, i === 3 ? 'agent_settled' : 'agent_start', i === 3 ? 'done' : 'working'),
		);
		assert.equal(f.source.observeOrdered(values, false).status, 'accepted');
		const result = f.session.getActivitySnapshot();
		assert.equal(result.at.activitySequence, before.at.activitySequence + 8);
		assert.equal(result.completion?.activitySequence, before.at.activitySequence + 4);
		assert.equal(notices.length, 1);
		assert.equal(changes, 1);
		assert.equal(result.state, 'working');
		assert.equal(f.source.observeOrdered(values, false).status, 'duplicate');
		assert.equal(f.session.getActivitySnapshot(), result);
	} finally {
		stop();
		join.dispose();
		f.session.dispose();
	}
});

test.each(['same-block', 'wrong-block'] as const)(
	'gap keeps the captured block and only %s pairing can clear and complete',
	(which) => {
		const f = orderedFixture();
		try {
			f.source.observe({
				...f.fact(2),
				event: 'ui_prompt_start',
				state: 'waiting',
				blocking: { state: 'blocked', reason: 'question', blockId: 'q' },
			});
			const blocked = f.session.getActivitySnapshot();
			f.source.observeOrdered([], true);
			const unknown = f.session.getActivitySnapshot();
			assert.equal(unknown.blocking.state, 'unknown');
			assert.equal(unknown.lastFact?.blocking, blocked.lastFact?.blocking);
			f.source.observeOrdered(
				[
					{
						...f.fact(3),
						event: 'ui_prompt_end',
						blocking: { state: 'clear', blockId: which === 'same-block' ? 'q' : 'other' },
					},
					f.fact(4, 'agent_settled', 'done'),
				],
				false,
			);
			const done = f.session.getActivitySnapshot();
			assert.equal(done.blocking.state, which === 'same-block' ? 'clear' : 'blocked');
			assert.equal(!!done.completion, which === 'same-block');
		} finally {
			f.session.dispose();
		}
	},
);

test('hard source invalidation and a hundred duplicate gap notices do not create a recovery counter or renew evidence', () => {
	const f = orderedFixture();
	try {
		f.source.observeOrdered([], true);
		const gap = f.session.getActivitySnapshot();
		for (let i = 0; i < 100; i++) assert.equal(f.source.observeOrdered([], true).status, 'duplicate');
		assert.equal(f.session.getActivitySnapshot(), gap);
		f.source.invalidate('sequence-gap');
		const hard = f.session.getActivitySnapshot();
		assert.equal(f.source.observeOrdered([f.fact(2)], false).status, 'rejected');
		assert.equal(f.session.getActivitySnapshot(), hard);
	} finally {
		f.session.dispose();
	}
});

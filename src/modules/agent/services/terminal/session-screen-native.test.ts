import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, vi } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import { PtyHelper } from '../../../../host/desktop/native/helper';
import type { ScreenMark, ScreenStream, ScreenUsage } from '../../core/terminal/frames-screen';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { TerminalSession } from './session';
import { TerminalSessions } from './sessions';

const requested = process.env.HUHU_TEST_PTY_BINARY;
if (requested !== undefined && !existsSync(requested))
	throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${requested}`);
const binary = resolve(requested ?? 'native/pty-server/target/debug/huhu-pty');
function gone(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return false;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
		throw error;
	}
}
async function until(check: () => boolean, label: string, timeout = 15000): Promise<void> {
	const deadline = Date.now() + timeout;
	while (!check()) {
		assert.ok(Date.now() < deadline, `Timed out: ${label}`);
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

test.skipIf(process.platform !== 'linux' || !existsSync(binary))(
	'real PTY output stays parsed and bounded with fast/slow screens while another runtime resizes and stops',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-t05-screen-'));
		const hash = createHash('sha256')
			.update(await readFile(binary))
			.digest('hex');
		let helper: PtyHelper | undefined,
			fast: ScreenStream | undefined,
			slow: ScreenStream | undefined,
			producer: TerminalSession | undefined;
		let fastFrames = 0,
			slowFrames = 0,
			gaps = 0,
			parsedBytes = 0,
			acknowledgeBytes = 0,
			replies = 0,
			resizeOps = 0;
		let resizeObservedMs = 0,
			stopObservedMs = 0;
		let lastFast: ScreenMark | undefined,
			allOutput = '';
		const timers = new Set<ReturnType<typeof setTimeout>>(),
			pids = new Set<number>();
		const errors: unknown[][] = [],
			originalError = console.error.bind(console);
		const errorLog = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
			errors.push(args);
			originalError(...args);
		});
		const peak: Record<string, number> = {};
		const sample = () => {
			if (!producer) return;
			const usage = producer.getScreenUsage();
			const budget = Reflect.get(Reflect.get(producer, 'screen') as object, 'budget') as {
				readonly bytes: number;
				readonly allocations: Map<object, number>;
			};
			peak.agentBytes = Math.max(peak.agentBytes ?? 0, budget.bytes);
			peak.runtimeBytes = Math.max(peak.runtimeBytes ?? 0, budget.allocations.get(producer) ?? 0);
			for (const [key, value] of Object.entries(usage))
				if (typeof value === 'number') peak[key] = Math.max(peak[key] ?? 0, value);
			peak.rss = Math.max(peak.rss ?? 0, process.memoryUsage().rss);
		};
		const later = (fn: () => void) => {
			const timer = setTimeout(() => {
				timers.delete(timer);
				fn();
			}, 100);
			timers.add(timer);
		};
		const native = new NativeHost(async (events) => {
			helper = await PtyHelper.start(
				binary,
				{
					...events,
					output: (sid, bytes) => {
						if (producer?.sid === sid) parsedBytes += bytes.length;
						events.output?.(sid, bytes);
					},
				},
				globalThis as unknown as Window,
				{ HOME: root },
			);
			assert.equal(helper.inputAdmission, 1);
			assert.equal(helper.outputAbandon, 1);
			const ack = helper.acknowledge.bind(helper),
				reply = helper.reply!.bind(helper),
				resize = helper.submitResize!.bind(helper);
			helper.acknowledge = (sid, bytes) => {
				if (producer?.sid === sid) acknowledgeBytes += bytes;
				ack(sid, bytes);
			};
			helper.reply = (sid, data) => {
				replies++;
				reply(sid, data);
			};
			helper.submitResize = (sid, cols, rows, options) => {
				resizeOps++;
				return resize(sid, cols, rows, options);
			};
			return helper;
		});
		const sessions = new TerminalSessions({
			native,
			platform: 'linux',
			environment: async () => ({ HOME: root, PATH: '/bin:/usr/bin' }),
			settings: () => normalizeTerminalSettings({ scrollback: 5000 }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		const makeRef = (id: string) =>
			sessions.reserveManaged({
				id,
				spaceId: 'screen-fixture-space',
				kind: 'shell',
				title: id,
				createdAt: 0,
				lastAttempt: { runtimeId: `${id}-runtime`, state: 'unconfirmed', acceptedAt: 0 },
			});
		const a = makeRef('producer'),
			b = makeRef('control');
		const started = Date.now();
		let poll: ReturnType<typeof setInterval> | undefined;
		try {
			producer = await sessions.create({
				runtime: a,
				kind: 'shell',
				title: 'producer',
				file: '/bin/bash',
				args: [
					'--noprofile',
					'--norc',
					'-c',
					'for ((i=0;i<3000;i++)); do printf "\\033[32mSCREEN:%s:中😀\\033[0m\\r\\n" "$i"; if ((i % 25 == 0)); then sleep 0.01; fi; done; printf "FINAL_MARK\\033[6n\\n"; read -r keep',
				],
				cwd: root,
				cols: 80,
				rows: 24,
				prepare: (session) => {
					producer = session;
					session.observe((event) => {
						if (event.kind === 'data') allOutput += event.text;
					});
					fast = session.openScreen({}, (frame) => {
						fastFrames++;
						const at =
							frame.kind === 'snapshot-end'
								? frame.at
								: frame.kind === 'patch'
									? frame.to
									: frame.kind === 'patch-part' && frame.index === frame.count - 1
										? frame.header.to
										: undefined;
						if (at) {
							lastFast = at;
							queueMicrotask(() => fast?.applied(at));
						}
					});
					slow = session.openScreen({}, (frame) => {
						slowFrames++;
						const at =
							frame.kind === 'snapshot-end'
								? frame.at
								: frame.kind === 'patch'
									? frame.to
									: frame.kind === 'patch-part' && frame.index === frame.count - 1
										? frame.header.to
										: undefined;
						if (at) later(() => slow?.applied(at));
						if (frame.kind === 'resync-required') {
							gaps++;
							later(() => slow?.resync());
						}
					});
				},
			});
			pids.add(producer.pid!);
			poll = setInterval(sample, 20);
			const control = await sessions.create({
				runtime: b,
				kind: 'shell',
				title: 'control',
				file: '/bin/bash',
				args: [
					'--noprofile',
					'--norc',
					'-c',
					'echo CONTROL_READY; while IFS= read -r line; do stty size; echo "CONTROL:$line"; done',
				],
				cwd: root,
				cols: 80,
				rows: 24,
			});
			pids.add(control.pid!);
			await until(() => control.text().includes('CONTROL_READY'), 'control ready');
			const lease = control.registerView('control-size-owner');
			control.setViewVisible(lease, true);
			control.setViewFocused(lease, true);
			const controlStarted = Date.now();
			assert.equal((await control.requestViewSize(lease, { cols: 101, rows: 31 })).status, 'accepted');
			const sent = control.submitPaste('proof', { appendEnter: true });
			assert.equal((await sent.queued).state, 'queued');
			assert.equal((await sent.finished).state, 'written');
			await until(
				() => control.text().includes('31 101') && control.text().includes('CONTROL:proof'),
				'resize and whole input receipts',
			);
			resizeObservedMs = Date.now() - controlStarted;
			const stopStarted = Date.now();
			sessions.requestManagedStop(b);
			await until(
				() => sessions.managedSummary(b)?.termination?.cleanup.state === 'confirmed',
				'independent stop',
			);
			stopObservedMs = Date.now() - stopStarted;
			await until(() => allOutput.includes('FINAL_MARK'), 'continuous producer finish', 30000);
			await producer.whenParsed();
			sample();
			assert.equal((allOutput.match(/SCREEN:\d+:中😀/g) ?? []).length, 3000);
			assert.equal(
				parsedBytes,
				acknowledgeBytes,
				'screen applied receipts are independent of real parsed native credit',
			);
			assert.ok(replies > 0);
			assert.ok(resizeOps > 0);
			assert.ok(fastFrames > 2 && slowFrames > 2);
			assert.ok(lastFast && lastFast.contentSequence > 10);
			const usage: Readonly<ScreenUsage> = producer.getScreenUsage(),
				profile = producer.getScreenProfile();
			assert.equal(usage.status, 'ok');
			assert.ok(peak.pendingRawBytes! <= profile.maxPendingRawBytes);
			assert.ok(peak.modelCells! <= profile.maxModelCells);
			assert.ok(peak.modelBytes! <= profile.maxModelBytes);
			assert.ok(peak.journalBytes! <= profile.maxJournalBytes);
			assert.ok(peak.observerBytes! <= profile.maxObserverBytes * 2);
			sessions.requestManagedStop(a);
			await until(() => sessions.managedSummary(a)?.termination?.cleanup.state === 'confirmed', 'producer stop');
			console.info(
				'[T05 real screen pressure]',
				JSON.stringify({
					binary,
					hash,
					workload: {
						lines: 3000,
						rows: 24,
						cols: 80,
						scrollback: 5000,
						producerDelayMs: 10,
						everyLines: 25,
						slowObserverDelayMs: 100,
					},
					elapsedMs: Date.now() - started,
					peak,
					parsedBytes,
					acknowledgeBytes,
					replies,
					resizeOps,
					resizeObservedMs,
					stopObservedMs,
					fastFrames,
					slowFrames,
					gaps,
					lastFast,
					pids: [...pids],
					terminations: [sessions.managedSummary(a)?.termination, sessions.managedSummary(b)?.termination],
				}),
			);
		} finally {
			clearInterval(poll);
			for (const timer of timers) clearTimeout(timer);
			fast?.dispose();
			slow?.dispose();
			await sessions.dispose();
			await native.dispose();
			for (const pid of pids) await until(() => gone(pid), `owned Shell ${pid} exit`);
			if (helper) await until(() => gone(helper!.pid), 'helper exit');
			assert.equal(
				createHash('sha256')
					.update(await readFile(binary))
					.digest('hex'),
				hash,
			);
			console.info(
				'[T05 real screen cleanup]',
				JSON.stringify({
					binary,
					hash,
					pids: [...pids],
					shellsExited: [...pids].every(gone),
					helperPid: helper?.pid,
					helperExited: helper ? gone(helper.pid) : true,
				}),
			);
			await rm(root, { recursive: true, force: true });
			errorLog.mockRestore();
			assert.deepEqual(errors, [], 'no unexpected consumer error is allowed');
		}
	},
	45000,
);

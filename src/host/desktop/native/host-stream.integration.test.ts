import { existsSync } from 'node:fs';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { nativeCookieReader } from '../../../shared/native/cookies';
import { NativeHost } from './host';
import { PtyHelper } from './helper';
import { FrameDecoder, encodeControl } from '../../../shared/native/frames';
import { NativeSpawnError } from '../../../shared/native/host';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

const explicitBinary = process.env.HUHU_TEST_PTY_BINARY;
if (explicitBinary && !existsSync(explicitBinary))
	throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${explicitBinary}`);
const binary =
	explicitBinary ??
	['release', 'debug']
		.map((profile) =>
			resolve(`native/pty-server/target/${profile}/huhu-pty${process.platform === 'win32' ? '.exe' : ''}`),
		)
		.find((path) => existsSync(path));
const wait = async (condition: () => boolean, budget = 4000) => {
	const deadline = performance.now() + budget;
	while (!condition() && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
	expect(condition(), 'bounded fixture observation').toBe(true);
};

async function finishFixture(errors: unknown[], ...steps: Array<() => unknown | Promise<unknown>>): Promise<void> {
	for (const [index, step] of steps.entries()) {
		try {
			await step();
		} catch (error) {
			errors.push(new Error(`Native pressure fixture cleanup step ${index + 1} failed`, { cause: error }));
		}
	}
	if (errors.length) throw new AggregateError(errors, 'Native pressure fixture body or cleanup failed');
}

test.skipIf(process.platform !== 'linux' || !binary)(
	'real whole input under a blocked PTY leaves sibling input, Cookie and stop independent',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-stream-pressure-'));
		const sqlite = createRequire(import.meta.url)('node:sqlite') as {
			DatabaseSync: new (path: string) => { exec(sql: string): void; close(): void };
		};
		const path = join(root, 'cookies.sqlite'),
			db = new sqlite.DatabaseSync(path);
		db.exec(
			"CREATE TABLE moz_cookies(host TEXT,name TEXT,value TEXT,path TEXT,expiry INTEGER,isSecure INTEGER,isHttpOnly INTEGER,sameSite INTEGER); INSERT INTO moz_cookies VALUES('.example.org','sid','complete','/',1800000000,1,1,2);",
		);
		db.close();
		const metricsPath = join(root, 'metrics.json');
		let stage = 'prepare',
			currentCycle = -1,
			currentSid = 0;
		const stages: Array<{ event: string; stage: string; cycle: number; sid: number; at: number }> = [];
		const record = (event: string) => {
			stages.push({ event, stage, cycle: currentCycle, sid: currentSid, at: performance.now() });
			if (stages.length > 128) stages.shift();
		};
		const mark = (nextStage: string, sid = currentSid) => {
			stage = nextStage;
			currentSid = sid;
			record('stage');
		};
		const failures: unknown[] = [];
		let helper!: PtyHelper,
			helperStarts = 0;
		const host = new NativeHost(async (events) => {
			helperStarts++;
			helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {
				HUHU_PTY_STREAM_METRICS: metricsPath,
			});
			return helper;
		});
		const browser = await host.acquire('cookies');
		const output = new Map<number, string>();
		const lease = await host.acquire('pty', {
			output(sid, bytes) {
				output.set(sid, (output.get(sid) ?? '') + new TextDecoder().decode(bytes));
				lease.value.acknowledge(sid, bytes.byteLength);
			},
		});
		const blocked = lease.allocateSessionId(),
			sibling = lease.allocateSessionId();
		const started = performance.now();
		try {
			mark('spawn-blocked', blocked);
			await lease.value.spawnSession(blocked, {
				file: '/bin/sh',
				args: ['-c', 'stty raw -echo; printf BLOCKED_READY; sleep 30'],
				cwd: root,
				env: {},
				cols: 80,
				rows: 24,
			});
			mark('spawn-sibling', sibling);
			await lease.value.spawnSession(sibling, {
				file: '/bin/sh',
				args: ['-c', 'stty -echo; printf SIBLING_READY; read value; printf \'REPLY:%s\' "$value"; sleep 30'],
				cwd: root,
				env: {},
				cols: 80,
				rows: 24,
			});
			mark('initial-ready');
			await wait(
				() =>
					(output.get(blocked) ?? '').includes('BLOCKED_READY') &&
					(output.get(sibling) ?? '').includes('SIBLING_READY'),
			);
			expect(lease.value.inputAdmission).toBe(1);
			const first = lease.value.submitInput!(blocked, new Uint8Array(256 * 1024).fill(65));
			mark('first-queued', blocked);
			expect((await first.queued).state).toBe('queued');
			const second = lease.value.submitInput!(blocked, new Uint8Array(256 * 1024).fill(66));
			mark('second-queued');
			expect((await second.queued).state).toBe('queued');
			const rejected = lease.value.submitInput!(blocked, 'overflow');
			mark('overflow-finished');
			expect(await rejected.finished).toMatchObject({ state: 'none', reason: 'capacity' });
			// Independent reservation can enter even though the one OS writer remains physically blocked.
			lease.value.reply!(blocked, '\x1b[1;1R');
			const controlAt = performance.now(),
				echo = lease.value.submitInput!(sibling, 'ping\n');
			mark('sibling-written', sibling);
			expect(await echo.finished).toMatchObject({ state: 'written' });
			mark('sibling-echo');
			await wait(() => (output.get(sibling) ?? '').includes('REPLY:ping'));
			mark('cookie-first');
			expect(await nativeCookieReader(host).readCookies(path, 'firefox')).toMatchObject({
				rows: [{ name: 'sid', value: 'complete' }],
			});
			const siblingLatency = performance.now() - controlAt;
			mark('stop-blocked', blocked);
			lease.value.end(blocked, true);
			mark('second-finished');
			expect((await second.finished).state).toBe('none');
			mark('first-finished');
			expect((await first.finished).state).toMatch(/written|unknown/);
			mark('initial-release');
			await lease.release();
			expect(helper.alive).toBe(true);
			// More than the 32 native session slots: retaining Browser prevents last-owner
			// helper termination from concealing a leaked blocked writer or retiring slot.
			for (let cycle = 0; cycle < 34; cycle++) {
				currentCycle = cycle;
				mark('reuse-acquire');
				let ready = false;
				const next = await host.acquire('pty', {
					output(sid, bytes) {
						ready ||= new TextDecoder().decode(bytes).includes('NEXT_READY');
						next.value.acknowledge(sid, bytes.byteLength);
					},
				});
				const cycleFailures: unknown[] = [];
				try {
					const sid = next.allocateSessionId();
					mark('reuse-spawn', sid);
					await next.value.spawnSession(sid, {
						file: '/bin/sh',
						args: ['-c', 'stty raw -echo; printf NEXT_READY; sleep 30'],
						cwd: root,
						env: {},
						cols: 80,
						rows: 24,
					});
					mark('reuse-ready');
					await wait(() => ready);
					const input = next.value.submitInput!(sid, new Uint8Array(256 * 1024).fill(67));
					mark('reuse-queued');
					expect((await input.queued).state).toBe('queued');
					mark('reuse-stop');
					next.value.end(sid, true);
					mark('reuse-finished');
					expect((await input.finished).state).toMatch(/none|written|unknown/);
				} catch (error) {
					record('cycle-body-failed');
					cycleFailures.push(error);
				} finally {
					await finishFixture(cycleFailures, () => {
						mark('reuse-release');
						return next.release();
					});
				}
				mark('reuse-helper-alive');
				expect(helper.alive).toBe(true);
			}
			mark('cookie-final');
			expect(await browser.value.request('cookies', 'read', { path, kind: 'firefox' })).toMatchObject({
				rows: [{ name: 'sid', value: 'complete' }],
			});
			expect(helperStarts).toBe(1);
			console.info(
				JSON.stringify({
					workload:
						'Linux blocked input, sibling input+Cookie; Browser retained through 34 subsequent blocked-input PTY stop/reuse cycles',
					siblingLatencyMs: siblingLatency,
					elapsedMs: performance.now() - started,
					...helper.streamStats,
				}),
			);
		} catch (error) {
			record('body-failed');
			failures.push(error);
		} finally {
			await finishFixture(
				failures,
				() => {
					mark('cleanup-lease');
					return lease.release();
				},
				() => {
					mark('cleanup-browser');
					return browser.release();
				},
				() => {
					mark('cleanup-host');
					return host.dispose();
				},
				async () => {
					mark('cleanup-metrics');
					const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as {
						sessions: {
							writerHandlesPending: number;
							readerHandlesPending: number;
							masterHandlesPending: number;
							rawUnacknowledgedAtSample: number;
						};
					};
					console.info(JSON.stringify({ env: { HUHU_PTY_STREAM_METRICS: metricsPath }, metrics }));
					expect(metrics.sessions.writerHandlesPending).toBe(0);
					expect(metrics.sessions.readerHandlesPending).toBe(0);
					expect(metrics.sessions.masterHandlesPending).toBe(0);
					expect(metrics.sessions.rawUnacknowledgedAtSample).toBe(0);
				},
				() => rm(root, { recursive: true, force: true }),
				() => {
					if (failures.length)
						console.error(
							JSON.stringify({
								fixture: 'blocked-pty',
								failures: failures.length,
								stage,
								cycle: currentCycle,
								sid: currentSid,
								stages,
								stream: helper.streamStats,
							}),
						);
				},
			);
		}
	},
	40_000,
);

test.skipIf(process.platform !== 'linux' || !binary)(
	'slow stdout saturates bounded output while target stop reaches the OS and sibling resumes',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-output-pressure-')),
			gate = join(root, 'go'),
			metricsPath = join(root, 'metrics.json');
		let helper!: PtyHelper;
		const counts = new Map<number, number>(),
			ready = new Set<number>();
		const host = new NativeHost(async (events) => {
			helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {
				HUHU_PTY_STREAM_METRICS: metricsPath,
			});
			return helper;
		});
		const lease = await host.acquire('pty', {
			output(sid, bytes) {
				counts.set(sid, (counts.get(sid) ?? 0) + bytes.byteLength);
				if (new TextDecoder().decode(bytes).includes('READY')) ready.add(sid);
				lease.value.acknowledge(sid, bytes.byteLength);
			},
		});
		const ids: number[] = [],
			pids: Array<number | null> = [];
		const stdout = (helper as unknown as { child: { stdout: { pause(): void; resume(): void } } }).child.stdout;
		const failures: unknown[] = [];
		try {
			for (let i = 0; i < 5; i++) {
				const sid = lease.allocateSessionId();
				ids.push(sid);
				pids.push(
					await lease.value.spawnSession(sid, {
						file: '/bin/sh',
						args: [
							'-c',
							'printf READY; while [ ! -f "$1" ]; do sleep 0.01; done; head -c 6000000 /dev/zero | tr \'\\0\' x; sleep 30',
							'fixture',
							gate,
						],
						cwd: root,
						env: {},
						cols: 80,
						rows: 24,
					}),
				);
			}
			await wait(() => ready.size === 5);
			stdout.pause();
			await writeFile(gate, 'go');
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const stoppedAt = performance.now();
			lease.value.end(ids[0]!, true);
			// PID disappearance is only an extra physical control observation; release still requires validated scope+drain evidence.
			await wait(() => {
				try {
					process.kill(pids[0]!, 0);
					return false;
				} catch {
					return true;
				}
			});
			const osStopLatencyMs = performance.now() - stoppedAt;
			stdout.resume();
			await wait(() => (counts.get(ids[1]!) ?? 0) > 2 * 1024 * 1024);
			console.info(
				JSON.stringify({
					workload: '5 Linux PTYs x 6000000 raw bytes; stdout paused 1000ms; target force stop during pause',
					osStopLatencyMs,
					node: helper.streamStats,
				}),
			);
		} catch (error) {
			failures.push(error);
		} finally {
			await finishFixture(
				failures,
				() => stdout.resume(),
				() => lease.release(),
				() => host.dispose(),
				async () => {
					const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as {
						outbox: { encodedOutputBytesPeak: number; outputFramesPeak: number };
						sessions: { rawUnacknowledgedPeak: number; sessionSlotsPeak: number };
					};
					console.info(JSON.stringify({ env: { HUHU_PTY_STREAM_METRICS: metricsPath }, metrics }));
					expect(metrics.outbox.encodedOutputBytesPeak).toBeLessThanOrEqual(4 * 1024 * 1024);
					expect(metrics.outbox.encodedOutputBytesPeak).toBeGreaterThan(512 * 1024);
					expect(metrics.outbox.outputFramesPeak).toBe(256);
					expect(metrics.sessions.rawUnacknowledgedPeak).toBeLessThanOrEqual(32 * (1024 * 1024 + 65535));
					expect(metrics.sessions.sessionSlotsPeak).toBe(5);
				},
				() => rm(root, { recursive: true, force: true }),
			);
		}
	},
	25_000,
);

test.skipIf(process.platform !== 'linux' || !binary)(
	'explicit abandoned display releases raw credit without parse ACK and still waits for scope stop',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-output-abandon-')),
			metricsPath = join(root, 'metrics.json');
		let helper!: PtyHelper,
			bytes = 0,
			truncated = false;
		const host = new NativeHost(async (events) => {
			helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {
				HUHU_PTY_STREAM_METRICS: metricsPath,
			});
			return helper;
		});
		const lease = await host.acquire('pty', {
			output: (_sid, data) => {
				bytes += data.byteLength;
			},
			termination: (_sid, notice) => {
				truncated ||= notice.evidence.output === 'truncated';
			},
		});
		const failures: unknown[] = [];
		try {
			const sid = lease.allocateSessionId();
			await lease.value.spawnSession(sid, {
				file: '/bin/sh',
				args: ['-c', 'head -c 200000 /dev/zero; sleep 30'],
				cwd: root,
				env: {},
				cols: 80,
				rows: 24,
			});
			await wait(() => bytes >= 200000);
			expect(lease.value.outputAbandon).toBe(1);
			lease.value.abandonOutput!(sid);
			const atAbandon = bytes;
			lease.value.end(sid, true);
			await lease.release();
			expect(truncated).toBe(true);
			expect(bytes).toBe(atAbandon);
			await host.dispose();
			const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as {
				sessions: { abandonedRawBytes: number };
			};
			expect(metrics.sessions.abandonedRawBytes).toBeGreaterThanOrEqual(200000);
			console.info(
				JSON.stringify({
					workload: '200000 raw bytes intentionally never parse-ACKed; explicit abandon then target stop',
					metrics,
				}),
			);
		} catch (error) {
			failures.push(error);
		} finally {
			await finishFixture(
				failures,
				() => host.dispose(),
				() => rm(root, { recursive: true, force: true }),
			);
		}
	},
	20_000,
);

test.skipIf(process.platform !== 'linux' || !binary)(
	'real native pre-reservation capacity rejection retires the Node route without inventing pending I/O',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-native-reserve-reject-'));
		let helper!: PtyHelper;
		const host = new NativeHost(async (events) => {
			helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {});
			return helper;
		});
		const browser = await host.acquire('cookies'),
			lease = await host.acquire('pty');
		const child = (helper as unknown as { child: ChildProcessWithoutNullStreams }).child;
		const filled = new Map<number, number>(),
			exited = new Set<number>();
		const rejected = new Map<number, Error>();
		const decoder = new FrameDecoder();
		const observe = (chunk: Buffer) =>
			decoder.consume(chunk, (frame) => {
				if (frame.kind !== 1) return;
				const value = frame.message,
					sid = value.sid as number;
				if (!Number.isInteger(sid) || sid < 1000 || sid >= 1032) return;
				if (value.type === 'spawn-failed' || value.type === 'error')
					rejected.set(
						sid,
						new Error(
							`Native pool filler ${sid} ${value.type}: ${typeof value.message === 'string' ? value.message.slice(0, 1024) : 'no detail'}`,
						),
					);
				if (value.type === 'spawned') filled.set(sid, value.pid as number);
				if (value.type === 'exit') {
					exited.add(sid);
					child.stdin.write(encodeControl({ type: 'reply-close', sid }));
				}
			});
		child.stdout.on('data', observe);
		const failures: unknown[] = [];
		try {
			expect(helper.replySettlement).toBe(1);
			// Fill the actual native pool outside this Node client's local SID ledger.
			// These are only this test's children, so the next real client request reaches native's guard.
			const fillDeadline = performance.now() + 4000;
			for (let sid = 1000; sid < 1032; sid++) {
				if (performance.now() >= fillDeadline)
					throw new Error(`Native pool fill deadline reached at SID ${sid} (${filled.size}/32 spawned)`);
				child.stdin.write(
					encodeControl({
						type: 'spawn',
						sid,
						file: '/bin/sh',
						args: ['-c', 'exec sleep 30'],
						env: {},
						cwd: root,
						cols: 20,
						rows: 4,
					}),
				);
				try {
					await wait(
						() => filled.has(sid) || rejected.has(sid) || exited.has(sid),
						Math.max(0, fillDeadline - performance.now()),
					);
				} catch (error) {
					throw new Error(`Native pool fill deadline reached at SID ${sid} (${filled.size}/32 spawned)`, {
						cause: error,
					});
				}
				const failure = rejected.get(sid);
				if (failure) throw failure;
				if (exited.has(sid)) throw new Error(`Native pool filler ${sid} exited during preparation`);
			}
			if (rejected.size) throw new AggregateError([...rejected.values()], 'Native pool preparation failed');
			expect(filled.size).toBe(32);
			expect(exited.size, 'native fillers must remain live before testing capacity rejection').toBe(0);
			const sid = lease.allocateSessionId();
			await expect(
				lease.value.spawnSession(sid, {
					file: '/bin/sh',
					args: ['-c', 'exit 0'],
					env: {},
					cwd: root,
					cols: 20,
					rows: 4,
				}),
			).rejects.toMatchObject({
				failure: { code: 'pty-unavailable', effect: 'none' },
			} satisfies Partial<NativeSpawnError>);
			await wait(() => helper.streamStats.sessionRoutes === 0, 1000);
			expect(helper.streamStats.replyClosePending).toBe(0);
			expect(browser.value.alive).toBe(true);
		} catch (error) {
			failures.push(error);
		} finally {
			await finishFixture(
				failures,
				() => {
					for (let sid = 1000; sid < 1032; sid++)
						child.stdin.write(encodeControl({ type: 'end', sid, force: true }));
				},
				() => wait(() => exited.size === filled.size),
				() => lease.release(),
				() => browser.release(),
				() => host.dispose(),
				() => {
					child.stdout.off('data', observe);
				},
				() => rm(root, { recursive: true, force: true }),
			);
		}
	},
	15000,
);

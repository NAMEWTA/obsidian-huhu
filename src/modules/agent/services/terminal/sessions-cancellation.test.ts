import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { afterAll, beforeAll, expect, test } from 'vitest';

const execute = promisify(execFile);
let directory: string;
let probe: string;

// Node rethrows AbortSignal listener errors outside the caller's try/catch. Run the real event in a
// child so an uncaught regression is observed without escaping into Vitest's own process.
beforeAll(async () => {
	directory = await mkdtemp(join(tmpdir(), 'huhu-session-cancel-'));
	probe = join(directory, 'probe.mjs');
	await build({
		stdin: {
			resolveDir: fileURLToPath(new URL('../../../../../', import.meta.url)),
			contents: `
import { NativeHost } from './src/host/desktop/native/host.ts';
import { TerminalSessions } from './src/modules/agent/services/terminal/sessions.ts';
import { normalizeTerminalSettings } from './src/modules/agent/core/terminal/settings.ts';
import { nativeCookieReader } from './src/shared/native/cookies.ts';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const entered = deferred(), spawned = deferred();
const generations = [];
const uncaught = [];
process.on('uncaughtException', error => uncaught.push(error.message));
let spawningFinished = false;
const host = new NativeHost(async events => {
 const state = { alive: true, events, cookie: deferred(), read: deferred(), lateEnds: 0 };
 generations.push(state);
 return {
  get alive() { return state.alive; }, version: 'fixture', terminalTermination: 1, requestStop() {},
  spawnSession: () => { entered.resolve(); return spawned.promise; },
  input() {}, resize() {}, acknowledge() {},
  end() { if (state.alive && spawningFinished) state.lateEnds++; },
  history: async () => [],
  request: async (_type, _op, _payload, signal) => {
   state.read.resolve();
   let cancel;
   const cancelled = new Promise((_resolve, reject) => { cancel = () => reject(signal.reason); });
   signal.addEventListener('abort', cancel, { once: true });
   try { return await Promise.race([state.cookie.promise, cancelled]); }
   finally { signal.removeEventListener('abort', cancel); }
  },
  dispose: async () => { state.alive = false; events.closed('closed'); },
 };
});
const sessions = new TerminalSessions({ native: host, environment: async () => ({}), platform: 'linux', settings: () => normalizeTerminalSettings({}), colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
const abort = new AbortController();
const creating = sessions.create({ signal: abort.signal, kind: 'shell', title: 'race', file: 'sh', args: [], cwd: '/tmp' });
await entered.promise;
const reader = nativeCookieReader(host);
const initialReading = reader.readCookies('/snapshot', 'chromium').then(value => ({ ok: true, value }), error => ({ ok: false, error: error.message }));
await generations[0].read.promise;
const mode = process.argv[2];
let closing;
const observeClose = () => sessions.dispose().then(() => ({ confirmed: true }), error => ({ confirmed: false, error: error.message }));
if (mode === 'dispose-abort') { closing = observeClose(); abort.abort(); }
else if (mode === 'abort-dispose') { abort.abort(); closing = observeClose(); }
else { generations[0].alive = false; generations[0].events.closed('native crash'); abort.abort(); closing = observeClose(); }
await new Promise(resolve => setImmediate(resolve));
let reading = initialReading;
if (mode === 'crash-abort') {
 const failed = await initialReading;
 if (failed.ok || failed.error !== 'native crash') throw new Error('crash must fail the original Cookie owner');
 reading = reader.readCookies('/new-snapshot', 'chromium').then(value => ({ ok: true, value }), error => ({ ok: false, error: error.message }));
 await new Promise(resolve => setImmediate(resolve));
 await generations[1].read.promise;
}
let closed = false;
closing.then(() => { closed = true; });
spawningFinished = true;
spawned.resolve(42);
await creating;
await new Promise(resolve => setImmediate(resolve));
const cleanupPendingBeforeExit = !closed;
generations[0].events.termination?.(1, { version: 1, sequence: 1, evidence: { root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: process.platform === 'win32' ? 'windows-job' : 'unix-session', remainingKnown: 0 }, output: 'drained' } });
generations[0].events.exit(1, 0, null);
const cleanup = await closing;
const current = generations.at(-1);
const browserConnected = current.alive;
current.cookie.resolve({ rows: [{ name: 'browser-survives' }] });
const cookie = await reading;
await host.dispose();
console.log(JSON.stringify({ cleanup, uncaught, browserConnected, cookie, cleanupPendingBeforeExit, lateEnds: generations[0].lateEnds, newGenerationEnds: generations[1]?.lateEnds ?? 0, finalAlive: current.alive }));
`,
		},
		bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: probe, logLevel: 'silent',
		alias: { obsidian: fileURLToPath(new URL('../../../../../scripts/obsidian-stub.ts', import.meta.url)) },
	});
});
afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

for (const mode of ['dispose-abort', 'abort-dispose', 'crash-abort']) test(`pending spawn cancellation stays local for ${mode} while Browser can continue`, async () => {
	const { stdout } = await execute(process.execPath, [probe, mode], { encoding: 'utf8', timeout: 10_000, windowsHide: true });
	const result = JSON.parse(stdout) as { cleanup: { confirmed: boolean }; uncaught: string[]; browserConnected: boolean; cookie: unknown; cleanupPendingBeforeExit: boolean; lateEnds: number; newGenerationEnds: number; finalAlive: boolean };
	expect(result.uncaught).toEqual([]);
	expect(result.browserConnected).toBe(true);
	expect(result.cookie).toEqual({ ok: true, value: { rows: [{ name: 'browser-survives' }] } });
	expect(result.finalAlive).toBe(false);
	if (mode === 'crash-abort') { expect(result.newGenerationEnds).toBe(0); expect(result.cleanup.confirmed).toBe(false); }
	else { expect(result.cleanup.confirmed).toBe(true); expect(result.cleanupPendingBeforeExit).toBe(true); expect(result.lateEnds).toBeGreaterThan(0); }
});

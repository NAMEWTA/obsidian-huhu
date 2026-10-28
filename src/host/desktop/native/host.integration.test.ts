import { existsSync } from 'node:fs';
import { mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { nativeCookieReader } from '../../../shared/native/cookies';
import { FrameDecoder } from '../../../shared/native/frames';
import { NativeShutdownError, type NativeLease } from '../../../shared/native/host';
import { NativeHost } from './host';
import { PtyHelper } from './helper';

const explicitBinary = process.env.HUHU_TEST_PTY_BINARY;
if (explicitBinary && !existsSync(explicitBinary))
	throw new Error(`HUHU_TEST_PTY_BINARY does not exist: ${explicitBinary}`);
const binary =
	explicitBinary ??
	['release', 'debug']
		.map((profile) =>
			resolve(`native/pty-server/target/${profile}/huhu-pty${process.platform === 'win32' ? '.exe' : ''}`),
		)
		.find((file) => existsSync(file));

test.skipIf(!binary)(
	'real PTY shutdown leaves an admitted SQLite Cookie read connected and final release reaps the helper',
	async () => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-native-owner-'));
		const sqlite = createRequire(import.meta.url)('node:sqlite') as {
			DatabaseSync: new (path: string) => { exec(sql: string): void; close(): void };
		};
		const path = join(root, 'cookies.sqlite'),
			db = new sqlite.DatabaseSync(path);
		db.exec(
			"CREATE TABLE moz_cookies(host TEXT,name TEXT,value TEXT,path TEXT,expiry INTEGER,isSecure INTEGER,isHttpOnly INTEGER,sameSite INTEGER); INSERT INTO moz_cookies VALUES('.example.org','session','retained','/',1800000000,1,1,2); BEGIN EXCLUSIVE;",
		);
		let helper: PtyHelper | undefined;
		const host = new NativeHost(async (events) => {
			helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {});
			return helper;
		});
		const agent = await host.acquire('pty');
		const sid = agent.allocateSessionId();
		let locked = true;
		try {
			const pid = await agent.value.spawnSession(sid, {
				file: process.execPath,
				args: ['-e', 'setInterval(() => {}, 1000)'],
				cwd: root,
				env: {},
				cols: 80,
				rows: 24,
			});
			const reading = nativeCookieReader(host).readCookies(path, 'firefox');
			// The Cookie lease is admitted synchronously before Agent release; the SQLite read waits on this fixture's lock.
			await agent.release();
			expect(helper?.alive).toBe(true);
			if (pid && process.platform !== 'win32') expect(() => process.kill(pid, 0)).toThrow();
			db.exec('COMMIT');
			locked = false;
			await expect(reading).resolves.toMatchObject({ rows: [{ name: 'session', value: 'retained' }] });
			expect(helper?.alive).toBe(false);
			expect(() => process.kill(helper!.pid, 0)).toThrow();
		} finally {
			const errors: unknown[] = [];
			for (const close of [
				() => {
					if (locked) db.exec('ROLLBACK');
				},
				() => agent.release(),
				() => host.dispose(),
				() => db.close(),
				() => rm(root, { recursive: true, force: true }),
			]) {
				try {
					await close();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length) throw new AggregateError(errors, 'Native owner fixture cleanup failed');
		}
	},
	15_000,
);

test.skipIf(!binary || process.platform !== 'linux')(
	'Cookie read and final native cleanup failures both survive the public reader and allow a later explicit generation',
	async () => {
		const root = await mkdtemp('/tmp/huhu-t08-cookie-repair-');
		let evidence: string | undefined;
		const identity = async (path: string) => {
			const canonical = await realpath(path), info = await stat(canonical, { bigint: true });
			return { path: canonical, dev: String(info.dev), ino: String(info.ino) };
		};
		const observations: Record<string, unknown> = { root };
		const helpers: PtyHelper[] = [];
		const children: ChildProcessWithoutNullStreams[] = [];
		const exits: Array<{ code: number | null; signal: string | null } | undefined> = [];
		const cookieFrames: Record<string, unknown>[] = [];
		let settled!: () => void;
		const fence = new Promise<void>(resolve => { settled = resolve; });
		const host = new NativeHost(async events => {
			const helper = await PtyHelper.start(binary!, events, globalThis as unknown as Window, {
				HOME: root, XDG_RUNTIME_DIR: root,
			});
			const index = helpers.length;
			helpers.push(helper);
			const child = (helper as unknown as { child: ChildProcessWithoutNullStreams }).child;
			children.push(child);
			child.once('exit', (code, signal) => { exits[index] = { code, signal }; });
			const frames = new FrameDecoder();
			child.stdout.on('data', chunk => {
				for (const frame of frames.push(chunk))
					if (frame.kind === 1 && frame.message.type === 'cookies-result') cookieFrames.push(frame.message);
			});
			return helper;
		});
		let agent: NativeLease | undefined, next: NativeLease | undefined;
		let cleanupError: NativeShutdownError | undefined;
		let failed = false, failure: unknown;
		try {
			observations.rootMode = (await stat(root)).mode & 0o777;
			if (process.env.HUHU_COOKIE_TEST_EVIDENCE)
				evidence = await mkdtemp(join(process.env.HUHU_COOKIE_TEST_EVIDENCE, 'native-dual-'));
			const entry = join(root, 'entry.cjs');
			await writeFile(entry, "const fs=require('node:fs');const cap=JSON.parse(fs.readFileSync(process.env.HUHU_EDITOR_CAPABILITY_FILE));fs.writeFileSync('endpoint',cap.endpoint);", { mode: 0o600 });
			agent = await host.acquire('pty', {
				output(sid, bytes) { agent!.value.acknowledge(sid, bytes.length); },
				replySettled() { settled(); },
			});
			const sid = agent.allocateSessionId();
			const pid = await agent.value.spawnSession(sid, {
				file: process.execPath, args: [entry], cwd: root, env: {}, cols: 80, rows: 24,
				editor: {
					identity: { runtimeId: 'cookie-cleanup-fixture' }, provider: 'pi',
					recipe: { version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry) },
				},
			});
			const binding = agent.value.editorBinding!(sid)!;
			// This endpoint fixture exits without connecting an app; its rejected readiness is expected.
			void binding.ready.catch(() => {});
			await fence;
			await binding.closed;
			await binding.close();
			const endpoint = await readFile(join(root, 'endpoint'), 'utf8');
			observations.endpoint = endpoint;
			observations.originalSocket = await identity(endpoint);
			await rename(endpoint, endpoint + '.original');
			const sentinel = 'Cookie cleanup replacement sentinel';
			await writeFile(endpoint, sentinel, { mode: 0o600 });
			const sentinelIdentity = await identity(endpoint);
			observations.sentinelBefore = { ...sentinelIdentity, content: sentinel };
			observations.helperPid = helpers[0]!.pid;
			observations.ptyPid = pid;
			if (evidence) await writeFile(join(evidence, 'before-read.json'), JSON.stringify(observations, null, 2));
			const missing = join(root, 'missing-cookie-snapshot.sqlite');
			let acquires = 0;
			const reader = nativeCookieReader({
				async acquire(...args) {
					acquires++;
					const cookies = await host.acquire(...args);
					// The real Cookie owner is admitted before releasing the original PTY owner.
					await agent!.release();
					return cookies;
				},
			});
			const result: unknown = await reader.readCookies(missing, 'chromium').catch(error => error);
			cleanupError = result instanceof AggregateError
				? result.errors.find((error: unknown): error is NativeShutdownError => error instanceof NativeShutdownError)
				: result instanceof NativeShutdownError ? result : undefined;
			observations.cookieFrames = cookieFrames;
			observations.publicError = result instanceof Error ? {
				name: result.name, message: result.message,
				cause: result.cause instanceof Error ? result.cause.message : result.cause,
				errors: result instanceof AggregateError ? result.errors.map((error: unknown) => error instanceof Error ? { name: error.name, message: error.message } : error) : undefined,
			} : result;
			if (result instanceof AggregateError)
				observations.originalObjectRelations = { causeIsRead: result.cause === result.errors[0], cleanupIsSecond: result.errors[1] === cleanupError };
			observations.cleanupOutcome = cleanupError?.outcome;
			observations.exits = exits;
			observations.sentinelAfter = { ...await identity(endpoint), content: await readFile(endpoint, 'utf8') };
			if (evidence) await writeFile(join(evidence, 'after-read.json'), JSON.stringify(observations, null, 2));
			expect(acquires).toBe(1);
			expect(cookieFrames).toHaveLength(1);
			expect(cookieFrames[0]).toMatchObject({ type: 'cookies-result', error: expect.stringContaining(missing) });
			expect(result).toBeInstanceOf(AggregateError);
			const aggregate = result as AggregateError;
			expect(aggregate.errors).toHaveLength(2);
			expect(aggregate.errors[0]).toBeInstanceOf(Error);
			expect(aggregate.errors[0].message).toBe(cookieFrames[0]!.error);
			expect(aggregate.cause).toBe(aggregate.errors[0]);
			expect(aggregate.message).toContain(aggregate.errors[0].message);
			expect(aggregate.errors[1]).toBe(cleanupError);
			expect(cleanupError).toBeInstanceOf(NativeShutdownError);
			expect(cleanupError!.outcome).toMatchObject({ state: 'exited', code: 1, signal: null, forced: false, stdioClosed: true });
			const termination = await cleanupError!.termination;
			observations.termination = termination;
			expect(termination).toMatchObject({ state: 'exited', code: 1, signal: null, forced: false });
			expect(observations.sentinelAfter).toEqual({ ...sentinelIdentity, content: sentinel });
			expect(exits[0]).toEqual({ code: 1, signal: null });
			expect(helpers[0]!.alive).toBe(false);
			expect(() => process.kill(helpers[0]!.pid, 0)).toThrow();
			if (pid) expect(() => process.kill(pid, 0)).toThrow();
			expect(helpers).toHaveLength(1);
			next = await host.acquire('cookies');
			expect(helpers).toHaveLength(2);
			expect(helpers[1]!.pid).not.toBe(helpers[0]!.pid);
			await next.release();
			expect(helpers[1]!.alive).toBe(false);
			expect(() => process.kill(helpers[1]!.pid, 0)).toThrow();
			observations.nextHelperPid = helpers[1]!.pid;
			observations.nextExit = exits[1];
		} catch (error) {
			failed = true; failure = error;
		} finally {
			const errors: unknown[] = failed ? [failure] : [];
			for (const close of [() => agent?.release(), () => next?.release(), () => host.dispose()]) {
				try { await close(); }
				catch (error) { if (error !== cleanupError) errors.push(error); }
			}
			observations.beforeFixtureCleanup = { helpers: helpers.map(helper => ({ pid: helper.pid, alive: helper.alive })), exits };
			for (const child of children) {
				if (child.exitCode === null && child.signalCode === null) {
					const closed = new Promise<void>(resolve => { child.once('close', () => resolve()); });
					child.kill('SIGKILL');
					await closed;
					errors.push(new Error('Cookie fixture required external process cleanup'));
				}
			}
			for (const close of [
				async () => { if (evidence) await writeFile(join(evidence, 'before-cleanup.json'), JSON.stringify(observations, null, 2)); },
				() => rm(root, { recursive: true, force: true }),
				async () => { if (evidence) await writeFile(join(evidence, 'cleanup.json'), JSON.stringify({ root, rootExists: existsSync(root), errors: errors.map(String) }, null, 2)); },
			]) {
				try { await close(); } catch (error) { errors.push(error); }
			}
			if (errors.length === 1) throw errors[0];
			if (errors.length) throw new AggregateError(errors, 'Cookie integration fixture failed');
		}
	},
	15_000,
);

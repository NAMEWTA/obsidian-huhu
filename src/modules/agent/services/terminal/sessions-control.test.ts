import { expect, test, vi } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import type { NativeEvents, NativeSpawnOptions } from '../../../../shared/native/host';
import type { SessionRecord } from '../spaces/records';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { TerminalSessions } from './sessions';

test('committed rename before deferred model creation survives adoption; stale captured attempt cannot rename the current runtime', async () => {
	let events!: NativeEvents,
		release!: (env: Record<string, string>) => void,
		sequence = 0;
	const environment = vi.fn(
		() =>
			new Promise<Record<string, string>>((r) => {
				release = r;
			}),
	);
	const exit = (sid: number) => {
		events.termination?.(sid, {
			version: 1,
			sequence: ++sequence,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		events.exit(sid, 0, null);
	};
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			terminalTermination: 1,
			version: 'fixture',
			requestStop: exit,
			spawnSession: async () => 42,
			input() {},
			resize() {},
			acknowledge() {},
			end: exit,
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => {
				e.closed('closed');
			},
		};
	});
	const sessions = new TerminalSessions({
		native,
		environment,
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const record: SessionRecord = {
		id: 'session',
		spaceId: 'space',
		title: 'Old',
		kind: 'shell',
		createdAt: 1,
		lastAttempt: { runtimeId: 'runtime', acceptedAt: 1, state: 'unconfirmed' },
	};
	let creating: ReturnType<TerminalSessions['create']> | undefined;
	try {
		const ref = sessions.reserveManaged(record, 'Old');
		creating = sessions.create({
			kind: 'shell',
			title: 'Shell auto',
			file: 'sh',
			args: [],
			cwd: '/fixture',
			runtime: ref,
		});
		await vi.waitFor(() => expect(environment).toHaveBeenCalledOnce());
		expect(sessions.get(ref.runtimeId)).toBeUndefined();
		sessions.renameManaged({ ...record, title: 'Committed' });
		sessions.renameManaged({
			...record,
			title: 'Stale',
			lastAttempt: { runtimeId: 'old-runtime', acceptedAt: 0, state: 'settled' },
		});
		release({});
		const session = await creating;
		expect(session.title).toBe('Committed');
		expect(sessions.managedFor(ref)!.record.title).toBe('Committed');
		expect(sessions.managedFor(ref)!.ref).toEqual(ref);
	} finally {
		release?.({});
		await creating;
		await sessions.dispose();
		await native.dispose();
	}
});

test('captured PTY control route precedes hooks and is synchronously revalidated after beforeSpawn', async () => {
	let events!: NativeEvents,
		current = true,
		sequence = 0;
	const spawn = vi.fn(async (_sid: number, _options: NativeSpawnOptions) => 42);
	const exit = (sid: number) => {
		events.termination?.(sid, {
			version: 1,
			sequence: ++sequence,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		events.exit(sid, 0, null);
	};
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			version: 'fixture',
			terminalTermination: 1,
			requestStop: exit,
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge() {},
			end: exit,
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => e.closed('closed'),
		};
	});
	const assertCurrent = vi.fn(() => {
		if (!current) throw new Error('captured generation lost');
	});
	const routeEnvironment = vi.fn(async () => ({
		env: {
			HUHU_SESSION_ID: 'runtime',
			HUHU_STABLE_SESSION_ID: 'session',
			HUHU_SPACE_ID: 'space',
			HUHU_CONTROL_LOCATOR: '/owned',
		},
		assertCurrent,
	}));
	const hooks = vi.fn(async (_id: unknown, env: Record<string, string>) => {
		expect(env.HUHU_CONTROL_LOCATOR).toBe('/owned');
		return { env: { HUHU_CONTROL_LOCATOR: '/spoof', HUHU_SESSION_ID: 'spoof' }, close() {} };
	});
	const sessions = new TerminalSessions({
		native,
		environment: async () => ({}),
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		agentHooks: hooks,
		routeEnvironment,
	} as ConstructorParameters<typeof TerminalSessions>[0]);
	const record: SessionRecord = {
		id: 'session',
		spaceId: 'space',
		title: 'Agent',
		kind: 'agent',
		agentId: 'pi',
		createdAt: 1,
		lastAttempt: { runtimeId: 'runtime', acceptedAt: 1, state: 'unconfirmed' },
	};
	try {
		const ref = sessions.reserveManaged(record, 'Agent');
		await sessions.create({
			runtime: ref,
			kind: 'agent',
			agentId: 'pi',
			title: 'Agent',
			file: 'agent',
			args: [],
			cwd: '/fixture',
			hooks: true,
			beforeSpawn: async () => {
				expect(routeEnvironment).toHaveBeenCalledOnce();
			},
		});
		expect(assertCurrent).toHaveBeenCalledTimes(2);
		expect(spawn.mock.calls[0]?.[1]).toMatchObject({
			env: { HUHU_SESSION_ID: 'runtime', HUHU_STABLE_SESSION_ID: 'session', HUHU_CONTROL_LOCATOR: '/owned' },
		});
		const second = { ...record, id: 'session2', lastAttempt: { ...record.lastAttempt!, runtimeId: 'runtime2' } };
		const ref2 = sessions.reserveManaged(second, 'Agent');
		const rejected = await sessions.create({
			runtime: ref2,
			kind: 'shell',
			title: 'Shell',
			file: 'sh',
			args: [],
			cwd: '/fixture',
			beforeSpawn: async () => {
				current = false;
			},
		});
		expect(rejected.connection).toBe('failed');
		expect(rejected.error).toBe('captured generation lost');
		expect(spawn).toHaveBeenCalledOnce();
	} finally {
		await sessions.dispose();
		await native.dispose();
	}
});

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { snapshotSpawnEnvironment } from '../../../../shared/native/input';
import { PI_EXTENSION } from '../../platform/desktop/hooks/native-extensions';

const officialArtifacts = process.env.HUHU_PI_ARTIFACT_TEST_ROOT;
test
	.skipIf(!officialArtifacts)
	.each([
		'qualified',
		'loader-environment',
		'missing-extension',
		'fullscreen',
		'capability-absent',
		'cancelled',
		'space-revoked',
	] as const)(
	'final helper environment eligibility %s preserves the requested launch or rejects revoked admission',
	async (scenario) => {
		const root = await mkdtemp(join(tmpdir(), 'huhu-a-enrollment-'));
		onTestFinished(() => rm(root, { recursive: true, force: true }));
		const extension = join(root, 'agent/extensions/huhu-status.ts');
		await mkdir(join(root, 'agent/extensions'), { recursive: true });
		if (scenario !== 'missing-extension') await writeFile(extension, PI_EXTENSION);
		let spawned!: NativeSpawnOptions;
		const node = process.execPath,
			cli = join(officialArtifacts!, 'artifact/package/dist/bundle/cli.js');
		const finalEnv = {
			PATH: '/usr/bin:/bin',
			PI_CODING_AGENT_DIR: join(root, 'agent'),
			JITI_FS_CACHE: 'false',
			...(scenario === 'loader-environment' ? { NODE_OPTIONS: '--no-warnings' } : {}),
		};
		const abort = new AbortController();
		let snapshotTaken = false;
		const native = new NativeHost(async (events) => {
			const exit = (sid: number) => {
				events.termination?.(sid, {
					version: 1,
					sequence: 1,
					evidence: {
						root: { state: 'exited', code: 0, signal: null },
						cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
						output: 'drained',
					},
				});
				events.exit(sid, 0, null);
			};
			return {
				alive: true,
				version: 'fixture',
				editorTransactions: scenario === 'capability-absent' ? undefined : 1,
				terminalTermination: 1,
				requestStop: exit,
				spawnEnvironment: (overrides) => {
					snapshotTaken = true;
					if (scenario === 'cancelled') queueMicrotask(() => abort.abort());
					return snapshotSpawnEnvironment(finalEnv, overrides, 'unix');
				},
				editorBinding: () => undefined,
				spawnSession: async (_sid, options) => {
					spawned = options;
					return 42;
				},
				input() {},
				resize() {},
				acknowledge() {},
				end: exit,
				history: async <T>() => [] as T,
				request: async <T>() => ({}) as T,
				dispose: async () => {
					events.closed('closed');
				},
			};
		});
		const sessions = new TerminalSessions({
			native,
			environment: async () => ({}),
			platform: 'linux',
			settings: () => normalizeTerminalSettings({ scrollback: 100 }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		onTestFinished(async () => {
			await sessions.dispose();
			await native.dispose();
		});
		const record: SessionRecord = {
			id: 'enrollment-session',
			spaceId: 'explicit-space',
			title: 'Pi',
			kind: 'agent',
			agentId: 'pi',
			createdAt: 1,
			lastAttempt: { runtimeId: 'enrollment-runtime', acceptedAt: 1, state: 'unconfirmed' },
		};
		const runtime = sessions.reserveManaged(record);
		const args = [cli, '-ne', '-e', extension, ...(scenario === 'fullscreen' ? ['--tui-mode', 'fullscreen'] : [])];
		const creating = sessions.create({
			runtime,
			kind: 'agent',
			agentId: 'pi',
			title: 'Pi',
			file: node,
			args,
			cwd: root,
			signal: abort.signal,
			beforeSpawn: async () => {
				if (scenario === 'space-revoked' && snapshotTaken) throw Error('Space admission revoked');
			},
		});
		if (scenario === 'cancelled' || scenario === 'space-revoked') {
			expect((await creating).connection).toBe('failed');
			expect(spawned).toBeUndefined();
			return;
		}
		const session = await creating;
		expect(session.connection).toBe('connected');
		expect(spawned).toMatchObject({ file: node, args, cwd: root });
		if (scenario === 'qualified')
			expect(spawned.editor).toMatchObject({
				identity: { runtimeId: runtime.runtimeId },
				provider: 'pi',
				recipe: { profileId: 'pi-1.4.0-jiti-2.7.0' },
			});
		else expect(spawned.editor).toBeUndefined();
		expect(args).toEqual([
			cli,
			'-ne',
			'-e',
			extension,
			...(scenario === 'fullscreen' ? ['--tui-mode', 'fullscreen'] : []),
		]);
	},
	30_000,
);

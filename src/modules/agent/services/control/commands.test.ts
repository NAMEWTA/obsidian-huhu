// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest';
import { captureForegroundIntent } from '../launch/foreground-intent';
import { SpaceService } from '../spaces/space-service';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { TerminalSessions } from '../terminal/sessions';
import { NativeHost } from '../../../../host/desktop/native/host';
import type { NativeEvents } from '../../../../shared/native/host';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { WorkspaceService, type WorkspaceLaunchPort } from '../workspace-service';
import type { TextStorage } from '../../../../shared/storage/ports';

async function fixture(options: { deferStop?: boolean } = {}) {
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, s) => {
			files.set(p, s);
		},
		mkdir: async () => {},
	};
	const root = { canonicalPath: '/fixture', dev: '1', ino: '2' },
		vault = { vaultId: 'v', deviceId: 'd', rootPath: '/fixture', root };
	const spaces = new SpaceService({
		storage,
		instanceId: 'activity',
		report: vi.fn(),
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/fixture' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'activity',
				port: 12345,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	let events!: NativeEvents,
		sequence = 0;
	const spawn = vi.fn(async () => 42);
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
	const requestStop = vi.fn((sid: number) => {
		if (!options.deferStop) exit(sid);
	});
	const acknowledge = vi.fn();
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			version: 'fixture',
			terminalTermination: 1,
			requestStop,
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge,
			end: exit,
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => {
				e.closed('closed');
			},
		};
	});
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({
		native,
		environment,
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const launch: WorkspaceLaunchPort = {
		shell: (o) =>
			sessions.create({
				kind: 'shell',
				title: 'shell',
				file: 'sh',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		agent: (agentId, o) =>
			sessions.create({
				kind: 'agent',
				agentId,
				title: 'agent',
				file: 'agent',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		resume: async () => undefined,
		account: () => '',
		report: vi.fn(),
	};
	const clock = {
		setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
		clearTimeout: (id: number) => clearTimeout(id),
	};
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(spaces, clock, vi.fn()),
		sessions,
		launch,
		() => undefined,
		spaces,
	);
	await workspace.persistence.ready;
	return {
		environment,
		workspace,
		spaces,
		sessions,
		spawn,
		launch,
		storage,
		exit,
		requestStop,
		acknowledge,
		output(sid: number, bytes: Uint8Array) {
			events.output(sid, bytes);
		},
		async close() {
			await workspace.dispose();
			await sessions.dispose();
			await native.dispose();
		},
	};
}

import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import type { ControlRequest, ControlResponse } from '../../../../shared/native/control-wire';
import type { NativeControlCall, NativeControlRegistration } from '../../../../shared/native/host';

const request = (
	operation: ControlRequest['operation'],
	target: ControlRequest['target'] = {},
	params: ControlRequest['params'] = {},
): ControlRequest => ({ protocolVersion: 1, requestId: 'test', operation, target, params });
test('real business commands keep background Space B headless and rename persistent identity without Pane changes', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A' }),
			b = await f.spaces.create({ name: 'B' });
		await f.workspace.selectSpace(a.id);
		const commands = new ControlCommands(f.spaces, f.workspace, f.sessions),
			scope = await f.spaces.getControlScope();
		const command = commands.capture(request('terminal.start', { spaceId: b.id }, { name: 'old' }));
		await command.preflight(scope);
		const progress = vi.fn();
		const result = await command.run(progress);
		expect(result).toMatchObject({ phase: 'running', effect: 'completed' });
		expect(progress).toHaveBeenCalledOnce();
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(Object.keys(f.workspace.store.getState().tabs)).toHaveLength(0);
		const summary = f.workspace.listManaged(b.id)[0]!;
		const renamed = commands.capture(request('session.rename', { sessionId: summary.sessionId }, { name: 'new' }));
		await renamed.preflight(scope);
		await renamed.run(() => {});
		expect(f.spaces.store.getState().records.sessions[summary.sessionId]!.title).toBe('new');
		expect(f.sessions.get(summary.runtime!.runtimeId)!.title).toBe('new');
		const got = commands.capture(request('session.get', { sessionId: summary.sessionId }));
		await got.preflight(scope);
		expect(await got.run(() => {})).toMatchObject({ data: { spaceId: b.id, title: 'new' } });
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		await f.close();
	}
});
test('target validation rejects absent Space, explicit conflicts and old runtime without helper effects; Pane targets remain explicit', async () => {
	const f = await fixture();
	try {
		const commands = new ControlCommands(f.spaces, f.workspace, f.sessions),
			space = await f.spaces.create({ name: 'A' });
		expect(() => commands.capture(request('terminal.start'))).toThrowError(
			expect.objectContaining({ code: 'TARGET_REQUIRED' }),
		);
		expect(() => commands.capture(request('pane.split', { spaceId: space.id }, {}))).toThrowError(
			expect.objectContaining({ code: 'TARGET_REQUIRED' }),
		);
		const created = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture launch failed');
		const row = created.session;
		expect(() =>
			commands.capture(request('terminal.get', { sessionId: row.sessionId, runtimeId: 'old' })),
		).toThrowError(expect.objectContaining({ code: 'STALE_RUNTIME' }));
		expect(() =>
			commands.capture(request('session.get', { sessionId: row.sessionId, spaceId: 'other' })),
		).toThrowError(expect.objectContaining({ code: 'SCOPE_MISMATCH' }));
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		await f.close();
	}
});

test('agent.wait is a read-only ordinary command and matches the captured current runtime', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'wait' });
		const created = await f.workspace.createManaged({ kind: 'agent', agentId: 'pi', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture launch failed');
		const target = {
			spaceId: space.id,
			sessionId: created.session.sessionId,
			runtimeId: created.session.runtime.runtimeId,
		};
		const session = f.sessions.get(target.runtimeId)!;
		const source = session.bindActivityRuntime().bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'same-instance' },
		})!;
		source.observe({ deliveryId: '1', sourceSequence: 1, event: 'registration', state: 'idle' });
		const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
		const command = commands.capture(request('agent.wait', target, { state: 'idle' }));
		expect(command.mutation).toBe(false);
		await command.preflight(await f.spaces.getControlScope());
		expect(await command.run(() => {})).toMatchObject({
			phase: 'state-matched',
			effect: 'none',
			data: { wait: { status: 'matched', at: { runtimeId: target.runtimeId } } },
		});
	} finally {
		await f.close();
	}
});

test('Pane adapter uses the original owner: source B and inserted C remain distinct, resize and close never stop', async () => {
	const f = await fixture();
	const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
	try {
		const a = await f.spaces.create({ name: 'same cwd A' }),
			b = await f.spaces.create({ name: 'same cwd B' });
		await f.workspace.selectSpace(a.id);
		const create = async (title: string) => {
			const value = await f.workspace.createManaged({ kind: 'shell', spaceId: b.id, title });
			if (value.status !== 'created') throw Error('fixture');
			return value.session;
		};
		const sb = await create('B'),
			sc = await create('C');
		const scope = await f.spaces.getControlScope();
		const run = async (
			op: ControlRequest['operation'],
			target: ControlRequest['target'],
			params: ControlRequest['params'] = {},
		) => {
			const cmd = commands.capture(request(op, target, params));
			try {
				await cmd.preflight(scope);
				const result = await cmd.run(() => {});
				return { ...result, target: cmd.target };
			} finally {
				cmd.dispose();
			}
		};
		const attached = await run('pane.attach', { sessionId: sb.sessionId });
		expect(attached).toMatchObject({
			effect: 'completed',
			data: {
				layoutPublished: true,
				persisted: true,
				pane: { sessionId: sb.sessionId, runtimeId: sb.runtime.runtimeId },
			},
			target: {
				spaceId: b.id,
				sessionId: sb.sessionId,
				runtimeId: sb.runtime.runtimeId,
				paneId: expect.any(String),
			},
		});
		const paneId = attached.target.paneId!;
		expect((await run('pane.attach', { sessionId: sb.sessionId })).target.paneId).toBe(paneId);
		const split = await run(
			'pane.split',
			{ paneId, sessionId: sc.sessionId, runtimeId: sc.runtime.runtimeId },
			{ direction: 'column' },
		);
		expect(split).toMatchObject({
			effect: 'completed',
			target: { paneId, sessionId: sb.sessionId, runtimeId: sb.runtime.runtimeId },
			data: {
				pane: { sessionId: sb.sessionId },
				insertedPane: { sessionId: sc.sessionId, runtimeId: sc.runtime.runtimeId },
			},
		});
		const inserted = (split.data as { insertedPane: { paneId: string } }).insertedPane;
		expect(await run('pane.resize', { paneId: inserted.paneId }, { ratio: 0.15 })).toMatchObject({
			effect: 'completed',
			data: { persisted: true },
		});
		expect(await run('pane.list', { spaceId: b.id })).toMatchObject({
			effect: 'none',
			data: { rows: [expect.objectContaining({ paneId }), expect.objectContaining({ paneId: inserted.paneId })] },
		});
		expect(await run('pane.close', { paneId: inserted.paneId })).toMatchObject({
			effect: 'completed',
			target: { paneId: inserted.paneId, sessionId: sc.sessionId },
		});
		expect(f.sessions.get(sc.runtime.runtimeId)?.running).toBe(true);
		expect(f.requestStop).not.toHaveBeenCalled();
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		commands.close();
		await f.close();
	}
});

test('Pane paging uses real dirty layout revisions, bounded rows and query scope without writer side effects', async () => {
	const f = await fixture();
	const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
	try {
		const a = await f.spaces.create({ name: 'A' }),
			b = await f.spaces.create({ name: 'B' });
		await f.workspace.selectSpace(a.id);
		for (let n = 0; n < 3; n++) {
			const value = await f.workspace.createManaged({ kind: 'shell', spaceId: a.id });
			if (value.status !== 'created') throw Error('fixture');
			await f.workspace.panes.attach(value.session);
		}
		const scope = await f.spaces.getControlScope();
		const list = async (target: ControlRequest['target'] = {}, params: ControlRequest['params'] = {}) => {
			const cmd = commands.capture(request('pane.list', target, params));
			try {
				await cmd.preflight(scope);
				return await cmd.run(() => {});
			} finally {
				cmd.dispose();
			}
		};
		const writes = vi.spyOn(f.storage, 'write'),
			random = vi.spyOn(crypto, 'randomUUID');
		const first = await list(),
			second = await list();
		expect(first).toEqual(second);
		expect(writes).not.toHaveBeenCalled();
		expect(random).not.toHaveBeenCalled();
		const paged = await list({}, { limit: 1 }),
			cursor = (paged.data as { nextCursor: string }).nextCursor;
		expect(cursor).toBeTruthy();
		expect(await list({}, { limit: 1, cursor })).toEqual(await list({}, { limit: 1, cursor }));
		await expect(list({ spaceId: b.id }, { limit: 1, cursor })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
		await expect(list({}, { limit: 2, cursor })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
		f.workspace.store.setState(
			(view) => ({
				...view,
				tabs: Object.fromEntries(
					Object.entries(view.tabs).map(([id, tab]) => [id, { ...tab, customTitle: 'dirty GUI' }]),
				),
			}),
			true,
		);
		await expect(list({}, { limit: 1, cursor })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
		// Full, legal opaque IDs and long titles come from the production layout owner.
		f.workspace.store.setState(
			(view) => ({
				...view,
				tabs: Object.fromEntries(
					Object.entries(view.tabs).map(([id, tab], i) => [
						id,
						tab.kind === 'terminal'
							? {
									...tab,
									customTitle: '中'.repeat(5000),
									panes: Object.fromEntries(
										Object.entries(tab.panes).map(([key, info]) => [
											key,
											{ ...info, paneId: 'P' + i + '界'.repeat(1364) },
										]),
									),
								}
							: tab,
					]),
				),
			}),
			true,
		);
		const wide = await list();
		expect((wide.data as { nextCursor?: string }).nextCursor).toBeTruthy();
		const tail = await list({}, { cursor: (wide.data as { nextCursor: string }).nextCursor });
		expect((wide.data as { rows: unknown[] }).rows.length + (tail.data as { rows: unknown[] }).rows.length).toBe(3);
		expect((wide.data as { rows: unknown[] }).rows.length).toBeGreaterThan(0);
		const wire = {
			protocolVersion: 1,
			requestId: 'test',
			operation: 'pane.list',
			target: { vaultId: scope.vaultId, instanceId: scope.instanceId, spaceId: a.id },
			ok: true,
			...wide,
		};
		expect(new TextEncoder().encode(JSON.stringify(wire)).length).toBeLessThanOrEqual(49152);
		f.workspace.store.setState(
			(view) => ({
				...view,
				tabs: Object.fromEntries(
					Object.entries(view.tabs).map(([id, tab]) => [id, { ...tab, customTitle: '中'.repeat(18000) }]),
				),
			}),
			true,
		);
		await expect(list()).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDED' });

		const projected = (await f.workspace.panes.list()).panes[0]!;
		const overhead = new TextEncoder().encode(JSON.stringify({ ...projected, title: '' })).length;
		const title = 'x'.repeat(49152 - 150 - overhead);
		f.workspace.store.setState(
			(view) => ({
				...view,
				tabs: Object.fromEntries(
					Object.entries(view.tabs).map(([id, tab]) => [id, { ...tab, customTitle: title }]),
				),
			}),
			true,
		);
		const row = (await f.workspace.panes.list()).panes[0]!;
		expect(new TextEncoder().encode(JSON.stringify(row)).length).toBeLessThanOrEqual(49152);
		// The real single row fits; the same row plus the correlated target/cursor envelope does not.
		await expect(list()).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDED' });
		random.mockRestore();
	} finally {
		commands.close();
		await f.close();
	}
});

test('Pane adapter preserves unknown in-flight writes and the original monotonic deadline without replay', async () => {
	const f = await fixture();
	const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
	let release!: () => void;
	try {
		const space = await f.spaces.create({ name: 'A' });
		await f.workspace.selectSpace(space.id);
		const value = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (value.status !== 'created') throw Error('fixture');
		const scope = await f.spaces.getControlScope(),
			original = f.storage.write.bind(f.storage);
		let held = false;
		vi.spyOn(f.storage, 'write').mockImplementation(async (p, text) => {
			if (!held) {
				held = true;
				await new Promise<void>((r) => {
					release = r;
				});
			}
			await original(p, text);
		});
		const abort = new AbortController(),
			deadline = performance.now() + 500;
		const cmd = commands.capture(request('pane.attach', { sessionId: value.session.sessionId }), {
			signal: abort.signal,
			deadline,
		});
		await cmd.preflight(scope);
		const pending = cmd.run(() => {});
		await vi.waitFor(() => expect(held).toBe(true));
		abort.abort();
		expect(await pending).toMatchObject({
			effect: 'unknown',
			data: { layoutPublished: true, persisted: false, pane: { sessionId: value.session.sessionId } },
			error: { code: 'WAIT_CANCELLED' },
		});
		release();
		await f.workspace.persistence.flush();
		expect((await f.workspace.panes.list()).panes).toHaveLength(1);
		const expired = commands.capture(request('pane.close', { paneId: cmd.target.paneId! }), {
			signal: new AbortController().signal,
			deadline: performance.now() - 1,
		});
		await expired.preflight(scope);
		expect(await expired.run(() => {})).toMatchObject({
			effect: 'none',
			data: { layoutPublished: false, persisted: false },
			error: { code: 'WAIT_TIMEOUT' },
		});
		expect(f.spawn).toHaveBeenCalledOnce();
		expect(f.requestStop).not.toHaveBeenCalled();
		cmd.dispose();
		expired.dispose();
	} finally {
		release?.();
		commands.close();
		await f.close();
	}
});

test('Pane mutation reserves a complete success and failure envelope before any owner publication', async () => {
	const f = await fixture();
	const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
	try {
		const space = await f.spaces.create({ name: 'A' });
		const value = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (value.status !== 'created') throw Error('fixture');
		const scope = await f.spaces.getControlScope(),
			writes = vi.spyOn(f.storage, 'write');
		const cmd = commands.capture(request('pane.attach', { sessionId: value.session.sessionId }));
		await expect(cmd.preflight({ ...scope, vaultId: 'v'.repeat(40000) })).rejects.toMatchObject({
			code: 'CAPACITY_EXCEEDED',
		});
		expect(writes).not.toHaveBeenCalled();
		expect((await f.workspace.panes.list(space.id)).panes).toHaveLength(0);
		cmd.dispose();
	} finally {
		commands.close();
		await f.close();
	}
});

import { emptyWorkspace } from '../../core/workspace/model';

test('the adapter addresses the exact 3069-byte legacy tuple and cold queries never mint or adopt a layout', async () => {
	const f = await fixture();
	const commands = new ControlCommands(f.spaces, f.workspace, f.sessions);
	try {
		const space = await f.spaces.create({ name: 'legacy cold' });
		const created = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id });
		if (created.status !== 'created') throw Error('fixture');
		const ref = created.session,
			key = ref.runtime.runtimeId;
		const bytes = new TextEncoder().encode(JSON.stringify(['space', space.id, '', key])).length;
		const tabId = 'T'.repeat(3069 - bytes),
			info = { cwd: '/fixture', spaceId: space.id, persistentSessionId: ref.sessionId };
		const view = {
			...emptyWorkspace(),
			tabs: {
				[tabId]: {
					kind: 'terminal' as const,
					id: tabId,
					title: 'legacy',
					createdAt: 1,
					updatedAt: 1,
					state: 'unknown' as const,
					unread: false,
					sessionIds: [key],
					focusedSessionId: key,
					paneLayout: { kind: 'pane' as const, session: key },
					panes: { [key]: info },
					resume: info,
				},
			},
			groups: [{ id: 'group', tabIds: [tabId], activeTabId: tabId, recentTabIds: [tabId] }],
			layout: { kind: 'group' as const, groupId: 'group' },
			activeGroupId: 'group',
		};
		await f.spaces.saveLayout(space.id, { base: emptyWorkspace(), value: view });
		const writes = vi.spyOn(f.storage, 'write'),
			random = vi.spyOn(crypto, 'randomUUID');
		const cold = f.workspace.persistence.readLayoutNow!(space.id);
		expect(cold.cached).toBe(false);
		const scope = await f.spaces.getControlScope(),
			cmd = commands.capture(request('pane.list', { spaceId: space.id }));
		await cmd.preflight(scope);
		const result = await cmd.run(() => {});
		cmd.dispose();
		const paneId = (result.data as { rows: { paneId: string }[] }).rows[0]!.paneId;
		expect(paneId.startsWith('lp1.')).toBe(true);
		expect(new TextEncoder().encode(paneId).length).toBe(4096);
		expect(f.workspace.persistence.readLayoutNow!(space.id)).toEqual(cold);
		expect(writes).not.toHaveBeenCalled();
		expect(random).not.toHaveBeenCalled();
		random.mockRestore();
		const close = commands.capture(request('pane.close', { paneId }));
		await close.preflight(scope);
		expect(await close.run(() => {})).toMatchObject({
			effect: 'completed',
			data: { pane: { paneId, sessionId: ref.sessionId } },
		});
		close.dispose();
		expect(f.sessions.get(key)?.running).toBe(true);
		expect(f.requestStop).not.toHaveBeenCalled();
	} finally {
		commands.close();
		await f.close();
	}
});

import { HistoryCommands } from './history';
import type { NativeHistory } from '../../platform/history/service';
import type { NativeSessionSummary } from '../../platform/desktop/server/agent-data-client';

const historyUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const historyRow = (key: string, extra: Partial<NativeSessionSummary> = {}): NativeSessionSummary => ({
	key,
	agentId: 'codex',
	accountKey: '{}',
	sessionId: key,
	cwd: '/fixture',
	title: key,
	transcriptPath: key,
	modifiedAtMs: 1,
	usage: historyUsage,
	sourceStatus: 'available',
	sourceRef: `ref-${key}`,
	...extra,
});
test('history control chain requires an explicit known Space, fences pages and never spawns a PTY', async () => {
	const f = await fixture();
	try {
		const a = await f.spaces.create({ name: 'A' }),
			b = await f.spaces.create({ name: 'B' });
		await f.spaces.bindHistorySource('ref-a1', a.id);
		await f.spaces.bindHistorySource('ref-a2', a.id);
		await f.spaces.bindHistorySource('ref-b1', b.id);
		// Same cwd for every row; ref-orphan is unbound and ref-gone has a stale binding to nowhere.
		const rows = [
			historyRow('a1'),
			historyRow('b1'),
			historyRow('orphan'),
			historyRow('a2'),
			historyRow('lost', { sourceStatus: 'missing' }),
		];
		await f.spaces.bindHistorySource('ref-lost', a.id);
		const queries: Array<{ offset: number; revision: number | undefined }> = [];
		const read = vi.fn(async (row: NativeSessionSummary) => ({ ...row, text: `body-${row.key}` }));
		const history = {
			query: vi.fn(
				async (
					_q: string,
					offset: number,
					_s: unknown,
					_f: string,
					_scope: string,
					fence?: { revision: number },
				) => {
					queries.push({ offset, revision: fence?.revision });
					return {
						rows: rows.slice(offset, offset + 2),
						total: rows.length,
						usage: historyUsage,
						revision: 5,
					};
				},
			),
			read,
			meta: () => ({}),
			metadataRevision: 1,
			stale: false,
		} as unknown as NativeHistory;
		const commands = new ControlCommands(
			f.spaces,
			f.workspace,
			f.sessions,
			undefined,
			new HistoryCommands(() => history, {
				spaceFor: (row) => (row.sourceRef ? f.spaces.historySpaceFor(row.sourceRef) : undefined),
			}),
		);
		const scope = await f.spaces.getControlScope();
		expect(() => commands.capture(request('history.list'))).toThrowError(
			expect.objectContaining({ code: 'TARGET_REQUIRED' }),
		);
		const unknown = commands.capture(request('history.list', { spaceId: 'nope' }));
		await expect(unknown.preflight(scope)).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
		const list = commands.capture(request('history.list', { spaceId: a.id }, { limit: 2 }));
		await list.preflight(scope);
		const first = (await list.run(() => {})) as unknown as {
			data: { rows: Array<{ key: string }>; nextCursor?: string };
		};
		expect(first.data.rows.map((row) => row.key)).toEqual(['a1', 'a2']);
		expect(first.data.nextCursor).toBeTruthy();
		const next = commands.capture(
			request('history.list', { spaceId: a.id }, { limit: 2, cursor: first.data.nextCursor! }),
		);
		await next.preflight(scope);
		const second = (await next.run(() => {})) as unknown as { data: { rows: Array<{ key: string }> } };
		expect(second.data.rows.map((row) => row.key)).toEqual(['lost']);
		expect(queries.at(-1)?.revision).toBe(5);
		// Other Space's row and unbound row are not previewable here; same-cwd does not admit them.
		for (const key of ['b1', 'orphan']) {
			const denied = commands.capture(request('history.preview', { spaceId: a.id }, { key }));
			await denied.preflight(scope);
			await expect(denied.run(() => {})).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
		}
		const mismatch = commands.capture(
			request('history.preview', { spaceId: a.id }, { key: 'a1', sourceRef: 'other' }),
		);
		await mismatch.preflight(scope);
		await expect(mismatch.run(() => {})).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
		const ok = commands.capture(request('history.preview', { spaceId: a.id }, { key: 'a1', sourceRef: 'ref-a1' }));
		await ok.preflight(scope);
		expect(await ok.run(() => {})).toMatchObject({ phase: 'read', data: { text: 'body-a1', status: 'available' } });
		const gone = commands.capture(request('history.preview', { spaceId: a.id }, { key: 'lost' }));
		await gone.preflight(scope);
		expect(await gone.run(() => {})).toMatchObject({
			phase: 'unavailable',
			data: { text: '', status: 'unavailable', sourceStatus: 'missing' },
		});
		expect(read).toHaveBeenCalledTimes(1);
		expect(f.spawn).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});

import * as nodeFs from 'node:fs/promises';
import * as nodeOs from 'node:os';
import * as nodePath from 'node:path';
import { NativeResumeService } from '../launch/native-resume';
import { NativeOccupancy } from '../../platform/desktop/native-reference/occupancy';

test('history import/resume/open chain: preview creates nothing, import is explicit and exact, resume attaches or conflicts, nothing forks', async () => {
	const f = await fixture();
	const locks = await nodeFs.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'huhu-chain-'));
	try {
		const a = await f.spaces.create({ name: 'A' }),
			b = await f.spaces.create({ name: 'B' });
		const rows = [
			historyRow('one', { cwd: '/fixture', accountKey: '{"HUHU_ACCOUNT_NAME":"work"}', sessionId: 'same-id' }),
			// Same native id under another account: a different reference.
			historyRow('two', { cwd: '/fixture', accountKey: '{"HUHU_ACCOUNT_NAME":"home"}', sessionId: 'same-id' }),
			historyRow('gone', { cwd: '/fixture', sourceStatus: 'missing' }),
		];
		const read = vi.fn(async (row: NativeSessionSummary) => ({ ...row, text: 'body' }));
		const history = {
			query: vi.fn(async (_q: string, offset: number) => ({
				rows: rows.slice(offset, offset + 2),
				total: rows.length,
				usage: historyUsage,
				revision: 1,
			})),
			read,
			meta: () => ({}),
			metadataRevision: 1,
			stale: false,
		} as unknown as NativeHistory;
		const attach = vi.fn(async () => {});
		const launched: string[] = [];
		const service = new NativeResumeService({
			deviceId: 'd',
			instanceId: 'chain',
			vaultId: 'v',
			spaces: f.spaces,
			occupancy: new NativeOccupancy({
				directory: locks,
				pid: process.pid,
				hostname: 'host',
				now: Date.now,
				processStart: async () => 'start',
			}),
			managed: (target) => f.workspace.getManaged(target),
			subscribeManaged: (listener) => f.workspace.subscribeManaged(listener),
			attach,
			samePath: async (left, right) => left === right,
			canonicalPath: async (file) => file,
			verify: async () => {},
			launch: async (request, reserved) => {
				const admission = await f.spaces.prepareSession(
					request.spaceId,
					{
						kind: 'agent',
						title: request.session.title,
						agentId: request.session.agentId,
						accountId: request.session.accountId ?? '',
						nativeSessionId: request.session.nativeSessionId,
						transcriptPath: request.session.transcriptPath,
					},
					request.session.id,
				);
				const runtime = f.sessions.reserveManaged(admission.record);
				launched.push(request.session.id);
				reserved(runtime.runtimeId);
				return { runtimeId: runtime.runtimeId };
			},
		});
		const commands = new ControlCommands(
			f.spaces,
			f.workspace,
			f.sessions,
			undefined,
			new HistoryCommands(
				() => history,
				{ spaceFor: (row) => (row.sourceRef ? f.spaces.historySpaceFor(row.sourceRef) : undefined) },
				undefined,
				() => service,
			),
		);
		const scope = await f.spaces.getControlScope();
		const run = async (
			op: ControlRequest['operation'],
			target: ControlRequest['target'],
			params: ControlRequest['params'],
		) => {
			const command = commands.capture(request(op, target, params));
			await command.preflight(scope);
			return { command, result: await command.run(() => {}) };
		};
		const sessions = () => Object.keys(f.spaces.store.getState().records.sessions).length;

		// The CLI discovers import candidates explicitly: unassigned rows of the vault projection, no Space named.
		const discovery = await run('history.list', {}, { unassigned: true });
		const found = (
			discovery.result.data as unknown as { rows: Array<{ key: string; sourceRef?: string; spaceId?: string }> }
		).rows;
		expect(found.map((row) => row.key)).toEqual(['one', 'two', 'gone']);
		expect(found.every((row) => row.spaceId === undefined && row.sourceRef)).toBe(true);
		expect(() => commands.capture(request('history.list', { spaceId: a.id }, { unassigned: true }))).toThrowError(
			expect.objectContaining({ code: 'INVALID_ARGUMENT' }),
		);
		expect(() => commands.capture(request('history.list', {}, {}))).toThrowError(
			expect.objectContaining({ code: 'TARGET_REQUIRED' }),
		);

		// Explicit Space is required; an unknown Space is not guessed around.
		for (const op of ['history.import', 'history.resume'] as const)
			expect(() => commands.capture(request(op, {}, { source: 'ref-one' }))).toThrowError(
				expect.objectContaining({ code: 'TARGET_REQUIRED' }),
			);
		await expect(
			commands.capture(request('history.import', { spaceId: 'nope' }, { source: 'ref-one' })).preflight(scope),
		).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
		// Resume before import is refused and creates nothing (no empty replacement session).
		await expect(run('history.resume', { spaceId: a.id }, { source: 'ref-one' })).rejects.toMatchObject({
			code: 'SOURCE_UNAVAILABLE',
		});
		expect(sessions()).toBe(0);
		expect(launched).toEqual([]);

		// Preview of an unassigned source is not even admitted, and still creates no Session.
		const preview = commands.capture(request('history.preview', { spaceId: a.id }, { key: 'one' }));
		await preview.preflight(scope);
		await expect(preview.run(() => {})).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
		expect(sessions()).toBe(0);

		// Import: record saved, source and owner evidence kept, re-import is the same record.
		const imported = await run('history.import', { spaceId: a.id }, { source: 'ref-one' });
		expect(imported.result).toMatchObject({
			phase: 'record-saved',
			effect: 'completed',
			data: { created: true, spaceId: a.id },
		});
		const sessionId = (imported.result.data as unknown as { sessionId: string }).sessionId;
		expect(imported.command.target).toMatchObject({ spaceId: a.id, sessionId });
		const remaining = await run('history.list', {}, { unassigned: true });
		expect(
			(remaining.result.data as unknown as { rows: Array<{ key: string }> }).rows.map((row) => row.key),
		).toEqual(['two', 'gone']);
		const again = await run('history.import', { spaceId: a.id }, { source: 'ref-one' });
		expect(again.result.data).toMatchObject({ created: false, sessionId });
		expect(sessions()).toBe(1);
		const other = await run('history.import', { spaceId: a.id }, { source: 'ref-two' });
		expect((other.result.data as unknown as { sessionId: string }).sessionId).not.toBe(sessionId);
		expect(sessions()).toBe(2);
		await expect(run('history.import', { spaceId: b.id }, { source: 'ref-one' })).rejects.toMatchObject({
			code: 'OWNER_CONFLICT',
		});
		await expect(run('history.import', { spaceId: a.id }, { source: 'ref-unknown' })).rejects.toMatchObject({
			code: 'TARGET_NOT_FOUND',
		});
		expect(f.spawn).not.toHaveBeenCalled();

		// Preview of the imported row now works, still without a new Session.
		const ok = commands.capture(request('history.preview', { spaceId: a.id }, { key: 'one' }));
		await ok.preflight(scope);
		expect(await ok.run(() => {})).toMatchObject({ phase: 'read' });
		expect(sessions()).toBe(2);

		// Open of an ended Session only describes it.
		const opened = await run('history.open', { sessionId }, {});
		expect(opened.result).toMatchObject({
			phase: 'completed',
			effect: 'none',
			data: { state: 'ended', attached: false },
		});
		await expect(run('history.open', { sessionId: 'nope' }, {})).rejects.toBeDefined();

		// Resume starts one generation of the SAME Session; a second resume only attaches.
		const resumed = await run('history.resume', { spaceId: a.id }, { source: 'ref-one' });
		expect(resumed.result).toMatchObject({
			phase: 'launch-pending',
			effect: 'completed',
			data: { mode: 'resumed', sessionId },
		});
		expect(resumed.command.target.runtimeId).toBeTruthy();
		const second = await run('history.resume', { spaceId: a.id }, { source: 'ref-one' });
		expect(second.result).toMatchObject({ phase: 'running', data: { mode: 'attached', sessionId } });
		expect(launched).toEqual([sessionId]);
		expect(sessions()).toBe(2);
		const live = await run('history.open', { sessionId, spaceId: a.id }, {});
		expect(live.result).toMatchObject({ effect: 'completed', data: { state: 'live', attached: true } });
		expect(attach).toHaveBeenCalledTimes(2);

		// An unreadable source and a Space mismatch are explicit refusals without side effects.
		await f.spaces.importHistorySession({
			spaceId: a.id,
			sourceRef: 'ref-gone',
			accountKey: '{}',
			deviceId: 'd',
			agentId: 'codex',
			accountId: '',
			nativeSessionId: 'gone',
			title: 'gone',
		});
		await expect(run('history.resume', { spaceId: a.id }, { source: 'ref-gone' })).rejects.toMatchObject({
			code: 'SOURCE_UNAVAILABLE',
		});
		await expect(run('history.resume', { spaceId: b.id }, { source: 'ref-one' })).rejects.toMatchObject({
			code: 'TARGET_NOT_FOUND',
		});
		expect(launched).toEqual([sessionId]);
		expect(f.spawn).not.toHaveBeenCalled();
		await service.dispose();
	} finally {
		await f.close();
		await nodeFs.rm(locks, { recursive: true, force: true });
	}
});

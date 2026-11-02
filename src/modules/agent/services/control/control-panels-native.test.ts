import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile, rm, appendFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test, vi } from 'vitest';
import { requireControlTestBinaries } from '../../../../../scripts/obsidian-acceptance/agent-workbench-control.mjs';
import { NativeHost } from '../../../../host/desktop/native/host';
import { PtyHelper } from '../../../../host/desktop/native/helper';
import { ControlEnvironment } from '../../platform/desktop/control/environment';
import { createDesktopSpacePorts } from '../../platform/desktop/spaces/ports';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { TerminalTabData } from '../../core/workspace/model';
import type { ControlResponse } from '../../../../shared/native/control-wire';
import { SpaceService } from '../spaces/space-service';
import { WorkspaceService, type WorkspaceLaunchPort } from '../workspace-service';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { TerminalSessions } from '../terminal/sessions';
import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import { freeWriterPorts } from '../../platform/desktop/spaces/free-writer-port.fixture';

// Opt-in real-native acceptance harness: runs only when HUHU_TEST_PANE_EVIDENCE names an own evidence directory;
// once opted in, a missing HUHU_TEST_EDITOR_RUNTIME_DIR or binary still fails loudly.
test.skipIf(!process.env.HUHU_TEST_PANE_EVIDENCE)(
	'immutable native CLI routes all six Pane operations through the original owners and detach leaves the real PID and screen alive',
	async () => {
		const binaries = await requireControlTestBinaries();
		const runtime = process.env.HUHU_TEST_EDITOR_RUNTIME_DIR;
		if (!runtime) throw Error('An explicit short private HUHU_TEST_EDITOR_RUNTIME_DIR is required');
		const evidence = process.env.HUHU_TEST_PANE_EVIDENCE;
		if (!evidence) throw Error('An explicit own HUHU_TEST_PANE_EVIDENCE is required');
		const root = await mkdtemp(join(tmpdir(), 'huhu-t09-pane-adapter-runtime-'));
		await mkdir(evidence, { recursive: true });
		const log = (name: string, value: unknown) =>
			appendFile(
				join(evidence, name + '.jsonl'),
				JSON.stringify({ utc: new Date().toISOString(), value }) + '\n',
			);
		const failures: unknown[] = [],
			report = (error: unknown) => failures.push(error);
		const win = { require: createRequire(resolve('package.json')), setTimeout, clearTimeout } as unknown as Window;
		const disk = (p: string) => {
			const path = resolve(root, p);
			if (!path.startsWith(root + '/')) throw Error('Fixture path escaped');
			return path;
		};
		const storage = {
			exists: async (p: string) => {
				try {
					await stat(disk(p));
					return true;
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
					throw error;
				}
			},
			read: (p: string) => readFile(disk(p), 'utf8'),
			write: async (p: string, value: string) => {
				await mkdir(dirname(disk(p)), { recursive: true });
				await writeFile(disk(p), value);
			},
			mkdir: async (p: string) => {
				await mkdir(disk(p), { recursive: true });
			},
		};
		const spaces = new SpaceService({
			...createDesktopSpacePorts({ vaultRoot: root, vaultId: 'pane-vault', deviceId: 'pane-device', win, writerPort: freeWriterPorts() }),
			storage,
			instanceId: 'pane-' + crypto.randomUUID(),
			report,
		});
		let helper!: PtyHelper, environment!: ControlEnvironment, router!: ControlRouter;
		const native = new NativeHost(
			async (events) =>
				(helper = await PtyHelper.start(binaries.helper.path, events, win, {
					HOME: root,
					XDG_RUNTIME_DIR: runtime,
				})),
		);
		const routes = new Map<string, Readonly<Record<string, string>>>();
		const sessions = new TerminalSessions({
			native,
			platform: process.platform,
			environment: async () => ({ HOME: root, XDG_RUNTIME_DIR: runtime }),
			routeEnvironment: async (ref, lease) => {
				const route = await environment.routeEnvironment(ref, lease);
				routes.set(ref.runtimeId, route.env);
				return route;
			},
			settings: () => normalizeTerminalSettings({ scrollback: 100 }),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		const launch: WorkspaceLaunchPort = {
			shell: (options) =>
				sessions.create({
					kind: 'shell',
					title: 'controlled original PID',
					file: process.execPath,
					args: [
						'-e',
						'process.stdout.write("PANE_ORIGINAL_PID="+process.pid+"\\r\\n");setInterval(()=>{},1000);process.on("SIGTERM",()=>process.exit(0));',
					],
					cwd: options.cwd!,
					runtime: options.runtime,
					beforeSpawn: options.beforeSpawn,
				}),
			agent: async () => undefined,
			resume: async () => undefined,
			account: () => '',
			report,
		};
		const workspace = new WorkspaceService(
			createSpaceWorkspaceStore(spaces, win, report),
			sessions,
			launch,
			undefined,
			spaces,
		);
		router = new ControlRouter(new ControlCommands(spaces, workspace, sessions));
		environment = new ControlEnvironment({
			native,
			scope: () => spaces.getControlScope(),
			capture: (call, scope) => router.capture(call, scope),
			closed: () => {
				void router.close().catch(report);
			},
		});
		const children = new Set<ReturnType<typeof spawn>>();
		const childClosures = new Set<Promise<void>>();
		const cli = async (args: string[], route: Readonly<Record<string, string>>) => {
			const argv = ['--json', ...args, '--timeout-ms', '3000'];
			const child = spawn(binaries.cli.path, argv, {
				cwd: root,
				env: { ...process.env, HOME: root, XDG_RUNTIME_DIR: runtime, ...route },
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			children.add(child);
			const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
			childClosures.add(closed);
			void closed.then(() => childClosures.delete(closed));
			const launchLog = log('cli-launches', {
				file: binaries.cli,
				argv,
				cwd: root,
				pid: child.pid,
				route,
				helperPid: helper.pid,
			});
			const stdout: Buffer[] = [],
				stderr: Buffer[] = [];
			let bytes = 0;
			const result = await new Promise<{
				code: number | null;
				signal: NodeJS.Signals | null;
				stdout: string;
				stderr: string;
			}>((resolve, reject) => {
				let failure: Error | undefined;
				const timer = setTimeout(() => {
					failure = Error('CLI deadline');
					child.kill('SIGKILL');
				}, 8000);
				child.stdout!.on('data', (part: Buffer) => {
					bytes += part.length;
					if (bytes > 131072) {
						failure = Error('CLI output capacity');
						child.kill('SIGKILL');
					} else stdout.push(part);
				});
				child.stderr!.on('data', (part: Buffer) => {
					bytes += part.length;
					if (bytes > 131072) {
						failure = Error('CLI output capacity');
						child.kill('SIGKILL');
					} else stderr.push(part);
				});
				child.once('error', (error) => {
					failure = error;
				});
				child.once('close', (code, signal) => {
					clearTimeout(timer);
					children.delete(child);
					if (failure) reject(failure);
					else
						resolve({
							code,
							signal,
							stdout: Buffer.concat(stdout).toString('utf8'),
							stderr: Buffer.concat(stderr).toString('utf8'),
						});
				});
			});
			await launchLog;
			await log('cli-results', { argv, ...result });
			expect(result.signal).toBeNull();
			const response = JSON.parse(result.stdout) as ControlResponse;
			expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(49153);
			return { ...result, response };
		};
		const body = (value: ControlResponse) =>
			value.data as {
				pane?: { paneId: string };
				insertedPane?: { paneId: string };
				rows?: { paneId: string }[];
				focused?: boolean;
			};
		try {
			await workspace.persistence.ready;
			const a = await spaces.create({ name: 'A', relativePath: '' }),
				b = await spaces.create({ name: 'B', relativePath: '' });
			await workspace.selectSpace(a.id);
			const create = async (spaceId: string) => {
				const result = await workspace.createManaged({ kind: 'shell', spaceId });
				if (result.status !== 'created') throw Error('Missing real fixture process');
				return result.session;
			};
			const sa = await create(a.id),
				sb = await create(b.id),
				sc = await create(b.id),
				route = routes.get(sa.runtime.runtimeId)!;
			const attached = await cli(['pane', 'attach', '--session', sb.sessionId], route);
			expect(attached.code).toBe(0);
			expect(attached.response).toMatchObject({
				effect: 'completed',
				target: { spaceId: b.id, sessionId: sb.sessionId, runtimeId: sb.runtime.runtimeId },
			});
			const paneId = body(attached.response).pane!.paneId;
			const again = await Promise.all([
				cli(['pane', 'attach', '--session', sb.sessionId], route),
				cli(['pane', 'attach', '--session', sb.sessionId], route),
			]);
			expect(again.map((row) => row.response.target?.paneId)).toEqual([paneId, paneId]);
			const split = await cli(
				[
					'pane',
					'split',
					'--pane',
					paneId,
					'--session',
					sc.sessionId,
					'--runtime',
					sc.runtime.runtimeId,
					'--direction',
					'column',
				],
				route,
			);
			expect(split.code).toBe(0);
			expect(split.response).toMatchObject({
				target: { paneId, sessionId: sb.sessionId, runtimeId: sb.runtime.runtimeId },
				data: { insertedPane: { sessionId: sc.sessionId, runtimeId: sc.runtime.runtimeId } },
			});
			const inserted = body(split.response).insertedPane!.paneId;
			const resized = await cli(['pane', 'resize', '--pane', inserted, '--ratio', '.15'], route);
			expect(resized.code).toBe(0);
			const listed = await cli(['pane', 'list', '--space', b.id], route);
			expect(body(listed.response).rows?.map((pane) => pane.paneId)).toEqual([paneId, inserted]);
			expect(spaces.store.getState().records.selectedSpaceId).toBe(a.id);
			await workspace.selectSpace(b.id);
			const tab = workspace.active as TerminalTabData;
			expect(tab.paneLayout).toMatchObject({ kind: 'split', ratio: 0.85 });
			// A real GUI edit is immediately the same truth read by the external CLI.
			workspace.resizePane(tab.id, [], 0.3);
			expect((await workspace.panes.list(b.id)).panes[0]?.ratio).toBe(0.3);
			const gui = await cli(['pane', 'list', '--space', b.id], route);
			expect(gui.response).toMatchObject({
				data: { rows: [expect.objectContaining({ ratio: 0.3 }), expect.objectContaining({ ratio: 0.7 })] },
			});
			const focus = await cli(['pane', 'focus', '--pane', inserted], route);
			expect(focus.response).toMatchObject({
				effect: 'partial',
				data: { focused: false },
				error: { code: 'CAPABILITY_UNAVAILABLE' },
			});
			const original = sessions.get(sc.runtime.runtimeId)!;
			await vi.waitFor(async () => {
				await original.whenParsed();
				expect(original.pid).toBeGreaterThan(0);
				const screen = await original.readScreen({
					expectedRuntimeId: original.id,
					maxRows: 10,
					maxBytes: 4096,
				});
				expect(screen.status).toBe('ok');
				if (screen.status === 'ok') expect(screen.text).toContain('PANE_ORIGINAL_PID=');
			});
			const pid = original.pid!;
			const detached = await cli(['pane', 'close', '--pane', inserted], route);
			expect(detached.code).toBe(0);
			process.kill(pid, 0);
			expect(original.running).toBe(true);
			const read = await cli(
				['terminal', 'read', '--session', sc.sessionId, '--runtime', sc.runtime.runtimeId],
				route,
			);
			expect(read.code).toBe(0);
			expect(read.response).toMatchObject({ data: { text: expect.stringContaining('PANE_ORIGINAL_PID=') } });
			const stop = await cli(
				['terminal', 'stop', '--session', sc.sessionId, '--runtime', sc.runtime.runtimeId],
				route,
			);
			expect(stop.code).toBe(0);
			expect(original.running).toBe(false);
			expect(() => process.kill(pid, 0)).toThrow();
			await log('summary', {
				binaries,
				helperPid: helper.pid,
				originalPid: pid,
				source: attached.response.target,
				inserted: split.response.data,
				focus: focus.response,
				close: detached.response,
				stop: stop.response,
				gui: workspace.store.getState(),
			});
		} finally {
			for (const child of children) child.kill('SIGKILL');
			await Promise.all(childClosures);
			const outcomes = await Promise.allSettled([workspace.dispose(), sessions.dispose()]);
			const controls = await Promise.allSettled([router.close(), environment.close()]);
			const host = await Promise.allSettled([native.dispose()]);
			await log('cleanup', {
				outcomes: [...outcomes, ...controls, ...host].map((row) => row.status),
				errors: failures.map(String),
				helperAlive: helper?.alive,
			});
			await rm(root, { recursive: true, force: true });
			expect([...outcomes, ...controls, ...host].every((row) => row.status === 'fulfilled')).toBe(true);
			expect(failures).toEqual([]);
		}
	},
	30000,
);

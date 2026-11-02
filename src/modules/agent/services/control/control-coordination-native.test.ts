import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { expect, test } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import { PtyHelper } from '../../../../host/desktop/native/helper';
import { ControlEnvironment } from '../../platform/desktop/control/environment';
import { createDesktopSpacePorts } from '../../platform/desktop/spaces/ports';
import { PI_EXTENSION } from '../../platform/desktop/hooks/native-extensions';
import { hookActivityConsumer } from '../../platform/desktop/hooks/automation-hooks';
import type { SpoolEvent } from '../../platform/desktop/hooks/hook-spool';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { SpaceService } from '../spaces/space-service';
import { WorkspaceService, type WorkspaceLaunchPort } from '../workspace-service';
import { createSpaceWorkspaceStore } from '../workspace-store';
import { TerminalSessions } from '../terminal/sessions';
import { ControlCommands } from './commands';
import { ControlRouter } from './router';
import type { ControlResponse } from '../../../../shared/native/control-wire';
import { freeWriterPorts } from '../../platform/desktop/spaces/free-writer-port.fixture';

type FixtureContext = {
	root: string;
	repo: string;
	helperBinary: string;
	cliBinary?: string;
	launchHint: { file: string; args: readonly string[]; cwd: string; env: Readonly<Record<string, string>> };
	messages: { normal: string; streaming: string };
	onHook(listener: (row: SpoolEvent) => void): () => void;
	waitForFirstStream(): Promise<void>;
	releaseFirst(): void;
	registerCleanup(cleanup: () => Promise<void>): () => void;
};

/** Executed as a frozen local ESM inside B's isolated official-Pi driver. */
async function runBusiness(ctx: FixtureContext) {
	assert.ok(ctx.cliBinary, 'An explicit immutable huhu CLI binary is required');
	const write = (name: string, value: unknown) =>
		fs.writeFile(path.join(ctx.root, name), JSON.stringify(value, null, 2) + '\n');
	const append = (name: string, value: unknown) =>
		fs.appendFile(path.join(ctx.root, name), JSON.stringify({ utc: new Date().toISOString(), value }) + '\n');
	const until = async (predicate: () => boolean, label: string, milliseconds = 15000) => {
		const deadline = performance.now() + milliseconds;
		while (!predicate()) {
			if (performance.now() >= deadline) throw Error('Expected ' + label);
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	};
	const files = new Map<string, string>(),
		errors: string[] = [],
		hooks: SpoolEvent[] = [];
	const storage = {
		exists: async (p: string) => files.has(p),
		read: async (p: string) => files.get(p)!,
		mkdir: async () => {},
		write: async (p: string, text: string) => {
			files.set(p, text);
		},
	};
	const win = {
		require: createRequire(path.join(ctx.repo, 'package.json')),
		setTimeout,
		clearTimeout,
	} as unknown as Window;
	const ports = createDesktopSpacePorts({
		vaultRoot: ctx.launchHint.cwd,
		vaultId: 't08-business-vault',
		deviceId: 'isolated-device',
		win,
			writerPort: freeWriterPorts()
	});
	const report = (error: unknown) => {
		errors.push(String(error));
	};
	const spaces = new SpaceService({ ...ports, storage, instanceId: 't08-business-' + crypto.randomUUID(), report });
	let outputBytes = 0;
	let helper: PtyHelper | undefined, physicalLease: Awaited<ReturnType<NativeHost['acquire']>> | undefined;
	const native = new NativeHost(async (events) => {
		helper = await PtyHelper.start(
			ctx.helperBinary,
			{
				...events,
				output(sid, data) {
					outputBytes += data.byteLength;
					void fs.appendFile(path.join(ctx.root, 'business-pty.raw.log'), data);
					events.output(sid, data);
				},
				editor(message) {
					void append('business-editor-events.jsonl', message);
					events.editor?.(message);
				},
			},
			win,
			{},
		);
		const spawnOriginal = helper.spawnSession.bind(helper);
		helper.spawnSession = async (sid, options) => {
			await write('business-spawn.json', {
				sid,
				options,
				snapshot: helper!.spawnEnvironment!(options.env ?? {}),
			});
			const pid = await spawnOriginal(sid, options);
			if (pid && process.platform === 'linux')
				await write('business-root-process.json', {
					pid,
					exe: await fs.realpath('/proc/' + pid + '/exe'),
					cmdline: (await fs.readFile('/proc/' + pid + '/cmdline')).toString('utf8'),
					stat: await fs.readFile('/proc/' + pid + '/stat', 'utf8'),
				});
			return pid;
		};
		return helper;
	});
	let environment!: ControlEnvironment, router!: ControlRouter;
	const routes = new Map<string, Readonly<Record<string, string>>>(),
		children = new Set<ReturnType<typeof spawn>>();
	const pending = new Set<Promise<unknown>>();
	const sessions = new TerminalSessions({
		native,
		platform: process.platform,
		environment: async () => ({ ...ctx.launchHint.env }),
		settings: () => normalizeTerminalSettings({ statusHooks: true, scrollback: 1000 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		routeEnvironment: async (ref, lease) => {
			const route = await environment.routeEnvironment(ref, lease);
			routes.set(ref.runtimeId, route.env);
			return route;
		},
		runtimeHooks: {
			prepareRuntimeHooks: async (_request, binding) => {
				const consumer = hookActivityConsumer(binding);
				const off = ctx.onHook((row) => {
					hooks.push(row);
					consumer.receive(row);
				});
				return {
					env: ctx.launchHint.env,
					close: async () => {
						off();
						consumer.close();
						consumer.settle();
					},
				};
			},
		},
	});
	const launch: WorkspaceLaunchPort = {
		shell: async () => {
			throw Error('No shell launch in official Pi fixture');
		},
		agent: (agentId, options) =>
			sessions.create({
				kind: 'agent',
				agentId,
				title: 'Official Pi business fixture',
				file: ctx.launchHint.file,
				args: [...ctx.launchHint.args],
				cwd: options?.cwd!,
				runtime: options?.runtime,
				beforeSpawn: options?.beforeSpawn,
			}),
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
	let cleaned = false;
	const cleanup = async () => {
		if (cleaned) return;
		cleaned = true;
		ctx.releaseFirst();
		for (const child of children) child.kill('SIGKILL');
		await Promise.allSettled([...pending]);
		const results = await Promise.allSettled([workspace.dispose(), sessions.dispose()]);
		await router.close();
		await environment.close();
		await physicalLease?.release();
		physicalLease = undefined;
		await native.dispose();
		for (const result of results) if (result.status === 'rejected') throw result.reason;
	};
	const unregister = ctx.registerCleanup(cleanup);
	const cli = async (args: string[], route: Readonly<Record<string, string>>, timeout = 30000) => {
		const argv = [...args, '--json', '--timeout-ms', String(timeout)];
		const env = { ...process.env, ...route };
		await append('business-cli-launches.jsonl', { file: ctx.cliBinary, args: argv, cwd: ctx.launchHint.cwd, env });
		const child = spawn(ctx.cliBinary!, argv, { cwd: ctx.launchHint.cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
		children.add(child);
		let stdout = '',
			stderr = '';
		const done = new Promise<{ exit: number | null; response: ControlResponse }>((resolve, reject) => {
			const bounded = (name: 'stdout' | 'stderr', chunk: Buffer) => {
				if (name === 'stdout') stdout += chunk.toString('utf8');
				else stderr += chunk.toString('utf8');
				if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 131072) {
					child.kill('SIGKILL');
					reject(Error('CLI output capacity'));
				}
			};
			child.stdout!.on('data', (chunk) => bounded('stdout', chunk));
			child.stderr!.on('data', (chunk) => bounded('stderr', chunk));
			child.once('error', reject);
			child.once('close', (code) => {
				children.delete(child);
				void append('business-cli-results.jsonl', { argv, code, stdout, stderr });
				try {
					resolve({ exit: code, response: JSON.parse(stdout) as ControlResponse });
				} catch (error) {
					reject(new Error('Invalid CLI JSON: ' + stdout + ' / ' + stderr, { cause: error }));
				}
			});
		});
		let timer: ReturnType<typeof setTimeout> | undefined;
		const bounded = Promise.race([
			done,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					child.kill('SIGKILL');
					reject(Error('CLI process deadline'));
				}, timeout + 5000);
			}),
		]).finally(() => clearTimeout(timer));
		pending.add(bounded);
		void bounded.then(
			() => pending.delete(bounded),
			() => pending.delete(bounded),
		);
		return bounded;
	};
	try {
		await workspace.persistence.ready;
		const space = await spaces.create({ name: 'Official Pi' });
		const created = await workspace.createManaged({ kind: 'agent', agentId: 'pi', spaceId: space.id });
		assert.equal(created.status, 'created');
		if (created.status !== 'created') throw Error('Missing managed runtime');
		const target = {
			spaceId: space.id,
			sessionId: created.session.sessionId,
			runtimeId: created.session.runtime.runtimeId,
		};
		sessions.checkManaged(target);
		const session = sessions.get(target.runtimeId)!,
			route = routes.get(target.runtimeId)!;
		physicalLease = await native.acquire('pty', {});
		assert.equal(physicalLease.value.editorTransactions, 1);
		await write('business-target.json', { target, route, helperPid: helper?.pid });
		await fs.copyFile(
			path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../manifest.json'),
			path.join(ctx.root, 'business-manifest.json'),
		);
		await until(
			() => session.getEditorReadiness().status === 'ready',
			'authenticated editor plus actual hook source join',
		);
		const startup = session.getActivitySnapshot();
		assert.equal(startup.state, 'idle');
		assert.equal(startup.blocking.state, 'unknown');
		await write('business-startup.json', { editor: session.getEditorReadiness(), activity: startup });
		const selection = ['--session', target.sessionId, '--runtime', target.runtimeId];
		const stale = await cli(
			['agent', 'prompt', ...selection.slice(0, 2), '--runtime', 'old-runtime', '--text', 'must not be sent'],
			route,
		);
		assert.equal(stale.response.effect, 'none');
		assert.equal(stale.response.ok, false);
		assert.equal(stale.response.error?.code, 'STALE_RUNTIME');
		const first = cli(['agent', 'prompt', ...selection, '--text', ctx.messages.normal, '--wait', 'done'], route);
		await ctx.waitForFirstStream();
		await until(() => session.getActivitySnapshot().state === 'working', 'real working hook');
		const second = await cli(['agent', 'prompt', ...selection, '--text', ctx.messages.streaming], route);
		assert.equal(second.exit, 0);
		assert.equal(second.response.effect, 'completed');
		assert.deepEqual((second.response.data as { receipt: unknown }).receipt, {
			kind: 'adapter-applied',
			op: (second.response.data as { receipt: { op: number } }).receipt.op,
		});
		assert.equal(session.getActivitySnapshot().state, 'working');
		ctx.releaseFirst();
		const completed = await first;
		assert.equal(completed.exit, 0);
		assert.equal(completed.response.phase, 'state-matched');
		assert.equal(completed.response.effect, 'completed');
		assert.equal((completed.response.data as { receipt: { kind: string } }).receipt.kind, 'adapter-applied');
		const wait = await cli(['agent', 'wait', ...selection, '--state', 'done'], route);
		assert.equal(wait.exit, 0);
		assert.equal(wait.response.effect, 'none');
		const read = await cli(['terminal', 'read', ...selection, '--limit', '80', '--max-bytes', '8192'], route);
		assert.equal(read.exit, 0);
		assert.equal(read.response.effect, 'none');
		const selectorRefusals = [];
		for (const [command, marker] of [
			['/login', 'Select authentication method:'],
			['/settings', 'Auto-compact'],
		] as const) {
			const before = outputBytes;
			assert.equal((await cli(['terminal', 'send-text', ...selection, '--text', command], route)).exit, 0);
			assert.equal((await cli(['terminal', 'send-keys', ...selection, '--keys', 'Enter'], route)).exit, 0);
			await until(() => outputBytes > before, 'official ' + command + ' render');
			let screen = '';
			const end = performance.now() + 5000;
			do {
				const frame = await cli(
					['terminal', 'read', ...selection, '--limit', '80', '--max-bytes', '8192'],
					route,
				);
				screen = (frame.response.data as { text: string }).text;
				if (screen.includes(marker)) break;
				assert.ok(performance.now() < end, 'Actual selector visible: ' + command);
			} while (true);
			assert.equal(session.getActivitySnapshot().blocking.state, 'unknown');
			const refused = await cli(
				['agent', 'prompt', ...selection, '--text', 'must-not-submit-to-selector'],
				route,
			);
			assert.equal(refused.response.ok, false);
			assert.equal(refused.response.effect, 'none');
			assert.ok(['INPUT_NOT_READY', 'AGENT_BLOCKED'].includes(refused.response.error?.code ?? ''));
			selectorRefusals.push({ command, screen, refused, activity: session.getActivitySnapshot() });
			const exitBefore = outputBytes;
			assert.equal((await cli(['terminal', 'send-keys', ...selection, '--keys', 'Escape'], route)).exit, 0);
			await until(() => outputBytes > exitBefore, 'original editor redraw after ' + command);
		}
		await write('business-selector-refusals.json', selectorRefusals);
		const paste = await cli(['terminal', 'send-text', ...selection, '--text', '/quit'], route);
		assert.equal(paste.exit, 0);
		assert.equal((paste.response.data as { receipt: { kind: string } }).receipt.kind, 'pty-written');
		const enter = await cli(['terminal', 'send-keys', ...selection, '--keys', 'Enter'], route);
		assert.equal(enter.exit, 0);
		assert.equal((enter.response.data as { receipt: { kind: string } }).receipt.kind, 'pty-written');
		await until(() => session.connection === 'exited', 'official Pi /quit exit');
		await write('business-summary.json', {
			startup,
			completed,
			second,
			wait,
			read,
			paste,
			enter,
			errors,
			finalActivity: session.getActivitySnapshot(),
			helperStats: helper?.streamStats,
		});
		assert.deepEqual(errors, []);
	} catch (error) {
		await write('business-failure.json', {
			error: String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	} finally {
		await cleanup();
		unregister();
	}
}

const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
// Opt-in real-native acceptance harness: runs only when HUHU_PI_ARTIFACT_TEST_ROOT (official Pi package parent) is set;
// once opted in, missing HUHU_PTY_BINARY / HUHU_CLI_BINARY still fail loudly.
test.skipIf(!process.env.HUHU_PI_ARTIFACT_TEST_ROOT)(
	'real CLI broker business owners submit normal and working multiline prompts to the official original Pi editor',
	async () => {
		const helper = process.env.HUHU_PTY_BINARY,
			cli = process.env.HUHU_CLI_BINARY,
			artifact = process.env.HUHU_PI_ARTIFACT_TEST_ROOT;
		assert.ok(helper && path.isAbsolute(helper), 'HUHU_PTY_BINARY explicit immutable path required');
		assert.ok(cli && path.isAbsolute(cli), 'HUHU_CLI_BINARY explicit immutable path required');
		assert.ok(artifact && path.isAbsolute(artifact), 'HUHU_PI_ARTIFACT_TEST_ROOT official package parent required');
		const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
		const root = await fs.mkdtemp('/tmp/huhu-t08-a-stage2-native-'),
			objects = path.join(root, 'objects');
		await fs.mkdir(objects);
		const imports = [
			"import {spawn} from 'node:child_process';import * as fs from 'node:fs/promises';import * as path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';",
			['NativeHost', 'src/host/desktop/native/host.ts'],
			['PtyHelper', 'src/host/desktop/native/helper.ts'],
			['ControlEnvironment', 'src/modules/agent/platform/desktop/control/environment.ts'],
			['createDesktopSpacePorts', 'src/modules/agent/platform/desktop/spaces/ports.ts'],
			['PI_EXTENSION', 'src/modules/agent/platform/desktop/hooks/native-extensions.ts'],
			['hookActivityConsumer', 'src/modules/agent/platform/desktop/hooks/automation-hooks.ts'],
			['normalizeTerminalSettings', 'src/modules/agent/core/terminal/settings.ts'],
			['SpaceService', 'src/modules/agent/services/spaces/space-service.ts'],
			['WorkspaceService', 'src/modules/agent/services/workspace-service.ts'],
			['createSpaceWorkspaceStore', 'src/modules/agent/services/workspace-store.ts'],
			['TerminalSessions', 'src/modules/agent/services/terminal/sessions.ts'],
			['ControlCommands', 'src/modules/agent/services/control/commands.ts'],
			['ControlRouter', 'src/modules/agent/services/control/router.ts'],
		]
			.map((row) =>
				typeof row === 'string' ? row : `import {${row[0]}} from ${JSON.stringify(path.join(repo, row[1]!))};`,
			)
			.join('\n');
		const testSource = await fs.readFile(fileURLToPath(import.meta.url), 'utf8');
		const fixtureSource = testSource.slice(
			testSource.indexOf('async function runBusiness(ctx:'),
			testSource.indexOf('\nconst sha ='),
		);
		const source = imports + '\n' + fixtureSource + '\nexport const run=runBusiness;export {PI_EXTENSION};';
		const inputs = new Map<string, unknown>(),
			modulePath = path.join(root, 'module/business.mjs');
		const built = await build({
			stdin: { contents: source, resolveDir: repo, sourcefile: 'business-entry.ts', loader: 'ts' },
			outdir: path.join(root, 'module'),
			entryNames: 'business',
			chunkNames: 'chunks/[name]-[hash]',
			outExtension: { '.js': '.mjs' },
			bundle: true,
			splitting: true,
			platform: 'node',
			format: 'esm',
			metafile: true,
			logLevel: 'silent',
			banner: {
				js: `import {createRequire as __fixtureRequire} from 'node:module';const require=__fixtureRequire(${JSON.stringify(path.join(repo, 'package.json'))});`,
			},
			plugins: [
				{
					name: 'freeze-production-inputs',
					setup(builder) {
						builder.onResolve({ filter: /^obsidian$/ }, () => ({
							path: 'obsidian',
							namespace: 'fixture-host',
						}));
						builder.onLoad({ filter: /.*/, namespace: 'fixture-host' }, () => ({
							contents:
								'export class Notice{};export const Platform={isWin:false,isMacOS:false,isMobile:false,isDesktopApp:true};',
						}));
						builder.onLoad({ filter: /\.(ts|tsx|mjs|js|json)$/ }, async (input) => {
							const bytes = await fs.readFile(input.path),
								digest = sha(bytes),
								snapshot = path.join(objects, digest);
							try {
								await fs.writeFile(snapshot, bytes, { flag: 'wx' });
							} catch (error) {
								if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
							}
							inputs.set(input.path, { path: input.path, sha256: digest, bytes: bytes.length, snapshot });
							return {
								contents: bytes,
								loader: input.path.endsWith('.json')
									? 'json'
									: input.path.endsWith('.tsx')
										? 'tsx'
										: input.path.endsWith('.ts')
											? 'ts'
											: 'js',
								resolveDir: path.dirname(input.path),
							};
						});
					},
				},
			],
		});
		const generatedExtension = path.join(root, 'production-extension.txt');
		const generationArgs = [
			'--input-type=module',
			'-e',
			`import {PI_EXTENSION} from ${JSON.stringify(pathToFileURL(modulePath).href)};import fs from 'node:fs/promises';await fs.writeFile(${JSON.stringify(generatedExtension)},PI_EXTENSION);`,
		];
		await fs.writeFile(
			path.join(root, 'extension-generation-command.json'),
			JSON.stringify(
				{
					file: process.execPath,
					argv: generationArgs,
					cwd: repo,
					meaning: 'Actual Node loads the exact generated production bundle; Vitest transform is not used',
				},
				null,
				2,
			),
		);
		const generation = spawn(process.execPath, generationArgs, { cwd: repo, stdio: 'inherit' });
		assert.equal(
			await new Promise((resolve, reject) => {
				generation.once('error', reject);
				generation.once('close', resolve);
			}),
			0,
		);
		const extensionBytes = await fs.readFile(generatedExtension);
		const outputs = await Promise.all(
			Object.keys(built.metafile!.outputs).map(async (file) => ({
				path: path.resolve(file),
				sha256: sha(await fs.readFile(file)),
			})),
		);
		const moduleBytes = await fs.readFile(modulePath);
		assert.ok(moduleBytes.length <= 1048576, 'B module capacity');
		await fs.writeFile(path.join(root, 'business-source.mjs'), source);
		await fs.writeFile(
			path.join(root, 'manifest.json'),
			JSON.stringify(
				{
					utc: new Date().toISOString(),
					test: {
						path: fileURLToPath(import.meta.url),
						sha256: sha(await fs.readFile(fileURLToPath(import.meta.url))),
					},
					inputs: [...inputs.values()],
					outputs,
					extension: {
						path: generatedExtension,
						sha256: sha(extensionBytes),
						meaning:
							'Current actual production business bundle generated PI_EXTENSION; not an old baseline or diagnostic app',
					},
					metafile: built.metafile,
					module: { path: modulePath, sha256: sha(moduleBytes), bytes: moduleBytes.length },
					bins: await Promise.all(
						[helper, cli].map(async (file) => ({ path: file, sha256: sha(await fs.readFile(file)) })),
					),
				},
				null,
				2,
			),
		);
		const output = path.join(root, 'official-driver'),
			argv = [
				'scripts/verify-pi-editor.mjs',
				'--output',
				output,
				'--artifact',
				path.join(artifact, 'artifact/package'),
				'--helper',
				helper,
				'--cli',
				cli,
				'--business-module',
				modulePath,
				'--baseline-extension',
				generatedExtension,
			];
		await fs.writeFile(
			path.join(root, 'command.json'),
			JSON.stringify({ utc: new Date().toISOString(), file: process.execPath, argv, cwd: repo }, null, 2),
		);
		const log = await fs.open(path.join(root, 'raw.log'), 'wx');
		const child = spawn(process.execPath, argv, { cwd: repo, stdio: ['ignore', log.fd, log.fd] });
		let timer: ReturnType<typeof setTimeout> | undefined;
		const code = await new Promise<number | null>((resolve, reject) => {
			timer = setTimeout(() => {
				child.kill('SIGKILL');
				reject(Error('Official business fixture deadline'));
			}, 90000);
			child.once('error', reject);
			child.once('close', resolve);
		}).finally(() => clearTimeout(timer));
		await log.close();
		console.log(JSON.stringify({ root, exit: code }));
		console.log(await fs.readFile(path.join(root, 'raw.log'), 'utf8'));
		expect(code).toBe(0);
	},
	100000,
);

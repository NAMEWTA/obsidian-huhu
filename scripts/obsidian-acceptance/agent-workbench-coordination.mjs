/** Local Chrome T08 acceptance. Production Page/Panel/Router/Commands/Workspace/Session;
 * controlled controller port, Obsidian SDK, native editor/input and Map TextStorage.
 * Actual new AgentController assembly is independently exercised by controller-control.test.ts.
 * Usage: node ...mjs <new-/tmp-directory> [--prepare-only]
 * Root runs final geometry after the normal stylesheet build. No real Provider/Obsidian/OS IME claim.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.resolve(process.argv[2] || `/tmp/huhu-t08-a-stage2-chrome-${Date.now()}`);
if (!directory.startsWith('/tmp/')) throw Error('Evidence must use a new /tmp directory');
const croppedReference = process.argv
	.slice(3)
	.find((arg) => arg.startsWith('--cropped-reference='))
	?.slice('--cropped-reference='.length);
if (process.argv.slice(3).some((arg) => arg !== '--prepare-only' && !arg.startsWith('--cropped-reference=')))
	throw Error('Unsupported fixture argument');
if (croppedReference && !path.isAbsolute(croppedReference))
	throw Error('Cropped reference must be an explicit absolute path');
await fs.mkdir(directory);
const started = new Date().toISOString(),
	hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (name, value) => fs.writeFile(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
const events = [],
	commands = [],
	checks = [],
	inputs = new Map();
const enterDown = {
	type: 'keyDown',
	key: 'Enter',
	code: 'Enter',
	windowsVirtualKeyCode: 13,
	text: '\r',
	unmodifiedText: '\r',
};
const enterUp = { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 };
await json('keyboard-packet.json', { enterDown, enterUp });
let browser,
	connection,
	server,
	chromeLog,
	code = 1;

const browserRecords = [],
	browserOwners = new WeakMap();
function trackBrowser(child) {
	const row = { pid: child.pid, closed: false, started: new Date().toISOString() };
	const finished = new Promise((resolve) =>
		child.once('close', (exit, signal) => {
			Object.assign(row, { closed: true, exit, signal, finished: new Date().toISOString() });
			resolve();
		}),
	);
	browserRecords.push(row);
	browserOwners.set(child, { row, finished });
	return child;
}
async function stopBrowser(child) {
	const owner = browserOwners.get(child);
	if (!owner) throw Error('Unowned Chrome process');
	const observed = async () => {
		let timer;
		try {
			return await Promise.race([
				owner.finished.then(() => true),
				new Promise((resolve) => {
					timer = setTimeout(() => resolve(false), 1500);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	};
	if (!owner.row.closed) child.kill('SIGTERM');
	if (!(await observed())) {
		child.kill('SIGKILL');
		if (!(await observed())) throw Error('Chrome close was not observed: ' + child.pid);
	}
}

async function browserFixture() {
	registerMessages(messages);
	registerMessages(uiMessages);
	setLanguage('zh');
	Object.defineProperties(HTMLElement.prototype, {
		win: {
			configurable: true,
			get() {
				return this.ownerDocument.defaultView;
			},
		},
		doc: {
			configurable: true,
			get() {
				return this.ownerDocument;
			},
		},
		createDiv: {
			configurable: true,
			value(options = {}) {
				const element = this.ownerDocument.createElement('div');
				element.className = options.cls || '';
				this.append(element);
				return element;
			},
		},
		toggleClass: {
			configurable: true,
			value(name, enabled) {
				this.classList.toggle(name, enabled);
			},
		},
	});
	const h = React.createElement,
		trace = [],
		errors = [],
		editorInputs = [],
		rawInputs = [],
		observerSignals = [];
	const record = (kind, value) => trace.push({ at: performance.now(), kind, value });
	const leaf = document.querySelector('#mount'),
		files = new Map();
	leaf.className = 'huhu-ui';
	const storage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p),
		write: async (p, text) => {
			files.set(p, text);
		},
		mkdir: async () => {},
	};
	const physical = { canonicalPath: '/fixture', dev: '1', ino: '2' },
		vault = { vaultId: 'chrome-vault', deviceId: 'chrome-device', rootPath: '/fixture', root: physical };
	const spaces = new SpaceService({
		storage,
		instanceId: 'chrome-t08',
		report: (error) => errors.push(String(error)),
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: physical }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/fixture' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'chrome-t08',
				port: 12345,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	let output,
		nextSid = 0,
		sequence = 0,
		op = 0;
	const end = (sid) => {
		output.termination?.(sid, {
			version: 1,
			sequence: ++sequence,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
				output: 'drained',
			},
		});
		output.exit(sid, 0, null);
	};
	const nativeConnection = {
		alive: true,
		version: 'controlled-native-port',
		terminalTermination: 1,
		inputAdmission: 1,
		inputLimits: NATIVE_INPUT_LIMITS,
		spawnSession: async () => 42,
		input: (sid, body) => {
			rawInputs.push({ legacy: true, sid, body });
		},
		resize() {},
		acknowledge() {},
		end,
		requestStop: end,
		submitInput(sid, body) {
			const value = { op: ++op, state: 'written', effect: 'completed' };
			rawInputs.push({ sid, body: typeof body === 'string' ? body : [...body] });
			return {
				op: value.op,
				queued: Promise.resolve({ op: value.op, state: 'queued' }),
				finished: Promise.resolve(value),
				cancel() {},
			};
		},
		history: async () => [],
		request: async () => ({}),
	};
	const native = {
		acquire: async (_capability, listeners) => {
			output = listeners;
			return { value: nativeConnection, allocateSessionId: () => ++nextSid, release: async () => {} };
		},
	};
	const settings = normalizeTerminalSettings({ statusHooks: true, renderer: 'dom', scrollback: 100, fontSize: 14 });
	const sessions = new TerminalSessions({
		native,
		platform: 'linux',
		environment: async () => ({}),
		settings: () => settings,
		colors: () => ({ foreground: '#eee', background: '#222', cursor: '#fff' }),
	});
	let currentLeaf = true,
		closed = false;
	const foregroundListeners = new Set();
	const foreground = () =>
		captureForegroundIntent({
			container: leaf,
			document,
			window,
			isCurrent: () => currentLeaf && !closed,
			onTargetChange: (listener) => {
				foregroundListeners.add(listener);
				return () => foregroundListeners.delete(listener);
			},
		});
	const launch = {
		foreground,
		shell: (options) =>
			sessions.create({
				kind: 'shell',
				title: 'Shell',
				file: 'sh',
				args: [],
				cwd: options.cwd,
				runtime: options.runtime,
				beforeSpawn: options.beforeSpawn,
			}),
		agent: (agentId, options) =>
			sessions.create({
				kind: 'agent',
				agentId,
				title: '重复的长终端名称 · preserved native answer',
				file: 'controlled-agent',
				args: [],
				cwd: options.cwd,
				runtime: options.runtime,
				beforeSpawn: options.beforeSpawn,
			}),
		resume: async () => undefined,
		account: () => '',
		report: (error) => errors.push(String(error)),
	};
	const clock = { setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id) };
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(spaces, clock, (error) => errors.push(String(error))),
		sessions,
		launch,
		() => undefined,
		spaces,
	);
	await workspace.persistence.ready;
	const a = await spaces.create({ name: 'Space A' }),
		b = await spaces.create({ name: 'Space B / 同名目标区分' });
	await workspace.selectSpace(a.id);
	const created = [];
	for (const space of [a, b]) {
		const value = await workspace.createManaged({ kind: 'agent', agentId: 'pi', spaceId: space.id });
		if (value.status !== 'created') throw Error(JSON.stringify(value));
		created.push(value);
	}
	const sources = new Map(),
		selected = [];
	for (const value of created) {
		const runtimeId = value.session.runtime.runtimeId,
			session = sessions.get(runtimeId),
			sourceInstance = 'chrome-source-' + runtimeId;
		const source = session.bindActivityRuntime().bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: 'fixture-only',
			lifetime: { kind: 'registration', sourceInstance },
		});
		let sourceSequence = 0;
		const observe = (state) => {
			source.observe({
				deliveryId: runtimeId + '-' + ++sourceSequence,
				sourceSequence,
				event: state === 'done' ? 'agent_settled' : state === 'working' ? 'agent_start' : 'session_start',
				state,
			});
		};
		observe('idle');
		sources.set(runtimeId, { observe, source });
		session.bindEditor({
			sid: session.sid,
			identity: { runtimeId },
			active: true,
			ready: Promise.resolve({
				sid: session.sid,
				editorId: 'chrome-editor-' + session.sid,
				identity: { runtimeId },
				sourceInstance,
				provider: 'pi',
				profileId: 'controlled-host-port',
			}),
			closed: new Promise(() => {}),
			submit(text, options) {
				editorInputs.push({ runtimeId, text, sourceInstance: options.sourceInstance });
				observe('working');
				const result = { op: ++op, state: 'adapter-applied', effect: 'completed' };
				return {
					op: result.op,
					queued: Promise.resolve({ op: result.op, state: 'queued' }),
					finished: Promise.resolve(result),
					settled: Promise.resolve(),
					cancel() {},
				};
			},
			close: async () => {},
		});
		output.output(session.sid, new TextEncoder().encode('受控原生终端屏幕\r\n完整内容仍由原终端保留。\r\n'));
	}
	const router = new ControlRouter(new ControlCommands(spaces, workspace, sessions)),
		view = createWorkspaceView();
	// Explicit controller port only: real business adapter and production foreground capture.
	const controller = {
		workspace,
		spaces,
		sessions,
		app: {
			keymap: { pushScope() {}, popScope() {} },
			workspace: { containerEl: leaf },
			vault: { getMarkdownFiles: () => [] },
		},
		settings: { get: () => settings, subscribe: () => () => {} },
		usageStore: { observeWindow: () => () => {} },
		historyStore: {
			refresh: async () => {},
			store: createStore(() => ({ rows: [], loading: false, error: '', warnings: [] })),
		},
		vaultPath: () => '/fixture',
		browserHost: () => undefined,
		agentTitle: (id) => id,
		agents: { list: () => [] },
		terminalControl: async (request, options) => {
			const context = captureControlExecutionContext(options.signal, request.timeoutMs);
			observerSignals.push(options.signal);
			selected.push(structuredClone(request));
			record('business-request', request);
			const scope = await observeControlPreparation(context, () => spaces.getControlScope());
			return router.invokeLocal(request, scope, context, options.after, options.progress);
		},
		show(runtimeId) {
			const ref = sessions.managedRef(runtimeId);
			if (ref)
				void workspace
					.attachManaged(ref, { expectedRuntimeId: runtimeId })
					.catch((error) => errors.push(String(error)));
		},
	};
	const react = createRoot(leaf);
	let visible = true;
	const render = () =>
		flushSync(() =>
			react.render(
				h(
					HuhuProviders,
					{ ownerDocument: document, visible },
					h(AgentWorkspace, { controller, context: { togglePanel() {} }, view }),
				),
			),
		);
	render();
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	const target = created[1].session;
	window.coordinationProbe = {
		trace,
		errors,
		editorInputs,
		rawInputs,
		selected,
		spaces: [a, b],
		target: { spaceId: b.id, sessionId: target.sessionId, runtimeId: target.runtime.runtimeId },
		view,
		label: (key) => t('agent.coordination.' + key),
		state: () => ({
			editorInputs,
			rawInputs,
			selected,
			errors,
			managed: workspace.getManagedSnapshot(),
			active: document.activeElement?.outerHTML.slice(0, 500),
			signals: observerSignals.map((signal) => signal.aborted),
			foregroundListeners: foregroundListeners.size,
		}),
		focusElsewhere() {
			currentLeaf = false;
			for (const notify of foregroundListeners) notify();
			document.querySelector('#outside').focus();
		},
		done() {
			sources.get(target.runtime.runtimeId).observe('done');
		},
		async width(width) {
			leaf.style.width = width + 'px';
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		},
		reopen() {
			view.setState({ control: true, history: false });
		},
		hide() {
			visible = false;
			render();
		},
		show() {
			visible = true;
			render();
		},
		unknown() {
			sources.get(target.runtime.runtimeId).source.invalidate('transport-lost');
		},
		geometry() {
			const panel = document.querySelector('[data-terminal-control]');
			const rect = panel?.getBoundingClientRect();
			const aside = panel?.closest('aside'),
				asideRect = aside?.getBoundingClientRect(),
				style = aside && getComputedStyle(aside);
			return {
				aside: asideRect && {
					rect: asideRect.toJSON(),
					offsetWidth: aside.offsetWidth,
					clientWidth: aside.clientWidth,
					boxSizing: style.boxSizing,
					borderLeft: parseFloat(style.borderLeftWidth),
					borderRight: parseFloat(style.borderRightWidth),
					paddingLeft: parseFloat(style.paddingLeft),
					paddingRight: parseFloat(style.paddingRight),
				},
				panelRect: rect?.toJSON(),
				panels: document.querySelectorAll('[data-terminal-control]').length,
				dialogs: document.querySelectorAll('[data-agent-control-dialog]').length,
				width: rect?.width,
				documentOverflow: document.documentElement.scrollWidth > innerWidth,
				controls: [
					...document.querySelectorAll(
						'[data-agent-control-dialog] button,[data-agent-control-dialog] input,[data-agent-control-dialog] [role=combobox]',
					),
				].map((element) => ({
					name: element.getAttribute('aria-label') || element.textContent,
					disabled: element.disabled,
					width: element.getBoundingClientRect().width,
					height: element.getBoundingClientRect().height,
				})),
				toggle: [...document.querySelectorAll('button')]
					.filter((element) => element.getAttribute('aria-label') === t('agent.coordination.title'))
					.map((element) => ({
						width: element.getBoundingClientRect().width,
						height: element.getBoundingClientRect().height,
					})),
			};
		},

		async stableGeometry() {
			const samples = [],
				start = performance.now();
			let alive = true,
				timer;
			const pending = (async () => {
				const panel = document.querySelector('[data-terminal-control]');
				if (!panel) throw Error('No control to measure');
				const root = panel.closest('[data-agent-control-dialog]') ?? panel.closest('aside') ?? panel;
				const describe = (animation) => ({
					state: animation.playState,
					currentTime: animation.currentTime,
					name: animation.animationName ?? null,
					duration: animation.effect?.getComputedTiming().duration,
					target: animation.effect?.target?.getAttribute('data-slot'),
				});
				samples.push({
					at: performance.now(),
					animations: root.getAnimations({ subtree: true }).map(describe),
					geometry: window.coordinationProbe.geometry(),
				});
				const running = root
					.getAnimations({ subtree: true })
					.filter((animation) => animation.playState === 'running' || animation.pending);
				await Promise.all(running.map((animation) => animation.finished.catch(() => {})));
				let previous,
					stable = 0;
				while (alive) {
					await new Promise((resolve) => requestAnimationFrame(resolve));
					if (!alive) break;
					const geometry = window.coordinationProbe.geometry(),
						animations = root
							.getAnimations({ subtree: true })
							.filter((animation) => animation.playState === 'running' || animation.pending);
					const value = JSON.stringify([
						geometry.panelRect,
						geometry.aside,
						geometry.controls.map((c) => [c.width, c.height]),
						geometry.toggle,
					]);
					samples.push({ at: performance.now(), animations: animations.map(describe), geometry });
					stable = value === previous && animations.length === 0 ? stable + 1 : 0;
					previous = value;
					if (stable >= 2) return { start, finished: performance.now(), samples, geometry };
				}
				throw Error('Geometry observation cancelled');
			})();
			try {
				return await Promise.race([
					pending,
					new Promise((_, reject) => {
						timer = setTimeout(
							() => reject(Error('Control geometry did not settle within 3 seconds')),
							3000,
						);
					}),
				]);
			} finally {
				alive = false;
				clearTimeout(timer);
			}
		},
		async finish() {
			closed = true;
			react.unmount();
			await router.close();
			await workspace.dispose();
			await sessions.dispose();
			return {
				trace,
				errors,
				editorInputs,
				rawInputs,
				selected,
				signals: observerSignals.map((signal) => signal.aborted),
				foregroundListeners: foregroundListeners.size,
			};
		},
	};
	window.coordinationReady = true;
}

// Decode only for calibration; every published PNG stays the exact CDP byte stream.
function pngPixels(bytes) {
	if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Not a PNG screenshot');
	const width = bytes.readUInt32BE(16),
		height = bytes.readUInt32BE(20),
		channels = bytes[25] === 6 ? 4 : bytes[25] === 2 ? 3 : 0;
	if (bytes[24] !== 8 || !channels || bytes[28] !== 0 || width * height > 20000000)
		throw Error('Unexpected bounded PNG format');
	const chunks = [];
	for (let offset = 8; offset < bytes.length;) {
		const size = bytes.readUInt32BE(offset),
			type = bytes.toString('ascii', offset + 4, offset + 8);
		if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + size));
		offset += size + 12;
	}
	const stride = width * channels,
		encoded = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height }),
		pixels = Buffer.alloc(stride * height);
	if (encoded.length !== (stride + 1) * height) throw Error('Invalid PNG raster length');
	const paeth = (a, b, c) => {
		const p = a + b - c,
			da = Math.abs(p - a),
			db = Math.abs(p - b),
			dc = Math.abs(p - c);
		return da <= db && da <= dc ? a : db <= dc ? b : c;
	};
	for (let y = 0; y < height; y++) {
		const filter = encoded[y * (stride + 1)];
		if (filter > 4) throw Error('Invalid PNG filter');
		for (let x = 0; x < stride; x++) {
			const i = y * stride + x,
				a = x >= channels ? pixels[i - channels] : 0,
				b = y ? pixels[i - stride] : 0,
				c = y && x >= channels ? pixels[i - stride - channels] : 0;
			pixels[i] = (encoded[y * (stride + 1) + 1 + x] + [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]) & 255;
		}
	}
	return {
		width,
		height,
		pixel(x, y) {
			if (x < 0 || y < 0 || x >= width || y >= height) return null;
			const start = (Math.floor(y) * width + Math.floor(x)) * channels;
			return [...pixels.subarray(start, start + 3)];
		},
	};
}
function screenshotDimensions(image, viewport) {
	const expectedWidth = Math.round(viewport.innerWidth * viewport.devicePixelRatio),
		expectedHeight = Math.round(viewport.visualHeight * viewport.devicePixelRatio);
	return {
		width: image.width,
		height: image.height,
		expectedWidth,
		expectedHeight,
		ok: image.width === expectedWidth && Math.abs(image.height - expectedHeight) <= 1,
	};
}

function connect(url) {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url),
			pending = new Map();
		let sequence = 0;
		socket.addEventListener('open', () =>
			resolve({
				send(method, params = {}) {
					return new Promise((yes, no) => {
						const id = ++sequence;
						pending.set(id, { yes, no });
						socket.send(JSON.stringify({ id, method, params }));
					});
				},
				close() {
					socket.close();
				},
			}),
		);
		socket.addEventListener('error', reject);
		socket.addEventListener('message', (event) => {
			const value = JSON.parse(event.data);
			if (value.id) {
				const task = pending.get(value.id);
				if (task) {
					pending.delete(value.id);
					value.error ? task.no(Error(JSON.stringify(value.error))) : task.yes(value.result);
				}
			} else events.push(value);
		});
	});
}
try {
	const imports = `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {createStore} from 'zustand/vanilla';import {AgentWorkspace} from './src/modules/agent/ui/AgentWorkspacePage';import {HuhuProviders} from './src/ui/react/providers';import {SpaceService} from './src/modules/agent/services/spaces/space-service';import {WorkspaceService} from './src/modules/agent/services/workspace-service';import {createSpaceWorkspaceStore} from './src/modules/agent/services/workspace-store';import {createWorkspaceView} from './src/modules/agent/services/workspace-view';import {TerminalSessions} from './src/modules/agent/services/terminal/sessions';import {normalizeTerminalSettings} from './src/modules/agent/core/terminal/settings';import {captureForegroundIntent} from './src/modules/agent/services/launch/foreground-intent';import {ControlCommands} from './src/modules/agent/services/control/commands';import {ControlRouter} from './src/modules/agent/services/control/router';import {captureControlExecutionContext,observeControlPreparation} from './src/modules/agent/services/control/terminal-coordination';import {NATIVE_INPUT_LIMITS} from './src/shared/native/input';import {registerMessages,setLanguage,t} from './src/shared/i18n';import {messages} from './src/modules/agent/i18n';import {messages as uiMessages} from './src/shared/i18n/lazy/ui';`;
	const entry =
		imports +
		'\n(' +
		browserFixture.toString() +
		')().catch(error=>{console.error(error);window.coordinationFatal=String(error)+error.stack;});';
	await fs.writeFile(path.join(directory, 'entry.js'), entry);
	await fs.mkdir(path.join(directory, 'objects'));
	const bundled = await build({
		stdin: { contents: entry, resolveDir: repo, sourcefile: 'coordination-fixture-entry.js' },
		bundle: true,
		external: ['node:*'],
		platform: 'browser',
		format: 'iife',
		target: 'chrome120',
		write: false,
		metafile: true,
		loader: { '.svg': 'text', '.md': 'text' },
		plugins: [
			{
				name: 'controlled-host-boundaries',
				setup(builder) {
					builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'boundary' }));
					builder.onResolve({ filter: /platform\/desktop\/files$/ }, () => ({
						path: 'files',
						namespace: 'boundary',
					}));
					builder.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => ({
						contents:
							args.path === 'obsidian'
								? `export const Platform={isWin:false,isMacOS:false,isMobile:false,isDesktopApp:true};export class Notice{constructor(value){window.hostNotices??=[];window.hostNotices.push(value)}};export class Scope{register(){}};export class TFile{};export class TFolder{};export class Component{};export class FuzzySuggestModal{};export class Menu{};export const normalizePath=p=>p;export const setIcon=(element,name)=>element.setAttribute('data-host-icon',name);export const requestUrl=()=>{throw Error('Network outside fixture')};`
								: `export const droppedFilePath=()=>undefined;export const openPath=async()=>{};export const resolveReference=async()=>null;export const vaultFilePath=(vault,p)=>vault+'/'+p;`,
					}));
					builder.onLoad({ filter: /\.(ts|tsx|mjs|js|json)$/ }, async (input) => {
						const bytes = await fs.readFile(input.path),
							sha256 = hash(bytes),
							object = path.join(directory, 'objects', sha256);
						try {
							await fs.writeFile(object, bytes, { flag: 'wx' });
						} catch (error) {
							if (error.code !== 'EEXIST') throw error;
						}
						inputs.set(input.path, { path: input.path, bytes: bytes.length, sha256, object });
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
	const bundle = bundled.outputFiles[0].contents;
	await fs.writeFile(path.join(directory, 'fixture.js'), bundle);
	for (const name of [
		'styles.css',
		'node_modules/@xterm/xterm/css/xterm.css',
		'package.json',
		'pnpm-lock.yaml',
		'scripts/obsidian-acceptance/agent-workbench-coordination.mjs',
	]) {
		const file = path.join(repo, name),
			bytes = await fs.readFile(file),
			sha256 = hash(bytes),
			object = path.join(directory, 'objects', sha256);
		await fs.writeFile(object, bytes);
		inputs.set(file, { path: file, bytes: bytes.length, sha256, object });
	}
	await json('source.json', {
		started,
		entry: { sha256: hash(entry) },
		bundle: { sha256: hash(bundle), bytes: bundle.length },
		inputs: [...inputs.values()],
		metafile: bundled.metafile,
		boundaries: [
			'controller port (real new AgentController exercised separately)',
			'Obsidian SDK and app/window leaf',
			'native transport/editor/input and provider events',
			'Map TextStorage/directory/writer ports',
		],
		production: [
			'AgentWorkspace',
			'TerminalControlPanel',
			'TabStrip',
			'Dialog/Select/Button/Input/Textarea',
			'SpaceService',
			'WorkspaceService',
			'TerminalSessions',
			'TerminalSession',
			'ControlRouter',
			'ControlCommands',
			'captureForegroundIntent',
		],
	});
	if (process.argv.includes('--prepare-only')) {
		code = 0;
	} else {
		const styles = await fs.readFile(path.join(repo, 'styles.css')),
			xterm = await fs.readFile(path.join(repo, 'node_modules/@xterm/xterm/css/xterm.css'));
		const html =
			'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/xterm.css"><style>body{margin:0;font:14px sans-serif;background:var(--background-primary);color:var(--text-normal);--background-primary:#fafafa;--background-secondary:#eee;--text-normal:#222;--text-muted:#555;--interactive-accent:#7257cf;--text-selection:#badaff}body.theme-dark{--background-primary:#222;--background-secondary:#292929;--text-normal:#eee;--text-muted:#bbb}#mount{width:1160px;height:820px;margin:8px;max-width:calc(100vw - 16px)}.huhu-terminal-view.is-hidden{display:none}</style></head><body class="theme-light"><button id="outside">Outside fixture focus</button><div id="mount"></div><script src="/fixture.js"></script></body></html>';
		await fs.writeFile(path.join(directory, 'index.html'), html);
		server = createServer((request, response) => {
			const value =
				request.url === '/fixture.js'
					? bundle
					: request.url === '/styles.css'
						? styles
						: request.url === '/xterm.css'
							? xterm
							: html;
			response.setHeader(
				'Content-Type',
				request.url === '/fixture.js'
					? 'application/javascript'
					: request.url?.endsWith('.css')
						? 'text/css'
						: 'text/html',
			);
			response.end(value);
		});
		await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
		const url = 'http://127.0.0.1:' + server.address().port + '/';
		const chrome = process.env.HUHU_CHROME || '/usr/bin/google-chrome',
			args = [
				'--headless=new',
				'--no-sandbox',
				'--disable-background-networking',
				'--disable-component-update',
				'--disable-sync',
				'--no-first-run',
				'--no-default-browser-check',
				'--remote-debugging-address=127.0.0.1',
				'--remote-debugging-port=0',
				'--window-size=1200,1000',
				'--user-data-dir=' + path.join(directory, 'profile'),
				url,
			];
		const chromeEnv = {
			...process.env,
			HOME: path.join(directory, 'chrome-home'),
			XDG_CONFIG_HOME: path.join(directory, 'chrome-config'),
			XDG_CACHE_HOME: path.join(directory, 'chrome-cache'),
			TMPDIR: path.join(directory, 'chrome-tmp'),
		};
		for (const name of ['HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'TMPDIR'])
			await fs.mkdir(chromeEnv[name], { mode: 0o700 });
		commands.push({
			file: chrome,
			args,
			cwd: repo,
			utc: new Date().toISOString(),
			env: Object.fromEntries(
				['HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'TMPDIR'].map((name) => [name, chromeEnv[name]]),
			),
		});
		chromeLog = await fs.open(path.join(directory, 'chrome.stderr.log'), 'wx');
		browser = trackBrowser(spawn(chrome, args, { env: chromeEnv, stdio: ['ignore', 'ignore', chromeLog.fd] }));
		let port;
		for (let i = 0; i < 120; i++) {
			try {
				port = (await fs.readFile(path.join(directory, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0];
				break;
			} catch {
				await delay(50);
			}
		}
		if (!port) throw Error('Chrome startup deadline');
		const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
		connection = await connect(
			tabs.find((tab) => tab.type === 'page' && tab.url.startsWith(url)).webSocketDebuggerUrl,
		);
		for (const method of ['Runtime.enable', 'Page.enable', 'Log.enable', 'Page.bringToFront'])
			await connection.send(method);
		const evaluate = async (expression) => {
			const value = await connection.send('Runtime.evaluate', {
				expression,
				awaitPromise: true,
				returnByValue: true,
				userGesture: true,
			});
			if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails));
			return value.result.value;
		};
		const wait = async (expression) => {
			for (let i = 0; i < 160; i++) {
				if (await evaluate(expression)) return;
				const fatal = await evaluate('window.coordinationFatal');
				if (fatal) throw Error(fatal);
				await delay(25);
			}
			throw Error('Browser condition: ' + expression);
		};
		await wait('window.coordinationReady');
		const check = async (name, expression) => {
			const actual = await evaluate(expression);
			checks.push({ name, ok: actual === true, actual });
			return actual;
		};
		const click = async (expression) => {
			await wait('!!(' + expression + ')');
			await wait(
				`(()=>{const e=${expression};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===e||e.contains(hit));})()`,
			);
			const point = await evaluate(
				`(()=>{const e=${expression};if(!e)throw Error('Missing click target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,300),target:e.outerHTML.slice(0,300)};})()`,
			);
			commands.push({ click: expression, ...point });
			const position = { x: point.x, y: point.y };
			await connection.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position });
			await connection.send('Input.dispatchMouseEvent', {
				type: 'mousePressed',
				button: 'left',
				clickCount: 1,
				...position,
			});
			await connection.send('Input.dispatchMouseEvent', {
				type: 'mouseReleased',
				button: 'left',
				clickCount: 1,
				...position,
			});
			await delay(50);
		};
		const button = (key) =>
			`[...document.querySelectorAll('button')].find(e=>e.textContent===coordinationProbe.label(${JSON.stringify(key)}))`;
		const combo = (key) =>
			`document.getElementById([...document.querySelectorAll('label')].find(e=>e.textContent===coordinationProbe.label(${JSON.stringify(key)})).htmlFor)`;
		const choose = async (key, text) => {
			await evaluate('(' + combo(key) + ').focus()');
			await connection.send('Input.dispatchKeyEvent', enterDown);
			await connection.send('Input.dispatchKeyEvent', enterUp);
			await click(
				`[...document.querySelectorAll('[role=option]')].find(e=>e.textContent.includes(${JSON.stringify(text)}))`,
			);
		};
		const screenshotState = () =>
			evaluate(
				`(()=>{const panel=document.querySelector('[data-terminal-control]'),scroll=panel?.lastElementChild,active=document.activeElement;return{innerWidth,innerHeight,devicePixelRatio,visualHeight:visualViewport.height,visualWidth:visualViewport.width,visualScale:visualViewport.scale,scrollX,scrollY,panelScrollTop:scroll?.scrollTop,panelScrollHeight:scroll?.scrollHeight,panelClientHeight:scroll?.clientHeight,active:{tag:active?.tagName,id:active?.id,label:active?.getAttribute('aria-label'),text:active?.textContent?.slice(0,200)},dialog:document.querySelector('[data-agent-control-dialog]')?.getBoundingClientRect().toJSON()};})()`,
			);
		const screenshotFrames = [];
		const screenshot = async (name) => {
			await evaluate('coordinationProbe.stableGeometry()');
			const before = await screenshotState(),
				layout = await connection.send('Page.getLayoutMetrics');
			const markers = await evaluate(
				`(()=>{const colors=['rgb(239, 17, 37)','rgb(19, 239, 83)'];return colors.map((color,index)=>{const e=document.createElement('div');e.dataset.screenshotBoundary=String(index);e.setAttribute('aria-hidden','true');Object.assign(e.style,{position:'fixed',top:'1px',width:'4px',height:'12px',zIndex:'2147483647',backgroundColor:color,pointerEvents:'none',[index?'right':'left']:'1px'});document.body.append(e);const r=e.getBoundingClientRect();return{index,color,rect:r.toJSON(),rgb:index?[19,239,83]:[239,17,37]};});})()`,
			);
			const params = { format: 'png', fromSurface: true, captureBeyondViewport: false };
			let calibration;
			try {
				const value = await connection.send('Page.captureScreenshot', params),
					bytes = Buffer.from(value.data, 'base64'),
					image = pngPixels(bytes),
					dimensions = screenshotDimensions(image, before);
				await fs.writeFile(path.join(directory, name + '.calibration.png'), bytes);
				const boundaries = markers.map((marker) => {
					const x = Math.floor((marker.rect.x + marker.rect.width / 2) * before.devicePixelRatio),
						y = Math.floor((marker.rect.y + marker.rect.height / 2) * before.devicePixelRatio),
						actual = image.pixel(x, y);
					return {
						...marker,
						pixel: { x, y, actual },
						ok: JSON.stringify(actual) === JSON.stringify(marker.rgb),
					};
				});
				calibration = { dimensions, boundaries, ok: dimensions.ok && boundaries.every((value) => value.ok) };
				if (!calibration.ok)
					throw Error('Screenshot viewport/boundary calibration failed: ' + JSON.stringify(calibration));
			} finally {
				await evaluate(`document.querySelectorAll('[data-screenshot-boundary]').forEach(e=>e.remove())`);
			}
			const value = await connection.send('Page.captureScreenshot', params),
				bytes = Buffer.from(value.data, 'base64'),
				image = pngPixels(bytes),
				dimensions = screenshotDimensions(image, before);
			await fs.writeFile(path.join(directory, name + '.png'), bytes);
			const after = await screenshotState(),
				stable = JSON.stringify(before) === JSON.stringify(after);
			screenshotFrames.push({
				name,
				params,
				layout,
				before,
				after,
				calibration,
				dimensions,
				stable,
				sha256: hash(bytes),
			});
			await json('screenshot-calibration.json', screenshotFrames);
			if (!dimensions.ok || !stable)
				throw Error('Screenshot changed viewport/scroll/focus or cropped the viewport: ' + name);
		};

		await check(
			'one desktop panel',
			`document.querySelectorAll('[data-terminal-control]').length===1&&!document.querySelector('[data-agent-control-dialog]')`,
		);
		await click(`document.querySelector('[data-terminal-control] textarea')`);
		await connection.send('Input.insertText', { text: '中文多行\n保留完整原生回答' });
		await check(
			'no implicit first target',
			`(${button('send')}).disabled===true&&coordinationProbe.editorInputs.length===0`,
		);
		await choose('scope', '所有空间');
		await choose('target', 'Space B');
		await evaluate('coordinationProbe.focusElsewhere()');
		await click(button('sendWait'));
		await wait(`!!${button('cancelWait')}`);
		await check(
			'exact captured target and multiline body',
			`coordinationProbe.editorInputs.length===1&&coordinationProbe.editorInputs[0].runtimeId===coordinationProbe.target.runtimeId&&coordinationProbe.editorInputs[0].text==='中文多行\\n保留完整原生回答'`,
		);
		await click(button('cancelWait'));
		await wait(`!!${button('continueWait')}`);
		await check(
			'cancel does not stop or resend',
			`coordinationProbe.editorInputs.length===1&&coordinationProbe.rawInputs.length===0&&coordinationProbe.state().managed.sessions.find(s=>s.sessionId===coordinationProbe.target.sessionId).runtime.phase==='connected'`,
		);
		await click(button('read'));
		await wait(`document.querySelector('[data-terminal-control] pre')?.textContent.includes('受控原生终端屏幕')`);
		await click(button('continueWait'));
		await evaluate('coordinationProbe.done()');
		await wait(
			`document.querySelector('[data-terminal-control]').textContent.includes(coordinationProbe.label('matched'))`,
		);
		await check(
			'continue preserves original baseline and never resends',
			`coordinationProbe.editorInputs.length===1&&coordinationProbe.selected.filter(r=>r.operation==='agent.wait').length===1&&coordinationProbe.selected.every(r=>r.target.runtimeId===coordinationProbe.target.runtimeId)`,
		);
		const wide = await evaluate('coordinationProbe.stableGeometry()');
		await json('wide-geometry.json', wide);
		await check(
			'wide panel fixed at 312 pixels',
			`(()=>{const g=coordinationProbe.geometry();return !!g.aside&&Math.abs(g.aside.rect.width-312)<0.5&&Math.abs(g.width+g.aside.borderLeft+g.aside.borderRight+g.aside.paddingLeft+g.aside.paddingRight-g.aside.rect.width)<0.1;})()`,
		);
		await screenshot('wide-light');
		await evaluate("document.body.className='theme-dark'");
		await screenshot('wide-dark');
		await connection.send('Emulation.setDeviceMetricsOverride', {
			width: 480,
			height: 900,
			deviceScaleFactor: 1,
			mobile: false,
		});
		await evaluate('coordinationProbe.width(480)');
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		await check(
			'one narrow dialog panel',
			`coordinationProbe.geometry().panels===1&&coordinationProbe.geometry().dialogs===1`,
		);
		const settledGeometry = await evaluate('coordinationProbe.stableGeometry()');
		await json('narrow-stability.json', settledGeometry);
		const geometry = settledGeometry.geometry;
		await json('narrow-geometry.json', geometry);
		await check(
			'narrow controls at least 44 by 44',
			`coordinationProbe.geometry().controls.every(c=>c.width>=43.9&&c.height>=43.9)&&coordinationProbe.geometry().toggle.every(c=>c.width>=43.9&&c.height>=43.9)`,
		);
		await screenshot('narrow-dark');
		await evaluate("document.body.className='theme-light'");
		await screenshot('narrow-light');
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'Escape',
			code: 'Escape',
			windowsVirtualKeyCode: 27,
		});
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'Escape',
			code: 'Escape',
			windowsVirtualKeyCode: 27,
		});
		await wait(`!document.querySelector('[data-terminal-control]')`);
		// Native keyboard activation uses a complete CR-bearing Enter packet.
		await evaluate(`document.querySelector('button[aria-label="'+coordinationProbe.label('title')+'"]').focus()`);
		await connection.send('Input.dispatchKeyEvent', enterDown);
		await connection.send('Input.dispatchKeyEvent', enterUp);
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		await check('native Enter opens original control instance', `coordinationProbe.geometry().panels===1`);
		for (let i = 0; i < 8; i++) {
			await connection.send('Input.dispatchKeyEvent', {
				type: 'keyDown',
				key: 'Tab',
				code: 'Tab',
				windowsVirtualKeyCode: 9,
			});
			await connection.send('Input.dispatchKeyEvent', {
				type: 'keyUp',
				key: 'Tab',
				code: 'Tab',
				windowsVirtualKeyCode: 9,
			});
		}
		await check(
			'Dialog keeps native Tab focus inside',
			`!!document.activeElement?.closest('[data-agent-control-dialog]')`,
		);
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'Escape',
			code: 'Escape',
			windowsVirtualKeyCode: 27,
		});
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'Escape',
			code: 'Escape',
			windowsVirtualKeyCode: 27,
		});
		await wait(`!document.querySelector('[data-agent-control-dialog]')`);
		await check(
			'Dialog Escape returns focus to its original toggle',
			`document.activeElement?.getAttribute('aria-label')===coordinationProbe.label('title')`,
		);
		await evaluate('coordinationProbe.reopen()');
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		await evaluate('coordinationProbe.hide()');
		await wait(`!document.querySelector('[data-terminal-control]')`);
		const normalFinal = await evaluate('coordinationProbe.finish()');
		await json('normal-result.json', {
			checks: [...checks],
			final: normalFinal,
			limitation:
				'Real local Chrome, production controls/business owners; controlled controller port/Obsidian/native/provider/storage. Actual new AgentController separately tested. No real Provider, Obsidian or OS IME acceptance.',
		});

		// Real Chrome page zoom via a fresh profile's default partition preference.
		// Chromium's key is "x" for the empty/default partition path:
		// https://chromium.googlesource.com/chromium/src/+/114.0.5735.90/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc
		// No device metrics override, CSS zoom, pinch scale or production CSS override in this process.
		await Promise.race([connection.send('Browser.close'), delay(1000)]);
		connection.close();
		connection = undefined;
		await stopBrowser(browser);
		await chromeLog.close();
		chromeLog = undefined;
		const zoomProfile = path.join(directory, 'zoom-profile'),
			zoomPreference = { partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } };
		await fs.mkdir(path.join(zoomProfile, 'Default'), { recursive: true });
		const preferenceBytes = JSON.stringify(zoomPreference);
		await fs.writeFile(path.join(zoomProfile, 'Default/Preferences'), preferenceBytes);
		await json('zoom-mechanism.json', {
			mechanism: 'Chrome browser page zoom through a new isolated profile default zoom level',
			factor: 2,
			preference: zoomPreference,
			preferenceSha256: hash(preferenceBytes),
			deviceScaleFactorOverride: false,
			cssZoom: false,
			pinchScale: false,
		});
		const zoomArgs = args.map((arg) =>
			arg.startsWith('--user-data-dir=') ? '--user-data-dir=' + zoomProfile : arg,
		);
		commands.push({ file: chrome, args: zoomArgs, cwd: repo, utc: new Date().toISOString(), browserZoom: 2 });
		chromeLog = await fs.open(path.join(directory, 'chrome-zoom.stderr.log'), 'wx');
		browser = trackBrowser(spawn(chrome, zoomArgs, { env: chromeEnv, stdio: ['ignore', 'ignore', chromeLog.fd] }));
		let zoomPort;
		for (let i = 0; i < 120; i++) {
			try {
				zoomPort = (await fs.readFile(path.join(zoomProfile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
				break;
			} catch {
				await delay(50);
			}
		}
		if (!zoomPort) throw Error('200 percent Chrome startup deadline');
		const zoomTabs = await (await fetch('http://127.0.0.1:' + zoomPort + '/json/list')).json();
		connection = await connect(
			zoomTabs.find((tab) => tab.type === 'page' && tab.url.startsWith(url)).webSocketDebuggerUrl,
		);
		for (const method of ['Runtime.enable', 'Page.enable', 'Log.enable', 'Page.bringToFront'])
			await connection.send(method);
		await wait('window.coordinationReady');
		const zoomMetrics = await evaluate(
			`({innerWidth,innerHeight,outerWidth,devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom,visualScale:visualViewport.scale})`,
		);
		const zoomWindow = await connection.send('Browser.getWindowForTarget');
		await json('zoom-metrics.json', { ...zoomMetrics, browserWindowBounds: zoomWindow.bounds });
		await check(
			'real browser zoom is 200 percent with reflow',
			`Math.abs(innerWidth*2-${zoomWindow.bounds.width})<=2&&Math.abs(devicePixelRatio-2)<0.01&&getComputedStyle(document.documentElement).zoom==='1'&&Math.abs(visualViewport.scale-1)<0.01`,
		);
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		await json('zoom-stability.json', await evaluate('coordinationProbe.stableGeometry()'));
		if (croppedReference) {
			const bytes = await fs.readFile(croppedReference),
				image = pngPixels(bytes),
				viewport = await screenshotState(),
				dimensions = screenshotDimensions(image, viewport);
			await json('cropped-reference.json', { path: croppedReference, sha256: hash(bytes), viewport, dimensions });
			checks.push({
				name: 'screenshot calibration rejects the supplied cropped original',
				ok: !dimensions.ok,
				actual: !dimensions.ok,
			});
		}
		await check(
			'200 percent dialog visible without horizontal overflow',
			`(()=>{const e=document.querySelector('[data-agent-control-dialog]'),r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1;})()`,
		);
		await choose('scope', '所有空间');
		await choose('target', 'Space B');
		await click(button('read'));
		await wait(`document.querySelector('[data-terminal-control] pre')?.textContent.includes('受控原生终端屏幕')`);
		await check(
			'200 percent passive read operates on the explicit target',
			`coordinationProbe.editorInputs.length===0&&coordinationProbe.rawInputs.length===0&&coordinationProbe.selected.length===1&&coordinationProbe.selected[0].operation==='terminal.read'&&coordinationProbe.selected[0].target.runtimeId===coordinationProbe.target.runtimeId`,
		);
		await screenshot('zoom-200-light');
		const formViews = [];
		for (const theme of ['light', 'dark']) {
			await evaluate(`document.body.className='theme-${theme}'`);
			for (const edge of ['top', 'bottom']) {
				await evaluate(
					`(()=>{const scroll=document.querySelector('[data-terminal-control]').lastElementChild;scroll.scrollTop=${edge === 'top' ? '0' : 'scroll.scrollHeight'};})()`,
				);
				await screenshot('zoom-200-' + theme + '-' + edge);
				formViews.push({ theme, edge, state: await screenshotState() });
			}
		}
		await json('zoom-form-views.json', formViews);
		await screenshot('zoom-200-dark');
		await json('zoom-geometry.json', await evaluate('coordinationProbe.geometry()'));
		await json('result.json', {
			checks,
			normal: normalFinal,
			zoom: { metrics: zoomMetrics, final: await evaluate('coordinationProbe.finish()') },
			limitation:
				'Real local Chrome browser zoom and production controls/business; controlled controller port/Obsidian/native/provider/storage. Actual new AgentController separately tested. No real Provider, Obsidian or OS IME acceptance.',
		});
		code = checks.every((check) => check.ok) ? 0 : 1;
	}
} catch (error) {
	if (connection) {
		try {
			const shot = await connection.send('Page.captureScreenshot', {
				format: 'png',
				captureBeyondViewport: false,
			});
			await fs.writeFile(path.join(directory, 'failure.png'), Buffer.from(shot.data, 'base64'));
			const dump = await connection.send('Runtime.evaluate', {
				expression: 'JSON.stringify({state:window.coordinationProbe?.state(),html:document.body.innerHTML})',
				returnByValue: true,
			});
			await fs.writeFile(path.join(directory, 'failure-dom.json'), dump.result.value);
		} catch {}
	}
	await json('failure.json', { error: String(error), stack: error.stack });
	console.error(error);
} finally {
	const drift = [];
	for (const input of inputs.values()) {
		try {
			const current = hash(await fs.readFile(input.path));
			if (current !== input.sha256) drift.push({ path: input.path, before: input.sha256, after: current });
		} catch (error) {
			drift.push({ path: input.path, error: String(error) });
		}
	}
	await json('source-after.json', { utc: new Date().toISOString(), drift });
	if (drift.length) code = 1;
	await json('commands.json', commands);
	await json('cdp-events.json', events);

	connection?.close();
	const cleanupErrors = [];
	try {
		if (browser) await stopBrowser(browser);
	} catch (error) {
		cleanupErrors.push(String(error));
		code = 1;
	}
	await chromeLog?.close();
	if (server) await new Promise((resolve) => server.close(resolve));
	const removed = [];
	if (cleanupErrors.length === 0) {
		for (const [profile, name] of [
			['profile', 'normal-preferences-final.json'],
			['zoom-profile', 'zoom-preferences-final.json'],
		]) {
			try {
				await fs.copyFile(path.join(directory, profile, 'Default/Preferences'), path.join(directory, name));
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
		}
		for (const name of ['profile', 'zoom-profile', 'chrome-home', 'chrome-config', 'chrome-cache', 'chrome-tmp']) {
			await fs.rm(path.join(directory, name), { recursive: true, force: true });
			removed.push(name);
		}
	}
	await json('cleanup.json', {
		browsers: browserRecords,
		serverClosed: !server?.listening,
		removed,
		errors: cleanupErrors,
	});
	await json('summary.json', {
		started,
		finished: new Date().toISOString(),
		exit: code,
		checks,
		drift,
		prepareOnly: process.argv.includes('--prepare-only'),
		cleanup: {
			browsersClosed: browserRecords.every((value) => value.closed),
			serverClosed: !server?.listening,
			errors: cleanupErrors,
		},
	});
}
console.log(JSON.stringify({ directory, exit: code }));
process.exitCode = code;

/** Local Chrome T09 production panels acceptance. Production Page/Panel/Router/Commands/Workspace/Session;
 * controlled controller port, Obsidian SDK, native editor/input and Map TextStorage.
 * Actual new AgentController assembly is independently exercised by controller-control.test.ts.
 * Usage: node ...mjs <new-/tmp-directory> [--prepare-only] [--inbox]
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
const directory = path.resolve(process.argv[2] || `/tmp/huhu-t09-production-ui-chrome-${Date.now()}`);
if (!/^\/tmp\/huhu-t09-production-ui-/.test(directory)) throw Error('Evidence must use a new /tmp directory');
if (process.argv.slice(3).some((arg) => !['--prepare-only', '--inbox'].includes(arg))) throw Error('Unsupported fixture argument');
const inboxSuite = process.argv.includes('--inbox');
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
	const scene = new URL(location.href).searchParams.get('scene') ?? 'default';
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
	const spaceOptions = {
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
	};
	let spaces = new SpaceService(spaceOptions);
	let spawned = 0;
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
		spawnSession: async () => {
			record('spawn', ++spawned);
			return spawned;
		},
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
	const sessionOptions = {
		native,
		platform: 'linux',
		environment: async () => ({}),
		settings: () => settings,
		colors: () => ({ foreground: '#eee', background: '#222', cursor: '#fff' }),
	};
	let sessions = new TerminalSessions(sessionOptions);
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
	const createWorkspace = () =>
		new WorkspaceService(
			createSpaceWorkspaceStore(spaces, clock, (error) => errors.push(String(error))),
			sessions,
			launch,
			() => undefined,
			spaces,
		);
	let workspace = createWorkspace();
	await workspace.persistence.ready;
	let inbox = new InboxService({ spaces, presentation: new InboxPresentation() });
	const noSpaces = ['noSpace', 'loading', 'error'].includes(scene);
	const a = noSpaces
			? undefined
			: await spaces.create({ name: 'Space A · 同名长空间与完整身份 · docs / tools / terminal' }),
		b = noSpaces ? undefined : await spaces.create({ name: 'Space B · 同名目录' });
	if (a) await workspace.selectSpace(a.id);
	const created = [];
	if (!noSpaces && scene !== 'empty')
		for (const space of [a, a, a, b]) {
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
	if (created.length) {
		await workspace.attachManaged(created[0].session, { focus: false });
		await workspace.splitPane(created[0].session.runtime.runtimeId, 'row');
		await workspace.attachManaged(created[1].session, { focus: false });
		const state = workspace.store.getState(),
			ids = Object.keys(state.tabs),
			first = ids[0];
		workspace.move(ids[1], { split: 'right', ofGroupId: workspace.group(first).id });
		workspace.activate(first);
		if (scene === 'disconnected') output.closed?.('controlled transport disconnected');
		if (scene === 'stopped' || scene === 'restored')
			await workspace.stopManaged({
				spaceId: a.id,
				sessionId: created[0].session.sessionId,
				runtimeId: created[0].session.runtime.runtimeId,
			});
		if (scene === 'restored') {
			await workspace.persistence.flush();
			await workspace.dispose();
			await sessions.dispose();
			inbox.dispose();
			spaces = new SpaceService(spaceOptions);
			sessions = new TerminalSessions(sessionOptions);
			workspace = createWorkspace();
			await workspace.persistence.ready;
			inbox = new InboxService({ spaces, presentation: new InboxPresentation() });
		}
	}
	if (scene === 'inbox' && created.length) {
		const target = created[0].session;
		await inbox.send({
			messageId: 'chrome-inbox-unread',
			recipient: { spaceId: target.spaceId, sessionId: target.sessionId },
			source: 'chrome-fixture',
			body: '受控 Inbox 消息：读取与确认分开。',
		});
	}
	if (scene === 'loading') spaces.store.setState({ loading: true });
	if (scene === 'error') spaces.store.setState({ error: new Error('Controlled storage unavailable') });
	const router = new ControlRouter(new ControlCommands(spaces, workspace, sessions)),
		view = createWorkspaceView();
	// Explicit controller port only: real business adapter and production foreground capture.
	const hostListeners = new Set(),
		keyScopes = [];
	const hostLeaf = { view: { containerEl: leaf } };
	document.addEventListener('keydown', (event) => {
		for (const callback of keyScopes.at(-1)?.handlers ?? []) if (callback(event) === false) break;
	});
	const controller = {
		workspace,
		spaces,
		sessions,
		inbox,
		app: {
			scope: new Scope(),
			keymap: {
				pushScope(scope) {
					keyScopes.push(scope);
				},
				popScope(scope) {
					const i = keyScopes.lastIndexOf(scope);
					if (i >= 0) keyScopes.splice(i, 1);
				},
			},
			workspace: {
				containerEl: leaf,
				on(name, callback) {
					const ref = { name, callback };
					hostListeners.add(ref);
					return ref;
				},
				offref(ref) {
					hostListeners.delete(ref);
				},
				getMostRecentLeaf: () => hostLeaf,
			},
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
	const shellReact = createRoot(leaf),
		navigationHost = document.createElement('div'),
		navigationActions = { current: null };
	let pageReact,
		pageElement,
		visible = true;
	let shellState = normalizeWorkbenchState({ target: { feature: 'terminal' }, panelOpen: true, panelWidth: 280 });
	const context = {
		app: controller.app,
		leaf: hostLeaf,
		embedded: true,
		navigationEl: navigationHost,
		contentEl: leaf,
		containerEl: leaf,
		togglePanel: () => navigationActions.current?.toggle(),
		openNavigation: () => navigationActions.current?.open(),
		openPageMenu: () => record('page-menu', true),
	};
	const renderPage = () => {
		if (!pageReact) return;
		pageReact.render(
			h(HuhuProviders, { ownerDocument: document, visible }, h(AgentWorkspace, { controller, context, view })),
		);
	};
	const contentRef = (element) => {
		if (!element) return;
		pageElement = element;
		context.contentEl = element;
		context.containerEl = element;
		hostLeaf.view.containerEl = element;
		pageReact ??= createRoot(element);
		queueMicrotask(renderPage);
	};
	const panelRef = (element) => {
		if (element) element.append(navigationHost);
	};
	const render = () =>
		flushSync(() =>
			shellReact.render(
				h(
					HuhuProviders,
					{ ownerDocument: document, visible },
					h(ShellRoot, {
						visible,
						state: shellState,
						rail: [
							{ id: 'terminal', label: '智能体', icon: 'bot', slot: 'top' },
							{ id: 'settings', label: '设置', icon: 'settings', slot: 'bottom' },
						],
						railCurrent: 'terminal',
						title: 'HUHU',
						panelTitle: '空间与会话',
						navigationContext: true,
						chrome: 'none',
						statuses: [],
						busy: false,
						ownerWindow: window,
						phone: false,
						onRail: () => {
							shellState = { ...shellState, panelOpen: !shellState.panelOpen };
							render();
							return 'toggled';
						},
						onOpen: () => {},
						onNavigate: () => {},
						onPanelOpen: (panelOpen) => {
							shellState = { ...shellState, panelOpen };
							render();
						},
						onPanelWidth: (panelWidth) => {
							shellState = { ...shellState, panelWidth };
							render();
						},
						more: () => record('page-menu', true),
						retry: () => {},
						report: (error) => errors.push(String(error)),
						contentRef,
						panelCustomRef: panelRef,
						navigationActions,
					}),
				),
			),
		);
	render();
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	const target = created.at(-1)?.session;
	window.coordinationProbe = {
		errors,
		trace,
		scene,
		created,
		spaces: [a, b].filter(Boolean),
		workspace,
		sessions,
		view,
		label: (key) => t(key),
		tree: () => structuredClone(workspace.store.getState()),
		state: () => ({
			scene,
			spawned,
			editorInputs,
			rawInputs,
			selected,
			errors,
			managed: workspace.getManagedSnapshot(),
			inbox: inbox.observations(),
			view: view.getState(),
			active: document.activeElement?.outerHTML.slice(0, 500),
			tree: structuredClone(workspace.store.getState()),
			shell: shellState,
		}),
		async stableGeometry() {
			const samples = [];
			let previous,
				stable = 0;
			const start = performance.now();
			while (performance.now() - start < 4000) {
				await new Promise((resolve) => requestAnimationFrame(resolve));
				const animations = document
					.getAnimations()
					.filter(
						(a) =>
							(a.pending || a.playState === 'running') &&
							a.effect?.getComputedTiming().iterations !== Infinity,
					);
				const rects = [
					...document.querySelectorAll(
						'[data-workspace-toolbar],[data-panel-group],[data-pane-header],[data-terminal-control],[data-state=open]',
					),
				].map((e) => e.getBoundingClientRect().toJSON());
				const key = JSON.stringify(rects);
				samples.push({ at: performance.now(), rects, finiteAnimations: animations.length });
				stable = key === previous && !animations.length ? stable + 1 : 0;
				previous = key;
				if (stable >= 3) return { samples, geometry: this.geometry() };
			}
			throw Error('Production geometry did not settle');
		},
		geometry() {
			return {
				outerWidth,
				outerHeight,
				innerWidth,
				innerHeight,
				devicePixelRatio,
				visualWidth: visualViewport.width,
				visualHeight: visualViewport.height,
				visualScale: visualViewport.scale,
				cssZoom: getComputedStyle(document.documentElement).zoom,
				overflow: document.documentElement.scrollWidth > innerWidth,
				toolbar: document.querySelector('[data-workspace-toolbar]')?.getBoundingClientRect().toJSON(),
				headers: [...document.querySelectorAll('[data-pane-header]')].map((e) => ({
					rect: e.getBoundingClientRect().toJSON(),
					close: e.querySelector('[data-pane-close]')?.getBoundingClientRect().toJSON(),
					title: e.querySelector('[data-pane-title]')?.title,
				})),
				targets: [...document.querySelectorAll('.huhu-workspace-toolbar button,[data-pane-header] button,[data-group-strip] button,.huhu-workspace-tab-close')]
					.map((e) => {
						const r = e.getBoundingClientRect(),
							strip = e.closest('[data-group-strip]')?.getBoundingClientRect();
						return {
							name: e.getAttribute('aria-label') || e.getAttribute('data-pane-title') !== null && 'pane-title' || e.textContent.trim().slice(0, 20),
							width: r.width,
							height: r.height,
							hidden: r.width === 0 || getComputedStyle(e).visibility === 'hidden',
							escapes: strip ? r.top < strip.top - 0.5 || r.bottom > strip.bottom + 0.5 : false,
						};
					})
					.filter((target) => !target.hidden),
				groups: [...document.querySelectorAll('[data-panel-group]')].map((e) => ({
					direction: e.getAttribute('data-panel-group-direction'),
					rect: e.getBoundingClientRect().toJSON(),
				})),
				control: document.querySelector('[data-terminal-control]')?.getBoundingClientRect().toJSON(),
				dialog: !!document.querySelector('[data-agent-control-dialog]'),
				active: document.activeElement?.getAttribute('aria-label'),
			};
		},
		async width(width) {
			leaf.style.width = width + 'px';
			await this.stableGeometry();
		},
		control(open) {
			view.setState({ control: open, history: false });
		},
		async selectSpace(index) {
			await workspace.selectSpace(this.spaces[index].id);
		},
		async externalRatio() {
			const tab = Object.values(workspace.store.getState().tabs).find(
				(t) => t.kind === 'terminal' && t.sessionIds.length > 1,
			);
			if (tab) workspace.resizePane(tab.id, [], 0.65);
		},
		async closeLast() {
			const row = workspace
				.getManagedSnapshot()
				.sessions.find(
					(s) =>
						s.runtime &&
						s.viewState === 'attached' &&
						s.runtime.phase === 'connected' &&
						Object.values(workspace.store.getState().tabs).some(
							(t) =>
								t.kind === 'terminal' &&
								t.sessionIds.length === 1 &&
								t.sessionIds.includes(s.runtime.runtimeId),
						),
				);
			if (!row) throw Error('No attached live session');
			const runtime = row.runtime.runtimeId;
			const tab = Object.values(workspace.store.getState().tabs).find(
				(t) => t.kind === 'terminal' && t.sessionIds.includes(runtime),
			);
			await workspace.closePane(runtime, async () => true);
			return { runtime, running: sessions.get(runtime)?.running, view: workspace.getManaged(row)?.viewState };
		},
		hide() {
			visible = false;
			render();
			renderPage();
		},
		show() {
			visible = true;
			render();
			renderPage();
		},
		async finish() {
			closed = true;
			pageReact?.unmount();
			shellReact.unmount();
			await router.close();
			await workspace.dispose();
			await sessions.dispose();
			return { errors, trace, spawned, keyScopes: keyScopes.length, hostListeners: hostListeners.size };
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
	const imports = `import React from 'react';import {Scope} from 'obsidian';import {ShellRoot} from './src/shell/ShellRoot';import {normalizeWorkbenchState} from './src/shell/navigation-state';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {createStore} from 'zustand/vanilla';import {AgentWorkspace} from './src/modules/agent/ui/AgentWorkspacePage';import {HuhuProviders} from './src/ui/react/providers';import {SpaceService} from './src/modules/agent/services/spaces/space-service';import {WorkspaceService} from './src/modules/agent/services/workspace-service';import {createSpaceWorkspaceStore} from './src/modules/agent/services/workspace-store';import {createWorkspaceView} from './src/modules/agent/services/workspace-view';import {TerminalSessions} from './src/modules/agent/services/terminal/sessions';import {normalizeTerminalSettings} from './src/modules/agent/core/terminal/settings';import {captureForegroundIntent} from './src/modules/agent/services/launch/foreground-intent';import {ControlCommands} from './src/modules/agent/services/control/commands';import {ControlRouter} from './src/modules/agent/services/control/router';import {captureControlExecutionContext,observeControlPreparation} from './src/modules/agent/services/control/terminal-coordination';import {InboxService} from './src/modules/agent/services/inbox/service';import {InboxPresentation} from './src/modules/agent/services/inbox/presentation';import {NATIVE_INPUT_LIMITS} from './src/shared/native/input';import {registerMessages,setLanguage,t} from './src/shared/i18n';import {messages} from './src/modules/agent/i18n';import {messages as uiMessages} from './src/shared/i18n/lazy/ui';`;
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
		// Desktop-only modules (for example native-resume occupancy) reference Node at import time; the browser fixture
		// never calls them, so any use fails loudly instead of failing the whole bundle.
		banner: { js: "var require=id=>new Proxy({},{get:(_t,name)=>name==='__esModule'?false:()=>{throw Error('Node boundary '+id+'.'+String(name)+' is not available in the browser fixture')}});" },
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
								? `export const Platform={isWin:false,isMacOS:false,isMobile:false,isDesktopApp:true};export class Notice{constructor(value){window.hostNotices??=[];window.hostNotices.push(value)}};export class Scope{handlers=[];register(_modifiers,_key,callback){this.handlers.push(callback);}};export class TFile{};export class FileSystemAdapter{};export class TFolder{};export class Component{};export class FuzzySuggestModal{};export class Menu{};export const normalizePath=p=>p;export const setIcon=(element,name)=>element.setAttribute('data-host-icon',name);export const requestUrl=()=>{throw Error('Network outside fixture')};`
								: `export const droppedFilePath=()=>undefined;export const openPath=async()=>{};export const resolveReference=async()=>null;export const vaultFilePath=(vault,p)=>vault+'/'+p;`,
					}));
					builder.onLoad({ filter: /\.(ts|tsx|mjs|js|json|svg|md)$/ }, async (input) => {
						const bytes = await fs.readFile(input.path),
							sha256 = hash(bytes),
							object = path.join(directory, 'objects', sha256);
						try {
							await fs.writeFile(object, bytes, { flag: 'wx' });
						} catch (error) {
							if (error.code !== 'EEXIST') throw error;
						}
						inputs.set(input.path, {
							path: input.path,
							bytes: bytes.length,
							sha256,
							object,
							mode: '0o' + ((await fs.stat(input.path)).mode & 0o777).toString(8),
						});
						return {
							contents: bytes,
							loader: /\.(svg|md)$/.test(input.path)
								? 'text'
								: input.path.endsWith('.json')
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
		'scripts/obsidian-acceptance/agent-workbench-panels.mjs',
	]) {
		const file = path.join(repo, name),
			bytes = await fs.readFile(file),
			sha256 = hash(bytes),
			object = path.join(directory, 'objects', sha256);
		await fs.writeFile(object, bytes);
		inputs.set(file, {
			path: file,
			bytes: bytes.length,
			sha256,
			object,
			mode: '0o' + ((await fs.stat(file)).mode & 0o777).toString(8),
		});
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
		if (!process.env.HUHU_PANELS_STYLES_SHA256 || hash(styles) !== process.env.HUHU_PANELS_STYLES_SHA256)
			throw Error('Root generated stylesheet SHA is required and must match');
		const html =
			'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/xterm.css"><style>body{margin:0;font:14px sans-serif;background:var(--background-primary);color:var(--text-normal);--background-primary:#fafafa;--background-secondary:#eee;--text-normal:#222;--text-muted:#555;--interactive-accent:#7257cf;--text-selection:#badaff}body.theme-dark{--background-primary:#222;--background-secondary:#292929;--text-normal:#eee;--text-muted:#bbb}html,body{height:100%;overflow:hidden}#mount{width:100%;height:calc(100dvh - 24px);margin:0}.huhu-ui p{margin-block:0}.huhu-ui h1,.huhu-ui h2{margin:0}#outside{height:24px}.huhu-terminal-view.is-hidden{display:none}</style></head><body class="theme-light"><button id="outside">Outside fixture focus</button><div id="mount"></div><script src="/fixture.js"></script></body></html>';
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

		const aria = (key) =>
			`[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')===coordinationProbe.label(${JSON.stringify(key)}))`;
		const resizeViewport = async (width) => {
			await connection.send('Emulation.setDeviceMetricsOverride', {
				width,
				height: 1000,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await evaluate('coordinationProbe.stableGeometry()');
		};
		const beforeProjection = await evaluate('JSON.stringify(coordinationProbe.tree())');
		await check(
			'actual production terminal hosts and independent background session exist',
			`document.querySelectorAll('[data-terminal-host]').length>=3&&coordinationProbe.state().managed.sessions.some(s=>s.viewState==='background')`,
		);
		for (const width of [1440, 1200, 800, 390, 480, 599, 600, 959, 960]) {
			await resizeViewport(width);
			await evaluate(
				`coordinationProbe.control(false);document.body.className='theme-${width % 2 ? 'dark' : 'light'}'`,
			);
			const stable = await evaluate('coordinationProbe.stableGeometry()');
			await json('viewport-' + width + '.json', stable);
			await check(
				'viewport ' + width + ' keeps layout and close targets',
				`(()=>{const g=coordinationProbe.geometry(),narrow=document.querySelector('[data-agent-workspace]').getBoundingClientRect().width<600;return !g.overflow&&g.toolbar.height>=44&&g.headers.length>=3&&g.headers.every(h=>h.rect.height>=(narrow?44:34)&&h.close.width>=(narrow?44:32)&&h.close.height>=(narrow?44:32));})()`,
			);
			await check(
				'viewport ' + width + ' toolbar, pane, tab-strip and quick-command targets meet the size rule without leaving the strip',
				`(()=>{const g=coordinationProbe.geometry(),narrow=document.querySelector('[data-agent-workspace]').getBoundingClientRect().width<600,min=narrow?43.9:31.9;return g.targets.length>=3&&g.targets.every(t=>t.width>=min&&t.height>=min&&!t.escapes)})()`,
			);
			await screenshot('viewport-' + width);
		}
		await check(
			'responsive projection never mutates persistent direction ratios or pane identities',
			`JSON.stringify(coordinationProbe.tree())===${JSON.stringify(beforeProjection)}`,
		);
		await resizeViewport(1440);
		await evaluate('coordinationProbe.control(true)');
		await evaluate('coordinationProbe.stableGeometry()');
		await check(
			'wide control outer box stays 312 pixels',
			`Math.abs(coordinationProbe.geometry().control.width-312)<=1&&!coordinationProbe.geometry().dialog`,
		);
		for (const theme of ['light', 'dark']) {
			await evaluate(`document.body.className='theme-${theme}'`);
			await screenshot('wide-control-' + theme);
		}
		await resizeViewport(480);
		await evaluate('coordinationProbe.control(false)');
		await click(aria('agent.coordination.title'));
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		for (let i = 0; i < 5; i++) {
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
			'narrow native Tab focus stays in the production Dialog',
			`!!document.activeElement?.closest('[data-agent-control-dialog]')`,
		);
		await screenshot('narrow-control-dark');
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
			'Dialog Escape returns to the actual toolbar trigger',
			`document.activeElement?.getAttribute('aria-label')===coordinationProbe.label('agent.coordination.title')`,
		);
		await click(aria('agent.workspace.toggleSidebar'));
		await wait(`!!document.querySelector('[role=dialog]')`);
		await screenshot('narrow-space-sheet');
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
		await wait(`!document.querySelector('[role=dialog]')`);
		await resizeViewport(1440);
		await evaluate('coordinationProbe.control(false)');
		await evaluate('coordinationProbe.externalRatio()');
		await wait(
			`document.querySelector('[data-terminal-layout] [role=separator]')?.getAttribute('aria-valuenow')==='65'`,
		);
		await check(
			'external original-owner ratio updates the production panel',
			`coordinationProbe.tree().tabs[Object.keys(coordinationProbe.tree().tabs).find(k=>coordinationProbe.tree().tabs[k].sessionIds?.length>1)].paneLayout.ratio===0.65`,
		);
		const pointerDrag = async (expression, dx, dy) => {
			await wait('!!(' + expression + ')');
			const point = await evaluate(
				`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`,
			);
			commands.push({ pointerDrag: expression, point, dx, dy });
			await connection.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
			await connection.send('Input.dispatchMouseEvent', {
				type: 'mousePressed',
				button: 'left',
				clickCount: 1,
				...point,
			});
			for (let i = 1; i <= 12; i++)
				await connection.send('Input.dispatchMouseEvent', {
					type: 'mouseMoved',
					buttons: 1,
					x: point.x + (dx * i) / 12,
					y: point.y + (dy * i) / 12,
				});
			await connection.send('Input.dispatchMouseEvent', {
				type: 'mouseReleased',
				button: 'left',
				clickCount: 1,
				x: point.x + dx,
				y: point.y + dy,
			});
			await evaluate('coordinationProbe.stableGeometry()');
		};
		const paneTreeBefore = await evaluate('JSON.stringify(coordinationProbe.tree())');
		await pointerDrag(`document.querySelector('[data-terminal-layout] [data-panel-resize-handle-id]')`, 0, -60);
		await check(
			'real pointer pane resize writes the same owner tree',
			`JSON.stringify(coordinationProbe.tree())!==${JSON.stringify(paneTreeBefore)}`,
		);
		const groupBefore = await evaluate('JSON.stringify(coordinationProbe.tree().layout)');
		await pointerDrag(
			`document.querySelector('[data-workspace-layout] > [data-panel-group] > [data-panel-resize-handle-id]')`,
			60,
			0,
		);
		await check(
			'real pointer group resize writes original group sizes',
			`JSON.stringify(coordinationProbe.tree().layout)!==${JSON.stringify(groupBefore)}`,
		);
		const tabsBefore = await evaluate('JSON.stringify(coordinationProbe.tree().groups)');
		const centers = await evaluate(
			`(()=>{const source=document.querySelector('[data-group-strip] [role=tab]'),dest=[...document.querySelectorAll('[data-group-id]')].at(-1),a=source.getBoundingClientRect(),b=dest.getBoundingClientRect();return{dx:b.x+b.width/2-a.x-a.width/2,dy:b.y+b.height/2-a.y-a.height/2};})()`,
		);
		await pointerDrag(`document.querySelector('[data-group-strip] [role=tab]')`, centers.dx, centers.dy);
		await check(
			'real tab drag is read back from the original groups',
			`JSON.stringify(coordinationProbe.tree().groups)!==${JSON.stringify(tabsBefore)}`,
		);
		await screenshot('pointer-layout');
		const detached = await evaluate('coordinationProbe.closeLast()');
		await json('close-last.json', detached);
		checks.push({
			name: 'closing the last pane detaches while the original runtime remains running',
			ok: detached.running === true && detached.view === 'detached',
			actual: detached,
		});
		await connection.send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
		});
		await check(
			'reduced motion is an actual browser media match',
			`matchMedia('(prefers-reduced-motion: reduce)').matches`,
		);
		await screenshot('reduced-motion');
		await connection.send('Emulation.setEmulatedMedia', { features: [] });
		await evaluate('coordinationProbe.finish()');
		for (const scene of ['empty', 'noSpace', 'loading', 'error', 'disconnected', 'stopped', 'restored', ...(inboxSuite ? ['inbox'] : [])]) {
			await connection.send('Page.navigate', { url: url + '?scene=' + scene });
			await wait(`window.coordinationReady&&coordinationProbe.scene===${JSON.stringify(scene)}`);
			await evaluate('coordinationProbe.control(false)');
			if (scene === 'inbox') {
				await check('inbox arrival keeps the tool closed until explicitly opened', `coordinationProbe.state().view.control===false&&!!document.querySelector('[aria-label="收件箱"]')`);
				await click(`document.querySelector('[aria-label="收件箱"]')`);
				await wait('!!document.querySelector("[data-agent-inbox]")');
				await click(`document.querySelectorAll('[data-agent-inbox] [data-slot="select-trigger"]')[1]`);
				await click(`([...document.querySelectorAll('[data-slot="select-content"][data-state="open"] [data-slot="select-item"]')].find((option)=>option.textContent?.includes(coordinationProbe.created[0].session.sessionId)))`);
				await wait('!!document.querySelector("[data-agent-inbox] [data-message-id]")');
				await check('inbox summary list does not leak detail or body', `!document.querySelector('[data-inbox-detail]')&&!document.querySelector('[data-agent-inbox]')?.textContent?.includes('受控 Inbox 消息')`);
				await click(`document.querySelector('[data-agent-inbox] [data-message-id="chrome-inbox-unread"] button')`);
				await wait('!!document.querySelector("[data-inbox-detail]")');
				await check('inbox unread body is inspectable after explicit opening', `document.querySelector('[data-inbox-detail]')?.textContent?.includes('受控 Inbox 消息')===true`);
			}
			await evaluate(
				`document.body.className='theme-${scene === 'error' || scene === 'stopped' ? 'dark' : 'light'}'`,
			);
			await screenshot('state-' + scene);
			await check(
				'state ' + scene + ' retains a usable viewport without unhandled errors',
				`!coordinationProbe.geometry().overflow&&coordinationProbe.state().errors.length===0&&!!document.querySelector('[data-workspace-toolbar]')`,
			);
			if (scene === 'restored')
				await check(
					'restored layout does not start an old runtime',
					`!coordinationProbe.state().managed.sessions.some(s=>s.runtime?.phase==='connected')`,
				);
			await json('state-' + scene + '.json', await evaluate('coordinationProbe.state()'));
			await evaluate('coordinationProbe.finish()');
		}
		const normalFinal = { checks: [...checks] };
		await json('normal-result.json', normalFinal);
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
		await evaluate('coordinationProbe.control(true)');
		await wait(`!!document.querySelector('[data-agent-control-dialog]')`);
		await json('zoom-stability.json', await evaluate('coordinationProbe.stableGeometry()'));
		await check(
			'200 percent production controls reflow without outer overflow',
			`(()=>{const g=coordinationProbe.geometry(),e=document.querySelector('[data-agent-control-dialog]'),r=e.getBoundingClientRect();return !g.overflow&&r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1;})()`,
		);
		for (const theme of ['light', 'dark'])
			for (const edge of ['top', 'bottom']) {
				await evaluate(
					`(()=>{document.body.className='theme-${theme}';const s=document.querySelector('[data-terminal-control]').lastElementChild;s.scrollTop=${edge === 'top' ? '0' : 's.scrollHeight'};})()`,
				);
				await screenshot('zoom-200-' + theme + '-' + edge);
			}
		await json('result.json', {
			checks,
			zoom: { metrics: zoomMetrics, final: await evaluate('coordinationProbe.finish()') },
			limitation:
				'Actual local Chrome / production ShellRoot, WorkspaceLayout, TerminalTabView, xterm and original stores/services. Controlled Obsidian/controller/native/storage/provider ports; no real Obsidian, Provider, OS IME or five-platform E2E claim.',
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

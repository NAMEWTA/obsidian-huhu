/** Local real-Chrome acceptance of T06 production components and presented/seen.
 * Controlled Obsidian/native/provider/Map TextStorage boundaries; no real disk, Obsidian or Provider claim.
 * Usage: node scripts/obsidian-acceptance/agent-workbench-activity.mjs /tmp/new-run-directory --enter-packet=original|complete
 * HUHU_ACTIVITY_ENTER_PACKET is an optional fallback; explicit argv takes precedence.
 * Default complete adds CR text for native button activation; original preserves Chrome v1 keyDown/keyUp for diagnosis.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';

const enterPacketArgument = process.argv[3];
if (enterPacketArgument !== undefined && !enterPacketArgument.startsWith('--enter-packet='))
	throw Error('Expected --enter-packet=original or --enter-packet=complete');
const enterPacketMode =
	enterPacketArgument?.slice('--enter-packet='.length) ?? process.env.HUHU_ACTIVITY_ENTER_PACKET ?? 'complete';
if (!['original', 'complete'].includes(enterPacketMode)) throw Error('Enter packet must be original or complete');
const enterKeyDown = {
	type: 'keyDown',
	key: 'Enter',
	code: 'Enter',
	windowsVirtualKeyCode: 13,
	...(enterPacketMode === 'complete' ? { text: '\r', unmodifiedText: '\r' } : {}),
};
const enterKeyUp = { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 };
const keyboardDiagnostic = {
	argument: enterPacketArgument ?? null,
	environment: 'HUHU_ACTIVITY_ENTER_PACKET',
	requested: process.env.HUHU_ACTIVITY_ENTER_PACKET ?? null,
	mode: enterPacketMode,
	keyDown: enterKeyDown,
	keyUp: enterKeyUp,
};
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.resolve(process.argv[2] || `/tmp/huhu-activity-${Date.now()}`);
if (!directory.startsWith('/tmp/')) throw Error('Evidence directory must be under /tmp');
await fs.mkdir(directory); // A failed run is never overwritten.
await fs.writeFile(
	path.join(directory, 'keyboard-diagnostic.json'),
	JSON.stringify({ utc: new Date().toISOString(), ...keyboardDiagnostic }, null, 2),
);
const started = new Date().toISOString(),
	events = [],
	commands = [],
	hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
let browser,
	connection,
	server,
	stderr,
	exitCode = 2;

async function browserFixture() {
	const h = React.createElement,
		checks = [],
		trace = [],
		resources = [],
		shots = [];
	const record = (kind, detail = {}) => trace.push({ at: performance.now(), kind, ...detail });
	const describeElement = (element) =>
		element
			? {
					tag: element.tagName,
					role: element.getAttribute('role'),
					label: element.getAttribute('aria-label'),
					activityOpen: element.hasAttribute('data-activity-open'),
					sessionId: element.closest('[data-activity-session]')?.dataset.activitySession,
				}
			: null;
	const navigationState = (stage) =>
		record('navigation-state', {
			stage,
			activeElement: describeElement(document.activeElement),
			docFocused: document.hasFocus(),
			visibility: document.visibilityState,
		});
	for (const type of ['keydown', 'keypress', 'keyup', 'click']) {
		const observed = (event) => {
			const target = event.target;
			if (!target?.closest?.('[data-activity-session]')) return;
			const detail = {
				type,
				target: describeElement(target),
				activeElement: describeElement(document.activeElement),
				isTrusted: event.isTrusted,
				defaultPrevented: event.defaultPrevented,
				key: event.key,
				code: event.code,
				charCode: event.charCode,
				keyCode: event.keyCode,
				docFocused: document.hasFocus(),
				visibility: document.visibilityState,
			};
			record('navigation-event-capture', detail);
			queueMicrotask(() =>
				record('navigation-event-after-dispatch', { ...detail, defaultPrevented: event.defaultPrevented }),
			);
		};
		document.addEventListener(type, observed, true);
		resources.push(() => document.removeEventListener(type, observed, true));
	}

	const assert = (value, message, detail) => {
		if (!value) throw Error(message + ' ' + JSON.stringify(detail ?? {}));
	};
	const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	const until = async (condition, message, limit = 4000) => {
		const deadline = performance.now() + limit;
		while (!condition()) {
			assert(performance.now() < deadline, message, { deadline, observedAt: performance.now() });
			await raf();
		}
	};
	const check = async (name, run) => {
		try {
			const detail = await run();
			checks.push({ name, ok: true, detail });
		} catch (error) {
			checks.push({ name, ok: false, error: String(error), stack: error.stack });
		}
	};
	registerMessages(uiMessages);
	registerMessages(messages);
	setLanguage('en');
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
				const child = this.ownerDocument.createElement('div');
				child.className = options.cls || '';
				this.append(child);
				return child;
			},
		},
		toggleClass: {
			configurable: true,
			value(name, enabled) {
				this.classList.toggle(name, enabled);
			},
		},
	});
	const terms = new Map();
	const open = Terminal.prototype.open;
	Terminal.prototype.open = function (element) {
		open.call(this, element);
		const runtimeId = element.closest('[data-terminal-host]')?.dataset.terminalHost;
		terms.set(element, this);
		geometryObservers.get(runtimeId)?.opened(element);
		this.onRender((range) =>
			record('onRender', {
				runtimeId,
				range,
				docVisible: element.ownerDocument.visibilityState,
				docFocused: element.ownerDocument.hasFocus(),
				rect: element.getBoundingClientRect().toJSON(),
			}),
		);
	};
	const install = XtermScreenTarget.prototype.installSnapshot;
	XtermScreenTarget.prototype.installSnapshot = function (snapshot) {
		install.call(this, snapshot);
		record('installed', { installed: snapshot.at });
	};
	function App({ f, owner, visible }) {
		const layout = useSyncExternalStore(f.workspace.store.subscribe, f.workspace.store.getState);
		const managed = useSyncExternalStore(f.workspace.subscribeManaged, f.workspace.getManagedSnapshot);
		const activeTab = layout.tabs[layout.groups.find((group) => group.id === layout.activeGroupId)?.activeTabId];
		useLayoutEffect(() => {
			f.workspace.setVisible(owner, visible && activeTab ? [activeTab.id] : []);
			return () => f.workspace.setVisible(owner, []);
		}, [f, owner, visible, activeTab?.id]);
		useLayoutEffect(() => {
			record('react-commit', {
				fixture: f.name,
				owner: owner.name,
				marks: managed.sessions.flatMap((item) =>
					item.runtime?.activityDetail ? [item.runtime.activityDetail.at] : [],
				),
				visible,
			});
		});
		return h(
			HuhuProviders,
			{ ownerDocument: document, visible },
			h(
				WorkspaceUIContext,
				{ value: owner.context },
				h(
					'div',
					{ className: 'huhu-ui activity-workbench', hidden: !visible, inert: !visible },
					h('div', { className: 'activity-sidebar' }, h(AgentSidebar)),
					h(
						'main',
						{ className: 'activity-terminal' },
						activeTab?.kind === 'terminal'
							? h(TerminalTabView, { tab: activeTab, active: visible, retention: owner.retention })
							: h('p', {}, 'Fixture Space'),
					),
				),
			),
		);
	}
	const geometryObservers = new Map();
	// Observe only the controlled geometry fixture. No scheduling, ownership or native behavior is replaced.
	function observeGeometrySession(session, owners) {
		let callId = 0;
		const pendingLeases = [],
			paneLeases = new Map();
		const clone = (value) => structuredClone(value);
		const leaseData = (view) =>
			view
				? {
						lease: clone(view.lease),
						revision: view.revision,
						visible: view.visible,
						focused: view.focused,
					}
				: null;
		const snapshot = () => {
			// Pinned HUHU private data is read only; no public owner-generation API is invented.
			const screen = session.screen;
			return {
				model: { cols: session.cols, rows: session.rows },
				activity: {
					at: clone(session.getActivitySnapshot().at),
					unreadCompletion: session.getActivitySnapshot().unreadCompletion,
				},
				owner: leaseData(screen?.sizeOwner),
				views: screen?.views ? [...screen.views.values()].map(leaseData) : [],
				activeElement: {
					tag: document.activeElement?.tagName,
					ownerId: document.activeElement?.closest?.('.activity-owner')?.id,
					runtimeId: document.activeElement?.closest?.('[data-terminal-host]')?.dataset.terminalHost,
				},
				docFocused: document.hasFocus(),
				visibility: document.visibilityState,
				panes: owners.map((owner) => {
					const pair = [...terms].find(
						([element]) =>
							owner.element.contains(element) &&
							element.closest('[data-terminal-host]')?.dataset.terminalHost === session.id,
					);
					const term = pair?.[1],
						element = pair?.[0];
					return {
						name: owner.name,
						ownerId: owner.element.id,
						lease: clone(paneLeases.get(owner.element.id)),
						hidden: owner.element.hidden,
						ownerRect: owner.element.getBoundingClientRect().toJSON(),
						viewRect: element?.getBoundingClientRect().toJSON(),
						xtermRect: term?.element?.getBoundingClientRect().toJSON(),
						grid: term ? { cols: term.cols, rows: term.rows } : null,
						textareaActive: !!term?.textarea && term.textarea === document.activeElement,
						completionHint: !!owner.element.querySelector('[data-activity-completion]'),
					};
				}),
			};
		};
		const mark = (phase, detail = {}) => {
			try {
				record('geometry-probe', { phase, ...detail, snapshot: snapshot() });
			} catch (error) {
				record('geometry-probe-observer-error', { phase, error: String(error) });
			}
		};
		for (const method of ['registerView', 'setViewFocused', 'requestViewSize']) {
			const originalMethod = session[method];
			session[method] = function (...args) {
				const id = ++callId;
				mark(method + ':call', { callId: id, args: clone(args) });
				let returned;
				try {
					returned = Reflect.apply(originalMethod, this, args);
				} catch (error) {
					mark(method + ':throw', { callId: id, error: String(error) });
					throw error;
				}
				if (method === 'requestViewSize') {
					mark(method + ':returned-original-promise', { callId: id });
					void returned.then(
						(value) => mark(method + ':fulfilled', { callId: id, result: clone(value) }),
						(error) => mark(method + ':rejected', { callId: id, error: String(error) }),
					);
				} else {
					if (method === 'registerView') pendingLeases.push(returned);
					mark(method + ':return', { callId: id, result: clone(returned) });
				}
				return returned;
			};
		}
		return {
			mark,
			snapshot,
			lease(owner) {
				return paneLeases.get(owner.element.id);
			},
			opened(element) {
				const lease = pendingLeases.shift(),
					ownerId = element.closest('.activity-owner')?.id;
				assert(lease && ownerId, 'geometry lease/open association missing');
				paneLeases.set(ownerId, lease);
			},
		};
	}
	const sameLease = (a, b) => !!a && !!b && ['runtimeId', 'viewId', 'leaseId'].every((key) => a[key] === b[key]);
	const sameGrid = (a, b) => !!a && !!b && a.cols === b.cols && a.rows === b.rows;
	const sameGeometryOwner = (a, b) => !!a && !!b && a.revision === b.revision && sameLease(a.lease, b.lease);
	// Every phase sample must retain the exact lease AND revision. Accepted requests and native
	// calls are paired in their actual FIFO order, not inferred from a final mirrored xterm grid.
	function geometryViolation(samples, expected, sid) {
		const observations = samples.filter((value) => value.kind === 'geometry-probe');
		if (!observations.length) return 'missing-observations';
		if (observations.some((value) => !sameGeometryOwner(value.snapshot?.owner, expected))) return 'owner-changed';
		const accepted = observations.filter(
			(value) => value.phase === 'requestViewSize:fulfilled' && value.result?.status === 'accepted',
		);
		const native = observations.filter((value) => value.phase === 'native-resize-context');
		if (accepted.length !== native.length) return 'accepted-native-count';
		for (let index = 0; index < accepted.length; index++) {
			const result = accepted[index],
				resize = native[index];
			const call = observations.find(
				(value) => value.phase === 'requestViewSize:call' && value.callId === result.callId,
			);
			if (!call || !sameLease(call.args?.[0], expected.lease)) return 'accepted-other-lease';
			if (
				!sameGrid(call.args[1], result.result.geometry) ||
				!sameGrid(resize, result.result.geometry) ||
				resize.sid !== sid ||
				resize.at < call.at ||
				resize.at > result.at ||
				!sameGrid(resize.snapshot.model, result.result.geometry)
			)
				return 'accepted-native-model-mismatch';
		}
		return null;
	}
	const geometryWitness = (f, from, owner, expectedOwner) => {
		const samples = trace.slice(from),
			snapshot = f.geometrySnapshot();
		const pane = snapshot.panes.find((value) => value.ownerId === owner.element.id);
		if (
			!sameGeometryOwner(snapshot.owner, expectedOwner) ||
			!snapshot.owner.visible ||
			!snapshot.owner.focused ||
			!sameLease(pane?.lease, expectedOwner.lease) ||
			!pane.textareaActive ||
			!sameGrid(snapshot.model, pane.grid) ||
			!sameGrid(snapshot.model, f.sizes.at(-1))
		)
			return null;
		for (const result of samples) {
			if (
				result.kind !== 'geometry-probe' ||
				result.phase !== 'requestViewSize:fulfilled' ||
				result.result?.status !== 'accepted' ||
				!sameGrid(result.result.geometry, snapshot.model)
			)
				continue;
			const call = samples.find(
				(value) =>
					value.kind === 'geometry-probe' &&
					value.phase === 'requestViewSize:call' &&
					value.callId === result.callId,
			);
			const native = samples.find(
				(value) =>
					value.kind === 'geometry-probe' &&
					value.phase === 'native-resize-context' &&
					value.at >= call?.at &&
					value.at <= result.at &&
					sameGrid(value, snapshot.model) &&
					sameGeometryOwner(value.snapshot?.owner, expectedOwner),
			);
			if (
				call &&
				native &&
				sameLease(call.args[0], expectedOwner.lease) &&
				sameGeometryOwner(call.snapshot?.owner, expectedOwner) &&
				sameGeometryOwner(result.snapshot?.owner, expectedOwner)
			)
				return { callId: result.callId, snapshot };
		}
		return null;
	};
	let serial = 0;
	async function fixture(name) {
		const files = new Map(),
			inputs = [],
			sizes = [],
			spawns = [],
			notices = [],
			writes = [],
			owners = [];
		let output,
			nextSid = 0,
			termination = 0,
			failWrites = false,
			heldWrite,
			holdNext = false,
			geometryProbe,
			geometrySeenGate;
		const gates = [];
		const storage = {
			exists: async (p) => files.has(p),
			read: async (p) => files.get(p),
			mkdir: async () => {},
			write: async (p, text) => {
				record('disk-start', { fixture: name, path: p });
				writes.push({ path: p, bytes: new TextEncoder().encode(text).length });
				if (holdNext) {
					holdNext = false;
					await new Promise((resolve) => {
						heldWrite = resolve;
						gates.push(resolve);
					});
				}
				if (failWrites) {
					record('disk-failed', { fixture: name, path: p });
					throw Error('deliberate activity fixture disk failure');
				}
				files.set(p, text);
				record('disk-saved', { fixture: name, path: p });
			},
		};
		const canonical = { canonicalPath: '/fixture', dev: '1', ino: String(++serial) },
			vault = { vaultId: `vault-${serial}`, deviceId: 'chrome-fixture', rootPath: '/fixture', root: canonical };
		const spaces = new SpaceService({
			storage,
			instanceId: name,
			report: (error) => {
				notices.push(String(error));
				record('storage-notice', { fixture: name, error: String(error) });
			},
			directories: {
				inspectVault: async () => vault,
				assertVault: async () => {},
				bindVaultDirectory: async (_vault, relativePath) => ({
					kind: 'vault',
					relativePath,
					target: canonical,
				}),
				chooseExternalDirectory: async () => undefined,
				resolveDirectory: async () => ({ cwd: '/fixture' }),
			},
			owners: {
				acquire: async () => ({
					instanceId: name,
					port: 12345,
					lost: new AbortController().signal,
					assertHeld: async () => {},
					close: async () => {},
				}),
			},
		});
		const end = (sid) => {
			output.termination?.(sid, {
				version: 1,
				sequence: ++termination,
				evidence: {
					root: { state: 'exited', code: 0, signal: null },
					cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
					output: 'drained',
				},
			});
			output.exit?.(sid, 0, null);
		};
		const connection = {
			alive: true,
			version: 'controlled-boundary',
			terminalTermination: 1,
			spawnSession: async (sid, options) => {
				spawns.push({ sid, options });
				return 42;
			},
			input: (sid, data) => inputs.push({ sid, data: typeof data === 'string' ? data : [...data] }),
			resize: (sid, cols, rows) => {
				geometryProbe?.mark('native-resize-context', { sid, cols, rows });
				sizes.push({ sid, cols, rows });
				record('native-resize', { fixture: name, sid, cols, rows });
			},
			acknowledge() {},
			reply() {},
			end,
			requestStop: end,
			history: async () => [],
			request: async () => ({}),
		};
		const native = {
			acquire: async (_capability, listeners) => {
				output = listeners;
				return { value: connection, allocateSessionId: () => ++nextSid, release: async () => {} };
			},
		};
		const settings = { ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom', scrollback: 100, fontSize: 14 };
		const sessions = new TerminalSessions({
			native,
			environment: async () => ({}),
			platform: 'linux',
			settings: () => settings,
			colors: () => ({ foreground: '#ddd', background: '#222', cursor: '#fff' }),
		});
		// A real workspace leaf exists before an action captures its display intent.
		// mount('primary') later supplies React to this same connected leaf/container.
		const primaryElement = document.createElement('section');
		primaryElement.id = `${name}-primary`;
		primaryElement.className = 'activity-owner';
		document.querySelector('#mount').append(primaryElement);
		const primaryLeaf = { view: { containerEl: primaryElement } };
		let currentLeaf = primaryLeaf,
			fixtureClosed = false;
		const launch = {
			foreground: () => {
				const leaf = app.workspace.getMostRecentLeaf();
				const element = leaf?.view.containerEl ?? app.workspace.containerEl;
				return captureForegroundIntent({
					container: element,
					document: element.doc,
					window: element.win,
					isCurrent: () => !fixtureClosed && app.workspace.getMostRecentLeaf() === leaf,
					onTargetChange: (listener) => {
						const ref = app.workspace.on('active-leaf-change', listener);
						return () => app.workspace.offref(ref);
					},
				});
			},
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
					title: 'Approval fixture',
					file: 'fixture-agent',
					args: [],
					cwd: options.cwd,
					runtime: options.runtime,
					beforeSpawn: options.beforeSpawn,
				}),
			resume: async () => undefined,
			account: () => '',
			report: (error) => notices.push(String(error)),
		};
		const clock = {
			setTimeout: (fn, ms) => window.setTimeout(fn, ms),
			clearTimeout: (id) => window.clearTimeout(id),
		};
		const workspace = new WorkspaceService(
			createSpaceWorkspaceStore(spaces, clock, (error) => notices.push(String(error))),
			sessions,
			launch,
			() => undefined,
			spaces,
		);
		await workspace.persistence.ready;
		const listeners = new Map();
		const app = {
			workspace: {
				containerEl: document.querySelector('#mount'),
				on: (kind, listener) => {
					const ref = { kind, listener };
					listeners.set(ref, ref);
					return ref;
				},
				offref: (ref) => listeners.delete(ref),
				getMostRecentLeaf: () => currentLeaf,
			},
			vault: { getMarkdownFiles: () => [] },
		};
		const controller = {
			app,
			workspace,
			spaces,
			sessions,
			settings: { get: () => settings, subscribe: () => () => {} },
			vaultPath: () => '/fixture',
			browserHost: () => undefined,
			agentTitle: (id) => id,
			historyStore: {
				refresh: async () => {},
				store: createStore(() => ({ rows: [], loading: false, error: '', warnings: [] })),
			},
		};
		const seen = [],
			attachments = [],
			realSeen = workspace.markManagedSeen.bind(workspace),
			realAttach = workspace.attachManaged.bind(workspace);
		workspace.markManagedSeen = (request, options) => {
			const captured = structuredClone(request);
			const delegate = () => {
				record('seen-start', { fixture: name, request: captured });
				seen.push(captured);
				const result = realSeen(request, options);
				record('seen-memory', {
					fixture: name,
					request: captured,
					activity: sessions.get(request.target.runtimeId)?.getActivitySnapshot(),
				});
				return result.then((value) => {
					record('seen-result', { fixture: name, result: value });
					return value;
				});
			};
			if (name === 'geometry' && geometrySeenGate?.held) {
				const gate = geometrySeenGate;
				gate.pending++;
				geometryProbe.mark('controlled-barrier:seen-delegate-held', {
					request: captured,
					pending: gate.pending,
					signalAborted: options?.signal?.aborted ?? false,
				});
				return gate.ready.then(() => {
					gate.pending--;
					geometryProbe.mark('controlled-barrier:seen-real-delegate', {
						request: captured,
						pending: gate.pending,
						signalAborted: options?.signal?.aborted ?? false,
					});
					return delegate(); // Original request/options; no synthetic acceptance or mark.
				});
			}
			return delegate();
		};
		workspace.attachManaged = (target, options) => {
			attachments.push({ target: structuredClone(target), options: structuredClone(options) });
			record('attach-start', { fixture: name, ...attachments.at(-1) });
			return realAttach(target, options).then((result) => {
				record('attach-result', { fixture: name, result });
				return result;
			});
		};
		const f = {
			name,
			spaces,
			sessions,
			workspace,
			controller,
			seen,
			attachments,
			inputs,
			sizes,
			spawns,
			files,
			notices,
			async create(spaceId, title = name) {
				const result = await workspace.createManaged({ spaceId, kind: 'agent', agentId: 'pi', title });
				assert(result.status === 'created', 'fixture admission failed', result);
				const target = {
					spaceId,
					sessionId: result.session.sessionId,
					runtimeId: result.session.runtime.runtimeId,
				};
				const session = sessions.get(target.runtimeId);
				if (name === 'geometry') {
					geometryProbe = observeGeometrySession(session, owners);
					geometryObservers.set(session.id, geometryProbe);
				}
				return { target, session };
			},
			geometryMark(phase, detail) {
				geometryProbe?.mark(phase, detail);
			},
			geometrySnapshot() {
				return geometryProbe?.snapshot();
			},
			armGeometrySeenBarrier() {
				assert(
					name === 'geometry' && !geometrySeenGate,
					'controlled barrier is restricted to this geometry fixture',
				);
				let open;
				const ready = new Promise((resolve) => {
					open = resolve;
				});
				const gate = {
					ready,
					held: true,
					pending: 0,
					release(reason) {
						if (!gate.held) return;
						gate.held = false;
						geometryProbe.mark('controlled-barrier:seen-gate-released', { reason, pending: gate.pending });
						open();
					},
				};
				geometrySeenGate = gate;
				geometryProbe.mark('controlled-barrier:seen-gate-armed');
				return gate;
			},
			geometryLease(owner) {
				return geometryProbe?.lease(owner);
			},
			source(session, instance = name) {
				return session.bindActivityRuntime().bindSource({
					provider: 'pi',
					kind: 'native-hook',
					adapterRevision: 'controlled-chrome',
					observedVersion: 'fixture',
					lifetime: { kind: 'registration', sourceInstance: instance },
				});
			},
			async feed(session, raw) {
				output.output(session.sid, new TextEncoder().encode(raw));
				await session.whenParsed();
			},
			mount(ownerName = 'primary', visible = true) {
				const element = ownerName === 'primary' ? primaryElement : document.createElement('section');
				element.id = `${name}-${ownerName}`;
				element.className = 'activity-owner';
				document.querySelector('#mount').append(element);
				const leaf = ownerName === 'primary' ? primaryLeaf : { view: { containerEl: element } },
					owner = {
						name: ownerName,
						element,
						leaf,
						root: createRoot(element),
						retention: new HiddenRendererRetention(),
						visible,
					};
				owner.context = {
					controller,
					confirm: async () => false,
					close: (id) => {
						void workspace.close(id, async () => false);
					},
					chrome: {
						context: { app, leaf, contentEl: element, containerEl: element, close() {} },
						menu: undefined,
						setMenu() {},
					},
				};
				owners.push(owner);
				f.render(owner, visible);
				return owner;
			},
			render(owner, visible) {
				owner.visible = visible;
				owner.element.hidden = !visible;
				flushSync(() => owner.root.render(h(App, { f, owner, visible })));
			},
			current(owner) {
				currentLeaf = owner?.leaf;
				for (const ref of listeners.values()) if (ref.kind === 'active-leaf-change') ref.listener(currentLeaf);
			},
			terminal(owner, runtimeId) {
				return [...terms].find(
					([element]) =>
						owner.element.contains(element) &&
						element.closest('[data-terminal-host]')?.dataset.terminalHost === runtimeId,
				)?.[1];
			},
			fail(on) {
				failWrites = on;
			},
			hold() {
				holdNext = true;
			},
			get held() {
				return !!heldWrite;
			},
			release() {
				const release = heldWrite;
				heldWrite = undefined;
				release?.();
			},
			async close() {
				fixtureClosed = true;
				geometrySeenGate?.release('fixture-close');
				failWrites = false;
				gates.forEach((resolve) => resolve());
				for (const owner of owners) {
					owner.root.unmount();
					owner.element.remove();
				}
				primaryElement.remove();
				await workspace.dispose();
				await sessions.dispose();
			},
		};
		resources.push(() => f.close());
		return f;
	}
	const pane = (owner, runtimeId) => owner.element.querySelector(`[data-terminal-host="${runtimeId}"]`);
	const ready = async (f, owner, session) => {
		owner.element.scrollIntoView({ block: 'start' });
		await until(() => {
			const terminal = f.terminal(owner, session.id);
			return (
				terminal &&
				!terminal._core._renderService._isPaused &&
				document.hasFocus() &&
				pane(owner, session.id)?.getBoundingClientRect().height > 0
			);
		}, 'visible renderer was not ready');
		await raf();
	};
	async function capture(name, owner, metadata) {
		const rect = owner.element.getBoundingClientRect();
		shots.push({
			name,
			rect: { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 },
			...(metadata ? { metadata } : {}),
		});
		return owner.element.id;
	}
	let navigation, geometry, failure, blurFixture;
	window.activityProbe = {
		checks,
		trace,
		shots,
		async prepareNavigation() {
			const f = await fixture('pending'),
				a = await f.spaces.create({ name: 'Current', relativePath: '' }),
				b = await f.spaces.create({ name: 'Other Space', relativePath: '' });
			await f.workspace.selectSpace(b.id);
			const target = await f.create(b.id, 'Needs manual approval');
			await f.workspace.attachManaged(target.target, { expectedRuntimeId: target.target.runtimeId, focus: true });
			await f.workspace.splitPane(target.session.id, 'right');
			const source = f.source(target.session);
			assert(source, 'fixture source rejected');
			source.observe({
				deliveryId: 'block',
				sourceSequence: 1,
				event: 'prompt_start',
				state: 'permission',
				blocking: { state: 'blocked', reason: 'permission', blockId: 'approval-1' },
			});
			source.invalidate('expired');
			await f.workspace.selectSpace(a.id);
			const owner = f.mount();
			await until(() => owner.element.querySelector('[data-activity-session]'), 'pending entry missing');
			navigation = { f, owner, target, spawns: f.spawns.length, inputs: f.inputs.length };
			await capture('pending', owner);
			const button = owner.element.querySelector('[data-activity-session] > button');
			button.scrollIntoView({ block: 'center' });
			button.focus();
			assert(f.seen.length === 0, 'sidebar alone marked activity seen');
			navigationState('prepared-first-focus');
			return { label: button.getAttribute('aria-label'), target: target.target };
		},
		navigationState,
		async navigationDone() {
			await check('all-Vault-historical-blocked-keyboard-navigation-exact-existing-split', async () => {
				const { f, owner, target, spawns, inputs } = navigation;
				await until(
					() => f.workspace.active?.focusedSessionId === target.session.id,
					'did not locate exact split runtime',
				);
				await ready(f, owner, target.session);
				assert(
					f.spawns.length === spawns && f.inputs.length === inputs && f.seen.length === 0,
					'navigation spawned, typed or marked seen',
					{ spawns: f.spawns.length, inputs: f.inputs.length, seen: f.seen },
				);
				assert(
					owner.element.textContent.includes(t('agent.activityEvidence.historicalBlocked')),
					'unknown historical block disappeared',
				);
				assert(
					f.attachments.at(-1).options.expectedRuntimeId === target.session.id,
					'navigation lost stable runtime',
				);
				await capture('focused-blocked', owner);
				await f.feed(target.session, '\x1b[?1h');
				const terminal = f.terminal(owner, target.session.id);
				const rect = terminal.element.querySelector('.xterm-screen').getBoundingClientRect();
				return { target: target.target, spawns, inputs, point: { x: rect.left + 12, y: rect.top + 12 } };
			});
			return checks.at(-1);
		},
		async layout() {
			await check('narrow-production-attention-entry-remains-readable-and-operable', async () => {
				const { owner } = navigation,
					button = owner.element.querySelector('[data-activity-session] > button'),
					rect = owner.element.getBoundingClientRect();
				assert(
					rect.right <= innerWidth && owner.element.scrollWidth <= owner.element.clientWidth + 1,
					'narrow workbench overflow',
					{ rect: rect.toJSON(), scrollWidth: owner.element.scrollWidth },
				);
				assert(
					button.getBoundingClientRect().height >= 32 && button.getAttribute('aria-label'),
					'attention entry lost target size/name',
				);
				await capture('narrow', owner);
				return { width: innerWidth, rect: rect.toJSON() };
			});
		},
		async prepareBlur() {
			const f = await fixture('blur'),
				space = await f.spaces.create({ name: 'Blur', relativePath: '' });
			await f.workspace.selectSpace(space.id);
			const { target, session } = await f.create(space.id);
			await f.workspace.attachManaged(target, { expectedRuntimeId: target.runtimeId, focus: true });
			const owner = f.mount();
			await ready(f, owner, session);
			blurFixture = { f, owner, session, source: f.source(session) };
		},
		async blurred() {
			await check('actual-browser-document-blur-does-not-acknowledge', async () => {
				const { f, source } = blurFixture;
				assert(
					!document.hasFocus() || document.visibilityState !== 'visible',
					'Chrome did not actually blur the document',
				);
				flushSync(() =>
					source.observe({
						deliveryId: 'blurred',
						sourceSequence: 1,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				await Promise.resolve();
				assert(f.seen.length === 0, 'blurred document acknowledged activity');
				return { focused: document.hasFocus(), visibility: document.visibilityState };
			});
		},
		async resumed() {
			await check('resumed-current-document-paints-before-acknowledging', async () => {
				const { f, owner, session } = blurFixture;
				await ready(f, owner, session);
				await until(() => f.seen.length === 1, 'resumed document did not acknowledge');
				return { seen: f.seen };
			});
		},
		async inputDone(before) {
			await check('trusted-key-through-production-TabView-and-original-terminal', async () => {
				const { f, target } = navigation;
				const input = f.inputs.slice(before);
				assert(
					input.some((value) => value.sid === target.session.sid && value.data === '\x1bOA'),
					'application-cursor key missing',
					input,
				);
				return { input };
			});
		},
		async paintRace() {
			await check('actual-public-render-captured-N-preserves-N-plus-one', async () => {
				const f = await fixture('paint'),
					space = await f.spaces.create({ name: 'Paint', relativePath: '' });
				await f.workspace.selectSpace(space.id);
				const { target, session } = await f.create(space.id);
				await f.workspace.attachManaged(target, { expectedRuntimeId: target.runtimeId, focus: true });
				const owner = f.mount();
				await ready(f, owner, session);
				const source = f.source(session);
				await f.feed(session, '\x1b[?2026h');
				const terminal = f.terminal(owner, session.id);
				assert(terminal.modes.synchronizedOutputMode, 'synchronized-output barrier missing');
				flushSync(() =>
					source.observe({
						deliveryId: 'one',
						sourceSequence: 1,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				const n = { ...session.getActivitySnapshot().at };
				flushSync(() =>
					source.observe({
						deliveryId: 'two',
						sourceSequence: 2,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				const newer = { ...session.getActivitySnapshot().at };
				assert(f.seen.length === 0, 'ready/commit was falsely accepted as paint', f.seen);
				await f.feed(session, '\x1b[?2026l');
				await until(
					() => f.seen.some((request) => request.at.activitySequence === newer.activitySequence),
					'both real render marks did not arrive',
				);
				assert(f.seen[0].at.activitySequence === n.activitySequence, 'old render acknowledged N+1', {
					seen: f.seen,
					n,
					newer,
				});
				const memory = trace.find(
					(value) =>
						value.kind === 'seen-memory' &&
						value.fixture === f.name &&
						value.request.at.activitySequence === n.activitySequence,
				);
				assert(
					memory.activity.unreadCompletion && memory.activity.seenThrough === n.activitySequence,
					'N cleared the newer completion',
					memory,
				);
				const firstSeen = trace.findIndex((value) => value.kind === 'seen-start' && value.fixture === f.name);
				assert(
					trace
						.slice(0, firstSeen)
						.some((value) => value.kind === 'onRender' && value.runtimeId === session.id),
					'seen preceded public rendering',
				);
				const count = f.seen.length;
				terminal.refresh(0, terminal.rows - 1);
				await raf();
				assert(f.seen.length === count, 'ordinary repaint flooded seen');
				return { n, newer, seen: f.seen, memory: memory.activity };
			});
		},
		async hiddenAndDispose() {
			await check('hidden-offscreen-noncurrent-leaf-two-observers-and-dispose', async () => {
				const f = await fixture('visibility'),
					space = await f.spaces.create({ name: 'Visibility', relativePath: '' });
				await f.workspace.selectSpace(space.id);
				const { target, session } = await f.create(space.id);
				await f.workspace.attachManaged(target, { expectedRuntimeId: target.runtimeId, focus: true });
				const owner = f.mount(),
					second = f.mount('second');
				await ready(f, owner, session);
				f.current(owner);
				f.render(second, false);
				f.render(owner, false);
				const source = f.source(session);
				flushSync(() =>
					source.observe({
						deliveryId: 'hidden',
						sourceSequence: 1,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				await raf();
				assert(f.seen.length === 0, 'hidden observer marked seen');
				f.render(owner, true);
				owner.element.style.transform = 'translateY(-10000px)';
				await until(
					() => f.terminal(owner, session.id)?._core._renderService._isPaused,
					'offscreen renderer did not pause',
				);
				await raf();
				assert(f.seen.length === 0, 'offscreen observer marked seen');
				f.current(second);
				owner.element.style.transform = '';
				await ready(f, owner, session);
				await raf();
				assert(f.seen.length === 0, 'noncurrent leaf marked seen');
				f.current(owner);
				await until(() => f.seen.length === 1, 'visible current observer did not acknowledge');
				f.render(owner, false);
				flushSync(() =>
					source.observe({
						deliveryId: 'disposed',
						sourceSequence: 2,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				const before = f.seen.length;
				owner.root.unmount();
				owner.element.remove();
				await raf();
				assert(f.seen.length === before, 'disposed observer submitted a late mark');
				return {
					seen: f.seen,
					current: session.getActivitySnapshot(),
					limit: 'Real doc focus/IO and controlled leaf host; no OS foreground proof.',
				};
			});
		},
		async saveFailure() {
			await check('controlled-storage-failure-remains-visible-and-explicit-retry-only', async () => {
				const f = await fixture('save-error'),
					space = await f.spaces.create({ name: 'Save error', relativePath: '' });
				await f.workspace.selectSpace(space.id);
				const { target, session } = await f.create(space.id);
				await f.workspace.attachManaged(target, { expectedRuntimeId: target.runtimeId, focus: true });
				const owner = f.mount();
				await ready(f, owner, session);
				await f.spaces.flush();
				f.fail(true);
				const source = f.source(session);
				flushSync(() =>
					source.observe({
						deliveryId: 'failed-save',
						sourceSequence: 1,
						event: 'agent_settled',
						state: 'done',
						completion: 'turn-finished',
					}),
				);
				await until(
					() => owner.element.textContent.includes(t('agent.activityEvidence.seenFailed')),
					'failed save was hidden',
				);
				const before = f.seen.length;
				await raf();
				await raf();
				assert(f.seen.length === before, 'failed save retried itself');
				await capture('save-error', owner);
				failure = { f, owner, before };
				return { failedCalls: before, errors: f.notices };
			});
		},
		async retrySave() {
			await check('explicit-save-retry-repaints-without-input-replay', async () => {
				const { f, owner, before } = failure;
				f.fail(false);
				const retry = [...owner.element.querySelectorAll('button')].find(
					(button) => button.textContent.trim() === t('ui.retry'),
				);
				assert(retry, 'explicit save retry missing');
				retry.click();
				await until(
					() => !owner.element.textContent.includes(t('agent.activityEvidence.seenFailed')),
					'explicit save did not settle',
				);
				assert(f.inputs.length === 0, 'seen retry replayed terminal input');
				return { failedCalls: before, finalCalls: f.seen.length };
			});
		},
		async readonly() {
			await check('readonly-original-hint-React-presentation-zero-spawn', async () => {
				const f = await fixture('readonly'),
					space = await f.spaces.create({ name: 'Readonly', relativePath: '' });
				await f.workspace.selectSpace(space.id);
				const { target, session } = await f.create(space.id);
				const source = f.source(session);
				source.observe({
					deliveryId: 'prior-completion',
					sourceSequence: 1,
					event: 'agent_settled',
					state: 'done',
					completion: 'turn-finished',
				});
				await f.spaces.flush();
				await f.sessions.remove(session.id);
				const originalHint = structuredClone(f.workspace.getManaged(target)?.completionHint);
				record('readonly-after-public-remove', {
					fixture: f.name,
					target,
					sessionPresent: !!f.sessions.get(session.id),
					summary: f.workspace.getManaged(target),
				});
				assert(!f.sessions.get(session.id), 'public remove retained the Session');
				const before = f.spawns.length;
				const opened = await f.workspace.openManagedRecord(target);
				assert(opened.status === 'opened', 'record placeholder did not open', opened);
				const owner = f.mount();
				owner.element.scrollIntoView({ block: 'start' });
				await until(() => f.seen.length === 1, 'rendered original hint was not acknowledged');
				assert(
					!f.sessions.get(session.id) && f.spawns.length === before && !owner.element.querySelector('.xterm'),
					'readonly hint minted a runtime',
				);
				assert(f.seen[0].target.runtimeId === target.runtimeId, 'restored hint changed generation');
				await capture('readonly-original-hint', owner, {
					target: structuredClone(target),
					originalHint,
					renderedRuntimeId: owner.element.querySelector('[data-completion-hint]')?.dataset.completionHint,
					seen: structuredClone(f.seen[0]),
				});
				return { seen: f.seen, spawns: before };
			});
		},
		async prepareGeometry() {
			const f = await fixture('geometry'),
				space = await f.spaces.create({ name: 'Geometry', relativePath: '' });
			await f.workspace.selectSpace(space.id);
			const { target, session } = await f.create(space.id);
			await f.workspace.attachManaged(target, { expectedRuntimeId: target.runtimeId, focus: true });
			const owner = f.mount(),
				follower = f.mount('follower');
			follower.element.style.width = '700px';
			f.current(owner);
			await ready(f, owner, session);
			const terminal = f.terminal(owner, session.id),
				rect = terminal.element.querySelector('.xterm-screen').getBoundingClientRect();
			geometry = { f, owner, follower, target, session, source: f.source(session) };
			return { x: rect.left + 12, y: rect.top + 12 };
		},
		async geometryDone() {
			await check('activity-and-seen-do-not-transfer-explicit-size-owner', async () => {
				const { f, owner, follower, session, source } = geometry;
				let baseline;
				await until(() => {
					const expected = f.geometrySnapshot().owner;
					baseline = geometryWitness(f, 0, owner, expected);
					return baseline && !baseline.snapshot.activity.unreadCompletion;
				}, 'explicit owner fit lacks actual accepted/native/model baseline');
				const expected = structuredClone(baseline.snapshot.owner),
					baselinePane = baseline.snapshot.panes.find((value) => value.name === 'primary'),
					from = trace.length,
					gate = f.armGeometrySeenBarrier();
				f.geometryMark('baseline-ready', { expected, callId: baseline.callId });
				try {
					// Controlled timing only: hold the original seen delegate until the hint's
					// real owner fit is accepted. The original request/options/authority are retained.
					const hintFrom = trace.length;
					flushSync(() =>
						source.observe({
							deliveryId: 'geometry-done',
							sourceSequence: 1,
							event: 'agent_settled',
							state: 'done',
							completion: 'turn-finished',
						}),
					);
					let hint;
					await until(() => {
						hint = geometryWitness(f, hintFrom, owner, expected);
						const pane = hint?.snapshot.panes.find((value) => value.name === 'primary');
						return (
							gate.pending > 0 &&
							hint &&
							pane.completionHint &&
							hint.snapshot.activity.unreadCompletion &&
							pane.viewRect.height < baselinePane.viewRect.height
						);
					}, 'completion hint lacks same-owner accepted/native/model fit');
					f.geometryMark('hint-fit-accepted', { callId: hint.callId });
					const returnFrom = trace.length;
					gate.release('real-hint-fit-accepted');
					await until(() => f.seen.length === 1, 'primary observer did not acknowledge');
					let restored;
					await until(() => {
						restored = geometryWitness(f, returnFrom, owner, expected);
						const pane = restored?.snapshot.panes.find((value) => value.name === 'primary');
						return (
							restored &&
							!pane.completionHint &&
							!restored.snapshot.activity.unreadCompletion &&
							pane.viewRect.height === baselinePane.viewRect.height
						);
					}, 'seen completion lacks same-owner accepted/native/model return fit');
					f.geometryMark('seen-fit-accepted', { callId: restored.callId });
					assert(
						geometryViolation(trace.slice(from), expected, session.sid) === null,
						'activity/seen changed owner or accepted/native/model mapping',
						{ expected, samples: trace.slice(from) },
					);

					// Retain the actual follower object issued at mount, never a cloned or newly registered lease.
					const followerLease = f.geometryLease(follower),
						primaryLease = f.geometryLease(owner),
						before = f.geometrySnapshot(),
						nativeBefore = f.sizes.length,
						requested = { cols: before.model.cols - 1, rows: before.model.rows };
					assert(
						followerLease && !sameLease(followerLease, expected.lease),
						'original follower lease missing',
					);
					const rejected = await session.requestViewSize(followerLease, requested);
					await session.whenParsed();
					const after = f.geometrySnapshot();
					assert(
						rejected.status === 'rejected' &&
							rejected.reason === 'not-owner' &&
							f.sizes.length === nativeBefore &&
							sameGrid(before.model, after.model) &&
							sameGeometryOwner(after.owner, expected),
						'follower request changed native/model or ownership',
						{ rejected, before, after },
					);
					assert(
						geometryViolation(trace.slice(from), expected, session.sid) === null,
						'follower rejection changed owner mapping',
					);
					await capture('geometry', owner);

					// A real public ownership transfer is the checker negative, after the business assertion.
					// Restore only these controlled resource calls; no DOM focus, input or seen is synthesized.
					let transfer, detected;
					try {
						assert(
							session.setViewFocused(followerLease, true),
							'controlled follower transfer was not real',
						);
						transfer = await session.requestViewSize(followerLease, requested);
						f.geometryMark('controlled-real-owner-transfer', { transfer });
						detected = geometryViolation(trace.slice(from), expected, session.sid);
						assert(
							transfer.status === 'accepted' &&
								!sameGeometryOwner(f.geometrySnapshot().owner, expected) &&
								detected === 'owner-changed',
							'checker missed actual ownership transfer',
							{ transfer, detected },
						);
					} finally {
						session.setViewFocused(primaryLease, true);
						await session.requestViewSize(primaryLease, before.model);
					}
					assert(
						!trace.some((value) => value.kind === 'geometry-probe-observer-error'),
						'geometry observation failed',
					);
					return {
						baseline,
						hint,
						restored,
						sizes: f.sizes,
						seen: f.seen,
						rejected,
						transfer,
						detected,
						controlledTiming:
							'Original seen delegate held until actual hint fit; finally released. Real follower ownership transfer is checker negative.',
					};
				} finally {
					gate.release('geometry-check-finally');
				}
			});
		},
		async finish() {
			for (const close of resources.reverse()) await close();
			return {
				ok: checks.every((value) => value.ok),
				checks,
				trace,
				shots,
				userAgent: navigator.userAgent,
				limitation:
					'Local real Chrome with production components/services and controlled Obsidian/native/provider/Map TextStorage boundaries. Storage rejection is not real disk I/O. No real Obsidian, Provider, OS foreground or OS IME acceptance; blank terminal panes without Provider output do not prove terminal content correctness.',
			};
		},
	};
	window.activityReady = true;
}

function connect(url) {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url),
			pending = new Map();
		let serial = 0;
		socket.addEventListener('open', () =>
			resolve({
				send(method, params = {}) {
					return new Promise((yes, no) => {
						const id = ++serial;
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
				const p = pending.get(value.id);
				if (p) {
					pending.delete(value.id);
					value.error ? p.no(Error(JSON.stringify(value.error))) : p.yes(value.result);
				}
			} else events.push(value);
		});
	});
}
try {
	const imports = `import React,{useLayoutEffect,useSyncExternalStore} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {createStore} from 'zustand/vanilla';import {Terminal} from '@xterm/xterm';import {XtermScreenTarget} from './src/modules/agent/ui/terminal/terminal-screen-xterm';import {TerminalTabView} from './src/modules/agent/ui/terminal/TerminalTabView';import {AgentSidebar} from './src/modules/agent/ui/sidebar/AgentSidebar';import {WorkspaceUIContext} from './src/modules/agent/ui/workspace/workspace-context';import {HuhuProviders} from './src/ui/react/providers';import {HiddenRendererRetention} from './src/modules/agent/ui/terminal/hidden-renderer-retention';import {WorkspaceService} from './src/modules/agent/services/workspace-service';import {captureForegroundIntent} from './src/modules/agent/services/launch/foreground-intent';import {TerminalSessions} from './src/modules/agent/services/terminal/sessions';import {SpaceService} from './src/modules/agent/services/spaces/space-service';import {createSpaceWorkspaceStore} from './src/modules/agent/services/workspace-store';import {DEFAULT_TERMINAL_SETTINGS} from './src/modules/agent/core/terminal/settings';import {registerMessages,setLanguage,t} from './src/shared/i18n';import {messages} from './src/modules/agent/i18n';import {messages as uiMessages} from './src/shared/i18n/lazy/ui';`;
	const entry =
		imports +
		'\n(' +
		browserFixture.toString() +
		')().catch(error=>{console.error(error);window.activityFatal=String(error)+error.stack;});';
	await fs.writeFile(path.join(directory, 'entry.js'), entry);
	const bundled = await build({
		stdin: { contents: entry, resolveDir: root, sourcefile: 'activity-probe-entry.js' },
		bundle: true,
		platform: 'browser',
		format: 'iife',
		target: 'chrome120',
		write: false,
		metafile: true,
		loader: { '.svg': 'text', '.md': 'text' },
		plugins: [
			{
				name: 'controlled-desktop-boundaries',
				setup(builder) {
					builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'boundary' }));
					builder.onResolve({ filter: /platform\/desktop\/files$/ }, () => ({
						path: 'files',
						namespace: 'boundary',
					}));
					builder.onLoad({ filter: /.*/, namespace: 'boundary' }, (args) => ({
						contents:
							args.path === 'obsidian'
								? `export const Platform={isWin:false,isMacOS:false,isMobile:false,isDesktopApp:true};export class Notice{constructor(message){window.notices??=[];window.notices.push(message)}};export class TFile{};export class TFolder{};export class Component{};export class FuzzySuggestModal{constructor(app){this.app=app}open(){throw Error('Obsidian material picker is outside this fixture')}};export class Menu{};export const normalizePath=path=>path;export const setIcon=(element,name)=>element.setAttribute('data-obsidian-icon',name);export const requestUrl=()=>{throw Error('Provider network is outside this fixture')};`
								: 'export const droppedFilePath=()=>undefined;export const openPath=async()=>{};export const resolveReference=async()=>null;export const vaultFilePath=(vault,path)=>vault+"/"+path;',
					}));
				},
			},
		],
	});
	await fs.writeFile(path.join(directory, 'fixture.js'), bundled.outputFiles[0].contents);
	const sourceFiles = [
		...new Set([
			fileURLToPath(import.meta.url),
			...Object.keys(bundled.metafile.inputs)
				.filter((p) => !p.startsWith('boundary:') && p !== 'activity-probe-entry.js')
				.map((p) => path.resolve(root, p)),
			path.join(root, 'package.json'),
			path.join(root, 'pnpm-lock.yaml'),
			path.join(root, 'styles.css'),
			path.join(root, 'node_modules/@xterm/xterm/css/xterm.css'),
		]),
	];
	const sources = [];
	for (const source of sourceFiles) {
		const bytes = await fs.readFile(source),
			relative = path.relative(root, source),
			copy = path.join(directory, 'source', relative);
		await fs.mkdir(path.dirname(copy), { recursive: true });
		await fs.writeFile(copy, bytes);
		sources.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
	}
	await fs.writeFile(
		path.join(directory, 'source.json'),
		JSON.stringify(
			{
				utc: new Date().toISOString(),
				sources,
				boundaries: [
					'Obsidian app/leaf/doc host and SDK',
					'native capability/transport and synthetic provider observations',
					'TextStorage and directory/writer lease',
				],
				productionNotStubbed: [
					'AgentSidebar',
					'TerminalTabView',
					'TerminalHost',
					'WorkspaceService.attachManaged',
					'WorkspaceService.markManagedSeen',
					'captureForegroundIntent',
					'SpaceService',
					'JsonStore',
					'TerminalSessions',
					'TerminalSession',
					'TerminalPresentation',
					'XtermScreenTarget',
					'TerminalView',
					'xterm',
					'React',
				],
			},
			null,
			2,
		),
	);
	const styles = await fs.readFile(path.join(root, 'styles.css')),
		xtermCss = await fs.readFile(path.join(root, 'node_modules/@xterm/xterm/css/xterm.css'));
	const html =
		'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/xterm.css"><style>body{margin:0;background:#222;color:#ddd;font:14px sans-serif;--background-primary:#222;--background-secondary:#292929;--text-normal:#ddd;--text-muted:#bbb;--text-selection:rgba(100,150,220,.5)}.activity-owner{width:min(1160px,calc(100vw - 16px));height:720px;margin:8px}.activity-workbench{display:flex;height:100%;min-width:0}.activity-sidebar{width:280px;min-width:0;flex:none}.activity-terminal{position:relative;min-width:0;flex:1;min-height:0}.huhu-terminal-view.is-hidden{display:none}#status{position:fixed;right:8px;bottom:0;pointer-events:none}</style></head><body><div id="mount"></div><pre id="status"></pre><script src="/fixture.js"></script></body></html>';
	await fs.writeFile(path.join(directory, 'index.html'), html);
	server = createServer((request, response) => {
		if (request.url === '/fixture.js') {
			response.setHeader('Content-Type', 'application/javascript');
			response.end(bundled.outputFiles[0].contents);
		} else if (request.url === '/styles.css') {
			response.setHeader('Content-Type', 'text/css');
			response.end(styles);
		} else if (request.url === '/xterm.css') {
			response.setHeader('Content-Type', 'text/css');
			response.end(xtermCss);
		} else if (request.url === '/') {
			response.setHeader('Content-Type', 'text/html');
			response.end(html);
		} else {
			response.statusCode = 404;
			response.end();
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const url = `http://127.0.0.1:${server.address().port}/`,
		chrome = process.env.HUHU_CHROME || '/usr/bin/google-chrome';
	const args = [
		'--headless=new',
		'--no-sandbox',
		'--disable-background-networking',
		'--disable-component-update',
		'--disable-sync',
		'--no-first-run',
		'--no-default-browser-check',
		'--remote-debugging-address=127.0.0.1',
		'--remote-debugging-port=0',
		'--window-size=1200,900',
		'--user-data-dir=' + path.join(directory, 'profile'),
		url,
	];
	commands.push({ executable: chrome, args, utc: new Date().toISOString() });
	stderr = await fs.open(path.join(directory, 'chrome.stderr.log'), 'w');
	browser = spawn(chrome, args, { stdio: ['ignore', 'ignore', stderr.fd] });
	let port;
	for (let i = 0; i < 100; i++) {
		try {
			port = (await fs.readFile(path.join(directory, 'profile', 'DevToolsActivePort'), 'utf8')).split('\n')[0];
			break;
		} catch {
			await delay(50);
		}
	}
	if (!port) throw Error('Chrome startup timeout');
	const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(),
		tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
	connection = await connect(tabs.find((tab) => tab.type === 'page' && tab.url.startsWith(url)).webSocketDebuggerUrl);
	await connection.send('Runtime.enable');
	await connection.send('Log.enable');
	await connection.send('Page.enable');
	await connection.send('Page.bringToFront');
	const evaluate = async (expression) => {
		const result = await connection.send('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true,
			userGesture: true,
		});
		if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
		return result.result.value;
	};
	for (let i = 0; i < 200; i++) {
		if (await evaluate('window.activityReady || window.activityFatal')) break;
		await delay(50);
	}
	const fatal = await evaluate('window.activityFatal');
	if (fatal) throw Error(fatal);
	if (!(await evaluate('window.activityReady'))) throw Error('Activity fixture readiness deadline');
	let captured = 0;
	const capture = async () => {
		const list = await evaluate('activityProbe.shots');
		for (const shot of list.slice(captured)) {
			const image = await connection.send('Page.captureScreenshot', {
				format: 'png',
				captureBeyondViewport: true,
				clip: shot.rect,
			});
			const filename = `pane-${shot.name}.png`;
			await fs.writeFile(path.join(directory, filename), Buffer.from(image.data, 'base64'));
			shot.file = filename;
			shot.sha256 = hash(Buffer.from(image.data, 'base64'));
			await fs.writeFile(path.join(directory, `pane-${shot.name}.json`), JSON.stringify(shot, null, 2));
		}
		captured = list.length;
	};
	await evaluate('activityProbe.prepareNavigation()');
	await capture();
	await evaluate("activityProbe.navigationState('after-screenshot-before-packet')");
	commands.push({ operation: 'navigation-enter', utc: new Date().toISOString(), ...keyboardDiagnostic });
	await connection.send('Input.dispatchKeyEvent', enterKeyDown);
	await connection.send('Input.dispatchKeyEvent', enterKeyUp);
	await evaluate("activityProbe.navigationState('after-packet')");
	const navigation = await evaluate('activityProbe.navigationDone()');
	await capture();
	const mouse = async (point) => {
		await connection.send('Input.dispatchMouseEvent', {
			type: 'mousePressed',
			x: point.x,
			y: point.y,
			button: 'left',
			buttons: 1,
			clickCount: 1,
		});
		await connection.send('Input.dispatchMouseEvent', {
			type: 'mouseReleased',
			x: point.x,
			y: point.y,
			button: 'left',
			buttons: 0,
			clickCount: 1,
		});
	};
	if (navigation.ok) {
		await mouse(navigation.detail.point);
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'ArrowUp',
			code: 'ArrowUp',
			windowsVirtualKeyCode: 38,
		});
		await connection.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'ArrowUp',
			code: 'ArrowUp',
			windowsVirtualKeyCode: 38,
		});
		await evaluate(`activityProbe.inputDone(${navigation.detail.inputs})`);
	}
	await connection.send('Emulation.setDeviceMetricsOverride', {
		width: 800,
		height: 900,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await evaluate('activityProbe.layout()');
	await capture();
	await connection.send('Emulation.clearDeviceMetricsOverride');
	await evaluate('activityProbe.prepareBlur()');
	const other = await connection.send('Target.createTarget', { url: 'about:blank' });
	await connection.send('Target.activateTarget', { targetId: other.targetId });
	await evaluate('activityProbe.blurred()');
	await connection.send('Target.activateTarget', {
		targetId: tabs.find((tab) => tab.type === 'page' && tab.url.startsWith(url)).id,
	});
	await connection.send('Page.bringToFront');
	await evaluate('activityProbe.resumed()');
	await connection.send('Target.closeTarget', { targetId: other.targetId });
	for (const method of ['paintRace', 'hiddenAndDispose', 'saveFailure', 'retrySave', 'readonly']) {
		await evaluate(`activityProbe.${method}()`);
		await capture();
		await fs.writeFile(
			path.join(directory, 'partial.json'),
			JSON.stringify(await evaluate('({checks:activityProbe.checks,trace:activityProbe.trace})'), null, 2),
		);
	}
	const point = await evaluate('activityProbe.prepareGeometry()');
	await mouse(point);
	await evaluate('activityProbe.geometryDone()');
	await capture();
	const result = await evaluate('activityProbe.finish()');
	await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(result, null, 2));
	const unhandled = events.filter(
		(value) =>
			value.method === 'Runtime.exceptionThrown' ||
			(value.method === 'Runtime.consoleAPICalled' && value.params.type === 'error'),
	);
	result.unhandledBrowserEvents = unhandled;
	exitCode = result.ok && unhandled.length === 0 ? 0 : 1;
	await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(result, null, 2));
	const drift = [];
	for (const source of sources) {
		if (hash(await fs.readFile(path.join(root, source.path))) !== source.sha256) drift.push(source.path);
	}
	if (drift.length) exitCode = 126;
	await fs.writeFile(
		path.join(directory, 'manifest.json'),
		JSON.stringify(
			{
				started,
				finished: new Date().toISOString(),
				argv: process.argv,
				keyboardDiagnostic,
				commands,
				version,
				chromeVersion: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim(),
				nodeVersion: process.version,
				exitCode,
				changedDuringRun: drift,
				noRealObsidianOrProviderAcceptance: true,
			},
			null,
			2,
		),
	);
	console.log(
		JSON.stringify(
			{
				directory,
				exitCode,
				checks: result.checks.length,
				failures: result.checks.filter((value) => !value.ok),
				drift,
			},
			null,
			2,
		),
	);
} catch (error) {
	await fs.writeFile(
		path.join(directory, 'fatal.json'),
		JSON.stringify(
			{ error: String(error), stack: error.stack, utc: new Date().toISOString(), commands, keyboardDiagnostic },
			null,
			2,
		),
	);
	console.error(error);
	if (connection) {
		try {
			const state = await connection.send('Runtime.evaluate', {
				expression: 'window.activityProbe&&({checks:activityProbe.checks,trace:activityProbe.trace})',
				returnByValue: true,
			});
			await fs.writeFile(
				path.join(directory, 'failed-partial.json'),
				JSON.stringify(state.result.value, null, 2),
			);
		} catch {}
	}
} finally {
	await fs.writeFile(path.join(directory, 'console.json'), JSON.stringify(events, null, 2));
	connection?.close();
	if (browser && browser.exitCode === null) {
		browser.kill('SIGTERM');
		await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(3000)]);
	}
	await stderr?.close();
	if (server) {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	}
	process.exitCode = exitCode;
}

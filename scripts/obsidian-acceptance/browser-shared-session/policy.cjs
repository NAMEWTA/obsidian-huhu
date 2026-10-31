'use strict';

// P0 experiment only: not imported by the plugin or exposed to an Agent.
// Design reference (no upstream source copied): hello-halo browser-host/manager.ts
// at 476291ca8380a9540ffde1aa82ee098456169a9f. See docs/plans/browser-38.md.
// All executable source is fixed. Only synthetic fixture data crosses this API.
const { randomUUID } = require('node:crypto');

function fail(code) {
	const error = new Error(code);
	error.code = code;
	throw error;
}

function createProbe(electron, config) {
	if (!/^[a-f0-9-]{36}$/.test(config.runId)) fail('invalid_probe_namespace');
	const origin = new URL(config.origin);
	if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !origin.port || origin.origin !== config.origin) fail('fixture_origin_required');
	const embedder = electron.webContents.fromId(config.embedderId);
	if (!embedder || embedder.isDestroyed() || embedder.getType() === 'webview') fail('invalid_embedder');
	const prefix = `persist:huhu.browser.p0.${config.runId}.`;
	const instance = randomUUID();
	const initialPrefix = 'about:blank#huhu-browser-p0-';
	const pages = new Map();
	const sessions = new Map();
	const controls = new Map();
	const tokens = new Map();
	const listeners = [];
	let accepted;
	let disposed = false;
	let closing = false;

	const on = (target, name, listener) => {
		target.on(name, listener);
		listeners.push(() => target.removeListener(name, listener));
	};
	const live = () => { if (disposed || closing || embedder.isDestroyed()) fail('probe_closed'); };
	const state = (space) => {
		if (!['a', 'b', 'personal', 'copied-vault'].includes(space)) fail('invalid_probe_space');
		if (!controls.has(space)) controls.set(space, { generation: 0, token: null, expiresAt: 0 });
		return controls.get(space);
	};
	const revoke = (space) => {
		const control = state(space);
		control.generation += 1;
		control.token = null;
		control.expiresAt = 0;
		return control.generation;
	};
	const record = (pageId) => {
		live();
		const page = pages.get(pageId);
		if (!page || page.status !== 'ready' || !page.guest || page.guest.isDestroyed()) fail('page_unavailable');
		return page;
	};
	const authorize = (grant, page) => {
		live();
		if (page.space === 'personal') fail('personal_space_forbidden');
		const control = state(page.space);
		if (!grant || grant.instance !== instance || grant.space !== page.space ||
			grant.generation !== control.generation || grant.token !== control.token ||
			!control.token || Date.now() >= control.expiresAt) fail('control_revoked');
		if (page.status !== 'ready' || page.guest.isDestroyed()) fail('page_unavailable');
	};
	const fixtureURL = (value) => {
		try { const url = new URL(value); return url.origin === origin.origin && !url.username && !url.password; }
		catch { return false; }
	};
	const getSession = (space) => {
		state(space);
		if (sessions.has(space)) return sessions.get(space);
		const session = electron.session.fromPartition(`${prefix}${space}`);
		if (session === electron.session.defaultSession) fail('default_session_forbidden');
		session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
		session.setPermissionCheckHandler(() => false);
		const cancelDownload = (event) => event.preventDefault();
		on(session, 'will-download', cancelDownload);
		sessions.set(space, session);
		return session;
	};
	const closePage = (page) => {
		if (page.status === 'closed') return;
		page.status = 'closing';
		tokens.delete(page.token);
		clearTimeout(page.attachTimer);
		if (page.guest && !page.guest.isDestroyed()) {
			if (page.debuggerOwned && page.guest.debugger.isAttached()) page.guest.debugger.detach();
			// This only closes our synthetic fixture, never an arbitrary user page.
			page.guest.close({ waitForBeforeUnload: false });
			if (!page.guest.isDestroyed()) fail('guest_close_pending');
		}
		page.status = 'closed';
	};

	on(embedder, 'will-attach-webview', (event, preferences, params) => {
		const ownPartition = typeof params.partition === 'string' && params.partition.startsWith(prefix);
		const ownSource = typeof params.src === 'string' && params.src.startsWith(initialPrefix);
		// Obsidian and other plugins retain their own policy and listeners.
		if (!ownPartition && !ownSource) return;
		const token = ownSource ? params.src.slice(initialPrefix.length) : '';
		const page = tokens.get(token);
		if (disposed || closing || accepted || !page || page.status !== 'prepared' || params.partition !== page.partition) {
			event.preventDefault();
			return;
		}
		page.status = 'attaching';
		accepted = page;
		delete preferences.preload;
		Object.assign(preferences, {
			partition: page.partition, sandbox: true, contextIsolation: true,
			nodeIntegration: false, nodeIntegrationInSubFrames: false, nodeIntegrationInWorker: false,
			webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
			navigateOnDragDrop: false,
		});
	});

	on(embedder, 'did-attach-webview', (_event, guest) => {
		if (![...sessions.values()].includes(guest.session)) return;
		const page = accepted;
		accepted = undefined;
		if (disposed || closing || !page || page.session !== guest.session || page.guest) {
			guest.close({ waitForBeforeUnload: false });
			return;
		}
		page.guest = guest;
		guest.setWindowOpenHandler(() => ({ action: 'deny' }));
		const navigation = (event, url) => {
			if (url !== page.source && !fixtureURL(url)) event.preventDefault();
		};
		on(guest, 'will-navigate', navigation);
		on(guest, 'will-redirect', navigation);
		on(guest, 'will-frame-navigate', (event, details) => navigation(event, details?.url ?? event.url));
		on(guest, 'did-navigate', () => { page.document += 1; });
		on(guest, 'render-process-gone', () => { page.status = 'crashed'; revoke(page.space); });
		on(guest, 'destroyed', () => { page.status = 'closed'; tokens.delete(page.token); clearTimeout(page.attachTimer); revoke(page.space); });
		on(guest.debugger, 'detach', () => {
			page.debuggerOwned = false;
			revoke(page.space);
		});
		const ready = () => {
			guest.removeListener('dom-ready', ready);
			if (disposed || closing || guest.getURL() !== page.source || page.status !== 'attaching') {
				closePage(page);
				return;
			}
			clearTimeout(page.attachTimer);
			tokens.delete(page.token);
			page.status = 'ready';
		};
		on(guest, 'dom-ready', ready);
	});

	const dispose = () => {
		if (disposed) return;
		closing = true;
		for (const space of controls.keys()) revoke(space);
		const errors = [];
		for (const page of pages.values()) { try { closePage(page); } catch { errors.push('guest_close_pending'); } }
		for (const remove of listeners.splice(0).reverse()) remove();
		// Keep deny handlers on our private Sessions; removing them could restore
		// permissive defaults while a Chromium background task is still alive.
		disposed = errors.length === 0;
		if (errors.length) fail('probe_cleanup_pending');
	};
	on(embedder, 'destroyed', () => { try { dispose(); } catch { /* Remains closing; explicit dispose reports the failure. */ } });

	const cdp = async (page, grant, method, params, beforeDispatch) => {
		authorize(grant, page);
		if (!page.debuggerOwned) {
			if (page.guest.debugger.isAttached()) fail('debugger_busy');
			page.guest.debugger.attach('1.3');
			page.debuggerOwned = true;
		}
		// No await between the final fence and native dispatch.
		authorize(grant, page);
		beforeDispatch?.();
		const result = await page.guest.debugger.sendCommand(method, params);
		authorize(grant, page);
		return result;
	};

	return {
		environment() {
			live();
			return { versions: { ...process.versions }, platform: process.platform, arch: process.arch,
				embedderId: embedder.id, webviewTag: embedder.getLastWebPreferences().webviewTag === true,
				noSandbox: electron.app.commandLine.hasSwitch('no-sandbox') };
		},
		prepare(space, pageId) {
			live();
			if (!/^[a-z0-9-]{1,48}$/.test(pageId) || pages.has(pageId) || pages.size >= 8) fail('invalid_probe_page');
			const session = getSession(space);
			const token = randomUUID();
			const page = { pageId, space, partition: `${prefix}${space}`, source: `${initialPrefix}${token}`,
				token, session, guest: null, status: 'prepared', document: 0, debuggerOwned: false };
			page.attachTimer = setTimeout(() => { if (accepted === page) accepted = undefined; try { closePage(page); } catch { page.status = 'cleanup-pending'; } }, 15000);
			page.attachTimer.unref?.();
			pages.set(pageId, page);
			tokens.set(token, page);
			return { pageId, partition: page.partition, source: page.source };
		},
		status(pageId) {
			const page = pages.get(pageId);
			if (!page) return { status: 'absent' };
			return { pageId, space: page.space, status: page.status, document: page.document,
				webContentsId: page.guest?.id ?? null, sessionMatches: !!page.guest && page.guest.session === page.session,
				usesDefaultSession: page.session === electron.session.defaultSession };
		},
		security(pageId) {
			const preferences = record(pageId).guest.getLastWebPreferences();
			return { sandbox: preferences.sandbox === true, isolated: preferences.contextIsolation === true,
				noNode: preferences.nodeIntegration === false && preferences.nodeIntegrationInSubFrames === false,
				webSecurity: preferences.webSecurity === true, noPreload: !preferences.preload };
		},
		async navigate(pageId) {
			const page = record(pageId);
			await page.guest.loadURL(`${origin.origin}/`);
			return this.status(pageId);
		},
		async seed(pageId) {
			const page = record(pageId);
			// Fixed fixture function, not caller-provided JavaScript.
			await page.guest.executeJavaScript('window.huhuFixture.seed()');
			page.session.flushStorageData();
			await page.session.cookies.flushStore();
		},
		async inspect(pageId) {
			return record(pageId).guest.executeJavaScript('window.huhuFixture.read()');
		},
		grant(space) {
			live();
			if (space === 'personal') fail('personal_space_forbidden');
			revoke(space);
			const control = state(space);
			control.token = randomUUID();
			control.expiresAt = Date.now() + 30000;
			return { instance, space, generation: control.generation, token: control.token };
		},
		takeover(space) { live(); return { generation: revoke(space) }; },
		async observe(pageId, grant) {
			const page = record(pageId);
			const document = page.document;
			const tree = await cdp(page, grant, 'Accessibility.getFullAXTree', {});
			if (document !== page.document) fail('stale_document');
			// Never put AX name/value (including password sentinels) into evidence.
			const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
			return { webContentsId: page.guest.id, document, nodeCount: nodes.length,
				roles: [...new Set(nodes.slice(0, 200).map(node => node.role?.value).filter(value => typeof value === 'string'))] };
		},
		async clickFixture(pageId, grant, expectedDocument) {
			const page = record(pageId);
			authorize(grant, page);
			if (expectedDocument !== page.document) fail('stale_document');
			const bounds = await page.guest.executeJavaScript('(()=>{const r=document.getElementById("increment").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
			authorize(grant, page);
			if (expectedDocument !== page.document) fail('stale_document');
			if (!Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y)) fail('fixture_bounds_invalid');
			let pressed = false;
			try {
				// cdp() repeats the fence immediately before the sendCommand call.
				await cdp(page, grant, 'Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...bounds }, () => { if (page.document !== expectedDocument) fail('stale_document'); pressed = true; });
				await cdp(page, grant, 'Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...bounds }, () => { if (page.document !== expectedDocument) fail('stale_document'); });
				pressed = false;
				return { status: 'dispatched', webContentsId: page.guest.id };
			} catch (error) {
				// This does NOT mean a dispatched click was rolled back.
				if (pressed && !page.guest.isDestroyed() && page.debuggerOwned) {
					await page.guest.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', ...bounds }).catch(() => undefined);
				}
				throw error;
			}
		},
		async capture(pageId, grant) {
			const page = record(pageId);
			authorize(grant, page);
			const document = page.document;
			const image = await page.guest.capturePage();
			authorize(grant, page);
			if (document !== page.document) fail('stale_document');
			const size = image.getSize();
			return { webContentsId: page.guest.id, width: size.width, height: size.height, empty: image.isEmpty() };
		},
		async clearSpace(space) {
			live();
			revoke(space);
			for (const page of pages.values()) if (page.space === space) closePage(page);
			const session = sessions.get(space);
			if (!session) return;
			// No session.destroy(), raw directory removal, or defaultSession mutation.
			await session.closeAllConnections();
			await session.clearStorageData();
			await session.clearCache();
			await session.clearAuthCache();
		},
		dispose,
	};
}

module.exports = { createProbe };

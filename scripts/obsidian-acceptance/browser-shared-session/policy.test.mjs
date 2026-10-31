import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const { createProbe } = createRequire(import.meta.url)('./policy.cjs');
const runId = '00000000-0000-4000-8000-000000000038';
const otherRun = '00000000-0000-4000-8000-000000000039';
const deferred = () => {
	let resolve;
	const promise = new Promise(r => { resolve = r; });
	return { promise, resolve };
};

function setup(t) {
	const embedder = new EventEmitter();
	Object.assign(embedder, { id: 1, isDestroyed: () => false, getType: () => 'window', getLastWebPreferences: () => ({ webviewTag: true }) });
	const sessions = new Map();
	function session() {
		return Object.assign(new EventEmitter(), {
			setPermissionRequestHandler(handler) { this.request = handler; },
			setPermissionCheckHandler(handler) { this.check = handler; },
			cookies: { flushStore: async () => {} }, flushStorageData() {},
			closeAllConnections: async () => {}, clearStorageData: async () => {},
			clearCache: async () => {}, clearAuthCache: async () => {},
		});
	}
	const defaultSession = session();
	const electron = { webContents: { fromId: id => id === 1 ? embedder : undefined },
		session: { defaultSession, fromPartition(partition) {
			if (!sessions.has(partition)) sessions.set(partition, session());
			return sessions.get(partition);
		} }, app: { commandLine: { hasSwitch: () => false } } };
	const config = { runId, origin: 'http://127.0.0.1:12345', embedderId: 1 };
	const probe = createProbe(electron, config);
	t.after(() => probe.dispose());
	let nextId = 10;
	function guestFor(description) {
		const guest = new EventEmitter();
		const debug = new EventEmitter();
		Object.assign(debug, {
			attached: false, calls: [], isAttached() { return this.attached; },
			attach() { this.attached = true; }, detach() { this.attached = false; this.emit('detach', {}, 'test'); },
			async sendCommand(method, params) { this.calls.push({ method, params }); return { nodes: [{ role: { value: 'button' }, name: { value: 'secret' } }] }; },
		});
		Object.assign(guest, { id: nextId++, session: sessions.get(description.partition), debugger: debug,
			url: description.source, destroyed: false, isDestroyed() { return this.destroyed; },
			getURL() { return this.url; }, setWindowOpenHandler(handler) { this.popup = handler; },
			close() { this.destroyed = true; this.emit('destroyed'); },
			async loadURL(url) { this.url = url; this.emit('did-navigate', {}, url); },
			async executeJavaScript() { return { x: 50, y: 60 }; },
			async capturePage() { return { getSize: () => ({ width: 800, height: 600 }), isEmpty: () => false }; },
		});
		return guest;
	}
	function attach(space = 'a', id = 'page-a') {
		const description = probe.prepare(space, id);
		const preferences = { preload: '/untrusted-preload', nodeIntegration: true };
		let prevented = false;
		embedder.emit('will-attach-webview', { preventDefault: () => { prevented = true; } }, preferences, { partition: description.partition, src: description.source });
		assert.equal(prevented, false);
		const guest = guestFor(description);
		embedder.emit('did-attach-webview', {}, guest);
		guest.emit('dom-ready');
		assert.equal(probe.status(id).status, 'ready');
		return { description, guest, preferences };
	}
	return { probe, config, electron, embedder, sessions, defaultSession, attach, guestFor };
}

for (const [name, patch] of [
	['non-fixture origin', { origin: 'https://example.com' }],
	['credentials in origin', { origin: 'http://user:password@127.0.0.1:12345' }],
	['invalid namespace', { runId: 'default' }],
	['unknown embedder', { embedderId: 999 }],
]) test(`rejects ${name}`, t => {
	const { electron, config } = setup(t);
	assert.throws(() => createProbe(electron, { ...config, ...patch }));
});

test('enforces security preferences before accepting a guest', t => {
	const { attach } = setup(t);
	const { preferences } = attach();
	assert.equal(preferences.preload, undefined);
	for (const key of ['sandbox', 'contextIsolation', 'webSecurity']) assert.equal(preferences[key], true);
	for (const key of ['nodeIntegration', 'nodeIntegrationInSubFrames', 'nodeIntegrationInWorker', 'webviewTag', 'allowRunningInsecureContent']) assert.equal(preferences[key], false);
});

test('does not block, close, or change another plugin guest', t => {
	const { embedder, guestFor } = setup(t);
	const preferences = { preload: '/other-plugin' };
	let prevented = false;
	embedder.emit('will-attach-webview', { preventDefault: () => { prevented = true; } }, preferences, { src: 'https://example.com', partition: 'persist:other-plugin' });
	const guest = guestFor({ source: 'https://example.com', partition: 'persist:other-plugin' });
	embedder.emit('did-attach-webview', {}, guest);
	assert.equal(prevented, false);
	assert.equal(guest.destroyed, false);
	assert.deepEqual(preferences, { preload: '/other-plugin' });
});

test('rejects forged and replayed creation tokens', t => {
	const { attach, embedder } = setup(t);
	const { description } = attach();
	for (const source of [description.source, 'about:blank#huhu-browser-p0-forged']) {
		let prevented = false;
		embedder.emit('will-attach-webview', { preventDefault: () => { prevented = true; } }, {}, { src: source, partition: description.partition });
		assert.equal(prevented, true);
	}
});

test('rejects a token paired with a different partition', t => {
	const { probe, embedder } = setup(t);
	const prepared = probe.prepare('a', 'page-a');
	let prevented = false;
	embedder.emit('will-attach-webview', { preventDefault: () => { prevented = true; } }, {}, { src: prepared.source, partition: 'persist:other' });
	assert.equal(prevented, true);
});

test('binds registered guest to its own Session, never defaultSession', t => {
	const { probe, attach, defaultSession } = setup(t);
	const first = attach('a', 'a1'), second = attach('a', 'a2'), other = attach('b', 'b1');
	assert.equal(first.guest.session, second.guest.session);
	assert.notEqual(first.guest.session, other.guest.session);
	assert.notEqual(first.guest.session, defaultSession);
	assert.equal(probe.status('a1').sessionMatches, true);
	assert.equal(defaultSession.check, undefined);
	assert.equal(defaultSession.request, undefined);
});

test('denies permission check and permission request on each owned Session', t => {
	const { attach } = setup(t);
	const { guest } = attach();
	assert.equal(guest.session.check(), false);
	let result;
	guest.session.request(guest, 'media', granted => { result = granted; });
	assert.equal(result, false);
	assert.deepEqual(guest.popup(), { action: 'deny' });
});

test('blocks unsafe navigation and redirects but allows the fixture origin', t => {
	const { attach } = setup(t);
	const { guest } = attach();
	for (const event of ['will-navigate', 'will-redirect']) {
		for (const url of ['file:///tmp/secret', 'javascript:alert(1)', 'https://example.com', 'http://user:pass@127.0.0.1:12345/']) {
			let prevented = false;
			guest.emit(event, { preventDefault: () => { prevented = true; } }, url);
			assert.equal(prevented, true);
		}
		guest.emit(event, { preventDefault: () => assert.fail('fixture blocked') }, 'http://127.0.0.1:12345/');
	}
});

test('personal Space cannot be granted or observed with another grant', async t => {
	const { probe, attach } = setup(t);
	attach('personal', 'personal');
	assert.throws(() => probe.grant('personal'), /personal_space_forbidden/);
	await assert.rejects(probe.observe('personal', probe.grant('a')), /personal_space_forbidden/);
});

test('wrong Space, instance and token are rejected at the native boundary', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const grant = probe.grant('a');
	for (const forged of [{ ...grant, space: 'b' }, { ...grant, instance: otherRun }, { ...grant, token: 'forged' }]) {
		await assert.rejects(probe.observe('page-a', forged), /control_revoked/);
	}
	assert.equal(guest.debugger.calls.length, 0);
});

test('takeover immediately rejects old reads and writes without destroying the page', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const grant = probe.grant('a');
	probe.takeover('a');
	await assert.rejects(probe.observe('page-a', grant), /control_revoked/);
	await assert.rejects(probe.clickFixture('page-a', grant, 0), /control_revoked/);
	assert.equal(guest.debugger.calls.length, 0);
	assert.equal(guest.destroyed, false);
});

test('re-handoff creates a fresh token and keeps the same guest', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const old = probe.grant('a'), current = probe.grant('a');
	assert.notEqual(old.token, current.token);
	assert.ok(current.generation > old.generation);
	await assert.rejects(probe.observe('page-a', old), /control_revoked/);
	assert.equal((await probe.observe('page-a', current)).webContentsId, guest.id);
});

test('expired grant is rejected without dispatch', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const grant = probe.grant('a');
	const now = Date.now();
	t.mock.method(Date, 'now', () => now + 31000);
	await assert.rejects(probe.observe('page-a', grant), /control_revoked/);
	assert.equal(guest.debugger.calls.length, 0);
});

test('revocation during asynchronous target lookup prevents all input, including cleanup', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.executeJavaScript = () => pending.promise;
	const action = probe.clickFixture('page-a', probe.grant('a'), 0);
	probe.takeover('a');
	pending.resolve({ x: 50, y: 60 });
	await assert.rejects(action, /control_revoked/);
	assert.equal(guest.debugger.calls.length, 0);
});

test('navigation during target lookup invalidates the old document', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.executeJavaScript = () => pending.promise;
	const action = probe.clickFixture('page-a', probe.grant('a'), 0);
	guest.emit('did-navigate', {}, 'http://127.0.0.1:12345/');
	pending.resolve({ x: 50, y: 60 });
	await assert.rejects(action, /stale_document/);
	assert.equal(guest.debugger.calls.length, 0);
});

test('late AX results are not delivered after takeover', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.debugger.sendCommand = () => pending.promise;
	const observation = probe.observe('page-a', probe.grant('a'));
	probe.takeover('a');
	pending.resolve({ nodes: [{ name: { value: 'secret' } }] });
	await assert.rejects(observation, /control_revoked/);
});

test('late screenshots are not delivered after takeover', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.capturePage = () => pending.promise;
	const screenshot = probe.capture('page-a', probe.grant('a'));
	probe.takeover('a');
	pending.resolve({});
	await assert.rejects(screenshot, /control_revoked/);
});

test('AX evidence excludes names and values', async t => {
	const { probe, attach } = setup(t);
	attach();
	const result = await probe.observe('page-a', probe.grant('a'));
	assert.equal(result.nodeCount, 1);
	assert.deepEqual(result.roles, ['button']);
	assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('does not steal a debugger owned by another caller', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	guest.debugger.attached = true;
	await assert.rejects(probe.observe('page-a', probe.grant('a')), /debugger_busy/);
	assert.equal(guest.debugger.calls.length, 0);
});

test('debugger detach revokes access without auto-reattaching', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const grant = probe.grant('a');
	await probe.observe('page-a', grant);
	guest.debugger.detach();
	await assert.rejects(probe.observe('page-a', grant), /control_revoked/);
	assert.equal(guest.debugger.isAttached(), false);
});

test('guest crash is explicit and old actions fail', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const grant = probe.grant('a');
	guest.emit('render-process-gone', {}, { reason: 'crashed' });
	assert.equal(probe.status('page-a').status, 'crashed');
	await assert.rejects(probe.observe('page-a', grant), /page_unavailable/);
});

test('cleanup failures propagate and another Space remains untouched', async t => {
	const { probe, attach } = setup(t);
	const first = attach(), second = attach('b', 'b1');
	first.guest.session.clearStorageData = async () => { throw new Error('fixture_cleanup_failed'); };
	await assert.rejects(probe.clearSpace('a'), /fixture_cleanup_failed/);
	assert.equal(first.guest.destroyed, true);
	assert.equal(second.guest.destroyed, false);
});

test('dispose is idempotent and removes only owned listeners', t => {
	const { probe, attach, embedder } = setup(t);
	const other = () => {};
	embedder.on('will-attach-webview', other);
	const { guest } = attach();
	probe.dispose(); probe.dispose();
	assert.equal(guest.destroyed, true);
	assert.deepEqual(embedder.listeners('will-attach-webview'), [other]);
	assert.throws(() => probe.prepare('a', 'new'), /probe_closed/);
});

test('guest count is bounded and duplicate Page IDs are rejected', t => {
	const { probe } = setup(t);
	for (let index = 0; index < 8; index++) probe.prepare('a', `page-${index}`);
	assert.throws(() => probe.prepare('a', 'page-0'), /invalid_probe_page/);
	assert.throws(() => probe.prepare('a', 'page-overflow'), /invalid_probe_page/);
});

test('takeover after mouse down releases only the original guest', async t => {
	const { probe, attach } = setup(t);
	const original = attach(), other = attach('b', 'other');
	original.guest.debugger.sendCommand = async function (method, params) {
		this.calls.push({ method, params });
		if (params.type === 'mousePressed') probe.takeover('a');
		return {};
	};
	await assert.rejects(probe.clickFixture('page-a', probe.grant('a'), 0), /control_revoked/);
	assert.deepEqual(original.guest.debugger.calls.map(call => call.params.type), ['mousePressed', 'mouseReleased']);
	assert.equal(other.guest.debugger.calls.length, 0);
});

test('navigation before AX completion rejects stale observations', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.debugger.sendCommand = () => pending.promise;
	const observation = probe.observe('page-a', probe.grant('a'));
	guest.emit('did-navigate', {}, 'http://127.0.0.1:12345/');
	pending.resolve({ nodes: [] });
	await assert.rejects(observation, /stale_document/);
});

test('navigation before screenshot completion rejects stale pixels', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const pending = deferred();
	guest.capturePage = () => pending.promise;
	const screenshot = probe.capture('page-a', probe.grant('a'));
	guest.emit('did-navigate', {}, 'http://127.0.0.1:12345/');
	pending.resolve({});
	await assert.rejects(screenshot, /stale_document/);
});

test('clearSpace does not clear storage while a guest remains alive', async t => {
	const { probe, attach } = setup(t);
	const { guest } = attach();
	const close = guest.close;
	let cleared = false;
	guest.close = () => {};
	guest.session.clearStorageData = async () => { cleared = true; };
	try {
		await assert.rejects(probe.clearSpace('a'), /guest_close_pending/);
		assert.equal(cleared, false);
		assert.equal(probe.status('page-a').status, 'closing');
	} finally { guest.close = close; }
});

test('new probe instance has a new authorization nonce even with the same storage namespace', t => {
	const first = setup(t), second = setup(t);
	const old = first.probe.grant('a'), current = second.probe.grant('a');
	assert.notEqual(old.instance, current.instance);
	assert.equal(old.generation, current.generation);
});

import { Script } from 'node:vm';
import { createServer, type Socket } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DesktopBrowserFileService } from '../files/file-service';
import { TestBrowserProtector } from '../../../../../../test/fixtures/browser-protector';
import { BrowserDriver } from './driver';
import { JsonFrames, writeJsonFrame } from './framing';
import type { ControlLease, RuntimeEvent } from '../../../core/contracts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { vi.useRealTimers(); for (const close of cleanup.splice(0)) await close(); });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
function dom(frameId: string, label: string, backend: number) {
	return { frameId: 0, scrollOffsetX: 0, scrollOffsetY: 0,
		nodes: { parentIndex: [-1, 0, 1], nodeType: [9, 1, 1], nodeName: [1, 2, 3], backendNodeId: [backend - 2, backend - 1, backend], attributes: [[], [], []] },
		layout: { nodeIndex: [1, 2], bounds: [[0, 0, 400, 800], [10, 20, 120, 30]], styles: [[4, 5, 6], [4, 5, 6]] },
		strings: [frameId, '#document', 'BODY', 'BUTTON', 'block', 'visible', '1', label] };
}

/** Replaces only Chromium/native wire I/O; the production driver, registry and NativeCdp all run. */
async function fixture(options?: { remoteTargetId?: string }) {
	const remoteTargetId = options?.remoteTargetId ?? 'remote';
	let socket: Socket | undefined, failFrame = '', localPresent = true, transparentParent = false, password = false, closedShadow = false, onAX: (() => Promise<void>) | undefined, onViewport: (() => Promise<void>) | undefined;
	let nested = false, frameFocused = true;
	let onFrameFocus: (() => Promise<void>) | undefined;
	let fillResult: Record<string, unknown> = { ok: true, verification: 'matched', sensitive: false };
	let onReadback: (() => Promise<void>) | undefined;
	let onMaterial: (() => Promise<void>) | undefined, onScreenshot: (() => Promise<void>) | undefined;
	let fileInput = false, onDescribe: (() => Promise<void>) | undefined, onUpload: ((params: Record<string, unknown>, deadline: unknown) => Promise<void>) | undefined;
	const remoteReady = deferred(), calls: Array<{ method: string; params: Record<string, unknown>; sessionId?: string }> = [];
	const popupReady = deferred(), events: RuntimeEvent[] = [];
	const scrolls = new Map<string, number>(), contexts = new Map<number, string>(); let nextContext = 0;
	const event = (method: string, params: Record<string, unknown>, sessionId?: string) => {
		if (method === 'Page.frameDetached' && params.frameId === 'local') localPresent = false;
		if (method === 'Page.frameNavigated' && (params.frame as { id?: string })?.id === 'local') localPresent = true;
		writeJsonFrame(socket!, { type: 'cdp', message: { method, params, sessionId } });
	};
	const server = createServer(client => {
		socket = client;
		const parser = new JsonFrames();
		client.on('data', data => parser.push(data, message => {
			if ('token' in message) return;
			for (const raw of message.frames as Array<Record<string, unknown>>) {
				const method = String(raw.method), params = (raw.params ?? {}) as Record<string, unknown>, sessionId = raw.sessionId as string | undefined;
				calls.push({ method, params, sessionId });
				void (async () => {
					let result: unknown = {}, error: unknown;
					if (method === 'Browser.getVersion') result = { product: 'Chrome/fixture' };
					if (method === 'Target.createTarget') {
						event('Target.attachedToTarget', { sessionId: 'main-session', targetInfo: { targetId: 'target', type: 'page', url: 'about:blank' } });
						result = { targetId: 'target' };
					}
					if (method === 'Page.getFrameTree') result = { frameTree: { frame: { id: sessionId?.startsWith('remote-session') ? 'remote' : 'main', url: 'https://fixture.invalid' }, ...(sessionId === 'main-session' ? { childFrames: [...(localPresent ? [{ frame: { id: 'local', parentId: 'main' }, ...(nested ? { childFrames: [{ frame: { id: 'inner', parentId: 'local' } }] } : {}) }] : []), { frame: { id: 'remote', parentId: 'main' } }] } : {}) } };
					if (method === 'Runtime.runIfWaitingForDebugger' && sessionId === 'main-session') event('Target.attachedToTarget', { sessionId: 'remote-session', targetInfo: { targetId: remoteTargetId, type: 'iframe' } }, 'main-session');
					if (method === 'Runtime.runIfWaitingForDebugger' && sessionId?.startsWith('remote-session')) remoteReady.resolve();
					if (method === 'DOMSnapshot.captureSnapshot') {
						const samples = sessionId?.startsWith('remote-session') ? [dom('remote', 'Remote button', 42)] : [dom('main', 'Main button', 42), ...(localPresent ? [dom('local', 'Local button', 52), ...(nested ? [dom('inner', 'Inner button', 62)] : [])] : [])];
						const strings: string[] = [], documents = samples.map(sample => {
							const offset = strings.length; strings.push(...sample.strings, 'type', 'password', 'value', 'SYNTHETIC_PASSWORD_SECRET', 'closed', '0');
							return { ...sample, scrollOffsetY: scrolls.get(sample.strings[0]!) ?? 0, frameId: offset, strings: undefined, nodes: { ...sample.nodes, nodeName: sample.nodes.nodeName.map(index => index + offset), attributes: [[], [], password ? [8, 9, 10, 11].map(index => index + offset) : []], ...(password ? { inputValue: { index: [2], value: [offset + 11] } } : {}), ...(closedShadow ? { shadowRootType: { index: [2], value: [offset + 12] } } : {}) }, layout: { ...sample.layout, styles: sample.layout.styles.map((row, layoutIndex) => row.map((index, property) => (transparentParent && layoutIndex === 0 && property === 2 ? 13 : index) + offset)) } };
						});
						result = { strings, documents };
					}
					if (method === 'DOM.resolveNode') result = { object: { objectId: 'element' } };
					if (method === 'DOM.describeNode' && fileInput) { await onDescribe?.(); result = { node: { nodeName: 'INPUT', attributes: ['type', 'file'] } }; }
					if (method === 'DOM.setFileInputFiles') await onUpload?.(params, message.deadlineAtMs);
					if (method === 'Runtime.callFunctionOn') {
						new Script(`(${String(params.functionDeclaration)})`); // Parse fixed functions without running webpage code.
						if (String(params.functionDeclaration).includes('function confirmFrameFocus')) { await onFrameFocus?.(); result = { result: { value: frameFocused } }; }
						else if (String(params.functionDeclaration).includes('styles={}')) { await onMaterial?.(); result = { result: { value: { rect: { x: 10, y: 20, width: 120, height: 30 }, styles: { color: 'rgb(1, 2, 3)', 'background-image': 'url(SYNTHETIC_SECRET)' } } } }; }
						else if (String(params.functionDeclaration).includes('function readFillResult')) result = { result: { objectId: 'fill-readback' } };
						else if (params.objectId === 'fill-readback') { await onReadback?.(); result = { result: { value: fillResult } }; }
						else if (String(params.functionDeclaration).includes('frameContentBox')) result = { result: { value: { x: 100, y: 50, width: 200, height: 150 } } };
						else if (String(params.functionDeclaration).includes('function viewportCenter')) result = { result: { value: { x: 160, y: 35 } } };
						else result = { result: { value: true } };
					}
					if (method === 'DOM.getFrameOwner') result = { backendNodeId: 99 };
					if (method === 'DOM.getBoxModel') result = { model: { content: [100,50,300,50,300,200,100,200] } };
					if (method === 'Page.captureScreenshot') { await onScreenshot?.(); result = { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=' }; }
					if (method === 'Page.createIsolatedWorld') { contexts.set(++nextContext, String(params.frameId)); result = { executionContextId: nextContext }; }
					if (method === 'Runtime.evaluate') {
						await onViewport?.();
						result = { result: { value: { x: 0, y: scrolls.get(contexts.get(Number(params.contextId)) ?? '') ?? 0, width: 400, height: 300 } } };
					}
					if (method === 'Accessibility.getFullAXTree') {
						await onAX?.();
						const frame = String(params.frameId ?? (sessionId?.startsWith('remote-session') ? 'remote' : 'main'));
						if (failFrame === frame) error = { message: 'Synthetic inaccessible frame' };
						result = { nodes: [{ backendDOMNodeId: frame === 'local' ? 52 : frame === 'inner' ? 62 : 42, role: { value: 'button' }, name: { value: `${frame[0]!.toUpperCase()}${frame.slice(1)} button` }, ...(password ? { value: { value: 'SYNTHETIC_PASSWORD_SECRET' } } : {}) }] };
					}
					writeJsonFrame(client, { type: 'cdp', message: { id: raw.id, result, ...(error ? { error } : {}) } });
				})().catch(() => client.destroy());
			}
		}));
	});
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
	const address = server.address(); if (!address || typeof address === 'string') throw Error('fixture address');
	const lease: ControlLease = { runtimeId: 'runtime', spaceId: 'space', epoch: 0, leaseId: 'lease', controllerId: 'provisioning', mode: 'workspace', expiresAt: Number.MAX_SAFE_INTEGER };
	const driver = new BrowserDriver('space', 'runtime', '/unused-downloads', true, lease, event => { events.push(event); if (event.kind === 'page' && event.page.id !== 'page') popupReady.resolve(); });
	cleanup.push(async () => { driver.stop(); socket?.destroy(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
	await driver.start(address.port, 'fixture-token');
	await driver.createPage('page', 'about:blank', lease); await remoteReady.promise;
	return { driver, lease, calls, event, events, frameFocus: (value: boolean, callback?: () => Promise<void>) => { frameFocused = value; onFrameFocus = callback; }, fill: (value: typeof fillResult) => { fillResult = value; }, readback: (callback: typeof onReadback) => { onReadback = callback; }, nested: () => { nested = true; }, material: (callback: typeof onMaterial) => { onMaterial = callback; }, screenshot: (callback: typeof onScreenshot) => { onScreenshot = callback; }, popup: async () => {
		event('Target.attachedToTarget', { sessionId: 'popup-session', targetInfo: { targetId: 'popup', type: 'page', openerId: 'target', url: 'about:blank' } });
		await popupReady.promise;
		const published = events.find(event => event.kind === 'page' && event.page.id !== 'page');
		if (!published || published.kind !== 'page') throw Error('popup not published');
		return published.page.id;
	}, upload: (callback: typeof onUpload) => { fileInput = true; onUpload = callback; }, describe: (callback: typeof onDescribe) => { onDescribe = callback; }, opacity: (transparent: boolean) => { transparentParent = transparent; }, password: () => { password = true; }, closed: () => { closedShadow = true; }, scroll: (y: number, frameId = 'main') => { scrolls.set(frameId, y); }, fail: (frame: string) => { failFrame = frame; }, block: (callback: () => Promise<void>) => { onAX = callback; }, blockViewport: (callback: () => Promise<void>) => { onViewport = callback; } };
}

it('uploads the fixed authorized bytes once through the real Driver/CDP boundary with the grant deadline', async () => {
	const f = await fixture(), root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-upload-wire-')), source = path.join(root, 'original.txt');
	const files = new DesktopBrowserFileService({ directory: path.join(root, 'managed'), metadataProtector: new TestBrowserProtector(), metadataScope: 'synthetic-upload', downloadDirectory: () => path.join(root, 'downloads') });
	cleanup.push(async () => { await files.dispose(); await fs.rm(root, { recursive: true, force: true }); }); await files.ready; await fs.writeFile(source, 'fixed authorized bytes');
	const scope = { spaceId: 'space', execution: { kind: 'agent' as const, runId: 'run' } }, { file, grant } = await files.grantUpload(source, scope);
	await fs.writeFile(source, 'replacement original'); await expect(files.consumeUpload(file.id, { ...scope, execution: { kind: 'agent', runId: 'another-run' } })).rejects.toBeDefined();
	const fixed = await files.consumeUpload(file.id, scope); let received = '';
	f.upload(async (params, deadline) => { received = await fs.readFile((params.files as string[])[0]!, 'utf8'); expect(deadline).toBe(grant.expiresAt); });
	const observed = await f.driver.observe('page', f.lease);
	await f.driver.execute('page', { kind: 'upload', observationId: observed.id, ref: observed.nodes[0]!.ref, fileIds: [file.id] }, { ...f.lease, expiresAt: files.uploadDeadline(file.id, scope) }, [fixed]);
	expect(received).toBe('fixed authorized bytes'); await expect(files.consumeUpload(file.id, scope)).rejects.toMatchObject({ code: 'file_grant_invalid' });
});

it('fences an upload deadline that expires while DOM file-input resolution is awaiting its response', async () => {
	vi.useFakeTimers({ toFake: ['Date'], now: 1000 }); const f = await fixture(), observed = await f.driver.observe('page', f.lease); let uploaded = false;
	f.upload(async () => { uploaded = true; }); f.describe(async () => { vi.setSystemTime(1051); });
	await expect(f.driver.execute('page', { kind: 'upload', observationId: observed.id, ref: observed.nodes[0]!.ref, fileIds: ['file'] }, { ...f.lease, expiresAt: 1050 }, ['/synthetic/private-copy'])).rejects.toMatchObject({ code: 'browser_stale_control' });
	expect(uploaded).toBe(false);
});

it('observes each same-process and cross-process frame with explicit coverage and local layout', async () => {
	const { driver, lease, calls } = await fixture();
	const observed = await driver.observe('page', lease);
	expect(observed).toMatchObject({ viewportVersion: 1, scope: { spaceId: 'space', pageId: 'page', mode: 'semantic', maxNodes: 512, maxBytes: 65536 }, frameErrors: [] });
	expect(observed.coverage.map(frame => [frame.frameId, frame.status, frame.nodes])).toEqual([['main', 'complete', 1], ['local', 'complete', 1], ['remote', 'complete', 1]]);
	expect(observed.nodes.map(node => [node.frameId, node.name, node.visible, node.bounds])).toEqual(['main', 'local', 'remote'].map(frame => [frame, `${frame[0]!.toUpperCase()}${frame.slice(1)} button`, true, { x: 10, y: 20, width: 120, height: 30 }]));
	expect(calls.filter(call => call.method === 'Accessibility.getFullAXTree').map(call => [call.params.frameId, call.sessionId])).toEqual([['main', 'main-session'], ['local', 'main-session'], ['remote', 'remote-session']]);
	expect(calls.some(call => /^(Input\.|DOM\.set|Page\.navigate)/.test(call.method))).toBe(false);
});

it('keeps OOPIF coverage on the page frame id when the target id differs', async () => {
	const { driver, lease, calls } = await fixture({ remoteTargetId: 'oopif-target' });
	const observed = await driver.observe('page', lease);
	expect(observed.frameErrors).toEqual([]);
	expect(observed.coverage.map(frame => [frame.frameId, frame.status, frame.nodes])).toEqual([['main', 'complete', 1], ['local', 'complete', 1], ['remote', 'complete', 1]]);
	expect(observed.coverage.some(frame => frame.frameId === 'oopif-target')).toBe(false);
	expect(calls.filter(call => call.method === 'Accessibility.getFullAXTree' && call.params.frameId === 'remote').map(call => call.sessionId)).toEqual(['remote-session']);
});

it('reports a failed child frame while retaining other frame observations and scoped budgets', async () => {
	const f = await fixture(); f.fail('local');
	const observed = await f.driver.observe('page', f.lease);
	expect(observed.frameErrors).toEqual([{ frameId: 'local', code: 'accessibility_unavailable' }]);
	expect(observed.coverage.map(frame => [frame.frameId, frame.status])).toEqual([['main', 'complete'], ['local', 'failed'], ['remote', 'complete']]);
	expect(observed.nodes.map(node => node.frameId)).toEqual(['main', 'remote']);
	const root = observed.nodes.find(node => node.frameId === 'remote')!;
	const scoped = await f.driver.observe('page', f.lease, { rootRef: root.ref, mode: 'visible', maxNodes: 1, maxBytes: 2048 });
	expect(scoped.scope).toMatchObject({ frameId: 'remote', rootRef: root.ref, mode: 'visible', maxNodes: 1, maxBytes: 2048 });
	expect(scoped.nodes).toHaveLength(1); expect(scoped.coverage).toHaveLength(1);
	expect(Buffer.byteLength(JSON.stringify(scoped))).toBeLessThanOrEqual(2048);
	await expect(f.driver.observe('page', f.lease, { frameId: 'main', rootRef: root.ref })).rejects.toMatchObject({ code: 'browser_scope_mismatch' });
	const truncated = await f.driver.observe('page', f.lease, { maxNodes: 1 });
	expect(truncated.truncated).toBe(true); expect(truncated.nodes).toHaveLength(1);
	expect(truncated.frameErrors.some(error => error.code === 'budget_exceeded')).toBe(true);
	const missing = await f.driver.observe('page', f.lease, { frameId: 'detached' });
	expect(missing.nodes).toEqual([]); expect(missing.frameErrors).toEqual([{ frameId: 'detached', code: 'frame_unavailable' }]);
});

it('rejects an old reference after external scroll without dispatching a webpage mutation', async () => {
	const f = await fixture(), observed = await f.driver.observe('page', f.lease), node = observed.nodes[0]!;
	f.scroll(50); const before = f.calls.length;
	await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: node.ref, text: 'must not type' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
	expect(f.calls.slice(before).some(call => /^(Input\.|DOM\.focus|DOM\.set)/.test(call.method))).toBe(false);
	const fresh = await f.driver.observe('page', f.lease); expect(fresh.viewportVersion).toBe(2); expect(fresh.nodes[0]!.visible).toBe(false);
});

it('discards an observation that finishes after navigation or permission revocation', async () => {
	for (const change of ['navigation', 'revocation'] as const) {
		const f = await fixture(), entered = deferred(), release = deferred();
		f.block(async () => { entered.resolve(); await release.promise; });
		const pending = f.driver.observe('page', f.lease);
		const denied = expect(pending).rejects.toMatchObject({ code: change === 'navigation' ? 'browser_document_changed' : 'browser_stale_control' });
		try {
			await entered.promise;
			if (change === 'navigation') f.event('Page.frameNavigated', { frame: { id: 'main', loaderId: 'new-document', url: 'https://fixture.invalid/new' } }, 'main-session');
			else await f.driver.setControl(undefined, 1);
		} finally { release.resolve(); }
		await denied;
	}
});

it('rejects detached-frame and navigated refs without falling back to another page', async () => {
	const f = await fixture(), observed = await f.driver.observe('page', f.lease), remote = observed.nodes.find(node => node.frameId === 'remote')!;
	f.event('Page.frameDetached', { frameId: 'remote', reason: 'remove' }, 'remote-session');
	await f.driver.cdp.command('Browser.getVersion');
	await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: remote.ref, text: 'denied' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
	f.event('Page.navigatedWithinDocument', { frameId: 'main', url: 'https://fixture.invalid/#new' }, 'main-session');
	await f.driver.cdp.command('Browser.getVersion');
	await expect(f.driver.observe('page', f.lease, { rootRef: observed.nodes[0]!.ref })).rejects.toMatchObject({ code: 'browser_stale_ref' });
	expect(f.calls.some(call => call.method === 'Input.insertText')).toBe(false);
});

it('discards in-flight observations on top-level fragment and history navigation without registering refs', async () => {
	for (const boundary of ['AX', 'final viewport']) for (const navigationType of ['fragment', 'historyApi']) {
		const f = await fixture(), initial = await f.driver.observe('page', f.lease);
		let replies = 0;
		const navigate = async () => {
			if (++replies !== (boundary === 'AX' ? 1 : 4)) return;
			// Navigation and the selected AX/final-viewport reply share one ordered wire.
			f.event('Page.navigatedWithinDocument', { frameId: 'main', url: `https://fixture.invalid/#${navigationType}`, navigationType }, 'main-session');
		};
		if (boundary === 'AX') f.block(navigate); else f.blockViewport(navigate);
		await expect(f.driver.observe('page', f.lease)).rejects.toMatchObject({ code: 'browser_document_changed' });
		await expect(f.driver.execute('page', { kind: 'fill', observationId: initial.id, ref: initial.nodes[0]!.ref, text: 'denied' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
		await expect(f.driver.observe('page', f.lease, { rootRef: initial.nodes[0]!.ref })).rejects.toMatchObject({ code: 'browser_stale_ref' });
		expect(f.calls.some(call => call.method === 'Input.insertText')).toBe(false);
		const fresh = await f.driver.observe('page', f.lease);
		expect(fresh.url).toBe(`https://fixture.invalid/#${navigationType}`);
		expect(fresh.documentId).not.toBe(initial.documentId);
		expect(fresh.nodes).toHaveLength(3);
	}
});

it('drops only child results invalidated by in-flight same-document navigation', async () => {
	for (const frameId of ['local', 'remote']) {
		const f = await fixture(), initial = await f.driver.observe('page', f.lease);
		let ax = 0;
		f.block(async () => {
			if (++ax === 3) f.event('Page.navigatedWithinDocument', { frameId, url: `https://fixture.invalid/#${frameId}`, navigationType: 'historyApi' }, frameId === 'remote' ? 'remote-session' : 'main-session');
		});
		const observed = await f.driver.observe('page', f.lease);
		expect(observed.nodes.map(node => node.frameId)).toEqual(['main', 'local', 'remote'].filter(id => id !== frameId));
		expect(observed.coverage.find(frame => frame.frameId === frameId)).toMatchObject({ status: 'failed', nodes: 0 });
		expect(observed.frameErrors).toContainEqual({ frameId, code: 'frame_unavailable' });
		expect(observed.url).toBe(initial.url);
		await expect(f.driver.execute('page', { kind: 'fill', observationId: initial.id, ref: initial.nodes.find(node => node.frameId === frameId)!.ref, text: 'denied' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
		expect(f.calls.some(call => call.method === 'Input.insertText')).toBe(false);
		await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: observed.nodes[0]!.ref, text: 'stable main' }, f.lease)).resolves.toEqual({ ok: true, verification: 'matched', sensitive: false });
		const fresh = await f.driver.observe('page', f.lease);
		expect(fresh.coverage.find(frame => frame.frameId === frameId)).toMatchObject({ status: 'complete', nodes: 1 });
	}
});

it('projects password and closed-shadow boundaries without returning raw DOM snapshot secrets', async () => {
	const f = await fixture(); f.password();
	const observed = await f.driver.observe('page', f.lease);
	expect(observed.nodes).toHaveLength(3); expect(observed.nodes.every(node => node.value === undefined)).toBe(true);
	expect(JSON.stringify(observed)).not.toContain('SYNTHETIC_PASSWORD_SECRET');
	f.closed();
	const closed = await f.driver.observe('page', f.lease);
	expect(closed.nodes).toEqual([]);
	expect(closed.coverage.every(frame => frame.status === 'partial')).toBe(true);
	expect(closed.frameErrors.map(error => error.code)).toEqual(['closed_shadow_root', 'closed_shadow_root', 'closed_shadow_root']);
});

it('keeps popup observation and references bound to their own stable Page', async () => {
	const f = await fixture(), original = await f.driver.observe('page', f.lease), popupId = await f.popup();
	const popup = await f.driver.observe(popupId, f.lease);
	expect(popup.pageId).toBe(popupId); expect(popup.scope.pageId).toBe(popupId);
	expect(popup.coverage).toHaveLength(1);
	await expect(f.driver.execute(popupId, { kind: 'fill', observationId: original.id, ref: original.nodes[0]!.ref, text: 'denied' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
	expect(f.calls.some(call => call.method === 'Input.insertText')).toBe(false);
});

it('publishes new viewport revisions after directly observing top or child external scrolling', async () => {
	for (const frameId of ['main', 'local']) {
		const f = await fixture(), before = await f.driver.observe('page', f.lease), old = before.nodes.find(node => node.frameId === frameId)!;
		f.scroll(50, frameId);
		const after = await f.driver.observe('page', f.lease);
		expect(after.viewportVersion).toBe(before.viewportVersion + 1);
		expect(after.nodes.find(node => node.frameId === frameId)!.visible).toBe(false);
		const projection = f.events.findLast(event => event.kind === 'page' && event.page.id === 'page');
		expect(projection).toMatchObject({ kind: 'page', page: { viewportVersion: after.viewportVersion } });
		await expect(f.driver.execute('page', { kind: 'fill', observationId: before.id, ref: old.ref, text: 'denied' }, f.lease)).rejects.toMatchObject({ code: 'browser_stale_ref' });
		expect((await f.driver.observe('page', f.lease)).viewportVersion).toBe(after.viewportVersion);
	}
});

it('keeps stable frame results when an already-read child detaches or changes document', async () => {
	for (const change of ['detach', 'replace']) {
		const f = await fixture(), entered = deferred(), release = deferred(); let ax = 0;
		f.block(async () => { if (++ax === 3) { entered.resolve(); await release.promise; } });
		const pending = f.driver.observe('page', f.lease);
		// Register failure handling before delivering the invalidation event.
		const settled = pending.then(value => ({ value }), error => ({ error }));
		try {
			await entered.promise;
			if (change === 'detach') f.event('Page.frameDetached', { frameId: 'local', reason: 'remove' }, 'main-session');
			else f.event('Page.frameNavigated', { frame: { id: 'local', parentId: 'main', loaderId: 'replacement' } }, 'main-session');
			await f.driver.cdp.command('Browser.getVersion');
		} finally { release.resolve(); }
		const outcome = await settled; expect(outcome).not.toHaveProperty('error');
		if (!('value' in outcome)) throw outcome.error;
		const observed = outcome.value;
		expect(observed.nodes.map(node => node.frameId)).toEqual(['main', 'remote']);
		expect(observed.coverage.find(frame => frame.frameId === 'local')).toMatchObject({ status: 'failed', nodes: 0 });
		expect(observed.frameErrors).toContainEqual({ frameId: 'local', code: 'frame_unavailable' });
		await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: observed.nodes[0]!.ref, text: 'stable main' }, f.lease)).resolves.toEqual({ ok: true, verification: 'matched', sensitive: false });
		f.event('Page.frameNavigated', { frame: { id: 'local', parentId: 'main', loaderId: 'restored' } }, 'main-session');
		await f.driver.cdp.command('Browser.getVersion');
		const restored = await f.driver.observe('page', f.lease);
		expect(restored.coverage.find(frame => frame.frameId === 'local')!.status).toBe('complete');
	}
});

it('filters a transparent ancestor subtree only in visible mode and restores visibility', async () => {
	const f = await fixture();
	expect((await f.driver.observe('page', f.lease, { mode: 'visible' })).nodes).toHaveLength(3);
	f.opacity(true);
	const semantic = await f.driver.observe('page', f.lease);
	expect(semantic.nodes).toHaveLength(3); expect(semantic.nodes.every(node => !node.visible)).toBe(true);
	expect((await f.driver.observe('page', f.lease, { mode: 'visible' })).nodes).toEqual([]);
	f.opacity(false);
	const restored = await f.driver.observe('page', f.lease, { mode: 'visible' });
	expect(restored.nodes).toHaveLength(3); expect(restored.nodes.every(node => node.visible)).toBe(true);
});

it('marks a newly appeared child omitted without losing frames already observed', async () => {
	const f = await fixture(), entered = deferred(), release = deferred(); let ax = 0;
	f.block(async () => { if (++ax === 3) { entered.resolve(); await release.promise; } });
	const pending = f.driver.observe('page', f.lease);
	const settled = pending.then(value => ({ value }), error => ({ error }));
	try {
		await entered.promise;
		f.event('Page.frameNavigated', { frame: { id: 'added', parentId: 'main', loaderId: 'new-child' } }, 'main-session');
		await f.driver.cdp.command('Browser.getVersion');
	} finally { release.resolve(); }
	const outcome = await settled; expect(outcome).not.toHaveProperty('error');
	if (!('value' in outcome)) throw outcome.error;
	expect(outcome.value.nodes.map(node => node.frameId)).toEqual(['main', 'local', 'remote']);
	expect(outcome.value.coverage.find(frame => frame.frameId === 'added')).toMatchObject({ status: 'omitted', nodes: 0 });
	expect(outcome.value.frameErrors).toContainEqual({ frameId: 'added', code: 'frame_unavailable' });
});

it('keeps the main and local observations when a late OOPIF target is replaced', async () => {
	const f = await fixture(), entered = deferred(), release = deferred(); let ax = 0;
	f.block(async () => { if (++ax === 3) { entered.resolve(); await release.promise; } });
	const pending = f.driver.observe('page', f.lease);
	const settled = pending.then(value => ({ value }), error => ({ error }));
	try {
		await entered.promise;
		f.event('Target.detachedFromTarget', { sessionId: 'remote-session', targetId: 'remote' });
		f.event('Target.attachedToTarget', { sessionId: 'remote-session-replaced', targetInfo: { targetId: 'remote', type: 'iframe' } }, 'main-session');
		await f.driver.cdp.command('Browser.getVersion');
	} finally { release.resolve(); }
	const outcome = await settled; expect(outcome).not.toHaveProperty('error');
	if (!('value' in outcome)) throw outcome.error;
	expect(outcome.value.nodes.map(node => node.frameId)).toEqual(['main', 'local']);
	expect(outcome.value.coverage.find(frame => frame.frameId === 'remote')).toMatchObject({ status: 'failed', nodes: 0 });
	expect(outcome.value.frameErrors).toContainEqual({ frameId: 'remote', code: 'frame_unavailable' });
});

 it.each(['main', 'local', 'remote'])('captures only the selected %s frame element with readonly top-level clipping and projected styles', async frameId => {
	const f = await fixture(), human = { ...f.lease, mode: 'human' as const, controllerId: 'viewer' }; await f.driver.setControl(human, human.epoch);
	const observation = await f.driver.observe('page', human), selected = observation.nodes.find(node => node.frameId === frameId)!;
	const capture = await f.driver.execute('page', { kind: 'material', observationId: observation.id, ref: selected.ref }, human);
	expect(capture).toMatchObject({ ref: selected.ref, frameId, styles: { color: 'rgb(1, 2, 3)' }, clip: frameId === 'main' ? { x: 10, y: 20, width: 120, height: 30 } : { x: 105, y: 60, width: 60, height: 15 } });
	expect(JSON.stringify(capture)).not.toContain('SYNTHETIC_SECRET'); expect(f.calls.filter(call => call.method === 'Page.captureScreenshot').at(-1)?.sessionId).toBe('main-session');
	expect(f.calls.some(call => call.method === 'DOM.scrollIntoViewIfNeeded')).toBe(false);
 });
 it('rejects navigation during selected material style/crop awaits without selecting a same-named replacement', async () => {
	const f = await fixture(), human = { ...f.lease, mode: 'human' as const, controllerId: 'viewer' }; await f.driver.setControl(human, human.epoch); const observation = await f.driver.observe('page', human), selected = observation.nodes[0]!;
	f.material(async () => { f.event('Page.navigatedWithinDocument', { frameId: 'main', url: 'https://fixture.invalid/#changed' }, 'main-session'); await new Promise(resolve => setImmediate(resolve)); });
	await expect(f.driver.execute('page', { kind: 'material', observationId: observation.id, ref: selected.ref }, human)).rejects.toBeDefined(); expect(f.calls.filter(call => call.method === 'Page.captureScreenshot')).toEqual([]);
 });

it('drops a selected element image if navigation occurs while screenshot awaits, without recapturing it', async () => {
	const f = await fixture(), human = { ...f.lease, mode: 'human' as const, controllerId: 'viewer' }; await f.driver.setControl(human, human.epoch); const observation = await f.driver.observe('page', human);
	f.screenshot(async () => { f.event('Page.navigatedWithinDocument', { frameId: 'main', url: 'https://fixture.invalid/#new' }, 'main-session'); await new Promise(resolve => setImmediate(resolve)); });
	await expect(f.driver.execute('page', { kind: 'material', observationId: observation.id, ref: observation.nodes[0]!.ref }, human)).rejects.toBeDefined(); expect(f.calls.filter(call => call.method === 'Page.captureScreenshot')).toHaveLength(1);
});
it('keeps password values and style URLs out of selected semantic material', async () => {
	const f = await fixture(), human = { ...f.lease, mode: 'human' as const, controllerId: 'viewer' }; await f.driver.setControl(human, human.epoch); f.password(); const observation = await f.driver.observe('page', human);
	const captured = await f.driver.execute('page', { kind: 'material', observationId: observation.id, ref: observation.nodes[0]!.ref }, human); expect(JSON.stringify(captured)).not.toContain('SYNTHETIC');
});

it('composes nested same-process iframe owner coordinates exactly once per parent frame', async () => {
	const f = await fixture(), human = { ...f.lease, mode: 'human' as const, controllerId: 'viewer' }; await f.driver.setControl(human, human.epoch); f.nested(); const observation = await f.driver.observe('page', human), selected = observation.nodes.find(node => node.frameId === 'inner')!;
	const captured = await f.driver.execute('page', { kind: 'material', observationId: observation.id, ref: selected.ref }, human); expect(captured).toMatchObject({ clip: { x: 152.5, y: 80, width: 30, height: 7.5 } });
	expect(f.calls.filter(call => call.method === 'DOM.resolveNode' && call.params.executionContextId !== undefined).length).toBeGreaterThan(2);
});


it.each(['matched', 'rejected', 'truncated', 'transformed', 'unverified'])('returns fill %s from the exact ref session, once and without secret echoes', async verification => {
	const f = await fixture(), observed = await f.driver.observe('page', f.lease);
	const node = observed.nodes.find(node => node.frameId === 'remote')!;
	f.fill({ ok: verification === 'matched', verification, sensitive: true, value: 'SYNTHETIC_SECRET' });
	const result = await f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: node.ref, text: 'SYNTHETIC_SECRET' }, f.lease);
	expect(result).toEqual({ ok: verification === 'matched', verification, sensitive: true });
	expect(JSON.stringify(result)).not.toContain('SECRET');
	expect(f.calls.filter(call => call.method === 'Input.insertText')).toEqual([{ method: 'Input.insertText', params: { text: 'SYNTHETIC_SECRET' }, sessionId: 'remote-session' }]);
	expect(f.calls.some(call => call.method === 'Runtime.releaseObjectGroup' && call.params.objectGroup === 'huhu-browser-action')).toBe(true);
});
it('does not treat malformed fill readback as success or retry the insertion', async () => {
	const f = await fixture(), observed = await f.driver.observe('page', f.lease);
	f.fill({ ok: true, verification: 'transformed', sensitive: false, value: 'secret' });
	await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: observed.nodes[0]!.ref, text: 'expected' }, f.lease)).resolves.toEqual({ ok: false, verification: 'unverified' });
	expect(f.calls.filter(call => call.method === 'Input.insertText')).toHaveLength(1);
});
it('discards late fill readback after revocation without retrying the submitted write', async () => {
	const f = await fixture(), observed = await f.driver.observe('page', f.lease), entered = deferred(), release = deferred();
	cleanup.unshift(async () => { release.resolve(); }); f.readback(async () => { entered.resolve(); await release.promise; });
	const pending = f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: observed.nodes[0]!.ref, text: 'expected' }, f.lease);
	const denied = expect(pending).rejects.toMatchObject({ code: 'browser_stale_control' }); await entered.promise;
	await f.driver.setControl(undefined, 1); release.resolve(); await denied;
	expect(f.calls.filter(call => call.method === 'Input.insertText')).toHaveLength(1);
});


it.each(['local', 'remote', 'inner'])('checks every %s frame owner before inserting, including a focused child under an unfocused parent', async frameId => {
 const f = await fixture(); f.nested(); const observed = await f.driver.observe('page', f.lease), node = observed.nodes.find(node => node.frameId === frameId)!;
 f.frameFocus(false);
 await expect(f.driver.execute('page', { kind: 'fill', observationId: observed.id, ref: node.ref, text: 'must not insert' }, f.lease)).rejects.toMatchObject({ code: 'browser_element_not_actionable' });
 expect(f.calls.filter(call => call.method === 'Input.insertText')).toHaveLength(0);
});
it('rejects ancestor navigation during focus validation before dispatching text to an OOPIF', async () => {
 const f = await fixture(), observed = await f.driver.observe('page', f.lease), node = observed.nodes.find(node => node.frameId === 'remote')!;
 f.frameFocus(true, async () => { f.event('Page.navigatedWithinDocument', { frameId: 'main', url: 'https://fixture.invalid/#focus-change' }, 'main-session'); await new Promise(resolve => setImmediate(resolve)); });
 await expect(f.driver.execute('page', { kind: 'type', observationId: observed.id, ref: node.ref, text: 'must not insert' }, f.lease)).rejects.toBeDefined();
 expect(f.calls.filter(call => call.method === 'Input.insertText')).toHaveLength(0);
});

import { createServer, type Socket } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { BrowserDriver } from './driver';
import { JsonFrames, writeJsonFrame } from './framing';
import type { ControlLease, RuntimeEvent } from '../../../core/contracts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

it.each(['confirmed', 'unconfirmed', 'unknown-create'] as const)('requires %s failed-target cleanup before allowing a desired Page ID to be retried', async cleanupState => {
	let socket: Socket | undefined, serial = 0, fail = true;
	const closing = gate(), blocked = gate(), events: RuntimeEvent[] = [], calls: string[] = [];
	const event = (method: string, params: Record<string, unknown>) => writeJsonFrame(socket!, { type: 'cdp', message: { method, params } });
	const server = createServer(client => {
		socket = client; const parser = new JsonFrames();
		client.on('data', bytes => parser.push(bytes, message => {
			if ('token' in message) return;
			for (const raw of message.frames as Array<Record<string, unknown>>) void (async () => {
				const method = String(raw.method); calls.push(method); let result: Record<string, unknown> = {};
				if (method === 'Target.createTarget' && cleanupState === 'unknown-create') { writeJsonFrame(client, { type: 'dispatch', id: message.id, error: 'outcome_unknown' }); return; }
				if (method === 'Browser.getVersion') result = { product: 'Chrome/synthetic' };
				if (method === 'Target.createTarget') { const id = `target-${++serial}`; event('Target.attachedToTarget', { sessionId: id, targetInfo: { targetId: id, type: 'page', url: 'about:blank' } }); result = { targetId: id }; }
				if (method === 'Page.getFrameTree') result = { frameTree: { frame: { id: `frame-${raw.sessionId}`, url: 'about:blank' } } };
				if (method === 'Page.navigate' && fail) result = { errorText: 'synthetic load failure' };
				if (method === 'Target.closeTarget') { closing.resolve(); await blocked.promise; if (cleanupState === 'confirmed') event('Target.detachedFromTarget', { sessionId: (raw.params as { targetId: string }).targetId }); result = { success: cleanupState === 'confirmed' }; }
				writeJsonFrame(client, { type: 'cdp', message: { id: raw.id, result } });
			})().catch(() => client.destroy());
		}));
	});
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw Error('address');
	const lease: ControlLease = { runtimeId: 'runtime', spaceId: 'space', epoch: 0, leaseId: 'lease', controllerId: 'workspace', mode: 'workspace', expiresAt: Number.MAX_SAFE_INTEGER };
	const driver = new BrowserDriver('space', 'runtime', '', false, lease, event => events.push(event));
	cleanup.push(async () => { blocked.resolve(); driver.stop(); socket?.destroy(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
	await driver.start(address.port, 'synthetic');
	let settled = false; const first = driver.createPage('desired-page', 'https://synthetic.invalid', lease).finally(() => { settled = true; });
	const failed = expect(first).rejects.toMatchObject({ code: cleanupState === 'confirmed' ? 'browser_navigation_failed' : 'browser_page_cleanup_pending' });
	if (cleanupState === 'unknown-create') { await failed; expect(events).toContainEqual({ kind: 'fault', runtimeId: 'runtime', code: 'browser_page_cleanup_pending' }); return; }
	await closing.promise;
	try { expect(settled).toBe(false); } finally { blocked.resolve(); }
	await failed;
	if (cleanupState === 'unconfirmed') { expect(events).toContainEqual({ kind: 'fault', runtimeId: 'runtime', code: 'browser_page_cleanup_pending' }); return; }
	fail = false;
	const restored = await driver.createPage('desired-page', 'https://synthetic.invalid', lease);
	expect(restored.id).toBe('desired-page'); expect(calls.filter(method => method === 'Target.createTarget')).toHaveLength(2);
	expect(events.filter(event => event.kind === 'page-closed')).toEqual([]);
});

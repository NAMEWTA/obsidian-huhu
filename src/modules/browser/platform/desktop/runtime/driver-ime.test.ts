import { createServer, type Socket } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { BrowserDriver } from './driver';
import { JsonFrames, writeJsonFrame } from './framing';
import type { ControlLease, HumanInput } from '../../../core/contracts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
async function fixture() {
	let socket: Socket | undefined, sequence = 0, ime: ((params: Record<string, unknown>) => Promise<void>) | undefined, rejectCancel = false;
	const calls: Array<{ method: string; params: Record<string, unknown>; lane: unknown; session: unknown }> = [], navigated = gate();
	const server = createServer(client => {
		socket = client; const parser = new JsonFrames();
		client.on('data', bytes => parser.push(bytes, message => {
			if ('token' in message) return;
			for (const raw of message.frames as Array<Record<string, unknown>>) void (async () => {
				const method = String(raw.method), params = (raw.params ?? {}) as Record<string, unknown>; calls.push({ method, params, lane: message.lane, session: raw.sessionId }); let result: unknown = {};
				if (method === 'Browser.getVersion') result = { product: 'Chrome/synthetic' };
				if (method === 'Target.createTarget') { writeJsonFrame(client, { type: 'cdp', message: { method: 'Target.attachedToTarget', params: { sessionId: 'session', targetInfo: { targetId: 'target', type: 'page', url: 'about:blank' } } } }); result = { targetId: 'target' }; }
				if (method === 'Page.getFrameTree') result = { frameTree: { frame: { id: 'main', url: 'about:blank' } } };
				if (method === 'Input.imeSetComposition') await ime?.(params);
				writeJsonFrame(client, { type: 'cdp', message: { id: raw.id, result, ...(rejectCancel && method === 'Input.imeSetComposition' && params.text === '' ? { error: { message: 'synthetic cancel failure' } } : {}) } });
			})().catch(() => client.destroy());
		}));
	});
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw Error('address');
	const lease: ControlLease = { runtimeId: 'runtime', spaceId: 'space', epoch: 0, leaseId: 'human', controllerId: 'viewer', mode: 'human', expiresAt: Number.MAX_SAFE_INTEGER };
	const driver = new BrowserDriver('space', 'runtime', '', false, lease, event => { if (event.kind === 'page' && event.page.url.includes('#changed')) navigated.resolve(); });
	cleanup.push(async () => { driver.stop(); socket?.destroy(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
	await driver.start(address.port, 'synthetic'); await driver.createPage('page', 'about:blank', lease);
	const input = (input: HumanInput, authority = lease) => driver.execute('page', { kind: 'input', input, inputSequence: ++sequence }, authority);
	const composition = (phase: 'start' | 'update' | 'end' | 'cancel', text = ''): HumanInput => ({ kind: 'composition', phase, text, selectionStart: text.length, selectionEnd: text.length });
	return { driver, lease, calls, input, composition, block: (callback: typeof ime) => { ime = callback; }, rejectCancel: () => { rejectCancel = true; }, navigate: async () => { writeJsonFrame(socket!, { type: 'cdp', message: { method: 'Page.navigatedWithinDocument', sessionId: 'session', params: { frameId: 'main', url: 'https://synthetic.invalid/#changed' } } }); await navigated.promise; } };
}

it('routes human preedit selection and a single final commit through the production driver/CDP path', async () => {
	const f = await fixture(); await f.input(f.composition('start'));
	await f.input({ kind: 'composition', phase: 'update', text: '中😀', selectionStart: 1, selectionEnd: 3 }); await f.input(f.composition('end', '中😀'));
	expect(f.calls.filter(call => call.method.startsWith('Input.'))).toEqual([
		{ method: 'Input.imeSetComposition', params: { text: '中😀', selectionStart: 1, selectionEnd: 3 }, lane: 'lease', session: 'session' },
		{ method: 'Input.insertText', params: { text: '中😀' }, lane: 'lease', session: 'session' },
	]);
});
it('revokes first, waits for admitted preedit, and confirms only the recorded session cancellation before handoff', async () => {
	const f = await fixture(), updating = gate(), update = gate(), cancelling = gate(), cancel = gate();
	cleanup.unshift(async () => { update.resolve(); cancel.resolve(); });
	f.block(async params => { if (params.text) { updating.resolve(); await update.promise; } else { cancelling.resolve(); await cancel.promise; } });
	await f.input(f.composition('start')); const pending = f.input(f.composition('update', '候选')), denied = expect(pending).rejects.toMatchObject({ code: 'browser_stale_control' }); await updating.promise;
	let handed = false; const revoking = f.driver.setControl(undefined, 1).then(() => { handed = true; });
	expect(() => f.input({ kind: 'text', text: 'old writer' })).toThrow('browser_stale_control');
	expect(f.calls.filter(call => call.method === 'Input.imeSetComposition')).toHaveLength(1);
	update.resolve(); await denied; await cancelling.promise; expect(handed).toBe(false);
	expect(f.calls.filter(call => call.method === 'Input.imeSetComposition').at(-1)).toMatchObject({ params: { text: '', selectionStart: 0, selectionEnd: 0 }, lane: 'maintenance', session: 'session' });
	cancel.resolve(); await revoking;
});
it.each(['cancel-failure', 'document-changed'] as const)('keeps composition %s blocked without retrying unknown cleanup or cancelling another document', async failure => {
	const f = await fixture(); await f.input(f.composition('start')); await f.input(f.composition('update', '未提交'));
	if (failure === 'cancel-failure') f.rejectCancel(); else await f.navigate();
	await expect(f.driver.setControl(undefined, 1)).rejects.toBeDefined(); const sent = f.calls.filter(call => call.method === 'Input.imeSetComposition').length;
	await expect(f.driver.setControl(undefined, 2)).rejects.toBeDefined(); expect(f.calls.filter(call => call.method === 'Input.imeSetComposition')).toHaveLength(sent);
});
it('rejects Agent composition and malformed UTF-16 selection before native dispatch', async () => {
	const f = await fixture(); await expect(f.input(f.composition('start'), { ...f.lease, mode: 'agent' })).rejects.toBeDefined();
	await f.input(f.composition('start')); await expect(f.input({ kind: 'composition', phase: 'update', text: '中', selectionStart: 0, selectionEnd: 2 })).rejects.toMatchObject({ code: 'browser_invalid_composition' });
	expect(f.calls.some(call => call.method === 'Input.imeSetComposition')).toBe(false);
});

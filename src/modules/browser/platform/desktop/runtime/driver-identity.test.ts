import { createServer, type Socket } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { BrowserDriver } from './driver';
import { JsonFrames, writeJsonFrame } from './framing';
import type { ControlLease, RuntimeCookie } from '../../../core/contracts';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function fixture() {
	let socket: Socket | undefined, malformed = false; const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
	const server = createServer(client => {
		socket = client; const parser = new JsonFrames();
		client.on('data', bytes => parser.push(bytes, message => {
			if ('token' in message) return;
			for (const frame of message.frames as Array<{ id: number; method: string; params: Record<string, unknown> }>) {
				calls.push(frame); const result = frame.method === 'Browser.getVersion' ? { product: 'Chrome/synthetic' } : frame.method === 'Storage.getCookies' && !malformed ? { cookies: [] } : {};
				writeJsonFrame(client, { type: 'cdp', message: { id: frame.id, result } });
			}
		}));
	});
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw Error('fixture address');
	const lease: ControlLease = { runtimeId: 'runtime', spaceId: 'space', epoch: 0, leaseId: 'provisioning', controllerId: 'provisioning', mode: 'workspace', expiresAt: Number.MAX_SAFE_INTEGER };
	const driver = new BrowserDriver('space', 'runtime', '/unused', true, lease, () => {}); cleanup.push(async () => { driver.stop(); socket?.destroy(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
	await driver.start(address.port, 'synthetic-token'); return { driver, lease, calls, malformed: () => { malformed = true; } };
}
it('passes complete host-only, domain, path, session, SameSite and CHIPS semantics to the owned CDP context', async () => {
	const { driver, lease, calls } = await fixture();
	const cookies: RuntimeCookie[] = [
		{ name: '__Host-id', value: 'SYNTHETIC_SECRET', domain: 'example.com', hostOnly: true, path: '/', secure: true, httpOnly: true, session: true, sameSite: 'Strict' },
		{ name: 'id', value: 'SYNTHETIC_PARTITION_SECRET', domain: '.example.com', hostOnly: false, path: '/account', secure: true, httpOnly: true, session: false, expires: 2000000000.125, sameSite: 'None', priority: 'High', sourceScheme: 'Secure', sourcePort: 443, partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: true } },
	];
	await driver.writeIdentity({ cookies }, lease);
	const writes = calls.filter(call => call.method === 'Storage.setCookies'); expect(writes).toHaveLength(1); expect(writes[0]?.params).not.toHaveProperty('browserContextId');
	expect(writes[0]?.params.cookies).toEqual([
		{ name: '__Host-id', value: 'SYNTHETIC_SECRET', url: 'https://example.com/', path: '/', secure: true, httpOnly: true, sameSite: 'Strict' },
		{ name: 'id', value: 'SYNTHETIC_PARTITION_SECRET', domain: '.example.com', path: '/account', secure: true, httpOnly: true, expires: 2000000000.125, sameSite: 'None', priority: 'High', sourceScheme: 'Secure', sourcePort: 443, partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: true } },
	]);
	await driver.setControl(undefined, 1); await expect(driver.writeIdentity({ cookies }, { ...lease, epoch: 1 })).rejects.toThrow(); expect(calls.filter(call => call.method === 'Storage.setCookies')).toHaveLength(1);
});
it('does not mistake malformed readback for a successfully verified empty cookie set', async () => {
	const { driver, lease, malformed } = await fixture(); expect(await driver.readIdentity(lease)).toEqual({ cookies: [] }); malformed();
	await expect(driver.readIdentity(lease)).rejects.toMatchObject({ code: 'browser_identity_readback_invalid' });
});

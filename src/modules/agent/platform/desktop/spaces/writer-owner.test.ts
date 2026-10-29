import { mkdtemp, mkdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { createConnection, createServer, type Server } from 'node:net';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDirectoryPort } from './directories';
import { freeWriterPorts } from './free-writer-port.fixture';
import { createWriterOwner, writerPort } from './writer-owner';

const roots: string[] = [];
const servers: Server[] = [];
const leases: { close(): Promise<void> }[] = [];
afterEach(async () => {
	await Promise.all(leases.splice(0).map(lease => lease.close()));
	await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
	await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function fixture() {
	const vaultRoot = await mkdtemp(path.join(tmpdir(), 'huhu-t02-b-owner-'));
	roots.push(vaultRoot);
	const directories = createDirectoryPort({ vaultRoot, vaultId: 'vault', deviceId: 'device', chooseDirectory: async () => undefined });
	const vault = await directories.inspectVault();
	const server = createServer();
	servers.push(server);
	const listener = vi.fn(() => server);
	const ports = freeWriterPorts();
	const owners = createWriterOwner(directories, listener, ports);
	return { vaultRoot, directories, vault, server, listener, owners, ports };
}

describe('Space writer OS lease', () => {
	test('port identity has one stable namespace/range and excludes paths, logical Vault, and instance IDs', () => {
		const physical = { canonicalPath: '/one', dev: '12345678901234567890', ino: '98765432109876543210' };
		expect(writerPort('device', physical)).toBe(33633);
		expect(writerPort('device', { ...physical, canonicalPath: '/alias' })).toBe(33633);
		expect(writerPort('device-b', physical)).not.toBe(33633);
		expect(writerPort('device', { ...physical, ino: '98765432109876543211' })).not.toBe(33633);
		expect(writerPort('device', physical)).toBeGreaterThanOrEqual(32768);
		expect(writerPort('device', physical)).toBeLessThan(49152);
	});

	test('inspection creates no listener; acquisition awaits real listening; close is idempotent and awaits kernel release', async () => {
		const { directories, vault, server, listener, owners, ports } = await fixture();
		await directories.inspectVault();
		expect(listener).not.toHaveBeenCalled();
		const lease = await owners.acquire(vault, 'instance-a');
		leases.push(lease);
		expect(server.listening).toBe(true);
		expect(lease.instanceId).toBe('instance-a');
		expect(lease.port).toBe(await ports(vault.deviceId, vault.root));
		await expect(lease.assertHeld()).resolves.toBeUndefined();
		const closed = lease.close();
		expect(lease.close()).toBe(closed);
		await closed;
		expect(lease.lost.aborted).toBe(false);
		await expect(lease.assertHeld()).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'lease-closed' });
		const second = await createWriterOwner(directories, undefined, ports).acquire(vault, 'instance-b');
		leases.push(second);
		expect(second.port).toBe(lease.port);
	});

	test('an occupied port is a conflict with no alternate listener or fallback', async () => {
		const { vault, server, owners, listener, ports } = await fixture();
		const blocker = createServer();
		servers.push(blocker);
		const blockerPort = await ports(vault.deviceId, vault.root);
		await new Promise<void>(resolve => blocker.listen({ host: '127.0.0.1', port: blockerPort, exclusive: true }, resolve));
		await expect(owners.acquire(vault, 'instance')).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'port-in-use' });
		expect(listener).toHaveBeenCalledOnce();
		expect(server.listening).toBe(false);
	});

	test.each(['error', 'close'] as const)('unexpected listener %s synchronously aborts the held generation and never reopens', async event => {
		const { vault, owners, server, listener } = await fixture();
		const lease = await owners.acquire(vault, 'instance');
		leases.push(lease);
		if (event === 'error') {
			server.emit('error', new Error('injected transport failure'));
			expect(lease.lost.aborted).toBe(true);
		} else {
			await new Promise<void>(resolve => server.close(() => resolve()));
			expect(lease.lost.aborted).toBe(true);
		}
		await expect(lease.assertHeld()).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'listener-lost' });
		expect(listener).toHaveBeenCalledOnce();
	});

	test('assertHeld revalidates physical Vault and its own life after the async check', async () => {
		const { vault, owners, vaultRoot, directories, server } = await fixture();
		const lease = await owners.acquire(vault, 'instance');
		leases.push(lease);
		const assert = vi.spyOn(directories, 'assertVault');
		let release!: () => void;
		assert.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
		const pending = lease.assertHeld();
		server.emit('error', new Error('lost while checking'));
		release();
		await expect(pending).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'listener-lost' });
		const other = path.join(vaultRoot, 'different-root');
		await mkdir(other);
		await expect(createWriterOwner(directories).acquire({ ...vault, rootPath: other }, 'other')).rejects.toMatchObject({ code: 'SCOPE_MISMATCH' });
	});

	test('connections are destroyed without parsing or returning data, while the writer remains held', async () => {
		const { vault, owners } = await fixture();
		const lease = await owners.acquire(vault, 'instance');
		leases.push(lease);
		const received: Buffer[] = [];
		await new Promise<void>((resolve, reject) => {
			const socket = createConnection({ host: '127.0.0.1', port: lease.port });
			socket.on('data', value => received.push(value));
			socket.on('error', error => { if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(error); });
			socket.on('close', () => resolve());
			socket.on('connect', () => socket.write('GET /spaces HTTP/1.1\r\n\r\n'));
		});
		expect(received).toEqual([]);
		await expect(lease.assertHeld()).resolves.toBeUndefined();
	});

	test('physical Vault replacement rejects the held lease without reopening or transferring its port', async () => {
		const { vaultRoot, vault, owners, server, listener, ports } = await fixture();
		const lease = await owners.acquire(vault, 'instance');
		leases.push(lease);
		const previous = `${vaultRoot}-previous`;
		await rename(vaultRoot, previous);
		roots.push(previous);
		await mkdir(vaultRoot);
		await expect(lease.assertHeld()).rejects.toMatchObject({ code: 'SCOPE_MISMATCH', reason: 'vault-changed' });
		expect(server.listening).toBe(true);
		expect(listener).toHaveBeenCalledOnce();
		expect(lease.port).toBe(await ports(vault.deviceId, vault.root));
	});
});

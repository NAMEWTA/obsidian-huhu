import { createServer } from 'node:net';
import type { WriterPortProvider } from './writer-owner';

/** Asks the OS for a currently free loopback port; there is a tiny reuse window, which acquire() reports as port-in-use. */
export async function probeFreePort(): Promise<number> {
	return await new Promise<number>((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
			const address = server.address();
			server.close(() => (address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port'))));
		});
	});
}

/** Test-only provider: one stable OS-assigned free port per (device, directory), so a foreign process on the hashed port cannot fail a test. */
export function freeWriterPorts(): WriterPortProvider {
	const ports = new Map<string, Promise<number>>();
	return (deviceId, root) => {
		const key = `${deviceId}:${root.dev}:${root.ino}`;
		let port = ports.get(key);
		if (!port) { port = probeFreePort(); ports.set(key, port); }
		return port;
	};
}

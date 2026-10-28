import { createHash } from 'node:crypto';
import { createServer, type Server, type Socket } from 'node:net';
import { SpaceError } from '../../../core/space/errors';
import type { PhysicalDirectory } from '../../../core/space/model';
import type { DirectoryPort, WriterLease, WriterOwnerPort } from '../../../core/space/ports';

/** One fixed protocol key and range across instances; collisions deliberately fail closed. */
export function writerPort(deviceId: string, root: PhysicalDirectory): number {
	const key = JSON.stringify(['huhu-space-writer', deviceId, root.dev, root.ino]);
	return 16384 + createHash('sha256').update(key).digest().readUInt32BE(0) % 49152;
}

type ListenerState = 'acquiring' | 'held' | 'failed' | 'closing' | 'closed';

/** Test seam: `port` replaces the hashed derivation; production never passes it. */
export type WriterPortProvider = (deviceId: string, root: PhysicalDirectory) => number | Promise<number>;

export function createWriterOwner(directories: Pick<DirectoryPort, 'assertVault'>, listener: () => Server = createServer, portFor: WriterPortProvider = writerPort): WriterOwnerPort {
	return {
		acquire: async (vault, instanceId) => {
			if (!instanceId) throw new SpaceError('INVALID_ARGUMENT', 'invalid-instance');
			await directories.assertVault(vault);
			const port = await portFor(vault.deviceId, vault.root);
			const server = listener();
			const lost = new AbortController();
			const sockets = new Set<Socket>();
			let state: ListenerState = 'acquiring';
			let closed: Promise<void> | undefined;
			const fail = (cause?: unknown) => {
				state = 'failed';
				lost.abort(new SpaceError('OWNER_CONFLICT', 'listener-lost', { port }, cause));
			};
			server.on('error', fail);
			server.on('close', () => {
				if (state !== 'closing' && state !== 'closed') fail();
				else state = 'closed';
			});
			server.maxConnections = 1;
			server.on('connection', socket => {
				sockets.add(socket);
				socket.once('close', () => sockets.delete(socket));
				socket.on('error', () => socket.destroy());
				socket.unref();
				socket.destroy();
			});
			const close = (): Promise<void> => {
				if (closed) return closed;
				state = 'closing';
				for (const socket of sockets) socket.destroy();
				closed = new Promise<void>((resolve, reject) => {
					server.close(error => {
						state = 'closed';
						if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
							reject(new SpaceError('OWNER_CONFLICT', 'listener-close-failed', { port }, error));
						} else resolve();
					});
				});
				return closed;
			};
			try {
				await new Promise<void>((resolve, reject) => {
					const cleanup = () => {
						server.removeListener('listening', ready);
						server.removeListener('error', rejected);
						server.removeListener('close', ended);
					};
					const rejected = (error: unknown) => {
						cleanup();
						reject(new SpaceError('OWNER_CONFLICT', (error as NodeJS.ErrnoException).code === 'EADDRINUSE' ? 'port-in-use' : 'listener-lost', { port }, error));
					};
					const ended = () => { cleanup(); reject(new SpaceError('OWNER_CONFLICT', 'listener-lost', { port })); };
					const ready = () => { cleanup(); state = 'held'; resolve(); };
					server.once('listening', ready);
					server.once('error', rejected);
					server.once('close', ended);
					// exclusive prevents cluster handle sharing; it is not Windows SO_EXCLUSIVEADDRUSE.
					try { server.listen({ host: '127.0.0.1', port, exclusive: true }); server.unref(); }
					catch (error) { rejected(error); }
				});
				const checkLife = () => {
					if (lost.signal.aborted) throw lost.signal.reason as SpaceError;
					if (state !== 'held') throw new SpaceError('OWNER_CONFLICT', 'lease-closed', { port });
					if (!server.listening) { fail(); throw lost.signal.reason as SpaceError; }
				};
				const lease: WriterLease = {
					instanceId, port, lost: lost.signal, close,
					assertHeld: async () => {
						checkLife();
						await directories.assertVault(vault);
						checkLife();
					},
				};
				await lease.assertHeld();
				return lease;
			} catch (error) {
				await close();
				throw error;
			}
		},
	};
}

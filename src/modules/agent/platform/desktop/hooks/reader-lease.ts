import { createHash } from 'node:crypto';
import { createServer } from 'node:net';

/** Kernel ownership serializes all v2 generations; an unrelated port collision fails closed. */
export async function readerLease(root: string, dev: bigint, ino: bigint): Promise<{ assertHeld(): void; close(): Promise<void> }> {
	const port = 16384 + createHash('sha256').update(JSON.stringify(['huhu-hook-reader-v2', root, String(dev), String(ino)])).digest().readUInt32BE(0) % 49152;
	const server = createServer(socket => { socket.on('error', () => socket.destroy()); socket.destroy(); });
	server.maxConnections = 1;
	let failure: unknown, closing: Promise<void> | undefined;
	server.on('error', error => { failure = error; });
	server.on('close', () => { if (!closing) failure = new Error('hookReaderLeaseLost'); });
	const close = (): Promise<void> => {
		if (closing) return closing;
		closing = new Promise<void>((resolve, reject) => {
			server.close(error => {
				if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
				else resolve();
			});
		});
		return closing;
	};
	try {
		await new Promise<void>((resolve, reject) => {
			const ready = () => { server.removeListener('error', reject); resolve(); };
			server.once('error', reject);
			server.once('listening', ready);
			server.listen({ host: '127.0.0.1', port, exclusive: true });
			server.unref();
		});
		return {
			assertHeld: () => {
				if (failure || closing || !server.listening) throw new Error('hookReaderLeaseLost', { cause: failure });
			},
			close,
		};
	} catch (error) {
		await close();
		throw new Error((error as NodeJS.ErrnoException).code === 'EADDRINUSE' ? 'hookReaderBusy' : 'hookReaderLeaseUnavailable', { cause: error });
	}
}

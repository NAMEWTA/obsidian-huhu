import type { WriterLease } from '../../../core/space/ports';
import { SpaceError } from '../../../core/space/errors';
import { createDesktopSpacePorts } from './ports';

const [vaultRoot = '', vaultId = '', deviceId = '', instanceId = '', mode = 'hold', fixedPort = ''] = process.argv.slice(2);
const ports = createDesktopSpacePorts({ vaultRoot, vaultId, deviceId, win: { require: () => { throw new Error('unexpected chooser access'); } } as unknown as Window, ...(fixedPort ? { writerPort: () => Number(fixedPort) } : {}) });
let lease: WriterLease | undefined;
const reportFailure = (error: unknown) => {
	process.send?.({ type: 'failed', code: error instanceof SpaceError ? error.code : 'UNEXPECTED', reason: error instanceof SpaceError ? error.reason : String(error) });
	process.exitCode = 1;
	process.disconnect?.();
};
if (mode === 'hold') {
	process.on('message', message => {
		if (message === 'close') {
			void lease?.close().then(() => {
				process.send?.({ type: 'closed' });
				process.disconnect?.();
			}, reportFailure);
		}
	});
}
void (async () => {
	const vault = await ports.directories.inspectVault();
	if (mode === 'inspect') {
		process.send?.({ type: 'inspected' });
		return;
	}
	lease = await ports.owners.acquire(vault, instanceId);
	process.send?.({ type: 'held', port: lease.port });
})().catch(reportFailure);

import type { DirectoryPort, WriterOwnerPort } from '../../../core/space/ports';
import { createDirectoryPort } from './directories';
import { createWriterOwner, type WriterPortProvider } from './writer-owner';

interface SpacePortsOptions {
	readonly vaultRoot: string;
	readonly vaultId: string;
	readonly deviceId: string;
	readonly win: Window;
	/** Test seam only; production uses the hashed writer port. */
	readonly writerPort?: WriterPortProvider;
}
interface DirectoryRemote {
	getCurrentWindow(): unknown;
	dialog: { showOpenDialog(owner: unknown, options: { properties: ['openDirectory'] }): Promise<{ canceled: boolean; filePaths: string[] }> };
}

export function createDesktopSpacePorts(options: SpacePortsOptions): { directories: DirectoryPort; owners: WriterOwnerPort } {
	const directories = createDirectoryPort({
		...options,
		chooseDirectory: async () => {
			const remote = options.win.require('@electron/remote') as DirectoryRemote;
			const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] });
			return result.canceled ? undefined : result.filePaths[0];
		},
	});
	return { directories, owners: createWriterOwner(directories, undefined, options.writerPort) };
}

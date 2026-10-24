import { constants } from 'node:fs';
import { copyFile, chmod } from 'node:fs/promises';
import { absoluteHuhuPath, absoluteVaultPath } from './huhu-paths';
import { chmodAllowed, PRIVATE_FILE_MODE } from './private-mode';

/** COPYFILE_EXCL is checked by the filesystem at the destination commit. */
export async function copyContentExclusive(root: string, source: string, target: string): Promise<void> {
	const from = await absoluteVaultPath(root, source), to = await absoluteHuhuPath(root, target);
	await copyFile(from, to, constants.COPYFILE_EXCL);
	if (chmodAllowed(process.platform)) await chmod(to, PRIVATE_FILE_MODE);
}

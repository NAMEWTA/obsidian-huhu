import { shell } from 'electron';

/** Move a folder to the system trash; rejects when the system has none. */
export async function trashFolder(dir: string): Promise<void> {
	await (shell as unknown as { trashItem(path: string): Promise<void> }).trashItem(dir);
}

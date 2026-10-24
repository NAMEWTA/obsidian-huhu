// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { FileSystemAdapter, type App } from 'obsidian';
import { t } from '../../../../shared/i18n';

/** The two methods of Obsidian's `App` that hand a vault path to the system. Neither is public API. */
type SystemApp = App & {
	showInFolder?: (path: string) => unknown;
	openWithDefaultApp?: (path: string) => unknown;
};

/** The absolute path of a vault entry, or an error when the vault is not on the local file system. */
function absolutePath(app: App, path: string): string {
	const adapter = app.vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) throw new Error(t('navigator.noSystemPath'));
	return adapter.getFullPath(path === '/' ? '' : path);
}

/**
 * Show a vault file or folder in the system file manager (`'/'` or `''` is the vault folder itself). Uses Obsidian's
 * own `showInFolder`, which is also behind its file list's "Show in system explorer"; where a version lacks it, falls
 * back to Electron's `shell.showItemInFolder` on the absolute path.
 */
export async function showInSystemExplorer(app: App, path: string): Promise<void> {
	const host = app as SystemApp;
	const vaultPath = path === '/' ? '' : path;
	if (typeof host.showInFolder === 'function') {
		await host.showInFolder(vaultPath);
		return;
	}
	const target = absolutePath(app, vaultPath);
	const { shell } = await import('electron');
	(shell as typeof shell & { showItemInFolder(path: string): void }).showItemInFolder(target);
}

/** Open a vault file with the system's default application for its type. */
export async function openInDefaultApp(app: App, path: string): Promise<void> {
	const host = app as SystemApp;
	if (typeof host.openWithDefaultApp === 'function') {
		await host.openWithDefaultApp(path);
		return;
	}
	const target = absolutePath(app, path);
	const { shell } = await import('electron');
	const failure = await shell.openPath(target);
	if (failure) throw new Error(failure);
}

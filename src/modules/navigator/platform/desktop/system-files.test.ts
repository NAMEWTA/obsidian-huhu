// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { beforeEach, expect, test, vi } from 'vitest';
import { FileSystemAdapter, type App } from 'obsidian';
import { setLanguage } from '../../../../shared/i18n';

// Never launches anything: the Electron shell is replaced by spies.
const shell = vi.hoisted(() => ({ showItemInFolder: vi.fn(), openPath: vi.fn(() => Promise.resolve('')) }));
vi.mock('electron', () => ({ shell }));
import { openInDefaultApp, showInSystemExplorer } from './system-files';

beforeEach(() => { shell.showItemInFolder.mockClear(); shell.openPath.mockReset(); shell.openPath.mockResolvedValue(''); setLanguage('en'); });

const local = () => Object.assign(Object.create(FileSystemAdapter.prototype) as FileSystemAdapter, { getFullPath: (path: string) => `/vaults/main/${path}`.replace(/\/$/, '') });
const appWith = (extra: Record<string, unknown>, adapter: unknown = local()) => ({ vault: { adapter }, ...extra }) as unknown as App;

test("Obsidian's own showInFolder gets the vault path, and the vault folder is the empty path", async () => {
	const showInFolder = vi.fn();
	const app = appWith({ showInFolder });
	await showInSystemExplorer(app, 'Work/a.md');
	await showInSystemExplorer(app, '/');
	expect(showInFolder.mock.calls).toEqual([['Work/a.md'], ['']]);
	expect(shell.showItemInFolder).not.toHaveBeenCalled();
});

test('a version without showInFolder falls back to the shell with the absolute path', async () => {
	await showInSystemExplorer(appWith({}), 'Work/a.md');
	await showInSystemExplorer(appWith({}), '/');
	expect(shell.showItemInFolder.mock.calls).toEqual([['/vaults/main/Work/a.md'], ['/vaults/main']]);
});

test('a vault that is not on the local file system cannot be shown', async () => {
	await expect(showInSystemExplorer(appWith({}, {}), 'Work/a.md')).rejects.toThrow('not on the local file system');
	expect(shell.showItemInFolder).not.toHaveBeenCalled();
});

test('open in the default app uses Obsidian first and the shell second', async () => {
	const openWithDefaultApp = vi.fn();
	await openInDefaultApp(appWith({ openWithDefaultApp }), 'Files/report.pdf');
	expect(openWithDefaultApp.mock.calls).toEqual([['Files/report.pdf']]);
	expect(shell.openPath).not.toHaveBeenCalled();
	await openInDefaultApp(appWith({}), 'Files/report.pdf');
	expect(shell.openPath.mock.calls).toEqual([['/vaults/main/Files/report.pdf']]);
	shell.openPath.mockResolvedValue('no application');
	await expect(openInDefaultApp(appWith({}), 'Files/report.pdf')).rejects.toThrow('no application');
});

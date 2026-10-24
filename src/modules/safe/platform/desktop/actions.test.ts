import { afterEach, describe, expect, test, vi } from 'vitest';
import { link, lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDesktopActions, exportCiphertext, validateExportTarget } from './actions';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function fixture() {
	const root = await mkdtemp(path.join(os.tmpdir(), 'huhu-safe-actions-'));
	roots.push(root);
	const safe = path.join(root, '.huhu', 'safe'), outside = path.join(root, 'exports');
	await mkdir(safe, { recursive: true });
	await mkdir(outside);
	await writeFile(path.join(safe, 'vault.enc'), 'primary cipher');
	await writeFile(path.join(safe, 'vault.enc.backup'), 'backup cipher');
	return { root, safe, outside };
}

describe('encrypted export boundaries', () => {
	test('writes and verifies a user-selected external file without touching managed files', async () => {
		const { root, safe, outside } = await fixture();
		const target = path.join(outside, 'my safe.enc');
		await writeFile(target, 'old exported cipher');
		await exportCiphertext(root, target, 'complete encrypted container');
		expect(await readFile(target, 'utf8')).toBe('complete encrypted container');
		expect(await readFile(path.join(safe, 'vault.enc'), 'utf8')).toBe('primary cipher');
		expect(await readdir(outside)).toEqual(['my safe.enc']);
	});

	test('rejects every export destination inside managed safe storage', async () => {
		const { root, safe } = await fixture();
		for (const name of ['vault.enc', 'vault.enc.backup', 'new-export.enc']) {
			await expect(validateExportTarget(root, path.join(safe, name))).rejects.toMatchObject({ code: 'export-target' });
		}
		await expect(validateExportTarget(root, '.huhu/safe/vault.enc')).rejects.toMatchObject({ code: 'export-target' });
	});

	test('rejects hardlink aliases of both the primary and its backup', async () => {
		const { root, safe, outside } = await fixture();
		for (const name of ['vault.enc', 'vault.enc.backup']) {
			const alias = path.join(outside, name);
			await link(path.join(safe, name), alias);
			await expect(exportCiphertext(root, alias, 'candidate cipher')).rejects.toMatchObject({ code: 'export-target' });
		}
		expect(await readFile(path.join(safe, 'vault.enc'), 'utf8')).toBe('primary cipher');
	});

	test.skipIf(process.platform === 'win32')('rejects symlink aliases to the safe directory or active files', async () => {
		const { root, safe, outside } = await fixture();
		const directoryAlias = path.join(outside, 'managed');
		await symlink(safe, directoryAlias, 'dir');
		await expect(validateExportTarget(root, path.join(directoryAlias, 'export.enc'))).rejects.toMatchObject({ code: 'export-target' });
		const fileAlias = path.join(outside, 'alias.enc');
		await symlink(path.join(safe, 'vault.enc'), fileAlias);
		await expect(validateExportTarget(root, fileAlias)).rejects.toMatchObject({ code: 'export-target' });
	});

	test.skipIf(process.platform === 'win32')('replaces an ordinary external symlink itself, without writing through it', async () => {
		const { root, outside } = await fixture();
		const original = path.join(outside, 'original.enc'), chosen = path.join(outside, 'chosen.enc');
		await writeFile(original, 'other external data');
		await symlink(original, chosen);
		await exportCiphertext(root, chosen, 'export cipher');
		expect((await lstat(chosen)).isSymbolicLink()).toBe(false);
		expect(await readFile(chosen, 'utf8')).toBe('export cipher');
		expect(await readFile(original, 'utf8')).toBe('other external data');
	});
});

describe('native actions', () => {
	test('uses the owning window and awaits promise-based clipboard operations', async () => {
		const { root } = await fixture();
		const native = {
			clipboard: { readText: vi.fn(async () => 'clipboard text'), writeText: vi.fn(async (_value: string) => {}) },
			shell: { openExternal: vi.fn(async (_url: string) => {}) },
		};
		const require = vi.fn(() => native);
		const actions = createDesktopActions(root, { require } as unknown as Window);
		expect(await actions.clipboard.readText()).toBe('clipboard text');
		await actions.clipboard.writeText('copied value');
		expect(native.clipboard.writeText).toHaveBeenCalledWith('copied value');
		expect(require).toHaveBeenCalledWith('@electron/remote');
		await actions.openUrl('example.com/account');
		expect(native.shell.openExternal).toHaveBeenCalledWith('https://example.com/account');
		for (const url of ['', 'javascript:alert(1)', 'file:///private', 'not a website']) {
			await expect(actions.openUrl(url)).rejects.toMatchObject({ code: 'invalid-url' });
		}
		expect(native.shell.openExternal).toHaveBeenCalledTimes(1);
	});

	test('native cancellation has no file side effects and never invents a path', async () => {
		const { root, outside } = await fixture();
		const native = {
			getCurrentWindow: () => ({}),
			dialog: {
				showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
				showSaveDialog: async () => ({ canceled: true }),
			},
		};
		const actions = createDesktopActions(root, { require: () => native } as unknown as Window);
		expect(await actions.pickBackup()).toBeNull();
		expect(await actions.pickExport()).toBeNull();
		expect(await readdir(outside)).toEqual([]);
	});

	test('returns selected ciphertext without writing or exposing the chosen path in errors', async () => {
		const { root, outside } = await fixture();
		const backup = path.join(outside, 'selected.enc');
		await writeFile(backup, 'selected cipher');
		const native = {
			getCurrentWindow: () => ({}),
			dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [backup] }) },
			clipboard: { readText: () => { throw new Error('private/path secret'); } },
		};
		const actions = createDesktopActions(root, { require: () => native } as unknown as Window);
		expect(await actions.pickBackup()).toBe('selected cipher');
		await expect(actions.clipboard.readText()).rejects.toMatchObject({ code: 'storage', message: 'storage' });
	});
});

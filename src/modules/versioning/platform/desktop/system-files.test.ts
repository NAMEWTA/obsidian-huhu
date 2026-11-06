import { mkdtemp, mkdir, rm, symlink, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { openWorktreeInSystem } from './system-files';

test('system opening is bound to an ordinary current file and rejects traversal, missing, directory and symlink escapes', async () => {
	const parent = await mkdtemp(path.join(tmpdir(), 'huhu-system-open-'));
	try {
		const root = path.join(parent, 'repo');
		await mkdir(root);
		await mkdir(path.join(root, 'folder'));
		await writeFile(path.join(root, 'file.bin'), new Uint8Array([0, 1, 2]));
		await writeFile(path.join(parent, 'outside.bin'), 'outside');
		const open = vi.fn(async () => '');
		await openWorktreeInSystem(root, 'file.bin', open);
		expect(open).toHaveBeenCalledExactlyOnceWith(await realpath(path.join(root, 'file.bin')));
		for (const invalid of ['../outside.bin', '/outside.bin', 'C:\\outside.bin', 'missing', 'folder'])
			await expect(openWorktreeInSystem(root, invalid, open)).rejects.toThrow();
		if (process.platform !== 'win32') {
			await symlink(path.join(parent, 'outside.bin'), path.join(root, 'escape.bin'));
			await symlink(parent, path.join(root, 'escape-folder'));
			await symlink(path.join(root, 'file.bin'), path.join(root, 'internal-link.bin'));
			for (const invalid of ['escape.bin', 'escape-folder/outside.bin', 'internal-link.bin'])
				await expect(openWorktreeInSystem(root, invalid, open)).rejects.toThrow('outside-index');
		}
		expect(open).toHaveBeenCalledOnce();
		await expect(openWorktreeInSystem(root, 'file.bin', async () => 'system failure')).rejects.toThrow(
			'system failure',
		);
	} finally {
		await rm(parent, { recursive: true, force: true });
	}
});

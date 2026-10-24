import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GitHost } from '../../core/ports';
import { createGitRunner, machineName } from './git-runner';
import { locateGit, locateRepo } from './locate';
import { cloneRepository } from './clone';
import type { TextStorage } from '../../../../shared/storage/ports';
import { nativeVaultStorage } from '../../../../host/desktop/vault-storage';
import { SyncDeviceStore } from './device-state';
import { protectRepository } from './repository-protection';

/** Git sync on a desktop: the system git, run in the vault folder. */
export function desktopGitHost(
	vaultRoot: string,
	device: string,
	storage: TextStorage = nativeVaultStorage(vaultRoot),
	configDir = '',
): GitHost {
	const state = new SyncDeviceStore(storage, vaultRoot, device);
	return {
		locate: locateGit,
		place: (binary, subPath) => locateRepo(binary, vaultRoot, subPath),
		runner: createGitRunner,
		clone: (binary, target, source, options) => cloneRepository(binary, vaultRoot, target, source, options),
		hostname: machineName,
		loadDevice: (cwd, legacy) => state.load(cwd, legacy),
		saveDevice: (cwd, base, value) => state.save(cwd, base, value),
		resolve: (cwd, relative) => path.resolve(cwd, relative),
		editText,
		async protectRepository(binary, cwd, signal) {
			const relative = path.relative(vaultRoot, cwd);
			const place = await locateRepo(binary, vaultRoot, relative);
			if (!place.root || place.root !== cwd) throw new Error('huhu-storage.invalid-repository');
			return protectRepository(binary, vaultRoot, cwd, configDir, editText, signal);
		},
	};
}

async function editText(absolute: string, update: (current: string) => string): Promise<boolean> {
	let current = '';
	try {
		current = await readFile(absolute, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
	const next = update(current);
	if (next === current) return false;
	await mkdir(path.dirname(absolute), { recursive: true });
	await writeFile(absolute, next, 'utf8');
	return true;
}

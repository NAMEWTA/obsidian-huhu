import { Platform } from 'obsidian';
import { t } from '../../../../../shared/i18n/index';
import { isCwdInsideVault } from './scope';

/** Validate real directories at the execution boundary, including symlink escapes. */
export async function canonicalVaultCwd(vault: string, cwd: string): Promise<string> {
	if (!Platform.isDesktop) throw new Error(t('agent.sessionMissing'));
	const fs = window.require('node:fs/promises') as typeof import('node:fs/promises');
	const process = window.require('node:process') as typeof import('node:process');
	const [root, target] = await Promise.all([fs.realpath(vault), fs.realpath(cwd)]);
	if (!isCwdInsideVault(root, target, process.platform) || !(await fs.stat(target)).isDirectory())
		throw new Error(t('agent.outsideVault'));
	return target;
}

/** The real spelling of an existing path (resolving symlinks and Windows 8.3 short names), else the path as given. */
export async function realPathOr(value: string): Promise<string> {
	const fs = window.require('node:fs/promises') as typeof import('node:fs/promises');
	try {
		return await fs.realpath(value);
	} catch {
		return value;
	}
}

/** Compare two filesystem spellings of one file (symlinked roots, trailing separators, case on Windows). */
export async function samePath(left: string, right: string): Promise<boolean> {
	if (left === right) return true;
	if (!left || !right) return false;
	const fs = window.require('node:fs/promises') as typeof import('node:fs/promises');
	const process = window.require('node:process') as typeof import('node:process');
	const fold = (value: string) => (process.platform === 'win32' ? value.toLowerCase() : value);
	const real = async (value: string) => {
		try {
			return await fs.realpath(value);
		} catch {
			return value;
		}
	};
	return fold(await real(left)) === fold(await real(right));
}

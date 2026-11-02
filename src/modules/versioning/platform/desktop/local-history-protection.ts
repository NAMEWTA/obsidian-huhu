import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { VERSIONING_RECOVERY_ROOT } from '../../../../shared/storage/vault-layout';
import { GitRepo } from '../../core/repo';
import { createGitRunner } from './git-runner';
import { locateGit } from './locate';

/** Read-only preflight for the repository containing recovery, independently of the configured sync subfolder. */
export async function assertLocalHistoryProtection(vaultRoot: string, preferredGit: string, signal?: AbortSignal): Promise<void> {
	signal?.throwIfAborted();
	const vault = await realpath(vaultRoot);
	let cursor = vault, found = false;
	for (;;) {
		signal?.throwIfAborted();
		try { await lstat(path.join(cursor, '.git')); found = true; break; }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
	signal?.throwIfAborted();
	if (!found) return;
	const git = await locateGit(preferredGit, signal);
	if (!git) throw new Error('versioning.localHistory.protection');
	const runner = createGitRunner(git.binary, cursor);
	try {
		const repo = new GitRepo(runner);
		const root = (await repo.git(['rev-parse', '--show-toplevel'], { signal })).stdout.trim();
		const recovery = path.relative(root, path.join(vault, VERSIONING_RECOVERY_ROOT)).split(path.sep).join('/');
		const tracked = await repo.git(['ls-files', '-z', '--', `:(literal)${recovery}`], { signal, env: { GIT_OPTIONAL_LOCKS: '0' } });
		const ignored = await repo.git(['check-ignore', '--no-index', '-q', '--', `${recovery}/`], { signal, allow: [1] });
		if (tracked.stdout || ignored.code !== 0) throw new Error('versioning.localHistory.protection');
	} finally { runner.dispose(); }
}

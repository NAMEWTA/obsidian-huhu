import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { assertHistoryPath } from '../../core/repo';
import { GitError } from '../../core/errors';

/** Open only a real current worktree file. Historical objects are never treated as paths. */
export async function openWorktreeInSystem(
	root: string,
	repoPath: string,
	openPath?: (absolute: string) => Promise<string>,
): Promise<void> {
	assertHistoryPath(repoPath);
	const canonicalRoot = await realpath(root),
		absolute = path.resolve(canonicalRoot, repoPath);
	const within = (candidate: string) => {
		const relative = path.relative(canonicalRoot, candidate);
		return !!relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
	};
	if (!within(absolute)) throw new GitError('outside-index');
	const before = await lstat(absolute);
	if (!before.isFile() || before.isSymbolicLink()) throw new GitError('outside-index');
	const canonicalFile = await realpath(absolute);
	if (!within(canonicalFile)) throw new GitError('outside-index');
	const after = await lstat(canonicalFile);
	if (!after.isFile() || after.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino)
		throw new GitError('outside-index');
	const action = openPath ?? (await import('electron')).shell.openPath;
	const error = await action(canonicalFile);
	if (error) throw new GitError('unknown', error);
}

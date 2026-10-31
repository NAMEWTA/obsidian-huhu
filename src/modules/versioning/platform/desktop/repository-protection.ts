import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { GIT_UNTRACK_RECOVERY_ROOT } from '../../../../shared/storage/vault-layout';
import { GitError } from '../../core/errors';
import { safeRepoPath } from '../../core/ports';
import { repositoryIgnorePatterns, withManagedExcludes } from '../../core/excludes';
import { gitEnvironment } from './git-environment';

/** Back up the index AND private staged blobs: a staged value may differ from both HEAD and the working file. */
export async function protectRepository(
	binary: string,
	vault: string,
	cwd: string,
	configDir: string,
	edit: (file: string, update: (text: string) => string) => Promise<boolean>,
	signal?: AbortSignal,
) {
	if (signal?.aborted) throw new GitError('cancelled');
	const git = (args: string[]) =>
		new Promise<Buffer>((resolve, reject) => {
			execFile(
				binary,
				args,
				{
					cwd,
					env: gitEnvironment(undefined, cwd),
					windowsHide: true,
					timeout: 30_000,
					maxBuffer: 64 * 1024 * 1024,
					encoding: 'buffer',
					signal,
				},
				(error, stdout) => (error ? reject(new Error(error.message)) : resolve(stdout)),
			);
		});
	const config = path.relative(cwd, path.join(vault, configDir)).split(path.sep).join('/');
	const patterns = repositoryIgnorePatterns(config);
	const ignore = path.join(cwd, '.gitignore');
	try {
		if ((await lstat(ignore)).isSymbolicLink()) throw new GitError('index-failed', 'Linked .gitignore');
	} catch (error) {
		if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
	}
	await edit(ignore, (text) => withManagedExcludes(text, patterns));
	const exclude = (await git(['rev-parse', '--git-path', 'info/exclude'])).toString().trim();
	await edit(path.resolve(cwd, exclude), (text) => withManagedExcludes(text, patterns));
	const removed = (await git(['ls-files', '--cached', '--ignored', '-z', ...patterns.map((p) => `--exclude=${p}`)]))
		.toString()
		.split('\0')
		.filter(Boolean);
	if (!removed.length) return { removed };
	if (removed.some((file) => safeRepoPath(file) !== file)) throw new GitError('outside-index');
	const indexPath = path.resolve(cwd, (await git(['rev-parse', '--git-path', 'index'])).toString().trim());
	const index = await readFile(indexPath);
	const relative = `${GIT_UNTRACK_RECOVERY_ROOT}/${randomUUID()}`;
	const recovery = await absoluteHuhuPath(vault, relative);
	await mkdir(recovery, { recursive: true, mode: 0o700 });
	const selected = new Set(removed);
	const entries: { path: string; mode: string; oid: string; stage: string; blob?: string }[] = [];
	for (const line of (await git(['ls-files', '--stage', '-z'])).toString().split('\0').filter(Boolean)) {
		const tab = line.indexOf('\t'),
			file = line.slice(tab + 1);
		if (!selected.has(file)) continue;
		const [mode = '', oid = '', stage = ''] = line.slice(0, tab).split(' ');
		if (stage !== '0') throw new GitError('conflict');
		const blob = mode === '160000' ? undefined : (await git(['cat-file', 'blob', oid])).toString('base64');
		entries.push({ path: file, mode, oid, stage, blob });
	}
	const manifest = JSON.stringify({ version: 1, cwd, createdAt: new Date().toISOString(), entries }, null, 2);
	await writeFile(path.join(recovery, 'index'), index, { mode: 0o600 });
	await writeFile(path.join(recovery, 'manifest.json'), manifest, { mode: 0o600 });
	if (
		!(await readFile(path.join(recovery, 'index'))).equals(index) ||
		(await readFile(path.join(recovery, 'manifest.json'), 'utf8')) !== manifest
	)
		throw new GitError('index-failed', 'Recovery verification failed');
	if (!(await readFile(indexPath)).equals(index)) throw new GitError('locked');
	// Serialize installation with every normal Git index writer. Mutate a private index copy, then install atomically.
	const lockPath = `${indexPath}.lock`;
	const indexMode = (await lstat(indexPath)).mode & 0o777;
	const lock = await open(lockPath, 'wx', 0o600).catch(() => {
		throw new GitError('locked');
	});
	let installed = false;
	try {
		if (!(await readFile(indexPath)).equals(index)) throw new GitError('locked');
		const temporary = path.join(recovery, 'working-index');
		await writeFile(temporary, index, { mode: 0o600 });
		await new Promise<void>((resolve, reject) => {
			const child = execFile(
				binary,
				[
					'--literal-pathspecs',
					'rm',
					'--cached',
					'-f',
					'--ignore-unmatch',
					'--pathspec-from-file=-',
					'--pathspec-file-nul',
				],
				{
					cwd,
					env: { ...gitEnvironment(undefined, cwd), GIT_INDEX_FILE: temporary },
					windowsHide: true,
					timeout: 30_000,
					signal,
				},
				(error) => (error ? reject(new Error(error.message)) : resolve()),
			);
			child.stdin?.on('error', () => {});
			child.stdin?.end(removed.join('\0') + '\0');
		});
		if (signal?.aborted) throw new GitError('cancelled');
		const next = await readFile(temporary);
		await lock.chmod(indexMode);
		await lock.writeFile(next);
		await lock.sync();
		await lock.close();
		await rename(lockPath, indexPath);
		installed = true;
		await unlink(temporary).catch(() => {});
	} finally {
		await lock.close().catch(() => {});
		if (!installed) await unlink(lockPath).catch(() => {});
	}
	return { removed, recovery: relative };
}

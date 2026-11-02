import { classifyGitOutput, detailOf, GitError, rawOf } from './errors';
import type { RefEntry } from './refs';
import { pathWithinScope, safeRepoPath, type GitResult, type GitRunner, type GitRunOptions } from './ports';
import { parsePathList, parseStatus, type RepoStatus } from './status';
import type { FileHistoryEntry, FileHistoryPage, HistoryOptions, RevisionFileChange } from './history';

/** A merge, rebase, cherry-pick or revert that stopped and waits for the user. */
export type RepoOperation = 'merge' | 'rebase' | 'cherry-pick' | 'revert';

export interface Upstream {
	remote: string;
	/** Full ref on the remote, e.g. `refs/heads/main`. */
	ref: string;
}

export interface Commit {
	hash: string;
	short: string;
	author: string;
	/** Unix seconds. */
	time: number;
	subject: string;
}

/** A commit with the parents the graph is drawn from. */
export interface GraphCommit extends Commit {
	parents: string[];
}

/** Which commits the history graph lists. */
export interface GraphQuery {
	/** `all`: every local branch and tag (and remote branches when `remotes`); `current`: what HEAD reaches. */
	branches: 'all' | 'current';
	remotes: boolean;
	/** Matches commit messages, case-insensitively and literally. */
	search?: string;
	/** Selected branch tip. UI pins the ref's object id so subsequent pages keep the same history. */
	ref?: string;
}

export interface CommitDetail {
	hash: string;
	author: string;
	email: string;
	/** Unix seconds. */
	time: number;
	parents: string[];
	/** The full message (subject and body). */
	message: string;
}

export interface CommitFile {
	status: string;
	path: string;
	from?: string;
}

/** Network operations may move large attachments. */
export const NETWORK_TIMEOUT = 10 * 60_000;

/** Typed git commands for one repository. Every method runs git through the runner; nothing here touches the host. */
export class GitRepo {
	constructor(
		private readonly runner: GitRunner,
		private readonly scope = '.',
	) {}

	/** Run git; a non-zero exit (other than `allow`) becomes a classified `GitError`. */
	async git(
		args: readonly string[],
		options: GitRunOptions & { allow?: readonly number[] } = {},
	): Promise<GitResult> {
		const result = await this.runner.run(args, options);
		if (result.code !== 0 && !options.allow?.includes(result.code))
			throw new GitError(
				classifyGitOutput(`${result.stderr}\n${result.stdout}`),
				detailOf(result.stdout, result.stderr),
				rawOf(result.stdout, result.stderr),
			);
		return result;
	}

	async status(): Promise<RepoStatus> {
		// Optional locks off: a status refresh never takes index.lock away from another git process.
		const result = await this.git(['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all'], {
			env: { GIT_OPTIONAL_LOCKS: '0' },
		});
		return parseStatus(result.stdout);
	}

	/** The stopped operation, if any, and whether another git process holds the index lock. */
	async state(): Promise<{ operation: RepoOperation | null; locked: boolean }> {
		const names = ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'index.lock'];
		const result = await this.git(['rev-parse', ...names.flatMap((name) => ['--git-path', name])]);
		const paths = result.stdout.split(/\r?\n/).filter(Boolean);
		const exists = await Promise.all(paths.map((path) => this.runner.exists(path)));
		const [merge, rebaseMerge, rebaseApply, cherryPick, revert, lock] = exists;
		const operation: RepoOperation | null =
			rebaseMerge || rebaseApply
				? 'rebase'
				: merge
					? 'merge'
					: cherryPick
						? 'cherry-pick'
						: revert
							? 'revert'
							: null;
		return { operation, locked: !!lock };
	}

	async head(): Promise<string | null> {
		const result = await this.git(['rev-parse', '-q', '--verify', 'HEAD'], { allow: [1, 128] });
		return result.code === 0 ? result.stdout.trim() : null;
	}

	async upstream(branch: string): Promise<Upstream | null> {
		const remote = await this.config(`branch.${branch}.remote`);
		const ref = await this.config(`branch.${branch}.merge`);
		return remote && ref ? { remote, ref } : null;
	}

	/**
	 * The one remote and ref a plain `git push` updates for this branch.
	 * Null when pushRemote, push.default, or the remote's push refspec does not name exactly one destination.
	 */
	async pushTarget(branch: string): Promise<Upstream | null> {
		const remote = (
			await this.git(['for-each-ref', '--format=%(push:remotename)', `refs/heads/${branch}`])
		).stdout.trim();
		const upstreamRemote = await this.config(`branch.${branch}.remote`);
		const merge = await this.config(`branch.${branch}.merge`);
		if (!remote || remote.includes('\n') || (await this.config(`remote.${remote}.mirror`)) === 'true') return null;
		const mode = await this.config('push.default');
		const listed = await this.git(['config', '--get-all', `remote.${remote}.push`], { allow: [1] });
		const refspecs =
			listed.code === 0
				? listed.stdout
						.split(/\r?\n/)
						.map((line) => line.trim())
						.filter(Boolean)
				: [];
		if (refspecs.length > 1) return null;
		if (refspecs.length === 1) {
			const ref = onePushRef(refspecs[0]!, branch);
			return ref ? { remote, ref } : null;
		}
		if (mode === 'upstream' || mode === 'tracking')
			return remote === upstreamRemote && merge.startsWith('refs/heads/') ? { remote, ref: merge } : null;
		if (mode === 'current') return { remote, ref: `refs/heads/${branch}` };
		if (mode && mode !== 'simple') return null;
		if (remote === upstreamRemote && merge !== `refs/heads/${branch}`) return null;
		return { remote, ref: `refs/heads/${branch}` };
	}

	/** Pin the actual push endpoint's tip; fetch URLs and stale remote-tracking refs are not evidence. */
	async fetchPushTip(remote: string, ref: string): Promise<string | null> {
		const urls = (await this.git(['remote', 'get-url', '--push', '--all', remote])).stdout
			.trim()
			.split(/\r?\n/)
			.filter(Boolean);
		if (urls.length !== 1 || !ref.startsWith('refs/heads/')) return null;
		const url = urls[0]!;
		const listed = await this.git(['ls-remote', '--refs', '--', url, ref], { timeoutMs: NETWORK_TIMEOUT });
		const tips = listed.stdout.split(/\r?\n/).filter((line) => line.split('\t')[1] === ref);
		if (tips.length !== 1) return null;
		const oid = tips[0]!.split('\t')[0]!;
		if (!/^[a-f\d]{40,64}$/.test(oid)) return null;
		await this.git(['fetch', '--no-tags', '--no-write-fetch-head', '--', url, ref], { timeoutMs: NETWORK_TIMEOUT });
		await this.git(['cat-file', '-e', `${oid}^{commit}`]);
		return oid;
	}

	/** The fetched commit a push of `ref` to `remote` would fast-forward, or null when that tip is not present. */
	async remoteTip(remote: string, ref: string): Promise<string | null> {
		const name = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
		if (!name || name.includes('..') || name.startsWith('/') || remote.includes('/')) return null;
		const result = await this.git(['rev-parse', '-q', '--verify', `refs/remotes/${remote}/${name}^{commit}`], {
			allow: [1, 128],
		});
		return result.code === 0 ? result.stdout.trim() : null;
	}

	async remotes(): Promise<string[]> {
		return (await this.git(['remote'])).stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
	}

	async remoteUrl(name: string): Promise<string> {
		return this.config(`remote.${name}.url`);
	}

	/** A config value, or '' when unset. */
	async config(key: string): Promise<string> {
		const result = await this.git(['config', '--get', key], { allow: [1] });
		return result.code === 0 ? result.stdout.trim() : '';
	}

	async setConfig(key: string, value: string): Promise<void> {
		await this.git(['config', key, value]);
	}

	/** Paths with staged changes. */
	async stagedPaths(): Promise<string[]> {
		// A rename has two index paths. Include its deletion, even outside the cwd or with diff.relative set.
		return parsePathList(
			(await this.git(['diff', '--cached', '--no-renames', '--no-relative', '--name-only', '-z'])).stdout,
		);
	}

	/** Stage every change under the working directory (the vault), including deletions and new files. */
	async stageAll(): Promise<void> {
		await this.git(['add', '-A', '--', this.scope === '.' ? '.' : top(this.scope)]);
	}

	/** Staged paths that are outside the vault. Empty when the repository is the vault. */
	async stagedOutside(): Promise<string[]> {
		if (!this.scope || this.scope === '.') return [];
		return (await this.stagedPaths()).filter((repoPath) => !pathWithinScope(repoPath, this.scope));
	}

	async assertIndexWithinScope(): Promise<void> {
		const outside = await this.stagedOutside();
		if (outside.length) throw new GitError('outside-index', outside.join(', '));
	}

	private vaultPaths(paths: readonly string[]): string[] {
		const safe = paths.map((repoPath) => {
			const normalized = safeRepoPath(repoPath);
			return normalized && pathWithinScope(normalized, this.scope) ? normalized : null;
		});
		if (safe.some((repoPath) => !repoPath)) throw new GitError('outside-index', paths.join(', '));
		return safe.filter((repoPath): repoPath is string => !!repoPath);
	}

	async stage(paths: readonly string[]): Promise<void> {
		const safe = this.vaultPaths(paths);
		if (safe.length) await this.git(['add', '-A', '--', ...safe.map(top)]);
	}

	async unstage(paths: readonly string[]): Promise<void> {
		const safe = this.vaultPaths(paths);
		if (!safe.length) return;
		// A staged rename is one UI row but two index paths. Restore both only when both belong to this vault.
		const selected = new Set(safe);
		for (const change of (await this.status()).staged) {
			if (
				change.index === 'R' &&
				change.from &&
				selected.has(change.path) &&
				pathWithinScope(change.from, this.scope)
			)
				selected.add(change.from);
		}
		if (await this.head()) await this.git(['restore', '--staged', '--', ...[...selected].map(top)]);
		// Before the first commit there is no HEAD to restore from; dropping the index entries is the same thing.
		else await this.git(['rm', '--cached', '-q', '-r', '--', ...safe.map(top)]);
	}

	async unstageAll(): Promise<void> {
		const scope = !this.scope || this.scope === '.' ? '.' : this.scope;
		if (await this.head()) await this.git(['restore', '--staged', '--', top(scope)]);
		else await this.git(['rm', '--cached', '-q', '-r', '--', top(scope)], { allow: [128] });
	}

	/** Restore tracked files in the working tree from the index (unstaged edits are lost). */
	async discard(paths: readonly string[]): Promise<void> {
		const safe = this.vaultPaths(paths);
		if (safe.length) await this.git(['restore', '--worktree', '--', ...safe.map(top)]);
	}

	async commit(message: string, options: { allowEmpty?: boolean } = {}): Promise<void> {
		await this.assertIndexWithinScope();
		await this.git(['commit', '-q', ...(options.allowEmpty ? ['--allow-empty'] : []), '-F', '-'], {
			input: message,
		});
	}

	async fetch(remote?: string): Promise<void> {
		await this.git(['fetch', '--quiet', ...(remote ? [remote] : [])], { timeoutMs: NETWORK_TIMEOUT });
	}

	/** Commits on each side of `left...right`: [only in left, only in right]. Null when a side does not resolve. */
	async divergence(left: string, right: string): Promise<[number, number] | null> {
		const result = await this.git(['rev-list', '--left-right', '--count', `${left}...${right}`], { allow: [128] });
		if (result.code !== 0) return null;
		const [a, b] = result.stdout.trim().split(/\s+/).map(Number);
		return [a ?? 0, b ?? 0];
	}

	async revCount(range: string): Promise<number> {
		return Number((await this.git(['rev-list', '--count', range])).stdout.trim()) || 0;
	}

	async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
		return (await this.git(['merge-base', '--is-ancestor', ancestor, descendant], { allow: [1] })).code === 0;
	}

	/** Files that differ between two commits (`from` null: every file in `to`). */
	async changedBetween(from: string | null, to: string): Promise<string[]> {
		return parsePathList(
			(
				await this.git(
					from ? ['diff', '--name-only', '-z', from, to] : ['ls-tree', '-r', '-z', '--name-only', to],
				)
			).stdout,
		);
	}

	/**
	 * Integrate the upstream into the current branch. Local edits that are not committed are stashed around it
	 * (`--autostash`), so committing only the staged part still syncs. Resolves false when it stopped on conflicts.
	 */
	async integrate(method: 'merge' | 'rebase'): Promise<boolean> {
		await this.assertIndexWithinScope();
		const args =
			method === 'merge'
				? ['merge', '--no-edit', '--no-stat', '--autostash', '@{u}']
				: ['rebase', '--autostash', '@{u}'];
		const result = await this.runner.run(args);
		// Git can exit zero after integration while restoring the autostash leaves an unmerged index.
		const { operation } = await this.state();
		if (operation || (await this.status()).conflicted.length) return false;
		if (result.code === 0) return true;
		throw new GitError(
			classifyGitOutput(`${result.stderr}\n${result.stdout}`),
			detailOf(result.stdout, result.stderr),
			rawOf(result.stdout, result.stderr),
		);
	}

	async push(remote: string, refspec: string, setUpstream = false): Promise<void> {
		await this.assertRemotePushSafe(remote);
		await this.git(['push', '--porcelain', ...(setUpstream ? ['-u'] : []), remote, refspec], {
			timeoutMs: NETWORK_TIMEOUT,
		});
	}

	/** Check before squashing, so disallowed push configuration cannot first rewrite local history. */
	async assertPushSafe(branch: string): Promise<void> {
		const remote = (
			await this.git(['for-each-ref', '--format=%(push:remotename)', `refs/heads/${branch}`])
		).stdout.trim();
		if (remote) await this.assertRemotePushSafe(remote);
	}

	private async assertRemotePushSafe(remote: string): Promise<void> {
		const mirror = await this.git(['config', '--bool', '--get', `remote.${remote}.mirror`], { allow: [1] });
		const refs = await this.git(['config', '--get-all', `remote.${remote}.push`], { allow: [1] });
		if (mirror.stdout.trim() === 'true' || refs.stdout.split(/\r?\n/).some((ref) => ref.trim().startsWith('+')))
			throw new GitError('unsafe-push-config');
	}

	/** `git push` with no remote or refspec, so git uses the configured push target. */
	async pushConfigured(): Promise<GitResult> {
		return this.git(['push', '--porcelain'], { timeoutMs: NETWORK_TIMEOUT });
	}

	/** Finish a stopped operation after its conflicts were resolved and staged. */
	async continueOperation(operation: RepoOperation): Promise<void> {
		await this.assertIndexWithinScope();
		if (operation === 'merge') await this.git(['commit', '-q', '--no-edit']);
		else await this.git([operation, '--continue'], { env: { GIT_EDITOR: 'true' } });
	}

	async abortOperation(operation: RepoOperation): Promise<void> {
		await this.git([operation, '--abort']);
	}

	/** Commit history, newest first. Empty before the first commit. */
	async log(skip: number, count: number): Promise<Commit[]> {
		if (!(await this.head())) return [];
		const result = await this.git([
			'log',
			`-n${count}`,
			`--skip=${skip}`,
			'-z',
			'--format=%H%x1f%h%x1f%an%x1f%at%x1f%s',
		]);
		return result.stdout
			.split('\0')
			.filter(Boolean)
			.map((record) => {
				const [hash = '', short = '', author = '', time = '0', subject = ''] = record
					.replace(/^\n/, '')
					.split('\x1f');
				return { hash, short, author, time: Number(time), subject };
			});
	}

	/** Commits for the history graph in topological order (children first), `count` from `skip`. */
	async graphLog(skip: number, count: number, query: GraphQuery): Promise<GraphCommit[]> {
		if (!query.ref && !(await this.head())) return [];
		const revs = query.ref
			? [await this.requireCommit(query.ref)]
			: query.branches === 'all'
				? ['--branches', '--tags', ...(query.remotes ? ['--remotes'] : []), 'HEAD']
				: ['HEAD'];
		const search = query.search?.trim();
		const filter = search ? ['--regexp-ignore-case', '--fixed-strings', `--grep=${search}`] : [];
		const result = await this.git([
			'log',
			'--topo-order',
			`-n${count}`,
			`--skip=${skip}`,
			'-z',
			'--format=%H%x1f%P%x1f%h%x1f%an%x1f%at%x1f%s',
			...filter,
			...revs,
			'--',
		]);
		return result.stdout
			.split('\0')
			.filter(Boolean)
			.map((record) => {
				const [hash = '', parents = '', short = '', author = '', time = '0', subject = ''] = record
					.replace(/^\n/, '')
					.split('\x1f');
				return {
					hash,
					parents: parents.split(' ').filter(Boolean),
					short,
					author,
					time: Number(time),
					subject,
				};
			});
	}

	/** Branches, remote branches and tags with the commit each points at (annotated tags are peeled). */
	async refs(): Promise<RefEntry[]> {
		const result = await this.git([
			'for-each-ref',
			'--format=%(refname)%1f%(objectname)%1f%(*objectname)',
			'refs/heads',
			'refs/remotes',
			'refs/tags',
		]);
		return result.stdout
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => {
				const [name = '', object = '', peeled = ''] = line.split('\x1f');
				return { name, hash: peeled || object };
			});
	}

	async commitDetail(hash: string, signal?: AbortSignal): Promise<CommitDetail> {
		const oid = await this.requireCommit(hash, signal);
		const result = await this.git(['show', '-s', '--format=%H%x1f%an%x1f%ae%x1f%at%x1f%P%x1f%B', oid, '--'], {
			signal,
		});
		const [full = hash, author = '', email = '', time = '0', parents = '', ...message] =
			result.stdout.split('\x1f');
		return {
			hash: full,
			author,
			email,
			time: Number(time),
			parents: parents.split(' ').filter(Boolean),
			message: message.join('\x1f').trim(),
		};
	}

	async commitFiles(hash: string): Promise<CommitFile[]> {
		const detail = await this.commitDetail(hash);
		return this.changedFiles(detail.parents[0] ?? null, detail.hash);
	}

	/** Unified diff of one file: working tree against the index, the index against HEAD (`staged`), or one commit. */
	async diff(path: string, source: { staged?: boolean; commit?: string } = {}): Promise<string> {
		assertHistoryPath(path);
		const args = source.commit
			? [
					'show',
					'--no-color',
					'--no-ext-diff',
					'--no-textconv',
					'--format=',
					'-m',
					'--first-parent',
					await this.requireCommit(source.commit),
					'--',
					top(path),
				]
			: [
					'diff',
					'--no-color',
					'--no-ext-diff',
					'--no-textconv',
					...(source.staged ? ['--cached'] : []),
					'--',
					top(path),
				];
		return (await this.git(args, { maxOutputBytes: 8 * 1024 * 1024 })).stdout;
	}

	/** Resolve named refs once. `--end-of-options` makes even hostile ref text data, not Git flags. */
	async resolveCommit(ref: string, signal?: AbortSignal): Promise<string | null> {
		if (!ref || /[\0\r\n]/.test(ref)) throw new GitError('unknown', 'invalid revision');
		const result = await this.git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`], {
			signal,
			allow: [1, 128],
			maxOutputBytes: 8192,
		});
		const oid = result.stdout.trim();
		return result.code === 0 && isObjectId(oid) ? oid : null;
	}

	async requireCommit(ref: string, signal?: AbortSignal): Promise<string> {
		const oid = await this.resolveCommit(ref, signal);
		if (!oid) throw new GitError('unknown', 'revision not found');
		return oid;
	}

	/** Derive the empty tree id for this repository's object format without writing an object. */
	async emptyTree(signal?: AbortSignal): Promise<string> {
		return (await this.git(['hash-object', '-t', 'tree', '--stdin'], { input: '', signal })).stdout.trim();
	}

	async changedFiles(left: string | null, right: string, signal?: AbortSignal): Promise<RevisionFileChange[]> {
		const rightOid = await this.requireCommit(right, signal);
		const leftOid = left === null ? await this.emptyTree(signal) : await this.requireCommit(left, signal);
		const result = await this.git(
			[
				'diff',
				'--name-status',
				'-z',
				'--find-renames',
				'--no-ext-diff',
				'--no-textconv',
				'--no-relative',
				leftOid,
				rightOid,
				'--',
			],
			{ signal, maxOutputBytes: 8 * 1024 * 1024 },
		);
		return parseRevisionFiles(result.stdout.split('\0'));
	}

	/** Every page stays on the first page's immutable tip and replays rename metadata before slicing. */
	async fileHistory(path: string, options: HistoryOptions = {}): Promise<FileHistoryPage> {
		assertHistoryPath(path);
		const { signal, cursor } = options;
		if (
			cursor &&
			(cursor.path !== path || !isObjectId(cursor.tip) || !Number.isSafeInteger(cursor.skip) || cursor.skip < 0)
		)
			throw new GitError('unknown', 'invalid history cursor');
		const skip = cursor?.skip ?? 0;
		const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 50)));
		if (!Number.isFinite(limit) || skip > 20_000) throw new GitError('unknown', 'history query limit exceeded');
		const tip = cursor?.tip ?? (await this.resolveCommit(options.ref ?? 'HEAD', signal));
		if (!tip) {
			if (options.ref && options.ref !== 'HEAD') throw new GitError('unknown', 'revision not found');
			return { entries: [], tip: null, path, complete: true, lineage: 'git-rename-detection' };
		}
		const result = await this.git(
			[
				'log',
				'--follow',
				'--find-renames',
				'--topo-order',
				'--name-status',
				'-z',
				`-n${skip + limit + 1}`,
				'--format=%x00%H%x00%P%x00%an%x00%at%x00%s',
				tip,
				'--',
				top(path),
			],
			{ signal, maxOutputBytes: 16 * 1024 * 1024 },
		);
		const all = parseFileHistory(result.stdout, path);
		const entries = all.slice(skip, skip + limit);
		const complete = all.length <= skip + limit;
		return {
			entries,
			tip,
			path,
			complete,
			lineage: 'git-rename-detection',
			...(complete ? {} : { nextCursor: { tip, path, skip: skip + entries.length } }),
		};
	}

	/** Unix seconds of the last commit, or null before the first one. */
	async lastCommitTime(): Promise<number | null> {
		if (!(await this.head())) return null;
		return Number((await this.git(['log', '-1', '--format=%ct'])).stdout.trim()) || null;
	}

	/** Refs other than `branch` that point at or build on `commit` (squashing would leave them behind). */
	async otherRefsContaining(commit: string, branch: string): Promise<string[]> {
		const result = await this.git(['for-each-ref', '--format=%(refname)', '--contains', commit]);
		return result.stdout.split(/\r?\n/).filter((ref) => ref && ref !== `refs/heads/${branch}`);
	}

	async listRange(range: string, merges = false): Promise<string[]> {
		return (await this.git(['rev-list', ...(merges ? ['--merges'] : []), range])).stdout
			.split(/\r?\n/)
			.filter(Boolean);
	}

	async resetSoft(target: string): Promise<void> {
		await this.git(['reset', '-q', '--soft', target]);
	}

	/** Keep the original history reachable even if the subsequent push fails or the app closes. */
	async saveSquashHead(head: string): Promise<void> {
		await this.git(['update-ref', 'refs/huhu/pre-squash', head]);
	}

	async commitReusing(message: string): Promise<void> {
		await this.assertIndexWithinScope();
		await this.git(['commit', '-q', '-C', message]);
	}
}

/**
 * Paths from status are relative to the repository root. `top` makes git read them that way from any working
 * directory, and `literal` keeps `*`, `?` and `[` in file names from acting as wildcards.
 */
function top(path: string): string {
	return `:(top,literal)${path}`;
}

/** Destination of one non-wildcard refspec that publishes `branch`, or null when it does not. */
function onePushRef(spec: string, branch: string): string | null {
	const body = spec.startsWith('+') ? spec.slice(1) : spec;
	if (!body || body.includes('*')) return null;
	const colon = body.indexOf(':');
	const src = colon === -1 ? body : body.slice(0, colon);
	const dst = colon === -1 ? body : body.slice(colon + 1);
	if (!src || !dst.startsWith('refs/')) return null;
	if (src !== 'HEAD' && src !== branch && src !== `refs/heads/${branch}`) return null;
	return dst;
}

export function isObjectId(value: string): boolean {
	return /^(?:[a-f\d]{40}|[a-f\d]{64})$/.test(value);
}

/** Preserve literal Git paths, including backslashes on POSIX, while rejecting escapes. */
export function assertHistoryPath(value: string): void {
	if (
		!value ||
		value.includes('\0') ||
		/^[\\/]/.test(value) ||
		/^[a-z]:/i.test(value) ||
		value.split(/[\\/]/).includes('..')
	) {
		throw new GitError('outside-index', 'invalid repository path');
	}
}

function parseRevisionFiles(parts: readonly string[]): RevisionFileChange[] {
	const files: RevisionFileChange[] = [];
	for (let i = 0; i < parts.length;) {
		const status = parts[i++]?.trim();
		if (!status) continue;
		if (!/^[ACDMRTUXB]\d*$/.test(status)) throw new GitError('unknown', 'invalid Git file status');
		const first = parts[i++];
		if (!first) throw new GitError('unknown', 'missing Git file path');
		assertHistoryPath(first);
		if (/^[RC]/.test(status)) {
			const second = parts[i++];
			if (!second) throw new GitError('unknown', 'missing Git rename path');
			assertHistoryPath(second);
			files.push({ status, from: first, path: second });
		} else files.push({ status, path: first });
	}
	return files;
}

function parseFileHistory(output: string, path: string): FileHistoryEntry[] {
	const parts = output.split('\0');
	const entries: FileHistoryEntry[] = [];
	let currentPath = path;
	let at = 0;
	while (at < parts.length) {
		while (at < parts.length && !parts[at]?.trim()) at++;
		if (at >= parts.length) break;
		const commitOid = parts[at++]!;
		if (!isObjectId(commitOid)) throw new GitError('unknown', 'invalid Git history record');
		const parents = (parts[at++] ?? '').split(' ').filter(Boolean);
		const author = parts[at++] ?? '';
		const time = Number(parts[at++] ?? '0');
		const subject = parts[at++] ?? '';
		const changes: string[] = [];
		while (at < parts.length) {
			if (!parts[at] && isObjectId(parts[at + 1] ?? '')) break;
			changes.push(parts[at++]!);
		}
		const files = parseRevisionFiles(changes);
		const file = files.find((entry) => entry.path === currentPath);
		if (files.length && !file) continue;
		const pathAtRevision = file?.path ?? currentPath;
		entries.push({
			id: `${commitOid}:${pathAtRevision}`,
			commitOid,
			parents,
			author,
			time,
			subject,
			pathAtRevision,
			...(file?.from ? { previousPath: file.from } : {}),
			status: file?.status ?? 'M',
			ref: { kind: 'commit', commit: commitOid, path: pathAtRevision },
		});
		if (file?.from && file.status.startsWith('R')) currentPath = file.from;
		// A newly created path starts a new identity; never conflate a deleted predecessor with a recreated note.
		if (file?.status === 'A') break;
	}
	return entries;
}

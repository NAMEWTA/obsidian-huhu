import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import type {
	EndpointContent,
	ResolvedEndpoint,
	RevisionReader,
	RevisionRef,
	SnapshotReadOptions,
	TextSnapshot,
} from '../../core/history';
import type { GitRunner } from '../../core/ports';
import { GitError } from '../../core/errors';
import { assertHistoryPath, GitRepo, isObjectId } from '../../core/repo';

export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const CACHE_BYTES = 8 * MAX_SNAPSHOT_BYTES;

/** Shares the sync runner. All object commands are read-only and all document bytes are preserved. */
export function createRevisionReader(runner: GitRunner, cwd: string): RevisionReader {
	const repo = new GitRepo(runner);
	const cache = new Map<string, EndpointContent>();
	let cacheBytes = 0;
	const gitBlob = async (oid: string, limit: number, signal?: AbortSignal): Promise<EndpointContent> => {
		const cached = cache.get(oid);
		if (cached?.status === 'text') {
			if (cached.snapshot.byteLength > limit)
				return { status: 'too-large', byteLength: cached.snapshot.byteLength, limit };
			cache.delete(oid);
			cache.set(oid, cached);
			return cached;
		}
		const size = Number((await repo.git(['cat-file', '-s', oid], { signal, maxOutputBytes: 8192 })).stdout.trim());
		if (!Number.isSafeInteger(size) || size < 0) throw new GitError('unknown', 'invalid object size');
		if (size > limit) return { status: 'too-large', byteLength: size, limit };
		if (!runner.runBytes) throw new GitError('unknown', 'byte-preserving Git reader unavailable');
		const bytes = await runner.runBytes(['cat-file', 'blob', oid], { signal, maxOutputBytes: limit + 8192 });
		if (bytes.code !== 0) throw new GitError('unknown', bytes.stderr);
		if (bytes.stdout.byteLength !== size) throw new GitError('unknown', 'incomplete Git object');
		const content = decodeSnapshot(bytes.stdout, limit);
		if (content.status === 'text') {
			while (cache.size && (cacheBytes + size > CACHE_BYTES || cache.size >= 32)) {
				const oldest = cache.keys().next().value as string;
				const entry = cache.get(oldest);
				if (entry?.status === 'text') cacheBytes -= entry.snapshot.byteLength;
				cache.delete(oldest);
			}
			cache.set(oid, content);
			cacheBytes += size;
		}
		return content;
	};

	return {
		async resolve(input: RevisionRef, options: SnapshotReadOptions = {}): Promise<ResolvedEndpoint> {
			const { signal } = options;
			checkAbort(signal);
			assertHistoryPath(input.path);
			const ref = Object.freeze({ ...input });
			if (options.maxBytes !== undefined && (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0))
				throw new GitError('unknown', 'invalid snapshot limit');
			const limit = Math.min(MAX_SNAPSHOT_BYTES, options.maxBytes ?? MAX_SNAPSHOT_BYTES);
			let content: EndpointContent;
			let commitOid: string | undefined;
			let blobOid: string | undefined;
			let label: string = ref.kind;
			let resolvedRef: RevisionRef = ref;
			try {
				if (ref.kind === 'empty') content = { status: 'missing', reason: 'empty' };
				else if (ref.kind === 'editor-buffer' || ref.kind === 'local-snapshot') {
					content = decodeSnapshot(Buffer.from(ref.text, 'utf8'), limit);
					if (content.status === 'text' && content.snapshot.text !== ref.text)
						content = {
							status: 'error',
							code: 'encoding',
							message: 'Text is not losslessly representable as UTF-8',
						};
				} else if (ref.kind === 'worktree') content = await readWorktree(cwd, ref.path, limit, signal);
				else {
					let mode: string | undefined;
					if (ref.kind === 'index') {
						const entries = (
							await repo.git(['--literal-pathspecs', 'ls-files', '--stage', '-z', '--', ref.path], {
								signal,
								maxOutputBytes: 1024 * 1024,
							})
						).stdout
							.split('\0')
							.filter(Boolean);
						const exact = entries
							.map((entry) => {
								const tab = entry.indexOf('\t');
								const [entryMode, oid, stage] = entry.slice(0, tab).split(' ');
								return { path: entry.slice(tab + 1), mode: entryMode, oid, stage: Number(stage) };
							})
							.filter((entry) => entry.path === ref.path);
						const selected = exact.find((entry) => entry.stage === (ref.stage ?? 0));
						if (!selected && exact.length && !ref.stage)
							throw new GitError('conflict', 'index has unresolved stages');
						mode = selected?.mode;
						blobOid = selected?.oid;
					} else {
						let tree: string;
						if (ref.kind === 'commit') {
							commitOid = await repo.requireCommit(ref.commit, signal);
							tree = commitOid;
							resolvedRef = Object.freeze({ ...ref, commit: commitOid });
							label = commitOid.slice(0, 8);
						} else {
							if (!isObjectId(ref.tree)) throw new GitError('unknown', 'invalid tree object');
							tree = ref.tree;
						}
						const records = (
							await repo.git(
								['--literal-pathspecs', 'ls-tree', '--full-tree', '-z', '-l', tree, '--', ref.path],
								{ signal, maxOutputBytes: 1024 * 1024 },
							)
						).stdout
							.split('\0')
							.filter(Boolean);
						const exact = records.find((record) => record.slice(record.indexOf('\t') + 1) === ref.path);
						if (exact) {
							const fields = exact.slice(0, exact.indexOf('\t')).split(/\s+/);
							mode = fields[0];
							blobOid = fields[2];
						}
					}
					if (!blobOid) content = { status: 'missing', reason: 'not-present' };
					else if (mode === '120000') content = { status: 'binary', byteLength: 0, reason: 'symlink' };
					else if (mode === '160000') content = { status: 'binary', byteLength: 0, reason: 'submodule' };
					else if (mode !== '100644' && mode !== '100755')
						content = { status: 'binary', byteLength: 0, reason: 'not-file' };
					else {
						if (!isObjectId(blobOid)) throw new GitError('unknown', 'invalid blob object');
						content = await gitBlob(blobOid, limit, signal);
					}
				}
			} catch (error) {
				checkAbort(signal);
				if (error instanceof GitError && error.kind === 'cancelled') throw error;
				content = {
					status: 'error',
					code: error instanceof GitError ? error.kind : 'read-failed',
					message: error instanceof Error ? error.message : String(error),
				};
			}
			checkAbort(signal);
			const identity = content.status === 'text' ? content.snapshot.hash : `${content.status}:${blobOid ?? ''}`;
			const sourceIdentity =
				ref.kind === 'commit'
					? (commitOid ?? ref.commit)
					: ref.kind === 'tree'
						? ref.tree
						: ref.kind === 'editor-buffer'
							? String(ref.generation)
							: ref.kind === 'local-snapshot'
								? ref.snapshotId
								: ref.kind === 'index'
									? `${ref.stage ?? 0}:${blobOid ?? ''}`
									: '';
			return Object.freeze({
				...content,
				repositoryId: cwd,
				ref: resolvedRef,
				id: `${cwd}:${ref.kind}:${sourceIdentity}:${ref.path}:${identity}`,
				path: ref.path,
				label,
				...(commitOid ? { commitOid } : {}),
				...(blobOid ? { blobOid } : {}),
			});
		},
	};
}

function checkAbort(signal?: AbortSignal): void {
	if (signal?.aborted) throw new GitError('cancelled');
}

function decodeSnapshot(bytes: Uint8Array, limit: number): EndpointContent {
	if (bytes.byteLength > limit) return { status: 'too-large', byteLength: bytes.byteLength, limit };
	if (bytes.includes(0)) return { status: 'binary', byteLength: bytes.byteLength, reason: 'nul' };
	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
	} catch {
		return { status: 'binary', byteLength: bytes.byteLength, reason: 'encoding' };
	}
	const endings = new Set(text.match(/\r\n|\r|\n/g) ?? []);
	const eol: TextSnapshot['eol'] =
		endings.size > 1
			? 'mixed'
			: endings.has('\r\n')
				? 'crlf'
				: endings.has('\r')
					? 'cr'
					: endings.has('\n')
						? 'lf'
						: 'none';
	return Object.freeze({
		status: 'text',
		snapshot: Object.freeze({
			text,
			hash: createHash('sha256').update(bytes).digest('hex'),
			byteLength: bytes.byteLength,
			encoding: 'utf-8',
			eol,
			hasBom: text.startsWith('\ufeff'),
			endsWithNewline: /[\r\n]$/.test(text),
		}),
	});
}

async function readWorktree(
	root: string,
	repoPath: string,
	limit: number,
	signal?: AbortSignal,
): Promise<EndpointContent> {
	const absolute = path.resolve(root, repoPath);
	const within = (candidate: string): boolean => {
		const relative = path.relative(root, candidate);
		return !!relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
	};
	if (!within(absolute)) throw new GitError('outside-index');
	try {
		const stat = await lstat(absolute);
		if (stat.isSymbolicLink()) return { status: 'binary', byteLength: stat.size, reason: 'symlink' };
		if (!stat.isFile()) return { status: 'binary', byteLength: stat.size, reason: 'not-file' };
		if (!within(await realpath(absolute))) throw new GitError('outside-index');
		checkAbort(signal);
		const file = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
		try {
			const before = await file.stat();
			if (before.size > limit) return { status: 'too-large', byteLength: before.size, limit };
			const chunks: Buffer[] = [];
			let length = 0;
			while (length <= limit) {
				checkAbort(signal);
				const buffer = Buffer.alloc(Math.min(64 * 1024, limit + 1 - length));
				const { bytesRead } = await file.read(buffer, 0, buffer.length, length);
				if (!bytesRead) break;
				chunks.push(buffer.subarray(0, bytesRead));
				length += bytesRead;
			}
			const after = await file.stat();
			if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs)
				return { status: 'error', code: 'source-changed', message: 'File changed while its snapshot was read' };
			return decodeSnapshot(Buffer.concat(chunks, length), limit);
		} finally {
			await file.close();
		}
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
			return { status: 'missing', reason: 'not-present' };
		throw error;
	}
}

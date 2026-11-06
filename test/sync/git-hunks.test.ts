import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { GitRepo } from '../../src/modules/versioning/core/repo';
import { createGitRunner } from '../../src/modules/versioning/platform/desktop/git-runner';
import { gitEnvironment } from '../../src/modules/versioning/platform/desktop/git-environment';

test('atomic full-blob index update preserves other staged paths, worktree and HEAD; stale OID refuses', async () => {
	const cwd = mkdtempSync(path.join(tmpdir(), 'huhu-index-hunks-'));
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', env: gitEnvironment() }).trim();
	let runner: ReturnType<typeof createGitRunner> | undefined;
	try {
		git('init', '-q', '-b', 'main');
		git('config', 'user.name', 'Hunk test');
		git('config', 'user.email', 'hunk@example.test');
		git('config', 'commit.gpgsign', 'false');
		git('config', 'core.autocrlf', 'false');
		writeFileSync(path.join(cwd, 'note.md'), '\uFEFFone\r\nold😀\r\nuntouched\nlast');
		writeFileSync(path.join(cwd, 'other.md'), 'other\n');
		git('add', '.');
		git('commit', '-qm', 'initial');
		writeFileSync(path.join(cwd, 'other.md'), 'staged other\n');
		git('add', 'other.md');
		writeFileSync(path.join(cwd, 'note.md'), '\uFEFFone\r\nnew🧠\r\nuntouched\nworking');
		const head = git('rev-parse', 'HEAD'),
			other = git('rev-parse', ':other.md'),
			old = git('rev-parse', ':note.md');
		const body = readFileSync(path.join(cwd, 'note.md'));
		const quotedPath = process.platform === 'win32' ? '奇怪 path 😀.md' : '奇怪 "path" \t😀\n.md';
		writeFileSync(path.join(cwd, quotedPath), 'quoted before\n');
		git('add', '--', quotedPath);
		const quotedOid = git('rev-parse', `:${quotedPath}`);

		runner = createGitRunner('git', cwd);
		const repo = new GitRepo(runner);
		const candidate = '\uFEFFone\r\nnew🧠\r\nuntouched\nlast';
		await repo.replaceIndexContent('note.md', old, candidate);
		await repo.replaceIndexContent(quotedPath, quotedOid, 'quoted after\n');
		expect(execFileSync('git', ['show', `:${quotedPath}`], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			'quoted after\n',
		);

		expect(execFileSync('git', ['show', ':note.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			candidate,
		);
		expect(git('rev-parse', ':other.md')).toBe(other);
		expect(git('rev-parse', 'HEAD')).toBe(head);
		expect(readFileSync(path.join(cwd, 'note.md'))).toEqual(body);
		await expect(repo.replaceIndexContent('note.md', old, 'stale overwrite')).rejects.toThrow(
			'index source changed',
		);
		const current = git('rev-parse', ':note.md');
		const underlying = runner;
		const raced = new GitRepo({
			exists: (value) => underlying.exists(value),
			run: async (args, options) => {
				if (args[0] === 'apply') {
					writeFileSync(path.join(cwd, 'note.md'), 'external index writer\n');
					git('add', 'note.md');
				}
				return underlying.run(args, options);
			},
		});
		await expect(raced.replaceIndexContent('note.md', current, 'should never win')).rejects.toThrow();
		expect(execFileSync('git', ['show', ':note.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			'external index writer\n',
		);
	} finally {
		runner?.dispose();
		rmSync(cwd, { recursive: true, force: true });
	}
}, 30_000);

test('queued stage/unstage changes one selected hunk and rejects a stale source identity', async () => {
	const { SyncService } = await import('../../src/modules/versioning/services/sync-service');
	const { desktopGitHost } = await import('../../src/modules/versioning/platform/desktop/host');
	const { syncSettings } = await import('../../src/modules/versioning/settings');
	const { HistoryQueryService } = await import('../../src/modules/versioning/services/history-query');
	const { parseDiffFromFile } = await import('@pierre/diffs');
	const { hunkProof, hunkCandidate } = await import('../../src/modules/versioning/ui/diff/hunk-proof');
	const cwd = mkdtempSync(path.join(tmpdir(), 'huhu-queued-hunks-'));
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', env: gitEnvironment() }).trim();
	let service: InstanceType<typeof SyncService> | undefined;
	try {
		git('init', '-q', '-b', 'main');
		git('config', 'user.name', 'Hunk test');
		git('config', 'user.email', 'hunk@example.test');
		git('config', 'commit.gpgsign', 'false');
		git('config', 'core.autocrlf', 'false');
		const shared = Array.from({ length: 10 }, (_, i) => `untouched${i}\n`).join('');
		const before = `old one\n${shared}old two\n`,
			after = `new one\n${shared}new two\n`;
		writeFileSync(path.join(cwd, 'note.md'), before);
		writeFileSync(path.join(cwd, 'other.md'), 'old other\n');
		git('add', '.');
		git('commit', '-qm', 'initial');
		service = new SyncService({
			host: desktopGitHost(cwd, 'hunk-device'),
			settings: {
				get: () => syncSettings.defaults(),
			} as import('../../src/shared/settings/store').SettingsHandle<
				import('../../src/modules/versioning/settings').SyncSettings
			>,
			dialogs: { confirmUpstream: async () => true },
			notify() {},
			describe: () => '',
		});
		await service.connect();
		writeFileSync(path.join(cwd, 'note.md'), after);
		writeFileSync(path.join(cwd, 'other.md'), 'staged other\n');
		git('add', 'other.md');
		const query = new HistoryQueryService(() => service!.versionAccess());
		const comparison = await query.compare({
			intent: 'unstaged',
			left: { kind: 'index', path: 'note.md' },
			right: { kind: 'worktree', path: 'note.md' },
		});
		const metadata = parseDiffFromFile(
			{ name: 'note.md', contents: before },
			{ name: 'note.md', contents: after },
			{ context: 2 },
		);
		const diff = hunkProof(before, after, metadata),
			first = diff.chunks[0]!;
		const request = {
			repositoryId: (await service!.versionAccess()).repositoryId,
			path: 'note.md',
			direction: 'stage' as const,
			head: git('rev-parse', 'HEAD'),
			indexId: comparison.left.id,
			worktreeId: comparison.right.id,
			comparison,
			diff,
			selected: [`${first.fromA}:${first.toA}:${first.fromB}:${first.toB}`],
			candidate: hunkCandidate(before, after, metadata, 0, 'accept'),
		};
		const other = git('rev-parse', ':other.md'),
			head = git('rev-parse', 'HEAD');
		await service.applyIndexHunks(request);
		expect(execFileSync('git', ['show', ':note.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			`new one\n${shared}old two\n`,
		);
		expect(readFileSync(path.join(cwd, 'note.md'), 'utf8')).toBe(after);
		expect(git('rev-parse', ':other.md')).toBe(other);
		expect(git('rev-parse', 'HEAD')).toBe(head);
		await expect(service.applyIndexHunks(request)).rejects.toThrow('hunk source changed');
		const staged = await query.compare({
			intent: 'staged',
			left: { kind: 'commit', commit: head, path: 'note.md' },
			right: { kind: 'index', path: 'note.md' },
		});
		const stagedBody = `new one\n${shared}old two\n`;
		const stagedMetadata = parseDiffFromFile(
			{ name: 'note.md', contents: before },
			{ name: 'note.md', contents: stagedBody },
			{ context: 2 },
		);
		const stagedDiff = hunkProof(before, stagedBody, stagedMetadata),
			chunk = stagedDiff.chunks[0]!;
		await service.applyIndexHunks({
			...request,
			direction: 'unstage',
			indexId: staged.right.id,
			comparison: staged,
			diff: stagedDiff,
			selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
			candidate: before,
		});
		expect(execFileSync('git', ['show', ':note.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			before,
		);
		expect(git('rev-parse', ':other.md')).toBe(other);
		expect(readFileSync(path.join(cwd, 'note.md'), 'utf8')).toBe(after);
		const perform = async (path: string, direction: 'stage' | 'unstage') => {
			const comparison = await query.compare({
				intent: direction === 'stage' ? 'unstaged' : 'staged',
				left: direction === 'stage' ? { kind: 'index', path } : { kind: 'commit', commit: head, path },
				right: { kind: direction === 'stage' ? 'worktree' : 'index', path },
			});
			const leftText = comparison.left.status === 'text' ? comparison.left.snapshot.text : '',
				rightText = comparison.right.status === 'text' ? comparison.right.snapshot.text : '';
			const metadata = parseDiffFromFile(
				comparison.left.status === 'missing' ? null : { name: path, contents: leftText },
				comparison.right.status === 'missing' ? null : { name: path, contents: rightText },
				{ context: 2 },
			);
			const diff = hunkProof(leftText, rightText, metadata),
				chunk = diff.chunks[0]!;
			const index = await query.resolve({ kind: 'index', path }),
				worktree = await query.resolve({ kind: 'worktree', path });
			const candidate = hunkCandidate(
				leftText,
				rightText,
				metadata,
				0,
				direction === 'stage' ? 'accept' : 'reject',
			);
			await service!.applyIndexHunks({
				repositoryId: (await service!.versionAccess()).repositoryId,
				path,
				direction,
				head,
				indexId: index.id,
				worktreeId: worktree.id,
				comparison,
				diff,
				selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
				candidate:
					(direction === 'stage' ? comparison.right : comparison.left).status === 'missing' &&
					candidate === ''
						? null
						: candidate,
			});
		};
		writeFileSync(path.join(cwd, 'new-note.md'), 'new body😀\n');
		if (process.platform !== 'win32') chmodSync(path.join(cwd, 'new-note.md'), 0o755);
		await perform('new-note.md', 'stage');
		expect(git('show', ':new-note.md')).toBe('new body😀');
		if (process.platform !== 'win32') expect(git('ls-files', '--stage', '--', 'new-note.md')).toMatch(/^100755 /);
		await perform('new-note.md', 'unstage');
		expect(git('ls-files', '--', 'new-note.md')).toBe('');
		expect(readFileSync(path.join(cwd, 'new-note.md'), 'utf8')).toBe('new body😀\n');
		rmSync(path.join(cwd, 'note.md'));
		await perform('note.md', 'stage');
		expect(git('ls-files', '--', 'note.md')).toBe('');
		await perform('note.md', 'unstage');
		expect(execFileSync('git', ['show', ':note.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
			before,
		);
		expect(existsSync(path.join(cwd, 'note.md'))).toBe(false);
		expect(git('rev-parse', ':other.md')).toBe(other);
		expect(git('rev-parse', 'HEAD')).toBe(head);
	} finally {
		await service?.dispose();
		rmSync(cwd, { recursive: true, force: true });
	}
}, 30_000);

import { SyncService } from '../../src/modules/versioning/services/sync-service';
import { desktopGitHost } from '../../src/modules/versioning/platform/desktop/host';
import { syncSettings } from '../../src/modules/versioning/settings';
import { HistoryQueryService } from '../../src/modules/versioning/services/history-query';
import { parseDiffFromFile } from '@pierre/diffs';
import { hunkProof, hunkCandidate } from '../../src/modules/versioning/ui/diff/hunk-proof';
test.each(['staged', 'unstaged'] as const)(
	'rename %s content hunk preserves rename, other hunks, mode and worktree',
	async (direction) => {
		const cwd = mkdtempSync(path.join(tmpdir(), 'huhu-repair-rename-'));
		const git = (...args: string[]) =>
			execFileSync('git', args, { cwd, encoding: 'utf8', env: gitEnvironment() }).trim();
		let service: SyncService | undefined;
		try {
			git('init', '-q', '-b', 'main');
			git('config', 'user.name', 'Review');
			git('config', 'user.email', 'review@example.test');
			git('config', 'commit.gpgsign', 'false');
			git('config', 'core.autocrlf', 'false');
			const before = 'old\n' + Array.from({ length: 30 }, (_, i) => `same ${i}\n`).join('') + 'old tail\n';
			const after = before.replace(/^old/, 'new').replace(/old tail/, 'new tail');
			writeFileSync(path.join(cwd, 'old.md'), before);
			chmodSync(path.join(cwd, 'old.md'), 0o755);
			writeFileSync(path.join(cwd, 'other.md'), 'other\n');
			git('add', '.');
			git('commit', '-qm', 'initial');
			service = new SyncService({
				host: desktopGitHost(cwd, 'review-device'),
				settings: { get: () => syncSettings.defaults() } as never,
				dialogs: { confirmUpstream: async () => true },
				notify() {},
				describe: () => '',
			});
			await service.connect();
			git('mv', 'old.md', 'new.md');
			if (direction === 'staged') {
				writeFileSync(path.join(cwd, 'new.md'), after);
				git('add', 'new.md');
			} else {
				writeFileSync(path.join(cwd, 'new.md'), after);
			}
			writeFileSync(path.join(cwd, 'other.md'), 'staged other\n');
			git('add', 'other.md');
			const other = git('rev-parse', ':other.md');
			const q = new HistoryQueryService(() => service!.versionAccess());
			const head = git('rev-parse', 'HEAD');
			expect(git('diff', '--cached', '--name-status', '--find-renames')).toContain('old.md\tnew.md');
			const comparison = await q.compare(
				direction === 'staged'
					? {
							intent: 'staged',
							left: { kind: 'commit', commit: head, path: 'old.md' },
							right: { kind: 'index', path: 'new.md' },
						}
					: {
							intent: 'unstaged',
							left: { kind: 'index', path: 'new.md' },
							right: { kind: 'worktree', path: 'new.md' },
						},
			);
			const worktree = await q.resolve({ kind: 'worktree', path: 'new.md' });
			const metadata = parseDiffFromFile(
				{ name: 'old.md', contents: before },
				{ name: 'new.md', contents: after },
				{ context: 2 },
				true,
			);
			const diff = hunkProof(before, after, metadata),
				chunk = diff.chunks[0]!;
			const currentIndex = await q.resolve({ kind: 'index', path: 'new.md' });
			if (direction === 'staged')
				await expect(
					service.applyIndexHunks({
						repositoryId: (await service!.versionAccess()).repositoryId,
						path: 'new.md',
						direction: 'unstage',
						head,
						indexId: currentIndex.id,
						worktreeId: worktree.id,
						comparison: { ...comparison, left: { ...comparison.left, path: 'new.md' } },
						diff,
						selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
						candidate: hunkCandidate(before, after, metadata, 0, 'reject'),
					}),
				).rejects.toThrow('hunk endpoints changed');
			await service.applyIndexHunks({
				repositoryId: (await service!.versionAccess()).repositoryId,
				path: 'new.md',
				direction: direction === 'staged' ? 'unstage' : 'stage',
				head,
				indexId: currentIndex.id,
				worktreeId: worktree.id,
				comparison,
				diff,
				selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
				candidate: hunkCandidate(before, after, metadata, 0, direction === 'staged' ? 'reject' : 'accept'),
			});
			expect(execFileSync('git', ['show', ':new.md'], { cwd, encoding: 'utf8', env: gitEnvironment() })).toBe(
				direction === 'staged' ? after.replace(/^new/, 'old') : before.replace(/^old/, 'new'),
			);
			expect(git('ls-files', '--stage', 'new.md')).toMatch(
				process.platform === 'win32' ? /^100644 / : /^100755 /,
			);
			expect(git('ls-files', '--stage', 'old.md')).toBe('');
			expect(git('rev-parse', ':other.md')).toBe(other);
			expect(git('rev-parse', 'HEAD')).toBe(head);
			expect(git('diff', '--cached', '--name-status', '--find-renames')).toContain('old.md\tnew.md');
			expect(readFileSync(path.join(cwd, 'new.md'), 'utf8')).toBe(after);
			await expect(
				service.applyIndexHunks({
					repositoryId: (await service!.versionAccess()).repositoryId,
					path: 'new.md',
					direction: direction === 'staged' ? 'unstage' : 'stage',
					head,
					indexId: currentIndex.id,
					worktreeId: worktree.id,
					comparison,
					diff,
					selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
					candidate: 'stale',
				}),
			).rejects.toThrow();
		} finally {
			service?.dispose();
			rmSync(cwd, { recursive: true, force: true });
		}
	},
);

test.each(['new', 'deleted', 'empty'] as const)(
	'real Git %s hunk restore uses checkpoint/receipt/undo and leaves index unchanged',
	async (kind) => {
		const { RestoreService } = await import('../../src/modules/versioning/services/restore-service');
		const { CheckpointStore } = await import('../../src/modules/versioning/services/checkpoint-store');
		const { sameDocumentSnapshot } = await import('../../src/shared/storage/document-mutation');
		const { unlinkSync } = await import('node:fs');
		const cwd = mkdtempSync(path.join(tmpdir(), 'huhu-missing-restore-'));
		const git = (...args: string[]) =>
			execFileSync('git', args, { cwd, encoding: 'utf8', env: gitEnvironment() }).trim();
		let service: SyncService | undefined, restores: InstanceType<typeof RestoreService> | undefined;
		try {
			git('init', '-qb', 'main');
			git('config', 'user.name', 'Restore');
			git('config', 'user.email', 'restore@example.test');
			git('config', 'commit.gpgsign', 'false');
			git('config', 'core.autocrlf', 'false');
			writeFileSync(path.join(cwd, '.gitignore'), '.huhu/\n');
			writeFileSync(path.join(cwd, 'note.md'), kind === 'empty' ? '' : 'old\n');
			git('add', '.');
			git('commit', '-qm', 'initial');
			const file = kind === 'new' ? 'new.md' : 'note.md';
			if (kind === 'deleted') unlinkSync(path.join(cwd, file));
			else writeFileSync(path.join(cwd, file), 'new\n');
			service = new SyncService({
				host: desktopGitHost(cwd, 'restore-device'),
				settings: { get: () => syncSettings.defaults() } as never,
				dialogs: { confirmUpstream: async () => true },
				notify() {},
				describe: () => '',
			});
			await service.connect();
			const q = new HistoryQueryService(() => service!.versionAccess());
			const [index, worktree] = await Promise.all([
				q.resolve({ kind: 'index', path: file }),
				q.resolve({ kind: 'worktree', path: file }),
			]);
			const indexText = index.status === 'text' ? index.snapshot.text : null,
				worktreeText = worktree.status === 'text' ? worktree.snapshot.text : null;
			const metadata = parseDiffFromFile(
				indexText === null ? null : { name: file, contents: indexText },
				worktreeText === null ? null : { name: file, contents: worktreeText },
				{ context: 2 },
				true,
			);
			const diff = hunkProof(indexText ?? '', worktreeText ?? '', metadata),
				chunk = diff.chunks[0]!;
			const files = new Map<string, string>();
			const checkpoints = new CheckpointStore(
				{
					exists: async (p) => files.has(p),
					mkdir: async () => {},
					read: async (p) => files.get(p)!,
					write: async (p, text) => {
						files.set(p, text);
					},
				},
				'restore-device',
			);
			const capture = async (p: string) => {
				const exists = existsSync(path.join(cwd, p));
				const text = exists ? readFileSync(path.join(cwd, p), 'utf8') : null;
				return {
					path: p,
					documentKey: `${exists ? 'file' : 'missing'}:${p}`,
					exists,
					text,
					diskText: text,
					buffers: [],
				};
			};
			restores = new RestoreService({
				checkpoints,
				gate: service.restoreGate(),
				documents: {
					capture,
					exclusive: (_p, work) => work(),
					editableText: (text) => text,
					apply: async (expected, text) => {
						expect(sameDocumentSnapshot(expected, await capture(expected.path))).toBe(true);
						if (text === null) unlinkSync(path.join(cwd, expected.path));
						else writeFileSync(path.join(cwd, expected.path), text);
						return capture(expected.path);
					},
				},
			});
			const initialIndex = git('ls-files', '--stage'),
				head = git('rev-parse', 'HEAD');
			const plan = await restores.prepare({
				source: { id: index.id, text: indexText ?? '' },
				targetPath: file,
				mode: 'replace-current',
				gitHunks: {
					repositoryId: (await service!.versionAccess()).repositoryId,
					path: file,
					targetPath: file,
					indexId: index.id,
					worktreeId: worktree.id,
					indexText,
					worktreeText,
					diff,
					selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
				},
			});
			expect(plan.afterText).toBe(indexText);
			const receipt = await restores.apply(plan.id);
			expect(receipt.stage).toBe('verified');
			expect((await capture(file)).text).toBe(indexText);
			expect(git('ls-files', '--stage')).toBe(initialIndex);
			expect(git('rev-parse', 'HEAD')).toBe(head);
			await restores.undo(receipt.id);
			expect((await capture(file)).text).toBe(worktreeText);
			expect(git('ls-files', '--stage')).toBe(initialIndex);
		} finally {
			await restores?.dispose();
			await service?.dispose();
			rmSync(cwd, { recursive: true, force: true });
		}
	},
);

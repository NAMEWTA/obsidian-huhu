import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';
import { GitRepo } from '../../src/modules/versioning/core/repo';
import type { ResolvedEndpoint } from '../../src/modules/versioning/core/history';
import { createGitRunner } from '../../src/modules/versioning/platform/desktop/git-runner';
import {
	createRevisionReader,
	MAX_SNAPSHOT_BYTES,
} from '../../src/modules/versioning/platform/desktop/revision-reader';
import { gitEnvironment } from '../../src/modules/versioning/platform/desktop/git-environment';
import { HistoryQueryService } from '../../src/modules/versioning/services/history-query';
import { SyncService } from '../../src/modules/versioning/services/sync-service';
import { desktopGitHost } from '../../src/modules/versioning/platform/desktop/host';
import { syncSettings, type SyncSettings } from '../../src/modules/versioning/settings';
import type { SettingsHandle } from '../../src/shared/settings/store';
import { VERSIONING_RECOVERY_ROOT } from '../../src/shared/storage/vault-layout';

const base = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'huhu-git-history-')));
const runners: ReturnType<typeof createGitRunner>[] = [];
afterAll(() => {
	for (const runner of runners) runner.dispose();
	rmSync(base, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
	return execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		env: gitEnvironment(),
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
}
function write(root: string, relative: string, value: string | Uint8Array): void {
	const file = path.join(root, relative);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, value);
}
function fixture(name: string, sha256 = false) {
	const cwd = path.join(base, name);
	mkdirSync(cwd);
	git(cwd, 'init', '-q', '-b', 'main', ...(sha256 ? ['--object-format=sha256'] : []));
	git(cwd, 'config', 'user.name', 'History test');
	git(cwd, 'config', 'user.email', 'history@example.test');
	git(cwd, 'config', 'commit.gpgsign', 'false');
	git(cwd, 'config', 'core.autocrlf', 'false');
	const runner = createGitRunner('git', cwd);
	runners.push(runner);
	const repo = new GitRepo(runner);
	const reader = createRevisionReader(runner, cwd);
	const service = new HistoryQueryService(async () => ({ repositoryId: cwd, repo, reader }));
	const commit = (message: string) => {
		git(cwd, 'add', '-A', '--', '.');
		git(cwd, 'commit', '-qm', message);
		return git(cwd, 'rev-parse', 'HEAD');
	};
	return { cwd, runner, repo, reader, service, commit };
}
function text(endpoint: ResolvedEndpoint): string {
	assert.equal(endpoint.status, 'text', JSON.stringify(endpoint));
	if (endpoint.status !== 'text') throw new Error('Expected text');
	return endpoint.snapshot.text;
}

describe('immutable Git note history', { timeout: 30_000 }, () => {
	test('follows detected renames, pins pagination and retains each historical path', async () => {
		const f = fixture('rename');
		const wildcard = process.platform === 'win32' ? '' : '*';
		const before = `笔记/旧 [x]${wildcard}.md`,
			after = `笔记/新 [x]${wildcard}.md`;
		write(f.cwd, before, 'alpha\nbeta\ngamma\n');
		const first = f.commit('first');
		git(f.cwd, 'mv', '--', before, after);
		const renamed = f.commit('rename');
		write(f.cwd, after, 'alpha\nbeta\ngamma\ndelta\n');
		const last = f.commit('edit');
		const page1 = await f.service.fileHistory(after, { limit: 1 });
		assert.equal(page1.tip, last);
		assert.equal(page1.entries[0]?.commitOid, last);
		write(f.cwd, after, 'new head\n');
		f.commit('arrived while browsing');
		const page2 = await f.service.fileHistory(after, { limit: 1, cursor: page1.nextCursor });
		assert.equal(page2.tip, last);
		assert.equal(page2.entries[0]?.commitOid, renamed);
		assert.equal(page2.entries[0]?.previousPath, before);
		const page3 = await f.service.fileHistory(after, { limit: 1, cursor: page2.nextCursor });
		assert.equal(page3.entries[0]?.commitOid, first);
		assert.equal(page3.entries[0]?.pathAtRevision, before);
		assert.equal(page3.complete, true);
		assert.equal(text(await f.service.resolve(page3.entries[0]!.ref)), 'alpha\nbeta\ngamma\n');
		const comparison = await f.service.commitComparison(renamed, after);
		assert.equal(comparison.left.path, before);
		assert.equal(comparison.right.path, after);
		assert.equal(comparison.identical, true);
	});

	test('separates staged, worktree and unsaved buffer snapshots without changing HEAD or index', async () => {
		const f = fixture('layers');
		write(f.cwd, 'note.md', 'head\n');
		const head = f.commit('base');
		write(f.cwd, 'note.md', 'staged\n');
		git(f.cwd, 'add', '--', 'note.md');
		write(f.cwd, 'note.md', 'disk\n');
		const index = readFileSync(path.join(f.cwd, '.git/index'));
		const staged = await f.service.compare({
			intent: 'staged',
			left: { kind: 'commit', commit: head, path: 'note.md' },
			right: { kind: 'index', path: 'note.md' },
		});
		assert.equal(text(staged.left), 'head\n');
		assert.equal(text(staged.right), 'staged\n');
		const unstaged = await f.service.compare({
			intent: 'unstaged',
			left: { kind: 'index', path: 'note.md' },
			right: { kind: 'worktree', path: 'note.md' },
		});
		assert.equal(text(unstaged.left), 'staged\n');
		assert.equal(text(unstaged.right), 'disk\n');
		const draft = await f.service.compare({
			intent: 'history-current',
			left: { kind: 'commit', commit: head, path: 'note.md' },
			right: { kind: 'editor-buffer', path: 'note.md', text: 'unsaved\n', generation: 4 },
		});
		assert.equal(text(draft.right), 'unsaved\n');
		assert.equal(git(f.cwd, 'rev-parse', 'HEAD'), head);
		assert.deepEqual(readFileSync(path.join(f.cwd, '.git/index')), index);
		assert.equal(readFileSync(path.join(f.cwd, 'note.md'), 'utf8'), 'disk\n');
	});

	test('root and merge comparisons use an explicit selected parent', async () => {
		const f = fixture('parents');
		write(f.cwd, 'note.md', 'base\n');
		const initial = f.commit('root');
		const root = await f.service.commitComparison(initial, 'note.md');
		assert.equal(root.left.status, 'missing');
		assert.equal(text(root.right), 'base\n');
		assert.deepEqual(
			(await f.service.changedFiles(null, initial)).map((file) => file.path),
			['note.md'],
		);
		git(f.cwd, 'checkout', '-qb', 'feature');
		write(f.cwd, 'note.md', 'feature\n');
		const feature = f.commit('feature');
		git(f.cwd, 'checkout', '-q', 'main');
		write(f.cwd, 'other.md', 'main\n');
		const main = f.commit('main');
		git(f.cwd, 'merge', '--no-ff', '-qm', 'merge', 'feature');
		const merge = git(f.cwd, 'rev-parse', 'HEAD');
		assert.equal(
			(await f.repo.graphLog(0, 10, { branches: 'all', remotes: false, ref: feature }))[0]?.hash,
			feature,
		);
		await assert.rejects(
			f.repo.graphLog(0, 10, { branches: 'all', remotes: false, ref: '--help' }),
			/revision not found/,
		);
		assert.equal(text((await f.service.commitComparison(merge, 'note.md', main)).left), 'base\n');
		assert.equal((await f.service.commitComparison(merge, 'note.md', feature)).identical, true);
		await assert.rejects(f.service.commitComparison(merge, 'note.md', initial), /not a commit parent/);
	});

	test('preserves UTF-8 BOM, CRLF, no-final-newline and literal special paths', async () => {
		const f = fixture('bytes');
		const file = process.platform === 'win32' ? 'notes/含 空格 [x].md' : 'notes/含 空格 [*] ?\nline.md';
		const source = '\ufeff标题\r\n正文';
		write(f.cwd, file, source);
		const oid = f.commit('bytes');
		const endpoint = await f.service.resolve({ kind: 'commit', commit: oid, path: file });
		assert.equal(text(endpoint), source);
		if (endpoint.status !== 'text') return;
		assert.equal(endpoint.snapshot.eol, 'crlf');
		assert.equal(endpoint.snapshot.hasBom, true);
		assert.equal(endpoint.snapshot.endsWithNewline, false);
		assert.equal(endpoint.snapshot.byteLength, Buffer.byteLength(source));
		assert.equal((await f.service.fileHistory(file)).entries[0]?.pathAtRevision, file);
		assert.equal(text(await f.service.resolve({ kind: 'worktree', path: file })), source);
	});

	test('distinguishes absent files, bad revisions, binary data and oversized content', async () => {
		const f = fixture('states');
		write(f.cwd, 'binary.dat', new Uint8Array([65, 0, 66]));
		write(f.cwd, 'invalid.md', new Uint8Array([255, 254]));
		write(f.cwd, 'large.md', 'a'.repeat(MAX_SNAPSHOT_BYTES + 1));
		const oid = f.commit('states');
		assert.equal((await f.service.resolve({ kind: 'commit', commit: oid, path: 'absent.md' })).status, 'missing');
		assert.equal(
			(await f.service.resolve({ kind: 'commit', commit: 'no-such-ref', path: 'absent.md' })).status,
			'error',
		);
		for (const file of ['binary.dat', 'invalid.md'])
			assert.equal((await f.service.resolve({ kind: 'commit', commit: oid, path: file })).status, 'binary');
		assert.equal((await f.service.resolve({ kind: 'commit', commit: oid, path: 'large.md' })).status, 'too-large');
		assert.equal((await f.service.resolve({ kind: 'worktree', path: 'large.md' })).status, 'too-large');
		await assert.rejects(f.service.resolve({ kind: 'worktree', path: '../escape.md' }), /outside-index/);
	});

	test('an unborn repository has no commits but can compare a new note against empty', async () => {
		const f = fixture('unborn');
		write(f.cwd, 'new.md', 'new\n');
		assert.equal((await f.service.fileHistory('new.md')).tip, null);
		const comparison = await f.service.compare({
			intent: 'unstaged',
			left: { kind: 'empty', path: 'new.md' },
			right: { kind: 'worktree', path: 'new.md' },
		});
		assert.equal(comparison.canCompare, true);
		assert.equal(comparison.left.status, 'missing');
		assert.equal(text(comparison.right), 'new\n');
	});

	test('a recreated path does not claim the deleted predecessor as the same note', async () => {
		const f = fixture('recreated');
		write(f.cwd, 'note.md', 'old\n');
		f.commit('old document');
		git(f.cwd, 'rm', '--', 'note.md');
		f.commit('delete');
		write(f.cwd, 'note.md', 'unrelated new document\n');
		const created = f.commit('new document');
		const history = await f.service.fileHistory('note.md');
		assert.deepEqual(
			history.entries.map((entry) => entry.commitOid),
			[created],
		);
	});

	test('aborted requests reject instead of turning cancellation into an empty history or error snapshot', async () => {
		const f = fixture('cancel');
		const controller = new AbortController();
		controller.abort();
		await assert.rejects(f.service.fileHistory('note.md', { signal: controller.signal }), /cancelled/);
		await assert.rejects(
			f.reader.resolve({ kind: 'worktree', path: 'note.md' }, { signal: controller.signal }),
			/cancelled/,
		);
		await assert.rejects(f.runner.runBytes!(['status'], { signal: controller.signal }), /cancelled/);
	});

	test('SHA-256 repositories derive their own empty tree for root comparisons', async () => {
		const f = fixture('sha256', true);
		write(f.cwd, 'note.md', 'sha256\n');
		const oid = f.commit('root');
		assert.equal(oid.length, 64);
		assert.equal((await f.repo.emptyTree()).length, 64);
		assert.deepEqual(
			(await f.service.changedFiles(null, oid)).map((file) => file.path),
			['note.md'],
		);
		assert.equal(text((await f.service.commitComparison(oid, 'note.md')).right), 'sha256\n');
	});

	test('bounded immutable blob LRU shares identical objects across paths and does not cache mutable sources', async () => {
		const f = fixture('cache');
		for (let i = 0; i < 33; i++) write(f.cwd, `${i}.md`, `value ${i}\n`);
		write(f.cwd, 'alias.md', 'value 0\n');
		const oid = f.commit('objects');
		let reads = 0;
		const runBytes = f.runner.runBytes!;
		f.runner.runBytes = (args, options) => {
			if (args[0] === 'cat-file' && args[1] === 'blob') reads++;
			return runBytes(args, options);
		};
		const read = (file: string) => f.reader.resolve({ kind: 'commit', commit: oid, path: file });
		await read('0.md');
		await read('alias.md');
		assert.equal(reads, 1);
		await read('1.md');
		await read('0.md');
		for (let i = 2; i < 33; i++) await read(`${i}.md`);
		const filled = reads;
		await read('0.md');
		assert.equal(reads, filled, 'recently read object remains cached');
		await read('1.md');
		assert.equal(reads, filled + 1, 'least recently used object was evicted');
		assert.equal(text(await f.reader.resolve({ kind: 'worktree', path: '0.md' })), 'value 0\n');
		write(f.cwd, '0.md', 'new worktree\n');
		assert.equal(text(await f.reader.resolve({ kind: 'worktree', path: '0.md' })), 'new worktree\n');
		git(f.cwd, 'add', '--', '0.md');
		assert.equal(text(await f.reader.resolve({ kind: 'index', path: '0.md' })), 'new worktree\n');
		write(f.cwd, '0.md', 'new index\n');
		git(f.cwd, 'add', '--', '0.md');
		assert.equal(text(await f.reader.resolve({ kind: 'index', path: '0.md' })), 'new index\n');
	});

	test('restore gate fingerprints HEAD and index, preserves the index during worktree writes and persists its hold', async () => {
		const f = fixture('restore-gate');
		write(f.cwd, 'note.md', 'base\n');
		f.commit('base');
		const settings = { get: () => syncSettings.defaults() } as unknown as SettingsHandle<SyncSettings>;
		const sync = new SyncService({
			host: desktopGitHost(f.cwd, 'history-device'),
			settings,
			dialogs: { confirmUpstream: async () => true },
			notify() {},
			describe: () => '',
		});
		try {
			await sync.connect();
			const gate = sync.restoreGate();
			const baseline = await gate.capture();
			const head = git(f.cwd, 'rev-parse', 'HEAD');
			const index = readFileSync(path.join(f.cwd, '.git/index'));
			const ignores = readFileSync(path.join(f.cwd, '.gitignore'));
			await gate.run('restore-test', async () => {
				await gate.assertCheckpointProtection();
				await gate.hold('restore-test');
				write(f.cwd, 'note.md', 'restored\n');
				assert.equal(await gate.capture(), baseline);
			});
			assert.equal(git(f.cwd, 'rev-parse', 'HEAD'), head);
			assert.deepEqual(readFileSync(path.join(f.cwd, '.git/index')), index);
			assert.deepEqual(readFileSync(path.join(f.cwd, '.gitignore')), ignores);
			const access = await sync.versionAccess();
			await access.reader.resolve({ kind: 'commit', commit: head, path: 'note.md' });
			assert.equal(await gate.capture(), baseline);
			git(f.cwd, 'add', '--', 'note.md');
			const staged = await gate.capture();
			assert.notEqual(staged, baseline);
			git(f.cwd, 'commit', '-qm', 'changed HEAD');
			assert.notEqual(await gate.capture(), staged);
			await sync.connect();
			assert.equal(sync.snapshot.device.restoreHold, 'restore-test');
			await sync.acknowledgeRestore();
			assert.equal(sync.snapshot.device.restoreHold, undefined);
		} finally {
			await sync.dispose();
		}
	});

	test('checkpoint protection requires an ignored directory and refuses tracked recovery without repairing it', async () => {
		const f = fixture('protection');
		write(f.cwd, 'note.md', 'base\n');
		f.commit('base');
		const settings = { get: () => syncSettings.defaults() } as unknown as SettingsHandle<SyncSettings>;
		const sync = new SyncService({
			host: desktopGitHost(f.cwd, 'history-device'),
			settings,
			dialogs: { confirmUpstream: async () => true },
			notify() {},
			describe: () => '',
		});
		try {
			await sync.connect();
			const gate = sync.restoreGate();
			write(f.cwd, '.gitignore', `${VERSIONING_RECOVERY_ROOT}/probe.json\n`);
			write(f.cwd, '.git/info/exclude', '');
			await assert.rejects(gate.assertCheckpointProtection(), /protection-required/);
			write(f.cwd, '.gitignore', `${VERSIONING_RECOVERY_ROOT}/\n`);
			await gate.assertCheckpointProtection();
			write(f.cwd, `${VERSIONING_RECOVERY_ROOT}/secret.json`, 'checkpoint\n');
			git(f.cwd, 'add', '-f', '--', `${VERSIONING_RECOVERY_ROOT}/secret.json`);
			const index = readFileSync(path.join(f.cwd, '.git/index'));
			await assert.rejects(gate.assertCheckpointProtection(), /protection-required/);
			assert.deepEqual(readFileSync(path.join(f.cwd, '.git/index')), index);
		} finally {
			await sync.dispose();
		}
	});

	test.skipIf(process.platform === 'win32')('does not follow worktree symlinks outside the repository', async () => {
		const f = fixture('symlink');
		write(base, 'outside.md', 'outside\n');
		symlinkSync(path.join(base, 'outside.md'), path.join(f.cwd, 'linked.md'));
		const endpoint = await f.service.resolve({ kind: 'worktree', path: 'linked.md' });
		assert.equal(endpoint.status, 'binary');
		if (endpoint.status === 'binary') assert.equal(endpoint.reason, 'symlink');
	});
});

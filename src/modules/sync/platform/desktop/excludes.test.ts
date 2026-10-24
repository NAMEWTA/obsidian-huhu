import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { GitError } from '../../core/errors';
import { withManagedExcludes } from '../../core/excludes';
import { GitRepo } from '../../core/repo';
import { desktopGitHost } from './host';
import { createGitRunner } from './git-runner';

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) {
		try {
			chmodSync(path.join(root, '.huhu/browser/dev/profiles/home-music/session/Network/Cookies'), 0o600);
		} catch {
			// not created
		}
		rmSync(root, { recursive: true, force: true });
	}
});

function repository() {
	const root = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'huhu-sync-'));
	roots.push(root);
	execFileSync('git', ['init', '-q'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
	const cookies = path.join(root, '.huhu/browser/dev/profiles/home-music/session/Network/Cookies');
	mkdirSync(path.dirname(cookies), { recursive: true });
	writeFileSync(cookies, 'secret');
	chmodSync(cookies, 0o000);
	mkdirSync(path.join(root, '.huhu/dashboards'), { recursive: true });
	writeFileSync(path.join(root, '.huhu/dashboards/dashboard.md'), '# board');
	mkdirSync(path.join(root, '.huhu/automation/definitions/weekly-1'), { recursive: true });
	writeFileSync(path.join(root, '.huhu/automation/definitions/weekly-1/操作.md'), '# definition');
	mkdirSync(path.join(root, '.huhu/automation/dev/runs'), { recursive: true });
	writeFileSync(path.join(root, '.huhu/automation/dev/runs/1.json'), '{}');
	mkdirSync(path.join(root, 'huhu/闪念/2026/10'), { recursive: true });
	writeFileSync(path.join(root, 'huhu/闪念/2026/10/2026-10-21.md'), '- 16:54 idea');
	writeFileSync(path.join(root, 'note.md'), 'hello');
	return root;
}

// An unreadable file makes `git add` fail for a non-root user; as root every file is readable, so the failing half is skipped.
const unreadable = typeof process.getuid === 'function' && process.getuid() !== 0;

test('managed excludes keep private runtime data out of `git add`, and an unreadable one is reported as an index failure', async () => {
	const root = repository();
	const runner = createGitRunner('git', root);
	const repo = new GitRepo(runner);
	try {
		if (unreadable) {
			const error = await repo.stageAll().then(() => null, (failure: unknown) => failure);
			expect(error).toBeInstanceOf(GitError);
			expect((error as GitError).kind).toBe('index-failed');
			expect((error as GitError).raw).toContain('Cookies');
		}
		const host = desktopGitHost(root, 'dev');
		const file = host.resolve(root, (await repo.git(['rev-parse', '--git-path', 'info/exclude'])).stdout.trim());
		assert.equal(await host.editText(file, (text) => withManagedExcludes(text)), true);
		assert.equal(await host.editText(file, (text) => withManagedExcludes(text)), false, 'second pass changes nothing');
		assert.ok(readFileSync(file, 'utf8').includes('**/.huhu/browser/'));
		await repo.stageAll();
		const staged = await repo.stagedPaths();
		assert.deepEqual(staged.sort(), ['.huhu/automation/definitions/weekly-1/操作.md', '.huhu/dashboards/dashboard.md', 'huhu/闪念/2026/10/2026-10-21.md', 'note.md']);
		const status = await repo.status();
		assert.deepEqual(status.untracked, []);
	} finally {
		runner.dispose();
	}
});

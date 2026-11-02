import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { assertLocalHistoryProtection } from './local-history-protection';
import { gitEnvironment } from './git-environment';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
test('local capture needs no Git in a plain vault, but rejects unprotected or tracked recovery in its actual ancestor repository', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'huhu-local-history-')); roots.push(root);
	const vault = path.join(root, 'vault'); mkdirSync(vault);
	await assertLocalHistoryProtection(vault, '');
	const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
	git('init', '-q');
	await expect(assertLocalHistoryProtection(vault, '')).rejects.toThrow('versioning.localHistory.protection');
	const ignore = 'vault/.huhu/recovery/\n'; writeFileSync(path.join(root, '.gitignore'), ignore);
	await assertLocalHistoryProtection(vault, '');
	const recovery = 'vault/.huhu/recovery/versioning/dev/objects/secret.txt';
	mkdirSync(path.dirname(path.join(root, recovery)), { recursive: true }); writeFileSync(path.join(root, recovery), 'private');
	git('add', '-f', '--', recovery);
	const index = readFileSync(path.join(root, '.git/index'));
	await expect(assertLocalHistoryProtection(vault, '')).rejects.toThrow('versioning.localHistory.protection');
	expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
	expect(readFileSync(path.join(root, '.gitignore'), 'utf8')).toBe(ignore);
});

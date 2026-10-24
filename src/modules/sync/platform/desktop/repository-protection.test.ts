import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { desktopGitHost } from './host';
import { locateRepo } from './locate';
import { createGitRunner } from './git-runner';
const roots: string[] = [];
afterEach(async () => {
	vi.unstubAllEnvs();
	for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function fixture() {
	const root = await realpath(await mkdtemp(path.join(tmpdir(), 'huhu-protect-')));
	roots.push(root);
	return root;
}
function git(cwd: string, ...args: string[]) {
	return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
test('a vault never inherits its parent repository, even through Git environment redirects', async () => {
	const root = await fixture(),
		vault = path.join(root, 'test');
	await mkdir(vault);
	git(root, 'init', '-q');
	expect(await locateRepo('git', vault, '')).toMatchObject({ root: null, parentRoot: root });
	vi.stubEnv('GIT_DIR', path.join(root, '.git'));
	vi.stubEnv('GIT_WORK_TREE', root);
	const runner = createGitRunner('git', vault);
	try {
		expect((await runner.run(['init', '--', vault])).code).toBe(0);
		expect(await locateRepo('git', vault, '')).toMatchObject({ root: vault });
		expect(path.normalize((await runner.run(['rev-parse', '--show-toplevel'])).stdout.trim())).toBe(vault);
	} finally {
		runner.dispose();
	}
});
test('managed ignores preserve custom rules, user data, local files and the exact private staged blob', async () => {
	const root = await fixture();
	git(root, 'init', '-q');
	await writeFile(path.join(root, '.gitignore'), '# User rules\r\ncustom.tmp\r\n');
	await writeFile(path.join(root, '.DS_Store'), 'index-only value');
	git(root, 'add', '.DS_Store');
	await writeFile(path.join(root, '.DS_Store'), 'working value');
	await mkdir(path.join(root, '.huhu/dashboards'), { recursive: true });
	await writeFile(path.join(root, '.huhu/dashboards/main.md'), '# Board');
	await mkdir(path.join(root, '.huhu/config/devices'), { recursive: true });
	await writeFile(path.join(root, '.huhu/config/devices/me.json'), '{}');
	await writeFile(path.join(root, '.huhu/config/settings.json'), '{}');
	await mkdir(path.join(root, '.huhu/safe'), { recursive: true });
	await writeFile(path.join(root, '.huhu/safe/vault.enc'), 'ciphertext');
	await mkdir(path.join(root, '.host-config/plugins/huhu'), { recursive: true });
 await writeFile(path.join(root, '.host-config/plugins/huhu/data.json'), 'legacy private settings');
 await mkdir(path.join(root, '.host-config/plugins/other'), { recursive: true });
 await writeFile(path.join(root, '.host-config/plugins/other/data.json'), 'other plugin settings');
 const host = desktopGitHost(root, 'device', undefined, '.host-config');
	const result = await host.protectRepository!('git', root);
	expect(result.removed).toEqual(['.DS_Store']);
	expect(await readFile(path.join(root, '.DS_Store'), 'utf8')).toBe('working value');
	const receipt = JSON.parse(await readFile(path.join(root, result.recovery!, 'manifest.json'), 'utf8'));
	expect(Buffer.from(receipt.entries[0].blob, 'base64').toString()).toBe('index-only value');
	expect(await readFile(path.join(root, '.gitignore'), 'utf8')).toContain('# User rules\r\ncustom.tmp\r\n');
	git(root, 'add', '.');
	const staged = git(root, 'ls-files');
	expect(staged).not.toContain('.DS_Store');
	expect(staged).not.toContain('devices');
 expect(staged).not.toContain('.host-config/plugins/huhu');
 expect(staged).toContain('.host-config/plugins/other/data.json');
	expect(staged).not.toContain('recovery');
	for (const file of ['.huhu/config/settings.json', '.huhu/dashboards/main.md', '.huhu/safe/vault.enc'])
		expect(staged).toContain(file);
	expect((await host.protectRepository!('git', root)).removed).toEqual([]);
	expect(await readdir(path.join(root, '.huhu/recovery/git-untrack'))).toHaveLength(1);
});

test('an occupied index or cancelled lifetime never removes staged files', async () => {
 const root = await fixture(); git(root, 'init', '-q');
 await writeFile(path.join(root, '.DS_Store'), 'staged value'); git(root, 'add', '.DS_Store');
 const original = await readFile(path.join(root, '.git/index'));
 const host = desktopGitHost(root, 'device');
 const abort = new AbortController(); abort.abort();
 await expect(host.protectRepository!('git', root, abort.signal)).rejects.toThrow('cancelled');
 await writeFile(path.join(root, '.git/index.lock'), 'owned elsewhere');
 await expect(host.protectRepository!('git', root)).rejects.toThrow('locked');
 expect(await readFile(path.join(root, '.git/index'))).toEqual(original);
 expect(await readFile(path.join(root, '.git/index.lock'), 'utf8')).toBe('owned elsewhere');
 expect(await readFile(path.join(root, '.DS_Store'), 'utf8')).toBe('staged value');
});

test('removing a connected vault repository cannot make a running command discover its parent', async () => {
 const root = await fixture(), vault = path.join(root, 'vault'); await mkdir(vault);
 git(root, 'init', '-q'); await writeFile(path.join(root, 'outside-sentinel.md'), 'outside');
 git(vault, 'init', '-q'); const runner = createGitRunner('git', vault);
 try {
  expect(path.normalize((await runner.run(['rev-parse', '--show-toplevel'])).stdout.trim())).toBe(vault);
  await rm(path.join(vault, '.git'), { recursive: true });
  const result = await runner.run(['status', '--porcelain']);
  expect(result.code).not.toBe(0); expect(result.stdout).toBe('');
  expect(result.stdout).not.toContain('outside-sentinel');
 } finally { runner.dispose(); }
});

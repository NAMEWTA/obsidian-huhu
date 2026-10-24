import { expect, test } from 'vitest';
import { installSteps, upgradeSteps, isNpmManaged, agentPackage } from './packages';
import { compareVersions, hasNewerVersion, parseInstallLocations, parseVersion } from './versions';

test('parseVersion reads the first version in typical --version output', () => {
	expect(parseVersion('codex-cli 0.162.0\n')).toBe('0.162.0');
	expect(parseVersion('2.1.3 (Claude Code)')).toBe('2.1.3');
	expect(parseVersion('v1.19.3')).toBe('1.19.3');
	expect(parseVersion('1.0.0-beta.2')).toBe('1.0.0-beta.2');
	expect(parseVersion('command not found')).toBeUndefined();
});

test('version comparison orders numbers and pre-releases', () => {
	expect(compareVersions('0.162.0', '0.163.0')).toBeLessThan(0);
	expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
	expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBeLessThan(0);
	expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
	expect(hasNewerVersion('0.162.0', '0.163.0')).toBe(true);
	expect(hasNewerVersion('0.163.0', '0.163.0')).toBe(false);
	expect(hasNewerVersion(undefined, '1.0.0')).toBe(false);
});

test('which -a output yields every distinct Unix installation', () => {
	expect(parseInstallLocations('/home/u/.local/bin/codex\n/usr/bin/codex\n/home/u/.local/bin/codex\n', 'linux')).toEqual([
		'/home/u/.local/bin/codex',
		'/usr/bin/codex',
	]);
	expect(parseInstallLocations('which: no codex in (/bin)\n', 'linux')).toEqual([]);
});

test('where output collapses npm shims of one install and keeps separate installs', () => {
	const out = [
		'C:\\Users\\u\\AppData\\Roaming\\npm\\codex',
		'C:\\Users\\u\\AppData\\Roaming\\npm\\codex.cmd',
		'C:\\Users\\u\\AppData\\Roaming\\npm\\codex.ps1',
		'D:\\tools\\codex.exe',
	].join('\r\n');
	expect(parseInstallLocations(out, 'win32')).toEqual(['C:\\Users\\u\\AppData\\Roaming\\npm\\codex.cmd', 'D:\\tools\\codex.exe']);
	expect(parseInstallLocations('INFO: Could not find files for the given pattern(s).', 'win32')).toEqual([]);
});

test('install tries the official script before npm, npm only without a script', () => {
	const claude = installSteps('claude-code', 'linux');
	expect(claude.map((s) => s.kind)).toEqual(['script', 'npm']);
	expect(claude[0]!.args.join(' ')).toContain('https://claude.ai/install.sh');
	expect(claude[1]!.args.slice(0, 3)).toEqual(['i', '-g', '@anthropic-ai/claude-code@latest']);
	expect(installSteps('claude-code', 'win32')[0]!.file).toBe('powershell');
	expect(installSteps('gemini', 'linux').map((s) => s.kind)).toEqual(['npm']);
	// opencode has a Unix script only; Windows goes straight to npm.
	expect(installSteps('opencode', 'win32').map((s) => s.kind)).toEqual(['npm']);
	expect(installSteps('grok', 'darwin')[1]!.args).toContain('@xai-official/grok@latest');
});

test('upgrade uses npm for npm-managed copies and the CLI updater otherwise', () => {
	expect(isNpmManaged('/usr/lib/node_modules/@openai/codex/bin/codex.js')).toBe(true);
	expect(isNpmManaged('C:\\Users\\u\\AppData\\Roaming\\npm\\codex.cmd')).toBe(true);
	expect(isNpmManaged('/home/u/.local/bin/claude')).toBe(false);
	expect(upgradeSteps('codex', '/usr/lib/node_modules/@openai/codex/bin/codex.js', 'codex').map((s) => s.kind)).toEqual(['npm']);
	const native = upgradeSteps('claude-code', '/home/u/.local/bin/claude', 'claude');
	expect(native.map((s) => s.kind)).toEqual(['update', 'npm']);
	expect(native[0]).toMatchObject({ file: '/home/u/.local/bin/claude', args: ['update'] });
	expect(upgradeSteps('gemini', '/x/gemini', 'gemini').map((s) => s.kind)).toEqual(['npm']);
});

test('every agent without a package has no steps', () => {
	expect(agentPackage('pi')?.npm).toBe('@earendil-works/pi-coding-agent');
	expect(upgradeSteps('claude-code', undefined, 'claude').length).toBeGreaterThan(0);
});

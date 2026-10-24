import { test } from 'vitest';
import assert from 'node:assert/strict';
import { posix, win32 } from 'node:path';
import { absoluteVaultPath, resolvePluginDirectory } from './filesystem-paths.ts';

test('plugin paths retain native roots, Unicode, spaces and literal percent escapes', () => {
	assert.equal(
		resolvePluginDirectory('/库 A/%20', '.config', undefined, 'huhu', posix),
		'/库 A/%20/.config/plugins/huhu',
	);
	assert.equal(resolvePluginDirectory('/', '.obsidian', undefined, 'huhu', posix), '/.obsidian/plugins/huhu');
	assert.equal(resolvePluginDirectory('/vault', '.obsidian', '/external/plugin', 'huhu', posix), '/external/plugin');
	assert.equal(
		resolvePluginDirectory('C:\\库 A', '.obsidian', undefined, 'huhu', win32),
		'C:\\库 A\\.obsidian\\plugins\\huhu',
	);
	assert.equal(
		resolvePluginDirectory('\\\\server\\share\\vault', '.config', undefined, 'huhu', win32),
		'\\\\server\\share\\vault\\.config\\plugins\\huhu',
	);
	assert.throws(() => absoluteVaultPath('relative/vault', posix), /absolute/);
});

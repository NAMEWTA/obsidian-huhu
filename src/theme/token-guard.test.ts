import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
test('the real style guard rejects a second palette and removed UI aliases while accepting semantic colors', () => {
	const directory = mkdtempSync(join(tmpdir(), 'huhu-token-guard-'));
	const file = join(directory, 'bridge.css');
	try {
		for (const [css, status] of [
			['.huhu-ui { color:var(--hu-fg); }', 0],
			['.huhu-ui { color:#ff0000; }', 1],
			['.huhu-ui { color:red; }', 1],
			['.huhu-ui { background:color(display-p3 1 0 0); }', 1],
			['.huhu-ui { background:color-mix(in srgb, red 10%, var(--hu-surface)); }', 1],
			['.huhu-ui { color:currentColor; background:transparent; border-color:var(--hu-line); }', 0],
			['.huhu-ui { color:var(--nt-foreground); }', 1],
		] as const) {
			writeFileSync(file, css);
			const result = spawnSync(process.execPath, ['scripts/lint-css.mjs', '--check-token-file', file], {
				encoding: 'utf8',
			});
			expect(result.status, result.stderr).toBe(status);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

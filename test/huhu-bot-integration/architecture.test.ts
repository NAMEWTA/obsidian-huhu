import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

test('whole-product acceptance entry has a safe code-only check', () => {
	const output = execFileSync(process.execPath, ['scripts/obsidian-acceptance/huhu-bot.mjs', '--check'], { encoding: 'utf8' });
	const result = JSON.parse(output) as { mode: string; liveRun: boolean; required: string[] };
	expect(result).toMatchObject({ mode: 'bundle-check', liveRun: false });
	expect(result.required).toContain('native/huhubot/cmd/huhubot/main.go');
});

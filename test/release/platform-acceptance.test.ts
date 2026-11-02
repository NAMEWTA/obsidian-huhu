import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from 'vitest';

interface Entry { os: string; target: string; asset: string; ext: string }
const workflow = parse(readFileSync('.github/workflows/terminal-build.yml', 'utf8')) as { jobs: { build: { strategy: { matrix: { include: Entry[] } } } } };
const matrix = workflow.jobs.build.strategy.matrix.include;
const checklist = readFileSync('docs/agent-workbench-acceptance.md', 'utf8');

const triple = (entry: Entry): string => {
	const [platform, arch] = entry.asset.split('-') as [string, string];
	const cpu = arch === 'x64' ? 'x86_64' : 'aarch64';
	if (platform === 'linux') return `${cpu}-unknown-linux-gnu`;
	if (platform === 'darwin') return `${cpu}-apple-darwin`;
	return `${cpu}-pc-windows-msvc`;
};

test('each of the five CI rows is a distinct OS/arch whose runner, target triple and extension agree', () => {
	expect(new Set(matrix.map(entry => entry.asset)).size).toBe(5);
	expect(matrix.map(entry => entry.asset).sort()).toEqual(['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']);
	for (const entry of matrix) {
		expect(entry.target, entry.asset).toBe(triple(entry));
		expect(entry.ext, entry.asset).toBe(entry.asset.startsWith('win32') ? '.exe' : '');
		const platform = entry.asset.split('-')[0];
		expect(entry.os, entry.asset).toMatch(platform === 'linux' ? /^ubuntu-/ : platform === 'darwin' ? /^macos-/ : /^windows-/);
		if (entry.asset === 'linux-arm64') expect(entry.os).toMatch(/arm/);
	}
});

test('the manual checklist names every CI row, its runner, target and both asset names, and promises no platform passed', () => {
	for (const entry of matrix) {
		expect(checklist, entry.asset).toContain(`\`${entry.os}\``);
		expect(checklist, entry.asset).toContain(`\`${entry.target}\``);
		expect(checklist, entry.asset).toContain(`\`huhu-pty-${entry.asset}${entry.ext}\``);
		expect(checklist, entry.asset).toContain(`\`huhu-${entry.asset}${entry.ext}\``);
	}
	const results = checklist.split('\n').filter(line => /^\| (Linux|macOS|Windows) /.test(line) && line.split('|').length === 8);
	expect(results).toHaveLength(5);
	for (const line of results) expect(line.trimEnd().endsWith('| 待填 |'), line).toBe(true);
	expect(checklist).not.toMatch(/已在(?:Windows|macOS|Linux arm64)[^。]*通过/);
});

test('the manual checklist covers every required end-to-end scenario with step and expectation cells', () => {
	const rows = checklist.split('\n').filter(line => /^\| M-\d\d \|/.test(line));
	expect(rows.map(line => line.split('|')[1]!.trim())).toEqual(Array.from({ length: 17 }, (_, index) => `M-${String(index + 1).padStart(2, '0')}`));
	for (const row of rows) expect(row.split('|').filter(cell => cell.trim()).length, row).toBe(4);
	const required = ['两个 Space', '后台 A/B', '跨 Space', '人工审批', '重新附加', '历史继续与冲突', '独立网页', '退出恢复', 'Codex 与 Claude', '六个入口', '输入法', '多行', '目录与权限', '迁移', '备份与恢复'];
	for (const topic of required) expect(rows.some(row => row.includes(topic)), topic).toBe(true);
});

test('the checklist is reachable from the workbench guide and records the writer-port workaround', () => {
	expect(readFileSync('docs/agent-workbench.md', 'utf8')).toContain('(agent-workbench-acceptance.md)');
	expect(checklist).toContain('OWNER_CONFLICT');
	expect(checklist).toContain('port-in-use');
	expect(readFileSync('docs/data.md', 'utf8')).toMatch(/OWNER_CONFLICT[^\n]*port-in-use[^\n]*重启 Obsidian/);
});

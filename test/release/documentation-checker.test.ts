import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('documentation checks use ownership and links, not directory names, and respect ignored scratch files', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'huhu-doc-check-'));
	const write = (file: string, text: string) => {
		const target = path.join(root, file);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, text);
	};
	const run = () =>
		spawnSync(process.execPath, [path.resolve('scripts/verify-docs.mjs')], { cwd: root, encoding: 'utf8' });
	try {
		expect(spawnSync('git', ['init', '--quiet'], { cwd: root }).status).toBe(0);
		const state = '.agents/speculo/.speculo/specdev';
		const files: Record<string, string> = {
			'.gitignore': 'temp/\n',
			'manifest.json': JSON.stringify({ minAppVersion: '1.13.0' }),
			LICENSE: 'Fixture license',
			NOTICE: 'Fixture notice',
			'src/modules/icons/core/res/NOTICE.txt': 'Fixture notice',
			'src/entry.ts': "const command = { id: 'open-workbench' };",
			'README.md': '[简体中文](README.ZH.md)\n[Workbench](docs/workbench.md) [Privacy](docs/privacy.md)\n',
			'README.ZH.md': '[English](README.md)\n[工作台](docs/workbench.md) [隐私](docs/privacy.md)\n',
			'SECURITY.md': '# 安全\n',
			'docs/README.md': '[工作台](workbench.md) [隐私](privacy.md)\n',
			'docs/workbench.md': '# 工作台\nopen-workbench\n',
			'docs/privacy.md': '# 隐私\n',
			'docs/settings.md': '# 设置\nObsidian 1.13.0\n',
			[`${state}/changes/2026-10-21-docs/README.md`]: '# 文档维护\nOutcome: active\n[规格](spec.md)\n',
			[`${state}/changes/2026-10-21-docs/spec.md`]: '# 文档规格\n',
			[`${state}/changes/archive/2026-10-20-example/README.md`]: '# 历史记录\nOutcome: completed\n',
			[`${state}/context/2026-10-21-terms.md`]: '# 领域术语\n',
		};
		for (const [file, text] of Object.entries(files)) write(file, text);
		mkdirSync(path.join(root, state, 'changes'), { recursive: true });
		write('.agents/speculo/commands/example/COMMAND.md', '# Upstream template\n[Owner path](missing-owner-path.md)\n');
		const baseline = run();
		expect(baseline.status, baseline.stderr).toBe(0);
		write(`${state}/changes/2026-10-21-docs/spec.md`, '# 文档规格\n[证据](missing.md)\n');
		const missingEvidence = run();
		expect(missingEvidence.status).not.toBe(0);
		expect(missingEvidence.stderr).toContain('missing local link missing.md');
		write(`${state}/changes/2026-10-21-docs/spec.md`, files[`${state}/changes/2026-10-21-docs/spec.md`]!);
		write(`${state}/changes/archive/2026-10-20-example/README.md`, '# 历史记录\n[来源](missing.md)\n');
		const missingArchivedSource = run();
		expect(missingArchivedSource.status).not.toBe(0);
		expect(missingArchivedSource.stderr).toContain('missing local link missing.md');
		rmSync(path.join(root, state), { recursive: true });
		const fresh = run();
		expect(fresh.status, fresh.stderr).toBe(0);
		write('docs/workbench.md', '# 工作台\nopen-workbench 与 `records`\n');
		expect(run().stderr).toContain('removed records feature must not be listed');
		write('docs/workbench.md', files['docs/workbench.md']!);

		write('scripts/fixtures/legacy/README.md', '# Historical fixture\n');
		write('temp/backup-docs/draft.md', '[Broken scratch link](missing.md)\n');
		write('docs/old/compatibility.md', '# 兼容说明\n[工作台](../workbench.md)\n');
		const accepted = run();
		expect(accepted.status, accepted.stderr).toBe(0);

		write('docs/old/compatibility.md', '# 兼容说明\n[失效链接](missing.md)\n');
		const rejected = run();
		expect(rejected.status).not.toBe(0);
		expect(rejected.stderr).toContain('missing local link missing.md');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

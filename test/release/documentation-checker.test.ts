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
		write('docs/old/compatibility.md', '# 兼容说明\n[工作台](../workbench.md)\n');

		const capturedInput = `${state}/changes/2026-10-21-docs/inputs/original.md`;
		const punctuation = [
			'## 9. 工具、审批与效果日志', '[工具](#9-工具审批与效果日志)',
			'## 12. 数据、路径与迁移', '[数据](#12-数据路径与迁移)',
			'## 14. 记忆、知识与可扩展能力', '[记忆](#14-记忆知识与可扩展能力)',
			'## 15. 权限、凭证与运行治理', '[权限](#15-权限凭证与运行治理)',
			'## 17. 验证、性能与发布门禁', '[验证](#17-验证性能与发布门禁)',
			'## 19. 决议、未决验证与完成定义', '[决议](#19-决议未决验证与完成定义)',
			'## 中文 Å_ß - key-value', '[字符](#中文-å_ß---key-value)',
			'## 工具、审批', '## 工具审批', '[重复](#工具审批-1)',
		].join('\n');
		write(capturedInput, punctuation);
		write('native/huhubot/tests/contract/chat/testdata/claim-fairness/README.md', '# Immutable test fixture\n');
		const punctuationAndFixture = run();
		expect(punctuationAndFixture.status, punctuationAndFixture.stderr).toBe(0);

		write(capturedInput, `${punctuation}\n[坏锚点](#missing-anchor)\n`);
		const badAnchor = run();
		expect(badAnchor.status).not.toBe(0);
		expect(badAnchor.stderr).toContain(`${capturedInput}: missing heading anchor #missing-anchor`);
		write(capturedInput, punctuation);
		write('native/huhubot/README.md', '# Unclassified production guide\n');
		const unknownNative = run();
		expect(unknownNative.status).not.toBe(0);
		expect(unknownNative.stderr).toContain('unclassified markdown native/huhubot/README.md');
		rmSync(path.join(root, 'native/huhubot/README.md'));

		const inlineCode = `${punctuation}\nGo type \`[][2]string\`; \`[code](missing-code.md)\` [有效][kept]\n[kept]: #9-工具审批与效果日志\n`;
		write(capturedInput, inlineCode);
		const codeSpan = run();
		write(capturedInput, punctuation);
		const source = path.join(root, 'src/entry.ts');
		write('docs/source-links.md', `# 源码\n[源码](<${source}:1>)\n`);
		const sourceLine = run();
		expect({ codeSpan: codeSpan.status, sourceLine: sourceLine.status }, `${codeSpan.stderr}\n${sourceLine.stderr}`).toEqual({ codeSpan: 0, sourceLine: 0 });

		write(capturedInput, `${inlineCode}\n[真实坏链接](missing-adjacent.md)\n`);
		const adjacent = run();
		expect(adjacent.status).not.toBe(0);
		expect(adjacent.stderr).toContain('missing local link missing-adjacent.md');
		for (const body of ['`[真实](missing-delimiter.md)', '``[真实](missing-delimiter.md)`', '\\`[真实](missing-delimiter.md)\\`']) {
			write(capturedInput, body);
			const delimiter = run();
			expect(delimiter.status).not.toBe(0);
			expect(delimiter.stderr).toContain('missing local link missing-delimiter.md');
		}
		write(capturedInput, `${inlineCode}\n\n\`\`\`go\n[][2]string [围栏](missing-fenced.md)\n\`\`\`\n`);
		write('src/literal.go:2', 'A real colon filename\n');
		const literal = path.join(root, 'src/literal.go:2');
		write('docs/source-links.md', `# 源码\n[源码](<${source}:1>) [冒号文件](<${literal}>) [外链](https://example.invalid/file.go:2) [邮件](mailto:example@example.invalid)\n`);
		const legalLinks = run();
		expect(legalLinks.status, legalLinks.stderr).toBe(0);
		for (const target of [
			`${source}:0`, `${source}:-1`, `${source}:1.5`, `${source}:bad`, `${source}:1:2`, `${source}:9007199254740992`,
			`${path.join(root, 'src/missing.ts')}:1`, `${path.join(root, 'src')}:1`,
		]) {
			write('docs/source-links.md', `# 源码\n[无效](<${target}>)\n`);
			const invalid = run();
			expect(invalid.status, target).not.toBe(0);
			expect(invalid.stderr).toContain('missing local link');
		}
		const outside = mkdtempSync(path.join(tmpdir(), 'huhu-doc-outside-'));
		try {
			const outsideSource = path.join(outside, 'external.ts');
			writeFileSync(outsideSource, 'export {};\n');
			write('docs/source-links.md', `# 源码\n[越界](<${outsideSource}:1>)\n`);
			const escaped = run();
			expect(escaped.status).not.toBe(0);
			expect(escaped.stderr).toContain('missing local link');
		} finally {
			rmSync(outside, { recursive: true, force: true });
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

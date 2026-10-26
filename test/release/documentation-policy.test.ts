import { expect, test } from 'vitest';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { documentationKind, githubSlug, referenceLinkBody } from '../../scripts/documentation-policy.mjs';

test('current project guides have one Chinese source, with only the root README bilingual', () => {
	const copies: string[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name);
			if (entry.isDirectory()) walk(file);
			else if (entry.isFile() && entry.name.endsWith('.ZH.md')) copies.push(file);
		}
	};
	walk('docs');
	expect(copies).toEqual([]);
	for (const file of ['CHANGELOG.ZH.md', 'SECURITY.ZH.md']) expect(existsSync(file) && lstatSync(file).isFile()).toBe(false);
	expect(existsSync('README.md') && existsSync('README.ZH.md')).toBe(true);
	for (const [file, heading] of [['docs/data.md', '# 数据与恢复'], ['docs/privacy.md', '# 隐私与数据边界'], ['docs/agent-workbench.md', '# 智能体工作台']]) expect(readFileSync(file!, 'utf8')).toContain(heading);
});

test('change artifacts retain source language while permanent knowledge and third-party guides keep their guide contracts', () => {
	expect(documentationKind('.agents/speculo/.speculo/specdev/changes/example/ticket/01.md')).toBe('specdev-change');
	expect(documentationKind('.agents/speculo/.speculo/specdev/archive/2026-10/example/source.md')).toBe('specdev-change');
	expect(documentationKind('.agents/speculo/.speculo/specdev/context/current-baseline.md')).toBe('specdev');
	expect(documentationKind('.agents/speculo/.speculo/specdev/.config/domain-layout.ZH.md')).toBe('specdev');
	expect(documentationKind('.agents/speculo/commands/example/COMMAND.md')).toBe('speculo-tooling');
	expect(documentationKind('.agents/skills/dev/SKILL.md')).toBe('skill');
	expect(documentationKind('CLAUDE.md')).toBe('agent-handbook');
	expect(documentationKind('docs/third-party/orca-terminal-workbench.md')).toBe('user-doc');
	expect(documentationKind('THIRD-PARTY-NOTICES.md')).toBe('license');
});

test('native package READMEs have project documentation ownership without classifying arbitrary native Markdown', () => {
	expect(documentationKind('native/browser-runtime/README.md')).toBe('native-doc');
	expect(documentationKind('native/pty-server/README.md')).toBe('native-doc');
	expect(documentationKind('docs/browser-runtime.md')).toBe('user-doc');
	expect(documentationKind('native/browser-runtime/src/README.md')).toBe('');
});

// GitHub section links remove punctuation, including the ideographic comma U+3001.
// https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links
test.each([
	['9. 工具、审批与效果日志', '9-工具审批与效果日志'],
	['12. 数据、路径与迁移', '12-数据路径与迁移'],
	['14. 记忆、知识与可扩展能力', '14-记忆知识与可扩展能力'],
	['15. 权限、凭证与运行治理', '15-权限凭证与运行治理'],
	['17. 验证、性能与发布门禁', '17-验证性能与发布门禁'],
	['19. 决议、未决验证与完成定义', '19-决议未决验证与完成定义'],
])('GitHub heading anchors remove Chinese punctuation: %s', (heading, anchor) => {
	expect(githubSlug(heading)).toBe(anchor);
});

test('heading normalization preserves Chinese text, literal underscores and hyphens, and inline content', () => {
	expect(githubSlug('API_v2、CLI-Mode')).toBe('api_v2cli-mode');
	expect(githubSlug('Use `Space_Id`、 [Run](https://example.com/)')).toBe('use-space_id-run');
	expect(githubSlug('9. 工具审批与效果日志')).toBe('9-工具审批与效果日志');
	expect(githubSlug('9. 工具审批与效果日志附录')).not.toBe('9-工具审批与效果日志');
});

test('only captured GitHub issue title labels are literal; body references and ordinary document headings stay checked', () => {
	const file = '.agents/speculo/.speculo/specdev/changes/example/source.md';
	const title = '# Source: #136 [News][Feature] Title';
	const body = `---\nartifact: "source"\nsource_type: "github-issue"\n---\n\n${title}\n\n[Read more][missing]\n[Source](https://example.com/)\n`;
	const checked = referenceLinkBody(file, body);
	expect(checked).not.toContain('[News][Feature]');
	expect(checked).toContain('[Read more][missing]');
	expect(checked).toContain('[Source](https://example.com/)');
	expect(referenceLinkBody('docs/guide.md', body)).toBe(body);
	expect(referenceLinkBody(file, body.replace('github-issue', 'local-file'))).toBe(body.replace('github-issue', 'local-file'));
	expect(referenceLinkBody(file, body.replace('artifact: "source"', 'artifact: "spec"'))).toContain(title);
	expect(referenceLinkBody(file, body.replace(title, '# Requirements [News][Feature]'))).toContain('# Requirements [News][Feature]');
});

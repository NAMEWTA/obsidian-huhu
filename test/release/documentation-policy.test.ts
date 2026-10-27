import { expect, test } from 'vitest';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { documentationKind, referenceLinkBody, withoutCodeSpans } from '../../scripts/documentation-policy.mjs';

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

test('native Bot contract testdata follows fixture ownership while other native documents require classification', () => {
	expect(documentationKind('native/huhubot/tests/contract/chat/testdata/claim-fairness/README.md')).toBe('test-fixture');
	expect(documentationKind('native/huhubot/tests/contract/engine/testdata/example/README.md')).toBe('test-fixture');
	for (const file of [
		'native/huhubot/README.md',
		'native/huhubot/internal/docs/README.md',
		'native/huhubot/tests/contract/chat/README.md',
		'native/other/tests/contract/chat/testdata/README.md',
	]) expect(documentationKind(file), file).toBe('');
});

test('code spans hide link lookalikes while retaining adjacent links and reference definitions', () => {
	const body = 'Go `[][2]string` ``[hidden](missing.md) and `nested` ``[real][2]\n[2]: target.md\n';
	const checked = withoutCodeSpans(body);
	expect(checked).not.toContain('[][2]');
	expect(checked).not.toContain('[hidden]');
	expect(checked).toContain('[real][2]\n[2]: target.md');
	expect(withoutCodeSpans('`first\n[][2] last` [real](target.md)')).not.toContain('[][2]');
	expect(withoutCodeSpans('`first\n[][2] last` [real](target.md)')).toContain('[real](target.md)');
});

test('unclosed, escaped and mismatched code delimiters do not hide real links', () => {
	for (const body of [
		'`unclosed [real](missing.md)',
		'``mismatch [real](missing.md)`',
		'\\`[real](missing.md)\\`',
		'`unclosed\n\n[real](missing.md)`',
	]) expect(withoutCodeSpans(body), body).toContain('[real](missing.md)');
	expect(withoutCodeSpans('``unclosed `[hidden](missing.md)` [real](target.md)')).toContain('[real](target.md)');
	expect(withoutCodeSpans('``unclosed `[hidden](missing.md)` [real](target.md)')).not.toContain('[hidden]');
	expect(withoutCodeSpans('\\\\`[hidden](missing.md)`')).not.toContain('[hidden]');
});

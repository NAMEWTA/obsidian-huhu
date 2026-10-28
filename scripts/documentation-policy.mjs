/** Current project guides are Chinese; the root README is bilingual. Workflow/fixture owners retain their language. */
export function documentationKind(rel) {
	if (rel === 'NOTICE' || rel === 'THIRD-PARTY-NOTICES.md' || rel.endsWith('/NOTICE.txt')) return 'license';
	if (rel.startsWith('docs/')) return 'user-doc';
	if (/^native\/[^/]+\/README\.md$/.test(rel)) return 'native-doc';
	if (/^(README|CHANGELOG|SECURITY)(\.ZH)?\.md$/.test(rel)) return 'root-entry';
	if (rel === 'AGENTS.md') return 'agent-handbook';
	if (/^\.agents\/speculo\/\.speculo\/specdev\/(?:changes|archive)\//.test(rel)) return 'specdev-change';
	if (rel.startsWith('.agents/speculo/.speculo/specdev/')) return 'specdev';
	if (rel.startsWith('.agents/speculo/')) return 'speculo-tooling';
	if (rel === 'CLAUDE.md') return 'agent-handbook';
	if (rel.startsWith('.agents/')) return 'skill';
	if (/^speculo\/\.speculo\/specdev\/(?:changes|archive)\//.test(rel)) return 'specdev-change';
	if (rel.startsWith('speculo/.speculo/specdev/')) return 'specdev';
	if (rel.startsWith('speculo/')) return 'speculo-tooling';
	if (rel.startsWith('src/')) return 'source-template';
	if (rel.startsWith('scripts/fixtures/')) return 'test-fixture';
	if (rel.startsWith('scripts/')) return 'script-doc';
	if (rel.startsWith('test/')) return 'test-fixture';
	if (rel.startsWith('processes/')) return 'process-doc';
	if (rel.startsWith('.github/')) return 'workflow-doc';
	return '';
}

/** Normalize heading text for GitHub section anchors; duplicate suffixes are assigned per document. */
export function githubSlug(text) {
	const plain = text
		.replace(/`([^`]*)`/g, '$1')
		.replace(/!\[[^\]]*\]\([^)\n]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)\n]*\)/g, '$1')
		.replace(/<[^>\n]+>/g, '');
	return plain
		.toLowerCase()
		.replace(/[\u0000-\u001f]/g, '')
		.replace(/[\u2000-\u206F\u2E00-\u2E7F\u3001\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
		.replace(/\s/g, '-');
}

/** Captured issue titles contain literal adjacent labels. Body links and all inline URLs still get checked. */
export function referenceLinkBody(file, body) {
	const metadata = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body)?.[1] ?? '';
	if (documentationKind(file) !== 'specdev-change' || !/^artifact:\s*["']?source["']?\s*$/m.test(metadata) || !/^source_type:\s*["']?github-issue["']?\s*$/m.test(metadata)) return body;
	return body.replace(/^# Source: #\d+ [^\r\n]*$/m, '');
}

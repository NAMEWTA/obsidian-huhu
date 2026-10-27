/** Current project guides are Chinese; the root README is bilingual. Workflow/fixture owners retain their language. */
export function documentationKind(rel) {
	if (rel === 'NOTICE' || rel === 'THIRD-PARTY-NOTICES.md' || rel.endsWith('/NOTICE.txt')) return 'license';
	if (rel.startsWith('docs/')) return 'user-doc';
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
	// Go contract testdata follows fixture ownership; native product guides still require classification.
	if (/^native\/huhubot\/tests\/contract\/[^/]+\/testdata\//.test(rel)) return 'test-fixture';
	if (rel.startsWith('processes/')) return 'process-doc';
	if (rel.startsWith('.github/')) return 'workflow-doc';
	return '';
}

/** Captured issue titles contain literal adjacent labels. Body links and all inline URLs still get checked. */
export function referenceLinkBody(file, body) {
	const metadata = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body)?.[1] ?? '';
	if (documentationKind(file) !== 'specdev-change' || !/^artifact:\s*["']?source["']?\s*$/m.test(metadata) || !/^source_type:\s*["']?github-issue["']?\s*$/m.test(metadata)) return body;
	return body.replace(/^# Source: #\d+ [^\r\n]*$/m, '');
}

/** Mask only closed, equal-length backtick spans; unmatched/escaped openers remain ordinary Markdown. */
export function withoutCodeSpans(text) {
	return text.split(/(\r?\n[ \t]*\r?\n)/).map(paragraph => {
		const runs = [...paragraph.matchAll(/`+/g)];
		const next = new Map(), closes = [];
		for (let index = runs.length - 1; index >= 0; index--) {
			const length = runs[index][0].length;
			closes[index] = next.get(length);
			next.set(length, index);
		}
		const kept = [];
		let position = 0;
		for (let index = 0; index < runs.length; index++) {
			const start = runs[index].index;
			let slashes = 0;
			for (let cursor = start - 1; cursor >= 0 && paragraph[cursor] === '\\'; cursor--) slashes++;
			const close = closes[index];
			if (slashes % 2 || close === undefined) continue;
			const end = runs[close].index + runs[close][0].length;
			kept.push(paragraph.slice(position, start), paragraph.slice(start, end).replace(/[^\r\n]/g, ' '));
			position = end;
			index = close;
		}
		kept.push(paragraph.slice(position));
		return kept.join('');
	}).join('');
}

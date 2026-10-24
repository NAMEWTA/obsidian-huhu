import { readMarkdownDocument, readYaml } from '../../../../shared/storage/markdown-document';
import { validSkillName } from '../../../../shared/agent-prompt';

export interface SkillSource { kind: 'vault' | 'directory' | 'remembered'; path: string; }
export interface SkillEntry { name: string; sources: SkillSource[]; }
export interface SkillScan { entries: SkillEntry[]; unavailable: string[]; }

/** Body text never supplies a name; missing frontmatter/name uses the skill directory. */
export function readSkillName(markdown: string, folder: string): string | undefined {
	const { yaml } = readMarkdownDocument(markdown);
	const name: unknown = yaml === null ? undefined : readYaml(yaml).get('name');
	const candidate = name === undefined || name === null ? folder : name;
	return typeof candidate === 'string' && validSkillName(candidate) ? candidate : undefined;
}

/** Name (directory fallback) and one-line description from the SKILL.md frontmatter; the body never supplies either. */
export function readSkillMeta(markdown: string, folder: string): { name: string; description: string } | undefined {
	const name = readSkillName(markdown, folder);
	if (!name) return undefined;
	const { yaml } = readMarkdownDocument(markdown);
	const description: unknown = yaml === null ? undefined : readYaml(yaml).get('description');
	return { name, description: typeof description === 'string' ? description.replace(/\s+/g, ' ').trim() : '' };
}

export function mergeSkills(entries: readonly SkillEntry[]): SkillEntry[] {
	const merged = new Map<string, SkillEntry>();
	for (const entry of entries) {
		if (!validSkillName(entry.name)) continue;
		const row = merged.get(entry.name) ?? { name: entry.name, sources: [] };
		for (const source of entry.sources) if (!row.sources.some(item => item.kind === source.kind && item.path === source.path)) row.sources.push({ ...source });
		merged.set(entry.name, row);
	}
	return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

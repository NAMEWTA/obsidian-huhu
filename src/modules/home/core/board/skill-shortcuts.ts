import type { SkillShortcut } from './types/model';
import { isStr, spaceField, text } from './shortcut-buttons';

/** A string-valued field when present (even empty), nothing otherwise. */
const str = (key: string, value: unknown) => (isStr(value) ? { [key]: value } : {});

/** Invalid declarations stay in the source document until the user explicitly edits skills. */
export function readSkillShortcuts(value: unknown): SkillShortcut[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const result: SkillShortcut[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
		const row = item as Record<string, unknown>;
		if (!isStr(row.id) || !row.id.trim() || seen.has(row.id) || !isStr(row.agentId) || !row.agentId.trim()) continue;
		if (!isStr(row.label) || !isStr(row.skillName) || !isStr(row.promptTemplate)) continue;
		const target = row.destination;
		if (!target || typeof target !== 'object' || Array.isArray(target)) continue;
		const dest = target as Record<string, unknown>;
		if (dest.kind !== 'fresh' && dest.kind !== 'existing') continue;
		if (dest.kind === 'existing' && !isStr(dest.sessionId)) continue;
		seen.add(row.id);
		result.push({ id: row.id, label: row.label, agentId: row.agentId, skillName: row.skillName, promptTemplate: row.promptTemplate,
			...str('icon', row.icon), ...str('inputPlaceholder', row.inputPlaceholder),
			directSend: row.directSend === true, destination: dest.kind === 'existing' ? { kind: 'existing', sessionId: dest.sessionId as string } : { kind: 'fresh', cwd: text(dest.cwd), ...spaceField(dest.spaceId) } });
	}
	return result;
}

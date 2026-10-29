import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { absoluteHuhuPath } from '../../../../../host/desktop/huhu-paths';
import { loadControlSkill, type ControlSkillLanguage } from '../../../core/control/skill';

/** HUHU-owned source folder for skills that ship with the plugin; never an account or agent directory. */
export const PACKAGED_SKILLS_DIR = '.huhu/skills';

/**
 * Put the packaged HUHU control Skill where the Skills page can offer it as a source. The page's existing explicit toggle
 * is what copies it into an agent's directory; this only refreshes HUHU's own folder, and only when the text differs.
 * Returns the folder to scan, or undefined when there is no vault folder.
 */
export async function materializePackagedSkills(vault: string | undefined, language: ControlSkillLanguage): Promise<string | undefined> {
	if (!vault) return undefined;
	const root = await absoluteHuhuPath(vault, PACKAGED_SKILLS_DIR);
	const folder = await absoluteHuhuPath(vault, `${PACKAGED_SKILLS_DIR}/huhu-control`);
	const file = await absoluteHuhuPath(vault, `${PACKAGED_SKILLS_DIR}/huhu-control/SKILL.md`);
	const text = await loadControlSkill(language);
	const current = await readFile(file, 'utf8').catch(() => undefined);
	if (current !== text) {
		await mkdir(folder, { recursive: true, mode: 0o700 });
		const temporary = `${file}.tmp-${crypto.randomUUID()}`;
		try {
			await writeFile(temporary, text, { flag: 'wx', mode: 0o600 });
			await rename(temporary, file);
		} catch (error) {
			await rm(temporary, { force: true });
			throw error;
		}
	}
	return path.resolve(root);
}

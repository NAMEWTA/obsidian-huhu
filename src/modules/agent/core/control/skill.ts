/** The packaged HUHU control Skill. Loaded on demand only; installing it anywhere is an explicit user action. */
export type ControlSkillLanguage = 'en' | 'zh';

export async function loadControlSkill(language: ControlSkillLanguage): Promise<string> {
	return (language === 'zh' ? await import('./skill/huhu-control.zh.md') : await import('./skill/huhu-control.en.md')).default;
}

import { ARCHIVES_ROOT } from './storage/vault-layout';
/** Only UI preferences live in plugin settings. All archive data lives in Markdown notes in the vault. */
export interface ContactsSettings {
	/** Vault-relative folder that holds `个人档案/` and `企业档案/`. */
	rootFolder: string;
	maxColumns: 5 | 6;
	/** The layout last chosen for each kind. Absent until the user picks one; new pages start from it. */
	layouts: Partial<Record<'person' | 'company', 'list' | 'card'>>;
}
/** A visible vault folder, like the periodic notes' `日志`: `huhu/档案/个人档案/<姓名>/基本信息.md`. */
export const DEFAULT_CONTACTS_ROOT = ARCHIVES_ROOT;
export const DEFAULT_CONTACTS_SETTINGS: ContactsSettings = { rootFolder: DEFAULT_CONTACTS_ROOT, maxColumns: 6, layouts: {} };

/**
 * A typed folder as a vault-relative path: backslashes become `/`, a leading `/` or `./` and trailing `/` go away.
 * Returns '' for anything that cannot be a visible folder inside the vault: empty, `..`, empty segments, a drive
 * or other absolute path, control characters, or a hidden folder (`.obsidian`, `.huhu`, `.git`, …).
 */
export function normalizeVaultFolder(value: string): string {
	let text = value.trim().replace(/\\/g, '/');
	while (text.startsWith('./')) text = text.slice(2);
	text = text.replace(/^\/+/, '').replace(/\/+$/, '');
	if (!text || /^[a-z]:(\/|$)/i.test(text) || [...text].some((char) => char.charCodeAt(0) < 32)) return '';
	const parts = text.split('/');
	if (parts.some((part) => !part || part === '.' || part === '..' || part.startsWith('.'))) return '';
	return text;
}
export function validContactsFolder(value: string): boolean {
	return !!normalizeVaultFolder(value);
}
export function normalizeContactsSettings(raw: unknown): ContactsSettings {
	const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const root = typeof value.rootFolder === 'string' ? normalizeVaultFolder(value.rootFolder) : '';
	const given = value.layouts && typeof value.layouts === 'object' ? (value.layouts as Record<string, unknown>) : {};
	const layouts: ContactsSettings['layouts'] = {};
	for (const kind of ['person', 'company'] as const)
		if (given[kind] === 'list' || given[kind] === 'card') layouts[kind] = given[kind];
	return {
		rootFolder: root || DEFAULT_CONTACTS_SETTINGS.rootFolder,
		maxColumns: value.maxColumns === 5 ? 5 : 6,
		layouts,
	};
}

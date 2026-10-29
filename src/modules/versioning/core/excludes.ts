import { HUHUBOT_RUNTIME_ROOT } from '../../../shared/storage/vault-layout';

/** Managed ignore rules protect device state and credentials while retaining user content and shared definitions.
 * Both .gitignore and the local info/exclude get an idempotent block; existing user rules stay intact.
 * Already tracked matches are removed only from the index after backing up staged blobs and the original index.
 */
export const HUHU_EXCLUDE_PATTERNS: readonly string[] = [
	'.DS_Store',
	'._*',
	'Thumbs.db',
	'Desktop.ini',
	'.Spotlight-V100/',
	'.Trashes/',
	'.trash/',
	'**/.huhu/config/devices/',
	'**/.huhu/config/identity.json',
	'**/.huhu/sync/',
	'**/.huhu/notifications/',
	`**/${HUHUBOT_RUNTIME_ROOT}/`,
	'**/.huhu/browser/',
	'**/.huhu/browser-materials/',
	'**/.huhu/terminal-agent/',
	'**/.huhu/agents/',
	'**/.huhu/helpers/',
	// Per-device automation runs stay local; the shared definitions (`.huhu/automation/definitions/`) are tracked.
	'**/.huhu/automation/*',
	'!**/.huhu/automation/definitions/',
	'**/.huhu/cache/',
	'**/.huhu/recovery/',
	// Exported business backups hold readable private data (inbox bodies, run results); they are never committed.
	'**/.huhu/exports/',
	'**/.huhu/migrations/',
	'**/.huhu/**/*.lock',
	'**/.huhu/**/*.tmp',
	// The JsonStore's local recovery copy of a settings/state file; it exists to restore this machine only.
	'**/.huhu/**/*.backup',
	'**/.huhu/**/*.sqlite',
	'**/.huhu/**/*.sqlite-wal',
	'**/.huhu/**/*.sqlite-shm',
	'**/.huhu/**/*.sqlite-journal',
	'**/.huhu/**/.DS_Store',
];

/** Config directory is supplied by Obsidian; a nested repository may not contain it. */
export function repositoryIgnorePatterns(configDir = ''): readonly string[] {
	const config = configDir.replaceAll('\\', '/').replace(/\/$/, '');
	return [
		...HUHU_EXCLUDE_PATTERNS,
		...(config && !config.split('/').includes('..')
			? [`${config}/workspace.json`, `${config}/workspace-mobile.json`, `${config}/plugins/huhu/`]
			: []),
	];
}

export const EXCLUDE_BEGIN = '# >>> HUHU managed (do not edit between these lines) >>>';
export const EXCLUDE_END = '# <<< HUHU managed <<<';

/**
 * `existing` with the HUHU block set to `patterns`: replaced in place when present, appended otherwise. Text
 * outside the markers is never touched, and applying the result again changes nothing.
 */
export function withManagedExcludes(existing: string, patterns: readonly string[] = HUHU_EXCLUDE_PATTERNS): string {
	const eol = existing.includes('\r\n') ? '\r\n' : '\n';
	const block = [EXCLUDE_BEGIN, ...patterns, EXCLUDE_END].join(eol);
	const start = existing.indexOf(EXCLUDE_BEGIN);
	const end = start < 0 ? -1 : existing.indexOf(EXCLUDE_END, start);
	if (start >= 0 && end >= 0) return existing.slice(0, start) + block + existing.slice(end + EXCLUDE_END.length);
	const lead = !existing || existing.endsWith('\n') ? '' : eol;
	return `${existing}${lead}${block}${eol}`;
}

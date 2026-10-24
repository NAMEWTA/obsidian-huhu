export const KNOWN_METADATA_KEYS = new Set([
	'id',
	'link',
	'progress',
	'due',
	'streak',
	'type',
	'color',
	'cover',
	'coverPos',
	'width',
	'size',
	'lat',
	'lon',
	'city',
	'track',
	'days',
	'cols',
	'rows',
	'gcol',
	'grow',
	'noteStyle',
	'openIn',
	'folder',
]);

export const SECTION_TYPES = new Set([
	'memo',
	'todo',
	'projects',
	'notes',
	'dashboard',
	'library',
	'pipeline',
	'pm',
	'skills',
	'folder',
	'images',
	'videos',
	'alltasks',
	'calendar',
	'dataview',
	'weread',
	'rss',
	'ticktick',
	'sticky',
	'web',
]);

export function normalizeHexColor(value?: string): string {
	if (!value) return '';
	const trimmed = value.trim();
	return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export const REMINDER_REGEX = /\s*⏰\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*$/;

export const COLLAPSED_REGEX = /\s*<!--collapsed-->\s*$/;

export const DOC_LINE_REGEX = /^(\s*)(?:- )?\[\[((?:[^\]\n]|\](?!\]))+?)]](\s*<!--collapsed-->\s*)?$/;

export const DEFAULT_COLUMNS = [
	{ name: 'Memo', color: '#f59e0b', sectionType: 'memo' },
	{ name: 'Todo', color: '#6366f1', sectionType: 'todo' },
	{ name: 'Projects', color: '#10b981', sectionType: 'projects' },
	{ name: 'Library', color: '#8b5cf6', sectionType: 'projects' },
];

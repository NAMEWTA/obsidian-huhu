/**
 * Command ids without the plugin-id prefix. Obsidian adds `huhu:`
 * when the command is registered.
 */
export const HUHU_COMMANDS = {
	OPEN_DASHBOARD: 'open-dashboard',
	OPEN_EDITOR_VIEW: 'open-editor-view',
	ADD_COMMENT: 'add-comment-to-selection',
} as const;

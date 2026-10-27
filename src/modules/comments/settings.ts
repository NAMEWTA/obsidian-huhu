import { domainSettings } from '../../shared/settings/schema';
import { normalizeHighlightColors, type CustomHighlightColor } from './core/highlight-colors';

export interface CommentsSettings {
	sidebarWidth?: number;
	customColors: CustomHighlightColor[];
	exportFolder: string;
	highlightEnabled: boolean;
	popoverEnabled: boolean;
	author: string;
	gutterEnabled: boolean;
	showCount: boolean;
	highlightLines: boolean;
	highlightResolved: boolean;
	followAccent: boolean;
	color: string;
	hoverDelay: number;
	fuzzyThreshold: number;
	deleteWithNote: boolean;
	panelSide: 'left' | 'right';
	panelAutoPlaced: boolean;
	sort: 'position' | 'created' | 'activity';
}
export const DEFAULT_COMMENTS_SETTINGS: CommentsSettings = {
	customColors: [], exportFolder: 'huhu/导出/高亮',
	highlightEnabled: true, popoverEnabled: true, author: '', gutterEnabled: true, showCount: true,
	highlightLines: false, highlightResolved: false, followAccent: true, color: '', hoverDelay: 350,
	fuzzyThreshold: 0.3, deleteWithNote: true, panelSide: 'right', panelAutoPlaced: false, sort: 'position',
};
export function normalizeCommentsSettings(raw: unknown): CommentsSettings {
	const base = { ...DEFAULT_COMMENTS_SETTINGS };
	if (typeof raw !== 'object' || raw === null) return base;
	const rec = raw as Record<string, unknown>;
	for (const key of ['highlightEnabled', 'popoverEnabled', 'gutterEnabled', 'showCount', 'highlightLines', 'highlightResolved', 'followAccent', 'deleteWithNote', 'panelAutoPlaced'] as const) {
		if (typeof rec[key] === 'boolean') base[key] = rec[key];
	}
	base.customColors = normalizeHighlightColors(rec['customColors']);
	if (typeof rec['exportFolder'] === 'string' && rec['exportFolder'].trim() && !rec['exportFolder'].includes('..') && !rec['exportFolder'].startsWith('.')) base.exportFolder = rec['exportFolder'].trim().replace(/\\/g, '/');
	for (const key of ['author', 'color'] as const) if (typeof rec[key] === 'string') base[key] = rec[key];
	if (typeof rec['sidebarWidth'] === 'number' && Number.isFinite(rec['sidebarWidth'])) base.sidebarWidth = rec['sidebarWidth'];
	if (typeof rec['hoverDelay'] === 'number') base.hoverDelay = Math.max(200, Math.min(1000, rec['hoverDelay'] || 350));
	if (typeof rec['fuzzyThreshold'] === 'number') base.fuzzyThreshold = Math.max(0.1, Math.min(0.5, rec['fuzzyThreshold'] || 0.3));
	if (rec['panelSide'] === 'left') base.panelSide = 'left';
	if (rec['sort'] === 'created' || rec['sort'] === 'activity') base.sort = rec['sort'];
	return base;
}
export const commentsSettings = domainSettings<CommentsSettings>({ defaults: () => ({ ...DEFAULT_COMMENTS_SETTINGS }), normalize: normalizeCommentsSettings });

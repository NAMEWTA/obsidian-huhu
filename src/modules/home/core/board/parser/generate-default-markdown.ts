import { parseRssConfig, parseTickTickConfig } from '../p2-config';
import type { RssConfig, TickTickConfig } from '../types';
import { readPmConfig, readSkillsConfig } from '../p1-config';
import { readMarkdownDocument, readYaml } from '../../../../../shared/storage/markdown-document';
import { normalizeColumnPairs } from '../column-pairs';
import { readPipelineConfig } from '../../pipeline/codec';
import type {
	DashboardColumn,
	DataviewConfig,
	LibraryConfig,
	PipelineConfig,
	PmConfig,
	SkillsSectionConfig,
	QuickAction,
	WebEmbedConfig,
	WereadConfig,
} from '../types/model';
import {
	parseCards,
	parseDataviewConfig,
	parseLibraryConfig,
	parseWebConfig,
	parseWereadConfig,
	resolveSectionType,
	splitByH2,
} from './extract-card-parts';
import { DEFAULT_COLUMNS } from './syntax';
export function splitFrontmatter(markdown: string): { frontmatter: Record<string, unknown>; body: string } {
	const { yaml, body } = readMarkdownDocument(markdown);
	return { frontmatter: (readYaml(yaml).toJSON() ?? {}) as Record<string, unknown>, body };
}
export function parseQuickActions(fm: Record<string, unknown>): QuickAction[] {
	const rawActions = fm.quickActions;
	if (Array.isArray(rawActions)) {
		return rawActions
			.map((item: Record<string, string>) => ({
				name: item.name ?? '',
				icon: item.icon ?? (item.type === 'command' ? 'terminal' : 'file-text'),
				type: (['file', 'command', 'action', 'url', 'quick', 'agent', 'note'].includes(item.type ?? '')
					? item.type
					: 'file') as QuickAction['type'],
				id: item.id || undefined,
				openIn:
					item.openIn === 'system'
						? ('system' as const)
						: item.openIn === 'tab'
							? ('tab' as const)
							: undefined,
				agentId: item.agentId || undefined,
				prompt: item.prompt || undefined,
				preset:
					typeof item.preset === 'object' && item.preset
						? (item.preset as unknown as QuickAction['preset'])
						: undefined,
				target: item.target ?? '',
			}))
			.filter((a) => a.name && (a.target || a.type === 'agent' || a.type === 'note'));
	}

	return [];
}
export function parseQuickActionOrder(fm: Record<string, unknown>): string[] | undefined {
	const raw = fm.quickActionOrder;
	if (Array.isArray(raw) && raw.length > 0) {
		return raw.map((v: unknown) => String(v));
	}
	return undefined;
}
export function parseHiddenPresets(fm: Record<string, unknown>): string[] | undefined {
	const raw = fm.hiddenPresets;
	if (Array.isArray(raw) && raw.length > 0) {
		return raw.map((v: unknown) => String(v));
	}
	return undefined;
}
export function parseColumnDefs(fm: Record<string, unknown>): Array<{
	id?: string;
	name: string;
	color: string;
	sectionType?: string;
	showCover?: boolean;
	libraryConfig?: LibraryConfig;
	pipelineConfig?: PipelineConfig;
	pmConfig?: PmConfig;
	skillsConfig?: SkillsSectionConfig;
	wereadConfig?: WereadConfig;
	rssConfig?: RssConfig;
	ticktickConfig?: TickTickConfig;
	dataviewConfig?: DataviewConfig;
	webConfig?: WebEmbedConfig;
	height?: number;
	half?: boolean;
	width?: number;
}> {
	const raw = fm.columns;
	if (!Array.isArray(raw)) return DEFAULT_COLUMNS;

	return (raw as Array<Record<string, unknown>>).map((item) => ({
		id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : undefined,
		name: String((item.name ?? 'Unnamed') as string | number | boolean),
		color: String((item.color ?? '#6366f1') as string | number | boolean),
		sectionType: item.type ? String(item.type as string | number | boolean) : undefined,
		showCover: item.showCover === false ? false : undefined,
		libraryConfig: item.library ? parseLibraryConfig(item.library as Record<string, unknown>) : undefined,
		pmConfig: readPmConfig(item.pm),
		skillsConfig: readSkillsConfig(item.skills),
		pipelineConfig: item.pipeline ? readPipelineConfig(item.pipeline) : undefined,
		rssConfig: item.rss ? parseRssConfig(item.rss as Record<string, unknown>) : undefined,
		ticktickConfig: item.ticktick ? parseTickTickConfig(item.ticktick as Record<string, unknown>) : undefined,
		wereadConfig: item.weread ? parseWereadConfig(item.weread as Record<string, unknown>) : undefined,
		dataviewConfig: item.dataview ? parseDataviewConfig(item.dataview as Record<string, unknown>) : undefined,
		webConfig: item.web ? parseWebConfig(item.web as Record<string, unknown>) : undefined,
		height: typeof item.height === 'number' ? item.height : undefined,
		half: item.half === true ? true : undefined,
		width:
			typeof item.width === 'number' && item.width >= 20 && item.width <= 80 ? Math.round(item.width) : undefined,
	}));
}
export function parseColumns(
	body: string,
	defs: Array<{
		id?: string;
		name: string;
		color: string;
		sectionType?: string;
		showCover?: boolean;
		libraryConfig?: LibraryConfig;
		pipelineConfig?: PipelineConfig;
		pmConfig?: PmConfig;
		skillsConfig?: SkillsSectionConfig;
		wereadConfig?: WereadConfig;
		rssConfig?: RssConfig;
		ticktickConfig?: TickTickConfig;
		dataviewConfig?: DataviewConfig;
		webConfig?: WebEmbedConfig;
		height?: number;
		half?: boolean;
		width?: number;
	}>,
): DashboardColumn[] {
	const sections = splitByH2(body);
	const defMap = new Map(defs.map((d) => [d.name, d]));
	const usedDefIndices = new Set<number>();

	const mapped = sections.map((section, sectionIdx) => {
		let def = defMap.get(section.heading);
		if (!def && sectionIdx < defs.length && !usedDefIndices.has(sectionIdx)) {
			def = defs[sectionIdx];
		}
		if (def) {
			const defIdx = defs.indexOf(def);
			usedDefIndices.add(defIdx);
		}
		const cards = parseCards(section.content, section.heading);
		const resolvedType = resolveSectionType(section.heading, cards, def?.sectionType);
		return {
			id: def?.id,
			name: section.heading,
			color: def?.color ?? '#6366f1',
			sectionType: resolvedType,
			// Memo rendering includes task/doc trees; retain their structure on reload.
			cards,
			showCover: def?.showCover,
			libraryConfig: def?.libraryConfig,
			pipelineConfig: def?.pipelineConfig,
			pmConfig: def?.pmConfig,
			skillsConfig: def?.skillsConfig,
			wereadConfig: def?.wereadConfig,
			rssConfig: def?.rssConfig,
			ticktickConfig: def?.ticktickConfig,
			dataviewConfig: def?.dataviewConfig,
			webConfig: def?.webConfig,
			height: def?.height,
			half: def?.half,
			width: def?.half ? def?.width : undefined,
		};
	});
	// Self-heal hand-edited frontmatter: a lone `half: true` (or an odd run)
	// pairs with no one and would render as an orphan half-width row.
	return normalizeColumnPairs(mapped);
}

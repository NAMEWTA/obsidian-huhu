import { taskMetaSuffix } from '../../../../../shared/automation/metadata';
import type { DashboardData, TaskItem } from '../types/model';
import { escapeYamlString, serializeDocTree } from './extract-card-parts';
import { preserveDashboardDocument } from './preserve-document';
import { readBoardMembers, readLegacyTiles } from '../board-codec';
import { readGrid, serializeGrid } from '../grid';
import { readSkillShortcuts } from '../skill-shortcuts';
import { readMarkdownDocument, readYaml } from '../../../../../shared/storage/markdown-document';
import {
	parseColumnDefs,
	parseColumns,
	parseHiddenPresets,
	parseQuickActionOrder,
	parseQuickActions,
	splitFrontmatter,
} from './generate-default-markdown';

/**
 * Frontmatter of the retired layouts (immersive tiles, the banner). They are read once so an old board can convert
 * to the grid (see `retireLegacyKeys`).
 */
const RETIRED_KEYS = ['layout', 'canvas', 'immersive', 'gridPacked', 'banner', 'banners'] as const;

const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

/**
 * The conversion to the grid takes over the retired keys the file still carries: from here on they belong to the
 * owned projection, so the write that stores the grid removes them. Reading alone never touches them.
 */
export function retireLegacyKeys(data: DashboardData): DashboardData {
	if (!data.document) return data;
	const { frontmatter } = splitFrontmatter(data.document.source);
	const present = RETIRED_KEYS.filter((key) => key in frontmatter);
	if (!present.length) return data;
	const { yaml, body } = readMarkdownDocument(data.document.baseline);
	const doc = readYaml(yaml);
	for (const key of present) doc.set(key, frontmatter[key]);
	return {
		...data,
		document: { ...data.document, baseline: `---\n${doc.toString({ lineWidth: 0 })}---\n${body}` },
	};
}

export function parse(markdown: string): DashboardData {
	const { frontmatter, body } = splitFrontmatter(markdown);
	const quickActions = parseQuickActions(frontmatter);
	const quickActionOrder = parseQuickActionOrder(frontmatter);
	const columnDefs = parseColumnDefs(frontmatter);
	const columns = parseColumns(body, columnDefs);

	const data: DashboardData = { quickActions, columns };
	if (frontmatter.widgetMigration === 1) data.widgetMigration = 1;
	data.widgets = readBoardMembers(frontmatter.widgets);
	const grid = readGrid(frontmatter.grid);
	if (grid) data.grid = grid;
	else {
		const legacy = readLegacyTiles(frontmatter.immersive);
		if (legacy) data.legacyTiles = legacy;
		if (frontmatter.gridPacked === true) data.gridPacked = true;
	}
	data.skills = readSkillShortcuts(frontmatter.skills);
	if (quickActionOrder) data.quickActionOrder = quickActionOrder;
	const hiddenPresets = parseHiddenPresets(frontmatter);
	if (hiddenPresets) data.hiddenPresets = hiddenPresets;
	data.document = { source: markdown, baseline: serializeManaged(data) };
	return data;
}
export function serialize(data: DashboardData): string {
	const generated = serializeManaged(data);
	if (!data.document) return generated;
	if (data.document.baseline === generated) return data.document.source;
	const { baseline, committed } = geometryCommitBaseline(data, generated);
	const text = preserveDashboardDocument(data.document.source, baseline, generated);
	return committed ? canonicalGridLine(text, data) : text;
}

/**
 * A patched file prints the grid as YAML flow; the grid belongs to HUHU, so its line is rewritten as the JSON one-liner
 * a new file carries (a grid the author wrote as a block is left alone).
 */
function canonicalGridLine(text: string, data: DashboardData): string {
	if (!data.grid) return text;
	const front = /^(\uFEFF?[\t \r\n]*---[\t ]*\r?\n)([\s\S]*?\r?\n)(---[\t ]*(?:\r?\n|$))/.exec(text);
	if (!front) return text;
	const yaml = front[2]!.replace(/^grid:[ \t]*\{.*$/m, () => `grid: ${serializeGrid(data.grid!)}`);
	return yaml === front[2] ? text : front[1] + yaml + text.slice(front[1]!.length + front[2]!.length);
}

/** The grid as the file stores it: only the fields this module owns, so the author's other fields survive. */
function ownedGrid(raw: Record<string, unknown>): Record<string, unknown> {
	const keys = ['i', 'x', 'y', 'w', 'h'];
	const items = (value: unknown) =>
		Array.isArray(value)
			? value.map((entry: unknown) =>
					record(entry)
						? Object.fromEntries(keys.filter((key) => key in entry).map((key) => [key, entry[key]]))
						: entry,
				)
			: value;
	return {
		...('v' in raw ? { v: raw.v } : {}),
		...('lg' in raw ? { lg: items(raw.lg) } : {}),
		...('md' in raw ? { md: items(raw.md) } : {}),
	};
}

/**
 * Only an explicit member/geometry edit commits a normalized grid. Until then the author's own bytes (out-of-range
 * values, hand-written spacing) stay exactly as they are; the one write that does commit replaces the raw geometry
 * with the normalized one.
 */
function geometryCommitBaseline(data: DashboardData, generated: string): { baseline: string; committed: boolean } {
	const snapshot = data.document!;
	const before = readMarkdownDocument(snapshot.baseline);
	const baseDoc = readYaml(before.yaml);
	const base = baseDoc.toJSON() as Record<string, unknown>;
	const next = splitFrontmatter(generated).frontmatter;
	if (['widgets', 'grid'].every((key) => JSON.stringify(base[key]) === JSON.stringify(next[key])))
		return { baseline: snapshot.baseline, committed: false };
	const raw = splitFrontmatter(snapshot.source).frontmatter.grid;
	if (!record(raw)) return { baseline: snapshot.baseline, committed: true };
	baseDoc.set('grid', ownedGrid(raw));
	return { baseline: `---\n${baseDoc.toString({ lineWidth: 0 })}---\n${before.body}`, committed: true };
}
function serializeManaged(data: DashboardData): string {
	const lines: string[] = [];

	lines.push('---');
	lines.push('dashboard: true');
	if (data.widgetMigration) lines.push(`widgetMigration: ${data.widgetMigration}`);
	if (data.widgets) lines.push(`widgets: ${JSON.stringify(data.widgets)}`);
	if (data.grid) lines.push(`grid: ${serializeGrid(data.grid)}`);
	if (data.skills) lines.push(`skills: ${JSON.stringify(data.skills)}`);

	if (data.quickActions.length > 0) {
		lines.push('quickActions:');
		for (const action of data.quickActions) {
			lines.push(`  - name: "${escapeYamlString(action.name)}"`);
			lines.push(`    icon: "${escapeYamlString(action.icon)}"`);
			lines.push(`    type: ${action.type}`);
			lines.push(`    target: "${escapeYamlString(action.target)}"`);
			for (const key of ['id', 'openIn', 'agentId', 'prompt', 'preset'] as const)
				if (action[key] !== undefined) lines.push(`    ${key}: ${JSON.stringify(action[key])}`);
		}
	}

	if (data.quickActionOrder && data.quickActionOrder.length > 0) {
		lines.push('quickActionOrder:');
		for (const key of data.quickActionOrder) {
			lines.push(`  - "${escapeYamlString(key)}"`);
		}
	}

	if (data.hiddenPresets && data.hiddenPresets.length > 0) {
		lines.push('hiddenPresets:');
		for (const key of data.hiddenPresets) {
			lines.push(`  - "${escapeYamlString(key)}"`);
		}
	}

	lines.push('columns:');
	for (const col of data.columns) {
		lines.push(`  - name: "${escapeYamlString(col.name)}"`);
		if (col.id) lines.push(`    id: ${JSON.stringify(col.id)}`);
		lines.push(`    color: "${col.color}"`);
		if (col.sectionType) {
			lines.push(`    type: ${col.sectionType}`);
		}
		if (col.showCover === false) lines.push('    showCover: false');
		if (col.pmConfig) lines.push(`    pm: ${JSON.stringify(col.pmConfig)}`);
		if (col.rssConfig) lines.push(`    rss: ${JSON.stringify(col.rssConfig)}`);
		if (col.ticktickConfig) lines.push(`    ticktick: ${JSON.stringify(col.ticktickConfig)}`);
		if (col.skillsConfig) lines.push(`    skills: ${JSON.stringify(col.skillsConfig)}`);
		if (col.pipelineConfig) lines.push(`    pipeline: ${JSON.stringify(col.pipelineConfig)}`);
		if (col.libraryConfig) {
			lines.push('    library:');
			const lc = col.libraryConfig;
			lines.push(`      viewMode: ${lc.viewMode}`);
			lines.push(`      sortBy: "${lc.sortBy}"`);
			lines.push(`      sortDesc: ${lc.sortDesc}`);
			if (lc.folders && lc.folders.length > 0) {
				lines.push('      folders:');
				for (const f of lc.folders) {
					lines.push(`        - "${escapeYamlString(f)}"`);
				}
			}
			if (lc.folderFilter && lc.folderFilter.length > 0) {
				lines.push('      folderFilter:');
				for (const f of lc.folderFilter) {
					lines.push(`        - "${escapeYamlString(f)}"`);
				}
			}
			if (lc.excludeFolders && lc.excludeFolders.length > 0) {
				lines.push('      excludeFolders:');
				for (const f of lc.excludeFolders) {
					lines.push(`        - "${escapeYamlString(f)}"`);
				}
			}
			if (lc.includeFolders && lc.includeFolders.length > 0) {
				lines.push('      includeFolders:');
				for (const f of lc.includeFolders) {
					lines.push(`        - "${escapeYamlString(f)}"`);
				}
			}
			if (lc.templatePath) {
				lines.push(`      templatePath: "${escapeYamlString(lc.templatePath)}"`);
			}
			if (lc.templatePaths !== undefined) lines.push(`      templatePaths: ${JSON.stringify(lc.templatePaths)}`);
			if (lc.tableOrder !== undefined) lines.push(`      tableOrder: ${JSON.stringify(lc.tableOrder)}`);
			if (lc.tableHidden !== undefined) lines.push(`      tableHidden: ${JSON.stringify(lc.tableHidden)}`);
			if (lc.taskGroupBy) {
				lines.push(`      taskGroupBy: ${lc.taskGroupBy}`);
			}
			if (lc.kanbanGroupBy) {
				lines.push(`      kanbanGroupBy: "${escapeYamlString(lc.kanbanGroupBy)}"`);
			}
			// 'property' is the default group mode — only persist the opt-in.
			if (lc.groupMode === 'folder') {
				lines.push(`      groupMode: folder`);
			}
			// 'none'/undefined is the default view grouping — only persist the opt-ins.
			if (lc.viewGroupMode === 'folder' || lc.viewGroupMode === 'property') {
				lines.push(`      viewGroupMode: ${lc.viewGroupMode}`);
				if (lc.viewGroupMode === 'property' && lc.viewGroupBy) {
					lines.push(`      viewGroupBy: "${escapeYamlString(lc.viewGroupBy)}"`);
				}
			}
			if (lc.kanbanShowCovers) {
				lines.push(`      kanbanShowCovers: true`);
			}
			if (lc.pageSize) {
				lines.push(`      pageSize: ${lc.pageSize}`);
			}
			if (lc.showProperties === false) {
				lines.push(`      showProperties: false`);
			}
			if (lc.propertyLimit != null) {
				lines.push(`      propertyLimit: ${lc.propertyLimit}`);
			}
			if (lc.visibleProperties && lc.visibleProperties.length > 0) {
				lines.push(`      visibleProperties:`);
				for (const p of lc.visibleProperties) {
					lines.push(`        - "${escapeYamlString(p)}"`);
				}
			}
			// 'medium' is the default card size — only persist the opt-outs.
			if (lc.cardSize === 'small' || lc.cardSize === 'large') {
				lines.push(`      cardSize: ${lc.cardSize}`);
			}
			if (lc.quickDateFilter) {
				lines.push(`      quickDateFilter:`);
				lines.push(`        property: "${lc.quickDateFilter.property}"`);
				lines.push(`        start: "${lc.quickDateFilter.start}"`);
				lines.push(`        end: "${lc.quickDateFilter.end}"`);
				if (lc.quickDateFilter.days != null) {
					lines.push(`        days: ${lc.quickDateFilter.days}`);
				}
			}
			if (lc.filters.length > 0) {
				lines.push('      filters:');
				for (const filter of lc.filters) {
					lines.push(`        - property: "${escapeYamlString(filter.property)}"`);
					if (filter.operator && filter.operator !== 'equals') {
						lines.push(`          operator: "${filter.operator}"`);
					}
					if (filter.values.length > 0) {
						lines.push(
							`          values: [${filter.values.map((v) => `"${escapeYamlString(v)}"`).join(', ')}]`,
						);
					} else {
						lines.push('          values: []');
					}
					if (filter.dateRange) {
						if (filter.dateRange.start) lines.push(`          dateStart: "${filter.dateRange.start}"`);
						if (filter.dateRange.end) lines.push(`          dateEnd: "${filter.dateRange.end}"`);
					}
				}
			}
		}
		if (col.height != null) {
			lines.push(`    height: ${col.height}`);
		}
		// Pair split (left member's share %): only meaningful beside `half`.
		if (col.half && col.width != null) {
			lines.push(`    width: ${col.width}`);
		}
		if (col.half) {
			lines.push('    half: true');
		}
		if (col.wereadConfig) {
			const wc = col.wereadConfig;
			lines.push('    weread:');
			lines.push('      widgets:');
			for (const w of wc.widgets) {
				lines.push(`        - id: "${escapeYamlString(w.id)}"`);
				lines.push(`          view: ${w.view}`);
				if (w.progressFilters?.length) {
					lines.push('          progressFilters:');
					for (const p of w.progressFilters) lines.push(`            - ${p}`);
				}
				if (w.contentTypeFilters?.length) {
					lines.push('          contentTypeFilters:');
					for (const type of w.contentTypeFilters) lines.push(`            - ${type}`);
				}
				if (w.recencyFilters?.length) {
					lines.push('          recencyFilters:');
					for (const recency of w.recencyFilters) lines.push(`            - ${recency}`);
				}
				if (w.noteFilters?.length) {
					lines.push('          noteFilters:');
					for (const note of w.noteFilters) lines.push(`            - ${note}`);
				}
				if (w.statsItems?.length) {
					lines.push('          statsItems:');
					for (const item of w.statsItems) lines.push(`            - ${item}`);
				}
				if (w.groupBy && w.groupBy !== 'readingState') lines.push(`          groupBy: ${w.groupBy}`);
				if (w.categoryFilters?.length) {
					lines.push('          categoryFilters:');
					for (const c of w.categoryFilters) lines.push(`            - "${escapeYamlString(c)}"`);
				}
				if (w.title) lines.push(`          title: "${escapeYamlString(w.title)}"`);
			}
		}
		if (col.dataviewConfig) {
			const dc = col.dataviewConfig;
			lines.push('    dataview:');
			// JSON.stringify yields a valid double-quoted YAML scalar and safely
			// escapes embedded newlines/quotes in the multi-line query.
			lines.push(`      query: ${JSON.stringify(dc.query)}`);
			if (dc.title) lines.push(`      title: ${JSON.stringify(dc.title)}`);
			if (dc.excludeFolders && dc.excludeFolders.length > 0) {
				lines.push('      excludeFolders:');
				for (const f of dc.excludeFolders) {
					lines.push(`        - "${escapeYamlString(f)}"`);
				}
			}
		}
		if (col.webConfig) {
			const wc = col.webConfig;
			lines.push('    web:');
			// JSON.stringify yields a valid double-quoted YAML scalar and safely
			// escapes embedded quotes/backslashes (same trick as the dataview
			// query; a URL's :, #, ? and & need no escaping inside quotes).
			lines.push(`      url: ${JSON.stringify(wc.url)}`);
			if (typeof wc.zoom === 'number' && wc.zoom !== 1) {
				lines.push(`      zoom: ${wc.zoom}`);
			}
		}
	}

	lines.push('---');
	lines.push('');

	for (const column of data.columns) {
		lines.push(`## ${column.name}`);
		lines.push('');

		if (
			column.sectionType === 'library' ||
			column.sectionType === 'pipeline' ||
			column.sectionType === 'pm' ||
			column.sectionType === 'skills' ||
			column.sectionType === 'folder' ||
			column.sectionType === 'images' ||
			column.sectionType === 'videos' ||
			column.sectionType === 'alltasks' ||
			column.sectionType === 'calendar' ||
			column.sectionType === 'dataview' ||
			column.sectionType === 'web'
		)
			continue;

		for (const card of column.cards) {
			lines.push(`### ${card.title}`);

			if (card.id) {
				lines.push(`id: ${card.id}`);
			}

			if (card.noteStyle) lines.push(`noteStyle: ${card.noteStyle}`);

			if (card.type === 'generic') lines.push('type: generic');
			if (card.type === 'web') lines.push('type: web', `openIn: ${card.openIn === 'system' ? 'system' : 'tab'}`);

			if (card.type === 'task') {
				lines.push(`type: task`);
			}

			if (card.type === 'project') {
				lines.push(`type: project`);
				if (card.folder) lines.push(`folder: ${card.folder}`);
			}

			if (card.wikiLink) {
				lines.push(`link: [[${card.wikiLink}]]`);
			} else if (card.url) {
				lines.push(`link: ${card.url}`);
			}

			if (card.progress >= 0) {
				lines.push(`progress: ${card.progress}%`);
			}

			if (card.dueDate) {
				lines.push(`due: ${card.dueDate}`);
			}

			if (card.streak > 0) {
				lines.push(`streak: ${card.streak}`);
			}

			if (card.color) {
				// Store without the leading '#': a bare '#f59e0b' in the card body
				// would be picked up by Obsidian as a tag. Normalize back on read.
				lines.push(`color: ${card.color.replace(/^#/, '')}`);
			}

			if (card.coverImage) {
				lines.push(`cover: ${card.coverImage}`);
			}
			if (card.coverPos !== undefined) lines.push(`coverPos: ${card.coverPos}`);

			if (card.width > 0) {
				lines.push(`width: ${card.width}`);
			}
			if (card.size && card.size !== 'M') {
				lines.push(`size: ${card.size}`);
			}
			if (card.gridCols > 0) {
				lines.push(`cols: ${card.gridCols}`);
			}
			if (card.gridRows > 0) {
				lines.push(`rows: ${card.gridRows}`);
			}
			if (card.gridCol > 0) {
				lines.push(`gcol: ${card.gridCol}`);
			}
			if (card.gridRow > 0) {
				lines.push(`grow: ${card.gridRow}`);
			}
			if (card.weatherConfig) {
				const wc = card.weatherConfig;
				lines.push(`lat: ${wc.latitude}`);
				lines.push(`lon: ${wc.longitude}`);
				lines.push(`city: "${escapeYamlString(wc.cityName)}"`);
			}

			if (card.trackerConfig) {
				const tc = card.trackerConfig;
				lines.push(`track: ${tc.key}`);
				lines.push(`days: ${tc.days}`);
			}

			if (card.blockquote) {
				lines.push(`> ${card.blockquote}`);
			}

			if (card.tasks.length > 0) {
				const writeTask = (task: TaskItem, indent: number) => {
					const prefix = indent > 0 ? '    '.repeat(indent) : '';
					let taskLine = `${prefix}- [${task.checked ? 'x' : ' '}] ${task.text}`;
					if (task.reminder) taskLine += ` ⏰ ${task.reminder}`;
					if (task.collapsed) taskLine += ` <!--collapsed-->`;
					taskLine += taskMetaSuffix(task);
					lines.push(taskLine);
					for (const child of task.children ?? []) writeTask(child, indent + 1);
				};
				for (const task of card.tasks) writeTask(task, 0);
			}

			if (card.docs.length > 0) {
				for (const docLine of serializeDocTree(card.docs)) lines.push(docLine);
			}

			const bodyLines = card.body.trim();
			if (bodyLines) {
				if (card.tasks.length > 0 || card.docs.length > 0 || card.blockquote || card.url || card.wikiLink) {
					lines.push('');
				}
				lines.push(bodyLines);
			}

			lines.push('');
		}
	}

	return lines.join('\n');
}

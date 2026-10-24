// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/rss-note.ts
import type { App } from 'obsidian';
import { stringify } from 'yaml';
import { huhuName } from '../../../../shared/storage/vault-layout';
import { DEFAULT_RSS_FOLDER } from '../../core/board/default-paths';
import { cleanVaultFolder, uniqueVaultPath } from '../vault/vault-notes';
import { ensureFolder } from '../calendar/daily-notes';
import { t } from '../../../../shared/i18n';
import type { RssItem } from '../../core/rss/rss-xml';
import { stripHtmlText } from '../../core/rss/html-md';
export interface SaveRssArticleOptions {
	folder: string;
	feedTitle: string;
	item: RssItem;
	markdown: string;
}
const date = (time: number) => {
	const d = new Date(time);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function rssNoteName(item: RssItem, now = Date.now()): string {
	return `${date(item.pubDate ?? now)}-${huhuName(item.title.slice(0, 80), 'Untitled')}`;
}
export function buildRssNoteContent(opts: SaveRssArticleOptions, now = Date.now()): string {
	const { item, feedTitle, markdown } = opts,
		year = date(item.pubDate ?? now).slice(0, 4),
		summary = stripHtmlText(item.summaryHtml ?? item.contentHtml ?? '') || item.title;
	const props = {
		cssclasses: 'sb-second-brain',
		摘要: summary.length > 120 ? summary.slice(0, 120) + '…' : summary,
		类型: '收集',
		PARA分类: '收集箱',
		年份: year,
		年度页: `[[${year}]]`,
		状态: '待整理',
		Wiki摄入状态: '未摄入',
		领域: '',
		关联项目: [],
		Wiki关联: [],
		主题: [],
		来源: feedTitle,
		相关笔记: [],
		创建时间: date(now),
		更新时间: date(now),
	};
	return `---\n${stringify(props)}---\n\n${item.link ? `[${t('rss.openInBrowser')}](${item.link})\n\n` : ''}${markdown.trim()}\n`;
}
/** Saved articles are ordinary notes in a visible vault folder (`RSS` unless the reader's settings name another). */
export async function saveRssArticle(app: App, opts: SaveRssArticleOptions) {
	const folder = cleanVaultFolder(opts.folder) || DEFAULT_RSS_FOLDER;
	await ensureFolder(app, folder);
	const path = uniqueVaultPath(app, folder, rssNoteName(opts.item) || 'Untitled');
	return app.vault.create(path, buildRssNoteContent(opts));
}
/** The exported subscription list sits next to the saved articles: `<RSS folder>/subscriptions.opml`. */
export async function exportRssOpml(app: App, text: string, folder = ''): Promise<string> {
	const dir = cleanVaultFolder(folder) || DEFAULT_RSS_FOLDER;
	await ensureFolder(app, dir);
	const path = uniqueVaultPath(app, dir, 'subscriptions', 'opml');
	await app.vault.create(path, text);
	return path;
}

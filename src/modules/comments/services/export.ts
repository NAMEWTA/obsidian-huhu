import type { App } from 'obsidian';
import type { HighlightRow } from '../core/catalog';
import { highlightsToMarkdown } from '../core/catalog';

/** Explicit user action: export selected cards into a new vault Markdown file. */
export async function exportHighlightCards(app: App, folder: string, rows: readonly HighlightRow[]): Promise<string> {
	if (!rows.length) throw new Error('Nothing to export');
	const segments = folder.replace(/\\/g, '/').split('/').filter(Boolean);
	if (!segments.length || segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.'))) throw new Error('Invalid export folder');
	let parent = '';
	for (const segment of segments) {
		parent = parent ? parent + '/' + segment : segment;
		if (!await app.vault.adapter.exists(parent)) await app.vault.createFolder(parent);
	}
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	for (let suffix = 0; suffix < 100; suffix++) {
		const path = `${parent}/highlights-${stamp}${suffix ? '-' + suffix : ''}.md`;
		if (await app.vault.adapter.exists(path)) continue;
		await app.vault.create(path, highlightsToMarkdown(rows, true));
		return path;
	}
	throw new Error('Could not choose a unique export filename');
}

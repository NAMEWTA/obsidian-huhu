import { createRoot } from 'react-dom/client';
import type DashboardPlugin from '../../main';
import type { PanelItem } from '../../contracts/workbench';
import { getLanguage } from '../../../shared/i18n';
import { ContainerProviders } from '../../../ui/react/providers';
import { SettingsIndexingContext } from '../../../ui/react/settings-search';
import { collectSettingRows, matchSettings } from '../setting-rows';
import { CategoryContent } from './CategoryContent';

export interface SettingsIndexEntry {
	/** Target and highlight key (see `collectSettingRows`). */
	key: string;
	category: string;
	categoryLabel: string;
	tab: string;
	tabLabel: string;
	label: string;
	description: string;
}

const SETTLE_POLL_MS = 120;
const SETTLE_POLLS = 3;
const GIVE_UP_MS = 8000;
/** Categories that hold no settings of their own. */
const SKIPPED = new Set(['components', 'about']);

/**
 * Render every category (all tab panels mounted) off screen, read its rows and tear it down again. The index is
 * therefore always what the pages really show, in the current language, including module pages that load lazily.
 */
export type SettingsCategoryList = ReadonlyArray<{ id: string; label: string; icon?: string }>;

export async function buildSettingsIndex(plugin: DashboardPlugin, categories: SettingsCategoryList): Promise<SettingsIndexEntry[]> {
	const doc = plugin.app.workspace.containerEl.doc;
	const win = doc.defaultView;
	if (!win) return [];
	const sections = categories.filter((category) => !SKIPPED.has(category.id));
	const host = doc.createElement('div');
	// Laid out (so components that measure work) but out of sight and out of reach.
	host.className = 'huhu-ui huhu-settings-index pointer-events-none invisible fixed top-0 -left-[10000px] h-[700px] w-[900px] overflow-hidden';
	doc.body.append(host);
	host.setAttribute('aria-hidden', 'true');
	host.setAttribute('inert', '');
	const root = createRoot(host);
	try {
		root.render(
			<ContainerProviders container={host}>
				<SettingsIndexingContext.Provider value={true}>
					{sections.map((section) => (
						<section key={section.id} data-index-category={section.id}>
							<CategoryContent plugin={plugin} section={section} navigate={() => {}} />
						</section>
					))}
				</SettingsIndexingContext.Provider>
			</ContainerProviders>,
		);
		const started = Date.now();
		let stable = 0;
		let previous = -1;
		while (Date.now() - started < GIVE_UP_MS) {
			await new Promise<void>((resolve) => win.setTimeout(resolve, SETTLE_POLL_MS));
			const pending = host.querySelector('[data-settings-pending]');
			const count = host.querySelectorAll('[data-searchable-setting]').length;
			stable = !pending && count > 0 && count === previous ? stable + 1 : 0;
			previous = count;
			if (stable >= SETTLE_POLLS) break;
		}
		const entries: SettingsIndexEntry[] = [];
		for (const section of sections) {
			const container = host.querySelector(`[data-index-category="${section.id}"]`);
			if (!container) continue;
			for (const row of collectSettingRows(container))
				entries.push({
					key: row.key,
					category: section.id,
					categoryLabel: section.label,
					tab: row.tab,
					tabLabel: row.tabLabel,
					label: row.label,
					description: row.description,
				});
		}
		return entries;
	} finally {
		root.unmount();
		host.remove();
	}
}

let cache: { signature: string; entries: Promise<SettingsIndexEntry[]> } | undefined;

/** Rebuilt when the language, the visible categories or a module's state changes. */
function signature(plugin: DashboardPlugin, categories: SettingsCategoryList): string {
	return [
		getLanguage(),
		categories.map((c) => c.id).join(','),
		plugin.moduleManifests().map((m) => `${m.id}:${plugin.moduleState(m.id)}`).join(','),
	].join('|');
}

export function settingsIndex(plugin: DashboardPlugin, categories: SettingsCategoryList): Promise<SettingsIndexEntry[]> {
	const current = signature(plugin, categories);
	if (!cache || cache.signature !== current) {
		const entries = buildSettingsIndex(plugin, categories);
		cache = { signature: current, entries };
		entries.catch(() => {
			if (cache?.entries === entries) cache = undefined;
		});
	}
	return cache.entries;
}

/** Side panel rows for a query: each result opens its category (and tab) and highlights the setting. */
export async function searchSettings(plugin: DashboardPlugin, categories: SettingsCategoryList, query: string): Promise<PanelItem[]> {
	const entries = matchSettings(await settingsIndex(plugin, categories), query);
	return entries.map((entry) => ({
		id: `${entry.category}|${entry.key}`,
		label: entry.label,
		detail: [entry.categoryLabel, entry.tabLabel].filter(Boolean).join(' › ') + (entry.description ? ` · ${entry.description}` : ''),
		target: { feature: 'settings', section: entry.category, resourceId: entry.tab || undefined, focusId: entry.key },
	}));
}

/** Drop the cached index (tests, or after settings pages changed shape). */
export function resetSettingsIndex(): void {
	cache = undefined;
}


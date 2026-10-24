import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../ui/react/test-providers';
import { SettingsRow } from '../../../ui/components/huhu/SettingsRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/components/tabs';
import { SettingsPage } from './SettingsPage';
import { buildSettingsIndex, resetSettingsIndex, searchSettings } from './settings-search-index';

vi.mock('../nav', () => ({ PRODUCT_MODULES: { terminal: 'agent', sync: 'sync' } }));
const CATEGORIES = [
	{ id: 'terminal', label: 'Agents' },
	{ id: 'sync', label: 'Git sync' },
	{ id: 'about', label: 'About' },
];
vi.mock('../../workbench/settings-categories', () => ({ settingsCategories: () => CATEGORIES }));
vi.mock('./GeneralSettings', () => ({ GeneralSettings: () => null }));

function AgentPage({ resourceId }: { resourceId?: string }) {
	return (
		<Tabs defaultValue={resourceId ?? 'agents'}>
			<TabsList>
				<TabsTrigger value="agents">Agents</TabsTrigger>
				<TabsTrigger value="usage">Usage</TabsTrigger>
			</TabsList>
			<TabsContent value="agents">
				<SettingsRow label="Default agent" description="Used for new sessions" control={<span />} />
				<SettingsRow label="Show usage" control={<span />} />
			</TabsContent>
			<TabsContent value="usage">
				<SettingsRow label="Show usage" description="Quota in the status bar" control={<span />} />
				<SettingsRow label="Refresh interval" control={<span />} />
			</TabsContent>
		</Tabs>
	);
}
function SyncPageContent() {
	return <SettingsRow label="Commit message" description="Template for commits" control={<span />} />;
}

const SETTINGS = {};
function fakePlugin() {
	const pages: Record<string, () => Promise<(props: { resourceId?: string }) => React.JSX.Element>> = { agent: async () => AgentPage, sync: async () => SyncPageContent };
	return {
		app: { workspace: { containerEl: { doc: document } } },
		moduleInstance: (id: string) => ({ settingsPage: pages[id] }),
		onModuleChanged: () => () => {},
		moduleManifests: () => [{ id: 'agent' }, { id: 'sync' }],
		moduleState: () => 'active',
		appSettings: { subscribe: () => () => {}, get: () => SETTINGS },
	} as unknown as Parameters<typeof SettingsPage>[0]['plugin'];
}

test('the index covers every category and every tab, including tabs that are not showing', async () => {
	resetSettingsIndex();
	const entries = await buildSettingsIndex(fakePlugin(), CATEGORIES);
	expect(entries.map((e) => `${e.categoryLabel}/${e.tabLabel}/${e.label}`)).toEqual([
		'Agents/Agents/Default agent',
		'Agents/Agents/Show usage',
		'Agents/Usage/Show usage',
		'Agents/Usage/Refresh interval',
		'Git sync//Commit message',
	]);
	// Same label in two tabs gets two distinct keys; nothing from the off-screen render stays in the document.
	expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
	expect(document.querySelector('.huhu-settings-index')).toBeNull();
});

test('a search matches label, description and category across all tabs and targets the tab and setting', async () => {
	resetSettingsIndex();
	const plugin = fakePlugin();
	const usage = await searchSettings(plugin, CATEGORIES, 'usage');
	// The tab named "Usage" matches too, after the rows whose own label or description does.
	expect(usage.map((item) => item.label)).toEqual(['Show usage', 'Show usage', 'Refresh interval']);
	expect(usage[1]?.target).toMatchObject({ feature: 'settings', section: 'terminal', resourceId: 'usage' });
	expect(usage[1]?.detail).toBe('Agents › Usage · Quota in the status bar');
	expect((await searchSettings(plugin, CATEGORIES, 'template commits')).map((item) => item.target?.section)).toEqual(['sync']);
	expect((await searchSettings(plugin, CATEGORIES, 'git sync')).map((item) => item.label)).toEqual(['Commit message']);
	expect(await searchSettings(plugin, CATEGORIES, 'nothing matches this')).toEqual([]);
});

test('opening a result scrolls to the setting and highlights it', async () => {
	resetSettingsIndex();
	const plugin = fakePlugin();
	const scroll = vi.fn();
	Element.prototype.scrollIntoView = scroll;
	const [, second] = await searchSettings(plugin, CATEGORIES, 'usage');
	const target = second!.target!;
	render(
		<TestProviders>
			<SettingsPage plugin={plugin} category={target.section!} resourceId={target.resourceId} focusId={target.focusId} navigate={vi.fn()} />
		</TestProviders>,
	);
	await screen.findByText('Quota in the status bar');
	await waitFor(() => expect(scroll).toHaveBeenCalled());
	const row = screen.getByText('Quota in the status bar').closest('[data-searchable-setting]')!;
	expect(row.className).toContain('ring-2');
	// The content area has no search field of its own.
	expect(screen.queryByRole('searchbox')).toBeNull();
});

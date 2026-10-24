import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import * as obsidian from 'obsidian';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { bindTestPreferences } from '../../../../../test/fixtures/vault-storage';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { DashboardColumn } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { MediaPanel } from '../media/MediaPanel';
import { PipelineSection } from '../pipeline/PipelineSection';
import { ProjectSection } from '../pm/ProjectSection';
import { RssSection } from '../rss/RssSection';
import { Section } from './Section';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
vi.mock('sonner', () => ({ toast: vi.fn(), Toaster: () => null }));

const column = (type: string, extra: Partial<DashboardColumn> = {}) =>
	({ name: type, color: '', sectionType: type, cards: [], ...extra }) as DashboardColumn;
function boardStore() {
	setLanguage('en');
	const vault = memoryVault({ 'Images/one.png': 'image' }, window);
	bindTestPreferences(vault.app, {});
	Object.assign(vault.app.metadataCache, { on: () => ({}), offref: () => {} });
	const store = {
		state: createStore(() => ({
			settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), ticktickCookie: 'retired-cookie', wereadApiKey: 'retired-key' },
			path: 'Board',
		})),
		host: { app: vault.app, updateSettings: vi.fn(), subscribeSettings: () => () => {} },
		edit: vi.fn(async () => {}),
	} as unknown as BoardStore;
	return { store, vault };
}
const emptyState = (container: HTMLElement) => container.querySelector('[data-slot="empty-state"]');

test('an RSS section with no feeds is an empty state with the way to add one, not loose text', () => {
	const { store } = boardStore();
	const { container } = render(
		<TestProviders>
			<RssSection store={store} column={column('rss')} />
		</TestProviders>,
	);
	expect(emptyState(container)?.textContent).toContain(t('rss.noFeeds'));
	expect(screen.getAllByRole('button', { name: t('rss.configure') }).length).toBeGreaterThan(0);
	expect(container.querySelector('[data-rss]')?.className).toContain('h-full');
});
test('a project board without a root folder is an empty state', async () => {
	const { store } = boardStore();
	const { container } = render(
		<TestProviders>
			<ProjectSection store={store} column={column('pm')} />
		</TestProviders>,
	);
	await waitFor(() => expect(emptyState(container)?.textContent).toContain(t('pm.emptyTitle')));
	expect(container.querySelector('[data-pm]')).toBeTruthy();
});
test('an unconfigured pipeline is an empty state, and its stage columns share the width of the tile', () => {
	const { store } = boardStore();
	const { container } = render(
		<TestProviders>
			<PipelineSection
				app={store.host.app}
				column={column('pipeline')}
				callbacks={{
					onOpenNoteInPopover: vi.fn(),
					onPipelineConfigChange: vi.fn(),
					onPipelineSkill: vi.fn(),
				}}
				signal={new AbortController().signal}
				win={window}
			/>
		</TestProviders>,
	);
	expect(emptyState(container)?.textContent).toContain(t('pipeline.emptyTitle'));
	expect(container.querySelector('section')?.className).toContain('flex-col');
});
test.each(['ticktick', 'weread'])('a retired %s section explains removal and never reads the configured service', (kind) => {
	const { store } = boardStore();
	const request = vi.spyOn(obsidian, 'requestUrl');
	const { container } = render(
		<TestProviders>
			<Section store={store} column={column(kind, { ticktickConfig: { view: 'today' }, wereadConfig: { widgets: [{ id: 'old', view: 'shelf' }] } })} />
		</TestProviders>,
	);
	expect(emptyState(container)?.textContent).toContain(t('home.integrationRetiredHint'));
	expect(screen.queryByRole('button')).toBeNull();
	expect(request).not.toHaveBeenCalled();
	expect(store.edit).not.toHaveBeenCalled();
});
test('the media toolbar is one wrapping row of 36px controls over a scrolling area and a footer', () => {
	const { store } = boardStore();
	const { container } = render(
		<TestProviders>
			<MediaPanel app={store.host.app} column={column('images')} />
		</TestProviders>,
	);
	const toolbar = container.querySelector('[data-toolbar]') as HTMLElement;
	expect(toolbar.className).toContain('flex-wrap');
	expect(toolbar.querySelector('input')?.className).toContain('h-9');
	expect(toolbar.querySelector('select')).toBeNull();
	expect(toolbar.querySelector('[role="button"]')).toBeNull();
	expect(container.querySelector('[data-footer]')).toBeTruthy();
	expect(container.querySelector('[data-card-grid]')).toBeTruthy();
});

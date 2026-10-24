import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { ReadingService } from '../../platform/reading/reading-service';
import type { WidgetSettingsHost } from '../../platform/widget-settings-host';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import { ReadingPanel } from './ReadingPanel';
vi.mock('../../platform/audio/chime', () => ({ playDing: vi.fn(), unlockChime: vi.fn() }));
const active: ReadingService[] = [];
afterEach(() => {
	cleanup();
	active.splice(0).forEach((s) => s.destroy());
});
async function service(books: unknown[]) {
	setLanguage('en');
	const path = 'huhu/阅读/reading.json';
	const vault = memoryVault({ [path]: JSON.stringify({ activeBooks: books, sessions: [] }) }, window);
	Object.assign(vault.app.workspace, { containerEl: Object.assign(document.createElement('div'), { win: window }) });
	const s = new ReadingService({ app: vault.app, settings: structuredClone(DEFAULT_DASHBOARD_SETTINGS) } as unknown as WidgetSettingsHost);
	active.push(s);
	await s.loadSessions();
	return s;
}
const book = (title: string, page: number) => ({
	title,
	author: 'Author',
	coverUrl: '',
	isbn: title,
	source: 'manual',
	totalPages: 200,
	currentPage: page,
	finished: false,
});
const props = { add: vi.fn(), edit: vi.fn(), finish: vi.fn(), statistics: vi.fn() };
test('each book is a card with a cover, a progress bar and one menu, and the list scrolls inside the tile', async () => {
	const s = await service([book('First', 50), book('Second', 100)]);
	const { container } = render(
		<TestProviders>
			<ReadingPanel service={s} {...props} />
		</TestProviders>,
	);
	expect(container.querySelector('h3')).toBeNull();
	const list = container.querySelector('ul') as HTMLElement;
	expect(list.className).toContain('overflow-y-auto');
	const cards = within(list).getAllByRole('listitem');
	expect(cards).toHaveLength(2);
	for (const card of cards) {
		expect(card.className).toContain('rounded-lg');
		expect(within(card).getByRole('progressbar')).toBeTruthy();
		expect(within(card).getByRole('button', { name: t('reading.moreActions', { title: card.getAttribute('data-book')! }) })).toBeTruthy();
	}
	expect(screen.getByRole('button', { name: t('reading.selectBook') })).toBeTruthy();
});
test('an empty reading list is an empty state with the add button', async () => {
	const s = await service([]);
	const { container } = render(
		<TestProviders>
			<ReadingPanel service={s} {...props} />
		</TestProviders>,
	);
	expect(container.querySelector('[data-slot="empty-state"]')?.textContent).toContain(t('reading.empty'));
	expect(container.querySelector('ul')).toBeNull();
});

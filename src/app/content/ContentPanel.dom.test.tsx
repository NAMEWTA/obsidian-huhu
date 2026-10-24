import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../ui/react/test-providers';
import { setLanguage, t } from '../../shared/i18n';
import { ContentOverview } from './ContentPanel';

const row = (path: string, label: string, folder: string, mtime: number) => ({ path, label, folder, mtime, icon: 'lucide-file-text' });

test('the overview lists files and a click opens one, with no editor on the page', () => {
	setLanguage('zh');
	const onOpen = vi.fn();
	render(
		<TestProviders>
			<ContentOverview folder="huhu/档案" total={2} rows={[row('huhu/档案/a.md', 'a', '档案', Date.now()), row('huhu/档案/b.pdf', 'b.pdf', '档案', 1)]} onOpen={onOpen} />
		</TestProviders>,
	);
	const buttons = within(document.querySelector('[data-content-overview]') as HTMLElement).getAllByRole('button');
	expect(buttons).toHaveLength(2);
	fireEvent.click(buttons[1]!);
	expect(onOpen).toHaveBeenCalledWith('huhu/档案/b.pdf');
	expect(screen.getByText(t('content.fileCount', { count: 2 }))).toBeTruthy();
	expect(screen.queryByRole('textbox')).toBeNull();
});

test('an empty folder shows a quiet empty state', () => {
	setLanguage('zh');
	render(
		<TestProviders>
			<ContentOverview folder="huhu" total={0} rows={[]} onOpen={() => {}} />
		</TestProviders>,
	);
	expect(screen.getByText(t('content.emptyTitle'))).toBeTruthy();
	expect(screen.queryByRole('button')).toBeNull();
});

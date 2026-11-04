import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import { MediaServiceSettings } from './ServiceSettings';
import { DashboardSettings } from './DashboardSettings';
import type { HomeHost } from '../../services/home-host';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import userEvent from '@testing-library/user-event';
import { t } from '../../../../shared/i18n';
afterEach(cleanup);
test('React media settings preserve album creation fields', async () => {
	let current = structuredClone(DEFAULT_DASHBOARD_SETTINGS);
	function Harness() {
		const [settings, set] = useState(current);
		return (
			<TestProviders>
				<MediaServiceSettings
					settings={settings}
					update={async (change) => {
						const next = structuredClone(current);
						change(next);
						current = next;
						set(next);
					}}
				/>
			</TestProviders>
		);
	}
	render(<Harness />);
	fireEvent.click(screen.getByRole('button', { name: t('album.add') }));
	fireEvent.change(screen.getByLabelText(t('settings.widgetAlbumFolder')), { target: { value: 'Assets' } });
	fireEvent.change(screen.getByLabelText(t('settings.widgetAlbumInterval')), { target: { value: '15' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	await waitFor(() => expect(current.albums).toHaveLength(1));
	expect(current.albums[0]).toMatchObject({
		folder: 'Assets',
		intervalSec: 15,
		recursive: true,
		transition: 'fade',
		heightRatio: 'full',
	});
});
test('dashboard settings show no third-party integrations and keep the independent local reading preference', async () => {
	let settings = { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS) };
	const before = settings.readingSoundEnabled, listeners = new Set<() => void>();
	const vault = memoryVault({ 'huhu/Books/Highlights.md': 'Imported highlights stay here' });
	Object.assign(vault.app.vault, { getAllLoadedFiles: () => [...vault.app.vault.getFiles(), { path: 'huhu/Books', children: [] }] });
	const host = {
		app: vault.app,
		manifest: { version: 'test' },
		get settings() { return settings; },
		subscribeSettings: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
		updateSettings: vi.fn(async (change: (s: typeof settings) => void) => {
			settings = structuredClone(settings);
			change(settings);
			for (const listener of listeners) listener();
		}),
	} as unknown as HomeHost;
	const view = render(<TestProviders><DashboardSettings host={host} /></TestProviders>);
	await userEvent.setup().click(screen.getByRole('tab', { name: t('home.dashboard.tab.widgets') }));
	expect(view.container.textContent).not.toMatch(/TickTick|WeRead|滴答|微信读书/);
	expect(view.container.querySelector('a[href*="weread"]')).toBeNull();
	const reading = screen.getByRole('switch', { name: t('settings.readingSound') });
	await userEvent.setup().click(reading);
	await waitFor(() => expect(settings.readingSoundEnabled).toBe(!before));
	expect(vault.contents.get('huhu/Books/Highlights.md')).toBe('Imported highlights stay here');
});

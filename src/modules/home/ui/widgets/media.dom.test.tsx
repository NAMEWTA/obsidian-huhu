import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { createStore } from 'zustand/vanilla';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { TestProviders } from '../../../../ui/react/test-providers';
import { VisibilityContext } from '../../../../ui/react/contexts';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types';
import type { BoardStore } from '../../services/board-store';
import { AlbumPanel, albumControllers } from './AlbumPanel';
import { AlbumWidget } from './AlbumWidget';
import { listAlbumImages } from './album-model';
import { t } from '../../../../shared/i18n';
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});
vi.mock('../media/image-resource', () => ({
	resolveVaultImage: (_app: unknown, path: string) => `app://vault/${path}`,
}));
function fixture() {
	const vault = memoryVault(
		{
			'Photos/a2.png': 'image',
			'Photos/a10.jpg': 'image',
			'Photos/deep/b.png': 'image',
			'Photos/readme.md': 'text',
		},
		window,
	);
	const settings = {
		...structuredClone(DEFAULT_DASHBOARD_SETTINGS),
		widgetAlbumFolder: 'Photos',
		widgetAlbumRecursive: false,
		widgetAlbumIntervalSec: 8,
	};
	return { vault, settings };
}
test('album filters recursion and extensions, preserves photo on refresh, pauses and releases owner-window timer', async () => {
	const { vault, settings } = fixture();
	expect(listAlbumImages(vault.app, 'Photos', false)).toEqual(['Photos/a2.png', 'Photos/a10.jpg']);
	expect(listAlbumImages(vault.app, 'Photos', true)).toHaveLength(3);
	const interval = vi.spyOn(window, 'setInterval'),
		clear = vi.spyOn(window, 'clearInterval');
	let host: HTMLDivElement | null = null;
	function Scene() {
		const [root, setRoot] = useState<HTMLDivElement | null>(null);
		host = root;
		return <div ref={setRoot}>{root && <AlbumPanel root={root} app={vault.app} settings={settings} />}</div>;
	}
	const view = render(
		<TestProviders>
			<Scene />
		</TestProviders>,
	);
	expect(interval).toHaveBeenCalled();
	const before = host!.querySelector('img')!.getAttribute('src');
	act(() => albumControllers.get(host!)!.setImages(['Photos/a2.png', 'Photos/a10.jpg']));
	expect(host!.querySelector('img')!.getAttribute('src')).toBe(before);
	fireEvent.mouseEnter(host!.querySelector('.dashboard-sidebar-album-frame')!);
	const tick = interval.mock.calls.at(-1)![0] as () => void;
	act(() => tick());
	expect(host!.querySelector('img')!.getAttribute('src')).toBe(before);
	fireEvent.click(screen.getByRole('button', { name: t('album.next') }));
	expect(host!.querySelector('img')!.getAttribute('src')).not.toBe(before);
	view.unmount();
	expect(clear).toHaveBeenCalled();
	expect(albumControllers.get(host!)).toBeUndefined();
});
test('hiding an album page releases its rotation interval', () => {
	const { vault, settings } = fixture();
	settings.albums = [
		{
			id: 1,
			folder: 'Photos',
			recursive: false,
			intervalSec: 8,
			ratio: '1:1',
			transition: 'fade',
			heightRatio: 'full',
		},
	];
	const store = { host: { app: vault.app }, state: createStore(() => ({ settings })) } as unknown as BoardStore;
	const clear = vi.spyOn(window, 'clearInterval'),
		view = render(
			<TestProviders>
				<VisibilityContext value={true}>
					<AlbumWidget store={store} entryId="1" />
				</VisibilityContext>
			</TestProviders>,
		);
	view.rerender(
		<TestProviders>
			<VisibilityContext value={false}>
				<AlbumWidget store={store} entryId="1" />
			</VisibilityContext>
		</TestProviders>,
	);
	expect(clear).toHaveBeenCalled();
});
test('the photo album fills its tile and shows equal-width columns once the tile is wide', () => {
	const { vault, settings } = fixture();
	const root = document.createElement('div');
	document.body.append(root);
	const many = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`Photos/p${i}.png`, 'image']));
	const big = memoryVault(many, window);
	const { container } = render(
		<TestProviders>
			<AlbumPanel root={root} app={big.app} settings={{ ...settings, widgetAlbumFolder: 'Photos' }} />
		</TestProviders>,
	);
	void vault;
	expect(container.querySelector('.dashboard-sidebar-album-body')!.className).toContain('h-full');
	const frame = container.querySelector('.dashboard-sidebar-album-frame') as HTMLElement;
	expect(frame.className).not.toContain('aspect');
	expect(frame.className).toContain('@3xl:hidden');
	const mosaic = container.querySelector('[data-album-mosaic]') as HTMLElement;
	expect(mosaic.className).toContain('grid-cols-4');
	expect(mosaic.className).toContain('@3xl:grid');
	expect(mosaic.querySelectorAll('img')).toHaveLength(6);
	root.remove();
});

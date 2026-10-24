import { afterEach, expect, test } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { useWidgetBackground } from './WidgetBackground';

afterEach(cleanup);

function store(foreground?: 'light' | 'dark') {
	const state = createStore(() => ({
		settings: {
			...structuredClone(DEFAULT_DASHBOARD_SETTINGS),
			musicBackground: { image: 'Media/bg.png', opacity: 100, dim: 45, blur: 0, foreground },
		},
	}));
	return { state, image: async () => 'data:image/png;base64,AAAA' } as unknown as BoardStore;
}
function Probe({ store, frame }: { store: BoardStore; frame?: boolean }) {
	const { className, style, layer } = useWidgetBackground(store, 'music', frame === undefined ? undefined : { frame });
	return (
		<div data-probe className={className} style={style}>
			{layer}
		</div>
	);
}

test('a card background is the picture and its dimming across the whole card, with no inset glass plate', async () => {
	render(
		<TestProviders>
			<Probe store={store('light')} frame={false} />
		</TestProviders>,
	);
	await waitFor(() => expect(document.querySelector('.dashboard-widget-bg')).not.toBeNull());
	expect(document.querySelector('.dashboard-widget-frame')).toBeNull();
});

test('the old sidebar card keeps its glass plate unless asked not to', async () => {
	render(
		<TestProviders>
			<Probe store={store('light')} />
		</TestProviders>,
	);
	await waitFor(() => expect(document.querySelector('.dashboard-widget-frame')).not.toBeNull());
});

test('a chosen foreground recolors text, icons and muted surfaces of the card, not only the board tokens', async () => {
	render(
		<TestProviders>
			<Probe store={store('light')} frame={false} />
		</TestProviders>,
	);
	await waitFor(() => expect(document.querySelector('.dashboard-widget-bg')).not.toBeNull());
	const style = document.querySelector<HTMLElement>('[data-probe]')!.style;
	for (const name of ['--foreground', '--card-foreground', '--muted-foreground', '--muted', '--db-text']) expect(style.getPropertyValue(name), name).not.toBe('');
	expect(style.getPropertyValue('--muted-foreground')).toContain('--on-image');
});

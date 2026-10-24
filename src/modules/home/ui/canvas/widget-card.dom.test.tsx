import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { WidgetCard, type WidgetCardProps } from './WidgetCard';
import { WidgetActions, useWidgetMenu } from './widget-frame';
import { DRAG_CANCEL, DRAG_HANDLE } from './grid-config';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);

const noop = () => {};
const props = (over: Partial<WidgetCardProps> = {}): WidgetCardProps => ({
	title: 'Probe',
	icon: 'box',
	tiers: ['S', 'M'],
	current: 'S',
	canConfigure: true,
	narrow: false,
	onTier: noop,
	onConfigure: noop,
	onRemove: noop,
	onMove: noop,
	onResize: noop,
	children: <p>body</p>,
	...over,
});
const menu = (name: string) =>
	fireEvent.pointerDown(screen.getByRole('button', { name: t('canvas.moreActions', { name }) }), {
		button: 0,
		ctrlKey: false,
		pointerType: 'mouse',
	});

test('the card has one title in a 40px title bar that is the drag handle, and a padded body that is a size container', () => {
	render(
		<TestProviders>
			<WidgetCard {...props()} />
		</TestProviders>,
	);
	const bar = document.querySelector<HTMLElement>('[data-slot="widget-header"]')!;
	expect(bar.matches(DRAG_HANDLE)).toBe(true);
	expect(bar.className).toContain('h-10');
	expect(bar.className).toContain('px-3');
	expect(document.querySelectorAll('[data-slot="widget-title"]')).toHaveLength(1);
	expect(screen.getByText('Probe').tagName).toBe('H3');
	const body = document.querySelector<HTMLElement>('[data-slot="widget-body"]')!;
	expect(body.className).toContain('huhu-widget-body');
	expect(body.className).toContain('px-3');
	expect(body.className).toContain('pb-3');
	expect(body.className).toContain('[container-type:size]');
	// the body never starts a drag; the grip and the title bar do
	expect(body.matches(DRAG_CANCEL)).toBe(true);
	expect(bar.querySelector('[data-grid-action="move"]')!.closest(DRAG_CANCEL)).toBeNull();
	const card = document.querySelector<HTMLElement>('[data-slot="card"]')!;
	for (const cls of ['rounded-xl', 'border-border', 'overflow-hidden', 'shadow-xs', 'h-full']) expect(card.className).toContain(cls);
});

test('a view puts its buttons in the title bar slot and entries in the menu; both belong to the card', async () => {
	const archive = vi.fn();
	function View() {
		useWidgetMenu([{ id: 'archive', label: 'Archive things', onSelect: archive }]);
		return (
			<WidgetActions>
				<button type="button" aria-label="Refresh view">
					r
				</button>
			</WidgetActions>
		);
	}
	render(
		<TestProviders>
			<WidgetCard {...props({ children: <View /> })} />
		</TestProviders>,
	);
	const slot = document.querySelector('[data-slot="widget-actions"]')!;
	await waitFor(() => expect(slot.querySelector('[aria-label="Refresh view"]')).not.toBeNull());
	expect(document.querySelector('[data-slot="widget-body"]')!.querySelector('[aria-label="Refresh view"]')).toBeNull();
	menu('Probe');
	fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive things' }));
	expect(archive).toHaveBeenCalledTimes(1);
});

test('the menu carries size, move, settings and remove, and tells the board what was chosen', async () => {
	const onTier = vi.fn(),
		onMove = vi.fn(),
		onRemove = vi.fn(),
		onConfigure = vi.fn();
	render(
		<TestProviders>
			<WidgetCard {...props({ onTier, onMove, onRemove, onConfigure })} />
		</TestProviders>,
	);
	menu('Probe');
	fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: t('canvas.setSize', { name: 'Probe', size: t('canvas.size.M') }) }));
	expect(onTier).toHaveBeenCalledWith('M');
	menu('Probe');
	fireEvent.click(await screen.findByRole('menuitem', { name: t('canvas.moveRight') }));
	expect(onMove).toHaveBeenCalledWith(1, 0);
	menu('Probe');
	fireEvent.click(await screen.findByRole('menuitem', { name: t('canvas.settings', { name: 'Probe' }) }));
	expect(onConfigure).toHaveBeenCalled();
	menu('Probe');
	fireEvent.click(await screen.findByRole('menuitem', { name: t('home.widget.removeNamed', { name: 'Probe' }) }));
	expect(onRemove).toHaveBeenCalled();
});

test('minimal chrome lays the title bar over the body, shown on hover, and it is still the handle', () => {
	render(
		<TestProviders>
			<WidgetCard {...props({ chrome: 'minimal', bleed: true })} />
		</TestProviders>,
	);
	const bar = document.querySelector<HTMLElement>('[data-slot="widget-header"]')!;
	expect(bar.className).toContain('absolute');
	expect(bar.className).toContain('opacity-0');
	expect(bar.className).toContain('group-hover/tile:opacity-100');
	expect(bar.matches(DRAG_HANDLE)).toBe(true);
	expect(document.querySelector('[data-slot="widget-body"]')!.className).not.toContain('px-3');
});

test('a title that can be renamed edits in place on double click and saves on Enter', async () => {
	const onRename = vi.fn(async (_title: string) => {});
	render(
		<TestProviders>
			<WidgetCard {...props({ onRename })} />
		</TestProviders>,
	);
	fireEvent.doubleClick(screen.getByText('Probe'));
	const field = await screen.findByLabelText(t('ui.rename'));
	fireEvent.change(field, { target: { value: 'Renamed' } });
	fireEvent.keyDown(field, { key: 'Enter' });
	await waitFor(() => expect(onRename).toHaveBeenCalledWith('Renamed'));
	await waitFor(() => expect(screen.queryByLabelText(t('ui.rename'))).toBeNull());
});

test('views rendered without a card (another surface) get their buttons inline', () => {
	render(
		<TestProviders>
			<WidgetActions>
				<button type="button">solo</button>
			</WidgetActions>
		</TestProviders>,
	);
	expect(document.querySelector('[data-slot="widget-actions-inline"]')!.textContent).toBe('solo');
});

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { setLanguage, t } from '../../../../shared/i18n';
import type { HomeWidgetKind } from '../../api';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { GridBreakpoint, GridItem } from '../../core/board/grid';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { indexWidgetProviders } from '../../core/board/widget-registry';
import { BoardCanvas } from './BoardCanvas';
import { DRAG_CANCEL, DRAG_HANDLE } from './grid-config';

const toasts = vi.hoisted(() => [] as { message: string; options?: { action?: { label: string; onClick(): void } } }[]);
vi.mock('sonner', async (original) => {
	const real = await original<typeof import('sonner')>();
	const toast = Object.assign(
		(message: string, options?: { action?: { label: string; onClick(): void } }) => {
			toasts.push({ message, options });
			return toasts.length;
		},
		real.toast,
	);
	return { ...real, toast };
});

const probe: HomeWidgetKind = {
	key: 'probe',
	titleKey: 'probe.title',
	icon: 'box',
	category: 'tools',
	sizes: { S: { w: 3, h: 2 }, M: { w: 6, h: 2 }, L: { w: 6, h: 4 }, XL: { w: 12, h: 4 } },
	defaultTier: 'M',
	minSize: { w: 3, h: 2 },
	instances: () => [{ id: 'default' }],
	render: (host) => {
		host.textContent = 'probe content';
	},
};
const second: HomeWidgetKind = { ...probe, key: 'other', titleKey: 'other.title' };
const member = { memberId: 'probe:probe:default', provider: 'probe', kind: 'probe', instanceId: 'default' };

function fixture(
	widgets: (typeof member)[] = [member],
	kinds: HomeWidgetKind[] = [probe],
	grid: { v: 2; lg: GridItem[]; md?: GridItem[] } = { v: 2, lg: [{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 }] },
	onBreakpoint?: (breakpoint: GridBreakpoint) => void,
	context: Partial<NativeSurfaceContext> = {},
) {
	setLanguage('en');
	homeServices.widgets = indexWidgetProviders([{ module: 'probe', bundle: { kinds } }]);
	const sync = {
		setBoardGrid: vi.fn(async (_patch: unknown) => {}),
		setBoardMembers: vi.fn(async () => {}),
		addToCanvas: vi.fn(async () => {}),
		deleteColumn: vi.fn(async () => {}),
		deleteCard: vi.fn(async () => {}),
		replaceData: vi.fn(async (_data: unknown) => {}),
	};
	const data = { quickActions: [], columns: [], widgets, grid };
	const state = createStore(() => ({
		path: 'dashboard',
		settings: structuredClone(DEFAULT_DASHBOARD_SETTINGS),
		data,
		widgetRevision: 0,
		generation: 0,
		files: [],
		dialog: null as 'section' | null,
	}));
	const store = {
		view: () => store,
		state,
		sync,
		host: { openSettings: vi.fn() },
		image: async () => '',
		setDialog: vi.fn(),
	} as unknown as BoardStore;
	render(
		<TestProviders>
			<BoardCanvas store={store} context={context as NativeSurfaceContext} onBreakpoint={onBreakpoint} />
		</TestProviders>,
	);
	return { store, sync, state, data };
}

/** happy-dom has no layout: the grid is as wide as the test says. */
let gridWidth = 1200;
beforeEach(() => {
	gridWidth = 1200;
	toasts.length = 0;
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => gridWidth });
	Object.assign(globalThis, {
		ResizeObserver: class {
			constructor(private readonly callback: (entries: unknown[]) => void) {}
			observe() {
				this.callback([]);
			}
			disconnect() {}
			unobserve() {}
		},
	});
});
afterEach(() => {
	cleanup();
	delete homeServices.widgets;
});

const menu = async (name: string) => {
	fireEvent.pointerDown(screen.getByRole('button', { name: t('canvas.moreActions', { name }) }), {
		button: 0,
		ctrlKey: false,
		pointerType: 'mouse',
	});
};
const tile = () => document.querySelector<HTMLElement>('[data-tile]')!;

test('there is no editing mode: no Edit or Done button, an always-present Add widget button, and a handle on every tile', () => {
	fixture();
	expect(screen.queryByRole('button', { name: 'Edit board' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
	expect(screen.getByRole('button', { name: t('canvas.addWidget') })).toBeTruthy();
	expect(document.querySelector('[data-editing]')).toBeNull();
	for (const el of document.querySelectorAll('[data-tile]')) {
		expect(el.querySelector(DRAG_HANDLE), el.getAttribute('data-tile') ?? '').not.toBeNull();
		expect(el.querySelector(`${DRAG_HANDLE} [data-grid-action="move"]`)).not.toBeNull();
	}
});

test('dragging needs no mode: the title bar is the handle, and controls, fields and the body are outside it', async () => {
	fixture();
	await waitFor(() => expect(tile().textContent).toContain('probe content'));
	const handle = tile().querySelector<HTMLElement>(DRAG_HANDLE)!;
	// the title bar and the grip start a drag
	expect(handle.matches(DRAG_HANDLE)).toBe(true);
	expect(handle.querySelector('[data-grid-action="move"]')!.closest(DRAG_CANCEL)).toBeNull();
	// the actions button inside the title bar never does
	const actions = screen.getByRole('button', { name: t('canvas.moreActions', { name: t('probe.title') }) });
	expect(handle.contains(actions)).toBe(true);
	expect(actions.closest(DRAG_CANCEL)).toBe(actions);
	// the body (and so every field, button and scroll area in it) is a cancel region and not part of the handle
	const body = tile().querySelector<HTMLElement>('.huhu-widget-body')!;
	expect(handle.contains(body)).toBe(false);
	const field = document.createElement('input');
	body.append(field);
	for (const element of [body, field]) expect(element.closest(DRAG_CANCEL), element.tagName).not.toBeNull();
	for (const selector of ['button', 'a', 'input', 'textarea', 'select'])
		expect(document.createElement(selector).matches(DRAG_CANCEL), selector).toBe(true);
});

test('every tile is one card: a single title from the kind or the member label, the title bar over a padded body, no view-drawn title', async () => {
	fixture([{ ...member, label: 'My probe' } as typeof member]);
	await waitFor(() => expect(tile().textContent).toContain('probe content'));
	const card = tile().querySelector<HTMLElement>('[data-slot="card"]')!;
	expect(card.parentElement).toBe(tile());
	expect(tile().querySelectorAll('[data-slot="widget-title"]')).toHaveLength(1);
	// the user's own title wins over the kind's name
	expect(tile().querySelector('[data-slot="widget-title"]')!.textContent).toBe('My probe');
	expect(tile().querySelector('[data-slot="widget-header"]')!.className).toContain('h-10');
	expect(tile().querySelector('.huhu-widget-body')!.className).toContain('px-3');
	expect(tile().querySelectorAll('h3')).toHaveLength(1);
});

test('every tile has a fixed cell size: tiles of one row share top and bottom edges whatever they hold', async () => {
	const grid = {
		v: 2 as const,
		lg: [
			{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 },
			{ i: 'widget:probe:other:default', x: 6, y: 0, w: 6, h: 2 },
		],
	};
	fixture(
		[member, { memberId: 'probe:other:default', provider: 'probe', kind: 'other', instanceId: 'default' }],
		[probe, second],
		grid,
	);
	await waitFor(() => expect(document.querySelectorAll('[data-tile]')).toHaveLength(2));
	const [a, b] = [...document.querySelectorAll<HTMLElement>('[data-tile]')];
	// two rows of 80px and the 16px gap between them
	expect(a!.style.height).toBe('176px');
	expect(b!.style.height).toBe('176px');
	expect(a!.style.transform).toMatch(/,\s*0px\)/);
	expect(b!.style.transform).toMatch(/,\s*0px\)/);
	expect(a!.style.width).toBe(b!.style.width);
});

test('the size menu offers the supported tiers and a tier is one write at its cells', async () => {
	const { sync } = fixture();
	await menu(t('probe.title'));
	const medium = await screen.findByRole('menuitemcheckbox', {
		name: t('canvas.setSize', { name: t('probe.title'), size: t('canvas.size.M') }),
	});
	expect(medium.getAttribute('aria-checked')).toBe('true');
	for (const tier of ['S', 'L', 'XL'])
		expect(
			screen.getByRole('menuitemcheckbox', {
				name: t('canvas.setSize', { name: t('probe.title'), size: t(`canvas.size.${tier}`) }),
			}),
		).toBeTruthy();
	fireEvent.click(
		screen.getByRole('menuitemcheckbox', {
			name: t('canvas.setSize', { name: t('probe.title'), size: t('canvas.size.L') }),
		}),
	);
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(1));
	const patch = sync.setBoardGrid.mock.calls[0]![0] as { lg: GridItem[]; md?: GridItem[] };
	expect(patch.lg).toEqual([{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 4 }]);
	// the six-column layout is not stored yet, so it is not written either
	expect(patch.md).toBeUndefined();
});

test('once the six-column layout is stored, a tier changes both layouts in the same write', async () => {
	const { sync } = fixture(
		[member],
		[probe],
		{
			v: 2,
			lg: [{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 }],
			md: [{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 }],
		},
	);
	await menu(t('probe.title'));
	fireEvent.click(
		await screen.findByRole('menuitemcheckbox', {
			name: t('canvas.setSize', { name: t('probe.title'), size: t('canvas.size.XL') }),
		}),
	);
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(1));
	const patch = sync.setBoardGrid.mock.calls[0]![0] as { lg: GridItem[]; md: GridItem[] };
	expect(patch.lg[0]).toMatchObject({ w: 12, h: 4 });
	expect(patch.md[0]).toMatchObject({ w: 6, h: 4 });
});

test('the keyboard moves a tile by a cell from its grip and resizes it with Shift; menu moves do the same', async () => {
	const grid = {
		v: 2 as const,
		lg: [
			{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 },
			{ i: 'widget:probe:other:default', x: 0, y: 2, w: 6, h: 2 },
		],
	};
	const { sync } = fixture(
		[member, { memberId: 'probe:other:default', provider: 'probe', kind: 'other', instanceId: 'default' }],
		[probe, second],
		grid,
	);
	const grip = document.querySelector<HTMLElement>('[data-tile="widget:probe:probe:default"] [data-grid-action="move"]')!;
	expect(grip.getAttribute('aria-label')).toBe(t('renderer.moveTile', { name: t('probe.title') }));
	fireEvent.keyDown(grip, { key: 'ArrowDown' });
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(1));
	const moved = (sync.setBoardGrid.mock.calls[0]![0] as { lg: GridItem[] }).lg;
	const y = (id: string) => moved.find((item) => item.i === id)!.y;
	expect(y('widget:probe:probe:default')).toBeGreaterThan(y('widget:probe:other:default'));
	expect(screen.getByRole('status', { hidden: true }).textContent).toMatch(/^Column 1, row \d/);
	fireEvent.keyDown(grip, { key: 'ArrowRight', shiftKey: true });
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(2));
	const grown = (sync.setBoardGrid.mock.calls[1]![0] as { lg: GridItem[] }).lg.find((item) => item.i === 'widget:probe:probe:default')!;
	expect(grown.w).toBe(7);
	// the menu carries the same moves for pointer users who do not drag
	await menu(t('probe.title'));
	fireEvent.click(await screen.findByRole('menuitem', { name: t('canvas.moveRight') }));
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(3));
});

test('the one-column layout reorders for this page only and never writes the board', async () => {
	const grid = {
		v: 2 as const,
		lg: [
			{ i: 'widget:probe:probe:default', x: 0, y: 0, w: 6, h: 2 },
			{ i: 'widget:probe:other:default', x: 6, y: 0, w: 6, h: 2 },
		],
	};
	gridWidth = 400;
	const seen: GridBreakpoint[] = [];
	const { sync } = fixture(
		[member, { memberId: 'probe:other:default', provider: 'probe', kind: 'other', instanceId: 'default' }],
		[probe, second],
		grid,
		(breakpoint) => seen.push(breakpoint),
	);
	await waitFor(() => expect(seen).toContain('sm'));
	expect(document.querySelector('.huhu-widget-board')?.getAttribute('data-breakpoint')).toBe('sm');
	const topOf = (id: string) => document.querySelector<HTMLElement>(`[data-tile="${id}"]`)!.style.transform;
	expect(topOf('widget:probe:probe:default')).toMatch(/,\s*0px\)/);
	const grip = document.querySelector<HTMLElement>('[data-tile="widget:probe:probe:default"] [data-grid-action="move"]')!;
	fireEvent.keyDown(grip, { key: 'ArrowDown' });
	await waitFor(() => expect(topOf('widget:probe:probe:default')).not.toMatch(/,\s*0px\)/));
	expect(topOf('widget:probe:other:default')).toMatch(/,\s*0px\)/);
	expect(sync.setBoardGrid).not.toHaveBeenCalled();
	// a single column has no resize handle and no sideways moves
	expect(tile().classList.contains('react-resizable-hide')).toBe(true);
	await menu(t('probe.title'));
	expect(await screen.findByRole('menuitem', { name: t('canvas.moveUp') })).toBeTruthy();
	expect(screen.queryByRole('menuitem', { name: t('canvas.moveLeft') })).toBeNull();
});

test('the six-column layout is reported and a drag there is stored as its own layout', async () => {
	gridWidth = 800;
	const seen: GridBreakpoint[] = [];
	const { sync } = fixture(undefined, undefined, undefined, (breakpoint) => seen.push(breakpoint));
	await waitFor(() => expect(seen).toContain('md'));
	const grip = document.querySelector<HTMLElement>('[data-tile] [data-grid-action="move"]')!;
	fireEvent.keyDown(grip, { key: 'ArrowDown' });
	await waitFor(() => expect(sync.setBoardGrid).toHaveBeenCalledTimes(1));
	const patch = sync.setBoardGrid.mock.calls[0]![0] as Record<string, unknown>;
	expect(Object.keys(patch)).toEqual(['md']);
});

test('the add panel searches, previews a size and adds the widget in one write at that size', async () => {
	const { sync } = fixture([]);
	fireEvent.click(screen.getByRole('button', { name: t('canvas.addWidget') }));
	fireEvent.change(screen.getByLabelText(t('canvas.search')), { target: { value: 'zzz' } });
	expect(screen.getByText(t('canvas.empty'))).toBeTruthy();
	fireEvent.change(screen.getByLabelText(t('canvas.search')), { target: { value: 'probe' } });
	const entry = document.querySelector<HTMLElement>('[data-widget-entry="probe"]')!;
	expect(entry).not.toBeNull();
	fireEvent.click(entry.querySelector<HTMLButtonElement>('button[title="' + t('canvas.size.XL') + '"]')!);
	expect(entry.querySelector<HTMLElement>('[data-testid="footprint"]')?.style.width).toBe('100%');
	fireEvent.click(screen.getByRole('button', { name: t('home.widget.addNamed', { name: t('probe.title') }) }));
	await waitFor(() => expect(sync.addToCanvas).toHaveBeenCalledTimes(1));
	expect(sync.addToCanvas).toHaveBeenCalledWith(
		{ member: { memberId: 'probe:probe:default', provider: 'probe', kind: 'probe', instanceId: 'default' } },
		{ w: 12, h: 4 },
	);
	expect(document.querySelector('[data-widget-entry]')).toBeNull();
});

test('removing a widget writes the member list once and offers an undo that restores the board as it was', async () => {
	const { sync, data } = fixture();
	await menu(t('probe.title'));
	fireEvent.click(await screen.findByRole('menuitem', { name: t('home.widget.removeNamed', { name: t('probe.title') }) }));
	await waitFor(() => expect(sync.setBoardMembers).toHaveBeenCalledExactlyOnceWith([]));
	expect(toasts).toHaveLength(1);
	expect(toasts[0]!.message).toBe(t('canvas.removed', { name: t('probe.title') }));
	expect(toasts[0]!.options?.action?.label).toBe(t('canvas.undo'));
	expect(sync.replaceData).not.toHaveBeenCalled();
	act(() => toasts[0]!.options!.action!.onClick());
	expect(sync.replaceData).toHaveBeenCalledTimes(1);
	expect(sync.replaceData.mock.calls[0]![0]).toBe(data);
});

test('a contributed widget mounts through its render and is released when its member goes', async () => {
	const { state } = fixture();
	await waitFor(() => expect(document.querySelector('[data-tile]')?.textContent).toContain('probe content'));
	// Removing the provider's member keeps the saved tile as a placeholder; the provider's view is released.
	act(() => state.setState({ data: { ...state.getState().data!, widgets: [] } }));
	expect(document.querySelector('[data-tile]')?.textContent).not.toContain('probe content');
});

test('the add-section command opens the add-widget panel', () => {
	const { state } = fixture();
	expect(document.querySelector('[data-widget-entry]')).toBeNull();
	act(() => state.setState({ dialog: 'section' }));
	expect(document.querySelector('[data-widget-entry="probe"]')).not.toBeNull();
});

test('the add panel follows provider registration and instance changes without a board edit', () => {
	const listeners = new Set<() => void>();
	homeServices.watchWidgets = (listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	};
	try {
		fixture();
		fireEvent.click(screen.getByRole('button', { name: t('canvas.addWidget') }));
		expect(document.querySelector('[data-widget-entry="newprovider"]')).toBeNull();
		const added = { ...probe, key: 'newprovider', titleKey: 'newprovider.title' };
		homeServices.widgets = indexWidgetProviders([{ module: 'probe', bundle: { kinds: [probe, added] } }]);
		act(() => listeners.forEach((listener) => listener()));
		expect(document.querySelector('[data-widget-entry="newprovider"]')).not.toBeNull();
		homeServices.widgets = indexWidgetProviders([{ module: 'probe', bundle: { kinds: [probe] } }]);
		act(() => listeners.forEach((listener) => listener()));
		expect(document.querySelector('[data-widget-entry="newprovider"]')).toBeNull();
	} finally {
		delete homeServices.watchWidgets;
	}
});

test('settings changes (instance lists) refresh the add panel too', () => {
	const { state } = fixture();
	fireEvent.click(screen.getByRole('button', { name: t('canvas.addWidget') }));
	const added = { ...probe, key: 'newprovider', titleKey: 'newprovider.title' };
	homeServices.widgets = indexWidgetProviders([{ module: 'probe', bundle: { kinds: [probe, added] } }]);
	act(() => state.setState({ settings: { ...state.getState().settings }, files: [] }));
	expect(document.querySelector('[data-widget-entry="newprovider"]')).not.toBeNull();
});

test('a contributed widget receives the new board path after the board is switched', async () => {
	const original = probe.render;
	const mounts: string[] = [];
	const released: string[] = [];
	probe.render = (_host, ctx) => {
		mounts.push(ctx.boardPath);
		return () => released.push(ctx.boardPath);
	};
	try {
		const { state } = fixture();
		await waitFor(() => expect(mounts).toEqual(['dashboard']));
		act(() => state.setState({ path: 'other-board', data: { ...state.getState().data! } }));
		await waitFor(() => expect(mounts).toEqual(['dashboard', 'other-board']));
		expect(released).toEqual(['dashboard']);
	} finally {
		probe.render = original;
	}
});

test('configure and create lifetimes end when the canvas goes away or the board changes', async () => {
	let signal: AbortSignal | undefined;
	let finish: () => void = () => {};
	probe.configure = async (ctx) => {
		signal = ctx.signal;
		await new Promise<void>((resolve) => (finish = resolve));
	};
	try {
		fixture();
		await menu(t('probe.title'));
		fireEvent.click(await screen.findByRole('menuitem', { name: t('canvas.settings', { name: t('probe.title') }) }));
		await waitFor(() => expect(signal).toBeDefined());
		expect(signal?.aborted).toBe(false);
		cleanup();
		expect(signal?.aborted).toBe(true);
	} finally {
		finish();
		delete probe.configure;
	}
});

test('a late create result is dropped when the board changed meanwhile and a revoked provider aborts its lifetime', async () => {
	let signal: AbortSignal | undefined;
	let finish: (value: { id: string } | null) => void = () => {};
	const creating: HomeWidgetKind = {
		...probe,
		key: 'maker',
		titleKey: 'maker.title',
		multiple: true,
		create: (ctx) => {
			signal = ctx.signal;
			return new Promise((resolve) => (finish = resolve));
		},
	};
	homeServices.watchWidgets = () => () => {};
	try {
		const { state, sync } = fixture([], [probe, creating]);
		fireEvent.click(screen.getByRole('button', { name: t('canvas.addWidget') }));
		fireEvent.click(screen.getByRole('button', { name: t('home.widget.createNamed', { name: t('maker.title') }) }));
		await waitFor(() => expect(signal).toBeDefined());
		act(() => state.setState({ path: 'other-board' }));
		expect(signal?.aborted).toBe(true);
		await act(async () => finish({ id: 'late' }));
		expect(sync.addToCanvas).not.toHaveBeenCalled();
	} finally {
		delete homeServices.watchWidgets;
	}
});

test('the navigation toggle in the header does something or is not there: a board has no side panel, so only the narrow layout, where it opens the navigation drawer, keeps it', () => {
	const togglePanel = vi.fn();
	fixture(undefined, undefined, undefined, undefined, { togglePanel });
	expect(screen.queryByRole('button', { name: t('home.dashboard.togglePanel') })).toBeNull();
	cleanup();
	gridWidth = 500;
	fixture(undefined, undefined, undefined, undefined, { togglePanel });
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.togglePanel') }));
	expect(togglePanel).toHaveBeenCalledTimes(1);
});

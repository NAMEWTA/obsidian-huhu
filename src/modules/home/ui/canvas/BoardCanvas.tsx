// Layout engine: react-grid-layout 2.2.4 (MIT). Tile content and widget frames adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/immersive.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'obsidian';
import { Responsive } from 'react-grid-layout';
import { toast } from 'sonner';
import { useStore } from 'zustand';
import { Ellipsis, PanelLeft, Plus } from 'lucide-react';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { Button } from '../../../../ui/components/button';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { widgetTileDefaults } from '../../services/widget-layout';
import { boardTileSources, tileSpecs, type BoardTileSource } from '../../core/board/board-tiles';
import {
	GRID_BREAKPOINTS,
	GRID_COLUMNS,
	GRID_MARGIN,
	GRID_ROW_HEIGHT,
	breakpointOf,
	layoutsFor,
	nudgeItem,
	resizeItem,
	type GridBreakpoint,
	type GridItem,
} from '../../core/board/grid';
import type { BoardWidgetMember } from '../../core/board/types/model';
import { legacyWeatherLocation } from '../../core/board/weather-locations';
import { WidgetLifetime } from '../../core/board/widget-lifetime';
import { widgetProviderKey } from '../../core/board/widget-registry';
import { exactTier, tierSize } from '../../core/board/widget-catalog';
import type { HomeWidgetTier } from '../../core/board/widget-tiers';
import { observeBoardAction } from '../board/actions';
import { IconButton } from '../board/controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { AddWidgetPanel, type AddRequest, type PanelEntry } from './AddWidgetPanel';
import { TileFrame } from './TileFrame';
import { BoardTitle } from './BoardTitle';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { kindOfSource, sourceWidgetKey } from './canvas-model';
import { DRAG_CANCEL, DRAG_HANDLE, useGridWidth } from './grid-config';
import { widgetContext } from './widget-context';
import { useCatalogRevision } from './use-catalog';

/** Whether a provider is registered and, when an instance is named, still lists it. */
const providerHas = (module: string, kind: string, instance?: string): boolean => {
	const entry = homeServices.widgets?.byKey.get(widgetProviderKey(module, kind));
	return !!entry && (instance === undefined || entry.kind.instances().some((item) => item.id === instance));
};

const memberOf = (module: string, kind: string, instanceId: string): BoardWidgetMember => ({
	memberId: `${module}:${kind}:${instanceId}`,
	provider: module,
	kind,
	instanceId,
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pick = ({ i, x, y, w, h }: GridItem): GridItem => ({ i, x, y, w, h });

/**
 * The board: a grid of fixed-height tiles that can always be moved and resized. 12 columns from 960px, 6 from 600px
 * and one column below; every tile is a whole number of rows tall, so tiles in one row line up at top and bottom
 * and a tile whose content is taller scrolls inside itself.
 *
 * The canvas for the board generation the page is on. A switch bumps the generation: the whole subtree is replaced
 * (every dialog, menu and pending confirmation is closed, not hidden) and the new subtree gets a view of the store
 * whose writers refuse calls from older generations.
 */
export function BoardCanvas(props: {
	store: BoardStore;
	context: NativeSurfaceContext;
	/** Told the layout kind the page is in (the one-column layout is the phone layout). */
	onBreakpoint?: (breakpoint: GridBreakpoint) => void;
}) {
	const generation = useStore(props.store.state, (s) => s.generation);
	return <BoardCanvasView key={generation} {...props} store={props.store.view(generation)} />;
}

function BoardCanvasView({
	store,
	context,
	onBreakpoint,
}: {
	store: BoardStore;
	context: NativeSurfaceContext;
	onBreakpoint?: (breakpoint: GridBreakpoint) => void;
}) {
	const { data, settings, dialog, switching, switchError } = useStore(store.state),
		path = useStore(store.state, (s) => s.path),
		catalog = useCatalogRevision(),
		t = useT(),
		doc = useOwnerDocument(),
		{ ref: gridRef, width } = useGridWidth(),
		[adding, setAdding] = useState(false),
		[failure, setFailure] = useState(''),
		[removing, setRemoving] = useState<BoardTileSource | null>(null),
		[announcement, setAnnouncement] = useState(''),
		/** The one-column order is only a view: dragging there reorders it for this page without writing the board. */
		[stackOrder, setStackOrder] = useState<string[] | undefined>();
	const breakpoint = breakpointOf(width);
	const narrow = breakpoint === 'sm';
	const mobile = Platform.isPhone || narrow;
	const measured = width > 0;
	useEffect(() => {
		if (measured) onBreakpoint?.(breakpoint);
	}, [measured, breakpoint, onBreakpoint]);
	const sources = useMemo(() => boardTileSources(data!, data!.widgets ?? [], { missing: true }), [data]);
	// Geometry follows board edits and provider registration only; timer ticks must not rebuild the layouts.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- `catalog` is the provider registry's change counter
	const specs = useMemo(() => tileSpecs(sources, widgetTileDefaults), [sources, catalog]);
	const layouts = useMemo(() => layoutsFor(data!.grid, specs, stackOrder), [data, specs, stackOrder]);
	const cols = GRID_COLUMNS[breakpoint];
	/** A gesture ended at this width: store it (the one-column order is not stored). */
	const commit = useCallback(
		(at: GridBreakpoint, items: readonly GridItem[]) => {
			// A page that is moving to another board must not write: the engine already points at the target.
			if (store.state.getState().switching) return;
			const next = items.map(pick);
			if (at === 'sm') {
				setStackOrder([...next].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.i));
				return;
			}
			void observeBoardAction(store.sync.setBoardGrid({ [at]: next }));
		},
		[store],
	);
	const announce = (item: GridItem | undefined) => {
		if (item) setAnnouncement(t('renderer.tilePlace', { x: item.x + 1, y: item.y + 1, w: item.w, h: item.h }));
	};
	const place = (id: string, dx: number, dy: number) => {
		if (narrow) {
			const order = layouts.sm.map((item) => item.i);
			const from = order.indexOf(id),
				to = clamp(from + dy, 0, order.length - 1);
			if (from < 0 || to === from) return;
			order.splice(to, 0, ...order.splice(from, 1));
			setStackOrder(order);
			announce(layouts.sm[to]);
			return;
		}
		const items = nudgeItem(layouts[breakpoint], id, dx, dy, cols);
		commit(breakpoint, items);
		announce(items.find((item) => item.i === id));
	};
	const resizeBy = (id: string, dw: number, dh: number) => {
		const current = layouts[breakpoint].find((item) => item.i === id);
		if (!current || narrow) return;
		const items = resizeItem(
			layouts[breakpoint],
			id,
			{ w: current.w + dw, h: current.h + dh },
			specs.find((spec) => spec.id === id),
			cols,
		);
		commit(breakpoint, items);
		announce(items.find((item) => item.i === id));
	};
	/** A size tier is one gesture: the 12-column cells and, once that width has its own layout, the 6-column ones. */
	const setTier = (source: BoardTileSource, tier: HomeWidgetTier) => {
		const kind = kindOfSource(source);
		if (!kind || store.state.getState().switching) return;
		const size = tierSize(kind, tier);
		const spec = specs.find((item) => item.id === source.id);
		void observeBoardAction(
			store.sync.setBoardGrid({
				lg: resizeItem(layouts.lg, source.id, size, spec, GRID_COLUMNS.lg),
				...(data!.grid?.md
					? { md: resizeItem(layouts.md, source.id, { ...size, w: Math.min(size.w, GRID_COLUMNS.md) }, spec, GRID_COLUMNS.md) }
					: {}),
			}),
		);
	};
	// Provider lifetimes started here (create / configure) end with the canvas, the board or the provider.
	const open = useRef(new Map<WidgetLifetime, { module: string; kind: string; instance?: string }>());
	const begin = (module: string, kind: string, instance?: string) => {
		const lifetime = new WidgetLifetime(console.error);
		open.current.set(lifetime, { module, kind, instance });
		return {
			lifetime,
			end: () => {
				open.current.delete(lifetime);
				lifetime.dispose();
			},
		};
	};
	useEffect(() => {
		const lifetimes = open.current;
		return () => {
			for (const lifetime of lifetimes.keys()) lifetime.dispose();
			lifetimes.clear();
		};
	}, [path]);
	// Moving to another board: in-flight provider work belongs to the board being left and must not reach the next one.
	useEffect(() => {
		if (!switching) return;
		for (const lifetime of open.current.keys()) lifetime.dispose();
		open.current.clear();
	}, [switching]);
	useEffect(() => {
		for (const [lifetime, owner] of open.current)
			if (!providerHas(owner.module, owner.kind, owner.instance)) {
				lifetime.dispose();
				open.current.delete(lifetime);
			}
	}, [catalog]);
	const fail = (error: unknown) => setFailure(error instanceof Error ? error.message : String(error));
	const labelOf = (source: BoardTileSource, kind: ReturnType<typeof kindOfSource>): string =>
		source.type === 'section'
			? source.column.name
			: source.type === 'card'
				? source.card.title
				: kind
					? source.type === 'widget' && source.member.label
						? source.member.label
						: t(kind.titleKey)
					: t('renderer.missingTile');
	/** Removes one tile and offers the way back: the page as it was is restored with one write. */
	const remove = (source: BoardTileSource, name: string) => {
		if (store.state.getState().switching) return;
		const before = data!;
		let done: Promise<void>;
		if (source.type === 'widget')
			done = store.sync.setBoardMembers((before.widgets ?? []).filter((m) => m.memberId !== source.member.memberId));
		else if (source.type === 'section')
			done = store.sync.deleteColumn(
				source.column.name,
				before.columns.findIndex((c) => c.id === source.column.id || c.name === source.column.name),
			);
		else if (source.type === 'card') done = store.sync.deleteCard(source.card.id);
		else
			done = store.sync.setBoardGrid({
				lg: layouts.lg.filter((item) => item.i !== source.id),
				...(before.grid?.md ? { md: layouts.md.filter((item) => item.i !== source.id) } : {}),
			});
		void observeBoardAction(done);
		toast(t('canvas.removed', { name }), {
			action: {
				label: t('canvas.undo'),
				onClick: () => {
					if (!store.state.getState().switching) void observeBoardAction(store.sync.replaceData(before));
				},
			},
		});
	};
	const configure = (source: BoardTileSource, kind: ReturnType<typeof kindOfSource>) => {
		if (source.type !== 'widget' || store.state.getState().switching) return;
		if (kind?.configure) {
			const { lifetime, end } = begin(source.member.provider, source.member.kind, source.member.instanceId);
			const ctx = widgetContext(store, source.member, doc, lifetime, fail);
			void kind
				.configure(ctx)
				.catch((error) => !lifetime.signal.aborted && fail(error))
				.finally(end);
		} else store.host.openSettings();
	};
	const entries = useMemo<PanelEntry[]>(() => {
		const placed = new Set((data!.widgets ?? []).map((member) => member.memberId));
		return [...(homeServices.widgets?.byKey.values() ?? [])].map(({ module, kind }) => {
			const instances = kind.section ? [] : kind.instances();
			const multi = !!kind.multiple && !kind.section;
			return {
				module,
				kind,
				title: t(kind.titleKey),
				placed: !kind.section && !multi && placed.has(`${module}:${kind.key}:default`),
				available: multi
					? instances
							.filter((item) => !placed.has(`${module}:${kind.key}:${item.id}`))
							.map((item) => ({ id: item.id, label: item.label ?? '' }))
					: [],
			};
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `catalog` counts registry changes
	}, [data, settings, catalog, t]);
	const add = async (request: AddRequest) => {
		if (store.state.getState().switching) return;
		const size = tierSize(request.kind, request.tier);
		setAdding(false);
		store.setDialog(null);
		if (request.kind.section) {
			await observeBoardAction(
				store.sync.addToCanvas(
					{ section: { name: t(request.kind.titleKey), type: request.kind.section } },
					size,
				),
			);
			return;
		}
		let instanceId = request.instanceId ?? 'default';
		if (request.create && request.kind.create) {
			const { lifetime, end } = begin(request.module, request.kind.key);
			try {
				const created = await request.kind.create(
					widgetContext(
						store,
						{ memberId: memberOf(request.module, request.kind.key, 'new').memberId, instanceId: 'new' },
						doc,
						lifetime,
						fail,
					),
				);
				// The board or provider may be gone by now: a late result must not land on another board.
				if (!created || lifetime.signal.aborted) return;
				instanceId = created.id;
			} catch (error) {
				if (!lifetime.signal.aborted) fail(error);
				return;
			} finally {
				end();
			}
		}
		const member = memberOf(request.module, request.kind.key, instanceId);
		if (request.module === 'home' && request.kind.key === 'weather') member.weather = legacyWeatherLocation(store.state.getState().settings);
		await observeBoardAction(store.sync.addToCanvas({ member }, size));
	};
	return (
		<div className="dashboard-canvas relative isolate flex min-h-0 flex-1 flex-col">
			<div
				inert={switching || undefined}
				aria-busy={switching || undefined}
				className="dashboard-scroll-region flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 max-[960px]:px-3"
			>
				<div
					data-narrow={narrow || undefined}
					className="dashboard-canvas-bar grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3 data-[narrow]:grid-cols-[minmax(0,1fr)_auto]"
				>
					<WorkspaceSwitcher store={store} />
					<div className="flex min-w-0 justify-center data-[narrow]:order-last data-[narrow]:col-span-2" data-narrow={narrow || undefined}>
						<BoardTitle store={store} />
					</div>
					<div className="ml-auto flex items-center gap-1">
						<Button size="sm" variant="outline" onClick={() => setAdding(true)}>
							<Plus />
							{t('canvas.addWidget')}
						</Button>
						{/* A board has no side panel. Only the narrow layout needs this: it is the way to the navigation drawer. */}
						{narrow && context.togglePanel && (
							<IconButton label={t('home.dashboard.togglePanel')} onClick={() => context.togglePanel?.()}>
								<PanelLeft />
							</IconButton>
						)}
						<IconButton
							label={t('home.dashboard.pageMenu')}
							onClick={(e) => context.openPageMenu?.(e.nativeEvent)}
						>
							<Ellipsis />
						</IconButton>
					</div>
				</div>
				<div className="huhu-widget-board" data-breakpoint={breakpoint}>
					<div className="sr-only" role="status" aria-live="polite">
						{announcement}
					</div>
					<div ref={gridRef} className="huhu-widget-grid">
						{width > 0 && (
							<Responsive
								width={width}
								breakpoint={breakpoint}
								breakpoints={GRID_BREAKPOINTS}
								cols={GRID_COLUMNS}
								layouts={layouts}
								rowHeight={GRID_ROW_HEIGHT}
								margin={GRID_MARGIN}
								containerPadding={[0, 0]}
								dragConfig={{ enabled: !switching, handle: DRAG_HANDLE, cancel: DRAG_CANCEL }}
								resizeConfig={{ enabled: !switching && !narrow, handles: ['se'] }}
								onDragStop={(layout) => commit(breakpoint, layout)}
								onResizeStop={(layout) => commit(breakpoint, layout)}
							>
								{sources.map((source) => {
									const kind = kindOfSource(source),
										tile = layouts.lg.find((item) => item.i === source.id),
										label = labelOf(source, kind);
									const current = kind && tile ? exactTier(kind, { w: tile.w, h: tile.h }) : undefined;
									return (
										<article
											key={source.id}
											data-widget-key={sourceWidgetKey(source)}
											data-tile={source.id}
											className="huhu-widget-tile dashboard-widget-card flex min-h-0 min-w-0 flex-col"
										>
											<TileFrame
												store={store}
												source={source}
												kind={kind}
												label={label}
												current={current}
												mobile={mobile}
												narrow={narrow}
												catalog={catalog}
												canConfigure={
													source.type === 'widget' &&
													(!!kind?.configure || source.member.provider === 'home')
												}
												onTier={(tier) => setTier(source, tier)}
												onConfigure={() => configure(source, kind)}
												onRemove={() =>
													source.type === 'section' || source.type === 'card'
														? setRemoving(source)
														: remove(source, label)
												}
												onMove={(dx, dy) => place(source.id, dx, dy)}
												onResize={(dw, dh) => resizeBy(source.id, dw, dh)}
											/>
										</article>
									);
								})}
							</Responsive>
						)}
					</div>
					{sources.length === 0 && (
						<p className="p-6 text-center text-sm text-[var(--db-text-muted)]">{t('canvas.noWidgets')}</p>
					)}
				</div>
			</div>
			{switching && (
				<div
					role={switchError ? 'alert' : 'status'}
					className="absolute inset-0 z-[var(--layer-content)] flex items-center justify-center bg-[color-mix(in_srgb,var(--db-bg)_70%,transparent)] p-6 text-center text-sm"
				>
					{switchError ? t('canvas.switchBroken', { detail: switchError }) : t('canvas.switching')}
				</div>
			)}
			{!switching && switchError && (
				<p
					role="alert"
					className="absolute bottom-3 left-1/2 m-0 -translate-x-1/2 rounded-md border border-[var(--db-border-card)] bg-[var(--db-bg-modal)] px-3 py-2 text-xs text-[var(--db-danger)]"
				>
					{t('canvas.switchFailed', { detail: switchError })}
				</p>
			)}
			{failure && (
				<p
					role="alert"
					className="absolute bottom-3 left-1/2 m-0 -translate-x-1/2 rounded-md border border-[var(--db-border-card)] bg-[var(--db-bg-modal)] px-3 py-2 text-xs text-[var(--db-danger)]"
				>
					{t('home.widget.failed', { detail: failure })}
				</p>
			)}
			{!switching && (adding || dialog === 'section') && (
				<AddWidgetPanel
					entries={entries}
					onAdd={(request) => void add(request)}
					onClose={() => {
						setAdding(false);
						store.setDialog(null);
					}}
				/>
			)}
			{!switching && removing && (
				<DashboardDialog
					title={t('home.widget.remove')}
					danger
					confirmLabel={t('common.delete')}
					onClose={() => setRemoving(null)}
					onSave={() => {
						remove(removing, labelOf(removing, kindOfSource(removing)));
						setRemoving(null);
					}}
				>
					<p>
						{t('canvas.removeConfirm', {
							name:
								removing.type === 'section'
									? removing.column.name
									: removing.type === 'card'
										? removing.card.title
										: '',
						})}
					</p>
				</DashboardDialog>
			)}
		</div>
	);
}

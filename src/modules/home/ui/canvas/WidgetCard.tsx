// Card structure after the shadcn/ui dashboard blocks and Card examples (MIT): a 40px title bar over a padded body.
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Ellipsis,
	GripHorizontal,
	Pencil,
	Settings2,
	Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '../../../../ui/components/button';
import { Card } from '../../../../ui/components/card';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { Input } from '../../../../ui/components/input';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { HomeWidgetTier } from '../../core/board/widget-tiers';
import { WidgetFrameContext, type RegisteredMenu, type WidgetFrameValue } from './widget-frame';

/**
 * `default`: the title bar takes its own row. `minimal`: for views that read as a picture (clock, album) the bar
 * lies over the content, shows on hover or focus and is still the handle.
 */
export type WidgetChrome = 'default' | 'minimal';

/** The decor a view may ask of its card: an image behind it and the colors that go with it. */
export interface WidgetCardBackground {
	className: string;
	style: CSSProperties;
	layer: ReactNode;
}

export interface WidgetMenuProps {
	tiers: readonly HomeWidgetTier[];
	current?: HomeWidgetTier;
	canConfigure: boolean;
	/** The one-column layout has no left/right and no resizing. */
	narrow: boolean;
	onTier(this: void, tier: HomeWidgetTier): void;
	onConfigure(this: void): void;
	onRemove(this: void): void;
	/** Whole cells; the keyboard and menu equivalent of a drag. */
	onMove(this: void, dx: number, dy: number): void;
	onResize(this: void, dw: number, dh: number): void;
}

export interface WidgetCardProps extends WidgetMenuProps {
	title: string;
	icon?: string;
	chrome?: WidgetChrome;
	/** The body reaches the card's edges (charts, pictures); the view lays out its own padding. */
	bleed?: boolean;
	background?: WidgetCardBackground;
	/** Makes the title editable in place (double-click, or Rename in the menu); rejecting keeps the editor open. */
	onRename?(this: void, title: string): Promise<void>;
	className?: string;
	children: ReactNode;
}

const ARROWS: Record<string, readonly [number, number]> = {
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1],
	ArrowDown: [0, 1],
};

/**
 * The one frame of every tile on the board: a title bar (icon, title, the view's own buttons, ⋯ menu) that is also the
 * tile's only drag handle, and a body that scrolls when its view is taller than the cell. The body is a size
 * container, so views adapt to the room they were given with container queries instead of measuring themselves.
 */
export function WidgetCard(props: WidgetCardProps) {
	const { title, icon, chrome = 'default', bleed = false, background, onRename, className, children, ...menu } = props;
	const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null),
		[menus, setMenus] = useState<ReadonlyMap<object, RegisteredMenu>>(new Map()),
		minimal = chrome === 'minimal';
	const registerMenu = useCallback((owner: object, entry: RegisteredMenu) => {
		setMenus((previous) => {
			if (previous.get(owner)?.signature === entry.signature) {
				previous.get(owner)!.read = entry.read;
				return previous;
			}
			return new Map(previous).set(owner, entry);
		});
	}, []);
	const unregisterMenu = useCallback((owner: object) => {
		setMenus((previous) => {
			if (!previous.has(owner)) return previous;
			const next = new Map(previous);
			next.delete(owner);
			return next;
		});
	}, []);
	const frame = useMemo<WidgetFrameValue>(
		() => ({ actionsHost, registerMenu, unregisterMenu }),
		[actionsHost, registerMenu, unregisterMenu],
	);
	return (
		<WidgetFrameContext value={frame}>
			<Card
				data-widget-chrome={chrome}
				className={cn(
					'dashboard-sidebar-widget huhu-widget-card group/tile relative isolate h-full min-h-0 min-w-0 gap-0 overflow-hidden rounded-xl border-border py-0 shadow-xs transition-shadow hover:shadow-sm',
					background?.className,
					className,
				)}
				style={background?.style}
			>
				{background?.layer}
				<TitleBar
					title={title}
					icon={icon}
					minimal={minimal}
					menus={menus}
					setActionsHost={setActionsHost}
					onRename={onRename}
					{...menu}
				/>
				<div
					data-slot="widget-body"
					className={cn(
						'huhu-widget-body min-h-0 flex-1 [container-type:size] overflow-auto',
						bleed ? 'overflow-hidden' : 'px-3 pb-3',
						minimal && !bleed && 'pt-3',
					)}
				>
					<div className="huhu-widget-content h-full min-h-0">{children}</div>
				</div>
			</Card>
		</WidgetFrameContext>
	);
}

function TitleBar({
	title,
	icon,
	minimal,
	menus,
	setActionsHost,
	onRename,
	...menu
}: WidgetMenuProps & {
	title: string;
	icon?: string;
	minimal: boolean;
	menus: ReadonlyMap<object, RegisteredMenu>;
	setActionsHost(this: void, host: HTMLElement | null): void;
	onRename?(this: void, title: string): Promise<void>;
}) {
	const t = useT(),
		[renaming, setRenaming] = useState(false);
	const keyboard = (event: KeyboardEvent<HTMLElement>) => {
		const delta = ARROWS[event.key];
		if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.shiftKey) menu.onResize(delta[0], delta[1]);
		else menu.onMove(delta[0], delta[1]);
	};
	return (
		<header
			data-slot="widget-header"
			className={cn(
				'huhu-widget-handle group/handle flex h-10 shrink-0 cursor-grab items-center gap-2 px-3 active:cursor-grabbing',
				minimal &&
					'absolute inset-x-0 top-0 z-[var(--layer-content)] bg-linear-to-b from-card/90 to-transparent opacity-0 transition-opacity focus-within:opacity-100 group-hover/tile:opacity-100 pointer-coarse:opacity-100',
			)}
		>
			<span
				role="button"
				tabIndex={0}
				aria-label={t('renderer.moveTile', { name: title })}
				aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
				data-grid-action="move"
				data-hit-control
				className="absolute top-0 left-1/2 inline-flex h-3 -translate-x-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity outline-none group-hover/handle:opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:opacity-50"
				onKeyDown={keyboard}
			>
				<GripHorizontal className="size-4" />
			</span>
			{icon && <ObsidianIcon name={icon} className="size-4 text-muted-foreground" />}
			{renaming && onRename ? (
				<TitleField value={title} onRename={onRename} onDone={() => setRenaming(false)} />
			) : (
				<h3
					data-slot="widget-title"
					className="m-0 min-w-0 flex-1 truncate text-sm font-medium"
					title={title}
					onDoubleClick={onRename ? () => setRenaming(true) : undefined}
				>
					{title}
				</h3>
			)}
			<div className="flex shrink-0 items-center gap-0.5">
				<div ref={setActionsHost} data-slot="widget-actions" className="flex items-center gap-0.5" />
				<TileMenu
					title={title}
					menus={menus}
					onRename={onRename ? () => setRenaming(true) : undefined}
					{...menu}
				/>
			</div>
		</header>
	);
}

/** The title as a field: Enter saves, Escape or a rejected save keeps the old name. */
function TitleField({
	value,
	onRename,
	onDone,
}: {
	value: string;
	onRename(this: void, title: string): Promise<void>;
	onDone(this: void): void;
}) {
	const t = useT(),
		[draft, setDraft] = useState(value),
		[error, setError] = useState(''),
		cancelled = useRef(false),
		pending = useRef(false);
	const commit = async () => {
		if (cancelled.current || pending.current) return;
		const next = draft.trim();
		if (!next || next === value) return onDone();
		pending.current = true;
		try {
			await onRename(next);
			onDone();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			pending.current = false;
		}
	};
	return (
		<div className="min-w-0 flex-1">
			<Input
				autoFocus
				aria-label={t('ui.rename')}
				aria-invalid={!!error}
				title={error || undefined}
				value={draft}
				className="h-7 px-2 text-sm"
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => void commit()}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (event.key === 'Escape') {
						cancelled.current = true;
						onDone();
					}
					if (event.key === 'Enter') {
						event.preventDefault();
						void commit();
					}
				}}
			/>
		</div>
	);
}

function TileMenu({
	title,
	menus,
	onRename,
	tiers,
	current,
	canConfigure,
	narrow,
	onTier,
	onConfigure,
	onRemove,
	onMove,
}: WidgetMenuProps & {
	title: string;
	menus: ReadonlyMap<object, RegisteredMenu>;
	onRename?: () => void;
}) {
	const t = useT(),
		renamed = useRef(false);
	const own = [...menus.values()].flatMap((menu) => menu.read());
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label={t('canvas.moreActions', { name: title })}
					className="text-muted-foreground opacity-70 group-hover/handle:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
				>
					<Ellipsis />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				// The menu would hand focus back to its button and blur the title field the entry just opened.
				onCloseAutoFocus={(event) => {
					if (!renamed.current) return;
					event.preventDefault();
					renamed.current = false;
				}}
			>
				{(own.length > 0 || onRename) && (
					<>
						{onRename && (
							<DropdownMenuItem
								onSelect={() => {
									renamed.current = true;
									onRename();
								}}
							>
								<Pencil />
								{t('ui.rename')}
							</DropdownMenuItem>
						)}
						{own.map((entry) => (
							<DropdownMenuItem
								key={entry.id}
								disabled={entry.disabled}
								variant={entry.destructive ? 'destructive' : 'default'}
								onSelect={entry.onSelect}
							>
								{entry.icon}
								{entry.label}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
					</>
				)}
				{tiers.length > 0 && (
					<>
						<DropdownMenuLabel>{t('canvas.size')}</DropdownMenuLabel>
						{tiers.map((tier) => (
							<DropdownMenuCheckboxItem
								key={tier}
								checked={current === tier}
								aria-label={t('canvas.setSize', { name: title, size: t(`canvas.size.${tier}`) })}
								onSelect={() => onTier(tier)}
							>
								{tier} · {t(`canvas.size.${tier}`)}
							</DropdownMenuCheckboxItem>
						))}
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem onSelect={() => onMove(0, -1)}>
					<ArrowUp />
					{t('canvas.moveUp')}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onMove(0, 1)}>
					<ArrowDown />
					{t('canvas.moveDown')}
				</DropdownMenuItem>
				{!narrow && (
					<>
						<DropdownMenuItem onSelect={() => onMove(-1, 0)}>
							<ArrowLeft />
							{t('canvas.moveLeft')}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => onMove(1, 0)}>
							<ArrowRight />
							{t('canvas.moveRight')}
						</DropdownMenuItem>
					</>
				)}
				<DropdownMenuSeparator />
				{canConfigure && (
					<DropdownMenuItem onSelect={onConfigure}>
						<Settings2 />
						{t('canvas.settings', { name: title })}
					</DropdownMenuItem>
				)}
				<DropdownMenuItem variant="destructive" onSelect={onRemove}>
					<Trash2 />
					{t('home.widget.removeNamed', { name: title })}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

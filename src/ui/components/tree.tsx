// Row layout after the shadcn community tree pattern (MIT): chevron, indent guides, icon slot, truncated label, badge.
// Keyboard model, focus management and ARIA tree roles come from Headless Tree (@headless-tree/core + react, MIT),
// Copyright (c) Lukas Bach; long lists are windowed with @tanstack/react-virtual (MIT).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { hotkeysCoreFeature, selectionFeature, syncDataLoaderFeature, type ItemInstance } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { ObsidianIcon } from './huhu/ObsidianIcon';

/** One row of the tree. A node with `children` (even an empty array) is a folder. */
export interface TreeNode {
	id: string;
	label: string;
	/** Obsidian icon id (`lucide-file-text`). Folders and files without one get a plain folder or file icon. */
	icon?: string;
	/** Icon used instead of `icon` while a folder is open. */
	iconOpen?: string;
	/** CSS color for the icon, such as a theme variable (`var(--color-red)`). */
	iconColor?: string;
	/** Round monogram shown instead of an icon (a person's initial). */
	avatar?: string;
	/** Right-aligned count, short text or small element (a colored status letter). */
	badge?: ReactNode;
	/** Muted text after the label (the folder of a file in a flat list). */
	description?: string;
	/** Row buttons shown while the row is hovered or has focus inside; clicks on them do not select the row. */
	actions?: ReactNode;
	/** Native tooltip; defaults to the label. */
	title?: string;
	children?: readonly TreeNode[];
}

export interface TreeProps {
	nodes: readonly TreeNode[];
	/** Accessible name of the tree. */
	ariaLabel: string;
	/** Highlighted row. Controlled: the parent decides what is selected. */
	selectedId?: string | null;
	/** Controlled expanded folder ids. Leave undefined to let the tree manage them. */
	expandedIds?: readonly string[];
	/** Folders expanded on first render when `expandedIds` is not given. */
	defaultExpandedIds?: readonly string[];
	onExpandedChange?: (ids: string[]) => void;
	/** Click or Enter on a row. */
	onSelect?: (id: string, node: TreeNode) => void;
	/** Enter or double click on a row. */
	onActivate?: (id: string, node: TreeNode) => void;
	/** Case-insensitive label filter. Matching rows stay with their ancestors, which open automatically. */
	search?: string;
	/** With a `search`, these ids are the matches instead of the label test (a search that also looked inside files). */
	matchIds?: ReadonlySet<string>;
	/** What a click on a folder row does: flip it (default), or only open it. */
	folderClick?: 'toggle' | 'expand';
	/** Text shown when there are no rows. */
	emptyText?: ReactNode;
	/** Windowing starts above this many visible rows. */
	virtualizeAfter?: number;
	className?: string;
}

const ROOT_ID = '\u0000tree-root';
const INDENT = 14;
const ROW_HEIGHT = 28;
const EMPTY: readonly string[] = [];

interface TreeModel {
	byId: Map<string, TreeNode>;
	children: Map<string, string[]>;
	parent: Map<string, string>;
	/** Folders that must be open to show every match. Empty without a search. */
	matchedAncestors: string[];
}

const ROOT_NODE: TreeNode = { id: ROOT_ID, label: '', children: [] };

/** Flatten the nodes into lookup tables, keeping only matches and their ancestors while searching. */
function buildModel(nodes: readonly TreeNode[], search: string, matchIds?: ReadonlySet<string>): TreeModel {
	const needle = search.trim().toLocaleLowerCase();
	const model: TreeModel = { byId: new Map([[ROOT_ID, ROOT_NODE]]), children: new Map(), parent: new Map(), matchedAncestors: [] };
	const ancestors = new Set<string>();
	/** Adds a node when it, a descendant or an ancestor matches. `all` means an ancestor matched, so the whole subtree stays. */
	const add = (node: TreeNode, parentId: string, all: boolean): boolean => {
		const own = !needle || (matchIds ? matchIds.has(node.id) : node.label.toLocaleLowerCase().includes(needle));
		const keepAll = all || own;
		const childIds: string[] = [];
		for (const child of node.children ?? []) if (add(child, node.id, keepAll)) childIds.push(child.id);
		if (!keepAll && !childIds.length) return false;
		model.byId.set(node.id, node);
		model.parent.set(node.id, parentId);
		if (node.children) model.children.set(node.id, childIds);
		// Folders on the way to a match (and a matching folder itself) open; the subtree of a match stays as the user had it.
		if (needle && !all && childIds.length) ancestors.add(node.id);
		return true;
	};
	const top: string[] = [];
	for (const node of nodes) if (add(node, ROOT_ID, false)) top.push(node.id);
	model.children.set(ROOT_ID, top);
	model.matchedAncestors = [...ancestors];
	return model;
}

function ancestorsOf(model: TreeModel, id: string): string[] {
	const result: string[] = [];
	for (let parent = model.parent.get(id); parent && parent !== ROOT_ID; parent = model.parent.get(parent)) result.push(parent);
	return result;
}

const sameSet = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((id, index) => id === right[index]);

export function Tree({
	nodes,
	ariaLabel,
	selectedId,
	expandedIds,
	defaultExpandedIds,
	onExpandedChange,
	onSelect,
	onActivate,
	search = '',
	matchIds,
	folderClick = 'toggle',
	emptyText,
	virtualizeAfter = 200,
	className,
}: TreeProps) {
	const model = useMemo(() => buildModel(nodes, search, matchIds), [nodes, search, matchIds]);
	const [innerExpanded, setInnerExpanded] = useState<string[]>(() => [...(defaultExpandedIds ?? EMPTY)]);
	// Headless Tree rebuilds whenever the expanded array changes identity, so a controlled array is stabilized by content.
	const controlledKey = expandedIds ? expandedIds.join('\u0001') : undefined;
	const controlled = useMemo(() => (expandedIds ? [...expandedIds] : undefined), [controlledKey]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed by content
	const expanded = controlled ?? innerExpanded;
	const expandedRef = useRef(expanded);
	expandedRef.current = expanded;
	const changeExpanded = useCallback(
		(next: string[]) => {
			if (!controlled) setInnerExpanded(next);
			onExpandedChange?.(next);
		},
		[controlled, onExpandedChange],
	);
	const [focused, setFocused] = useState<string | null>(null);
	const selectedItems = useMemo(() => (selectedId ? [selectedId] : []), [selectedId]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
	const focusedRef = useRef(focused);
	focusedRef.current = focused;

	const tree = useTree<TreeNode>({
		rootItemId: ROOT_ID,
		features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
		dataLoader: {
			getItem: (id) => model.byId.get(id) ?? ROOT_NODE,
			getChildren: (id) => model.children.get(id) ?? [],
		},
		getItemName: (item) => item.getItemData().label,
		isItemFolder: (item) => !!item.getItemData().children,
		state: { expandedItems: expanded, focusedItem: focused, selectedItems },
		setExpandedItems: (value) => changeExpanded(typeof value === 'function' ? value(expandedRef.current) : value),
		setFocusedItem: (value) => setFocused(typeof value === 'function' ? value(focusedRef.current) : value),
		// Selection is controlled by `selectedId`; clicks and Enter report it through `onSelect`.
		setSelectedItems: () => {},
		scrollToItem: (item) => virtualizerRef.current?.scrollToIndex(item.getItemMeta().index, { align: 'auto' }),
	});

	// New data (or a new filter) rebuilds the flat list before the browser paints.
	useLayoutEffect(() => {
		tree.rebuildTree();
		if (focusedRef.current && !model.byId.has(focusedRef.current)) setFocused(null);
	}, [tree, model]);

	// While searching, open the folders that lead to a match. User toggles made afterwards stick until the search changes.
	useEffect(() => {
		if (!search.trim()) return;
		const current = expandedRef.current;
		const next = [...current, ...model.matchedAncestors.filter((id) => !current.includes(id))];
		if (!sameSet(current, next)) changeExpanded(next);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only the search and its result decide
	}, [model, search]);

	// A row selected from outside is revealed: its ancestors open and it scrolls into view.
	useEffect(() => {
		if (!selectedId || !model.byId.has(selectedId)) return;
		const missing = ancestorsOf(model, selectedId).filter((id) => !expandedRef.current.includes(id));
		if (missing.length) changeExpanded([...expandedRef.current, ...missing]);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- reveal once per selection
	}, [selectedId]);

	const items = tree.getItems();
	const virtual = items.length > virtualizeAfter;
	const virtualizer = useVirtualizer({
		count: virtual ? items.length : 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 12,
		getItemKey: (index) => items[index]?.getId() ?? index,
	});
	virtualizerRef.current = virtualizer;

	useEffect(() => {
		if (!selectedId) return;
		const index = items.findIndex((item) => item.getId() === selectedId);
		if (index < 0) return;
		if (virtual) virtualizer.scrollToIndex(index, { align: 'auto' });
		else {
			const element = items[index]?.getElement();
			if (element && typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'nearest' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- follow the selection, not every re-render
	}, [selectedId, items.length, virtual]);

	const typeahead = useRef({ text: '', at: 0 });
	const choose = (item: ItemInstance<TreeNode>, activate: boolean) => {
		const node = item.getItemData();
		item.setFocused();
		onSelect?.(node.id, node);
		if (item.isFolder()) {
			if (item.isExpanded() && folderClick === 'toggle') item.collapse();
			else if (!item.isExpanded()) item.expand();
		}
		if (activate) onActivate?.(node.id, node);
	};
	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const id = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-id]')?.dataset.treeId;
		if (id === undefined) return;
		const item = tree.getItemInstance(id);
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			choose(item, true);
			return;
		}
		// Typeahead: letters typed in quick succession jump to the next row whose label starts with them.
		if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
		const now = event.timeStamp;
		const state = typeahead.current;
		state.text = now - state.at > 700 ? event.key : state.text + event.key;
		state.at = now;
		const needle = state.text.toLocaleLowerCase();
		const list = tree.getItems();
		const start = list.findIndex((candidate) => candidate.getId() === item.getId());
		// A single repeated letter cycles; a longer prefix may match the current row.
		const offset = state.text.length === 1 ? 1 : 0;
		for (let step = 0; step < list.length; step++) {
			const candidate = list[(start + offset + step) % list.length];
			if (candidate?.getItemName().toLocaleLowerCase().startsWith(needle)) {
				candidate.setFocused();
				tree.updateDomFocus();
				break;
			}
		}
	};
	// Headless Tree listens for key releases on the main window's document; forward them from the tree's own window.
	const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
		tree.getDataRef<{ keyupHandler?: (event: KeyboardEvent<HTMLElement>['nativeEvent']) => void }>().current.keyupHandler?.(event.nativeEvent);
	};

	if (!items.length) {
		// Items arrive one layout pass after the data; only a model without rows is really empty.
		if (model.children.get(ROOT_ID)?.length) return null;
		return emptyText ? (
			<p role="status" className={cn('px-3 py-2 text-xs text-muted-foreground', className)}>
				{emptyText}
			</p>
		) : null;
	}

	const renderRow = (item: ItemInstance<TreeNode>, position?: { start: number }) => {
		const node = item.getItemData();
		const meta = item.getItemMeta();
		const folder = item.isFolder();
		const open = folder && item.isExpanded();
		const selected = !!selectedId && node.id === selectedId;
		const props = rowProps(item);
		return (
			<div
				{...props}
				key={item.getId()}
				data-slot="tree-item"
				data-tree-id={node.id}
				aria-selected={selected}
				title={node.title ?? node.label}
				className={cn(
					'group flex h-7 w-full cursor-pointer select-none items-center gap-1.5 rounded-md pr-2 text-[13px] outline-none',
					'hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
					selected && 'bg-accent text-accent-foreground hover:bg-accent',
					position && 'absolute top-0 left-0',
					!position && 'relative',
				)}
				style={{
					paddingLeft: 4 + meta.level * INDENT,
					...(position ? { transform: `translateY(${position.start}px)` } : null),
				}}
				onClick={(event) => {
					if (event.detail > 1) return;
					choose(item, false);
				}}
				onDoubleClick={() => onActivate?.(node.id, node)}
			>
				{Array.from({ length: meta.level }, (_, index) => (
					<span
						key={index}
						aria-hidden
						className="pointer-events-none absolute inset-y-0 w-px bg-border/60"
						style={{ left: 4 + index * INDENT + 8 }}
					/>
				))}
				<span
					aria-hidden
					className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
					onClick={
						folder
							? (event) => {
									event.stopPropagation();
									item.setFocused();
									if (item.isExpanded()) item.collapse();
									else item.expand();
								}
							: undefined
					}
				>
					{folder && (
						<ChevronRight
							className={cn('size-3.5 transition-transform motion-reduce:transition-none', open && 'rotate-90')}
						/>
					)}
				</span>
				<TreeIcon node={node} folder={folder} open={open} />
				<span className="min-w-0 truncate text-left">{node.label}</span>
				{node.description ? (
					<span className="min-w-0 flex-1 truncate text-left text-2xs text-muted-foreground">{node.description}</span>
				) : (
					<span className="flex-1" />
				)}
				{node.actions && (
					<span
						data-slot="tree-actions"
						className="hidden shrink-0 items-center group-hover:flex group-focus-within:flex"
						onClick={(event) => event.stopPropagation()}
						onDoubleClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					>
						{node.actions}
					</span>
				)}
				{node.badge !== undefined && node.badge !== '' && node.badge !== null && (
					<span className="shrink-0 text-2xs tabular-nums text-muted-foreground">{node.badge}</span>
				)}
			</div>
		);
	};

	const container = tree.getContainerProps(ariaLabel);
	return (
		<div ref={scrollRef} className={cn('h-full min-h-0 overflow-y-auto scrollbar-sleek', className)}>
			<div
				{...container}
				data-slot="tree"
				className="relative p-1 outline-none"
				style={virtual ? { height: virtualizer.getTotalSize() + 8 } : undefined}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
			>
				{virtual
					? virtualizer.getVirtualItems().map((row) => {
							const item = items[row.index];
							return item ? renderRow(item, { start: row.start + 4 }) : null;
						})
					: items.map((item) => renderRow(item))}
			</div>
		</div>
	);
}

/** Headless Tree's row props without its own click handling (selection is reported through `onSelect`). */
function rowProps(item: ItemInstance<TreeNode>): Record<string, unknown> {
	const props: Record<string, unknown> = { ...item.getProps() };
	delete props.onClick;
	return props;
}

function TreeIcon({ node, folder, open }: { node: TreeNode; folder: boolean; open: boolean }) {
	const style = node.iconColor ? { color: node.iconColor } : undefined;
	const tone = node.iconColor ? undefined : 'text-muted-foreground';
	if (node.avatar !== undefined) {
		return (
			<span
				aria-hidden
				className="flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-medium leading-none text-secondary-foreground"
				style={style}
			>
				{node.avatar}
			</span>
		);
	}
	const icon = (open && node.iconOpen) || node.icon;
	if (icon) {
		return (
			<span aria-hidden className={cn('inline-flex size-4 shrink-0', tone)} style={style}>
				<ObsidianIcon name={icon} className="size-4" />
			</span>
		);
	}
	const Fallback = folder ? (open ? FolderOpen : Folder) : File;
	return <Fallback aria-hidden className={cn('size-4 shrink-0', tone)} style={style} />;
}

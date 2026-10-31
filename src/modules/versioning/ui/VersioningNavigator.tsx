import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, List, ListTree } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { cn } from '../../../ui/lib/utils';
import { useOwnerDocument } from '../../../ui/react/contexts';

interface ChoiceListProps<T> {
	items: readonly T[];
	itemKey: (item: T) => string;
	selected: string | null;
	onSelect: (item: T) => void;
	renderItem: (item: T) => ReactNode;
	itemLabel: (item: T) => string;
	actions?: (item: T) => ReactNode;
	expanded?: (item: T) => boolean | undefined;
	label: string;
	/** Taller fixed rows, such as a two-line note revision; never smaller than the input target. */
	rowHeight?: number;
}

/** Fixed-height, single-choice navigation. Diff content never participates in these row heights. */
export function ChoiceList<T>({
	items,
	itemKey,
	selected,
	onSelect,
	renderItem,
	itemLabel,
	actions,
	expanded,
	label,
	rowHeight,
}: ChoiceListProps<T>) {
	const ownerDocument = useOwnerDocument();
	const viewport = useRef<HTMLDivElement>(null);
	const focusFrame = useRef(0);
	const [dimensions, setDimensions] = useState({ top: 0, height: 512, row: Math.max(rowHeight ?? 32, 32) });
	const virtual = items.length > 150;
	const start = virtual
		? Math.max(0, Math.min(items.length - 1, Math.floor(dimensions.top / dimensions.row) - 8))
		: 0;
	const end = virtual
		? Math.min(items.length, start + Math.ceil(dimensions.height / dimensions.row) + 16)
		: items.length;
	useEffect(() => {
		const element = viewport.current;
		const ownerWindow = ownerDocument.defaultView;
		if (!element || !ownerWindow) return;
		const media = ownerWindow.matchMedia('(pointer: coarse)');
		const measure = () =>
			setDimensions((value) => ({
				...value,
				height: element.clientHeight || 512,
				row: Math.max(rowHeight ?? 32, media.matches ? 44 : 32),
			}));
		const observer = new ownerWindow.ResizeObserver(measure);
		observer.observe(element);
		media.addEventListener('change', measure);
		const frame = ownerWindow.requestAnimationFrame(measure);
		return () => {
			observer.disconnect();
			media.removeEventListener('change', measure);
			ownerWindow.cancelAnimationFrame(frame);
			if (focusFrame.current) ownerWindow.cancelAnimationFrame(focusFrame.current);
		};
	}, [ownerDocument, rowHeight]);
	const focusIndex = (index: number) => {
		const item = items[index];
		const element = viewport.current;
		if (!item || !element) return;
		onSelect(item);
		const top = index * dimensions.row;
		if (top < element.scrollTop) element.scrollTop = top;
		else if (top + dimensions.row > element.scrollTop + element.clientHeight)
			element.scrollTop = top + dimensions.row - element.clientHeight;
		setDimensions((value) => ({ ...value, top: element.scrollTop }));
		const ownerWindow = ownerDocument.defaultView;
		if (ownerWindow) {
			if (focusFrame.current) ownerWindow.cancelAnimationFrame(focusFrame.current);
			focusFrame.current = ownerWindow.requestAnimationFrame(() => {
				focusFrame.current = 0;
				element.querySelector<HTMLButtonElement>(`[data-choice-index="${index}"]`)?.focus();
			});
		}
	};
	return (
		<div
			ref={viewport}
			className="min-h-0 flex-1 overflow-auto scrollbar-sleek"
			onScroll={(event) => {
				const top = event.currentTarget.scrollTop;
				setDimensions((value) => ({ ...value, top }));
			}}
		>
			<ul
				className="relative m-0 list-none p-0"
				aria-label={label}
				style={virtual ? { height: items.length * dimensions.row } : undefined}
			>
				{items.slice(start, end).map((item, offset) => {
					const index = start + offset;
					const key = itemKey(item);
					return (
						<li
							key={key}
							className={cn('group flex min-w-0 items-center', virtual && 'absolute left-0 w-full')}
							style={{ height: dimensions.row, ...(virtual ? { top: index * dimensions.row } : {}) }}
						>
							<button
								type="button"
								data-choice-index={index}
								data-choice-key={key}
								aria-label={itemLabel(item)}
								aria-pressed={expanded?.(item) === undefined ? key === selected : undefined}
								aria-expanded={expanded?.(item)}
								title={itemLabel(item)}
								className={cn(
									'flex h-full min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 text-left text-[13px] outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring pointer-coarse:min-h-11',
									key === selected && 'bg-accent text-accent-foreground',
								)}
								onClick={() => onSelect(item)}
								onKeyDown={(event) => {
									if (event.nativeEvent.isComposing) return;
									const next =
										event.key === 'ArrowDown'
											? Math.min(items.length - 1, index + 1)
											: event.key === 'ArrowUp'
												? Math.max(0, index - 1)
												: event.key === 'Home'
													? 0
													: event.key === 'End'
														? items.length - 1
														: null;
									if (next !== null) {
										event.preventDefault();
										focusIndex(next);
									}
								}}
							>
								{renderItem(item)}
							</button>
							{actions && <span className="flex shrink-0 items-center">{actions(item)}</span>}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export interface NavigationFile {
	key: string;
	path: string;
	from?: string;
	status: string;
}

type FileRow = { kind: 'file'; file: NavigationFile } | { kind: 'folder'; path: string; count: number };

export function FileNavigator({
	files,
	selected,
	onSelect,
	label,
	actions,
}: {
	files: readonly NavigationFile[];
	selected: string | null;
	onSelect: (file: NavigationFile) => void;
	label: string;
	actions?: (file: NavigationFile) => ReactNode;
}) {
	const [tree, setTree] = useState(false);
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const rows: FileRow[] = [];
	if (tree) {
		const groups = new Map<string, NavigationFile[]>();
		for (const file of files) {
			const directory = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
			const group = groups.get(directory) ?? [];
			group.push(file);
			groups.set(directory, group);
		}
		for (const [path, children] of groups) {
			if (path) rows.push({ kind: 'folder', path, count: children.length });
			if (!collapsed.has(path)) for (const file of children) rows.push({ kind: 'file', file });
		}
	} else for (const file of files) rows.push({ kind: 'file', file });
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={label}>
			<div className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border px-3">
				<h3 className="min-w-0 flex-1 truncate text-xs font-medium" title={label}>
					{label} <span className="tabular-nums text-muted-foreground">{files.length}</span>
				</h3>
				<ActionButton
					size="icon-sm"
					label={tree ? t('versioning.files.flat') : t('versioning.files.tree')}
					aria-pressed={tree}
					onClick={() => setTree((value) => !value)}
				>
					{tree ? <List /> : <ListTree />}
				</ActionButton>
			</div>
			{files.length ? (
				<ChoiceList<FileRow>
					items={rows}
					itemKey={(row) => (row.kind === 'file' ? row.file.key : `folder:${row.path}`)}
					selected={selected}
					onSelect={(row) => {
						if (row.kind === 'file') onSelect(row.file);
						else
							setCollapsed((value) => {
								const next = new Set(value);
								if (next.has(row.path)) next.delete(row.path);
								else next.add(row.path);
								return next;
							});
					}}
					label={label}
					itemLabel={(row) =>
						row.kind === 'file'
							? row.file.from
								? `${row.file.from} → ${row.file.path}`
								: row.file.path
							: row.path
					}
					expanded={(row) => (row.kind === 'folder' ? !collapsed.has(row.path) : undefined)}
					actions={actions ? (row) => (row.kind === 'file' ? actions(row.file) : null) : undefined}
					renderItem={(row) =>
						row.kind === 'folder' ? (
							<>
								{collapsed.has(row.path) ? (
									<ChevronRight className="size-3.5 shrink-0" />
								) : (
									<ChevronDown className="size-3.5 shrink-0" />
								)}
								<Folder className="size-3.5 shrink-0 text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate">{row.path}</span>
								<span className="text-xs tabular-nums text-muted-foreground">{row.count}</span>
							</>
						) : (
							<>
								<FileText className={cn('size-3.5 shrink-0 text-muted-foreground', tree && 'ml-5')} />
								<span className="min-w-0 flex-1 truncate">
									{row.file.path.split('/').at(-1)}
									<span className="ml-2 text-xs text-muted-foreground">
										{tree
											? ''
											: row.file.path.slice(0, Math.max(0, row.file.path.lastIndexOf('/')))}
									</span>
								</span>
								<StatusLetter status={row.file.status} />
							</>
						)
					}
				/>
			) : (
				<p className="px-3 py-4 text-xs text-muted-foreground">{t('versioning.files.empty')}</p>
			)}
		</section>
	);
}

export function StatusLetter({ status }: { status: string }) {
	const letter = status[0] ?? 'M';
	const tone =
		letter === 'D'
			? 'text-destructive'
			: letter === 'A' || letter === '?'
				? 'text-status-success'
				: letter === 'R' || letter === 'C'
					? 'text-status-info'
					: letter === 'U'
						? 'text-destructive'
						: 'text-status-warning';
	return (
		<span className={cn('w-4 shrink-0 text-center font-mono text-xs', tone)} title={t(`sync.status.${letter}`)}>
			{letter}
		</span>
	);
}

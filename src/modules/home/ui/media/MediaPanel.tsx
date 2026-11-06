import { useVisible } from '../../../../ui/react/contexts';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import { setVaultPreference } from '../../../../host/obsidian/storage/preferences';
import { type App } from 'obsidian';
import { type ContentFile } from '../../../../host/obsidian/storage/content-files';
import { useMemo, useState, useEffect } from 'react';
import type { DashboardColumn } from '../../core/board/types';
import type { MediaTagService } from '../../platform/media/media-tags';
import { t } from '../../../../shared/i18n';
import { Pagination } from '../sections/P1Controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import {
	ArrowDownWideNarrow,
	ArrowUpWideNarrow,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsDownUp,
	ChevronsUpDown,
	Filter,
	Film,
	Image as ImageIcon,
	LayoutGrid,
	List,
	Maximize2,
	type LucideIcon,
	X,
} from 'lucide-react';
import { Choice, IconButton } from '../board/controls';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { cn } from '../../../../ui/lib/utils';
import { MediaFilter, emptyMediaFilter, normalizeMediaFolder } from './MediaFilter';
import { MediaViews } from './MediaViews';
import { MediaLightbox } from './MediaLightbox';
import {
	PAGE_SIZE_OPTIONS,
	THUMB_SIZE_STORAGE_KEY,
	extsFor,
	groupMediaResults,
	queryMediaFiles,
	readStoredThumbSize,
	sortMedia,
	type MediaGroupMode,
	type MediaViewMode,
	type ThumbSize,
} from './media-model';
import { formatDate, type MediaFileResult } from './media-presentation';
import { MediaTagEditor } from './MediaTagEditor';
import { trashMediaFile } from './media-utils';
import { useFocusReturn } from './use-focus-return';
/** Icon-only menu: the button names the current choice, the menu lists every option. */
function MenuChoice({
	icon: Icon,
	label,
	value,
	options,
	onChange,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	options: readonly { value: string; label: string; icon?: LucideIcon }[];
	onChange: (value: string) => void;
}) {
	const current = options.find((o) => o.value === value);
	const name = current?.label ?? label;
	const Current = current?.icon ?? Icon;
	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button variant="secondary" size="icon-md" aria-label={name}>
							<Current />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>{name}</TooltipContent>
			</Tooltip>
			<DropdownMenuContent>
				{options.map((option) => (
					<DropdownMenuItem key={option.value} onSelect={() => onChange(option.value)}>
						<Check className={cn('size-3.5', option.value !== value && 'invisible')} aria-hidden />
						{option.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
function ToolbarIcon({
	label,
	children,
	...props
}: { label: string } & Omit<React.ComponentProps<typeof Button>, 'children'> & { children: React.ReactNode }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="secondary" size="icon-md" aria-label={label} {...props}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
export function MediaPanel({
	app,
	column,
	openNote,
	tagService,
}: {
	app: App;
	column: DashboardColumn;
	openNote?: (file: ContentFile) => void;
	tagService?: MediaTagService;
}) {
	const [tagFile, setTagFile] = useState<ContentFile | null>(null),
		[lightbox, setLightbox] = useState<number | null>(null),
		[deleting, setDeleting] = useState<ContentFile | null>(null),
		[deleteState, setDeleteState] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });
	const [query, setQuery] = useState(''),
		[sort, setSort] = useState('modified'),
		[desc, setDesc] = useState(true);
	const [groupBy, setGroupBy] = useState<MediaGroupMode>('none'),
		[collapsed, setCollapsed] = useState(new Set<string>());
	const [view, setView] = useState<MediaViewMode>('grid'),
		[size, setSize] = useState(() => readStoredThumbSize(app));
	const [filter, setFilter] = useState(emptyMediaFilter),
		[anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [page, setPage] = useState(1),
		[pageSize, setPageSize] = useState(20),
		[, revise] = useState(0);
	const refresh = () => revise((n) => n + 1);
	const focus = useFocusReturn(),
		visible = useVisible();
	useEffect(() => (visible ? contentFiles(app).subscribe(refresh) : undefined), [app, visible]);
	const kind = column.sectionType === 'videos' ? 'video' : 'image';
	const exts = extsFor(column.sectionType ?? '');
	const all = exts
		? queryMediaFiles(
				app,
				exts,
				column.libraryConfig?.excludeFolders ?? [],
				column.libraryConfig?.includeFolders ?? [],
				tagService,
			)
		: [];
	const results = (() => {
		const q = query.trim().toLowerCase();
		const folders = filter.folders.map(normalizeMediaFolder).filter(Boolean);
		const items = all.filter((r) => {
			if (q && !r.basename.toLowerCase().includes(q) && !r.path.toLowerCase().includes(q)) return false;
			if (filter.tags.length && !r.tags.some((tag) => filter.tags.includes(tag))) return false;
			const date = formatDate(filter.property === 'created' ? r.ctime : r.mtime);
			if ((filter.start && date < filter.start) || (filter.end && date > filter.end)) return false;
			return (
				!folders.length || folders.some((folder) => r.path.toLowerCase().startsWith(folder.toLowerCase() + '/'))
			);
		});
		sortMedia(items, sort, desc);
		return items;
	})();
	const groups = useMemo(() => groupMediaResults(results, groupBy), [results, groupBy]);
	const pages = Math.max(1, Math.ceil(results.length / pageSize)),
		current = Math.min(page, pages),
		start = (current - 1) * pageSize;
	const collapseAll = groups.some((group) => !collapsed.has(group.key));
	const tagHooks = tagService
		? {
				getTags: (file: ContentFile) => tagService.getTags(file.path),
				getAllTags: () => tagService.getAllTags(),
				onTagsChange: (file: ContentFile, tags: string[]) => {
					tagService.setTags(file.path, tags);
					refresh();
				},
			}
		: undefined;
	const closeDelete = () => {
		focus.restore();
		setDeleting(null);
		setDeleteState({ busy: false, error: '' });
	};
	/** Confirmation stays open while the move to trash runs and after it fails, so the user can retry or cancel. */
	const remove = async (file: ContentFile) => {
		setDeleteState({ busy: true, error: '' });
		try {
			await trashMediaFile(app, file);
			closeDelete();
			refresh();
		} catch (error) {
			setDeleteState({
				busy: false,
				error: t('media.deleteFailed', {
					name: file.basename,
					reason: error instanceof Error ? error.message : String(error),
				}),
			});
		}
	};
	const editTags = tagService
		? (result: MediaFileResult) => {
				focus.remember();
				setTagFile(result.file);
			}
		: undefined;
	const closeTags = () => {
		focus.restore();
		setTagFile(null);
	};
	const display = groupBy === 'none' ? results : groups.flatMap((group) => group.items);
	const renderItems = (items: MediaFileResult[], offset: number) => (
		<MediaViews
			app={app}
			results={items}
			kind={kind}
			size={size}
			view={view}
			open={(index) => {
				focus.remember();
				setLightbox(offset + index);
			}}
			remove={(file) => {
				focus.remember();
				setDeleteState({ busy: false, error: '' });
				setDeleting(file);
			}}
			refresh={refresh}
			openNote={openNote}
			editTags={editTags}
		/>
	);
	const hasFilter = !!(filter.start || filter.end || filter.folders.length || filter.tags.length);
	const updateFilter = (value: typeof filter) => {
		setFilter(value);
		setPage(1);
	};
	const chip = 'max-w-40 gap-0.5 pr-0.5';
	const empty = !exts ? (
		<EmptyState size="sm" className="h-full" icon={<ImageIcon />} title={t('media.unsupported')} />
	) : all.length === 0 ? (
		<EmptyState
			size="sm"
			className="h-full"
			icon={kind === 'video' ? <Film /> : <ImageIcon />}
			title={t(kind === 'video' ? 'media.noVideos' : 'media.noImages')}
		/>
	) : (
		<EmptyState
			size="sm"
			className="h-full"
			icon={<Filter />}
			title={t('media.noResults')}
			action={
				<Button
					variant="secondary"
					onClick={() => {
						setQuery('');
						updateFilter(emptyMediaFilter);
					}}
				>
					{t('media.clearFilters')}
				</Button>
			}
		/>
	);
	return (
		<div data-media className="flex h-full min-h-0 flex-col gap-3">
			{tagFile && tagService && (
				<MediaTagEditor
					name={tagFile.basename}
					path={tagFile.path}
					current={tagService.getTags(tagFile.path)}
					known={tagService.getAllTags()}
					onClose={closeTags}
					onSave={(tags) => {
						tagService.setTags(tagFile.path, tags);
						closeTags();
						refresh();
					}}
				/>
			)}
			{lightbox !== null && (
				<MediaLightbox
					app={app}
					files={display.map((r) => r.file)}
					startIndex={lightbox}
					kind={kind}
					tagHooks={tagHooks}
					close={() => {
						focus.restore();
						setLightbox(null);
					}}
				/>
			)}
			{deleting && (
				<DashboardDialog
					title={t('common.confirmDelete')}
					onClose={() => {
						if (!deleteState.busy) closeDelete();
					}}
					onSave={() => void remove(deleting)}
					busy={deleteState.busy}
					danger
					confirmLabel={
						deleteState.busy
							? t('media.deleting')
							: deleteState.error
								? t('media.retry')
								: t('common.delete')
					}
				>
					<p className="m-0 [overflow-wrap:anywhere]">
						{t('media.confirmDelete', { name: deleting.basename })}
					</p>
					{deleteState.busy && (
						<p role="status" className="m-0 text-sm text-muted-foreground">
							{t('media.deleting')}
						</p>
					)}
					{deleteState.error && (
						<p
							role="alert"
							className="m-0 border-l-2 border-destructive pl-2 text-sm text-foreground [overflow-wrap:anywhere]"
						>
							{deleteState.error}
						</p>
					)}
				</DashboardDialog>
			)}
			<div data-toolbar className="flex shrink-0 flex-wrap items-center gap-2">
				<Input
					className="min-w-32 flex-1"
					aria-label={t('library.searchPlaceholder')}
					placeholder={t('library.searchPlaceholder')}
					value={query}
					onChange={(e) => {
						setQuery(e.currentTarget.value);
						setPage(1);
					}}
				/>
				<Choice
					label={t('library.sortName')}
					className="w-32 data-[size=sm]:h-[var(--hu-ctl-h)]"
					value={sort}
					onChange={(value) => {
						setSort(value);
						setPage(1);
					}}
					options={(['modified', 'created', 'name'] as const).map((key) => ({
						value: key,
						label: t(`library.sort${key[0]!.toUpperCase()}${key.slice(1)}`),
					}))}
				/>
				<ToolbarIcon
					label={t('media.sortToggle')}
					aria-pressed={desc}
					onClick={() => {
						setDesc(!desc);
						setPage(1);
					}}
				>
					{desc ? <ArrowDownWideNarrow /> : <ArrowUpWideNarrow />}
				</ToolbarIcon>
				<Choice
					label={t('media.groupBy')}
					className="w-32 data-[size=sm]:h-[var(--hu-ctl-h)]"
					value={groupBy}
					onChange={(value) => {
						setGroupBy(value as MediaGroupMode);
						setPage(1);
					}}
					options={[
						{ value: 'none', label: t('media.groupNone') },
						{ value: 'folder', label: t('media.groupByFolder') },
						{ value: 'tag', label: t('media.groupByTag') },
					]}
				/>
				{groups.length > 0 && (
					<ToolbarIcon
						label={t(collapseAll ? 'library.collapseAllGroups' : 'library.expandAllGroups')}
						onClick={() => setCollapsed(collapseAll ? new Set(groups.map((g) => g.key)) : new Set())}
					>
						{collapseAll ? <ChevronsDownUp /> : <ChevronsUpDown />}
					</ToolbarIcon>
				)}
				<MenuChoice
					icon={LayoutGrid}
					label={t('media.viewGrid')}
					value={view}
					onChange={(key) => {
						setView(key as MediaViewMode);
						setPage(1);
					}}
					options={[
						{ value: 'grid', label: t('media.viewGrid'), icon: LayoutGrid },
						{ value: 'list', label: t('media.viewList'), icon: List },
					]}
				/>
				<MenuChoice
					icon={Maximize2}
					label={t('media.sizeMedium')}
					value={size}
					onChange={(key) => {
						setSize(key as ThumbSize);
						setVaultPreference(app, THUMB_SIZE_STORAGE_KEY, key);
					}}
					options={(['small', 'medium', 'large'] as const).map((key) => ({
						value: key,
						label: t(`media.size${key[0]!.toUpperCase()}${key.slice(1)}`),
					}))}
				/>
				<ToolbarIcon
					label={t('media.quickFilter')}
					className={hasFilter ? 'text-primary' : undefined}
					aria-pressed={hasFilter}
					aria-expanded={!!anchor}
					onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
				>
					<Filter />
				</ToolbarIcon>
				{filter.tags.map((tag) => (
					<Badge key={tag} variant="neutral" className={chip}>
						<span className="truncate">#{tag}</span>
						<IconButton
							label={t('media.removeFilter', { name: `#${tag}` })}
							className="size-4"
							onClick={() => updateFilter({ ...filter, tags: filter.tags.filter((v) => v !== tag) })}
						>
							<X />
						</IconButton>
					</Badge>
				))}
				{(filter.start || filter.end) && (
					<Badge variant="neutral" className="max-w-56 gap-0.5 pr-0.5">
						<span className="truncate">
							{filter.property}: {filter.start || '...'} ~ {filter.end || '...'}
						</span>
						<IconButton
							label={t('media.removeFilter', {
								name: `${filter.start || '...'} ~ ${filter.end || '...'}`,
							})}
							className="size-4"
							onClick={() => updateFilter({ ...filter, start: '', end: '' })}
						>
							<X />
						</IconButton>
					</Badge>
				)}
				{filter.folders.map((folder) => (
					<Badge key={folder} variant="neutral" className={chip}>
						<span className="truncate">{folder.split('/').pop()}</span>
						<IconButton
							label={t('media.removeFilter', { name: folder })}
							className="size-4"
							onClick={() =>
								updateFilter({ ...filter, folders: filter.folders.filter((v) => v !== folder) })
							}
						>
							<X />
						</IconButton>
					</Badge>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{!results.length
					? empty
					: groupBy === 'none'
						? renderItems(results.slice(start, start + pageSize), start)
						: groups.map((group) => {
								const closed = collapsed.has(group.key);
								return (
									<section key={group.key} data-group-key={group.key}>
										<Button
											variant="ghost"
											type="button"
											aria-expanded={!closed}
											data-hit-control
											className="my-1.5 flex min-h-8 w-full cursor-pointer items-center gap-1.5 rounded-md border-0 border-b border-border bg-transparent px-1 py-1.5 text-left text-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
											onClick={() =>
												setCollapsed((old) => {
													const next = new Set(old);
													if (next.has(group.key)) next.delete(group.key);
													else next.add(group.key);
													return next;
												})
											}
										>
											{closed ? (
												<ChevronRight className="size-3 shrink-0" aria-hidden />
											) : (
												<ChevronDown className="size-3 shrink-0" aria-hidden />
											)}
											<span className="min-w-0 flex-1 text-xs font-semibold [overflow-wrap:anywhere]">
												{group.key}
											</span>
											<span className="shrink-0 rounded-full bg-secondary px-2 text-xs text-secondary-foreground">
												{group.items.length}
											</span>
										</Button>
										{!closed && renderItems(group.items, group.offset)}
									</section>
								);
							})}
			</div>
			<div data-footer className="flex shrink-0 flex-wrap items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground tabular-nums">
					{t('library.fileCount', { count: results.length })}
				</span>
				{groupBy === 'none' && pages > 1 && <Pagination page={current} pages={pages} change={setPage} />}
				<Choice
					label={t('library.pageSize', { count: pageSize })}
					className="w-32 data-[size=sm]:h-[var(--hu-ctl-h)]"
					value={String(pageSize)}
					onChange={(value) => {
						setPageSize(Number(value));
						setPage(1);
					}}
					options={PAGE_SIZE_OPTIONS.map((value) => ({
						value: String(value),
						label: t('library.pageSize', { count: value }),
					}))}
				/>
			</div>
			{anchor && (
				<MediaFilter
					app={app}
					anchor={anchor}
					value={filter}
					update={updateFilter}
					tags={tagService?.getAllTags()}
					close={() => setAnchor(null)}
				/>
			)}
		</div>
	);
}

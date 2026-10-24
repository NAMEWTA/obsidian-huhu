// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import { p1Classes } from '../theme/p1-classes';
import { setVaultPreference } from '../../../../host/obsidian/storage/preferences';
import { type App } from 'obsidian';
import { type ContentFile } from '../../../../host/obsidian/storage/content-files';
import { Fragment } from 'react';
import { useMemo, useState, useEffect } from 'react';
import type { DashboardColumn } from '../../core/board/types';
import type { MediaTagService } from '../../platform/media/media-tags';
import { t } from '../../../../shared/i18n';
import { ObsidianIcon as Icon } from '../../../../ui/components/huhu/ObsidianIcon';
import { Pagination } from '../sections/P1Controls';
import { ToolbarDropdown } from '../sections/P1Controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { X } from 'lucide-react';
import { Choice, IconButton } from '../board/controls';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { toast } from 'sonner';
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
		[deleting, setDeleting] = useState<ContentFile | null>(null);
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
	useEffect(() => contentFiles(app).subscribe(refresh), [app]);
	const kind = column.sectionType === 'videos' ? 'video' : 'image';
	const results = (() => {
		const exts = extsFor(column.sectionType ?? '');
		if (!exts) return [];
		const q = query.trim().toLowerCase();
		const folders = filter.folders.map(normalizeMediaFolder).filter(Boolean);
		const items = queryMediaFiles(
			app,
			exts,
			column.libraryConfig?.excludeFolders ?? [],
			column.libraryConfig?.includeFolders ?? [],
			tagService,
		).filter((r) => {
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
	const remove = async (file: ContentFile) => {
		try {
			await trashMediaFile(app, file);
			setDeleting(null);
			refresh();
		} catch (error) {
			toast.error(String(error));
		}
	};
	const editTags = tagService ? (result: MediaFileResult) => setTagFile(result.file) : undefined;
	const display = groupBy === 'none' ? results : groups.flatMap((group) => group.items);
	const renderItems = (items: MediaFileResult[], offset: number) => (
		<MediaViews
			app={app}
			results={items}
			kind={kind}
			size={size}
			view={view}
			open={(index) => setLightbox(offset + index)}
			remove={setDeleting}
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
	return (
		<div data-media className="flex h-full min-h-0 flex-col gap-3">
			{tagFile && tagService && (
				<MediaTagEditor
					name={tagFile.basename}
					path={tagFile.path}
					current={tagService.getTags(tagFile.path)}
					known={tagService.getAllTags()}
					onClose={() => setTagFile(null)}
					onSave={(tags) => {
						tagService.setTags(tagFile.path, tags);
						setTagFile(null);
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
					close={() => setLightbox(null)}
				/>
			)}
			{deleting && (
				<DashboardDialog title={t('common.confirmDelete')} onClose={() => setDeleting(null)}>
					<p>{t('media.confirmDelete', { name: deleting.basename })}</p>
					<Button
						variant="destructive"
						onClick={() => {
							void remove(deleting);
						}}
					>
						{t('common.delete')}
					</Button>
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
					className="w-32 data-[size=sm]:h-9"
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
				<Button
					variant="outline"
					size="icon"
					aria-label={t('library.sortName')}
					onClick={() => {
						setDesc(!desc);
						setPage(1);
					}}
				>
					<Icon name={desc ? 'arrow-down-wide-narrow' : 'arrow-up-wide-narrow'} />
				</Button>
				<Choice
					label={t('media.groupBy')}
					className="w-32 data-[size=sm]:h-9"
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
					<Button
						variant="outline"
						size="icon"
						title={t(collapseAll ? 'library.collapseAllGroups' : 'library.expandAllGroups')}
						aria-label={t(collapseAll ? 'library.collapseAllGroups' : 'library.expandAllGroups')}
						onClick={() => setCollapsed(collapseAll ? new Set(groups.map((g) => g.key)) : new Set())}
					>
						<Icon name={collapseAll ? 'chevrons-down-up' : 'chevrons-up-down'} />
					</Button>
				)}
				<ToolbarDropdown
					currentKey={view}
					items={(['grid', 'list'] as const).map((key) => ({
						key,
						label: t(key === 'grid' ? 'media.viewGrid' : 'media.viewList'),
						icon: key === 'grid' ? 'layout-grid' : 'list',
					}))}
					pick={(key) => {
						setView(key as MediaViewMode);
						setPage(1);
					}}
				/>
				<ToolbarDropdown
					currentKey={size}
					items={(['small', 'medium', 'large'] as const).map((key) => ({
						key,
						label: t(`media.size${key[0]!.toUpperCase()}${key.slice(1)}`),
						short: key[0]!.toUpperCase(),
					}))}
					pick={(key) => {
						setSize(key as ThumbSize);
						setVaultPreference(app, THUMB_SIZE_STORAGE_KEY, key);
					}}
				/>
				<Button
					variant="outline"
					size="icon"
					className={hasFilter ? 'text-primary' : undefined}
					title={t('media.quickFilter')}
					aria-label={t('media.quickFilter')}
					aria-pressed={hasFilter}
					onClick={(e) => {
						e.stopPropagation();
						setAnchor(anchor ? null : e.currentTarget);
					}}
				>
					<Icon name="filter" />
				</Button>
				{filter.tags.map((tag) => (
					<Badge key={tag} variant="secondary" className="max-w-40 gap-0.5 pr-0.5">
						<span className="truncate">#{tag}</span>
						<IconButton
							label={t('common.delete')}
							className="size-4"
							onClick={() => updateFilter({ ...filter, tags: filter.tags.filter((v) => v !== tag) })}
						>
							<X />
						</IconButton>
					</Badge>
				))}
				{(filter.start || filter.end) && (
					<Badge variant="secondary" className="max-w-56 gap-0.5 pr-0.5">
						<span className="truncate">
							{filter.property}: {filter.start || '...'} ~ {filter.end || '...'}
						</span>
						<IconButton
							label={t('common.delete')}
							className="size-4"
							onClick={() => updateFilter({ ...filter, start: '', end: '' })}
						>
							<X />
						</IconButton>
					</Badge>
				)}
				{filter.folders.map((folder) => (
					<Badge key={folder} variant="secondary" className="max-w-40 gap-0.5 pr-0.5" title={folder}>
						<span className="truncate">{folder.split('/').pop()}</span>
						<IconButton
							label={t('common.delete')}
							className="size-4"
							onClick={() => updateFilter({ ...filter, folders: filter.folders.filter((v) => v !== folder) })}
						>
							<X />
						</IconButton>
					</Badge>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{!results.length ? (
					<EmptyState
						size="sm"
						className="h-full"
						icon={<Icon name={kind === 'video' ? 'film' : 'image'} />}
						title={t(kind === 'video' ? 'media.noVideos' : 'media.noImages')}
					/>
				) : groupBy === 'none' ? (
					renderItems(results.slice(start, start + pageSize), start)
				) : (
					groups.map((group) => (
						<Fragment key={group.key}>
							<div
								className={p1Classes(
									`dashboard-media-group-header${collapsed.has(group.key) ? ' is-collapsed' : ''}`,
								)}
								data-group-key={group.key}
								onClick={() =>
									setCollapsed((old) => {
										const next = new Set(old);
										if (next.has(group.key)) next.delete(group.key);
										else next.add(group.key);
										return next;
									})
								}
							>
								<Icon
									className={p1Classes('dashboard-media-group-chevron')}
									name={collapsed.has(group.key) ? 'chevron-right' : 'chevron-down'}
								/>
								<div className={p1Classes('dashboard-media-group-name')}>{group.key}</div>
								<div className={p1Classes('dashboard-media-group-count')}>{group.items.length}</div>
							</div>
							<div
								className={p1Classes(
									`dashboard-media-group-body${collapsed.has(group.key) ? ' is-hidden' : ''}`,
								)}
							>
								{renderItems(group.items, group.offset)}
							</div>
						</Fragment>
					))
				)}
			</div>
			<div data-footer className="flex shrink-0 flex-wrap items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground tabular-nums">
					{t('library.fileCount', { count: results.length })}
				</span>
				{groupBy === 'none' && pages > 1 && <Pagination page={current} pages={pages} change={setPage} />}
				<Choice
					label={t('library.pageSize', { count: pageSize })}
					className="w-32 data-[size=sm]:h-9"
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

// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/library-section.ts, src/table-columns-modal.ts
import { FolderListField } from '../P1Controls';
import { buildNewNoteProps } from '../../library/library-new-note';
import { selectBadgeKeys } from '../../library/library-presentation';
import { PinnedProperties } from '../../library/PinnedProperties';
import { observeBoardAction } from '../../board/actions';
import { RelativeTime } from '../../../../../ui/components/huhu/RelativeTime';
import { useState } from 'react';
import { useStore } from 'zustand';
import {
	ArrowDownUp,
	CalendarRange,
	ChevronDown,
	Database,
	Eye,
	FileText,
	Plus,
	Settings,
	SlidersHorizontal,
	Trash2,
} from 'lucide-react';
import type { DashboardColumn, LibraryConfig } from '../../../core/board/types/model';
import type { BoardStore } from '../../../services/board-store';
import type { LibraryFileResult } from '../../../services/library-query';
import { libraryTableCandidates, libraryTableColumns } from '../../../core/board/table-columns';
import { Badge } from '../../../../../ui/components/badge';
import { Button } from '../../../../../ui/components/button';
import { Input } from '../../../../../ui/components/input';
import { Label } from '../../../../../ui/components/label';
import { Checkbox } from '../../../../../ui/components/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../ui/components/popover';
import { EmptyState } from '../../../../../ui/components/huhu/EmptyState';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../../../ui/components/table';
import { cn } from '../../../../../ui/lib/utils';
import { useT } from '../../../../../ui/react/hooks';
import { Choice, IconButton } from '../../board/controls';
import { FileGlyph, RowButton } from '../../board/rows';
import { WidgetActions } from '../../canvas/widget-frame';
import { DashboardDialog } from '../../dialogs/DashboardDialog';
import { DateRangeCalendar } from '../DateRangeCalendar';
import { useImage } from '../../board/hooks';
function display(value: unknown): string {
	return typeof value === 'string'
		? value
		: typeof value === 'number' || typeof value === 'boolean'
			? String(value)
			: value == null
				? ''
				: JSON.stringify(value);
}
const DEFAULT: LibraryConfig = { filters: [], viewMode: 'grid', sortBy: 'modified', sortDesc: true, pageSize: 20 };
function FileCard({
	store,
	row,
	mode,
	config,
	onDelete,
}: {
	store: BoardStore;
	row: LibraryFileResult;
	mode: string;
	config: LibraryConfig;
	onDelete(this: void): void;
}) {
	const t = useT(),
		image = useImage(store, display(row.frontmatter.cover ?? row.frontmatter['封面']));
	const keys =
		config.showProperties === false
			? []
			: selectBadgeKeys(
					Object.fromEntries(
						Object.entries(row.frontmatter).filter(
							([key]) =>
								![
									'cover',
									'封面',
									'aliases',
									'cssclasses',
									...(mode === 'kanban' && config.groupMode !== 'folder'
										? [config.kanbanGroupBy ?? 'status']
										: []),
								].includes(key),
						),
					),
					config.visibleProperties,
					config.propertyLimit ?? 3,
				);
	return (
		<div className="group/file relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xs transition-shadow hover:shadow-sm">
			<Button
				variant="ghost"
				className="h-auto w-full flex-col items-stretch justify-start gap-1.5 rounded-none p-3 text-left font-normal whitespace-normal"
				onClick={() => {
					void store.openFile(row.file.path);
				}}
			>
				{mode === 'gallery' &&
					(image ? (
						<img src={image} alt="" className="aspect-video w-full rounded-md object-cover" />
					) : (
						<div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
							<FileText className="size-8 text-muted-foreground" />
						</div>
					))}
				<span className="flex w-full min-w-0 items-center gap-2">
					<FileGlyph path={row.file.path} />
					<span className="min-w-0 flex-1 truncate text-sm leading-5 font-medium">{row.basename}</span>
				</span>
				<span className="flex w-full items-center gap-2 text-xs text-muted-foreground">
					<span className="min-w-0 flex-1 truncate">{row.file.path.split('/').slice(0, -1).join('/')}/</span>
					<RelativeTime value={row.mtime} className="shrink-0" />
				</span>
				{keys.length > 0 && (
					<span className="flex w-full flex-wrap gap-1">
						{keys.map((key) => (
							<Badge key={key} variant="secondary" className="max-w-full rounded-md font-normal">
								<span className="truncate">
									<span className="text-primary">{key}:</span> {display(row.frontmatter[key])}
								</span>
							</Badge>
						))}
					</span>
				)}
			</Button>
			<IconButton
				label={t('common.delete')}
				className="absolute top-1.5 right-1.5 bg-background/80 opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
				onClick={onDelete}
			>
				<Trash2 className="size-3" />
			</IconButton>
		</div>
	);
}
function LibraryGroup({
	name,
	rows,
	config,
	store,
	columns,
	collapsed,
	toggle,
	onDelete,
}: {
	name: string;
	rows: LibraryFileResult[];
	config: LibraryConfig;
	store: BoardStore;
	columns: string[];
	collapsed: boolean;
	toggle(this: void): void;
	onDelete(this: void, row: LibraryFileResult): void;
}) {
	const t = useT(),
		[limit, setLimit] = useState(50),
		[page, setPage] = useState(0),
		paged = !name && config.viewMode !== 'kanban',
		size = config.pageSize || 20,
		shown = paged ? rows.slice(page * size, (page + 1) * size) : rows.slice(0, Math.min(500, limit));
	const value = (row: LibraryFileResult, key: string) =>
		key === 'file.name'
			? row.basename
			: key === 'file.modified'
				? new Date(row.mtime).toLocaleDateString()
				: display(row.frontmatter[key.slice(9)]);
	return (
		<div
			className={cn(
				'min-w-0',
				config.viewMode === 'kanban' && 'self-start rounded-lg border border-border bg-muted/40 p-2',
			)}
		>
			{name && (
				<Button
					variant="ghost"
					className="mb-1 h-9 w-full justify-start px-2"
					aria-expanded={!collapsed}
					onClick={toggle}
				>
					<ChevronDown className={collapsed ? '-rotate-90' : ''} />
					<span className="min-w-0 flex-1 truncate text-left">{name}</span>
					<span className="text-xs text-muted-foreground tabular-nums">{rows.length}</span>
				</Button>
			)}
			{!collapsed && (
				<>
					{config.viewMode === 'table' ? (
						<Table className="text-sm">
							<TableHeader>
								<TableRow>
									{columns.map((key) => (
										<TableHead key={key} className="h-9 px-2 text-xs text-muted-foreground">
											{key === 'file.name'
												? t('home.dashboard.name')
												: key === 'file.modified'
													? t('home.dashboard.modified')
													: key.slice(9)}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{shown.map((row) => (
									<TableRow key={row.file.path}>
										{columns.map((key) => (
											<TableCell key={key} className="max-w-60 truncate px-2 py-1.5">
												{key === 'file.name' ? (
													<Button
														variant="link"
														className="h-auto max-w-full justify-start p-0 text-sm"
														onClick={() => {
															void store.openFile(row.file.path);
														}}
													>
														{value(row, key)}
													</Button>
												) : (
													value(row, key)
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : config.viewMode === 'list' ? (
						<div className="flex flex-col gap-0.5">
							{shown.map((row) => (
								<div key={row.file.path} className="group/row flex items-center gap-1">
									<RowButton
										icon={<FileGlyph path={row.file.path} />}
										title={row.file.path}
										trailing={new Date(row.mtime).toLocaleDateString()}
										onClick={() => {
											void store.openFile(row.file.path);
										}}
									>
										{row.basename}
									</RowButton>
									<IconButton
										label={t('common.delete')}
										className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
										onClick={() => onDelete(row)}
									>
										<Trash2 className="size-3" />
									</IconButton>
								</div>
							))}
						</div>
					) : (
						<div
							data-card-grid
							className={`grid gap-3 ${config.viewMode === 'kanban' ? 'grid-cols-1' : config.cardSize === 'small' ? 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]' : config.cardSize === 'large' ? 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}
						>
							{shown.map((row) => (
								<FileCard
									key={row.file.path}
									row={row}
									mode={config.viewMode}
									config={config}
									store={store}
									onDelete={() => onDelete(row)}
								/>
							))}
						</div>
					)}
					{!paged && shown.length < Math.min(rows.length, 500) && (
						<Button variant="ghost" className="mt-2 w-full" onClick={() => setLimit((n) => n + 50)}>
							{t('home.dashboard.more50')}
						</Button>
					)}
					{paged && rows.length > size && (
						<div className="mt-2 flex items-center justify-center gap-2">
							<Button size="sm" variant="ghost" disabled={!page} onClick={() => setPage((n) => n - 1)}>
								{t('home.dashboard.previous')}
							</Button>
							<span className="text-xs tabular-nums">
								{page + 1} / {Math.ceil(rows.length / size)}
							</span>
							<Button
								size="sm"
								variant="ghost"
								disabled={(page + 1) * size >= rows.length}
								onClick={() => setPage((n) => n + 1)}
							>
								{t('home.dashboard.next')}
							</Button>
						</div>
					)}
					{rows.length > 500 && (
						<p className="text-xs text-muted-foreground">{t('home.dashboard.limit500')}</p>
					)}
				</>
			)}
		</div>
	);
}
export function LibrarySection({ store, column }: { store: BoardStore; column: DashboardColumn }) {
	useStore(store.state, (s) => s.files);
	const t = useT(),
		config = column.libraryConfig ?? DEFAULT,
		[search, setSearch] = useState(''),
		[dialog, setDialog] = useState<'config' | 'columns' | 'new' | 'date' | null>(null),
		[draft, setDraft] = useState(config),
		[name, setName] = useState(''),
		[folder, setFolder] = useState(config.folders?.[0] ?? ''),
		[template, setTemplate] = useState(config.templatePaths?.[0] ?? config.templatePath ?? ''),
		[remove, setRemove] = useState<LibraryFileResult | null>(null),
		[collapsed, setCollapsed] = useState<string[]>([]);
	const patch = (next: Partial<LibraryConfig>) => {
		void observeBoardAction(store.sync.updateLibraryConfig(column.name, { ...config, ...next }));
	};
	const all = store
		.library(config)
		.filter((row) => row.basename.toLowerCase().includes(search.toLowerCase()))
		.filter((row) => {
			const f = config.quickDateFilter;
			if (!f) return true;
			const date = new Date(f.property === 'created' ? row.ctime : row.mtime).toISOString().slice(0, 10);
			return (!f.start || date >= f.start) && (!f.end || date <= f.end);
		});
	const candidates = libraryTableCandidates(all, config.filters),
		columns = libraryTableColumns(config, candidates),
		groupMode = config.viewMode === 'kanban' ? (config.groupMode ?? 'property') : (config.viewGroupMode ?? 'none'),
		property = config.viewMode === 'kanban' ? (config.kanbanGroupBy ?? 'status') : (config.viewGroupBy ?? 'status');
	const groups = new Map<string, LibraryFileResult[]>();
	for (const row of all.slice(0, 500)) {
		const key =
			groupMode === 'folder'
				? row.file.path.split('/').slice(0, -1).join('/')
				: groupMode === 'property'
					? display(row.frontmatter[property] ?? t('home.dashboard.ungrouped'))
					: '';
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	const toggle = (key: string) =>
		setCollapsed((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
	const dated = !!(config.quickDateFilter?.start || config.quickDateFilter?.end);
	return (
		<div data-library className="dashboard-library flex h-full min-h-0 flex-col gap-3">
			<WidgetActions>
				<IconButton label={t('home.dashboard.newNote')} onClick={() => setDialog('new')}>
					<Plus />
				</IconButton>
				<IconButton
					label={t('home.dashboard.settings')}
					onClick={() => {
						setDraft(structuredClone(config));
						setDialog('config');
					}}
				>
					<Settings />
				</IconButton>
			</WidgetActions>
			<div data-toolbar className="flex shrink-0 flex-wrap items-center gap-2">
				<Input
					aria-label={t('home.dashboard.findNote')}
					placeholder={t('home.dashboard.findNote')}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="min-w-32 flex-1"
				/>
				<Choice
					label={t('home.dashboard.sort')}
					className="w-32 data-[size=sm]:h-9"
					value={config.sortBy}
					onChange={(sortBy) => patch({ sortBy })}
					options={['modified', 'created', 'name'].map((value) => ({
						value,
						label: t(`home.dashboard.${value}`),
					}))}
				/>
				<Button
					variant="outline"
					size="icon"
					aria-label={t('home.dashboard.sort')}
					aria-pressed={!!config.sortDesc}
					onClick={() => patch({ sortDesc: !config.sortDesc })}
				>
					<ArrowDownUp />
				</Button>
				<Choice
					label={t('home.dashboard.view')}
					className="w-32 data-[size=sm]:h-9"
					value={config.viewMode}
					onChange={(viewMode) => patch({ viewMode: viewMode as LibraryConfig['viewMode'] })}
					options={['grid', 'gallery', 'list', 'table', 'kanban'].map((value) => ({
						value,
						label: t(`library.view${value[0]!.toUpperCase() + value.slice(1)}`),
					}))}
				/>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							aria-label={t('library.displayOptions')}
							className={dated ? 'text-primary' : undefined}
						>
							<SlidersHorizontal />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="huhu-dashboard-root w-72 space-y-3 p-3">
						<div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
							<span className="text-xs text-muted-foreground">{t('home.dashboard.size')}</span>
							<Choice
								label={t('home.dashboard.size')}
								className="w-full data-[size=sm]:h-9"
								value={config.cardSize ?? 'medium'}
								onChange={(cardSize) => patch({ cardSize: cardSize as LibraryConfig['cardSize'] })}
								options={[
									{ value: 'small', label: 'S' },
									{ value: 'medium', label: 'M' },
									{ value: 'large', label: 'L' },
								]}
							/>
							<span className="text-xs text-muted-foreground">{t('home.dashboard.group')}</span>
							<Choice
								label={t('home.dashboard.group')}
								className="w-full data-[size=sm]:h-9"
								value={groupMode}
								onChange={(mode) =>
									patch(
										config.viewMode === 'kanban'
											? { groupMode: mode === 'none' ? 'property' : (mode as 'folder' | 'property') }
											: { viewGroupMode: mode as LibraryConfig['viewGroupMode'] },
									)
								}
								options={['none', 'folder', 'property'].map((value) => ({
									value,
									label: t(`home.dashboard.group.${value}`),
								}))}
							/>
							<span className="text-xs text-muted-foreground">{t('home.dashboard.pageSize')}</span>
							<Choice
								label={t('home.dashboard.pageSize')}
								className="w-full data-[size=sm]:h-9"
								value={String(config.pageSize ?? 20)}
								onChange={(value) => patch({ pageSize: +value })}
								options={[10, 20, 50, 100].map((value) => ({
									value: String(value),
									label: t('home.dashboard.perPage', { count: value }),
								}))}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								className={dated ? 'text-primary' : undefined}
								onClick={() => {
									setDraft(structuredClone(config));
									setDialog('date');
								}}
							>
								<CalendarRange />
								{t('home.dashboard.dateFilter')}
							</Button>
							{config.viewMode === 'table' && (
								<Button variant="outline" onClick={() => setDialog('columns')}>
									<Eye />
									{t('home.dashboard.columns')}
								</Button>
							)}
							{groupMode !== 'none' && (
								<Button
									variant="outline"
									onClick={() => setCollapsed(collapsed.length ? [] : [...groups.keys()])}
								>
									{t(collapsed.length ? 'home.dashboard.expandAll' : 'home.dashboard.collapseAll')}
								</Button>
							)}
						</div>
					</PopoverContent>
				</Popover>
				<span className="hidden text-xs whitespace-nowrap text-muted-foreground @md:inline">
					{t('home.dashboard.files', { count: all.length })}
				</span>
			</div>
			{all.length === 0 ? (
				<EmptyState
					size="sm"
					className="min-h-0 flex-1"
					icon={<Database />}
					title={t('library.empty')}
				/>
			) : (
				<div
					className={cn(
						'min-h-0 flex-1 overflow-y-auto',
						config.viewMode === 'kanban'
							? 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start items-start gap-3'
							: 'space-y-3',
					)}
					data-card-grid={config.viewMode === 'kanban' ? '' : undefined}
				>
					{[...groups].map(([key, rows]) => (
						<LibraryGroup
							key={key + config.viewMode + config.pageSize + search + JSON.stringify(config.quickDateFilter)}
							name={key}
							rows={rows}
							config={config}
							store={store}
							columns={columns.visible}
							collapsed={collapsed.includes(key)}
							toggle={() => toggle(key)}
							onDelete={setRemove}
						/>
					))}
				</div>
			)}
			{all.length > 500 && <p className="text-xs text-muted-foreground">{t('home.dashboard.limit500')}</p>}
			{dialog === 'date' && (
				<DashboardDialog
					title={t('home.dashboard.dateFilter')}
					onClose={() => setDialog(null)}
					onSave={() => {
						patch({ quickDateFilter: draft.quickDateFilter });
						setDialog(null);
					}}
				>
					<DateRangeCalendar
						start={draft.quickDateFilter?.start ?? ''}
						end={draft.quickDateFilter?.end ?? ''}
						onChange={(start, end) =>
							setDraft({
								...draft,
								quickDateFilter: { property: 'modified', ...draft.quickDateFilter, start, end },
							})
						}
					/>
					{(['start', 'end'] as const).map((key) => (
						<Label key={key}>
							{t(`home.dashboard.${key}`)}
							<Input
								type="date"
								value={draft.quickDateFilter?.[key] ?? ''}
								onChange={(e) =>
									setDraft({
										...draft,
										quickDateFilter: {
											property: 'modified',
											start: '',
											end: '',
											...draft.quickDateFilter,
											[key]: e.target.value,
										},
									})
								}
							/>
						</Label>
					))}
					<Button variant="ghost" onClick={() => setDraft({ ...draft, quickDateFilter: undefined })}>
						{t('home.dashboard.clear')}
					</Button>
				</DashboardDialog>
			)}
			{dialog === 'config' && (
				<DashboardDialog
					title={t('home.dashboard.settings')}
					onClose={() => setDialog(null)}
					onSave={() => {
						void observeBoardAction(
							store.sync.updateLibraryConfig(column.name, draft).then(() => setDialog(null)),
						);
					}}
				>
					<PinnedProperties
						config={draft}
						keys={candidates.filter((k) => k.startsWith('property:')).map((k) => k.slice(9))}
						onChange={setDraft}
					/>
					<Label className="grid gap-2">
						{t('home.dashboard.folders')}
						<FolderListField
							app={store.host.app}
							label={t('home.dashboard.folders')}
							folders={draft.folders ?? []}
							onChange={(folders) => setDraft({ ...draft, folders })}
						/>
					</Label>
					<Label className="grid gap-2">
						{t('home.dashboard.group.property')}
						<Input
							value={draft.viewGroupBy ?? draft.kanbanGroupBy ?? ''}
							onChange={(e) =>
								setDraft({ ...draft, viewGroupBy: e.target.value, kanbanGroupBy: e.target.value })
							}
						/>
					</Label>
					{draft.filters.map((filter, i) => (
						<div key={i} className="flex gap-2">
							<Input
								aria-label={t('home.dashboard.property')}
								value={filter.property}
								onChange={(e) =>
									setDraft({
										...draft,
										filters: draft.filters.map((f, n) =>
											n === i ? { ...f, property: e.target.value } : f,
										),
									})
								}
							/>
							<Choice
								label={t('home.dashboard.operator')}
								value={filter.operator ?? 'equals'}
								options={(['equals', 'notEquals', 'contains'] as const).map((value) => ({
									value,
									label: t(`home.dashboard.${value}`),
								}))}
								onChange={(operator) =>
									setDraft({
										...draft,
										filters: draft.filters.map((f, n) =>
											n === i
												? { ...f, operator: operator as 'equals' | 'notEquals' | 'contains' }
												: f,
										),
									})
								}
							/>
							<Input
								aria-label={t('home.dashboard.value')}
								value={filter.values.join(', ')}
								onChange={(e) =>
									setDraft({
										...draft,
										filters: draft.filters.map((f, n) =>
											n === i
												? { ...f, values: e.target.value.split(',').map((s) => s.trim()) }
												: f,
										),
									})
								}
							/>
							<IconButton
								label={t('common.delete')}
								onClick={() => setDraft({ ...draft, filters: draft.filters.filter((_, n) => n !== i) })}
							>
								<Trash2 />
							</IconButton>
						</div>
					))}
					<Button
						variant="outline"
						onClick={() =>
							setDraft({ ...draft, filters: [...draft.filters, { property: 'tags', values: [] }] })
						}
					>
						{t('home.dashboard.addFilter')}
					</Button>
					<Label className="grid gap-2">
						{t('home.dashboard.dateFilter')}
						<div className="flex gap-2">
							{(['start', 'end'] as const).map((key) => (
								<Input
									key={key}
									type="date"
									aria-label={t(`home.dashboard.${key}`)}
									value={draft.quickDateFilter?.[key] ?? ''}
									onChange={(e) =>
										setDraft({
											...draft,
											quickDateFilter: {
												property: 'modified',
												start: '',
												end: '',
												...draft.quickDateFilter,
												[key]: e.target.value,
											},
										})
									}
								/>
							))}
						</div>
					</Label>
					<Label className="grid gap-2">
						{t('home.dashboard.template')}
						<FolderListField
							app={store.host.app}
							kind="file"
							label={t('home.dashboard.template')}
							folders={draft.templatePaths ?? (draft.templatePath ? [draft.templatePath] : [])}
							onChange={(templatePaths) =>
								setDraft({ ...draft, templatePaths, templatePath: templatePaths[0] ?? '' })
							}
						/>
					</Label>
				</DashboardDialog>
			)}
			{dialog === 'columns' && (
				<DashboardDialog title={t('home.dashboard.columns')} onClose={() => setDialog(null)}>
					{columns.order.map((key, i) => (
						<div key={key} className="flex items-center gap-2">
							<Checkbox
								checked={!columns.hidden.includes(key)}
								aria-label={key}
								onCheckedChange={(checked) =>
									patch({
										tableHidden: checked
											? columns.hidden.filter((k) => k !== key)
											: [...columns.hidden, key],
									})
								}
							/>
							{key}
							<Button
								size="xs"
								variant="ghost"
								disabled={!i}
								onClick={() => {
									const order = [...columns.order];
									order.splice(i, 1);
									order.splice(i - 1, 0, key);
									patch({ tableOrder: order });
								}}
							>
								{t('workspace.moveUp')}
							</Button>
						</div>
					))}
				</DashboardDialog>
			)}
			{dialog === 'new' && (
				<DashboardDialog
					title={t('home.dashboard.newNote')}
					onClose={() => setDialog(null)}
					onSave={() => {
						void store
							.newNote(
								column.sectionType === 'folder' ? folder : '',
								name || t('home.dashboard.newNote'),
								template,
								buildNewNoteProps(config).props,
							)
							.then(() => setDialog(null));
					}}
				>
					{column.sectionType === 'folder' && (config.folders?.length ?? 0) > 1 && (
						<Choice
							label={t('home.dashboard.chooseFolder')}
							value={folder}
							onChange={setFolder}
							options={config.folders!.map((value) => ({ value, label: value }))}
						/>
					)}
					{(config.templatePaths?.length ?? 0) > 1 && (
						<Choice
							label={t('home.dashboard.chooseTemplate')}
							value={template}
							onChange={setTemplate}
							options={config.templatePaths!.map((value) => ({ value, label: value }))}
						/>
					)}
					<Input
						aria-label={t('home.dashboard.name')}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</DashboardDialog>
			)}
			{remove && (
				<DashboardDialog title={t('common.delete')} onClose={() => setRemove(null)}>
					<p>{remove.basename}</p>
					<Button
						variant="destructive"
						onClick={() => {
							void store.trash(remove.file).then(() => setRemove(null));
						}}
					>
						{t('common.delete')}
					</Button>
				</DashboardDialog>
			)}
		</div>
	);
}

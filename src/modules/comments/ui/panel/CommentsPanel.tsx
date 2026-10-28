import { useEffect, useState, useSyncExternalStore } from 'react';
import type { EditorContextAccess } from '../../../../app/contracts/editor-context';
import { useStore } from 'zustand';
import { Notice } from 'obsidian';
import { MessageSquareText, MoreHorizontal, RefreshCw, Download, CheckSquare } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '../../../../ui/components/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '../../../../ui/components/toggle-group';
import { SegmentedControl } from '../../../../ui/components/huhu/SegmentedControl';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../ui/components/collapsible';
import { ConfirmDialog } from '../../../../ui/components/huhu/ConfirmDialog';
import { useT } from '../../../../ui/react/hooks';
import { colorOptions } from '../../core/highlight-colors';
import { filterHighlightRows, sortHighlightRows, groupHighlightRows, type HighlightRow, type HighlightGroupBy } from '../../core/catalog';
import type { CommentsEnv } from '../env';
import { Action, ThreadCard } from '../thread/ThreadCard';
import { HighlightPalette } from '../highlight-palette';
import type { ThreadFilter } from './filter';
import type { SortOrder } from './sort';

function NoteThreads({ env, path, filter, sort, selectMode, selected, onSelect, showArchived }: {
	env: CommentsEnv; path: string; filter: ThreadFilter; sort: SortOrder;
	selectMode: boolean; selected: Set<string>; onSelect: (id: string, selected: boolean) => void; showArchived: boolean;
}) {
	useStore(env.service.state, state => state.revision);
	const [error, setError] = useState(false);
	const t = useT();
	useEffect(() => { let live = true; void env.service.load(path).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, [env, path]);
	const rows = sortHighlightRows(filterHighlightRows(env.service.store.threadsFor(path).map(thread => ({ path, thread })),
		{ search: '', color: 'all', status: filter, showArchived }), sort);
	return <div className="space-y-2">
		{error && <p role="alert" className="text-xs text-destructive">{t('editor.comments.storageFailed')}</p>}
		{rows.map(row => <ThreadCard key={row.thread.id} env={env} path={path} thread={row.thread}
			selected={selected.has(row.thread.id)} onSelect={selectMode ? onSelect : undefined} />)}
		{!rows.length && !error && <p className="py-4 text-center text-xs text-muted-foreground">{t('editor.comments.empty')}</p>}
	</div>;
}
function VaultSection({ env, path, open, total, filter, sort, selectMode, selected, onSelect, showArchived }: {
	env: CommentsEnv; path: string; open: number; total: number; filter: ThreadFilter; sort: SortOrder;
	selectMode: boolean; selected: Set<string>; onSelect: (id: string, selected: boolean) => void; showArchived: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	return <Collapsible open={expanded} onOpenChange={setExpanded}>
		<CollapsibleTrigger asChild><Button variant="ghost" className="h-auto w-full justify-between whitespace-normal text-left text-xs">
			<span>{path}</span><span className="ml-2 text-muted-foreground">{open}/{total}</span></Button></CollapsibleTrigger>
		<CollapsibleContent>{expanded && <NoteThreads env={env} path={path} filter={filter} sort={sort} selectMode={selectMode}
			selected={selected} onSelect={onSelect} showArchived={showArchived} />}</CollapsibleContent>
	</Collapsible>;
}
export function CommentsPanel({ env, documents, container }: { env: CommentsEnv; documents?: EditorContextAccess; container?: HTMLElement }) {
	const state = useStore(env.service.state);
	const path = useSyncExternalStore(listener => documents?.subscribe(listener) ?? (() => undefined), () => documents && container?.ownerDocument.defaultView ? documents.current(container.ownerDocument.defaultView)?.path ?? null : state.path);
	const [scope, setScope] = useState('current');
	const [filter, setFilter] = useState<ThreadFilter>('all');
	const [sort, setSort] = useState<SortOrder>(env.service.settings().sort);
	const [groupBy, setGroupBy] = useState<HighlightGroupBy>('file');
	const [search, setSearch] = useState('');
	const [color, setColor] = useState('all');
	const [showArchived, setShowArchived] = useState(false);
	const [selectMode, setSelectMode] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [tags, setTags] = useState('');
	const [loadResult, setLoadResult] = useState<{ signature: string; error: boolean } | null>(null);
	const [bulkError, setBulkError] = useState(false);
	const [busy, setBusy] = useState(false);
	const t = useT(), store = env.service.store, settings = env.service.settings();
	const sourcePaths = state.notes.map(note => note.path).join('\n');
	const eager = scope === 'vault' && (!!search.trim() || color !== 'all' || groupBy !== 'file' || selectMode || showArchived);
	const loading = eager && loadResult?.signature !== sourcePaths;
	const loadError = eager && loadResult?.signature === sourcePaths && loadResult.error;
	useEffect(() => {
		if (!eager) return;
		let active = true;
		const paths = sourcePaths ? sourcePaths.split('\n') : [];
		void (async () => {
			let hasError = false;
			for (let offset = 0; offset < paths.length && active; offset += 16) {
				const results = await Promise.allSettled(paths.slice(offset, offset + 16).map(path => env.service.load(path)));
				if (results.some(result => result.status === 'rejected')) hasError = true;
			}
			if (active) setLoadResult({ signature: sourcePaths, error: hasError });
		})();
		return () => { active = false; };
	}, [env, eager, sourcePaths]);
	const selectedChanged = (id: string, checked: boolean) => setSelected(old => {
		const next = new Set(old); if (checked) next.add(id); else next.delete(id); return next;
	});
	const rows: HighlightRow[] = (scope === 'current'
		? (path ? store.threadsFor(path).map(thread => ({ path: path!, thread })) : [])
		: state.notes.flatMap(note => store.threadsFor(note.path).map(thread => ({ path: note.path, thread }))));
	const visible = sortHighlightRows(filterHighlightRows(rows, { search, color, status: filter, showArchived }), sort);
	const selectedRows = visible.filter(row => selected.has(row.thread.id));
	const count = scope === 'current' ? rows.length : state.notes.reduce((sum, note) => sum + note.total, 0);
	const grouped = groupHighlightRows(visible, groupBy);
	const lazyVault = scope === 'vault' && !eager;
	const notes = state.notes.filter(note => filter === 'all' || (filter === 'open' ? note.open > 0 : note.total > note.open)).sort((a, b) => a.path.localeCompare(b.path));
	const existing = notes.filter(note => env.app.vault.getFileByPath(note.path));
	const missing = notes.filter(note => !env.app.vault.getFileByPath(note.path));
	const runBulk = async (action: (row: HighlightRow) => Promise<unknown>) => {
		if (!selectedRows.length || busy) return;
		setBusy(true); setBulkError(false);
		const done = new Set<string>();
		for (const row of selectedRows) {
			try { await action(row); done.add(row.thread.id); }
			catch { setBulkError(true); }
		}
		setSelected(old => new Set([...old].filter(id => !done.has(id)))); setBusy(false);
	};
	const bulkButtons = <div className="space-y-2 border-b border-border p-2 text-xs">
		<div className="flex flex-wrap items-center gap-2">
			<span>{t('editor.highlights.selectedCount', { count: selectedRows.length })}</span>
			<Button size="xs" variant="outline" onClick={() => setSelected(new Set(visible.map(row => row.thread.id)))}>{t('editor.highlights.selectVisible')}</Button>
			<Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>{t('editor.highlights.clear')}</Button>
		</div>
		<HighlightPalette settings={settings} disabled={busy || !selectedRows.length} onSelect={(id, hex) => {
			void runBulk(row => row.thread.kind === 'range' ? env.service.recolor(row.thread.id, id, hex) : Promise.resolve());
		}} />
		<div className="flex flex-wrap items-center gap-1">
			<Input value={tags} aria-label={t('editor.highlights.tags')} onChange={event => setTags(event.target.value)}
				className="h-8 min-w-0 flex-1 text-xs" placeholder={t('editor.highlights.tagsHint')} />
			<Button size="xs" disabled={busy || !selectedRows.length} onClick={() => { void runBulk(row => env.service.tags(row.thread.id, [...(row.thread.tags ?? []), ...tags.split(',')])); }}>{t('editor.highlights.addTags')}</Button>
			<Button size="xs" variant="outline" disabled={busy || !selectedRows.length} onClick={() => { void runBulk(row => env.service.archive(row.thread.id, true)); }}>{t('editor.highlights.archive')}</Button>
			<ConfirmDialog title={t('editor.comments.delete')} description={t('editor.highlights.deleteSelectedConfirm', { count: selectedRows.length })} destructive
				onConfirm={() => runBulk(row => env.service.remove(row.thread.id))}>
				<Button size="xs" variant="destructive" disabled={busy || !selectedRows.length}>{t('editor.comments.delete')}</Button>
			</ConfirmDialog>
		</div>
		{bulkError && <p role="alert" className="text-destructive">{t('editor.highlights.partialFailure')}</p>}
	</div>;
	return <div className="huhu-comments-panel flex h-full min-h-0 flex-col bg-background text-foreground">
		<div className="space-y-2 border-b border-border p-3">
			<div className="flex h-9 items-center justify-between">
				<h2 className="text-sm font-medium">{t('editor.comments.title')} ({count})</h2>
				<div className="flex gap-1">
					<Action label={t('editor.comments.refresh')} onClick={() => { void env.service.refresh(); }}><RefreshCw /></Action>
					<Action label={t('editor.highlights.bulk')} onClick={() => setSelectMode(!selectMode)}><CheckSquare /></Action>
					<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-xs" variant="ghost" aria-label={t('editor.comments.more')}><MoreHorizontal /></Button></DropdownMenuTrigger>
						<DropdownMenuContent align="end"><DropdownMenuLabel>{t('editor.comments.sort')}</DropdownMenuLabel>
							<DropdownMenuRadioGroup value={sort} onValueChange={v => setSort(v as SortOrder)}>{(['position', 'created', 'activity'] as const).map(value =>
								<DropdownMenuRadioItem key={value} value={value}>{t(`editor.comments.${value}`)}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => { void env.exportHighlights(selectedRows.length ? selectedRows : visible).then(path => new Notice(t('editor.highlights.exported', { path })), () => new Notice(t('editor.highlights.exportFailed'))); }}><Download />{t('editor.highlights.export')}</DropdownMenuItem>
							{scope === 'current' && path && <DropdownMenuItem onSelect={event => { const target = event.currentTarget as HTMLElement; env.open({ path: path!, mode: 'resolve-all', pinned: true, ownerDocument: target.ownerDocument, rect: () => target.getBoundingClientRect() }); }}>{t('editor.comments.resolveAll')}</DropdownMenuItem>}
							<DropdownMenuItem onSelect={() => env.openSettings()}>{t('workbench.settings')}</DropdownMenuItem>
						</DropdownMenuContent></DropdownMenu>
				</div>
			</div>
			<SegmentedControl value={scope} onChange={setScope} size="sm" options={[{ value: 'current', label: t('editor.comments.current') }, { value: 'vault', label: t('editor.comments.vault') }]} />
			<Input aria-label={t('editor.highlights.search')} placeholder={t('editor.highlights.search')} value={search} onChange={event => setSearch(event.target.value)} className="h-8 text-xs" />
			<div className="flex flex-wrap items-center gap-2">
				<select aria-label={t('editor.highlights.filterColor')} value={color} onChange={event => setColor(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs">
					<option value="all">{t('editor.highlights.allColors')}</option>{colorOptions(settings).map(c => <option value={c.id} key={c.id}>{c.id.startsWith('custom-') ? c.name : t(`editor.highlights.color.${c.id}`)}</option>)}
				</select>
				<select aria-label={t('editor.highlights.groupBy')} value={groupBy} onChange={event => setGroupBy(event.target.value as HighlightGroupBy)} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs">
					{(['file', 'color', 'tag'] as const).map(key => <option key={key} value={key}>{t(`editor.highlights.group.${key}`)}</option>)}
				</select>
			</div>
			<ToggleGroup type="single" value={filter} onValueChange={value => { if (value) setFilter(value as ThreadFilter); }} className="w-full flex-wrap">
				{(['all', 'open', 'resolved'] as const).map(value => <ToggleGroupItem key={value} value={value} className="flex-auto text-xs">{t(`editor.comments.${value}`)}</ToggleGroupItem>)}
			</ToggleGroup>
			<Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setShowArchived(!showArchived)}>
				{showArchived ? t('editor.highlights.hideArchived') : t('editor.highlights.showArchived')}</Button>
		</div>
		{selectMode && bulkButtons}
		<div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
			{store.legacyData && <p role="status" className="text-xs text-status-warning">{t('editor.comments.legacy')}</p>}
			{store.damagedFiles.length > 0 && <p role="alert" className="text-xs text-destructive">{t('editor.comments.damaged')}</p>}
			{state.error && <p role="alert" className="text-xs text-destructive">{t('editor.comments.storageFailed')}</p>}
			{loading && <p role="status" className="text-xs text-muted-foreground">{t('editor.highlights.loading')}</p>}
			{loadError && <p role="alert" className="text-xs text-destructive">{t('editor.comments.storageFailed')}</p>}
			{scope === 'current' && !path ? <p className="py-8 text-center text-xs text-muted-foreground">{t('editor.comments.noFile')}</p>
				: lazyVault ? <>
					{existing.map(note => <VaultSection key={note.path} env={env} {...note} filter={filter} sort={sort} selectMode={selectMode} selected={selected} onSelect={selectedChanged} showArchived={showArchived} />)}
					{missing.length > 0 && <h3 className="text-xs text-status-warning">{t('editor.comments.missingNotes')}</h3>}
					{missing.map(note => <VaultSection key={note.path} env={env} {...note} filter={filter} sort={sort} selectMode={selectMode} selected={selected} onSelect={selectedChanged} showArchived={showArchived} />)}
				</> : grouped.map(group => <section key={group.key} className="space-y-2">
					{(groupBy !== 'file' || scope === 'vault') && <h3 className="truncate text-xs font-medium text-muted-foreground" title={group.key}>{group.key === '__untagged__' ? t('editor.highlights.untagged') : group.key}</h3>}
					{group.items.map(row => <ThreadCard key={row.thread.id} env={env} path={row.path} thread={row.thread}
						selected={selected.has(row.thread.id)} onSelect={selectMode ? selectedChanged : undefined} />)}
				</section>)}
			{scope === 'current' && path && !visible.length && <div className="space-y-2 py-6 text-center text-xs text-muted-foreground"><MessageSquareText className="mx-auto size-6" /><p>{t('editor.comments.empty')}</p></div>}
		</div>
	</div>;
}

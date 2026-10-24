import { observeBoardAction } from '../board/actions';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import { useMemo, useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, GripVertical, Plus, X } from 'lucide-react';
import { useStore } from 'zustand';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import { Progress } from '../../../../ui/components/progress';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { DashboardCard, DocNode } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { useImage } from '../board/hooks';
import { IconButton } from '../board/controls';
import { FileGlyph, RowButton } from '../board/rows';
import { fuzzyFilter } from '../../core/board/fuzzy';
import { toast } from 'sonner';
import { focalPosition } from '../../core/board/focal-point';
function DocRow({ store, card, node, path }: { store: BoardStore; card: string; node: DocNode; path: number[] }) {
	const t = useT(),
		{ setNodeRef, transform, attributes, listeners } = useSortable({
			id: `doc:${card}:${path.join('.')}`,
			data: { item: { kind: 'doc', card, path } },
		});
	return (
		<li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform) }}>
			<div className="group/doc relative flex items-center pl-5">
				<IconButton
					label={t('home.dashboard.drag')}
					className="absolute top-1/2 left-0 size-4 -translate-y-1/2 opacity-0 group-hover/doc:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-3" />
				</IconButton>
				<RowButton
					icon={<FileGlyph path={node.path} />}
					title={node.path}
					onClick={() => {
						void store.openFile(node.path, true);
					}}
				>
					{node.path.split('/').pop()?.replace(/\.md$/, '')}
				</RowButton>
				<IconButton
					label={t('home.project.unpin')}
					className="size-6 shrink-0 opacity-0 group-hover/doc:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
					onClick={() => {
						void observeBoardAction(store.sync.deleteDoc(card, path));
					}}
				>
					<X className="size-3" />
				</IconButton>
			</div>
			{node.children && (
				<ul className="m-0 ml-4 list-none p-0">
					<DocRows store={store} card={card} nodes={node.children} parent={path} />
				</ul>
			)}
		</li>
	);
}
function DocRows({
	store,
	card,
	nodes,
	parent = [],
}: {
	store: BoardStore;
	card: string;
	nodes: DocNode[];
	parent?: number[];
}) {
	return (
		<SortableContext
			items={nodes.map((_, i) => `doc:${card}:${[...parent, i].join('.')}`)}
			strategy={verticalListSortingStrategy}
		>
			{nodes.map((node, i) => (
				<DocRow key={node.path + ':' + i} store={store} card={card} node={node} path={[...parent, i]} />
			))}
		</SortableContext>
	);
}
const docPaths = (nodes: DocNode[]): string[] => nodes.flatMap((node) => [node.path, ...docPaths(node.children ?? [])]);
/** A project is a vault folder: its notes (newest change first), the ones pinned to the card, and a search inside it. */
export function ProjectCard({ store, card, fill = false }: { store: BoardStore; card: DashboardCard; fill?: boolean }) {
	const t = useT(),
		[search, setSearch] = useState(''),
		files = useStore(store.state, (s) => s.files),
		cover = useImage(store, card.coverImage);
	const column = useStore(store.state, (s) => s.data?.columns.find((c) => c.name === card.column));
	const folder = card.folder?.trim().replace(/\/+$/, '') ?? '';
	const inFolder = useMemo(() => (folder ? files.filter((file) => file.path.startsWith(`${folder}/`)) : []), [files, folder]);
	const pinned = useMemo(() => new Set(docPaths(card.docs)), [card.docs]);
	const recent = useMemo(() => inFolder.filter((file) => !pinned.has(file.path)).slice(0, 50), [inFolder, pinned]);
	const matches = useMemo(
		() => (search.trim() ? fuzzyFilter(inFolder, search, (file) => file.path.slice(folder.length + 1)) : []),
		[inFolder, search, folder],
	);
	const create = () =>
		store
			.newNote(folder, search.trim() || t('home.dashboard.newNote'), column?.libraryConfig?.templatePaths?.[0] ?? '')
			.then(() => setSearch(''))
			.catch((error: unknown) => toast(error instanceof Error ? error.message : t('home.project.createFailed')));
	if (!folder)
		return (
			<EmptyState
				size="sm"
				className="min-h-0 flex-1"
				icon={<FolderOpen />}
				title={t('home.project.chooseFolder')}
				description={t('home.project.chooseFolderHint')}
				action={
					<VaultPathField
						app={store.host.app}
						kind="folder"
						value=""
						label={t('home.project.folder')}
						onChange={(path) => {
							void observeBoardAction(store.sync.updateCard(card.id, { folder: path }));
						}}
					/>
				}
			/>
		);
	return (
		<>
			{cover && column?.showCover !== false && (
				<div className="mb-2 overflow-hidden rounded-md">
					<img
						src={cover}
						alt=""
						className="h-24 w-full max-w-none object-cover"
						style={{ objectPosition: focalPosition(card.coverPos) }}
					/>
				</div>
			)}
			<div data-project-notes className={cn('min-h-0 overflow-y-auto', fill && 'flex-1')}>
				<ul className="m-0 list-none p-0" data-project-pinned>
					<DocRows store={store} card={card.id} nodes={card.docs} />
				</ul>
				<ul className="m-0 list-none p-0" data-project-recent>
					{recent.map((file) => (
						<li key={file.path} className="pl-5">
							<RowButton
								icon={<FileGlyph path={file.path} />}
								title={file.path}
								onClick={() => {
									void store.openFile(file.path, true);
								}}
							>
								{file.basename}
							</RowButton>
						</li>
					))}
				</ul>
				{!card.docs.length && !recent.length && (
					<p className="m-0 p-3 text-center text-xs text-muted-foreground">{t('home.project.empty', { folder })}</p>
				)}
			</div>
			<div className="mt-2 flex items-center gap-2">
				<Input
					aria-label={t('home.dashboard.findNote')}
					placeholder={t('home.dashboard.findNote')}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="min-w-0 flex-1"
				/>
				<Button variant="outline" onClick={() => void create()}>
					<Plus />
					{t('home.dashboard.newNote')}
				</Button>
			</div>
			{search.trim() && (
				<div className="mt-1 max-h-36 overflow-y-auto" data-project-matches>
					{matches.length ? (
						matches.map((file) => (
							<RowButton
								key={file.path}
								icon={<FileGlyph path={file.path} />}
								title={file.path}
								onClick={() => {
									void observeBoardAction(
										store.sync.addDocToCard(card.id, file.path).then(() => setSearch('')),
									);
								}}
							>
								{file.basename}
							</RowButton>
						))
					) : (
						<p className="m-0 p-2 text-center text-xs text-muted-foreground">{t('quickActions.noResults')}</p>
					)}
				</div>
			)}
			{card.progress >= 0 && (
				<Progress value={card.progress} aria-label={t('home.dashboard.progress')} className="mt-2 h-1.5" />
			)}
		</>
	);
}

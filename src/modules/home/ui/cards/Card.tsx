import { observeBoardAction } from '../board/actions';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ExternalLink, Pin, Save, Palette } from 'lucide-react';
import type { DashboardCard } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import { Textarea } from '../../../../ui/components/textarea';
import { useT } from '../../../../ui/react/hooks';
import { memoCardText } from '../../platform/board/card-move';
import { IconButton, Choice } from '../board/controls';
import { useWidgetMenu, WidgetActions } from '../canvas/widget-frame';
import { RenameTitle } from '../board/RenameTitle';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { MemoBody } from './MemoBody';
import { TaskList } from './TaskList';
import { ImagePosition } from './ImagePosition';
import { ProjectCard } from './ProjectCard';
export function Card({
	store,
	card,
	index,
	projects = false,
	immersive = false,
}: {
	store: BoardStore;
	card: DashboardCard;
	index: number;
	projects?: boolean;
	immersive?: boolean;
}) {
	const t = useT(),
		[edit, setEdit] = useState(false),
		[draft, setDraft] = useState(card),
		[remove, setRemove] = useState(false),
		[editToken, setEditToken] = useState(0);
	const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
		disabled: immersive,
		id: `card:${card.id}`,
		data: { item: { kind: 'card', id: card.id, column: card.column, index } },
	});
	const project = projects || card.type === 'project',
		web = card.type === 'web',
		task = card.type === 'task';
	const memo = !project && !web && !task;
	const openProps = () => {
		setDraft(structuredClone(card));
		setEdit(true);
	};
	// A note card is edited where it is (colour and due date stay in the properties dialog); the other kinds keep the dialog.
	const startEdit = () => {
		if (memo) setEditToken((n) => n + 1);
		else openProps();
	};
	return (
		<article
			ref={immersive ? undefined : setNodeRef}
			className={
				immersive
					? 'dashboard-card flex h-full min-h-0 flex-col'
					: 'dashboard-card group/card relative flex min-w-0 flex-col overflow-clip rounded-lg border border-border bg-background p-3 shadow-xs transition-shadow hover:shadow-sm'
			}
			style={
				immersive
					? undefined
					: {
							transform: CSS.Transform.toString(transform),
							opacity: isDragging ? 0.4 : undefined,
							rotate: isDragging ? '2deg' : undefined,
							borderTopColor: card.color || undefined,
							borderTopWidth: card.color ? 3 : undefined,
						}
			}
		>
			{immersive ? (
				<CardTileControls
					store={store}
					card={card}
					project={project}
					web={web}
					task={task}
					onEdit={startEdit}
					onProps={memo ? openProps : undefined}
				/>
			) : (
				<div
					className="dashboard-card-header mb-1.5 flex shrink-0 items-center gap-1"
					onPointerDown={(event) => {
						if ((event.target as Element).closest('h4')) listeners?.onPointerDown?.(event);
					}}
				>
					<IconButton
						label={t('home.dashboard.drag')}
						className="absolute top-1 right-1 size-4 shrink-0 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
						{...attributes}
						{...listeners}
					>
						<GripVertical className="size-3" />
					</IconButton>
					<h4 className="m-0 min-w-0 flex-1 text-[.875em] leading-[1.3] font-semibold">
						<RenameTitle
							immersive={immersive}
							value={card.title}
							onRename={(title) => store.sync.updateCard(card.id, { title })}
						/>
					</h4>
					<div className="absolute top-2 right-2 flex rounded bg-background opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
						{!project && (
							<IconButton
								label={t('home.dashboard.pinCard')}
								onClick={() => {
									void observeBoardAction(store.sync.moveCard(card.id, card.column, 0));
								}}
							>
								<Pin className="size-3" />
							</IconButton>
						)}
						{!project && !web && (
							<IconButton
								label={t(task ? 'home.dashboard.saveDaily' : 'home.dashboard.saveNote')}
								onClick={() => {
									void store.saveCard(card);
								}}
							>
								<Save className="size-3" />
							</IconButton>
						)}
						{memo && (
							<IconButton label={t('home.dashboard.cardProps')} onClick={openProps}>
								<Palette className="size-3" />
							</IconButton>
						)}
						<IconButton label={t('common.edit')} onClick={startEdit}>
							<Pencil className="size-3" />
						</IconButton>
						<IconButton label={t('common.delete')} onClick={() => setRemove(true)}>
							<Trash2 className="size-3" />
						</IconButton>
					</div>
				</div>
			)}
			{project ? (
				<ProjectCard store={store} card={card} fill={immersive} />
			) : task ? (
				<TaskList store={store} card={card} fill={immersive} />
			) : web ? (
				<Button
					variant="ghost"
					className="h-auto justify-start whitespace-normal"
					onClick={() => {
						if (card.openIn === 'system') store.ownerWindow?.open(card.url, '_blank', 'noopener');
						else void store.host.openBrowser({ url: card.url });
					}}
				>
					<ExternalLink />
					{card.url}
				</Button>
			) : (
				<MemoBody
					key={store.memoDraftKey(card.id)}
					store={store}
					text={memoCardText(card)}
					cardId={card.id}
					editToken={editToken}
					fill={immersive}
					onSave={(text, original) => store.saveMemo(card.id, text, original)}
				/>
			)}
			{card.dueDate && (
				<div
					className={`mt-2 text-xs ${card.dueDate < new Date().toISOString().slice(0, 10) ? 'text-destructive' : 'text-muted-foreground'}`}
				>
					{card.dueDate}
				</div>
			)}
			{edit && (
				<DashboardDialog
					title={t('common.edit')}
					onClose={() => setEdit(false)}
					onSave={() => {
						void observeBoardAction(store.sync.updateCard(card.id, draft).then(() => setEdit(false)));
					}}
				>
					<Label className="grid gap-2">
						{t('home.dashboard.name')}
						<Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
					</Label>
					{web ? (
						<>
							<Label className="grid gap-2">
								{t('home.dashboard.url')}
								<Input
									value={draft.url}
									onChange={(e) => setDraft({ ...draft, url: e.target.value })}
								/>
							</Label>
							<Choice
								label={t('home.dashboard.openIn')}
								value={draft.openIn ?? 'tab'}
								onChange={(openIn) => setDraft({ ...draft, openIn: openIn as 'tab' | 'system' })}
								options={[
									{ value: 'tab', label: t('home.dashboard.browserTab') },
									{ value: 'system', label: t('home.dashboard.systemBrowser') },
								]}
							/>
						</>
					) : project ? (
						<>
							<Label className="grid gap-2">
								{t('home.project.folder')}
								<VaultPathField
									app={store.host.app}
									kind="folder"
									value={draft.folder ?? ''}
									label={t('home.project.folder')}
									onChange={(folder) => setDraft({ ...draft, folder })}
								/>
							</Label>
							<ImagePosition
								store={store}
								path={draft.coverImage}
								raw={draft.coverPos}
								onChange={(x, y) => setDraft({ ...draft, coverPos: `${x},${y}` })}
							/>
							<Label className="grid gap-2">
								{t('home.dashboard.image')}
								<Input
									value={draft.coverImage}
									onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })}
								/>
							</Label>
						</>
					) : task ? (
						<Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
					) : null}
					{!project && !task && !web && (
						<Label className="grid gap-2">
							{t('renderer.setMemoColor')}
							<div className="flex gap-2">
								{['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'].map(
									(color, i) => (
										<Button
											key={color}
											variant="ghost"
											size="icon-xs"
											aria-label={t(`home.dashboard.color.${color}`)}
											style={{ backgroundColor: `var(--db-memo-${color})` }}
											onClick={() =>
												setDraft({
													...draft,
													color: [
														'#ef4444',
														'#f97316',
														'#eab308',
														'#22c55e',
														'#06b6d4',
														'#3b82f6',
														'#a855f7',
														'#ec4899',
													][i]!,
												})
											}
										/>
									),
								)}
							</div>
						</Label>
					)}
					<Input
						type="date"
						aria-label={t('home.dashboard.due')}
						value={draft.dueDate}
						onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
					/>
				</DashboardDialog>
			)}
			{remove && (
				<DashboardDialog title={t('common.delete')} onClose={() => setRemove(false)}>
					<p>{card.title}</p>
					<Button
						variant="destructive"
						onClick={() => {
							void observeBoardAction(store.sync.deleteCard(card.id));
						}}
					>
						{t('common.delete')}
					</Button>
				</DashboardDialog>
			)}
		</article>
	);
}

/**
 * A card shown as a tile of its own: the card around it names it and removes it, so only what a card can do besides
 * that is added to the title bar (edit) and the menu (pin, save).
 */
function CardTileControls({
	store,
	card,
	project,
	web,
	task,
	onEdit,
	onProps,
}: {
	store: BoardStore;
	card: DashboardCard;
	project: boolean;
	web: boolean;
	task: boolean;
	onEdit(this: void): void;
	onProps?(this: void): void;
}) {
	const t = useT();
	useWidgetMenu([
		...(project || web
			? []
			: [
					{
						id: 'save',
						label: t(task ? 'home.dashboard.saveDaily' : 'home.dashboard.saveNote'),
						icon: <Save />,
						onSelect: () => {
							void store.saveCard(card);
						},
					},
				]),
		...(onProps
			? [{ id: 'props', label: t('home.dashboard.cardProps'), icon: <Palette />, onSelect: onProps }]
			: []),
	]);
	return (
		<WidgetActions>
			<IconButton label={t('common.edit')} onClick={onEdit}>
				<Pencil />
			</IconButton>
		</WidgetActions>
	);
}

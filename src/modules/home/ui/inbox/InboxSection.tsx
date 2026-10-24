import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { ExternalLink, FileText, Inbox, PencilLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { useT } from '../../../../ui/react/hooks';
import { nowMoment } from '../../../../host/obsidian/datetime';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import { captureDayOf } from '../../../../shared/storage/vault-layout';
import {
	createMemoFile,
	inboxRoot,
	isCaptureFile,
	listMemos,
	memoTitle,
} from '../../platform/vault/memo-files';
import type { BoardStore } from '../../services/board-store';
import { IconButton } from '../board/controls';
import { FileGlyph } from '../board/rows';
import { WidgetActions } from '../canvas/widget-frame';
import { RecordConfirm } from '../dialogs/RecordConfirm';
import { CaptureComposer } from './CaptureComposer';
import { useTodayCaptures } from './use-today-captures';

/**
 * The inbox section (type id `memo`): the notes of the inbox folder, a strip for fleeting capture at the bottom and,
 * when the card is wide, today's captures beside the list.
 *
 *   - Every item is a Markdown file in the inbox folder (`huhu/收件箱/YYYY-MM-DD-HHmm-标题.md`), the most recently
 *     modified first; the fleeting thoughts of a day are one more file there (`YYYY-MM-DD-闪念.md`). The board keeps
 *     no text of its own. A click opens a file in a new tab.
 *   - The capture strip sits at the foot of the card at every size, so it never moves when the card is resized.
 *   - From 36rem wide, the list gets a column on the left and today's captures (newest first) one on the right; the
 *     headings with counts join them when the card is also at least 15rem tall.
 */
export function InboxSection({ store }: { store: BoardStore }) {
	const t = useT(),
		files = useStore(store.state, (state) => state.files),
		memoSavePath = useStore(store.state, (state) => state.settings.memoSavePath),
		root = inboxRoot({ memoSavePath }),
		items = useMemo(() => listMemos(files, root), [files, root]),
		today = useTodayCaptures(store),
		[adding, setAdding] = useState(false),
		[removing, setRemoving] = useState<ContentFile | null>(null);
	const open = (path: string) => void store.openFile(path);
	const failed = (error: unknown, fallback: string) => toast(error instanceof Error ? error.message : fallback);
	return (
		<div data-inbox className="flex h-full min-h-0 min-w-0 flex-col gap-2">
			<WidgetActions>
				<IconButton label={t('home.inbox.new')} onClick={() => setAdding(true)}>
					<Plus />
				</IconButton>
			</WidgetActions>
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 @xl:grid-cols-2">
				<section data-inbox-items className="flex min-h-0 min-w-0 flex-col">
					<Heading icon={<FileText />} label={t('home.inbox.items')} count={items.length} />
					<div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
						{adding && (
							<NewItem
								root={root}
								store={store}
								onDone={() => setAdding(false)}
								onFail={(error) => failed(error, t('home.inbox.createFailed'))}
							/>
						)}
						{items.length ? (
							<ul data-memo-list className="m-0 flex list-none flex-col gap-0.5 p-0">
								{items.map((file) => (
									<ItemRow key={file.path} file={file} onOpen={open} onRemove={setRemoving} />
								))}
							</ul>
						) : (
							!adding && (
								<p
									data-inbox-empty
									className="m-0 flex h-full min-h-10 items-center justify-center gap-2 px-2 text-center text-xs text-muted-foreground"
								>
									<Inbox aria-hidden className="size-4 shrink-0" />
									<span className="min-w-0">{t('home.inbox.empty')}</span>
								</p>
							)
						)}
					</div>
				</section>
				<section
					data-inbox-today
					className="hidden min-h-0 min-w-0 flex-col border-l border-border pl-3 @xl:flex"
				>
					<Heading
						icon={<PencilLine />}
						label={t('home.inbox.today')}
						count={today.entries.length}
						action={
							<IconButton
								label={t('home.inbox.openToday')}
								disabled={!today.exists}
								onClick={() => open(today.path)}
							>
								<ExternalLink />
							</IconButton>
						}
					/>
					<div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
						{today.entries.length ? (
							<ol data-inbox-captures className="m-0 flex list-none flex-col gap-0.5 p-0">
								{today.entries.map((entry, index) => (
									<li key={`${today.entries.length - index}-${entry.time}`} className="min-w-0">
										<Button
											type="button"
											variant="ghost"
											title={t('home.inbox.openToday')}
											className="h-auto min-h-9 w-full min-w-0 items-start justify-start gap-2 px-2 py-1.5 text-left font-normal whitespace-normal"
											onClick={() => open(today.path)}
										>
											<time className="mt-px w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
												{entry.time}
											</time>
											<span className="line-clamp-3 min-w-0 flex-1 text-sm break-words whitespace-pre-line">
												{entry.text}
											</span>
										</Button>
									</li>
								))}
							</ol>
						) : (
							<p
								data-inbox-today-empty
								className="m-0 flex h-full min-h-10 items-center justify-center gap-2 px-2 text-center text-xs text-muted-foreground"
							>
								<PencilLine aria-hidden className="size-4 shrink-0" />
								<span className="min-w-0">{t('home.inbox.todayEmpty')}</span>
							</p>
						)}
					</div>
				</section>
			</div>
			<CaptureComposer
				store={store}
				count={today.entries.length}
				countClassName="[@container(min-width:36rem)_and_(min-height:15rem)]:hidden"
				onOpenToday={() => open(today.path)}
			/>
			<RecordConfirm
				open={removing !== null}
				onOpenChange={(next) => {
					if (!next) setRemoving(null);
				}}
				title={t('home.inbox.deleteTitle')}
				description={t('home.inbox.deleteConfirm', { name: removing ? rowTitle(removing, t) : '' })}
				onConfirm={() => {
					const file = removing;
					setRemoving(null);
					if (file) void store.trash(file).catch((error: unknown) => failed(error, t('home.inbox.deleteFailed')));
				}}
			/>
		</div>
	);
}

/** The name a file goes by in the list: its title without the date stamp, or "date + 闪念" for a day's captures. */
function rowTitle(file: ContentFile, t: ReturnType<typeof useT>): string {
	const day = captureDayOf(file.basename);
	return day ? t('home.inbox.captureDay', { date: day }) : memoTitle(file);
}

/**
 * A small heading over a column: icon, label, count, and optionally one action at the end. It is only drawn when the
 * card is wide and tall enough for two columns with a heading over each (36rem by 15rem); below that the rows
 * get the room.
 */
function Heading({
	icon,
	label,
	count,
	action,
}: {
	icon: ReactNode;
	label: string;
	count: number;
	action?: ReactNode;
}) {
	return (
		<header className="hidden h-7 shrink-0 items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground [@container(min-width:36rem)_and_(min-height:15rem)]:flex [&>svg]:size-3.5">
			{icon}
			<h4 className="m-0 min-w-0 truncate text-xs font-medium">{label}</h4>
			<span className="tabular-nums">{count}</span>
			<span className="flex-1" />
			{action}
		</header>
	);
}

function ItemRow({
	file,
	onOpen,
	onRemove,
}: {
	file: ContentFile;
	onOpen(this: void, path: string): void;
	onRemove(this: void, file: ContentFile): void;
}) {
	const t = useT(),
		capture = isCaptureFile(file),
		title = rowTitle(file, t);
	return (
		<li data-inbox-item data-capture-file={capture || undefined} className="group/row min-w-0">
			<div className="flex h-9 items-center gap-1 rounded-md pr-1 pl-2 focus-within:bg-accent hover:bg-accent dark:focus-within:bg-accent/50 dark:hover:bg-accent/50">
				<Button
					type="button"
					variant="ghost"
					title={file.path}
					className="h-full min-w-0 flex-1 justify-start gap-2 px-0 font-normal hover:bg-transparent dark:hover:bg-transparent"
					onClick={() => onOpen(file.path)}
				>
					{capture ? (
						<span aria-hidden className="inline-flex shrink-0 text-primary">
							<PencilLine className="size-4" />
						</span>
					) : (
						<FileGlyph path={file.path} />
					)}
					<span className="min-w-0 flex-1 truncate text-left text-sm">{title}</span>
				</Button>
				<div className="relative flex h-full min-w-[4.5rem] shrink-0 items-center justify-end">
					<RelativeTime
						value={file.stat.mtime}
						className="text-xs text-muted-foreground tabular-nums group-focus-within/row:invisible group-hover/row:invisible pointer-coarse:hidden"
					/>
					<div className="invisible absolute inset-y-0 right-0 flex items-center gap-0.5 group-focus-within/row:visible group-hover/row:visible pointer-coarse:visible">
						<IconButton label={t('home.inbox.open')} onClick={() => onOpen(file.path)}>
							<ExternalLink />
						</IconButton>
						<IconButton
							label={t('home.inbox.delete')}
							className="hover:text-destructive"
							onClick={() => onRemove(file)}
						>
							<Trash2 />
						</IconButton>
					</div>
				</div>
			</div>
		</li>
	);
}

/** The field that opens at the top of the list for a new item: Enter creates the note and opens it, Escape or an empty blur cancels. */
function NewItem({
	root,
	store,
	onDone,
	onFail,
}: {
	root: string;
	store: BoardStore;
	onDone(this: void): void;
	onFail(this: void, error: unknown): void;
}) {
	const t = useT(),
		[name, setName] = useState(''),
		busy = useRef(false);
	const create = () => {
		if (busy.current) return;
		busy.current = true;
		void createMemoFile(store.host.app, root, name.trim() || t('home.inbox.defaultTitle'), '', nowMoment())
			.then((file) => {
				onDone();
				return store.openFile(file.path);
			})
			.catch(onFail)
			.finally(() => {
				busy.current = false;
			});
	};
	return (
		<div data-inbox-new className="pb-1">
			<Input
				autoFocus
				spellCheck={false}
				className="h-8 text-sm"
				aria-label={t('home.inbox.newLabel')}
				placeholder={t('home.inbox.newPlaceholder')}
				value={name}
				onChange={(event) => setName(event.target.value)}
				onBlur={() => {
					if (!name.trim()) onDone();
				}}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (event.key === 'Enter') {
						event.preventDefault();
						create();
					} else if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						onDone();
					}
				}}
			/>
		</div>
	);
}

// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts (renderReadingWidget)
import { useLayoutEffect, useState } from 'react';
import { BookOpen, ChartColumn, Ellipsis, Pause, Pencil, Play, Plus, Square, Trash2 } from 'lucide-react';
import { RecordConfirm } from '../dialogs/RecordConfirm';
import { RecordSaveStatus as SaveStatus } from '../dialogs/RecordSaveStatus';
import { resolveCoverAsObjectUrl } from '../../platform/reading/book-service';
import type { BookInfo, ReadingService } from '../../platform/reading/reading-service';
import { Button } from '../../../../ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Progress } from '../../../../ui/components/progress';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { useService } from '../widgets/use-record-service';
export function formatTimer(seconds: number): string {
	const hours = Math.floor(seconds / 3600),
		minutes = Math.floor((seconds % 3600) / 60),
		remainder = seconds % 60;
	return (
		(hours ? `${String(hours).padStart(2, '0')}:` : '') +
		`${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
	);
}
function BookCover({ book, service }: { book: BookInfo; service: ReadingService }) {
	const [url, setUrl] = useState('');
	useLayoutEffect(() => {
		let disposed = false;
		let owned = '';
		if (book.coverUrl)
			void resolveCoverAsObjectUrl(book.coverUrl, service.getApp()).then((value) => {
				if (disposed) {
					if (value.startsWith('blob:')) URL.revokeObjectURL(value);
				} else {
					owned = value;
					setUrl(value || '');
				}
			});
		return () => {
			disposed = true;
			if (owned.startsWith('blob:')) URL.revokeObjectURL(owned);
		};
	}, [book.coverUrl, service]);
	return (
		<div
			className="flex w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted bg-cover bg-center p-1 text-center text-3xs leading-tight text-muted-foreground"
			style={book.coverUrl && url ? { backgroundImage: `url(${url})` } : undefined}
		>
			{(!book.coverUrl || !url) && (
				<span className="line-clamp-4 break-all">
					{book.title.length > 8 ? book.title.slice(0, 8) + '..' : book.title}
				</span>
			)}
		</div>
	);
}
/** The reading list: one card per book (cover, title, timer, progress); the tile scrolls when there are more. */
export function ReadingPanel({
	service,
	add,
	statistics,
	edit,
	finish,
}: {
	service: ReadingService;
	add: () => void;
	statistics: () => void;
	edit: (book: BookInfo) => void;
	finish: (book: BookInfo) => void;
}) {
	useService(service);
	const t = useT(),
		state = service.getState(),
		books = service.getActiveBooks(),
		[removing, setRemoving] = useState<string | null>(null);
	return (
		<div data-reading className="flex h-full min-h-0 flex-col gap-2">
			<SaveStatus source={service} />
			<RecordConfirm
				open={removing !== null}
				onOpenChange={(open) => {
					if (!open) setRemoving(null);
				}}
				title={t('reading.editDeleteBook')}
				description={t('reading.removeBookConfirm', { title: removing ?? '' })}
				onConfirm={() => {
					if (removing !== null) void service.removeActiveBook(removing);
					setRemoving(null);
				}}
			/>
			<WidgetActions>
				<IconButton label={t('reading.selectBook')} onClick={add}>
					<Plus />
				</IconButton>
				<IconButton label={t('reading.statsTitle')} onClick={statistics}>
					<ChartColumn />
				</IconButton>
			</WidgetActions>
			{books.length === 0 ? (
				<EmptyState
					size="sm"
					className="min-h-0 flex-1"
					icon={<BookOpen />}
					title={t('reading.empty')}
					action={
						<Button variant="outline" onClick={add}>
							<Plus />
							{t('reading.selectBook')}
						</Button>
					}
				/>
			) : (
				<ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-0">
					{books.map((book) => {
						const active = state.status !== 'idle' && state.currentBook?.title === book.title,
							running = active && state.status === 'running';
						const seconds = service.getTodaySecondsForBook(book.title),
							hours = Math.floor(seconds / 3600),
							minutes = Math.floor((seconds % 3600) / 60);
						const percent = book.finished
							? 100
							: book.totalPages > 0
								? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
								: 0;
						return (
							<li
								key={book.title + ':' + book.isbn}
								data-book={book.title}
								className={cn(
									'flex min-w-0 shrink-0 gap-3 rounded-lg border border-border p-2.5',
									active && 'border-primary/60 bg-accent/40',
								)}
							>
								<BookCover book={book} service={service} />
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex items-start gap-1">
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm leading-5 font-medium" title={book.title}>
												{book.title}
											</div>
											{book.author && (
												<div className="truncate text-xs text-muted-foreground">
													{book.author}
												</div>
											)}
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon-xs"
													aria-label={t('reading.moreActions', { title: book.title })}
												>
													<Ellipsis />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onSelect={() => edit(book)}>
													<Pencil />
													{t('reading.editTitle')}
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onSelect={() => setRemoving(book.title)}
												>
													<Trash2 />
													{t('reading.editDeleteBook')}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<div className="mt-auto flex items-center gap-1">
										<span
											className={cn(
												'text-sm font-medium tabular-nums',
												!active && 'text-muted-foreground',
											)}
										>
											{active
												? formatTimer(state.elapsedSeconds)
												: seconds > 0
													? hours
														? `${hours}h${minutes ? minutes + 'm' : ''}`
														: `${minutes}m`
													: '--'}
										</span>
										<span className="flex-1" />
										<IconButton
											label={t(running ? 'home.dashboard.pause' : 'reading.start')}
											onClick={() => {
												if (running) service.pause();
												else if (active) service.resume();
												else service.startReading(book);
											}}
										>
											{running ? <Pause /> : <Play />}
										</IconButton>
										{active && (
											<IconButton
												label={t('reading.endTitle')}
												onClick={() => {
													if (running) service.pause();
													finish(book);
												}}
											>
												<Square />
											</IconButton>
										)}
									</div>
									{book.totalPages > 0 && (
										<div className="flex items-center gap-2">
											<Progress value={percent} className="h-1.5 flex-1" />
											<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
												{book.finished ? '100%' : `${book.currentPage}/${book.totalPages}`}
											</span>
										</div>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

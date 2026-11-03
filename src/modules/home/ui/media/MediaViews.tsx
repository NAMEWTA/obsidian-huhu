// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/media-section.ts
import { Platform, type App } from 'obsidian';
import { type ContentFile } from '../../../../host/obsidian/storage/content-files';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Film, ImageOff, Pencil, Play, Tags as TagsIcon, Trash2 } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Skeleton } from '../../../../ui/components/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { cn } from '../../../../ui/lib/utils';
import { resolveVaultImage } from './image-resource';
import {
	formatDate,
	formatFileSize,
	getMediaBacklinks,
	type MediaFileResult,
	type MediaKind,
	type ThumbSize,
} from './media-presentation';
import { renameMediaFile } from './media-utils';

/** A file that cannot be shown keeps its place in the grid and says why. */
export function MediaUnavailable({ name, compact = false, missing = false }: { name: string; compact?: boolean; missing?: boolean }) {
	const text = missing ? t('media.fileMissing') : t('media.loadFailed', { name });
	return (
		<div
			role="img"
			aria-label={text}
			data-media-unavailable=""
			className="flex size-full min-h-0 flex-col items-center justify-center gap-1 overflow-hidden bg-muted p-1 text-center text-xs text-foreground"
		>
			<ImageOff className="size-5 shrink-0" aria-hidden />
			{!compact && <span className="line-clamp-2 block w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{text}</span>}
		</div>
	);
}

/** Decoder ownership follows the video node, including source replacement. */
export function MediaVideo({
	src,
	className,
	play = false,
	onError,
}: {
	src: string;
	className: string;
	play?: boolean;
	onError?: () => void;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	useLayoutEffect(() => {
		const video = ref.current;
		if (!video) return;
		if (video.getAttribute('src') !== src) video.setAttribute('src', src);
		return () => {
			try {
				video.pause();
			} catch {
				/* detached decoder */
			}
			video.removeAttribute('src');
			try {
				video.load();
			} catch {
				/* detached decoder */
			}
		};
	}, [src]);
	return (
		<video
			ref={ref}
			src={src}
			className={className}
			preload="metadata"
			muted={!play}
			playsInline
			controls={play}
			autoPlay={play}
			onError={onError}
		/>
	);
}
function Thumb({ app, result, kind, large }: { app: App; result: MediaFileResult; kind: MediaKind; large: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const src = resolveVaultImage(app, result.path);
	// The load result belongs to one source; a replaced file starts loading again.
	const [loaded, setLoaded] = useState<{ src: string | null; status: 'ready' | 'failed' }>({ src: null, status: 'ready' });
	const state = loaded.src === src ? loaded.status : 'loading';
	const setState = (status: 'ready' | 'failed') => setLoaded({ src, status });
	useLayoutEffect(() => {
		const root = ref.current;
		if (!root || kind !== 'video' || Platform.isMobile) return;
		const Observer = root.ownerDocument.defaultView?.IntersectionObserver;
		if (!Observer) return;
		const observer = new Observer(
			(entries) => {
				for (const entry of entries) setVisible(entry.isIntersecting);
			},
			{ rootMargin: '300px' },
		);
		observer.observe(root);
		return () => observer.disconnect();
	}, [kind, src]);
	if (!src) return <MediaUnavailable name={result.basename} compact={!large} missing />;
	if (kind === 'image') {
		if (state === 'failed') return <MediaUnavailable name={result.basename} compact={!large} />;
		return (
			<div className="relative size-full overflow-hidden bg-muted">
				{state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" aria-hidden />}
				<img
					className="block size-full object-cover"
					src={src}
					alt={result.basename}
					loading="lazy"
					onLoad={() => setState('ready')}
					onError={() => setState('failed')}
				/>
			</div>
		);
	}
	if (state === 'failed') return <MediaUnavailable name={result.basename} compact={!large} />;
	return (
		<div ref={ref} className="relative size-full overflow-hidden bg-muted text-foreground">
			{!visible && (
				<div className="flex size-full items-center justify-center">
					<Film className="size-[30%] min-h-4 min-w-4" aria-hidden />
					{large && formatFileSize(result.size) && (
						<span className="pointer-events-none absolute right-1 bottom-7 rounded bg-background/90 px-1.5 text-[11px] leading-4 text-foreground">
							{formatFileSize(result.size)}
						</span>
					)}
				</div>
			)}
			{visible && (
				<MediaVideo key={src} src={src} className="block size-full object-cover" onError={() => setState('failed')} />
			)}
			{large && (
				<span className="pointer-events-none absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground">
					<Play className="size-4" aria-hidden />
				</span>
			)}
		</div>
	);
}
function TagChips({ tags, limit }: { tags: string[]; limit: number }) {
	return (
		<>
			{tags.slice(0, limit).map((tag) => (
				<span key={tag} className="max-w-24 truncate rounded bg-secondary px-1.5 text-[11px] leading-4 text-secondary-foreground">
					{tag}
				</span>
			))}
			{tags.length > limit && (
				<span className="rounded px-1 text-[11px] leading-4 text-muted-foreground">+{tags.length - limit}</span>
			)}
		</>
	);
}
function RowAction({ label, className, children, ...props }: { label: string; className?: string; children: ReactNode } & Omit<React.ComponentProps<typeof Button>, 'children'>) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="secondary" size="icon-sm" aria-label={label} className={className} {...props}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
/** Rename keeps the typed name on failure and says that the old name is still in effect. */
function MediaName({ app, result, refresh }: { app: App; result: MediaFileResult; refresh: () => void }) {
	const [editing, setEditing] = useState(false),
		[busy, setBusy] = useState(false),
		[failed, setFailed] = useState(false),
		[name, setName] = useState(result.basename);
	const input = useRef<HTMLInputElement>(null),
		composing = useRef(false);
	useLayoutEffect(() => {
		if (editing) {
			input.current?.focus();
			input.current?.select();
		}
	}, [editing]);
	const cancel = () => {
		setEditing(false);
		setFailed(false);
		setName(result.basename);
	};
	const save = async () => {
		if (busy) return;
		const next = name.trim();
		if (!next || next === result.basename) return cancel();
		setBusy(true);
		setFailed(false);
		try {
			await renameMediaFile(app, result.file, next);
			setEditing(false);
			refresh();
		} catch (error) {
			console.error('[Dashboard] media rename failed', error);
			setFailed(true);
			input.current?.focus();
		} finally {
			setBusy(false);
		}
	};
	if (!editing)
		return (
			<div className="flex min-w-0 items-center gap-1">
				<span className="min-w-0 flex-1 truncate text-sm text-foreground" onDoubleClick={() => setEditing(true)}>
					{result.basename}
				</span>
				<RowAction label={t('media.renameFile', { name: result.basename })} className="size-8 bg-transparent" onClick={() => setEditing(true)}>
					<Pencil />
				</RowAction>
			</div>
		);
	return (
		<div className="min-w-0" aria-busy={busy}>
			<Input
				ref={input}
				value={name}
				disabled={busy}
				aria-label={t('media.renameFile', { name: result.basename })}
				aria-invalid={failed || undefined}
				onChange={(e) => setName(e.currentTarget.value)}
				onCompositionStart={() => (composing.current = true)}
				onCompositionEnd={() => (composing.current = false)}
				onBlur={() => (failed ? cancel() : void save())}
				onKeyDown={(e) => {
					if (e.nativeEvent.isComposing || composing.current) return;
					if (e.key === 'Enter') {
						e.preventDefault();
						void save();
					} else if (e.key === 'Escape') {
						e.preventDefault();
						e.stopPropagation();
						cancel();
					}
				}}
			/>
			{busy && (
				<p role="status" className="m-0 pt-1 text-xs text-muted-foreground">
					{t('media.renaming')}
				</p>
			)}
			{failed && (
				<p role="alert" className="m-0 mt-1 border-l-2 border-destructive pl-2 text-xs text-foreground">
					{t('media.renameFailedNamed', { name: result.basename })}
				</p>
			)}
		</div>
	);
}
const reveal =
	'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100';
export function MediaViews({
	app,
	results,
	kind,
	size,
	view,
	open,
	remove,
	refresh,
	openNote,
	editTags,
}: {
	app: App;
	results: MediaFileResult[];
	kind: MediaKind;
	size: ThumbSize;
	view: 'grid' | 'list';
	open: (index: number) => void;
	remove: (file: ContentFile) => void;
	refresh: () => void;
	openNote?: (file: ContentFile) => void;
	editTags?: (result: MediaFileResult) => void;
}) {
	const grid = view === 'grid';
	return (
		<ul
			data-card-grid={grid ? '' : undefined}
			data-media-view={view}
			data-thumb-size={size}
			className={cn(
				'm-0 list-none p-0',
				grid
					? cn(
							'grid',
							size === 'small' && 'grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-1.5',
							size === 'medium' && 'grid-cols-[repeat(auto-fill,minmax(8.125rem,1fr))] gap-2',
							size === 'large' && 'grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2.5',
						)
					: 'flex flex-col gap-1',
			)}
		>
			{results.map((result, index) => {
				const links = grid ? [] : getMediaBacklinks(app, result.file);
				const actions = (
					<>
						{editTags && (
							<RowAction
								label={t('media.editTags')}
								className={cn(grid ? cn('absolute top-1 left-12', reveal) : 'bg-transparent')}
								onClick={() => editTags(result)}
							>
								<TagsIcon />
							</RowAction>
						)}
						<RowAction
							label={`${t('media.delete')}: ${result.basename}`}
							className={cn(grid && 'absolute top-1 left-1', grid && reveal, !grid && 'bg-transparent hover:text-destructive')}
							onClick={() => remove(result.file)}
						>
							<Trash2 />
						</RowAction>
					</>
				);
				return grid ? (
					<li
						key={result.path}
						className="group relative aspect-square overflow-hidden rounded-md border border-border bg-card motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
					>
						<button
							type="button"
							aria-label={result.basename}
							data-hit-control
							className="block size-full cursor-pointer rounded-md p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							onClick={() => open(index)}
						>
							<Thumb app={app} result={result} kind={kind} large />
						</button>
						<div data-media-caption className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/90 px-2 py-1 text-foreground">
							<div className="truncate text-xs leading-4">{result.basename}</div>
							{result.tags.length > 0 && size !== 'small' && (
								<div className="flex flex-wrap gap-1 pt-0.5">
									<TagChips tags={result.tags} limit={2} />
								</div>
							)}
						</div>
						{actions}
					</li>
				) : (
					<li key={result.path} className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2">
						<button
							type="button"
							aria-label={result.basename}
							data-hit-control
							className="block size-11 shrink-0 cursor-pointer overflow-hidden rounded-md p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							onClick={() => open(index)}
						>
							<Thumb app={app} result={result} kind={kind} large={false} />
						</button>
						<div className="min-w-0 flex-1">
							<MediaName app={app} result={result} refresh={refresh} />
							<div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
								{result.path} · {formatDate(result.mtime)}
							</div>
							{result.tags.length > 0 && (
								<div className="flex flex-wrap gap-1 pt-1">
									<TagChips tags={result.tags} limit={3} />
								</div>
							)}
							{links.length > 0 && (
								<div className="flex flex-wrap gap-1 pt-1">
									{links.slice(0, 5).map((file) => (
										<Button
											key={file.path}
											variant="outline"
											size="xs"
											className="max-w-36"
											onClick={() => openNote?.(file)}
										>
											{file.basename}
										</Button>
									))}
									{links.length > 5 && <span className="px-1 text-xs text-muted-foreground">+{links.length - 5}</span>}
								</div>
							)}
						</div>
						<div className="flex shrink-0 items-center">{actions}</div>
					</li>
				);
			})}
		</ul>
	);
}

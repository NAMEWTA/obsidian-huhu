// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/music-widget.ts; player layout after the iOS Music widget.
import { Popover, PopoverAnchor, PopoverContent } from '../../../../ui/components/popover';
import { useDashboardAppearance, useDashboardLayout } from '../theme/ThemeBridge';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Slider } from '../../../../ui/components/slider';
import { Notice } from 'obsidian';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	ImageIcon,
	ListMusic,
	Music,
	Pause,
	Play,
	Plus,
	Repeat,
	Repeat1,
	Check,
	Search,
	Shuffle,
	SkipBack,
	SkipForward,
	Volume2,
	X,
} from 'lucide-react';
import type { MusicTrack } from '../../core/board/types';
import type { MusicService } from '../../platform/music/music-service';
import { musicMediaBlob } from '../../platform/music/media-bytes';
import { fetchLyric, isPlayableByFee, searchMusic, type LyricLine } from '../../platform/music/netease-client';
import { t } from '../../../../shared/i18n';
import { cn } from '../../../../ui/lib/utils';
import { IconButton } from '../board/controls';
import { useWidgetMenu, WidgetActions } from '../canvas/widget-frame';
function time(sec: number): string {
	const s = Math.max(0, Math.floor(sec));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function MusicPanel({
	service,
	root,
	background,
}: {
	service: MusicService;
	root: HTMLElement;
	background?: () => void;
}) {
	const appearance = useDashboardAppearance(true),
		layout = useDashboardLayout(),
		opener = useRef<HTMLElement | null>(null);
	const anchor = useMemo(
		() => ({
			current: {
				getBoundingClientRect: () =>
					(root.closest('.dashboard-sidebar-widget') ?? root).getBoundingClientRect(),
				contextElement: root,
			},
		}),
		[root],
	);
	const [, refresh] = useState(0),
		[panel, setPanel] = useState<'none' | 'playlist' | 'search'>('none'),
		[volume, setVolume] = useState(false),
		[lyricResult, setLyrics] = useState<{ id: number; lines: LyricLine[] } | null>(null),
		[failedCover, setFailedCover] = useState(''),
		[cover, setCover] = useState<{ source: string; url: string } | null>(null);
	useLayoutEffect(() => service.subscribe(() => refresh((n) => n + 1)), [service]);
	const state = service.getState(),
		track = state.current,
		trackId = track?.id;
	useLayoutEffect(() => {
		let active = true,
			objectUrl = '';
		if (track?.picUrl)
			void musicMediaBlob(track.picUrl, 'image/jpeg')
				.then((blob) => {
					if (!active) return;
					objectUrl = URL.createObjectURL(blob);
					setCover({ source: track.picUrl!, url: objectUrl });
					setFailedCover('');
				})
				.catch(() => {
					if (active) setFailedCover(track.picUrl!);
				});
		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [track?.picUrl]);
	useLayoutEffect(() => {
		let active = true;
		if (trackId != null)
			void fetchLyric(trackId)
				.then((lines) => {
					if (active) setLyrics({ id: trackId, lines });
				})
				.catch(() => {});
		return () => {
			active = false;
		};
	}, [trackId]);
	const coverUrl = cover?.source === track?.picUrl ? (cover?.url ?? '') : '';
	const lyrics = lyricResult?.id === trackId ? (lyricResult?.lines ?? []) : [];
	let lyric = '';
	for (const line of lyrics) {
		if (line.timeMs > state.positionSec * 1000) break;
		lyric = line.text;
	}
	const duration = Math.max(0, state.durationSec),
		position = Math.min(state.positionSec, duration),
		playing = state.status === 'playing';
	const [drag, setDrag] = useState<number | null>(null),
		shown = drag ?? position;
	useWidgetMenu(
		background
			? [{ id: 'background', label: t('wbg.title'), icon: <ImageIcon />, onSelect: background }]
			: [],
	);
	const control = (icon: React.ReactNode, label: string, action: () => void, className = '') => (
		<IconButton
			label={t(label)}
			className={className}
			onClick={(e) => {
				e.stopPropagation();
				opener.current = e.currentTarget;
				action();
			}}
		>
			{icon}
		</IconButton>
	);
	return (
		<Popover
			open={panel !== 'none'}
			onOpenChange={(open) => {
				if (!open) setPanel('none');
			}}
		>
			<PopoverAnchor virtualRef={anchor} />
			<WidgetActions>
				{control(<Search />, 'music.search', () => setPanel(panel === 'search' ? 'none' : 'search'))}
				{control(<ListMusic />, 'music.playlist', () => setPanel(panel === 'playlist' ? 'none' : 'playlist'))}
			</WidgetActions>
			<div data-music className="flex h-full min-h-0 min-w-0 items-stretch gap-3 @lg:gap-4">
				<div className="relative flex h-[min(100cqh,40cqw,11rem)] w-[min(100cqh,40cqw,11rem)] shrink-0 items-center justify-center self-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
					<img
						key={coverUrl}
						className="absolute inset-0 size-full object-cover"
						src={coverUrl || undefined}
						loading="lazy"
						alt={track?.name ?? ''}
						hidden={!coverUrl || failedCover === coverUrl}
						onError={() => setFailedCover(coverUrl)}
					/>
					<Music className="size-1/3" aria-hidden />
				</div>
				<div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
					<div className="min-w-0">
						<div className="truncate text-sm leading-5 font-semibold" title={track?.name}>
							{track?.name ?? t('music.noTrack')}
						</div>
						<div className="truncate text-xs text-muted-foreground">
							{track?.artist ?? t('music.emptyHint')}
						</div>
						{lyric && (
							<div className="mt-1 hidden truncate text-xs text-muted-foreground [@container(min-height:150px)]:block">
								{lyric}
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						<span className="hidden w-9 shrink-0 text-xs text-muted-foreground tabular-nums @xs:block">
							{time(shown)}
						</span>
						<Slider
							aria-label={t('music.play')}
							min={0}
							max={Math.max(1, Math.round(duration))}
							step={1}
							value={[Math.round(shown)]}
							disabled={duration <= 0}
							onValueChange={(v) => setDrag(v[0] ?? 0)}
							onValueCommit={(v) => {
								service.seek(v[0] ?? 0);
								setDrag(null);
							}}
						/>
						<span className="hidden w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums @xs:block">
							{duration > 0 ? time(duration) : '--:--'}
						</span>
					</div>
					<div className="flex items-center justify-between gap-1">
						<div className="flex items-center gap-1">
							{control(<SkipBack />, 'music.prev', () => service.prev())}
							<Button
								size="icon-sm"
								className="rounded-full"
								aria-label={t(playing ? 'music.pause' : 'music.play')}
								onClick={(e) => {
									e.stopPropagation();
									opener.current = e.currentTarget;
									service.togglePlay();
								}}
							>
								{playing ? <Pause /> : <Play />}
							</Button>
							{control(<SkipForward />, 'music.next', () => service.next(false))}
						</div>
						<div className="hidden items-center gap-1 @xs:flex">
							{control(
								state.mode === 'one' ? <Repeat1 /> : state.mode === 'shuffle' ? <Shuffle /> : <Repeat />,
								state.mode === 'one'
									? 'music.modeOne'
									: state.mode === 'shuffle'
										? 'music.modeShuffle'
										: 'music.modeList',
								() => {
									const modes = ['list', 'one', 'shuffle'] as const;
									service.setMode(modes[(modes.indexOf(state.mode) + 1) % 3]!);
								},
							)}
							{volume && (
								<Slider
									className="w-20"
									aria-label={t('music.volume')}
									min={0}
									max={100}
									value={[Math.round(state.volume * 100)]}
									onValueChange={(v) => service.setVolume((v[0] ?? 0) / 100)}
								/>
							)}
							{control(<Volume2 />, 'music.volume', () => setVolume(!volume))}
						</div>
					</div>
				</div>
			</div>
			<PopoverContent
				ref={appearance}
				data-dashboard-layout={layout}
				side="bottom"
				align="start"
				sideOffset={6}
				collisionPadding={8}
				wheelScroll
				className="huhu-dashboard-root flex max-h-[min(24rem,var(--radix-popover-content-available-height))] flex-col gap-2 p-2"
				style={{
					position: 'relative',
					zIndex: 'var(--layer-popover)',
					width: 'var(--radix-popover-trigger-width)',
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					if (opener.current?.isConnected) opener.current.focus();
				}}
			>
				{panel === 'playlist' ? (
					<>
						<div className="min-h-0 flex-1 overflow-y-auto">
							{!state.playlist.length && (
								<div className="p-4 text-center text-sm text-muted-foreground">
									{t('music.emptyPlaylist')}
								</div>
							)}
							{state.playlist.map((item, index) => (
								<TrackRow
									key={`${item.id}:${index}`}
									track={item}
									active={index === state.currentIndex}
									playing={playing}
									playable={isPlayableByFee(item.fee, service.account.loggedIn)}
									onPlay={() => service.play(index)}
									action={{ label: 'common.delete', icon: <X />, run: () => service.removeFromPlaylist(index) }}
								/>
							))}
						</div>
						<div className="flex justify-end">
							<Button variant="ghost" size="sm" onClick={() => service.clearPlaylist()}>
								{t('music.clear')}
							</Button>
						</div>
					</>
				) : panel === 'search' ? (
					<MusicSearch service={service} win={root.ownerDocument.defaultView!} playingId={trackId} />
				) : null}
			</PopoverContent>
		</Popover>
	);
}
function TrackRow({
	track,
	active = false,
	playing = false,
	playable,
	onPlay,
	action,
}: {
	track: MusicTrack;
	active?: boolean;
	playing?: boolean;
	playable: boolean;
	onPlay: () => void;
	action: { label: string; icon: React.ReactNode; run: () => void };
}) {
	return (
		<div
			className={cn(
				'flex min-h-10 min-w-0 items-center gap-1 rounded-md px-1 hover:bg-accent/60',
				active && 'bg-accent',
				!playable && 'opacity-60',
			)}
		>
			<Button variant="ghost" className="h-10 min-w-0 flex-1 justify-start gap-2 px-2 font-normal" onClick={onPlay}>
				{active && (playing ? <Volume2 className="size-3.5 text-primary" /> : <Pause className="size-3.5" />)}
				<span className="min-w-0 flex-1 text-left">
					<span className="block truncate text-sm">{track.name}</span>
					<span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
				</span>
				{!isPlayableByFee(track.fee) && <span className="shrink-0 text-3xs text-muted-foreground">VIP</span>}
			</Button>
			<IconButton
				label={t(action.label)}
				onClick={(e) => {
					e.stopPropagation();
					action.run();
				}}
			>
				{action.icon}
			</IconButton>
		</div>
	);
}
function MusicSearch({ service, win, playingId }: { service: MusicService; win: Window; playingId?: number }) {
	const [query, setQuery] = useState(''),
		[results, setResults] = useState<MusicTrack[]>([]),
		[source, setSource] = useState(''),
		[busy, setBusy] = useState(false),
		[submitted, setSubmitted] = useState(0),
		immediate = useRef(false),
		pending = useRef(false),
		input = useRef<HTMLInputElement>(null);
	useLayoutEffect(() => {
		input.current?.focus();
	}, []);
	useLayoutEffect(() => {
		let active = true;
		const wait = immediate.current ? 0 : 400;
		immediate.current = false;
		const timer = win.setTimeout(() => {
			if (!query.trim()) {
				setResults([]);
				return;
			}
			void searchMusic(query.trim())
				.then((tracks) => {
					if (active) setResults(tracks);
				})
				.catch(() => {
					if (active) new Notice(t('music.networkError'));
				});
		}, wait);
		return () => {
			active = false;
			win.clearTimeout(timer);
		};
	}, [query, submitted, win]);
	const load = async () => {
		if (pending.current || !source.trim()) return;
		pending.current = true;
		setBusy(true);
		try {
			const count = await service.importPlaylist(source.trim());
			new Notice(t('music.importSuccess', { count }));
			setSource('');
		} catch (error) {
			new Notice(t('music.importFailed', { message: error instanceof Error ? error.message : String(error) }));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};
	return (
		<>
			<Input
				ref={input}
				placeholder={t('music.searchPlaceholder')}
				value={query}
				onInput={(e) => setQuery(e.currentTarget.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
						e.preventDefault();
						immediate.current = true;
						setSubmitted((n) => n + 1);
					}
				}}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{results.slice(0, 30).map((track) => (
					<TrackRow
						key={track.id}
						track={track}
						playable
						onPlay={() => service.addAndPlay([track])}
						action={{
							label: 'common.add',
							icon: track.id === playingId ? <Check /> : <Plus />,
							run: () => {
								service.addToPlaylist([track]);
								new Notice(t('music.added'));
							},
						}}
					/>
				))}
			</div>
			<div className="flex items-center gap-2">
				<Input
					className="min-w-0 flex-1"
					placeholder={t('music.importPlaceholder')}
					value={source}
					onInput={(e) => setSource(e.currentTarget.value)}
				/>
				<Button variant="outline" disabled={busy} onClick={() => void load()}>
					{t('music.import')}
				</Button>
			</div>
		</>
	);
}

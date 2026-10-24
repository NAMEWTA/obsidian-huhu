// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/capture-search-widgets.ts
import { useState } from 'react';
import { History, Search } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../../../ui/components/popover';
import { useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
import type { BoardStore } from '../../services/board-store';
import { IconButton } from '../board/controls';
import { FileResults } from '../board/FileResults';

/** The file-search widget: a one-line field that lists matching notes, with the recent documents under it when the tile is tall. */
export function FileSearchWidget({ store }: { store: BoardStore }) {
	const t = useT(),
		visible = useVisible();
	const [text, setText] = useState(''),
		[rows, setRows] = useState<ContentFile[]>([]),
		[open, setOpen] = useState(false),
		[recent, setRecent] = useState(false),
		[index, setIndex] = useState(0),
		[wasVisible, setWasVisible] = useState(visible);
	// Retain the input state while dismissing overlays at the visibility boundary.
	if (wasVisible !== visible) {
		setWasVisible(visible);
		if (!visible) setOpen(false);
	}
	const show = (isRecent = false) => {
		setRows(isRecent ? store.recentFiles() : store.searchFiles(text));
		setRecent(isRecent);
		setIndex(0);
		setOpen(true);
	};
	const pick = (file: { path: string } | undefined) => {
		if (!file) return;
		setOpen(false);
		void store.openFile(file.path, true);
	};
	const submit = () => {
		if (text.trim()) show();
	};
	return (
		<Popover open={open && visible} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div data-input-widget="search" className="flex h-full min-h-0 flex-col gap-3">
					<div className="flex items-center gap-2">
						<div className="relative min-w-0 flex-1">
							<Search
								aria-hidden
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								className="pl-9"
								spellCheck={false}
								aria-label={t('fileSearchWidget.title')}
								placeholder={t('quickNote.searchPlaceholder')}
								value={text}
								onChange={(event) => {
									setText(event.target.value);
									setOpen(false);
								}}
								onKeyDown={(event) => {
									if (event.nativeEvent.isComposing) return;
									if (event.key === 'Enter') {
										event.preventDefault();
										if (open) pick(rows[index]);
										else submit();
									}
									if (open && event.key === 'ArrowDown') {
										event.preventDefault();
										setIndex((i) => Math.min(rows.length - 1, i + 1));
									}
									if (open && event.key === 'ArrowUp') {
										event.preventDefault();
										setIndex((i) => Math.max(0, i - 1));
									}
									if (event.key === 'Escape') setOpen(false);
								}}
							/>
						</div>
						<IconButton
							variant="outline"
							size="icon"
							label={t('fileSearchWidget.recent')}
							onClick={() => show(true)}
						>
							<History />
						</IconButton>
						<Button size="icon" aria-label={t('fileSearchWidget.title')} onClick={submit}>
							<Search />
						</Button>
					</div>
					<div className="hidden min-h-0 flex-1 overflow-y-auto [@container(min-height:170px)]:block">
						<FileResults
							rows={store.recentFiles().slice(0, 5)}
							showTime
							empty={t('recent.empty')}
							onPick={(file) => void store.openFile(file.path, true)}
						/>
					</div>
				</div>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				sideOffset={6}
				collisionPadding={8}
				wheelScroll
				className="huhu-dashboard-root max-h-[min(20rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto p-1"
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<FileResults
					rows={rows}
					index={index}
					showTime={recent}
					empty={t(recent ? 'recent.empty' : 'quickActions.noResults')}
					onPick={pick}
				/>
			</PopoverContent>
		</Popover>
	);
}

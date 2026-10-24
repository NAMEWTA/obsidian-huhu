import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { nowMoment } from '../../../../host/obsidian/datetime';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { captureDayPathFor } from '../../../../shared/storage/vault-layout';
import { useVisible } from '../../../../ui/react/contexts';
import { useOwnerWindow } from '../../../../ui/react/hooks';
import { parseCaptureEntries, type CaptureEntry } from '../../core/board/capture';
import { inboxRoot } from '../../platform/vault/memo-files';
import type { BoardStore } from '../../services/board-store';

/** The local date (`YYYY-MM-DD`) that "today" is; it moves on at midnight while the board stays open. */
export function useCaptureDay(): string {
	const win = useOwnerWindow(),
		visible = useVisible(),
		[day, setDay] = useState(() => nowMoment().format('YYYY-MM-DD'));
	useEffect(() => {
		if (!visible) return;
		const tick = () => setDay(nowMoment().format('YYYY-MM-DD'));
		tick();
		const timer = win.setInterval(tick, 30_000);
		return () => win.clearInterval(timer);
	}, [visible, win]);
	return day;
}

export interface TodayCaptures {
	/** Path of today's capture file (it may not exist yet). */
	path: string;
	exists: boolean;
	/** Newest first. */
	entries: CaptureEntry[];
}

/**
 * Today's fleeting captures, read from the day's file in the inbox folder. The file is read again whenever the
 * board's file list reports a new modification time or size for it, so a capture made here, in the editor or by a
 * sync shows up without polling.
 */
export function useTodayCaptures(store: BoardStore): TodayCaptures {
	const day = useCaptureDay(),
		memoSavePath = useStore(store.state, (state) => state.settings.memoSavePath),
		path = captureDayPathFor(inboxRoot({ memoSavePath }), day),
		stamp = useStore(store.state, (state) => {
			const file = state.files.find((candidate) => candidate.path === path);
			return file ? `${file.stat.mtime}:${file.stat.size}` : '';
		}),
		[entries, setEntries] = useState<CaptureEntry[]>([]);
	useEffect(() => {
		if (!stamp) {
			setEntries([]);
			return;
		}
		let live = true;
		contentFiles(store.host.app)
			.read(path)
			.then((raw) => live && setEntries(parseCaptureEntries(raw).reverse()))
			.catch(() => live && setEntries([]));
		return () => {
			live = false;
		};
	}, [store, path, stamp]);
	return { path, exists: stamp !== '', entries };
}

import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { ArrowUp, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../ui/components/button';
import { Textarea } from '../../../../ui/components/textarea';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';

/**
 * "觉察当下，随心落笔": the capture strip at the bottom of the inbox. One line that grows with the text (CSS
 * `field-sizing`, up to 6rem, then it scrolls); Enter sends, Shift+Enter breaks the line. The draft lives in the
 * board store, so it survives the tile being redrawn, and only the text that was sent is cleared once the file has it. `count` is today's captures; `countClassName` decides at
 * which sizes the chip is hidden at (a wide card shows the count in its own column; below 20rem there is no room).
 */
export function CaptureComposer({
	store,
	count,
	countClassName,
	onOpenToday,
}: {
	store: BoardStore;
	count: number;
	countClassName?: string;
	onOpenToday(this: void): void;
}) {
	const t = useT(),
		text = useStore(store.state, (state) => state.captureDraft),
		[busy, setBusy] = useState(false),
		pending = useRef(false),
		alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const submit = () => {
		if (!text.trim() || pending.current) return;
		pending.current = true;
		setBusy(true);
		const sent = text;
		void store
			.capture(sent)
			.then(() => {
				// Only the draft that was sent goes: text typed while the capture ran, or on another board, stays.
				if (store.state.getState().captureDraft === sent) store.setCaptureDraft('');
				toast(t('home.inbox.captured'));
			})
			.catch(() => toast(t('storage.unsaved')))
			.finally(() => {
				pending.current = false;
				if (alive.current) setBusy(false);
			});
	};
	return (
		<div
			data-capture-composer
			className="flex shrink-0 items-end gap-1.5 rounded-lg border border-input bg-background p-[3px] pl-3 shadow-xs transition-[transform,opacity] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
		>
			<PencilLine aria-hidden className="mt-2 mb-2 size-4 shrink-0 self-start text-muted-foreground" />
			<Textarea
				rows={1}
				spellCheck={false}
				aria-label={t('home.inbox.composer')}
				placeholder={t('home.inbox.placeholder')}
				className="max-h-24 min-h-8 min-w-0 flex-1 resize-none [field-sizing:content] rounded-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
				value={text}
				onChange={(event) => store.setCaptureDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						submit();
					}
				}}
			/>
			{count > 0 && (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					title={t('home.inbox.openToday')}
					className={cn(
						'mb-1.5 hidden shrink-0 px-1.5 text-muted-foreground tabular-nums [@container(min-width:20rem)]:inline-flex',
						countClassName,
					)}
					onClick={onOpenToday}
				>
					{t('home.inbox.todayCount', { count })}
				</Button>
			)}
			<Button
				type="button"
				size="icon-sm"
				disabled={busy || !text.trim()}
				title={t('home.inbox.send')}
				aria-label={t('home.inbox.send')}
				onClick={submit}
			>
				<ArrowUp />
			</Button>
		</div>
	);
}

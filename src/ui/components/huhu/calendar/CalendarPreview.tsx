import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../../shared/i18n';
import { usePortalContainer } from '../../../react/contexts';
import { TaskContent } from '../TaskContent';
import { FloatingOwner, useOverlayStyle } from '../../../react/modal-layer';

export interface CalendarPreviewContent {
	date: string;
	title?: string;
	summary?: string;
	image?: string;
	noteExists: boolean;
	tasks: readonly { id: string; text: string; checked: boolean; time?: string }[];
}
interface OpenPreview {
	anchor: HTMLElement;
	content: CalendarPreviewContent;
}
function Preview({ value, close }: { value: OpenPreview; close(this: void): void }) {
	const ref = useRef<HTMLDivElement>(null);
	const portal = usePortalContainer();
	const overlayStyle = useOverlayStyle(undefined, 1);
	useLayoutEffect(() => {
		const node = ref.current,
			win = value.anchor.ownerDocument.defaultView;
		if (!node || !win) return;
		const rect = value.anchor.getBoundingClientRect();
		const width = value.anchor.ownerDocument.documentElement.clientWidth;
		const height = value.anchor.ownerDocument.documentElement.clientHeight;
		node.style.left = `${Math.max(8, Math.min(width - node.offsetWidth - 8, rect.right + 8 + node.offsetWidth < width ? rect.right + 8 : rect.left - node.offsetWidth - 8))}px`;
		node.style.top = `${Math.max(8, Math.min(rect.top, height - node.offsetHeight - 8))}px`;
		win.addEventListener('resize', close);
		win.addEventListener('scroll', close, true);
		win.addEventListener('pointerdown', close, true);
		const key = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
		};
		win.addEventListener('keydown', key, true);
		return () => {
			win.removeEventListener('resize', close);
			win.removeEventListener('scroll', close, true);
			win.removeEventListener('pointerdown', close, true);
			win.removeEventListener('keydown', key, true);
		};
	}, [value, close]);
	return createPortal(
		<div
			ref={ref}
			style={overlayStyle}
			role="tooltip"
			className="pointer-events-none fixed max-h-[70vh] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-floating"
			data-calendar-preview={value.content.date}
		>
			<div className="mb-2 text-xs font-semibold text-muted-foreground">{value.content.date}</div>
			<section className="space-y-2">
				{value.content.tasks.length === 0 ? (
					<p className="m-0 text-xs text-muted-foreground">{t('calendarUnified.empty')}</p>
				) : (
					value.content.tasks.slice(0, 6).map((task) => (
						<div key={task.id} className="flex gap-2 text-xs">
							<span className="shrink-0 tabular-nums text-muted-foreground">{task.time || '·'}</span>
							<TaskContent className="line-clamp-2" title={task.text} completed={task.checked} />
						</div>
					))
				)}
				{value.content.tasks.length > 6 && (
					<div className="text-xs text-muted-foreground">
						{t('tasks.moreCount', { count: value.content.tasks.length - 6 })}
					</div>
				)}
			</section>
		</div>,
		portal,
	);
}

/** Delay and version each request; detached cells and responses from previous dates are discarded. */
export function useCalendarPreview(load: (iso: string) => Promise<CalendarPreviewContent>, resetKey?: string) {
	const [value, setValue] = useState<OpenPreview | null>(null);
	const generation = useRef(0);
	const timer = useRef<{ win: Window; id: number } | undefined>(undefined);
	const detach = useRef<(() => void) | undefined>(undefined);
	const close = useCallback(() => {
		generation.current++;
		if (timer.current) timer.current.win.clearTimeout(timer.current.id);
		timer.current = undefined;
		detach.current?.();
		detach.current = undefined;
		setValue(null);
	}, []);
	useLayoutEffect(() => close, [close, resetKey]);
	return {
		content: value ? (
			<FloatingOwner>
				<Preview value={value} close={close} />
			</FloatingOwner>
		) : null,
		close,
		hover: (iso: string, anchor: HTMLElement) => {
			close();
			const win = anchor.ownerDocument.defaultView;
			if (!win || win.matchMedia?.('(pointer: coarse)').matches) return;
			const version = generation.current;
			const key = (event: KeyboardEvent) => {
				if (event.key === 'Escape') close();
			};
			win.addEventListener('scroll', close, true);
			win.addEventListener('resize', close);
			win.addEventListener('pointerdown', close, true);
			win.addEventListener('keydown', key, true);
			detach.current = () => {
				win.removeEventListener('scroll', close, true);
				win.removeEventListener('resize', close);
				win.removeEventListener('pointerdown', close, true);
				win.removeEventListener('keydown', key, true);
			};
			timer.current = {
				win,
				id: win.setTimeout(() => {
					timer.current = undefined;
					void load(iso)
						.then((content) => {
							if (version === generation.current && anchor.isConnected && content.date === iso)
								setValue({ anchor, content });
						})
						.catch(() => {});
				}, 350),
			};
		},
	};
}

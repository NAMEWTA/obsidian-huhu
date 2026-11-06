import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '../sheet';
import { Button } from '../button';
import { useOwnerDocument } from '../../react/contexts';
import { restoreFocus } from '../../react/modal-layer';
import { useT } from '../../react/hooks';
/** One editor portal survives inline/Sheet presentation changes; actual close unmounts it. */
export function DetailPane({
	open,
	leafWidth,
	onOpenChange,
	title,
	dirty = false,
	onDiscard,
	children,
}: {
	open: boolean;
	/** Width of the owning workspace leaf, independent of the available main region. */
	leafWidth: number;
	onOpenChange: (value: boolean) => void;
	title: ReactNode;
	dirty?: boolean;
	onDiscard?: () => void;
	children: ReactNode;
}) {
	const doc = useOwnerDocument();
	const anchor = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const t = useT();
	const [host] = useState(() => {
		const node = doc.createElement('div');
		node.dataset.slot = 'detail-pane-scroll';
		node.className = 'min-h-0 flex-1 overflow-y-auto scrollbar-sleek p-5';
		return node;
	});
	const retained = useRef<{
		focus: HTMLElement | null;
		start: number | null;
		end: number | null;
		direction: 'forward' | 'backward' | 'none';
		top: number;
		left: number;
	}>({ focus: null, start: null, end: null, direction: 'none', top: 0, left: 0 });
	const opener = useRef<HTMLElement | null>(null);
	const previousOpen = useRef(false);
	const inline = leafWidth >= 960 && width >= 1000;
	const remember = useCallback(() => {
		const active = doc.activeElement as HTMLElement | null;
		const field =
			active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
				? (active as HTMLInputElement | HTMLTextAreaElement)
				: null;
		retained.current = {
			focus: active && host.contains(active) ? active : null,
			start: field?.selectionStart ?? null,
			end: field?.selectionEnd ?? null,
			direction: field?.selectionDirection ?? 'none',
			top: host.scrollTop,
			left: host.scrollLeft,
		};
	}, [doc, host]);
	const focusEditor = useCallback(() => {
		const saved = retained.current;
		if (!saved.focus || !host.contains(saved.focus)) return;
		saved.focus.focus({ preventScroll: true });
		if (
			saved.start !== null &&
			saved.end !== null &&
			(saved.focus.tagName === 'INPUT' || saved.focus.tagName === 'TEXTAREA')
		)
			(saved.focus as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
				saved.start,
				saved.end,
				saved.direction,
			);
	}, [host]);
	const target = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) {
				remember();
				return;
			}
			if (host.parentElement === node) return;
			node.append(host);
			host.scrollTo({ top: retained.current.top, left: retained.current.left });
		},
		[host, remember],
	);
	// A moved editor must wait until the old Sheet removes its document focus trap.
	useEffect(() => {
		if (open && inline) focusEditor();
	}, [open, inline, focusEditor]);
	useLayoutEffect(() => {
		const parent = anchor.current?.parentElement;
		const win = parent?.ownerDocument.defaultView;
		if (!parent || !win) return;
		const measure = () => {
			remember();
			setWidth(parent.clientWidth);
		};
		measure();
		const observer = new win.ResizeObserver(measure);
		observer.observe(parent);
		return () => observer.disconnect();
	}, [doc, remember]);
	useLayoutEffect(() => {
		const wasOpen = previousOpen.current;
		previousOpen.current = open;
		if (open && !wasOpen && !host.contains(doc.activeElement))
			opener.current = doc.activeElement as HTMLElement | null;
		if (!open && wasOpen && inline)
			queueMicrotask(() =>
				restoreFocus(doc, opener.current, anchor.current?.closest<HTMLElement>('.huhu-ui') ?? null),
			);
	}, [doc, host, open, inline]);
	const restore = () => restoreFocus(doc, opener.current, anchor.current?.closest<HTMLElement>('.huhu-ui') ?? null);
	return (
		<Sheet open={open} onOpenChange={onOpenChange} dirty={dirty} onDiscard={onDiscard} modal={!inline}>
			<div ref={anchor} data-slot="detail-pane-anchor" className="contents">
				{inline ? (
					open && (
						<aside
							data-slot="detail-pane"
							aria-label={typeof title === 'string' ? title : undefined}
							className="flex h-full w-[var(--hu-detail-w)] max-w-[var(--hu-detail-max)] shrink-0 flex-col border-l border-[var(--hu-line)] bg-[var(--hu-raised)]"
						>
							<header className="flex h-[var(--hu-header-h)] shrink-0 items-center gap-3 border-b border-[var(--hu-line)] px-5">
								<h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
								<SheetClose asChild>
									<Button variant="ghost" size="icon-sm" aria-label={t('ui.close')}>
										<X />
									</Button>
								</SheetClose>
							</header>
							<div ref={target} className="flex min-h-0 flex-1 flex-col" />
						</aside>
					)
				) : (
					<SheetContent
						style={leafWidth < 600 ? { width: Math.max(0, leafWidth), maxWidth: '100%' } : undefined}
						className={
							leafWidth < 600
								? 'w-full max-w-full'
								: 'w-[var(--hu-detail-w)] max-w-[var(--hu-detail-max)]'
						}
						aria-describedby={undefined}
						onOpenAutoFocus={(event) => {
							const active = doc.activeElement as HTMLElement | null;
							if (active && !host.contains(active) && active !== doc.body) opener.current = active;
							if (retained.current.focus && host.contains(retained.current.focus)) {
								event.preventDefault();
								focusEditor();
							}
						}}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							if (!open) queueMicrotask(restore);
						}}
					>
						<SheetHeader>
							<SheetTitle>{title}</SheetTitle>
						</SheetHeader>
						<div ref={target} className="flex min-h-0 flex-1 flex-col" />
					</SheetContent>
				)}
			</div>
			{open && createPortal(children, host, 'detail-pane-editor')}
		</Sheet>
	);
}

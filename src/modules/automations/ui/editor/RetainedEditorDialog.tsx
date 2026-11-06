import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/components/dialog';
import { useOwnerDocument } from '../../../../ui/react/contexts';
/** Keep the same form portal while hiding its modal; Radix still owns every focus/overlay behavior. */
export function RetainedEditorDialog({
	visible,
	title,
	onClose,
	children,
}: {
	visible: boolean;
	title: string;
	onClose(this: void): void;
	children: ReactNode;
}) {
	const doc = useOwnerDocument(),
		stash = useRef<HTMLDivElement>(null);
	const [host] = useState(() => {
		const node = doc.createElement('div');
		node.className = 'flex min-h-0 min-w-0 flex-1 flex-col';
		return node;
	});
	const retained = useRef<{
		field: HTMLElement | null;
		start: number | null;
		end: number | null;
		direction: 'forward' | 'backward' | 'none';
	}>({ field: null, start: null, end: null, direction: 'none' });
	const target = useCallback(
		(node: HTMLDivElement | null) => {
			if (node) {
				node.append(host);
				return;
			}
			const field = host.contains(doc.activeElement) ? (doc.activeElement as HTMLElement) : null;
			const input =
				field && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA')
					? (field as HTMLInputElement)
					: null;
			retained.current = {
				field,
				start: input?.selectionStart ?? null,
				end: input?.selectionEnd ?? null,
				direction: input?.selectionDirection ?? 'none',
			};
			stash.current?.append(host);
		},
		[doc, host],
	);
	return (
		<Dialog
			open={visible}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<div ref={stash} hidden inert />
			<DialogContent
				className="flex h-[min(46rem,calc(100%-32px))] w-[min(62rem,calc(100%-32px))] max-w-[calc(100%-32px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[62rem]"
				aria-describedby={undefined}
				onOpenAutoFocus={(event) => {
					const saved = retained.current;
					if (!saved.field || !host.contains(saved.field)) {
						const initial =
							host.querySelector<HTMLElement>(
								'[data-automation-editor="existing"] [data-content-editor]',
							) ?? host.querySelector<HTMLElement>('input');
						if (initial) {
							event.preventDefault();
							initial.focus({ preventScroll: true });
						}
						return;
					}
					event.preventDefault();
					saved.field.focus({ preventScroll: true });
					if (saved.start !== null && saved.end !== null)
						(saved.field as HTMLInputElement).setSelectionRange(saved.start, saved.end, saved.direction);
				}}
				onCloseAutoFocus={(event) => {
					if (!visible) event.preventDefault();
				}}
			>
				<DialogHeader className="shrink-0 border-b border-[var(--hu-line)] px-5 py-4">
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div ref={target} className="flex min-h-0 flex-1 flex-col" />
			</DialogContent>
			{createPortal(children, host, 'automation-editor')}
		</Dialog>
	);
}

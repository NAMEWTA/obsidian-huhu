import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useOwnerDocument } from '../../../../ui/react/contexts';

/** Where a tile can be grabbed: its title bar. The body of a tile never starts a drag. */
export const DRAG_HANDLE = '.huhu-widget-handle';
/**
 * Inside the title bar (and, defensively, anywhere in the body) these never start a drag: controls, fields,
 * links and anything that marks itself with `.huhu-widget-no-drag`.
 */
export const DRAG_CANCEL = 'button, a, input, textarea, select, [contenteditable="true"], .huhu-widget-no-drag, .huhu-widget-body';

/**
 * Width of the element, measured through the window that owns it. react-grid-layout's own `useContainerWidth`
 * observes with the main window's `ResizeObserver` and `requestAnimationFrame`; in an Obsidian popout the element
 * belongs to another window, so this hook asks that window instead, and starts over when the view is adopted by
 * another window. `width` is 0 until the first measurement.
 */
export function useGridWidth(): { ref: RefObject<HTMLDivElement | null>; width: number } {
	const ref = useRef<HTMLDivElement>(null);
	const doc = useOwnerDocument();
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => {
		const el = ref.current;
		const win = doc.defaultView;
		if (!el || !win) return;
		const measure = () => setWidth((previous) => (previous === el.clientWidth ? previous : el.clientWidth));
		measure();
		const observer = new win.ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [doc]);
	return { ref, width };
}

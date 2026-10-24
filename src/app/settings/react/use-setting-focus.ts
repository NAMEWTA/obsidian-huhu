import { useEffect, type RefObject } from 'react';
import { collectSettingRows } from '../setting-rows';

const HIGHLIGHT = ['ring-2', 'ring-ring', 'bg-accent/40', 'rounded-md', 'transition-shadow'] as const;
const FIND_FOR_MS = 8000;
const HIGHLIGHT_MS = 2400;

/**
 * Bring the setting a search result named into view and flash it. Pages load their module and data after the
 * category opens, so the row is looked for until it appears (or `FIND_FOR_MS` passes).
 */
export function useSettingFocus(container: RefObject<HTMLElement | null>, focusId: string | undefined, token = 0): void {
	useEffect(() => {
		const root = container.current;
		if (!focusId || !root) return;
		const win = root.ownerDocument.defaultView;
		if (!win) return;
		let done = false;
		let clear: number | undefined;
		let target: HTMLElement | undefined;
		const find = () => {
			if (done) return;
			const row = collectSettingRows(root).find((candidate) => candidate.key === focusId);
			if (!row) return;
			done = true;
			observer.disconnect();
			win.clearTimeout(timeout);
			target = row.element;
			target.scrollIntoView({ block: 'center', behavior: 'smooth' });
			target.classList.add(...HIGHLIGHT);
			clear = win.setTimeout(() => target?.classList.remove(...HIGHLIGHT), HIGHLIGHT_MS);
		};
		const observer = new win.MutationObserver(find);
		observer.observe(root, { childList: true, subtree: true });
		const timeout = win.setTimeout(() => {
			done = true;
			observer.disconnect();
		}, FIND_FOR_MS);
		find();
		return () => {
			done = true;
			observer.disconnect();
			win.clearTimeout(timeout);
			win.clearTimeout(clear);
			target?.classList.remove(...HIGHLIGHT);
		};
	}, [container, focusId, token]);
}

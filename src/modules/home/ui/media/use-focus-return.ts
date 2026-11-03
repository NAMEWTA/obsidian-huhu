import { useCallback, useEffect, useRef } from 'react';

/**
 * Dialogs opened from state (not from a Radix trigger) lose the focus return Radix gives a trigger.
 * `remember` is called when the dialog opens and `restore` when it closes, so a keyboard user lands back
 * on the control that opened it. A control that no longer exists (a deleted file) is skipped.
 */
export function useFocusReturn() {
	const target = useRef<HTMLElement | null>(null);
	const timer = useRef<{ win: Window; id: number } | null>(null);
	useEffect(() => () => timer.current?.win.clearTimeout(timer.current.id), []);
	const remember = useCallback(() => {
		const active = (target.current?.ownerDocument ?? document).activeElement;
		target.current = active instanceof HTMLElement ? active : null;
	}, []);
	const restore = useCallback(() => {
		const element = target.current;
		target.current = null;
		const win = element?.ownerDocument.defaultView;
		if (!element || !win) return;
		// Radix cleans up its own focus scope in a timeout; this runs after it.
		timer.current = {
			win,
			id: win.setTimeout(() => {
				if (element.isConnected) element.focus();
			}, 0),
		};
	}, []);
	return { remember, restore };
}

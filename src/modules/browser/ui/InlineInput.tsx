import { useEffect, useRef, type RefObject } from 'react';
import type { HumanInput } from '../api';
import { useT } from '../../../ui/react/hooks';

/** A real editable receives OS composition only after the viewer receives focus.
 * Design reference (no copied code):
 * https://github.com/novnc/noVNC/blob/e8b5024d4603587b29ffede4fbd28b1fa2939829/app/ui.js#L1657-L1717
 * Unlike VNC key synthesis, this bridge sends bounded CDP preedit/commit operations.
 */
export function InlineInput({ inputRef, point, send, fallback }: {
	inputRef: RefObject<HTMLTextAreaElement | null>;
	point: { x: number; y: number };
	send: (input: HumanInput) => Promise<boolean>;
	fallback: () => void;
}) {
	const t = useT(), composing = useRef(false), preedit = useRef(''), committed = useRef(''), live = useRef(true);
	useEffect(() => () => { live.current = false; }, []);
	const dispatch = (input: HumanInput) => { if (live.current) void send(input); };
	const composition = (phase: 'start' | 'update' | 'end' | 'cancel', text: string, start = text.length, end = start) => dispatch({ kind: 'composition', phase, text, selectionStart: start, selectionEnd: end });
	const cancel = () => {
		if (composing.current) composition('cancel', '');
		composing.current = false; preedit.current = ''; committed.current = '';
		if (inputRef.current) inputRef.current.value = '';
	};
	return <textarea
		ref={inputRef} aria-label={t('browser.v2.inlineInput')} tabIndex={-1} autoComplete="off" autoCapitalize="off" spellCheck={false}
		className="absolute h-px w-px resize-none overflow-hidden opacity-0" style={{ left: point.x, top: point.y }}
		onBlur={cancel}
		onCompositionStart={() => { composing.current = true; preedit.current = ''; committed.current = ''; composition('start', ''); }}
		onCompositionUpdate={event => {
			if (!composing.current) return;
			const text = typeof event.data === 'string' ? event.data : event.currentTarget.value;
			preedit.current = text;
			composition('update', text, Math.min(event.currentTarget.selectionStart, text.length), Math.min(event.currentTarget.selectionEnd, text.length));
		}}
		onSelect={event => {
			if (composing.current) composition('update', preedit.current, Math.min(event.currentTarget.selectionStart, preedit.current.length), Math.min(event.currentTarget.selectionEnd, preedit.current.length));
		}}
		onCompositionEnd={event => {
			if (!composing.current) return;
			const text = typeof event.data === 'string' ? event.data : event.currentTarget.value;
			composing.current = false; committed.current = text; preedit.current = '';
			composition('end', text); event.currentTarget.value = '';
		}}
		onInput={event => {
			const native = event.nativeEvent;
			if (composing.current) { preedit.current = event.currentTarget.value; composition('update', preedit.current, event.currentTarget.selectionStart, event.currentTarget.selectionEnd); return; }
			if (native.isComposing) return;
			const text = native.data ?? event.currentTarget.value;
			if (native.inputType?.includes('Composition') || committed.current && text === committed.current) { committed.current = ''; event.currentTarget.value = ''; return; }
			committed.current = ''; event.currentTarget.value = '';
			if (text) dispatch({ kind: 'text', text });
		}}
		onPaste={event => { event.preventDefault(); event.stopPropagation(); committed.current = ''; const text = event.clipboardData.getData('text/plain'); if (text) dispatch({ kind: 'text', text }); }}
		onKeyDown={event => {
			if (event.isDefaultPrevented()) return;
			if (composing.current || event.nativeEvent.isComposing || event.key === 'Process' || event.key === 'Unidentified') { event.stopPropagation(); return; }
			committed.current = '';
			if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') return;
			if ((event.ctrlKey || event.metaKey) && ['c', 'x'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopPropagation(); fallback(); return; }
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') return;
			if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
			event.stopPropagation();
			if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) return;
			event.preventDefault();
			dispatch({ kind: 'key', key: event.key, modifiers: (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0) });
		}}
	/>;
}

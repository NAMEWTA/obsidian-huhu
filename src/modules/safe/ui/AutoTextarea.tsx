import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { Textarea } from '../../../ui/components/textarea';

/** Fit saved, pasted and IME text; recompute wrapping after the owning dialog/window is resized. */
export function AutoTextarea(props: ComponentProps<typeof Textarea>) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		const win = element.ownerDocument.defaultView;
		const fit = () => {
			element.style.removeProperty('height');
			const style = win?.getComputedStyle(element);
			const border = Number.parseFloat(style?.borderTopWidth ?? '0') + Number.parseFloat(style?.borderBottomWidth ?? '0');
			element.style.height = `${element.scrollHeight + (Number.isFinite(border) ? border : 0)}px`;
		};
		fit();
		let active = true;
		const fonts = element.ownerDocument.fonts;
		// A loaded interface font can change line wrapping without changing the field's width.
		void fonts?.ready.then(() => { if (active) fit(); });
		fonts?.addEventListener('loadingdone', fit);
		let width = element.getBoundingClientRect().width;
		const observer = win?.ResizeObserver ? new win.ResizeObserver(() => {
			const next = element.getBoundingClientRect().width;
			if (next !== width) { width = next; fit(); }
		}) : undefined;
		observer?.observe(element);
		return () => { active = false; observer?.disconnect(); fonts?.removeEventListener('loadingdone', fit); };
	}, [props.value]);
	return <Textarea {...props} ref={ref} style={{ ...props.style, overflowY: 'hidden' }} />;
}

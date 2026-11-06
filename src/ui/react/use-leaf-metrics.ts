import { useCallback, useLayoutEffect, useState } from 'react';
import { useOwnerDocument, useVisible } from './contexts';

export interface LeafMetrics {
	element: HTMLElement | null;
	width: number;
}

/** Pass a logical owner for portals, or attach ref to a page inside its native leaf. */
export function useLeafMetrics(ownerElement?: HTMLElement | null) {
	const doc = useOwnerDocument();
	const visible = useVisible();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [metrics, setMetrics] = useState<LeafMetrics>({ element: null, width: 0 });
	const ref = useCallback((node: HTMLElement | null) => { setAnchor(node); }, []);
	useLayoutEffect(() => {
		if (!visible) return;
		const source = ownerElement?.ownerDocument === doc ? ownerElement : anchor;
		if (!source || source.ownerDocument !== doc) {
			setMetrics(previous => previous.element ? { element: null, width: 0 } : previous);
			return;
		}
		const element = ownerElement?.ownerDocument === doc ? ownerElement
			: source.closest<HTMLElement>('[data-huhu-leaf]')
				?? source.closest<HTMLElement>('.workspace-leaf-content') ?? doc.documentElement;
		let active = true;
		const measure = () => {
			if (!active || !element.isConnected || element.ownerDocument !== doc) return;
			const width = Math.max(0, element.getBoundingClientRect().width);
			if (!Number.isFinite(width)) return;
			setMetrics(previous => previous.element === element && previous.width === width ? previous : { element, width });
		};
		measure();
		const Observer = (doc.defaultView as (Window & { ResizeObserver?: typeof ResizeObserver }) | null)?.ResizeObserver;
		const observer = Observer ? new Observer(measure) : null;
		observer?.observe(element);
		return () => { active = false; observer?.disconnect(); };
	}, [anchor, doc, ownerElement, visible]);
	return { ...metrics, ref };
}

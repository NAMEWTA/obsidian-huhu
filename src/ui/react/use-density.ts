import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Read density and pointer media from the element's window, including after document adoption. */
export function useDensityRowHeight(ref: RefObject<HTMLElement | null>): number {
	const [height, setHeight] = useState(32);
	const binding = useRef<{ element: HTMLElement; dispose: () => void } | null>(null);
	// A tree may initially render no container until Headless Tree rebuilds its rows.
	useLayoutEffect(() => {
		const element = ref.current;
		if (binding.current?.element === element) return;
		binding.current?.dispose();
		binding.current = null;
		if (!element) return;
		let dispose = () => {};
		let document: Document | undefined;
		let refreshAncestors = () => {};
		const bind = () => {
			const nextDocument = element.ownerDocument;
			if (document !== nextDocument) {
				dispose();
				document = nextDocument;
				const win = nextDocument.defaultView;
				if (!win) return;
				const media = win.matchMedia('(pointer: coarse)');
				const update = () => {
					if (element.ownerDocument !== nextDocument) return bind();
					refreshAncestors();
					const comfortable =
						element.closest('[data-density]')?.getAttribute('data-density') === 'comfortable';
					setHeight(media.matches ? 44 : comfortable ? 36 : 32);
				};
				const observer = new win.MutationObserver(update);
				let ancestors: Node[] = [];
				refreshAncestors = () => {
					const next: Node[] = [];
					for (let node: Node | null = element; node; node = node.parentNode) next.push(node);
					if (next.length === ancestors.length && next.every((node, index) => node === ancestors[index]))
						return;
					observer.disconnect();
					ancestors = next;
					// No subtree observation: unrelated vault edits cannot trigger every tree.
					// Watching each ancestor's direct children still detects a moved root or document adoption.
					for (const node of ancestors)
						observer.observe(node, {
							childList: true,
							attributes: true,
							attributeFilter: ['data-density'],
						});
				};
				media.addEventListener('change', update);
				dispose = () => {
					observer.disconnect();
					media.removeEventListener('change', update);
				};
				update();
			}
		};
		bind();
		binding.current = { element, dispose: () => dispose() };
	});
	useLayoutEffect(
		() => () => {
			binding.current?.dispose();
			binding.current = null;
		},
		[],
	);
	return height;
}

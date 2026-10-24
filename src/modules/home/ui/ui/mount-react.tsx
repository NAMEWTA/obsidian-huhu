import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { HuhuProviders } from '../../../../ui/react/providers';

/**
 * Render a React field into an element of an Obsidian Modal that is built with DOM calls. The caller keeps the
 * returned function and calls it when the modal closes, so the root and its listeners are released.
 */
export function mountReact(host: HTMLElement, node: ReactNode): () => void {
	host.classList.add('huhu-ui');
	const root = createRoot(host);
	root.render(<HuhuProviders ownerDocument={host.ownerDocument}>{node}</HuhuProviders>);
	return () => root.unmount();
}

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { OwnerDocumentContext, VisibilityContext } from './contexts';
import { useLeafMetrics } from './use-leaf-metrics';

const roots: Root[] = [];
afterEach(() => { act(() => { for (const root of roots.splice(0)) root.unmount(); }); document.body.replaceChildren(); vi.unstubAllGlobals(); });

function rect(element: HTMLElement, width: () => number) {
	element.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: width(), bottom: 100, width: width(), height: 100, toJSON() {} });
}
function mount() {
	const container = document.createElement('div'); document.body.append(container);
	const root = createRoot(container); roots.push(root); return { root, container };
}
function Probe({ owner, portal }: { owner?: HTMLElement; portal?: HTMLElement }) {
	const metrics = useLeafMetrics(owner);
	const content = <div ref={metrics.ref} data-width={metrics.width} data-owner={metrics.element?.id} />;
	return portal ? createPortal(content, portal) : content;
}

test('an explicit logical leaf owns the width of a portaled page', () => {
	const { root, container } = mount();
	const leaf = document.createElement('section'), portal = document.createElement('aside');
	leaf.id = 'logical'; document.body.append(leaf, portal); rect(leaf, () => 620);
	act(() => { root.render(<OwnerDocumentContext value={document}><Probe owner={leaf} portal={portal} /></OwnerDocumentContext>); });
	expect(portal.firstElementChild?.getAttribute('data-width')).toBe('620');
	expect(portal.firstElementChild?.getAttribute('data-owner')).toBe('logical');
	expect(container.children).toHaveLength(0);
});

test('a page reads its full leaf instead of its main region and releases hidden subscriptions', () => {
	const { root, container } = mount(); container.dataset.huhuLeaf = ''; container.id = 'leaf';
	let width = 620; rect(container, () => width);
	const observers: Array<{ callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
	class Observer {
		disconnect = vi.fn();
		constructor(callback: ResizeObserverCallback) { observers.push({ callback, disconnect: this.disconnect }); }
		observe() {}
		unobserve() {}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	const render = (visible: boolean) => act(() => { root.render(<OwnerDocumentContext value={document}><VisibilityContext value={visible}><Probe /></VisibilityContext></OwnerDocumentContext>); });
	render(true);
	expect(container.firstElementChild?.getAttribute('data-width')).toBe('620');
	expect(container.firstElementChild?.getAttribute('data-owner')).toBe('leaf');
	width = 580;
	act(() => { observers.at(-1)?.callback([], {} as ResizeObserver); });
	expect(container.firstElementChild?.getAttribute('data-width')).toBe('580');
	render(false);
	expect(observers.at(-1)?.disconnect).toHaveBeenCalledOnce();
	width = 960;
	render(true);
	expect(container.firstElementChild?.getAttribute('data-width')).toBe('960');
});

test('a queued callback from the old leaf cannot overwrite the current logical owner', () => {
	const { root, container } = mount();
	const oldLeaf = document.createElement('section'), newLeaf = document.createElement('section');
	oldLeaf.id = 'old'; newLeaf.id = 'new'; document.body.append(oldLeaf, newLeaf);
	rect(oldLeaf, () => 620); rect(newLeaf, () => 960);
	const callbacks: ResizeObserverCallback[] = [];
	class Observer {
		constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	const render = (owner: HTMLElement) => act(() => { root.render(<OwnerDocumentContext value={document}><Probe owner={owner} /></OwnerDocumentContext>); });
	render(oldLeaf);
	const stale = callbacks.at(-1)!;
	render(newLeaf);
	expect(container.firstElementChild?.getAttribute('data-width')).toBe('960');
	act(() => { stale([], {} as ResizeObserver); });
	expect(container.firstElementChild?.getAttribute('data-width')).toBe('960');
	expect(container.firstElementChild?.getAttribute('data-owner')).toBe('new');
});

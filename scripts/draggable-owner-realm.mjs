import { guardedAdapter, patchText } from './ui-adapter-guard.mjs';

/**
 * react-draggable (under react-grid-layout) starts a drag only when `event.target instanceof
 * ownerDocument.defaultView.Node`. Obsidian adopts an existing view's DOM into a popout window, so the board's
 * elements sit in the popout document but keep the main window's prototypes: that check fails and every drag and
 * resize is refused there. A node is recognized by its `nodeType` instead, which holds in either window.
 * The released entry and its hash are pinned (ui-adapter-inputs.json); installed packages remain untouched.
 */
export function adaptDraggable(source) {
	return patchText(source, 'react-draggable')
		.replace('!(e.target instanceof ownerDocument.defaultView.Node)', '!(typeof e.target?.nodeType === "number")')
		.source;
}

export const draggableTransforms = {
	'react-draggable/build/cjs/chunk-ACOTSM7X.mjs': adaptDraggable,
};
export const draggableOwnerRealm = guardedAdapter('draggable-owner-realm', draggableTransforms);

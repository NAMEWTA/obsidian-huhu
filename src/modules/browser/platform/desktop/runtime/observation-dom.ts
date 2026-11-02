import { AgentBrowserError, type SnapshotNode } from '../../../core/contracts';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export interface ObservationDomNode {
	backend: number;
	parent: number;
	password: boolean;
	closedShadow: boolean;
	transparent: boolean;
	visible: boolean;
	bounds?: SnapshotNode['bounds'];
}
export interface ObservationDom {
	frameId: string;
	scrollX: number;
	scrollY: number;
	nodes: ObservationDomNode[];
}

/** CDP's flattened node/layout tables include same-process child documents, keyed by frameId.
 * https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/#method-captureSnapshot
 */
export function observationDocuments(value: unknown): ObservationDom[] {
	const snapshot = object(value), strings = array(snapshot.strings);
	const text = (index: unknown) => typeof index === 'number' && typeof strings[index] === 'string' ? strings[index] : '';
	if (!Array.isArray(snapshot.documents) || snapshot.documents.length > 64) throw new AgentBrowserError('browser_dom_snapshot_invalid');
	return snapshot.documents.map(raw => {
		const doc = object(raw), tree = object(doc.nodes), layout = object(doc.layout), ids = array(tree.backendNodeId), parents = array(tree.parentIndex);
		if (ids.length > 100_000 || parents.length !== ids.length) throw new AgentBrowserError('browser_dom_snapshot_invalid');
		const rare = object(tree.shadowRootType), shadows = new Map(array(rare.index).map((index, i) => [Number(index), text(array(rare.value)[i])]));
		const nodes: ObservationDomNode[] = ids.map((backend, i) => {
			const attributes = array(array(tree.attributes)[i]);
			let password = false;
			for (let j = 0; j < attributes.length; j += 2)
				if (text(attributes[j]).toLowerCase() === 'type' && text(attributes[j + 1]).toLowerCase() === 'password') password = true;
			return { backend: Number(backend), parent: Number(parents[i]), password, closedShadow: shadows.get(i) === 'closed', transparent: false, visible: false };
		});
		for (let i = 0; i < array(layout.nodeIndex).length; i++) {
			const node = nodes[Number(array(layout.nodeIndex)[i])], bounds = array(array(layout.bounds)[i]), styles = array(array(layout.styles)[i]).map(text);
			if (!node || bounds.length !== 4 || !bounds.every(n => typeof n === 'number' && Number.isFinite(n))) continue;
			const [x, y, width, height] = bounds as [number, number, number, number];
			node.bounds = { x, y, width, height };
			node.transparent = Number(styles[2] ?? 1) === 0;
			node.visible = width > 0 && height > 0 && styles[0] !== 'none' && !['hidden', 'collapse'].includes(styles[1] ?? '') && Number(styles[2] ?? 1) > 0;
		}
		return { frameId: text(doc.frameId), scrollX: Number(doc.scrollOffsetX ?? 0), scrollY: Number(doc.scrollOffsetY ?? 0), nodes };
	});
}

export function observationSelection(nodes: ObservationDomNode[], root = -1): { selected: Set<number>; closed: Set<number>; transparent: Set<number> } {
	const children = new Map<number, number[]>();
	for (let i = 0; i < nodes.length; i++) {
		const parent = nodes[i]!.parent;
		const siblings = children.get(parent) ?? []; siblings.push(i); children.set(parent, siblings);
	}
	const descendants = (seeds: number[]) => {
		const visited = new Set<number>(), queue = [...seeds];
		for (let i = 0; i < queue.length; i++) {
			const node = queue[i]!;
			if (visited.has(node)) continue;
			visited.add(node); for (const child of children.get(node) ?? []) queue.push(child);
		}
		return visited;
	};
	// Opacity composites the whole subtree, while each child's computed opacity can remain 1.
	// https://www.w3.org/TR/css-color-4/#transparency
	return { selected: root < 0 ? new Set(nodes.map((_, i) => i)) : descendants([root]), closed: descendants(nodes.flatMap((node, i) => node.closedShadow ? [i] : [])), transparent: descendants(nodes.flatMap((node, i) => node.transparent ? [i] : [])) };
}

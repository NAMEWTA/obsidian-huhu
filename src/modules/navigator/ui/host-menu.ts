// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { planHostMenu, type HostMenuNode } from '../core/host-menu';
import type { MenuEntry } from './menu-entry';

function entriesOf(nodes: readonly HostMenuNode[], report: (error: unknown) => void, prefix: string): MenuEntry[] {
	const out: MenuEntry[] = [];
	let separator = false;
	nodes.forEach((node, index) => {
		if (node.kind === 'separator') { separator = out.length > 0; return; }
		const id = `${prefix}-${index}`;
		out.push({
			id,
			label: node.title,
			iconName: node.icon,
			danger: node.warning,
			disabled: node.disabled,
			checked: node.checked,
			separatorBefore: separator || undefined,
			children: node.children ? entriesOf(node.children, report, id) : undefined,
			run: () => Promise.resolve(node.run()).catch(report),
		});
		separator = false;
	});
	return out;
}

/**
 * The navigator's own entries followed, after a separator, by what Obsidian and other plugins add to a file's menu.
 * Host entries that duplicate an own one are left out; where the host has a richer version of an own entry
 * (its "Copy path" submenu) the own one gives way.
 */
export function withHostEntries(own: MenuEntry[], host: readonly HostMenuNode[], report: (error: unknown) => void): MenuEntry[] {
	if (!host.length) return own;
	const plan = planHostMenu(host, new Set(own.map((entry) => entry.id)), own.map((entry) => entry.label));
	const extra = entriesOf(plan.nodes, report, 'host');
	if (!extra.length) return own;
	let kept = own.filter((entry) => !plan.replaced.includes(entry.id));
	// A replaced entry that opened a group leaves its separator to the next entry.
	const dropped = own.filter((entry) => plan.replaced.includes(entry.id));
	if (dropped.some((entry) => entry.separatorBefore)) {
		const at = own.findIndex((entry) => plan.replaced.includes(entry.id));
		const next = own.slice(at + 1).find((entry) => !plan.replaced.includes(entry.id));
		kept = kept.map((entry) => (entry === next ? { ...entry, separatorBefore: true } : entry));
	}
	extra[0] = { ...extra[0]!, separatorBefore: true };
	// As in Obsidian's own menu, the destructive entry stays last, after the host's.
	const last = kept[kept.length - 1];
	if (last?.id === 'delete') return [...kept.slice(0, -1), ...extra, { ...last, separatorBefore: true }];
	return [...kept, ...extra];
}

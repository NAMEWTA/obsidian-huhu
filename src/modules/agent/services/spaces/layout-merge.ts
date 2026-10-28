import { rebaseChanges, threeWayMerge } from '../../../../shared/storage/three-way-merge';
import type { WorkspaceState } from '../../core/workspace/model';
import { closeTab, groupOf, openTab } from '../../core/workspace/ops';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const focus = (layout: WorkspaceState) => ({
	activeGroupId: layout.activeGroupId,
	groups: layout.groups.map(group => ({ id: group.id, activeTabId: group.activeTabId, recentTabIds: group.recentTabIds })),
});

/** 新引用经现有布局操作迁入，避免独立创建的首个分组树互相覆盖。其余字段保留严格冲突判断。 */
export function mergeLayoutEdits(base: WorkspaceState, local: WorkspaceState, remote: WorkspaceState, afterSubmit = false): WorkspaceState {
	const additions = Object.values(remote.tabs).filter(tab => !Object.hasOwn(base.tabs, tab.id));
	let core = remote;
	for (const tab of additions) core = closeTab(core, tab.id);
	core = { ...core, closedTabs: remote.closedTabs };
	let merged = afterSubmit ? rebaseChanges(base, local, core) : threeWayMerge(base, local, core);
	for (const tab of additions) {
		if (merged.tabs[tab.id]) {
			const value = afterSubmit ? rebaseChanges(undefined, merged.tabs[tab.id], tab) : threeWayMerge(undefined, merged.tabs[tab.id], tab);
			merged = { ...merged, tabs: { ...merged.tabs, [tab.id]: value! } };
		} else {
			const group = groupOf(remote, tab.id)?.id;
			merged = openTab(merged, merged.groups.some(item => item.id === group) ? group : undefined, tab);
			// openTab 的激活副作用仅用于安置引用，不能改变已提交的运行派生状态。
			merged = { ...merged, tabs: { ...merged.tabs, [tab.id]: tab } };
		}
	}
	const preferred = equal(focus(base), focus(local)) ? remote : local;
	return {
		...merged,
		activeGroupId: merged.groups.some(group => group.id === preferred.activeGroupId) ? preferred.activeGroupId : merged.activeGroupId,
		groups: merged.groups.map(group => {
			const source = preferred.groups.find(item => item.id === group.id);
			if (!source) return group;
			return {
				...group,
				activeTabId: source.activeTabId && group.tabIds.includes(source.activeTabId) ? source.activeTabId : group.activeTabId,
				recentTabIds: [...source.recentTabIds.filter(id => group.tabIds.includes(id)), ...group.recentTabIds.filter(id => !source.recentTabIds.includes(id))],
			};
		}),
	};
}

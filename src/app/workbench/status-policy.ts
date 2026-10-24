import type { WorkbenchStatus } from '../contracts/workbench';

/** One unresolved board save stays visible until that board leaves the error. Saving and saved stay quiet. */
export function dashboardSaveStatuses(entries: readonly { path: string; status: string; message: string }[]): WorkbenchStatus[] {
	const rows: WorkbenchStatus[] = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		if (!entry.path || seen.has(entry.path) || entry.status === 'saved' || entry.status === 'saving' || !entry.message) continue;
		seen.add(entry.path);
		rows.push({ id: 'dashboard-save:' + entry.path, kind: 'error', label: entry.message, target: { feature: 'dashboard', resourceId: entry.path } });
	}
	return rows;
}

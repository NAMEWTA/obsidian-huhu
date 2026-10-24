import type { DashboardSettings } from '../../core/board/types/model';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** The registry as the board shows it: file, display name (empty when never named) and position. */
export interface BoardEntry {
	file: string;
	name: string;
	index: number;
}

export function boardEntries(settings: Pick<DashboardSettings, 'workspaces'>): BoardEntry[] {
	const { files, names } = settings.workspaces;
	return files.map((file, index) => ({ file, name: names[index]?.trim() ?? '', index }));
}

/** The name a board goes by: the one typed when it was created or renamed, else "Board N". */
export function boardLabel(entry: BoardEntry, t: Translate): string {
	return entry.name || t('home.dashboard.boardDefault', { n: entry.index + 1 });
}

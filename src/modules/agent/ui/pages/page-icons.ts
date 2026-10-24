import { ChartNoAxesColumn, LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { PageKind } from '../../core/workspace/model';

/** One icon per page, shared by the sidebar entries and the tabs they open. */
export const PAGE_ICONS: Record<PageKind, LucideIcon> = {
	board: LayoutDashboard,
	usage: ChartNoAxesColumn,
};

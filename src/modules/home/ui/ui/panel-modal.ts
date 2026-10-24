import type { App } from 'obsidian';
import { closeDashboardDialogs } from './dialog-scope';
export function closeDashboardPanelModals(app: App): void {
	closeDashboardDialogs(app);
}

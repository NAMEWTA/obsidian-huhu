import { createStore } from 'zustand/vanilla';
/**
 * Page-level view state of the agent workspace. Board and usage are tabs in the workspace
 * itself (`PageTabData`), so only the side panels and overlays that sit around the tabs live here.
 */
export function createWorkspaceView(saved: Record<string, unknown> = {}) {
	return createStore<{ history: boolean; historyWidth: number; jump: boolean }>(() => ({
		history: saved.agentHistory === true,
		historyWidth:
			typeof saved.agentHistoryWidth === 'number' ? Math.max(240, Math.min(480, saved.agentHistoryWidth)) : 300,
		jump: false,
	}));
}
export type WorkspaceViewStore = ReturnType<typeof createWorkspaceView>;

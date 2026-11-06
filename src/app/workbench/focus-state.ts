import type { WorkbenchTarget } from '../contracts/workbench';
import { normalizeWorkbenchState, WORKBENCH_UI_SCHEMA, type WorkbenchUiState } from '../contracts/workbench-state';
export type FocusLeafState = WorkbenchUiState & { mode: 'focus' };
/** Emit only the current bounded leaf envelope. */
export function focusLeafState(target: WorkbenchTarget, state: Record<string, unknown>): FocusLeafState {
	return {
		...normalizeWorkbenchState({
			schema: WORKBENCH_UI_SCHEMA,
			route: target,
			mode: 'focus',
			pageViews: [{ target, state }],
		}),
		mode: 'focus',
	};
}

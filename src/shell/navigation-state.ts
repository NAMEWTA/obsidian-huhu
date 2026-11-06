/** Pure persisted UI projection is shared with the lazy native leaf. */
export {
	WORKBENCH_UI_SCHEMA,
	normalizeWorkbenchState,
	normalizeTarget,
	targetKey,
	panelWidth,
	PANEL_MIN,
	PANEL_MAX,
	PANEL_DEFAULT,
	cleanPageState,
} from '../app/contracts/workbench-state';
export type { WorkbenchUiState as WorkbenchState } from '../app/contracts/workbench-state';

import { expect, onTestFinished, test, vi } from 'vitest';
import type { WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../main';
import type { WorkbenchHost } from '../contracts/workbench-host';
import { composeWorkbench } from './compose-workbench';
import { cleanPageState } from '../../shell/navigation-state';
import { createWorkspaceView } from '../../modules/agent/services/workspace-view';

vi.mock('./surfaces/obsidian-status', () => ({ registerObsidianStatus: () => ({ refresh() {}, dispose() {} }) }));
vi.mock('./surfaces/ribbon', () => ({ registerWorkbenchRibbon() {} }));
vi.mock('./workbench-leaf', () => ({
	WORKBENCH_VIEW_TYPE: 'huhu-workbench-view',
	WorkbenchView: class {
		constructor(
			_leaf: unknown,
			readonly host: WorkbenchHost,
		) {}
	},
}));

function terminalContribution() {
	let viewFactory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const cleanups: (() => void)[] = [];
	const plugin = {
		services: { peek: () => undefined, watch: () => () => {} },
		moduleEnabled: () => true,
		moduleState: () => 'idle',
		registerView: (_type: string, create: typeof viewFactory) => {
			viewFactory = create;
		},
		register: (cleanup: () => void) => {
			cleanups.push(cleanup);
		},
		onModuleChanged: () => () => {},
		appSettings: { subscribe: () => () => {} },
		app: { workspace: { getLeavesOfType: () => [] } },
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	onTestFinished(() => {
		for (const cleanup of cleanups.reverse()) cleanup();
	});
	return viewFactory({} as WorkspaceLeaf).host.contributions.find((item) => item.id === 'terminal')!;
}

test('the real terminal contribution preserves a closed control tool through shell sanitization and view restoration', () => {
	const contribution = terminalContribution();
	const saved = cleanPageState(
		{
			agentControl: false,
			agentHistory: false,
			agentHistoryWidth: 350,
			agentTool: 'inbox',
			selectedRuntime: 'runtime-private',
			prompt: 'private draft',
			token: 'private-token',
		},
		contribution.stateKeys,
	);
	expect(saved).toEqual({ agentControl: false, agentHistory: false, agentHistoryWidth: 350, agentTool: 'inbox' });
	expect(createWorkspaceView(saved).getState()).toEqual({
		control: false,
		history: false,
		historyWidth: 350,
		jump: false,
		agentTool: 'inbox',
	});
});

test('first-open control default, history precedence and bounded view state still use the real contribution', () => {
	const keys = terminalContribution().stateKeys;
	expect(createWorkspaceView(cleanPageState({}, keys)).getState()).toEqual({
		control: true,
		history: false,
		historyWidth: 300,
		jump: false,
		agentTool: 'control',
	});
	const history = cleanPageState(
		{ agentControl: true, agentHistory: true, agentHistoryWidth: 900, jump: true },
		keys,
	);
	expect(history).toEqual({ agentControl: true, agentHistory: true, agentHistoryWidth: 900 });
	expect(createWorkspaceView(history).getState()).toEqual({
		control: false,
		history: true,
		historyWidth: 480,
		jump: false,
		agentTool: 'control',
	});
	expect(
		createWorkspaceView(cleanPageState({ agentControl: true, agentHistory: false }, keys)).getState().control,
	).toBe(true);
});


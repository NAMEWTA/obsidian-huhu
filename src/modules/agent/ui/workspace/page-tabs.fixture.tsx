import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { emptyWorkspace } from '../../core/workspace/model';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { AgentController } from '../../services/controller';
import type { TerminalSessions } from '../../services/terminal/sessions';
import { WorkspaceService, type ConfirmFn } from '../../services/workspace-service';
import { WorkspaceUIContext } from './workspace-context';

/** A real workspace service and a controller with just what the page tabs and the sidebar read. */
export function pageTabFixture() {
	const sessions = {
		subscribe: () => () => {},
		get: () => undefined,
		remove: vi.fn(),
		focus: vi.fn(),
	} as unknown as TerminalSessions;
	const persistence = {
		store: createStore(emptyWorkspace),
		ready: Promise.resolve(),
		flush: async () => {},
		dispose: async () => {},
	};
	const workspace = new WorkspaceService(persistence, sessions, {
		shell: vi.fn(),
		agent: vi.fn(),
		resume: vi.fn(),
		account: () => '',
		report: vi.fn(),
	});
	const settings = normalizeTerminalSettings(undefined);
	const controller = {
		workspace,
		sessions,
		settings: { get: () => settings, subscribe: () => () => {}, update: vi.fn(async () => {}) },
		historyStore: { refresh: vi.fn(async () => {}), store: createStore(() => ({ rows: [], loading: false, error: '', warnings: [] })) },
		stats: { store: createStore(() => ({ agentsLaunched: 0, agentWorkMs: 0, firstEventAt: null })) },
		agentTitle: () => '',
		open: vi.fn(async () => {}),
		show: vi.fn(),
	} as unknown as AgentController;
	const confirm = vi.fn<ConfirmFn>(async () => true);
	const close = (id: string) => {
		void workspace.close(id, confirm);
	};
	const wrap = (children: ReactNode) => (
		<TestProviders>
			<WorkspaceUIContext value={{ controller, confirm, close }}>{children}</WorkspaceUIContext>
		</TestProviders>
	);
	return {
		controller,
		workspace,
		confirm,
		wrap,
	};
}

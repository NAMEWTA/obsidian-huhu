import { VisibilityContext } from '../../../ui/react/contexts';
import { useState } from 'react';
import { vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { DesignScope } from '../../../ui/react/design-scope';
import type { AutomationDefinition, AutomationRun } from '../../../shared/automation/types';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { AutomationsApi } from '../core/api';
import { createAutomationViewStore } from '../services/view-store';
import type { AutomationViewHost } from './panel-contract';
import { AutomationsPage, initialPageState } from './AutomationsPage';

export const definition = (id: string): AutomationDefinition => ({
	id,
	name: id,
	enabled: true,
	deviceId: 'device',
	revision: 1,
	schedule: { kind: 'manual' },
	action: { kind: 'notify', body: `body ${id}` },
	channels: ['in-app'],
	notifyOn: 'always',
	graceMinutes: 720,
	createdAt: 0,
	updatedAt: 0,
});
export function fixture(definitions = [definition('Alpha'), definition('Beta')], runs: AutomationRun[] = []) {
	const listeners = new Set<() => void>();
	const service: AutomationsApi = {
		executionEnabled: true,
		deviceId: 'device',
		loadError: '',
		definitions,
		state: { runs, cursors: {} },
		sources: {
			list: async () => [],
			save: async () => {},
			remove: async () => {},
			open: async () => {},
			createTask: async () => {},
		},
		agent: () => undefined,
		subscribe: (fn) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		save: vi.fn(async (saved: AutomationDefinition) => {
			const index = definitions.findIndex((row) => row.id === saved.id);
			if (index < 0) definitions.push(structuredClone(saved));
			else definitions[index] = structuredClone(saved);
			listeners.forEach((listener) => listener());
		}),
		remove: vi.fn(async () => {}),
		clearHistory: async () => {},
		tick: async () => {},
		run: vi.fn(async () => undefined),
		stop: async () => {},
	};
	const view = createAutomationViewStore(service);
	const host: AutomationViewHost = {
		service,
		store: view.store,
		inbox: vi.fn(),
		retry: async () => {},
		refresh: vi.fn(async () => {}),
		cwd: '/vault',
		paths: () => [
			{ path: '/', kind: 'folder' },
			{ path: 'notes', kind: 'folder' },
			{ path: 'Note.md', kind: 'file' },
		],
		commands: () => [{ id: 'app:test', name: 'Test command' }],
	};
	const navigate = vi.fn();
	function Page({
		visible = true,
		onGuard,
	}: {
		visible?: boolean;
		onGuard?: (guard: (() => Promise<boolean>) | null) => void;
	}) {
		const [target, setTarget] = useState<WorkbenchTarget>({ feature: 'automations' });
		return (
			<TestProviders>
				<VisibilityContext.Provider value={visible}>
					<DesignScope>
						<AutomationsPage
							host={host}
							onLeaveGuard={onGuard}
							target={target}
							initialState={initialPageState({})}
							onState={() => {}}
							onNavigate={(next) => {
								setTarget(next);
								navigate(next);
							}}
							onPageMenu={() => {}}
							onNavigation={() => {}}
							onEditConsumed={() => {}}
						/>
					</DesignScope>
				</VisibilityContext.Provider>
			</TestProviders>
		);
	}
	return { service, host, view, Page, navigate, listeners };
}

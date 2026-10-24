import { expect, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { WorkspaceUsageStore } from './workspace-usage-store';
import type { HistoryStore, HistoryRow } from './history-store';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { TerminalSettings } from '../core/terminal/settings';
test('dashboard projection never aggregates outside rows and respects provider opt-outs', () => {
	const rows = [
		{
			key: 'inside',
			agentId: 'codex',
			inVault: true,
			usage: { input: 100, output: 20, cacheRead: 10, cacheWrite: 0, known: true, cost: null },
			modifiedAtMs: 1,
			cwd: '/vault/sub',
		},
		{
			key: 'outside',
			agentId: 'codex',
			inVault: false,
			usage: { input: 999999, output: 0, cacheRead: 0, cacheWrite: 0, known: true, cost: null },
			modifiedAtMs: 1,
			cwd: '/vault-other',
		},
		{
			key: 'disabled',
			agentId: 'claude-code',
			inVault: true,
			usage: { input: 9000, output: 0, cacheRead: 0, cacheWrite: 0, known: true, cost: null },
			modifiedAtMs: 1,
			cwd: '/vault',
		},
	] as HistoryRow[];
	const history = {
		vault: () => '/vault',
		store: createStore(() => ({ rows, loading: false, error: '' })),
		refresh: vi.fn(),
	} as unknown as HistoryStore;
	const settings = {
		get: () => ({ usageAnalytics: { codex: true, 'claude-code': false } }),
		subscribe: () => () => {},
	} as unknown as SettingsHandle<TerminalSettings>;
	const store = new WorkspaceUsageStore(history, settings);
	expect(store.snapshot().workspace).toMatchObject({
		total: 120,
		sessions: 1,
		knownSessions: 1,
		providers: [{ id: 'codex', input: 90, output: 20, total: 120 }],
	});
	store.dispose();
});

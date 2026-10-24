import { createStore } from 'zustand/vanilla';
import type { AgentUsage, UsageSnapshot } from '../api';
import type { HistoryStore } from './history-store';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { TerminalSettings } from '../core/terminal/settings';
import { getAgent } from '../core/launch/catalog';
import type { AgentId } from '../core/launch/types';
import { aggregate } from '../core/stats/aggregate';

/** The public workbench projection contains only canonically scoped workspace history. */
export class WorkspaceUsageStore implements AgentUsage {
	private store = createStore<UsageSnapshot>(() => ({
		providers: [],
		refreshing: false,
		workspace: { root: this.history.vault(), total: 0, sessions: 0, knownSessions: 0, providers: [] },
	}));
	private off: (() => void)[];
	private windows = new Map<Window, number>();
	private refreshed = 0;
	private focus = () => {
		if (Date.now() - this.refreshed > 60_000) void this.refresh();
	};
	constructor(
		private history: HistoryStore,
		private settings: SettingsHandle<TerminalSettings>,
	) {
		this.off = [history.store.subscribe(() => this.update()), settings.subscribe(() => this.update())];
		this.update();
	}
	private update() {
		const state = this.history.store.getState();
		const rows = state.rows.filter(
			(row) => row.inVault && this.settings.get().usageAnalytics[row.agentId as AgentId],
		);
		const providers = [...new Set(rows.map((row) => row.agentId))]
			.map((id) => {
				const own = rows.filter((row) => row.agentId === id),
					totals = aggregate(own).totals;
				return {
					id,
					name: getAgent(id as AgentId).title,
					total: totals.total,
					input: totals.input,
					output: totals.output,
					sessions: own.length,
					knownSessions: own.filter((row) => row.usage.known).length,
				};
			})
			.sort((a, b) => b.total - a.total);
		this.store.setState(
			{
				refreshing: state.loading,
				lastRefreshAt: this.refreshed,
				providers: providers.map((provider) => ({ id: provider.id, name: provider.name, windows: [] })),
				workspace: {
					root: this.history.vault(),
					total: aggregate(rows).totals.total,
					sessions: rows.length,
					knownSessions: rows.filter((row) => row.usage.known).length,
					providers,
					error: state.error,
				},
			},
			true,
		);
	}
	snapshot = () => this.store.getState();
	subscribe = (listener: () => void) => this.store.subscribe(listener);
	async refresh() {
		this.refreshed = Date.now();
		await this.history.refresh();
		this.update();
	}
	observeWindow(win: Window) {
		if (!this.windows.has(win)) win.addEventListener('focus', this.focus);
		this.windows.set(win, (this.windows.get(win) ?? 0) + 1);
		this.focus();
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const count = (this.windows.get(win) ?? 1) - 1;
			if (count) this.windows.set(win, count);
			else {
				win.removeEventListener('focus', this.focus);
				this.windows.delete(win);
			}
		};
	}
	setDisplay() {}
	dispose() {
		for (const off of this.off) off();
		for (const win of this.windows.keys()) win.removeEventListener('focus', this.focus);
		this.windows.clear();
	}
}

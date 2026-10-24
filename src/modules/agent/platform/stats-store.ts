import { JsonStore } from '../../../shared/json-store';
import type { TextStorage } from '../../../shared/storage/ports';
import type { AgentStats } from '../core/stats/aggregate';
export function statsStore(storage: TextStorage, device: string, workspace = false) {
	return new JsonStore<AgentStats>(storage, `.huhu/terminal-agent/${device}/${workspace ? 'workspace-stats' : 'stats'}.json`, (v): v is AgentStats => {
		if (!v || typeof v !== 'object') return false;
		const s = v as AgentStats;
		return (
			s.version === 1 &&
			(s.firstEventAt === null || nonnegative(s.firstEventAt)) &&
			nonnegative(s.agentsLaunched) &&
			nonnegative(s.agentWorkMs) &&
			buckets(s.daily) &&
			buckets(s.byAgent)
		);
	});
}
function nonnegative(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function buckets(value: unknown): boolean {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).every((row: unknown) => {
			if (!row || typeof row !== 'object') return false;
			const counter = row as { launched?: unknown; workMs?: unknown };
			return nonnegative(counter.launched) && nonnegative(counter.workMs);
		})
	);
}

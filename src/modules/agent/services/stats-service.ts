import { createStore } from 'zustand/vanilla';
import type { TextStorage } from '../../../shared/storage/ports';
import { emptyStats, recordStats, type AgentStats } from '../core/stats/aggregate';
import { statsStore } from '../platform/stats-store';
import type { TerminalSessions } from './terminal/sessions';
export class StatsService {
	readonly store = createStore<AgentStats>(() => emptyStats());
	private disk;
	private baseline = emptyStats();
	private seen = new Set<string>();
	private working = new Map<string, { agent: string; at: number }>();
	private timer?: number;
	private unsubscribe = () => {};
	private disposed = false;
	private dirty = false;
	private pending = Promise.resolve();
	private captures = Promise.resolve();
	readonly ready: Promise<void>;
	constructor(
		storage: TextStorage,
		device: string,
		private clock: Pick<Window, 'setTimeout' | 'clearTimeout'>,
		private sessions: TerminalSessions,
		private report: (e: unknown) => void,
		private contains?: (cwd: string) => Promise<boolean>,
	) {
		this.disk = statsStore(storage, device, !!contains);
		this.ready = this.disk
			.load(emptyStats())
			.then((value) => {
				this.baseline = value;
				this.store.setState(value, true);
				if (!this.disposed) {
					this.unsubscribe = sessions.subscribe(() => {
						void this.capture();
					});
					return this.capture();
				}
				return undefined;
			})
			.catch(report);
	}
	private capture(): Promise<void> {
		const now = Date.now(),
			rows = this.sessions.list().map((session) => ({
				id: session.id,
				cwd: session.cwd,
				agentId: session.agentId,
				connection: session.connection,
				running: session.running,
				activity: session.activity,
			}));
		this.captures = this.captures
			.then(async () => {
				const live = new Set<string>();
				for (const session of rows) {
					if (!session.agentId || (this.contains && !(await this.contains(session.cwd)))) continue;
					live.add(session.id);
					if (session.connection === 'connected' && !this.seen.has(session.id)) {
						this.seen.add(session.id);
						this.record(session.agentId, now, 1, 0);
					}
					if (session.activity === 'running' && session.running) {
						if (!this.working.has(session.id))
							this.working.set(session.id, { agent: session.agentId, at: now });
					} else this.finish(session.id, now);
				}
				for (const id of this.working.keys()) if (!live.has(id)) this.finish(id, now);
			})
			.catch(this.report);
		return this.captures;
	}
	private finish(id: string, now: number) {
		const value = this.working.get(id);
		if (!value) return;
		this.working.delete(id);
		let at = value.at;
		// Split work at UTC midnight, matching native token buckets.
		while (at < now) {
			const end = Math.min(now, (Math.floor(at / 86400000) + 1) * 86400000);
			this.record(value.agent, at, 0, end - at);
			at = end;
		}
	}
	private record(agent: string, at: number, launched: number, workMs: number) {
		this.store.setState(recordStats(this.store.getState(), agent, at, launched, workMs), true);
		this.dirty = true;
		if (this.timer !== undefined) this.clock.clearTimeout(this.timer);
		this.timer = this.clock.setTimeout(() => {
			this.timer = undefined;
			void this.flush();
		}, 500);
	}
	flush(): Promise<void> {
		if (this.timer !== undefined) this.clock.clearTimeout(this.timer);
		this.timer = undefined;
		this.pending = this.pending.then(async () => {
			if (!this.dirty) return;
			this.dirty = false;
			try {
				this.baseline = await this.disk.commit({ base: this.baseline, value: this.store.getState() });
			} catch (error) {
				this.dirty = true;
				this.report(error);
			}
		});
		return this.pending;
	}
	async dispose() {
		this.disposed = true;
		this.unsubscribe();
		await this.ready;
		await this.captures;
		for (const id of this.working.keys()) this.finish(id, Date.now());
		await this.flush();
	}
}

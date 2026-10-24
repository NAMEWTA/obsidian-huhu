import { createStore } from 'zustand/vanilla';
import {
	SkillError, buildRecords, skillCell,
	type SkillOps, type SkillRecord, type SkillRoot, type SkillTargetId,
} from '../core/skills/library';

export interface SkillManagerState {
	records: SkillRecord[];
	roots: SkillRoot[];
	unavailable: string[];
	loading: boolean;
	loaded: boolean;
	error: string;
	/** `${record key}|${target}` of the toggles in flight, and `${record key}|*` while a skill is being updated. */
	pending: string[];
}

export interface SkillManagerDeps {
	load: () => Promise<SkillOps>;
	extraDirectories: () => readonly string[];
}

const INITIAL: SkillManagerState = { records: [], roots: [], unavailable: [], loading: false, loaded: false, error: '', pending: [] };

export const pendingId = (record: SkillRecord, target: SkillTargetId | '*'): string => `${record.key}|${target}`;

/**
 * Skills found in the shared, per-agent and vault directories, merged by name and scope.
 * Enabling a skill for an agent copies its folder into that agent's directory of the same scope;
 * disabling removes only the copies this manager made. Nothing is scanned until `refresh` is called.
 */
export class SkillManager {
	readonly state = createStore<SkillManagerState>(() => INITIAL);
	private ops?: Promise<SkillOps>;
	private abort?: AbortController;
	private queue: Promise<unknown> = Promise.resolve();
	private closed = false;
	constructor(private readonly deps: SkillManagerDeps) {}

	private get opsReady(): Promise<SkillOps> { return this.ops ??= this.deps.load(); }

	async refresh(): Promise<void> {
		this.abort?.abort();
		const abort = new AbortController();
		this.abort = abort;
		this.state.setState({ loading: true, error: '' });
		try {
			const ops = await this.opsReady;
			const roots = await ops.roots();
			const scan = await ops.scan(roots, this.deps.extraDirectories(), abort.signal);
			if (abort.signal.aborted || this.closed) return;
			this.state.setState({ records: buildRecords(scan.locations), roots, unavailable: scan.unavailable, loading: false, loaded: true });
		} catch (error) {
			if (abort.signal.aborted || this.closed) return;
			this.state.setState({ loading: false, loaded: true, error: error instanceof Error ? error.message : String(error) });
		}
	}

	private record(key: string): SkillRecord {
		const record = this.state.getState().records.find(item => item.key === key);
		if (!record) throw new SkillError('unavailable');
		return record;
	}

	private run(ids: string[], task: (ops: SkillOps) => Promise<void>): Promise<void> {
		const mark = (add: boolean) => this.state.setState(state => ({ pending: add ? [...state.pending, ...ids] : state.pending.filter(id => !ids.includes(id)) }));
		const next = this.queue.then(async () => {
			if (this.closed) throw new SkillError('unavailable');
			mark(true);
			try { await task(await this.opsReady); await this.refresh(); }
			finally { mark(false); }
		});
		this.queue = next.catch(() => undefined);
		return next;
	}

	/** Enable (copy) or disable (remove the copy) a skill for one agent. A hand-placed folder is never touched. */
	toggle(key: string, target: SkillTargetId, options: { permanent?: boolean } = {}): Promise<void> {
		const record = this.record(key);
		return this.run([pendingId(record, target)], async ops => {
			const cell = skillCell(this.record(key), target);
			if (cell.state === 'manual') throw new SkillError('not-owned');
			if (cell.state === 'off') {
				const source = this.record(key).source;
				if (!source) throw new SkillError('no-source');
				const root = this.state.getState().roots.find(item => item.target === target && item.scope === record.scope);
				if (!root) throw new SkillError('unknown-target');
				await ops.copy(source, root);
			} else await ops.remove(cell.location, options.permanent ? 'delete' : 'trash');
		});
	}

	/** Copy the current source over every copy of this skill that has fallen behind. */
	update(key: string): Promise<void> {
		const record = this.record(key);
		return this.run([pendingId(record, '*')], async ops => {
			const current = this.record(key);
			if (!current.source) throw new SkillError('no-source');
			for (const location of current.locations) if (location.copy && location.copy.hash !== current.source.hash) await ops.update(current.source, location);
		});
	}

	/** Open a known skills directory or skill folder; any other path is refused. */
	async open(dir: string): Promise<void> {
		const { roots, records } = this.state.getState();
		if (!roots.some(root => root.dir === dir) && !records.some(record => record.locations.some(location => location.dir === dir))) throw new SkillError('unavailable');
		await (await this.opsReady).open(dir);
	}

	dispose(): void {
		this.closed = true;
		this.abort?.abort();
	}
}

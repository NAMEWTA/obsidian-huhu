import { AgentBrowserError, type BrowserRunEvent, type BrowserEventType } from '../core/contracts';
export type RunEventInput = Pick<BrowserRunEvent, 'kind' | 'spaceId' | 'runtimeId'> & Partial<Pick<BrowserRunEvent, 'type' | 'epoch' | 'entityId' | 'pageId' | 'state' | 'code'>>;
const metadataTypes = new Set<BrowserEventType>(['controlChanged', 'operationChanged', 'runtimeFault', 'cleanupChanged']);
interface Stream { id: string; next: number; rows: BrowserRunEvent[]; sealed: boolean; requiresId: boolean }
/** Pull-only metadata ring. Slow readers cannot block control/dispatch; missing history requires a snapshot. */
export class RunEvents {
	private runs = new Map<string, Stream>();
	private generation = 0;
	constructor(private readonly id = () => `events-${++this.generation}`, private readonly now = () => Date.now()) {}
	open(id: string, requiresId = false) {
		if (this.runs.size >= 128) {
			const retired = [...this.runs].find(([, run]) => run.sealed);
			if (!retired) throw new AgentBrowserError('event_stream_quota');
			this.runs.delete(retired[0]);
		}
		this.runs.set(id, { id: this.id(), next: 1, rows: [], sealed: false, requiresId });
	}
	close(id: string) { this.runs.delete(id); }
	has(id: string) { return this.runs.has(id); }
	seal(id: string) { const run = this.runs.get(id); if (run) run.sealed = true; }
	append(id: string, event: RunEventInput) {
		const run = this.runs.get(id); if (!run) return;
		const type = event.type ?? (event.kind === 'page' || event.kind === 'page-closed' ? 'pageChanged' : event.kind);
		if (run.sealed && !metadataTypes.has(type)) return;
		const sequence = run.next++;
		// Explicit projection prevents a future caller's spread object from smuggling payloads into replay.
		run.rows.push({ eventId: `${run.id}:${sequence}`, streamId: run.id, streamSequence: sequence, entityVersion: sequence, sequence, at: this.now(), type, kind: event.kind,
			spaceId: event.spaceId, runtimeId: event.runtimeId, epoch: event.epoch ?? 0,
			...(event.entityId ? { entityId: event.entityId } : {}), ...(event.pageId ? { pageId: event.pageId } : {}),
			...(event.state ? { state: event.state } : {}), ...(event.code === 'runtime_fault' ? { code: event.code } : {}) });
		if (run.rows.length > 256) run.rows.shift();
	}
	private stream(id: string) { const run = this.runs.get(id); if (!run) throw new AgentBrowserError('resync_required'); return run; }
	cursor(id: string): number { return this.stream(id).next - 1; }
	poll(id: string, after = 0, streamId?: string): BrowserRunEvent[] {
		const run = this.stream(id);
		if (run.requiresId && streamId === undefined || streamId !== undefined && streamId !== run.id) throw new AgentBrowserError('resync_required');
		if (after < 0 || !Number.isSafeInteger(after) || after >= run.next) throw new AgentBrowserError('invalid_event_cursor');
		const oldest = run.rows[0]?.sequence ?? run.next;
		if (after < oldest - 1) throw new AgentBrowserError('resync_required');
		return run.rows.filter(row => row.sequence > after && (!run.sealed || metadataTypes.has(row.type))).map(row => ({ ...row }));
	}
	/** Reentrant native callbacks may change state during a synchronous projection read; never pair mismatched data/cursor. */
	snapshot<T>(id: string, read: () => T): { streamId: string; cursor: number; projection: T } {
		for (let attempt = 0; attempt < 3; attempt++) {
			const run = this.stream(id), cursor = run.next - 1, projection = read();
			if (this.runs.get(id) === run && cursor === run.next - 1) return { streamId: run.id, cursor, projection };
		}
		throw new AgentBrowserError('resync_required');
	}
	clear() { this.runs.clear(); }
}

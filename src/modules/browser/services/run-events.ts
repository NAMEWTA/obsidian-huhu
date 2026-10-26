import { AgentBrowserError, type BrowserRunEvent } from '../core/contracts';
/** Metadata only. Page text, credentials, capabilities and command payloads never enter this ring. */
export class RunEvents {
	private runs = new Map<string, { next: number; rows: BrowserRunEvent[] }>();
	open(id: string) {
		this.runs.set(id, { next: 1, rows: [] });
	}
	close(id: string) {
		this.runs.delete(id);
	}
	append(id: string, event: Omit<BrowserRunEvent, 'sequence' | 'at'>) {
		const run = this.runs.get(id);
		if (!run) return;
		run.rows.push({ ...event, sequence: run.next++, at: Date.now() });
		if (run.rows.length > 256) run.rows.shift();
	}
	cursor(id: string): number {
		const run = this.runs.get(id);
		if (!run) throw new AgentBrowserError('run_revoked');
		return run.next - 1;
	}
	poll(id: string, after = 0): BrowserRunEvent[] {
		const run = this.runs.get(id);
		if (!run) throw new AgentBrowserError('run_revoked');
		if (after < 0 || !Number.isSafeInteger(after) || after >= run.next)
			throw new AgentBrowserError('invalid_event_cursor');
		const oldest = run.rows[0]?.sequence ?? run.next;
		if (after < oldest - 1) throw new AgentBrowserError('resync_required');
		return run.rows.filter((r) => r.sequence > after).map((r) => ({ ...r }));
	}
	clear() {
		this.runs.clear();
	}
}

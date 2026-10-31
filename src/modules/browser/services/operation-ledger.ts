import {
	AgentBrowserError,
	type BrowserPersistence,
	type JsonValue,
	type OperationRecord,
	type OperationScope,
	type BrowserOperationSummary,
} from '../core/contracts';
import { IdentityError } from '../core/identity';
import { BrowserFileError } from '../core/files';

/** Only our typed error codes cross a process boundary; exception text may contain credentials or paths. */
export function operationErrorCode(error: unknown): string {
	return error instanceof AgentBrowserError || error instanceof IdentityError || error instanceof BrowserFileError
		? error.code
		: 'operation_failed';
}
function canonical(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
		.join(',')}}`;
}
const copy = <T>(value: T): T => structuredClone(value);
const final = (state: OperationRecord['state']) => state !== 'prepared' && state !== 'dispatching';
const CHECKPOINT = 'operation-checkpoint', RETENTION = 30 * 86_400_000, TICKET_TTL = 300_000;
const MAX_RECORDS = 10_000, MAX_PREPARED = 256, MAX_ISSUER_PREPARED = 64;
interface Entry extends OperationRecord { resultDigest?: string }
interface Issuer { id: string; key: string; scope: OperationScope; issued: number; lowWater: number; closed: boolean }
interface Checkpoint { version: 1; issuers: Issuer[]; entries: Entry[] }
const ticketPattern = /^op\.([a-zA-Z0-9_-]{1,100})\.([1-9][0-9]{0,15})$/;
const issuerKey = (scope: OperationScope) => canonical([scope.principal, scope.issuerId, scope.authorityId ?? null, scope.spaceId ?? null]);

/** The checkpoint is authoritative for reservation, dispatch intent and collection.
 * Result files are staged before completion and deleted only after a collected checkpoint is read back.
 * An uncertain commit poisons this owner until recovery; it never retries a possibly dispatched action.
 */
export class OperationLedger {
	private checkpoint: Checkpoint = { version: 1, issuers: [], entries: [] };
	private readonly records = new Map<string, Entry>();
	private readonly requests = new Map<string, string>();
	private readonly results = new Map<string, JsonValue>();
	private readonly active = new Map<string, Promise<OperationRecord>>();
	private readonly deadlines = new Map<string, number>();
	private queue: Promise<unknown> = Promise.resolve();
	private initializing?: Promise<void>;
	private faulted = false;
	constructor(
		private readonly storage: BrowserPersistence,
		private readonly now = () => Date.now(),
		private readonly writable: (scope: OperationScope) => boolean = () => true,
		private readonly monotonic = () => performance.now(),
		private readonly changed?: (scope: OperationScope, operation: BrowserOperationSummary, retired: boolean) => void,
	) {}
	private serial<T>(fn: () => Promise<T>): Promise<T> {
		const task = this.queue.then(fn, fn); this.queue = task.catch(() => undefined); return task;
	}
	private available() { if (this.faulted) throw new AgentBrowserError('journal_unavailable'); }
	private requestKey(scope: OperationScope, requestId: string) { return canonical([issuerKey(scope), requestId]); }
	private install(checkpoint: Checkpoint) {
		const previous = this.changed ? new Map(this.records) : undefined;
		this.checkpoint = checkpoint; this.records.clear(); this.requests.clear();
		for (const record of checkpoint.entries) {
			this.records.set(record.id, record);
			this.requests.set(this.requestKey(record.scope, record.requestId), record.id);
		}
		if (previous) {
			for (const record of this.records.values()) if (canonical(record) !== canonical(previous.get(record.id))) this.emitChange(record);
			for (const record of previous.values()) if (!this.records.has(record.id)) this.emitChange(record, true);
		}
	}
	private summary(record: Entry): BrowserOperationSummary { return { id: record.id, state: record.state, updatedAt: record.updatedAt, ...(record.sequence !== undefined ? { sequence: record.sequence } : {}) }; }
	private emitChange(record: Entry, retired = false) {
		try { this.changed?.(copy(record.scope), this.summary(record), retired); } catch { /* Projection notifications cannot change committed operation facts. */ }
	}
	summaries(scope: Pick<OperationScope, 'principal' | 'issuerId'>): BrowserOperationSummary[] {
		return [...this.records.values()].filter(record => record.scope.principal === scope.principal && record.scope.issuerId === scope.issuerId).map(record => this.summary(record));
	}
	private async commit(checkpoint: Checkpoint) {
		this.available();
		try {
			await this.storage.write(CHECKPOINT, checkpoint);
			const restored = await this.storage.read<Checkpoint>(CHECKPOINT);
			if (canonical(restored) !== canonical(checkpoint)) throw new AgentBrowserError('journal_corrupt');
			this.install(checkpoint);
		} catch (error) { this.faulted = true; throw error; }
	}
	private validRecord(record: Entry): boolean {
		return !!record && typeof record.id === 'string' && typeof record.requestId === 'string' && typeof record.digest === 'string' &&
			!!record.scope && ['agent', 'human', 'workspace'].includes(record.scope.principal) && typeof record.scope.issuerId === 'string' &&
			['prepared', 'dispatching', 'completed', 'rejected', 'failed', 'cancelled_before_dispatch', 'outcome_unknown'].includes(record.state) &&
			Number.isFinite(record.createdAt) && Number.isFinite(record.updatedAt);
	}
	initialize(): Promise<void> { return this.initializing ??= this.open(); }
	private async open() {
		let checkpoint = await this.storage.read<Checkpoint>(CHECKPOINT);
		if (checkpoint) {
			if (checkpoint.version !== 1 || !Array.isArray(checkpoint.entries) || !Array.isArray(checkpoint.issuers) || checkpoint.entries.length > MAX_RECORDS ||
				checkpoint.entries.some(record => !this.validRecord(record)) || new Set(checkpoint.entries.map(record => record.id)).size !== checkpoint.entries.length ||
				checkpoint.issuers.some(issuer => !issuer || typeof issuer.id !== 'string' || typeof issuer.key !== 'string' || !issuer.scope || typeof issuer.closed !== 'boolean' || !Number.isSafeInteger(issuer.issued) || !Number.isSafeInteger(issuer.lowWater) || issuer.lowWater < 0 || issuer.lowWater > issuer.issued))
				throw new AgentBrowserError('journal_corrupt');
			for (const record of checkpoint.entries) if (record.sequence !== undefined) {
				const parsed = ticketPattern.exec(record.id), issuer = checkpoint.issuers.find(row => row.id === parsed?.[1]);
				if (!issuer || Number(parsed?.[2]) !== record.sequence || record.sequence <= issuer.lowWater || record.sequence > issuer.issued || issuer.key !== issuerKey(record.scope)) throw new AgentBrowserError('journal_corrupt');
			}
			if (new Set(checkpoint.issuers.map(issuer => issuer.id)).size !== checkpoint.issuers.length || new Set(checkpoint.issuers.map(issuer => issuer.key)).size !== checkpoint.issuers.length ||
				new Set(checkpoint.entries.map(record => this.requestKey(record.scope, record.requestId))).size !== checkpoint.entries.length) throw new AgentBrowserError('journal_corrupt');
			for (const issuer of checkpoint.issuers) {
				const entries = checkpoint.entries.filter(record => ticketPattern.exec(record.id)?.[1] === issuer.id);
				if (entries.length !== issuer.issued - issuer.lowWater || issuer.key !== issuerKey(issuer.scope)) throw new AgentBrowserError('journal_corrupt');
			}
			if (checkpoint.entries.some(record => record.id.startsWith('op.') && (!Number.isSafeInteger(record.sequence) || !Number.isFinite(record.expiresAt)))) throw new AgentBrowserError('journal_corrupt');
		} else {
			checkpoint = { version: 1, issuers: [], entries: [] };
			const keys = await this.storage.keys('operations/');
			if (keys.length > MAX_RECORDS) throw new AgentBrowserError('operation_quota');
			for (const key of keys) {
				const record = await this.storage.read<Entry>(key);
				// A v2 result without its checkpoint cannot prove that a ticket was never dispatched.
				if (!record || !this.validRecord(record) || key !== `operations/${record.id}` || record.sequence !== undefined || record.id.startsWith('op.')) throw new AgentBrowserError('journal_corrupt');
				if (record.result !== undefined) record.resultDigest = await this.storage.digest(canonical(record.result));
				delete record.result; checkpoint.entries.push(record);
			}
		}
		for (const record of checkpoint.entries) {
			if (record.state === 'dispatching' || record.state === 'prepared') {
				record.state = record.state === 'dispatching' ? 'outcome_unknown' : 'cancelled_before_dispatch'; record.error = 'process_interrupted';
			}
			if (record.resultDigest) {
				try {
					const body = await this.storage.read<OperationRecord>(`operations/${record.id}`);
					if (!body || body.id !== record.id || body.digest !== record.digest || body.result === undefined || await this.storage.digest(canonical(body.result)) !== record.resultDigest) throw new AgentBrowserError('result_unavailable');
					this.results.set(record.id, body.result);
				} catch (error) {
					if (!(error instanceof AgentBrowserError) || !['storage_corrupt', 'result_unavailable'].includes(error.code)) throw error;
					delete record.resultDigest; record.error = 'result_unavailable';
				}
			}
		}
		if (this.storage.readOnly) this.install(checkpoint); else await this.commit(checkpoint);
	}
	private publicRecord(record: Entry): OperationRecord {
		const { resultDigest: _digest, ...metadata } = record;
		void _digest;
		return copy({ ...metadata, ...(record.resultDigest && this.results.has(record.id) ? { result: this.results.get(record.id)! } : {}) });
	}
	async prepare(requestId: string, scope: OperationScope, payload: unknown, timeoutMs = TICKET_TTL): Promise<OperationRecord> {
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new AgentBrowserError('deadline_invalid');
		const deadline = this.monotonic() + Math.min(TICKET_TTL, timeoutMs);
		await this.initialize();
		return this.serial(async () => {
			this.available();
			if (!this.writable(scope)) throw new AgentBrowserError('operation_scope_expired');
			if (!/^[a-zA-Z0-9_.:-]{1,160}$/.test(requestId)) throw new AgentBrowserError('invalid_request_id');
			const digest = await this.storage.digest(canonical({ scope, payload }));
			const previous = this.requests.get(this.requestKey(scope, requestId));
			if (previous) {
				const record = this.records.get(previous)!;
				if (record.digest !== digest) throw new AgentBrowserError('request_id_conflict');
				return this.publicRecord(record);
			}
			const next = copy(this.checkpoint), key = issuerKey(scope);
			let issuer = next.issuers.find(row => row.key === key);
			if (issuer?.closed) throw new AgentBrowserError('operation_scope_expired');
			for (const record of next.entries) if (record.state === 'prepared' && this.expired(record) && !this.active.has(record.id)) {
				record.state = 'cancelled_before_dispatch'; record.error = 'operation_expired';
			}
			const pending = next.entries.filter(record => record.state === 'prepared');
			if (next.entries.length >= MAX_RECORDS || pending.length >= MAX_PREPARED || pending.filter(record => issuerKey(record.scope) === key).length >= MAX_ISSUER_PREPARED) throw new AgentBrowserError('operation_quota');
			if (!issuer) { issuer = { id: this.storage.id(), key, scope: copy(scope), issued: 0, lowWater: 0, closed: false }; next.issuers.push(issuer); }
			if (!Number.isSafeInteger(issuer.issued + 1)) throw new AgentBrowserError('operation_quota');
			const remaining = deadline - this.monotonic();
			if (remaining <= 0) throw new AgentBrowserError('deadline_invalid');
			const at = this.now(), sequence = ++issuer.issued;
			const record: Entry = { id: `op.${issuer.id}.${sequence}`, sequence, expiresAt: at + remaining, requestId, digest, scope: copy(scope), state: 'prepared', createdAt: at, updatedAt: at };
			next.entries.push(record); await this.commit(next); this.deadlines.set(record.id, deadline); return this.publicRecord(record);
		});
	}
	get(id: string, scope?: Pick<OperationScope, 'principal' | 'issuerId'>): OperationRecord | undefined {
		const record = this.records.get(id);
		if (record) return !scope || scope.principal === record.scope.principal && scope.issuerId === record.scope.issuerId ? this.publicRecord(record) : undefined;
		const parsed = ticketPattern.exec(id);
		if (parsed) {
			const issuer = this.checkpoint.issuers.find(row => row.id === parsed[1]);
			if (scope && issuer && (issuer.scope.principal !== scope.principal || issuer.scope.issuerId !== scope.issuerId)) return undefined;
			if (!issuer || Number(parsed[2]) <= issuer.lowWater) throw new AgentBrowserError('operation_gone');
		}
		throw new AgentBrowserError('operation_gone');
	}
	private async update(record: Entry) {
		const next = copy(this.checkpoint), index = next.entries.findIndex(row => row.id === record.id);
		if (index < 0) throw new AgentBrowserError('operation_gone');
		next.entries[index] = copy(record); await this.commit(next);
	}
	private expired(record: Entry) {
		const deadline = this.deadlines.get(record.id);
		return deadline !== undefined ? deadline <= this.monotonic() : record.expiresAt !== undefined && record.expiresAt <= this.now();
	}
	private async storeResult(record: Entry, result: JsonValue) {
		for (;;) {
			try { await this.storage.write(`operations/${record.id}`, { ...record, result }); return; }
			catch (error) {
				if (!(error instanceof AgentBrowserError) || error.code !== 'storage_quota') throw error;
				const collected = await this.serial(async () => {
					const oldest = this.checkpoint.entries.filter(entry => entry.resultDigest && final(entry.state) && !this.active.has(entry.id)).sort((a, b) => a.updatedAt - b.updatedAt)[0];
					if (!oldest) return false;
					const expired = copy(oldest); delete expired.resultDigest; expired.error = 'result_unavailable';
					await this.update(expired);
					await this.storage.remove(`operations/${oldest.id}`); this.results.delete(oldest.id); return true;
				});
				if (!collected) throw error;
				// Retry only the idempotent local result write; the webpage dispatch is never repeated.
			}
		}
	}
	async execute(id: string, payload: unknown, validate: (scope: OperationScope) => void | Promise<void>, dispatch: (scope: OperationScope) => Promise<JsonValue>, remainingMs?: () => number): Promise<OperationRecord> {
		const budget = remainingMs?.(), deadline = budget === undefined ? undefined : this.monotonic() + Math.max(0, Math.min(60_000, budget));
		const requestExpired = () => {
			if (deadline === undefined) return false;
			const remaining = remainingMs!();
			return !Number.isFinite(deadline) || deadline <= this.monotonic() || !Number.isFinite(remaining) || remaining <= 0;
		};
		await this.initialize();
		const { action } = await this.serial(async () => {
			this.available();
			const publicRecord = this.get(id), record = this.records.get(id);
			if (!record || !publicRecord) throw new AgentBrowserError('operation_not_found');
			const digest = await this.storage.digest(canonical({ scope: record.scope, payload }));
			if (record.digest !== digest) throw new AgentBrowserError('operation_payload_mismatch');
			const previous = this.active.get(id);
			// A retry's deadline cannot replace the budget of the operation that already claimed this ticket.
			if (previous) return { action: previous };
			if (final(record.state)) return { action: Promise.resolve(publicRecord) };
			const action = this.executeOnce(copy(record), validate, dispatch, requestExpired); this.active.set(id, action);
			return { action };
		});
		try { return copy(await action); } finally { if (this.active.get(id) === action) this.active.delete(id); }
	}
	private async executeOnce(record: Entry, validate: (scope: OperationScope) => void | Promise<void>, dispatch: (scope: OperationScope) => Promise<JsonValue>, requestExpired: () => boolean): Promise<OperationRecord> {
		try {
			if (!this.writable(record.scope)) throw new AgentBrowserError('operation_scope_expired');
			if (this.expired(record) || requestExpired()) throw new AgentBrowserError('operation_expired');
			await validate(copy(record.scope));
			if (!this.writable(record.scope)) throw new AgentBrowserError('operation_scope_expired');
			if (this.expired(record) || requestExpired()) throw new AgentBrowserError('operation_expired');
		} catch (error) {
			record.state = 'rejected'; record.error = operationErrorCode(error); record.updatedAt = this.now();
			await this.serial(() => this.update(record)); return this.publicRecord(record);
		}
		record.state = 'dispatching'; record.updatedAt = this.now();
		try { await this.serial(() => this.update(record)); }
		catch { record.state = 'cancelled_before_dispatch'; record.error = 'journal_unavailable'; this.records.set(record.id, record); this.emitChange(record); return this.publicRecord(record); }
		try {
			if (!this.writable(record.scope)) throw new AgentBrowserError('operation_scope_expired');
			if (this.expired(record) || requestExpired()) throw new AgentBrowserError('operation_expired');
		} catch (error) {
			record.state = 'cancelled_before_dispatch'; record.error = operationErrorCode(error); record.updatedAt = this.now();
			try { await this.serial(() => this.update(record)); } catch { this.records.set(record.id, record); this.emitChange(record); }
			return this.publicRecord(record);
		}
		try {
			const result = await dispatch(copy(record.scope));
			if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 8 * 1024 * 1024) throw new AgentBrowserError('result_too_large');
			record.state = 'completed'; record.updatedAt = this.now(); record.resultDigest = await this.storage.digest(canonical(result));
			await this.storeResult(record, result);
			await this.serial(() => this.update(record)); this.results.set(record.id, result);
		} catch (error) {
			delete record.resultDigest; record.state = 'outcome_unknown'; record.error = operationErrorCode(error); record.updatedAt = this.now();
			try { await this.serial(() => this.update(record)); } catch { this.records.set(record.id, record); this.emitChange(record); /* Durable intent remains uncertain; never replay it. */ }
		}
		return this.publicRecord(record);
	}
	/** Exact request mappings outlive result bodies while their original authority can still write. */
	async prune(): Promise<void> {
		await this.initialize();
		await this.serial(async () => {
			this.available(); const next = copy(this.checkpoint), garbage = new Set<string>();
			for (const issuer of next.issuers) if (!this.writable(issuer.scope)) issuer.closed = true;
			for (const record of next.entries) {
				if (this.active.has(record.id)) continue;
				if (record.state === 'prepared' && this.expired(record)) { record.state = 'cancelled_before_dispatch'; record.error = 'operation_expired'; }
				if (final(record.state) && this.now() - record.updatedAt >= RETENTION && record.resultDigest) {
					delete record.resultDigest; record.error = 'result_unavailable'; garbage.add(record.id);
				}
			}
			for (const issuer of next.issuers) {
				if (!issuer.closed) continue;
				const ordered = next.entries.filter(record => ticketPattern.exec(record.id)?.[1] === issuer.id).sort((a, b) => a.sequence! - b.sequence!);
				for (const record of ordered) {
					if (!final(record.state) || this.active.has(record.id) || this.now() - record.updatedAt < RETENTION || record.sequence !== issuer.lowWater + 1) break;
					issuer.lowWater = record.sequence!; garbage.add(record.id);
				}
			}
			next.entries = next.entries.filter(record => {
				const parsed = ticketPattern.exec(record.id), issuer = parsed && next.issuers.find(row => row.id === parsed[1]);
				if (!parsed && !this.writable(record.scope) && final(record.state) && !this.active.has(record.id) && this.now() - record.updatedAt >= RETENTION) { garbage.add(record.id); return false; }
				return !issuer || record.sequence! > issuer.lowWater;
			});
			await this.commit(next);
			// A crash after this point leaves only harmless orphan bodies; retry cleanup on the next prune.
			for (const key of await this.storage.keys('operations/')) {
				const id = key.slice('operations/'.length), parsed = ticketPattern.exec(id), record = this.records.get(id);
				if (garbage.has(id) || parsed && (!record || !record.resultDigest)) { await this.storage.remove(key); this.results.delete(id); }
			}
		});
	}
}

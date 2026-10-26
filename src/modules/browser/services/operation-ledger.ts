import { AgentBrowserError, type BrowserPersistence, type JsonValue, type OperationRecord, type OperationScope } from '../core/contracts';
import { IdentityError } from '../core/identity';
import { BrowserFileError } from '../core/files';

/** Only our typed error codes cross a process boundary; exception text may contain credentials or paths. */
export function operationErrorCode(error: unknown): string {
 return error instanceof AgentBrowserError || error instanceof IdentityError || error instanceof BrowserFileError
  ? error.code : 'operation_failed';
}
function canonical(value: unknown): string {
 if (value === null || typeof value !== 'object') return JSON.stringify(value);
 if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
 return `{${Object.entries(value as Record<string, unknown>).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
const copy = <T>(value: T): T => structuredClone(value);
const final = (state: OperationRecord['state']) => state !== 'prepared' && state !== 'dispatching';

/** Durable intent precedes dispatch. Recovery never replays a request with uncertain side effects. */
export class OperationLedger {
 private readonly records = new Map<string, OperationRecord>();
 private readonly requests = new Map<string, string>();
 private readonly active = new Map<string, Promise<OperationRecord>>();
 private queue: Promise<unknown> = Promise.resolve();
 constructor(private readonly storage: BrowserPersistence, private readonly now = () => Date.now()) {}
 private serial<T>(fn: () => Promise<T>): Promise<T> {
  const task = this.queue.then(fn,fn); this.queue = task.catch(() => undefined); return task;
 }
 private requestKey(scope: OperationScope, requestId: string) { return `${scope.principal}:${scope.issuerId}:${requestId}`; }
 async initialize(): Promise<void> {
  const keys = await this.storage.keys('operations/');
  if (keys.length > 10_000) throw new AgentBrowserError('operation_quota');
  for (const key of keys) {
   const record = await this.storage.read<OperationRecord>(key);
   if (!record?.id || !record.scope || !record.digest || !record.requestId) throw new AgentBrowserError('journal_corrupt');
   if (record.state === 'dispatching') { record.state = 'outcome_unknown'; record.error = 'process_interrupted'; }
   else if (record.state === 'prepared') { record.state = 'cancelled_before_dispatch'; record.error = 'process_interrupted'; }
   this.records.set(record.id,record); this.requests.set(this.requestKey(record.scope,record.requestId),record.id);
   if (!this.storage.readOnly) await this.storage.write(key,record);
  }
 }
 async prepare(requestId: string, scope: OperationScope, payload: unknown): Promise<OperationRecord> {
  return this.serial(async () => {
   if (!/^[a-zA-Z0-9_.:-]{1,160}$/.test(requestId)) throw new AgentBrowserError('invalid_request_id');
   const digest = await this.storage.digest(canonical({scope,payload}));
   const key = this.requestKey(scope,requestId), previous = this.requests.get(key);
   if (previous) {
    const record = this.records.get(previous)!;
    if (record.digest !== digest) throw new AgentBrowserError('request_id_conflict');
    return copy(record);
   }
   if (this.records.size >= 10_000) throw new AgentBrowserError('operation_quota');
   const at = this.now(), record: OperationRecord = {id:this.storage.id(),requestId,digest,scope:copy(scope),state:'prepared',createdAt:at,updatedAt:at};
   await this.storage.write(`operations/${record.id}`,record);
   this.records.set(record.id,record); this.requests.set(key,record.id);
   return copy(record);
  });
 }
 get(id: string, scope?: Pick<OperationScope,'principal'|'issuerId'>): OperationRecord | undefined {
  const r = this.records.get(id);
  return r && (!scope || (scope.principal === r.scope.principal && scope.issuerId === r.scope.issuerId)) ? copy(r) : undefined;
 }
 async execute(id: string, payload: unknown, validate: (scope: OperationScope) => void | Promise<void>, dispatch: (scope: OperationScope) => Promise<JsonValue>): Promise<OperationRecord> {
  const existing = this.records.get(id); if (!existing) throw new AgentBrowserError('operation_not_found');
  const digest = await this.storage.digest(canonical({scope:existing.scope,payload}));
  if (digest !== existing.digest) throw new AgentBrowserError('operation_payload_mismatch');
  const task = this.active.get(id); if (task) return task.then(copy);
  if (final(existing.state)) return copy(existing);
  if (existing.state !== 'prepared') throw new AgentBrowserError('operation_in_progress');
  const action = this.executeOnce(existing,validate,dispatch);
  this.active.set(id,action);
  try { return copy(await action); } finally { if(this.active.get(id)===action)this.active.delete(id); }
 }
 private async save(record: OperationRecord): Promise<OperationRecord> {
  record.updatedAt = this.now(); await this.storage.write(`operations/${record.id}`,record); return record;
 }
 private async executeOnce(record: OperationRecord, validate: (scope: OperationScope)=>void|Promise<void>, dispatch: (scope: OperationScope)=>Promise<JsonValue>): Promise<OperationRecord> {
  try { await validate(copy(record.scope)); }
  catch(error) { record.state='rejected'; record.error=operationErrorCode(error); return this.save(record); }
  record.state='dispatching';
  try { await this.save(record); }
  catch { record.state='cancelled_before_dispatch'; record.error='journal_unavailable'; return record; }
  try {
   const result = await dispatch(copy(record.scope));
   if (JSON.stringify(result).length > 8 * 1024 * 1024) throw new AgentBrowserError('result_too_large');
   record.result = result; record.state='completed';
   await this.save(record);
  } catch(error) {
   delete record.result; record.state='outcome_unknown'; record.error=operationErrorCode(error);
   try { await this.save(record); } catch { /* On recovery the durable dispatching entry remains unknown. */ }
  }
  return record;
 }
 /** Quiescent pruning preserves durable terminal tombstones before deleting result bodies. */
 async prune(): Promise<void> {
  await this.serial(async () => {
   for (const record of this.records.values()) {
    if (!final(record.state) || this.active.has(record.id) || this.now()-record.updatedAt < 30*86_400_000 || record.result===undefined) continue;
    delete record.result; await this.storage.write(`operations/${record.id}`,record);
   }
  });
 }
}

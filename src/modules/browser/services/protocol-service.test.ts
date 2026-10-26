import { describe, expect, it, vi } from 'vitest';
import { BrowserProtocolService, type ConnectionGrant } from './protocol-service';
import type { BrowserWorkspaceService } from './workspace';
import { AgentBrowserError, type BrowserSpace, type BrowserRunHealth, type BrowserObservation, type RunGrant, type OperationRecord, type BrowserCommand } from '../core/contracts';

function gate() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; }
function setup() {
	let serial = 0; const active = new Map<string, RunGrant>(), spaces = new Map<string, BrowserSpace>(), records = new Map<string, OperationRecord>();
	const makeRun = (spaceId: string): RunGrant => { const id = `run-${++serial}`, grant: RunGrant = { run: { id, spaceId, runtimeId: `runtime-${spaceId}`, issuerId: spaceId, epoch: 1, leaseId: `lease-${id}`, state: 'active', expiresAt: Date.now() + 120000 }, capability: `${id}-`.padEnd(48, 'a') }; active.set(id, grant); return grant; };
	const parent = makeRun('space-parent'), grant: ConnectionGrant = { spaceId: parent.run.spaceId, runId: parent.run.id, capability: parent.capability, allowTaskCreation: false, created: false, runs: new Map() };
	const health = (runId: string, capability: string): BrowserRunHealth => { const run = active.get(runId); if (!run || run.capability !== capability) throw new AgentBrowserError('run_revoked'); return { runId, runtimeId: run.run.runtimeId, epoch: run.run.epoch, pages: 1, viewers: 0, framesReceived: 0, framesReplaced: 0, queuedFrameBytes: 0, pendingRequests: 0 }; };
	const workspace = {
		health: vi.fn(health), getState: () => ({ availability: { state: 'ready' } }),
		createSpace: vi.fn(async (request: { kind: 'task'; label?: string }) => { const id = `child-${++serial}`, space: BrowserSpace = { id, kind: request.kind, label: request.label ?? '', retention: 'persistent', status: 'ready', pages: [], control: { mode: 'paused', epoch: 0 }, createdAt: 1, updatedAt: 1 }; spaces.set(id, space); return space; }),
		resumeAgent: vi.fn(async (spaceId: string) => makeRun(spaceId)),
		stopSpace: vi.fn(async (spaceId: string) => { for (const [id, run] of active) if (run.run.spaceId === spaceId) active.delete(id); }),
		startRun: vi.fn(async (spaceId: string) => { const found = [...active.values()].find((run) => run.run.spaceId === spaceId); if (!found) throw new AgentBrowserError('user_run_grant_required'); return structuredClone(found); }),
		stopRun: vi.fn(async (id: string) => { active.delete(id); }), heartbeat: vi.fn(async () => Date.now() + 120000),
		pageList: vi.fn(() => [{ id: 'page-A', title: 'private-title', url: 'https://private.example' }]),
		observe: vi.fn(async (runId: string, capability: string, pageId: string): Promise<BrowserObservation> => { const h = health(runId, capability); return { id: 'observation-A', spaceId: active.get(runId)!.run.spaceId, pageId, runtimeId: h.runtimeId, documentId: 'document-A', epoch: h.epoch, url: 'https://private.example', title: 'private-title', nodes: [], text: 'private-observation', truncated: false }; }),
		prepare: vi.fn(async (runId: string, capability: string, pageId: string, requestId: string, _command: BrowserCommand): Promise<OperationRecord> => { health(runId, capability); const record: OperationRecord = { id: `operation-${++serial}`, requestId, digest: 'opaque-digest', scope: { principal: 'agent', issuerId: runId, spaceId: active.get(runId)!.run.spaceId, pageId }, state: 'prepared', createdAt: 1, updatedAt: 1 }; records.set(record.id, record); return structuredClone(record); }),
		execute: vi.fn(async (runId: string, capability: string, id: string): Promise<OperationRecord> => { health(runId, capability); const record = records.get(id)!; record.state = 'completed'; record.result = { text: 'private-result' }; return structuredClone(record); }),
		operation: vi.fn(async (runId: string, capability: string, id: string): Promise<OperationRecord | undefined> => { const record = records.get(id); if (!record || record.scope.issuerId !== runId) return; const copy = structuredClone(record); try { health(runId, capability); } catch { delete copy.result; } return copy; }),
		pageOpen: vi.fn(async () => ({ id: 'open-operation', state: 'completed', result: { id: 'private-page' } })), pageClose: vi.fn(async () => ({ id: 'close-operation', state: 'completed', result: null })), fileList: vi.fn(() => []), downloadList: vi.fn(() => []), events: vi.fn(() => []),
	};
	const protocol = new BrowserProtocolService(workspace as unknown as BrowserWorkspaceService);
	const child = () => { const run = makeRun('space-child'); grant.runs.set(run.run.id, run); return run; };
	return { protocol, workspace, grant, parent, child, active, records, makeRun };
}
const scoped = (run: RunGrant) => ({ runId: run.run.id, capability: run.capability });

describe('per-connection browser protocol authority', () => {
	it('refuses a different connection Run even with its valid capability and prevents self-resume', async () => {
		const { protocol, workspace, grant, makeRun, active, parent } = setup(), other = makeRun('space-other');
		await expect(protocol.call('page.list', scoped(other), grant)).rejects.toMatchObject({ code: 'capability_scope_mismatch' }); expect(workspace.pageList).not.toHaveBeenCalled();
		active.delete(parent.run.id); await expect(protocol.call('run.start', { spaceId: grant.spaceId }, grant)).rejects.toMatchObject({ code: 'run_revoked' }); expect(workspace.resumeAgent).not.toHaveBeenCalled();
	});
	it('one explicit task-create grant coalesces a duplicate and rejects both another request and changed payload', async () => {
		const { protocol, grant, workspace } = setup(); grant.allowTaskCreation = true; const original = workspace.createSpace.getMockImplementation()!, blocked = gate(), entered = gate();
		workspace.createSpace.mockImplementation(async (request) => { entered.resolve(); await blocked.promise; return original(request); });
		const creating = protocol.call('space.create', { requestId: 'create-A', label: 'A' }, grant); await entered.promise;
		const duplicate = protocol.call('space.create', { requestId: 'create-A', label: 'A' }, grant);
		const conflict = expect(protocol.call('space.create', { requestId: 'create-A', label: 'B' }, grant)).rejects.toMatchObject({ code: 'request_conflict' });
		const extra = expect(protocol.call('space.create', { requestId: 'create-B', label: 'A' }, grant)).rejects.toMatchObject({ code: 'workspace_create_grant_required' }); blocked.resolve();
		expect(await duplicate).toEqual(await creating); await Promise.all([conflict, extra]); expect(workspace.createSpace).toHaveBeenCalledTimes(1); expect(grant.runs.size).toBe(1);
	});
	it('a connection without task creation permission cannot create a Space', async () => {
		const { protocol, workspace, grant } = setup(); await expect(protocol.call('space.create', { requestId: 'A' }, grant)).rejects.toMatchObject({ code: 'workspace_create_grant_required' }); expect(workspace.createSpace).not.toHaveBeenCalled();
	});
	it('parent revocation during child creation stops the new Space and never returns its capability', async () => {
		const { protocol, workspace, grant, active, parent } = setup(); grant.allowTaskCreation = true; const original = workspace.createSpace.getMockImplementation()!, entered = gate(), blocked = gate();
		workspace.createSpace.mockImplementation(async (request) => { const space = await original(request); entered.resolve(); await blocked.promise; return space; });
		const creating = protocol.call('space.create', { requestId: 'A' }, grant), denied = expect(creating).rejects.toMatchObject({ code: 'run_revoked' }); await entered.promise; active.delete(parent.run.id); blocked.resolve(); await denied;
		expect(workspace.stopSpace).toHaveBeenCalledOnce(); expect(workspace.resumeAgent).not.toHaveBeenCalled(); expect(grant.runs.size).toBe(0);
	});
	it('run.start returns only the held child grant and cannot acquire a replacement Run after human resume', async () => {
		const { protocol, workspace, grant, child, active, makeRun } = setup(), held = child();
		expect(await protocol.call('run.start', { spaceId: held.run.spaceId }, grant)).toEqual(held);
		active.delete(held.run.id); makeRun(held.run.spaceId); await expect(protocol.call('run.start', { spaceId: held.run.spaceId }, grant)).rejects.toBeInstanceOf(AgentBrowserError); expect(workspace.resumeAgent).not.toHaveBeenCalled();
	});
	it('a late child observation cannot cross a revoked parent connection', async () => {
		const { protocol, workspace, grant, child, active, parent } = setup(), owned = child(), blocked = gate(), entered = gate(), original = workspace.observe.getMockImplementation()!;
		workspace.observe.mockImplementation(async (...args) => { const result = await original(...args); entered.resolve(); await blocked.promise; return result; });
		const result = protocol.call('observe', { ...scoped(owned), pageId: 'page-A' }, grant), denied = expect(result).rejects.toMatchObject({ code: 'run_revoked' }); await entered.promise; active.delete(parent.run.id); blocked.resolve(); await denied;
	});
	it('a late child operation preserves its ticket while removing body data after parent revocation', async () => {
		const { protocol, workspace, grant, child, active, parent } = setup(), owned = child(), command = { kind: 'text' as const }, blocked = gate(), entered = gate();
		const ticket = await workspace.prepare(owned.run.id, owned.capability, 'page-A', 'request-A', command), original = workspace.execute.getMockImplementation()!;
		workspace.execute.mockImplementation(async (...args) => { const result = await original(...args); entered.resolve(); await blocked.promise; return result; });
		const pending = protocol.call('operation.execute', { ...scoped(owned), operationId: ticket.id, command }, grant); await entered.promise; active.delete(parent.run.id); blocked.resolve();
		const result = await pending as OperationRecord; expect(result.id).toBe(ticket.id); expect(result).not.toHaveProperty('result');
		const status = await protocol.call('operation.get', { ...scoped(owned), operationId: ticket.id }, grant); expect(status).not.toHaveProperty('result');
		await expect(protocol.call('operation.get', { ...scoped(owned), capability: 'wrong-capability'.padEnd(48, 'b'), operationId: ticket.id }, grant)).rejects.toMatchObject({ code: 'capability_scope_mismatch' });
	});
	it('batch stops on failure and rejects more than 32 commands before any preparation', async () => {
		const { protocol, grant, workspace, parent } = setup(), command = { kind: 'text' as const };
		await expect(protocol.call('batch', { ...scoped(parent), pageId: 'page-A', requestId: 'A', commands: Array.from({ length: 33 }, () => command) }, grant)).rejects.toMatchObject({ code: 'invalid_request' }); expect(workspace.prepare).not.toHaveBeenCalled();
		workspace.execute.mockImplementation(async (_run, _cap, id) => ({ id, requestId: id, digest: 'opaque', scope: { principal: 'agent', issuerId: parent.run.id }, state: 'rejected', error: 'reference_stale', createdAt: 1, updatedAt: 1 }));
		const result = await protocol.call('batch', { ...scoped(parent), pageId: 'page-A', requestId: 'B', commands: [command, command] }, grant) as { results: OperationRecord[]; failedIndex: number; completedCount: number };
		expect(result.failedIndex).toBe(0); expect(result.completedCount).toBe(0); expect(result.results).toHaveLength(1); expect(workspace.prepare).toHaveBeenCalledOnce();
	});
	it('batch parent revocation retains dispatched ticket metadata and prevents the next command', async () => {
		const { protocol, workspace, grant, child, active, parent } = setup(), owned = child(), command = { kind: 'text' as const }, blocked = gate(), entered = gate(), original = workspace.execute.getMockImplementation()!;
		workspace.execute.mockImplementation(async (...args) => { const result = await original(...args); entered.resolve(); await blocked.promise; return result; });
		const pending = protocol.call('batch', { ...scoped(owned), pageId: 'page-A', requestId: 'batch-A', commands: [command, command] }, grant); await entered.promise; active.delete(parent.run.id); blocked.resolve();
		const response = await pending as { results: OperationRecord[] }; expect(response.results).toHaveLength(1); expect(response.results[0]?.id).toMatch(/^operation-/); expect(response.results[0]).not.toHaveProperty('result'); expect(workspace.prepare).toHaveBeenCalledOnce();
	});
	it('batch measures UTF8 bytes and returns bounded results with metadata for the overflowed item', async () => {
		const { protocol, workspace, grant, parent } = setup(), command = { kind: 'text' as const }, original = workspace.execute.getMockImplementation()!;
		workspace.execute.mockImplementation(async (...args) => ({ ...await original(...args), result: { text: '汉'.repeat(2 * 1024 * 1024) } }));
		const response = await protocol.call('batch', { ...scoped(parent), pageId: 'page-A', requestId: 'large-batch', commands: [command, command, command] }, grant) as { results: OperationRecord[]; truncated?: boolean };
		expect(new TextEncoder().encode(JSON.stringify(response)).byteLength).toBeLessThan(8 * 1024 * 1024 + 65536); expect(response.truncated).toBe(true); expect(response.results.at(-1)).not.toHaveProperty('result');
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserWorkspaceService, type BrowserWorkspaceExtensions } from './workspace';
import { AgentBrowserError, type BrowserPersistence, type BrowserRuntime, type BrowserRuntimeFactory, type ControlLease, type BrowserCommand, type RuntimeEvent, type RuntimePage, type BrowserObservation, type JsonValue, type RuntimeIdentityState, type BrowserSpace } from '../core/contracts';
import { BrowserFileError, sameFileScope, type BrowserFile, type BrowserFileScope } from '../core/files';

class MemoryPersistence implements BrowserPersistence {
	readOnly = false; readonly ownerId = 'stable-workspace-owner'; readonly data = new Map<string, unknown>();
	private serial = 0; failCatalog = false; secure = true;
	async initialize() {}
	async security(): Promise<'secure' | 'unavailable'> { return this.secure ? 'secure' : 'unavailable'; }
	id(): string { return `id-${(++this.serial).toString().padStart(8, '0')}`; }
	async digest(value: string): Promise<string> { return value; }
	async read<T>(key: string): Promise<T | undefined> { return structuredClone(this.data.get(key)) as T | undefined; }
	async write(key: string, value: unknown): Promise<void> { if (key === 'catalog' && this.failCatalog) { this.failCatalog = false; throw new AgentBrowserError('storage_quota'); } this.data.set(key, structuredClone(value)); }
	async remove(key: string) { this.data.delete(key); }
	async keys(prefix: string) { return [...this.data.keys()].filter((key) => key.startsWith(prefix)); }
	async dispose() {}
}
class FakeRuntime implements BrowserRuntime {
	readonly listeners = new Set<(event: RuntimeEvent) => void>(); readonly pages = new Map<string, RuntimePage>();
	lease: ControlLease | undefined; epoch = 0; failStop = false;
	constructor(readonly id: string, readonly spaceId: string) {}
	onEvent(listener: (event: RuntimeEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
	emit(event: RuntimeEvent) { for (const listener of this.listeners) listener(event); }
	setControl = vi.fn(async (lease: ControlLease | undefined, epoch: number) => { this.lease = lease; this.epoch = epoch; return { runtimeId: this.id, epoch, lastDispatchedSequence: 0, transportState: 'open' as const }; });
	createPage = vi.fn(async (id: string, url: string) => { const page: RuntimePage = { id, url, title: 'Page', documentId: `document-${this.id}-${id}`, zoom: 1, viewportVersion: 0 }; this.pages.set(id, page); return { ...page }; });
	closePage = vi.fn(async (pageId: string) => { this.pages.delete(pageId); this.emit({ kind: 'page-closed', runtimeId: this.id, pageId }); });
	execute = vi.fn(async (_pageId: string, _command: BrowserCommand, _authority: ControlLease): Promise<JsonValue> => ({ ok: true }));
	observe = vi.fn(async (pageId: string, authority: ControlLease): Promise<BrowserObservation> => ({ id: 'observation-A', spaceId: this.spaceId, pageId, runtimeId: this.id, documentId: this.pages.get(pageId)!.documentId, epoch: authority.epoch, url: 'https://private.example', title: 'Private', nodes: [], text: 'secret-observation', truncated: false }));
	watch = vi.fn(async () => undefined);
	readIdentity = vi.fn(async (): Promise<RuntimeIdentityState> => ({ cookies: [] }));
	writeIdentity = vi.fn(async (_seed: RuntimeIdentityState) => undefined);
	cancelDownload = vi.fn(async () => undefined);
	stop = vi.fn(async () => { if (this.failStop) throw new AgentBrowserError('native_owner_unknown'); this.lease = undefined; for (const pageId of this.pages.keys()) this.emit({ kind: 'page-closed', runtimeId: this.id, pageId }); });
}
const open: BrowserWorkspaceService[] = [], releases: Array<() => void> = [];
function gate() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); releases.push(resolve); return { promise, resolve }; }
afterEach(async () => { for (const release of releases.splice(0)) release(); await Promise.all(open.splice(0).map((workspace) => workspace.dispose().catch(() => undefined))); });

async function setup(storage = new MemoryPersistence()) {
	const natives: FakeRuntime[] = [], files = new Map<string, BrowserFile>(); let now = 1000;
	const factory: BrowserRuntimeFactory = {
		availability: async () => ({ state: 'ready', platform: 'test', version: '156.0.0.1' }),
		start: vi.fn(async ({ runtimeId, spaceId }) => { const runtime = new FakeRuntime(runtimeId, spaceId); natives.push(runtime); return runtime; }),
		reclaim: vi.fn(async () => undefined), removeProfile: vi.fn(async () => undefined), installBundle: async () => undefined, dispose: async () => undefined,
	};
	const extra: BrowserWorkspaceExtensions = {
		identities: {
			list: () => [], prepareText: async () => { throw new Error('unused'); }, prepareFile: async () => undefined, prepareSource: async () => { throw new Error('unused'); },
			commit: async () => { throw new Error('unused'); }, discard: () => undefined, sources: async () => [], remove: async () => undefined,
			save: vi.fn(async () => ({ id: 'identity-A', identityId: 'identity-A', label: 'Saved', source: 'manual-login' as const, createdAt: now, cookieCount: 0, originCount: 0, persistent: true })), dispose: async () => undefined,
		},
		files: {
			listFiles: (scope) => [...files.values()].filter((file) => sameFileScope(file.scope, scope)), listDownloads: () => [], listSpaceFiles: (spaceId) => [...files.values()].filter((file) => file.scope.spaceId === spaceId), listSpaceDownloads: () => [],
			chooseUpload: async (scope) => { const file: BrowserFile = { id: storage.id(), name: 'approved.txt', size: 10, kind: 'upload', state: 'ready', sha256: '0'.repeat(64), scope: structuredClone(scope), createdAt: now }; files.set(file.id, file); return structuredClone(file); },
			consumeUpload: vi.fn(async (id: string, scope: BrowserFileScope) => { const file = files.get(id); if (!file || !sameFileScope(file.scope, scope)) throw new BrowserFileError('file_scope_mismatch'); return '/private/fixed-copy'; }),
			exportFile: async () => undefined, removeFile: async (id) => { files.delete(id); }, removeSpace: async (id) => { for (const [key, file] of files) if (file.scope.spaceId === id) files.delete(key); }, dispose: async () => undefined, download: async () => undefined,
		},
		renderViewer: async () => undefined, connection: async () => 'local-descriptor', materials: async () => [],
	};
	const workspace = new BrowserWorkspaceService(storage, factory, extra, () => now); open.push(workspace); await workspace.initialize();
	return { workspace, storage, factory, extra, natives, advance: (amount: number) => { now += amount; }, latest: () => natives.at(-1)!, state: (id: string) => workspace.getState().spaces.find((space) => space.id === id)! };
}
async function task() { const context = await setup(), space = await context.workspace.createSpace({ kind: 'task', label: 'Task A' }); return { ...context, space, pageId: space.pages[0]!.id, native: context.latest() }; }
function viewer(workspace: BrowserWorkspaceService, space: BrowserSpace, viewerId = 'viewer-A') { return workspace.subscribeFrames({ spaceId: space.id, pageId: space.pages[0]!.id, viewerId }, () => undefined); }

describe('Browser workspace authority and lifecycle', () => {
	it('Personal Space cannot receive an Agent Run, and watching a Task never takes control', async () => {
		const { workspace, latest, state } = await setup(), personal = await workspace.createSpace({ kind: 'personal' });
		await expect(workspace.resumeAgent(personal.id)).rejects.toMatchObject({ code: 'personal_space_forbidden' }); const watch = viewer(workspace, personal);
		expect(state(personal.id).control.mode).toBe('paused'); expect(latest().lease).toBeUndefined(); watch.dispose();
	});
	it('a later viewer intent supersedes a delayed native grant without ever publishing the old human owner', async () => {
		const { workspace, space, native, state } = await task(); viewer(workspace, space); viewer(workspace, space, 'viewer-B');
		const blocked = gate(), entered = gate(), original = native.setControl.getMockImplementation()!, published: string[] = [];
		workspace.subscribe(() => { const lease = state(space.id).control.lease; if (lease?.mode === 'human') published.push(lease.viewerId!); });
		native.setControl.mockImplementation(async (lease, epoch) => { if (lease?.viewerId === 'viewer-A') { entered.resolve(); await blocked.promise; } return original(lease, epoch); });
		const a = workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }); const failedA = expect(a).rejects.toMatchObject({ code: 'control_superseded' }); await entered.promise;
		const b = workspace.takeover({ spaceId: space.id, viewerId: 'viewer-B', windowId: 'window-B' }); blocked.resolve(); await failedA; await b;
		expect(state(space.id).control.lease?.viewerId).toBe('viewer-B'); expect(published).not.toContain('viewer-A'); expect(native.lease?.viewerId).toBe('viewer-B');
	});
	it('releaseViewer while takeover is pending invalidates the grant and leaves the runtime paused', async () => {
		const { workspace, space, native, state } = await task(), watch = viewer(workspace, space), blocked = gate(), entered = gate(), original = native.setControl.getMockImplementation()!;
		native.setControl.mockImplementation(async (lease, epoch) => { if (lease?.mode === 'human') { entered.resolve(); await blocked.promise; } return original(lease, epoch); });
		const taking = workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }); const denied = expect(taking).rejects.toMatchObject({ code: 'control_superseded' }); await entered.promise;
		watch.dispose(); const releasing = workspace.releaseViewer(space.id, 'viewer-A'); blocked.resolve(); await denied; await releasing;
		expect(state(space.id).control.mode).toBe('paused'); expect(native.lease).toBeUndefined();
	});
	it('failure to persist a new Agent grant revokes it natively and returns no usable Run', async () => {
		const { workspace, space, native, state, storage } = await task(); storage.failCatalog = true;
		await expect(workspace.resumeAgent(space.id)).rejects.toMatchObject({ code: 'storage_quota' }); expect(state(space.id).control.mode).toBe('blocked'); expect(native.lease).toBeUndefined();
		await expect(workspace.startRun(space.id, space.id)).rejects.toMatchObject({ code: 'user_run_grant_required' });
	});
	it('a late Agent observation is rejected after takeover; old capability status reveals metadata only', async () => {
		const { workspace, space, native, pageId } = await task(), run = await workspace.resumeAgent(space.id); viewer(workspace, space);
		const record = await workspace.prepare(run.run.id, run.capability, pageId, 'request-A', { kind: 'text' }); native.execute.mockResolvedValueOnce({ text: 'private-result' }); await workspace.execute(run.run.id, run.capability, record.id, { kind: 'text' });
		const blocked = gate(), entered = gate(), original = native.observe.getMockImplementation()!; native.observe.mockImplementation(async (...args) => { const result = await original(...args); entered.resolve(); await blocked.promise; return result; });
		const observing = workspace.observe(run.run.id, run.capability, pageId), denied = expect(observing).rejects.toMatchObject({ code: 'run_revoked' }); await entered.promise;
		await workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }); blocked.resolve(); await denied;
		const status = await workspace.operation(run.run.id, run.capability, record.id); expect(status).toMatchObject({ id: record.id, state: 'completed' }); expect(status).not.toHaveProperty('result');
		await expect(workspace.operation(run.run.id, 'wrong-capability', record.id)).rejects.toMatchObject({ code: 'capability_invalid' });
	});
	it('an old delayed action never blocks or clears the queue of a replacement Run, and retains uncertainty metadata', async () => {
		const { workspace, space, native, pageId, state } = await task(); viewer(workspace, space); const old = await workspace.resumeAgent(space.id), delayed = gate(), oldEntered = gate();
		native.execute.mockImplementationOnce(async () => { oldEntered.resolve(); await delayed.promise; return { text: 'old private reply' }; });
		const command = { kind: 'text' as const }, oldTicket = await workspace.prepare(old.run.id, old.capability, pageId, 'old-action', command), oldAction = workspace.execute(old.run.id, old.capability, oldTicket.id, command); await oldEntered.promise;
		await workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }); const current = await workspace.resumeAgent(space.id);
		const newBlocked = gate(), newEntered = gate(); native.execute.mockImplementationOnce(async () => { newEntered.resolve(); await newBlocked.promise; return { text: 'new reply' }; });
		const newTicket = await workspace.prepare(current.run.id, current.capability, pageId, 'new-action', command), newAction = workspace.execute(current.run.id, current.capability, newTicket.id, command); await newEntered.promise;
		delayed.resolve(); expect(await oldAction).toMatchObject({ id: oldTicket.id, state: 'outcome_unknown', error: 'run_revoked' });
		const nextTicket = await workspace.prepare(current.run.id, current.capability, pageId, 'new-next', command), nextAction = workspace.execute(current.run.id, current.capability, nextTicket.id, command); await Promise.resolve(); await Promise.resolve(); expect(native.execute).toHaveBeenCalledTimes(2);
		newBlocked.resolve(); expect((await newAction).state).toBe('completed'); expect((await nextAction).state).toBe('completed'); expect(state(space.id).control.lease?.controllerId).toBe(current.run.id);
	});
	it('an approved upload retains its original Run scope after takeover and cannot be consumed by a new Run', async () => {
		const { workspace, space, pageId, native } = await task(); await workspace.resumeAgent(space.id); const file = await workspace.chooseUpload(space.id, 'agent'); expect(file).toBeDefined();
		await workspace.pause(space.id); const next = await workspace.resumeAgent(space.id), command: BrowserCommand = { kind: 'upload', observationId: 'snapshot', ref: 'node', fileIds: [file!.id] };
		const ticket = await workspace.prepare(next.run.id, next.capability, pageId, 'wrong-run-upload', command), result = await workspace.execute(next.run.id, next.capability, ticket.id, command);
		expect(result).toMatchObject({ state: 'rejected', error: 'file_scope_mismatch' }); expect(native.execute).not.toHaveBeenCalled(); expect(workspace.fileList(next.run.id, next.capability)).toEqual([]);
	});
	it('expired human authority cannot read identity state or accept a page action', async () => {
		const { workspace, space, pageId, extra, advance } = await task(); viewer(workspace, space); const lease = await workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }); advance(120001);
		const request = { spaceId: space.id, pageId, viewerId: 'viewer-A', leaseId: lease.leaseId, epoch: lease.epoch };
		await expect(workspace.saveIdentity({ ...request, label: 'Old grant', persist: true })).rejects.toMatchObject({ code: 'human_lease_expired' }); await expect(workspace.pageAction({ ...request, command: { kind: 'text' } })).rejects.toMatchObject({ code: 'human_lease_expired' }); expect(extra.identities.save).not.toHaveBeenCalled();
	});
	it('native page-closed events during stop preserve desired Page IDs for a new runtime and restart', async () => {
		const { workspace, space, pageId, state, storage } = await task(); const second = await workspace.openPage({ spaceId: space.id, url: 'https://example.com' });
		await workspace.stopSpace(space.id); expect(state(space.id).pages.map((page) => page.id)).toEqual([pageId, second.id]); await workspace.startSpace(space.id); expect(state(space.id).runtimeId).not.toBe(space.runtimeId); expect(state(space.id).pages.map((page) => page.id)).toEqual([pageId, second.id]);
		await workspace.dispose(); const recovered = await setup(storage); expect(recovered.state(space.id).status).toBe('stopped'); await recovered.workspace.startSpace(space.id); expect(recovered.state(space.id).pages.map((page) => page.id)).toEqual([pageId, second.id]);
	});
	it('a cancelled start whose native stop fails stays owned and can be retried without deleting desired data', async () => {
		const { workspace, space, state, factory, natives } = await task(); await workspace.stopSpace(space.id); const blocked = gate(), entered = gate(); let delayed!: FakeRuntime;
		vi.mocked(factory.start).mockImplementationOnce(async ({ runtimeId, spaceId }) => { delayed = new FakeRuntime(runtimeId, spaceId); delayed.failStop = true; natives.push(delayed); entered.resolve(); await blocked.promise; return delayed; });
		const starting = workspace.startSpace(space.id), failedStart = expect(starting).rejects.toMatchObject({ code: 'start_cancelled' }); await entered.promise; const stopping = workspace.stopSpace(space.id), failedStop = expect(stopping).rejects.toMatchObject({ code: 'native_owner_unknown' }); blocked.resolve(); await failedStart; await failedStop;
		expect(state(space.id).status).toBe('quarantined'); expect(delayed.stop).toHaveBeenCalled(); expect(state(space.id).pages).toHaveLength(1); delayed.failStop = false; await workspace.retryCleanup(space.id); expect(state(space.id).status).toBe('stopped');
	});
	it('failed profile deletion remains a durable cleanup job, and retry completes it', async () => {
		const { workspace, space, state, storage, factory } = await task(); vi.mocked(factory.removeProfile).mockRejectedValueOnce(new AgentBrowserError('native_owner_unknown'));
		await expect(workspace.removeSpace(space.id)).rejects.toMatchObject({ code: 'native_owner_unknown' }); expect(state(space.id).status).toBe('cleanup_pending'); expect((await storage.read<BrowserSpace[]>('catalog'))?.find((item) => item.id === space.id)?.status).toBe('cleanup_pending');
		await workspace.retryCleanup(space.id); expect(workspace.getState().spaces).toEqual([]); expect(await storage.read('catalog')).toEqual([]);
	});
	it('stop does not wait for a stale action response before releasing native authority', async () => {
		const { workspace, space, pageId, native, state } = await task(), run = await workspace.resumeAgent(space.id), blocked = gate(), entered = gate();
		native.execute.mockImplementationOnce(async () => { entered.resolve(); await blocked.promise; return { value: 'stale' }; }); const command = { kind: 'text' as const }, ticket = await workspace.prepare(run.run.id, run.capability, pageId, 'long-operation', command), action = workspace.execute(run.run.id, run.capability, ticket.id, command); await entered.promise;
		await workspace.stopSpace(space.id); expect(state(space.id).status).toBe('stopped'); expect(native.lease).toBeUndefined(); blocked.resolve(); expect((await action).state).toBe('outcome_unknown');
	});
	it('requires both session consent and explicit ephemeral creation when OS protection is unavailable', async () => {
		const memory = new MemoryPersistence(); memory.secure = false; const { workspace } = await setup(memory);
		await expect(workspace.createSpace({ kind: 'task', ephemeral: true })).rejects.toMatchObject({ code: 'ephemeral_consent_required' }); await workspace.consentEphemeral();
		await expect(workspace.createSpace({ kind: 'task' })).rejects.toMatchObject({ code: 'ephemeral_consent_required' }); expect((await workspace.createSpace({ kind: 'task', ephemeral: true })).retention).toBe('ephemeral');
	});
});

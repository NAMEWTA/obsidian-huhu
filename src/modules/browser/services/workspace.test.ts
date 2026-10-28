import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrowserMaterialConsumer } from '../api';
import { BrowserWorkspaceService, type BrowserWorkspaceExtensions } from './workspace';
import { BrowserProtocolService, type ConnectionGrant } from './protocol-service';
import { AgentBrowserError, type BrowserPersistence, type BrowserRuntime, type BrowserRuntimeFactory, type ControlLease, type BrowserCommand, type RuntimeEvent, type RuntimePage, type BrowserObservation, type JsonValue, type RuntimeIdentityState, type BrowserSpace, type BrowserFrame, type HumanInput, type OperationRecord } from '../core/contracts';
import { BrowserFileError, sameFileScope, type BrowserFile, type BrowserFileScope, type BrowserDownload } from '../core/files';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DesktopBrowserFileService } from '../platform/desktop/files/file-service';
import { TestBrowserProtector } from '../../../../test/fixtures/browser-protector';

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
	observe = vi.fn(async (pageId: string, authority: ControlLease): Promise<BrowserObservation> => ({ id: 'observation-A', spaceId: this.spaceId, pageId, runtimeId: this.id, documentId: this.pages.get(pageId)!.documentId, epoch: authority.epoch, viewportVersion: this.pages.get(pageId)!.viewportVersion, scope: { spaceId: this.spaceId, pageId, mode: 'semantic', maxNodes: 512, maxBytes: 65536 }, coverage: [], frameErrors: [], url: 'https://private.example', title: 'Private', nodes: [], text: 'secret-observation', truncated: false }));
	watch = vi.fn(async () => undefined);
	readIdentity = vi.fn(async (): Promise<RuntimeIdentityState> => ({ cookies: [] }));
	writeIdentity = vi.fn(async (_seed: RuntimeIdentityState) => undefined);
	cancelDownload = vi.fn(async () => undefined);
	stop = vi.fn(async () => { if (this.failStop) throw new AgentBrowserError('native_owner_unknown'); this.lease = undefined; for (const pageId of this.pages.keys()) this.emit({ kind: 'page-closed', runtimeId: this.id, pageId }); });
}
const open: BrowserWorkspaceService[] = [], releases: Array<() => void> = [];
function gate() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); releases.push(resolve); return { promise, resolve }; }
afterEach(async () => { for (const release of releases.splice(0)) release(); await Promise.all(open.splice(0).map((workspace) => workspace.dispose().catch(() => undefined))); });

async function setup(storage = new MemoryPersistence(), configure?: (extra: BrowserWorkspaceExtensions) => void) {
	const natives: FakeRuntime[] = [], files = new Map<string, BrowserFile>(), downloads = new Map<string, BrowserDownload>(); let now = 1000;
	const factory: BrowserRuntimeFactory = {
		availability: async () => ({ state: 'ready', platform: 'test', version: '156.0.0.1' }),
		start: vi.fn(async ({ runtimeId, spaceId }) => { const runtime = new FakeRuntime(runtimeId, spaceId); natives.push(runtime); return runtime; }),
		reclaim: vi.fn(async () => undefined), removeProfile: vi.fn(async () => undefined), installBundle: async () => undefined, dispose: async () => undefined,
	};
	const extra: BrowserWorkspaceExtensions = {
		identities: {
			list: () => [], prepareText: async () => { throw new Error('unused'); }, prepareFile: async () => undefined, prepareSource: async () => { throw new Error('unused'); },
			commit: async () => { throw new Error('unused'); }, discard: () => undefined, sources: async () => [], remove: async () => undefined,
			save: vi.fn(async () => ({ id: 'identity-A', identityId: 'identity-A', label: 'Saved', source: 'manual-login' as const, createdAt: now, cookieCount: 0, originCount: 0, persistent: true, publication: 'committed' as const, catalogRefresh: 'complete' as const })), dispose: async () => undefined,
		},
		files: {
			listFiles: (scope) => [...files.values()].filter((file) => sameFileScope(file.scope, scope)), listDownloads: scope => [...downloads.values()].filter(download => sameFileScope(download.scope, scope)), listSpaceFiles: (spaceId) => [...files.values()].filter((file) => file.scope.spaceId === spaceId), listSpaceDownloads: spaceId => [...downloads.values()].filter(download => download.scope.spaceId === spaceId),
			chooseUpload: async (scope) => { const file: BrowserFile = { id: storage.id(), name: 'approved.txt', size: 10, kind: 'upload', state: 'ready', sha256: '0'.repeat(64), scope: structuredClone(scope), createdAt: now }; files.set(file.id, file); return structuredClone(file); },
			consumeUpload: vi.fn(async (id: string, scope: BrowserFileScope) => { const file = files.get(id); if (!file || !sameFileScope(file.scope, scope)) throw new BrowserFileError('file_scope_mismatch'); return { path: '/private/fixed-copy', expiresAt: now + 300000 }; }),
			exportFile: async () => undefined, removeFile: async (id) => { files.delete(id); }, removeSpace: async (id) => { for (const [key, file] of files) if (file.scope.spaceId === id) files.delete(key); }, dispose: async () => undefined,
			download: async (event, scope) => { downloads.set(event.id, { id: event.id, pageId: event.pageId, scope: structuredClone(scope), name: event.name, state: event.state === 'progressing' ? 'in-progress' : event.state === 'cancelled' ? 'canceled' : 'completed', receivedBytes: event.received, totalBytes: event.total }); },
		},
		renderViewer: async () => undefined, connection: async () => 'local-descriptor', materials: async () => [],
	};
	configure?.(extra);
	const workspace = new BrowserWorkspaceService(storage, factory, extra, () => now); open.push(workspace); await workspace.initialize();
	return { workspace, storage, factory, extra, natives, advance: (amount: number) => { now += amount; }, latest: () => natives.at(-1)!, state: (id: string) => workspace.getState().spaces.find((space) => space.id === id)! };
}
async function task(storage?: MemoryPersistence) { const context = await setup(storage), space = await context.workspace.createSpace({ kind: 'task', label: 'Task A' }); return { ...context, space, pageId: space.pages[0]!.id, native: context.latest() }; }
function viewer(workspace: BrowserWorkspaceService, space: BrowserSpace, viewerId = 'viewer-A') { return workspace.subscribeFrames({ spaceId: space.id, pageId: space.pages[0]!.id, viewerId }, () => undefined); }
async function humanFrame(context: Awaited<ReturnType<typeof task>>) {
	context.extra.scheduleInterval ??= (callback, ms) => { const timer = setInterval(callback, ms); return () => clearInterval(timer); };
	const { workspace, space, native, pageId, state } = context, subscription = viewer(workspace, space);
	const lease = await workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' }), page = state(space.id).pages.find((item) => item.id === pageId)!;
	const frame: BrowserFrame = { spaceId: space.id, pageId, runtimeId: native.id, documentId: page.documentId, epoch: lease.epoch, viewportVersion: page.viewportVersion, frameId: 'frame-before-typing', width: 640, height: 480, cssWidth: 640, cssHeight: 480, mime: 'image/png', data: new Uint8Array(1), capturedAt: 1000, inputSequence: 0 };
	native.emit({ kind: 'frame', frame }); subscription.ack(frame.frameId);
	return { frame, request: { spaceId: space.id, pageId, viewerId: 'viewer-A', leaseId: lease.leaseId, epoch: lease.epoch, frameId: frame.frameId } };
}

async function materialContext() {
	const context = await task(), { workspace, native, extra } = context, { request } = await humanFrame(context), original = native.observe.getMockImplementation()!;
	native.observe.mockImplementation(async (...args) => ({ ...await original(...args), nodes: [{ ref: 'opaque-selected', frameId: 'remote-frame', role: 'button', name: 'Selected material', visible: true }], truncated: true, frameErrors: [{ frameId: 'unreadable', code: 'frame_unavailable' }] }));
	const consumer: BrowserMaterialConsumer = { id: 'receiver', targets: vi.fn(async () => [{ id: 'target', label: 'Chosen session' }]), deliver: vi.fn(async (_target, _material, source) => { source?.validate?.(); }) };
	extra.materials = async () => [consumer];
	const observation = await workspace.observeMaterial(request);
	native.execute.mockImplementation(async (_pageId, command): Promise<JsonValue> => command.kind === 'material' ? { observationId: observation.id, ref: 'opaque-selected', frameId: 'remote-frame', documentId: observation.documentId, epoch: observation.epoch, viewportVersion: observation.viewportVersion, clip: { x: 1, y: 2, width: 3, height: 4 }, clipped: true, styles: { color: 'red' }, semantic: JSON.parse(JSON.stringify({ ...observation, scope: { ...observation.scope, rootRef: 'opaque-selected', frameId: 'remote-frame' } })) as JsonValue, image: { mime: 'image/png', data: 'iVBORw0KGgo=' } } : { ok: true });
	return { ...context, observation, consumer, request: { ...request, targetId: 'receiver:target', observationId: observation.id, ref: 'opaque-selected' } };
}

describe('Browser workspace authority and lifecycle', () => {
	it('delivers selected opaque-ref material with exact source, coverage, clipping and styles to one existing consumer', async () => {
		const f = await materialContext(); await f.workspace.sendMaterial(f.request);
		expect(f.native.execute).toHaveBeenCalledWith(f.pageId, { kind: 'material', observationId: f.observation.id, ref: 'opaque-selected' }, expect.objectContaining({ leaseId: f.request.leaseId }));
		expect(f.consumer.deliver).toHaveBeenCalledWith('target', expect.objectContaining({ source: expect.objectContaining({ ref: 'opaque-selected', frameId: 'remote-frame', truncated: true, clipped: true, frameErrors: [{ frameId: 'unreadable', code: 'frame_unavailable' }] }), styles: { color: 'red' }, text: expect.stringContaining('Selected material') }), expect.objectContaining({ signal: expect.any(AbortSignal), validate: expect.any(Function) }));
	});
	it.each(['document', 'viewport', 'cancel', 'consumer'] as const)('discards selected material after %s changes during capture without delivering or reselecting', async boundary => {
		const f = await materialContext(), original = f.native.execute.getMockImplementation()!, abort = new AbortController();
		f.native.execute.mockImplementationOnce(async (...args) => { const result = await original(...args); if (boundary === 'cancel') abort.abort(); else if (boundary === 'consumer') f.extra.materials = async () => []; else f.native.emit({ kind: 'page', runtimeId: f.native.id, page: { ...f.native.pages.get(f.pageId)!, ...(boundary === 'document' ? { documentId: 'replacement' } : { viewportVersion: 1 }) } }); return result; });
		await expect(f.workspace.sendMaterial({ ...f.request, signal: abort.signal })).rejects.toBeDefined(); expect(f.consumer.deliver).not.toHaveBeenCalled(); expect(f.native.observe).toHaveBeenCalledOnce();
	});
	it('refuses a mismatched ref and Space before capture, and keeps a delivered receipt after late cancellation', async () => {
		const f = await materialContext(); await expect(f.workspace.sendMaterial({ ...f.request, ref: 'same-visible-name' })).rejects.toMatchObject({ code: 'observation_stale' }); await expect(f.workspace.sendMaterial({ ...f.request, spaceId: 'other-space' })).rejects.toBeDefined(); expect(f.native.execute).not.toHaveBeenCalled();
		const abort = new AbortController(); vi.mocked(f.consumer.deliver).mockImplementationOnce(async (_target, _material, source) => { source?.validate?.(); abort.abort(); });
		await f.workspace.sendMaterial({ ...f.request, signal: abort.signal }); expect(f.consumer.deliver).toHaveBeenCalledOnce();
	});
	it('narrows the original execute budget to a consumed upload grant across the durable intent await', async () => {
		const entered = gate(), blocked = gate();
		class UploadStore extends MemoryPersistence {
			armed = false;
			override async write(key: string, value: unknown) {
				if (this.armed && key === 'operation-checkpoint' && (value as { entries: OperationRecord[] }).entries.some(record => record.requestId === 'deadline-upload' && record.state === 'dispatching')) { this.armed = false; entered.resolve(); await blocked.promise; }
				return super.write(key, value);
			}
		}
		const storage = new UploadStore(), { workspace, space, native, pageId, extra, advance } = await task(storage), run = await workspace.resumeAgent(space.id), file = await workspace.chooseUpload(space.id, 'agent');
		vi.mocked(extra.files.consumeUpload).mockResolvedValue({ path: '/private/fixed-copy', expiresAt: 1001 });
		const command: BrowserCommand = { kind: 'upload', observationId: 'snapshot', ref: 'node', fileIds: [file!.id] }, ticket = await workspace.prepare(run.run.id, run.capability, pageId, 'deadline-upload', command);
		storage.armed = true; const result = workspace.execute(run.run.id, run.capability, ticket.id, command, () => 60000); await entered.promise; advance(2); blocked.resolve();
		expect(await result).toMatchObject({ state: 'cancelled_before_dispatch', error: 'operation_expired' }); expect(native.execute).not.toHaveBeenCalled();
		expect(await workspace.execute(run.run.id, run.capability, ticket.id, command)).toMatchObject({ state: 'cancelled_before_dispatch' }); expect(extra.files.consumeUpload).toHaveBeenCalledTimes(1);
	});
	it('revokes a lost human viewer instead of renewing its lease when lifecycle delivery is missing', async () => {
		let tick!: () => void, alive = true;
		const { workspace, latest, state, advance } = await setup(new MemoryPersistence(), extra => { extra.scheduleInterval = callback => { tick = callback; return () => undefined; }; });
		const space = await workspace.createSpace({ kind: 'task' }), native = latest();
		workspace.subscribeFrames({ spaceId: space.id, pageId: space.pages[0]!.id, viewerId: 'lost-viewer', isAlive: () => alive }, () => undefined);
		await workspace.takeover({ spaceId: space.id, viewerId: 'lost-viewer', windowId: 'lost-window' });
		native.setControl.mockClear(); alive = false; advance(70000); tick();
		await new Promise<void>(resolve => setImmediate(resolve));
		expect(state(space.id).control.mode).toBe('paused'); expect(native.setControl.mock.calls.every(([lease]) => lease === undefined)).toBe(true);
		expect(state(space.id).control.lease).toBeUndefined();
	});
	it('keeps both writers blocked when native revocation succeeded but Worker convergence is unconfirmed', async () => {
		const { workspace, space, native, pageId, state } = await task(), run = await workspace.resumeAgent(space.id);
		viewer(workspace, space); native.setControl.mockClear();
		native.setControl.mockRejectedValueOnce(new AgentBrowserError('browser_control_unsettled'));
		await expect(workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' })).rejects.toMatchObject({ code: 'browser_control_unsettled' });
		expect(state(space.id).control.mode).toBe('blocked'); expect(native.setControl.mock.calls.every(([lease]) => lease === undefined)).toBe(true);
		await expect(workspace.observe(run.run.id, run.capability, pageId)).rejects.toMatchObject({ code: 'run_revoked' });
		expect(native.lease).toBeUndefined();
	});
	it.each(['reclaim', 'start'] as const)('records an early %s reopen failure without losing desired pages or the profile', async failure => {
		const { workspace, space, state, factory, extra, storage } = await task();
		await workspace.openPage({ spaceId: space.id, url: 'https://second.example' }); await workspace.stopSpace(space.id);
		const desired = state(space.id).pages.map(page => ({ id: page.id, url: page.url }));
		vi.mocked(factory[failure]).mockRejectedValueOnce(new AgentBrowserError('synthetic_start_failure'));
		await expect(workspace.startSpace(space.id)).rejects.toMatchObject({ code: 'synthetic_start_failure' });
		expect(state(space.id).status).toBe('faulted'); expect(state(space.id).control.mode).toBe('paused');
		expect(state(space.id).pages.map(page => ({ id: page.id, url: page.url }))).toEqual(desired);
		expect(factory.removeProfile).not.toHaveBeenCalled(); expect(extra.seed).toBeUndefined();
		expect((await storage.read<BrowserSpace[]>('catalog'))?.find(item => item.id === space.id)?.status).toBe('faulted');
		await workspace.startSpace(space.id); expect(state(space.id).status).toBe('ready');
	});
	it('quarantines an early start failure when independent reclamation cannot confirm ownership', async () => {
		const { workspace, space, state, factory } = await task(); await workspace.stopSpace(space.id);
		vi.mocked(factory.start).mockRejectedValueOnce(new AgentBrowserError('synthetic_start_failure'));
		vi.mocked(factory.reclaim).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new AgentBrowserError('native_owner_unknown'));
		await expect(workspace.startSpace(space.id)).rejects.toMatchObject({ code: 'synthetic_start_failure' });
		expect(state(space.id)).toMatchObject({ status: 'quarantined', control: { mode: 'blocked' } });
		expect(state(space.id).runtimeId).toBeDefined(); expect(factory.removeProfile).not.toHaveBeenCalled();
	});
	it('coalesces overlapping stops so an older stop cannot reclaim a newly opened runtime', async () => {
		const { workspace, space, native, state, latest } = await task(), entered = gate(), blocked = gate(), original = native.stop.getMockImplementation()!;
		native.stop.mockImplementationOnce(async () => { entered.resolve(); await blocked.promise; return original(); });
		const first = workspace.stopSpace(space.id); await entered.promise;
		let secondDone = false; const second = workspace.stopSpace(space.id).then(() => { secondDone = true; });
		await new Promise<void>(resolve => setImmediate(resolve)); expect(secondDone).toBe(false);
		blocked.resolve(); await Promise.all([first, second]); await workspace.startSpace(space.id);
		expect(state(space.id).status).toBe('ready'); expect(latest().stop).not.toHaveBeenCalled();
	});
	it.each([false, true])('rejects reopening during a stop final catalog await even after another Space publishes stopped (write fails: %s)', async failFinal => {
		const entered = gate(), blocked = gate();
		class FinalStopPersistence extends MemoryPersistence {
			armedSpace?: string;
			override async write(key: string, value: unknown) {
				if (key === 'catalog' && this.armedSpace && (value as BrowserSpace[]).some(space => space.id === this.armedSpace && space.status === 'stopped')) {
					this.armedSpace = undefined; entered.resolve(); await blocked.promise;
					if (failFinal) throw new AgentBrowserError('synthetic_catalog_failure');
				}
				return super.write(key, value);
			}
		}
		const storage = new FinalStopPersistence(), { workspace, space, native, state, latest, factory } = await task(storage);
		const other = await workspace.createSpace({ kind: 'task' }), otherNative = latest(), desired = state(space.id).pages.map(page => ({ id: page.id, url: page.url }));
		storage.armedSpace = space.id;
		const firstStop = workspace.stopSpace(space.id); await entered.promise;
		// A real event in another Space publishes the internally stopped projection
		// while this Space's stop receipt still awaits its final catalog write.
		otherNative.emit({ kind: 'page', runtimeId: otherNative.id, page: { ...otherNative.pages.get(other.pages[0]!.id)!, title: 'Other Space update' } });
		expect(state(space.id).status).toBe('stopped');
		let startResult = 'pending';
		const reopening = workspace.startSpace(space.id).then(() => { startResult = 'accepted'; }, error => { startResult = (error as AgentBrowserError).code; });
		const secondStop = workspace.stopSpace(space.id), stopped = Promise.allSettled([firstStop, secondStop]);
		let outcomes: Awaited<typeof stopped>;
		try { await new Promise<void>(resolve => setImmediate(resolve)); expect(startResult).toBe('space_stopping'); }
		finally { blocked.resolve(); outcomes = await stopped; await reopening; }
		expect(outcomes.map(result => result.status)).toEqual(failFinal ? ['rejected', 'rejected'] : ['fulfilled', 'fulfilled']);
		expect(state(space.id).status).toBe('stopped'); expect(factory.start).toHaveBeenCalledTimes(2);
		await workspace.startSpace(space.id); const reopened = latest();
		expect(state(space.id)).toMatchObject({ status: 'ready', control: { mode: 'paused' } });
		expect(state(space.id).pages.map(page => ({ id: page.id, url: page.url }))).toEqual(desired);
		expect(reopened.id).not.toBe(native.id); expect(reopened.stop).not.toHaveBeenCalled(); expect(factory.removeProfile).not.toHaveBeenCalled();
	});
	it('retries only a failed restored Page under its original ID while successful pages remain live', async () => {
		const { workspace, space, state, factory, natives, latest } = await task();
		const second = await workspace.openPage({ spaceId: space.id, url: 'https://second.example' });
		await workspace.openPage({ spaceId: space.id, url: 'https://third.example' }); await workspace.stopSpace(space.id);
		vi.mocked(factory.start).mockImplementationOnce(async ({ spaceId, runtimeId }) => {
			const runtime = new FakeRuntime(runtimeId, spaceId), create = runtime.createPage.getMockImplementation()!;
			runtime.createPage.mockImplementation(async (id, url) => { if (id === second.id) { runtime.createPage.mockImplementation(create); throw new AgentBrowserError('synthetic_page_failure'); } return create(id, url); });
			natives.push(runtime); return runtime;
		});
		await workspace.startSpace(space.id); const runtime = latest(), stable = state(space.id).pages.filter(page => page.id !== second.id);
		expect(state(space.id).pages.find(page => page.id === second.id)?.status).toBe('failed');
		runtime.emit({ kind: 'page-closed', runtimeId: runtime.id, pageId: second.id });
		expect(state(space.id).pages.find(page => page.id === second.id)?.status).toBe('failed'); runtime.createPage.mockClear();
		await workspace.retryPage({ spaceId: space.id, pageId: second.id });
		expect(runtime.createPage).toHaveBeenCalledTimes(1); expect(runtime.createPage.mock.calls[0]?.slice(0, 2)).toEqual([second.id, second.url]);
		expect(state(space.id).pages.filter(page => page.id !== second.id)).toEqual(stable);
		expect(state(space.id).pages.find(page => page.id === second.id)).toMatchObject({ status: 'open' });
		expect(state(space.id).pages.find(page => page.id === second.id)?.error).toBeUndefined(); expect(runtime.stop).not.toHaveBeenCalled();
		await expect(workspace.retryPage({ spaceId: space.id, pageId: second.id })).rejects.toMatchObject({ code: 'page_not_retryable' });
	});
	it.each(['progress', 'complete', 'cancel', 'quota', 'capture', 'cleanup'] as const)('projects the actual %s file outcome and preserves terminal failures after native cancellation', async (outcome) => {
		const { workspace, extra, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id);
		const root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), 'huhu-event-download-'))), directory = path.join(root, 'native'), id = randomUUID();
		const service = new DesktopBrowserFileService({ directory: path.join(root, 'managed'), downloadDirectory: () => directory, metadataProtector: new TestBrowserProtector(), metadataScope: 'event-download', cancelDownload: async (_spaceId, downloadId) => workspace.cancelDownload(downloadId) });
		let restoreCleanup: (() => void) | undefined;
		try {
			await service.ready; await fs.mkdir(directory);
			if (outcome === 'complete' || outcome === 'cleanup') await fs.writeFile(path.join(directory, id), 'downloaded');
			if (outcome === 'cleanup') { const remove = fs.rm; const spy = vi.spyOn(fs, 'rm').mockImplementation(async (target, options) => { if (path.basename(String(target)) === 'claimed') throw Error('synthetic cleanup'); return remove(target, options); }); restoreCleanup = () => spy.mockRestore(); }
			extra.files.listDownloads = scope => service.listDownloads(scope);
			extra.files.listSpaceDownloads = spaceId => service.listSpaceDownloads(spaceId);
			// Exercise the real file service's normal-return business failures, as in composition's download adapter.
			extra.files.download = async (event, scope) => {
				if (!service.listSpaceDownloads(scope.spaceId).some(item => item.id === event.id)) service.beginDownload(event.id, event.pageId, scope, event.name);
				const result = await service.updateDownload(event.id, { state: event.state === 'progressing' ? 'inProgress' : event.state === 'completed' ? 'completed' : 'canceled', receivedBytes: event.received, totalBytes: event.total });
				if (result.state === 'failed') await workspace.cancelDownload(event.id);
			};
			let cursor = workspace.eventSnapshot(run.run.id, run.capability).cursor;
			const emit = async (state: 'progressing' | 'completed' | 'cancelled') => {
				const handled = gate(), unsubscribe = workspace.subscribe(() => { if (workspace.events(run.run.id, run.capability, cursor).some(row => row.type === 'downloadChanged')) handled.resolve(); });
				native.emit({ kind: 'download', runtimeId: native.id, pageId, epoch: run.run.epoch, controllerId: run.run.id, id, name: 'SYNTHETIC_PRIVATE_FILENAME', state, received: 1, total: outcome === 'quota' ? 101 * 1024 * 1024 : 10 });
				try { await handled.promise; } finally { unsubscribe(); }
				const rows = workspace.events(run.run.id, run.capability, cursor), snapshot = workspace.eventSnapshot(run.run.id, run.capability);
				cursor = snapshot.cursor;
				expect(JSON.stringify({ rows, snapshot })).not.toContain('SYNTHETIC'); expect(JSON.stringify({ rows, snapshot })).not.toContain(root);
				return { event: rows.filter(row => row.type === 'downloadChanged').at(-1), download: snapshot.downloads[0] };
			};
			const first = await emit(outcome === 'progress' || outcome === 'quota' ? 'progressing' : outcome === 'cancel' ? 'cancelled' : 'completed');
			if (outcome === 'cleanup') { expect(first.download?.state).toBe('completed'); expect(service.listSpaceDownloads(space.id)[0]?.cleanup).toBe('pending'); expect(workspace.eventSnapshot(run.run.id, run.capability).cleanup.state).toBe('pending'); expect(workspace.getState().cleanupPending).toBe(1); }
			const expected = outcome === 'quota' || outcome === 'capture' ? 'failed' : outcome === 'progress' ? 'in-progress' : outcome === 'cancel' ? 'canceled' : 'completed';
			expect(first.download?.state).toBe(expected); expect(first.event?.state).toBe(expected === 'in-progress' ? 'progressing' : expected === 'canceled' ? 'cancelled' : expected);
			if (outcome === 'quota' || outcome === 'capture') {
				expect(native.cancelDownload).toHaveBeenCalledWith(id);
				expect(service.listSpaceDownloads(space.id)[0]?.error).toBe(outcome === 'quota' ? 'file_too_large' : 'file_corrupt');
			}
			if (outcome !== 'progress') {
				const late = await emit('cancelled'); expect(late.download?.state).toBe(expected); expect(late.event?.state).toBe(first.event?.state);
			}
			const next = await workspace.resumeAgent(space.id), fresh = workspace.eventSnapshot(next.run.id, next.capability);
			const lateHandled = gate(), unsubscribe = workspace.subscribe(() => lateHandled.resolve());
			native.emit({ kind: 'download', runtimeId: native.id, pageId, epoch: run.run.epoch, controllerId: run.run.id, id, name: 'SYNTHETIC_OLD_FILENAME', state: 'cancelled', received: 1, total: 10 });
			try { await lateHandled.promise; } finally { unsubscribe(); }
			expect(workspace.eventSnapshot(next.run.id, next.capability).downloads).toEqual([]); expect(workspace.events(next.run.id, next.capability, fresh.cursor)).toEqual([]);
		} finally { restoreCleanup?.(); await service.dispose(); await fs.rm(root, { recursive: true, force: true }); }
	});
	it.each(['missing', 'unreadable'] as const)('does not publish native success when the scoped download projection is %s', async (failure) => {
		const { workspace, extra, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id), initial = workspace.eventSnapshot(run.run.id, run.capability), handled = gate();
		extra.files.listDownloads = scope => { expect(scope).toEqual({ spaceId: space.id, execution: { kind: 'agent', runId: run.run.id } }); if (failure === 'unreadable') throw new Error('SYNTHETIC_PRIVATE_PATH'); return []; };
		const unsubscribe = workspace.subscribe(() => { if (workspace.events(run.run.id, run.capability, initial.cursor).some(row => row.type === 'runtimeFault')) handled.resolve(); });
		native.emit({ kind: 'download', runtimeId: native.id, pageId, epoch: run.run.epoch, controllerId: run.run.id, id: 'download-one', name: 'SYNTHETIC_PRIVATE_FILENAME', received: 10, total: 10, state: 'completed' });
		try { await handled.promise; } finally { unsubscribe(); }
		const rows = workspace.events(run.run.id, run.capability, initial.cursor);
		expect(rows).toMatchObject([{ type: 'runtimeFault', entityId: 'download-one', code: 'runtime_fault' }]); expect(rows.some(row => row.type === 'downloadChanged' || row.state !== undefined)).toBe(false);
		expect(JSON.stringify(rows)).not.toContain('SYNTHETIC'); expect(native.cancelDownload).toHaveBeenCalledWith('download-one');
	});
	it('revalidates even an empty legacy poll at the final transport boundary after stream replacement', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const { workspace, space } = await task(new ProtocolPersistence()), run = await workspace.resumeAgent(space.id), protocol = new BrowserProtocolService(workspace);
		const params = { runId: run.run.id, capability: run.capability }, grant: ConnectionGrant = { spaceId: space.id, ...params, allowTaskCreation: false, created: false, runs: new Map() };
		const initial = workspace.eventSnapshot(run.run.id, run.capability), poll = { ...params, afterSequence: initial.cursor };
		const rows = await protocol.call('events.poll', poll, grant); expect(rows).toEqual([]);
		expect(protocol.finalize('events.poll', poll, grant, rows)).toEqual([]);
		expect(protocol.finalize('events.poll', { ...poll, streamId: initial.streamId }, grant, rows)).toEqual([]);
		const owner = gate(), final = owner.promise.then(() => protocol.finalize('events.poll', poll, grant, rows));
		for (let index = 0; index < 130; index++) await workspace.resumeAgent(space.id);
		const rebuilt = workspace.eventSnapshot(run.run.id, run.capability); expect(rebuilt.streamId).not.toBe(initial.streamId);
		expect(() => workspace.events(run.run.id, run.capability, initial.cursor)).toThrow('resync_required');
		const rejected = expect(final).rejects.toMatchObject({ code: 'resync_required' }); owner.resolve(); await rejected;
		expect(() => protocol.finalize('events.poll', { ...poll, streamId: initial.streamId }, grant, rows)).toThrow('resync_required');
		expect(await protocol.call('events.poll', { ...params, afterSequence: rebuilt.cursor, streamId: rebuilt.streamId }, grant)).toEqual([]);
	});
	it('revalidates the retention window without mixing newer rows into an already formed poll', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const { workspace, native, space, pageId } = await task(new ProtocolPersistence()), run = await workspace.resumeAgent(space.id), protocol = new BrowserProtocolService(workspace);
		const params = { runId: run.run.id, capability: run.capability }, grant: ConnectionGrant = { spaceId: space.id, ...params, allowTaskCreation: false, created: false, runs: new Map() }, initial = workspace.eventSnapshot(run.run.id, run.capability);
		const poll = { ...params, afterSequence: initial.cursor, streamId: initial.streamId }, rows = await protocol.call('events.poll', poll, grant);
		for (let index = 0; index < 257; index++) {
			native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, title: `late-${index}` } });
			if (index === 0) expect(protocol.finalize('events.poll', poll, grant, rows)).toEqual([]);
		}
		expect(() => protocol.finalize('events.poll', poll, grant, rows)).toThrow('resync_required');
		expect(() => protocol.finalize('events.poll', params, grant, rows)).toThrow('resync_required');
		const fresh = workspace.eventSnapshot(run.run.id, run.capability); expect(await protocol.call('events.poll', { ...params, afterSequence: fresh.cursor, streamId: fresh.streamId }, grant)).toEqual([]);
	});
	it('does not project a late resolved request from an earlier lease into a replacement Run', async () => {
		const { workspace, native, space, pageId } = await task(), old = await workspace.resumeAgent(space.id);
		native.emit({ kind: 'request', request: { id: 'old-request', spaceId: space.id, pageId, runtimeId: native.id, documentId: native.pages.get(pageId)!.documentId, epoch: old.run.epoch, revision: 1, kind: 'dialog', message: 'SYNTHETIC_OLD_REQUEST', expiresAt: 10000, status: 'pending' } });
		const current = await workspace.resumeAgent(space.id), snapshot = workspace.eventSnapshot(current.run.id, current.capability);
		native.emit({ kind: 'request-resolved', runtimeId: native.id, requestId: 'old-request' });
		expect(workspace.events(current.run.id, current.capability, snapshot.cursor, snapshot.streamId)).toEqual([]);
	});
	it('retries an actual projection read if a runtime update arrives inside its synchronous file projection port', async () => {
		const { workspace, native, space, pageId, extra } = await task(), run = await workspace.resumeAgent(space.id); let reads = 0;
		extra.files.listDownloads = () => { if (++reads === 1) native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, documentId: 'updated-during-snapshot' } }); return []; };
		const snapshot = workspace.eventSnapshot(run.run.id, run.capability);
		expect(snapshot).toMatchObject({ cursor: 1, pages: [{ id: pageId, documentId: 'updated-during-snapshot' }] }); expect(reads).toBe(2);
		native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, documentId: 'after-snapshot' } });
		expect(workspace.events(run.run.id, run.capability, snapshot.cursor, snapshot.streamId)).toMatchObject([{ sequence: 2, type: 'pageChanged', pageId }]);
	});
	it('keeps dropped slow-viewer pixel frames separate from reliable control events', async () => {
		const { workspace, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id), initial = workspace.eventSnapshot(run.run.id, run.capability), slow = viewer(workspace, space);
		for (let index = 0; index < 100; index++) native.emit({ kind: 'frame', frame: { spaceId: space.id, pageId, runtimeId: native.id, documentId: native.pages.get(pageId)!.documentId, epoch: run.run.epoch, viewportVersion: 0, frameId: `frame-${index}`, width: 1, height: 1, cssWidth: 1, cssHeight: 1, mime: 'image/png', data: new Uint8Array(1), capturedAt: 1000, inputSequence: 0 } });
		expect(workspace.health(run.run.id, run.capability)).toMatchObject({ eventCursor: initial.cursor, framesReceived: 100, framesReplaced: 98, queuedFrameBytes: 2 });
		await workspace.pause(space.id); expect(workspace.events(run.run.id, run.capability, initial.cursor, initial.streamId).some(event => event.type === 'controlChanged')).toBe(true); slow.dispose();
	});
	it('rebuilds an evicted retired stream without restoring any page capability', async () => {
		const { workspace, space } = await task(), original = await workspace.resumeAgent(space.id), before = workspace.eventSnapshot(original.run.id, original.capability);
		for (let index = 0; index < 130; index++) await workspace.resumeAgent(space.id);
		expect(() => workspace.events(original.run.id, original.capability, before.cursor, before.streamId)).toThrow('resync_required');
		const rebuilt = workspace.eventSnapshot(original.run.id, original.capability); expect(rebuilt.streamId).not.toBe(before.streamId); expect(rebuilt).toMatchObject({ active: false, pages: [], requests: [], downloads: [] });
		expect(() => workspace.events(original.run.id, original.capability, 0)).toThrow('resync_required');
		expect(workspace.events(original.run.id, original.capability, rebuilt.cursor, rebuilt.streamId)).toEqual([]);
	});
	it('keeps a child event query metadata-only after its parent connection loses observation authority', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const { workspace, space } = await task(new ProtocolPersistence()), parent = await workspace.resumeAgent(space.id), childSpace = await workspace.createSpace({ kind: 'task' }), child = await workspace.resumeAgent(childSpace.id);
		const grant: ConnectionGrant = { spaceId: space.id, runId: parent.run.id, capability: parent.capability, allowTaskCreation: false, created: false, runs: new Map([[child.run.id, child]]) }, protocol = new BrowserProtocolService(workspace);
		await workspace.pause(space.id); expect(workspace.eventSnapshot(child.run.id, child.capability).active).toBe(true);
		const snapshot = await protocol.call('events.snapshot', { runId: child.run.id, capability: child.capability }, grant);
		expect(snapshot).toMatchObject({ active: false, pages: [], requests: [], downloads: [] });
		await expect(protocol.call('observe', { runId: child.run.id, capability: child.capability, pageId: childSpace.pages[0]!.id }, grant)).rejects.toMatchObject({ code: 'run_revoked' });
	});
	it('guards final event snapshots by generation and gives revoked Runs only their control/history metadata', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const { workspace, native, space, pageId } = await task(new ProtocolPersistence()), run = await workspace.resumeAgent(space.id), protocol = new BrowserProtocolService(workspace);
		const params = { runId: run.run.id, capability: run.capability }, grant: ConnectionGrant = { spaceId: space.id, ...params, allowTaskCreation: false, created: false, runs: new Map() };
		const original = await protocol.call('events.snapshot', params, grant) as ReturnType<BrowserWorkspaceService['eventSnapshot']>;
		const subscription = viewer(workspace, space), human = await workspace.takeover({ spaceId: space.id, viewerId: 'viewer-A', windowId: 'window-A' });
		expect(() => protocol.finalize('events.snapshot', params, grant, original)).toThrow('resync_required');
		const before = workspace.eventSnapshot(run.run.id, run.capability).cursor;
		native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, title: 'SYNTHETIC_HUMAN_TITLE', url: 'https://private.invalid/?secret=SYNTHETIC_URL' } });
		native.emit({ kind: 'request', request: { id: 'human-only', spaceId: space.id, pageId, runtimeId: native.id, documentId: native.pages.get(pageId)!.documentId, epoch: human.epoch, revision: 1, kind: 'dialog', message: 'SYNTHETIC_HUMAN_MESSAGE', expiresAt: 10000, status: 'pending' } });
		const retired = await protocol.call('events.snapshot', params, grant) as typeof original;
		expect(retired).toMatchObject({ active: false, pages: [], requests: [], downloads: [], cursor: before, control: { mode: 'human' } });
		const rows = await protocol.call('events.poll', { ...params, afterSequence: original.cursor, streamId: original.streamId }, grant) as Array<{ type: string }>;
		expect(rows.length).toBeGreaterThan(0); expect(rows.every(row => ['controlChanged', 'operationChanged', 'runtimeFault', 'cleanupChanged'].includes(row.type))).toBe(true);
		expect(JSON.stringify({ retired, rows })).not.toContain('SYNTHETIC');
		await expect(protocol.call('events.snapshot', { ...params, capability: 'wrong'.padEnd(40, 'x') }, grant)).rejects.toMatchObject({ code: 'capability_scope_mismatch' });
		await expect(protocol.call('observe', { ...params, pageId }, grant)).rejects.toMatchObject({ code: 'run_revoked' });
		subscription.dispose();
	});
	it('projects runtime requests, downloads and durable operations without their secret bodies', async () => {
		const { workspace, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id), initial = workspace.eventSnapshot(run.run.id, run.capability);
		const request = { id: 'request-one', spaceId: space.id, pageId, runtimeId: native.id, documentId: native.pages.get(pageId)!.documentId, epoch: run.run.epoch, revision: 1, kind: 'dialog' as const, message: 'SYNTHETIC_REQUEST_SECRET', expiresAt: 10000, status: 'pending' as const };
		native.emit({ kind: 'request', request }); expect(workspace.eventSnapshot(run.run.id, run.capability).requests).toMatchObject([{ id: request.id, kind: 'dialog', revision: 1 }]);
		native.emit({ kind: 'request-resolved', runtimeId: native.id, requestId: request.id }); expect(workspace.eventSnapshot(run.run.id, run.capability).requests).toEqual([]);
		const downloaded = gate(), unsubscribe = workspace.subscribe(() => { if (workspace.events(run.run.id, run.capability, initial.cursor).some(event => event.type === 'downloadChanged')) downloaded.resolve(); });
		native.emit({ kind: 'download', runtimeId: native.id, pageId, epoch: run.run.epoch, controllerId: run.run.id, id: 'download-one', name: 'SYNTHETIC_FILENAME_SECRET', received: 5, total: 10, state: 'progressing' });
		await downloaded.promise; unsubscribe();
		const command = { kind: 'fill' as const, observationId: 'observation', ref: 'element', text: 'SYNTHETIC_COMMAND_SECRET' };
		const ticket = await workspace.prepare(run.run.id, run.capability, pageId, 'operation-events', command); await workspace.execute(run.run.id, run.capability, ticket.id, command);
		await workspace.renameSpace(space.id, 'SYNTHETIC_LABEL_SECRET');
		const rows = workspace.events(run.run.id, run.capability, initial.cursor, initial.streamId);
		expect(rows.filter(event => event.type === 'humanRequest').map(event => event.state)).toEqual(['pending', 'resolved']);
		expect(rows.filter(event => event.type === 'downloadChanged')).toMatchObject([{ entityId: 'download-one', state: 'progressing' }]);
		expect(rows.filter(event => event.type === 'operationChanged').map(event => event.state)).toEqual(['prepared', 'dispatching', 'completed']);
		expect(rows.some(event => event.type === 'spaceChanged')).toBe(true);
		const snapshot = workspace.eventSnapshot(run.run.id, run.capability); expect(snapshot.operations).toMatchObject([{ id: ticket.id, state: 'completed' }]);
		expect(JSON.stringify({ rows, snapshot })).not.toContain('SYNTHETIC'); expect(JSON.stringify(snapshot)).not.toContain('https://');
	});
	it('recovers an overflowed stream with one snapshot/cursor and keeps a slow consumer independent', async () => {
		const { workspace, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id), initial = workspace.eventSnapshot(run.run.id, run.capability);
		let fastCursor = initial.cursor, fastCount = 0;
		for (let index = 0; index < 300; index++) {
			native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, title: `page-${index}` } });
			const fast = workspace.events(run.run.id, run.capability, fastCursor, initial.streamId); fastCount += fast.length; fastCursor = fast.at(-1)?.sequence ?? fastCursor;
		}
		expect(fastCount).toBe(300); expect(() => workspace.events(run.run.id, run.capability, initial.cursor, initial.streamId)).toThrow('resync_required');
		const rebuilt = workspace.eventSnapshot(run.run.id, run.capability); expect(rebuilt.cursor).toBe(fastCursor); expect(rebuilt.pages[0]?.id).toBe(pageId);
		expect(workspace.events(run.run.id, run.capability, rebuilt.cursor, rebuilt.streamId)).toEqual([]);
		expect(() => workspace.events(run.run.id, run.capability, rebuilt.cursor, 'old-generation')).toThrow('resync_required');
		expect(() => workspace.events(run.run.id, run.capability, rebuilt.cursor + 1, rebuilt.streamId)).toThrow('invalid_event_cursor');
	});
	it('retains fault/control/cleanup metadata after revocation while excluding later human page activity', async () => {
		const { workspace, native, space, pageId, factory } = await task(), run = await workspace.resumeAgent(space.id), initial = workspace.eventSnapshot(run.run.id, run.capability);
		const stopped = gate(), unsubscribe = workspace.subscribe(() => { if (workspace.getState().spaces.find(item => item.id === space.id)?.status === 'stopped') stopped.resolve(); });
		native.emit({ kind: 'fault', runtimeId: native.id, code: 'SYNTHETIC_FAULT_SECRET /private/path' }); await stopped.promise; unsubscribe();
		const retired = workspace.eventSnapshot(run.run.id, run.capability), before = retired.cursor;
		native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, title: 'SYNTHETIC_HUMAN_SECRET' } });
		expect(workspace.eventSnapshot(run.run.id, run.capability)).toMatchObject({ active: false, pages: [], requests: [], downloads: [], cursor: before });
		vi.mocked(factory.removeProfile).mockRejectedValueOnce(new AgentBrowserError('native_owner_unknown'));
		await expect(workspace.removeSpace(space.id)).rejects.toMatchObject({ code: 'native_owner_unknown' }); expect(workspace.eventSnapshot(run.run.id, run.capability).cleanup.state).toBe('failed');
		await workspace.retryCleanup(space.id); const complete = workspace.eventSnapshot(run.run.id, run.capability);
		expect(complete).toMatchObject({ active: false, space: { status: 'removed' }, cleanup: { state: 'completed' } });
		const rows = workspace.events(run.run.id, run.capability, initial.cursor, initial.streamId);
		for (const type of ['controlChanged', 'runtimeFault', 'cleanupChanged']) expect(rows.some(event => event.type === type)).toBe(true);
		expect(rows.find(event => event.type === 'runtimeFault')).toMatchObject({ code: 'runtime_fault' }); expect(JSON.stringify({ rows, complete })).not.toContain('SYNTHETIC');
		await expect(workspace.observe(run.run.id, run.capability, pageId)).rejects.toBeInstanceOf(AgentBrowserError);
	});
	it('rejects an execute request that expires in the Space queue without cancelling an already-dispatched duplicate', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const { workspace, space, pageId, native } = await task(new ProtocolPersistence()), run = await workspace.resumeAgent(space.id);
		const protocol = new BrowserProtocolService(workspace), authority = { runId: run.run.id, capability: run.capability };
		const grant: ConnectionGrant = { spaceId: space.id, ...authority, allowTaskCreation: false, created: false, runs: new Map() };
		const command = { kind: 'reload' as const }, entered = gate(), blocked = gate();
		const first = await workspace.prepare(run.run.id, run.capability, pageId, 'first', command);
		const second = await workspace.prepare(run.run.id, run.capability, pageId, 'queued', command);
		native.execute.mockImplementationOnce(async () => { entered.resolve(); await blocked.promise; return { ok: true }; });
		const original = workspace.execute(run.run.id, run.capability, first.id, command); await entered.promise;
		const duplicate = protocol.call('operation.execute', { ...authority, operationId: first.id, command }, grant, () => 0);
		let remaining = 10000, deadlineReads = 0;
		const pending = protocol.call('operation.execute', { ...authority, operationId: second.id, command }, grant, () => { deadlineReads++; return remaining; });
		remaining = 0; blocked.resolve();
		expect((await original).state).toBe('completed'); expect(await duplicate).toMatchObject({ id: first.id, state: 'completed' });
		expect(await pending).toMatchObject({ id: second.id, state: 'rejected', error: 'operation_expired' });
		expect(deadlineReads).toBeGreaterThan(0); expect(native.execute).toHaveBeenCalledTimes(1);
		expect(await workspace.operation(run.run.id, run.capability, second.id)).toMatchObject({ expiresAt: second.expiresAt, state: 'rejected' });
	});
	it('disposes a ready read-only second instance without starting or touching its ledger', async () => {
		class ReadOnlyPersistence extends MemoryPersistence {
			override readOnly = true; accesses = 0; disposed = false;
			override async read<T>(): Promise<T | undefined> { this.accesses++; throw new AgentBrowserError('owned_by_other_instance'); }
			override async write(): Promise<void> { this.accesses++; throw new AgentBrowserError('owned_by_other_instance'); }
			override async keys(): Promise<string[]> { this.accesses++; throw new AgentBrowserError('owned_by_other_instance'); }
			override async dispose() { this.disposed = true; }
		}
		const storage = new ReadOnlyPersistence(), { workspace } = await setup(storage);
		expect(workspace.getState()).toMatchObject({ ready: true, readOnly: true }); expect(storage.accesses).toBe(0);
		await expect(workspace.dispose()).resolves.toBeUndefined(); expect(storage.accesses).toBe(0); expect(storage.disposed).toBe(true);
	});
	it('still releases owner persistence if its shutdown ledger maintenance fails', async () => {
		class FailingMaintenancePersistence extends MemoryPersistence {
			armed = false; disposed = false;
			override async write(key: string, value: unknown) { if (this.armed && key === 'operation-checkpoint') throw new AgentBrowserError('journal_unavailable'); return super.write(key, value); }
			override async dispose() { this.disposed = true; }
		}
		const storage = new FailingMaintenancePersistence(), { workspace } = await task(storage); storage.armed = true;
		await expect(workspace.dispose()).rejects.toMatchObject({ code: 'journal_unavailable' }); expect(storage.disposed).toBe(true);
	});
	it('uses one durable ledger across actual Agent protocol, human lease and workspace management consumers', async () => {
		class ProtocolPersistence extends MemoryPersistence { override id() { return `${super.id()}-protocol`; } }
		const context = await task(new ProtocolPersistence()), { workspace, space, pageId, storage, native } = context;
		const run = await workspace.resumeAgent(space.id), protocol = new BrowserProtocolService(workspace);
		const grant: ConnectionGrant = { spaceId: space.id, runId: run.run.id, capability: run.capability, allowTaskCreation: false, created: false, runs: new Map() };
		const authority = { runId: run.run.id, capability: run.capability }, command = { kind: 'reload' as const };
		const ticket = await protocol.call('operation.prepare', { ...authority, pageId, requestId: 'protocol-request', command }, grant) as OperationRecord;
		expect(ticket).toMatchObject({ sequence: 1, scope: { principal: 'agent', issuerId: run.run.id, authorityId: run.run.leaseId } });
		await protocol.call('operation.execute', { ...authority, operationId: ticket.id, command }, grant);
		await protocol.call('operation.execute', { ...authority, operationId: ticket.id, command }, grant);
		expect(native.execute).toHaveBeenCalledTimes(1);
		expect(await protocol.call('operation.get', { ...authority, operationId: ticket.id }, grant)).toMatchObject({ id: ticket.id, state: 'completed', result: { ok: true } });
		const opened = await workspace.pageOpen(run.run.id, run.capability, 'open-once', 'https://example.com');
		expect((await workspace.pageOpen(run.run.id, run.capability, 'open-once', 'https://example.com')).id).toBe(opened.id);
		const human = await humanFrame(context); await workspace.pageAction({ ...human.request, command });
		await workspace.openPage({ spaceId: space.id });
		const checkpoint = (await storage.read<{ entries: OperationRecord[] }>('operation-checkpoint'))!;
		expect(checkpoint.entries.find(record => record.scope.principal === 'human')?.scope).toMatchObject({ issuerId: 'viewer-A', authorityId: human.request.leaseId });
		expect(checkpoint.entries.filter(record => record.scope.principal === 'workspace').every(record => record.scope.authorityId)).toBe(true);
		context.advance(31 * 86_400_000); await workspace.dispose();
		await expect(protocol.call('operation.get', { ...authority, operationId: ticket.id }, grant)).rejects.toMatchObject({ code: 'operation_gone' });
	});
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
	it('rejects an observation from another Page or an outdated viewport at the consumer boundary', async () => {
		const { workspace, space, native, pageId } = await task(), run = await workspace.resumeAgent(space.id), original = native.observe.getMockImplementation()!;
		for (const override of [{ pageId: 'another-page' }, { spaceId: 'another-space' }, { viewportVersion: 123 }]) {
			native.observe.mockImplementationOnce(async (...args) => ({ ...await original(...args), ...override }));
			await expect(workspace.observe(run.run.id, run.capability, pageId)).rejects.toMatchObject({ code: 'observation_stale' });
		}
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
	it.each(['dialog', 'chooser'] as const)('a %s response bypasses the click waiting for that response while still rejecting an old revision', async (kind) => {
		const context = await task(), { workspace, native, pageId, space } = context, { request } = await humanFrame(context), entered = gate(), replied = gate(), order: string[] = [];
		native.execute.mockImplementation(async (_pageId, command) => {
			order.push(command.kind);
			if (command.kind === 'click') {
				native.emit({ kind: 'request', request: { id: 'request-blocking-click', spaceId: space.id, pageId, runtimeId: native.id, documentId: native.pages.get(pageId)!.documentId, epoch: request.epoch, revision: 2, kind: kind === 'dialog' ? 'dialog' : 'file-chooser', message: 'Explicit response needed', expiresAt: 10000, status: 'pending' } });
				entered.resolve(); await replied.promise; order.push('click-finished');
			} else if (command.kind === kind) replied.resolve();
			return { ok: true };
		});
		const click = workspace.pageAction({ ...request, command: { kind: 'click', observationId: 'observation', ref: 'open-request' } }); await entered.promise;
		const response: BrowserCommand = kind === 'dialog' ? { kind, requestId: 'request-blocking-click', revision: 2, accept: true, text: 'confirmed' } : { kind, requestId: 'request-blocking-click', revision: 2, fileIds: [] };
		await expect(workspace.pageAction({ ...request, command: { ...response, revision: 1 } })).rejects.toMatchObject({ code: 'request_expired' });
		expect(native.execute).toHaveBeenCalledTimes(1);
		await expect(workspace.pageAction({ ...request, command: response })).resolves.toEqual({ ok: true });
		await expect(click).resolves.toEqual({ ok: true });
		expect(order).toEqual(['click', kind, 'click-finished']);
	});
	it('human stop bypasses a long page wait without allowing a stale human lease', async () => {
		const context = await task(), { workspace, native } = context, { request } = await humanFrame(context), entered = gate(), stopped = gate(), order: string[] = [];
		native.execute.mockImplementation(async (_pageId, command) => { order.push(command.kind); if (command.kind === 'wait') { entered.resolve(); await stopped.promise; } else if (command.kind === 'stop') stopped.resolve(); return { ok: true }; });
		const waiting = workspace.pageAction({ ...request, command: { kind: 'wait', condition: { kind: 'text', text: 'ready' }, timeoutMs: 15000 } }); await entered.promise;
		await expect(workspace.pageAction({ ...request, leaseId: 'old-lease', command: { kind: 'stop' } })).rejects.toMatchObject({ code: 'human_lease_expired' });
		expect(native.execute).toHaveBeenCalledTimes(1);
		await expect(workspace.pageAction({ ...request, command: { kind: 'stop' } })).resolves.toEqual({ ok: true });
		await expect(waiting).resolves.toEqual({ ok: true }); expect(order).toEqual(['wait', 'stop']);
	});
	it('an Agent prepared stop bypasses its long wait and retains capability and operation scope checks', async () => {
		const { workspace, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id), entered = gate(), stopped = gate(), order: string[] = [];
		const waitCommand: BrowserCommand = { kind: 'wait', condition: { kind: 'load' }, timeoutMs: 15000 }, stopCommand: BrowserCommand = { kind: 'stop' };
		const waitTicket = await workspace.prepare(run.run.id, run.capability, pageId, 'wait-before-stop', waitCommand), stopTicket = await workspace.prepare(run.run.id, run.capability, pageId, 'stop-long-wait', stopCommand);
		const otherSpace = await workspace.createSpace({ kind: 'task', label: 'Other task' }), otherRun = await workspace.resumeAgent(otherSpace.id);
		native.execute.mockImplementation(async (_pageId, command) => { order.push(command.kind); if (command.kind === 'wait') { entered.resolve(); await stopped.promise; } else if (command.kind === 'stop') stopped.resolve(); return { ok: true }; });
		const waiting = workspace.execute(run.run.id, run.capability, waitTicket.id, waitCommand); await entered.promise;
		await expect(workspace.execute(run.run.id, 'wrong-capability', stopTicket.id, stopCommand)).rejects.toMatchObject({ code: 'capability_invalid' });
		await expect(workspace.execute(otherRun.run.id, otherRun.capability, stopTicket.id, stopCommand)).rejects.toMatchObject({ code: 'operation_not_found' });
		expect(native.execute).toHaveBeenCalledTimes(1);
		expect(await workspace.execute(run.run.id, run.capability, stopTicket.id, stopCommand)).toMatchObject({ id: stopTicket.id, state: 'completed' });
		expect(await waiting).toMatchObject({ id: waitTicket.id, state: 'completed' }); expect(order).toEqual(['wait', 'stop']);
	});
	it('health provides a current Run cursor for projection recovery and page events reject another runtime', async () => {
		const { workspace, native, space, pageId } = await task(), run = await workspace.resumeAgent(space.id);
		const before = workspace.health(run.run.id, run.capability); expect(before).toMatchObject({ runtimeId: native.id, eventCursor: 0 });
		const page = { ...native.pages.get(pageId)!, title: 'Current title' };
		native.emit({ kind: 'page', runtimeId: 'stale-runtime', page: { ...page, title: 'Old title' } });
		expect(workspace.health(run.run.id, run.capability).eventCursor).toBe(0);
		native.emit({ kind: 'page', runtimeId: native.id, page });
		expect(workspace.pageList(run.run.id, run.capability)[0]?.title).toBe('Current title');
		const events = workspace.events(run.run.id, run.capability, before.eventCursor);
		expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ sequence: 1, runtimeId: native.id, kind: 'page', pageId });
		expect(events[0]).not.toHaveProperty('title'); expect(events[0]).not.toHaveProperty('url');
		native.emit({ kind: 'page-closed', runtimeId: native.id, pageId });
		expect(workspace.events(run.run.id, run.capability, 1)).toMatchObject([{ sequence: 2, runtimeId: native.id, kind: 'page-closed', pageId }]);
		expect(workspace.health(run.run.id, run.capability).eventCursor).toBe(2);
		await workspace.pause(space.id); expect(() => workspace.health(run.run.id, run.capability)).toThrowError('run_revoked'); expect(() => workspace.pageList(run.run.id, run.capability)).toThrowError('run_revoked');
		expect(workspace.events(run.run.id, run.capability, 2).some(event => event.type === 'controlChanged')).toBe(true);
		expect(workspace.eventSnapshot(run.run.id, run.capability)).toMatchObject({ active: false, pages: [], requests: [], downloads: [] });
	});
	it('validates a static same-version frame before composition and text without revoking control', async () => {
		const context = await task(), { workspace, native, advance, state, space } = context, { request } = await humanFrame(context);
		advance(3001);
		for (const [index, input] of ([{ kind: 'composition', phase: 'start', text: '', selectionStart: 0, selectionEnd: 0 }, { kind: 'composition', phase: 'update', text: '中', selectionStart: 1, selectionEnd: 1 }, { kind: 'composition', phase: 'end', text: '中', selectionStart: 1, selectionEnd: 1 }, { kind: 'text', text: '文' }] satisfies HumanInput[]).entries()) await workspace.humanInput({ ...request, inputSequence: index + 1, input });
		expect(native.observe).toHaveBeenCalled(); expect(native.execute).toHaveBeenCalledTimes(4); expect(state(space.id).control.mode).toBe('human');
	});
	it.each(['documentId', 'viewportVersion'] as const)('rejects static-frame validation after current %s changes without dispatching old input', async field => {
		const context = await task(), { workspace, native, advance, pageId } = context, { request } = await humanFrame(context), original = native.observe.getMockImplementation()!;
		advance(3001); native.observe.mockImplementationOnce(async (...args) => { const observation = await original(...args); const page = native.pages.get(pageId)!; native.emit({ kind: 'page', runtimeId: native.id, page: { ...page, [field]: field === 'documentId' ? 'new-document' : 1 } }); return observation; });
		await expect(workspace.humanInput({ ...request, inputSequence: 1, input: { kind: 'text', text: 'old input' } })).rejects.toMatchObject({ code: 'frame_stale' }); expect(native.execute).not.toHaveBeenCalled();
	});
	it.each(['lease', 'viewer', 'runtime'] as const)('rechecks %s after a static-frame validation await before dispatch', async boundary => {
		const context = await task(), { workspace, native, advance, space } = context, { request } = await humanFrame(context), entered = gate(), blocked = gate(), original = native.observe.getMockImplementation()!;
		advance(3001); native.observe.mockImplementationOnce(async (...args) => { const result = await original(...args); entered.resolve(); await blocked.promise; return result; });
		const sending = workspace.humanInput({ ...request, inputSequence: 1, input: { kind: 'text', text: 'withheld' } }); const denied = expect(sending).rejects.toBeDefined(); await entered.promise;
		if (boundary === 'runtime') await workspace.stopSpace(space.id);
		else if (boundary === 'viewer') await workspace.releaseViewer(space.id, request.viewerId);
		else await workspace.pause(space.id);
		blocked.resolve(); await denied; expect(native.execute).not.toHaveBeenCalled();
	});
	it('bounds a hung static-frame validation and never replays the withheld text', async () => {
		const context = await task(), { workspace, native, advance } = context, { request } = await humanFrame(context), blocked = gate(); advance(3001);
		const original = native.observe.getMockImplementation()!; native.observe.mockImplementationOnce(async (...args) => { await blocked.promise; return original(...args); });
		vi.useFakeTimers(); try {
			const result = workspace.humanInput({ ...request, inputSequence: 1, input: { kind: 'text', text: 'do not replay' } }); const denied = expect(result).rejects.toMatchObject({ code: 'frame_stale' });
			await vi.advanceTimersByTimeAsync(1501); await denied; blocked.resolve(); await Promise.resolve(); expect(native.execute).not.toHaveBeenCalled();
		} finally { vi.useRealTimers(); }
	});
	it.each([
		{ kind: 'keyboard', inputs: [{ kind: 'key', key: 'a' }, { kind: 'key', key: 'b' }] },
		{ kind: 'committed text', inputs: [{ kind: 'text', text: '中' }, { kind: 'text', text: '文' }] },
	] satisfies Array<{ kind: string; inputs: [HumanInput, HumanInput] }>)('serializes consecutive $kind inputs from one valid frame without dropping the second input', async ({ inputs }) => {
		const context = await task(), { workspace, native, advance } = context, { request } = await humanFrame(context), entered = gate(), blocked = gate();
		native.execute.mockImplementationOnce(async () => { entered.resolve(); await blocked.promise; return { ok: true }; });
		const first = workspace.humanInput({ ...request, inputSequence: 1, input: inputs[0] }); await entered.promise;
		const second = workspace.humanInput({ ...request, inputSequence: 2, input: inputs[1] }), settled = Promise.allSettled([first, second]);
		await Promise.resolve(); expect(native.execute).toHaveBeenCalledTimes(1); blocked.resolve();
		expect(await settled).toEqual([{ status: 'fulfilled', value: undefined }, { status: 'fulfilled', value: undefined }]);
		expect(native.execute.mock.calls.map(([, command]) => command)).toEqual([{ kind: 'input', input: inputs[0], inputSequence: 1 }, { kind: 'input', input: inputs[1], inputSequence: 2 }]);
		await expect(workspace.humanInput({ ...request, inputSequence: 2, input: inputs[1] })).rejects.toMatchObject({ code: 'input_sequence_stale' });
		await expect(workspace.humanInput({ ...request, inputSequence: 3, input: { kind: 'click', x: 20, y: 30 } })).rejects.toMatchObject({ code: 'frame_stale' });
		advance(3001); await workspace.humanInput({ ...request, inputSequence: 3, input: inputs[1] });
		expect(native.observe).toHaveBeenCalledOnce(); expect(native.execute).toHaveBeenCalledTimes(3);
	});
	it('a keyboard input queued from a valid frame is rejected when its document changes before dispatch', async () => {
		const context = await task(), { workspace, native, pageId } = context, { request } = await humanFrame(context), entered = gate(), blocked = gate();
		native.execute.mockImplementationOnce(async () => { entered.resolve(); await blocked.promise; return { ok: true }; });
		const first = workspace.humanInput({ ...request, inputSequence: 1, input: { kind: 'key', key: 'a' } }); await entered.promise;
		let secondFinished = false;
		const second = workspace.humanInput({ ...request, inputSequence: 2, input: { kind: 'key', key: 'b' } }).finally(() => { secondFinished = true; }), settled = Promise.allSettled([first, second]);
		await Promise.resolve(); await Promise.resolve(); expect(secondFinished).toBe(false); expect(native.execute).toHaveBeenCalledTimes(1);
		native.emit({ kind: 'page', runtimeId: native.id, page: { ...native.pages.get(pageId)!, documentId: 'replacement-document', url: 'https://example.com/next' } });
		blocked.resolve(); const results = await settled; expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'frame_stale' } });
		expect(native.execute).toHaveBeenCalledTimes(1);
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

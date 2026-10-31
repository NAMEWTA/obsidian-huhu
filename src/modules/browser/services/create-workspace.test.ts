import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { composeBrowserWorkspace } from './create-workspace';
import type { BrowserRuntime, BrowserRuntimeFactory, ControlLease, RuntimeIdentityState, RuntimePage } from '../core/contracts';
import type { IdentityCookie } from '../core/identity';
import { DesktopCredentialStore } from '../platform/desktop/identity/credential-store';
import { DesktopIdentitySourceReader } from '../platform/desktop/identity/source-reader';
import { createBrowserPersistence } from '../platform/desktop/persistence/browser-persistence';
import { DesktopBrowserFileService } from '../platform/desktop/files/file-service';
import { createBrowserRpcServer } from '../platform/desktop/rpc-server';
import type { DesktopBrowserPorts } from '../platform/desktop/composition';
import { TestBrowserProtector } from '../../../../test/fixtures/browser-protector';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
function gate() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); cleanup.push(async () => resolve()); return { promise, resolve }; }
const cookies: IdentityCookie[] = [
	{ name: '__Host-session', value: 'SYNTHETIC_COOKIE_SECRET', domain: 'example.com', hostOnly: true, path: '/', secure: true, httpOnly: true, session: true, sameSite: 'Strict' },
	{ name: 'sid', value: 'SYNTHETIC_PARTITION_SECRET', domain: '.example.com', hostOnly: false, path: '/account', secure: true, httpOnly: true, session: false, expires: 4000000000, sameSite: 'None', priority: 'High', sourceScheme: 'Secure', sourcePort: 443, partitionKey: { topLevelSite: 'https://portal.example', hasCrossSiteAncestor: true } },
];
async function fixture() {
	const root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), 'huhu-identity-flow-'))); cleanup.push(async () => fs.rm(root, { recursive: true, force: true }));
	const protector = new TestBrowserProtector();
	let persistence: ReturnType<typeof createBrowserPersistence> | undefined;
	for (let attempt = 0; attempt < 6; attempt++) {
		const candidate = createBrowserPersistence({ root: path.join(root, attempt === 0 ? 'owned' : `owned-${attempt}`), protector });
		await candidate.initialize();
		if (!candidate.readOnly) { persistence = candidate; cleanup.push(async () => candidate.dispose()); break; }
		await candidate.dispose();
	}
	if (!persistence) throw new Error('browser owner port stayed busy');
	expect(persistence.readOnly).toBe(false);
	const credentials = new DesktopCredentialStore({ directory: path.join(root, 'identities'), vaultId: 'synthetic-vault', deviceId: 'synthetic-device', protector, assertOwner: () => persistence.assertOwner() });
	const source = new DesktopIdentitySourceReader({ temporaryDirectory: path.join(root, 'source-staging'), readerExecutable: async () => { throw new Error('no native reader needed'); }, recordCleanupFailure: async () => {} });
	const sourceFile = path.join(root, 'authorized-cookies.json'); await fs.writeFile(sourceFile, JSON.stringify(cookies));
	const files = new DesktopBrowserFileService({ directory: path.join(root, 'files'), metadataScope: 'synthetic-flow', metadataProtector: protector, downloadDirectory: () => path.join(root, 'downloads') }); await files.ready;
	const order: string[] = [], runtimes: BrowserRuntime[] = [], states = new Map<string, RuntimeIdentityState>();
	let readBarrier: ((id: string, read: number) => Promise<void>) | undefined, serial = 0;
	const makeRuntime = (id: string, spaceId: string): BrowserRuntime => {
		let reads = 0; const runtime: BrowserRuntime = {
			id, spaceId, onEvent: () => () => {}, setControl: async (_lease: ControlLease | undefined, epoch) => ({ runtimeId: id, epoch, lastDispatchedSequence: 0, transportState: 'open' }),
			createPage: vi.fn(async (pageId, url): Promise<RuntimePage> => { order.push('page'); return { id: pageId, url, title: '', documentId: 'fresh-document', zoom: 1, viewportVersion: 0 }; }),
			closePage: async () => {}, execute: async () => null, observe: async () => { throw new Error('unused'); }, watch: async () => {}, cancelDownload: async () => {},
			readIdentity: async () => { order.push(`${id}:read`); const rows = structuredClone(states.get(id) ?? { cookies: [] }); await readBarrier?.(id, ++reads); return rows; },
			writeIdentity: async seed => { order.push(`${id}:write`); states.set(id, structuredClone(seed)); }, stop: vi.fn(async () => { order.push(`${id}:stop`); }),
		}; runtimes.push(runtime); return runtime;
	};
	const runtimeFactory: BrowserRuntimeFactory = { availability: async () => ({ state: 'ready', version: 'synthetic-runtime' }), start: async input => makeRuntime(input.runtimeId, input.spaceId), reclaim: vi.fn(async () => {}), removeProfile: vi.fn(async () => {}), installBundle: async () => {}, dispose: async () => {} };
	const ports: DesktopBrowserPorts = {
		root, persistence, credentials, runtimeFactory: { ...runtimeFactory, readerExecutable: async () => 'unused', recoverEphemeral: async () => {} },
		scheduleInterval: () => () => {}, listSources: async () => [],
		sourceText: async (label, signal) => ({ label, ...await source.captureText(source.issueFileGrant(sourceFile).id, signal) }),
		sourceSeed: async () => { throw new Error('unused'); },
		staging: async () => ({ runtime: makeRuntime(`staging-${++serial}`, 'staging'), cleanup: vi.fn(async () => { order.push('staging:cleanup'); }) }),
		cleanupPending: () => 0, retryCleanup: async () => {}, fileService: () => files, chooseUpload: async () => undefined, exportFile: async () => {},
		rpc: (handler, register, guardResponse) => createBrowserRpcServer({ directory: path.join(root, 'connections'), assertOwner: () => persistence.assertOwner(), handler, register, guardResponse }),
		disposeSources: async () => source.dispose(),
	};
	const composed = composeBrowserWorkspace(ports, { renderViewer: async () => undefined, materials: async () => [] }); cleanup.push(async () => composed.dispose()); await composed.initialize();
	const preview = await composed.workspace.prepareIdentityFile({ label: 'Synthetic identity' }); expect(preview).toBeDefined();
	const receipt = await composed.workspace.commitIdentityImport({ planId: preview!.planId, persist: true }), identity = composed.workspace.listIdentities().find(item => item.id === receipt.id)!;
	return { ...composed, root, ports, credentials, protector, identity, order, runtimes, states, blockRead: (callback: typeof readBarrier) => { readBarrier = callback; } };
}

async function human(f: Awaited<ReturnType<typeof fixture>>) {
	const space = await f.workspace.createSpace({ kind: 'personal', identityVersionId: f.identity.id }), pageId = space.pages[0]!.id;
	f.workspace.subscribeFrames({ spaceId: space.id, pageId, viewerId: 'synthetic-human' }, () => {});
	const lease = await f.workspace.takeover({ spaceId: space.id, viewerId: 'synthetic-human', windowId: 'synthetic-window' });
	return { space, request: { spaceId: space.id, pageId, viewerId: 'synthetic-human', leaseId: lease.leaseId, epoch: lease.epoch, label: 'Manual saved fact', persist: true } };
}

it.each(['pause', 'viewer'] as const)('returns a committed manual identity receipt even if %s revokes the source lease after publication', async revoke => {
	const f = await fixture(), h = await human(f), create = f.credentials.create.bind(f.credentials);
	vi.spyOn(f.credentials, 'create').mockImplementation(async (...args) => { await create(...args); if (revoke === 'pause') await f.workspace.pause(h.space.id); else await f.workspace.releaseViewer(h.space.id, h.request.viewerId); });
	const result = await f.workspace.saveIdentity(h.request);
	expect(result).toMatchObject({ publication: 'committed', source: 'manual-login', cookieCount: 2 }); expect(f.workspace.listIdentities().some(item => item.id === result.id)).toBe(true);
	expect(result).not.toHaveProperty('capture'); expect(JSON.stringify(result)).not.toContain('SYNTHETIC');
	expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(2);
});

it('refuses manual save before any source read after its original viewer has released control', async () => {
	const f = await fixture(), h = await human(f), runtime = f.runtimes.find(item => item.id === h.space.runtimeId)!, read = vi.spyOn(runtime, 'readIdentity');
	await f.workspace.releaseViewer(h.space.id, h.request.viewerId); await expect(f.workspace.saveIdentity(h.request)).rejects.toMatchObject({ code: 'human_lease_expired' }); expect(read).not.toHaveBeenCalled();
	expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(1);
});

it('retains source authorization at the actual publication boundary, not just before asynchronous encryption', async () => {
	const f = await fixture(), h = await human(f), entered = gate(), release = gate(), protect = f.protector.protect.bind(f.protector);
	vi.spyOn(f.protector, 'protect').mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return protect(...args); });
	const saving = f.workspace.saveIdentity(h.request), rejected = expect(saving).rejects.toMatchObject({ code: 'human_lease_expired' });
	await entered.promise; await f.workspace.pause(h.space.id); release.resolve(); await rejected;
	expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(1);
});

it.each(['commit-list', 'commit-read', 'commit-provider', 'manual-list', 'manual-read', 'manual-provider'] as const)('preserves committed %s facts while allowing only the directory refresh to be retried', async mode => {
	const f = await fixture(), manual = mode.startsWith('manual') ? await human(f) : undefined;
	const plan = !manual ? await f.workspace.prepareIdentityImport({ label: 'Second saved fact', text: JSON.stringify(cookies) }) : undefined;
	const create = f.credentials.create.bind(f.credentials), list = f.credentials.listIds.bind(f.credentials), read = f.credentials.read.bind(f.credentials), availability = f.credentials.availability.bind(f.credentials); let failed = false;
	const creates = vi.spyOn(f.credentials, 'create').mockImplementation(async (...args) => { await create(...args); failed = true; });
	vi.spyOn(f.credentials, 'listIds').mockImplementation(async () => { if (failed && mode.endsWith('list')) throw new Error('EIO'); return list(); });
	vi.spyOn(f.credentials, 'read').mockImplementation(async id => { if (failed && mode.endsWith('read')) throw new Error('SYNTHETIC_PRIVATE_READ_PATH'); return read(id); });
	vi.spyOn(f.credentials, 'availability').mockImplementation(async () => failed && mode.endsWith('provider') ? 'unavailable' : availability());
	const result = manual ? await f.workspace.saveIdentity(manual.request) : await f.workspace.commitIdentityImport({ planId: plan!.planId, persist: true });
	expect(result).toMatchObject({ publication: 'committed', catalogRefresh: 'pending', cookieCount: 2 }); expect(f.workspace.getState().identityRefreshPending).toBe(true);
	expect(f.workspace.listIdentities().some(item => item.id === result.id)).toBe(true); expect(creates).toHaveBeenCalledOnce();
	expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(2);
	await expect(f.workspace.refreshIdentities()).rejects.toMatchObject({ code: 'identity_refresh_unavailable' }); expect(f.workspace.getState().identityRefreshPending).toBe(true); expect(creates).toHaveBeenCalledOnce();
	failed = false; await f.workspace.refreshIdentities(); expect(f.workspace.getState().identityRefreshPending).toBe(false); expect(f.workspace.listIdentities().map(item => item.id).sort()).toEqual([f.identity.id, result.id].sort()); expect(creates).toHaveBeenCalledOnce();
});

it('does not turn a real pre-publication create failure into a committed receipt or a directory-only failure', async () => {
	const f = await fixture(), plan = await f.workspace.prepareIdentityImport({ label: 'Not committed', text: JSON.stringify(cookies) });
	vi.spyOn(f.protector, 'protect').mockRejectedValueOnce(new Error('synthetic-protection-failure'));
	await expect(f.workspace.commitIdentityImport({ planId: plan.planId, persist: true })).rejects.toThrow(); expect(f.workspace.listIdentities()).toEqual([f.identity]); expect(f.workspace.getState().identityRefreshPending).toBe(false);
	expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(1);
	const receipt = await f.workspace.commitIdentityImport({ planId: plan.planId, persist: true }); expect(receipt.publication).toBe('committed'); expect((await f.credentials.listIds())).toHaveLength(2);
});

it('does not let an older in-flight directory read hide a later committed identity whose own refresh failed', async () => {
	const f = await fixture(), first = await f.workspace.prepareIdentityImport({ label: 'First concurrent save', text: JSON.stringify(cookies) }), second = await f.workspace.prepareIdentityImport({ label: 'Second concurrent save', text: JSON.stringify(cookies) });
	const entered = gate(), release = gate(), read = f.credentials.read.bind(f.credentials), list = f.credentials.listIds.bind(f.credentials); let blocked = false, fail = false;
	vi.spyOn(f.credentials, 'read').mockImplementation(async id => { if (!blocked) { blocked = true; entered.resolve(); await release.promise; } return read(id); });
	vi.spyOn(f.credentials, 'listIds').mockImplementation(async () => { if (fail) throw new Error('synthetic-list-failure'); return list(); });
	const saving = f.workspace.commitIdentityImport({ planId: first.planId, persist: true }); await entered.promise; fail = true;
	const later = await f.workspace.commitIdentityImport({ planId: second.planId, persist: true }); expect(later.catalogRefresh).toBe('pending'); release.resolve(); await saving;
	expect(f.workspace.listIdentities().some(item => item.id === later.id)).toBe(true); expect(f.workspace.getState().identityRefreshPending).toBe(true);
	fail = false; await f.workspace.refreshIdentities(); expect(f.workspace.listIdentities()).toHaveLength(3); expect(await f.credentials.listIds()).toHaveLength(3);
});

it.each(['read', 'encryption', 'readback', 'publication'] as const)('manual save cancellation at %s preserves the actual publication fact', async phase => {
	const f = await fixture(), h = await human(f), entered = gate(), release = gate(), controller = new AbortController();
	let restore = () => {};
	if (phase === 'read') { const runtime = f.runtimes.find(item => item.id === h.space.runtimeId)!, read = runtime.readIdentity.bind(runtime); vi.spyOn(runtime, 'readIdentity').mockImplementationOnce(async () => { entered.resolve(); await release.promise; return read(); }); }
	else if (phase === 'encryption') { const protect = f.protector.protect.bind(f.protector); vi.spyOn(f.protector, 'protect').mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return protect(...args); }); }
	else if (phase === 'readback') { const unprotect = f.protector.unprotect.bind(f.protector); vi.spyOn(f.protector, 'unprotect').mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return unprotect(...args); }); }
	else { const link = fs.link.bind(fs), intercepted = vi.spyOn(fs, 'link').mockImplementation(async (source, target) => { await link(source, target); if (typeof target === 'string' && path.dirname(target) === path.join(f.root, 'identities') && target.endsWith('.sealed')) { entered.resolve(); await release.promise; } }); restore = () => intercepted.mockRestore(); }
	try {
		const saving = f.workspace.saveIdentity({ ...h.request, signal: controller.signal });
		const settled = phase === 'publication' ? expect(saving).resolves.toMatchObject({ publication: 'committed', source: 'manual-login' }) : expect(saving).rejects.toMatchObject({ code: 'cancelled' });
		await entered.promise; controller.abort(); release.resolve(); await settled;
		expect((await fs.readdir(path.join(f.root, 'identities'))).filter(name => name.endsWith('.sealed'))).toHaveLength(phase === 'publication' ? 2 : 1);
	} finally { release.resolve(); restore(); }
});

it('connects an authorized file through encrypted identity, staging and complete target readback before publishing ready', async () => {
	const f = await fixture(), phases: string[] = [], unsubscribe = f.workspace.subscribe(() => { for (const space of f.workspace.getState().spaces) if (space.identityImport) phases.push(`${space.status}:${space.identityImport.phase}`); });
	const space = await f.workspace.createSpace({ kind: 'personal', label: 'Synthetic new space', identityVersionId: f.identity.id }); unsubscribe();
	expect(space).toMatchObject({ status: 'ready', identityImport: { phase: 'verified', importedCount: 2, naturallyExpired: 0, loginStatus: 'not-verified' } });
	expect(f.states.get(space.runtimeId!)?.cookies).toEqual(cookies); expect(f.states.get('staging-1')?.cookies).toEqual(cookies);
	expect(phases).toEqual(expect.arrayContaining(['provisioning:source', 'provisioning:staging', 'provisioning:target', 'provisioning:cleanup', 'ready:verified']));
	expect(f.order.indexOf('staging:cleanup')).toBeLessThan(f.order.indexOf('page')); expect(f.order.filter(step => step.endsWith(':read'))).toHaveLength(4);
	const ciphertext = await fs.readFile(path.join(f.root, 'identities', `${f.identity.id}.sealed`), 'utf8'); expect(ciphertext).not.toContain('SYNTHETIC_COOKIE_SECRET');
	expect((await f.credentials.read(f.identity.id)).capture).toMatchObject({ consistency: 'fixed-file', digestKind: 'source-bytes', sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }); expect(f.identity).not.toHaveProperty('capture');
	await f.workspace.stopSpace(space.id); await f.workspace.startSpace(space.id); expect(f.order.filter(step => step === 'staging:cleanup')).toHaveLength(1);
});
it.each(['source', 'staging', 'target', 'cleanup'] as const)('cancels during %s without publishing ready or opening a working page', async phase => {
	const f = await fixture(), controller = new AbortController(), entered = gate(), release = gate();
	if (phase === 'source') { const read = f.credentials.read.bind(f.credentials); vi.spyOn(f.credentials, 'read').mockImplementation(async id => { entered.resolve(); await release.promise; return read(id); }); }
	else if (phase === 'cleanup') { const staging = f.ports.staging; f.ports.staging = async () => { const stage = await staging(); return { ...stage, cleanup: async () => { entered.resolve(); await release.promise; await stage.cleanup(); } }; }; }
	else f.blockRead(async (id, count) => { if (count === 2 && (phase === 'staging' ? id.startsWith('staging') : !id.startsWith('staging'))) { entered.resolve(); await release.promise; } });
	const creating = f.workspace.createSpace({ kind: 'personal', identityVersionId: f.identity.id, signal: controller.signal });
	await entered.promise; controller.abort(); release.resolve(); await expect(creating).rejects.toMatchObject({ code: 'cancelled' });
	expect(f.workspace.getState().spaces.some(space => space.status === 'ready')).toBe(false); expect(f.order).not.toContain('page'); expect(f.ports.runtimeFactory.removeProfile).toHaveBeenCalled();
	expect(f.workspace.listIdentities()).toEqual([f.identity]);
});

it('preserves a correctly published new Space when cancellation arrives during the final catalog await', async () => {
	const f = await fixture(), controller = new AbortController(), entered = gate(), release = gate(), write = f.ports.persistence.write.bind(f.ports.persistence);
	vi.spyOn(f.ports.persistence, 'write').mockImplementation(async (key, value) => { await write(key, value); if (key === 'catalog' && Array.isArray(value) && value.some(space => (space as { status: string }).status === 'ready')) { entered.resolve(); await release.promise; } });
	const creating = f.workspace.createSpace({ kind: 'personal', identityVersionId: f.identity.id, signal: controller.signal }); await entered.promise; controller.abort(); release.resolve();
	const created = await creating; expect(created.status).toBe('ready'); expect(f.workspace.getState().spaces).toMatchObject([{ id: created.id, status: 'ready' }]); expect(f.ports.runtimeFactory.removeProfile).not.toHaveBeenCalled();
});

it('keeps a failed target locatable in the durable catalog until owned cleanup can be retried', async () => {
	const f = await fixture(), start = f.ports.runtimeFactory.start.bind(f.ports.runtimeFactory); let blocked: BrowserRuntime | undefined;
	f.ports.runtimeFactory.start = async input => {
		const runtime = await start(input), read = runtime.readIdentity.bind(runtime); blocked = runtime;
		runtime.readIdentity = async () => { const state = await read(); if (state.cookies[0]) state.cookies[0].httpOnly = false; return state; };
		runtime.stop = vi.fn(async () => { throw new Error('SYNTHETIC_PRIVATE_NATIVE_ERROR'); }); return runtime;
	};
	await expect(f.workspace.createSpace({ kind: 'personal', identityVersionId: f.identity.id })).rejects.toMatchObject({ code: 'cleanup_pending' });
	const pending = f.workspace.getState().spaces[0]!; expect(pending).toMatchObject({ status: 'cleanup_pending', error: 'cleanup_pending' }); expect(pending.identityImport).not.toHaveProperty('importedCount');
	expect(await f.ports.persistence.read('catalog')).toMatchObject([{ id: pending.id, status: 'cleanup_pending', error: 'cleanup_pending' }]); expect(f.order).not.toContain('page');
	expect(JSON.stringify(f.workspace.getState())).not.toContain('SYNTHETIC');
	blocked!.stop = async () => {}; await f.workspace.retryCleanup(pending.id); expect(f.workspace.getState().spaces).toEqual([]);
});

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { request as httpRequest } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserRpcServer } from './rpc-server';
import { AgentBrowserError, type RunGrant } from '../../core/contracts';
import type { BrowserConnectionScope, BrowserRpcConnection, BrowserRpcServer, RpcHandler } from '../../core/rpc';

const roots: string[] = [], servers: BrowserRpcServer[] = [], releases: Array<() => void> = [];
afterEach(async () => { for (const release of releases.splice(0)) release(); await Promise.all(servers.splice(0).map((server) => server.dispose())); vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
function gate() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); releases.push(resolve); return { promise, resolve }; }
function scope(name = 'A'): BrowserConnectionScope { const grant: RunGrant = { run: { id: `run-${name}`, spaceId: `space-${name}`, runtimeId: `runtime-${name}`, issuerId: `space-${name}`, epoch: 1, leaseId: `lease-${name}`, state: 'active', expiresAt: Date.now() + 120000 }, capability: `capability-${name}`.padEnd(48, 'x') }; return { spaceId: grant.run.spaceId, grant, allowTaskCreation: false }; }
async function setup(handler?: RpcHandler) {
	const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-rpc-')); roots.push(root); let owner = true; const registered = new Map<string, BrowserConnectionScope>();
	const dispatch = vi.fn(handler ?? (async (_method, _params, id) => ({ spaceId: registered.get(id)!.spaceId })));
	const server = createBrowserRpcServer({ directory: root, assertOwner: async () => { if (!owner) throw new AgentBrowserError('owned_by_other_instance'); }, handler: dispatch, register: (id, selected) => { registered.set(id, selected); } }); servers.push(server);
	return { root, server, dispatch, registered, loseOwner: () => { owner = false; } };
}
async function connection(server: BrowserRpcServer, value = scope()): Promise<{ file: string; descriptor: BrowserRpcConnection }> {
	const file = await server.create(value);
	const descriptor = JSON.parse(await fs.readFile(file, 'utf8')) as BrowserRpcConnection;
	return { file, descriptor };
}
interface Response { status: number; body: { result?: unknown; error?: { code?: string } }; }
function post(descriptor: BrowserRpcConnection, options: { headers?: Record<string, string>; body?: string; envelope?: Record<string, unknown>; method?: string } = {}): Promise<Response> {
	const body = options.body ?? JSON.stringify({ protocolVersion: 2, bootId: descriptor.bootId, requestId: 'request-A', method: 'status', params: {}, deadlineAtMs: Date.now() + 60000, ...options.envelope });
	return new Promise((resolve) => {
		const req = httpRequest(descriptor.endpoint, { method: options.method ?? 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${descriptor.token}`, ...options.headers } }, (res) => {
			const chunks: Buffer[] = []; res.on('data', (chunk: Buffer) => chunks.push(chunk)); res.on('end', () => { try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); } catch { resolve({ status: res.statusCode ?? 0, body: {} }); } });
		});
		req.on('error', () => resolve({ status: 0, body: {} })); req.setTimeout(4000, () => req.destroy()); req.end(body);
	});
}

describe('actual loopback browser RPC', () => {
	it('returns a private descriptor path and binds only loopback with independent connection scopes', async () => {
		const { server, root, dispatch } = await setup(), a = await connection(server, scope('A')), b = await connection(server, scope('B'));
		expect(path.isAbsolute(a.file)).toBe(true); expect(path.dirname(a.file)).toBe(root); expect(new URL(a.descriptor.endpoint).hostname).toBe('127.0.0.1'); expect(a.descriptor.token).not.toBe(b.descriptor.token);
		if (process.platform !== 'win32') expect((await fs.stat(a.file)).mode & 0o777).toBe(0o600);
		expect((await post(a.descriptor)).body.result).toEqual({ spaceId: 'space-A' }); expect((await post(b.descriptor)).body.result).toEqual({ spaceId: 'space-B' }); expect(dispatch.mock.calls[0]?.[2]).not.toBe(dispatch.mock.calls[1]?.[2]);
	});
	it('rejects hostile Host, Origin, Fetch metadata, token and stale boot before dispatch', async () => {
		const { server, dispatch } = await setup(), { descriptor } = await connection(server);
		const rejectedHeaders: Array<Record<string, string>> = [{ Host: 'evil.example' }, { Origin: 'https://evil.example' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Content-Type': 'text/plain' }];
		for (const headers of rejectedHeaders) expect((await post(descriptor, { headers })).status).toBe(403);
		expect((await post(descriptor, { headers: { Authorization: 'Bearer wrong-token' } })).status).toBe(401);
		expect((await post(descriptor, { envelope: { bootId: 'prior-boot' } })).body.error?.code).toBe('boot_changed'); expect((await post(descriptor, { envelope: { protocolVersion: 1 } })).body.error?.code).toBe('invalid_request'); expect(dispatch).not.toHaveBeenCalled();
	});
	it('rejects oversized and expired requests without invoking the protocol', async () => {
		const { server, dispatch } = await setup(), { descriptor } = await connection(server);
		expect((await post(descriptor, { envelope: { deadlineAtMs: Date.now() - 1 } })).body.error?.code).toBe('deadline_invalid');
		const oversized = await post(descriptor, { body: JSON.stringify({ padding: 'x'.repeat(513 * 1024) }) }); expect([0, 400]).toContain(oversized.status); expect(dispatch).not.toHaveBeenCalled();
	});
	it('limits real in-flight requests to 32 and returns a stable quota response', async () => {
		const blocked = gate(), entered = gate(); let calls = 0;
		const { server } = await setup(async () => { if (++calls === 32) entered.resolve(); await blocked.promise; return { ok: true }; }), { descriptor } = await connection(server);
		const pending = Array.from({ length: 32 }, () => post(descriptor)); await entered.promise;
		const overflow = await post(descriptor); expect(overflow.status).toBe(429); expect(overflow.body.error?.code).toBe('request_quota'); blocked.resolve(); expect((await Promise.all(pending)).every((reply) => reply.status === 200)).toBe(true);
	});
	it('a short HTTP deadline does not cancel a dispatched operation or free its backend concurrency budget early', async () => {
		const blocked = gate(), entered = gate(); let calls = 0, completed = 0;
		const { server } = await setup(async () => { if (++calls === 32) entered.resolve(); await blocked.promise; completed++; return { completed: true }; }), { descriptor } = await connection(server);
		const pending = Array.from({ length: 32 }, () => post(descriptor, { envelope: { deadlineAtMs: Date.now() + 1000 } })); await entered.promise;
		const expired = await Promise.all(pending); expect(expired.every((reply) => reply.body.error?.code === 'outcome_unknown')).toBe(true); expect(completed).toBe(0);
		const overflow = await post(descriptor); expect(overflow.status).toBe(429); expect(calls).toBe(32); blocked.resolve(); await Promise.resolve(); await Promise.resolve(); expect(completed).toBe(32);
	});
	it('owner loss while a reply is pending prevents sensitive response publication', async () => {
		const blocked = gate(), entered = gate(); const context = await setup(async () => { entered.resolve(); await blocked.promise; return { text: 'private late result' }; }), { descriptor } = await connection(context.server);
		const pending = post(descriptor); await entered.promise; context.loseOwner(); blocked.resolve(); const response = await pending;
		expect(response.status).toBe(400); expect(response.body).not.toHaveProperty('result'); expect(JSON.stringify(response.body)).not.toContain('private late result');
	});
	it('rechecks Run authority synchronously after the final asynchronous owner check and before serializing', async () => {
		const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-rpc-final-fence-')); roots.push(root); let resolved = false, parentActive = true;
		const guardResponse = vi.fn((_method: unknown, _params: unknown, _connectionId: string, result: unknown) => { if (!parentActive) throw new AgentBrowserError('run_revoked'); return result; });
		const server = createBrowserRpcServer({ directory: root, register: () => undefined, guardResponse,
			assertOwner: async () => { if (resolved) { await Promise.resolve(); parentActive = false; } },
			handler: async () => { resolved = true; return { text: 'private-observation-after-revocation' }; },
		}); servers.push(server); const { descriptor } = await connection(server);
		const response = await post(descriptor, { envelope: { method: 'observe', params: { runId: descriptor.runId, capability: descriptor.capability, pageId: 'page-A' } } });
		expect(guardResponse).toHaveBeenCalledOnce(); expect(response.status).toBe(400); expect(response.body.error?.code).toBe('run_revoked'); expect(JSON.stringify(response.body)).not.toContain('private-observation-after-revocation');
	});
	it('concurrent creation reserves the 32-connection budget before any asynchronous work', async () => {
		const { server, root } = await setup(); const results = await Promise.allSettled(Array.from({ length: 40 }, (_, index) => server.create(scope(String(index)))));
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(32); expect(results.filter((result) => result.status === 'rejected')).toHaveLength(8); expect(await fs.readdir(root)).toHaveLength(32);
	});
	it('late disposal cannot delete a descriptor replaced by another owner', async () => {
		const { server } = await setup(), { file, descriptor } = await connection(server); const replacement = JSON.stringify({ ...descriptor, bootId: 'new-owner-boot', token: 'b'.repeat(48) });
		await fs.writeFile(file, replacement, { mode: 0o600 }); await server.dispose(); expect(await fs.readFile(file, 'utf8')).toBe(replacement);
	});
	it('disposal drains an in-progress descriptor publication and does not leave a usable orphan', async () => {
		const { server, root } = await setup(), blocked = gate(), entered = gate(), link = fs.link.bind(fs);
		vi.spyOn(fs, 'link').mockImplementationOnce(async (source, target) => { entered.resolve(); await blocked.promise; return link(source, target); });
		const creating = server.create(scope()), rejected = expect(creating).rejects.toMatchObject({ code: 'workspace_closing' }); await entered.promise; const closing = server.dispose(); blocked.resolve(); await rejected; await closing;
		expect(await fs.readdir(root)).toEqual([]);
	});
	it('raw failures never serialize exception messages, local paths or cookie strings', async () => {
		const { server } = await setup(async () => { throw new Error('/home/private/cookies sid=secret'); }), { descriptor } = await connection(server); const response = await post(descriptor);
		expect(response.body).toEqual({ error: { code: 'operation_failed' } });
	});
});

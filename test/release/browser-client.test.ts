import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import type { BrowserRpcConnection } from '../../src/modules/browser/core/rpc';

// Run the actual release entry point in Node, outside Vitest's module transforms and browser globals.
// This fixture proves client transport/protocol behavior, not native Chromium behavior.
const client = path.resolve('browser-cli.cjs');
const roots: string[] = [];
const servers: Server[] = [];
const children = new Set<ChildProcess>();

afterEach(async () => {
	await Promise.all([...children].map((child) => new Promise<void>((resolve) => {
		if (child.exitCode !== null || child.signalCode !== null) { resolve(); return; }
		child.once('close', () => resolve());
		child.kill('SIGKILL');
	})));
	await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
		server.close((error) => error ? reject(error) : resolve());
	})));
	await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

interface RpcRequest {
	protocolVersion: number;
	bootId: string;
	requestId: string;
	method: string;
	params: Record<string, unknown>;
	deadlineAtMs: number;
}
interface CapturedRequest {
	method?: string;
	url?: string;
	authorization?: string;
	contentType?: string;
	receivedAt: number;
	body: RpcRequest;
}
interface Fixture {
	root: string;
	file: string;
	guard: string;
	connection: BrowserRpcConnection;
	requests: CapturedRequest[];
}
interface Response {
	status?: number;
	body: unknown;
}

async function fixture(respond: (request: RpcRequest, index: number) => Response): Promise<Fixture> {
	const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-browser-client-'));
	roots.push(root);
	const requests: CapturedRequest[] = [];
	const server = createServer((request, response) => {
		let body = '';
		request.setEncoding('utf8');
		request.on('data', (chunk: string) => { body += chunk; });
		request.on('end', () => {
			try {
				const parsed = JSON.parse(body) as RpcRequest;
				requests.push({
					method: request.method,
					url: request.url,
					authorization: request.headers.authorization,
					contentType: request.headers['content-type'],
					receivedAt: Date.now(),
					body: parsed,
				});
				const reply = respond(parsed, requests.length - 1);
				response.writeHead(reply.status ?? 200, { 'Content-Type': 'application/json' });
				response.end(JSON.stringify(reply.body));
			} catch {
				response.writeHead(500, { 'Content-Type': 'application/json' });
				response.end(JSON.stringify({ error: { code: 'fixture_failed' } }));
			}
		});
	});
	servers.push(server);
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('fixture_address_missing');
	const connection: BrowserRpcConnection = {
		protocolVersion: 2,
		bootId: `boot-${randomUUID()}`,
		endpoint: `http://127.0.0.1:${address.port}/rpc`,
		token: `SYNTHETIC_BEARER_${randomUUID()}`,
		spaceId: 'space-fixture',
		runId: 'run-fixture',
		capability: `SYNTHETIC_CAPABILITY_${randomUUID()}`,
	};
	const file = path.join(root, 'connection.json');
	const guard = path.join(root, 'node-only.cjs');
	await fs.writeFile(file, JSON.stringify(connection), { mode: 0o600 });
	await fs.writeFile(guard, "if (typeof window !== 'undefined') throw new Error('unexpected_window');\n", { mode: 0o600 });
	if (process.platform !== 'win32') expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
	return { root, file, guard, connection, requests };
}

function run(f: Fixture, args: string[], messages: unknown[] = []) {
	return new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => {
		const child = spawn(process.execPath, ['--require', f.guard, client, ...args, '--connection', f.file], {
			cwd: f.root,
			env: { ...process.env, NODE_OPTIONS: '' },
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		children.add(child);
		let stdout = '', stderr = '';
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			reject(new Error('client_timeout'));
		}, 10_000);
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
		child.once('error', (error) => { clearTimeout(timer); reject(error); });
		child.once('close', (code, signal) => {
			clearTimeout(timer);
			children.delete(child);
			resolve({ code, signal, stdout, stderr });
		});
		child.stdin.on('error', reject);
		child.stdin.end(messages.map((message) => JSON.stringify(message)).join('\n') + '\n');
	});
}

function expectEnvelope(f: Fixture, request: CapturedRequest) {
	expect(request.method).toBe('POST');
	expect(request.url).toBe('/rpc');
	expect(request.authorization).toBe(`Bearer ${f.connection.token}`);
	expect(request.contentType).toBe('application/json');
	expect(request.body.protocolVersion).toBe(2);
	expect(request.body.bootId).toBe(f.connection.bootId);
	expect(request.body.requestId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
	expect(request.body.deadlineAtMs).toBeGreaterThan(request.receivedAt);
	expect(request.body.deadlineAtMs).toBeLessThanOrEqual(request.receivedAt + 30_000);
}

interface McpReply {
	jsonrpc: string;
	id: number;
	result: {
		protocolVersion?: string;
		capabilities?: { tools: Record<string, never> };
		serverInfo?: { name: string; version: string };
		tools?: Array<{ name: string; inputSchema: { properties?: Record<string, unknown>; required?: string[] } }>;
		content?: Array<{ type: string; text: string }>;
		isError?: boolean;
	};
}
const parseReplies = (stdout: string) => stdout.trim().split('\n').map((line) => JSON.parse(line) as McpReply);
const toolCall = (id: number, name: string, args: Record<string, unknown> = {}) => ({
	jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args },
});

test('release CLI calls page.list in a real Node process without Window and injects its private connection scope', async () => {
	const pages = [{ id: 'page-fixture', title: 'Local fixture', url: 'https://example.invalid/' }];
	const f = await fixture(() => ({ body: { result: pages } }));
	const output = await run(f, ['call', 'page.list', '{}']);
	expect(output.code).toBe(0);
	expect(output.signal).toBeNull();
	expect(output.stderr).toBe('');
	expect(JSON.parse(output.stdout)).toEqual(pages);
	expect(f.requests).toHaveLength(1);
	expectEnvelope(f, f.requests[0]!);
	expect(f.requests[0]!.body).toMatchObject({
		method: 'page.list', params: { runId: f.connection.runId, capability: f.connection.capability },
	});
}, 15_000);

test('release MCP initializes, exposes credential-free schemas and privately retains newly granted Run capabilities', async () => {
	const nextCapability = `SYNTHETIC_NEXT_CAPABILITY_${randomUUID()}`;
	const f = await fixture((request) => ({ body: {
		result: request.method === 'run.start'
			? { run: { id: 'run-next' }, capability: nextCapability }
			: [{ id: `page-${String(request.params.runId)}` }],
	} }));
	const output = await run(f, ['mcp'], [
		{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } } },
		{ jsonrpc: '2.0', method: 'notifications/initialized' },
		{ jsonrpc: '2.0', id: 2, method: 'tools/list' },
		toolCall(3, 'browser_page_list'),
		toolCall(4, 'browser_run_start', { spaceId: 'space-next' }),
		toolCall(5, 'browser_page_list', { runId: 'run-next' }),
		toolCall(6, 'browser_page_list', { runId: 'run-ungranted' }),
	]);
	expect(output.code).toBe(0);
	expect(output.stderr).toBe('');
	const replies = parseReplies(output.stdout);
	expect(replies.map((reply) => reply.id)).toEqual([1, 2, 3, 4, 5, 6]);
	expect(replies.every((reply) => reply.jsonrpc === '2.0')).toBe(true);
	expect(replies[0]!.result).toEqual({
		protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'huhu-browser', version: '2' },
	});
	const tools = replies[1]!.result.tools!;
	expect(tools.some((tool) => tool.name === 'browser_page_list')).toBe(true);
	for (const tool of tools) {
		expect(tool.inputSchema.properties).not.toHaveProperty('capability');
		expect(tool.inputSchema.required ?? []).not.toContain('capability');
		expect(tool.inputSchema.required ?? []).not.toContain('runId');
	}
	expect(JSON.parse(replies[2]!.result.content![0]!.text)).toEqual([{ id: 'page-run-fixture' }]);
	expect(JSON.parse(replies[3]!.result.content![0]!.text)).toEqual({ run: { id: 'run-next' } });
	expect(JSON.parse(replies[4]!.result.content![0]!.text)).toEqual([{ id: 'page-run-next' }]);
	expect(replies[5]!.result).toEqual({ isError: true, content: [{ type: 'text', text: 'capability_scope_mismatch' }] });
	for (const secret of [f.connection.token, f.connection.capability, nextCapability]) expect(output.stdout).not.toContain(secret);
	expect(f.requests).toHaveLength(3);
	for (const request of f.requests) expectEnvelope(f, request);
	expect(new Set(f.requests.map((request) => request.body.requestId)).size).toBe(3);
	expect(f.requests.map((request) => [request.body.method, request.body.params])).toEqual([
		['page.list', { runId: 'run-fixture', capability: f.connection.capability }],
		['run.start', { spaceId: 'space-next' }],
		['page.list', { runId: 'run-next', capability: nextCapability }],
	]);
}, 15_000);

test('release CLI preserves a stable failure code but never prints echoed bearer tokens, capabilities or raw errors', async () => {
	const f = await fixture((_request, index) => ({ status: 403, body: {
		error: { code: index === 0 ? 'run_revoked' : `backend rejected ${f.connection.token} ${f.connection.capability}`, message: 'private backend details' },
	} }));
	const revoked = await run(f, ['call', 'page.list', '{}']);
	expect(revoked).toMatchObject({ code: 1, signal: null, stdout: '', stderr: 'run_revoked\n' });
	const unsafe = await run(f, ['call', 'page.list', '{}']);
	expect(unsafe).toMatchObject({ code: 1, signal: null, stdout: '', stderr: 'request_failed\n' });
	for (const secret of [f.connection.token, f.connection.capability, 'private backend details'])
		expect(unsafe.stdout + unsafe.stderr).not.toContain(secret);
	expect(f.requests).toHaveLength(2);
}, 15_000);

test('release MCP emits bounded tool errors without leaking echoed connection credentials to the model or stderr', async () => {
	const f = await fixture((_request, index) => ({ status: 403, body: {
		error: { code: index === 0 ? 'run_revoked' : `backend rejected ${f.connection.token} ${f.connection.capability}`, message: 'private backend details' },
	} }));
	const output = await run(f, ['mcp'], [toolCall(1, 'browser_page_list'), toolCall(2, 'browser_page_list')]);
	expect(output.code).toBe(0);
	expect(output.stderr).toBe('');
	expect(parseReplies(output.stdout)).toEqual([
		{ jsonrpc: '2.0', id: 1, result: { isError: true, content: [{ type: 'text', text: 'run_revoked' }] } },
		{ jsonrpc: '2.0', id: 2, result: { isError: true, content: [{ type: 'text', text: 'request_failed' }] } },
	]);
	for (const secret of [f.connection.token, f.connection.capability, 'private backend details'])
		expect(output.stdout + output.stderr).not.toContain(secret);
	expect(f.requests).toHaveLength(2);
}, 15_000);

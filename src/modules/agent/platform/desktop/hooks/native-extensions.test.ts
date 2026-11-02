import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { PI_EXTENSION, OPENCODE_EXTENSION } from './native-extensions';
import { hookSpool, type SpoolEvent } from './hook-spool';
import { hookActivityConsumer } from './automation-hooks';
import { TerminalSession } from '../../../services/terminal/session';

async function spool(run: (directory: string) => Promise<void>) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hooks-test-'));
	const saved = {
		dir: process.env.HUHU_HOOK_DIR,
		token: process.env.HUHU_HOOK_TOKEN,
		owner: process.env.HUHU_NATIVE_OWNER,
		account: process.env.HUHU_ACCOUNT_ROOT,
		root: process.env.HUHU_HOOK_ROOT,
	};
	const root = path.join(directory, 'resource-v1'),
		dir = path.join(root, 'scopes', '0');
	for (const name of ['collectors', 'small', 'large']) await fs.mkdir(path.join(root, name), { recursive: true });
	for (const name of ['small', 'large']) await fs.mkdir(path.join(dir, name), { recursive: true });
	await fs.writeFile(path.join(dir, 'active.json'), JSON.stringify({ token: 'test' }));
	process.env.HUHU_HOOK_ROOT = root;
	process.env.HUHU_HOOK_DIR = dir;
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		for (const text of [PI_EXTENSION, OPENCODE_EXTENSION])
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(text).digest('hex') + '.mjs',
				),
				text,
				{ flag: 'w' },
			);
	process.env.HUHU_ACCOUNT_ROOT = directory;
	process.env.HUHU_HOOK_TOKEN = 'test';
	delete process.env.HUHU_NATIVE_OWNER;
	try {
		await run(directory);
	} finally {
		for (const [key, value] of Object.entries({
			HUHU_HOOK_DIR: saved.dir,
			HUHU_HOOK_TOKEN: saved.token,
			HUHU_NATIVE_OWNER: saved.owner,
			HUHU_ACCOUNT_ROOT: saved.account,
			HUHU_HOOK_ROOT: saved.root,
		}))
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		await fs.rm(directory, { recursive: true, force: true });
	}
}
async function rows(directory: string) {
	const result: Array<{
		event: string;
		data: Record<string, unknown>;
		source: { provider: string; instance: string; sequence: number; event: string; blockId?: string };
	}> = [];
	for (const kind of ['small', 'large'])
		for (const slot of await fs.readdir(path.join(directory, 'resource-v1', kind))) {
			const dir = path.join(directory, 'resource-v1', kind, slot);
			for (const file of await fs.readdir(dir))
				if (file.endsWith('.ready')) result.push(JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')));
		}
	return result.sort((a, b) => a.source.sequence - b.source.sequence);
}
async function events(directory: string): Promise<string[]> {
	return (await rows(directory)).map((row) => row.event);
}

test('Pi reports the full answer only at native final settlement, and suppresses repeated settlement', async () =>
	spool(async (directory) => {
		const handlers = new Map<string, (event: Record<string, unknown>, ctx: unknown) => void>();
		const module = await import(`data:text/javascript,${encodeURIComponent(PI_EXTENSION)}#${Date.now()}`);
		module.default({
			on: (key: string, fn: (event: Record<string, unknown>, ctx: unknown) => void) => handlers.set(key, fn),
		});
		const ctx = {
			cwd: directory,
			isIdle: () => true,
			sessionManager: { getSessionId: () => 'root', getSessionFile: () => 'root.jsonl' },
		};
		const answer = '完整原生答案'.repeat(3000);
		handlers.get('agent_start')!({}, ctx);
		handlers.get('agent_end')!(
			{
				messages: [
					{
						role: 'assistant',
						content: [
							{ type: 'thinking', text: 'omit' },
							{ type: 'text', text: answer },
						],
					},
				],
			},
			ctx,
		);
		await new Promise((r) => setTimeout(r, 25));
		assert.equal((await events(directory)).filter((e) => e === 'Stop').length, 0);
		handlers.get('agent_settled')!({}, ctx);
		handlers.get('agent_settled')!({}, ctx);
		assert.equal((await events(directory)).filter((e) => e === 'Stop').length, 1);
		for (const event of await rows(directory))
			if (event.event === 'Stop') assert.equal(event.data.last_assistant_message, answer);
		handlers.get('session_shutdown')!({}, ctx);
	}));

test('OpenCode ignores child idle and recoverable errors but accepts root busy/idle', async () =>
	spool(async (directory) => {
		const module = await import(`data:text/javascript,${encodeURIComponent(OPENCODE_EXTENSION)}#${Date.now()}`);
		const plugin = await module.HuhuStatus({
			client: {
				session: {
					get: async ({ path: { id } }: { path: { id: string } }) => ({
						data: { directory, parentID: id === 'child' ? 'root' : undefined },
					}),
					messages: async () => ({
						data: [
							{ info: { id: 'user', role: 'user' }, parts: [] },
							{
								info: { role: 'assistant', parentID: 'user', time: { completed: 1 } },
								parts: [
									{ type: 'text', text: 'final' },
									{ type: 'reasoning', text: 'omit' },
								],
							},
						],
					}),
				},
			},
		});
		await plugin.event({
			event: { type: 'session.status', properties: { sessionID: 'root', status: { type: 'busy' } } },
		});
		await plugin.event({ event: { type: 'session.error', properties: { sessionID: 'root' } } });
		await plugin.event({
			event: { type: 'session.status', properties: { sessionID: 'child', status: { type: 'idle' } } },
		});
		assert.deepEqual(
			(await events(directory)).filter((event) => !event.startsWith('Adapter')),
			['UserPromptSubmit'],
		);
		assert.equal((await events(directory)).includes('AdapterError'), true);
		await plugin.event({
			event: { type: 'session.status', properties: { sessionID: 'root', status: { type: 'idle' } } },
		});
		assert.equal((await events(directory)).filter((e) => e === 'Stop').length, 1);
	}));

test('Pi reserves a collector before it extracts or copies the complete native answer', async () =>
	spool(async (directory) => {
		const handlers = new Map<string, (event: Record<string, unknown>, context: unknown) => void>();
		const module = await import(`data:text/javascript,${encodeURIComponent(PI_EXTENSION)}#collector-${Date.now()}`);
		module.default({
			on: (name: string, fn: (event: Record<string, unknown>, context: unknown) => void) =>
				handlers.set(name, fn),
		});
		const context = { cwd: directory, sessionManager: { getSessionId: () => 'root' } };
		let reads = 0;
		const part = {
			type: 'text',
			get text() {
				reads++;
				return '完整答案';
			},
		};
		handlers.get('agent_start')!({}, context);
		handlers.get('agent_end')!({ messages: [{ role: 'assistant', content: [part] }] }, context);
		assert.equal(
			reads,
			0,
			'agent_end keeps only the borrowed provider message; it must not allocate an answer outside a collector',
		);
		handlers.get('agent_settled')!({}, context);
		assert.ok(reads > 0);
		assert.equal(
			(await rows(directory)).find((row) => row.event === 'Stop')!.data.last_assistant_message,
			'完整答案',
		);
	}));

async function managedOpenCode(
	run: (fixture: {
		session: TerminalSession;
		consumer: ReturnType<typeof hookActivityConsumer>;
		rows: SpoolEvent[];
		requests: string[];
		status(id: string, state: 'busy' | 'idle'): Promise<void>;
		waitForRows(count: number): Promise<void>;
	}) => Promise<void>,
) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-opencode-roots-'));
	const saved = new Map(
		['HUHU_HOOK_ROOT', 'HUHU_HOOK_DIR', 'HUHU_HOOK_TOKEN', 'HUHU_NATIVE_OWNER'].map((key) => [
			key,
			process.env[key],
		]),
	);
	const session = new TerminalSession({
		id: 'opencode-runtime',
		sid: 7,
		kind: 'shell',
		title: 'Shell',
		cwd: directory,
		cols: 80,
		rows: 24,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const consumer = hookActivityConsumer(session.bindActivityRuntime());
	const rows: SpoolEvent[] = [],
		requests: string[] = [],
		errors: unknown[] = [];
	let slot: Awaited<ReturnType<Awaited<ReturnType<typeof hookSpool>>['prepare']>> | undefined;
	try {
		const pool = await hookSpool(
			{ require: createRequire(import.meta.url) } as Window,
			path.join(directory, 'resource-v1'),
		);
		slot = await pool.prepare(
			(row) => {
				rows.push(row);
				consumer.receive(row);
			},
			(reason) => errors.push(reason),
		);
		Object.assign(process.env, slot.env);
		delete process.env.HUHU_NATIVE_OWNER;
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(OPENCODE_EXTENSION).digest('hex') + '.mjs',
				),
				OPENCODE_EXTENSION,
			);
		const module = await import(
			`data:text/javascript,${encodeURIComponent(OPENCODE_EXTENSION)}#managed-${directory}`
		);
		const plugin = await module.HuhuStatus({
			client: {
				session: {
					get: async ({ path: { id } }: { path: { id: string } }) => {
						requests.push('get:' + id);
						return { data: { directory, ...(id === 'child-C' ? { parentID: 'root-A' } : {}) } };
					},
					messages: async ({ path: { id } }: { path: { id: string } }) => {
						requests.push('messages:' + id);
						return {
							data: [
								{ info: { id: 'user-' + id, role: 'user' } },
								{
									info: { role: 'assistant', parentID: 'user-' + id, time: { completed: 1 } },
									parts: [{ type: 'text', text: '完整答案:' + id }],
								},
							],
						};
					},
				},
			},
		});
		await run({
			session,
			consumer,
			rows,
			requests,
			status: (id, state) =>
				plugin.event({
					event: { type: 'session.status', properties: { sessionID: id, status: { type: state } } },
				}),
			waitForRows: async (count) => {
				const deadline = Date.now() + 2000;
				while (rows.length < count && Date.now() < deadline)
					await new Promise((resolve) => setTimeout(resolve, 10));
				assert.equal(rows.length, count, 'the physical reader must consume each expected publication');
			},
		});
	} catch (error) {
		errors.push(error);
	} finally {
		for (const close of [() => consumer.close(), () => session.dispose(), () => slot?.close()])
			try {
				await close();
			} catch (error) {
				errors.push(error);
			}
		for (const [key, value] of saved)
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		try {
			await fs.rm(directory, { recursive: true, force: true });
		} catch (error) {
			errors.push(error);
		}
	}
	if (errors.length === 1) throw errors[0];
	if (errors.length) throw new AggregateError(errors, 'OpenCode body and physical cleanup failures');
}

test(
	'OpenCode physical publications fence competing roots without losing the original complete answers',
	async () =>
		managedOpenCode(async ({ session, consumer, rows, requests, status, waitForRows }) => {
			await status('root-A', 'busy');
			await status('child-C', 'idle');
			await status('root-B', 'idle');
			await waitForRows(3);
			assert.deepEqual(requests, ['get:root-A', 'get:child-C', 'get:root-B', 'messages:root-B']);
			assert.deepEqual(
				rows.map((row) => row.source!.sequence),
				[1, 2, 3],
			);
			assert.equal(rows[2]!.data.last_assistant_message, '完整答案:root-B');
			assert.equal(session.getActivitySnapshot().source.reason, 'source-mismatch');
			assert.equal(session.getActivitySnapshot().state, 'unknown');
			assert.equal(session.getActivitySnapshot().completion, undefined);
			assert.equal(session.nativeSessionId, 'root-A');
			await status('root-A', 'idle');
			await waitForRows(4);
			assert.equal(session.getActivitySnapshot().source.reason, 'source-mismatch');
			assert.equal(session.getActivitySnapshot().completion, undefined);
			assert.equal(session.nativeSessionId, 'root-A');
			consumer.close();
			const closed = session.getActivitySnapshot();
			await status('root-B', 'idle');
			await waitForRows(5);
			assert.equal(session.getActivitySnapshot(), closed);
			assert.deepEqual(
				rows.filter((row) => row.event === 'Stop').map((row) => row.data.last_assistant_message),
				['完整答案:root-B', '完整答案:root-A', '完整答案:root-B'],
			);
			assert.equal(new Set(rows.map((row) => row.delivery)).size, rows.length);
		}),
	10000,
);

test(
	'OpenCode physical single-root completion stays valid and closed activity never reopens on a late answer',
	async () =>
		managedOpenCode(async ({ session, consumer, rows, status, waitForRows }) => {
			await status('root-A', 'busy');
			await status('root-A', 'idle');
			await waitForRows(3);
			assert.equal(session.getActivitySnapshot().state, 'done');
			assert.equal(session.getActivitySnapshot().source.health, 'current');
			assert.ok(session.getActivitySnapshot().completion);
			assert.equal(session.nativeSessionId, 'root-A');
			assert.equal(rows[2]!.data.last_assistant_message, '完整答案:root-A');
			consumer.close();
			const closed = session.getActivitySnapshot();
			await status('root-A', 'idle');
			await waitForRows(4);
			assert.equal(session.getActivitySnapshot(), closed);
			assert.equal(rows.filter((row) => row.event === 'Stop').length, 2);
			assert.equal(new Set(rows.map((row) => row.delivery)).size, rows.length);
		}),
	10000,
);

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test } from 'vitest';
import { hookSpool, HOOK_PUBLISHER_SCRIPT } from './hook-spool';
import { HOOK_SCRIPT } from './automation-hooks';

const require = createRequire(import.meta.url);
function windowFor(files = fs): Window {
	return { require: (name: string) => (name === 'node:fs/promises' ? files : require(name)) } as unknown as Window;
}
async function publish(
	script: string,
	env: Record<string, string>,
	data: unknown = {},
	event = 'SessionStart',
): Promise<void> {
	const child = spawn(process.execPath, [script, event], { env: { ...process.env, ...env }, windowsHide: true });
	const exited = new Promise<void>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`hook exit ${code}`))));
	});
	child.stdin.end(JSON.stringify(data));
	await exited;
}
async function wait(check: () => boolean, ms = 1200): Promise<void> {
	const deadline = Date.now() + ms;
	while (!check()) {
		if (Date.now() >= deadline) throw new Error('fixture timeout');
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

test('a reference the publisher is still writing is retried, not reported as a read failure', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-partial-'));
	const empty = path.join(directory, 'empty');
	await fs.writeFile(empty, '');
	let partial = true;
	// The publisher creates ref.json with flag 'wx' and only then writes it; a reader can
	// open it in between and see no bytes (a window that is wide on Windows).
	const files = {
		...fs,
		open: async (file: Parameters<typeof fs.open>[0], ...rest: unknown[]) => {
			if (partial && /[\\/]ref\.json$/.test(String(file))) {
				partial = false;
				return (fs.open as (...a: unknown[]) => ReturnType<typeof fs.open>)(empty, ...rest);
			}
			return (fs.open as (...a: unknown[]) => ReturnType<typeof fs.open>)(file, ...rest);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const errors: string[] = [];
	let received = 0;
	const scope = await pool.prepare(
		() => received++,
		(reason) => errors.push(reason),
	);
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		await publish(script, scope.env);
		await wait(() => received === 1, 3000);
		assert.equal(partial, false, 'the incomplete reference was observed');
		assert.deepEqual(errors, []);
		await scope.close();
		assert.deepEqual(errors, []);
	} finally {
		await scope.close().catch(() => {});
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a consumed publication is not replayed and its slot recovers after reference unlink failure', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-tombstone-'));
	let fail = true;
	const files = {
		...fs,
		unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
			if (fail && String(file).endsWith('/ref.json')) {
				fail = false;
				throw Object.assign(new Error('injected unlink failure'), { code: 'EACCES' });
			}
			return fs.unlink(file);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	let received = 0;
	const scope = await pool.prepare(
		() => received++,
		() => {},
	);
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		await publish(script, scope.env);
		await wait(() => received === 1);
		await scope.close();
		assert.equal(received, 1);
		assert.deepEqual(await fs.readdir(path.join(pool.root, 'small')), [], 'body and claim are really gone');
		const next = await pool.prepare(
			() => {},
			() => {},
		);
		await next.close();
	} finally {
		await scope.close().catch(() => {});
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a waiting publisher reserves its ingress but collects stdin only after a global collector returns', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-collector-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const received: string[] = [],
		scopes = [];
	let primary: unknown;
	const children: Array<ReturnType<typeof spawn>> = [],
		exits: Array<Promise<void>> = [];
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		for (let i = 0; i < 5; i++)
			scopes.push(
				await pool.prepare(
					(event) => {
						received.push(event.data.session_id as string);
					},
					() => {},
				),
			);
		for (let i = 0; i < 4; i++) {
			const child = spawn(process.execPath, [script, 'SessionStart'], {
				env: { ...process.env, ...scopes[i]!.env },
			});
			children.push(child);
			exits.push(
				new Promise<void>((resolve, reject) => {
					child.once('error', reject);
					child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`hook exit ${code}`))));
				}),
			);
		}
		const deadline = Date.now() + 1500;
		while ((await fs.readdir(path.join(pool.root, 'collectors'))).length !== 4) {
			if (Date.now() > deadline) throw new Error('collectors did not start');
			await new Promise((r) => setTimeout(r, 5));
		}
		const fifth = spawn(process.execPath, [script, 'SessionStart'], { env: { ...process.env, ...scopes[4]!.env } });
		children.push(fifth);
		const fifthExit = new Promise<void>((resolve, reject) => {
			fifth.once('error', reject);
			fifth.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`hook exit ${code}`))));
		});
		exits.push(fifthExit);
		fifth.stdin!.end(JSON.stringify({ session_id: 'fifth' }));
		await new Promise((r) => setTimeout(r, 40));
		children[0]!.stdin!.end(JSON.stringify({ session_id: 'first' }));
		await Promise.all([exits[0], fifthExit]);
		const observedBy = Date.now() + 1200;
		while ((!received.includes('first') || !received.includes('fifth')) && Date.now() < observedBy)
			await new Promise((r) => setTimeout(r, 5));
		assert.equal(received.includes('first'), true);
		assert.equal(
			received.includes('fifth'),
			true,
			'a collector returning before the original deadline admits the waiting publication',
		);
	} catch (error) {
		primary = error;
	} finally {
		for (const child of children) if (!child.stdin!.writableEnded) child.stdin!.end('{}');
		await Promise.allSettled(exits);
		const cleaned = await Promise.allSettled(scopes.map((scope) => scope.close()));
		await fs.rm(directory, { recursive: true, force: true });
		const failures = cleaned.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
		if (primary || failures.length)
			throw new AggregateError(
				[...(primary ? [primary] : []), ...failures],
				'publisher body and cleanup failures',
			);
	}
});

test('closing a scope revokes a ready external publisher before asynchronous cleanup can proceed', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-late-publish-'));
	let resume!: () => void;
	const gate = new Promise<void>((resolve) => {
		resume = resolve;
	});
	const files = {
		...fs,
		unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
			if (String(file).endsWith('active.json')) await gate;
			return fs.unlink(file);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const scope = await pool.prepare(
		() => assert.fail('closed scope must never deliver'),
		() => {},
	);
	const source = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const dir=process.env.HUHU_HOOK_DIR,token=process.env.HUHU_HOOK_TOKEN;${HOOK_PUBLISHER_SCRIPT}\nprocess.on('message',()=>{process.send({accepted:post('SessionStart',{})},()=>process.disconnect());});process.send('ready');`;
	const script = path.join(directory, 'late.cjs');
	await fs.writeFile(script, source);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, createHash('sha256').update(source).digest('hex') + '.cjs'),
			source,
		);
	const child = spawn(process.execPath, [script], {
		env: { ...process.env, ...scope.env },
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	const exit = new Promise<void>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`publisher exit ${code}`))));
	});
	let closing: Promise<void> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('publisher ready timeout')), 1200);
			child.on('message', (message) => {
				if (message === 'ready') {
					clearTimeout(timer);
					resolve();
				}
			});
		});
		const result = new Promise<{ accepted: boolean }>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('publisher result timeout')), 1200);
			child.on('message', (message) => {
				if (typeof message === 'object' && message && 'accepted' in message) {
					clearTimeout(timer);
					resolve(message as { accepted: boolean });
				}
			});
		});
		closing = scope.close();
		child.send('publish');
		assert.equal(
			(await result).accepted,
			false,
			'publisher must observe revocation, not only the host callback flag',
		);
	} finally {
		resume();
		await exit;
		await (closing ?? scope.close());
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a second process reader claim prevents another physical reader and is never stolen by age or PID', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-reader-owner-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const source = `const fs=require('node:fs'),path=require('node:path');const dir=process.argv[2];fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'claim.json'),JSON.stringify({nonce:'fixture-owner'}));process.on('message',()=>{fs.unlinkSync(path.join(dir,'claim.json'));fs.rmdirSync(dir);process.disconnect();});process.send('ready');`;
	const script = path.join(directory, 'reader.cjs');
	await fs.writeFile(script, source);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, createHash('sha256').update(source).digest('hex') + '.cjs'),
			source,
		);
	const child = spawn(process.execPath, [script, path.join(pool.root, 'reader')], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	const exit = new Promise<void>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (value) => (value === 0 ? resolve() : reject(new Error(`reader fixture exit ${value}`))));
	});
	let unexpected: Awaited<ReturnType<typeof pool.prepare>> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('reader fixture ready timeout')), 1200);
			child.on('message', (value) => {
				if (value === 'ready') {
					clearTimeout(timer);
					resolve();
				}
			});
		});
		const pending = pool
			.prepare(
				() => {},
				() => {},
			)
			.then((value) => {
				unexpected = value;
				return value;
			});
		await assert.rejects(pending, /hookReaderBusy/);
		assert.equal(
			JSON.parse(await fs.readFile(path.join(pool.root, 'reader', 'claim.json'), 'utf8')).nonce,
			'fixture-owner',
		);
	} finally {
		if (unexpected) await unexpected.close();
		child.send('close');
		await exit;
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('32 scopes accept three ordered short events each through the shared bounded collector and fair reader', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-burst-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const scopes = [],
		received = new Set<string>(),
		errors: string[] = [];
	let peakCollectors = 0,
		peakScopes = 0,
		sampling = false;
	const timer = setInterval(() => {
		if (sampling) return;
		sampling = true;
		void Promise.all([fs.readdir(path.join(pool.root, 'collectors')), fs.readdir(path.join(pool.root, 'scopes'))])
			.then(
				([collectors, scope]) => {
					peakCollectors = Math.max(peakCollectors, collectors.length);
					peakScopes = Math.max(peakScopes, scope.length);
				},
				(error) => {
					errors.push(String(error));
				},
			)
			.finally(() => {
				sampling = false;
			});
	}, 5);
	try {
		for (let i = 0; i < 32; i++)
			scopes.push(
				await pool.prepare(
					(row) => {
						const id = String(row.data.session_id);
						assert.equal(received.has(id), false);
						received.add(id);
					},
					(reason) => errors.push(reason),
				),
			);
		await assert.rejects(
			pool.prepare(
				() => {},
				() => {},
			),
			/hookCapacity/,
		);
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		// Across scopes concurrent; within each scope the three actual publishers finish in order.
		await Promise.all(
			scopes.map(async (scope, id) => {
				for (let event = 0; event < 3; event++)
					await publish(script, scope.env, { session_id: `${id}:${event}` });
			}),
		);
		const drained = Date.now();
		// Failure-only evidence; the 1.8 s bound itself is unchanged.
		await wait(() => received.size === 96, 1800).catch(async (error: Error) => {
			const missing: string[] = [];
			for (let id = 0; id < 32; id++)
				for (let event = 0; event < 3; event++)
					if (!received.has(`${id}:${event}`)) missing.push(`${id}:${event}`);
			const left: string[] = [];
			try {
				for (const scope of await fs.readdir(path.join(pool.root, 'scopes'))) {
					const fault = await fs
						.readFile(path.join(pool.root, 'scopes', scope, 'fault.json'), 'utf8')
						.catch(() => '');
					if (fault) left.push(`${scope}/fault.json:${fault.slice(0, 200)}`);
					for (const kind of ['small', 'large'])
						for (const slot of await fs
							.readdir(path.join(pool.root, 'scopes', scope, kind))
							.catch(() => []))
							left.push(
								`${scope}/${kind}/${slot}:${(await fs.readdir(path.join(pool.root, 'scopes', scope, kind, slot)).catch((cause: Error) => [String(cause)])).join('+')}`,
							);
				}
				for (const kind of ['small', 'large'])
					for (const slot of await fs.readdir(path.join(pool.root, kind)).catch(() => []))
						left.push(
							`${kind}/${slot}:${(await fs.readdir(path.join(pool.root, kind, slot)).catch((cause: Error) => [String(cause)])).join('+')}`,
						);
			} catch (cause) {
				left.push(String(cause));
			}
			throw new Error(
				`${error.message}: received ${received.size}/96 ${Date.now() - drained} ms after the last publisher; missing ${missing.join(',')}; errors ${JSON.stringify(errors)}; left ${JSON.stringify(left.slice(0, 40))}`,
			);
		});
		assert.deepEqual(errors, []);
		assert.equal(peakScopes, 32);
		assert.ok(peakCollectors > 0 && peakCollectors <= 4);
		const sample = {
			scopes: peakScopes,
			collectors: peakCollectors,
			received: received.size,
			scheduled: '32 scopes concurrent; each 3 sequential; one reader',
			payloadLimit: 75759616,
			collectorInputLimit: 67108864,
			rssMeasured: false,
		};
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, 'resource-sample.json'),
				JSON.stringify(sample, null, 2) + '\n',
			);
		console.info('hook-resource-sample', JSON.stringify(sample));
	} finally {
		clearInterval(timer);
		while (sampling) await new Promise((r) => setTimeout(r, 5));
		await Promise.all(scopes.map((scope) => scope.close()));
		await fs.rm(directory, { recursive: true, force: true });
	}
}, 15000);

test('an opened small publication is read only through E plus one even when its size changes', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-e-plus-one-'));
	let maximum = 0,
		actual = 0;
	const files = {
		...fs,
		open: async (...args: Parameters<typeof fs.open>) => {
			const handle = await fs.open(...args);
			if (!String(args[0]).endsWith('.consuming')) return handle;
			return new Proxy(handle, {
				get: (target, key) =>
					key === 'read'
						? async (buffer: Buffer, offset: number, length: number, position: number | null) => {
								maximum = Math.max(maximum, buffer.byteLength);
								const result = await target.read(buffer, offset, length, position);
								actual += result.bytesRead;
								return result;
							}
						: typeof Reflect.get(target, key) === 'function'
							? Reflect.get(target, key).bind(target)
							: Reflect.get(target, key),
			});
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const errors: string[] = [];
	let received = 0;
	const scope = await pool.prepare(
		() => received++,
		(reason) => errors.push(reason),
	);
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		await publish(script, scope.env);
		const global = path.join(pool.root, 'small', '0'),
			ready = (await fs.readdir(global)).find((file) => file.endsWith('.ready'))!;
		await fs.appendFile(path.join(global, ready), 'x'.repeat(65537));
		await wait(() => errors.includes('hookEventInvalid'));
		assert.equal(received, 0);
		assert.equal(maximum, 65537);
		assert.equal(actual, 65537);
	} finally {
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('in-flight reader and closing scopes retain the shared reader claim across a new preparation', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-reader-lifetime-'));
	let entered!: () => void, resume!: () => void;
	const barrier = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		gate = new Promise<void>((resolve) => {
			resume = resolve;
		});
	let blocked = false;
	const files = {
		...fs,
		open: async (...args: Parameters<typeof fs.open>) => {
			const handle = await fs.open(...args);
			if (!String(args[0]).endsWith('.consuming')) return handle;
			return new Proxy(handle, {
				get: (target, key) =>
					key === 'read'
						? async (buffer: Buffer, offset: number, length: number, position: number | null) => {
								if (!blocked) {
									blocked = true;
									entered();
									await gate;
								}
								return target.read(buffer, offset, length, position);
							}
						: typeof Reflect.get(target, key) === 'function'
							? Reflect.get(target, key).bind(target)
							: Reflect.get(target, key),
			});
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	let callbacks = 0;
	const scope = await pool.prepare(
		() => callbacks++,
		() => {},
	);
	let other: Awaited<ReturnType<typeof pool.prepare>> | undefined, closing: Promise<void> | undefined;
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		await publish(script, scope.env);
		await Promise.race([
			barrier,
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('reader barrier timeout')), 1500)),
		]);
		const owner = await fs.readFile(path.join(pool.root, 'reader', 'claim.json'), 'utf8');
		closing = scope.close();
		other = await pool.prepare(
			() => {},
			() => {},
		);
		assert.notEqual(other.env.HUHU_HOOK_DIR, scope.env.HUHU_HOOK_DIR);
		assert.equal(await fs.readFile(path.join(pool.root, 'reader', 'claim.json'), 'utf8'), owner);
		resume();
		await Promise.all([closing, other.close()]);
		assert.equal(callbacks, 0);
		const next = await pool.prepare(
			() => {},
			() => {},
		);
		try {
			const nextOwner = await fs.readFile(path.join(pool.root, 'reader', 'claim.json'), 'utf8');
			assert.notEqual(nextOwner, owner);
			await scope.close();
			assert.equal(await fs.readFile(path.join(pool.root, 'reader', 'claim.json'), 'utf8'), nextOwner);
		} finally {
			await next.close();
		}
	} finally {
		resume();
		await Promise.all([closing ?? scope.close(), ...(other ? [other.close()] : [])]);
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('closing scope quota is retained until the physical reader claim has really been removed', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-final-reader-'));
	let entered!: () => void,
		resume!: () => void,
		first = true;
	const barrier = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		gate = new Promise<void>((resolve) => {
			resume = resolve;
		});
	const files = {
		...fs,
		unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
			if (first && /[\\/]reader[\\/]claim.json$/.test(String(file))) {
				first = false;
				entered();
				await gate;
			}
			return fs.unlink(file);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const old = await pool.prepare(
			() => {},
			() => {},
		),
		closing = old.close();
	let rejected = 0;
	const pending: Array<Promise<Awaited<ReturnType<typeof pool.prepare>> | undefined>> = [];
	try {
		await Promise.race([
			barrier,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('reader removal barrier timeout')), 1200),
			),
		]);
		for (let i = 0; i < 32; i++)
			pending.push(
				pool
					.prepare(
						() => {},
						() => {},
					)
					.catch((error) => {
						assert.match(String(error), /hookCapacity/);
						rejected++;
						return undefined;
					}),
			);
		await new Promise((resolve) => setTimeout(resolve, 0));
		assert.equal(rejected, 1, 'one old closing scope and 31 preparing scopes exhaust the same 32-scope budget');
	} finally {
		resume();
		await closing;
		const admitted = await Promise.all(pending);
		await Promise.all(admitted.flatMap((scope) => (scope ? [scope.close()] : [])));
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('two real publishers cannot both claim the last global small or large publication slot', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-last-slot-')),
		root = path.join(directory, 'resource-v1');
	try {
		for (const kind of ['small', 'large', 'collectors']) await fs.mkdir(path.join(root, kind), { recursive: true });
		const environments: Record<string, string>[] = [];
		for (let id = 0; id < 2; id++) {
			const dir = path.join(root, 'scopes', String(id)),
				token = crypto.randomUUID();
			for (const kind of ['small', 'large']) await fs.mkdir(path.join(dir, kind), { recursive: true });
			await fs.writeFile(path.join(dir, 'active.json'), JSON.stringify({ token }));
			environments.push({ HUHU_HOOK_ROOT: root, HUHU_HOOK_DIR: dir, HUHU_HOOK_TOKEN: token });
		}
		// Incomplete/crashed claims still consume their fixed physical slots.
		for (let i = 0; i < 127; i++) await fs.mkdir(path.join(root, 'small', String(i)));
		for (let i = 0; i < 3; i++) await fs.mkdir(path.join(root, 'large', String(i)));
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		await Promise.all(environments.map((env) => publish(script, env)));
		await Promise.all(
			environments.map((env) => publish(script, env, { last_assistant_message: 'x'.repeat(70000) }, 'Stop')),
		);
		assert.equal((await fs.readdir(path.join(root, 'small'))).length, 128);
		assert.equal((await fs.readdir(path.join(root, 'large'))).length, 4);
		for (const [kind, last] of [
			['small', '127'],
			['large', '3'],
		] as const) {
			const ready = (await fs.readdir(path.join(root, kind, last))).filter((file) => file.endsWith('.ready'));
			assert.equal(ready.length, 1);
			const references = await Promise.all(
				environments.map((env) => fs.readdir(path.join(env.HUHU_HOOK_DIR!, kind))),
			);
			assert.equal(references.flat().length, 1, 'only the winning nonce retains both local and global claims');
		}
		assert.deepEqual(await fs.readdir(path.join(root, 'collectors')), []);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a slow stdin times out once and returns its actual ingress and collector after child exit', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-slow-input-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const received: import('./hook-spool').SpoolEvent[] = [];
	const scope = await pool.prepare(
		(event) => received.push(event),
		() => {},
	);
	const script = path.join(directory, 'publisher.cjs');
	await fs.writeFile(script, HOOK_SCRIPT);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(
				process.env.HUHU_TEST_HOOK_EVIDENCE,
				createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
			),
			HOOK_SCRIPT,
		);
	const child = spawn(process.execPath, [script, 'Stop'], { env: { ...process.env, ...scope.env } });
	let output = '';
	child.stdout.on('data', (data) => {
		output += String(data);
	});
	const exited = new Promise<void>((resolve, reject) => {
		child.once('error', reject);
		child.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`slow publisher exit ${code}`))));
	});
	try {
		child.stdin.write('{');
		await Promise.race([
			exited,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('slow publisher did not honor its deadline')), 4300),
			),
		]);
		await wait(() => received.length === 1);
		assert.equal(output, '{}');
		assert.equal(received[0]!.event, 'HookError');
		assert.equal(received[0]!.data.huhu_answer_error, 'hookInputTimeout');
		assert.deepEqual(await fs.readdir(path.join(pool.root, 'collectors')), []);
		await assert.rejects(fs.access(path.join(scope.env.HUHU_HOOK_DIR!, 'ingress')), { code: 'ENOENT' });
	} finally {
		if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
		await exited;
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
}, 6000);

test('three failed body unlinks report unknown once, retain quota and never replay the consumed event', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-unlink-three-'));
	let deny = true;
	const files = {
		...fs,
		unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
			if (deny && String(file).endsWith('.consuming'))
				throw Object.assign(new Error('fixture unlink denied'), { code: 'EACCES' });
			return fs.unlink(file);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	let received = 0,
		finalized = 0;
	const failures: string[] = [];
	const scope = await pool.prepare(
		() => received++,
		(reason) => failures.push(reason),
		() => finalized++,
	);
	try {
		const script = path.join(directory, 'publisher.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		await publish(script, scope.env);
		await wait(() => failures.includes('hookCleanupFailed'), 1600);
		assert.equal(received, 1);
		assert.equal(finalized, 0);
		assert.equal((await fs.readdir(path.join(pool.root, 'small'))).length, 1);
		assert.equal((await fs.readdir(path.join(scope.env.HUHU_HOOK_DIR!, 'small'))).length, 1);
		const other = await pool.prepare(
			() => {},
			() => {},
		);
		try {
			deny = false;
			await Promise.all([scope.close(), other.close()]);
		} finally {
			await other.close();
		}
		assert.equal(received, 1);
		assert.equal(finalized, 1);
		assert.equal(failures.filter((reason) => reason === 'hookCleanupFailed').length, 1);
		assert.deepEqual(await fs.readdir(path.join(pool.root, 'small')), []);
	} finally {
		deny = false;
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('publication preflight rejects expanded JSON and accessors before body encoding or claiming a body slot', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-encoding-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const scope = await pool.prepare(
		() => assert.fail('invalid payload must not publish'),
		() => {},
	);
	const source = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const dir=process.env.HUHU_HOOK_DIR,token=process.env.HUHU_HOOK_TOKEN;${HOOK_PUBLISHER_SCRIPT}\nlet bodies=0,reads=0;const original=JSON.stringify;JSON.stringify=function(value,...args){if(value&&value.data)bodies++;return original(value,...args);};const huge=post('Stop',{error:'\\u0000'.repeat(3*1024*1024)});const accessor=post('Stop',{get answer(){reads++;return 'must not read';}});const custom=post('Stop',{toJSON(){reads++;return 'must not call';}});process.stdout.write(original({huge,accessor,custom,bodies,reads}));`;
	const script = path.join(directory, 'encoding.cjs');
	await fs.writeFile(script, source);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, createHash('sha256').update(source).digest('hex') + '.cjs'),
			source,
		);
	const child = spawn(process.execPath, [script], { env: { ...process.env, ...scope.env } });
	let output = '';
	child.stdout.on('data', (chunk) => {
		output += String(chunk);
	});
	const exited = new Promise<void>((resolve, reject) => {
		child.once('error', reject);
		child.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`encoding publisher exit ${code}`))));
	});
	try {
		await exited;
		assert.deepEqual(JSON.parse(output), { huge: false, accessor: false, custom: false, bodies: 0, reads: 0 });
		assert.deepEqual(await fs.readdir(path.join(pool.root, 'small')), []);
		assert.deepEqual(await fs.readdir(path.join(pool.root, 'large')), []);
		assert.ok((await fs.stat(path.join(scope.env.HUHU_HOOK_DIR!, 'fault.json'))).size <= 512);
	} finally {
		if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
		await exited;
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a failed reader-claim unlink retains cleanup ownership and finalizes only after the real retry succeeds', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-reader-retry-'));
	let once = true,
		finalized = 0;
	const files = {
		...fs,
		unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
			if (once && /[\\/]reader[\\/]claim.json$/.test(String(file))) {
				once = false;
				throw Object.assign(new Error('reader unlink denied once'), { code: 'EACCES' });
			}
			return fs.unlink(file);
		},
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const scope = await pool.prepare(
		() => {},
		() => {},
		() => finalized++,
	);
	try {
		await assert.rejects(scope.close(), /hookReaderCleanupFailed/);
		await wait(() => finalized === 1, 1300);
		await assert.rejects(fs.access(path.join(pool.root, 'reader')), { code: 'ENOENT' });
		const next = await pool.prepare(
			() => {},
			() => {},
		);
		await next.close();
		await assert.rejects(
			scope.close(),
			/hookReaderCleanupFailed/,
			'the earlier observed failure is not rewritten into success',
		);
	} finally {
		await scope.close().catch(() => {});
		await fs.rm(directory, { recursive: true, force: true });
	}
});

for (const target of ['large', 'scope'] as const)
	test(`a one-shot ${target} rmdir failure retries already completed directory cleanup`, async () => {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-directory-retry-'));
		let scopeDir = '',
			once = true,
			finalized = 0;
		const files = {
			...fs,
			rmdir: async (...args: Parameters<typeof fs.rmdir>) => {
				if (once && String(args[0]) === (target === 'large' ? path.join(scopeDir, 'large') : scopeDir)) {
					once = false;
					throw Object.assign(new Error('directory removal denied once'), { code: 'EACCES' });
				}
				return fs.rmdir(...args);
			},
		};
		const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
		const scope = await pool.prepare(
			() => {},
			() => {},
			() => finalized++,
		);
		scopeDir = scope.env.HUHU_HOOK_DIR!;
		const closing = scope.close();
		void closing.catch(() => {});
		try {
			await wait(() => finalized === 1, 1300);
			await closing;
			await assert.rejects(fs.access(scopeDir), { code: 'ENOENT' });
			await assert.rejects(fs.access(path.join(pool.root, 'reader')), { code: 'ENOENT' });
			const next = await pool.prepare(
				() => {},
				() => {},
			);
			await next.close();
		} finally {
			// Restore only this fixture's already removed empty dirs on the original red path,
			// so its still-owned cleanup can finish before the temporary root is removed.
			if (!finalized)
				for (const kind of ['small', 'large']) await fs.mkdir(path.join(scopeDir, kind), { recursive: true });
			await closing;
			await fs.rm(directory, { recursive: true, force: true });
		}
	});

test('a publisher fault refuses a symlink without changing its external sentinel', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-fault-symlink-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	const scope = await pool.prepare(
		() => {},
		() => {},
	);
	const sentinel = path.join(directory, 'sentinel.txt'),
		file = path.join(scope.env.HUHU_HOOK_DIR!, 'fault.json');
	const source = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const dir=process.env.HUHU_HOOK_DIR,token=process.env.HUHU_HOOK_TOKEN;${HOOK_PUBLISHER_SCRIPT}\nhookFault('hookCapacity');`;
	const script = path.join(directory, 'fault.cjs');
	await fs.writeFile(script, source);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, createHash('sha256').update(source).digest('hex') + '.cjs'),
			source,
		);
	let exited: Promise<void> | undefined;
	try {
		await fs.writeFile(sentinel, 'fixture sentinel must stay unchanged');
		await fs.symlink(sentinel, file);
		const child = spawn(process.execPath, [script], { env: { ...process.env, ...scope.env } });
		exited = new Promise<void>((resolve, reject) => {
			child.once('error', reject);
			child.once('close', (value) =>
				value === 0 ? resolve() : reject(new Error(`fault publisher exit ${value}`)),
			);
		});
		await exited;
		assert.equal(await fs.readFile(sentinel, 'utf8'), 'fixture sentinel must stay unchanged');
		assert.equal((await fs.lstat(file)).isSymbolicLink(), true);
	} finally {
		await exited;
		await fs.unlink(file);
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('an orphan local claim without a reference fails close within its budget while retaining physical quota', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-empty-orphan-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	let finalized = 0;
	const scope = await pool.prepare(
		() => {},
		() => {},
		() => finalized++,
	);
	const orphan = path.join(scope.env.HUHU_HOOK_DIR!, 'small', '0');
	await fs.mkdir(orphan);
	const closing = scope.close();
	const outcome = closing.then(
		() => 'resolved',
		(error) => error,
	);
	try {
		const result = await Promise.race([
			outcome,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('orphan close exceeded its observation budget')), 4200),
			),
		]);
		assert.match(String(result), /hookCleanupIncomplete/);
		assert.equal(finalized, 0);
		assert.equal((await fs.stat(orphan)).isDirectory(), true);
		assert.equal((await fs.stat(path.join(pool.root, 'reader'))).isDirectory(), true);
	} finally {
		// Only the fixture creator removes its simulated crashed publisher's empty claim.
		await fs.rmdir(orphan);
		await wait(() => finalized === 1);
		await outcome;
		await fs.rm(directory, { recursive: true, force: true });
	}
}, 6500);

test('a new preparation cannot reuse a scope until its completed rmdir has been adopted by the reader', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-scope-adoption-'));
	let oldDir = '',
		blocked = false,
		released = false,
		entered!: () => void,
		resume!: () => void;
	const barrier = new Promise<void>((resolve) => {
			entered = resolve;
		}),
		gate = new Promise<void>((resolve) => {
			resume = resolve;
		});
	const files = {
		...fs,
		rmdir: async (...args: Parameters<typeof fs.rmdir>) => {
			await fs.rmdir(...args);
			if (!blocked && String(args[0]) === oldDir) {
				blocked = true;
				entered();
				await gate;
			}
		},
		mkdir: (async (...args: Parameters<typeof fs.mkdir>) => {
			if (blocked && !released && String(args[0]) === oldDir)
				throw new Error('fixture caught reuse before old cleanup adoption');
			return fs.mkdir(...args);
		}) as typeof fs.mkdir,
	};
	const pool = await hookSpool(windowFor(files), path.join(directory, 'resource-v1'));
	const old = await pool.prepare(
		() => {},
		() => {},
	);
	oldDir = old.env.HUHU_HOOK_DIR!;
	const closing = old.close();
	let next: Awaited<ReturnType<typeof pool.prepare>> | undefined;
	try {
		await Promise.race([
			barrier,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('scope removal barrier timeout')), 1200),
			),
		]);
		next = await pool.prepare(
			() => {},
			() => {},
		);
		assert.notEqual(next.env.HUHU_HOOK_DIR, oldDir);
		released = true;
		resume();
		await closing;
		assert.equal((await fs.stat(path.join(next.env.HUHU_HOOK_DIR!, 'active.json'))).isFile(), true);
	} finally {
		released = true;
		resume();
		await closing;
		if (next) await next.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a large physical publication advances while its scope keeps replenishing small publications', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-size-fairness-'));
	const pool = await hookSpool(windowFor(), path.join(directory, 'resource-v1'));
	let small = 0,
		largeAt: number | undefined;
	const errors: string[] = [];
	let publishAgain!: (large: boolean) => boolean;
	const scope = await pool.prepare(
		(row) => {
			if (row.data.session_id === 'large') largeAt = small;
			else {
				small++;
				if (small < 20 && !publishAgain(false)) errors.push('small refill rejected');
			}
		},
		(reason) => errors.push(reason),
	);
	const source = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const dir=process.env.HUHU_HOOK_DIR,token=process.env.HUHU_HOOK_TOKEN;${HOOK_PUBLISHER_SCRIPT}\nmodule.exports=(large)=>post('Stop',large?{session_id:'large',last_assistant_message:'x'.repeat(70000)}:{session_id:'small'});`;
	const script = path.join(directory, 'fairness.cjs');
	await fs.writeFile(script, source);
	if (process.env.HUHU_TEST_HOOK_EVIDENCE)
		await fs.writeFile(
			path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, createHash('sha256').update(source).digest('hex') + '.cjs'),
			source,
		);
	const saved = Object.fromEntries(Object.keys(scope.env).map((key) => [key, process.env[key]]));
	try {
		Object.assign(process.env, scope.env);
		publishAgain = require(script) as (large: boolean) => boolean;
		assert.equal(publishAgain(false), true);
		assert.equal(publishAgain(false), true);
		assert.equal(publishAgain(true), true);
		await wait(() => largeAt !== undefined);
		assert.ok(
			largeAt! < 20,
			`large must advance before the finite small refill ends; observed after ${largeAt} small events`,
		);
		assert.deepEqual(errors, []);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(process.env.HUHU_TEST_HOOK_EVIDENCE, 'size-fairness-sample.json'),
				JSON.stringify({
					largeAfterSmall: largeAt,
					smallRefillEndsAt: 20,
					smallPerRound: 16,
					largePerRound: 1,
					perScopePerRound: 1,
				}) + '\n',
			);
	} finally {
		for (const [key, value] of Object.entries(saved))
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		delete require.cache[script];
		await scope.close();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { build } from 'esbuild';
import { test, vi } from 'vitest';
import { AutomationHooks } from './automation-hooks';
import { runtimeHookRoot } from '../agents/accounts';
import type { RuntimeActivityBinding } from '../../../core/workspace/managed-runtime';
import { HOOK_PUBLISHER_SCRIPT, hookSpool } from './hook-spool';

function message<T = Record<string, string>>(child: ChildProcess): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('reader readiness timeout')), 3000);
		child.once('message', value => { clearTimeout(timer); resolve(value as T); });
		child.once('error', error => { clearTimeout(timer); reject(error); });
		child.once('exit', (code, signal) => { clearTimeout(timer); reject(new Error(`reader exited ${code}/${signal}`)); });
	});
}
function exited(child: ChildProcess): Promise<void> {
	return new Promise((resolve, reject) => {
		child.once('error', reject);
		child.once('close', () => resolve());
	});
}

test('a crashed physical Hook reader releases its owner so production runtime preparation can spawn again', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-recovery-'));
	const win = { require: createRequire(import.meta.url) } as unknown as Window;
	vi.stubGlobal('window', win);
	const hooks = new AutomationHooks(win, () => ({ vault: directory, device: 'recovery-test' }));
	let child: ChildProcess | undefined, ending: Promise<void> | undefined;
	let publisher: ChildProcess | undefined, publisherEnding: Promise<void> | undefined;
	let prepared: Awaited<ReturnType<typeof hooks.prepareRuntimeHooks>> | undefined;
	const binding = {
		runtimeId: 'new-runtime', active: () => true, invalidate: () => {}, close: () => {},
		bindSource: () => { throw new Error('fixture has no provider events'); },
	} satisfies RuntimeActivityBinding;
	const request = { target: { spaceId: 'space', sessionId: 'session', runtimeId: binding.runtimeId }, env: {} };
	try {
		const root = await runtimeHookRoot(directory, 'recovery-test');
		const script = path.join(directory, 'reader.mjs');
		await build({ entryPoints: [fileURLToPath(new URL('./hook-reader.fixture.ts', import.meta.url))], outfile: script, bundle: true, platform: 'node', format: 'esm' });
		child = spawn(process.execPath, [script, root], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
		ending = exited(child);
		const old = await message(child);
		const lateScript = path.join(directory, 'late.cjs');
		await fs.writeFile(lateScript, `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const dir=process.env.HUHU_HOOK_DIR,token=process.env.HUHU_HOOK_TOKEN;${HOOK_PUBLISHER_SCRIPT}\nprocess.on('message',()=>{process.send({accepted:post('SessionStart',{})},()=>process.disconnect());});process.send({ready:'yes'});`);
		publisher = spawn(process.execPath, [lateScript], { env: { ...process.env, ...old }, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
		publisherEnding = exited(publisher);
		await message(publisher);
		await assert.rejects(hooks.prepareRuntimeHooks(request, binding), /hookReaderBusy/);
		assert.equal((await fs.stat(path.join(old.HUHU_HOOK_ROOT!, 'reader', 'claim.json'))).isFile(), true);
		child.kill('SIGKILL');
		await ending;
		prepared = await hooks.prepareRuntimeHooks(request, binding);
		assert.notEqual(prepared.env.HUHU_HOOK_ROOT, old.HUHU_HOOK_ROOT, 'old publishers keep a different physical generation');
		const published = message<{ accepted: boolean }>(publisher);
		publisher.send('publish');
		assert.equal((await published).accepted, false);
		await publisherEnding;
		await assert.rejects(fs.access(old.HUHU_HOOK_ROOT!), { code: 'ENOENT' });
		const launched = spawn(process.execPath, ['-e', 'process.stdout.write(process.env.HUHU_HOOK_ROOT)'], { env: { ...process.env, ...prepared.env } });
		const launchedExit = exited(launched);
		let output = '';
		launched.stdout!.on('data', chunk => { output += String(chunk); });
		await launchedExit;
		assert.equal(launched.exitCode, 0);
		assert.equal(output, prepared.env.HUHU_HOOK_ROOT);
	} finally {
		if (child?.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
		if (ending) await ending;
		if (publisher?.exitCode === null && publisher.signalCode === null) publisher.kill('SIGKILL');
		if (publisherEnding) await publisherEnding;
		await prepared?.close();
		await hooks.dispose();
		vi.unstubAllGlobals();
		await fs.rm(directory, { recursive: true, force: true });
	}
}, 15000);

test('legacy reader claims are preserved while bounded abandoned generations are cleaned without replay', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-generations-'));
	const win = { require: createRequire(import.meta.url) } as unknown as Window;
	const legacy = path.join(directory, 'reader');
	await fs.mkdir(legacy);
	await fs.writeFile(path.join(legacy, 'claim.json'), '{"nonce":"legacy-owner"}');
	try {
		const parent = path.join(directory, 'generations-v2');
		await fs.mkdir(parent);
		for (let n = 0; n < 31; n++) {
			const abandoned = path.join(parent, crypto.randomUUID());
			await fs.mkdir(abandoned);
			await fs.writeFile(path.join(abandoned, 'unconsumed.json'), '{"never":"replay"}');
		}
		const pool = await hookSpool(win, directory);
		const scope = await pool.prepare(() => assert.fail('abandoned events must never replay'), () => {});
		try {
			assert.equal((await fs.readdir(parent)).length, 1);
			assert.equal(await fs.readFile(path.join(legacy, 'claim.json'), 'utf8'), '{"nonce":"legacy-owner"}');
		} finally { await scope.close(); }
	} finally { await fs.rm(directory, { recursive: true, force: true }); }
});

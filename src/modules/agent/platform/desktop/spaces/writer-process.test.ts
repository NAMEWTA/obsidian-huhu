import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createDirectoryPort } from './directories';
import { writerPort } from './writer-owner';

interface Reply { type: string; port?: number; code?: string; reason?: string }
interface RunningChild { process: ChildProcess; ready: Promise<Reply>; exit: Promise<{ code: number | null; signal: NodeJS.Signals | null }>; stderr: string }
let testRoot: string;
let bundle: string;
let count = 0;
const children: RunningChild[] = [];

beforeAll(async () => {
	testRoot = await mkdtemp(path.join(tmpdir(), 'huhu-t02-b-process-'));
	bundle = path.join(testRoot, 'writer.cjs');
	await build({ entryPoints: [fileURLToPath(new URL('./writer-owner.fixture.ts', import.meta.url))], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
	console.info('Real writer fixture runtime:', JSON.stringify({ platform: process.platform, arch: process.arch, node: process.versions.node, uv: process.versions.uv }));
});
afterEach(async () => {
	for (const child of children.splice(0)) {
		if (child.process.exitCode === null && child.process.signalCode === null) child.process.kill('SIGKILL');
		await child.exit;
		expect(child.stderr).toBe('');
	}
});
afterAll(async () => { await rm(testRoot, { recursive: true, force: true }); });
async function vault() {
	const directory = path.join(testRoot, `vault-${count++}`);
	await mkdir(directory);
	return directory;
}
function start(vaultRoot: string, vaultId = 'logical', mode = 'hold'): RunningChild {
	const child = fork(bundle, [vaultRoot, vaultId, 'same-device', `instance-${count++}`, mode], { silent: true });
	const running: RunningChild = {
		process: child, stderr: '',
		ready: new Promise<Reply>((resolve, reject) => {
			child.once('message', message => resolve(message as Reply));
			child.once('error', reject);
			child.once('exit', (code, signal) => { reject(new Error(`Child exited before readiness: ${code}/${signal}`)); });
		}),
		exit: new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal }))),
	};
	child.stderr?.on('data', data => { running.stderr += String(data); });
	children.push(running);
	return running;
}
async function close(child: RunningChild) {
	child.process.send('close');
	expect(await child.exit).toEqual({ code: 0, signal: null });
}

describe('real cross-process Space writer', () => {
	test('two competing aliases with different logical Vault IDs have exactly one writer; killed writer exits before reacquisition', async () => {
		const root = await vault();
		const alias = path.join(testRoot, `alias-${count++}`);
		await symlink(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
		const pair = [start(root, 'logical-one'), start(alias, 'logical-copy')];
		const replies = await Promise.all(pair.map(child => child.ready));
		expect(replies.filter(reply => reply.type === 'held')).toHaveLength(1);
		expect(replies.filter(reply => reply.type === 'failed')).toEqual([{ type: 'failed', code: 'OWNER_CONFLICT', reason: 'port-in-use' }]);
		const heldIndex = replies.findIndex(reply => reply.type === 'held');
		const winner = pair[heldIndex]!;
		const loser = pair[1 - heldIndex]!;
		expect(await loser.exit).toEqual({ code: 1, signal: null });
		expect(await readdir(root)).toEqual([]);
		expect(winner.process.kill('SIGKILL')).toBe(true);
		const killed = await winner.exit;
		expect(killed.signal !== null || killed.code !== 0).toBe(true);
		const replacement = start(root, 'logical-third');
		expect(await replacement.ready).toEqual(replies[heldIndex]);
		await close(replacement);
		console.info('Competing children:', JSON.stringify({ replies, loserExit: { code: 1, signal: null }, killed, replacementExit: { code: 0, signal: null } }));
	}, 20000);

	test('copied logical identity in a different physical root does not address the first writer', async () => {
		const firstRoot = await vault();
		const secondRoot = await vault();
		const inspect = async (vaultRoot: string) => createDirectoryPort({ vaultRoot, vaultId: 'copied', deviceId: 'same-device', chooseDirectory: async () => undefined }).inspectVault();
		const [firstVault, secondVault] = await Promise.all([inspect(firstRoot), inspect(secondRoot)]);
		expect(firstVault.root).not.toEqual(secondVault.root);
		const first = start(firstRoot, 'copied');
		const initial = await first.ready;
		expect(initial.type).toBe('held');
		const second = start(secondRoot, 'copied');
		const reply = await second.ready;
		if (writerPort(secondVault.deviceId, secondVault.root) === initial.port) {
			// A genuine fixed-range hash collision is conservatively rejected, never retried.
			expect(reply).toEqual({ type: 'failed', code: 'OWNER_CONFLICT', reason: 'port-in-use' });
			expect(await second.exit).toEqual({ code: 1, signal: null });
		} else {
			expect(reply).toEqual({ type: 'held', port: writerPort(secondVault.deviceId, secondVault.root) });
			await close(second);
		}
		await close(first);
	}, 20000);

	test.each(['inspect', 'idle'])('%s has no IPC/controller keepalive or inherited listener work', async mode => {
		const child = start(await vault(), 'logical', mode);
		expect((await child.ready).type).toBe(mode === 'inspect' ? 'inspected' : 'held');
		expect(await child.exit).toEqual({ code: 0, signal: null });
	}, 10000);
});

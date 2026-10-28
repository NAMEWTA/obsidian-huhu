import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test } from 'vitest';
import { HOOK_SCRIPT } from './automation-hooks';
import { MAX_ANSWER_BYTES, MAX_HOOK_INPUT_BYTES } from './event-payload';

async function publicationFixture(directory: string) {
	const root = path.join(directory, 'resource-v1'),
		dir = path.join(root, 'scopes', '0'),
		token = crypto.randomUUID();
	for (const name of ['collectors', 'small', 'large']) await fs.mkdir(path.join(root, name), { recursive: true });
	for (const name of ['small', 'large']) await fs.mkdir(path.join(dir, name), { recursive: true });
	await fs.writeFile(path.join(dir, 'active.json'), JSON.stringify({ token }));
	return { root, dir, env: { ...process.env, HUHU_HOOK_ROOT: root, HUHU_HOOK_DIR: dir, HUHU_HOOK_TOKEN: token } };
}
async function publications(root: string) {
	const events: Array<{ event: string; data: Record<string, string> }> = [];
	for (const kind of ['small', 'large'])
		for (const slot of await fs.readdir(path.join(root, kind))) {
			const directory = path.join(root, kind, slot);
			for (const name of await fs.readdir(directory))
				if (name.endsWith('.ready'))
					events.push(JSON.parse(await fs.readFile(path.join(directory, name), 'utf8')));
		}
	return events;
}
async function invoke(input: unknown) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-answer-hook-'));
	try {
		const fixture = await publicationFixture(directory);
		const script = path.join(directory, 'hook.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		const child = spawn(process.execPath, [script, 'Stop'], { windowsHide: true, env: fixture.env });
		let output = '';
		child.stdout.on('data', (chunk) => {
			output += String(chunk);
		});
		const exited = new Promise<void>((resolve, reject) => {
			child.once('error', reject);
			child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Hook exit ${code}`))));
		});
		child.stdin.end(JSON.stringify(input));
		await exited;
		assert.equal(output, '{}');
		const events = await publications(fixture.root);
		assert.equal(events.length, 1, 'completion metadata survives oversized input');
		return events[0]!;
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

test('native hook returns the entire Chinese JSON answer without spooling the prompt or tool input', async () => {
	const answer = JSON.stringify(Array.from({ length: 2400 }, (_, id) => ({ id, reason: '完整结果，来源明确。' })));
	assert.ok(Buffer.byteLength(answer) > 100_000);
	const event = await invoke({
		session_id: 'root',
		last_assistant_message: answer,
		prompt: 'private prompt',
		tool_input: { secret: 'never spool' },
	});
	assert.equal(event.event, 'Stop');
	assert.deepEqual(event.data, { session_id: 'root', last_assistant_message: answer });
});

test('oversize answers and hook input produce explicit errors instead of losing completion', async () => {
	const answer = await invoke({
		session_id: 'root',
		last_assistant_message: '中'.repeat(Math.ceil(MAX_ANSWER_BYTES / 3) + 1),
	});
	assert.equal(answer.event, 'Stop');
	assert.equal(answer.data.huhu_answer_error, 'answerTooLarge');
	assert.equal(answer.data.last_assistant_message, undefined);
	const input = await invoke({ prompt: 'x'.repeat(MAX_HOOK_INPUT_BYTES + 1) });
	assert.equal(input.event, 'HookError');
	assert.equal(input.data.huhu_answer_error, 'hookInputTooLarge');
});

test('the generated hook refuses a spool junction that was replaced after preparation', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-link-')),
		outside = path.join(root, 'outside'),
		owner = path.join(root, 'account'),
		spool = path.join(owner, 'spool');
	await fs.mkdir(outside);
	await fs.mkdir(owner);
	await fs.symlink(outside, spool, process.platform === 'win32' ? 'junction' : 'dir');
	try {
		const script = path.join(owner, 'hook.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		const child = spawn(process.execPath, [script, 'Stop'], {
			windowsHide: true,
			env: { ...process.env, HUHU_ACCOUNT_ROOT: owner, HUHU_HOOK_DIR: spool, HUHU_HOOK_TOKEN: 'fixture' },
		});
		const exit = new Promise<void>((resolve, reject) => {
			child.once('error', reject);
			child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(String(code)))));
		});
		child.stdin.end('{}');
		await exit;
		assert.deepEqual(await fs.readdir(outside), []);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test('a physical scope cannot accumulate more than eight small publications', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-hook-capacity-'));
	try {
		const fixture = await publicationFixture(directory);
		const script = path.join(directory, 'hook.cjs');
		await fs.writeFile(script, HOOK_SCRIPT);
		if (process.env.HUHU_TEST_HOOK_EVIDENCE)
			await fs.writeFile(
				path.join(
					process.env.HUHU_TEST_HOOK_EVIDENCE,
					createHash('sha256').update(HOOK_SCRIPT).digest('hex') + '.cjs',
				),
				HOOK_SCRIPT,
			);
		for (let i = 0; i < 9; i++) {
			const child = spawn(process.execPath, [script, 'SessionStart'], { env: fixture.env });
			const exited = new Promise<void>((resolve, reject) => {
				child.once('error', reject);
				child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`hook exit ${code}`))));
			});
			child.stdin.end('{}');
			await exited;
		}
		assert.equal(
			(await publications(fixture.root)).length,
			8,
			'the ninth publication must fail capacity before writing another body',
		);
		assert.match(await fs.readFile(path.join(fixture.dir, 'fault.json'), 'utf8'), /hookCapacity/);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('a legal two MiB escaped answer survives the large publication without truncation', async () => {
	const answer = '\u0000'.repeat(MAX_ANSWER_BYTES);
	const event = await invoke({ session_id: 'root', last_assistant_message: answer });
	assert.equal(event.event, 'Stop');
	assert.equal(event.data.last_assistant_message, answer);
	assert.equal(event.data.huhu_answer_error, undefined);
});

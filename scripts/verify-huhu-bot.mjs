import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { protocolVersion, schemaVersion, targetFor, verifyBotAsset } from './build-huhu-bot.mjs';

const maxFrameBytes = 1_048_576;
const timeoutMs = 15_000;
export function smokeEnvironment(scratch) {
	// An allowlist prevents provider credentials and personal HOME state entering the child.
	const env = {};
	for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'ComSpec', 'PATHEXT']) if (process.env[key]) env[key] = process.env[key];
	return { ...env, HOME: scratch, USERPROFILE: scratch, LOCALAPPDATA: path.join(scratch, 'local'), APPDATA: path.join(scratch, 'roaming'), XDG_STATE_HOME: path.join(scratch, 'state'), XDG_CONFIG_HOME: path.join(scratch, 'config'), XDG_CACHE_HOME: path.join(scratch, 'cache'), TMPDIR: scratch, TMP: scratch, TEMP: scratch };
}
export function smokeProfile(scratch, platform = process.platform) {
	if (platform === 'win32') return path.join(scratch, 'local/HUHU/huhubot/profiles/smoke');
	if (platform === 'darwin') return path.join(scratch, 'Library/Application Support/HUHU/huhubot/profiles/smoke');
	return path.join(scratch, 'state/huhu/huhubot/profiles/smoke');
}

function session(binary, profile, env) {
	const child = spawn(binary, ['--stdio', '--profile', profile, '--managed'], { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
	const pending = new Map();
	let buffer = Buffer.alloc(0), stderr = '', failure, next = 0, closed = false;
	const fail = error => {
		failure ??= error;
		for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(failure); }
		pending.clear();
		if (!closed) child.kill('SIGKILL');
	};
	// Never reject an unobserved exit promise while a request is still pending.
	const exit = new Promise(resolve => {
		child.once('error', error => { fail(error); resolve({ error }); });
		child.once('close', (code, signal) => {
			closed = true;
			if (pending.size) fail(new Error(`Runner exited with outstanding requests (code=${code}, signal=${signal}): ${stderr}`));
			resolve({ code, signal });
		});
	});
	const lifetime = setTimeout(() => fail(new Error('Runner smoke lifetime exceeded')), timeoutMs * 3);
	child.stderr.on('data', chunk => {
		stderr += chunk.toString();
		if (stderr.length > 65_536) fail(new Error('Runner stderr exceeded smoke limit'));
	});
	child.stdout.on('data', chunk => {
		try {
			buffer = Buffer.concat([buffer, chunk]);
			while (buffer.length >= 4) {
				const size = buffer.readUInt32BE();
				assert.ok(size >= 1 && size <= maxFrameBytes, 'Invalid stdout frame length (or log pollution)');
				if (buffer.length < size + 4) break;
				assert.equal(buffer[4], 1, 'Unexpected HAP frame kind');
				const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(5, size + 4)));
				buffer = buffer.subarray(size + 4);
				for (const response of Array.isArray(payload) ? payload : [payload]) {
					assert.equal(response.jsonrpc, '2.0');
					const entry = pending.get(response.id);
					assert.ok(entry, `Unexpected response ${response.id}`);
					pending.delete(response.id); clearTimeout(entry.timer);
					if (response.error) entry.reject(new Error(JSON.stringify(response.error)));
					else entry.resolve(response.result);
				}
			}
			assert.ok(buffer.length <= maxFrameBytes + 4, 'Runner output buffer exceeded limit');
		} catch (error) { fail(error); }
	});
	child.stdin.on('error', fail);
	return {
		async call(method, params = {}) {
			if (failure) throw failure;
			assert.ok(!closed, 'Runner is already closed');
			const id = `c:smoke-${++next}`;
			const payload = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
			const frame = Buffer.alloc(payload.length + 5); frame.writeUInt32BE(payload.length + 1); frame[4] = 1; payload.copy(frame, 5);
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => fail(new Error(`${method} timed out`)), timeoutMs);
				pending.set(id, { resolve, reject, timer });
				child.stdin.write(frame);
			});
		},
		async finish(eof = true) {
			if (eof) child.stdin.end();
			const timer = setTimeout(() => fail(new Error(`Runner did not stop within deadline (${eof ? 'stdin EOF' : 'service.shutdown'})`)), timeoutMs);
			try { const status = await exit; if (failure) throw failure; assert.equal(status.code, 0, `Runner failed: ${stderr}`); assert.equal(buffer.length, 0, 'Truncated stdout frame'); }
			finally { clearTimeout(timer); clearTimeout(lifetime); }
		},
		async dispose() { clearTimeout(lifetime); for (const item of pending.values()) clearTimeout(item.timer); if (!closed) child.kill('SIGKILL'); await exit; },
	};
}

export async function verifyBot(binary) {
	binary = path.resolve(binary);
	const target = targetFor(`${process.platform}-${process.arch}`);
	assert.equal(path.basename(binary), target.asset, 'Smoke requires the binary for this native target');
	const metadata = JSON.parse(readFileSync(`${binary}.json`, 'utf8'));
	verifyBotAsset(path.dirname(binary), target, metadata.version);
	const scratch = mkdtempSync(path.join(tmpdir(), 'huhu-bot-smoke-'));
	const env = smokeEnvironment(scratch), profile = smokeProfile(scratch);
	mkdirSync(path.dirname(profile), { recursive: true, mode: 0o700 });
	let active;
	const hello = async () => {
		const result = await active.call('protocol.hello', { protocolVersion, client: { name: 'huhu-bot-build-smoke', version: metadata.version } });
		assert.equal(result.protocolVersion, protocolVersion); assert.equal(result.schemaVersion, schemaVersion); assert.equal(result.buildVersion, metadata.version);
		assert.equal(result.limits.maxFrameBytes, maxFrameBytes); assert.equal(result.limits.maxBatchItems, 8);
		assert.ok(result.profile.profileId); assert.match(result.profile.commandEpoch, /^\d+$/); assert.match(result.profile.revision, /^\d+$/);
		const status = await active.call('service.status');
		assert.equal(status.state, 'ready'); assert.deepEqual(status.profile, result.profile);
		assert.deepEqual((await active.call('profile.status')).profile, result.profile);
		return result;
	};
	try {
		active = session(binary, profile, env);
		const first = await hello();
		await active.finish(); // EOF must close the SQLite connection and release its file identity lock.
		await active.dispose();
		assert.equal(readFileSync(path.join(profile, 'profile.sqlite3')).subarray(0, 16).toString(), 'SQLite format 3\0');
		active = session(binary, profile, env);
		const reopened = await hello();
		assert.deepEqual(reopened.profile, first.profile, 'Profile metadata must survive process reopen');
		assert.equal((await active.call('service.shutdown')).accepted, true);
		await active.finish(false);
		console.log(`huhu-bot native smoke passed: ${target.id}, version=${metadata.version}, HAP=${protocolVersion}, schema=${schemaVersion} (SQLite reopen, EOF, shutdown)`);
	} finally { if (active) await active.dispose(); rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	if (!process.argv[2]) throw new Error('Usage: node scripts/verify-huhu-bot.mjs <native binary>');
	await verifyBot(process.argv[2]);
}

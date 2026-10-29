// Exercise a built terminal helper over its standard streams: handshake, a session with input, output
// and exit code, flow control without acknowledgements, and ending every session when stdin closes.
// With a second argument it also exercises the `huhu` control CLI built from the same package: version/protocol pairing
// with the helper, schema and help generated from control-schema.json, stdin bodies and language-independent exit codes.
// Usage: node scripts/verify-pty-helper.mjs <path-to-huhu-pty[.exe]> [<path-to-huhu[.exe]>]
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const binary = process.argv[2], cliBinary = process.argv[3];
assert.ok(binary, 'Pass the helper binary path');
const windows = process.platform === 'win32';

function frame(kind, body) {
	const out = Buffer.alloc(5 + body.length);
	out.writeUInt32BE(body.length + 1, 0);
	out[4] = kind;
	body.copy(out, 5);
	return out;
}
const control = (message) => frame(1, Buffer.from(JSON.stringify(message)));
const input = (sid, text) => {
	const body = Buffer.alloc(4 + Buffer.byteLength(text));
	body.writeUInt32BE(sid, 0);
	body.write(text, 4);
	return frame(2, body);
};

function start() {
	const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
	const state = { messages: [], output: new Map(), bytes: new Map() };
	const queryTails = new Map();
	let buffer = Buffer.alloc(0);
	child.stdout.on('data', (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);
		while (buffer.length >= 4) {
			const length = buffer.readUInt32BE(0);
			if (buffer.length < 4 + length) break;
			const kind = buffer[4];
			const body = buffer.subarray(5, 4 + length);
			buffer = buffer.subarray(4 + length);
			if (kind === 1) state.messages.push(JSON.parse(body.toString('utf8')));
			else if (kind === 3) {
				const sid = body.readUInt32BE(0);
				const text = body.subarray(4).toString('utf8');
				state.output.set(sid, (state.output.get(sid) ?? '') + text);
				state.bytes.set(sid, (state.bytes.get(sid) ?? 0) + body.length - 4);
				// ConPTY waits for the terminal's initial cursor position before starting the shell.
				// Preserve a possible split request across output frames, and reply once per request.
				const queries = (queryTails.get(sid) ?? '') + text;
				for (const _ of queries.matchAll(/\x1b\[6n/g)) child.stdin.write(input(sid, '\x1b[1;1R'));
				queryTails.set(sid, queries.slice(-3));
			}
		}
	});
	const send = (bytes) => child.stdin.write(bytes);
	return { child, state, send };
}

async function until(predicate, label, timeout = 15_000) {
	const end = Date.now() + timeout;
	while (Date.now() < end) {
		const value = predicate();
		if (value) return value;
		await delay(25);
	}
	throw new Error(`Timed out: ${label}; messages=${JSON.stringify(helper.state.messages)}; output=${JSON.stringify([...helper.state.output].map(([sid, text]) => [sid, text.slice(-500)]))}`);
}

const helper = start();
helper.send(control({ type: 'hello', protocol: 3 }));
const hello = await until(() => helper.state.messages.find((m) => m.type === 'hello'), 'handshake');
assert.equal(hello.accepted, true);
assert.equal(hello.protocol, 3);

// A session: read a line, echo it with the environment, exit with a code.
const shell = windows
	? { file: 'cmd.exe', args: ['/d', '/q', '/v:on', '/c', 'set /p line=ready & echo got:!line!:%HUHU_PROBE% & exit /b 4'] }
	: { file: '/bin/sh', args: ['-c', 'printf ready; read line; echo "got:$line:$HUHU_PROBE"; exit 4'] };
helper.send(control({ type: 'spawn', sid: 1, ...shell, env: { HUHU_PROBE: 'env-ok' }, cols: 80, rows: 24 }));
await until(() => helper.state.messages.find((m) => m.type === 'spawned' && m.sid === 1), 'spawned');
await until(() => (helper.state.output.get(1) ?? '').includes('ready'), 'prompt');
helper.send(input(1, 'ping\r'));
await until(() => (helper.state.output.get(1) ?? '').includes('got:ping:env-ok'), 'echo');
const exit = await until(() => helper.state.messages.find((m) => m.type === 'exit' && m.sid === 1), 'exit');
assert.equal(exit.code, 4);
helper.send(control({ type: 'ack', sid: 1, bytes: helper.state.bytes.get(1) ?? 0 }));

// Flow control: with no acknowledgements, output pauses near the 1 MiB credit.
const flood = windows
	? { file: 'powershell.exe', args: ['-NoProfile', '-Command', "while ($true) { [Console]::Out.Write('x' * 8192) }"] }
	: { file: '/bin/sh', args: ['-c', "while :; do printf '%8192s' x; done"] };
helper.send(control({ type: 'spawn', sid: 2, ...flood, env: {}, cols: 120, rows: 30 }));
await until(() => (helper.state.bytes.get(2) ?? 0) > 512 * 1024, 'flood output', 30_000);
await delay(1500);
const paused = helper.state.bytes.get(2) ?? 0;
await delay(1000);
assert.equal(helper.state.bytes.get(2), paused, 'output stays paused without acknowledgements');
assert.ok(paused <= 1024 * 1024 + 64 * 1024 + 16 * 1024, `paused at ${paused} bytes`);
helper.send(control({ type: 'ack', sid: 2, bytes: paused }));
await until(() => (helper.state.bytes.get(2) ?? 0) > paused, 'resumes after acknowledgement');

// Closing stdin ends the remaining session and the helper itself.
helper.child.stdin.end();
await until(() => helper.child.exitCode !== null || helper.child.signalCode !== null, 'helper exit');
assert.equal(helper.child.exitCode, 0);

if (cliBinary) {
	const canonical = JSON.parse(readFileSync(new URL('../src/shared/native/control-schema.json', import.meta.url), 'utf8'));
	// Route hints and the locator are removed so the run cannot reach a real workbench.
	const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('HUHU_')));
	const run = (args, input) => spawnSync(cliBinary, args, { env, input, encoding: 'utf8', windowsHide: true, timeout: 20_000, maxBuffer: 4 * 1024 * 1024 });
	const version = run(['--json', 'version']);
	assert.equal(version.status, 0, 'version exits 0');
	const receipt = JSON.parse(version.stdout);
	assert.equal(receipt.ok, true);
	assert.equal(receipt.protocolVersion, canonical.protocolVersion, 'CLI protocol major equals the canonical schema');
	assert.equal(receipt.data.helperProtocol, hello.protocol, 'CLI pairs with the helper protocol it was built with');
	assert.equal(receipt.data.helperProtocol, canonical.helperProtocol);
	assert.equal(receipt.data.version, hello.version, 'helper and CLI come from one build');
	const schema = run(['schema']);
	assert.equal(schema.status, 0);
	assert.deepEqual(JSON.parse(schema.stdout), canonical, 'schema output is the canonical control schema');
	const help = run(['help']);
	assert.equal(help.status, 0);
	for (const [name, operation] of Object.entries(canonical.operations)) {
		assert.ok(help.stdout.split('\n').some((line) => line.startsWith(`${name} `)), `help lists ${name}`);
		for (const key of Object.keys(operation.params.properties ?? {})) assert.ok(help.stdout.includes(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`), `help lists --${key} of ${name}`);
	}
	// Error classes are machine fields and exit codes, never message text.
	const body = (bytes) => 'x'.repeat(bytes);
	const send = (bytes) => run(['--json', 'message', 'send', '--to-session', 'S', '--stdin'], body(bytes));
	const accepted = send(16 * 1024);
	assert.notEqual(JSON.parse(accepted.stdout).error?.code, 'CAPACITY_EXCEEDED', 'a 16 KiB stdin body passes local capacity checks');
	assert.equal(accepted.status, canonical.errorExits[JSON.parse(accepted.stdout).error.code], 'exit code follows the error class');
	const oversized = send(16 * 1024 + 1);
	assert.equal(JSON.parse(oversized.stdout).error.code, 'CAPACITY_EXCEEDED');
	assert.equal(oversized.status, canonical.errorExits.CAPACITY_EXCEEDED);
	const unknown = run(['--json', 'terminal', 'teleport']);
	assert.equal(JSON.parse(unknown.stdout).error.code, 'INVALID_ARGUMENT');
	assert.equal(unknown.status, canonical.errorExits.INVALID_ARGUMENT);
	console.log(`control CLI verified (${receipt.data.version}, protocol ${receipt.protocolVersion})`);
}

console.log(`terminal helper verified (${hello.platform}, ${hello.version})`);

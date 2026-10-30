// TEMPORARY Windows CI diagnostic for the ConPTY spawn stall. Removed once the cause is fixed.
// Usage: node scripts/diagnose-windows-pty-spawn.mjs <path-to-huhu-pty.exe>
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const binary = process.argv[2];
const frame = (kind, body) => {
	const out = Buffer.alloc(5 + body.length);
	out.writeUInt32BE(body.length + 1, 0);
	out[4] = kind;
	body.copy(out, 5);
	return out;
};
const control = (message) => frame(1, Buffer.from(JSON.stringify(message)));

function processes() {
	try {
		return execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(cmd|conhost|OpenConsole|huhu-pty)' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | Format-Table -AutoSize -Wrap | Out-String -Width 300"], { encoding: 'utf8', timeout: 20000 });
	} catch (error) {
		return String(error);
	}
}

async function scenario(name, requests) {
	const dir = mkdtempSync(join(tmpdir(), 'huhu-diag-'));
	const trace = join(dir, 'trace.txt');
	const started = Date.now();
	const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, HUHU_PTY_TRACE: trace } });
	const log = [];
	const note = (text) => log.push(`${String(Date.now() - started).padStart(6)}ms ${text}`);
	let buffer = Buffer.alloc(0);
	child.stderr.on('data', (chunk) => note(`stderr ${JSON.stringify(chunk.toString())}`));
	child.stdout.on('data', (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);
		while (buffer.length >= 4) {
			const length = buffer.readUInt32BE(0);
			if (buffer.length < 4 + length) break;
			const kind = buffer[4];
			const body = buffer.subarray(5, 4 + length);
			buffer = buffer.subarray(4 + length);
			note(kind === 1 ? `control ${body.toString('utf8')}` : `frame ${kind} ${JSON.stringify(body.subarray(4).toString('utf8'))}`);
		}
	});
	child.on('exit', (code, signal) => note(`helper exit ${code} ${signal}`));
	for (const request of requests) {
		note(`send ${JSON.stringify(request)}`);
		child.stdin.write(control(request));
		await delay(4000);
		note(`processes after 4s:\n${processes()}`);
	}
	child.stdin.end();
	await delay(3000);
	if (child.exitCode === null) child.kill();
	console.log(`===== ${name}`);
	console.log(log.join('\n'));
	console.log(`----- trace ${name}`);
	console.log(existsSync(trace) ? readFileSync(trace, 'utf8') : '(no trace)');
}

const missing = join(tmpdir(), `huhu-absent-shell-${Date.now()}`);
const exit7 = (sid, file) => ({ type: 'spawn', sid, file, args: ['/D', '/C', 'exit 7'], cols: 80, rows: 24 });
await scenario('cmd first', [exit7(1, 'cmd.exe')]);
await scenario('missing then cmd', [{ type: 'spawn', sid: 12, file: missing, args: [], cols: 80, rows: 24 }, exit7(12, 'cmd.exe')]);
await scenario('full path cmd', [exit7(3, 'C:\\Windows\\System32\\cmd.exe')]);
await scenario('hello then cmd', [{ type: 'hello', protocol: 3 }, exit7(4, 'cmd.exe')]);

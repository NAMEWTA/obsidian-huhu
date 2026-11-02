import { constants } from 'node:fs';
import { access, realpath, stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const required = 'Build both native binaries with pnpm run check:native, then set HUHU_TEST_PTY_BINARY and HUHU_TEST_CONTROL_BINARY to the exact frozen files.';

/** @typedef {Readonly<{path: string, sha256: string, bytes: number}>} ControlTestBinary */
/** @typedef {Readonly<{helper: ControlTestBinary, cli: ControlTestBinary, platform: NodeJS.Platform, arch: string}>} ControlTestBinaries */

/**
 * Read-only preflight; never searches PATH, builds, starts a helper or activates a module.
 * @param {NodeJS.ProcessEnv} env
 * @returns {Promise<ControlTestBinaries>}
 */
export async function requireControlTestBinaries(env = process.env) {
	/** @param {string} key */
	const inspect = async (key) => {
		const supplied = env[key];
		if (!supplied || !isAbsolute(supplied)) throw new Error(`${key} must name an absolute binary path. ${required}`);
		const path = await realpath(supplied);
		const before = await stat(path);
		if (!before.isFile() || !before.size || before.size > 256 * 1024 * 1024) throw new Error(`Invalid native test binary: ${key}`);
		await access(path, process.platform === 'win32' ? constants.R_OK : constants.R_OK | constants.X_OK);
		const bytes = await readFile(path), after = await stat(path);
		if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || bytes.length !== after.size)
			throw new Error(`Native test binary changed during preflight: ${key}`);
		return Object.freeze({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
	};
	const helper = await inspect('HUHU_TEST_PTY_BINARY'), cli = await inspect('HUHU_TEST_CONTROL_BINARY');
	if (helper.path === cli.path || helper.sha256 === cli.sha256) throw new Error('The helper and control CLI must be distinct frozen binaries.');
	return Object.freeze({ helper, cli, platform: process.platform, arch: process.arch });
}

/**
 * Runs only the supplied CLI; business assertions belong to the production A service tests.
 * @param {ControlTestBinaries} binaries
 * @param {string[]} args
 * @param {{env?: NodeJS.ProcessEnv, timeoutMs?: number, signal?: AbortSignal}} options
 * @returns {Promise<Readonly<{argv: string[], startedAtUtc: string, finishedAtUtc: string, exitCode: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string, binarySha256: string}>>}
 */
export async function runControlTestCli(binaries, args, options = {}) {
	const timeoutMs = options.timeoutMs ?? 10000;
	if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 86400000) throw new Error('Invalid native test CLI deadline');
	options.signal?.throwIfAborted();
	const before = await stat(binaries.cli.path);
	if (!before.isFile() || before.size !== binaries.cli.bytes || before.size > 256 * 1024 * 1024) throw new Error('Frozen control CLI changed before execution');
	const current = await readFile(binaries.cli.path);
	if (createHash('sha256').update(current).digest('hex') !== binaries.cli.sha256) throw new Error('Frozen control CLI changed before execution');
	const startedAtUtc = new Date().toISOString(), argv = [binaries.cli.path, ...args];
	return new Promise((resolveRun, reject) => {
		const child = spawn(binaries.cli.path, args, { env: { ...process.env, ...options.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
		/** @type {Buffer[]} */
		const stdout = [], stderr = [];
		let outBytes = 0, errBytes = 0;
		/** @type {Error | undefined} */
		let failure;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let escalation;
		/** @param {Error} error */
		const stop = (error) => {
			if (failure) return;
			failure = error; child.kill();
			escalation = setTimeout(() => child.kill('SIGKILL'), 1000);
		};
		const timer = setTimeout(() => stop(new Error('Native test CLI deadline exceeded')), timeoutMs);
		const abort = () => stop(new Error('Native test CLI observation cancelled'));
		options.signal?.addEventListener('abort', abort, { once: true });
		if (options.signal?.aborted) abort();
		child.stdout.on('data', bytes => { outBytes += bytes.length; if (outBytes > 2 * 1024 * 1024 || stdout.length >= 4096) stop(new Error('Native CLI stdout capacity exceeded')); else stdout.push(bytes); });
		child.stderr.on('data', bytes => { errBytes += bytes.length; if (errBytes > 64 * 1024 || stderr.length >= 512) stop(new Error('Native CLI stderr capacity exceeded')); else stderr.push(bytes); });
		child.on('error', error => { failure ??= error; });
		child.on('close', (exitCode, signal) => {
			clearTimeout(timer); clearTimeout(escalation); options.signal?.removeEventListener('abort', abort);
			if (failure) { reject(failure); return; }
			resolveRun(Object.freeze({ argv, startedAtUtc, finishedAtUtc: new Date().toISOString(), exitCode, signal,
				stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), binarySha256: binaries.cli.sha256 }));
		});
	});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try { console.log(JSON.stringify(await requireControlTestBinaries())); }
	catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

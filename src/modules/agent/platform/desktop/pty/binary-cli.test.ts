import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'vitest';
import { BinaryError, ensureHelper } from './binary';
import { assertCompatible, CLI_PROTOCOL_MAJOR, cliAssetName, diagnoseCli, ensureCli, ensureCliVerified, exposeCli, parseCompatibility } from './binary-cli';
import { HELPER_PROTOCOL } from '../../../../../shared/native/frames';
import schema from '../../../../../shared/native/control-schema.json';

const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const VERSION = '0.0.1-alpha.1';

function receipt() {
	const key = randomBytes(32);
	return {
		seal(value: string) {
			const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
			const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
			return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
		},
		open(value: string) {
			const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
			decipher.setAuthTag(bytes.subarray(12, 28));
			return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
		},
	};
}

/** A published release for linux-x64; every field can be replaced to model a bad or older release. */
function release(overrides: { cliProtocol?: number; helperProtocol?: number; compat?: string | null; digest?: string; cli?: Buffer; compatSha?: string } = {}) {
	const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'huhu-cli-')));
	const cli = overrides.cli ?? Buffer.from('cli-binary-v1'), helper = Buffer.from('helper-binary-v1');
	const requests: string[] = [];
	const compat = overrides.compat === undefined ? JSON.stringify({ schema: 1, asset: 'huhu-linux-x64', cliProtocol: overrides.cliProtocol ?? CLI_PROTOCOL_MAJOR, helperProtocol: overrides.helperProtocol ?? HELPER_PROTOCOL, sha256: overrides.compatSha ?? sha(Buffer.from('cli-binary-v1')) }) : overrides.compat;
	const fetch = async (url: string, limit: number) => {
		requests.push(url.slice(url.lastIndexOf('/') + 1));
		const body = (() => {
			if (url.endsWith('/huhu-linux-x64.sha256')) return Buffer.from(`${overrides.digest ?? sha(Buffer.from('cli-binary-v1'))}  huhu-linux-x64\n`);
			if (url.endsWith('/huhu-linux-x64.compat.json')) return compat === null ? undefined : Buffer.from(compat);
			if (url.endsWith('/huhu-linux-x64')) return cli;
			if (url.endsWith('/huhu-pty-linux-x64.sha256')) return Buffer.from(`${sha(helper)}  huhu-pty-linux-x64\n`);
			if (url.endsWith('/huhu-pty-linux-x64')) return helper;
			return undefined;
		})();
		if (!body) throw new BinaryError('http', 'HTTP 404', { status: 404, url });
		if (body.length > limit) throw new BinaryError('tooLarge', 'too large');
		return body;
	};
	const options = { vault: dir, receipt: receipt(), device: 'fixture-device', version: VERSION, offline: false, platform: 'linux', arch: 'x64', fetch };
	return { dir, requests, options, cliFile: path.join(dir, '.huhu/helpers/fixture-device/linux-x64', VERSION, 'huhu-linux-x64'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('the constants match the canonical control schema and the five published names', () => {
	assert.equal(CLI_PROTOCOL_MAJOR, schema.protocolVersion);
	assert.equal(HELPER_PROTOCOL, schema.helperProtocol);
	assert.deepEqual([['linux', 'x64'], ['linux', 'arm64'], ['darwin', 'x64'], ['darwin', 'arm64'], ['win32', 'x64']].map(([p, a]) => cliAssetName(p!, a!)), ['huhu-linux-x64', 'huhu-linux-arm64', 'huhu-darwin-x64', 'huhu-darwin-arm64', 'huhu-win32-x64.exe']);
	assert.equal(cliAssetName('win32', 'arm64'), null);
	assert.equal(cliAssetName('freebsd', 'x64'), null);
});

test('a verified compatible CLI installs, and offline reuse needs no network but still rechecks the receipt', async () => {
	const f = release();
	try {
		const file = await ensureCli(f.options);
		assert.equal(file, f.cliFile);
		assert.deepEqual(fs.readFileSync(file), Buffer.from('cli-binary-v1'));
		assert.deepEqual(f.requests, ['huhu-linux-x64.sha256', 'huhu-linux-x64.compat.json', 'huhu-linux-x64']);
		f.requests.length = 0;
		assert.equal(await ensureCli({ ...f.options, offline: true }), file);
		assert.equal(await ensureCli(f.options), file);
		assert.deepEqual(f.requests, [], 'a receipt-verified file needs no network');
		fs.appendFileSync(file, 'x');
		await assert.rejects(ensureCli({ ...f.options, offline: true }), (e: unknown) => e instanceof BinaryError && e.code === 'offlineMissing');
	} finally { f.cleanup(); }
});

test('a wrong protocol major or helper pairing is refused before the executable is even downloaded', async () => {
	for (const bad of [{ cliProtocol: 2 }, { cliProtocol: 0 }, { helperProtocol: HELPER_PROTOCOL + 1 }]) {
		const f = release(bad);
		try {
			await assert.rejects(ensureCli(f.options), (e: unknown) => e instanceof BinaryError && e.code === 'incompatible');
			assert.ok(!f.requests.includes('huhu-linux-x64'), 'the binary is never fetched');
			assert.ok(!fs.existsSync(f.cliFile));
			assert.deepEqual(await diagnoseCli(f.options), { state: 'incompatible', reason: 'incompatible' });
		} finally { f.cleanup(); }
	}
	assert.doesNotThrow(() => assertCompatible({ cliProtocol: CLI_PROTOCOL_MAJOR, helperProtocol: HELPER_PROTOCOL }));
});

test('invalid, missing or foreign compatibility records and invalid digests never execute anything', async () => {
	const cases: Array<[Parameters<typeof release>[0], string]> = [
		[{ compat: null }, 'compatMissing'],
		[{ compat: '{not json' }, 'compatMissing'],
		[{ compat: JSON.stringify({ schema: 1, asset: 'huhu-darwin-x64', cliProtocol: 1, helperProtocol: 3, sha256: sha('x') }) }, 'compatMissing'],
		[{ compatSha: sha('some other build') }, 'incompatible'],
		[{ digest: 'zz' }, 'checksumMissing'],
		[{ digest: sha('not the published bytes'), compatSha: sha('not the published bytes') }, 'checksumMismatch'],
	];
	for (const [overrides, code] of cases) {
		const f = release(overrides);
		try {
			await assert.rejects(ensureCli(f.options), (e: unknown) => e instanceof BinaryError && e.code === code, code);
			assert.ok(!fs.existsSync(f.cliFile), `${code} leaves no executable behind`);
			assert.equal((await diagnoseCli(f.options)).state, code);
		} finally { f.cleanup(); }
	}
	assert.equal(parseCompatibility('null'), null);
	assert.equal(parseCompatibility(JSON.stringify({ schema: 2 })), null);
});

test('an older release (helper only) still serves the helper and reports the CLI as unavailable, never as compatible', async () => {
	const f = release({ compat: null });
	const old = async (url: string, limit: number) => {
		if (url.includes('/huhu-linux-x64')) throw new BinaryError('http', 'HTTP 404', { status: 404, url });
		return f.options.fetch(url, limit);
	};
	try {
		const helper = await ensureHelper({ ...f.options, fetch: old });
		assert.ok(fs.existsSync(helper));
		await assert.rejects(ensureCli({ ...f.options, fetch: old }), (e: unknown) => e instanceof BinaryError && e.code === 'compatMissing');
		assert.deepEqual(await diagnoseCli({ ...f.options, fetch: old }), { state: 'compatMissing', reason: 'compatMissing' });
		// Only a 404 is a fact about the release; a server error or a dropped connection stays a download failure.
		for (const failure of [new BinaryError('http', 'HTTP 503', { status: 503 }), new BinaryError('timeout', 'slow')])
			assert.equal((await diagnoseCli({ ...f.options, fetch: async () => { throw failure; } })).state, 'downloadFailed');
		// A new CLI next to an old helper pairing is a protocol error, and the verified helper is untouched.
		const mixed = release({ helperProtocol: 2 });
		try {
			await ensureHelper(mixed.options);
			await assert.rejects(ensureCli(mixed.options), (e: unknown) => e instanceof BinaryError && e.code === 'incompatible');
			assert.ok(fs.existsSync(path.join(mixed.dir, '.huhu/helpers/fixture-device/linux-x64', VERSION, 'huhu-pty-linux-x64')));
		} finally { mixed.cleanup(); }
	} finally { f.cleanup(); }
});

test('a stored receipt whose compatibility was never recorded is not reused', async () => {
	const f = release();
	try {
		await ensureCli(f.options);
		const stamp = path.join(path.dirname(f.cliFile), 'huhu-cli.json');
		const opened = JSON.parse(f.options.receipt.open((JSON.parse(fs.readFileSync(stamp, 'utf8')) as { proof: string }).proof)) as Record<string, unknown>;
		delete opened.detail;
		fs.writeFileSync(stamp, JSON.stringify({ proof: f.options.receipt.seal(JSON.stringify(opened)) }));
		await assert.rejects(ensureCli({ ...f.options, offline: true }), (e: unknown) => e instanceof BinaryError && e.code === 'compatMissing');
	} finally { f.cleanup(); }
});

test('a download failure is a state of its own, distinct from a refusal', async () => {
	const f = release();
	try {
		const failing = { ...f.options, fetch: async (url: string) => { throw new BinaryError('network', 'offline', { url }); } };
		assert.deepEqual(await diagnoseCli(failing), { state: 'downloadFailed', reason: 'network' });
		assert.deepEqual(await diagnoseCli({ ...f.options, offline: true }), { state: 'offlineMissing', reason: 'offlineMissing' });
		assert.equal((await diagnoseCli({ ...f.options, platform: 'win32', arch: 'arm64' })).state, 'unsupported');
	} finally { f.cleanup(); }
});

test('exposing compares against the verified digest: a stale copy is repaired and bytes changed after verification are never exposed', async () => {
	const f = release();
	try {
		const { file, sha256 } = await ensureCliVerified(f.options);
		assert.equal(sha256, sha(Buffer.from('cli-binary-v1')));
		const exposed = await exposeCli(f.options, file, sha256);
		assert.deepEqual(fs.readFileSync(exposed), Buffer.from('cli-binary-v1'));
		fs.writeFileSync(exposed, 'stale');
		assert.equal(await exposeCli(f.options, file, sha256), exposed);
		assert.deepEqual(fs.readFileSync(exposed), Buffer.from('cli-binary-v1'));
		// The asset changes between verification and exposure: refuse, and leave no partial file next to the target.
		fs.writeFileSync(exposed, 'stale');
		fs.appendFileSync(file, 'poison');
		await assert.rejects(exposeCli(f.options, file, sha256), (e: unknown) => e instanceof BinaryError && e.code === 'checksumMismatch');
		assert.deepEqual(fs.readdirSync(path.dirname(exposed)), ['huhu']);
		assert.equal(fs.readFileSync(exposed, 'utf8'), 'stale', 'the previous target is untouched by a refused copy');
	} finally { f.cleanup(); }
});

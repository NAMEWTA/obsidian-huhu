import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const toolchain = 'go1.26.10';
export const protocolVersion = '0.1';
export const schemaVersion = 1;
export const targets = Object.freeze([
	{ platform: 'linux', arch: 'x64', goos: 'linux', goarch: 'amd64' },
	{ platform: 'linux', arch: 'arm64', goos: 'linux', goarch: 'arm64' },
	{ platform: 'darwin', arch: 'x64', goos: 'darwin', goarch: 'amd64' },
	{ platform: 'darwin', arch: 'arm64', goos: 'darwin', goarch: 'arm64' },
	{ platform: 'win32', arch: 'x64', goos: 'windows', goarch: 'amd64' },
].map(target => Object.freeze({ ...target, id: `${target.platform}-${target.arch}`, asset: `huhu-bot-${target.platform}-${target.arch}${target.platform === 'win32' ? '.exe' : ''}` })));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const root = path.resolve(import.meta.dirname, '..');
export const moduleDirectory = path.join(root, 'native/huhubot');

export function targetFor(id) {
	const target = targets.find(item => item.id === id);
	assert.ok(target, `Unsupported huhu-bot target: ${id}`);
	return target;
}

export function goEnvironment(target, extra = {}) {
	return { ...process.env, ...extra, GOTOOLCHAIN: toolchain, GOWORK: 'off', GOFLAGS: '', GOEXPERIMENT: '', GOAMD64: 'v1', GOARM64: 'v8.0', CGO_ENABLED: '0', GOOS: target.goos, GOARCH: target.goarch };
}

export function sourceTreeHash(project = root) {
	const inputs = [];
	const visit = dir => {
		for (const item of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
			if (item.name === 'dist') continue;
			const file = path.join(dir, item.name);
			if (item.isDirectory()) visit(file);
			else if (item.isFile()) {
				const name = path.relative(project, file).split(path.sep).join('/');
				const bytes = readFileSync(file);
				// Git may check text out with CRLF on Windows; hash canonical compiler inputs.
				const input = /\.(?:go|sql|json|mjs|ts|md|txt|yaml|yml)$|\/go\.(?:mod|sum)$/.test(name) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
				inputs.push(`${name}\0${sha256(input)}\n`);
			}
		}
	};
	visit(path.join(project, 'native/huhubot'));
	visit(path.join(project, 'contracts/hap/v0.1'));
	return sha256(inputs.join(''));
}

export function verifyBotAsset(directory, target, version, expected = {}) {
	assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/, 'Invalid asset version');
	const bytes = readFileSync(path.join(directory, target.asset));
	assert.ok(bytes.length > 0, `${target.asset} must not be empty`);
	const digest = sha256(bytes);
	assert.equal(readFileSync(path.join(directory, `${target.asset}.sha256`), 'utf8').trim(), `${digest}  ${target.asset}`, `${target.asset} checksum mismatch`);
	const metadata = JSON.parse(readFileSync(path.join(directory, `${target.asset}.json`), 'utf8'));
	for (const [key, value] of Object.entries({ formatVersion: 1, asset: target.asset, platform: target.platform, arch: target.arch, goos: target.goos, goarch: target.goarch, version, toolchain, protocolVersion, schemaVersion, sha256: digest, ...expected })) {
		assert.equal(metadata[key], value, `${target.asset} metadata ${key} mismatch`);
	}
	assert.match(metadata.sourceRevision, /^[a-f0-9]{40}$/, 'Source revision must be a Git SHA');
	assert.match(metadata.sourceTreeHash, /^[a-f0-9]{64}$/, 'Source tree hash must be SHA-256');
	return metadata;
}

export function verifyBotAssets(directory, version, expected = {}) {
	const names = targets.flatMap(target => [target.asset, `${target.asset}.sha256`, `${target.asset}.json`]).sort();
	assert.deepEqual(readdirSync(directory).sort(), names, 'Release requires exactly all five huhu-bot targets, checksums and metadata');
	const metadata = targets.map(target => verifyBotAsset(directory, target, version, expected));
	assert.equal(new Set(metadata.map(item => item.sourceRevision)).size, 1, 'Bot targets must share one source revision');
	assert.equal(new Set(metadata.map(item => item.sourceTreeHash)).size, 1, 'Bot targets must share one source tree');
	return metadata;
}

export function buildBot(target, { project = root, version, revision, directory = path.join(project, 'native/huhubot/dist') } = {}) {
	version ??= JSON.parse(readFileSync(path.join(project, 'manifest.json'), 'utf8')).version;
	assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/, 'Invalid build version');
	revision ??= execFileSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8' }).trim();
	assert.match(revision, /^[a-f0-9]{40}$/, 'Invalid source revision');
	const env = goEnvironment(target);
	assert.equal(execFileSync('go', ['env', 'GOVERSION'], { env, encoding: 'utf8' }).trim(), toolchain, 'Go toolchain differs from the pinned version');
	mkdirSync(directory, { recursive: true });
	const binary = path.join(directory, target.asset);
	const sourceHash = sourceTreeHash(project);
	execFileSync('go', ['build', '-mod=readonly', '-trimpath', '-buildvcs=false', '-ldflags', `-X github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap.BuildVersion=${version}`, '-o', binary, './cmd/huhubot'], { cwd: path.join(project, 'native/huhubot'), env, stdio: 'inherit' });
	assert.equal(sourceTreeHash(project), sourceHash, 'Runner source inputs changed during the build; rebuild after the writer stops');
	const digest = sha256(readFileSync(binary));
	const metadata = { formatVersion: 1, asset: target.asset, platform: target.platform, arch: target.arch, goos: target.goos, goarch: target.goarch, version, toolchain, protocolVersion, schemaVersion, sha256: digest, sourceRevision: revision, sourceTreeHash: sourceHash };
	writeFileSync(`${binary}.sha256`, `${digest}  ${target.asset}\n`);
	writeFileSync(`${binary}.json`, `${JSON.stringify(metadata, null, 2)}\n`);
	verifyBotAsset(directory, target, version);
	console.log(`Built ${target.asset} (${toolchain}, HAP ${protocolVersion}, schema ${schemaVersion})`);
	return binary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const args = process.argv.slice(2);
	// 45m per package. The default 10m expires on macos-15-intel while the
	// private-memory seventy-turn capacity test is still polling GetRun.
	// That runner has 3 cores and `go test ./...` runs packages together.
	// Windows runners do the same with every package at once, and a finished
	// command is then reported as a timeout. One package at a time keeps the
	// assertions and the 3s shutdown bound. Assertions are unchanged.
	if (args.length === 1 && args[0] === '--test') {
		const testArgs = ['test', '-mod=readonly', '-timeout', '45m'];
		if (process.platform === 'win32') testArgs.push('-p', '1');
		testArgs.push('./...');
		execFileSync('go', testArgs, { cwd: moduleDirectory, env: goEnvironment(targetFor(`${process.platform}-${process.arch}`)), stdio: 'inherit' });
	}
	else if (args.length === 1 && args[0] === '--all') for (const target of targets) buildBot(target);
	else {
		assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--target'), 'Usage: build-huhu-bot.mjs [--target <platform-arch> | --all | --test]');
		buildBot(targetFor(args[1] ?? `${process.platform}-${process.arch}`));
	}
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { goEnvironment, protocolVersion, schemaVersion, sha256, sourceTreeHash, targetFor, targets, toolchain, verifyBotAsset, verifyBotAssets } from './build-huhu-bot.mjs';
import { architectureViolations, goImports } from './verify-huhu-bot-architecture.mjs';
import { smokeEnvironment, smokeProfile } from './verify-huhu-bot.mjs';

const scratch = [];
function directory() { const dir = mkdtempSync(path.join(tmpdir(), 'huhu-bot-build-test-')); scratch.push(dir); return dir; }
afterEach(() => { for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function asset(dir, target, patch = {}) {
	const digest = sha256(target.asset);
	writeFileSync(path.join(dir, target.asset), target.asset);
	writeFileSync(path.join(dir, `${target.asset}.sha256`), `${digest}  ${target.asset}\n`);
	writeFileSync(path.join(dir, `${target.asset}.json`), JSON.stringify({ formatVersion: 1, ...target, version: '1.0.0', toolchain, protocolVersion, schemaVersion, sha256: digest, sourceRevision: 'a'.repeat(40), sourceTreeHash: 'b'.repeat(64), ...patch }));
}
test('strict target union includes all five Bot targets with metadata and checksums', () => {
	const dir = directory(); for (const target of targets) asset(dir, target);
	assert.equal(verifyBotAssets(dir, '1.0.0').length, 5);
	writeFileSync(path.join(dir, 'unexpected'), 'x'); assert.throws(() => verifyBotAssets(dir, '1.0.0'), /exactly all five/);
	assert.throws(() => targetFor('win32-arm64'), /Unsupported/);
});
test('CLI rejects unsupported targets and missing target values before invoking Go', () => {
	for (const args of [['--target', 'plan9-x64'], ['--target'], ['--all', '--target', 'linux-x64']]) {
		const result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'build-huhu-bot.mjs'), ...args], { encoding: 'utf8' });
		assert.notEqual(result.status, 0); assert.match(result.stderr, /Unsupported huhu-bot target|Usage:/);
	}
});
test('rejects checksum, target, schema, protocol, version and toolchain mismatches', () => {
	const dir = directory(), target = targets[0];
	for (const [key, value] of Object.entries({ platform: 'darwin', arch: 'arm64', schemaVersion: 99, protocolVersion: '9', version: '9.9.9', toolchain: 'go1.27.1', sha256: '0'.repeat(64) })) {
		asset(dir, target, { [key]: value }); assert.throws(() => verifyBotAsset(dir, target, '1.0.0'), new RegExp(key));
	}
	asset(dir, target); writeFileSync(path.join(dir, target.asset), 'tampered'); assert.throws(() => verifyBotAsset(dir, target, '1.0.0'), /checksum mismatch/);
});
test('all targets must use the same exact source inputs', () => {
	const dir = directory(); for (const target of targets) asset(dir, target);
	asset(dir, targets[1], { sourceTreeHash: 'c'.repeat(64) }); assert.throws(() => verifyBotAssets(dir, '1.0.0'), /source tree/);
});
test('pins Go build environment regardless of inherited flags', () => {
	const env = goEnvironment(targets[0], { GOTOOLCHAIN: 'auto', CGO_ENABLED: '1', GOFLAGS: '-mod=mod', GOWORK: '/unsafe' });
	assert.equal(env.GOTOOLCHAIN, toolchain); assert.equal(env.CGO_ENABLED, '0'); assert.equal(env.GOFLAGS, ''); assert.equal(env.GOWORK, 'off');
});
test('source digest is stable across Windows text checkout and ignores output binaries', () => {
	const dir = directory(); mkdirSync(path.join(dir, 'native/huhubot/dist'), { recursive: true }); mkdirSync(path.join(dir, 'contracts/hap/v0.1'), { recursive: true });
	const file = path.join(dir, 'native/huhubot/main.go'); writeFileSync(file, 'package main\nfunc main() {}\n');
	const original = sourceTreeHash(dir); writeFileSync(file, 'package main\r\nfunc main() {}\r\n'); writeFileSync(path.join(dir, 'native/huhubot/dist/binary'), 'binary');
	assert.equal(sourceTreeHash(dir), original); writeFileSync(path.join(dir, 'contracts/hap/v0.1/schema.json'), '{}'); assert.notEqual(sourceTreeHash(dir), original);
});
test('native smoke uses a fresh OS managed root and no inherited credentials', () => {
	const dir = directory(), env = smokeEnvironment(dir);
	assert.equal(env.HOME, dir); assert.equal(env.USERPROFILE, dir); assert.equal(env.LOCALAPPDATA, path.join(dir, 'local'));
	assert.ok(smokeProfile(dir, 'darwin').includes('Application Support')); assert.ok(smokeProfile(dir, 'win32').includes('HUHU'));
	assert.ok(Object.keys(env).every(key => !/KEY|TOKEN|SECRET|PROXY/.test(key)));
});
test('Go import parser handles aliases, raw literals, comments and blocks', () => {
	assert.deepEqual(goImports('package p\n// import "ignored"\nimport alias "database/sql"\nimport (\n_ `github.com/provider/sdk` // comment\n . "fmt"\n)'), ['database/sql', 'github.com/provider/sdk', 'fmt']);
});
test('architecture rejects actual SQL, SDK, HAP, Obsidian and inbound outbound imports', () => {
	const dir = directory();
	const fixtures = [
		['domain/a.go', 'database/sql'], ['application/b.go', 'github.com/cloudwego/eino'],
		['application/c.go', 'github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap'],
		['domain/d.go', 'obsidian'], ['adapters/inbound/stdio/e.go', 'github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base'],
	];
	for (const [name, imported] of fixtures) { const file = path.join(dir, name); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `package fixture\nimport "${imported}"\n`); }
	const result = architectureViolations(dir); assert.equal(result.inspected, 5); assert.equal(result.violations.length, 5);
});
test('architecture accepts production domain/application dependency direction and refuses empty inspection', () => {
	const dir = directory(); assert.match(architectureViolations(dir).violations[0], /No production/);
	mkdirSync(path.join(dir, 'application')); writeFileSync(path.join(dir, 'application/service.go'), 'package application\nimport "context"\nimport "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/chat"');
	assert.deepEqual(architectureViolations(dir), { inspected: 1, violations: [] });
});

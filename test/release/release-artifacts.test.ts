import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	pluginAssets, terminalAssets, verifyPluginAssets, verifyTerminalAssets, verifyVersions, writeChecksums,
} from '../../scripts/verify-release-artifacts.mjs';

const root = process.cwd();
const version = (JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8')) as { version: string }).version;
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

const dirs: string[] = [];
const scratch = () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-release-'));
	dirs.push(dir);
	return dir;
};
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/**
 * A copy of the version files and plugin files as they are at a release commit. A leftover unreleased section of the
 * changelog is stripped from the copy, so the check also works while one is being drafted. Optionally with a
 * different changelog.
 */
function fakeRoot(changelog?: string) {
	const dir = scratch();
	for (const name of ['manifest.json', 'package.json', 'versions.json', 'LICENSE', 'NOTICE', ...pluginAssets]) copyFileSync(path.join(root, name), path.join(dir, name));
	const current = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').replace(/^## (未发布|Unreleased)\s*$[\s\S]*?(?=^## )/m, '');
	writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog ?? current);
	return dir;
}

describe('release versions', () => {
	it('accepts the repository at its own version', () => {
		expect(verifyVersions(fakeRoot(), version).version).toBe(version);
	});

	it('rejects a tag that differs from the manifest or carries a prefix', () => {
		expect(() => verifyVersions(fakeRoot(), '9.9.9')).toThrow(/Manifest version/);
		expect(() => verifyVersions(fakeRoot(), `v${version}`)).toThrow(/unprefixed/);
	});

	it('requires a changelog section for the tag and no unreleased section', () => {
		expect(() => verifyVersions(fakeRoot('# Changes\n\n## 9.9.9\n'), version)).toThrow(/needs a "## /);
		expect(() => verifyVersions(fakeRoot(`# Changes\n\n## 未发布\n\n## ${version}\n`), version)).toThrow(/unreleased/);
	});
});

describe('release assets', () => {
	it('accepts the committed plugin files and rejects a different bundle', () => {
		const release = fakeRoot();
		const dir = scratch();
		for (const name of pluginAssets) copyFileSync(path.join(root, name), path.join(dir, name));
		expect(() => verifyPluginAssets(release, version, dir)).not.toThrow();
		writeFileSync(path.join(dir, 'main.js'), readFileSync(path.join(root, 'main.js'), 'utf8') + '\nconsole.log(1);\n');
		expect(() => verifyPluginAssets(release, version, dir)).toThrow(/committed bundle/);
	});

	it('rejects omitted attribution even if another MIT or project-license mention remains', () => {
		const release = fakeRoot(), dir = scratch();
		for (const name of pluginAssets) copyFileSync(path.join(root, name), path.join(dir, name));
		const main = readFileSync(path.join(dir, 'main.js'), 'utf8');
		const notice = readFileSync(path.join(root, 'NOTICE'), 'utf8').replace(/\r\n/g, '\n').replaceAll('*/', '* /');
		writeFileSync(path.join(dir, 'main.js'), main.replace(notice, 'omitted attribution'));
		expect(() => verifyPluginAssets(release, version, dir)).toThrow(/complete NOTICE/);
	});

	/** The ten native assets of a release (helpers and CLIs), written the way terminal-build packages them. */
	function terminalDir(mutate?: (dir: string, cli: string[]) => void) {
		const dir = scratch();
		const schema = JSON.parse(readFileSync(path.join(root, 'src/shared/native/control-schema.json'), 'utf8')) as { protocolVersion: number; helperProtocol: number };
		const cli = terminalAssets.map((name) => name.replace('huhu-pty-', 'huhu-'));
		for (const name of [...terminalAssets, ...cli]) {
			writeFileSync(path.join(dir, name), name);
			writeFileSync(path.join(dir, `${name}.sha256`), `${sha256(name)}  ${name}\n`);
		}
		for (const name of cli) writeFileSync(path.join(dir, `${name}.compat.json`), JSON.stringify({ schema: 1, asset: name, cliProtocol: schema.protocolVersion, helperProtocol: schema.helperProtocol, sha256: sha256(name) }));
		mutate?.(dir, cli);
		return dir;
	}

	it('checks each helper and CLI binary against its checksum file', () => {
		expect(() => verifyTerminalAssets(terminalDir())).not.toThrow();
		expect(() => verifyTerminalAssets(terminalDir((dir) => writeFileSync(path.join(dir, terminalAssets[0]!), 'tampered')))).toThrow(/checksum mismatch/);
		expect(() => verifyTerminalAssets(terminalDir((dir, cli) => writeFileSync(path.join(dir, cli[2]!), 'tampered')))).toThrow(/checksum mismatch/);
	});

	it('requires all ten native assets and rejects a missing CLI or stray file', () => {
		expect(() => verifyTerminalAssets(terminalDir((dir, cli) => rmSync(path.join(dir, cli[0]!))))).toThrow(/exactly five helpers, five CLIs/);
		expect(() => verifyTerminalAssets(terminalDir((dir, cli) => rmSync(path.join(dir, `${cli[1]}.compat.json`))))).toThrow(/exactly five helpers, five CLIs/);
		expect(() => verifyTerminalAssets(terminalDir((dir) => writeFileSync(path.join(dir, 'huhu-extra'), 'x')))).toThrow(/exactly five helpers/);
	});

	it('rejects a CLI compatibility record for another binary, protocol major or helper protocol', () => {
		const rewrite = (change: (compat: Record<string, unknown>) => void) => terminalDir((dir, cli) => {
			const file = path.join(dir, `${cli[3]}.compat.json`), compat = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
			change(compat);
			writeFileSync(file, JSON.stringify(compat));
		});
		expect(() => verifyTerminalAssets(rewrite((c) => { c.cliProtocol = 2; }))).toThrow(/CLI protocol major/);
		expect(() => verifyTerminalAssets(rewrite((c) => { c.helperProtocol = 99; }))).toThrow(/helper protocol/);
		expect(() => verifyTerminalAssets(rewrite((c) => { c.sha256 = sha256('another build'); }))).toThrow(/describe the published binary/);
		expect(() => verifyTerminalAssets(rewrite((c) => { c.asset = 'huhu-linux-x64'; }))).toThrow(/name its own asset/);
		expect(() => verifyTerminalAssets(rewrite((c) => { c.extra = true; }))).toThrow(/unexpected fields/);
		expect(() => verifyTerminalAssets(terminalDir((dir, cli) => writeFileSync(path.join(dir, `${cli[0]}.compat.json`), '{oops')))).toThrow(/valid JSON/);
	});

	it('writes sha256sum lines for every file, sorted, without listing itself', () => {
		const dir = scratch();
		writeFileSync(path.join(dir, 'b.txt'), 'b');
		writeFileSync(path.join(dir, 'a.txt'), 'a');
		mkdirSync(path.join(dir, 'nested'));
		expect(writeChecksums(dir)).toEqual(['a.txt', 'b.txt']);
		expect(writeChecksums(dir)).toEqual(['a.txt', 'b.txt']);
		expect(readFileSync(path.join(dir, 'SHA256SUMS.txt'), 'utf8')).toBe(`${sha256('a')}  a.txt\n${sha256('b')}  b.txt\n`);
	});
});

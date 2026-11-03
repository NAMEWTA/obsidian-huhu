// Release checks, run by .github/workflows/release.yml and usable locally:
//   node scripts/verify-release-artifacts.mjs <version>                         versions, compatibility entry, changelog
//   node scripts/verify-release-artifacts.mjs <version> <terminal-dir>          + the five huhu-pty and five huhu binaries, checksums, CLI compatibility records
//   node scripts/verify-release-artifacts.mjs <version> --plugin <dir>          + main.js, manifest.json, styles.css (and zip)
//   node scripts/verify-release-artifacts.mjs <version> --sums <dir>            write SHA256SUMS.txt for every file in <dir>
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeBuildText } from './build-text-resources.mjs';

export const terminalAssets = [
	'linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'win32-x64.exe',
].map((target) => `huhu-pty-${target}`);

/** The local control CLI, built and published next to the helper for the same five platforms. */
export const cliAssets = [
	'linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'win32-x64.exe',
].map((target) => `huhu-${target}`);

const schemaPath = path.join(import.meta.dirname, '..', 'src/shared/native/control-schema.json');

export const pluginAssets = ['main.js', 'manifest.json', 'styles.css'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Tag, manifest, package, compatibility entry and changelog agree. */
export function verifyVersions(root, tag) {
	const readJson = (name) => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
	const manifest = readJson('manifest.json');
	assert.match(tag, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/, 'Release requires an unprefixed version tag');
	assert.equal(manifest.version, tag, 'Manifest version must equal the release tag');
	assert.equal(readJson('package.json').version, tag, 'Package version must equal the release tag');
	assert.equal(readJson('versions.json')[tag], manifest.minAppVersion, 'Version compatibility entry must match');
	const changelog = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
	assert.ok(new RegExp(`^## ${tag.replace(/\./g, '\\.')}\\s*$`, 'm').test(changelog), `CHANGELOG.md needs a "## ${tag}" section`);
	assert.ok(!/^## (未发布|Unreleased)\s*$/m.test(changelog), 'CHANGELOG.md still has an unreleased section');
	return manifest;
}

/**
 * The five helper and five CLI binaries match their published checksums, and every CLI carries a compatibility record
 * that names the protocol majors of the canonical control schema and the digest of that very binary.
 */
export function verifyTerminalAssets(artifacts) {
	const compatName = (name) => `${name}.compat.json`;
	const expected = [
		...terminalAssets.flatMap((name) => [name, `${name}.sha256`]),
		...cliAssets.flatMap((name) => [name, `${name}.sha256`, compatName(name)]),
	].sort();
	assert.deepEqual(readdirSync(artifacts).sort(), expected, 'Release requires exactly five helpers, five CLIs, their checksums and CLI compatibility records');
	for (const name of [...terminalAssets, ...cliAssets]) {
		const bytes = readFileSync(path.join(artifacts, name));
		assert.ok(bytes.length, `${name} must not be empty`);
		assert.equal(readFileSync(path.join(artifacts, `${name}.sha256`), 'utf8').trim(), `${sha256(bytes)}  ${name}`, `${name} checksum mismatch`);
	}
	const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
	for (const name of cliAssets) {
		let compat;
		try { compat = JSON.parse(readFileSync(path.join(artifacts, compatName(name)), 'utf8')); } catch { assert.fail(`${compatName(name)} must be valid JSON`); }
		assert.deepEqual(Object.keys(compat).sort(), ['asset', 'cliProtocol', 'helperProtocol', 'schema', 'sha256'], `${compatName(name)} has unexpected fields`);
		assert.equal(compat.schema, 1, `${compatName(name)} schema`);
		assert.equal(compat.asset, name, `${compatName(name)} must name its own asset`);
		assert.equal(compat.sha256, sha256(readFileSync(path.join(artifacts, name))), `${compatName(name)} must describe the published binary`);
		assert.equal(compat.cliProtocol, schema.protocolVersion, `${compatName(name)} CLI protocol major must match the control schema`);
		assert.equal(compat.helperProtocol, schema.helperProtocol, `${compatName(name)} helper protocol must match the control schema`);
	}
}

/** The files Obsidian installs: the manifest of this release, a licensed production bundle and the stylesheet. */
export function verifyPluginAssets(root, tag, dir) {
	const manifest = verifyVersions(root, tag);
	for (const name of pluginAssets) assert.ok(statSync(path.join(dir, name)).size > 0, `${name} must not be empty`);
	assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')), manifest, 'Packaged manifest.json must equal the repository manifest');
	const main = readFileSync(path.join(dir, 'main.js'), 'utf8');
	assert.ok(main.startsWith('/*'), 'main.js must start with the license banner');
	const banner = main.slice(0, main.indexOf('*/') + 2);
	assert.match(banner, /HUHU Source Available License 1\.0/, 'main.js banner must carry the HUHU license');
	for (const name of ['LICENSE', 'NOTICE']) {
		const original = normalizeBuildText(readFileSync(path.join(root, name), 'utf8')).replaceAll('*/', '* /');
		assert.ok(banner.includes(original), `main.js banner must carry the complete ${name}`);
	}
	assert.ok(!/sourceMappingURL=data:/.test(main), 'main.js must be a production build without an inline source map');
	assert.equal(sha256(readFileSync(path.join(dir, 'main.js'))), sha256(readFileSync(path.join(root, 'main.js'))), 'main.js must be the committed bundle');
	assert.equal(sha256(readFileSync(path.join(dir, 'styles.css'))), sha256(readFileSync(path.join(root, 'styles.css'))), 'styles.css must be the committed stylesheet');
	const zip = `${manifest.id}-${tag}.zip`;
	if (readdirSync(dir).includes(zip)) assert.ok(statSync(path.join(dir, zip)).size > 0, `${zip} must not be empty`);
}

/** `SHA256SUMS.txt` for every regular file in `dir` (sha256sum format). */
export function writeChecksums(dir) {
	const names = readdirSync(dir).filter((name) => name !== 'SHA256SUMS.txt' && statSync(path.join(dir, name)).isFile()).sort();
	const lines = names.map((name) => `${sha256(readFileSync(path.join(dir, name)))}  ${name}`);
	writeFileSync(path.join(dir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);
	return names;
}

/** Entry used by the release workflow. */
export function verifyReleaseArtifacts(root, tag, artifacts) {
	verifyVersions(root, tag);
	if (artifacts) verifyTerminalAssets(artifacts);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const [tag, ...rest] = process.argv.slice(2);
	const root = process.cwd();
	if (rest[0] === '--plugin') {
		verifyPluginAssets(root, tag, rest[1]);
		console.log(`Plugin assets for ${tag} verified`);
	} else if (rest[0] === '--sums') {
		verifyVersions(root, tag);
		console.log(`SHA256SUMS.txt: ${writeChecksums(rest[1]).length} files`);
	} else {
		verifyReleaseArtifacts(root, tag, rest[0]);
		console.log('Release versions and supplied assets verified');
	}
}

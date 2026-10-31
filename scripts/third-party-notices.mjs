// Generate THIRD-PARTY-NOTICES.md: the license of every npm package bundled into main.js (from the esbuild
// metafile) and of every crate linked into the huhu-pty helper or huhu CLI (from `cargo metadata`, dev-dependencies
// excluded). SPDX alternatives select permissive terms; every provided notice is retained.
// Usage: node scripts/third-party-notices.mjs --write | --check
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { pluginBuildOptions } from './esbuild-options.mjs';
import { browserCliOptions } from './browser-cli-options.mjs';
import { packageNotice } from './license-texts.mjs';
import { buildVersioningWorker } from './versioning-worker.mjs';
import { goNoticeSection, goPackages } from './huhu-bot-notices.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'THIRD-PARTY-NOTICES.md');
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : '';
if (!mode) throw new Error('Use --write or --check');

const sourcesDirectory = path.join(root, 'docs/third-party/licenses');
const overrides = JSON.parse(fs.readFileSync(path.join(sourcesDirectory, 'sources.json'), 'utf8'));

/** npm packages whose files end up in main.js. */
async function npmPackages() {
	const results = await Promise.all([
		pluginBuildOptions({ production: true }),
		browserCliOptions(),
		{ entryPoints: ['src/modules/browser/platform/desktop/runtime/worker.ts'], outfile: 'browser-worker.cjs', bundle: true, platform: 'node', format: 'cjs', external: ['electron'] },
	].map(options => esbuild.build({ ...options, write: false, metafile: true, logLevel: 'silent' })));
	const worker = await buildVersioningWorker();
	results.push(worker);
	const inputs = new Set(results.flatMap(result => Object.values(result.metafile.outputs).flatMap(output => Object.keys(output.inputs))));
	const packages = new Map();
	for (const input of inputs) {
		const at = input.lastIndexOf('node_modules/');
		if (at < 0) continue;
		// The package root is the folder right after the last node_modules/ (two segments for @scopes).
		const rest = input.slice(at + 'node_modules/'.length).split('/');
		const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
		if (packages.has(name)) continue;
		const dir = path.join(root, input.slice(0, at), 'node_modules', name);
		const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
		packages.set(name, { name, version: manifest.version, license: typeof manifest.license === 'string' ? manifest.license : manifest.license?.type ?? 'UNKNOWN', dir });
	}
	return [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** CSS and fonts are embedded in styles.css, outside esbuild's dependency graph. */
function stylePackages() {
 const packages = ['tailwindcss', 'tw-animate-css', 'sonner'].map((name) => {
  const dir = path.join(root, 'node_modules', name);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  return { name, version: manifest.version, license: manifest.license, dir };
 });
 packages.push({ name: 'Geist and Geist Mono fonts', version: '1.7.2', license: 'OFL-1.1', dir: path.join(root, 'src/ui/fonts') });
 packages.push({ name: 'SuliWorld font collection', version: 'bb73ca60dbc1169eb8d4c81fefb0c721ff7faf42', license: 'OFL-1.1', dir: path.join(root, 'src/theme/fonts') });
 return packages;
}

/** Crates in the helper's normal dependency graph, for every target platform. */
function cratePackages(manifest) {
	const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--format-version', '1', '--locked', '--manifest-path', path.join(root, manifest)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
	const byId = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
	const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
	const seen = new Set();
	const stack = [metadata.resolve.root];
	while (stack.length) {
		const id = stack.pop();
		for (const dep of nodes.get(id)?.deps ?? []) {
			if (!dep.dep_kinds.some((kind) => kind.kind === null || kind.kind === 'build')) continue;
			if (seen.has(dep.pkg)) continue;
			seen.add(dep.pkg);
			stack.push(dep.pkg);
		}
	}
	return [...seen].map((id) => byId.get(id)).map((pkg) => ({ name: pkg.name, version: pkg.version, license: pkg.license ?? 'UNKNOWN', dir: path.dirname(pkg.manifest_path) })).sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function section(title, intro, packages) {
	const lines = [`## ${title}`, '', intro, ''];
	for (const pkg of packages) {
		const notice = packageNotice(pkg, { sourcesDirectory, overrides, familyDirectory: path.join(root, 'node_modules/@xterm/xterm') });
		lines.push(`### ${pkg.name} ${pkg.version}`, '', `License: ${pkg.license}`, '', `Selected terms: ${notice.selected.join(' AND ')}`, '');
		if (notice.source) lines.push(notice.source, '');
		lines.push('```text\n' + notice.text + '\n```', '');
	}
	return lines.join('\n');
}

const npm = await npmPackages();
const crates = cratePackages('native/pty-server/Cargo.toml');
const browserCrates = cratePackages('native/browser-runtime/Cargo.toml');
const styles = stylePackages();
const go = goPackages();
const text = [
	'# Third-party notices',
	'',
	'Generated by `node scripts/third-party-notices.mjs --write`. HUHU original materials use HUHU Source Available License 1.0 (see LICENSE); third-party works retain their original licenses; attributions for adapted source code are in NOTICE.',
	'',
	section('Bundled in main.js and browser entry points', 'npm packages whose code is part of the plugin bundle, browser utility Worker or CLI/MCP entry. Generated from every JavaScript entry point.', npm),
	section('Embedded in styles.css', 'CSS and fonts embedded in the plugin stylesheet.', styles),
	section('Linked into huhu-pty', 'Rust crates compiled into the terminal helper (all platforms). Selected permissive terms are listed for each crate; every supplied notice, including AND obligations, is retained.', crates),
	section('Linked into huhu-browser-runtime', 'Rust crates compiled into the independent browser supervisor (Linux x64). Chromium ships with its original upstream license inventory in the complete runtime bundle.', browserCrates),
	goNoticeSection(go),
].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

if (mode === 'write') {
	fs.writeFileSync(out, text);
	console.log(`THIRD-PARTY-NOTICES.md: ${npm.length} npm packages, ${crates.length} terminal crates, ${browserCrates.length} browser crates, ${go.length} Go runtime/modules`);
} else {
	const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
	if (current !== text) {
		console.error('THIRD-PARTY-NOTICES.md is out of date; run node scripts/third-party-notices.mjs --write');
		process.exit(1);
	}
	console.log(`THIRD-PARTY-NOTICES.md is current (${npm.length} npm packages, ${crates.length} terminal crates, ${browserCrates.length} browser crates, ${go.length} Go runtime/modules)`);
}

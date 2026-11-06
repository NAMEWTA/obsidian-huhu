/** Upgrade guards: exercise the exact production transforms, including missed paths. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { build, transform } from 'esbuild';
import postcss from 'postcss';
import { scopeTailwind } from './scope-tailwind.mjs';
import { adaptSonnerStyles, sonnerStyles, createSonnerStyles } from './sonner-styles.mjs';
import { modalTransforms, radixOwnerDocument, createRadixOwnerDocument } from './radix-owner-document.mjs';
import { guardedAdapter } from './ui-adapter-guard.mjs';
import { draggableOwnerRealm, draggableTransforms } from './draggable-owner-realm.mjs';
import { diffsOwnerDocument, diffsTransforms } from './diffs-owner-document.mjs';
import { pluginBuildOptions } from './esbuild-options.mjs';

const manifest = JSON.parse(readFileSync(new URL('./ui-adapter-inputs.json', import.meta.url), 'utf8'));
let checks = 0;
const pnpm = path.resolve('node_modules/.pnpm');
const transforms = { 'sonner/dist/index.mjs': adaptSonnerStyles, ...modalTransforms, ...draggableTransforms, ...diffsTransforms };
const digest = source => createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex');
function reviewedSource(suffix) {
	for (const name of readdirSync(pnpm)) {
		try {
			const source = readFileSync(path.join(pnpm, name, 'node_modules', suffix), 'utf8');
			if (manifest[suffix].sha256.includes(digest(source))) return source;
		} catch {}
	}
	throw new Error(`No installed reviewed source for ${suffix}`);
}
for (const [suffix, adapt] of Object.entries(transforms)) {
	const sources = new Set();
	for (const name of readdirSync(pnpm)) {
		try {
			const source = readFileSync(path.join(pnpm, name, 'node_modules', suffix), 'utf8').replace(/\r\n/g, '\n');
			if (manifest[suffix].sha256.includes(digest(source))) sources.add(source);
		} catch {}
	}
	assert(sources.size > 0, suffix);
	for (const source of sources) {
		const output = adapt(source);
		assert.notEqual(output, source); await transform(output, { loader: 'js' }); checks++;
		// Removing all exact anchors must throw instead of silently emitting the old module.
		assert.throws(() => adapt('export const changedRelease = true;')); checks++;
		if (suffix.startsWith('sonner')) {
			assert(!output.includes('__insertCSS'));
			assert.throws(() => adapt(source + '\n__insertCSS("unexpected extra call");\n')); checks++;
		}
	}
}
// Optimized Tailwind may spell pseudo-elements with a single colon. Scope must
// precede the pseudo-element; otherwise Chrome ignores the entire declaration.
for (const pseudo of [':before', ':after', '::before', '::after']) {
	const selector = `.before\\:w-px${pseudo}`;
	const scoped = (await postcss([scopeTailwind()]).process(`${selector}{width:1px}`, { from: undefined })).css;
	assert(scoped.includes(`:not(#\\#)${pseudo}`));
	assert(!scoped.includes(`${pseudo}:is(`));
	checks++;
}
// Keep the component fixture's exact graph explicit and separate from production
// defaults, so future production-only dependency copies do not break fixtures.
const fixtureCounts = Object.fromEntries(Object.keys(modalTransforms).map(suffix => [suffix, 1]));
await build({ entryPoints: ['scripts/ui-review/fixtures/frontend-redesign/shared/theme.tsx'], outdir: path.join(os.tmpdir(), 'huhu-adapter-fixture'), bundle: true, write: false, jsx: 'automatic', platform: 'browser', format: 'iife', alias: { obsidian: path.resolve('scripts/obsidian-stub.ts') }, plugins: [createSonnerStyles({ 'sonner/dist/index.mjs': 1 }), createRadixOwnerDocument(fixtureCounts)], define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' }); checks++;
for (const counts of [{}, { unknown: 1 }, { 'sonner/dist/index.mjs': -1 }, { 'sonner/dist/index.mjs': 0.5 }]) {
	assert.throws(() => createSonnerStyles(counts), /graph contract/); checks++;
}
const fixture = mkdtempSync(path.join(os.tmpdir(), 'huhu-ui-adapters-'));
try {
	async function failure(plugin, files, expected) {
		const entryPoints = files.map(([name, source]) => {
			const file = path.join(fixture, name); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, source); return file;
		});
		const fixtureImports = { name: 'fixture-relative-imports', setup(builder) {
			builder.onResolve({ filter: /^\.\.?\// }, args => args.importer.startsWith(fixture + path.sep) ? { path: args.path, external: true } : undefined);
		} };
		await assert.rejects(build({ entryPoints, outdir: path.join(fixture, 'out'), bundle: true, write: false, plugins: [plugin, fixtureImports], packages: 'external', logLevel: 'silent' }), expected);
		checks++;
	}
	for (const [plugin, suffix] of [[sonnerStyles, 'sonner/dist/index.mjs'], [radixOwnerDocument, '@radix-ui/react-focus-scope/dist/index.mjs'], [draggableOwnerRealm, 'react-draggable/build/cjs/chunk-ACOTSM7X.mjs'], [diffsOwnerDocument, '@pierre/diffs/dist/components/web-components.js']]) {
		const expected = new RegExp(suffix.replaceAll('.', '\\.') + ': expected .* got 0');
		const folder = suffix.replace(/[^/]+$/, '');
		await failure(plugin, [[folder + 'renamed.mjs', 'export const renamed = true;']], expected);
		await failure(plugin, [[folder + 'index.js', 'exports.cjs = true;']], expected);
		await failure(plugin, [[suffix, 'export const changedRelease = true;']], /unreviewed source/);
		// Extra physical copies are also a graph change, even when source hashes match.
		const source = reviewedSource(suffix);
		const copies = Array.from({ length: manifest[suffix].files + 1 }, (_, i) => [`copy-${i}/${suffix}`, source]);
		await failure(plugin, copies, /expected .* matched files, got/);
	}
	// Fixture counts cannot turn off source checks, even for an expected-zero
	// input, or accept an unexpected observed dependency copy.
	const suffix = 'sonner/dist/index.mjs';
	await failure(createSonnerStyles({ [suffix]: 0 }), [[suffix, 'export const changedRelease = true;']], /unreviewed source/);
	const source = reviewedSource(suffix);
	await failure(createSonnerStyles({ [suffix]: 0 }), [[suffix, source]], /expected 0 matched files, got 1/);
	await failure(createRadixOwnerDocument(fixtureCounts), [['empty.mjs', 'export const empty = true;']], /expected 1 matched files, got 0/);
	// The guard's default remains the production count, independent of fixture factories.
	await failure(guardedAdapter('production-default', { [suffix]: adaptSonnerStyles }), [['empty.mjs', 'export const empty = true;']], /expected 1 matched files, got 0/);
} finally { rmSync(fixture, { recursive: true, force: true }); }
console.log(`UI adapters: ${checks} focused positive/negative checks passed (source, anchors, renamed/CJS entries, extra copies, explicit fixture graph).`);
// Always run the complete production graph too. A failure in an unmigrated
// consumer must remain a failing command, without suppressing focused results.
const options = pluginBuildOptions({ production: true });
await build({ ...options, write: false, logLevel: 'silent' });
console.log('UI adapters: full production graph passed.');

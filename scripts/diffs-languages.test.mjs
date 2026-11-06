import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
	createDiffsLanguages,
	DIFF_LANGUAGES,
	languageForFilename,
	transformDiffsBackend,
} from './diffs-languages.mjs';
import { buildVersioningWorker } from './versioning-worker.mjs';

test('one exact language policy, including shell aliases and unknown text', () => {
	assert.deepEqual(DIFF_LANGUAGES, [
		'markdown',
		'yaml',
		'json',
		'css',
		'javascript',
		'typescript',
		'html',
		'shellscript',
	]);
	for (const [name, lang] of Object.entries({
		'a.md': 'markdown',
		'a.yml': 'yaml',
		'a.json': 'json',
		'a.css': 'css',
		'a.js': 'javascript',
		'a.ts': 'typescript',
		'a.html': 'html',
		'a.sh': 'shellscript',
		'a.bash': 'shellscript',
		'a.py': 'text',
		'a.tsx': 'text',
		unknown: 'text',
	}))
		assert.equal(languageForFilename(name), lang);
});
test('fixed normal and hashed backend/theme inputs reject tampering and unknown release files', async () => {
	const base = fileURLToPath(new URL('../', import.meta.resolve('@pierre/diffs/worker/worker.js')));
	for (const name of [
		'highlighter/backends/shiki.js',
		'worker/shiki-Ci4cdHsM.js',
		'highlighter/backends/highlights.js',
		'worker/highlights-CpZm9DAR.js',
		'highlighter/themes/themeResolver.js',
		'worker/stream-tokenizer-DK9xp5M5.js',
	]) {
		const source = await readFile(base + name, 'utf8');
		const output = transformDiffsBackend(name, source);
		assert.doesNotMatch(
			output,
			/import\("(?:shiki\/(?:wasm|engine\/oniguruma)|@pierre\/highlights|@pierre\/theming\/themes)/,
		);
		assert.throws(() => transformDiffsBackend(name, source + ' '), /Unrecognized/);
	}
	assert.throws(() => transformDiffsBackend('worker/shiki-new.js', ''), /Unrecognized/);
});
function assertGraph(result) {
	for (const [file, input] of Object.entries(result.metafile.inputs)) {
		assert.doesNotMatch(file, /worker-portable|engine-oniguruma|wasm|@pierre\/highlights|@shikijs\/themes/);
		for (const dep of input.imports)
			if (dep.path !== '<runtime>')
				assert.equal(dep.external, undefined, `Unexpected runtime import: ${dep.path}`);
	}
	const grammar = Object.keys(result.metafile.inputs)
		.filter((name) => name.includes('@shikijs/langs/dist/'))
		.map((name) => name.split('/').at(-1));
	assert.equal(grammar.length, DIFF_LANGUAGES.length);
	for (const name of grammar) assert.ok(DIFF_LANGUAGES.includes(name.replace(/\.mjs$/, '')), name);
}
test('actual main and both worker graphs contain no unprovided or forbidden runtime', async () => {
	const main = await build({
		stdin: {
			contents:
				"import{FileDiff,CodeView,UnresolvedFile}from'@pierre/diffs/react';globalThis.views=[FileDiff,CodeView,UnresolvedFile]",
			resolveDir: process.cwd(),
		},
		bundle: true,
		write: false,
		metafile: true,
		format: 'iife',
		plugins: [createDiffsLanguages()],
		logLevel: 'silent',
	});
	assertGraph(main);
	for (const parse of [false, true]) {
		const worker = await buildVersioningWorker({ parse });
		assertGraph(worker);
		assert.ok(!Object.keys(worker.metafile.inputs).some((file) => /fflate|compressed-asset/.test(file)));
	}
});
test('a forbidden backend import fails closed', async () => {
	await assert.rejects(
		build({
			stdin: { contents: "import 'shiki/wasm'", resolveDir: process.cwd() },
			bundle: true,
			write: false,
			plugins: [createDiffsLanguages()],
			logLevel: 'silent',
		}),
		/Forbidden diffs runtime/,
	);
});

test('portable workers and full theme catalogs are rejected rather than silently distributed', async () => {
	for (const entry of ['@pierre/diffs/worker/worker-portable.js', '@pierre/theming/themes', 'shiki/themes'])
		await assert.rejects(
			build({
				stdin: { contents: `import ${JSON.stringify(entry)}`, resolveDir: process.cwd() },
				bundle: true,
				write: false,
				plugins: [createDiffsLanguages()],
				logLevel: 'silent',
			}),
			/Forbidden diffs runtime/,
		);
});

test('physical grammar inputs retain exact JSON, frozen entries and bounded encoded bytes', async () => {
	const { createRequire } = await import('node:module');
	const pierreRequire = createRequire(import.meta.resolve('@pierre/diffs'));
	const require = createRequire(pierreRequire.resolve('shiki/langs'));
	let encodedBytes = 0;
	for (const language of DIFF_LANGUAGES) {
		const entry = require.resolve('@shikijs/langs/' + language);
		const original = (await import(entry)).default;
		const result = await build({
			entryPoints: [entry],
			bundle: true,
			write: false,
			minify: true,
			format: 'cjs',
			plugins: [createDiffsLanguages()],
			logLevel: 'silent',
		});
		encodedBytes += result.outputFiles[0].contents.length;
		const module = { exports: {} };
		new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
		assert.equal(JSON.stringify(module.exports.default), JSON.stringify(original));
		assert.ok(module.exports.default.every(Object.isFrozen));
	}
	assert.ok(encodedBytes < 250_000, `grammar transport ${encodedBytes}`);
});

test('synchronous owner factories preserve exact worker bytes and release URLs on success and failure', async () => {
	const { versioningWorkerSource } = await import('./versioning-worker.mjs');
	const result = await build({
		entryPoints: ['src/modules/versioning/ui/diff/workers.ts'],
		bundle: true,
		write: false,
		format: 'cjs',
		plugins: [versioningWorkerSource],
		logLevel: 'silent',
	});
	const module = { exports: {} };
	new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
	for (const parse of [true, false]) {
		const expected = (await buildVersioningWorker({ parse })).outputFiles[0].text;
		for (const fail of [false, true]) {
			let blob, revoked;
			const owner = {
				Blob,
				URL: {
					createObjectURL(value) {
						blob = value;
						return 'blob:owner';
					},
					revokeObjectURL(url) {
						revoked = url;
					},
				},
				Worker: class {
					constructor(url) {
						assert.equal(url, 'blob:owner');
						if (fail) throw Error('owner worker failure');
					}
				},
			};
			const create = parse ? module.exports.createDiffWorker : module.exports.createHighlightWorker;
			if (fail) assert.throws(() => create(owner), /owner worker failure/);
			else assert.ok(create(owner) instanceof owner.Worker);
			assert.equal(revoked, 'blob:owner');
			assert.equal(await blob.text(), expected);
		}
	}
	assert.ok(result.outputFiles[0].contents.length < 300_000, 'worker transport remains bounded');
});

test('invalid encoded assets fail at decoding rather than becoming empty source', async () => {
	const result = await build({
		entryPoints: ['src/modules/versioning/ui/diff/compressed-asset.ts'],
		bundle: true,
		write: false,
		format: 'cjs',
		logLevel: 'silent',
	});
	const module = { exports: {} };
	new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
	assert.throws(() => module.exports.decodeAsset('not base64!'));
	assert.throws(() => module.exports.decodeAsset(btoa('not gzip')));
});

test('Pierre backend interception accepts POSIX and Windows physical paths', () => {
	const filters = [];
	createDiffsLanguages().setup({
		onResolve() {},
		onLoad(options) {
			filters.push(options.filter);
		},
	});
	const posix = '/repo/node_modules/@pierre/diffs/dist/highlighter/backends/shiki.js';
	const windows = posix.replaceAll('/', String.fromCharCode(92));
	assert.ok(filters.some((filter) => filter.test(posix) && filter.test(windows)));
});

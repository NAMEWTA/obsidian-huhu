import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import { adaptDiffsWebComponents, adaptDiffsInteraction, createDiffsOwnerDocument, DIFFS_WEB_COMPONENTS, DIFFS_INTERACTION } from './diffs-owner-document.mjs';

const graphCounts = (web = 1) => ({ [DIFFS_WEB_COMPONENTS]: web, [DIFFS_INTERACTION]: 0 });
const sourcePath = fileURLToPath(new URL('../node_modules/@pierre/diffs/dist/components/web-components.js', import.meta.url));

test('fixed web component source gains owner registration and adoption without changing installed source', async () => {
	const source = await readFile(sourcePath, 'utf8');
	const output = adaptDiffsWebComponents(source);
	await transform(output, { loader: 'js' });
	assert.match(output, /new win\.CSSStyleSheet/);
	assert.match(output, /adoptedCallback/);
	assert.match(output, /ensureDiffsOwnerDocument/);
	assert.equal(await readFile(sourcePath, 'utf8'), source);
	assert.throws(() => adaptDiffsWebComponents(source.replace('let sheet;', 'let changed;')), /anchor/);
});

test('virtual owner and normal physical entry are one guarded module', async () => {
	const result = await build({ stdin: { contents: `import ${JSON.stringify(sourcePath)};import {ensureDiffsOwnerDocument} from 'virtual:diffs-owner-document';globalThis.install=ensureDiffsOwnerDocument;`, resolveDir: process.cwd() },
		bundle: true, write: false, format: 'iife', metafile: true, plugins: [createDiffsOwnerDocument(graphCounts())], logLevel: 'silent' });
	assert.equal(Object.keys(result.metafile.inputs).filter(file => file.endsWith('/@pierre/diffs/dist/components/web-components.js')).length, 1);
	assert.match(result.outputFiles[0].text, /adoptedCallback/);
});

test('source, expected-zero, missing and extra physical graph inputs fail closed', async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'huhu-diffs-owner-guard-'));
	const source = await readFile(sourcePath, 'utf8');
	const externalImports = { name: 'fixture-relative-imports', setup(builder) { builder.onResolve({ filter: /^\.\.\// }, () => ({ path: 'fixture-import', external: true })); } };
	try {
		async function run(entries, counts) {
			const paths = [];
			for (const [name, contents] of entries) { const file = path.join(directory, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, contents); paths.push(file); }
			return build({ entryPoints: paths, outdir: path.join(directory, 'out'), write: false, bundle: true,
				plugins: [createDiffsOwnerDocument(counts ?? graphCounts()), externalImports], logLevel: 'silent' });
		}
		await assert.rejects(run([[DIFFS_WEB_COMPONENTS, source + '\n// changed release\n']]), /unreviewed source/);
		await assert.rejects(run([['renamed.js', 'export const renamed = true']]), /expected 1 matched files, got 0/);
		await assert.rejects(run([[DIFFS_WEB_COMPONENTS, source]], graphCounts(0)), /expected 0 matched files, got 1/);
		await assert.rejects(run([[`one/${DIFFS_WEB_COMPONENTS}`, source], [`two/${DIFFS_WEB_COMPONENTS}`, source]]), /expected 1 matched files, got 2/);
		await run([['empty.js', 'export const empty = true']], graphCounts(0));
		assert.throws(() => createDiffsOwnerDocument({ unknown: 1 }), /graph contract/);
	} finally { await rm(directory, { recursive: true, force: true }); }
});

test('pointer attach and detach retain the original physical document across adoption', async () => {
 const file = new URL('../node_modules/@pierre/diffs/dist/managers/InteractionManager.js', import.meta.url);
 const source = await readFile(file, 'utf8');
 const output = adaptDiffsInteraction(source);
 await transform(output, {loader:'js'});
 assert.match(output,/this\.pointerDocument = this\.pre\?\.ownerDocument/);
 assert.equal(output.split('this.pointerDocument.addEventListener(').length-1,3);
 assert.equal(output.split('this.pointerDocument?.removeEventListener(').length-1,3);
 assert.match(output,/this\.pointerDocument = undefined/);
 assert.throws(()=>adaptDiffsInteraction(source.replace('document.addEventListener("pointerup"','window.addEventListener("pointerup"')),/anchors/);
 assert.equal(await readFile(file,'utf8'),source);
});

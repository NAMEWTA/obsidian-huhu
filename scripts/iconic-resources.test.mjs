import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { iconicResources, encodeIconicResource } from './iconic-resources.mjs';

test('real lazy resource imports retain Unicode, default identity, mutability and physical inputs', async () => {
	const result = await build({
		stdin: {
			contents: `export {loadResourceData} from './src/modules/icons/platform/utils/resource-utils';export {decodeResource} from './src/modules/icons/platform/utils/compressed-resource';`,
			resolveDir: process.cwd(),
		},
		bundle: true,
		write: false,
		format: 'cjs',
		platform: 'browser',
		metafile: true,
		plugins: [iconicResources],
	});
	const module = { exports: {} };
	new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
	const { loadResourceData, decodeResource } = module.exports;
	const [a, b] = await Promise.all([loadResourceData(), loadResourceData()]);
	for (const [field, file] of [
		['lucideKeywords', 'lucide-keywords'],
		['emojis', 'emojis'],
	]) {
		const source = `src/modules/icons/core/res/${file}.json`;
		assert.ok(result.metafile.inputs[source]);
		assert.deepEqual(a[field], JSON.parse(readFileSync(source, 'utf8')));
		assert.strictEqual(a[field], b[field]);
		const row = a[field][0];
		assert.equal(Object.isFrozen(row), false);
		a[field].push(row);
		assert.strictEqual((await loadResourceData())[field].at(-1), row);
		a[field].pop();
	}
	assert.throws(() => decodeResource('!bad gzip!'));
});
test('fixed source assets reject unknown and changed inputs', () => {
	const source = readFileSync('src/modules/icons/core/res/emojis.json', 'utf8');
	assert.equal(
		encodeIconicResource('emojis.json', source),
		encodeIconicResource('emojis.json', source.replaceAll('\n', '\r\n')),
	);
	assert.throws(() => encodeIconicResource('unknown.json', '[]'), /Unknown Iconic/);
	assert.throws(() => encodeIconicResource('emojis.json', '[]'), /Unknown Iconic/);
});

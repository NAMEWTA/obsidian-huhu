/** Fixed @pierre/diffs 1.6.4 build boundary. Upstream: https://diffs.com/docs (Apache-2.0).
 * Keep the release implementation; prune unavailable backends/catalogs before bundling.
 */
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import policy from '../src/modules/versioning/ui/diff/language-policy.json' with { type: 'json' };
export const DIFF_LANGUAGES = Object.freeze(policy.languages);
export const DIFF_EXTENSIONS = Object.freeze(policy.extensions);
export function languageForFilename(name) {
	return DIFF_EXTENSIONS[name.split('.').at(-1)?.toLowerCase()] ?? 'text';
}
const hashes = {
	'highlighter/backends/shiki.js': '85d280043cb6c2450b5aff936034b600f249efba3f76f6d92f38b2f8b2ec44f7',
	'worker/shiki-Ci4cdHsM.js': 'e679383d7f0fa4af2ef7cbcd0f1b784e0bdcc3066a25b2098360032f14084f70',
	'highlighter/backends/highlights.js': '2e53825c49485283809ec7aca3d54150cece386125489a99789ef9b3cba7565f',
	'worker/highlights-CpZm9DAR.js': 'bc3eda94559b9ea5b6044b6cfefeee463887113621d3733b4f0088037c303485',
	'highlighter/themes/themeResolver.js': '30d574672a63baa544d206e5e3f4e17afb898d5d534953b8f2c92ec25e533723',
	'worker/stream-tokenizer-DK9xp5M5.js': '09aa3df575814eddd15b56f016068a37f6c443eeba2d52e561af017dd35ebe48',
};
const engine =
	'name === "shiki-wasm" ? (await import("shiki/engine/oniguruma")).createOnigurumaEngine(import("shiki/wasm")) : (await import("shiki/engine/javascript")).createJavaScriptRegexEngine()';
export function transformDiffsBackend(relative, source) {
	const expected = hashes[relative];
	if (!expected || createHash('sha256').update(source).digest('hex') !== expected)
		throw Error(`Unrecognized @pierre/diffs 1.6.4 source: ${relative}`);
	const replace = (from, to) => {
		if (source.split(from).length !== 2) throw Error(`Changed diffs anchor: ${relative}`);
		source = source.replace(from, to);
	};
	if (relative.includes('/shiki'))
		replace(engine, '(await import("shiki/engine/javascript")).createJavaScriptRegexEngine()');
	else if (relative.includes('/highlights'))
		source =
			'export class HighlightsHighlighter { static create() { throw Error("HUHU supports shiki-js only"); } constructor() { throw Error("HUHU supports shiki-js only"); } }';
	else {
		replace('import("@pierre/highlights/themes/loader")', 'Promise.resolve({ themes: {} })');
		replace(
			'import("@pierre/theming/themes")',
			'Promise.resolve({ themes: { getTheme() { return undefined; } } })',
		);
	}
	return source;
}
export function createDiffsLanguages({ compressGrammars = true } = {}) {
	return {
		name: 'huhu-diffs-languages',
		setup(build) {
			build.onResolve({ filter: /^virtual:diffs-languages$/ }, () => ({
				path: 'languages',
				namespace: 'huhu-diffs',
			}));
			build.onLoad({ filter: /.*/, namespace: 'huhu-diffs' }, () => ({
				loader: 'js',
				contents: `export const languages=${JSON.stringify(DIFF_LANGUAGES)};const extensions=${JSON.stringify(DIFF_EXTENSIONS)};export function languageForFilename(name){return extensions[name.split('.').at(-1)?.toLowerCase()]??'text'}`,
			}));
			build.onResolve({ filter: /^shiki\/langs$/ }, (args) => ({
				path: 'langs',
				namespace: 'huhu-shiki',
				pluginData: { resolveDir: args.resolveDir },
			}));
			build.onLoad({ filter: /.*/, namespace: 'huhu-shiki' }, (args) => ({
				loader: 'js',
				resolveDir: args.pluginData.resolveDir,
				contents: `export const bundledLanguages={${DIFF_LANGUAGES.map((lang) => `${JSON.stringify(lang)}:()=>import(${JSON.stringify('@shikijs/langs/' + lang)})`).join(',')}};export const bundledLanguagesBase=bundledLanguages;export const bundledLanguagesAlias={};`,
			}));
			build.onLoad({ filter: /[\\/]@shikijs[\\/]langs[\\/]dist[\\/].*\.mjs$/ }, async (args) => {
				const language = path.basename(args.path, '.mjs');
				if (!DIFF_LANGUAGES.includes(language)) throw Error(`Unprovided diff grammar: ${language}`);
				if (!compressGrammars) return;
				const source = await readFile(args.path, 'utf8');
				// Load the exact physical release input, including changed bytes in watch mode.
				const { default: grammar } = await import(
					pathToFileURL(args.path).href + '?sha256=' + createHash('sha256').update(source).digest('hex')
				);
				const encoded = gzipSync(JSON.stringify(grammar), { level: 9 }).toString('base64');
				return {
					loader: 'js',
					resolveDir: path.resolve(import.meta.dirname, '..'),
					contents: `import {decodeAsset} from './src/modules/versioning/ui/diff/compressed-asset.ts';export default JSON.parse(decodeAsset(${JSON.stringify(encoded)})).map(Object.freeze);`,
				};
			});
			build.onLoad({ filter: /[\\/]@pierre[\\/]diffs[\\/]dist[\\/].*\.js$/ }, async (args) => {
				const relative = args.path.replaceAll('\\', '/').split('/@pierre/diffs/dist/')[1];
				if (relative === 'worker/worker-portable.js') throw Error('Forbidden diffs runtime: worker-portable');
				if (!hashes[relative]) {
					if (
						/^(worker\/(shiki-|highlights-|stream-tokenizer-)|highlighter\/backends\/|highlighter\/themes\/themeResolver)/.test(
							relative,
						)
					)
						throw Error(`Unknown diffs backend: ${relative}`);
					return;
				}
				return {
					loader: 'js',
					resolveDir: path.dirname(args.path),
					contents: transformDiffsBackend(relative, await readFile(args.path, 'utf8')),
				};
			});
			build.onResolve(
				{
					filter: /^(shiki\/(wasm|themes|engine\/oniguruma)|@pierre\/highlights|@pierre\/theming\/themes|@pierre\/diffs\/worker\/worker-portable\.js)(\/|$)/,
				},
				(args) => {
					throw Error(`Forbidden diffs runtime: ${args.path}`);
				},
			);
		},
	};
}
export const diffsLanguages = createDiffsLanguages();

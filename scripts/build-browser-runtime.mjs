import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'src/modules/browser/platform/desktop/runtime');
const options = {
	absWorkingDir: root,
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node22',
	minify: true,
	legalComments: 'none',
	charset: 'utf8',
	external: ['electron'],
	logLevel: 'warning',
};
await build({
	...options,
	entryPoints: [path.join(directory, 'worker.ts')],
	outfile: path.join(root, 'browser-worker.cjs'),
	banner: { js: '/* HUHU browser utility worker. See LICENSE, NOTICE and THIRD-PARTY-NOTICES.md. */' },
});
const worker = await readFile(path.join(root, 'browser-worker.cjs'));
const sha256 = createHash('sha256').update(worker).digest('hex');
await writeFile(path.join(root, 'browser-worker.cjs.sha256'), sha256 + '  browser-worker.cjs\n');
await writeFile(path.join(directory, 'worker-digest.generated.json'), JSON.stringify({ sha256 }) + '\n');
const main = await build({ ...options, entryPoints: [path.join(directory, 'host-main.ts')], write: false });
await writeFile(
	path.join(directory, 'main-source.generated.json'),
	JSON.stringify({
		source: 'const module={exports:{}};\n' + main.outputFiles[0].text + '\nObject.assign(exports,module.exports);',
	}) + '\n',
);
console.log('browser runtime: Worker ' + sha256 + ' (' + worker.length + ' bytes); fixed host source generated');

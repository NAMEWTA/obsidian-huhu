import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { createDiffsLanguages } from './diffs-languages.mjs';

const root = path.resolve(import.meta.dirname, '..');
export const VERSIONING_WORKER_ENTRY = fileURLToPath(import.meta.resolve('@pierre/diffs/worker/worker.js'));
export const VERSIONING_PARSE_WORKER_ENTRY = 'src/modules/versioning/ui/diff/parse-worker.ts';

/** Both workers are self-contained, with the same language/backend policy as the main graph. */
export function buildVersioningWorker({ parse = false } = {}) {
	return esbuild.build({
		absWorkingDir: root,
		entryPoints: [parse ? VERSIONING_PARSE_WORKER_ENTRY : VERSIONING_WORKER_ENTRY],
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2021',
		minify: true,
		metafile: true,
		logLevel: 'silent',
		plugins: [createDiffsLanguages({ compressGrammars: false })],
	});
}

export const versioningWorkerSource = {
	name: 'huhu-versioning-worker',
	setup(build) {
		build.onResolve({ filter: /^virtual:versioning-(diff|parse)-worker$/ }, (args) => ({
			path: args.path,
			namespace: 'huhu-worker',
		}));
		build.onLoad({ filter: /.*/, namespace: 'huhu-worker' }, async (args) => {
			const result = await buildVersioningWorker({ parse: args.path.includes('-parse-') });
			const compressed = gzipSync(result.outputFiles[0].contents, { level: 9 });
			compressed[9] = 3; // Stable gzip OS metadata across Node/zlib platforms.
			return {
				loader: 'js',
				contents: `export default ${JSON.stringify(compressed.toString('base64'))};`,
				watchFiles: Object.keys(result.metafile.inputs).map((file) => path.resolve(root, file)),
			};
		});
	},
};

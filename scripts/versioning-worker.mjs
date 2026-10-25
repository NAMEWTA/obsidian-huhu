import path from 'node:path';
import * as esbuild from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
export const VERSIONING_WORKER_ENTRY = 'src/modules/versioning/ui/diff-worker.ts';

/** A separate self-contained browser build: host CodeMirror externals are not available inside a worker. */
export function buildVersioningWorker() {
	return esbuild.build({ absWorkingDir: root, entryPoints: [VERSIONING_WORKER_ENTRY], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2021', minify: true, metafile: true, logLevel: 'silent' });
}

export const versioningWorkerSource = {
	name: 'huhu-versioning-worker',
	setup(build) {
		build.onResolve({ filter: /^virtual:versioning-diff-worker$/ }, () => ({ path: 'diff-worker', namespace: 'huhu-worker' }));
		build.onLoad({ filter: /.*/, namespace: 'huhu-worker' }, async () => {
			const result = await buildVersioningWorker();
			return { loader: 'js', contents: `export default ${JSON.stringify(result.outputFiles[0].text)};`, watchFiles: Object.keys(result.metafile.inputs).map(file => path.resolve(root, file)) };
		});
	},
};

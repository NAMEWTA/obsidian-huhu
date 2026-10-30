import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

const repo = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

/** `.svg` and `.md` imports are bundled as text, matching the esbuild loaders in scripts/esbuild-options.mjs. */
const textResources: Plugin = {
	name: 'huhu-text-resources',
	enforce: 'pre',
	load(id: string) {
		const file = id.split('?')[0] ?? id;
		if (!/\.(svg|md)$/.test(file)) return null;
		return `export default ${JSON.stringify(readFileSync(file, 'utf8'))};`;
	},
};

const shared = {
	plugins: [textResources],
	oxc: { jsx: { runtime: 'automatic' as const, importSource: 'react' } },
};

/** Settings definition tests render against the Iconic stub, as their former esbuild bundles did. */
const iconicStubTests = ['src/app/settings/setting-definitions.test.ts', 'src/modules/icons/iconic-port.test.ts'];

// Real Git repositories and Chrome contend for subprocess startup and disk IO on Windows runners.
// Run these suites one at a time after the parallel in-process tests, preserving their existing deadlines.
// The documentation checker runs the real CLI 26 times against a real Git repository (26 Node and 26 Git processes).
// hook-spool's 32-scope case starts 96 real publisher processes (32 at once). In the parallel unit
// project they starved CPU-bound neighbours on 4-core Windows runners (agent-backup took 5 s instead
// of ~0.4 s) and were starved in turn; its bounds are unchanged, only the placement is serial.
const nativeIntegrationTests = ['test/release/documentation-checker.test.ts', 'src/modules/agent/platform/desktop/hooks/hook-spool.test.ts', 'test/sync/git-flow.test.ts', 'test/sync/git-boundary.test.ts', 'test/sync/git-history.test.ts', 'test/sync/git-restore-ack.test.ts', 'test/host/computed-surface.test.ts'];

// These HUHU tests build and launch the real Go runner. Keeping them in a
// single-worker project avoids three cold Go toolchain builds competing for
// the same temporary filesystem when the normal unit project is parallel.
const huhuBotIntegrationTests = [
	'src/modules/huhubot/services/events/runner.test.ts',
	'src/modules/huhubot/platform/desktop/transport/credentials-runner.test.ts',
	'src/modules/huhubot/platform/desktop/transport/runner.test.ts',
];

export default defineConfig({
	test: {
		projects: [
			{
				...shared,
				resolve: { alias: {
					obsidian: repo('./scripts/obsidian-stub.ts'),
					// The package's Node export disables layout effects; DOM tests need the real browser behavior.
					'react-resizable-panels': repo('./node_modules/react-resizable-panels/dist/react-resizable-panels.browser.development.js'),
				} },
				test: { name: 'dom', include: ['src/**/*.dom.test.tsx'], environment: 'happy-dom', setupFiles: ['./scripts/isolate-home.ts', './scripts/module-strings.ts', './scripts/dom-setup.ts'] },
			},
			{
				...shared,
				resolve: { alias: { obsidian: repo('./scripts/obsidian-stub.ts') } },
				test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.ts'], exclude: [...iconicStubTests, ...nativeIntegrationTests, ...huhuBotIntegrationTests, 'src/**/*.dom.test.tsx'], environment: 'node', setupFiles: ['./scripts/isolate-home.ts', './scripts/module-strings.ts'] },
			},
			{
				...shared,
				resolve: { alias: { obsidian: repo('./scripts/iconic-obsidian-stub.ts') } },
				test: { name: 'settings-iconic', include: iconicStubTests, environment: 'node', setupFiles: ['./scripts/isolate-home.ts', './scripts/module-strings.ts'] },
			},
			{
				...shared,
				resolve: { alias: { obsidian: repo('./scripts/obsidian-stub.ts') } },
				test: { name: 'native-integration', include: nativeIntegrationTests, environment: 'node', setupFiles: ['./scripts/isolate-home.ts', './scripts/module-strings.ts'], fileParallelism: false, maxWorkers: 1, sequence: { groupOrder: 1 } },
			},
			{
				...shared,
				resolve: { alias: { obsidian: repo('./scripts/obsidian-stub.ts') } },
				test: { name: 'huhu-bot-integration', include: huhuBotIntegrationTests, environment: 'node', setupFiles: ['./scripts/isolate-home.ts', './scripts/module-strings.ts'], fileParallelism: false, maxWorkers: 1, sequence: { groupOrder: 2 } },
			},
		],
	},
});

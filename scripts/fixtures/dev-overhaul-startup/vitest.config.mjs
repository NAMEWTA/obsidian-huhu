import { defineConfig } from 'vitest/config';
const { resolve } = await import('node:path');
const { readFileSync } = await import('node:fs');
export default defineConfig({
	plugins: [{ name: 'text', enforce: 'pre', load(id) { if (/\.(svg|md)$/.test(id)) return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`; } }],
	resolve: { alias: { obsidian: resolve('scripts/obsidian-stub.ts'), electron: resolve('scripts/fixtures/dev-overhaul-startup/electron.mjs') } },
	test: { include: ['scripts/fixtures/dev-overhaul-startup/activation.test.ts'], environment: 'node', setupFiles: ['scripts/isolate-home.ts', 'scripts/module-strings.ts'], fileParallelism: false },
});

import { defineConfig } from 'vitest/config';
import path from 'node:path';
const root=process.cwd();
export default defineConfig({oxc:{jsx:{runtime:'automatic',importSource:'react'}},resolve:{alias:{'@repo':root,obsidian:path.join(root,'scripts/obsidian-stub.ts')}},test:{include:['.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/diagnostics/T-19/projection.dom.test.tsx'],environment:'happy-dom',setupFiles:['scripts/isolate-home.ts','scripts/module-strings.ts','scripts/dom-setup.ts'],fileParallelism:false}});

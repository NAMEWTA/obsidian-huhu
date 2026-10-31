import path from 'node:path';

/** The CLI/MCP entry shares protocol validation with the plugin, with no Electron dependency. */
export function browserCliOptions() {
 return {
  absWorkingDir: path.resolve(import.meta.dirname, '..'),
  entryPoints: ['src/modules/browser/platform/desktop/cli.ts'],
  outfile: 'browser-cli.cjs', bundle: true, platform: 'node', format: 'cjs',
  target: 'node22', minify: true, charset: 'utf8', legalComments: 'none',
  banner: { js: '#!/usr/bin/env node\n/* HUHU browser CLI and MCP server. See LICENSE, NOTICE and THIRD-PARTY-NOTICES.md. */' },
  logLevel: 'warning',
 };
}

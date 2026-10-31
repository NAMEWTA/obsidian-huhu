import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { browserCliOptions } from './browser-cli-options.mjs';

await build(browserCliOptions());
const bytes = await readFile(new URL('../browser-cli.cjs', import.meta.url));
const hash = createHash('sha256').update(bytes).digest('hex');
await writeFile(new URL('../browser-cli.cjs.sha256', import.meta.url), `${hash}  browser-cli.cjs\n`);
console.log(`browser CLI/MCP: ${bytes.length} bytes; SHA-256 ${hash}`);

import { build, transform } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';

const task = '.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/012-foundation-client-repair';
const oldPath = '/tmp/huhu-foundation-review/connection.cjs';
const baseline = await readFile(oldPath, 'utf8');
const current = await build({ entryPoints: ['src/modules/huhubot/core/protocol/connection.ts'], bundle: true, write: false, minify: true, format: 'cjs', platform: 'browser', target: 'es2021', metafile: true, logLevel: 'silent' });
const oldMinified = (await transform(baseline, { minify: true, format: 'cjs', target: 'es2021' })).code;
const currentCode = current.outputFiles[0].text;
const fixtures = JSON.parse(await readFile('contracts/hap/v0.1/fixtures/methods.json', 'utf8'));
const hello = fixtures.cases.find((entry) => entry.valid && entry.method === 'protocol.hello' && entry.part === 'result').value;
function frame(id, result) {
	const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id, result }));
	const bytes = Buffer.alloc(body.length + 5); bytes.writeUInt32BE(body.length + 1); bytes[4] = 1; body.copy(bytes, 5); return bytes;
}
async function measure(code) {
	const module = { exports: {} };
	runInNewContext(code, { module, exports: module.exports, TextEncoder, TextDecoder, console });
	const Peer = class { onData(callback) { this.data = callback; return () => { this.data = undefined; }; } onClose(callback) { this.ended = callback; return () => { this.ended = undefined; }; } send() { return Promise.resolve(); } close() { this.ended?.(new Error('EOF')); } reply(id, value) { this.data(frame(id, value)); } };
	const peer = new Peer();
	const connection = new module.exports.HapConnection(peer, { after: () => () => undefined });
	const start = performance.now();
	const connecting = connection.connect({ name: 'measurement', version: '1' });
	const paramsMs = performance.now() - start;
	const resultStart = performance.now(); peer.reply('c:1', hello); const client = await connecting;
	const resultMs = performance.now() - resultStart;
	const firstHealthStart = performance.now(); const firstHealth = client.service.health({}); peer.reply('c:2', { status: 'ok' }); await firstHealth;
	const firstHealthMs = performance.now() - firstHealthStart;
	const warmStart = performance.now();
	for (let i = 0; i < 1000; i++) { const request = client.service.health({}); peer.reply(`c:${i + 3}`, { status: 'ok' }); await request; }
	const warmPerCallMs = (performance.now() - warmStart) / 1000;
	client.close(); return { coldHelloParamsMs: paramsMs, coldHelloResultMs: resultMs, firstHealthMs, warmHealthPerCallMs: warmPerCallMs };
}
const oldBytes = Buffer.byteLength(oldMinified); const newBytes = Buffer.byteLength(currentCode);
const results = { node: process.version, platform: process.platform, arch: process.arch, baseline: { path: oldPath, sha256: createHash('sha256').update(baseline).digest('hex'), minifiedBytes: oldBytes, gzipBytes: gzipSync(oldMinified).length }, current: { source: 'src/modules/huhubot/core/protocol/connection.ts', sha256: createHash('sha256').update(currentCode).digest('hex'), minifiedBytes: newBytes, gzipBytes: gzipSync(currentCode).length, externalImports: Object.values(current.metafile.outputs).flatMap((output) => output.imports).filter((entry) => entry.external) }, deltaMinifiedBytes: newBytes - oldBytes, baselineTiming: await measure(oldMinified), currentTiming: await measure(currentCode), caveat: 'Single local cold VM and 1000 warm synthetic health calls; browser-platform isolated BotClient bundle, not main.js or Obsidian timing. Baseline is the retained independent reviewer bundle from frozen pre-repair source. No model requests.' };
await writeFile(`${task}/logs/runtime-measurement.json`, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));

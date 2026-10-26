import { spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { assemble, sha256, CHROME_ARCHIVE_SHA256, CHROME_URL } from './assemble-browser-runtime.mjs';

const [helper, output, cacheInput] = process.argv.slice(2);
if (!helper || !output) throw Error('Usage: node scripts/install-browser-runtime.mjs <helper> <new-bundle-dir> [download-cache-dir]');
if (process.platform !== 'linux' || process.arch !== 'x64') throw Error('Only Linux x64 has passed the native containment gate.');
const cache = path.resolve(cacheInput ?? path.join(path.dirname(output), 'browser-download-cache'));
await fs.mkdir(cache, { recursive: true, mode: 0o700 });
const zip = path.join(cache, CHROME_ARCHIVE_SHA256 + '.zip');
let valid = false;
try { valid = await sha256(zip) === CHROME_ARCHIVE_SHA256; } catch {}
if (!valid) {
 const temporary = zip + '.download';
 await fs.rm(temporary, { force: true });
 const response = await fetch(CHROME_URL, { redirect: 'error', signal: AbortSignal.timeout(300000) });
 if (!response.ok || !response.body || Number(response.headers.get('content-length')) > 400 * 1024 * 1024) throw Error('Pinned Chromium download failed.');
 let bytes = 0;
 const bounded = async function* (source) { for await (const chunk of source) { bytes += chunk.length; if (bytes > 400 * 1024 * 1024) throw Error('Chromium archive limit exceeded'); yield chunk; } };
 try { await pipeline(Readable.fromWeb(response.body), bounded, createWriteStream(temporary, { flags: 'wx', mode: 0o600 })); if (await sha256(temporary) !== CHROME_ARCHIVE_SHA256) throw Error('Pinned Chromium archive SHA256 mismatch'); await fs.rename(temporary, zip); }
 finally { await fs.rm(temporary, { force: true }); }
}
const extraction = await fs.mkdtemp(path.join(cache, 'extract-'));
try {
 // The exact archive hash above pins both archive paths and upstream browser bits.
 await new Promise((resolve,reject)=>{ const child=spawn('unzip',['-q',zip,'-d',extraction],{stdio:'inherit'}); child.on('error',reject); child.on('close',status=>status===0?resolve():reject(Error('Chromium extraction failed'))); });
 await assemble({ chromium: path.join(extraction,'chrome-linux64'), helper: path.resolve(helper), worker: path.resolve('browser-worker.cjs'), output: path.resolve(output) });
} finally { await fs.rm(extraction,{recursive:true,force:true}); }

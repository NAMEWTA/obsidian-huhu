import { launch, pause } from './harness.mjs'; import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
const [,, dir, out, widths = '1440', only = ''] = process.argv; fs.mkdirSync(out, { recursive: true });
const b = await launch(); const url = pathToFileURL(dir + '/index.html').href;
await b.open(url, 1440);
const pages = await b.ev('[...document.querySelectorAll("#page-picker option")].map(o=>o.value)');
for (const w of widths.split(',').map(Number)) { await b.size(w, 900);
  for (const p of pages) { if (only && !only.split(',').includes(p)) continue; await b.choose('#page-picker', p); const states = await b.ev('[...document.querySelectorAll("#state-picker option")].map(o=>o.value)');
    for (const s of states) { await b.choose('#state-picker', s); await pause(250); const ok = await b.overflow(); await b.shot(`${out}/${p}-${s}-${w}.png`); if (!ok) console.log('OVERFLOW', p, s, w); await b.ev('document.querySelectorAll(".overlay,.popover,.cmd-overlay").forEach(e=>e.remove())'); } } }
console.log('errors', JSON.stringify(b.errors.slice(0, 20))); await b.close();

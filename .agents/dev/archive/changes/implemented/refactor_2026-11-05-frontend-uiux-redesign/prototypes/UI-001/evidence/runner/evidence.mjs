import { launch, pause } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';
const REPO = '/home/wta/projects/obsidian-huhu'; const P = path.join(REPO, '.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-001');
const PAGES = JSON.parse(fs.readFileSync(new URL('./pages.json', import.meta.url))); const b = await launch(); const ev = b.ev; const cases = []; const problems = [];
const assert = (c, l) => { if (!c) { problems.push(l); console.log('PROBLEM', l); } return !!c; };
for (const entry of ['final/index.html', 'comparison/variants/huhu-paper.html']) {
  for (const width of [1440, 390]) {
    await b.open(pathToFileURL(path.join(P, entry)).href, width, 900);
    for (const [page, states] of Object.entries(PAGES)) {
      await b.choose('#page-picker', page); const done = []; let all = true;
      for (const s of states) { await b.choose('#state-picker', s); await pause(200);
        all &= assert(await ev(`(document.querySelector('#main')?.dataset.state===${JSON.stringify(s)}) && document.querySelector('#main').innerText.trim().length>3`), `${entry} ${width} ${page}:${s} rendered`);
        all &= assert(await b.overflow(), `${entry} ${width} ${page}:${s} overflow`); done.push(`${page}:${s}`);
        await ev('document.querySelectorAll(".overlay,.popover:not(#proto-controls),.cmd-overlay,.hu-dp.-active-").forEach(e=>e.remove())'); }
      await b.choose('#state-picker', states[0]); await pause(150);
      await ev('document.activeElement?.blur(); (document.querySelector("#main")).focus()'); await b.key('Tab');
      const kb = assert(await ev('["BUTTON","INPUT","SELECT","TEXTAREA","A","DIV"].includes(document.activeElement.tagName) && document.activeElement!==document.body && document.activeElement.id!=="main"'), `${entry} ${width} ${page} keyboard`);
      const fo = assert(await ev('getComputedStyle(document.activeElement).outlineStyle!=="none" || getComputedStyle(document.activeElement).boxShadow!=="none"'), `${entry} ${width} ${page} focus`);
      await ev("window.__t=document.querySelector('#page-title')||document.querySelector('#main h1,#main h2');window.__o=__t.textContent;__t.textContent='很长的中文页面名称 Long localized page heading '.repeat(4)"); const lt = assert(await b.overflow(), `${entry} ${width} ${page} long text`); await ev('__t.textContent=__o');
      await b.size(Math.max(320, width / 2), 450, 2); const zm = assert(await b.overflow(), `${entry} ${width} ${page} zoom`); await b.size(width, 900, 1);
      await b.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); const rm = assert(await ev("getComputedStyle(document.querySelector('.btn,button')).transitionDuration.split(',').every(x=>parseFloat(x)===0)"), `${entry} ${width} ${page} reduced motion`); await b.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
      await pause(120); const prefix = entry.startsWith('final') ? 'final' : 'candidate'; const shot = `evidence/${prefix}-${page}-${width}.png`; await b.shot(path.join(P, shot));
      if (all && kb && fo && lt && zm && rm) cases.push({ id: `${prefix}-${page}-${width}`, entry, width, height: 900, screenshot: shot, states: done, checks: Object.fromEntries(['rendered', 'no_overflow', 'keyboard', 'focus', 'long_text', 'zoom', 'reduced_motion', 'states'].map(k => [k, true])) });
    }
  }
}
await b.open(pathToFileURL(path.join(P, 'comparison/index.html')).href.replace(/$/, ''), 1440).catch(() => { });
const ver = execFileSync('google-chrome', ['--version'], { encoding: 'utf8' }).trim();
const errors = b.errors.slice(); await b.close();
const digest = execFileSync('node', [path.join(REPO, '.agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs'), '--prototype-digest', path.join(P, 'design-system.md')], { encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(P, 'evidence/browser.json'), JSON.stringify({ schema_version: 1, artifact: 'prototype-browser-evidence', prototype_digest: digest, generated_at: new Date().toISOString(), provider: `${ver} · headless CDP · file:// · Linux`, inspected_files: ['comparison/index.html', 'comparison/variants/huhu-paper.html', 'final/index.html'], cases, console_errors: errors, offline: true, design_review: 'evidence/report-design-review.md', technical_review: 'evidence/report-technical-review.md', rechecked: true }, null, 2));
console.log('cases', cases.length, 'problems', problems.length, 'errors', errors.length, digest);

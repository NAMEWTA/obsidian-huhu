// Assemble UI-001 final/ from scratch sources. Vendor files are embedded verbatim.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [,, out, repo] = process.argv; const here = path.dirname(new URL(import.meta.url).pathname); const air = path.join(here, '..', 'air');
const rd = f => fs.readFileSync(f, 'utf8'); const sha = b => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
const airLicense = rd(path.join(air, 'LICENSE.md')).trim(); const lucideLicense = rd(path.join(repo, 'node_modules/lucide-react/LICENSE')).trim();
const css = [
  `/* HUHU UI-001 final prototype styles.\n * Section 1 embeds Air Datepicker 3.6.0 dist/air-datepicker.css verbatim\n * (https://github.com/t1m0n/air-datepicker @ f2510b92d9cff5ae53d0f0ba3d8443be2eeba544, git blob 0798cd6c9bf41bc762ab7a4b64464db19aecee24, MIT).\n * Sections 2+ are HUHU tokens/components written for this change. Fonts: Geist / Geist Mono (SIL OFL 1.1, fonts/LICENSE-Geist.txt). */`,
  '/* ===== 1. vendor: air-datepicker.css (unmodified) ===== */', rd(path.join(air, 'air-datepicker.css')),
  ...['20-tokens.css', '30-base.css', '40-components.css', '50-shell.css', '60-pages.css'].map(f => rd(path.join(here, 'css', f))),
].join('\n');
const js = [
  `/* HUHU UI-001 final prototype script. Demo state only.\n *\n * Embedded third-party code:\n * - Air Datepicker 3.6.0 dist/air-datepicker.js (git blob e059549c90fb52bc4b63d2e5374b0ec08997cdd4) and\n *   dist/locale/zh.js (git blob 4a2b48ba4f8f736169c8e01ad97c8b4b9037d560), verbatim, from\n *   https://github.com/t1m0n/air-datepicker @ f2510b92d9cff5ae53d0f0ba3d8443be2eeba544.\n * - Lucide icon path data v0.577.0 (node_modules/lucide-react).\n *\n * ---- Air Datepicker LICENSE.md ----\n${airLicense.replace(/\*\//g, '* /')}\n *\n * ---- Lucide LICENSE ----\n${lucideLicense.replace(/\*\//g, '* /')}\n */`,
  '/* ===== vendor: air-datepicker.js (unmodified; UMD assigns window.AirDatepicker) ===== */',
  rd(path.join(air, 'air-datepicker.js')),
  '/* ===== vendor: air-datepicker locale zh.js (unmodified CommonJS, given a local exports scope) ===== */',
  '(function () { var exports = {};', rd(path.join(air, 'zh.js')), 'window.__airLocaleZh = exports.default; })();',
  ...['10-icons.js', '20-core.js', '30-data.js', '40-home-tasks.js', '50-archives-automations.js', '60-agent-diary-notify-safe.js', '70-versions-health-notes-settings.js'].map(f => rd(path.join(here, 'js', f))),
].join('\n');
fs.writeFileSync(path.join(out, 'styles.css'), css.replace(/\s+$/, '') + '\n');
fs.writeFileSync(path.join(out, 'app.js'), js.replace(/\s+$/, '') + '\n');
fs.writeFileSync(path.join(out, 'index.html'), rd(path.join(here, 'index.html')).replace(/\s+$/, '') + '\n');
for (const f of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2']) fs.copyFileSync(path.join(repo, 'src/ui/fonts', f), path.join(out, 'fonts', f));
fs.copyFileSync(path.join(repo, 'src/ui/fonts/LICENSE.txt'), path.join(out, 'fonts/LICENSE-Geist.txt'));
for (const f of ['index.html', 'styles.css', 'app.js']) console.log(f, fs.statSync(path.join(out, f)).size, sha(fs.readFileSync(path.join(out, f))));

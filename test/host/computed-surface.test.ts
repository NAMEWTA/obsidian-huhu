import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchiveCardGrid } from '../../src/modules/archives/ui/ArchiveCardGrid';
import { PipelineConfig } from '../../src/modules/home/ui/pipeline/PipelineConfig';
import { PortalContainerContext } from '../../src/ui/react/contexts';
import { emptyPipeline } from '../../src/modules/home/core/pipeline/model';
import { contrastRatio, rgbToHex, type Rgb } from '../../src/theme/color';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, test, vi } from 'vitest';
import { build } from 'esbuild';

// Skill pickers own client-only portals; the configuration's fields, scope and footer are rendered unchanged.
vi.mock('../../src/modules/home/ui/quickbar/SkillList', () => ({ SkillList: () => null }));

const styles = pathToFileURL(path.resolve('styles.css')).href;
const chromeExecutable = process.env.HUHU_CHROME_EXECUTABLE ?? [
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(candidate => existsSync(candidate)) ?? 'google-chrome';
const fixtures: string[] = [];
afterEach(() => {
	for (const directory of fixtures.splice(0)) {
		assert.equal(path.dirname(directory), path.resolve(tmpdir()));
		assert.ok(path.basename(directory).startsWith('huhu-surface-'));
		// A just-killed Windows Chrome may hold its profile briefly.
		rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
	}
});

type ChromeRun = { status: number | null; stdout: string; stderr: string; timedOut: boolean };

/** Run headless Chrome once; a hung browser is killed with its whole process tree so it cannot slow later suites. */
function runChrome(args: string[], deadline: number): Promise<ChromeRun> {
	return new Promise((resolve) => {
		const posix = process.platform !== 'win32';
		const child = spawn(chromeExecutable, args, { windowsHide: true, detached: posix });
		let stdout = '', stderr = '', timedOut = false, settled = false;
		const settle = (status: number | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ status, stdout, stderr, timedOut });
		};
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
		child.on('error', (error) => { stderr += String(error); settle(null); });
		child.on('close', settle);
		const timer = setTimeout(() => {
			timedOut = true;
			// Killing only chrome.exe leaves renderer/GPU children consuming the runner on Windows.
			if (child.pid === undefined) return;
			if (posix) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ } }
			else spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
			child.once('exit', () => settle(null));
		}, deadline);
	});
}

async function chrome<T>(html: string, windowSize = '1200,800'): Promise<T> {
	// Headless --dump-dom occasionally never exits on Windows runners; a fresh profile normally succeeds at once.
	for (let attempt = 1; ; attempt++) {
		const dir = mkdtempSync(path.join(tmpdir(), 'huhu-surface-'));
		fixtures.push(dir);
		const file = path.join(dir, 'page.html');
		writeFileSync(file, html);
		const result = await runChrome([
			'--headless=new',
			'--disable-gpu',
			'--no-sandbox',
			'--allow-file-access-from-files',
			`--user-data-dir=${path.join(dir, 'profile')}`,
			`--window-size=${windowSize}`,
			'--virtual-time-budget=2000',
			'--dump-dom',
			pathToFileURL(file).href,
		], 30_000);
		if (result.timedOut && attempt < 2) continue;
		assert.ok(!result.timedOut, `Chrome did not exit within 30s after ${attempt} attempts`);
		assert.equal(result.status, 0, result.stderr);
		const match = /<pre id="out">([^<]*)<\/pre>/.exec(result.stdout);
		assert.ok(match, result.stdout.slice(-500));
		return JSON.parse(match[1]!.replaceAll('&quot;', '"')) as T;
	}
}

test('the appearance renderer keeps host extensions out of the real iframe realm', async () => {
	// happy-dom shares HTMLElement prototypes between windows. Use real Chrome
	// realms here so rendering into an iframe element would reproduce the host's
	// missing .find failure instead of passing through the DOM renderer stub.
	const renderedHtml = '<h1>Sample</h1><input type="checkbox"><button>Copy</button><div data-huhu-preview-embed><div class="markdown-rendered">Embedded sample</div></div>';
	const bundled = await build({
		stdin: {
			contents: 'export { mountStylePreview, PREVIEW_DOCUMENT } from "./src/app/settings/react/appearance/preview-document"; export { themeSettings } from "./src/theme/settings";',
			resolveDir: process.cwd(),
		},
		bundle: true, write: false, format: 'iife', globalName: 'HuhuPreview', platform: 'browser',
		plugins: [{ name: 'host-renderer-extension-contract', setup(builder) {
			builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'host-renderer' }));
			builder.onLoad({ filter: /.*/, namespace: 'host-renderer' }, () => ({ contents: `
				export class Component { load() {} unload() {} }
				export function getIcon(name) {
					const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
					icon.setAttribute('data-host-icon', name);
					return icon;
				}
				export const MarkdownRenderer = { render(app, markdown, element) {
					window.huhuRendererUsesSource = element.ownerDocument === document;
					element.find('.frontmatter');
					element.innerHTML = ${JSON.stringify(renderedHtml)};
					element.querySelector('button').addEventListener('click', () => { window.huhuCopiedRendererHandler = true; });
					return Promise.resolve();
				} };
			`, loader: 'js' }));
		} }],
	});
	const script = bundled.outputFiles[0]!.text.replaceAll('</script', '<\\/script');
	const measured = await chrome<{ hostExtension: boolean; iframeExtension: boolean; source: boolean; rendered: boolean; visible: boolean; target: boolean; embed: boolean; disabled: boolean; copiedHandler: boolean; icons: boolean }>(`<!doctype html>
<html><head><style>.is-phone .mod-root .workspace-tabs:not(.mod-visible) { display: none; }</style><script>${script}</script></head><body><pre id="out"></pre><script>
(async () => {
  HTMLElement.prototype.find = function(selector) { return this.querySelector(selector); };
  const frame = document.createElement('iframe');
  frame.sandbox = 'allow-same-origin';
  frame.srcdoc = HuhuPreview.PREVIEW_DOCUMENT;
  const loaded = new Promise(resolve => frame.onload = resolve);
  document.body.append(frame);
  await loaded;
  const target = frame.contentDocument;
  const hostExtension = typeof document.createElement('div').find === 'function';
  const iframeExtension = typeof target.createElement('div').find === 'function';
  const cleanup = HuhuPreview.mountStylePreview({ app: {}, source: document, target, settings: HuhuPreview.themeSettings.defaults(), mode: 'light', narrow: true, language: 'en', t: key => key });
  for (let i = 0; i < 40 && target.querySelector('.huhu-appearance-preview-status'); i++) await new Promise(resolve => setTimeout(resolve, 0));
  const sample = target.querySelector('.huhu-appearance-preview-sample');
  cleanup();
  sample.querySelector('button')?.click();
  const heading = sample.querySelector('h1'), rect = heading?.getBoundingClientRect();
  const icons = [...target.querySelectorAll('svg[data-host-icon]')];
  document.getElementById('out').textContent = JSON.stringify({ hostExtension, iframeExtension, source: window.huhuRendererUsesSource === true, rendered: !!heading, visible: rect?.width > 0 && rect?.height > 0, target: heading?.ownerDocument === target, embed: !!sample.querySelector('.internal-embed.markdown-embed'), disabled: sample.querySelector('input')?.disabled === true, copiedHandler: window.huhuCopiedRendererHandler === true, icons: icons.length === 3 && icons.every(icon => icon.ownerDocument === target) });
})().catch(error => { document.getElementById('out').textContent = JSON.stringify({ error: String(error.stack || error) }); });
</script></body></html>`);
	assert.deepEqual(measured, { hostExtension: true, iframeExtension: false, source: true, rendered: true, visible: true, target: true, embed: true, disabled: true, copiedHandler: false, icons: true });
}, 75_000);

test('HUHU font lists keep selections behind native defaults and explicit host fonts first', async () => {
	const css = ['src/ui/styles/tokens.css', 'src/ui/styles/base.css', 'src/theme/styles/fonts.css']
		.map(file => readFileSync(path.resolve(file), 'utf8')).join('\n');
	const measured = await chrome<{ defaults: { sans: string; mono: string }; explicit: { sans: string; mono: string }; custom: { sans: string; mono: string }; missing: { sans: string; mono: string } }>(`<!doctype html>
<html><head><style>
/* The native default is an unavailable family, followed by the theme font. */
body { --font-interface-override:'??'; --font-monospace-override:'??'; --font-interface:var(--font-interface-override),var(--font-interface-theme),sans-serif; --font-monospace:var(--font-monospace-override),var(--font-monospace-theme),monospace; }
${css}
#mono { font-family:var(--nd-font-mono); }
</style></head><body class="theme-light huhu-font-interface--inter huhu-font-mono--jetbrains">
<div class="huhu-ui" id="surface">Sample <code id="mono">Code</code></div><pre id="out"></pre><script>
const read = () => ({ sans:getComputedStyle(document.getElementById('surface')).fontFamily,mono:getComputedStyle(document.getElementById('mono')).fontFamily });
const defaults = read();
document.body.style.setProperty('--font-interface-override','Arial');
document.body.style.setProperty('--font-monospace-override','"Courier New"');
const explicit = read();
document.body.style.removeProperty('--font-interface-override');
document.body.style.removeProperty('--font-monospace-override');
document.body.className = 'theme-light huhu-font-interface--custom huhu-font-mono--custom';
document.body.style.setProperty('--huhu-user-font-interface','Lora, Georgia');
document.body.style.setProperty('--huhu-user-font-mono','Fira Code');
const custom = read();
document.body.style.setProperty('--font-interface-override','initial');
document.body.style.setProperty('--font-monospace-override','initial');
const missing = read();
document.getElementById('out').textContent = JSON.stringify({ defaults, explicit, custom, missing });
</script></body></html>`);
	assert.ok(measured.defaults.sans.includes('Inter'), measured.defaults.sans);
	assert.ok(measured.defaults.mono.includes('JetBrains Mono'), measured.defaults.mono);
	assert.ok(measured.explicit.sans.startsWith('Arial'), measured.explicit.sans);
	assert.ok(measured.explicit.mono.startsWith('"Courier New"'), measured.explicit.mono);
	for (const state of [measured.custom, measured.missing]) {
		assert.ok(state.sans.includes('Lora') && state.sans.includes('Georgia'), state.sans);
		assert.ok(state.mono.includes('Fira Code'), state.mono);
	}
}, 75_000);

test('a 288px desktop column keeps the quick note at content height', async () => {
	const measured = await chrome<{ height: number; flex: string; main: number; gap: number }>(`<!doctype html>
<html><head><link rel="stylesheet" href="${styles}"></head>
<body>
<div id="huhu-ui-root"><div class="huhu-ui huhu-dashboard-root flex h-full min-h-0 flex-col" data-layout="stacked" style="width:288px;height:1950px">
  <div class="dashboard-main flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 pt-2">
    <div class="dashboard-quicknote flex shrink-0 items-center gap-2 px-3 py-2"><span class="dashboard-quicknote-chip">Today</span><span>capture</span></div>
    <div class="dashboard-stacked-scroll min-h-0 flex-1 overflow-y-auto"><div class="next">week</div></div>
  </div>
</div></div>
<pre id="out"></pre>
<script>
const q = document.querySelector('.dashboard-quicknote');
const next = q.nextElementSibling;
const cs = getComputedStyle(q);
const qr = q.getBoundingClientRect();
const nr = next.getBoundingClientRect();
document.getElementById('out').textContent = JSON.stringify({
  height: Math.round(qr.height),
  flex: cs.flex,
  main: Math.round(q.parentElement.getBoundingClientRect().height),
  gap: Math.round(nr.top - qr.bottom),
});
</script></body></html>`);
	assert.ok(measured.height > 20 && measured.height < 80, JSON.stringify(measured));
	assert.equal(measured.flex, '0 0 auto');
	assert.ok(measured.main > 1000, JSON.stringify(measured));
	assert.ok(measured.gap >= 0 && measured.gap < 24, JSON.stringify(measured));
}, 75_000); // Two 30s Chrome attempts (a hung browser is retried once), including cold startup.

type Tone = { text: string; background: string };

test('archive text and paper differ in light and dark', async () => {
	const measured = await chrome<{ light: Tone; dark: Tone }>(`<!doctype html>
<html><head><link rel="stylesheet" href="${styles}"></head>
<body class="theme-light huhu-themed huhu-theme--pearl">
<div class="huhu-ui bg-background text-foreground" data-p9-archive><button class="text-foreground" data-p9-row>王</button></div>
<pre id="out"></pre>
<script>
function tone() {
  const button = document.querySelector('[data-p9-row]');
  const surface = document.querySelector('[data-p9-archive]');
  return { text: getComputedStyle(button).color, background: getComputedStyle(surface).backgroundColor };
}
const light = tone();
document.body.classList.replace('theme-light', 'theme-dark');
const dark = tone();
document.getElementById('out').textContent = JSON.stringify({ light, dark });
</script></body></html>`);
	assert.notEqual(measured.light.text, measured.light.background);
	assert.notEqual(measured.dark.text, measured.dark.background);
	assert.notEqual(measured.light.text, measured.dark.text);
	assert.notEqual(measured.light.background, measured.dark.background);
}, 75_000);

test('pipeline configuration keeps vertical fields and separated footer actions', async () => {
	const initial = {
		...emptyPipeline(),
		stages: [{ id: 'draft', label: 'Draft', value: 'draft' }],
		skills: [{
			id: 'review', label: 'Review', agentId: 'codex', skillName: 'review', promptTemplate: '{{input}}',
			directSend: false, destination: { kind: 'fresh' as const, cwd: '' },
			scope: 'card' as const, stages: [],
		}],
	};
	const markup = renderToStaticMarkup(createElement(PortalContainerContext.Provider, { value: {} as HTMLElement }, createElement(PipelineConfig, { app: { vault: { getAllLoadedFiles: () => [], on: () => ({}), offref: () => {} } } as never, initial, save: async () => {}, close: () => {} })));
	const measured = await chrome<{ stacks: Array<{ display: string; direction: string; gap: string }>; scope: { display: string; direction: string; gap: string }; footer: { display: string; wrap: string; gap: string; separation: number }; legacy: number }>(`<!doctype html>
<html><head><link rel="stylesheet" href="${styles}"></head>
<body style="--size-4-1:4px;--size-4-2:8px"><div class="huhu-ui" style="width:480px">${markup}</div><pre id="out"></pre>
<script>
const root = document.querySelector('.huhu-pipeline-config');
const measure = e => { const s = getComputedStyle(e); return { display:s.display, direction:s.flexDirection, gap:s.gap }; };
const footer = root.lastElementChild, buttons = footer.querySelectorAll('button');
document.getElementById('out').textContent = JSON.stringify({
 stacks: [root, ...root.querySelectorAll('fieldset')].map(measure),
 scope: measure(root.querySelector('select').parentElement),
 footer: { ...measure(footer), wrap:getComputedStyle(footer).flexWrap, separation:buttons[1].getBoundingClientRect().left-buttons[0].getBoundingClientRect().right },
 legacy: [...root.querySelectorAll('[class]'), root].flatMap(e => [...e.classList]).filter(name => name.startsWith('huhu-ui-') || name === 'huhu-field').length,
});
</script></body></html>`);
	assert.equal(measured.stacks.length, 3);
	for (const stack of measured.stacks) assert.deepEqual(stack, { display: 'flex', direction: 'column', gap: '8px' });
	assert.deepEqual(measured.scope, { display: 'flex', direction: 'column', gap: '4px' });
	assert.equal(measured.footer.display, 'flex');
	assert.equal(measured.footer.wrap, 'wrap');
	assert.equal(measured.footer.gap, '8px');
	assert.equal(measured.footer.separation, 8);
	assert.equal(measured.legacy, 0);
}, 75_000);

test('editor conflict actions retain compact host styling outside the React scope', async () => {
	const measured = await chrome<{ display: string; wrap: string; gap: string; margin: string; font: string; padding: string; height: number; separation: number; host: string }>(`<!doctype html>
<html><head><style>button { height:32px; padding:4px 12px; font-size:16px; }</style><link rel="stylesheet" href="${styles}"></head>
<body style="--size-4-1:4px;--size-4-2:8px;--font-interface:Arial;--font-ui-smaller:12px">
<div class="cm-editor"><span class="huhu-sync-conflict-actions"><button class="huhu-sync-conflict-button">Keep upper</button><button class="huhu-sync-conflict-button">Keep lower</button></span><button id="host">Host control</button></div><pre id="out"></pre>
<script>
const bar = document.querySelector('.huhu-sync-conflict-actions'), buttons = bar.querySelectorAll('button');
const b = getComputedStyle(bar), s = getComputedStyle(buttons[0]);
document.getElementById('out').textContent = JSON.stringify({ display:b.display, wrap:b.flexWrap, gap:b.gap, margin:b.marginInlineStart,
 font:s.fontSize, padding:s.padding, height:buttons[0].getBoundingClientRect().height,
 separation:buttons[1].getBoundingClientRect().left-buttons[0].getBoundingClientRect().right, host:getComputedStyle(document.getElementById('host')).height });
</script></body></html>`);
	assert.equal(measured.display, 'inline-flex');
	assert.equal(measured.wrap, 'wrap');
	assert.equal(measured.gap, '4px');
	assert.equal(measured.margin, '8px');
	assert.equal(measured.font, '12px');
	assert.equal(measured.padding, '0px 8px');
	assert.equal(measured.separation, 4);
	assert.ok(measured.height < 32, JSON.stringify(measured));
	assert.equal(measured.host, '32px');
}, 75_000);


test('archive cards follow their container width and respect the five/six-column cap', async () => {
 const cards = Array.from({ length: 8 }, (_, i) => createElement('button', { key: i, className: 'min-w-0 whitespace-normal p-4 [overflow-wrap:anywhere]' }, 'Readable person name ' + i));
 const markup = [5, 6].map(columns => `<section data-cap="${columns}" style="width:500px">${renderToStaticMarkup(createElement(ArchiveCardGrid, { columns, children: cards }))}</section>`).join('');
 const measured = await chrome<Array<{ cap: number; width: number; tracks: number; card: number; overflow: number }>>(`<!doctype html>
 <html><head><link rel="stylesheet" href="${styles}"></head><body><div class="huhu-ui">${markup}</div><pre id="out"></pre><script>
 const results=[];
 for(const section of document.querySelectorAll('section')) for(const width of [240,500,900,2200]) {
  section.style.width=width+'px';const grid=section.firstElementChild, card=grid.firstElementChild;
  results.push({cap:Number(section.dataset.cap),width,tracks:getComputedStyle(grid).gridTemplateColumns.split(' ').length,card:card.getBoundingClientRect().width,overflow:card.scrollWidth-card.clientWidth});
 }
 document.getElementById('out').textContent=JSON.stringify(results);
 </script></body></html>`, '1600,900');
 for(const item of measured) {
  assert.equal(item.tracks, item.width < 544 ? 1 : item.width === 900 ? 3 : item.cap, JSON.stringify(item));
  assert.ok(item.card >= Math.min(272,item.width), JSON.stringify(item));
  assert.equal(item.overflow,0,JSON.stringify(item));
 }
}, 75_000);

test('SuliWorld nested note surfaces retain readable text in light, dark and plain styles', async () => {
	const content = '<h3 data-probe>Heading</h3><p data-probe>Text <strong data-probe>bold</strong> <em data-probe>italic</em> <a data-probe href="#">link</a> <code data-probe>inline code</code></p>';
	const callouts = ['note', 'tip', 'warning', 'question', 'quote'].map((kind) => `<div class="callout" data-callout="${kind}" data-surface="callout-${kind}">${content}</div>`).join('');
	const measured = await chrome<Array<{ scenario: string; surface: string; element: string; foreground: Rgb; background: Rgb }>>(`<!doctype html>
<html><head><style>
.markdown-rendered { color:var(--text-normal); }
.markdown-rendered strong { color:var(--bold-color); }
.markdown-rendered em { color:var(--italic-color); }
.markdown-rendered a { color:var(--link-color); }
.markdown-rendered code { color:var(--code-normal); background:var(--code-background); }
.markdown-rendered h3 { color:var(--h3-color); }
.markdown-rendered h4 { color:var(--h4-color); }
.markdown-rendered blockquote { color:var(--blockquote-color); }
</style><link rel="stylesheet" href="${styles}"></head><body>
<section id="note"><div class="internal-embed markdown-embed" data-surface="embed"><div class="markdown-rendered">
<p data-probe>Embedded note</p><a data-probe href="#">Embedded link</a>
<blockquote data-surface="quote">${content}</blockquote>${callouts}
<h4 data-probe data-surface="heading">Heading <strong data-probe>bold</strong> <em data-probe>italic</em> <a data-probe href="#">link</a></h4>
<pre data-surface="code"><code data-probe>const nested = true;</code></pre>
</div></div></section><pre id="out"></pre><script>
const out=[], note=document.getElementById('note');
const rgb=value=>(value.match(/[\\d.]+/g)||[]).map(Number);
const background=el=>{
 const layers=[];
 for(let current=el;current;current=current.parentElement) layers.unshift(rgb(getComputedStyle(current).backgroundColor));
 return layers.reduce((base,layer)=>{const a=layer[3]??1;return layer.length<3?base:base.map((channel,i)=>layer[i]*a+channel*(1-a));},[255,255,255]);
};
for(const mode of ['light','dark']) for(const live of [false,true]) for(const plain of [false,true]) {
 document.body.className='theme-'+mode+' huhu-themed huhu-theme--suliworld huhu-editor-themed huhu-editor--suliworld huhu-md-style--suliworld '+(plain?'huhu-md-quotes--plain':'huhu-md-headings--suliworld');
 note.className=live?'markdown-source-view is-live-preview':'markdown-reading-view';
 for(const el of note.querySelectorAll('[data-probe]')) out.push({
  scenario:mode+'/'+(live?'live-container':'reading')+'/'+(plain?'plain':'styled'),
  surface:el.closest('[data-surface]').dataset.surface,element:el.tagName,
  foreground:rgb(getComputedStyle(el).color).slice(0,3),background:background(el),
 });
}
document.getElementById('out').textContent=JSON.stringify(out);
</script></body></html>`);
	assert.ok(measured.length > 200, `expected every nested surface in all eight scenarios; got ${measured.length}`);
	for (const sample of measured) {
		const contrast = contrastRatio(rgbToHex(sample.foreground), rgbToHex(sample.background));
		assert.ok(contrast >= 4.5, `${sample.scenario} ${sample.surface} ${sample.element}: ${contrast.toFixed(2)}:1 ${JSON.stringify(sample)}`);
	}
}, 75_000);

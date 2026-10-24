// Acceptance: no button, tab or toolbar sticks out of its container, in every HUHU page, at narrow widths.
// Fresh disposable vault; HOME, CLI homes and XDG dirs are pointed into the fixture root (never the real home).
//   pnpm run build
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_AUDIT_FIXTURE=/tmp/huhu-audit-<name> [HUHU_AUDIT_LANG=en|zh] \
//   [HUHU_AUDIT_MINIMAL_DIR=<Minimal theme dir>] [HUHU_AUDIT_DARK=1] [HUHU_AUDIT_SHOTS=<dir>] [HUHU_AUDIT_PORT=19731] \
//   [HUHU_AUDIT_PAGES=agent,settings] xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/overflow-audit.mjs
// The violation list is written to <evidence>/violations.json; the script exits non-zero when it is not empty.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_AUDIT_FIXTURE;
assert.ok(root && /^\/(var\/)?tmp\/huhu-audit-/.test(root), 'HUHU_AUDIT_FIXTURE must be /tmp/huhu-audit-<name> (or /var/tmp/...) and must not exist');
const lang = process.env.HUHU_AUDIT_LANG === 'zh' ? 'zh' : 'en';
const dark = process.env.HUHU_AUDIT_DARK === '1';
const minimalDir = process.env.HUHU_AUDIT_MINIMAL_DIR;
const shotsDir = process.env.HUHU_AUDIT_SHOTS;
const only = process.env.HUHU_AUDIT_PAGES ? new Set(process.env.HUHU_AUDIT_PAGES.split(',')) : undefined;
const suffix = `${lang}-${minimalDir ? 'minimal' : 'default'}-${dark ? 'dark' : 'light'}`;
const home = path.join(root, 'home');
// Every CLI and XDG location lives inside the fixture; nothing of the real home is read or written.
Object.assign(process.env, {
	CODEX_HOME: path.join(home, '.codex'),
	CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
	GROK_HOME: path.join(home, '.grok'),
	GEMINI_CLI_HOME: path.join(home, '.gemini'),
	XDG_DATA_HOME: path.join(home, '.local/share'),
	XDG_CACHE_HOME: path.join(home, '.cache'),
	XDG_STATE_HOME: path.join(home, '.local/state'),
});

const helper = path.resolve('native/pty-server/target/release/huhu-pty');
if (await fs.stat(helper).then(() => true, () => false)) process.env.HUHU_PTY_BINARY = helper;
const files = { 'Welcome.md': '# Overflow audit\n\nA note with a [[Linked note]].\n', 'Linked note.md': '# Linked\n' };
for (let i = 0; i < 12; i++) files[`Projects/Folder ${i}/Note ${i}.md`] = `# Note ${i}\n`;
files['Projects/A very long note title that never fits into a narrow navigator pane at all.md'] = '# Long\n';
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal', theme: dark ? 'obsidian' : 'moonstone' });
} else {
	files['.obsidian/appearance.json'] = JSON.stringify({ theme: dark ? 'obsidian' : 'moonstone' });
}
// Contacts: a few people and companies with long names so the archive list and detail have real content.
await build({ stdin: { contents: `export {newRecord} from './src/modules/archives/core/model'; export {createMarkdown} from './src/modules/archives/core/persist/markdown';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', outfile: 'scripts/tmp/archives-fixtures.cjs', alias: { obsidian: './scripts/obsidian-stub.ts' }, logLevel: 'error' });
// Archive notes carry HUHU ownership markers, which the first-run content migration would move away: write them after launch.
const archiveFiles = {};
const { newRecord, createMarkdown } = createRequire(import.meta.url)('../tmp/archives-fixtures.cjs');
for (const [kind, names] of [['person', ['Alexandria Montgomery-Fitzgerald', '王小明', 'Zoë Müller', 'Christopher Wellington-Smythe III']], ['company', ['International Business Machines Corporation Holdings', '北京某某科技发展有限责任公司']]]) {
	for (const name of names) {
		const record = newRecord(kind);
		record.fields.name = name;
		record.fields.tags = ['vip', 'a-long-tag-name-for-overflow'];
		record.fields.emails = kind === 'person' ? [`${name.split(' ')[0].toLowerCase()}@example.com`] : [];
		record.path = `档案/${kind === 'person' ? '个人档案' : '企业档案'}/${name}/基本信息.md`;
		archiveFiles[record.path] = createMarkdown(record);
	}
}

const modules = { home: false, agent: true, automations: true, notifications: true, archives: true, comments: true, browser: true, icons: true, sync: true, navigator: true };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_AUDIT_PORT || 19731),
	files,
	settings: { version: 1, namespaces: { app: { language: lang, introSeen: true, modules } } },
});
let c = runtime.connection;
for (const [file, text] of Object.entries(archiveFiles)) await c.evaluate(`(async()=>{const dir=${JSON.stringify(path.posix.dirname(file))};let at='';for(const part of dir.split('/')){at=at?at+'/'+part:part;if(!app.vault.getAbstractFileByPath(at))await app.vault.createFolder(at)}await app.vault.create(${JSON.stringify(file)},${JSON.stringify(text)});return true})()`);
const violations = [];
const shots = [];
const notes = [];
const p = 'app.plugins.plugins.huhu';

const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,500)').catch(() => '')}`);
};
const center = (selector, text) =>
	c.evaluate(`(() => { const all = [...document.querySelectorAll(${JSON.stringify(selector)})]; const e = ${text ? `all.find(e => e.textContent.trim() === ${JSON.stringify(text)}) ?? all.find(e => e.textContent.includes(${JSON.stringify(text)}))` : 'all[0]'}; if (!e) throw Error('Missing ' + ${JSON.stringify(selector)} + ' ' + ${JSON.stringify(text ?? '')}); e.scrollIntoView({block:'nearest'}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
async function mouse(point, clicks = 1) {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	if (clicks) {
		await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: clicks, ...point });
		await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: clicks, ...point });
	}
	await delay(350);
}
const click = async (selector, text) => mouse(await center(selector, text));
/** Click the first element of `selector` whose aria-label is one of `labels` (real pointer events: Radix opens on pointerdown). */
const clickLabel = async (scope, labels) => {
	const point = await c.evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(scope + ' button')})].find(b => ${JSON.stringify(labels)}.includes(b.getAttribute('aria-label'))); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
	if (!point) { notes.push({ missingControl: labels }); return false; }
	await mouse(point);
	return true;
};
const pressEscape = async () => {
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await delay(400);
};
const setWindow = async (width, height = 900) => {
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, ${height}); true`);
	await delay(700);
};
const setTheme = async () => {
	await c.evaluate(`app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}); app.updateTheme(); true`);
	await delay(300);
};
const openWorkbench = (target) => c.evaluate(`${p}.openWorkbench(${JSON.stringify(target)}).then(() => true, (e) => String(e && e.message || e))`).then((r) => { if (r !== true) notes.push({ openFailed: target, error: r }); });
/** Panel width through the real resize separator: Home = narrowest, double click = default. */
const panelWidth = async (narrow) => {
	const found = await c.evaluate(`(() => { const s = document.querySelector('[data-shell-region="panel"]')?.parentElement?.querySelector('[role=separator]'); if (!s) return false; s.focus(); if (${narrow}) return true; s.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return true; })()`);
	if (!found) return;
	if (narrow) {
		await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
		await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
	}
	await delay(300);
};

/** In-page audit. Returns violations for the interactive elements below every `.huhu-ui` root. */
const AUDIT = `(() => {
	const out = [];
	const win = window;
	const rectOf = (el) => el.getBoundingClientRect();
	const clips = (cs) => /(hidden|clip|auto|scroll)/.test(cs.overflowX);
	const scrolls = (cs) => /(auto|scroll)/.test(cs.overflowX);
	/** The part of an element that is actually on screen: its box cut by every clipping or scrolling ancestor. */
	const shown = (el) => {
		let r = rectOf(el);
		let left = r.left, right = r.right;
		for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
			const cs = getComputedStyle(a);
			if (cs.display === 'contents') continue;
			if (clips(cs)) { const ar = rectOf(a); left = Math.max(left, ar.left); right = Math.min(right, ar.right); }
		}
		return { left, right, width: right - left };
	};
	const visible = (el) => {
		const r = rectOf(el);
		if (r.width <= 0 || r.height <= 0) return false;
		for (let n = el; n && n !== document.body; n = n.parentElement) {
			const cs = getComputedStyle(n);
			if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
			if (n.tagName === 'DETAILS' && !n.open && !el.closest('summary')) return false;
		}
		return true;
	};
	const describe = (el) => {
		const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 4).join('.');
		const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
		return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (text ? ' "' + text + '"' : '');
	};
	const named = (el) => !!(el.getAttribute('title') || el.getAttribute('aria-label') || el.closest('[title]'));
	/** Rectangles of everything painted inside el (text runs and in-flow descendants), cut by clipping descendants. */
	const contentRects = (el) => {
		const rects = [];
		const walk = (node, clipL, clipR) => {
			for (const child of node.childNodes) {
				if (child.nodeType === 3) {
					if (!child.textContent.trim()) continue;
					const range = document.createRange();
					range.selectNodeContents(child);
					const r = range.getBoundingClientRect();
					if (r.width > 0) rects.push({ left: Math.max(r.left, clipL), right: Math.min(r.right, clipR), what: child.textContent.trim().slice(0, 30) });
				} else if (child.nodeType === 1) {
					const cs = getComputedStyle(child);
					if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
					const r = rectOf(child);
					if (r.width <= 0) continue;
					const isLeaf = !child.firstElementChild && !child.textContent.trim();
					if (isLeaf || child.namespaceURI === 'http://www.w3.org/2000/svg') { rects.push({ left: Math.max(r.left, clipL), right: Math.min(r.right, clipR), what: child.tagName }); continue; }
					let l = clipL, rr = clipR;
					if (clips(cs)) { l = Math.max(l, r.left); rr = Math.min(rr, r.right); }
					walk(child, l, rr);
				}
			}
		};
		walk(el, -Infinity, Infinity);
		return rects;
	};
	const interactive = [...document.querySelectorAll('.huhu-ui button, .huhu-ui [role=tab], .huhu-ui [role=button], .huhu-ui a[href], .huhu-ui [role=combobox], .huhu-ui select, .huhu-ui input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .huhu-ui textarea')].filter(visible);
	const seen = new Set();
	const add = (kind, el, detail) => {
		const key = kind + '|' + describe(el);
		if (seen.has(key)) return;
		seen.add(key);
		out.push({ kind, el: describe(el), detail });
	};
	for (const el of interactive) {
		const cs = getComputedStyle(el);
		const isField = /^(input|textarea|select)$/i.test(el.tagName);
		const r = rectOf(el);
		// 1. The content of a button/tab must stay inside its border.
		if (!isField) {
			const over = contentRects(el).find((c) => c.right > r.right + 1 || c.left < r.left - 1);
			if (over) add('text-outside-border', el, { what: over.what, over: Math.round(Math.max(over.right - r.right, r.left - over.left)) });
		}
		// 2. Ellipsised text must stay readable: a title or accessible name exposes the full text.
		if (!isField) for (const inner of [el, ...el.querySelectorAll('*')]) {
			const ics = getComputedStyle(inner);
			if (inner.scrollWidth > inner.clientWidth + 1 && inner.clientWidth > 0 && /(hidden|clip)/.test(ics.overflowX) && ics.textOverflow === 'ellipsis' && !named(el) && !named(inner)) {
				add('truncated-without-title', el, { text: (inner.textContent || '').trim().slice(0, 40) });
				break;
			}
		}
		// 3. The on-screen part stays inside the viewport.
		const s = shown(el);
		if (s.width > 0 && (s.right > win.innerWidth + 1 || s.left < -1)) add('outside-viewport', el, { left: Math.round(s.left), right: Math.round(s.right), viewport: win.innerWidth });
		// 4. The rectangle stays inside its parent (the toolbar it sits in) unless that parent scrolls.
		let parent = el.parentElement;
		while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
		const pos = cs.position;
		if (parent && s.width > 0 && pos !== 'absolute' && pos !== 'fixed' && !scrolls(getComputedStyle(parent))) {
			const pr = rectOf(parent);
			if (pr.width > 0 && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5)) add('outside-parent', el, { parent: describe(parent), over: Math.round(Math.max(r.right - pr.right, pr.left - r.left)) });
		}
	}
	// 5. Toolbars and headers: a container that sticks out of its own parent, or whose content spills.
	for (const root of document.querySelectorAll('.huhu-ui')) {
		for (const el of root.querySelectorAll('header, [role=toolbar], [role=tablist], [data-toolbar], footer')) {
			if (!visible(el) || !el.parentElement) continue;
			const pr = rectOf(el.parentElement), r = rectOf(el);
			if (shown(el).width > 0 && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) && !scrolls(getComputedStyle(el.parentElement))) add('container-outside-parent', el, { parent: describe(el.parentElement), over: Math.round(Math.max(r.right - pr.right, pr.left - r.left)) });
			const ecs = getComputedStyle(el);
			if (el.scrollWidth > el.clientWidth + 1 && !clips(ecs)) {
				const spill = contentRects(el).find((c) => c.right > r.right + 1 || c.left < r.left - 1);
				if (spill) add('container-content-overflows', el, { what: spill.what, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
			}
		}
	}
	// 6. Overlaps: text that runs into another control's or another text's box (neighbouring content collides).
	const floating = (el) => { for (let n = el; n && !n.classList?.contains('huhu-ui'); n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'absolute' || p === 'fixed' || p === 'sticky') return true; if (n.hasAttribute?.('data-radix-popper-content-wrapper') || n.getAttribute?.('role') === 'tooltip') return true; } return !!el.closest('.status-bar'); };
	const boxes = [];
	for (const el of interactive) {
		if (floating(el)) continue;
		const sh = shown(el), r = rectOf(el);
		if (sh.width > 2) boxes.push({ el, left: Math.max(r.left, sh.left), right: Math.min(r.right, sh.right), top: r.top, bottom: r.bottom, control: true });
	}
	const texts = [];
	for (const root of document.querySelectorAll('.huhu-ui')) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (!node.textContent.trim()) continue;
			const el = node.parentElement;
			if (!el || !visible(el) || floating(el) || el.closest('script, style, [aria-hidden=true], .sr-only, [data-sonner-toaster]')) continue;
			const range = document.createRange();
			range.selectNodeContents(node);
			for (const r of range.getClientRects()) {
				const sh = shown(el);
				const left = Math.max(r.left, sh.left), right = Math.min(r.right, sh.right);
				if (right - left > 2 && r.height > 0) texts.push({ el, left, right, top: r.top, bottom: r.bottom, text: node.textContent.trim().slice(0, 24) });
			}
		}
	}
	const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3;
	for (const t of texts) {
		for (const b of boxes) {
			if (b.el.contains(t.el) || t.el.contains(b.el) || !overlap(t, b)) continue;
			add('text-overlaps-control', b.el, { text: t.text, by: describe(t.el) });
		}
	}
	for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
		const a = texts[i], b = texts[j];
		if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || !overlap(a, b)) continue;
		add('text-overlaps-text', a.el, { text: a.text, other: b.text, by: describe(b.el) });
	}
	// 8. Text stays inside the card, pill or button it sits in (the nearest ancestor with a border or a fill).
	const boxOf = (el) => {
		for (let a = el; a && !a.classList?.contains('huhu-ui'); a = a.parentElement) {
			const cs = getComputedStyle(a);
			const fill = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(Number);
			const filled = !!fill && (fill.length < 4 || fill[3] > 0.05);
			if (parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0 || filled) return a;
		}
		return undefined;
	};
	for (const t of texts) {
		const box = boxOf(t.el);
		if (!box || box === document.body) continue;
		const br = rectOf(box);
		if (br.width < 8) continue;
		if (t.right > br.right + 1 || t.left < br.left - 1) add('text-outside-box', t.el, { text: t.text, box: describe(box), over: Math.round(Math.max(t.right - br.right, br.left - t.left)) });
	}
	// 7. A tab strip shows its scroll arrows only while its tabs really overflow.
	for (const strip of document.querySelectorAll('[data-group-strip]')) {
		const list = strip.querySelector('[role=tablist]');
		const arrows = [...strip.querySelectorAll('[data-tab-scroll]')];
		if (list && arrows.length && list.scrollWidth <= list.clientWidth + 1) out.push({ kind: 'scroll-arrows-without-overflow', el: describe(strip), detail: { scrollWidth: list.scrollWidth, clientWidth: list.clientWidth, tabs: list.querySelectorAll('[role=tab]').length } });
		if (list && !arrows.length && list.scrollWidth > list.clientWidth + 1) out.push({ kind: 'overflowing-tabs-without-arrows', el: describe(strip), detail: { scrollWidth: list.scrollWidth, clientWidth: list.clientWidth } });
	}
	if (document.documentElement.scrollWidth > win.innerWidth + 1) out.push({ kind: 'document-scrolls-horizontally', el: 'html', detail: { scrollWidth: document.documentElement.scrollWidth, innerWidth: win.innerWidth } });
	return { count: interactive.length, out };
})()`;

const stateName = { 1440: 'w1440', 900: 'w900', 700: 'w700' };
let current = '';
const audit = async (page, label) => {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
	await delay(350);
	const result = await c.evaluate(AUDIT);
	for (const v of result.out) violations.push({ page, state: label, ...v });
	notes.push({ page, state: label, checked: result.count, violations: result.out.length });
	if (shotsDir) {
		await fs.mkdir(shotsDir, { recursive: true });
		const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
		const file = path.join(shotsDir, `${suffix}-${page}-${label}.png`);
		await fs.writeFile(file, Buffer.from(data, 'base64'));
		shots.push(file);
	}
};
/** Runs `inspect` at the three states that matter: wide, wide with the narrowest panel, narrow window. */
const matrix = async (page, inspect = () => undefined) => {
	for (const [width, narrow] of [[1440, false], [1440, true], [900, false], [700, false]]) {
		await setWindow(width);
		await panelWidth(narrow);
		await inspect();
		await audit(page, `${stateName[width]}${narrow ? '-panel-min' : ''}`);
	}
	await panelWidth(false);
	await setWindow(1440);
};
const wants = (name) => !only || only.has(name);
const errorsNow = () => c.evaluate('window.huhuAcceptanceErrors ?? []');

try {
	await setTheme();
	await setWindow(1440);

	if (wants('agent')) {
		await openWorkbench({ feature: 'terminal' });
		await until(`!!document.querySelector('[data-page-entry="board"]')`, 'agent sidebar');
		await matrix('agent-empty');
		for (const page of ['board', 'automations', 'usage']) await click(`[data-page-entry="${page}"]`);
		// Two terminal tabs and a browser tab through the controller (the local helper binary, never a download).
		await c.evaluate(`(() => {
			const surface = app.workspace.getLeavesOfType('huhu-workbench-view')[0].view.getNativeSurfaces().find(s => s.getViewType() === 'huhu-agent-page');
			window.__ac = surface.controller;
			return true;
		})()`);
		for (let i = 0; i < 2; i++) {
			const ok = await c.evaluate(`__ac.newShell().then(() => true, (e) => String(e && e.message || e))`);
			if (ok !== true) notes.push({ terminal: String(ok) });
			await delay(500);
		}
		await c.evaluate(`__ac.workspace.newBrowser('https://example.org/a/very/long/path'); true`);
		await delay(800);
		await matrix('agent-tabs');
		await click(`[role=tab][data-tab-id="tab-page-usage"]`);
		await matrix('agent-usage');
		await click(`[role=tab][data-tab-id="tab-page-automations"]`);
		await matrix('agent-automations-list');
		await click(`[role=tab][data-tab-id="tab-page-board"]`);
		await matrix('agent-board');
	}
	if (wants('automations')) {
		await openWorkbench({ feature: 'terminal' });
		await until(`!!document.querySelector('[data-page-entry="automations"]')`, 'agent sidebar');
		await click(`[data-page-entry="automations"]`);
		await until(`!!document.querySelector('[data-automation-page]')`, 'automations list');
		await matrix('automations-empty');
		await click('button', lang === 'zh' ? '喝水' : 'Drink water').catch(() => undefined);
		await until(`!!document.querySelector('[data-automation-editor]')`, 'automation editor', 8000).catch(() => undefined);
		await matrix('automations-editor');
		await click('button', lang === 'zh' ? '创建' : 'Create').catch(() => undefined);
		await delay(800);
		await click(`[data-page-entry="automations"]`).catch(() => undefined);
		await until(`!!document.querySelector('[data-automation-row-id]')`, 'saved automation row', 8000).catch(() => undefined);
		await matrix('automations-list');
	}
	if (wants('contacts')) {
		await openWorkbench({ feature: 'contacts' });
		await until(`document.body.innerText.includes('Montgomery') || document.body.innerText.includes('王小明')`, 'contacts list', 30000);
		await matrix('contacts-list');
		await matrix('contacts-cards', async () => undefined);
		await c.evaluate(`(() => { const row = document.querySelector('[data-path] button') ?? document.querySelector('button[data-path]'); row?.click(); return !!row; })()`);
		await delay(800);
		await matrix('contacts-detail');
	}
	if (wants('content')) {
		await openWorkbench({ feature: 'content' });
		await delay(1200);
		await matrix('content');
	}
	if (wants('content-editor')) {
		await openWorkbench({ feature: 'content', resourceId: '.huhu/dashboards/档案/个人档案/王小明/基本信息.md' });
		await delay(1500);
		await matrix('content-editor');
	}
	if (wants('settings')) {
		for (const category of ['general', 'appearance', 'browser', 'editor', 'navigator', 'terminal', 'contacts', 'automation', 'sync', 'about']) {
			await openWorkbench({ feature: 'settings', section: category });
			await delay(900);
			await matrix(`settings-${category}`);
		}
	}
	for (const feature of ['notifications', 'sync', 'icons']) {
		if (!wants(feature)) continue;
		if (feature === 'notifications') {
			await c.evaluate(`(async () => { const inbox = ${p}.services.peek({ owner: 'notifications', id: 'inbox' }); if (!inbox) return false; for (let i = 0; i < 4; i++) await inbox.send({ id: 'audit-' + i, title: 'A notification with a deliberately long title number ' + i, body: 'The body of the notification explains what happened in some detail so it wraps.', channels: [] }); return true; })()`);
		}
		if (feature === 'sync') {
			const git = (...args) => execFileSync('git', args, { cwd: runtime.vault, env: { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: path.join(home, '.gitconfig'), GIT_CONFIG_NOSYSTEM: '1' }, stdio: 'ignore' });
			git('init', '-q', '-b', 'main');
			git('config', 'user.email', 'audit@example.com');
			git('config', 'user.name', 'Audit');
			await fs.writeFile(path.join(runtime.vault, '.gitignore'), '.huhu/\n.obsidian/\n');
			git('add', 'Welcome.md', 'Linked note.md', '.gitignore');
			git('commit', '-q', '-m', 'Initial commit with a deliberately long subject line for the history list');
			git('remote', 'add', 'origin', 'https://example.com/some/very/long/repository/path/that/keeps/going.git');
			await fs.writeFile(path.join(runtime.vault, 'Welcome.md'), '# Changed\n');
			await fs.writeFile(path.join(runtime.vault, 'A new file with a rather long name that will not fit.md'), 'x\n');
		}
		await openWorkbench({ feature });
		await delay(1500);
		await matrix(feature);
		if (feature === 'sync') {
			await openWorkbench({ feature, section: 'history' });
			await delay(1200);
			await matrix('sync-history');
		}
	}
	if (wants('icons')) {
		for (const section of ['iconic-sidebars', 'iconic-editor', 'iconic-menus', 'iconic-picker', 'iconic-advanced']) {
			await openWorkbench({ feature: 'icons', section });
			await delay(900);
			await matrix(`icons-${section.replace('iconic-', '')}`);
		}
	}
	if (wants('settings-tabs')) {
		await openWorkbench({ feature: 'settings', section: 'terminal' });
		await delay(900);
		for (const [index, name] of ['agents', 'terminal', 'accounts', 'usage', 'quick', 'skills'].entries()) {
			const point = await c.evaluate(`(() => { const e = document.querySelectorAll('[data-settings-scroll] [role=tab]')[${index}]; if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
			if (point) await mouse(point);
			await delay(700);
			if (name === 'agents') {
				const open = await c.evaluate(`(() => { const b = document.querySelector('[data-agent-catalog] button[aria-expanded]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
				if (open) await mouse(open);
			}
			await matrix(`settings-agents-${name}`);
		}
	}
	if (wants('agent-extras')) {
		await openWorkbench({ feature: 'terminal' });
		await until(`!!document.querySelector('[data-group-strip]')`, 'strip', 8000).catch(() => undefined);
		await c.evaluate(`(() => { const b = document.querySelector('[data-group-strip] button[aria-pressed]'); b?.click(); return !!b; })()`);
		await delay(700);
		await matrix('agent-history-panel');
		await c.evaluate(`(() => { const b = document.querySelector('[data-group-strip] button[aria-pressed=true]'); b?.click(); return !!b; })()`);
	}
	if (wants('dialogs')) {
		await openWorkbench({ feature: 'contacts' });
		await delay(1200);
		if (await clickLabel('', ['Add', '新增'])) { await delay(900); await matrix('form-contacts-add'); }
		await openWorkbench({ feature: 'terminal' });
		await until(`!!document.querySelector('[data-group-strip]')`, 'strip', 8000).catch(() => undefined);
		if (await clickLabel('[data-group-strip]', ['Quick command menu', '快捷命令菜单'])) { await delay(700); await matrix('menu-quick-commands'); await pressEscape(); }
		if (await clickLabel('[data-group-strip]', ['New tab', '新建标签'])) { await delay(700); await matrix('menu-new-tab'); await pressEscape(); }
		if (await clickLabel('[data-group-strip]', ['Tab group menu', '标签组菜单'])) { await delay(700); await matrix('menu-tab-group'); await pressEscape(); }
	}
	if (wants('navigator')) {
		await c.evaluate(`app.workspace.leftSplit.expand(); app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]); true`);
		await delay(800);
		for (const [name, width] of [['wide', 300], ['narrow', 190]]) {
			await c.evaluate(`(() => { const split = app.workspace.leftSplit; split.setSize?.(${width}); split.containerEl.style.width = '${width}px'; app.workspace.trigger('resize'); return true; })()`);
			await delay(500);
			await audit('navigator', name);
		}
	}
	if (wants('comments')) {
		await c.evaluate(`(async () => { const leaf = app.workspace.getRightLeaf(false); await leaf.setViewState({ type: 'huhu-comments-view', active: true }); app.workspace.rightSplit.expand(); app.workspace.revealLeaf(leaf); return true; })()`);
		await delay(800);
		for (const [name, width] of [['wide', 360], ['narrow', 200]]) {
			await c.evaluate(`(() => { const split = app.workspace.rightSplit; split.setSize?.(${width}); split.containerEl.style.width = '${width}px'; app.workspace.trigger('resize'); return true; })()`);
			await delay(500);
			await audit('comments', name);
		}
	}
	const errors = (await errorsNow()).filter((e) => !/ResizeObserver loop/.test(e));
	notes.push({ errors });
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'violations.json'), JSON.stringify({ suffix, violations, notes, shots }, null, 2));
	await runtime.stop();
}
console.log(JSON.stringify({ suffix, evidence: runtime.evidence, pages: notes.length, violations: violations.length }, null, 2));
for (const v of violations) console.log(`${v.page} [${v.state}] ${v.kind}: ${v.el} ${JSON.stringify(v.detail)}`);
if (violations.length) process.exitCode = 1;

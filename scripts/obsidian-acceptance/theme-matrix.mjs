// Screenshot and probe matrix of the global appearance on real Obsidian: every interface theme in light and dark
// (note editor + file list + HUHU board on one screen), the editor colour schemes, fonts, the settings page, and
// "Default" leaving a community theme (Minimal) alone. HOME and XDG dirs are pointed into the fixture by fresh-vault.
// Usage: HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian xvfb-run -a -s "-screen 0 1800x1300x24" \
//          node scripts/obsidian-acceptance/theme-matrix.mjs <new-dir> [--minimal <dir with theme.css and manifest.json>]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root, 'Pass a new directory for the disposable vault');
const minimalIndex = process.argv.indexOf('--minimal');
const minimalDir = minimalIndex > 0 ? process.argv[minimalIndex + 1] : undefined;

const sample = `# Heading one. *A quieter page*
Body text with **bold words**, *italic words*, ***bold italic***, ==highlighted text==, \`inline code\`, a [[Link target]], an [external link](https://example.com) and a #tag.

## Heading two
Text under the second heading.

> A quote that should stand apart from body text.

### Heading three
- First item with **emphasis**
- [x] Done task
- [ ] Open task
- [X] Also complete
- [!] Special marker: retain its source semantics
- [>] Special marker: do not reinterpret as complete

#### Heading four
##### Heading five
###### Heading six

\`\`\`ts
// a comment
function greet(name: string): string {
  const value = "hello " + name;
  return value;
}
\`\`\`

| Column | Value |
| ------ | ----- |
| Alpha  | 1     |
| Beta   | 2     |

> [!note] Note
> Blue information surface.

> [!tip] Tip
> Mint success surface.

> [!warning] Warning
> Peach warning surface.

> [!question] Question
> Lavender question surface.

> [!quote] Quote
> Yellow quote surface.

![[Notes/Embedded.md]]

中文内容、**加粗**与*斜体*，用来检查中文字体。
`;
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, sync: false, navigator: false };
const files = { 'Sample.md': sample, 'Notes/Embedded.md': '# Embedded note\n\n中文内容、**加粗**、*斜体*与 [[Sample|返回样例]]。\n', 'Notes/Project plan.md': '# Plan\n', 'Notes/Reading list.md': '# Reading\n', 'Daily/2026-10-21.md': '# Today\n', 'Ideas.md': '# Ideas\n' };
if (minimalDir) for (const name of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${name}`] = await fs.readFile(path.join(minimalDir, name), 'utf8');
const { connection: c, stop, shot, evidence } = await launchFreshVault({
	root, files, port: 9341,
	settings: { version: 1, namespaces: { app: { language: 'zh', introSeen: true, modules } } },
});
const run = (expression) => c.evaluate(expression);
const huhu = 'app.plugins.plugins.huhu';
const results = [];
let hostEnvironment;
const check = (name, passed, detail) => {
	results.push({ name, passed, detail });
	assert.ok(passed, `${name}: ${JSON.stringify(detail)}`);
};
const until = async (expression, label) => {
	for (let attempt = 0; attempt < 80; attempt++) {
		if (await run(expression)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${label}`);
};
const THEMES = ['default', 'pearl', 'soft', 'graphite', 'cobalt', 'sage', 'amber', 'blush', 'vscode', 'idea', 'xcode', 'jetbrains', 'cursor', 'claude-code', 'eye-care', 'custom', 'suliworld'];
const SCHEMES = ['follow', 'github', 'one', 'solarized', 'nord', 'dracula', 'gruvbox', 'claude-code', 'eye-care', 'suliworld'];
const setLook = async (patch, mode) => {
	await run(`${huhu}.theme.update(d=>Object.assign(d,${JSON.stringify(patch)}),{persist:'immediate'})`);
	if (mode) await run(`app.changeTheme(${JSON.stringify(mode === 'dark' ? 'obsidian' : 'moonstone')})`);
	await delay(500);
};
const vars = (names) => run(`(()=>{const cs=getComputedStyle(document.body);return Object.fromEntries(${JSON.stringify(names)}.map(n=>[n,cs.getPropertyValue(n).trim()]))})()`);
const colorsOf = () => run(`(()=>{const q=(s)=>document.querySelector(s),col=(el)=>el?getComputedStyle(el).color:null;return{h1:col(q('.markdown-source-view .cm-header-1')||q('.markdown-rendered h1')),bold:col(q('.markdown-source-view .cm-strong')),link:col(q('.markdown-source-view .cm-hmd-internal-link, .markdown-source-view .cm-link')),editorFont:getComputedStyle(q('.markdown-source-view .cm-content')).fontFamily,editorSize:getComputedStyle(q('.markdown-source-view .cm-content')).fontSize}})()`);
try {
	hostEnvironment = await run(`(()=>{const runtime=require('process');return {appVersion:require('@electron/remote').app.getVersion(),platform:runtime.platform,arch:runtime.arch,electron:runtime.versions.electron,chrome:runtime.versions.chrome}})()`);
	if (minimalDir) hostEnvironment.communityTheme = { name: 'Minimal', ...JSON.parse(await fs.readFile(path.join(minimalDir, 'manifest.json'), 'utf8')) };
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1180, deviceScaleFactor: 1, mobile: false });
	if (minimalDir) {
		await run(`app.customCss.setTheme('Minimal')`);
		await delay(1000);
	}
	await run(`(async()=>{const leaf=app.workspace.getLeaf(false);await leaf.openFile(app.vault.getAbstractFileByPath('Sample.md'));app.workspace.rightSplit?.collapse?.();})()`);
	// The HUHU board in a split next to the note.
	await run(`(async()=>{await ${huhu}.openWorkbench({feature:'dashboard'});await new Promise(r=>setTimeout(r,1500));const wb=app.workspace.getLeavesOfType('huhu-workbench-view')[0];const st=wb.getViewState();const right=app.workspace.getLeaf('split','vertical');await right.setViewState(st);wb.detach();await new Promise(r=>setTimeout(r,1200))})()`);
	const probeNames = ['--background-primary', '--background-secondary', '--text-normal', '--interactive-accent', '--nt-background', '--nt-primary'];
	const prefix = minimalDir ? 'minimal-' : '';

	// Baselines: with the Default theme nothing of ours may be set, so Obsidian (or Minimal) is exactly itself.
	const baseline = {};
	for (const mode of ['light', 'dark']) {
		await setLook({ preset: 'default', editor: 'follow' }, mode);
		const classes = await run(`[...document.body.classList].filter(c=>c.startsWith('huhu-'))`);
		const inline = await run(`document.body.getAttribute('style')||''`);
		baseline[mode] = await vars(probeNames);
		check(`${prefix}default-${mode}-adds-nothing`, classes.length === 0 && !/--nt-|--huhu-user/.test(inline) && baseline[mode]['--nt-background'] === '', { classes, inline });
		await shot(`${prefix}theme-default-${mode}`);
	}

	for (const theme of THEMES.filter((id) => id !== 'default')) {
		for (const mode of ['light', 'dark']) {
			await setLook({ preset: theme, editor: 'follow' }, mode);
			const v = await vars(probeNames);
			check(`${prefix}${theme}-${mode}-maps-tokens-to-obsidian`, v['--nt-background'] !== '' && v['--background-primary'].toLowerCase() === v['--nt-background'].toLowerCase() && v['--interactive-accent'].toLowerCase() === v['--nt-primary'].toLowerCase(), v);
			check(`${prefix}${theme}-${mode}-differs-from-default`, ['--background-primary', '--background-secondary', '--text-normal', '--interactive-accent'].some((name) => v[name] !== baseline[mode][name]), { v, baseline: baseline[mode] });
			await shot(`${prefix}theme-${theme}-${mode}`);
		}
	}
	await setLook({ preset: 'default' }, 'light');
	check(`${prefix}switching-back-to-default-restores-the-baseline`, JSON.stringify(await vars(probeNames)) === JSON.stringify(baseline.light), await vars(probeNames));

	// Editor colour schemes, alone and next to Claude Code / Eye care themes.
	for (const [theme, schemes] of [['default', SCHEMES], ['claude-code', ['follow', 'claude-code', 'github']], ['eye-care', ['follow', 'eye-care', 'nord']]]) {
		for (const scheme of schemes) {
			for (const mode of ['light', 'dark']) {
				await setLook({ preset: theme, editor: scheme }, mode);
				const colors = await colorsOf();
				if (scheme !== 'follow') {
					const ne = await vars(['--ne-h1', '--h1-color', '--ne-link', '--link-color']);
					check(`${prefix}${theme}-${scheme}-${mode}-maps-editor-tokens`, ne['--ne-h1'] !== '' && ne['--h1-color'] === ne['--ne-h1'] && ne['--link-color'] === ne['--ne-link'], ne);
				}
				if (theme === 'default' || scheme !== 'follow') await shot(`${prefix}editor-${theme}-${scheme}-${mode}`);
				results.push({ name: `${prefix}editor-${theme}-${scheme}-${mode}`, passed: true, detail: colors });
			}
		}
	}

	// Representative structural matrix, not the Cartesian product of all retained palettes.
	const noteMode = async (mode) => {
		await run(`(async()=>{const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path==='Sample.md'&&l.view.containerEl.ownerDocument===document);const state=leaf.getViewState();await leaf.setViewState({...state,state:{...state.state,mode:${JSON.stringify(mode === 'reading' ? 'preview' : 'source')},source:${mode === 'source'}}})})()`);
		await delay(450);
	};
	for (const scenario of [
		{ name: 'cream-light', mode: 'light', preset: 'suliworld', editor: 'follow', suliworldVariant: 'cream' },
		{ name: 'forest-light', mode: 'light', preset: 'suliworld', editor: 'follow', suliworldVariant: 'forest' },
		{ name: 'suliworld-dark', mode: 'dark', preset: 'suliworld', editor: 'follow', suliworldVariant: 'cream' },
		{ name: 'forest-github-light', mode: 'light', preset: 'suliworld', editor: 'github', suliworldVariant: 'forest' },
		{ name: 'default-github-dark', mode: 'dark', preset: 'default', editor: 'github', suliworldVariant: 'cream' },
	]) {
		const { name, mode, ...patch } = scenario;
		await setLook({ ...patch, headings: 'scheme', emphasis: 'scheme', suliworldCards: 'dark' }, mode);
		for (const viewMode of ['reading', 'live-preview', 'source']) {
			await noteMode(viewMode);
			const probe = await run(`(()=>{const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path==='Sample.md'&&l.view.containerEl.ownerDocument===document);const el=leaf.view.containerEl;const heading=el.querySelector('.markdown-rendered h2, .HyperMD-header-2');const cs=heading?getComputedStyle(heading):null;const panel=document.querySelector('.huhu-panel');return {classes:[...document.body.classList],state:leaf.getViewState().state,source:leaf.view.getMode()==='source',live:leaf.view.getMode()==='source'&&el.querySelector('.markdown-source-view')?.classList.contains('is-live-preview'),heading:cs?{font:cs.fontFamily,border:cs.borderBottomWidth,marker:getComputedStyle(heading,'::before').content}:null,panel:panel?{background:getComputedStyle(panel).backgroundColor,foreground:getComputedStyle(panel).color}:null}})()`);
			const style = patch.editor === 'github' ? 'github' : 'suliworld';
			check(`${prefix}${name}-${viewMode}-effective-style`, probe.classes.includes(`huhu-md-style--${style}`) && probe.classes.includes(`huhu-md-headings--${style}`) && !probe.classes.includes('huhu-md-headings--accented'), probe);
			check(`${prefix}${name}-${viewMode}-native-mode`, viewMode === 'reading' ? !probe.source : probe.source && probe.live === (viewMode === 'live-preview'), probe.state);
			await shot(`${prefix}structure-${name}-${viewMode}`);
		}
	}
	await noteMode('live-preview');
	await setLook({ preset: 'suliworld', editor: 'follow', suliworldVariant: 'forest' }, 'light');
	const forest = await run(`(()=>{const root=document.querySelector('.huhu-ui');const side=document.querySelector('.workspace-split.mod-sidedock');const rc=getComputedStyle(root),sc=getComputedStyle(side);return {page:rc.getPropertyValue('--background').trim(),muted:rc.getPropertyValue('--muted').trim(),sidebar:rc.getPropertyValue('--sidebar').trim(),sideText:sc.color,sideBackground:sc.backgroundColor}})()`);
	check(`${prefix}forest-keeps-neutral-controls-separate-from-sidebar`, forest.muted !== forest.sidebar && forest.page !== forest.sidebar, forest);
	// Real navigator surfaces: a sidebar, a center leaf, then the same leaf migrated into
	// another owner Document. These probes are intentionally not replaced by DOM fixtures.
	await run(`${huhu}.setModuleEnabled('navigator',true)`);
	try {
		await run(`${huhu}.settingsNamespace('navigator').update(d=>{d.calendarOpen=true})`);
		await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length>0`, 'navigator leaf');
		await run(`window.__themeNavigatorLeaf=app.workspace.getLeavesOfType('huhu-navigator-view')[0];true`);
		for (const location of ['dock', 'center', 'popout']) {
			if (location === 'center') await run(`(async()=>{const previous=window.__themeNavigatorLeaf;const note=app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.file?.path==='Sample.md'&&leaf.view.containerEl.ownerDocument===document);app.workspace.setActiveLeaf(note,{focus:true});const center=app.workspace.getLeaf('split','vertical');await center.setViewState(previous.getViewState());previous.detach();window.__themeNavigatorLeaf=center;app.workspace.setActiveLeaf(center,{focus:true})})()`);
			if (location === 'popout') await run(`app.workspace.moveLeafToPopout(window.__themeNavigatorLeaf);true`);
			// Restored leaves may still be deferred. Opening the calendar does not select a
			// date or show its agenda, so exercise that user action before probing inputs.
			await run(`(async()=>{const leaf=window.__themeNavigatorLeaf;await leaf.loadIfDeferred();${location === 'dock' ? 'app.workspace.leftSplit.expand();' : ''}await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});return true})()`);
			await until(`(()=>{const leaf=window.__themeNavigatorLeaf;const doc=leaf?.view.containerEl.ownerDocument;return !!leaf?.view.containerEl.querySelector('[data-navigator-calendar] [data-date]')&&${location === 'popout' ? 'doc!==document' : 'doc===document'}&&doc.body.classList.contains('huhu-theme-variant--forest')})()`, `Forest navigator ${location} calendar`);
			const selectedDate = await run(`(()=>{const root=window.__themeNavigatorLeaf.view.containerEl.querySelector('[data-navigator-calendar]');const day=root.querySelector('[data-date][data-selected]')||root.querySelector('[data-date]');day.click();return day.dataset.date})()`);
			await until(`!!window.__themeNavigatorLeaf.view.containerEl.ownerDocument.querySelector('[data-calendar-agenda="${selectedDate}"] input')`, `Forest navigator ${location} selected agenda`);
			const navigator = await run(`(()=>{const leaf=window.__themeNavigatorLeaf;const root=leaf.view.containerEl.querySelector('[data-navigator-root]');const doc=root.ownerDocument,win=doc.defaultView,cs=win.getComputedStyle(root);const color=selector=>win.getComputedStyle((selector.startsWith('[data-calendar-agenda]') ? doc : root).querySelector(selector)).color;const note=document.querySelector('.workspace .mod-root .markdown-source-view');return {dock:!!root.closest('.mod-sidedock'),otherDocument:doc!==document,background:cs.backgroundColor,month:color('[data-calendar-month]'),agenda:color('[data-calendar-agenda]'),input:color('[data-calendar-agenda] input'),tokens:Object.fromEntries(['--background','--foreground','--muted-foreground','--input','--status-error','--primary','--primary-foreground'].map(key=>[key,cs.getPropertyValue(key).trim()])),note:note?getComputedStyle(note).getPropertyValue('--text-normal').trim():null}})()`);
			check(`${prefix}forest-navigator-${location}-owns-readable-surface`, navigator.dock === (location === 'dock') && navigator.otherDocument === (location === 'popout') && navigator.background === 'rgb(31, 59, 45)' && navigator.month === 'rgb(251, 247, 240)' && [navigator.agenda, navigator.input].every(color => color === 'rgb(27, 26, 23)') && navigator.tokens['--background'] === '#1f3b2d' && navigator.tokens['--input'] === '#507560' && navigator.tokens['--status-error'] === '#ffad9b', navigator);
			check(`${prefix}forest-navigator-${location}-does-not-recolour-central-notes`, navigator.note === '#1b1a17', navigator.note);
			await run(`(()=>{const doc=window.__themeNavigatorLeaf.view.containerEl.ownerDocument;doc.querySelector('[role=dialog] [data-slot=dialog-close]')?.click();return true})()`);
			await delay(200);
			// Opening the real month picker also checks that adoption moved the portal to
			// its owner Document and did not pair white sidebar text with a white popover.
			await run(`window.__themeNavigatorLeaf.view.containerEl.querySelector('[data-calendar-month] button[aria-haspopup="dialog"]').click()`);
			await until(`!!window.__themeNavigatorLeaf.view.containerEl.ownerDocument.querySelector('[data-calendar-year-panel]')`, `navigator ${location} month picker`);
			const portal = await run(`(()=>{const doc=window.__themeNavigatorLeaf.view.containerEl.ownerDocument;const panel=doc.querySelector('[data-calendar-year-panel]').closest('[data-slot="popover-content"]');const cs=doc.defaultView.getComputedStyle(panel);return {owned:panel.ownerDocument===doc,outsideNavigator:!panel.closest('[data-navigator-root]'),portalRoot:!!panel.closest('.huhu-portal-root'),foreground:cs.color,background:cs.backgroundColor}})()`);
			check(`${prefix}forest-navigator-${location}-portal-keeps-own-colour-pair`, portal.owned && portal.outsideNavigator && portal.portalRoot && portal.foreground === 'rgb(27, 26, 23)' && portal.background === 'rgb(255, 255, 255)', portal);
			if (location !== 'popout') await shot(`${prefix}forest-navigator-${location}`);
			await run(`(()=>{const doc=window.__themeNavigatorLeaf.view.containerEl.ownerDocument;(doc.activeElement||doc.body).dispatchEvent(new doc.defaultView.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))})()`);
			await until(`!window.__themeNavigatorLeaf.view.containerEl.ownerDocument.querySelector('[data-calendar-year-panel]')`, `close navigator ${location} month picker`);
		}
	} finally {
		await run(`window.__themeNavigatorLeaf?.detach();delete window.__themeNavigatorLeaf`);
		await run(`${huhu}.setModuleEnabled('navigator',false)`);
	}
	const loadedFonts = await run(`(async()=>{const faces=['400 16px "HUHU Suliworld Outfit"','italic 400 16px "HUHU Suliworld Newsreader"','400 16px "HUHU Suliworld Manrope"','italic 400 16px "HUHU Suliworld Instrument Serif"','400 16px "HUHU Suliworld iA Writer Duo"','italic 400 16px "HUHU Suliworld iA Writer Duo"','700 16px "HUHU Suliworld iA Writer Duo"'];return Promise.all(faces.map(async font=>({font,loaded:(await document.fonts.load(font)).length>0})))})()`);
	check(`${prefix}suliworld-bundled-fonts-load`, loadedFonts.every((face) => face.loaded), loadedFonts);
	const hostFont = await run(`(()=>{const names=['--font-text-override','--font-interface-override','--font-monospace-override'];const before=names.map(name=>({name,value:document.body.style.getPropertyValue(name),priority:document.body.style.getPropertyPriority(name)}));try{document.body.style.setProperty('--font-text-override','Georgia');document.body.style.setProperty('--font-interface-override','Arial');document.body.style.setProperty('--font-monospace-override','"Courier New"');const ui=document.querySelector('.huhu-ui'),mono=document.createElement('code');mono.style.fontFamily='var(--nd-font-mono)';ui.append(mono);const result={note:getComputedStyle(document.querySelector('.markdown-source-view .cm-content')).fontFamily,ui:getComputedStyle(ui).fontFamily,mono:getComputedStyle(mono).fontFamily};mono.remove();return result}finally{for(const {name,value,priority} of before){if(value)document.body.style.setProperty(name,value,priority);else document.body.style.removeProperty(name)}}})()`);
	check(`${prefix}host-explicit-fonts-win-over-recommendations`, hostFont.note.startsWith('Georgia') && hostFont.ui.startsWith('Arial') && hostFont.mono.startsWith('"Courier New"'), hostFont);
	await run(`(async()=>{window.__themePopoutLeaf=app.workspace.openPopoutLeaf();await window.__themePopoutLeaf.openFile(app.vault.getAbstractFileByPath('Sample.md'))})()`);
	await delay(600);
	const popoutClasses = await run(`[...window.__themePopoutLeaf.view.containerEl.ownerDocument.body.classList]`);
	check(`${prefix}suliworld-reaches-popout`, popoutClasses.includes('huhu-theme--suliworld') && popoutClasses.includes('huhu-md-style--suliworld'), popoutClasses);
	await setLook({ preset: 'default', editor: 'follow' });
	const popoutReset = await run(`[...window.__themePopoutLeaf.view.containerEl.ownerDocument.body.classList].filter(n=>n.startsWith('huhu-theme')||n.startsWith('huhu-md-')||n.startsWith('huhu-editor-')||n.startsWith('huhu-font-'))`);
	check(`${prefix}popout-reset-removes-style-and-font-recommendations`, popoutReset.length === 0, popoutReset);
	await run(`window.__themePopoutLeaf.detach();delete window.__themePopoutLeaf`);

	// Fonts: presets, a custom list, size and line height.
	await setLook({ preset: 'default', editor: 'follow' }, 'light');
	await setLook({ fontInterface: 'inter', fontText: 'serif', fontMono: 'jetbrains', fontSize: 20, lineHeight: 1.9 });
	const font = await run(`(()=>{const cs=getComputedStyle(document.body),ui=document.querySelector('.huhu-ui'),mono=document.createElement('code');mono.style.fontFamily='var(--nd-font-mono)';ui.append(mono);const result={interface:cs.getPropertyValue('--font-interface-theme').trim(),text:cs.getPropertyValue('--font-text-theme').trim(),mono:cs.getPropertyValue('--font-monospace-theme').trim(),sans:getComputedStyle(ui).fontFamily,huhuMono:getComputedStyle(mono).fontFamily,size:getComputedStyle(document.querySelector('.markdown-source-view .cm-content')).fontSize,tabSize:getComputedStyle(document.querySelector('.workspace-tab-header')).fontSize,editor:getComputedStyle(document.querySelector('.markdown-source-view .cm-content')).fontFamily};mono.remove();return result})()`);
	check(`${prefix}fonts-reach-obsidian-and-huhu`, font.interface.startsWith('"Inter"') && font.text.includes('Source Serif') && font.mono.startsWith('"JetBrains Mono"') && font.sans.includes('Inter') && font.huhuMono.includes('JetBrains Mono') && font.size === '20px' && font.editor.includes('Source Serif'), font);
	await shot(`${prefix}fonts-serif-inter-jetbrains-20`);
	await setLook({ fontInterface: 'custom', fontInterfaceCustom: 'Lora, Georgia', fontText: 'kai', fontMono: 'custom', fontMonoCustom: 'Fira Code' });
	const custom = await vars(['--font-interface-theme', '--font-text-theme', '--font-monospace-theme']);
	check(`${prefix}custom-font-lists-apply`, custom['--font-interface-theme'].startsWith('Lora, Georgia') && custom['--font-text-theme'].includes('LXGW') && custom['--font-monospace-theme'].startsWith('Fira Code'), custom);
	await shot(`${prefix}fonts-custom-kai`);
	await setLook({ fontInterface: 'default', fontText: 'default', fontMono: 'default', fontSize: 0, lineHeight: 0 });
	check(`${prefix}fonts-reset-leaves-no-trace`, (await run(`[...document.body.classList].filter(c=>c.startsWith('huhu-')).length`)) === 0, {});

	// The settings page: theme swatches, custom colours, editor swatches, typography.
	await setLook({ preset: 'default' }, 'light');
	await run(`${huhu}.openWorkbench({feature:'settings',section:'appearance'})`);
	await delay(1500);
	const scrollers = `(()=>{window.__scrollers=[...document.querySelectorAll('.huhu-ui *')].filter(e=>e.scrollHeight>e.clientHeight+80&&['auto','scroll'].includes(getComputedStyle(e).overflowY));return window.__scrollers.length})()`;
	await run(scrollers);
	const scrollTo = async (y) => { await run(`window.__scrollers.forEach(e=>e.scrollTop=${y})`); await delay(250); };
	for (const [theme, mode] of [['default', 'light'], ['claude-code', 'dark'], ['eye-care', 'light']]) {
		await setLook({ preset: theme }, mode);
		for (const [name, y] of [['top', 0], ['editor', 640], ['fonts', 1500]]) { await scrollTo(y); await shot(`${prefix}settings-${theme}-${mode}-${name}`); }
	}
	// Choosing a theme from the swatches really writes the setting; the custom editor appears.
	await scrollTo(0);
	await run(`[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.getAttribute('aria-label')==='自定义').click()`);
	await delay(600);
	check(`${prefix}clicking-a-swatch-selects-the-theme`, (await run(`${huhu}.theme.get().preset`)) === 'custom', {});
	await scrollTo(380);
	await shot(`${prefix}settings-custom-colors`);
	const overflow = await run(`(()=>{const out=[];for(const e of document.querySelectorAll('.huhu-ui button')){const r=e.getBoundingClientRect();const p=e.parentElement.getBoundingClientRect();if(r.width&&(r.right>p.right+1||r.left<p.left-1))out.push(e.getAttribute('aria-label')||e.textContent.slice(0,20));}return out})()`);
	check(`${prefix}settings-swatches-do-not-overflow`, overflow.length === 0, overflow);

	// Inspect the actual scriptless iframe after MarkdownRenderer has settled, not
	// the colour swatches or hand-built stand-ins for CodeMirror content.
	await setLook({ preset: 'suliworld', editor: 'follow', suliworldVariant: 'forest' }, 'light');
	// Note comparisons are complete. Use one real central settings leaf so the
	// responsive preview screenshots measure its available width rather than two
	// deliberately split fixture panes competing for a phone-sized viewport.
	await run(`(async()=>{const settings=app.workspace.getLeavesOfType('huhu-workbench-view').find(leaf=>leaf.view.containerEl.ownerDocument===document);for(const leaf of app.workspace.getLeavesOfType('markdown').filter(leaf=>leaf.view.file?.path==='Sample.md'&&leaf.view.containerEl.ownerDocument===document))leaf.detach();app.workspace.leftSplit.collapse();app.workspace.rightSplit?.collapse?.();await app.workspace.revealLeaf(settings);app.workspace.setActiveLeaf(settings,{focus:true});return true})()`);
	const previewFrame = `document.querySelector('iframe[title="阅读样例"]')`;
	const previewReady = () => until(`(()=>{const doc=${previewFrame}?.contentDocument;return !!doc?.querySelector('.huhu-appearance-preview-sample h1')&&!doc.querySelector('.huhu-appearance-preview-status')})()`, 'real appearance preview finished rendering');
	const selectPreviewMode = async (mode) => {
		await run(`(()=>{const control=[...document.querySelectorAll('[role="radiogroup"][aria-label="预览明暗"] [role="radio"]')].find(button=>button.textContent.trim()===${JSON.stringify(mode === 'dark' ? '暗色' : '亮色')});if(!control)throw Error('Missing preview brightness control');control.click();return true})()`);
		await until(`!!${previewFrame}?.contentDocument?.body.classList.contains('theme-${mode}')`, `preview ${mode} mode`);
		await previewReady();
	};
	const selectPreviewWidth = async (narrow) => {
		await run(`(()=>{const control=[...document.querySelectorAll('.huhu-ui button[aria-pressed]')].find(button=>button.textContent.trim()==='手机宽度');if(!control)throw Error('Missing preview width control');if((control.getAttribute('aria-pressed')==='true')!==${narrow})control.click();return true})()`);
		await until(`(()=>{const frame=${previewFrame};return !!frame?.contentDocument?.body.classList.contains('huhu-appearance-preview')&&frame.contentDocument.body.classList.contains('is-phone')===${narrow}})()`, `preview ${narrow ? 'phone' : 'wide'} width`);
		await previewReady();
	};
	await previewReady();
	await until(`(()=>{const images=[...(${previewFrame}?.contentDocument?.querySelectorAll('.huhu-appearance-preview-sample img')||[])];return images.every(image=>image.complete)})()`, 'preview offline image finished loading');
	const renderedPreview = await run(`(()=>{const frame=${previewFrame};const doc=frame.contentDocument;const sample=doc.querySelector('.huhu-appearance-preview-sample');const tasks=[...sample.querySelectorAll('input[type="checkbox"]')];return {sandbox:frame.getAttribute('sandbox'),headings:[1,2,3,4,5,6].map(level=>sample.querySelectorAll('h'+level).length),callouts:[...sample.querySelectorAll('.callout')].map(callout=>callout.dataset.callout),tableRows:sample.querySelectorAll('table tr').length,code:!!sample.querySelector('pre code'),tasks:tasks.map(task=>({disabled:task.disabled,checked:task.checked})),images:[...sample.querySelectorAll('img')].map(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0})),embed:!!sample.querySelector('.internal-embed.markdown-embed .markdown-rendered'),copiedStyles:doc.head.querySelectorAll('[data-huhu-preview-style]').length,classes:[...doc.body.classList]}})()`);
	check(`${prefix}preview-renders-real-representative-markdown`, renderedPreview.headings.every(count => count > 0) && ['note', 'tip', 'warning', 'question', 'quote'].every(type => renderedPreview.callouts.includes(type)) && renderedPreview.tableRows >= 3 && renderedPreview.code && renderedPreview.embed && renderedPreview.tasks.length >= 3 && renderedPreview.tasks.every(task => task.disabled) && renderedPreview.tasks.filter(task => task.checked).length >= 2, renderedPreview);
	check(`${prefix}preview-loads-offline-image-and-owning-styles`, renderedPreview.images.length > 0 && renderedPreview.images.every(image => image.loaded && image.src?.startsWith('data:')) && renderedPreview.copiedStyles > 0 && renderedPreview.sandbox === 'allow-same-origin' && renderedPreview.classes.includes('huhu-md-style--suliworld'), renderedPreview);
	const hostAppearance = () => run(`({settings:${huhu}.theme.get(),classes:[...document.body.classList].filter(name=>name.startsWith('huhu-')||name==='theme-light'||name==='theme-dark').sort(),inline:document.body.style.cssText})`);
	const storedTheme = async () => JSON.parse(await fs.readFile(path.join(root, 'vault', '.huhu', 'config', 'settings.json'), 'utf8')).namespaces.theme;
	const beforePreviewControls = { host: await hostAppearance(), stored: await storedTheme() };
	for (const mode of ['dark', 'light']) {
		await selectPreviewMode(mode);
		const frameState = await run(`(()=>{const doc=${previewFrame}.contentDocument;return {mode:doc.body.classList.contains('theme-${mode}'),style:doc.body.classList.contains('huhu-md-style--suliworld'),background:doc.defaultView.getComputedStyle(doc.body).backgroundColor}})()`);
		check(`${prefix}preview-${mode}-uses-effective-style`, frameState.mode && frameState.style, frameState);
	}
	await selectPreviewWidth(true);
	const phonePreview = await run(`(()=>{const frame=${previewFrame},doc=frame.contentDocument,heading=doc.querySelector('.huhu-appearance-preview-sample h1').getBoundingClientRect();return {width:frame.getBoundingClientRect().width,mobile:doc.body.classList.contains('is-mobile'),sidebar:doc.defaultView.getComputedStyle(doc.querySelector('.mod-sidedock')).display,headingWidth:heading.width,headingHeight:heading.height}})()`);
	check(`${prefix}preview-phone-control-applies-isolated-mobile-layout`, phonePreview.mobile && phonePreview.width <= 340 && phonePreview.width >= 260 && phonePreview.sidebar === 'none' && phonePreview.headingWidth > 0 && phonePreview.headingHeight > 0, phonePreview);
	await selectPreviewWidth(false);
	for (const scenario of [
		{ name: 'wide-light', width: 1100, mode: 'light', narrow: false },
		{ name: 'medium-dark', width: 820, mode: 'dark', narrow: false },
		{ name: 'narrow-light', width: 480, mode: 'light', narrow: true },
	]) {
		await c.send('Emulation.setDeviceMetricsOverride', { width: scenario.width, height: 1180, deviceScaleFactor: 1, mobile: false });
		await selectPreviewMode(scenario.mode);
		await selectPreviewWidth(scenario.narrow);
		await run(`${previewFrame}.parentElement.scrollIntoView({block:'center',inline:'nearest'});true`);
		await delay(250);
		const layout = await run(`(()=>{const frame=${previewFrame},doc=frame.contentDocument,rect=frame.getBoundingClientRect(),heading=doc.querySelector('.huhu-appearance-preview-sample h1').getBoundingClientRect();return {viewport:innerWidth,left:rect.left,right:rect.right,width:rect.width,contentWidth:doc.documentElement.clientWidth,contentScrollWidth:doc.documentElement.scrollWidth,headingWidth:heading.width,headingHeight:heading.height}})()`);
		check(`${prefix}preview-${scenario.name}-fits-viewport`, layout.width > 240 && layout.left >= 0 && layout.right <= layout.viewport + 1 && layout.contentScrollWidth <= layout.contentWidth + 1 && layout.headingWidth > 0 && layout.headingHeight > 0, layout);
		await shot(`${prefix}settings-preview-${scenario.name}`);
	}
	const afterPreviewControls = { host: await hostAppearance(), stored: await storedTheme() };
	check(`${prefix}preview-controls-never-change-host-or-persisted-theme`, JSON.stringify(afterPreviewControls) === JSON.stringify(beforePreviewControls), { before: beforePreviewControls, after: afterPreviewControls });
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1180, deviceScaleFactor: 1, mobile: false });
	await selectPreviewWidth(false);
	// Separate current-style reset from the full reset; neither operation edits note content.
	await setLook({ preset: 'suliworld', editor: 'follow', suliworldVariant: 'forest', suliworldPlainQuotes: true, headings: 'plain', fontText: 'kai', fontSize: 19, lineHeight: 1.9 });
	await run(`[...document.querySelectorAll('.huhu-ui button')].find(b=>b.textContent.trim()==='恢复当前风格选项').click()`);
	await delay(500);
	const localReset = await run(`${huhu}.theme.get()`);
	check(`${prefix}current-style-reset-preserves-personal-typography`, localReset.suliworldVariant === 'cream' && localReset.suliworldPlainQuotes === false && localReset.headings === 'scheme' && localReset.fontText === 'kai' && localReset.fontSize === 19 && localReset.lineHeight === 1.9, localReset);
	await run(`[...document.querySelectorAll('.huhu-ui button')].find(b=>b.textContent.trim()==='重置外观').click()`);
	await delay(500);
	const fullReset = await run(`${huhu}.theme.get()`);
	check(`${prefix}full-reset-restores-default-style-and-typography`, fullReset.preset === 'default' && fullReset.editor === 'follow' && fullReset.fontText === 'default' && fullReset.fontSize === 0 && fullReset.lineHeight === 0, fullReset);
	const savedSample = await run(`app.vault.read(app.vault.getAbstractFileByPath('Sample.md'))`);
	check(`${prefix}style-switches-and-resets-never-rewrite-tasks-or-markdown`, savedSample === sample, { unchanged: savedSample === sample });
	const errors = await run(`window.huhuAcceptanceErrors||[]`);
	check(`${prefix}no-console-errors`, errors.length === 0, errors);
	await fs.writeFile(path.join(evidence, 'matrix.json'), JSON.stringify({ passed: true, host: hostEnvironment, results }, null, 1));
	console.log(JSON.stringify({ passed: true, host: hostEnvironment, evidence, checks: results.filter((row) => row.detail !== undefined).length }, null, 1));
} catch (error) {
	await shot('failure').catch(() => {});
	await fs.writeFile(path.join(evidence, 'matrix-failure.json'), JSON.stringify({ error: String(error?.stack ?? error), host: hostEnvironment, results }, null, 1));
	throw error;
} finally {
	await stop();
}

// Acceptance: Settings > Agent > Agents shows version, install locations, Install and Upgrade for agent CLIs.
// Fresh disposable vault; HOME and CLI homes point into the fixture, PATH holds only fake CLIs (a fake `codex` that
// reports 0.162.0 and sleeps on `update`, a second copy, a fake slow `npm`), so nothing real is read, run or installed.
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_TOOLS_FIXTURE=/dev/shm/huhu-tools-01 [HUHU_TOOLS_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2] \
//   [HUHU_TOOLS_LANG=zh] xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/agent-tools.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_TOOLS_FIXTURE;
assert.ok(root && /^\/(tmp|dev\/shm|var\/tmp)\/huhu-tools-/.test(root), 'HUHU_TOOLS_FIXTURE must be /tmp|/dev/shm|/var/tmp/huhu-tools-<name> and must not exist');
const minimalDir = process.env.HUHU_TOOLS_MINIMAL_DIR;
const language = process.env.HUHU_TOOLS_LANG || 'zh';
const home = path.join(root, 'home');
const binRoot = `${root}-bin`; // outside `root`, which the launcher creates itself
const fake = path.join(binRoot, 'fakebin'), fake2 = path.join(binRoot, 'other', 'bin');
await fs.mkdir(fake, { recursive: true });
await fs.mkdir(fake2, { recursive: true });
const script = (body) => `#!/bin/sh\n${body}\n`;
const codex = script('case "$1" in --version) echo "codex-cli 0.162.0";; update) sleep 40;; esac');
for (const dir of [fake, fake2]) { await fs.writeFile(path.join(dir, 'codex'), codex, { mode: 0o755 }); }
await fs.writeFile(path.join(fake, 'npm'), script('sleep 40'), { mode: 0o755 });
for (const tool of ['which', 'sh', 'bash', 'sleep', 'env', 'dirname']) {
	const real = ['/usr/bin', '/bin'].map((d) => path.join(d, tool));
	for (const file of real) if (await fs.stat(file).then(() => true, () => false)) { await fs.symlink(file, path.join(fake, tool)).catch(() => undefined); break; }
}
Object.assign(process.env, {
	PATH: `${fake}:${fake2}`,
	CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'), GROK_HOME: path.join(home, '.grok'), GEMINI_CLI_HOME: home,
	XDG_DATA_HOME: path.join(home, '.local/share'), XDG_CACHE_HOME: path.join(home, '.cache'), XDG_STATE_HOME: path.join(home, '.local/state'),
});
const files = { 'Welcome.md': '# Tools fixture\n' };
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal' });
}
const modules = { home: false, agent: true, automations: false, notifications: false, archives: false, comments: false, browser: false, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({ root, port: Number(process.env.HUHU_TOOLS_PORT || 19621), files, settings: { version: 1, namespaces: { app: { language, introSeen: true, modules } } } });
const c = runtime.connection;
const results = [];
const check = (name, passed, detail) => { results.push({ name, passed, detail }); assert.ok(passed, `${name} ${JSON.stringify(detail ?? '')}`); };
const until = async (expression, name, timeout = 30000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) { if (await c.evaluate(expression).catch(() => false)) return; await delay(150); }
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,800)').catch(() => '')}`);
};
const mouse = async (p) => {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
	await delay(450);
};
const point = (expression) => c.evaluate(`(() => { const e = ${expression}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const click = async (expression) => mouse(await point(expression));
const row = (id) => `document.querySelector('[data-agent-catalog="${id}"]')`;
const button = (id, label) => `[...${row(id)}.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})`;
const shot = async (name) => { await delay(300); await runtime.shot(name); };
const setSize = async (width, height = 1000) => { await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, ${height}); true`); await delay(700); };
const setLook = async (dark, minimal) => {
	await c.evaluate(`(app.customCss.setTheme(${JSON.stringify(minimal ? 'Minimal' : '')}), app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}), app.updateTheme(), true)`);
	await until(`document.body.classList.contains(${JSON.stringify(dark ? 'theme-dark' : 'theme-light')})`, 'theme');
	await delay(500);
};
const overflow = () => c.evaluate(`(() => { const root = document.querySelector('[data-agent-settings]'); const box = root.getBoundingClientRect(); const bad = [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1); }).slice(0, 5).map(e => e.outerHTML.slice(0, 100)); return { bad, scroll: document.documentElement.scrollWidth > innerWidth + 1 }; })()`);
const L = language === 'zh'
	? { upgrade: '升级', upgrading: '升级中…', install: '安装', installing: '安装中…', more: '另有 1 处安装' }
	: { upgrade: 'Upgrade', upgrading: 'Upgrading…', install: 'Install', installing: 'Installing…', more: '1 more installed' };

try {
	await c.evaluate('app.workspace.leftSplit.collapse(); true');
	await setSize(1440);
	await setLook(false, false);
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'settings', section: 'terminal', resourceId: 'agents' }).then(() => true)`);
	await until(`!!${row('codex')}?.querySelector('[data-agent-version]')`, 'codex version');
	check('shows-version', await c.evaluate(`${row('codex')}.querySelector('[data-agent-version]').textContent.includes('0.162.0')`));
	check('shows-location', await c.evaluate(`${row('codex')}.querySelector('[data-agent-locations]').textContent.includes(${JSON.stringify(path.join(fake, 'codex'))})`));
	check('shows-other-installs', await c.evaluate(`!!${button('codex', L.more)}`));
	check('uninstalled-has-install', await c.evaluate(`!!${button('gemini', L.install)} && !!${button('claude-code', L.install)}`));
	check('installed-has-upgrade', await c.evaluate(`!!${button('codex', L.upgrade)}`));
	await click(button('codex', L.more));
	await shot('01-installed-and-available');
	// Busy states with the fake slow updater / npm.
	await click(button('codex', L.upgrade));
	await until(`!!${button('codex', L.upgrading)}`, 'upgrading state');
	await click(button('gemini', L.install));
	await until(`!!${button('gemini', L.installing)}`, 'installing state');
	check('busy-buttons-disabled', await c.evaluate(`${button('codex', L.upgrading)}.disabled && ${button('gemini', L.installing)}.disabled`));
	await shot('02-busy');
	const looks = [[false, false, 'default-light'], [true, false, 'default-dark']];
	if (minimalDir) looks.push([false, true, 'minimal-light'], [true, true, 'minimal-dark']);
	for (const [dark, minimal, label] of looks) {
		await setLook(dark, minimal);
		for (const width of [1440, 900, 640]) {
			await setSize(width);
			await until(`!!document.querySelector('[data-agent-settings]')`, 'still open');
			const result = await overflow();
			check(`no-overflow-${label}-${width}`, result.bad.length === 0 && !result.scroll, result);
			await shot(`layout-${label}-${width}`);
		}
	}
	const errors = await c.evaluate('window.huhuAcceptanceErrors ?? []');
	check('no-console-errors', errors.length === 0, errors);
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2));
	console.log(`agent tools acceptance passed (${results.length} checks); evidence: ${runtime.evidence}`);
} catch (error) {
	await runtime.shot('failure').catch(() => undefined);
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2)).catch(() => undefined);
	throw error;
} finally {
	await runtime.stop();
}

// Acceptance: browser Cookie import messages in real Obsidian (locked Cookie database + a mixed result).
// The "locked" case is real: a fake Chrome profile in the fixture's XDG config whose Cookies file is unreadable (EACCES),
// which the importer classifies exactly like Windows EBUSY. HOME/XDG point into the fixture root; nothing real is read.
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_COOKIE_FIXTURE=/dev/shm/huhu-cookie-01 [HUHU_COOKIE_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2] \
//   [HUHU_COOKIE_LANG=zh] [HUHU_COOKIE_LOOK=default-light|default-dark|minimal-light|minimal-dark] xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/browser-cookie-import.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_COOKIE_FIXTURE;
assert.ok(root && /^\/(tmp|dev\/shm|var\/tmp)\/huhu-cookie-/.test(root), 'HUHU_COOKIE_FIXTURE must be /tmp|/dev/shm|/var/tmp/huhu-cookie-<name> and must not exist');
const minimalDir = process.env.HUHU_COOKIE_MINIMAL_DIR;
const language = process.env.HUHU_COOKIE_LANG || 'en';
// Switching theme with the settings page open blanks it, so each look is its own launch: set the look, then open.
const look = process.env.HUHU_COOKIE_LOOK || 'default-light';
const [mode, variant] = look.split('-');
const files = { 'Welcome.md': '# Cookie import\n' };
if (minimalDir && mode === 'minimal') {
	for (const file of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal' });
}
const modules = { home: false, agent: true, automations: false, notifications: false, archives: false, comments: false, browser: true, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_COOKIE_PORT || 19621),
	files,
	settings: { version: 1, namespaces: { app: { language, introSeen: true, modules } } },
});
const c = runtime.connection;
const check = (name, passed, detail) => assert.ok(passed, `${name} ${JSON.stringify(detail ?? '')}`);
const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) { if (await c.evaluate(expression).catch(() => false)) return; await delay(100); }
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,800)').catch(() => '')}`);
};
const mouse = async (point) => {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
	await delay(500);
};
const click = async (expression) => mouse(await c.evaluate(`(() => { const e = ${expression}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`));
const setLook = async (dark, minimal) => {
	await c.evaluate(`(app.customCss.setTheme(${JSON.stringify(minimal ? 'Minimal' : '')}), app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}), app.updateTheme(), true)`);
	await until(`document.body.classList.contains(${JSON.stringify(dark ? 'theme-dark' : 'theme-light')})`, 'theme');
	await delay(500);
};
const profile = (name) => JSON.stringify({ profile: { info_cache: { Default: { name } } } });
try {
	const config = path.join(root, 'config');
	for (const [dir, name, locked] of [['google-chrome', 'Ying', true], ['microsoft-edge', 'Work', false]]) {
		await fs.mkdir(path.join(config, dir, 'Default'), { recursive: true });
		await fs.writeFile(path.join(config, dir, 'Local State'), profile(name));
		await fs.writeFile(path.join(config, dir, 'Default', 'Cookies'), 'not a real database');
		if (locked) await fs.chmod(path.join(config, dir, 'Default', 'Cookies'), 0o000);
	}
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(1440, 1000); app.workspace.leftSplit.collapse(); true`);
	await setLook(variant === 'dark', mode === 'minimal');
	await delay(2500);
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'settings', section: 'browser' }).then(() => true)`);
	await until(`!!document.querySelector('button[aria-label="${language === 'zh' ? '导入 Cookie' : 'Import Cookies'}"]')`, 'import button');
	// Edge is answered by a canned mixed result; Chrome goes through the real importer and hits the unreadable file.
	await c.evaluate(`(() => { const host = app.plugins.plugins.huhu.services.peek({ owner: 'browser', id: 'host' }); const real = host.importCookiesFromBrowser.bind(host); host.importCookiesFromBrowser = (source, id) => source.family === 'edge' ? Promise.resolve({ imported: 46, skipped: 3, googleSkipped: 24, decryptFailed: 78, warning: 'app-bound-encryption', source: 'Microsoft Edge (Work)', method: 'database', fallback: 'browser-failed' }) : real(source, id); return true; })()`);
	const label = language === 'zh' ? '导入 Cookie' : 'Import Cookies';
	const pick = async (family) => {
		const item = `[...document.querySelectorAll('[role=menuitem]')].find(e => e.textContent.includes(${JSON.stringify(family)}))`;
		for (let attempt = 0; attempt < 4 && !(await c.evaluate(`!!${item}`)); attempt++) {
			await click(`document.querySelector('button[aria-label="${label}"]')`);
			await delay(900);
		}
		await until(`!!${item}`, 'menu item ' + family);
		await click(item);
	};
	const name = look;
	await pick('Chrome');
	await until(`!![...document.querySelectorAll('[data-sonner-toast]')].find(e => /${language === 'zh' ? '完全退出浏览器' : 'Quit it completely'}/.test(e.textContent))`, 'locked toast', 15000);
	const text = await c.evaluate(`[...document.querySelectorAll('[data-sonner-toast]')].map(e => e.textContent).join('|')`);
	check('locked-toast-has-no-errno', !/EBUSY|EACCES|copyfile/i.test(text), text);
	check('locked-toast-has-retry', /Retry|重试/.test(text), text);
	await delay(800);
	await runtime.shot(`${name}-locked`);
	await pick('Edge');
	await until(`!![...document.querySelectorAll('[data-sonner-toast]')].find(e => e.textContent.includes('46'))`, 'result toast');
	await delay(800);
	await runtime.shot(`${name}-result`);
	console.log(JSON.stringify({ evidence: runtime.evidence, passed: true }));
} catch (error) {
	await runtime.shot('failure').catch(() => undefined);
	console.log(JSON.stringify(await c.evaluate('window.huhuAcceptanceErrors').catch(String)).slice(0, 1500));
	throw error;
} finally {
	await fs.chmod(path.join(root, 'config/google-chrome/Default/Cookies'), 0o600).catch(() => undefined);
	await runtime.stop();
}

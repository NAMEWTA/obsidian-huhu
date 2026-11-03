// Acceptance (T-46): after the Browser / HUHU Bot / Home web-section / NetEase removal, a NEW disposable vault in real Obsidian shows
// no trace of them: commands, ribbon, workbench navigation, settings categories, Home and the agent workspace.
// Fresh vault and profile; HOME, CLI homes and XDG dirs live inside the fixture (nothing of the real home or any existing vault is read or written).
// Run from the repo root after `pnpm build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_PTY_BINARY=$PWD/native/pty-server/target/debug/huhu-pty HUHU_REMOVAL_FIXTURE=/tmp/huhu-removal-01 \
//   xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/removal-contraction.mjs --out temp/dev-overhaul/T-46/acceptance
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_REMOVAL_FIXTURE;
assert.ok(root && root.startsWith('/tmp/huhu-removal-'), 'HUHU_REMOVAL_FIXTURE must be /tmp/huhu-removal-<name> and must not exist');
const outIndex = process.argv.indexOf('--out');
const out = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : 'temp/dev-overhaul/T-46/acceptance');
await fs.mkdir(out, { recursive: true });
const home = path.join(root, 'home');
Object.assign(process.env, {
	CODEX_HOME: path.join(home, '.codex'),
	CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
	GROK_HOME: path.join(home, '.grok'),
	GEMINI_CLI_HOME: path.join(home, '.gemini'),
	XDG_DATA_HOME: path.join(home, '.local/share'),
	XDG_CACHE_HOME: path.join(home, '.cache'),
	XDG_STATE_HOME: path.join(home, '.local/state'),
});
const FORBIDDEN = /browser|huhu[-_ ]?bot|\bbot\b|netease|cloudmusic|网易云|浏览器|机器人/i;
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_REMOVAL_PORT || 19631),
	files: { 'Welcome.md': '# Removal fixture\n' },
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true } } },
});
const c = runtime.connection;
const results = [];
const check = (name, detail) => results.push({ name, detail });
const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,600)').catch(() => '')}`);
};
const shot = async (name) => {
	await delay(300);
	const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
	await fs.writeFile(path.join(out, `${name}.png`), Buffer.from(data, 'base64'));
};
let failure;
try {
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(1600,1000); true`);
	// 1. Commands: nothing HUHU registers mentions Browser or Bot.
	const commands = await c.evaluate(`Object.values(app.commands.commands).filter(x => x.id.startsWith('huhu')).map(x => ({ id: x.id, name: x.name }))`);
	assert.ok(commands.length > 0, 'HUHU registers commands');
	assert.deepEqual(commands.filter((x) => FORBIDDEN.test(x.id) || FORBIDDEN.test(x.name)), []);
	const searched = await c.evaluate(`Object.values(app.commands.commands).filter(x => /browser|\\bbot\\b/i.test(x.name) && x.id.startsWith('huhu')).length`);
	assert.equal(searched, 0);
	check('commands-have-no-browser-or-bot', { huhuCommands: commands.length });
	// 2. Ribbon: no globe icon, no Browser/Bot label.
	const ribbon = await c.evaluate(`[...document.querySelectorAll('.side-dock-ribbon-action')].map(e => ({ label: e.getAttribute('aria-label'), icon: e.querySelector('svg')?.getAttribute('class') ?? '' }))`);
	assert.deepEqual(ribbon.filter((x) => /globe/.test(x.icon) || FORBIDDEN.test(x.label ?? '')), []);
	check('ribbon-has-no-globe-or-browser', ribbon);
	// 3. Workbench: navigation entries.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'dashboard' }).then(() => true)`);
	await until(`!!document.querySelector('.huhu-shell')`, 'workbench shell');
	await delay(1500);
	const nav = await c.evaluate(`(() => { const s = document.querySelector('.huhu-shell'); return { text: s.innerText, entries: [...s.querySelectorAll('[data-page-entry],[data-feature-entry],[role=tab],[role=treeitem],nav button')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim()).filter(Boolean) }; })()`);
	assert.ok(!FORBIDDEN.test(nav.text), 'workbench text: ' + (nav.text.match(FORBIDDEN) ?? [''])[0]);
	check('workbench-navigation-clean', nav.entries.slice(0, 60));
	await shot('01-home-workbench');
	// 4. Home (current format): no web section, no music widget in the board or its widget catalogue.
	const homeText = await c.evaluate(`document.querySelector('.huhu-shell').innerText`);
	assert.ok(!/music|netease|网易云|音乐/i.test(homeText), 'Home has no music widget');
	check('home-board-has-no-web-section-or-music', homeText.slice(0, 400));
	// 5. Settings categories.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbenchSettings('general').then(() => true)`);
	await until(`!!document.querySelector('.huhu-settings-page')`, 'settings page');
	await delay(800);
	const settings = await c.evaluate(`(() => { const p = document.querySelector('.huhu-settings-page'); const shell = document.querySelector('.huhu-shell'); return { text: shell.innerText, tabs: [...shell.querySelectorAll('[role=tab],[role=radio],[role=treeitem],nav a,nav button')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim()).filter(Boolean) }; })()`);
	assert.ok(!FORBIDDEN.test(settings.text), 'settings text: ' + (settings.text.match(FORBIDDEN) ?? [''])[0]);
	check('settings-categories-clean', settings.tabs.slice(0, 60));
	await shot('02-settings');
	// 6. Agent workspace: terminal/page tabs and the agent page.
	await c.evaluate(`(() => { const e = [...document.querySelectorAll('.huhu-shell button, .huhu-shell [role=tab]')].find(e => (e.getAttribute('aria-label') || e.textContent || '').trim() === 'AI Agent'); e?.click(); return !!e; })()`);
	await delay(2500);
	const agent = await c.evaluate(`(() => { const s = document.querySelector('.huhu-shell'); return s.innerText + '\\n' + [...s.querySelectorAll('[role=tab]')].map(e => e.getAttribute('aria-label') || e.textContent).join('|'); })()`);
	assert.ok(/Agent|agent/.test(agent) && !/Add widget/.test(agent), 'the agent workspace is showing');
	assert.ok(!FORBIDDEN.test(agent), 'agent text: ' + (agent.match(FORBIDDEN) ?? [''])[0]);
	check('agent-workspace-clean', agent.slice(0, 600));
	await shot('03-agent-workspace');
	// 7. Console: no errors collected since startup.
	const errors = await c.evaluate('window.huhuAcceptanceErrors');
	assert.deepEqual(errors, []);
	check('console-has-no-errors', errors);
	// 8. Plugin data: no Browser/Bot roots were created in the new vault.
	const created = await c.evaluate(`app.vault.adapter.list('.huhu').then(l => l.folders.concat(l.files))`);
	assert.ok(!created.some((p) => FORBIDDEN.test(p)), 'no Browser/Bot data roots: ' + created.join(','));
	check('vault-data-roots', created);
} catch (error) {
	failure = error;
	await shot('failure').catch(() => undefined);
} finally {
	await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({ ok: !failure, error: failure ? String(failure.stack ?? failure) : null, results }, null, 2));
	await runtime.stop();
}
if (failure) {
	console.error(failure);
	process.exitCode = 1;
} else console.log(`ok ${results.length} checks; evidence in ${out}`);

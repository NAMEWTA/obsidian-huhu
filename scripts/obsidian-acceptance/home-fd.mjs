// Acceptance: notes the board creates live in visible vault folders, not under .huhu/.
//  - PM: a new project is a note in `项目管理/`; the settings use path fields;
//  - RSS: a saved article lands in `RSS/` and the OPML export next to it;
//  - Skills section lists what the agent module discovers (two skills in the fixture home);
//  - Database section without folders never lists HUHU's own `.huhu/dashboards` files;
//  - a file-mode path field that may create offers "新建文件" (not the folder wording).
// HOME / CLI homes / XDG dirs point into the fixture (fresh-vault.mjs). Run from the repo root after `pnpm run build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_FD_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2 HUHU_FD_LANG=zh \
//   xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/home-fd.mjs /dev/shm/huhu-fd/run-01
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root && /^\/(tmp|dev\/shm|var\/tmp)\//.test(root), 'pass a fresh fixture root under /tmp, /dev/shm or /var/tmp');
const language = process.env.HUHU_FD_LANG || 'zh';
const minimalDir = process.env.HUHU_FD_MINIMAL_DIR;
const home = path.join(root, 'home');
Object.assign(process.env, {
	CODEX_HOME: path.join(home, '.codex'),
	CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
	GROK_HOME: path.join(home, '.grok'),
	GEMINI_CLI_HOME: home,
	XDG_DATA_HOME: path.join(home, '.local/share'),
	XDG_CACHE_HOME: path.join(home, '.cache'),
	XDG_STATE_HOME: path.join(home, '.local/state'),
});

const feed = http.createServer((request, response) => {
	response.setHeader('content-type', 'application/rss+xml; charset=utf-8');
	response.end(`<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Local feed</title><link>http://127.0.0.1/</link><description>x</description>
<item><title>First article</title><link>http://127.0.0.1/a</link><guid>a</guid><pubDate>Mon, 20 Oct 2026 08:00:00 GMT</pubDate><description>Short summary</description><content:encoded><![CDATA[<p>${'Full body text of the first article. '.repeat(8)}</p>]]></content:encoded></item>
</channel></rss>`);
});
await new Promise((resolve) => feed.listen(0, '127.0.0.1', resolve));
const feedUrl = `http://127.0.0.1:${feed.address().port}/feed.xml`;

const section = (name, type, extra = {}) => ({ name, type, extra });
const defs = [
	section('Projects', 'pm', { pm: { rootFolder: '项目管理', stages: ['洽谈', '执行', '完成'].map((label) => ({ label })) } }),
	section('Feeds', 'rss', { rss: { feeds: [{ name: 'Local feed', url: feedUrl }], downloadFolder: '', pageSize: 20 } }),
	section('Skills', 'skills'),
	section('Database', 'library', { library: { viewMode: 'list', filters: [], sortBy: 'name', sortDesc: false, pageSize: 20 } }),
];
const yaml = defs
	.map((d) => `  - name: ${JSON.stringify(d.name)}\n    color: "#6366f1"\n    type: ${d.type}\n${Object.entries(d.extra).map(([k, v]) => `    ${k}: ${JSON.stringify(v)}\n`).join('')}`)
	.join('');
const grid = defs.map((d, index) => ({ i: `section:${d.name}`, x: (index % 2) * 6, y: Math.floor(index / 2) * 6, w: 6, h: 6 }));
const board = `---\ndashboard: true\nwidgets: []\ngrid: ${JSON.stringify({ v: 2, lg: grid })}\ncolumns:\n${yaml}---\n\n${defs.map((d) => `## ${d.name}\n`).join('\n')}\n`;

const files = {
	'.huhu/dashboards/FdBoard.md': board,
	'.huhu/dashboards/Managed.md': '# Managed by HUHU\n',
	'Notes/Visible note.md': '# Visible\n',
	'Welcome.md': '# Welcome\n',
};
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
}
const modules = { home: true, agent: true, automations: false, notifications: false, archives: false, comments: false, browser: false, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_FD_PORT || 19731),
	files,
	settings: {
		version: 1,
		namespaces: {
			app: { language, introSeen: true, modules },
			home: { dashboardFile: '.huhu/dashboards/FdBoard', workspaces: { files: ['.huhu/dashboards/FdBoard'], names: [''], active: 0 } },
		},
	},
});
const c = runtime.connection;
const results = [];
const check = (name, passed, detail) => {
	results.push({ name, passed, detail });
	if (!passed) console.error('FAILED', name, JSON.stringify(detail)?.slice(0, 600));
};
const until = async (expression, name, timeout = 25000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,600)').catch(() => '')}`);
};
const exists = (file) => fs.stat(file).then(() => true, () => false);
const vaultPath = (...p) => path.join(runtime.vault, ...p);
const mouse = async (point) => {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
	await delay(450);
};
const point = (expression) => c.evaluate(`(() => { const e = ${expression}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const click = async (expression) => mouse(await point(expression));
const type = async (text) => { await c.send('Input.insertText', { text }); await delay(200); };
const key = async (name, code = name) => {
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code });
	await delay(250);
};
const tile = (name) => `document.querySelector('[data-tile="section:${name}"]')`;
const labelled = (scope, pattern) => `[...${scope}.querySelectorAll('button')].find((b) => ${pattern}.test(b.getAttribute('aria-label') || b.title || b.textContent))`;
const dialogButton = (pattern) => `[...document.querySelectorAll('[role=dialog] button')].find((b) => ${pattern}.test(b.textContent.trim()))`;
const closeDialog = async () => {
	await click(dialogButton(/^(取消|Cancel|关闭|Close)$/));
	await until(`!document.querySelector('[role=dialog]')`, 'dialog closed');
};
const shot = async (name) => { await delay(350); await runtime.shot(name); };
const setSize = async (width, height = 1000) => {
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, ${height}); true`);
	await delay(700);
};
const setLook = async (dark, minimal) => {
	await c.evaluate(`(app.customCss.setTheme(${JSON.stringify(minimal ? 'Minimal' : '')}), app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}), app.updateTheme(), true)`);
	await until(`document.body.classList.contains(${JSON.stringify(dark ? 'theme-dark' : 'theme-light')})`, 'theme');
	await delay(500);
};
const put = async (dir, name, description) => {
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`);
};

try {
	await c.evaluate('app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse(); true');
	await setSize(1500, 1100);
	await put(path.join(home, '.agents/skills/shared-review'), 'shared-review', 'Reviews a change set and lists findings by severity.');
	await put(path.join(home, '.claude/skills/claude-helper'), 'claude-helper', 'Lives in the Claude Code folder of the fixture home.');
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'dashboard', resourceId: '.huhu/dashboards/FdBoard' }).then(() => true)`);
	await until(`document.querySelectorAll('[data-tile]').length >= 4`, 'tiles');
	await delay(1500);

	// PM: new project -> vault note under 项目管理/.
	await click(labelled(tile('Projects'), /新建项目|New project/));
	await until(`!!document.querySelector('[role=dialog] input')`, 'project dialog');
	await shot('01-pm-new-dialog');
	await c.evaluate(`document.querySelector('[role=dialog] input').focus(); true`);
	await type('Alpha 项目');
	await click(dialogButton(/^(保存|Save|创建|Create)$/));
	await until(`!document.querySelector('[role=dialog]')`, 'project dialog closed');
	await delay(800);
	check('pm-project-created-in-visible-folder', await exists(vaultPath('项目管理/Alpha 项目.md')), await fs.readdir(runtime.vault));
	check('pm-nothing-under-huhu-projects', !(await exists(vaultPath('.huhu/dashboards/HUHU/项目'))));
	check('pm-project-listed', await c.evaluate(`${tile('Projects')}.innerText.includes('Alpha 项目')`));
	await click(labelled(tile('Projects'), /^配置$|Configure/));
	await until(`!!document.querySelector('[role=dialog] [role=combobox]')`, 'pm config');
	check('pm-config-uses-path-fields', await c.evaluate(`document.querySelectorAll('[role=dialog] [role=combobox]').length`) >= 3 &&
		await c.evaluate(`document.querySelector('[role=dialog] [role=combobox]').value`) === '项目管理');
	await shot('02-pm-config');
	await closeDialog();

	// RSS: save an article -> RSS/, export OPML -> RSS/subscriptions.opml.
	await until(`!!${tile('Feeds')}.querySelector('li[data-guid]')`, 'rss rows');
	await shot('03-rss-list');
	await click(`${tile('Feeds')}.querySelector('li[data-guid] > button:last-child')`);
	await until(`!!${tile('Feeds')}.querySelector('li[data-guid] svg.lucide-file-text')`, 'article saved');
	const saved = await fs.readdir(vaultPath('RSS')).catch(() => []);
	check('rss-article-saved-in-rss-folder', saved.some((name) => name.endsWith('.md') && name.includes('First article')), saved);
	check('rss-nothing-under-huhu-rss', !(await exists(vaultPath('.huhu/dashboards/HUHU/RSS'))));
	await click(labelled(tile('Feeds'), /配置订阅源|Configure/));
	await until(`!!document.querySelector('[role=dialog] [role=combobox]')`, 'rss config');
	await shot('04-rss-config');
	await click(dialogButton(/导出 OPML|Export OPML/));
	await delay(800);
	check('rss-opml-in-rss-folder', await exists(vaultPath('RSS/subscriptions.opml')));
	await closeDialog();

	// Skills: what the agent module discovers in the fixture home.
	await click(labelled(tile('Skills'), /刷新|Refresh/));
	await until(`${tile('Skills')}.querySelectorAll('[data-skill]').length >= 2`, 'skill cards');
	const names = await c.evaluate(`[...${tile('Skills')}.querySelectorAll('[data-skill]')].map((e) => e.dataset.skill)`);
	check('skills-shows-discovered', names.includes('shared-review') && names.includes('claude-helper'), names);
	check('skills-no-import-button', !(await c.evaluate(`/导入|Import/.test(${tile('Skills')}.innerText)`)));
	check('skills-nothing-under-huhu-skills', !(await exists(vaultPath('.huhu/dashboards/HUHU/技能'))));
	await click(labelled(`${tile('Skills')}.querySelector('[data-skill="claude-helper"]')`, /发送到|Send to/));
	await until(`!!document.querySelector('[role=dialog] textarea')`, 'launch dialog');
	check('skills-launch-prompt', (await c.evaluate(`document.querySelector('[role=dialog] textarea').value`)).includes('claude-helper'));
	await shot('05-skill-launch');
	await closeDialog();

	// Database without folders: notes only.
	await until(`${tile('Database')}.innerText.includes('Visible note')`, 'database rows');
	const dbText = await c.evaluate(`${tile('Database')}.innerText`);
	check('database-lists-vault-notes', dbText.includes('Visible note') && dbText.includes('Welcome'), dbText);
	check('database-hides-managed-files', !dbText.includes('Managed') && !dbText.includes('FdBoard'), dbText);

	// File-mode path field that may create: "新建文件".
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'settings', section: 'dashboard' }).then(() => true)`);
	await until(`[...document.querySelectorAll('[role=combobox]')].some((e) => /归档|archive/i.test(e.getAttribute('aria-label') || ''))`, 'settings fields', 30000).catch(() => undefined);
	const field = await c.evaluate(`(() => { const items = [...document.querySelectorAll('[role=combobox]')]; return items.map((e) => e.getAttribute('aria-label')); })()`);
	console.log('settings fields', JSON.stringify(field));
	const archive = await c.evaluate(`(() => { const e = [...document.querySelectorAll('[role=combobox]')].find((i) => /归档|archive/i.test(i.getAttribute('aria-label') || '')); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; })()`);
	check('settings-has-archive-file-field', archive === true, field);
	if (archive) {
		await click(`[...document.querySelectorAll('[role=combobox]')].find((i) => /归档|archive/i.test(i.getAttribute('aria-label') || ''))`);
		await key('a', 'KeyA');
		await c.evaluate(`document.activeElement.select?.(); true`);
		await type('Nope/Brand new file.md');
		await until(`!!document.querySelector('[role=option][title]')`, 'create option');
		const option = await c.evaluate(`(() => { const rows = [...document.querySelectorAll('[role=option]')]; const create = rows.find((r) => /Brand new file/.test(r.textContent)); return create ? { title: create.title, icon: create.querySelector('svg')?.getAttribute('class') } : null; })()`);
		check('file-picker-create-row-says-new-file', option?.title === (language === 'zh' ? '新建文件' : 'New file') && /file-plus/.test(option?.icon ?? ''), option);
		await shot('06-file-picker-create');
		await key('Escape');
	}

	// Layout: board in every look, light and dark.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'dashboard', resourceId: '.huhu/dashboards/FdBoard' }).then(() => true)`);
	await until(`document.querySelectorAll('[data-tile]').length >= 4`, 'tiles again');
	const looks = [[false, false, 'default-light'], [true, false, 'default-dark']];
	if (minimalDir) looks.push([false, true, 'minimal-light'], [true, true, 'minimal-dark']);
	for (const [dark, minimal, label] of looks) {
		await setLook(dark, minimal);
		await setSize(1500, 1100);
		const bad = await c.evaluate(`[...document.querySelectorAll('[data-tile]')].flatMap((t) => { const body = t.querySelector('.huhu-widget-body'); return body && body.scrollWidth > body.clientWidth + 1 ? [t.dataset.tile] : []; })`);
		check(`no-horizontal-overflow-${label}`, bad.length === 0, bad);
		await shot(`board-${label}`);
	}
	const errors = await c.evaluate('window.huhuAcceptanceErrors ?? []');
	check('no-console-errors', errors.length === 0, errors);
} catch (error) {
	check('script-completed', false, String(error?.stack ?? error).slice(0, 1200));
	await runtime.shot('failure').catch(() => undefined);
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2)).catch(() => undefined);
	feed.close();
	await runtime.stop();
}
const failed = results.filter((r) => !r.passed);
console.log(`home-fd acceptance: ${results.length - failed.length}/${results.length} passed; evidence: ${runtime.evidence}`);
process.exit(failed.length ? 1 : 0);

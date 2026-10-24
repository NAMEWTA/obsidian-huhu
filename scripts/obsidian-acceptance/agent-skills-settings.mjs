// Acceptance: Settings > Agent > Skills discovers global and vault skills and enables them per agent by copying.
// Fresh disposable vault; HOME, CLI homes and XDG dirs are pointed into the fixture root, so nothing of the real home is read or written.
// Run from the repo root after `pnpm run build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_SKILLS_FIXTURE=/dev/shm/huhu-skills-01 [HUHU_SKILLS_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2] \
//   [HUHU_SKILLS_LANG=zh] xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/agent-skills-settings.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_SKILLS_FIXTURE;
assert.ok(root && /^\/(tmp|dev\/shm|var\/tmp)\/huhu-skills-/.test(root), 'HUHU_SKILLS_FIXTURE must be /tmp|/dev/shm|/var/tmp/huhu-skills-<name> and must not exist');
const minimalDir = process.env.HUHU_SKILLS_MINIMAL_DIR;
const language = process.env.HUHU_SKILLS_LANG || 'en';
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
const skill = (name, description) => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;
const files = {
	'Welcome.md': '# Skills fixture\n',
	'.agents/skills/vault-note/SKILL.md': skill('vault-note', 'Turns a rough thought into a tidy vault note with links and a summary line.'),
	'.claude/skills/vault-claude/SKILL.md': skill('vault-claude', 'A skill that only lives in this vault for Claude Code.'),
};
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json']) files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal' });
}
const modules = { home: false, agent: true, automations: false, notifications: false, archives: false, comments: false, browser: false, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_SKILLS_PORT || 19611),
	files,
	settings: { version: 1, namespaces: { app: { language, introSeen: true, modules } } },
});
const c = runtime.connection;
const results = [];
const check = (name, passed, detail) => { results.push({ name, passed, detail }); assert.ok(passed, `${name} ${JSON.stringify(detail ?? '')}`); };
const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) { if (await c.evaluate(expression).catch(() => false)) return; await delay(100); }
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,800)').catch(() => '')}`);
};
const mouse = async (point) => {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
	await delay(450);
};
const point = (expression) => c.evaluate(`(() => { const e = ${expression}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const click = async (expression) => mouse(await point(expression));
const card = (name) => `document.querySelector('[data-skill="${name}"]')`;
const target = (name, id) => `${card(name)}.querySelector('[data-target="${id}"]')`;
const state = (name, id) => c.evaluate(`${target(name, id)}?.getAttribute('data-state')`);
const exists = (file) => fs.stat(file).then(() => true, () => false);
const shot = async (name) => { await delay(300); await runtime.shot(name); };
const setSize = async (width, height = 1000) => { await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, ${height}); true`); await delay(700); };
const setLook = async (dark, minimal) => {
	await c.evaluate(`(app.customCss.setTheme(${JSON.stringify(minimal ? 'Minimal' : '')}), app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}), app.updateTheme(), true)`);
	await until(`document.body.classList.contains(${JSON.stringify(dark ? 'theme-dark' : 'theme-light')})`, 'theme');
	await delay(500);
};
const overflow = () => c.evaluate(`(() => { const root = document.querySelector('[data-skills-manager]'); const box = root.getBoundingClientRect(); const bad = [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1); }).slice(0, 5).map(e => e.outerHTML.slice(0, 80)); return { bad, scroll: document.documentElement.scrollWidth > innerWidth + 1 }; })()`);
const home_ = (...p) => path.join(home, ...p);

try {
	// Global skills: written into the fixture home after Obsidian started.
	await fs.mkdir(home, { recursive: true });
	const put = async (dir, name, description) => { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, 'SKILL.md'), skill(name, description)); await fs.writeFile(path.join(dir, 'notes.md'), `${name} reference\n`); };
	await put(home_('.agents/skills/shared-review'), 'shared-review', 'Reviews a change set for correctness, naming and tests, then lists the findings by severity.');
	await put(home_('.agents/skills/long-description'), 'long-description', 'This description is intentionally long so that it must be truncated to two lines in the card and still be fully available in the tooltip and title attribute. '.repeat(3));
	await put(home_('.claude/skills/claude-only'), 'claude-only', 'Lives only in the Claude Code folder.');
	await put(home_('.codex/skills/codex-hand'), 'codex-hand', 'Placed by hand in the Codex folder.');
	await put(home_('.gemini/skills/gemini-global'), 'gemini-global', 'Found in the Gemini CLI folder.');
	await c.evaluate('app.workspace.leftSplit.collapse(); true');
	await setSize(1440);
	await setLook(false, false);
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'settings', section: 'terminal', resourceId: 'skills' }).then(() => true)`);
	await until(`!!document.querySelector('[data-skills-manager]') && document.querySelectorAll('[data-skill]').length >= 7`, 'skills cards');
	const names = await c.evaluate(`[...document.querySelectorAll('[data-skill]')].map(e => e.dataset.skill)`);
	check('discovers-global-and-vault', ['shared-review', 'long-description', 'claude-only', 'codex-hand', 'gemini-global', 'vault-note', 'vault-claude'].every(n => names.includes(n)), names);
	check('no-copy-before-click', !(await exists(home_('.codex/skills/shared-review'))) && await state('shared-review', 'codex') === 'off');
	check('original-and-hand-placed-are-manual', await state('shared-review', 'agents') === 'manual' && await state('codex-hand', 'codex') === 'manual' && await state('claude-only', 'claude-code') === 'manual');
	await shot('01-initial');

	// Enable: click the Codex icon on a global skill.
	await click(target('shared-review', 'codex'));
	await until(`${card('shared-review')}.querySelector('[data-target="codex"]').dataset.state === 'copy'`, 'copy state');
	const copied = home_('.codex/skills/shared-review');
	check('enable-copies-into-temp-home-codex', await exists(path.join(copied, 'SKILL.md')) && await exists(path.join(copied, 'notes.md')) && await exists(path.join(copied, '.huhu-skill-copy.json')));
	check('enable-does-not-touch-vault-or-real-home', !(await exists(path.join(runtime.vault, '.codex/skills/shared-review'))));
	await shot('02-enabled-codex');

	// Hand-placed: clicking does nothing.
	await click(target('codex-hand', 'codex'));
	await delay(400);
	check('manual-click-is-inert', await exists(home_('.codex/skills/codex-hand/SKILL.md')) && await state('codex-hand', 'codex') === 'manual');

	// Vault scope copies into the vault.
	await click(target('vault-note', 'gemini'));
	await until(`${card('vault-note')}.querySelector('[data-target="gemini"]').dataset.state === 'copy'`, 'vault copy');
	check('vault-skill-copies-into-vault', await exists(path.join(runtime.vault, '.gemini/skills/vault-note/.huhu-skill-copy.json')) && !(await exists(home_('.gemini/skills/vault-note'))));

	// Update: the source changes, the copy turns stale, Update refreshes only the copy.
	await fs.writeFile(home_('.agents/skills/shared-review/notes.md'), 'changed reference\n');
	await click(`document.querySelector('[aria-label="${language === 'zh' ? '刷新' : 'Refresh'}"]')`);
	await until(`${card('shared-review')}.querySelector('[data-target="codex"]').dataset.state === 'stale'`, 'stale');
	await shot('03-stale');
	await click(`[...${card('shared-review')}.querySelectorAll('button')].find(b => b.textContent.trim() === '${language === 'zh' ? '更新' : 'Update'}')`);
	await until(`${card('shared-review')}.querySelector('[data-target="codex"]').dataset.state === 'copy'`, 'updated');
	check('update-recopies', (await fs.readFile(path.join(copied, 'notes.md'), 'utf8')) === 'changed reference\n');

	// Disable: only the copy goes (trash, or the in-page confirmation when the system has none).
	await click(target('shared-review', 'codex'));
	await delay(1200);
	if (await c.evaluate(`!!document.querySelector('[role=alertdialog]')`)) {
		await shot('04-trash-fallback-confirm');
		await click(`document.querySelector('[role=alertdialog] button:last-of-type')`);
	}
	await until(`${card('shared-review')}.querySelector('[data-target="codex"]').dataset.state === 'off'`, 'disabled');
	check('disable-removes-copy-only', !(await exists(copied)) && await exists(home_('.agents/skills/shared-review/SKILL.md')) && await exists(home_('.codex/skills/codex-hand/SKILL.md')));

	// Layout: wide, narrow, both themes, with and without Minimal.
	const looks = [[false, false, 'default-light'], [true, false, 'default-dark']];
	if (minimalDir) looks.push([false, true, 'minimal-light'], [true, true, 'minimal-dark']);
	for (const [dark, minimal, label] of looks) {
		await setLook(dark, minimal);
		for (const width of [1440, 1000, 820]) {
			await setSize(width);
			await until(`!!document.querySelector('[data-skills-manager]')`, 'still open');
			const result = await overflow();
			check(`no-overflow-${label}-${width}`, result.bad.length === 0 && !result.scroll, result);
			await shot(`layout-${label}-${width}`);
		}
	}
	const errors = await c.evaluate('window.huhuAcceptanceErrors ?? []');
	check('no-console-errors', errors.length === 0, errors);
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2));
	console.log(`agent skills settings acceptance passed (${results.length} checks); evidence: ${runtime.evidence}`);
} catch (error) {
	await runtime.shot('failure').catch(() => undefined);
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2)).catch(() => undefined);
	throw error;
} finally {
	await runtime.stop();
}

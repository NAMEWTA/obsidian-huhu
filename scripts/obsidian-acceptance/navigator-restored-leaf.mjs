// Acceptance: a navigator leaf restored from the saved layout.
//   off (default): the notes module is OFF, so the plugin removes the restored leaf at load (no empty "turned off"
//                  panel lingers); switching the module on then places exactly one.
//   on:            the module is ON, so the restored leaf is reused (still exactly one, in the left sidebar).
// HOME / XDG dirs point into the fixture (fresh-vault.mjs). Run from the repo root after `pnpm run build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian xvfb-run -a node scripts/obsidian-acceptance/navigator-restored-leaf.mjs /tmp/<new-dir> [on|off]
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root, 'Pass a new directory for the disposable vault');
const on = process.argv[3] === 'on';
const leaf = (id, type) => ({ id, type: 'leaf', state: { type, state: {} } });
const workspace = {
	main: { id: 'm1', type: 'split', children: [{ id: 't1', type: 'tabs', children: [leaf('l1', 'empty')] }], direction: 'vertical' },
	left: { id: 's1', type: 'split', children: [{ id: 't2', type: 'tabs', children: [leaf('l2', 'file-explorer'), leaf('l3', 'huhu-navigator-view')] }], direction: 'horizontal', width: 300 },
	right: { id: 's2', type: 'split', children: [{ id: 't3', type: 'tabs', children: [leaf('l4', 'backlink')] }], direction: 'horizontal', width: 300, collapsed: true },
	'left-ribbon': { hiddenItems: {} },
	active: 'l1',
	lastOpenFiles: [],
};
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, navigator: on, sync: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_NAV_PORT || 9296),
	files: { '.obsidian/workspace.json': JSON.stringify(workspace), 'Notes/Inbox.md': '# Inbox\n' },
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules } } },
});
const c = runtime.connection;
const count = () => c.evaluate(`app.workspace.getLeavesOfType('huhu-navigator-view').length`);
const until = async (expression, what) => {
	for (let i = 0; i < 100; i++) { if (await c.evaluate(expression).catch(() => false)) return; await delay(100); }
	throw new Error(`Timeout: ${what}`);
};
try {
	await delay(1500);
	if (on) {
		await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'restored leaf reused');
		await delay(800);
		assert.equal(await count(), 1, 'exactly one navigator leaf: the restored one is reused, none is added');
		assert.equal(await c.evaluate(`app.workspace.getLeavesOfType('huhu-navigator-view')[0].getRoot()===app.workspace.leftSplit`), true);
		console.log('PASS restored-leaf-reused-while-module-on');
		await c.evaluate(`app.workspace.leftSplit.expand();app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
		await delay(600);
		await runtime.shot('restored-on-1-single-leaf');
	} else {
		// The navigator leaf was in the saved layout; with the module off the plugin removes it once the layout is ready.
		assert.equal(await count(), 0, 'no navigator leaf lingers while the module is off');
		console.log('PASS restored-leaf-removed-while-module-off');
		await runtime.shot('restored-off-1-no-leaf');
		await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('navigator', true)`);
		await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'one leaf after switch-on');
		assert.equal(await c.evaluate(`app.workspace.getLeavesOfType('huhu-navigator-view')[0].getRoot()===app.workspace.leftSplit`), true);
		console.log('PASS switch-on-places-one-leaf-in-left-sidebar');
		await c.evaluate(`app.workspace.leftSplit.expand();app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
		await delay(600);
		await runtime.shot('restored-off-2-after-switch-on');
	}
	console.log(JSON.stringify({ passed: true, evidence: runtime.evidence }));
} finally {
	await runtime.stop();
}

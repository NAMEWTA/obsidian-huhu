// Acceptance: the inbox card at its four sizes (S, M, L, XL), empty and with data, as a clipped screenshot of the card.
// HOME / XDG dirs point into the fixture (fresh-vault.mjs). Usage:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian [HUHU_THEME=minimal HUHU_MINIMAL_THEME=<dir>] [HUHU_MODE=dark] \
//     xvfb-run -a node scripts/obsidian-acceptance/inbox-card.mjs /dev/shm/<new-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root, 'Pass a new directory for the disposable vault');
const minimal = process.env.HUHU_THEME === 'minimal';
const dark = process.env.HUHU_MODE === 'dark';
const label = `${minimal ? 'minimal' : 'default'}-${dark ? 'dark' : 'light'}`;
const pad = (value) => String(value).padStart(2, '0');
const now = new Date();
const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const TIERS = { S: [3, 2], M: [6, 2], L: [6, 4], XL: [12, 4] };

const files = {};
if (minimal) {
	const theme = process.env.HUHU_MINIMAL_THEME;
	assert.ok(theme && path.isAbsolute(theme), 'HUHU_MINIMAL_THEME must point to the Minimal theme directory');
	files['.obsidian/themes/Minimal/theme.css'] = await fs.readFile(path.join(theme, 'theme.css'), 'utf8');
	files['.obsidian/themes/Minimal/manifest.json'] = await fs.readFile(path.join(theme, 'manifest.json'), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal', theme: dark ? 'obsidian' : 'moonstone' });
} else files['.obsidian/appearance.json'] = JSON.stringify({ theme: dark ? 'obsidian' : 'moonstone' });
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, navigator: false, sync: false };
const runtime = await launchFreshVault({
	root,
	files,
	port: Number(process.env.HUHU_INBOX_PORT || 9417),
	settings: { version: 1, namespaces: { app: { language: 'zh', introSeen: true, modules }, home: {} } },
});
const c = runtime.connection;
const board = '.huhu/dashboards/dashboard.md';
const grid = (tier) => `grid: {"v":2,"lg":[{"i":"section:收件箱","x":0,"y":0,"w":${TIERS[tier][0]},"h":${TIERS[tier][1]}}]}`;
const place = (tier) =>
	c.evaluate(`app.vault.adapter.process(${JSON.stringify(board)}, t=>t.replace(/^grid:.*$/m, ${JSON.stringify(grid(tier))}).replace(/^widgets:.*$/m,'widgets: []'))`);
const card = () => c.evaluate(`(()=>{const el=[...document.querySelectorAll('[data-inbox]')].map(e=>e.closest('.huhu-widget-card')).find(Boolean);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x-8,y:r.y-8,width:r.width+16,height:r.height+16,scale:1}})()`);
const shot = async (name) => {
	const clip = await card();
	assert.ok(clip, 'inbox card rendered');
	const { data } = await c.send('Page.captureScreenshot', { format: 'png', clip });
	await fs.writeFile(path.join(runtime.evidence, `${label}-${name}.png`), Buffer.from(data, 'base64'));
};
const overflow = () => c.evaluate(`(()=>{const el=document.querySelector('[data-inbox]');const bad=[...el.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible'&&!getComputedStyle(e).textOverflow.includes('ellipsis')&&!e.closest('.invisible')&&!e.hasAttribute('data-hit-control')&&!e.querySelector(':scope > .invisible'));return bad.map(e=>(e.getAttribute('aria-label')||e.textContent.slice(0,20))+e.tagName+'.'+String(e.className).slice(0,30)+' '+e.scrollWidth+'/'+e.clientWidth)})()`);
try {
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);
	await delay(3500);
	for (const tier of Object.keys(TIERS)) {
		await place(tier);
		await delay(1500);
		await shot(`${tier}-empty`);
	}
	await c.evaluate(`(async()=>{const v=app.vault;await v.createFolder('huhu').catch(()=>{});await v.createFolder('huhu/收件箱').catch(()=>{});
		for (const [n,b] of [['${iso}-0930-买牛奶',''],['${iso}-1015-周报要点',''],['${iso}-1140-读书笔记整理','']]) await v.create('huhu/收件箱/'+n+'.md','---\\n状态: 在用\\ntags:\\n  - \\n---\\n'+b);
		await v.create('huhu/收件箱/${iso}-闪念.md','---\\n状态: 在用\\ntags:\\n  - \\n---\\n- 09:12 想到一个关于看板的点子\\n- 11:30 晚上给妈妈打个电话\\n  顺便问问周末的安排\\n- 14:05 下午三点前把周报发出去');
		return true})()`);
	await delay(2500);
	for (const tier of Object.keys(TIERS)) {
		await place(tier);
		await delay(1500);
		await shot(`${tier}-data`);
		const bad = await overflow();
		console.log(tier, 'overflow', JSON.stringify(bad));
		assert.deepEqual(bad, [], `no overflow at ${tier}`);
	}
	// a long draft in the strip grows but stays inside the card
	await place('M');
	await delay(1200);
	await c.evaluate(`(()=>{const t=document.querySelector('[data-capture-composer] textarea');t.focus();return true})()`);
	await c.send('Input.insertText', { text: '一条很长的闪念，用来检查输入条在多行时的增高效果与卡片内的布局。' .repeat(3) });
	await delay(500);
	await shot('M-long-draft');
	const errors = await c.evaluate(`window.huhuAcceptanceErrors||[]`);
	assert.equal(errors.length, 0, JSON.stringify(errors.slice(0, 3)));
	console.log('PASS inbox-card', label);
} finally {
	await runtime.stop();
}

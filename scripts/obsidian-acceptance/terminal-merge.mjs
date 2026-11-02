// Terminal merge click-through in real Obsidian. Disposable vault only.
// Builds must already exist. The helper is the local release binary, not a published download.
//   HUHU_PTY_BINARY=$PWD/native/pty-server/target/release/huhu-pty \
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian \
//   xvfb-run -a -s "-screen 0 1600x1100x24" \
//   node scripts/obsidian-acceptance/terminal-merge.mjs /tmp/huhu-terminal-merge-<name>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root && path.isAbsolute(root), 'pass a NEW absolute directory');
assert.ok(process.env.HUHU_PTY_BINARY && path.isAbsolute(process.env.HUHU_PTY_BINARY), 'HUHU_PTY_BINARY must be an absolute local helper');
const MARK = 'HUHU_TERMINAL_MERGE_OK';
const MARK2 = 'HUHU_TERMINAL_SECOND';
const runtime = await launchFreshVault({
	root,
	port: 9337,
	files: { 'Welcome.md': '# 终端合入\n', 'huhu/笔记/并存.md': '# 任务旁边的笔记\n' },
	settings: {
		version: 1,
		namespaces: {
			app: {
				language: 'zh',
				introSeen: true,
				modules: {
					home: true,
					task: true,
					agent: true,
					browser: true,
					archives: true,
					automations: true,
					notifications: true,
					icons: false,
					comments: false,
					navigator: false,
					versioning: true,
					safe: true,
					huhubot: true,
				},
			},
		},
	},
});
const c = runtime.connection;
const rows = [];
const check = (name, passed, detail) => {
	rows.push({ name, passed: !!passed, detail });
	console.log(passed ? 'PASS' : 'FAIL', name, passed ? '' : JSON.stringify(detail)?.slice(0, 500));
	assert.ok(passed, name);
};
const until = async (expression, label, ms = 25000) => {
	const end = Date.now() + ms;
	let last;
	while (Date.now() < end) {
		last = await c.evaluate(expression).catch((error) => String(error));
		if (last) return last;
		await delay(120);
	}
	const visible = await c.evaluate(`([...document.querySelectorAll('button,[role=option],[data-new-tab-menu]')].map((node) => node.getAttribute('aria-label') || (node.innerText || '').trim().slice(0, 40)).filter(Boolean).slice(0, 30)).join(' | ')`).catch(() => '');
	throw new Error(`Timed out: ${label}\n${JSON.stringify(last)?.slice(0, 400)}\n${visible}`);
};
async function point(selector, text) {
	return c.evaluate(`(() => {
		const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
		const wanted = ${text === undefined ? 'null' : JSON.stringify(text)};
		const label = (node) => (node.innerText || node.textContent || '').trim();
		const e = wanted == null ? all[0] : all.find((node) => label(node) === wanted || node.getAttribute('aria-label') === wanted || [...node.querySelectorAll('span')].some((span) => label(span) === wanted));
		if (!e) return null;
		e.scrollIntoView({ block: 'nearest' });
		const r = e.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return null;
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	})()`);
}
async function click(selector, text) {
	const at = await point(selector, text);
	assert.ok(at, `missing ${selector} ${text ?? ''}`);
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...at });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...at });
	await delay(450);
}
/** Radix menu triggers listen for pointerdown. Dispatch that on the real button, then a click. */
async function pressPointer(selector, text) {
	const pressed = await c.evaluate(`(() => {
		const all = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((node) => {
			const r = node.getBoundingClientRect();
			return r.width > 1 && r.height > 1;
		});
		const wanted = ${text === undefined ? 'null' : JSON.stringify(text)};
		const label = (node) => (node.innerText || node.textContent || '').trim();
		const matches = wanted == null ? all : all.filter((node) => label(node) === wanted || node.getAttribute('aria-label') === wanted || [...node.querySelectorAll('span')].some((span) => label(span) === wanted));
		const fire = (node) => {
			const r = node.getBoundingClientRect();
			const base = { bubbles: true, cancelable: true, composed: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'mouse', isPrimary: true };
			node.dispatchEvent(new PointerEvent('pointerdown', { ...base, button: 0, buttons: 1 }));
		};
		if (!matches.length) return 0;
		fire(matches[0]);
		return matches.length;
	})()`);
	assert.ok(pressed, `missing ${selector} ${text ?? ''}`);
	await delay(450);
}
const buffers = `(() => {
	const page = app.workspace.getLeavesOfType('huhu-workbench-view').flatMap((leaf) => leaf.view.getNativeSurfaces?.() ?? []).find((surface) => surface.getViewType?.() === 'huhu-agent-page');
	const sessions = page?.controller?.sessions?.list?.() ?? [];
	return sessions.map((session) => Array.from({ length: session.model.buffer.active.length }, (_, index) => session.model.buffer.active.getLine(index)?.translateToString(true) ?? '').join('\\n'));
})()`;
async function typeLine(text) {
	await until(`!!document.querySelector('.xterm-helper-textarea')`, 'terminal textarea');
	await c.evaluate(`document.querySelector('.xterm-helper-textarea').focus()`);
	await c.send('Input.insertText', { text });
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
}
try {
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
	await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.plugins.plugins.huhu.openWorkbench({feature:'terminal'});true`);
	await until(`!!document.querySelector('[data-rail-button][data-feature="terminal"]')`, 'terminal rail');
	await until(`[...document.querySelectorAll('button')].some((button) => button.textContent.trim() === '新建空间')`, 'create space');
	await runtime.shot('terminal-merge-empty');
	await click('button', '新建空间');
	await until(`!!document.querySelector('[role="dialog"] input')`, 'space name');
	await c.evaluate(`(() => {
		const input = document.querySelector('[role="dialog"] input');
		const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
		set.call(input, '合并验收');
		input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '合并验收', inputType: 'insertText' }));
	})()`);
	await click('[role="dialog"] button', '保存');
	await until(`[...document.querySelectorAll('button')].some((button) => button.textContent.trim() === '新建终端') && !document.querySelector('[role="dialog"]')`, 'space saved');
	await runtime.shot('terminal-merge-space');
	await click('button', '新建终端');
	await until(`document.querySelectorAll('.xterm').length >= 1`, 'first terminal', 40000);
	await typeLine(`echo ${MARK}`);
	await until(`${buffers}.some((text) => text.includes(${JSON.stringify(MARK)}))`, 'first output', 20000);
	check('first-command-output', true, await c.evaluate(buffers));
	await runtime.shot('terminal-merge-output');
	await pressPointer('button', '新建标签');
	await until(`[...document.querySelectorAll('[data-new-tab-menu] [role="option"] span')].some((span) => span.textContent.trim() === '新建终端')`, 'new tab menu');
	await click('[data-new-tab-menu] [role="option"]', '新建终端');
	await until(`document.querySelectorAll('.xterm').length >= 2`, 'second terminal', 40000);
	await typeLine(`echo ${MARK2}`);
	await until(`${buffers}.some((text) => text.includes(${JSON.stringify(MARK2)}))`, 'second output', 20000);
	check('two-sessions', (await c.evaluate(`document.querySelectorAll('.xterm').length`)) >= 2, await c.evaluate(buffers));
	await runtime.shot('terminal-merge-two');
	await click('button[aria-label="关闭标签"]');
	await until(`document.querySelectorAll('.xterm').length === 1`, 'one view remains');
	await click('button', '查找');
	await until(`!!document.querySelector('[data-closed-id]')`, 'closed session in jump palette');
	await runtime.shot('terminal-merge-closed');
	await click('[data-closed-id]');
	await until(`document.querySelectorAll('.xterm').length >= 2 && ${buffers}.some((text) => text.includes(${JSON.stringify(MARK2)}))`, 'reopened session', 20000);
	check('reopen-keeps-output', true);
	await runtime.shot('terminal-merge-reopened');
	await click('[data-rail-button][data-feature="task"]');
	await until(`document.querySelector('[data-rail-button][data-feature="task"]')?.getAttribute('aria-current') === 'page'`, 'task page');
	await delay(600);
	await runtime.shot('terminal-merge-task');
	await click('[data-rail-button][data-feature="dashboard"]');
	await until(`document.querySelector('[data-rail-button][data-feature="dashboard"]')?.getAttribute('aria-current') === 'page'`, 'dashboard');
	await delay(400);
	await click('[data-rail-button][data-feature="terminal"]');
	await until(`document.querySelector('[data-rail-button][data-feature="terminal"]')?.getAttribute('aria-current') === 'page' && document.querySelectorAll('.xterm').length >= 1`, 'terminal still open');
	const after = await c.evaluate(buffers);
	check('sessions-survive-other-modules', after.some((text) => text.includes(MARK)) && after.some((text) => text.includes(MARK2)), after);
	await runtime.shot('terminal-merge-coexist');
	const errors = await c.evaluate(`window.huhuAcceptanceErrors ?? []`);
	check('console-clean', Array.isArray(errors) && errors.length === 0, errors);
	await fs.writeFile(path.join(runtime.evidence, 'terminal-merge.json'), JSON.stringify({ rows, errors }, null, 2));
	console.log('terminal-merge evidence', runtime.evidence);
} finally {
	await runtime.stop();
}

import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview&&Object.values(uiReview.entries).every(e=>e.host.querySelector("[data-automation-row-id]"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;height:100%;overflow:hidden}';
const tick = (cdp) => cdp.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
async function show(cdp, name, width) {
	await cdp.evaluate(
		`(()=>{const f=document.querySelector('iframe');f.style.cssText='position:fixed;top:0;border:0;height:100vh;z-index:100;left:${name === 'second' ? '0' : '-3000px'};width:${width}px'})()`,
	);
	await tick(cdp);
}
async function key(cdp, key, code, modifiers = 0) {
	for (const type of ['keyDown', 'keyUp'])
		await cdp.send('Input.dispatchKeyEvent', {
			type,
			key,
			code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
			windowsVirtualKeyCode: code,
			nativeVirtualKeyCode: code,
			modifiers,
			...(type === 'keyDown' && key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
		});
}
async function click(cdp, name, selector) {
	const p = await cdp.evaluate(
		`(()=>{const e=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,hit:e.contains(uiReview.docs.${name}.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),disabled:e.disabled,actual:uiReview.docs.${name}.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML}})()`,
	);
	assert.equal(p.hit, true, `${name}/${selector}: ${JSON.stringify(p)}`);
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, x:p.x, y:p.y });
	await tick(cdp);
}
async function text(cdp, name, selector, value) {
	await click(cdp, name, selector);
	await key(cdp, 'a', 65, 2);
	await cdp.send('Input.insertText', { text: value });
	await key(cdp, 'Tab', 9);
}
export async function verify({ cdp, sample }) {
	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		const proof = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},p=d.querySelector('[data-automation-page]');return{width:d.documentElement.clientWidth,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,rows:p.querySelectorAll('[data-automation-row-id]').length,nested:p.querySelectorAll('button button').length,buttons:[...p.querySelectorAll('button')].every(b=>b.textContent.trim()||b.getAttribute('aria-label')),missingWords:/automation\\.[a-z]/.test(p.innerText)}})()`,
		);
		assert.equal(proof.overflow, false);
		assert.equal(proof.nested, 0);
		assert.equal(proof.rows, 7);
		assert.equal(proof.buttons, true);
		assert.equal(proof.missingWords, false);
		sample.assertions.push({ name, proof });
	}
}
async function editorNativeControls({ cdp, name, waitFor, capture }) {
	const doc = `uiReview.docs.${name}`,
		title = '[data-automation-editor] input';
	await click(cdp, name, title);
	const calls = await cdp.evaluate(`uiReview.entries.${name}.io.saveCalls`);
	await cdp.send('Input.imeSetComposition', { text: '输入中', selectionStart: 3, selectionEnd: 3 });
	await key(cdp, 'Enter', 13, 2);
	await tick(cdp);
	assert.equal(await cdp.evaluate(`uiReview.entries.${name}.io.saveCalls`), calls, 'IME Ctrl+Enter never saves');
	await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
	await text(cdp, name, title, 'Native automation draft · 草稿');
	await click(cdp, name, '[data-automation-editor] button[aria-label="Open calendar"]');
	await waitFor(() => cdp.evaluate(`!!${doc}.querySelector('[data-slot="calendar"]')`), 'actual date popup');
	assert.equal(await cdp.evaluate(`${doc}.querySelectorAll('[role="alertdialog"]').length`), 0);
	await key(cdp, 'Escape', 27);
	await waitFor(
		() => cdp.evaluate(`!${doc}.querySelector('[data-slot="calendar"]')`),
		'inner Escape closes only date popup',
	);
	assert.equal(await cdp.evaluate(`!!${doc}.querySelector('[data-automation-editor]')`), true);
	assert.equal(await cdp.evaluate(`${doc}.querySelectorAll('[role="alertdialog"]').length`), 0);
	await capture(`t07-${name}-calendar-return`);
	return { ime: true, nestedEscape: true };
}
async function coarseRowControl(cdp, name, waitFor) {
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 320,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
	await show(cdp, name, 320);
	await cdp.evaluate(
		"uiReview.configure({language:'en',theme:'paper',accent:'teal',source:'huhu',density:'compact',uiSize:'14',motion:'reduce'})",
	);
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-automation-row-id="notify"]')`),
		'coarse actual row',
	);
	const selector = '[data-automation-row-id="notify"] button[aria-label="Edit notify automation"]';
	const geometry = await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},b=d.querySelector(${JSON.stringify(selector)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),p=d.defaultView.getComputedStyle(b,'::before'),w=parseFloat(p.width),h=parseFloat(p.height);return{x:r.left+r.width/2,y:r.top+r.height/2,width:w,height:h,leaf:d.querySelector('[data-huhu-leaf]').getBoundingClientRect().width,viewport:d.documentElement.clientWidth}})()`,
	);
	assert.equal(geometry.leaf, 320);
	assert.equal(geometry.viewport, 320);
	assert.ok(geometry.width >= 44 && geometry.height >= 44, JSON.stringify(geometry));
	for (const [dx, dy] of [
		[0, 0],
		[-21.5, 0],
		[21.5, 0],
		[0, -21.5],
		[0, 21.5],
	]) {
		const p = { x: geometry.x + dx, y: geometry.y + dy };
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.elementFromPoint(${p.x},${p.y})?.closest('button')===uiReview.docs.${name}.querySelector(${JSON.stringify(selector)})`,
			),
			true,
			JSON.stringify({ dx, dy, geometry }),
		);
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ ...p, radiusX: 1, radiusY: 1 }],
		});
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-automation-editor]')`),
			'trusted touch opens exact editor',
		);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-automation-editor]')`),
			'clean editor closes',
		);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector(${JSON.stringify(selector)})`,
				),
			'exact edit source focus',
		);
	}
	return geometry;
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const receipt = {
		documents: [],
		states: [],
		boundaries: [
			'Actual AutomationService/JsonStore and memoryVault; no user vault writes',
			'Host agent/command/source effects are ports, not actual desktop processes',
			'Same-origin iframe is a second Document, not Obsidian popout',
		],
	};
	for (const name of ['main', 'second']) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 390,
			height: 1000,
			deviceScaleFactor: 1,
			mobile: false,
		});
		await cdp.evaluate(
			"uiReview.configure({language:'en',theme:'paper',accent:'teal',source:'huhu',density:'compact',uiSize:'14',motion:'reduce'})",
		);
		await show(cdp, name, 390);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-automation-row-id="notify"]')`),
			'real automations ready',
		);
		await cdp.evaluate(
			`void (uiReview.list${name}=uiReview.docs.${name}.querySelector('[data-automation-list] [role="table"]'))`,
		);
		await click(cdp, name, '[data-automation-row-id="notify"] button');
		await waitFor(
			() =>
				cdp.evaluate(
					`!!uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"] [role="switch"]')`,
				),
			'real detail',
		);
		assert.equal(
			await cdp.evaluate(
				`uiReview.list${name}===uiReview.docs.${name}.querySelector('[data-automation-list] [role="table"]')`,
			),
			true,
		);
		const toggle = '[data-slot="detail-pane-scroll"] [role="switch"]',
			before = await cdp.evaluate(
				`uiReview.entries.${name}.service.definitions.find(d=>d.id==='notify').enabled`,
			);
		await cdp.evaluate(`uiReview.hold(${JSON.stringify(name)})`);
		await click(cdp, name, toggle);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector(${JSON.stringify(toggle)}).getAttribute('aria-busy')==='true'`,
				),
			'true Promise pending',
		);
		const calls = await cdp.evaluate(`uiReview.entries.${name}.io.saveCalls`);
		await click(cdp, name, toggle);
		assert.equal(await cdp.evaluate(`uiReview.entries.${name}.io.saveCalls`), calls);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-automation-row-id="notify"] [role="switch"]').getAttribute('aria-busy')`,
			),
			'true',
		);
		await cdp.evaluate(`uiReview.release(${JSON.stringify(name)})`);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector(${JSON.stringify(toggle)}).getAttribute('aria-busy')!=='true'`,
				),
			'Promise settled',
		);
		assert.equal(
			await cdp.evaluate(`uiReview.entries.${name}.service.definitions.find(d=>d.id==='notify').enabled`),
			!before,
		);
		await cdp.evaluate(`uiReview.entries.${name}.io.fail=true`);
		await click(cdp, name, toggle);
		await waitFor(
			() =>
				cdp.evaluate(
					`!!uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"] [role="alert"]')`,
				),
			'failure visible inside Sheet',
		);
		assert.equal(
			await cdp.evaluate(`uiReview.entries.${name}.service.definitions.find(d=>d.id==='notify').enabled`),
			!before,
		);
		await cdp.evaluate(`uiReview.entries.${name}.io.fail=false`);
		await capture(`t07-${name}-pending-failure`);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"] [role="switch"]')`,
				),
			'detail closed',
		);
		await click(cdp, name, '[data-automation-row-id="notify"] button[aria-label="Edit notify automation"]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-automation-editor]')`),
			'real edit Dialog',
		);
		const title = '[data-automation-editor] input';
		await text(cdp, name, title, 'Native automation draft · 草稿');
		await cdp.evaluate(
			`void (uiReview.retained${name}=uiReview.docs.${name}.querySelector('[data-automation-editor] input'))`,
		);
		await cdp.evaluate(`uiReview.hide(${JSON.stringify(name)},false)`);
		await tick(cdp);
		assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`), false);
		await cdp.evaluate(`uiReview.hide(${JSON.stringify(name)},true)`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
			'retained Dialog restored',
		);
		assert.equal(
			await cdp.evaluate(
				`uiReview.retained${name}===uiReview.docs.${name}.querySelector('[data-automation-editor] input')`,
			),
			true,
		);
		await capture(`t07-${name}-editor`);
		const nativeEditor = await editorNativeControls({ cdp, name, waitFor, capture });
		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
			'single dirty decision',
		);
		assert.equal(await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"]').length`), 1);
		await click(cdp, name, '[role="alertdialog"] button:last-child');
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-automation-editor]')`),
			'discard closes one editor',
		);
		receipt.documents.push({
			name,
			pendingShared: true,
			failedTrueState: true,
			stableList: true,
			retainedEditor: true,
			nativeEditor,
			coarse: await coarseRowControl(cdp, name, waitFor),
		});
	}
	for (const width of [1440, 390])
		for (const state of [
			'empty',
			'loading',
			'no-results',
			'error',
			'unavailable',
			'failed',
			'missing',
			'unsupported',
		]) {
			await cdp.send('Emulation.setDeviceMetricsOverride', {
				width,
				height: 1000,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await cdp.evaluate(`uiReview.scenario(${JSON.stringify(state)})`);
			await tick(cdp);
			for (const name of ['main', 'second']) {
				await show(cdp, name, width);
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-automation-page]')`),
					'state ready',
				);
				if (state === 'loading') {
					await cdp.evaluate(`uiReview.hold(${JSON.stringify(name)})`);
					await click(cdp, name, 'button[aria-label="Refresh automations"]');
					await waitFor(
						() =>
							cdp.evaluate(
								`uiReview.docs.${name}.querySelector('[data-automation-page]').getAttribute('aria-busy')==='true'`,
							),
						'actual refresh Promise',
					);
				}
				if (state === 'no-results') {
					await text(
						cdp,
						name,
						'input[aria-label="Search name, prompt, or directory…"]',
						'No matching fixture text',
					);
					assert.equal(
						await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[data-automation-row-id]').length`),
						0,
					);
				}
				if (state === 'failed') {
					await click(cdp, name, '[data-automation-row-id="notify"] [role="switch"]');
					await waitFor(
						() =>
							cdp.evaluate(
								`!!uiReview.docs.${name}.querySelector('[data-automation-page] [role="alert"]')`,
							),
						'actual failed write',
					);
					assert.equal(
						await cdp.evaluate(
							`uiReview.entries.${name}.service.definitions.find(d=>d.id==='notify').enabled`,
						),
						true,
					);
				}
				if (state === 'unavailable')
					assert.equal(
						await cdp.evaluate(
							`[...uiReview.docs.${name}.querySelectorAll('[data-automation-row-id] [role="switch"]')].every(e=>e.hasAttribute('disabled'))`,
						),
						true,
					);
				if (state === 'unsupported') {
					await click(cdp, name, '[data-automation-row-id="script"] button');
					await waitFor(
						() =>
							cdp.evaluate(
								`!!uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"] [role="switch"]')`,
							),
						'unsupported action details',
					);
					assert.equal(
						await cdp.evaluate(
							`uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"] [role="switch"]').hasAttribute('disabled')`,
						),
						true,
					);
				}
				await capture(`t07-${name}-${width}-${state}`);
				receipt.states.push({
					name,
					width,
					state,
					text: await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-automation-page]').innerText`),
				});
				if (state === 'unsupported' && await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`)) {
					await key(cdp, 'Escape', 27);
					await waitFor(() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot="detail-pane-scroll"]')`), 'unsupported details closed before changing document');
				}
				if (state === 'loading') {
					await cdp.evaluate(`uiReview.release(${JSON.stringify(name)})`);
					await waitFor(
						() =>
							cdp.evaluate(
								`uiReview.docs.${name}.querySelector('[data-automation-page]').getAttribute('aria-busy')!=='true'`,
							),
						'refresh settled',
					);
				}
			}
		}
	await cdp.evaluate('uiReview.dispose()');
	await tick(cdp);
	assert.equal(
		await cdp.evaluate('Object.values(uiReview.docs).some(d=>d.querySelector(".huhu-portal-root"))'),
		false,
	);
	result.automations = receipt;
}

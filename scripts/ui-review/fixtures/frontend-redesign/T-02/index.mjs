import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview && Object.values(uiReview.docs).every(doc=>doc.querySelector("[data-review=segment] [role=radio]"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS =
	'body{padding:0}main{width:100%;padding:16px;background:var(--hu-surface);color:var(--hu-fg);container-type:inline-size}h1,h2,p{margin:0 0 12px}h2{font-size:var(--hu-text-lg)}section{min-width:0}.probe-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}.probe-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:12px 0}@media(pointer:coarse){.probe-row{gap:24px}}@container(min-width:600px){.probe-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';
export async function verify({ cdp, sample, waitFor, capture }) {
	for (const name of ['main', 'second']) {
		await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const first=doc.querySelector('[data-review="segment"] [role="radio"]');first.focus();globalThis.segmentParentBefore=document.activeElement;})()`,
		);
		await cdp.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'ArrowRight',
			code: 'ArrowRight',
			windowsVirtualKeyCode: 39,
			nativeVirtualKeyCode: 39,
		});
		await cdp.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'ArrowRight',
			code: 'ArrowRight',
			windowsVirtualKeyCode: 39,
			nativeVirtualKeyCode: 39,
		});
		await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');

		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.state.${name}.segment==='calendar' && uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelectorAll('[data-review="segment"] [role="radio"]')[1]`,
				),
			`${name} adapted ArrowRight`,
		);
		const proof = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const radios=doc.querySelectorAll('[data-review="segment"] [role="radio"]');return {label:radios[1].textContent,parentStayed:document.activeElement===globalThis.segmentParentBefore,checked:radios[1].getAttribute('aria-checked')}})()`,
		);
		assert.equal(proof.label, sample.language === 'en' ? 'Second' : '第二项');
		if (name === 'second') assert.equal(proof.parentStayed, true);
		assert.equal(proof.checked, 'true');
		await cdp.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key: 'ArrowLeft',
			code: 'ArrowLeft',
			windowsVirtualKeyCode: 37,
			nativeVirtualKeyCode: 37,
		});
		await cdp.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key: 'ArrowLeft',
			code: 'ArrowLeft',
			windowsVirtualKeyCode: 37,
			nativeVirtualKeyCode: 37,
		});
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.state.${name}.segment==='list' && uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="segment"] [role="radio"]')`,
				),
			`${name} adapted ArrowLeft`,
		);
	}
	const expectedControl = sample.density === 'comfortable' ? 36 : 32;
	const expectedLarge = sample.density === 'comfortable' ? 40 : 36;
	const expectedRow = sample.pointer === 'coarse' ? 44 : sample.density === 'comfortable' ? 36 : 32;
	for (const name of ['main', 'second']) {
		await waitFor(
			() =>
				cdp.evaluate(
					`Math.round(uiReview.docs.${name}.querySelector('[data-slot="tree-item"]').getBoundingClientRect().height)===${expectedRow}`,
				),
			`${name} tree density`,
		);
		const base = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const root=doc.querySelector('main');const size=key=>Math.round(doc.querySelector('[data-review="'+key+'"]').getBoundingClientRect().height);const input=doc.querySelector('[data-review="error-field"]');const ids=input.getAttribute('aria-describedby').split(' ');const task=doc.querySelector('[data-slot="task-content"]');return {sm:size('size-sm'),md:size('size-md'),lg:size('size-lg'),hit:(()=>{const style=doc.defaultView.getComputedStyle(doc.querySelector('[data-review="size-md"]'),'::before');return {width:parseFloat(style.width),height:parseFloat(style.height)}})(),mixed:doc.querySelector('[data-review="mixed"]').getAttribute('aria-checked'),invalid:input.getAttribute('aria-invalid'),linked:ids.every(id=>doc.getElementById(id)),busy:doc.querySelector('[data-review="busy"]').disabled,treeTabs:doc.querySelectorAll('[role="treeitem"][tabindex="0"]').length,leafExpanded:doc.querySelector('[data-tree-id="row-0"]').getAttribute('aria-expanded'),virtualHeight:doc.querySelector('[data-slot="tree"]').getBoundingClientRect().height,renderedRows:doc.querySelectorAll('[role="treeitem"]').length,row:Math.round(doc.querySelector('[data-slot="tree-item"]').getBoundingClientRect().height),chevron:(()=>{const r=doc.querySelector('[data-slot="tree-toggle"]').getBoundingClientRect();return {width:r.width,height:r.height}})(),completed:doc.defaultView.getComputedStyle(task.firstElementChild).textDecorationLine,metadata:doc.defaultView.getComputedStyle(doc.querySelector('[data-review="task-metadata"]')).textDecorationLine,overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth+1,label:doc.querySelector('[data-review="size-md"]').textContent};})()`,
		);
		assert.equal(base.sm, expectedControl);
		assert.ok(base.hit.width >= (sample.pointer === 'coarse' ? 44 : 32));
		assert.ok(base.hit.height >= (sample.pointer === 'coarse' ? 44 : 32));
		assert.equal(base.md, expectedControl);
		assert.equal(base.lg, expectedLarge);
		assert.equal(base.mixed, 'mixed');
		assert.equal(base.invalid, 'true');
		assert.equal(base.linked, true);
		assert.equal(base.busy, true);
		assert.equal(base.treeTabs, 1);
		assert.equal(base.leafExpanded, null);
		assert.equal(base.virtualHeight, 161 * expectedRow + 8);
		assert.ok(base.renderedRows < 161);
		assert.equal(base.completed, 'line-through');
		assert.equal(base.metadata, 'none');
		assert.equal(base.overflow, false);
		assert.equal(base.label, sample.language === 'en' ? 'Save' : '保存');
		assert.ok(base.chevron.width >= (sample.pointer === 'coarse' ? 44 : 32));
		assert.ok(base.chevron.height >= (sample.pointer === 'coarse' ? 44 : 32));
		const slots = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const get=selector=>doc.querySelector(selector);const width=selector=>get(selector).getBoundingClientRect().width;return {type:get('[data-review="slot-type"]').type,disabled:get('[data-review="slot-disabled"]').disabled,disabledType:get('[data-review="slot-disabled"]').type,baseline:width('[data-review="busy-baseline"]'),direct:width('[data-review="busy"]'),slotted:width('[data-review="slot-busy"]'),head:get('[data-slot="table"] thead tr').getBoundingClientRect().height,body:get('[data-slot="table"] tbody tr').getBoundingClientRect().height,spinners:[...doc.querySelectorAll('[data-review="busy"] [data-slot="button-spinner"],[data-review="slot-busy"] [data-slot="button-spinner"]')].map(node=>doc.defaultView.getComputedStyle(node).animationName)};})()`,
		);
		assert.equal(slots.type, 'button');
		assert.equal(slots.disabled, true);
		assert.equal(slots.disabledType, 'button');
		assert.equal(slots.baseline, slots.direct);
		assert.equal(slots.baseline, slots.slotted);
		assert.equal(slots.head, 36);
		assert.equal(slots.body, sample.density === 'comfortable' ? 52 : 44);
		assert.equal(slots.spinners.length, 2);
		if (sample.reducedMotion || sample.motion === 'reduce')
			assert.ok(slots.spinners.every((value) => value === 'none'));
		await click(cdp, name, '[data-review="slot-type"]');
		await click(cdp, name, '[data-review="slot-disabled"]');
		assert.equal(await cdp.evaluate(`uiReview.state.${name}.submits`), 0);
		await click(cdp, name, '[data-review="busy"]');
		assert.equal(await cdp.evaluate(`uiReview.state.${name}.busyClicks`), 0);
		if (sample.pointer === 'coarse') {
			await visibleFrame(cdp, name, true);
			await hitOutside(cdp, name);
			await visibleFrame(cdp, name, false);
		}
		await click(cdp, name, '[data-review="dirty-trigger"]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
			`${name} dialog opened`,
		);
		await settle(cdp, name);
		const dialog = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const node=doc.querySelector('[role="dialog"]');const style=doc.defaultView.getComputedStyle(node);return {owner:node.closest('.huhu-ui').ownerDocument===doc,layer:Number(style.zIndex),radius:style.borderRadius,source:node.closest('.huhu-ui').dataset.source,theme:node.closest('.huhu-ui').dataset.theme,close:node.querySelector('[data-slot="dialog-close"][aria-label]').getAttribute('aria-label')};})()`,
		);
		assert.equal(dialog.owner, true);
		assert.equal(dialog.source, sample.source);
		assert.equal(dialog.theme, sample.theme);
		assert.equal(dialog.radius, '16px');
		assert.equal(dialog.close, sample.language === 'en' ? 'Close' : '关闭');
		sample.overlays ??= [];
		sample.overlays.push({ document: name, ...dialog });
		await visibleFrame(cdp, name, true);
		await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
		const geometry = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const node=doc.querySelector('[data-slot="dialog-content"]');const frame=document.querySelector('iframe');return {viewport:doc.documentElement.clientWidth,inner:doc.defaultView.innerWidth,topViewport:document.documentElement.clientWidth,frame:frame.getBoundingClientRect().width,dialog:node.getBoundingClientRect().width,computed:doc.defaultView.getComputedStyle(node).width,zoom:doc.defaultView.getComputedStyle(doc.body).zoom,dpr:doc.defaultView.devicePixelRatio};})()`,
		);
		sample.overlays.at(-1).geometry = geometry;
		assert.equal(Math.round(geometry.dialog), Math.min(512, geometry.viewport - 32));
		if (name === 'second') assert.ok(Math.abs(geometry.frame - geometry.inner) <= 1);
		sample.overlays.at(-1).screenshot = await capture(
			`component-dialog-${sample.width}-${sample.language}-${sample.theme}-${sample.accent}-${sample.source}-${sample.hostMode ?? 'none'}-${sample.density}-${sample.uiSize}-${sample.mobile ? 'mobile' : 'desktop'}-${sample.zoom}x-${name}`,
		);
		await click(cdp, name, '[data-slot="dialog-close"][aria-label]');
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
			`${name} dialog closed`,
		);
		await visibleFrame(cdp, name, false);
	}
	await focusProof({ cdp, sample });
	sample.assertions.push(
		'real adapted SegmentedControl ArrowRight/Left changes selection and focus in both Documents without parent focus theft',
	);
}

async function click(cdp, name, selector) {
	await cdp.evaluate(
		`(()=>{const node=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});node.focus();node.click();})()`,
	);
}
async function key(cdp, value, code) {
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key: value,
		code: value,
		windowsVirtualKeyCode: code,
		nativeVirtualKeyCode: code,
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp',
		key: value,
		code: value,
		windowsVirtualKeyCode: code,
		nativeVirtualKeyCode: code,
	});
}
async function settle(cdp, name) {
	await cdp.evaluate(
		`Promise.all([...uiReview.docs.${name}.querySelectorAll('[role="dialog"],[role="alertdialog"],[data-slot$="overlay"]')].flatMap(node=>node.getAnimations()).filter(animation=>animation.effect.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished))`,
	);
}
async function visibleFrame(cdp, name, show) {
	if (name !== 'second') return;
	if (show)
		await cdp.evaluate(
			"globalThis.componentIframeStyle=document.querySelector('iframe').style.cssText;document.querySelector('iframe').style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9999'",
		);
	else await cdp.evaluate("document.querySelector('iframe').style.cssText=globalThis.componentIframeStyle");
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];

	const last = result.cases.at(-1);
	for (const motion of ['normal', 'reduce']) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: last.cssWidth,
			height: 1000 / last.zoom,
			deviceScaleFactor: last.zoom,
			mobile: last.mobile,
		});
		await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: last.pointer === 'coarse' });
		await cdp.send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: motion === 'reduce' ? 'reduce' : 'no-preference' }],
		});
		for (const language of ['en', 'zh']) {
			await cdp.evaluate(configure({ ...last, language, motion: 'system' }));
			await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
			for (const name of ['main', 'second']) {
				await cdp.evaluate(`uiReview.state.${name}.dirtyMode=true`);
				await visibleFrame(cdp, name, true);
				await click(cdp, name, '[data-review="dirty-trigger"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'dirty open',
				);
				await settle(cdp, name);
				await waitTick(cdp);
				await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="draft"]').focus()`);
				await key(cdp, 'F6', 117);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="nested-popover"]')`,
					),
					true,
				);
				await key(cdp, 'Escape', 27);
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'dirty Esc confirmation',
				);
				await settle(cdp, name);
				await waitTick(cdp);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('[role="alertdialog"]').contains(uiReview.docs.${name}.activeElement)`,
						),
					'confirmation focus settled',
				);
				await key(cdp, 'Escape', 27);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'Esc consumes confirmation only',
				);
				await settle(cdp, name);
				await waitTick(cdp);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('[data-slot="dialog-content"]').contains(uiReview.docs.${name}.activeElement)`,
						),
					'parent focus restored after child',
				);
				assert.equal(
					await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="draft"]')`),
					true,
				);
				await click(cdp, name, '[data-review="nested-popover"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot="popover-content"]')`),
					'nested popover',
				);
				result.debug ??= [];
				result.debug.push(
					await cdp.evaluate(
						`({document:'${name}',focus:uiReview.docs.${name}.activeElement.outerHTML,dialogs:[...uiReview.docs.${name}.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(node=>({slot:node.dataset.slot,state:node.dataset.state,layer:node.style.zIndex,html:node.outerHTML.slice(0,500)}))})`,
					),
				);
				const layers = await cdp.evaluate(
					`[Number(uiReview.docs.${name}.querySelector('[data-slot="popover-content"]').style.zIndex),Number(uiReview.docs.${name}.querySelector('[data-slot="dialog-content"]').style.zIndex)]`,
				);
				assert.ok(layers[0] > layers[1]);
				await key(cdp, 'Escape', 27);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot="popover-content"]')`),
					'Esc consumes popover only',
				);
				assert.equal(
					await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="draft"]')`),
					true,
				);
				await click(cdp, name, '[data-review="dirty-cancel"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'cancel confirmation',
				);
				await armClose(cdp, name, '[data-slot="dialog-content"]');
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'discard committed',
				);
				await waitFor(() => cdp.evaluate('globalThis.exactCloseSettled===true'), 'parent realScopeclose');
				await waitTick(cdp);

				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="dirty-trigger"]')`,
						),
					'dirty focus return',
				);
				await click(cdp, name, '[data-review="dirty-trigger"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'outside open',
				);
				await cdp.send('Input.dispatchMouseEvent', {
					type: 'mousePressed',
					x: 2,
					y: 2,
					button: 'left',
					clickCount: 1,
				});
				await cdp.send('Input.dispatchMouseEvent', {
					type: 'mouseReleased',
					x: 2,
					y: 2,
					button: 'left',
					clickCount: 1,
				});
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'outside confirmation',
				);
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'outside discard',
				);
				await noModals(cdp, name, waitFor, 'outside subtree fully closed');
				await click(cdp, name, '[data-review="sheet-trigger"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot="sheet-content"]')`),
					'sheet open',
				);
				await settle(cdp, name);
				await waitTick(cdp);
				await click(cdp, name, '[data-review="sheet-cancel"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'sheet dirty',
				);
				await settle(cdp, name);
				await waitTick(cdp);
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot="sheet-content"]')`),
					'sheet discard',
				);
				await noModals(cdp, name, waitFor, 'Sheet subtree fully closed');
				await click(cdp, name, '[data-review="command-trigger"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'command open',
				);
				await click(cdp, name, '[data-review="command-confirm"]');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'command child',
				);
				const z = await cdp.evaluate(
					`[Number(uiReview.docs.${name}.querySelector('[role="alertdialog"]').style.zIndex),Number(uiReview.docs.${name}.querySelector('[role="dialog"]').style.zIndex)]`,
				);
				assert.ok(z[0] > z[1]);
				await toastAboveModal(cdp, name, waitFor);
				await key(cdp, 'F6', 117);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.querySelector('[role="alertdialog"]').contains(uiReview.docs.${name}.activeElement)`,
					),
					true,
				);
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('[role="alertdialog"]').getAttribute('aria-busy')==='true'`,
						),
					'confirmation busy',
				);
				await key(cdp, 'Escape', 27);
				assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`), true);
				await cdp.evaluate(`uiReview.finishConfirmation('${name}',false)`);
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"] [role="alert"]')`),
					'failure preserves confirmation',
				);
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
				await cdp.evaluate(`uiReview.finishConfirmation('${name}',true)`);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
					'retry succeeds',
				);
				assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`), true);
				await key(cdp, 'Escape', 27);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
					'command close',
				);
				await cdp.evaluate(`uiReview.resetTree('${name}')`);
				await waitTick(cdp);
				await cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-slot="tree"]').parentElement.scrollTop=0`,
				);
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-tree-id="folder"]')`),
					'tree virtualviewport at start',
				);
				const folder = '[data-tree-id="folder"]';
				await cdp.evaluate(`uiReview.docs.${name}.querySelector('${folder}').focus()`);
				if (
					await cdp.evaluate(
						`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='false'`,
					)
				) {
					await toggleEdge(cdp, name);
					await waitFor(
						() =>
							cdp.evaluate(
								`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='true'`,
							),
						'tree baseline expanded',
					);
				}
				const selectedBefore = await cdp.evaluate(
					`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-selected')`,
				);
				await toggleEdge(cdp, name);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='false'`,
						),
					'edge collapse',
				);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-selected')`,
					),
					selectedBefore,
				);
				await toggleEdge(cdp, name);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='true'`,
						),
					'edge expand',
				);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-selected')`,
					),
					selectedBefore,
				);
				await toggleEdge(cdp, name);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='false'`,
						),
					'manual collapsed before search',
				);
				await cdp.evaluate(
					`(()=>{const field=uiReview.docs.${name}.querySelector('[data-review="tree-search"]');field.focus();field.select();})()`,
				);
				await cdp.send('Input.insertText', { text: '159' });
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-tree-id="row-159"]')`),
					'filtered match appears',
				);
				await click(cdp, name, '[data-tree-id="row-159"]');
				await cdp.evaluate(
					`(()=>{const field=uiReview.docs.${name}.querySelector('[data-review="tree-search"]');field.focus();field.select();})()`,
				);
				await key(cdp, 'Backspace', 8);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.querySelector('${folder}')?.getAttribute('aria-expanded')==='false' && !uiReview.docs.${name}.querySelector('[data-tree-id="row-159"]')`,
						),
					'clear restores manual expansion',
				);
				await cdp.evaluate(`uiReview.docs.${name}.querySelector('${folder}').focus()`);
				await key(cdp, 'F2', 113);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="tree-menu-trigger"]')`,
					),
					true,
				);
				await key(cdp, 'ArrowDown', 40);
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="menu"]')`),
					'F2 action opens real menu',
				);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="tree-menu-item"]')`,
						),
					'realmenu initial focus',
				);
				await key(cdp, 'ArrowDown', 40);
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.activeElement.textContent===${JSON.stringify(language === 'en' ? 'Retry' : '重试')}`,
						),
					'realmenu next focus',
				);
				assert.equal(
					await cdp.evaluate(`uiReview.docs.${name}.activeElement.textContent`),
					language === 'en' ? 'Retry' : '重试',
				);
				await key(cdp, 'Enter', 13);
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="menu"]')`),
					'menu Enter completes',
				);
				await overlayInteractions(cdp, name, language, waitFor);
				await panelInteraction(cdp, name, waitFor);
				await exactNestedReturns(cdp, result, name, language, waitFor, motion);
				result.interactions.push({
					motion,
					language,
					document: name,
					dirty: ['Esc', 'cancel', 'outside', 'Sheet'],
					nested: ['Popover', 'Command-confirmation'],
					busyFailureRetry: true,
					tree: [
						'coarse geometry/right-edge expansion',
						'search clear manual-state restore',
						'F2/real-menu ArrowDown/Enter',
					],
				});
				await visibleFrame(cdp, name, false);
			}
		}
		await detailInteractions(cdp, result, waitFor, capture, motion);
		await ownerLifecycleInteractions(cdp, result, waitFor, motion);
	}
	await joinedInteractions(cdp, result, waitFor);
}

async function toggleEdge(cdp, name) {
	const rect = await cdp.evaluate(
		`(()=>{const node=uiReview.docs.${name}.querySelector('[data-slot="tree-toggle"]');node.scrollIntoView({block:'center'});const rect=node.getBoundingClientRect();return {x:rect.right-2,y:rect.top+rect.height/2,width:rect.width,height:rect.height,min:node.ownerDocument.defaultView.matchMedia('(pointer:coarse)').matches?44:32};})()`,
	);
	assert.ok(rect.width >= rect.min);
	assert.ok(rect.height >= rect.min);
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mousePressed',
		x: rect.x,
		y: rect.y,
		button: 'left',
		clickCount: 1,
	});
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mouseReleased',
		x: rect.x,
		y: rect.y,
		button: 'left',
		clickCount: 1,
	});
}

async function hitOutside(cdp, name) {
	const before = await cdp.evaluate(
		`({hit:uiReview.state.${name}.hitClicks,neighbor:uiReview.state.${name}.neighborHits})`,
	);
	const point = await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};const button=doc.querySelector('[data-review="hit-probe"]');button.scrollIntoView({block:'center'});const r=button.getBoundingClientRect();const x=r.right+4,y=r.top+r.height/2;return {x,y,outside:x>r.right,target:doc.elementFromPoint(x,y)?.closest('[data-review]')?.dataset.review};})()`,
	);
	assert.equal(point.outside, true);
	assert.equal(point.target, 'hit-probe');
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mousePressed',
		x: point.x,
		y: point.y,
		button: 'left',
		clickCount: 1,
	});
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mouseReleased',
		x: point.x,
		y: point.y,
		button: 'left',
		clickCount: 1,
	});
	await waitTick(cdp);
	assert.equal(await cdp.evaluate(`uiReview.state.${name}.hitClicks`), before.hit + 1);
	assert.equal(await cdp.evaluate(`uiReview.state.${name}.neighborHits`), before.neighbor);
}
async function waitTick(cdp) {
	await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}

async function panelInteraction(cdp, name, waitFor) {
	const before = await cdp.evaluate(`uiReview.state.${name}.layout.left`);
	await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-slot="resizable-handle"]').focus()`);
	await key(cdp, 'ArrowRight', 39);
	await waitFor(
		() => cdp.evaluate(`uiReview.state.${name}.layout.left>${before}`),
		'native v4 separator keyboard layout',
	);
	await key(cdp, 'ArrowLeft', 37);
	const layout = await cdp.evaluate(`uiReview.state.${name}.layout`);
	assert.ok(Math.abs(layout.left + layout.right - 100) < 0.1);
}
async function overlayInteractions(cdp, name, language, waitFor) {
	for (const [trigger, content] of [
		['[data-review="menu-trigger"]', '[role="menu"]'],
		['[data-review="select-trigger"]', '[role="listbox"]'],
	]) {
		await cdp.evaluate(`uiReview.docs.${name}.querySelector(${JSON.stringify(trigger)}).focus()`);
		await key(cdp, 'ArrowDown', 40);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector(${JSON.stringify(content)})`),
			'real keyboard floating opened',
		);
		const owner = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const node=doc.querySelector(${JSON.stringify(content)});return node.ownerDocument===doc&&!!node.closest('.huhu-ui')})()`,
		);
		assert.equal(owner, true);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector(${JSON.stringify(content)})`),
			'floating Esc',
		);
	}
	for (const [trigger, content] of [
		['[data-review="tooltip-trigger"]', '[data-slot="tooltip-content"]'],
		['[data-review="hover-trigger"]', '[data-slot="hover-card-content"]'],
	]) {
		const point = await cdp.evaluate(
			`(()=>{const node=uiReview.docs.${name}.querySelector(${JSON.stringify(trigger)});node.scrollIntoView({block:'center'});const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
		);
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector(${JSON.stringify(content)})`),
			'actual hover overlay',
		);
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector(${JSON.stringify(content)})`),
			'hover closes',
		);
	}
	const point = await cdp.evaluate(
		`(()=>{const node=uiReview.docs.${name}.querySelector('[data-review="context-trigger"]');node.scrollIntoView({block:'center'});const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
	);
	await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'right', clickCount: 1 });
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'right', clickCount: 1 });
	await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="menu"]')`), 'actual context menu');
	await key(cdp, 'Escape', 27);
	await waitFor(() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="menu"]')`), 'context Esc');
	await click(cdp, name, '[data-review="toast-trigger"]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-sonner-toast]')`),
		'real Sonner toast',
	);
	const toast = await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};const node=doc.querySelector('[data-sonner-toast]');return {label:node.textContent,layer:Number(doc.defaultView.getComputedStyle(node.closest('[data-sonner-toaster]')).zIndex),owner:node.closest('.huhu-ui').ownerDocument===doc};})()`,
	);
	assert.equal(toast.owner, true);
	assert.ok(toast.layer > 40);
	assert.ok(toast.label.includes(language === 'en' ? 'Save' : '保存'));
	await cdp.evaluate('uiReview.dismissToasts()');
}
async function detailInteractions(cdp, result, waitFor, capture, motion) {
	result.details ??= [];
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1440,
		height: 900,
		deviceScaleFactor: 1,
		mobile: false,
	});
	for (const name of ['main', 'second']) {
		await visibleFrame(cdp, name, true);
		if (name === 'second') await cdp.evaluate("document.querySelector('iframe').style.width='1440px'");
		await click(cdp, name, '[data-review="detail-trigger"]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot="detail-pane"]')`),
			'wideleaf inline',
		);
		await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const field=doc.querySelector('[data-review="detail-draft"]');field.focus();field.select();})()`,
		);
		await cdp.send('Input.insertText', { text: 'unsaved' });
		await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name};const field=doc.querySelector('[data-review="detail-draft"]');globalThis.detailField=field;globalThis.detailHost=field.closest('[data-slot="detail-pane-scroll"]');field.setSelectionRange(1,4);detailHost.scrollTop=73;globalThis.detailMountBaseline=uiReview.state.${name}.detailMounts;})()`,
		);
		for (const [leaf, main, inline, full] of [
			[620, 568, false, false],
			[580, 528, false, true],
			[1440, null, true, false],
		]) {
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-review="detail-main"]').style.width='${main === null ? '100%' : `${main}px`}'`,
			);
			if (name === 'main')
				await cdp.send('Emulation.setDeviceMetricsOverride', {
					width: leaf,
					height: 900,
					deviceScaleFactor: 1,
					mobile: false,
				});
			else await cdp.evaluate(`document.querySelector('iframe').style.width='${leaf}px'`);
			await waitFor(
				() =>
					cdp.evaluate(
						`!!uiReview.docs.${name}.querySelector('[data-slot="${inline ? 'detail-pane' : 'sheet-content'}"]')`,
					),
				'detail actual leaf transition',
			);
			await settle(cdp, name);
			await waitTick(cdp);
			const proof = await cdp.evaluate(
				`(()=>{const doc=uiReview.docs.${name};const node=doc.querySelector('[data-slot="${inline ? 'detail-pane' : 'sheet-content'}"]');const field=doc.querySelector('[data-review="detail-draft"]');return {leaf:doc.documentElement.clientWidth,main:doc.querySelector('[data-review="detail-main"]').clientWidth,width:node.getBoundingClientRect().width,same:field===globalThis.detailField,draft:field.value,selection:[field.selectionStart,field.selectionEnd],focus:doc.activeElement===field,scroll:detailHost.scrollTop,mounts:uiReview.state.${name}.detailMounts===globalThis.detailMountBaseline,confirm:!!doc.querySelector('[role="alertdialog"]')};})()`,
			);
			if (inline) {
				assert.ok(proof.leaf >= 960 && proof.leaf <= leaf);
				assert.ok(proof.main >= 1000);
			} else {
				assert.equal(proof.leaf, leaf);
				assert.equal(proof.main, main);
			}
			assert.equal(Math.round(proof.width), full ? leaf : 360);
			assert.equal(proof.same, true);
			assert.equal(proof.draft, 'unsaved');
			assert.deepEqual(proof.selection, [1, 4]);
			assert.equal(proof.focus, true);
			assert.equal(proof.scroll, 73);
			assert.equal(proof.mounts, true);
			assert.equal(proof.confirm, false);
			result.details.push({
				document: name,
				motion,
				...proof,
				screenshot: await capture(`detail-pane-${name}-${leaf}-${inline ? 'inline' : 'sheet'}-${motion}`),
			});
		}
		await reparentedConfirmation(cdp, name, waitFor);
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-slot="detail-pane"] button').click()`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
			'detail dirty close',
		);
		await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[0].click()`);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
			'detail keep editing',
		);
		assert.equal(await cdp.evaluate('detailField.value'), 'unsaved');
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-slot="detail-pane"] button').click()`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
			'detail discard confirmation',
		);
		await cdp.evaluate(
			`globalThis.detailFocusTrace=[];uiReview.docs.${name}.addEventListener('focusin',event=>detailFocusTrace.push({review:event.target.dataset.review,slot:event.target.dataset.slot,label:event.target.getAttribute('aria-label')}));globalThis.detailCloseDone=new Promise(resolve=>uiReview.docs.${name}.querySelector('[role="alertdialog"]').addEventListener('focusScope.autoFocusOnUnmount',()=>queueMicrotask(()=>queueMicrotask(resolve)),{once:true}));globalThis.detailCloseSettled=false;void detailCloseDone.then(()=>globalThis.detailCloseSettled=true);`,
		);
		await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-review="detail-draft"]')`),
			'actualdetail close',
		);
		await waitFor(
			() => cdp.evaluate('globalThis.detailCloseSettled===true'),
			'actual child FocusScope close settled',
		);
		await waitTick(cdp);
		try {
			await waitFor(
				() =>
					cdp.evaluate(
						`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="detail-trigger"]')`,
					),
				'detail actual close focus',
			);
		} catch (error) {
			result.detailCloseFailure = await cdp.evaluate(
				`({document:'${name}',active:uiReview.docs.${name}.activeElement.outerHTML,trace:detailFocusTrace,opener:uiReview.docs.${name}.querySelector('[data-review="detail-trigger"]').outerHTML})`,
			);
			throw error;
		}
		await visibleFrame(cdp, name, false);
	}
}

async function toastAboveModal(cdp, name, waitFor) {
	await cdp.evaluate(`globalThis.toastFocus=uiReview.docs.${name}.activeElement;uiReview.showToast('${name}')`);
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-sonner-toast]')`),
		'toast during childmodal',
	);
	const proof = await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};return {focus:doc.activeElement===globalThis.toastFocus,toast:Number(doc.defaultView.getComputedStyle(doc.querySelector('[data-sonner-toaster]')).zIndex),modal:Number(doc.querySelector('[role="alertdialog"]').style.zIndex)};})()`,
	);
	assert.equal(proof.focus, true);
	assert.ok(proof.toast > proof.modal);
	await cdp.evaluate('uiReview.dismissToasts()');
	await waitFor(() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-sonner-toast]')`), 'toast removed');
}

async function reparentedConfirmation(cdp, name, waitFor) {
	await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="detail-main"]').style.width='568px'`);
	if (name === 'main')
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 620,
			height: 900,
			deviceScaleFactor: 1,
			mobile: false,
		});
	else await cdp.evaluate("document.querySelector('iframe').style.width='620px'");
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot="sheet-content"]')`),
		'reparent baseline Sheet',
	);
	await settle(cdp, name);
	await waitTick(cdp);
	await cdp.evaluate(
		`uiReview.docs.${name}.querySelector('[data-slot="sheet-content"] [data-slot="sheet-close"]').click()`,
	);
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
		'reparent confirmation',
	);
	await settle(cdp, name);
	await waitTick(cdp);
	await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="detail-main"]').style.width='100%'`);
	if (name === 'main')
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 1440,
			height: 900,
			deviceScaleFactor: 1,
			mobile: false,
		});
	else await cdp.evaluate("document.querySelector('iframe').style.width='1440px'");
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot="detail-pane"]')`),
		'reparent inlinewhileconfirming',
	);
	await settle(cdp, name);
	await waitFor(
		() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot="sheet-content"]')`),
		'previous Sheet fully removed',
	);
	await waitTick(cdp);
	await cdp.evaluate(
		`globalThis.reparentCloseDone=new Promise(resolve=>uiReview.docs.${name}.querySelector('[role="alertdialog"]').addEventListener('focusScope.autoFocusOnUnmount',()=>queueMicrotask(()=>queueMicrotask(resolve)),{once:true}));globalThis.reparentSettled=false;void reparentCloseDone.then(()=>globalThis.reparentSettled=true)`,
	);
	await key(cdp, 'Escape', 27);
	await waitFor(() => cdp.evaluate('globalThis.reparentSettled===true'), 'reparent child FocusScope close settled');
	await waitTick(cdp);
	assert.equal(
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('[data-slot="detail-pane"]').contains(uiReview.docs.${name}.activeElement)`,
		),
		true,
	);
	assert.equal(
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="detail-draft"]').value`),
		'unsaved',
	);
}
async function ownerLifecycleInteractions(cdp, result, waitFor, motion) {
	result.ownerLifecycles ??= [];
	for (const name of ['main', 'second']) {
		await visibleFrame(cdp, name, true);
		await cdp.evaluate(`uiReview.mountLifecycle('${name}')`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="lifecycle-trigger"]')`),
			'scratch liveowner',
		);
		await click(cdp, name, '[data-review="lifecycle-trigger"]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="dialog"]')`),
			'scratch ownermodal',
		);
		await settle(cdp, name);
		await waitTick(cdp);
		await cdp.evaluate(
			`globalThis.ownerCloseDone=new Promise(resolve=>uiReview.docs.${name}.querySelector('[role="dialog"]').addEventListener('focusScope.autoFocusOnUnmount',()=>queueMicrotask(()=>queueMicrotask(resolve)),{once:true}));globalThis.ownerCloseSettled=false;ownerCloseDone.then(()=>globalThis.ownerCloseSettled=true);uiReview.unmountLifecycle('${name}');uiReview.docs.${name}.querySelector('[data-review="hit-neighbor"]').focus()`,
		);
		await waitFor(
			() => cdp.evaluate('globalThis.ownerCloseSettled===true'),
			'destroyed owner FocusScope close settled',
		);
		await waitTick(cdp);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="hit-neighbor"]')`,
			),
			true,
		);
		result.ownerLifecycles.push({ document: name, motion, closedOwnerDoesNotStealFocus: true });
		await visibleFrame(cdp, name, false);
	}
}

async function armClose(cdp, name, selector) {
	await cdp.evaluate(
		`(()=>{globalThis.exactCloseSettled=false;uiReview.docs.${name}.querySelector(${JSON.stringify(selector)}).addEventListener('focusScope.autoFocusOnUnmount',()=>queueMicrotask(()=>queueMicrotask(()=>{globalThis.exactCloseSettled=true;})),{once:true});})()`,
	);
}
async function exactNestedReturns(cdp, result, name, language, waitFor, motion) {
	result.exactNestedSources ??= [];
	for (const kind of ['Dialog', 'Sheet']) {
		const trigger = kind === 'Dialog' ? 'dirty-trigger' : 'sheet-trigger',
			source = kind === 'Dialog' ? 'dirty-cancel' : 'sheet-cancel';
		await cdp.evaluate(`uiReview.state.${name}.dirtyMode=true`);
		await click(cdp, name, `[data-review="${trigger}"]`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="${source}"]')`),
			'exact source parentopen',
		);
		await settle(cdp, name);
		await waitTick(cdp);
		for (const how of ['keep', 'escape']) {
			await click(cdp, name, `[data-review="${source}"]`);
			await waitFor(
				() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
				'exact source confirmation',
			);
			await settle(cdp, name);
			await waitTick(cdp);
			await armClose(cdp, name, '[role="alertdialog"]');
			if (how === 'keep')
				await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[0].click()`);
			else await key(cdp, 'Escape', 27);
			await waitFor(() => cdp.evaluate('globalThis.exactCloseSettled===true'), 'exact source realScopeclose');
			await waitTick(cdp);
			assert.equal(
				await cdp.evaluate(
					`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="${source}"]')`,
				),
				true,
			);
			result.exactNestedSources.push({ document: name, language, kind, how, restoredExactSource: true });
		}
		await click(cdp, name, `[data-review="${source}"]`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
			'exact parentdiscard',
		);
		await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-review="${source}"]')`),
			'exact parentclosed',
		);
		await noModals(cdp, name, waitFor, 'exact subtree fully closed');
		await waitTick(cdp);
	}
	await click(cdp, name, '[data-review="dirty-trigger"]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="ordinary-nested-trigger"]')`),
		'ordinary parentopen',
	);
	await settle(cdp, name);
	await waitTick(cdp);
	await click(cdp, name, '[data-review="ordinary-nested-trigger"]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review="ordinary-nested-content"]')`),
		'ordinary nestedopen',
	);
	await settle(cdp, name);
	await waitTick(cdp);
	await armClose(cdp, name, '[data-review="ordinary-nested-content"]');
	await key(cdp, 'Escape', 27);
	await waitFor(() => cdp.evaluate('globalThis.exactCloseSettled===true'), 'ordinary nested realScopeclose');
	await waitTick(cdp);
	assert.equal(
		await cdp.evaluate(
			`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review="ordinary-nested-trigger"]')`,
		),
		true,
	);
	result.exactNestedSources.push({
		document: name,
		motion,
		language,
		kind: 'nestedDialog',
		how: 'escape',
		restoredExactSource: true,
	});
	await click(cdp, name, '[data-review="dirty-cancel"]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role="alertdialog"]')`),
		'ordinary parentdiscard',
	);
	await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role="alertdialog"] button')[1].click()`);
	await waitFor(
		() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-review="dirty-cancel"]')`),
		'ordinary parentclosed',
	);
	await noModals(cdp, name, waitFor, 'ordinary subtree fully closed');
	await waitTick(cdp);
}

async function noModals(cdp, name, waitFor, label) {
	await waitFor(
		() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"],[role="alertdialog"]')`),
		label,
	);
	await waitTick(cdp);
}

async function joinedGeometry(cdp, name, id) {
	return cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};const specimen=doc.querySelector('[data-joined="${id}"]');const group=specimen.querySelector('[data-slot="toggle-group"],[data-slot="segmented-control"]');const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {container:rect(specimen),group:rect(group),pointer:doc.defaultView.matchMedia('(pointer:coarse)').matches?'coarse':'fine',items:[...specimen.querySelectorAll('[data-slot="toggle-group-item"]')].map(node=>{const r=rect(node),p=doc.defaultView.getComputedStyle(node,'::before'),matrix=new doc.defaultView.DOMMatrix(p.transform);return {...r,label:node.textContent,cell:{x:r.x+parseFloat(p.left)+matrix.e,y:r.y+parseFloat(p.top)+matrix.f,width:parseFloat(p.width),height:parseFloat(p.height)}}})};})()`,
	);
}
function assertJoinedGeometry(geometry, { id, density, pointer }) {
	const min = pointer === 'coarse' ? 44 : 32,
		visual = density === 'comfortable' ? 36 : 32;
	assert.equal(geometry.pointer, pointer);
	assert.ok(geometry.group.height >= min);
	assert.ok(geometry.group.width <= geometry.container.width + 0.01);
	for (const item of geometry.items) {
		assert.equal(item.height, visual);
		assert.ok(item.cell.width >= min);
		assert.ok(item.cell.height >= min);
		assert.ok(item.cell.x >= geometry.container.x - 0.01);
		assert.ok(item.cell.x + item.cell.width <= geometry.container.x + geometry.container.width + 0.01);
	}
	for (let a = 0; a < geometry.items.length; a++)
		for (let b = a + 1; b < geometry.items.length; b++) {
			const first = geometry.items[a].cell,
				second = geometry.items[b].cell;
			const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
				overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
			assert.ok(Math.max(0, overlapX) * Math.max(0, overlapY) <= 0.001, `${id} cells ${a}/${b} overlap`);
		}
	const rows = [...new Set(geometry.items.map((item) => item.y))].sort((a, b) => a - b);
	for (let i = 1; i < rows.length; i++) assert.ok(rows[i] - rows[i - 1] >= min);
	if (id === 'wrap84') {
		assert.equal(geometry.container.width, 84);
		assert.equal(rows.length, pointer === 'coarse' ? 3 : 2);
	}
	if (id === 'wrap100') {
		assert.equal(geometry.container.width, 100);
		assert.equal(rows.length, 2);
	}
	if (id === 'long') assert.ok(geometry.items.every((item) => item.width > min));
}
async function joinedAction(cdp, name, id, index, focusIndex, point, kind, waitFor) {
	const values = ['a', 'b', 'c'];
	const seed = values[(index + 1) % (id.endsWith('2') || id === 'long' ? 2 : 3)];
	await cdp.evaluate(`uiReview.joined.${name}.${id}.reset(${JSON.stringify(seed)})`);
	await waitFor(
		() => cdp.evaluate(`uiReview.joined.${name}.${id}.value===${JSON.stringify(seed)}`),
		'joined controlled seed',
	);
	await cdp.evaluate(
		`uiReview.docs.${name}.querySelectorAll('[data-joined="${id}"] [data-slot="toggle-group-item"]')[${focusIndex}].focus()`,
	);
	await waitTick(cdp);
	const current = await joinedGeometry(cdp, name, id);
	const target = current.items[index];
	assert.ok(Math.abs(point.x - (target.x + target.width / 2) - point.dx) < 0.01);
	assert.ok(Math.abs(point.y - (target.y + target.height / 2) - point.dy) < 0.01);
	assert.ok(point.x > target.cell.x && point.x < target.cell.x + target.cell.width);
	assert.ok(point.y > target.cell.y && point.y < target.cell.y + target.cell.height);
	const hit = await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};const specimen=doc.querySelector('[data-joined="${id}"]');return [...specimen.querySelectorAll('[data-slot="toggle-group-item"]')].indexOf(doc.elementFromPoint(${point.x},${point.y})?.closest('[data-slot="toggle-group-item"]'));})()`,
	);
	assert.equal(hit, index, `${id} ${point.edge} under focus${focusIndex}`);
	assert.equal(await cdp.evaluate(`uiReview.joined.${name}.${id}.calls.length`), 0);
	const before = await cdp.evaluate(`uiReview.joinedClicks.${name}.length`);
	if (kind === 'mouse') {
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mousePressed',
			x: point.x,
			y: point.y,
			button: 'left',
			clickCount: 1,
		});
		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mouseReleased',
			x: point.x,
			y: point.y,
			button: 'left',
			clickCount: 1,
		});
	} else {
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
		});
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	}
	await waitFor(() => cdp.evaluate(`uiReview.joinedClicks.${name}.length>${before}`), 'trusted joined click');
	const proof = await cdp.evaluate(
		`({click:uiReview.joinedClicks.${name}.at(-1),clicks:uiReview.joinedClicks.${name}.length-${before},calls:uiReview.joined.${name}.${id}.calls,value:uiReview.joined.${name}.${id}.value,pointer:uiReview.docs.${name}.defaultView.matchMedia('(pointer:coarse)').matches?'coarse':'fine'})`,
	);
	assert.equal(proof.click.trusted, true);
	assert.equal(proof.click.group, id);
	assert.equal(proof.click.index, index);
	assert.equal(proof.clicks, 1);
	assert.deepEqual(proof.calls, [values[index]]);
	assert.equal(proof.value, values[index]);
	assert.equal(proof.pointer, current.pointer);
	return { kind, cssHit: hit, delivery: proof.click, callbacks: proof.calls };
}
async function joinedKeyboard(cdp, result, name, density, pointer, waitFor) {
	await cdp.evaluate(`uiReview.joined.${name}.typed.reset('')`);
	await waitTick(cdp);
	await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name};doc.querySelector('[data-joined="typed"]').scrollIntoView({block:'center'});doc.querySelector('[data-joined="typed"] [data-slot="toggle-group-item"]').focus();globalThis.joinedParentFocus=document.activeElement;})()`,
	);
	assert.equal(
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('[data-joined="typed"] [data-slot="toggle-group-item"]').getAttribute('aria-checked')`,
		),
		'true',
	);
	const expected = [];
	for (const [code, keyName, value, index] of [
		[39, 'ArrowRight', 1, 1],
		[39, 'ArrowRight', '1', 2],
		[39, 'ArrowRight', 'tail', 4],
		[36, 'Home', '', 0],
		[35, 'End', 'tail', 4],
		[37, 'ArrowLeft', '1', 2],
	]) {
		await key(cdp, keyName, code);
		expected.push(value);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.joined.${name}.typed.value===${JSON.stringify(value)}&&uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelectorAll('[data-joined="typed"] [data-slot="toggle-group-item"]')[${index}]`,
				),
			'typed joined keyboard selection',
		);
		const calls = await cdp.evaluate(`uiReview.joined.${name}.typed.calls`);
		assert.deepEqual(calls, expected);
		if (name === 'second')
			assert.equal(await cdp.evaluate('document.activeElement===globalThis.joinedParentFocus'), true);
	}
	assert.equal(
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelectorAll('[data-joined="typed"] [data-slot="toggle-group-item"]')[3].disabled`,
		),
		true,
	);
	result.joinedKeyboard.push({
		document: name,
		density,
		pointer,
		emptySelected: true,
		typedCallbacks: expected,
		disabledSkipped: true,
		parentFocusPreserved: name === 'second',
	});
}
async function joinedInteractions(cdp, result, waitFor) {
	result.joinedGeometry = [];
	result.joinedInterior = [];
	result.joinedKeyboard = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 320,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	for (const density of ['compact', 'comfortable'])
		for (const pointer of ['fine', 'coarse']) {
			await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: pointer === 'coarse' });
			await cdp.evaluate(
				configure({
					...result.cases.at(-1),
					language: 'zh',
					theme: 'paper',
					density,
					uiSize: '14',
					motion: 'system',
				}),
			);
			await waitTick(cdp);
			for (const name of ['main', 'second']) {
				await visibleFrame(cdp, name, true);
				await waitTick(cdp);
				for (const id of ['icons2', 'icons3', 'short2', 'short3', 'long', 'wrap84', 'wrap100']) {
					await cdp.evaluate(
						`uiReview.docs.${name}.querySelector('[data-joined="${id}"]').scrollIntoView({block:'center'})`,
					);
					await waitTick(cdp);
					const geometry = await joinedGeometry(cdp, name, id);
					assertJoinedGeometry(geometry, { id, density, pointer });
					result.joinedGeometry.push({ document: name, id, density, pointer, ...geometry });
					const offset = pointer === 'coarse' ? 21.5 : 15.5;
					for (let index = 0; index < geometry.items.length; index++)
						for (const [edge, dx, dy] of [
							['left', -offset, 0],
							['right', offset, 0],
							['top', 0, -offset],
							['bottom', 0, offset],
						]) {
							const item = geometry.items[index],
								point = {
									edge,
									dx,
									dy,
									x: item.x + item.width / 2 + dx,
									y: item.y + item.height / 2 + dy,
								};
							for (let focusIndex = 0; focusIndex < geometry.items.length; focusIndex++) {
								const actions = [];
								for (const kind of ['mouse', 'touch'])
									actions.push(
										await joinedAction(cdp, name, id, index, focusIndex, point, kind, waitFor),
									);
								result.joinedInterior.push({
									document: name,
									id,
									density,
									pointer,
									index,
									focusIndex,
									point,
									actions,
								});
							}
						}
				}
				await joinedKeyboard(cdp, result, name, density, pointer, waitFor);
				assert.equal(
					await cdp.evaluate(
						`uiReview.docs.${name}.documentElement.scrollWidth>uiReview.docs.${name}.documentElement.clientWidth+1`,
					),
					false,
				);
				await visibleFrame(cdp, name, false);
				console.log(`joined targets: ${density}/${pointer}/${name} passed`);
			}
		}
}

async function focusProof({cdp,sample,capture,observe=false}) {
 sample.visibleFocus=[];
 const frameStyle=await cdp.evaluate('document.querySelector("iframe").style.cssText');
 for(const name of ['main','second']) {
  await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},f=document.querySelector('iframe');f.style.cssText='position:fixed;left:${name==='second'?'0':'-2000px'};top:0;width:100%;height:1000px;z-index:9999';const box=d.createElement('section');box.dataset.review='native-boundaries';box.innerHTML='<button class="huhu-native">Native</button><div class="markdown-rendered"><button>Markdown</button></div><div class="cm-editor"><button>Editor</button></div><div role="dialog" tabindex="-1" data-review="dialog-focus-container" class="outline-none">Dialog</div><div role="dialog" tabindex="-1" data-review="sheet-focus-container" class="outline-none">Sheet</div>';d.querySelector('main').append(box);const outside=d.createElement('button');outside.dataset.review='outside-huhu';outside.textContent='Outside';d.body.append(outside)})()`);
  for(const [kind,selector,paint] of [
   ['unstyled-agent','[data-review="unstyled-agent"]'],['unstyled-button','[data-review="unstyled-button"]'],['author-none','[data-review="author-none"]'],['author-inset','[data-review="author-inset"]'],['author-ring','[data-review="author-ring"]'],['dialog-container','[data-review="dialog-focus-container"]'],['sheet-container','[data-review="sheet-focus-container"]'],
   ['button','[data-review="size-md"]'],['switch','[role="switch"]'],['checkbox','[data-review="mixed"]'],['tab','[role="tab"]'],['tree','[role="treeitem"][tabindex="0"]'],['scroll','[data-review="focus-specimens"] [data-slot="scroll-area-viewport"]'],['calendar-nav','[data-review="focus-specimens"] [data-slot="calendar"] button'],['calendar-day','[data-review="focus-specimens"] [data-slot="calendar"] [role="gridcell"] button','parent'],['date-trigger','[data-review="focus-specimens"] [data-slot="popover-trigger"]'],
   ['input','[data-review="tree-search"]'],['textarea','textarea'],['combobox','[data-review="select-trigger"]'],['date-input','[data-review="focus-specimens"] input'],
   ['native','.huhu-native'],['markdown','.markdown-rendered button'],['editor','.cm-editor button'],['outside','[data-review="outside-huhu"]']
  ]){
   const exists=await cdp.evaluate(`!!uiReview.docs.${name}.querySelector(${JSON.stringify(selector)})`);assert.equal(exists,true,kind);
   const tabEntry=['unstyled-agent','unstyled-button','author-none','author-inset','author-ring'].includes(kind);
   await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},n=d.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'center'});if(${tabEntry}){const before=d.createElement('button');before.dataset.review='focus-tab-start';before.textContent='Tab start';(n.closest('article')??n).before(before);before.focus();globalThis.defaultFocusKeys=[];for(const type of ['keydown','keyup'])d.addEventListener(type,e=>defaultFocusKeys.push({type:e.type,key:e.key,trusted:e.isTrusted,targetIsControl:e.target===n}),{once:true})}else n.focus()})()`);
   await key(cdp,tabEntry?'Tab':kind==='button'?'ArrowDown':'Shift',tabEntry?9:kind==='button'?40:16);
   if(tabEntry)await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="focus-tab-start"]').remove()`);
   const proof=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},n=d.querySelector(${JSON.stringify(selector)}),p=${paint==='parent'?'n.parentElement':'n'},s=d.defaultView.getComputedStyle(p),accent=d.createElement('span');accent.style.color='var(--hu-accent)';n.closest('.huhu-ui')?.append(accent);const expected=accent.isConnected?d.defaultView.getComputedStyle(accent).color:null;accent.style.color='var(--hu-accent-soft)';const expectedSoft=accent.isConnected?d.defaultView.getComputedStyle(accent).color:null;accent.remove();return{kind:'${kind}',document:'${name}',keys:${tabEntry}?(globalThis.defaultFocusKeys??[]):undefined,focus:n===d.activeElement,visible:n.matches(':focus-visible'),style:s.outlineStyle,width:s.outlineWidth,offset:s.outlineOffset,color:s.outlineColor,expected,expectedSoft,shadow:s.boxShadow,border:s.borderColor,variable:s.getPropertyValue('--tw-outline-style'),rect:p.getBoundingClientRect().toJSON(),media:{fine:d.defaultView.matchMedia('(pointer:fine)').matches,coarse:d.defaultView.matchMedia('(pointer:coarse)').matches,hover:d.defaultView.matchMedia('(hover:hover)').matches}}})()`);
   sample.visibleFocus.push(proof);
   if(observe)continue;
   assert.equal(proof.focus,true,JSON.stringify(proof));assert.equal(proof.visible,true,JSON.stringify(proof));
   if(tabEntry){assert.equal(proof.keys.length,2,JSON.stringify(proof));assert.ok(proof.keys.every(e=>e.trusted&&e.key==='Tab'),JSON.stringify(proof));assert.equal(proof.keys[1].targetIsControl,true,JSON.stringify(proof));}
   if(['input','textarea','combobox','date-input'].includes(kind)) {assert.equal(proof.style,'none',JSON.stringify(proof));assert.ok(proof.shadow.includes(proof.expectedSoft+' 0px 0px 0px 3px'),JSON.stringify(proof));assert.equal(proof.border,proof.expected,JSON.stringify(proof));}
   else if(['author-none','dialog-container','sheet-container'].includes(kind))assert.equal(proof.style,'none',JSON.stringify(proof));
   else if(kind==='author-ring'){assert.equal(proof.style,'none',JSON.stringify(proof));assert.ok(proof.shadow.includes(proof.expectedSoft+' 0px 0px 0px 3px'),JSON.stringify(proof));}
   else if(kind==='author-inset'){assert.equal(proof.style,'solid',JSON.stringify(proof));assert.equal(proof.width,'2px',JSON.stringify(proof));assert.equal(proof.offset,'-2px',JSON.stringify(proof));assert.equal(proof.color,proof.expected,JSON.stringify(proof));}
   else if(!['native','markdown','editor','outside'].includes(kind)){assert.equal(proof.style,'solid',JSON.stringify(proof));assert.equal(proof.width,'2px',JSON.stringify(proof));assert.equal(proof.offset,'2px',JSON.stringify(proof));assert.equal(proof.color,proof.expected,JSON.stringify(proof));}
  }
  const unfocused=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},n=d.querySelector('[data-review="size-md"]'),disabled=d.querySelector('[data-review="busy"]');return{button:d.defaultView.getComputedStyle(n).outlineStyle,disabled:d.defaultView.getComputedStyle(disabled).outlineStyle}})()`);sample.visibleFocus.push({document:name,kind:'unfocused',...unfocused});if(!observe)assert.deepEqual(unfocused,{button:'none',disabled:'none'});
  await cdp.evaluate(`(()=>{const d=uiReview.docs.${name};d.querySelector('[data-review="native-boundaries"]').remove();d.querySelector('[data-review="outside-huhu"]').remove()})()`);
 }
 await cdp.evaluate(`document.querySelector('iframe').style.cssText=${JSON.stringify(frameStyle)}`);
}

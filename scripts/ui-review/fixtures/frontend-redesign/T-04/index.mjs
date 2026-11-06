import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(
		Object.keys(modalTransforms).map((key) => [key, key === '@radix-ui/react-select/dist/index.mjs' ? 0 : 1]),
	),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview && Object.values(uiReview.docs).every(doc=>doc.querySelector("[data-content-overview]"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'body{padding:0}section[data-review=intro]{padding:16px;max-width:560px}';
const tick = (cdp) => cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
async function key(cdp, value, code, modifiers = 0) {
	for (const type of ['keyDown', 'keyUp'])
		await cdp.send('Input.dispatchKeyEvent', {
			type,
			key: value,
			code: value,
			windowsVirtualKeyCode: code,
			nativeVirtualKeyCode: code,
			modifiers,
			...(type === 'keyDown' && value === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
		});
}
async function show(cdp, name, width) {
	await cdp.evaluate(
		`(()=>{const frame=document.querySelector('iframe');frame.style.left=${JSON.stringify(name === 'second' ? '0' : '-2000px')};frame.style.top='0';frame.style.width=${width}+'px';frame.style.height=innerHeight+'px';frame.style.zIndex='100';uiReview.docs.${name}.defaultView.scrollTo(0,0)})()`,
	);
	await tick(cdp);
}
/** Observe only the dirty-confirmation click; never retain field values or text. */
export function createKeepEditingObservation(doc) {
 const records = [], ids = new WeakMap();
 let serial = 0, dropped = 0, stopped = false;
 const target = doc.querySelector('[data-review=keep-editing]');
 const describe = node => {
  if (!node) return null;
  if (!ids.has(node)) ids.set(node, ++serial);
  return { id: ids.get(node), tag: node.tagName, role: node.getAttribute?.('role'), slot: node.dataset?.slot, review: node.dataset?.review, connected: node.isConnected };
 };
 const snapshot = () => ({
  target: describe(target), active: describe(doc.activeElement),
  targetStillSelected: doc.querySelector('[data-review=keep-editing]') === target,
  alerts: [...doc.querySelectorAll('[role=alertdialog]')].map(node => ({ node: describe(node), state: node.dataset.state })),
 });
 const append = record => {
  if (stopped) return;
  if (records.length < 128) records.push({ time: doc.defaultView.performance.now(), ...record });
  else dropped++;
 };
 const controller = new doc.defaultView.AbortController();
 const observer = new doc.defaultView.MutationObserver(() => {
  const current = snapshot(), signature = JSON.stringify(current);
  if (signature !== last) { last = signature; append({ stage: 'alert-or-identity-change', ...current }); }
 });
 let last = JSON.stringify(snapshot());
 const stop = () => { stopped = true; controller.abort(); observer.disconnect(); };
 try {
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'focusin', 'focusout'])
   doc.addEventListener(type, event => append({ type, eventTarget: describe(event.target), sameTarget: event.target === target, preventedAtCapture: event.defaultPrevented, pointerType: event.pointerType, button: event.button, x: event.clientX, y: event.clientY, ...snapshot() }), { capture: true, signal: controller.signal });
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state', 'data-review'] });
  append({ stage: 'before-click', ...snapshot() });
 } catch (error) { stop(); throw error; }
 return {
  mark: (stage, point) => append({ stage, ...(point ? { point } : {}), ...snapshot() }),
  read: () => ({ records: [...records], dropped, current: snapshot() }),
  stop,
 };
}
async function click(cdp, name, selector) {
	const point = await cdp.evaluate(
		`(async()=>{const n=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing '+${JSON.stringify(selector)});n.scrollIntoView({block:'center'});n.getBoundingClientRect();const scope=n.closest('[role=dialog],[role=alertdialog],[role=menu]')??n;await Promise.allSettled(scope.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));let r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=n.ownerDocument.elementFromPoint(x,y);const deadline=performance.now()+10000;while(!n.contains(hit)&&n.isConnected&&performance.now()<deadline){await new Promise(resolve=>n.ownerDocument.defaultView.requestAnimationFrame(resolve));r=n.getBoundingClientRect();x=r.x+r.width/2;y=r.y+r.height/2;hit=n.ownerDocument.elementFromPoint(x,y)}const point={x,y,hit:n.contains(hit),actual:hit?{tag:hit.tagName,slot:hit.dataset.slot,role:hit.getAttribute('role'),text:hit.textContent?.slice(0,60)}:null,scope:{state:scope.dataset.state,pointer:n.ownerDocument.defaultView.getComputedStyle(scope).pointerEvents,z:n.ownerDocument.defaultView.getComputedStyle(scope).zIndex},active:globalThis.describeEscape?.(n.ownerDocument.activeElement)};globalThis.uiReviewKeepObservation?.mark('dispatch-point',{x,y,hit:point.hit,scope:point.scope});return point})()`,
	);
	assert.equal(point.hit, true, JSON.stringify({ name, selector, point }));
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
	await tick(cdp);
}
async function resize(cdp, name, width, waitFor) {
	await cdp.evaluate(`uiReview.resize(${JSON.stringify(name)},${width === null ? 'null' : width})`);
	await tick(cdp);
	const expected = width === null ? null : width < 600 ? 'narrow' : width < 960 ? 'medium' : 'wide';
	if (expected)
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('.huhu-shell').dataset.layout===${JSON.stringify(expected)}`,
				),
			`${name} layout${width}`,
		);
}
async function separatorPaint(cdp, name, sample, capture) {
	// Reserve a genuinely visible viewport for all four edges, including 2x zoom samples.
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1440,
		height: 1000,
		deviceScaleFactor: sample.zoom,
		mobile: sample.mobile,
	});
	await show(cdp, name, 1440);
	for (const reduced of [false, true]) {
		await cdp.send('Emulation.setEmulatedMedia', {
			features: [
				{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' },
				{ name: 'pointer', value: sample.pointer },
			],
		});
		await tick(cdp);
		const geometry = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},n=d.querySelector('[role=separator]'),r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect(),c=d.defaultView.getComputedStyle(n),canvas=d.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=c.outlineColor;ctx.fillRect(0,0,1,1);return{rect:r.toJSON(),parent:p.toJSON(),focused:d.activeElement===n,visible:n.matches(':focus-visible'),outline:c.outlineWidth,style:c.outlineStyle,offset:c.outlineOffset,color:[...ctx.getImageData(0,0,1,1).data].slice(0,3),width:innerWidth}})()`,
		);
		assert.equal(geometry.focused, true);
		assert.equal(geometry.visible, true);
		assert.equal(geometry.outline, '2px');
		assert.equal(geometry.style, 'solid');
		assert.equal(geometry.offset, '2px');
		assert.equal(geometry.rect.width, sample.pointer === 'coarse' ? 44 : 32);
		assert.ok(geometry.rect.y - 4 >= geometry.parent.y && geometry.rect.bottom + 4 <= geometry.parent.bottom);
		assert.ok(geometry.rect.x - 4 >= geometry.parent.x && geometry.rect.right + 4 <= geometry.parent.right);
		const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
		const pixels = await cdp.evaluate(
			`(async()=>{const image=new Image();image.src='data:image/png;base64,${shot.data}';await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const r=${JSON.stringify(geometry.rect)},scale=image.width/innerWidth;return [[r.x-3,r.y+r.height/2],[r.right+3,r.y+r.height/2],[r.x+r.width/2,r.y-3],[r.x+r.width/2,r.bottom+3]].map(([x,y])=>({x,y,color:[...ctx.getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data].slice(0,3)}))})()`,
		);
		for (const pixel of pixels)
			assert.ok(
				pixel.color.every((v, i) => Math.abs(v - geometry.color[i]) <= 1),
				JSON.stringify({ name, reduced, geometry, pixel }),
			);
		sample.actions.push({ stage: 'separator-four-painted-edges', name, reduced, geometry, pixels });
		await capture(`t04-separator-${name}-${sample.width}-${sample.pointer}-${reduced ? 'reduce' : 'normal'}`);
	}
	await cdp.send('Emulation.setEmulatedMedia', {
		features: [
			{ name: 'prefers-reduced-motion', value: sample.reducedMotion ? 'reduce' : 'no-preference' },
			{ name: 'pointer', value: sample.pointer },
		],
	});
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1440,
		height: 1000 / sample.zoom,
		deviceScaleFactor: sample.zoom,
		mobile: sample.mobile,
	});
	await show(cdp, name, 1440);
}
export async function verify({ cdp, sample, waitFor, capture }) {
	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		await cdp.evaluate(`uiReview.navigate(${JSON.stringify(name)},{feature:'dashboard'})`);
		await resize(cdp, name, null, waitFor);
		const geometry = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},shell=d.querySelector('.huhu-shell'),r=shell.getBoundingClientRect(),rail=d.querySelector('[data-shell-region=rail]'),header=d.querySelector('.huhu-shell-main>header');return{width:r.width,viewport:d.documentElement.clientWidth,inner:d.defaultView.innerWidth,layout:shell.dataset.layout,rail:rail?.getBoundingClientRect().width,header:header?.getBoundingClientRect().height,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,heading:d.querySelector('.huhu-shell-main h1')?.textContent,row:d.querySelector('[data-content-overview] button').getBoundingClientRect().height}})()`,
		);
		assert.ok(Math.abs(geometry.width - geometry.viewport) <= 1, JSON.stringify(geometry));
		assert.equal(geometry.inner, Math.round(sample.cssWidth));
		assert.equal(geometry.header, 52);
		assert.equal(geometry.overflow, false);
		assert.equal(geometry.row, sample.density === 'comfortable' ? 52 : 44);
		assert.equal(geometry.layout, geometry.width < 600 ? 'narrow' : geometry.width < 960 ? 'medium' : 'wide');
		if (geometry.width >= 600) assert.equal(geometry.rail, 52);
		const statusSelector =
			'.huhu-shell-main>header button[aria-label=' +
			JSON.stringify(sample.language === 'zh' ? '看板未保存' : 'Unsaved dashboard') +
			']';
		assert.equal(
			await cdp.evaluate(`!!uiReview.docs.${name}.querySelector(${JSON.stringify(statusSelector)})`),
			sample.mobile === true,
		);
		assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-shell>footer')`), false);
		if (sample.mobile) {
			await click(cdp, name, statusSelector);
			await waitFor(
				() => cdp.evaluate(`uiReview.leaves.${name}.surface.getState().route.feature==='content'`),
				`${name} mobile status navigation`,
			);
			await cdp.evaluate(`uiReview.navigate(${JSON.stringify(name)},{feature:'dashboard'})`);
			await tick(cdp);
		}

		// Bounded geometry probes get a real 1440 CSS-pixel browser viewport so
		// controls in a 1324px leaf remain physically reachable even in a 320px sample.
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 1440,
			height: 1000 / sample.zoom,
			deviceScaleFactor: sample.zoom,
			mobile: sample.mobile,
		});
		await show(cdp, name, 1440);

		// Actual owner-leaf thresholds; this does not change the browser's external viewport.
		for (const width of [599, 600, 959, 960]) await resize(cdp, name, width, waitFor);
		await resize(cdp, name, 1200, waitFor);
		const panel = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},s=d.querySelector('[role=separator]');return{width:s.parentElement.getBoundingClientRect().width,hit:s.getBoundingClientRect().width,rail:d.querySelector('[data-shell-region=rail] button').getBoundingClientRect().width}})()`,
		);
		const railPaint = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},button=d.querySelector('[data-shell-region=rail] [aria-current=page]'),reference=d.createElement('div');reference.style.cssText='position:absolute;width:0;height:0;pointer-events:none;background:var(--hu-raised);color:var(--hu-accent);box-shadow:var(--hu-shadow-card),0 0 0 1px var(--hu-line)';button.parentElement.append(reference);const style=d.defaultView.getComputedStyle(button),expected=d.defaultView.getComputedStyle(reference),marker=d.defaultView.getComputedStyle(button,'::after');const visible=value=>value.split(/,(?![^()]*\\))/).map(s=>s.trim()).filter(s=>!s.startsWith('rgba(0, 0, 0, 0)'));const result={width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height,radius:style.borderRadius,bg:style.backgroundColor,raised:expected.backgroundColor,color:style.color,accent:expected.color,shadow:visible(style.boxShadow),cardShadow:visible(expected.boxShadow),markerWidth:parseFloat(marker.width),markerColor:marker.backgroundColor};reference.remove();return result})()`,
		);
		assert.equal(railPaint.width, 36);
		assert.equal(railPaint.height, 36);
		assert.equal(railPaint.radius, '8px');
		assert.equal(railPaint.bg, railPaint.raised);
		assert.equal(railPaint.color, railPaint.accent);
		assert.deepEqual(railPaint.shadow, railPaint.cardShadow);
		assert.notEqual(railPaint.shadow.length, 0);
		assert.equal(railPaint.markerWidth, 3);
		assert.equal(railPaint.markerColor, railPaint.accent);
		sample.actions.push({ stage: 'approved-current-rail', name, computed: railPaint });
		if (sample.width === 320 || sample.pointer === 'coarse')
			await capture(`t04-rail-${name}-${sample.width}-${sample.language}-${sample.theme}-${sample.pointer}`);

		assert.equal(panel.width, 272);
		assert.equal(panel.hit, sample.pointer === 'coarse' ? 44 : 32);
		assert.equal(panel.rail, 36);
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-shell-region=rail] button').focus()`);
		for (const region of ['panel', 'page', 'rail']) {
			await key(cdp, 'F6', 117);
			assert.equal(
				await cdp.evaluate(
					`uiReview.docs.${name}.activeElement.closest('[data-shell-region]')?.dataset.shellRegion`,
				),
				region,
			);
		}
		const railHit = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},b=d.querySelector('[data-shell-region=rail] button'),r=b.getBoundingClientRect(),y=r.y+r.height/2,x=r.x+r.width/2;return[-21.5,21.5].map(delta=>b.contains(d.elementFromPoint(x,y+delta)))})()`,
		);
		if (sample.pointer === 'coarse') assert.deepEqual(railHit, [true, true]);

		if (sample.pointer === 'coarse') {
			for (const focused of [0, 1])
				for (const delta of [-21.5, 21.5])
					for (const pointer of ['mouse', 'touch']) {
						const p = await cdp.evaluate(
							`(()=>{const d=uiReview.docs.${name},buttons=d.querySelectorAll('[data-shell-region=rail] [data-rail-button]');buttons[${focused}].focus();const b=buttons[0],r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2+${delta},before:uiReview.leaves.${name}.surface.getState().navigation.open,hit:b.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2+${delta}))}})()`,
						);
						assert.equal(p.hit, true, JSON.stringify({ name, focused, delta, pointer, p }));
						if (pointer === 'mouse')
							for (const type of ['mousePressed', 'mouseReleased'])
								await cdp.send('Input.dispatchMouseEvent', {
									type,
									x: p.x,
									y: p.y,
									button: 'left',
									clickCount: 1,
								});
						else {
							await cdp.send('Input.dispatchTouchEvent', {
								type: 'touchStart',
								touchPoints: [{ x: p.x, y: p.y, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
							});
							await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
						}
						await waitFor(
							() =>
								cdp.evaluate(
									`uiReview.leaves.${name}.surface.getState().route.feature==='dashboard' && uiReview.leaves.${name}.surface.getState().navigation.open===${!p.before}`,
								),
							`${name} Rail44 ${focused}/${delta}/${pointer}`,
						);
					}
		}

		await cdp.evaluate(`(()=>{const d=uiReview.docs.${name};d.querySelector('[role=separator]').focus()})()`);
		await key(cdp, 'ArrowRight', 39);
		await waitFor(
			() => cdp.evaluate(`uiReview.leaves.${name}.surface.getState().navigation.width===280`),
			`${name} keyboard resize`,
		);
		await separatorPaint(cdp, name, sample, capture);
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('[role=separator]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`,
		);
		await waitFor(
			() => cdp.evaluate(`uiReview.leaves.${name}.surface.getState().navigation.width===272`),
			`${name} reset resize`,
		);
		const drag = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},r=d.querySelector('[role=separator]').getBoundingClientRect();return{x:r.x+r.width/2,y:Math.min(r.y+100,innerHeight-20),saves:uiReview.state.${name}.saves}})()`,
		);
		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mousePressed',
			x: drag.x,
			y: drag.y,
			button: 'left',
			clickCount: 1,
		});
		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mouseMoved',
			x: drag.x + 40,
			y: drag.y,
			button: 'left',
			buttons: 1,
		});
		await tick(cdp);
		assert.equal(await cdp.evaluate(`uiReview.leaves.${name}.surface.getState().navigation.width`), 272);
		assert.equal(await cdp.evaluate(`uiReview.state.${name}.saves`), drag.saves);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('.huhu-shell').style.getPropertyValue('--huhu-panel-width')`,
			),
			'312px',
		);
		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mouseReleased',
			x: drag.x + 40,
			y: drag.y,
			button: 'left',
			clickCount: 1,
		});
		await waitFor(
			() => cdp.evaluate(`uiReview.leaves.${name}.surface.getState().navigation.width===312`),
			`${name} drag commit`,
		);
		const reset = await cdp.evaluate(
			`(()=>{const r=uiReview.docs.${name}.querySelector('[role=separator]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+100}})()`,
		);
		for (const type of ['mousePressed', 'mouseReleased'])
			await cdp.send('Input.dispatchMouseEvent', { type, x: reset.x, y: reset.y, button: 'left', clickCount: 2 });
		await waitFor(
			() => cdp.evaluate(`uiReview.leaves.${name}.surface.getState().navigation.width===272`),
			`${name} trusted reset`,
		);

		await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name};globalThis.reviewList=d.querySelector('[data-content-overview]');globalThis.reviewPage=d.querySelector('[data-review=page-content]');reviewList.scrollTop=180;})()`,
		);
		await cdp.evaluate(`uiReview.navigate(${JSON.stringify(name)},{feature:'content'})`);
		await tick(cdp);
		assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=separator]')`), false);
		await resize(cdp, name, 500, waitFor);
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('.huhu-shell-main>header button').dataset.review='no-panel-toggle'`,
		);
		await click(cdp, name, '[data-review=no-panel-toggle]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} narrow module navigation`,
		);
		assert.deepEqual(
			await cdp.evaluate(
				`(()=>{const d=uiReview.docs.${name},sheet=d.querySelector('[role=dialog]');return{width:sheet.getBoundingClientRect().width,panel:!!sheet.querySelector('[data-shell-region=panel]'),rail:!!sheet.querySelector('[data-shell-region=rail]')}})()`,
			),
			{ width: 52, panel: false, rail: true },
		);
		await key(cdp, 'F6', 117);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.activeElement.closest('[data-shell-region]')?.dataset.shellRegion`,
			),
			'rail',
		);
		await tick(cdp);
		if (await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=tooltip]')`)) {
			await key(cdp, 'Escape', 27);
			await waitFor(
				() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=tooltip]')`),
				`${name} Rail tooltip Escape`,
			);
			assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`), true);
		}

		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} noPanel close`,
		);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review=no-panel-toggle]')`,
				),
			`${name} noPanel source focus`,
		);
		await resize(cdp, name, 1200, waitFor);

		await cdp.evaluate(`uiReview.navigate(${JSON.stringify(name)},{feature:'dashboard'})`);
		await tick(cdp);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-review=page-content]')===reviewPage && uiReview.docs.${name}.querySelector('[data-content-overview]')===reviewList && reviewList.scrollTop===180`,
			),
			true,
		);
		const rows = await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('[data-content-overview]').children.length`,
		);
		if (rows === 200) {
			assert.equal(
				await cdp.evaluate(
					`(()=>{const b=[...uiReview.docs.${name}.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(sample.language === 'zh' ? '继续加载' : 'Load more')});if(b)b.dataset.review='load-more';return!!b})()`,
				),
				true,
			);
			await click(cdp, name, '[data-review=load-more]');
			await waitFor(
				() =>
					cdp.evaluate(
						`uiReview.docs.${name}.querySelector('[data-content-overview]').children.length===201`,
					),
				`${name} pagination`,
			);
		}
		await cdp.evaluate(`uiReview.navigate(${JSON.stringify(name)},{feature:'settings'})`);
		await resize(cdp, name, 800, waitFor);
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('.huhu-shell-main>header button').dataset.review='nav-toggle'`,
		);
		await click(cdp, name, 'button[data-review=nav-toggle]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog] [data-review=custom-menu]')`),
			`${name} custom navigation Sheet`,
		);
		await click(cdp, name, '[data-review=custom-menu]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=menu]')`),
			`${name} independent menu`,
		);
		const layers = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name};return{menu:+d.defaultView.getComputedStyle(d.querySelector('[role=menu]')).zIndex,sheet:+d.defaultView.getComputedStyle(d.querySelector('[role=dialog]')).zIndex}})()`,
		);
		assert.ok(layers.menu > layers.sheet, JSON.stringify(layers));
		assert.deepEqual(layers, { menu: 41, sheet: 40 });
		const selectionsBefore = await cdp.evaluate(`uiReview.state.${name}.selections.length`);
		await click(cdp, name, '[role=menu] [role=menuitem]');
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[role=menu]') && uiReview.state.${name}.selections.length===${selectionsBefore + 1} && uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review=custom-menu]')`,
				),
			`${name} trusted same-owner item and exact source`,
		);
		sample.actions.push({ stage: 'same-owner-trusted-item', name, layers, callbackDelta: 1, exactSource: true });
		await click(cdp, name, '[data-review=custom-menu]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=menu]')`),
			`${name} reopened menu for Escape`,
		);

		await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name};globalThis.menuScopeFinished=false;globalThis.escapeTrace=[];globalThis.describeEscape=n=>n?{tag:n.tagName,role:n.getAttribute?.('role'),review:n.dataset?.review,slot:n.dataset?.slot,text:n.tagName==='BODY'?'':n.textContent?.slice(0,80),connected:n.isConnected,hiddenAncestor:n.closest?.('[aria-hidden=true]')?.tagName}:null;const menu=d.querySelector('[role=menu]');menu.addEventListener('focusScope.autoFocusOnUnmount',()=>{menuScopeFinished=true;escapeTrace.push({stage:'menuScopeUnmount',active:describeEscape(d.activeElement)})},{once:true});})()`,
		);

		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=menu]')`),
			`${name} inner Escape`,
		);
		try {
			await waitFor(
				() =>
					cdp.evaluate(
						`menuScopeFinished && uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review=custom-menu]')`,
					),
				`${name} actual menu close focus`,
			);
		} finally {
			sample.actions.push({
				stage: 'afterMenuClose',
				name,
				trace: await cdp.evaluate(
					`({scopeFinished:menuScopeFinished,events:escapeTrace,active:describeEscape(uiReview.docs.${name}.activeElement),source:describeEscape(uiReview.docs.${name}.querySelector('[data-review=custom-menu]')),sourceRestored:uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review=custom-menu]')})`,
				),
			});
		}

		assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`), true);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} outer Escape`,
		);

		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('[data-review=nav-toggle]')`,
				),
			`${name} exact outer Sheet source`,
		);
		await click(cdp, name, '[data-review=nav-toggle]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog] [data-shell-region=panel]')`),
			`${name} negative-control owner`,
		);
		await cdp.evaluate(`uiReview.layerPopup(${JSON.stringify(name)},false)`);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review=layer-menu]')`),
			`${name} ownerless actual popup`,
		);
		const ownerless = await cdp.evaluate(
			`(async()=>{const d=uiReview.docs.${name},menu=d.querySelector('[data-review=layer-menu]');await Promise.allSettled(menu.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));const item=menu.querySelector('[data-review=layer-item]'),r=item.getBoundingClientRect();return{menu:+d.defaultView.getComputedStyle(menu).zIndex,sheet:+d.defaultView.getComputedStyle(d.querySelector('[role=dialog]')).zIndex,itemHit:item.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`,
		);
		assert.deepEqual(ownerless, { menu: 31, sheet: 40, itemHit: false });
		sample.actions.push({ stage: 'ownerless-native-control', name, computed: ownerless });
		await cdp.evaluate(
			`uiReview.closeLayer(${JSON.stringify(name)},'popup');uiReview.layerPopup(${JSON.stringify(name)},true)`,
		);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review=layer-menu]')`),
			`${name} lower physical owner popup`,
		);
		await cdp.evaluate(`uiReview.layerUpper(${JSON.stringify(name)})`);
		await waitFor(
			() =>
				cdp.evaluate(
					`(()=>{const d=uiReview.docs.${name},upper=d.querySelector('[data-review=upper-owner-dialog]'),lower=d.querySelector('[data-review=layer-menu]');return!!upper&&!!lower&&upper.contains(d.activeElement)&&+d.defaultView.getComputedStyle(lower).zIndex===41&&+d.defaultView.getComputedStyle(upper).zIndex===50})()`,
				),
			`${name} later unrelated owner settled`,
		);
		const lower = await cdp.evaluate(
			`(async()=>{const d=uiReview.docs.${name},upper=d.querySelector('[data-review=upper-owner-dialog]'),menu=d.querySelector('[data-review=layer-menu]');await Promise.allSettled(upper.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));const item=menu.querySelector('[data-review=layer-item]'),r=item.getBoundingClientRect();return{menu:+d.defaultView.getComputedStyle(menu).zIndex,upper:+d.defaultView.getComputedStyle(upper).zIndex,itemHit:item.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`,
		);
		assert.deepEqual(lower, { menu: 41, upper: 50, itemHit: false });
		sample.actions.push({ stage: 'lower-owner-native-control', name, computed: lower });
		if (sample.width === 320 || sample.pointer === 'coarse')
			await capture(
				`t04-owner-layers-${name}-${sample.width}-${sample.language}-${sample.theme}-${sample.pointer}`,
			);
		await cdp.evaluate(
			`uiReview.closeLayer(${JSON.stringify(name)},'upper');uiReview.closeLayer(${JSON.stringify(name)},'popup');uiReview.leaves.${name}.surface.setVisible(false);uiReview.leaves.${name}.surface.setVisible(true)`,
		);
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[role=dialog],[role=menu]') && uiReview.docs.${name}.body.style.pointerEvents!=='none'`,
				),
			`${name} paired control cleanup`,
		);

		for (const motion of ['system', 'reduce']) {
			await cdp.send('Emulation.setEmulatedMedia', {
				features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
			});
			await cdp.evaluate(`uiReview.setMotion(${JSON.stringify(motion)})`);

			// DetailPane consumes the actual logical leaf independently from its actual main parent.
			await resize(cdp, name, 1324, waitFor);
			await click(cdp, name, '.huhu-workbench-page:not([hidden]) [data-review=detail-open]');
			await waitFor(
				() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot=detail-pane]')`),
				`${name} main1000 inline`,
			);
			await cdp.evaluate(
				`(()=>{const d=uiReview.docs.${name},field=d.querySelector('[data-review=draft]');globalThis.detailField=field;globalThis.detailHost=field.closest('[data-slot=detail-pane-scroll]');field.focus();field.setSelectionRange(1,4);detailHost.scrollTop=120})()`,
			);
			await cdp.send('Input.insertText', { text: 'unsaved' });
			await tick(cdp);
			const draft = await cdp.evaluate(
				`detailField.setSelectionRange(1,4);detailHost.scrollTop=40;detailField.value`,
			);
			await resize(cdp, name, 1323, waitFor);
			await waitFor(
				() =>
					cdp.evaluate(
						`!uiReview.docs.${name}.querySelector('[data-slot=detail-pane]') && !!uiReview.docs.${name}.querySelector('[role=dialog] [data-review=draft]')`,
					),
				`${name} main999 Sheet`,
			);
			assert.equal(
				await cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-review=draft]')===detailField && detailField.value===${JSON.stringify(draft)}`,
				),
				true,
			);
			for (const width of [620, 580]) {
				await resize(cdp, name, width, waitFor);
				const detail = await cdp.evaluate(
					`(async()=>{const d=uiReview.docs.${name},field=d.querySelector('[data-review=draft]'),sheet=field.closest('[role=dialog]');await Promise.allSettled(sheet.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));const r=sheet.getBoundingClientRect();return{leaf:d.querySelector('.huhu-shell').getBoundingClientRect().width,main:d.querySelector('.huhu-shell-main').getBoundingClientRect().width,width:r.width,cssWidth:parseFloat(d.defaultView.getComputedStyle(sheet).width),same:field===detailField,value:field.value,start:field.selectionStart,end:field.selectionEnd,scroll:detailHost.scrollTop}})()`,
				);
				assert.equal(detail.leaf, width);
				assert.equal(detail.main, width === 620 ? 568 : 580);
				const expectedWidth = width === 620 ? 360 : 580;
				assert.equal(detail.cssWidth, expectedWidth);
				assert.ok(Math.abs(detail.width - expectedWidth) < 0.01, JSON.stringify(detail));
				assert.equal(detail.same, true);
				assert.equal(detail.value, draft);
				assert.equal(detail.start, 1);
				assert.equal(detail.end, 4);
				assert.equal(detail.scroll, 40);
			}
			await key(cdp, 'Escape', 27);
			await waitFor(
				() =>
					cdp.evaluate(
						`(()=>{const d=uiReview.docs.${name},a=d.querySelector('[role=alertdialog][data-state=open]');return!!a&&a.contains(d.activeElement)})()`,
					),
				`${name} dirty confirmation`,
			);
			await cdp.evaluate(
				`(()=>{const d=uiReview.docs.${name};const b=[...d.querySelectorAll('[role=alertdialog] button')].find(b=>b.textContent===${JSON.stringify(sample.language === 'zh' ? '继续编辑' : 'Keep editing')});if(!b)throw Error('Missing Keep editing');b.dataset.review='keep-editing'})()`,
			);
			await cdp.evaluate(`globalThis.uiReviewKeepObservation=(${createKeepEditingObservation.toString()})(uiReview.docs.${name})`);
			let keepFailure;
			try {
				await click(cdp, name, '[data-review=keep-editing]');
				await cdp.evaluate(`uiReviewKeepObservation.mark('after-click')`);
				try {
					await waitFor(
						() =>
							cdp.evaluate(
								`!uiReview.docs.${name}.querySelector('[role=alertdialog]') && uiReview.docs.${name}.activeElement===detailField`,
							),
						`${name} Keep editing focus`,
					);
				} catch (error) {
					sample.actions.push({
						stage: 'keep-editing-failure',
						name,
						motion,
						trace: await cdp.evaluate(
							`(()=>{const d=uiReview.docs.${name};return{active:describeEscape(d.activeElement),source:describeEscape(detailField),connected:detailField.isConnected,sourceAncestors:[...function*(n){while(n){yield{tag:n.tagName,hidden:n.hidden,aria:n.getAttribute('aria-hidden'),dataAria:n.getAttribute('data-aria-hidden'),display:d.defaultView.getComputedStyle(n).display,visibility:d.defaultView.getComputedStyle(n).visibility};n=n.parentElement}}(detailField)],alerts:d.querySelectorAll('[role=alertdialog]').length}})()`,
						),
					});
					throw error;
				}
			} catch (error) {
				keepFailure = error;
				throw error;
			} finally {
				try {
					const trace = await cdp.evaluate(`(()=>{const observation=globalThis.uiReviewKeepObservation;if(!observation)return null;try{return observation.read()}finally{observation.stop();delete globalThis.uiReviewKeepObservation}})()`);
					sample.actions.push({ stage: 'keep-editing-observation', name, motion, trace });
				} catch (error) {
					sample.actions.push({ stage: 'keep-editing-observation-cleanup-error', name, motion, error: String(error) });
					if (!keepFailure) throw error;
				}
			}
			await key(cdp, 'Escape', 27);
			await waitFor(
				() =>
					cdp.evaluate(
						`(()=>{const d=uiReview.docs.${name},a=d.querySelector('[role=alertdialog][data-state=open]');return!!a&&a.contains(d.activeElement)})()`,
					),
				`${name} discard confirmation`,
			);
			await cdp.evaluate(
				`(()=>{const b=[...uiReview.docs.${name}.querySelectorAll('[role=alertdialog] button')].find(b=>b.textContent===${JSON.stringify(sample.language === 'zh' ? '放弃修改' : 'Discard changes')});if(!b)throw Error('Missing Discard');b.dataset.review='discard'})()`,
			);
			await click(cdp, name, '[data-review=discard]');
			await waitFor(
				() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog], [role=alertdialog]')`),
				`${name} actual Detail close`,
			);
			await waitFor(
				() =>
					cdp.evaluate(
						`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector('.huhu-workbench-page:not([hidden]) [data-review=detail-open]')`,
					),
				`${name} Detail source restored`,
			);
		}
		await cdp.send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: sample.reducedMotion ? 'reduce' : 'no-preference' }],
		});
		await cdp.evaluate(`uiReview.setMotion(${JSON.stringify(sample.motion ?? 'system')})`);

		await click(cdp, name, '.huhu-workbench-page:not([hidden]) [data-review=device-open]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog] [cmdk-input]')`),
			`${name} device chooser`,
		);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[role=dialog] [data-slot=dialog-title]').textContent`,
			),
			sample.language === 'zh'
				? '请选择当前设备，将恢复该设备的自动化与会话'
				: 'Choose this device only; its automations and sessions will be resumed',
		);
		await cdp.send('Input.insertText', { text: 'Review device' });
		await tick(cdp);
		await click(cdp, name, '[role=dialog] [role=option][data-value=review-device]');
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} device selected`,
		);
		assert.equal(await cdp.evaluate(`uiReview.state.${name}.devices.at(-1)`), 'review-device');
		await click(cdp, name, '.huhu-workbench-page:not([hidden]) [data-review=device-open]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=option][data-value=new-device]')`),
			`${name} newdevice option`,
		);
		await click(cdp, name, '[role=dialog] [role=option][data-value=new-device]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog] button[type=submit]')`),
			`${name} nameddevice form`,
		);
		assert.equal(
			await cdp.evaluate(`uiReview.docs.${name}.querySelector('[role=dialog] button[type=submit]').disabled`),
			true,
		);
		await cdp.send('Input.insertText', { text: ' New review ' });
		await key(cdp, 'Enter', 13);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} nameddevice selected`,
		);
		assert.deepEqual(await cdp.evaluate(`uiReview.state.${name}.devices.at(-1)`), { label: 'New review' });
		const cancelledBefore = await cdp.evaluate(`uiReview.state.${name}.deviceCancellations.length`);
		await click(cdp, name, '.huhu-workbench-page:not([hidden]) [data-review=device-open]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog] [cmdk-input]')`),
			`${name} cancellable chooser`,
		);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[role=dialog]') && uiReview.state.${name}.deviceCancellations.length===${cancelledBefore + 1}`,
				),
			`${name} explicit device cancellation`,
		);

		await resize(cdp, name, null, waitFor);
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: sample.cssWidth,
			height: 1000 / sample.zoom,
			deviceScaleFactor: sample.zoom,
			mobile: sample.mobile,
		});
		await show(cdp, name, sample.cssWidth);
		await tick(cdp);

		sample.assertions.push(
			`${name}: actual leaf/viewport,52/272/36 geometry,density,keyboard resize,preserved separate-root list,pagination,independent-root menu Escape`,
		);
	}
	// Move the existing native leaf DOM, as Obsidian does, rather than mounting a replacement root.
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1440,
		height: 1000 / sample.zoom,
		deviceScaleFactor: sample.zoom,
		mobile: sample.mobile,
	});
	await show(cdp, 'main', 1440);
	await resize(cdp, 'main', 1200, waitFor);

	await cdp.evaluate(
		`(()=>{const leaf=uiReview.leaves.main.element;globalThis.adoptedPage=leaf.querySelector('.huhu-workbench-page:not([hidden])');globalThis.adoptedList=adoptedPage.querySelector('[data-content-overview]');globalThis.adoptedMounts=uiReview.state.main.mounts})()`,
	);
	async function ownedWheel(stage, deltaY, atTop = false) {
		const point = await cdp.evaluate(
			`(()=>{globalThis.wheelController?.abort();globalThis.wheelController=new AbortController();globalThis.ownedWheelTrace={before:{top:adoptedList.scrollTop,max:adoptedList.scrollHeight-adoptedList.clientHeight,owner:adoptedList.ownerDocument.URL,connected:adoptedList.isConnected,visible:uiReview.leaves.main.surface.visible},events:[]};for(const type of ['wheel','scroll','scrollend'])adoptedList.addEventListener(type,event=>ownedWheelTrace.events.push({type,trusted:event.isTrusted,deltaY:event.deltaY,inside:adoptedList.contains(event.target),top:adoptedList.scrollTop}),{signal:wheelController.signal});const r=adoptedList.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,rect:r.toJSON(),hit:adoptedList.contains(adoptedList.ownerDocument.elementFromPoint(x,y)),...ownedWheelTrace.before}})()`,
		);
		assert.equal(point.hit, true, JSON.stringify(point));
		assert.equal(point.connected, true);
		assert.equal(point.visible, true);
		assert.ok(point.max >= 180, JSON.stringify(point));
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: point.x, y: point.y, deltaX: 0, deltaY });
		try {
			await waitFor(
				() =>
					cdp.evaluate(
						`ownedWheelTrace.events.some(e=>e.type==='wheel'&&e.trusted&&e.inside)&&ownedWheelTrace.events.some(e=>e.type==='scroll'&&e.trusted)&&ownedWheelTrace.events.some(e=>e.type==='scrollend'&&e.trusted)&&${atTop ? 'adoptedList.scrollTop===0' : 'adoptedList.scrollTop>ownedWheelTrace.before.top'}`,
					),
				stage,
			);
		} finally {
			sample.actions.push({
				stage,
				point,
				trace: await cdp.evaluate(
					'({...ownedWheelTrace,after:{top:adoptedList.scrollTop,max:adoptedList.scrollHeight-adoptedList.clientHeight}})',
				),
			});
			await cdp.evaluate('wheelController.abort()');
		}
	}
	const priorScroll = await cdp.evaluate('adoptedList.scrollTop');
	if (priorScroll > 0) await ownedWheel('actual owned negative wheel reset scrollend', -priorScroll, true);
	else sample.actions.push({ stage: 'owned-wheel-already-at-top', top: priorScroll });
	await ownedWheel('actual owned user wheel scrollend', 180);
	await cdp.evaluate("globalThis.adoptedScrollTrusted=ownedWheelTrace.events.some(e=>e.type==='scroll'&&e.trusted)");
	await cdp.evaluate(`globalThis.adoptedScroll=adoptedList.scrollTop`);
	await show(cdp, 'second', 1440);
	await cdp.evaluate(
		`(()=>{uiReview.leaves.second.surface.setVisible(false);uiReview.leaves.second.element.hidden=true;uiReview.adopt('main','second')})()`,
	);

	await waitFor(
		() =>
			cdp.evaluate(
				`uiReview.leaves.main.element.ownerDocument===uiReview.docs.second && uiReview.leaves.main.element.querySelector('.huhu-shell').dataset.layout==='wide'`,
			),
		'adopted leaf resize/migration',
	);
	const adoption = await cdp.evaluate(
		`({samePage:uiReview.leaves.main.element.querySelector('.huhu-workbench-page:not([hidden])')===adoptedPage,sameDoc:adoptedList.ownerDocument===uiReview.docs.second,scroll:adoptedList.scrollTop,expectedScroll:adoptedScroll,trustedScroll:adoptedScrollTrusted,trail:uiReview.adoptionTrail.at(-1),mounts:uiReview.state.main.mounts,expectedMounts:adoptedMounts})`,
	);
	sample.actions.push({ stage: 'adoption', observation: adoption });
	assert.deepEqual(adoption, {
		samePage: true,
		sameDoc: true,
		scroll: adoption.expectedScroll,
		expectedScroll: adoption.expectedScroll,
		trustedScroll: true,
		trail: adoption.trail,
		mounts: adoption.expectedMounts,
		expectedMounts: adoption.expectedMounts,
	});

	const migratedRail = await cdp.evaluate(
		`(()=>{const b=uiReview.leaves.main.element.querySelector('[data-rail-button]'),r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:b.contains(b.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`,
	);
	assert.equal(migratedRail.hit, true);
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', {
			type,
			x: migratedRail.x,
			y: migratedRail.y,
			button: 'right',
			clickCount: 1,
		});
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.second.querySelector('[role=menu]')`),
		'adopted actual rail menu',
	);
	assert.equal(await cdp.evaluate(`!!uiReview.docs.main.querySelector('[role=menu]')`), false);
	const opensBefore = await cdp.evaluate(`uiReview.state.main.opens.length`);
	await click(cdp, 'second', '[role=menu] [role=menuitem]');
	await waitFor(
		() => cdp.evaluate(`uiReview.state.main.opens.length===${opensBefore + 1}`),
		'adopted focus-open capability',
	);
	assert.deepEqual(
		await cdp.evaluate(
			`(()=>{const o=uiReview.state.main.opens.at(-1);return{owner:o.owner,feature:o.target.feature,placement:o.placement}})()`,
		),
		{ owner: true, feature: 'dashboard', placement: 'tab' },
	);
	await cdp.evaluate(
		`(()=>{uiReview.adopt('main','main');uiReview.resize('main',null);uiReview.leaves.second.element.hidden=false;uiReview.leaves.second.surface.setVisible(true)})()`,
	);
	await tick(cdp);
	assert.equal(
		await cdp.evaluate(
			`adoptedPage.ownerDocument===uiReview.docs.main && uiReview.state.main.mounts===adoptedMounts && adoptedList.scrollTop===adoptedScroll`,
		),
		true,
	);
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: sample.cssWidth,
		height: 1000 / sample.zoom,
		deviceScaleFactor: sample.zoom,
		mobile: sample.mobile,
	});
	await show(cdp, 'second', sample.cssWidth);

	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		await resize(cdp, name, Math.min(500, sample.cssWidth), waitFor);
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('.huhu-shell-main>header button').dataset.review='visibility-toggle'`,
		);
		await click(cdp, name, '[data-review=visibility-toggle]');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} pre-hide modal`,
		);
		await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},sheet=d.querySelector('[role=dialog]');globalThis.hiddenScopeFinished=false;sheet.addEventListener('focusScope.autoFocusOnUnmount',()=>{globalThis.hiddenScopeFinished=true},{once:true});globalThis.destination=d.createElement('input');destination.dataset.review='destination';destination.style.cssText='position:fixed;bottom:4px;left:4px;width:160px;height:44px;z-index:999';d.body.append(destination);uiReview.leaves.${name}.surface.setVisible(false)})()`,
		);
		await waitFor(
			() => cdp.evaluate(`hiddenScopeFinished && !uiReview.docs.${name}.querySelector('[role=dialog]')`),
			`${name} actual hidden-scope cleanup`,
		);
		await click(cdp, name, '[data-review=destination]');
		const afterClick = await cdp.evaluate(
			`({focused:uiReview.docs.${name}.activeElement===destination,active:describeEscape(uiReview.docs.${name}.activeElement),docFocused:uiReview.docs.${name}.hasFocus(),parentActive:describeEscape(document.activeElement)})`,
		);
		await cdp.send('Input.insertText', { text: 'kept focus' });
		const beforeVisible = await cdp.evaluate(
			`({focused:uiReview.docs.${name}.activeElement===destination,value:destination.value,active:describeEscape(uiReview.docs.${name}.activeElement),docFocused:uiReview.docs.${name}.hasFocus()})`,
		);
		await cdp.evaluate(`uiReview.leaves.${name}.surface.setVisible(true)`);
		await tick(cdp);
		const afterVisible = await cdp.evaluate(
			`({focused:uiReview.docs.${name}.activeElement===destination,value:destination.value,active:describeEscape(uiReview.docs.${name}.activeElement),docFocused:uiReview.docs.${name}.hasFocus()})`,
		);
		sample.actions.push({ stage: 'visibility', name, afterClick, beforeVisible, afterVisible });
		assert.equal(afterVisible.focused, true);
		assert.equal(afterVisible.value, 'kept focus');

		await cdp.evaluate(`destination.remove()`);
		await resize(cdp, name, null, waitFor);
		assert.deepEqual(await cdp.evaluate(`uiReview.state.${name}.errors`), []);
	}

	sample.actions.push(
		'Trusted mouse and keyboard in both documents; sample viewport measured first, bounded leaf threshold probes run in an actual1440px viewport, sample viewport then restored.',
	);
	if (sample.width === 960)
		sample.actions.push(await capture(`t04-shell-${sample.language}-${sample.density}-${sample.zoom}x`));
}

/** All interactions above run per matrix case; this final boundary proves actual native owners release their roots. */
export async function exercise({ cdp, result, waitFor, capture }) {
	const sample = result.cases.at(-1);
	await cdp.evaluate(`uiReview.closeAllLayers()`);
	result.interactions = [];
	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		result.interactions.push({ document: name, screenshot: await capture(`t04-final-${name}`) });
		await cdp.evaluate(
			`(async()=>{const leaf=uiReview.leaves.${name};await leaf.surface.dispose();leaf.intro.dispose();leaf.intro.element.remove();leaf.element.remove()})()`,
		);
		await waitFor(
			() =>
				cdp.evaluate(
					`(()=>{const d=uiReview.docs.${name};return!d.querySelector('.huhu-portal-root,[role=dialog],[role=alertdialog],[role=menu]')&&d.body.style.pointerEvents!=='none'&&!d.body.hasAttribute('data-scroll-locked')})()`,
				),
			`${name} root and lock disposal`,
		);
		const cleanup = await cdp.evaluate(
			`({mounts:uiReview.state.${name}.mounts,unmounts:uiReview.state.${name}.unmounts,aborted:[...uiReview.leaves.${name}.pages.values()].every(page=>page.controller.signal.aborted),errors:uiReview.state.${name}.errors,layerRoots:uiReview.layerCounts.${name}})`,
		);
		assert.equal(cleanup.unmounts, cleanup.mounts);
		assert.equal(cleanup.aborted, true);
		assert.deepEqual(cleanup.errors, []);
		assert.equal(cleanup.layerRoots.mounted, cleanup.layerRoots.unmounted);
		result.interactions.push({ document: name, cleanup });
	}
}

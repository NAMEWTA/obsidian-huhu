import assert from 'node:assert/strict';
export const adapterCounts = {
	sonner: {
		'sonner/dist/index.mjs': 1,
	},
	radix: {
		'@radix-ui/react-roving-focus/dist/index.mjs': 0,
		'@radix-ui/react-menu/dist/index.mjs': 0,
		'@radix-ui/react-select/dist/index.mjs': 0,
		'@radix-ui/react-focus-scope/dist/index.mjs': 1,
		'@radix-ui/react-focus-guards/dist/index.mjs': 1,
		'@radix-ui/react-dismissable-layer/dist/index.mjs': 1,
		'react-remove-scroll/dist/es2015/SideEffect.js': 1,
		'react-remove-scroll/dist/es2015/handleScroll.js': 1,
		'react-remove-scroll-bar/dist/es2015/component.js': 1,
		'react-remove-scroll-bar/dist/es2015/utils.js': 1,
		'react-style-singleton/dist/es2015/hook.js': 1,
		'react-style-singleton/dist/es2015/singleton.js': 1,
	},
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview && Object.values(uiReview.docs).every(doc=>doc.querySelector("[data-review=calendar] [data-day] button"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS =
	'body{padding:0}main{box-sizing:border-box;width:100%;padding:4px;background:var(--hu-surface);color:var(--hu-fg)}.date-probes{display:flex;min-width:0;flex-direction:column;gap:12px}.date-probes>section{min-width:0;max-width:600px}';
const tick = (cdp) => cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
async function visible(cdp, name) {
	await cdp.evaluate(
		`(()=>{const frame=document.querySelector('iframe');frame.style.left=${JSON.stringify(name === 'second' ? '0' : '-2000px')};frame.style.top='0';frame.style.height=innerHeight+'px';frame.style.zIndex='100';uiReview.docs.${name}.defaultView.scrollTo(0,0)})()`,
	);
	await tick(cdp);
}
async function key(cdp, keyName, code) {
	for (const type of ['keyDown', 'keyUp'])
		await cdp.send('Input.dispatchKeyEvent', {
			type,
			key: keyName,
			code: keyName,
			windowsVirtualKeyCode: code,
			nativeVirtualKeyCode: code,
			...(type === 'keyDown' && keyName === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
		});
}
async function click(cdp, name, selector) {
	await tick(cdp);
	const p = await cdp.evaluate(
		`(()=>{const n=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing '+${JSON.stringify(selector)});n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:n.contains(n.ownerDocument.elementFromPoint(x,y)),parentHit:document.elementFromPoint(x,y)?.tagName,rect:r.toJSON()}})()`,
	);
	assert.equal(p.hit, true, JSON.stringify({ name, selector, ...p }));
	await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
	await tick(cdp);
}
async function text(cdp, name, selector, value, index = 0) {
	await cdp.evaluate(
		`(()=>{const n=uiReview.docs.${name}.querySelectorAll(${JSON.stringify(selector)})[${index}];n.focus();n.select()})()`,
	);
	await cdp.send('Input.insertText', { text: value });
	await tick(cdp);
}
async function geometry(cdp, name) {
	return cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name},root=doc.querySelector('[data-review=calendar] [data-slot=calendar] >div'),table=root.querySelector('table');const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return{frame:rect(root),grid:rect(table),days:[...root.querySelectorAll('[data-day] button')].map(n=>({...rect(n),date:n.parentElement.getAttribute('data-day')})),firstWeekday:root.querySelector('th').textContent,lang:root.lang,pointer:doc.defaultView.matchMedia('(pointer:coarse)').matches?'coarse':'fine',overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth+1}})()`,
	);
}
function assertGeometry(proof, sample) {
	const coarse = sample.pointer === 'coarse',
		size = coarse ? 44 : 34;
	assert.equal(proof.pointer, coarse ? 'coarse' : 'fine');
	assert.equal(proof.frame.width, coarse ? 312 : 280);
	assert.equal(proof.grid.width, size * 7);
	assert.equal(proof.lang, sample.language === 'zh' ? 'zh-CN' : 'en-US');
	assert.equal(proof.firstWeekday, sample.language === 'zh' ? '六' : 'Sa');
	assert.equal(proof.overflow, false);
	for (const day of proof.days) {
		assert.equal(day.width, size);
		assert.equal(day.height, size);
	}
	for (let a = 0; a < proof.days.length; a++)
		for (let b = a + 1; b < proof.days.length; b++) {
			const x = proof.days[a],
				y = proof.days[b];
			assert.ok(
				Math.max(0, Math.min(x.x + x.width, y.x + y.width) - Math.max(x.x, y.x)) *
					Math.max(0, Math.min(x.y + x.height, y.y + y.height) - Math.max(x.y, y.y)) <
					0.001,
			);
		}
}
export async function verify({ cdp, sample }) {
	for (const name of ['main', 'second']) {
		const proof = await geometry(cdp, name);
		assertGeometry(proof, sample);
		sample.assertions.push({ document: name, calendar: proof });
	}
	await visible(cdp, 'main');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];
	for (const pointer of ['fine', 'coarse']) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 320,
			height: 1000,
			deviceScaleFactor: 1,
			mobile: false,
		});
		await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: pointer === 'coarse' });
		await cdp.evaluate(
			configure({
				width: 320,
				cssWidth: 320,
				language: 'en',
				theme: 'paper',
				accent: 'teal',
				source: 'huhu',
				density: 'compact',
				uiSize: '14',
			}),
		);
		await tick(cdp);
		for (const name of ['main', 'second']) {
			await visible(cdp, name);
			const proof = await geometry(cdp, name);
			assertGeometry(proof, { pointer, language: 'en' });
			const doc = `uiReview.docs.${name}`,
				api = `uiReview.api.${name}`,
				state = `uiReview.state.${name}`;
			await cdp.evaluate(
				`${api}.calendar('2026-11-20');${api}.date('2026-11-20');${api}.dateTime({date:'2026-11-20',time:'09:30',timeZone:'Asia/Shanghai'})`,
			);
			await tick(cdp);
			await cdp.evaluate(
				`${doc}.querySelector('[data-review=calendar] [data-day="2026-11-20"] button').focus();globalThis.parentFocus=document.activeElement;void 0`,
			);
			await key(cdp, 'ArrowRight', 39);
			await waitFor(
				() => cdp.evaluate(`${doc}.activeElement?.parentElement.getAttribute('data-day')==='2026-11-21'`),
				'DayPicker keyboard owner document',
			);
			if (name === 'second') assert.equal(await cdp.evaluate('document.activeElement===parentFocus'), true);
			const focusPaint = await cdp.evaluate(
				`(()=>{const b=${doc}.activeElement,p=${doc}.defaultView.getComputedStyle(b.parentElement);return{width:p.outlineWidth,offset:p.outlineOffset,style:p.outlineStyle,clip:${doc}.defaultView.getComputedStyle(b).clipPath}})()`,
			);
			assert.deepEqual(focusPaint, { width: '2px', offset: '2px', style: 'solid', clip: 'inset(0px)' });
			focusPaint.screenshot = await capture(`date-focus-${name}-${pointer}`);
			await key(cdp, 'Enter', 13);
			await waitFor(() => cdp.evaluate(`${state}.calendar==='2026-11-21'`), 'DayPicker keyboard selection');
			await cdp.evaluate(`${api}.calendar('2026-11-20')`);
			await tick(cdp);
			const day = proof.days.find((day) => day.date === '2026-11-21');
			assert.ok(day);
			const point = {
				x: day.x + day.width / 2 + (pointer === 'coarse' ? 21.5 : 15.5),
				y: day.y + day.height / 2,
			};
			assert.equal(
				await cdp.evaluate(
					`${doc}.elementFromPoint(${point.x},${point.y})?.closest('[data-day]')?.getAttribute('data-day')`,
				),
				'2026-11-21',
			);
			if (pointer === 'coarse') {
				await cdp.send('Input.dispatchTouchEvent', {
					type: 'touchStart',
					touchPoints: [{ ...point, radiusX: 1, radiusY: 1, id: 1, force: 1 }],
				});
				await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
			} else {
				await cdp.send('Input.dispatchMouseEvent', {
					type: 'mousePressed',
					...point,
					button: 'left',
					clickCount: 1,
				});
				await cdp.send('Input.dispatchMouseEvent', {
					type: 'mouseReleased',
					...point,
					button: 'left',
					clickCount: 1,
				});
			}
			await waitFor(() => cdp.evaluate(`${state}.calendar==='2026-11-21'`), 'trusted calendar target');
			assert.equal(await cdp.evaluate(`${state}.trusted.at(-1).trusted`), true);
			const interior = [];
			for (const focusDate of ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-28'])
				for (const [edge, dx, dy] of [
					['left', -1, 0],
					['right', 1, 0],
					['top', 0, -1],
					['bottom', 0, 1],
				])
					for (const kind of pointer === 'coarse' ? ['mouse', 'touch'] : ['mouse']) {
						await cdp.evaluate(`${api}.calendar('2026-11-20')`);
						await tick(cdp);
						await cdp.evaluate(
							`${doc}.querySelector('[data-review=calendar] [data-day="${focusDate}"] button').focus()`,
						);
						await tick(cdp);
						const current = (await geometry(cdp, name)).days.find((day) => day.date === '2026-11-21');
						const offset = pointer === 'coarse' ? 21.5 : 15.5,
							p = {
								x: current.x + current.width / 2 + dx * offset,
								y: current.y + current.height / 2 + dy * offset,
							};
						assert.equal(
							await cdp.evaluate(
								`${doc}.elementFromPoint(${p.x},${p.y})?.closest('[data-day]')?.getAttribute('data-day')`,
							),
							'2026-11-21',
							`${pointer}/${focusDate}/${edge}`,
						);
						const before = await cdp.evaluate(`${state}.calls.filter(c=>c.kind==='calendar').length`),
							clicks = await cdp.evaluate(`${state}.trusted.length`);
						if (kind === 'touch') {
							await cdp.send('Input.dispatchTouchEvent', {
								type: 'touchStart',
								touchPoints: [{ ...p, radiusX: 1, radiusY: 1, id: 1, force: 1 }],
							});
							await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
						} else {
							await cdp.send('Input.dispatchMouseEvent', {
								type: 'mousePressed',
								...p,
								button: 'left',
								clickCount: 1,
							});
							await cdp.send('Input.dispatchMouseEvent', {
								type: 'mouseReleased',
								...p,
								button: 'left',
								clickCount: 1,
							});
						}
						await waitFor(
							() => cdp.evaluate(`${state}.calendar==='2026-11-21'`),
							'calendar independent interior',
						);
						assert.equal(
							await cdp.evaluate(`${state}.calls.filter(c=>c.kind==='calendar').length-${before}`),
							1,
						);
						assert.equal(await cdp.evaluate(`${state}.trusted.length-${clicks}`), 1);
						assert.equal(await cdp.evaluate(`${state}.trusted.at(-1).trusted`), true);
						interior.push({ focusDate, edge, kind, ...p });
					}

			await text(cdp, name, '[data-review=date] input', '2026-02-31');
			await key(cdp, 'Enter', 13);
			assert.equal(await cdp.evaluate(`${doc}.querySelector('[data-review=date] input').value`), '2026-02-31');
			assert.equal(await cdp.evaluate(`${state}.date`), '2026-11-20');
			assert.equal(
				await cdp.evaluate(`${doc}.querySelector('[data-review=date] input').getAttribute('aria-invalid')`),
				'true',
			);
			await text(cdp, name, '[data-review=date] input', '2026-11-22');
			await key(cdp, 'Enter', 13);
			await waitFor(() => cdp.evaluate(`${state}.date==='2026-11-22'`), 'valid typed commit');
			await click(cdp, name, '[data-review=date] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content] [data-slot=calendar]')`),
				'calendar portal',
			);
			const popup = await cdp.evaluate(
				`(()=>{const n=${doc}.querySelector('[data-slot=popover-content]'),r=n.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,owner:n.ownerDocument===${doc}}})()`,
			);
			assert.equal(popup.owner, true);
			assert.ok(popup.x >= 4 - 0.01 && popup.right <= 316 + 0.01);
			await key(cdp, 'Escape', 27);
			await waitFor(
				() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`),
				'calendar escape',
			);
			await tick(cdp);
			assert.equal(
				await cdp.evaluate(
					`${doc}.activeElement===${doc}.querySelector('[data-review=date] [data-slot=popover-trigger]')`,
				),
				true,
			);
			await cdp.evaluate(`${api}.range({from:'2026-11-10',to:'2026-11-20'})`);
			await tick(cdp);
			await click(cdp, name, '[data-review=range] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content] input')`),
				'range draft',
			);
			const rangeLayout = await cdp.evaluate(
				`(()=>{const n=${doc}.querySelector('[data-slot=popover-content]'),r=n.getBoundingClientRect(),inputs=[...n.querySelectorAll('input')].map(n=>n.getBoundingClientRect().toJSON());return{x:r.x,right:r.right,inputs}})()`,
			);
			assert.ok(rangeLayout.x >= 3.99 && rangeLayout.right <= 316.01);
			assert.ok(rangeLayout.inputs[1].y > rangeLayout.inputs[0].y);
			await text(cdp, name, '[data-slot=popover-content] input', '2026-11-01', 1);
			assert.equal(
				await cdp.evaluate(
					`${doc}.querySelector('[data-slot=date-scroll-viewport]>div:last-child button:last-child').disabled`,
				),
				true,
			);
			assert.deepEqual(await cdp.evaluate(`${state}.range`), { from: '2026-11-10', to: '2026-11-20' });
			await click(cdp, name, '[data-slot=date-scroll-viewport]>div:last-child button:first-child');
			await waitFor(() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`), 'range cancel');
			await click(cdp, name, '[data-review=range] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content] input')`),
				'range reopen',
			);
			await click(cdp, name, '[data-slot=date-scroll-viewport]>div:first-child button:nth-child(2)');
			assert.deepEqual(
				await cdp.evaluate(`[...${doc}.querySelectorAll('[data-slot=popover-content] input')].map(n=>n.value)`),
				['2026-11-05', '2026-11-11'],
			);
			await click(cdp, name, '[data-slot=date-scroll-viewport]>div:last-child button:last-child');
			await waitFor(() => cdp.evaluate(`${state}.range.to==='2026-11-11'`), 'range preset apply');
			await text(cdp, name, '[data-review=datetime] input', '24:00', 1);
			await key(cdp, 'Enter', 13);
			assert.equal(await cdp.evaluate(`${state}.dateTime.time`), '09:30');
			await text(cdp, name, '[data-review=datetime] input', '10:00', 1);
			await key(cdp, 'Enter', 13);
			await waitFor(() => cdp.evaluate(`${state}.dateTime.time==='10:00'`), 'structured DateTime');
			assert.equal(await cdp.evaluate(`${state}.dateTime.timeZone`), 'Asia/Shanghai');
			await click(cdp, name, '[data-review=datetime] [data-slot=button]');
			await waitFor(() => cdp.evaluate(`${state}.dateTime===null`), 'DateTime clear');

			await click(cdp, name, '[data-review=dialog-trigger]');
			await waitFor(() => cdp.evaluate(`!!${doc}.querySelector('[data-review=dialog]')`), 'dialog open');
			await tick(cdp);
			await click(cdp, name, '[data-review=dialog] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content]')`),
				'nested calendar',
			);
			await key(cdp, 'Escape', 27);
			await waitFor(() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`), 'nested escape');
			await tick(cdp);
			assert.equal(await cdp.evaluate(`!!${doc}.querySelector('[data-review=dialog]')`), true);
			assert.equal(
				await cdp.evaluate(
					`${doc}.activeElement===${doc}.querySelector('[data-review=dialog] [data-slot=popover-trigger]')`,
				),
				true,
			);
			await key(cdp, 'Escape', 27);
			await waitFor(() => cdp.evaluate(`!${doc}.querySelector('[data-review=dialog]')`), 'dialog escape');
			await tick(cdp);
			result.interactions.push({
				name,
				pointer,
				geometry: proof,
				trustedDaySelection: true,
				interior,
				focusPaint,
				rangeLayout,
				rangeDraftAndPreset: true,
				structuredDateTimeAndClear: true,
				invalidDraft: true,
				ownerPortal: popup,
				exactEscapeRestore: true,
				nestedEscapeIsolation: true,
			});
		}
	}
	await exercisePopupComposition({ cdp, result, waitFor, capture });
	await exerciseTimeZones({ cdp, result, waitFor });
	await exerciseLifecycle({ cdp, result, waitFor });
	await visible(cdp, 'main');
	await capture('date-interactions');
}

export async function exerciseLifecycle({ cdp, result, waitFor }) {
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.evaluate('uiReview.mountLifecycle()');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.main.querySelector('[data-review=lifecycle] input')`),
		'date lifecycle mount',
	);
	await visible(cdp, 'main');
	await cdp.evaluate(
		`(()=>{const input=uiReview.docs.main.querySelector('[data-review=lifecycle] input');input.focus();input.select()})()`,
	);
	await cdp.send('Input.imeSetComposition', { text: '2026-11-23', selectionStart: 10, selectionEnd: 10 });
	await key(cdp, 'Enter', 13);
	assert.deepEqual(await cdp.evaluate('uiReview.lifecycleCommits'), []);
	await cdp.send('Input.insertText', { text: '2026-11-23' });
	await key(cdp, 'Enter', 13);
	await waitFor(() => cdp.evaluate(`uiReview.lifecycleCommits.at(-1)==='2026-11-23'`), 'completed IME date commit');
	await click(cdp, 'main', '[data-review=lifecycle] [data-slot=popover-trigger]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.main.querySelector('[data-slot=popover-content]')`),
		'pre-adoption calendar',
	);
	await cdp.evaluate('uiReview.adoptLifecycle()');
	await waitFor(
		() =>
			cdp.evaluate(
				`!!uiReview.docs.second.querySelector('[data-slot=popover-content]')&&!uiReview.docs.main.querySelector('[data-slot=popover-content]')`,
			),
		'adopted date portal',
	);
	await visible(cdp, 'second');
	await key(cdp, 'Escape', 27);
	await waitFor(
		() => cdp.evaluate(`!uiReview.docs.second.querySelector('[data-slot=popover-content]')`),
		'adopted escape',
	);
	await tick(cdp);
	assert.equal(
		await cdp.evaluate(
			`uiReview.docs.second.activeElement===uiReview.docs.second.querySelector('[data-review=lifecycle] [data-slot=popover-trigger]')`,
		),
		true,
	);
	await click(cdp, 'second', '[data-review=lifecycle] [data-slot=popover-trigger]');
	await waitFor(
		() => cdp.evaluate(`!!uiReview.docs.second.querySelector('[data-slot=popover-content]')`),
		'before date unmount',
	);
	await cdp.evaluate('uiReview.unmountLifecycle()');
	await tick(cdp);
	for (const name of ['main', 'second'])
		assert.equal(
			await cdp.evaluate(
				`!!uiReview.docs.${name}.querySelector('[data-slot=popover-content],[data-radix-focus-guard],[data-review=lifecycle]')`,
			),
			false,
		);
	result.lifecycle = {
		realIMEGuard: true,
		completedCompositionCommit: true,
		adoptedOwnerPortal: true,
		exactAdoptedRestore: true,
		openUnmountCleanup: true,
	};
}

export async function exerciseTimeZones({ cdp, result, waitFor }) {
	result.calendarHostZones = [];
	await visible(cdp, 'main');
	for (const timezoneId of ['Pacific/Kiritimati', 'America/Adak']) {
		await cdp.send('Emulation.setTimezoneOverride', { timezoneId });
		await cdp.evaluate(`uiReview.api.main.calendar('2026-11-20')`);
		await tick(cdp);
		await click(cdp, 'main', '[data-review=calendar] [data-day="2026-11-22"] button');
		await waitFor(
			() => cdp.evaluate(`uiReview.state.main.calendar==='2026-11-22'`),
			'calendar date in changed host zone',
		);
		result.calendarHostZones.push({
			timezoneId,
			displayed: await cdp.evaluate(`Intl.DateTimeFormat().resolvedOptions().timeZone`),
			selected: await cdp.evaluate('uiReview.state.main.calendar'),
		});
	}
	await cdp.send('Emulation.setTimezoneOverride', { timezoneId: '' });
}

/** Exercise the real portaled/scrolling composition; standalone Calendar proofs do not cover ancestor clipping. */
export async function exercisePopupComposition({ cdp, result, waitFor, capture }) {
	result.popupComposition = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 320,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
	for (const density of ['compact', 'comfortable']) {
		await cdp.evaluate(
			configure({
				width: 320,
				cssWidth: 320,
				language: 'en',
				theme: 'paper',
				accent: 'teal',
				source: 'huhu',
				density,
				uiSize: '14',
				motion: 'reduce',
			}),
		);
		await tick(cdp);
		for (const name of ['main', 'second']) {
			await visible(cdp, name);
			const doc = `uiReview.docs.${name}`,
				api = `uiReview.api.${name}`,
				state = `uiReview.state.${name}`;
			await cdp.evaluate(
				`${api}.date('2026-11-20');${api}.range({from:'2026-11-10',to:'2026-11-20'});${api}.dateTime({date:'2026-11-20',time:'09:30',timeZone:'Asia/Shanghai'})`,
			);
			await tick(cdp);
			const inputLayout = await cdp.evaluate(
				`(()=>{const root=${doc}.querySelector('[data-review=date]'),input=root.querySelector('input'),trigger=root.querySelector('[data-slot=popover-trigger]'),rect=n=>n.getBoundingClientRect().toJSON();return{input:rect(input),trigger:rect(trigger),icon:rect(trigger.querySelector('svg'))}})()`,
			);
			assert.ok(inputLayout.icon.x > inputLayout.input.x && inputLayout.icon.right < inputLayout.input.x + 44);
			assert.ok(inputLayout.trigger.x < inputLayout.input.x + 44);
			await click(cdp, name, '[data-review=date] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content]')`),
				'date popup composition',
			);
			await settlePopup(cdp, name);
			const today = await cdp.evaluate(
				`(()=>{const n=${doc}.querySelector('[data-slot=popover-content] [data-today] button'),p=${doc}.defaultView.getComputedStyle(n),dot=${doc}.defaultView.getComputedStyle(n,'::after');return{color:p.color,decoration:p.textDecorationLine,dot:{content:dot.content,width:dot.width,height:dot.height,bottom:dot.bottom,color:dot.backgroundColor}}})()`,
			);
			assert.equal(today.decoration, 'none');
			assert.deepEqual(
				{ width: today.dot.width, height: today.dot.height, bottom: today.dot.bottom },
				{ width: '4px', height: '4px', bottom: '5px' },
			);
			assert.notEqual(today.dot.content, 'none');
			const dateFocus = [];
			for (const day of ['2026-11-14', '2026-11-20']) {
				dateFocus.push(await focusPopupDay(cdp, name, day));
				await capture(`date-popup-focus-${name}-${density}-${day.slice(-2)}`);
			}
			const footer = await cdp.evaluate(
				`(()=>{const f=${doc}.querySelector('[data-slot=date-footer]');return [...f.querySelectorAll('button')].map(n=>({text:n.textContent,color:${doc}.defaultView.getComputedStyle(n).color}))})()`,
			);
			assert.deepEqual(
				footer.map((b) => b.text),
				['Today', 'Clear date'],
			);
			assert.ok(footer.every((button) => button.color === today.color));
			await click(cdp, name, '[data-slot=date-footer] button:first-child');
			await waitFor(() => cdp.evaluate(`${state}.date==='2026-11-05'`), 'today footer commit');
			await click(cdp, name, '[data-review=date] [data-slot=popover-trigger]');
			await waitFor(() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=date-footer]')`), 'clear footer open');
			await click(cdp, name, '[data-slot=date-footer] button:last-child');
			await waitFor(() => cdp.evaluate(`${state}.date===null`), 'clear footer commit');
			await click(cdp, name, '[data-review=datetime] [data-slot=popover-trigger]');
			await waitFor(() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=date-footer]')`), 'DateTime footer');
			assert.equal(await cdp.evaluate(`${doc}.querySelectorAll('[data-slot=date-footer] button').length`), 1);
			assert.equal(
				await cdp.evaluate(`${doc}.querySelectorAll('[data-review=datetime] [data-slot=button]').length`),
				1,
			);
			await key(cdp, 'Escape', 27);
			await waitFor(
				() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`),
				'DateTime footer close',
			);
			await click(cdp, name, '[data-review=range] [data-slot=popover-trigger]');
			await waitFor(
				() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=date-scroll-viewport]')`),
				'range scroll composition',
			);
			await settlePopup(cdp, name);
			const viewport = await cdp.evaluate(
				`(()=>{const pop=${doc}.querySelector('[data-slot=popover-content]'),s=pop.querySelector('[data-slot=date-scroll-viewport]'),c=s.querySelector('[data-slot=calendar]>div'),g=c.querySelector('table');return{popup:pop.getBoundingClientRect().toJSON(),scroll:s.getBoundingClientRect().toJSON(),clientWidth:s.clientWidth,scrollWidth:s.scrollWidth,clientHeight:s.clientHeight,scrollHeight:s.scrollHeight,calendar:c.getBoundingClientRect().toJSON(),grid:g.getBoundingClientRect().toJSON(),scrollbar:${doc}.defaultView.getComputedStyle(s).scrollbarWidth}})()`,
			);
			assert.equal(viewport.popup.width, 312);
			assert.equal(viewport.calendar.width, 312);
			assert.equal(viewport.grid.width, 308);
			assert.equal(viewport.scrollWidth, viewport.clientWidth);
			assert.equal(viewport.scrollbar, 'none');
			assert.ok(viewport.scrollHeight > viewport.clientHeight, 'range must truly scroll');
			assert.ok(viewport.scroll.x >= 0 && viewport.scroll.right <= 320);
			const continuations = await cdp.evaluate(
				`(()=>{const p=${doc}.querySelector('[data-slot=popover-content]'),c=p.querySelector('[data-slot=calendar]>div'),bound=c.getBoundingClientRect(),buttons=[...p.querySelectorAll('button')],area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return [...c.querySelectorAll('td:last-child>button')].map(n=>{const r=n.getBoundingClientRect(),before=${doc}.defaultView.getComputedStyle(n,'::before'),hit={left:r.right,top:r.top,right:r.right+parseFloat(before.width),bottom:r.bottom};return{day:n.parentElement.getAttribute('data-day'),width:r.width,height:r.height,clip:${doc}.defaultView.getComputedStyle(n).clipPath,before:{width:before.width,height:before.height,right:before.right},owned:hit.left>=bound.left&&hit.right<=bound.right&&hit.top>=bound.top&&hit.bottom<=bound.bottom,overlap:buttons.filter(other=>other!==n).map(other=>area(hit,other.getBoundingClientRect())).reduce((a,b)=>a+b,0)}})})()`,
			);
			for (const c of continuations) {
				assert.equal(c.width, 44);
				assert.equal(c.height, 44);
				assert.deepEqual(c.before, { width: '2px', height: '44px', right: '-2px' });
				assert.equal(c.clip, 'inset(0px -2px 0px 0px)');
				assert.equal(c.owned, true);
				assert.equal(c.overlap, 0);
			}

			await cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop=0`);
			await tick(cdp);
			const scrollPoint = await cdp.evaluate(
				`(()=>{const r=${doc}.querySelector('[data-slot=date-scroll-viewport]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
			);
			await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...scrollPoint, deltaX: 0, deltaY: 140 });
			await waitFor(
				() => cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop>0`),
				'native Range wheel scroll',
			);
			const wheelTop = await cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop`);
			await cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop=0`);
			await tick(cdp);
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchStart',
				touchPoints: [{ ...scrollPoint, radiusX: 1, radiusY: 1, id: 1, force: 1 }],
			});
			for (let step = 1; step <= 4; step++) {
				await cdp.send('Input.dispatchTouchEvent', {
					type: 'touchMove',
					touchPoints: [
						{ x: scrollPoint.x, y: scrollPoint.y - step * 25, radiusX: 1, radiusY: 1, id: 1, force: 1 },
					],
				});
				await tick(cdp);
			}
			await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
			await waitFor(
				() => cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop>0`),
				'native Range touch scroll',
			);
			await cdp.evaluate(
				`new Promise(resolve=>{const s=${doc}.querySelector('[data-slot=date-scroll-viewport]');let previous=-1,stable=0,frames=0;function poll(){const current=s.scrollTop;if(current===previous)stable++;else stable=0;previous=current;if(stable>=3||frames++>60)resolve();else ${doc}.defaultView.requestAnimationFrame(poll)}poll()})`,
			);
			const touchTop = await cdp.evaluate(`${doc}.querySelector('[data-slot=date-scroll-viewport]').scrollTop`);

			const rangeFocus = [];
			for (const day of ['2026-11-14', '2026-11-20']) {
				rangeFocus.push(await focusPopupDay(cdp, name, day));
				await capture(`range-popup-focus-${name}-${density}-${day.slice(-2)}`);
			}
			const week = [
					'2026-11-14',
					'2026-11-15',
					'2026-11-16',
					'2026-11-17',
					'2026-11-18',
					'2026-11-19',
					'2026-11-20',
				],
				points = [];
			for (let i = 0; i < week.length; i++)
				for (const focusDay of [week[(i + 6) % 7], week[(i + 1) % 7]])
					for (const [edge, dx, dy] of [
						['left', -21.5, 0],
						['right', 21.5, 0],
						['top', 0, -21.5],
						['bottom', 0, 21.5],
					])
						for (const kind of ['mouse', 'touch']) {
							await cdp.evaluate(
								`(()=>{const p=${doc}.querySelector('[data-slot=popover-content]'),s=p.querySelector('[data-slot=date-scroll-viewport]'),n=p.querySelector('[data-day="${focusDay}"] button');n.focus();const t=p.querySelector('[data-day="${week[i]}"] button');t.scrollIntoView({block:'center',inline:'nearest'})})()`,
							);
							await key(cdp, 'ArrowRight', 39);
							await cdp.evaluate(
								`${doc}.querySelector('[data-slot=popover-content] [data-day="${focusDay}"] button').focus()`,
							);
							await tick(cdp);
							const point = await cdp.evaluate(
								`(()=>{const p=${doc}.querySelector('[data-slot=popover-content]'),s=p.querySelector('[data-slot=date-scroll-viewport]'),n=p.querySelector('[data-day="${week[i]}"] button'),r=n.getBoundingClientRect(),v=s.getBoundingClientRect(),x=r.x+r.width/2+${dx},y=r.y+r.height/2+${dy};return{x,y,width:r.width,height:r.height,focused:${doc}.activeElement?.parentElement.getAttribute('data-day'),keyboardFocus:${doc}.activeElement?.matches(':focus-visible'),hit:${doc}.elementFromPoint(x,y)?.closest('[data-day]')?.getAttribute('data-day'),scrollLeft:s.scrollLeft,inside:x>v.left&&x<v.right&&y>v.top&&y<v.bottom,before:${state}.trusted.length}})()`,
							);
							assert.equal(point.focused, focusDay);
							assert.equal(point.keyboardFocus, true);
							assert.equal(point.width, 44);
							assert.equal(point.height, 44);
							assert.equal(point.hit, week[i], `${density}/${name}/${week[i]}/${focusDay}/${edge}`);
							assert.equal(point.scrollLeft, 0);
							assert.equal(point.inside, true);
							result.popupAttempt = {
								name,
								density,
								day: week[i],
								focusDay,
								edge,
								kind,
								point,
								completed: points.length,
							};
							if (kind === 'touch') {
								await cdp.send('Input.dispatchTouchEvent', {
									type: 'touchStart',
									touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, id: 1, force: 1 }],
								});
								await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
							} else {
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
							}
							await waitFor(
								() => cdp.evaluate(`${state}.trusted.length>${point.before}`),
								'range interior trusted delivery',
							);
							assert.deepEqual(
								await cdp.evaluate(
									`({delta:${state}.trusted.length-${point.before},day:${state}.trusted.at(-1).day,trusted:${state}.trusted.at(-1).trusted})`,
								),
								{ delta: 1, day: week[i], trusted: true },
							);
							points.push({ day: week[i], focusDay, edge, kind, ...point });
						}
			const keyboard = [];
			await cdp.evaluate(
				`${doc}.querySelector('[data-slot=popover-content] [data-day="2026-11-14"] button').focus()`,
			);
			for (let i = 0; i < 12 && !keyboard.includes('Apply'); i++) {
				await key(cdp, 'Tab', 9);
				await tick(cdp);
				const a = await cdp.evaluate(
					`(()=>{const n=${doc}.activeElement,r=n.getBoundingClientRect(),s=${doc}.querySelector('[data-slot=date-scroll-viewport]').getBoundingClientRect();return{text:n.textContent,inside:r.top>=s.top&&r.bottom<=s.bottom}})()`,
				);
				if (a.text === 'Cancel' || a.text === 'Apply') {
					assert.equal(a.inside, true);
					keyboard.push(a.text);
				}
			}
			assert.deepEqual(keyboard, ['Cancel', 'Apply']);
			await key(cdp, 'Escape', 27);
			await waitFor(
				() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`),
				'range matrix cancel',
			);
			const outerBottom = [];
			for (const day of [
				'2026-11-28',
				'2026-11-29',
				'2026-11-30',
				'2026-12-01',
				'2026-12-02',
				'2026-12-03',
				'2026-12-04',
			])
				for (const kind of ['mouse', 'touch']) {
					await click(cdp, name, '[data-review=range] [data-slot=popover-trigger]');
					await waitFor(
						() => cdp.evaluate(`!!${doc}.querySelector('[data-slot=popover-content]')`),
						'outer bottom open',
					);
					await settlePopup(cdp, name);
					await cdp.evaluate(
						`(()=>{const n=${doc}.querySelector('[data-slot=popover-content] [data-day="${day}"] button');n.focus();n.scrollIntoView({block:'center',inline:'nearest'})})()`,
					);
					await tick(cdp);
					const p = await cdp.evaluate(
						`(()=>{const n=${doc}.querySelector('[data-slot=popover-content] [data-day="${day}"] button'),r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2+21.5;return{x,y,day:${doc}.elementFromPoint(x,y)?.closest('[data-day]')?.getAttribute('data-day'),before:${state}.trusted.length}})()`,
					);
					assert.equal(p.day, day);
					if (kind === 'touch') {
						await cdp.send('Input.dispatchTouchEvent', {
							type: 'touchStart',
							touchPoints: [{ x: p.x, y: p.y, radiusX: 1, radiusY: 1, id: 1, force: 1 }],
						});
						await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
					} else {
						for (const type of ['mousePressed', 'mouseReleased'])
							await cdp.send('Input.dispatchMouseEvent', {
								type,
								x: p.x,
								y: p.y,
								button: 'left',
								clickCount: 1,
							});
					}
					await waitFor(
						() => cdp.evaluate(`${state}.trusted.length>${p.before}`),
						'outer bottom trusted point',
					);
					assert.deepEqual(
						await cdp.evaluate(
							`({delta:${state}.trusted.length-${p.before},day:${state}.trusted.at(-1).day,trusted:${state}.trusted.at(-1).trusted})`,
						),
						{ delta: 1, day, trusted: true },
					);
					outerBottom.push({ day, kind, ...p });
					await key(cdp, 'Escape', 27);
					await waitFor(
						() => cdp.evaluate(`!${doc}.querySelector('[data-slot=popover-content]')`),
						'outer bottom close',
					);
				}

			result.popupComposition.push({
				name,
				density,
				inputLayout,
				today,
				dateFocus,
				footer,
				viewport,
				continuations,
				wheelTop,
				touchTop,
				rangeFocus,
				points,
				outerBottom,
				keyboard,
			});
			console.log(`actual date popups ${name}/${density}: ${points.length} trusted interior points passed`);
		}
	}
	await visible(cdp, 'main');
}
async function settlePopup(cdp, name) {
	await cdp.evaluate(`Promise.all(${`uiReview.docs.${name}`}.getAnimations().map(a=>a.finished.catch(()=>{})))`);
	await tick(cdp);
}
async function focusPopupDay(cdp, name, day) {
	const doc = `uiReview.docs.${name}`;
	await cdp.evaluate(`${doc}.querySelector('[data-slot=popover-content] [data-day="${day}"] button').focus()`);
	await key(cdp, 'ArrowRight', 39);
	await cdp.evaluate(`${doc}.querySelector('[data-slot=popover-content] [data-day="${day}"] button').focus()`);
	await tick(cdp);
	const proof = await cdp.evaluate(
		`(()=>{const b=${doc}.activeElement,td=b.parentElement,p=${doc}.defaultView.getComputedStyle(td),r=td.getBoundingClientRect(),paint={left:r.left-4,right:r.right+4,top:r.top-4,bottom:r.bottom+4},clips=[];for(let n=td.parentElement;n;n=n.parentElement){const s=${doc}.defaultView.getComputedStyle(n);if(s.overflowX!=='visible'||s.overflowY!=='visible'){const a=n.getBoundingClientRect();clips.push({slot:n.dataset.slot,x:s.overflowX,y:s.overflowY,rect:a.toJSON(),fitsX:paint.left>=a.left&&paint.right<=a.right,fitsY:paint.top>=a.top&&paint.bottom<=a.bottom})}}return{day:td.getAttribute('data-day'),visible:b.matches(':focus-visible'),outline:p.outlineWidth,offset:p.outlineOffset,style:p.outlineStyle,color:p.outlineColor,paint,clips}})()`,
	);
	assert.equal(proof.visible, true);
	assert.equal(proof.outline, '2px');
	assert.equal(proof.offset, '2px');
	assert.equal(proof.style, 'solid');
	for (const clip of proof.clips) {
		if (clip.x !== 'visible') assert.equal(clip.fitsX, true);
		if (clip.y !== 'visible') assert.equal(clip.fitsY, true);
	}
	const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
	proof.paintPixels = await cdp.evaluate(
		`new Promise((resolve,reject)=>{const image=new Image();image.onerror=()=>reject(new Error('Focus screenshot decode failed'));image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const color=document.createElement('canvas');color.width=color.height=1;const cc=color.getContext('2d');cc.fillStyle=${JSON.stringify(proof.color)};cc.fillRect(0,0,1,1);const rgb=cc.getImageData(0,0,1,1).data,a=${JSON.stringify(proof.paint)},left=Math.round(a.left),right=Math.round(a.right),top=Math.round(a.top),bottom=Math.round(a.bottom),boxes={left:[left,top+6,2,bottom-top-12],right:[right-2,top+6,2,bottom-top-12],top:[left+6,top,right-left-12,2],bottom:[left+6,bottom-2,right-left-12,2]},result={};for(const [side,box]of Object.entries(boxes)){const data=ctx.getImageData(...box).data;let actual=0;for(let i=0;i<data.length;i+=4)if(data[i]===rgb[0]&&data[i+1]===rgb[1]&&data[i+2]===rgb[2])actual++;result[side]={actual,expected:box[2]*box[3]}}resolve(result)};image.src='data:image/png;base64,'+${JSON.stringify(shot.data)}})`,
	);
	for (const side of Object.values(proof.paintPixels))
		assert.equal(side.actual, side.expected, 'Full standard focus outline must actually paint on all four sides');

	return proof;
}

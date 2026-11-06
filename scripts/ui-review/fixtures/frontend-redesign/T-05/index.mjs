import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview&&Object.values(uiReview.docs).every(d=>d.querySelector("[data-task-domain] [data-task-id]"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html{scrollbar-width:none}body{padding:0}main.huhu-ui{width:100%;min-width:0}';
const tick = (cdp) => cdp.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
async function show(cdp, name, width) {
	await cdp.evaluate(
		`(()=>{const frame=document.querySelector('iframe');frame.style.cssText='position:fixed;top:0;height:100vh;border:0;z-index:100;left:${name === 'second' ? '0' : '-3000px'};width:${width}px';})()`,
	);
	await tick(cdp);
}
async function key(cdp, key, code, modifiers = 0) {
	for (const type of ['keyDown', 'keyUp'])
		await cdp.send('Input.dispatchKeyEvent', {
			type,
			key,
			code: key,
			windowsVirtualKeyCode: code,
			nativeVirtualKeyCode: code,
			modifiers,
			...(type === 'keyDown' && key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
		});
}
async function click(cdp, name, selector) {
	const point = await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},e=d.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`,
	);
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
	await tick(cdp);
}
async function datePoints(cdp, name, iso, scope) {
	const doc = `uiReview.docs.${name}`;
	const original = await cdp.evaluate(
			`(()=>{const b=${doc}.querySelector(${JSON.stringify(scope + ' button[data-date="' + iso + '"]')}),r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`,
		),
		proof = [];
	for (const focus of ['self', 'next'])
		for (const input of ['mouse', 'touch'])
			for (const [dx, dy] of [
				[0, 0],
				[-21.5, 0],
				[21.5, 0],
				[0, -21.5],
				[0, 21.5],
			]) {
				if (focus === 'next') await key(cdp, 'ArrowRight', 39);
				const point = { x: original.x + dx, y: original.y + dy };
				assert.equal(
					await cdp.evaluate(
						`${doc}.elementFromPoint(${point.x},${point.y})?.closest('button[data-date]')?.dataset.date`,
					),
					iso,
					`${name} ${focus} ${input} ${dx},${dy}`,
				);
				const before = await cdp.evaluate('uiReview.events.length');
				if (input === 'mouse')
					for (const type of ['mousePressed', 'mouseReleased'])
						await cdp.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
				else {
					await cdp.send('Input.dispatchTouchEvent', {
						type: 'touchStart',
						touchPoints: [{ ...point, radiusX: 1, radiusY: 1 }],
					});
					await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
				}
				await tick(cdp);
				const events = await cdp.evaluate(
					`uiReview.events.slice(${before}).filter(event=>event.name===${JSON.stringify(name)}&&'date'in event)`,
				);
				assert.equal(events.length, 1, JSON.stringify({ name, focus, input, dx, dy, events }));
				assert.equal(events[0].date, iso);
				proof.push({ focus, input, dx, dy, date: events[0].date });
			}
	return proof;
}
async function periodAction(cdp, name) {
	await click(cdp, name, '[data-review="product-month"] button[aria-label="Weekly · Day and note actions"]');
	const point = await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},e=[...d.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent==='Open note');if(!e)throw Error('Missing actual periodic action');const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`,
	);
	const before = await cdp.evaluate('uiReview.events.length');
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
	await tick(cdp);
	const events = await cdp.evaluate(
		`uiReview.events.slice(${before}).filter(event=>event.name===${JSON.stringify(name)}&&event.period==='week')`,
	);
	assert.equal(events.length, 1);
	assert.equal(events[0].action, 'open');
	return events[0];
}
async function taskActionTargets(cdp, name, waitFor, capture) {
	const doc = `uiReview.docs.${name}`,
		prefix = '[data-review="home-real-agenda"] [data-task-row] ';
	const selectors = {
		remind: prefix + 'button[aria-label="Set reminder"]',
		more: prefix + 'button[aria-label="More actions"]',
	};
	const geometry = await cdp.evaluate(
		`(()=>{const d=${doc};return ${JSON.stringify(selectors)}&&Object.fromEntries(Object.entries(${JSON.stringify(selectors)}).map(([key,selector])=>{const b=d.querySelector(selector);if(!b)throw Error('Missing actual TaskRow action '+key);b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),p=d.defaultView.getComputedStyle(b,'::before'),w=parseFloat(p.width),h=parseFloat(p.height),x=r.left+r.width/2,y=r.top+r.height/2;return[key,{x,y,width:r.width,height:r.height,hitWidth:w,hitHeight:h,left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2,owner:b.ownerDocument===d}]}))})()`,
	);
	const a = geometry.remind,
		b = geometry.more,
		overlap =
			Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
			Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
	assert.ok(a.hitWidth >= 44 && a.hitHeight >= 44 && b.hitWidth >= 44 && b.hitHeight >= 44, JSON.stringify(geometry));
	assert.equal(overlap, 0, JSON.stringify({ name, geometry, overlap }));
	await capture(`t05-${name}-two-action-targets-320`);
	await click(cdp, name, selectors.remind);
	await waitFor(
		() => cdp.evaluate(`!!${doc}.querySelector('[role="dialog"] [data-task-editor]')`),
		'real reminder editor',
	);
	await key(cdp, 'Escape', 27);
	await waitFor(
		() => cdp.evaluate(`!${doc}.querySelector('[role="dialog"] [data-task-editor]')`),
		'editor dismissed',
	);
	await waitFor(
		() => cdp.evaluate(`${doc}.activeElement===${doc}.querySelector(${JSON.stringify(selectors.remind)})`),
		'reminder source focus restored',
	);
	const proof = [];
	for (const target of ['remind', 'more'])
		for (const focus of ['self', 'neighbor'])
			for (const input of ['mouse', 'touch'])
				for (const [dx, dy] of [
					[0, 0],
					[-21.5, 0],
					[21.5, 0],
					[0, -21.5],
					[0, 21.5],
				]) {
					const wanted = focus === 'self' ? target : target === 'remind' ? 'more' : 'remind';
					if (
						!(await cdp.evaluate(
							`${doc}.activeElement===${doc}.querySelector(${JSON.stringify(selectors[wanted])})`,
						))
					)
						await key(cdp, 'Tab', 9, wanted === 'remind' ? 8 : 0);
					assert.equal(
						await cdp.evaluate(
							`${doc}.activeElement===${doc}.querySelector(${JSON.stringify(selectors[wanted])})`,
						),
						true,
						JSON.stringify({
							name,
							target,
							focus,
							input,
							dx,
							dy,
							wanted,
							active: await cdp.evaluate(
								`({html:${doc}.activeElement?.outerHTML,tabIndex:${doc}.activeElement?.tabIndex})`,
							),
						}),
					);
					const point = { x: geometry[target].x + dx, y: geometry[target].y + dy };
					assert.equal(
						await cdp.evaluate(
							`${doc}.elementFromPoint(${point.x},${point.y})?.closest('button')===${doc}.querySelector(${JSON.stringify(selectors[target])})`,
						),
						true,
						JSON.stringify({ name, target, focus, input, dx, dy }),
					);
					const before = await cdp.evaluate('uiReview.events.length');
					if (input === 'mouse')
						for (const type of ['mousePressed', 'mouseReleased'])
							await cdp.send('Input.dispatchMouseEvent', {
								type,
								button: 'left',
								clickCount: 1,
								...point,
							});
					else {
						await cdp.send('Input.dispatchTouchEvent', {
							type: 'touchStart',
							touchPoints: [{ ...point, radiusX: 1, radiusY: 1 }],
						});
						await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
					}
					await tick(cdp);
					if (target === 'remind') {
						await waitFor(
							() => cdp.evaluate(`!!${doc}.querySelector('[role="dialog"] [data-task-editor]')`),
							'reminder target opens actual editor',
						);
						const events = await cdp.evaluate(
							`uiReview.events.slice(${before}).filter(e=>e.name===${JSON.stringify(name)}&&('remind'in e||'source'in e))`,
						);
						assert.equal(events.length, 1);
						assert.equal(events[0].remind, 'task:today');
						assert.equal(await cdp.evaluate(`${doc}.activeElement?.ownerDocument===${doc}`), true);
						await key(cdp, 'Escape', 27);
						await waitFor(
							() => cdp.evaluate(`!${doc}.querySelector('[role="dialog"] [data-task-editor]')`),
							'editor target cleanup',
						);
					} else {
						await waitFor(
							() => cdp.evaluate(`${doc}.querySelectorAll('[role="menu"]').length===1`),
							'exactly one menu',
						);
						const source = await cdp.evaluate(
							`(()=>{const e=[...${doc}.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent==='Open source');if(!e)throw Error('Missing actual source action');const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`,
						);
						for (const type of ['mousePressed', 'mouseReleased'])
							await cdp.send('Input.dispatchMouseEvent', {
								type,
								button: 'left',
								clickCount: 1,
								...source,
							});
						await tick(cdp);
						const events = await cdp.evaluate(
							`uiReview.events.slice(${before}).filter(e=>e.name===${JSON.stringify(name)}&&('remind'in e||'source'in e))`,
						);
						assert.equal(events.length, 1);
						assert.equal(events[0].source, 'task:today');
						await waitFor(() => cdp.evaluate(`!${doc}.querySelector('[role="menu"]')`), 'menu cleanup');
					}
					await waitFor(
						() =>
							cdp.evaluate(
								`${doc}.activeElement===${doc}.querySelector(${JSON.stringify(selectors[target])})`,
							),
						'action source focus restored',
					);
					proof.push({ target, focus, input, dx, dy });
				}
	return { geometry, overlap, proof };
}

async function agendaIme(cdp, name, waitFor) {
	const doc = `uiReview.docs.${name}`,
		selector = '[data-review="home-real-agenda"] input[aria-label="Task title"]';
	await click(cdp, name, selector);
	const before = await cdp.evaluate(`uiReview.entries.${name}.writes`);
	await cdp.send('Input.imeSetComposition', { text: '未完成', selectionStart: 3, selectionEnd: 3 });
	await key(cdp, 'Enter', 13);
	await tick(cdp);
	assert.equal(await cdp.evaluate(`uiReview.entries.${name}.writes`), before, 'IME Enter does not create a task');
	await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
	await key(cdp, 'a', 65, 2);
	await cdp.send('Input.insertText', { text: 'Native IME task · 草稿' });
	await key(cdp, 'Enter', 13);
	await waitFor(
		() =>
			cdp.evaluate(
				`uiReview.entries.${name}.tasks.query({filter:'all'}).items.some(task=>task.title==='Native IME task · 草稿')`,
			),
		'committed IME title saves',
	);
	return {
		before,
		after: await cdp.evaluate(`uiReview.entries.${name}.writes`),
		owner: await cdp.evaluate(`${doc}.activeElement?.ownerDocument===${doc}`),
	};
}

const plusDate = (iso, amount) => {
	const date = new Date(`${iso}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
};
async function calendarControls({ cdp, name, waitFor, capture }) {
	const doc = `uiReview.docs.${name}`,
		proof = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 320,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
	await cdp.evaluate(
		"uiReview.configure({language:'en',theme:'paper',accent:'teal',source:'huhu',density:'compact',uiSize:'14',motion:'reduce'})",
	);
	await show(cdp, name, 320);
	await waitFor(() => cdp.evaluate(`!!${doc}.querySelector('[data-calendar-reset]')`), 'calendar fixture ready');
	for (const weeks of [1, 2, 3, 4, 5])
		for (const start of [0, 1, 6]) {
			await click(cdp, name, '[data-calendar-reset]');
			await click(cdp, name, `[data-week-count="${weeks}"]`);
			await click(cdp, name, `[data-week-start="${start}"]`);
			const popup = await cdp.evaluate(
				`!!${doc}.querySelector('[data-review="product-month"] button[aria-label="View day agenda"]')`,
			);
			if (popup) await click(cdp, name, '[data-review="product-month"] button[aria-label="View day agenda"]');
			const scope = popup
				? '[data-slot="popover-content"] [role="grid"]'
				: '[data-review="product-month"] [role="grid"]';
			await waitFor(() => cdp.evaluate(`!!${doc}.querySelector(${JSON.stringify(scope)})`), 'real product grid');
			const last = await cdp.evaluate(
				`(()=>{const all=[...${doc}.querySelectorAll(${JSON.stringify(scope + ' button[data-date]')})];return all.at(-1)?.dataset.date})()`,
			);
			assert.ok(last, 'last real date');
			await click(cdp, name, `${scope} button[data-date="${last}"]`);
			await waitFor(
				() => cdp.evaluate(`${doc}.activeElement?.dataset.date===${JSON.stringify(last)}`),
				'last focused',
			);
			await key(cdp, 'ArrowRight', 39);
			await waitFor(
				() => cdp.evaluate(`${doc}.activeElement?.dataset.date===${JSON.stringify(plusDate(last, 1))}`),
				'arrow crosses window',
			);
			await key(cdp, 'PageDown', 34);
			await waitFor(
				() =>
					cdp.evaluate(
						`${doc}.activeElement?.dataset.date===${JSON.stringify(plusDate(last, 1 + weeks * 7))}`,
					),
				'page forward exact date',
			);
			await key(cdp, 'PageUp', 33);
			await waitFor(
				() => cdp.evaluate(`${doc}.activeElement?.dataset.date===${JSON.stringify(plusDate(last, 1))}`),
				'page reverse exact date',
			);
			// Native Enter commits the library-focused date before computed/paint checks.
			await key(cdp, 'Enter', 13);
			const geometry = await cdp.evaluate(
				`(()=>{const d=${doc},b=d.activeElement,s=d.defaultView.getComputedStyle(b),r=b.getBoundingClientRect(),p=b.closest('[data-slot="popover-content"]')?.getBoundingClientRect();const color=d.createElement('span');color.style.background='var(--hu-accent-soft)';b.parentElement.append(color);const expected=d.defaultView.getComputedStyle(color).backgroundColor;color.remove();return{date:b.dataset.date,width:r.width,height:r.height,hit:parseFloat(s.getPropertyValue('--hu-hit')),background:s.backgroundColor,expected,selected:b.closest('td')?.getAttribute('aria-selected'),outline:s.outlineWidth,offset:s.outlineOffset,popup:p?{left:p.left,right:p.right,width:p.width}:null,viewport:d.documentElement.clientWidth,innerWidth:d.defaultView.innerWidth,bodyRect:d.body.getBoundingClientRect().toJSON(),logicalOwnerLeafRect:d.querySelector('[data-review="product-month"]')?.closest('[data-huhu-leaf]')?.getBoundingClientRect().toJSON()??null,controlOwner:b.ownerDocument===d}})()`,
			);
			assert.ok(geometry.width >= 44 - 0.1 && geometry.height >= 44 - 0.1, JSON.stringify(geometry));
			assert.equal(geometry.innerWidth, 320, JSON.stringify(geometry));
			assert.equal(geometry.viewport, 320, JSON.stringify(geometry));
			assert.equal(geometry.logicalOwnerLeafRect?.width, 320, JSON.stringify(geometry));
			assert.equal(geometry.hit, 44, JSON.stringify(geometry));
			assert.equal(geometry.selected, 'true', JSON.stringify(geometry));
			assert.equal(geometry.background, geometry.expected, JSON.stringify(geometry));
			assert.equal(geometry.outline, '2px', JSON.stringify(geometry));
			assert.equal(geometry.offset, '2px', JSON.stringify(geometry));
			if (geometry.popup) {
				assert.ok(Math.abs(geometry.popup.width - 312) < 1, JSON.stringify(geometry));
				assert.ok(
					geometry.popup.left >= 3.5 && geometry.popup.right <= geometry.viewport - 3.5,
					JSON.stringify(geometry),
				);
			}
			if (weeks === 1 && start === 1) {
				await capture(`t05-${name}-calendar-edge-320`);
				geometry.points = await datePoints(cdp, name, plusDate(last, 1), scope);
			}
			proof.push({ weeks, start, last, next: plusDate(last, 1), geometry });
			if (popup) await key(cdp, 'Escape', 27);
		}
	const period = await periodAction(cdp, name);
	// This is the same shared agenda used by Home, wired to the real task calendar service.
	await click(cdp, name, '[data-review="home-full-month"] [data-calendar-count="2026-11-05"]');
	await waitFor(
		() => cdp.evaluate(`!!${doc}.querySelector('[data-review="home-real-agenda"]')`),
		'real agenda entry',
	);
	assert.ok(
		await cdp.evaluate(`${doc}.querySelector('[data-review="home-real-agenda"]').innerText.includes('Plan today')`),
	);
	await capture(`t05-${name}-home-agenda-320`);
	return {
		proof,
		period,
		taskActions: await taskActionTargets(cdp, name, waitFor, capture),
		ime: await agendaIme(cdp, name, waitFor),
	};
}

export async function verify({ cdp, sample }) {
	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		const proof = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name};return{page:d.documentElement.scrollWidth,width:d.documentElement.clientWidth,rows:d.querySelectorAll('[data-task-id]').length,nested:d.querySelectorAll('button button').length,view:d.querySelectorAll('[data-task-domain] [role=radio]').length,content:d.querySelectorAll('[data-slot=task-content]').length,source:d.querySelector('main.huhu-ui')?.dataset.source}})()`,
		);
		assert.ok(proof.page <= proof.width + 1, `${name} page overflow ${JSON.stringify(proof)}`);
		assert.equal(proof.nested, 0);
		assert.ok(proof.rows >= 2);
		assert.ok(proof.view >= 7);
		assert.ok(proof.content >= 2);
		sample.assertions.push({ name, proof });
	}
}
export async function exercise({ cdp, result, waitFor, capture }) {
	const receipt = {
		states: [],
		documents: [],
		boundaries: [
			'Actual in-memory TaskRepository/TaskService; no vault writes',
			'Same-origin iframe is a second Document, not Obsidian popout',
		],
	};
	for (const name of ['main', 'second']) {
		await show(cdp, name, 390);
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 390,
			height: 1000,
			deviceScaleFactor: 1,
			mobile: false,
		});
		await cdp.evaluate(
			"uiReview.configure({language:'en',theme:'paper',accent:'teal',source:'huhu',density:'compact',uiSize:'14',motion:'reduce'})",
		);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-task-id="task:today"]')`),
			'task ready',
		);
		// All view changes use trusted radio/button input, not internal React callbacks.
		for (const view of ['Board', 'Calendar', 'List']) {
			await click(cdp, name, `[data-task-domain] [role=radio][aria-label="${view}"]`);
		}
		await click(cdp, name, '[data-task-id="task:today"] button[aria-pressed]');
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-task-editor]')`), 'editor open');
		const before = await cdp.evaluate(`uiReview.entries.${name}.tasks.get('task:today').revision`);
		await click(cdp, name, '[data-task-editor] input');
		await key(cdp, 'a', 65, 2);
		await cdp.send('Input.insertText', { text: 'Native draft · 原生草稿' });
		await key(cdp, 'Tab', 9);
		await waitFor(
			() => cdp.evaluate(`uiReview.entries.${name}.tasks.get('task:today').title==='Native draft · 原生草稿'`),
			'real autosave',
		);
		assert.equal(await cdp.evaluate(`uiReview.entries.${name}.tasks.get('task:today').revision`), before + 1);
		await capture(`t05-${name}-detail`);
		receipt.documents.push({ name, autosave: true });
	}
	for (const name of ['main', 'second']) {
		receipt.documents.find((item) => item.name === name).calendar = await calendarControls({
			cdp,
			name,
			waitFor,
			capture,
		});
	}
	for (const width of [1440, 390])
		for (const state of ['empty', 'loading', 'error', 'unavailable', 'failed']) {
			await cdp.send('Emulation.setDeviceMetricsOverride', {
				width,
				height: 1000,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await cdp.evaluate(`uiReview.scenario(${JSON.stringify(state)})`);
			await tick(cdp);
			await waitFor(
				() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-fixture-status]"))'),
				'state mounted',
			);
			for (const name of ['main', 'second']) {
				await show(cdp, name, width);
				if (state === 'failed') {
					await click(cdp, name, '[data-task-id="task:today"] [role="checkbox"]');
					await waitFor(
						() => cdp.evaluate(`uiReview.entries.${name}.tasks.snapshot().status==='error'`),
						'real write rejection',
					);
					assert.equal(await cdp.evaluate(`uiReview.entries.${name}.tasks.get('task:today').status`), 'open');
				}
				const actual = await cdp.evaluate(
					`(()=>{const d=uiReview.docs.${name},p=d.querySelector('[data-task-domain]');return{text:p.innerText,rows:p.querySelectorAll('[data-task-id]').length,disabled:[...p.querySelectorAll('[role="checkbox"]')].every(b=>b.hasAttribute('disabled')),overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1}})()`,
				);
				assert.equal(actual.overflow, false, `${name} ${width} ${state}`);
				if (state === 'empty' || state === 'loading') assert.equal(actual.rows, 0);
				if (state !== 'empty') assert.equal(actual.disabled, true);
				if (state === 'failed') assert.ok(actual.text.includes('Could not save'));
				await capture(`t05-${name}-${width}-${state}`);
				receipt.states.push({ width, name, state, ...actual });
			}
		}
	await cdp.evaluate('uiReview.dispose()');
	await tick(cdp);
	assert.equal(
		await cdp.evaluate('Object.values(uiReview.docs).some(d=>d.querySelector(".huhu-portal-root"))'),
		false,
	);
	result.taskExercise = receipt;
}

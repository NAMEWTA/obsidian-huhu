import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready = '!!globalThis.uiReview && Object.keys(uiReview.leaves).length===2';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;height:100%;overflow:hidden}';
const tick = (cdp) => cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
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
async function show(cdp, name, width) {
	await cdp.evaluate(
		`(()=>{const f=document.querySelector('iframe');f.style.left=${JSON.stringify(name === 'second' ? '0' : '-2000px')};f.style.top='0';f.style.zIndex='100';f.style.width=${width}+'px';f.style.height=innerHeight+'px';uiReview.resize(${JSON.stringify(name)},null)})()`,
	);
	await tick(cdp);
}
async function settleAnimations(cdp, name) {
	await cdp.evaluate(
		`(async()=>{const d=uiReview.docs.${name},win=d.defaultView;let timer;try{await Promise.race([Promise.allSettled(d.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime!==Infinity).map(a=>a.finished)),new Promise((_,reject)=>{timer=win.setTimeout(()=>reject(Error('Finite animations did not settle')),10000)})]);}finally{win.clearTimeout(timer);}})()`,
	);
}
async function click(cdp, name, selector) {
	await settleAnimations(cdp, name);
	const p = await cdp.evaluate(
		`(async()=>{const n=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing '+${JSON.stringify(selector)});n.scrollIntoView({block:'center'});let r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=n.ownerDocument.elementFromPoint(x,y);const end=performance.now()+10000;while(!n.contains(hit)&&n.isConnected&&performance.now()<end){await new Promise(resolve=>n.ownerDocument.defaultView.requestAnimationFrame(resolve));r=n.getBoundingClientRect();x=r.x+r.width/2;y=r.y+r.height/2;hit=n.ownerDocument.elementFromPoint(x,y);}return{x,y,hit:n.contains(hit),parentHit:document.elementFromPoint(x,y)?.tagName,actual:hit?.outerHTML.slice(0,180)}})()`,
	);
	assert.equal(p.hit, true, JSON.stringify({ name, selector, p }));
	if (name === 'second') assert.equal(p.parentHit, 'IFRAME', JSON.stringify({ name, selector, p }));
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
	await tick(cdp);
}
async function action(cdp, name, labelKey, scope = '[data-review-main]', role = 'button') {
	const selector = await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},root=d.querySelector(${JSON.stringify(scope)})??d,label=uiReview.text(${JSON.stringify(labelKey)}),nodes=[...root.querySelectorAll(${JSON.stringify(role === 'button' ? 'button' : `[role=${role}]`)})],n=nodes.find(n=>n.textContent.trim()===label||n.getAttribute('aria-label')===label);if(!n)throw Error('Missing action '+${JSON.stringify(labelKey)}+' '+label);n.dataset.reviewAction='current';return '[data-review-action=current]'})()`,
	);
	await click(cdp, name, selector);
	await cdp.evaluate(
		`uiReview.docs.${name}.querySelector('[data-review-action=current]')?.removeAttribute('data-review-action')`,
	);
}
async function fill(cdp, name, selector, text) {
	await click(cdp, name, selector);
	await key(cdp, 'a', 65, 2);
	if (text) await cdp.send('Input.insertText', { text });
	else await key(cdp, 'Backspace', 8);
	await tick(cdp);
}
async function nav(cdp, name, section, id, waitFor) {
	await cdp.evaluate(
		`void uiReview.navigate(${JSON.stringify(name)},${JSON.stringify(section)},${JSON.stringify(id)})`,
	);
	await waitFor(
		() =>
			cdp.evaluate(
				`uiReview.leaves.${name}.state.section===${JSON.stringify(section)} && uiReview.leaves.${name}.state.selectedId===${JSON.stringify(id)}`,
			),
		name + ' route',
	);
	await tick(cdp);
}
export async function verify({ cdp, sample, waitFor, capture }) {
	for (const name of ['main', 'second']) {
		await show(cdp, name, sample.cssWidth);
		await nav(cdp, name, 'review-type', undefined, waitFor);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-archive-list]:not([aria-busy=true])')`),
			name + ' archive list',
		);
		const initial = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},r=uiReview.leaves.${name}.element.getBoundingClientRect();return{leaf:r.width,viewport:d.documentElement.clientWidth,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,rows:d.querySelectorAll('[data-archive-list] tbody tr').length}})()`,
		);
		assert.equal(initial.leaf, initial.viewport);
		assert.equal(initial.overflow, false);
		assert.equal(initial.rows, 50);
		await capture(`archives-list-${name}-${sample.width}-${sample.language}`);
		await action(cdp, name, 'archives.card', '[data-review-main]', 'radio');
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelectorAll('[data-archive-list] article[data-path]').length===50`,
				),
			name + ' actual card layout',
		);
		await capture(`archives-cards-${name}-${sample.width}-${sample.language}`);
		await action(cdp, name, 'archives.table', '[data-review-main]', 'radio');
		await waitFor(
			() => cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[data-archive-list] tbody tr').length===50`),
			name + ' restored table',
		);
		const mainSearch = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-archive-list] input[aria-label="'+uiReview.text('archives.search')+'"]');n.dataset.review='list-search';return '[data-review=list-search]'})()`,
		);
		await fill(cdp, name, mainSearch, 'No matching archive record');
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-slot=empty-state]')?.textContent.includes(uiReview.text('contacts.noResults'))`,
				),
			name + ' real no results',
		);
		await capture(`archives-no-results-${name}-${sample.width}-${sample.language}`);
		await fill(cdp, name, mainSearch, '');
		await waitFor(
			() => cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[data-archive-list] tbody tr').length===50`),
			name + ' cleared list query',
		);
		await nav(cdp, name, 'review-empty-type', undefined, waitFor);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-slot=empty-state]')?.textContent.includes(uiReview.text('contacts.empty'))`,
				),
			name + ' actual empty type',
		);
		await capture(`archives-empty-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'review-type', undefined, waitFor);

		// Real wide leaf makes the directory and the complete dynamic field grid reachable.
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: 1440,
			height: 1000,
			deviceScaleFactor: sample.zoom,
			mobile: sample.mobile,
		});
		await show(cdp, name, 1440);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-tree-id=review-type]')`),
			name + ' paged tree',
		);

		const page = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-review-side] section[aria-label="Review records"]');return{button:!!n?.querySelector('button'),text:n?.querySelector('p')?.textContent??''}})()`,
		);
		if (page.button) {
			const before = Number(page.text.match(/\d+/)?.[0]);
			await click(cdp, name, '[data-review-side] section[aria-label="Review records"] button');
			await waitFor(
				() =>
					cdp.evaluate(
						`Number(uiReview.docs.${name}.querySelector('[data-review-side] section[aria-label="Review records"] p').textContent.match(/[0-9]+/)?.[0])>${before}`,
					),
				name + ' real load more',
			);
		}
		const toggle = '[data-tree-id=review-type] [data-slot=tree-toggle]';
		const treeBefore = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-tree-id=review-type]'),r=n.querySelector('[data-slot=tree-toggle]').getBoundingClientRect();return{open:n.getAttribute('aria-expanded'),width:r.width,height:r.height}})()`,
		);
		assert.ok(treeBefore.width >= (sample.pointer === 'coarse' ? 44 : 32));
		assert.ok(treeBefore.height >= (sample.pointer === 'coarse' ? 44 : 32));
		await click(cdp, name, toggle);
		await click(cdp, name, toggle);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-tree-id=review-type]').getAttribute('aria-expanded')`,
			),
			treeBefore.open,
		);
		assert.equal(await cdp.evaluate(`uiReview.leaves.${name}.state.selectedId`), undefined);
		// Full-domain value-only search must find a record that was never in the first100.
		const search = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-review-side] input');n.dataset.review='tree-search';return '[data-review=tree-search]'})()`,
		);
		await fill(cdp, name, search, 'Search beyond500');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-tree-id=review-1200]')`),
			name + ' value search beyond500',
		);
		await fill(cdp, name, search, 'Nothing matches this archive query');
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-tree-id=review-1200]')`),
			name + ' honest no results',
		);
		await fill(cdp, name, search, '');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-tree-id=review-type]')`),
			name + ' tree search restore',
		);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-tree-id=review-type]').getAttribute('aria-expanded')`,
			),
			treeBefore.open,
		);
		sample.assertions.push(
			name +
				': directory real44/32 chevron, full-domain value search beyond500, honest empty and restored expansion',
		);
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: sample.cssWidth,
			height: 1000 / sample.zoom,
			deviceScaleFactor: sample.zoom,
			mobile: sample.mobile,
		});
		await show(cdp, name, sample.cssWidth);
		await nav(cdp, name, 'review-type', 'review-0000', waitFor);
		await action(cdp, name, 'contacts.edit');
		await waitFor(
			() =>
				cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-archive-editor] [data-field-id=datetime]')`),
			name + ' actual edit session',
		);
		const fields = await cdp.evaluate(
			`[...uiReview.docs.${name}.querySelectorAll('[data-archive-editor]>fieldset>[class] [data-field-id]')].map(n=>n.dataset.fieldId)`,
		);
		for (const id of [
			'name',
			'markdown',
			'integer',
			'decimal',
			'money',
			'boolean',
			'day',
			'month',
			'mixed',
			'datetime',
			'select',
			'multiselect',
			'strings',
			'file',
			'table',
			'child',
		])
			assert.ok(fields.includes(id), id);

		// The production DateField and MonthField stay in their logical leaf in either Document.
		const dateTrigger = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-field-id=day] button[aria-label="'+uiReview.text('ui.date.calendar')+'"]');n.dataset.review='date-trigger';return '[data-review=date-trigger]'})()`,
		);
		await click(cdp, name, dateTrigger);
		await waitFor(
			() =>
				cdp.evaluate(
					`!!uiReview.docs.${name}.querySelector('[data-slot=popover-content] [data-slot=calendar]')`,
				),
			name + ' date picker',
		);
		await settleAnimations(cdp, name);
		const dateGeometry = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},p=d.querySelector('[data-slot=popover-content]'),r=p.getBoundingClientRect(),leaf=uiReview.leaves.${name}.element.getBoundingClientRect();return{width:r.width,left:r.left,right:r.right,leafLeft:leaf.left,leafRight:leaf.right,owner:p.ownerDocument===d}})()`,
		);
		assert.equal(dateGeometry.owner, true);
		assert.equal(dateGeometry.width, sample.pointer === 'coarse' ? 312 : 280);
		assert.ok(
			dateGeometry.left >= dateGeometry.leafLeft && dateGeometry.right <= dateGeometry.leafRight + 0.01,
			JSON.stringify(dateGeometry),
		);
		await cdp.evaluate(
			`uiReview.docs.${name}.querySelector('[data-slot=calendar] [role=grid] button[tabindex="0"]').focus()`,
		);
		await key(cdp, 'ArrowRight', 39);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-slot=calendar]').contains(uiReview.docs.${name}.activeElement)`,
			),
			true,
		);
		if (name === 'second')
			assert.equal(await cdp.evaluate(`document.activeElement===document.querySelector('iframe')`), true);
		await key(cdp, 'Enter', 13);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot=popover-content]')`),
			name + ' date keyboard selection',
		);
		await waitFor(
			() => cdp.evaluate(`uiReview.docs.${name}.activeElement===uiReview.docs.${name}.querySelector(${JSON.stringify(dateTrigger)})`),
			name + ' exact date trigger focus return',
		);
		const monthTrigger = await cdp.evaluate(
			`(()=>{const n=uiReview.docs.${name}.querySelector('[data-field-id=month] button[aria-label="'+uiReview.text('ui.date.chooseMonth')+'"]');n.dataset.review='month-trigger';return '[data-review=month-trigger]'})()`,
		);
		await click(cdp, name, monthTrigger);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot=popover-content] [role=group]')`),
			name + ' month picker',
		);
		await settleAnimations(cdp, name);
		await click(cdp, name, '[data-slot=popover-content] button[aria-pressed=true]');
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-slot=popover-content]')`),
			name + ' month selection',
		);
		const month = await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-field-id=month] input').value`);
		assert.match(month, /^\d{4}-\d{2}$/);
		const source = await cdp.evaluate(
			`(()=>{const d=uiReview.docs.${name},n=d.querySelector('[data-field-id=name] input');globalThis.editorName=n;return{value:n.value,stamp:[...d.querySelectorAll('[data-field-id=datetime] input')].map(n=>n.value)}})()`,
		);
		assert.deepEqual(source.stamp, ['2026-11-01', '01:30:05.120', '-04:00']);
		const sequence = await cdp.evaluate('++uiReview.sequence');
		const changed = `Review ${sequence} ${sample.width} ${sample.language} ${name}`;
		await click(cdp, name, '[data-field-id=name] input');
		await key(cdp, 'a', 65, 2);
		await cdp.send('Input.imeSetComposition', { text: '输入中', selectionStart: 3, selectionEnd: 3 });
		await key(cdp, 'Enter', 13);
		assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-archive-editor]')`), true);
		await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
		await fill(cdp, name, '[data-field-id=name] input', changed);
		assert.equal(await cdp.evaluate(`uiReview.docs.${name}.activeElement===editorName`), true);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[data-archive-editor]').getAttribute('data-archive-dirty')`,
			),
			'true',
		);
		await capture(`archives-dirty-${name}-${sample.width}-${sample.language}`);
		// Cancel the existing single leave confirmation. No new dirty modal engine is installed.
		await action(cdp, name, 'contacts.cancel');
		await waitFor(
			() => cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role=dialog]').length===1`),
			name + ' one leave confirmation',
		);
		await key(cdp, 'Escape', 27);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`),
			name + ' cancel leave',
		);
		assert.equal(await cdp.evaluate(`editorName.value`), changed);
		// Real file-port rejection travels through the actual command, retaining draft and exact timestamp.
		await cdp.evaluate('uiReview.failWrite()');
		await action(cdp, name, 'archives.saveActive');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-archive-editor] [role=alert]')`),
			name + ' actual save error',
		);
		assert.equal(await cdp.evaluate(`editorName.value`), changed);
		assert.equal(
			await cdp.evaluate(
				`uiReview.application.runtime.index.get('review-0000').values.name===${JSON.stringify(changed)}`,
			),
			false,
		);
		await cdp.evaluate('uiReview.clearFault()');
		await action(cdp, name, 'archives.saveActive');
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[data-archive-editor]') && uiReview.application.runtime.index.get('review-0000').values.name===${JSON.stringify(changed)}`,
				),
			name + ' real save commit',
		);
		assert.equal(
			await cdp.evaluate(`uiReview.application.runtime.index.get('review-0000').values.datetime`),
			'2026-11-01T01:30:05.120-04:00',
		);
		await action(cdp, name, 'archives.revisions', '[data-review-main]', 'tab');
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-review-main]').textContent.includes('review-type-v1')`,
				),
			name + ' immutable revisions',
		);
		await action(cdp, name, 'archives.resources', '[data-review-main]', 'tab');
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-review-main]').textContent.includes('Resource-00.txt')`,
				),
			name + ' actual resources',
		);
		await capture(`archives-resources-${name}-${sample.width}-${sample.language}`);
		sample.assertions.push(
			name +
				': all13 kinds, recursive table, same-session dirty/focus, single leave guard, actual save rejection/retry and exact offset seconds, revisions/resources',
		);
		const personId = await cdp.evaluate('uiReview.personId');
		await nav(cdp, name, 'type-person', personId, waitFor);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-person-id]')`),
			name + ' person reading',
		);
		await action(cdp, name, 'archives.person.journal', '[data-review-main]', 'radio').catch(async (error) => {
			throw error;
		});
		await capture(`archives-person-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'type-belonging', undefined, waitFor);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-testid=inventory-CNY]')`),
			name + ' actual belonging KPI',
		);
		assert.ok(
			(
				await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-testid=inventory-CNY]').textContent`)
			).includes('100'),
		);
		await capture(`archives-belongings-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'archive-belongings-report', undefined, waitFor);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-report-result]')`),
			name + ' annual report',
		);
		await capture(`archives-report-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'archive-designer', undefined, waitFor);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-review-main]').textContent.includes(uiReview.text('archives.newDefinition'))`,
				),
			name + ' definition studio',
		);
		await capture(`archives-designer-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'archive-recovery', undefined, waitFor);
		await waitFor(
			() =>
				cdp.evaluate(
					`uiReview.docs.${name}.querySelector('[data-review-main] h2')?.textContent===uiReview.text('archives.recovery')`,
				),
			name + ' recovery',
		);
		await capture(`archives-recovery-${name}-${sample.width}-${sample.language}`);
		await cdp.evaluate(`uiReview.settingsPage(${JSON.stringify(name)})`);
		await tick(cdp);
		await capture(`archives-settings-${name}-${sample.width}-${sample.language}`);
		await nav(cdp, name, 'review-type', undefined, waitFor);
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: sample.cssWidth,
			height: 1000 / sample.zoom,
			deviceScaleFactor: sample.zoom,
			mobile: sample.mobile,
		});
		await show(cdp, name, sample.cssWidth);
		assert.equal(
			await cdp.evaluate(
				`uiReview.docs.${name}.documentElement.scrollWidth<=uiReview.docs.${name}.documentElement.clientWidth+1`,
			),
			true,
		);
		sample.assertions.push(
			name +
				': person/journal, belongings KPI, annual report, definition studio, recovery, settings and viewport restoration',
		);
	}
}
export async function exercise({ cdp, waitFor, capture, result }) {
	result.interactions = [];
	for (const name of ['main', 'second']) {
		await show(cdp, name, result.cases.at(-1).cssWidth);
		result.interactions.push({ document: name, screenshot: await capture('archives-final-' + name) });
	}
	await cdp.evaluate('uiReview.dispose()');
	await waitFor(
		() =>
			cdp.evaluate(
				`Object.values(uiReview.docs).every(d=>!d.querySelector('.huhu-portal-root,[role=dialog],[role=alertdialog]') && d.body.style.pointerEvents!=='none')`,
			),
		'archive roots cleanup',
	);
	assert.deepEqual(await cdp.evaluate('uiReview.errors'), []);
}

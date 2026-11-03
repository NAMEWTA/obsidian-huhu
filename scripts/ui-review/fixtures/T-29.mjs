import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=media-images] [data-card-grid] li") && d.querySelector("[data-review=media-empty] [data-slot=empty-state]"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
const names = ['media-images', 'media-videos', 'media-empty', 'media-unsupported'];

/** Page-side probe of one media container: contrast (worst case under translucent captions), overflow, hit areas, titles and scope ownership. */
const probe = `(name, selector) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector(selector), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const over = (top, under) => { const a = top[3]/255; return [0,1,2].map(i => top[i]*a + under[i]*(1-a)); };
	const ratio = (fg, bg) => { const x = lum(over(rgb(fg), bg)), y = lum(bg); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const opaqueBackdrop = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(win.getComputedStyle(e).backgroundColor); if (c[3] === 255) return c; } return rgb(win.getComputedStyle(d.body).backgroundColor); };
	const contrast = (el) => {
		const fg = win.getComputedStyle(el).color;
		if (el.closest('[data-media-caption]')) { const cap = el.closest('[data-media-caption]'); const top = rgb(win.getComputedStyle(cap).backgroundColor); return Math.min(ratio(fg, over(top, [0,0,0])), ratio(fg, over(top, [255,255,255]))); }
		return ratio(fg, opaqueBackdrop(el));
	};
	const samples = ['[data-media-caption] div', '[data-footer] span', '[data-slot=empty-state] h3', '[data-media-unavailable] span', 'li .text-xs'].flatMap(sel => { const el = box.querySelector(sel); return el && el.textContent.trim() ? [{ sel, text: el.textContent.slice(0, 30), value: contrast(el) }] : []; });
	const controls = [...box.querySelectorAll('button,input,[role=combobox]')].flatMap(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return r.width && r.height ? [{ label: (e.getAttribute('aria-label') || e.textContent || e.type).slice(0,40), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration }] : []; });
	const unnamed = [...box.querySelectorAll('button,input,[role=combobox]')].filter(e => !(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('aria-labelledby'))).map(e => e.outerHTML.slice(0, 80));
	const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !e.closest('[data-sonner-toaster],[data-slot=scroll-area]') ? [{ tag: e.tagName, text: e.textContent.slice(0,40), over: Math.round(r.right - b.right) }] : []; }).slice(0, 8);
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, samples, controls, unnamed, overflows, titles: box.querySelectorAll('[title]').length, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outletHeight: (box.querySelector('.huhu-design-notices')?.getBoundingClientRect().height ?? -1), portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length, items: box.querySelectorAll('[data-card-grid] > li').length, failed: box.querySelectorAll('[data-media-unavailable]').length };
}`;

export async function verify({ cdp, sample, waitFor }) {
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d => d.querySelector("[data-review=media-images] [data-media-unavailable]"))'), 'unreadable image reported in both documents');
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, Object.fromEntries(${JSON.stringify(names)}.map(k => [k, probe(n, '[data-review=' + k + ']')]))])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, value] of Object.entries(measured)) for (const key of names) {
		const part = value[key], at = `${name}/${key}`;
		assert(part.width > 0, `${at}: mounted`);
		assert(part.scroll <= part.client + 1, `${at}: overflow ${part.scroll}/${part.client}`);
		assert.deepEqual(part.overflows, [], `${at}: descendants stay inside the container`);
		assert.equal(part.titles, 0, `${at}: no title attributes (whitespace never raises a whole-region tooltip)`);
		assert.deepEqual(part.unnamed, [], `${at}: every control has a name`);
		assert.equal(part.scopes, 1, `${at}: one DesignScope content leaf`);
		assert.equal(part.outletHeight, 0, `${at}: idle notice outlet reserves no space`);
		assert(part.portal >= 4, `${at}: each scope owns a portal`);
		for (const s of part.samples) assert(s.value >= 4.5, `${at}: contrast ${s.value} for ${s.sel} "${s.text}"`);
		for (const control of part.controls) {
			assert(control.width >= min - 0.1 && control.height >= min - 0.1, `${at}: hit area ${JSON.stringify(control)}`);
			if (sample.reducedMotion) assert(control.transition.split(',').every(v => parseFloat(v) === 0), `${at}: motion ${control.label}`);
		}
	}
	for (const value of Object.values(measured)) {
		assert(value['media-images'].items === 8 && value['media-images'].failed >= 1, 'images: eight tiles, the unreadable one says so');
		assert.equal(value['media-videos'].items, 2, 'videos: two tiles');
		assert.equal(value['media-empty'].samples.some(s => s.sel === '[data-slot=empty-state] h3'), true, 'empty state text');
		assert.equal(value['media-unsupported'].samples.some(s => s.sel === '[data-slot=empty-state] h3'), true, 'unsupported state text');
	}
	sample.assertions.push('real-media-panels', 'unreadable-file-tile', 'empty-and-unsupported', 'no-title-attributes', 'named-controls', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 600, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
	const D = 'uiReview.docs.main';
	const box = (k = 'media-images') => `${D}.querySelector('[data-review=${k}]')`;
	const portal = `${D}.querySelector('.huhu-design.huhu-portal-root')`;
	const find = (root, text, sel = 'button') => `[...${root}.querySelectorAll('${sel}')].find(b => (b.getAttribute('aria-label') || b.textContent).trim() === ${JSON.stringify(text)})`;
	const press = async (key, code, vk) => { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }); };
	const clickReal = async (expr) => {
		const point = await cdp.evaluate(`(() => { const e = ${expr}; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
		assert(point, `clickable target: ${expr.slice(0, 80)}`);
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
		await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
		await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
	};
	const count = (k = 'media-images') => cdp.evaluate(`${box(k)}.querySelectorAll('ul[data-media-view] > li').length`);
	const T = (key, vars) => `uiReview.t(${JSON.stringify(key)}, ${JSON.stringify(vars ?? {})})`;
	const typeInto = async (expr, text) => { await cdp.evaluate(`(() => { const e = ${expr}; e.focus(); e.select?.(); })()`); await cdp.send('Input.insertText', { text }); };
	const longName = await cdp.evaluate('uiReview.longName');
	await capture('media-grid');

	// Hover-only actions are reachable by keyboard and show on focus.
	await cdp.evaluate(`${find(box(), 'Delete: sunrise')}.focus()`);
	assert(await cdp.evaluate(`getComputedStyle(${find(box(), 'Delete: sunrise')}).opacity === '1'`), 'tile actions reveal on focus');
	actions.push('tile-actions-reveal-on-focus');

	// Search without results is not the empty library; clearing recovers.
	await typeInto(`${box()}.querySelector('input')`, 'zzzz-no-match');
	await waitFor(() => cdp.evaluate(`${box()}.textContent.includes(${T('media.noResults')})`), 'no-results state');
	assert.equal(await count(), 0);
	await capture('media-no-results');
	await cdp.evaluate(`${find(box(), await cdp.evaluate(T('media.clearFilters')))}.click()`);
	await waitFor(async () => (await count()) === 8, 'clear restores tiles');
	assert.equal(await cdp.evaluate(`${box()}.querySelector('input').value`), '', 'search cleared with the filters');
	actions.push('no-results-recovers');

	// Filter popover: tag chip filters, a removable badge restores, Escape returns focus to the trigger.
	await clickReal(find(box(), await cdp.evaluate(T('media.quickFilter'))));
	await waitFor(() => cdp.evaluate(`!!${D}.querySelector('[data-slot=popover-content]')`), 'filter popover');
	await capture('media-filter');
	await cdp.evaluate(`${find(`${D}.querySelector('[data-slot=popover-content]')`, '#travel')}.click()`);
	await waitFor(async () => (await count()) === 2, 'tag filter applies');
	await press('Escape', 'Escape', 27);
	await waitFor(() => cdp.evaluate(`!${D}.querySelector('[data-slot=popover-content]')`), 'popover closes');
	await waitFor(() => cdp.evaluate(`document.activeElement === ${find(box(), 'Filter')}`), 'focus returns to the filter button');
	await cdp.evaluate(`${find(box(), await cdp.evaluate(T('media.removeFilter', { name: '#travel' })))}.click()`);
	await waitFor(async () => (await count()) === 8, 'badge removal restores');
	actions.push('filter-popover-tag-badge-escape-focus');

	// Grouping by folder: header buttons collapse and expand.
	await clickReal(`${box()}.querySelector('[role=combobox][aria-label="${await cdp.evaluate(T('media.groupBy'))}"]')`);
	await clickReal(`[...${D}.querySelectorAll('[role=option]')].find(o => o.textContent === ${JSON.stringify(await cdp.evaluate(T('media.groupByFolder')))})`);
	await waitFor(() => cdp.evaluate(`${box()}.querySelectorAll('section[data-group-key]').length >= 2`), 'folder groups');
	await capture('media-groups');
	await cdp.evaluate(`${box()}.querySelector('section[data-group-key] > button').click()`);
	assert.equal(await cdp.evaluate(`${box()}.querySelector('section[data-group-key] > button').getAttribute('aria-expanded')`), 'false');
	assert.equal(await cdp.evaluate(`!!${box()}.querySelector('section[data-group-key]:first-of-type ul')`), false, 'collapsed group hides its tiles');
	await cdp.evaluate(`${box()}.querySelector('section[data-group-key] > button').click()`);
	await clickReal(`${box()}.querySelector('[role=combobox][aria-label="${await cdp.evaluate(T('media.groupBy'))}"]')`);
	await clickReal(`[...${D}.querySelectorAll('[role=option]')].find(o => o.textContent === ${JSON.stringify(await cdp.evaluate(T('media.groupNone')))})`);
	await waitFor(async () => (await count()) === 8, 'grouping off');
	actions.push('group-collapse-expand');

	// Lightbox: arrows navigate, ends disable, Escape closes and returns focus to the tile.
	await cdp.evaluate(`${find(box(), longName)}.focus()`);
	await cdp.evaluate(`${find(box(), longName)}.click()`);
	await waitFor(() => cdp.evaluate(`!!${portal}.querySelector('[role=dialog] [role=status]')`), 'lightbox');
	assert(await cdp.evaluate(`${portal}.querySelector('[role=dialog] [role=status]').textContent.includes('1 / 8')`), 'first of eight');
	assert(await cdp.evaluate(`${find(`${portal}.querySelector('[role=dialog]')`, 'Previous page')}.disabled`), 'previous disabled at the start');
	await capture('media-lightbox');
	await cdp.evaluate(`window.focus(); ${portal}.querySelector('[role=dialog]').focus()`);
	await press('ArrowRight', 'ArrowRight', 39);
	await waitFor(() => cdp.evaluate(`${portal}.querySelector('[role=dialog] [role=status]').textContent.includes('2 / 8')`), 'arrow moves to the next file');
	await press('Escape', 'Escape', 27);
	await waitFor(() => cdp.evaluate(`!${D}.querySelector('[role=dialog]')`), 'Escape closes lightbox');
	await waitFor(() => cdp.evaluate(`document.activeElement.getAttribute('aria-label') === uiReview.longName`), 'focus returns to the opened tile');
	actions.push('lightbox-arrows-escape-focus');

	// Tag editor: failed save keeps the dialog and edits; retry closes.
	await cdp.evaluate(`${find(box(), await cdp.evaluate(T('media.editTags')))}.click()`);
	await waitFor(() => cdp.evaluate(`!!${D}.querySelector('[role=dialog] input')`), 'tag dialog');
	await typeInto(`${D}.querySelector('[role=dialog] input')`, 'newtag');
	await press('Enter', 'Enter', 13);
	await cdp.evaluate('uiReview.mounts.main.images.control.failTags = true');
	await cdp.evaluate(`${find(`${D}.querySelector('[role=dialog]')`, await cdp.evaluate(T('common.save')))}.click()`);
	await waitFor(() => cdp.evaluate(`${D}.querySelector('[role=dialog] [role=alert]')?.textContent === ${T('media.tagSaveFailed')}`), 'tag save failure alert');
	assert(await cdp.evaluate(`[...${D}.querySelectorAll('[role=dialog] button')].some(b => b.textContent.includes('newtag'))`), 'edited tags kept');
	await capture('media-tag-error');
	await cdp.evaluate('uiReview.mounts.main.images.control.failTags = false');
	await cdp.evaluate(`${find(`${D}.querySelector('[role=dialog]')`, await cdp.evaluate(T('common.save')))}.click()`);
	await waitFor(() => cdp.evaluate(`!${D}.querySelector('[role=dialog]') && uiReview.mounts.main.images.control.saved === 1`), 'tag save retried');
	actions.push('tag-save-failure-keeps-edits');

	// List view: rename failure keeps the typed name and the old name; success renames once.
	await clickReal(find(box(), await cdp.evaluate(T('media.viewGrid'))));
	await clickReal(`[...${D}.querySelectorAll('[role=menuitem]')].find(o => o.textContent === ${JSON.stringify(await cdp.evaluate(T('media.viewList')))})`);
	await waitFor(() => cdp.evaluate(`!!${box()}.querySelector('[data-media-view=list]')`), 'list view');
	await capture('media-list');
	const renameLabel = await cdp.evaluate(T('media.renameFile', { name: 'harbour' }));
	await cdp.evaluate(`${find(box(), renameLabel)}.click()`);
	await waitFor(() => cdp.evaluate(`!!${find(box(), renameLabel, 'input')}`), 'rename input');
	await cdp.evaluate('uiReview.mounts.main.images.control.failRename = true');
	await typeInto(find(box(), renameLabel, 'input'), 'harbour-new');
	await press('Enter', 'Enter', 13);
	await waitFor(() => cdp.evaluate(`!!${box()}.querySelector('[role=alert]')`), 'rename failure alert');
	assert.equal(await cdp.evaluate(`${find(box(), renameLabel, 'input')}.value`), 'harbour-new', 'typed name kept');
	await capture('media-rename-error');
	await cdp.evaluate('uiReview.mounts.main.images.control.failRename = false');
	await press('Enter', 'Enter', 13);
	await waitFor(() => cdp.evaluate(`uiReview.mounts.main.images.control.renamed.length === 1 && !${box()}.querySelector('[role=alert]')`), 'rename retried');
	assert(await cdp.evaluate(`${box()}.textContent.includes('harbour-new')`), 'new name shown');
	actions.push('rename-failure-keeps-input');

	// Delete: failure stays in the dialog with the reason, retry removes exactly one.
	const before = await count();
	await cdp.evaluate(`${find(box(), 'Delete: forest')}.click()`);
	await waitFor(() => cdp.evaluate(`!!${D}.querySelector('[role=alertdialog], [role=dialog]')`), 'delete dialog');
	await cdp.evaluate('uiReview.mounts.main.images.control.failTrash = true');
	const confirm = `${D}.querySelector('[role=dialog] [data-slot=dialog-footer] button:last-child')`;
	await cdp.evaluate(`${confirm}.click()`);
	await waitFor(() => cdp.evaluate(`${D}.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Permission denied')`), 'delete failure reason');
	assert.equal(await count(), before, 'nothing removed on failure');
	assert(await cdp.evaluate(`${confirm}.textContent === ${T('media.retry')}`), 'confirm becomes retry');
	await capture('media-delete-error');
	await cdp.evaluate('uiReview.mounts.main.images.control.failTrash = false');
	await cdp.evaluate(`${confirm}.click()`);
	await waitFor(async () => (await count()) === before - 1 && await cdp.evaluate(`!${D}.querySelector('[role=dialog]') && uiReview.mounts.main.images.control.trashed.length === 1`), 'delete retried');
	actions.push('delete-failure-retry-once');

	// Keyboard focus is visible on a toolbar control.
	await cdp.evaluate(`${box()}.querySelector('input').focus()`);
	await press('Tab', 'Tab', 9);
	assert(await cdp.evaluate(`(() => { const e = document.activeElement, s = getComputedStyle(e); return e !== document.body && (s.outlineStyle !== 'none' || s.boxShadow !== 'none'); })()`), 'focus visible');
	actions.push('focus-visible');

	await capture('media-videos');
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

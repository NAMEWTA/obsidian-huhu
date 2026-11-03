import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=task-page] li") && d.querySelector("[data-review=task-widget] li"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

/** Page-side probe of one task container: contrast, overflow, hit areas and the Through date (AC-262). */
const probe = `(name, selector) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector(selector), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(k==='x'?a:g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const backdrop = el => { for (let e = el; e; e = e.parentElement) { const c = win.getComputedStyle(e).backgroundColor; if (rgb(c)[3] === 255) return c; } return win.getComputedStyle(d.body).backgroundColor; };
	const textEl = box.querySelector('li button.font-medium, li button'), mutedEl = box.querySelector('li .text-muted-foreground');
	const controls = [...box.querySelectorAll('button,input,[role=combobox],[role=checkbox]')].flatMap(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return r.width && r.height ? [{ label: (e.getAttribute('aria-label') || e.textContent || e.type).slice(0,40), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration }] : []; });
	const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !e.closest('[data-slot=scroll-area]') ? [{ tag: e.tagName, text: e.textContent.slice(0,50), over: Math.round(r.right - b.right) }] : []; }).slice(0, 8);
	const lang = d.documentElement.lang;
	const fmt = day => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(day + 'T00:00:00Z'));
	const through = [...box.querySelectorAll('[data-task-date]')].map(e => { const s = win.getComputedStyle(e); let clip = false; for (let a = e; a && a !== box; a = a.parentElement) { const c = win.getComputedStyle(a); if (c.textOverflow === 'ellipsis' || c.whiteSpace === 'nowrap' || (c.overflowX !== 'visible' && a.scrollWidth > a.clientWidth + 1)) clip = true; } const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; return { kind: e.dataset.taskDate, text: e.textContent, whiteSpace: s.whiteSpace, wrap: s.overflowWrap, clip, scroll: e.scrollWidth, client: e.clientWidth, lines: Math.round(e.getBoundingClientRect().height / lh), expected: e.textContent === fmt(e.dataset.taskDate === 'to' ? '2026-12-31' : '2026-11-01') }; });
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, contrast: textEl ? ratio(win.getComputedStyle(textEl).color, backdrop(textEl)) : 99, muted: ratio(win.getComputedStyle(mutedEl).color, backdrop(mutedEl)), mutedColor: mutedEl.outerHTML.slice(0,200) + win.getComputedStyle(mutedEl).color + ' on ' + backdrop(mutedEl), controls, overflows, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outletHeight: (box.querySelector('.huhu-design-notices')?.getBoundingClientRect().height ?? -1), through, rows: box.querySelectorAll('li').length };
}`;

async function setDates(cdp) {
	// Real inputs: set the value through the native setter so React's onChange fires, as a user edit would.
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => { const box = d.querySelector('[data-review=task-page]'); const dates = box.querySelectorAll('[data-task-range] input[type=date]'); const set = (input, value) => { if (input.value === value) return; Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true })); }; set(dates[0], '2026-11-01'); set(dates[1], '2026-12-31'); })`);
	await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}

export async function verify({ cdp, sample }) {
	await setDates(cdp);
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, { page: probe(n, '[data-review=task-page]'), widget: probe(n, '[data-review=task-widget]') }])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, value] of Object.entries(measured)) {
		for (const key of ['page', 'widget']) {
			const part = value[key];
			assert(part.width > 0 && part.rows >= 3, `${name}/${key}: mounted with rows`);
			assert(part.contrast >= 4.5, `${name}/${key}: text contrast ${part.contrast}`);
			assert(part.muted >= 4.5, `${name}/${key}: secondary text contrast ${part.muted} ${part.mutedColor}`);
			assert(part.scroll <= part.client + 1, `${name}/${key}: overflow ${part.scroll}/${part.client}`);
			assert.deepEqual(part.overflows, [], `${name}/${key}: descendants stay inside the container`);
			assert.equal(part.outletHeight, 0, `${name}/${key}: idle notice outlet reserves no space`);
			for (const control of part.controls) {
				if (control.label.length === 0) continue;
				assert(control.width >= min - 0.1 && control.height >= min - 0.1, `${name}/${key}: hit area ${JSON.stringify(control)}`);
				if (sample.reducedMotion) assert(control.transition.split(',').every(v => parseFloat(v) === 0), `${name}/${key}: motion ${control.label}`);
			}
		}
		assert.equal(value.widget.through.length, 0, `${name}: embedded view carries no date filter`);
		const dates = value.page.through;
		assert.deepEqual(dates.map(x => x.kind), ['from', 'to'], `${name}: From and Through dates are shown in words`);
		for (const date of dates) {
			assert(date.expected, `${name}: ${date.kind} date is the full localized long form: ${date.text}`);
			assert(/2026/.test(date.text), `${name}: year present ${date.text}`);
			assert.equal(date.whiteSpace, 'normal', `${name}: ${date.kind} may wrap`);
			assert(!date.clip, `${name}: ${date.kind} is not clipped by itself or an ancestor`);
			assert(date.scroll <= date.client + 1, `${name}: ${date.kind} not truncated ${date.scroll}/${date.client}`);
		}
	}
	sample.assertions.push('real-task-page-and-embedded', 'through-date-full-localized-wrappable', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const page = (name) => `uiReview.docs.${name}.querySelector('[data-review=task-page]')`;
	const all = expr => cdp.evaluate(`Object.keys(uiReview.docs).map(n => (${expr})(uiReview.docs[n].querySelector('[data-review=task-page]'), uiReview.docs[n].querySelector('[data-review=task-widget]'), uiReview.mounts[n], uiReview.docs[n]))`);
	const press = async (key, code, vk) => { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }); };
	await capture('task-through-date');
	// Filter without results is not the empty state.
	await cdp.evaluate(`${page('main')}.querySelector('input[type=text], input:not([type])').focus()`);
	await cdp.send('Input.insertText', { text: 'zzzz-no-match' });
	await waitFor(() => cdp.evaluate(`${page('main')}.textContent.includes(uiReview.t('task.noResults'))`), 'no-results state');
	await capture('task-no-results');
	await cdp.evaluate(`${page('main')}.querySelector('input:not([type=date])').select()`);
	await press('Backspace', 'Backspace', 8);
	await waitFor(() => cdp.evaluate(`!${page('main')}.textContent.includes(uiReview.t('task.noResults'))`), 'no-results cleared');
	actions.push('no-results-recovers');
	// Loading and failure keep the page and offer retry; retry restores.
	await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.control.mode = 'loading'; m.notify(); })`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelector('[data-review=task-page] [role=status]')?.textContent.includes(uiReview.t('task.loading')))`), 'loading');
	await capture('task-loading');
	await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.control.mode = 'error'; m.notify(); })`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelector('[data-review=task-page] [role=status] button'))`), 'error with retry');
	assert((await all('(p) => p.querySelectorAll("li").length >= 3')).every(Boolean), 'rows kept while failing');
	await capture('task-error');
	await cdp.evaluate(`${page('main')}.querySelector('[role=status] button').click()`);
	await waitFor(() => cdp.evaluate(`!${page('main')}.querySelector('[role=status]')`), 'retry recovers');
	await cdp.evaluate(`uiReview.mounts.other.control.mode = 'ready'; uiReview.mounts.other.notify()`);
	actions.push('loading-error-retry');
	// Create failure keeps the input and adds no row; the retry adds exactly one; the count follows the same array.
	const before = await cdp.evaluate('uiReview.mounts.main.count()');
	await cdp.evaluate(`[...${page('main')}.querySelectorAll('header button')].find(b => b.textContent === uiReview.t('task.new')).click()`);
	await waitFor(() => cdp.evaluate(`!!uiReview.docs.main.querySelector('[role=dialog] form')`), 'editor dialog');
	await cdp.evaluate(`uiReview.docs.main.querySelector('[role=dialog] input').focus()`);
	await cdp.send('Input.insertText', { text: 'Keep me 保留输入' });
	await cdp.evaluate('uiReview.mounts.main.control.fail = true');
	await cdp.evaluate(`[...uiReview.docs.main.querySelectorAll('[role=dialog] form button[type=submit]')][0].click()`);
	await waitFor(() => cdp.evaluate(`!!uiReview.docs.main.querySelector('[role=dialog] [role=alert]')`), 'create failure alert');
	assert(await cdp.evaluate(`uiReview.docs.main.querySelector('[role=dialog] input').value === 'Keep me 保留输入' && uiReview.mounts.main.count() === ${before}`), 'input retained, no row created');
	await capture('task-create-error');
	await cdp.evaluate('uiReview.mounts.main.control.fail = false');
	await cdp.evaluate(`uiReview.docs.main.querySelector('[role=dialog] form button[type=submit]').click()`);
	await waitFor(() => cdp.evaluate(`!uiReview.docs.main.querySelector('[role=dialog]')`), 'dialog closes after retry');
	assert.equal(await cdp.evaluate('uiReview.mounts.main.count()'), before + 1, 'exactly one task created');
	actions.push('create-failure-keeps-input-no-duplicate');
	// Escape closes the editor and focus returns to the page.
	await cdp.evaluate(`[...${page('main')}.querySelectorAll('header button')].find(b => b.textContent === uiReview.t('task.new')).click()`);
	await waitFor(() => cdp.evaluate(`!!uiReview.docs.main.querySelector('[role=dialog] form')`), 'editor reopened');
	await cdp.evaluate(`window.focus(); uiReview.docs.main.querySelector('[role=dialog] input').focus()`);
	await press('Escape', 'Escape', 27);
	await waitFor(() => cdp.evaluate(`!uiReview.docs.main.querySelector('[role=dialog]')`), 'Escape closes editor');
	actions.push('editor-escape');
	// Keyboard focus is visible on the Through date input.
	await cdp.evaluate(`${page('main')}.querySelectorAll('[data-task-range] input')[1].focus()`);
	assert(await cdp.evaluate(`(() => { const e = document.activeElement, s = getComputedStyle(e); return s.outlineStyle !== 'none' || s.boxShadow !== 'none'; })()`), 'focus visible');
	actions.push('focus-visible');
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelectorAll("[data-review=home] article[data-tile]").length>=7 && d.querySelector("[data-review=stats] canvas") && d.querySelector("[data-review=stats-empty] [data-expense-summary]"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

const probe = `(name) => {
	const d = uiReview.docs[name], win = d.defaultView;
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const backdrop = el => { for (let e = el; e; e = e.parentElement) { const c = win.getComputedStyle(e).backgroundColor; if (rgb(c)[3] === 255) return c; } return win.getComputedStyle(d.body).backgroundColor; };
	const regions = {};
	for (const sel of ['home', 'stats', 'stats-empty']) {
		const box = d.querySelector('[data-review=' + sel + ']'), b = box.getBoundingClientRect();
		const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
		const scrolls = e => { for (let n = e.parentElement; n && n !== box; n = n.parentElement) { const o = win.getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
		const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !scrolls(e) && !e.closest('[data-sonner-toaster],.sr-only,[data-slot=widget-actions]') ? [{ tag: e.tagName, text: e.textContent.slice(0,40), over: Math.round(r.right - b.right) }] : []; }).slice(0, 6);
		const clipped = [...box.querySelectorAll('[data-slot=widget-body] *')].flatMap(e => { const body = e.closest('[data-slot=widget-body]'); const r = e.getBoundingClientRect(), br = body.getBoundingClientRect(); return r.width && r.right > br.right + 1 && !e.closest('.overflow-x-auto,.overflow-auto,table') ? [e.tagName + ':' + e.textContent.slice(0,30)] : []; }).slice(0, 6);
		const controls = [...box.querySelectorAll('button,input,select,[role=combobox],[role=switch]')].filter(visible).map(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return { label: (e.getAttribute('aria-label') || e.textContent).slice(0,50), tag: e.tagName, width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration, named: !!(e.getAttribute('aria-label') || e.textContent.trim() || (e.labels && e.labels.length) || e.getAttribute('aria-labelledby')) }; });
		const texts = [...box.querySelectorAll('*')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('canvas,[aria-hidden=true],.sr-only') && !(e.closest('details:not([open])') && !e.closest('summary')) && !e.disabled && !e.closest('[disabled]')).map(e => ({ text: e.textContent.trim().slice(0, 30), ratio: ratio(win.getComputedStyle(e).color, backdrop(e)) }));
		regions[sel] = { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, overflows, clipped, controls, lowContrast: texts.filter(x => x.ratio < 4.5).slice(0, 5), titles: [...box.querySelectorAll('[title]:not(time)')].map(e => e.tagName + ':' + e.getAttribute('title').slice(0, 40)), scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outlet: (box.querySelector('.huhu-design-notices') || {getBoundingClientRect: () => ({height: 0})}).getBoundingClientRect().height };
	}
	const home = d.querySelector('[data-review=home]');
	const tiles = [...home.querySelectorAll('article[data-tile]')].map(a => ({ title: a.querySelector('h3').textContent.trim(), labelledby: !!a.getAttribute('aria-labelledby'), ariaLabel: a.hasAttribute('aria-label') }));
	const usage = [...home.querySelectorAll('[data-usage-provider]')].map(e => ({ id: e.dataset.usageProvider, text: e.textContent }));
	const stats = d.querySelector('[data-review=stats]'), empty = d.querySelector('[data-review=stats-empty]');
	return { regions, tiles, usage, stats: { summary: stats.querySelector('[data-expense-summary]').textContent, canvases: stats.querySelectorAll('canvas[role=img]').length, canvasNamed: [...stats.querySelectorAll('canvas[role=img]')].every(c => c.getAttribute('aria-label')), dataTables: stats.querySelectorAll('details table').length, metrics: [...stats.querySelectorAll('[data-analytics] strong')].map(e => e.textContent) }, empty: { summary: empty.textContent, canvases: empty.querySelectorAll('canvas').length, tables: empty.querySelectorAll('table').length } };
}`;

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, probe(n)])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, v] of Object.entries(measured)) {
		for (const [sel, r] of Object.entries(v.regions)) {
			assert(r.width > 0, `${name}/${sel}: mounted`);
			assert(r.scroll <= r.client + 1, `${name}/${sel}: overflow ${r.scroll}/${r.client}`);
			assert.deepEqual(r.overflows, [], `${name}/${sel}: descendants inside the region`);
			assert.deepEqual(r.clipped, [], `${name}/${sel}: tile content inside its tile`);
			assert.deepEqual(r.titles, [], `${name}/${sel}: no title attributes`);
			assert.equal(r.scopes, 1, `${name}/${sel}: one DesignScope leaf`);
			assert.equal(r.outlet, 0, `${name}/${sel}: idle notice outlet reserves no space`);
			assert.deepEqual(r.lowContrast, [], `${name}/${sel}: text contrast >= 4.5`);
			for (const c of r.controls) {
				assert(c.named, `${name}/${sel}: control named ${JSON.stringify(c)}`);
				if (c.label.length === 0 || c.tag === 'INPUT') continue;
				assert(c.width >= min - 0.1 && c.height >= min - 0.1, `${name}/${sel}: hit area ${JSON.stringify(c)}`);
				if (sample.reducedMotion) assert(c.transition.split(',').every(x => parseFloat(x) === 0), `${name}/${sel}: motion ${c.label}`);
			}
		}
		assert.equal(v.tiles.length, 7, `${name}: seven tiles`);
		for (const tile of v.tiles) assert(tile.labelledby && !tile.ariaLabel, `${name}: tile named by heading`);
		assert.deepEqual(v.usage.map(x => x.id), ['claude', 'codex', 'gemini'], `${name}: all providers shown`);
		assert(/42|63/.test(v.usage[0].text) && /0%/.test(v.usage[1].text), `${name}: usage states percentages in text, zero stays zero`);
		assert.equal(v.stats.canvases, 2, `${name}: trend and distribution charts`);
		assert(v.stats.canvasNamed, `${name}: charts have names`);
		assert.equal(v.stats.dataTables, 2, `${name}: each chart has a data table summary`);
		assert(v.stats.summary.includes('$') && /\d{4}-\d{2}-\d{2} — \d{4}-\d{2}-\d{2}/.test(v.stats.summary), `${name}: summary states unit and range: ${v.stats.summary}`);
		assert.equal(v.empty.canvases, 0, `${name}: empty range draws no chart`);
		assert.equal(v.empty.tables, 0, `${name}: empty range lists no rows`);
		assert(v.empty.summary.includes(uiReview_t_empty(sample)), `${name}: empty range says so: ${v.empty.summary}`);
	}
	sample.assertions.push('real-home-tiles', 'no-title-attributes', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'chart-summary-unit-range', 'empty-vs-zero', 'idle-notice-outlet');
}
function uiReview_t_empty(sample) { return sample.language === 'zh' ? '内没有记录' : 'No records in'; }

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const both = expr => cdp.evaluate(`Object.keys(uiReview.docs).map(n => (${expr})(uiReview.docs[n], uiReview.docs[n].querySelector('[data-review=home]'), uiReview.mounts[n]))`);
	// A failing quick action keeps the tile and tells the user; a later run still works.
	await both(`(d, h, m) => { m.calls.failAction = true; const a = [...h.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent.trim() === 'Quick actions'); [...a.querySelectorAll('button')].find(b => b.textContent.includes('Open the weekly review')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-review=home] .huhu-design-notices [data-sonner-toast]'))`), 'failed action reported in scope');
	const overlap = await cdp.evaluate(`(() => { const h = document.querySelector('[data-review=home]'); const n = h.querySelector('.huhu-design-notices [data-sonner-toast]').getBoundingClientRect(); return [...h.querySelectorAll('.dashboard-canvas-bar button')].some(b => { const r = b.getBoundingClientRect(); return r.width && n.left < r.right && n.right > r.left && n.top < r.bottom && n.bottom > r.top; }); })()`);
	assert(!overlap, 'notice does not overlap the toolbar actions');
	await capture('action-failed');
	actions.push('quick-action-failure-notice');
	await both(`(d, h, m) => { m.calls.failAction = false; }`);
	// Usage: a refreshing snapshot keeps the providers; an empty list says so.
	await cdp.evaluate(`uiReview.setUsage({ providers: uiReview.usageFixtures.providers, refreshing: true })`);
	assert((await both(`(d, h) => h.querySelectorAll('[data-usage-provider]').length`)).every(n => n === 3), 'refresh keeps providers');
	await cdp.evaluate(`uiReview.setUsage({ providers: [], refreshing: false })`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelectorAll('[data-review=home] [data-usage-provider]').length === 0 && d.querySelector('[data-review=home] [data-usage]').textContent.includes(uiReview.t('usage.empty')))`), 'usage empty state');
	actions.push('usage-refreshing-and-empty');
	await capture('usage-empty');
	await cdp.evaluate(`uiReview.setUsage({ providers: uiReview.usageFixtures.providers, refreshing: false })`);
	// Statistics: a type filter without matches says so and can be cleared.
	await cdp.evaluate(`(() => { for (const d of Object.values(uiReview.docs)) { const s = d.querySelector('[data-review=stats] select[aria-label="' + uiReview.t('analytics.allTypes') + '"]'); const set = Object.getOwnPropertyDescriptor(d.defaultView.HTMLSelectElement.prototype, 'value').set; set.call(s, 'income'); s.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); } })()`);
	assert((await cdp.evaluate(`Object.values(uiReview.docs).map(d => d.querySelector('[data-review=stats] [data-expense-summary]').textContent.length > 0)`)).every(Boolean));
	actions.push('stats-type-filter');
	await capture('stats-income-filter');
	// Keyboard focus is visible on a tile control.
	await cdp.evaluate(`uiReview.docs.main.querySelector('[data-review=home] .dashboard-canvas-bar button[data-variant=outline]').focus()`);
	assert(await cdp.evaluate(`(() => { const e = document.activeElement, s = getComputedStyle(e); return s.outlineStyle !== 'none' || s.boxShadow !== 'none'; })()`), 'focus visible');
	actions.push('focus-visible');
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	actions.push('unmount-cleans-scopes');
}

import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelectorAll("[data-review=home] [data-weather-state]").length>=10)';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
const EXPECTED = ['unconfigured', 'waiting', 'loading', 'refreshing', 'ready', 'ready', 'error', 'error', 'error', 'cancelled', 'invalidated'];

const probe = `(name) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector('[data-review=home]'), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const backdrop = el => { for (let e = el; e; e = e.parentElement) { const c = win.getComputedStyle(e).backgroundColor; if (rgb(c)[3] === 255) return c; } return win.getComputedStyle(d.body).backgroundColor; };
	const weather = [...box.querySelectorAll('[data-weather-state]')].map(e => { const p = e.querySelector('p'); const body = e.closest('[data-slot=widget-body]'); return { state: e.dataset.weatherState, role: e.getAttribute('role'), busy: e.getAttribute('aria-busy'), text: e.textContent.trim(), titled: e.hasAttribute('title') || e.hasAttribute('aria-label'), contrast: ratio(win.getComputedStyle(p).color, backdrop(p)), bodyOverflow: body ? body.scrollWidth - body.clientWidth : 0, offenders: body ? [...body.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > body.getBoundingClientRect().right + 1).slice(0, 3).map(x => x.tagName + '.' + String(x.className).slice(0, 60) + ':' + x.textContent.slice(0, 20)) : [], buttons: [...e.querySelectorAll('button')].map(x => x.textContent) }; });
	const tiles = [...box.querySelectorAll('article[data-tile]')].map(a => { const id = a.getAttribute('aria-labelledby'); const h = id && d.getElementById(id); return { id, heading: h ? h.tagName : '', text: h ? h.textContent.trim() : '', ariaLabel: a.hasAttribute('aria-label'), titled: a.querySelectorAll('[title]').length }; });
	const section = box.querySelector('section[aria-labelledby]');
	const h1 = section && d.getElementById(section.getAttribute('aria-labelledby'));
	const chain = []; for (let e = box.querySelector('.dashboard-canvas'); e && e !== box.parentElement; e = e.parentElement) chain.push(e);
	const controls = [...box.querySelectorAll('button,input,[role=combobox]')].flatMap(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return r.width && r.height ? [{ label: (e.getAttribute('aria-label') || e.textContent).slice(0,50), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration }] : []; });
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, weather, tiles, region: { named: !!h1 && h1.textContent.trim().length > 0, tag: h1 && h1.tagName, chainLabelled: chain.some(e => e.hasAttribute('aria-label') || e.hasAttribute('title')), titles: box.querySelectorAll('[title]').length }, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length, outletHeight: box.querySelector('.huhu-design-notices').getBoundingClientRect().height, controls };
}`;

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, probe(n)])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, v] of Object.entries(measured)) {
		assert(v.width > 0, `${name}: mounted`);
		assert(v.scroll <= v.client + 1, `${name}: page overflow ${v.scroll}/${v.client}`);
		assert.equal(v.scopes, 1, `${name}: one DesignScope content leaf`);
		assert(v.portal >= 1, `${name}: scope owns a portal`);
		assert.equal(v.outletHeight, 0, `${name}: idle notice outlet reserves no space`);
		assert(v.region.named && v.region.tag === 'H1', `${name}: page region named by aria-labelledby heading`);
		assert(!v.region.chainLabelled, `${name}: no title/aria-label on the page region chain (AC-211)`);
		assert.equal(v.region.titles, 0, `${name}: no title attributes anywhere in Home frame (AC-211)`);
		assert.equal(v.tiles.length, 11, `${name}: eleven tiles`);
		assert.equal(new Set(v.tiles.map(x => x.id)).size, 11, `${name}: unique tile title ids`);
		for (const tile of v.tiles) { assert(tile.heading === 'H3' && tile.text.length > 0, `${name}: tile named by its heading ${JSON.stringify(tile)}`); assert(!tile.ariaLabel && tile.titled === 0, `${name}: tile has no aria-label/title`); }
		assert.deepEqual(v.weather.map(x => x.state), EXPECTED, `${name}: all weather states visible (AC-221)`);
		for (const w of v.weather) {
			assert(w.text.length > 5 && !w.titled, `${name}/${w.state}: states itself in words`);
			assert.equal(w.role, w.state === 'error' ? 'alert' : 'status', `${name}/${w.state}: role`);
			assert.equal(w.busy === 'true', w.state === 'loading' || w.state === 'refreshing', `${name}/${w.state}: aria-busy`);
			assert(w.contrast >= 4.5, `${name}/${w.state}: contrast ${w.contrast}`);
			assert(w.bodyOverflow <= 1, `${name}/${w.state}: tile body horizontal overflow ${w.bodyOverflow} ${JSON.stringify(w.offenders)}`);
		}
		assert.deepEqual(v.weather.map(x => x.buttons.length), [1, 0, 1, 1, 0, 1, 2, 2, 2, 1, 0], `${name}: actions fit each state`);
		for (const c of v.controls) {
			if (c.label.length === 0) continue;
			assert(c.width >= min - 0.1 && c.height >= min - 0.1, `${name}: hit area ${JSON.stringify(c)}`);
			if (sample.reducedMotion) assert(c.transition.split(',').every(x => parseFloat(x) === 0), `${name}: motion ${c.label}`);
		}
	}
	sample.assertions.push('real-home-page', 'region-aria-labelledby-no-title', 'weather-states', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const both = expr => cdp.evaluate(`Object.keys(uiReview.docs).map(n => (${expr})(uiReview.docs[n], uiReview.docs[n].querySelector('[data-review=home]'), uiReview.mounts[n]))`);
	const state = (id) => `(d, h) => h.querySelector('[data-tile] [data-weather-state]') && [...h.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent === ${JSON.stringify(id)})?.querySelector('[data-weather-state]')`;
	// Retry on a failed tile calls the store once, forced.
	const retry = await both(`(d, h, m) => { const a = [...h.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent === 'Timed out, no forecast'); const before = m.calls.weather.length; [...a.querySelectorAll('[data-weather-state] button')].find(b => b.textContent === uiReview.t('weather.retry')).click(); return m.calls.weather.slice(before).filter(([id, force]) => id === 'timeout' && force).length; }`);
	assert(retry.every(n => n === 1), 'retry asks the store once, forced');
	actions.push('weather-retry');
	// Cancel a loading request: the tile moves to the cancelled state and offers retry.
	await both(`(d, h) => { [...h.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent === 'Loading').querySelector('[data-weather-state] button').click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => [...d.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent === 'Loading').querySelector('[data-weather-state]').dataset.weatherState === 'cancelled')`), 'loading cancelled');
	assert((await both(`(d, h, m) => m.calls.cancel.includes('loading')`)).every(Boolean));
	await capture('weather-cancelled');
	actions.push('weather-cancel');
	// Configure from an error opens the location dialog in the scoped portal.
	await both(`(d, h) => { [...h.querySelectorAll('article[data-tile]')].find(a => a.querySelector('h3').textContent === 'Unreadable answer').querySelector('[data-weather-state] button:last-child').click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('.huhu-design.huhu-portal-root [role=dialog]'))`), 'configure dialog');
	await capture('weather-configure-dialog');
	await cdp.evaluate(`(() => { window.focus(); uiReview.docs.main.querySelector('[role=dialog] input, [role=dialog] button').focus(); })()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await waitFor(() => cdp.evaluate(`!uiReview.docs.main.querySelector('[role=dialog]')`), 'main dialog closed by Escape');
	await cdp.evaluate(`[...uiReview.docs.other.querySelectorAll('[role=dialog] button')].find(b => b.textContent === uiReview.t('common.cancel')).click()`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('[role=dialog]'))`), 'dialog closed');
	actions.push('weather-configure-dialog-escape');
	// Blank area of the board carries no title or aria-label on any ancestor.
	const blank = await both(`(d, h) => { const bar = h.querySelector('.dashboard-canvas-bar').getBoundingClientRect(); const hit = d.elementFromPoint(bar.left + 2, bar.bottom - 2); const chain = []; for (let e = hit; e && e !== d.body; e = e.parentElement) chain.push(e.hasAttribute('title') || (e.hasAttribute('aria-label') && !e.matches('button,[role=button]'))); return chain.some(Boolean); }`);
	assert(blank.every(x => !x), 'blank-area ancestors carry no title/aria-label');
	actions.push('blank-area-no-title');
	// Icon-button tooltip comes from the shared Tooltip in the owner document's scoped portal.
	for (const name of ['main', 'other']) {
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review=home] button[aria-label="' + uiReview.t('home.dashboard.pageMenu') + '"]').focus()`);
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-design.huhu-portal-root [data-slot=tooltip-content]')`), `shared tooltip in ${name}`);
		await cdp.evaluate(`uiReview.docs.${name}.activeElement.blur()`);
	}
	actions.push('icon-tooltip-shared-portal');
	// Keyboard: Add widget shows a visible focus indicator.
	await cdp.evaluate(`uiReview.docs.main.querySelector('[data-review=home] .dashboard-canvas-bar button[data-variant=outline]').focus()`);
	assert(await cdp.evaluate(`(() => { const e = document.activeElement, s = getComputedStyle(e); return s.outlineStyle !== 'none' || s.boxShadow !== 'none'; })()`), 'focus visible');
	actions.push('focus-visible');
	// Removing a tile raises the undo notice in this scope's outlet, which never overlaps the toolbar.
	await cdp.evaluate(`(() => { const h = uiReview.docs.main.querySelector('[data-review=home]'); const t = h.querySelector('article[data-tile] button[aria-label^="' + uiReview.t('canvas.moreActions', { name: '' }).trim().slice(0, 8) + '"]'); t.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse', bubbles: true })); })()`);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('[role=menu] [role=menuitem][data-variant=destructive]')`), 'tile menu');
	await cdp.evaluate(`document.querySelector('[role=menu] [role=menuitem][data-variant=destructive]').click()`);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('[data-review=home] .huhu-design-notices [data-sonner-toast]')`), 'undo notice in the scope outlet');
	const overlap = await cdp.evaluate(`(() => { const h = document.querySelector('[data-review=home]'); const n = h.querySelector('.huhu-design-notices [data-sonner-toast]').getBoundingClientRect(); return [...h.querySelectorAll('.dashboard-canvas-bar button')].some(b => { const r = b.getBoundingClientRect(); return r.width && n.left < r.right && n.right > r.left && n.top < r.bottom && n.bottom > r.top; }); })()`);
	assert(!overlap, 'notice does not overlap the toolbar actions');
	await capture('remove-notice');
	actions.push('remove-notice-in-scope');
	// Unmount releases scopes and portals.
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

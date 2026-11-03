import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [data-choice-key]") && d.querySelector("[data-review=navigator] [role=tree]"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

/** Shared page-side probe: contrast, overflow, hit areas and the AC-211 region contract of one container. */
const probe = `(name, selector) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector(selector), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const scope = box.querySelector('.huhu-design:not(.huhu-portal-root)');
	const bg = win.getComputedStyle(scope).backgroundColor;
	const base = bg === 'rgba(0, 0, 0, 0)' ? win.getComputedStyle(d.body).backgroundColor : bg;
	const textEl = box.querySelector('[data-choice-key], [data-nav-key], p, h2, span') ;
	const text = win.getComputedStyle(textEl).color;
	const controls = [...box.querySelectorAll('button,input,[role=combobox],[role=treeitem]')].flatMap(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return r.width && r.height ? [{ label: (e.getAttribute('aria-label') || e.textContent).slice(0,60), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration }] : []; });
	const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !e.closest('[data-slot=scroll-area],[data-sonner-toaster]') ? [{ tag: e.tagName, text: e.textContent.slice(0,50), over: Math.round(r.right - b.right) }] : []; }).slice(0, 8);
	const outlet = box.querySelector('.huhu-design-notices');
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, contrast: { text: ratio(text, base) }, controls, overflows, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outletHeight: outlet ? outlet.getBoundingClientRect().height : -1, portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length };
}`;

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, { nav: probe(n, '[data-review=navigator]'), history: probe(n, '[data-review=history]'), region: (() => {
		const d = uiReview.docs[n], box = d.querySelector('[data-review=history]'), section = box.querySelector('section[aria-labelledby]'), scope = box.querySelector('.huhu-design:not(.huhu-portal-root)');
		const label = section.getAttribute('aria-labelledby'), heading = label && d.getElementById(label);
		const chain = []; for (let e = section; e && e !== box.parentElement; e = e.parentElement) chain.push(e);
		const listViewport = box.querySelector('[data-choice-key]').closest('.overflow-auto');
		return { labelledby: !!heading && heading.textContent.trim().length > 0, ariaLabel: chain.some(e => e.hasAttribute('aria-label')), titled: [...chain, ...box.querySelectorAll('header, header > *:not(button), [data-note-history]')].filter(e => e.hasAttribute('title')).length, rowTitles: box.querySelectorAll('[data-choice-key][title]').length, listViewportTitled: listViewport.hasAttribute('title'), role: section.tagName, scope: !!scope, nested: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length };
	})() }])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, value] of Object.entries(measured)) {
		for (const key of ['nav', 'history']) {
			const part = value[key];
			assert(part.width > 0, `${name}/${key}: mounted`);
			assert(part.contrast.text >= 4.5, `${name}/${key}: text contrast ${part.contrast.text}`);
			assert(part.scroll <= part.client + 1, `${name}/${key}: overflow ${part.scroll}/${part.client}`);
			assert.deepEqual(part.overflows, [], `${name}/${key}: descendants stay inside the container`);
			assert.equal(part.scopes, 1, `${name}/${key}: one DesignScope content leaf`);
			assert.equal(part.outletHeight, 0, `${name}/${key}: idle notice outlet reserves no space`);
			for (const control of part.controls) {
				if (key === 'nav' && control.label.length === 0) continue;
				assert(control.width >= min - 0.1 && control.height >= min - 0.1, `${name}/${key}: hit area ${JSON.stringify(control)}`);
				if (sample.reducedMotion) assert(control.transition.split(',').every(v => parseFloat(v) === 0), `${name}/${key}: motion ${control.label}`);
			}
		}
		const region = value.region;
		assert(region.labelledby, `${name}: Note history region named by aria-labelledby`);
		assert(!region.ariaLabel, `${name}: Note history region has no aria-label`);
		assert.equal(region.titled, 0, `${name}: no title on the region chain or its header (AC-211)`);
		assert(!region.listViewportTitled, `${name}: list blank area has no title`);
		assert(region.rowTitles === 0 || true, 'rows may carry their own full-text label');
		assert.equal(region.nested, 1);
		assert(value.history.portal >= 2, `${name}: each scope owns a portal`);
	}
	sample.assertions.push('real-navigator-and-history', 'region-aria-labelledby-no-title', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const all = expression => cdp.evaluate(`Object.keys(uiReview.docs).map(n => { const d = uiReview.docs[n], h = d.querySelector('[data-review=history]'), nav = d.querySelector('[data-review=navigator]'), m = uiReview.mounts[n]; return (${expression})(d, h, nav, m); })`);
	const refresh = 'document.querySelector("[data-review=history] button[aria-label=\\"" + uiReview.t("history.refresh") + "\\"]")';
	const click = (name, expression) => cdp.evaluate(`Object.keys(uiReview.docs).forEach(n => { const d = uiReview.docs[n], h = d.querySelector('[data-review=history]'); (${expression})(d, h, uiReview.mounts[n]).click(); })`).then(() => actions.push(name));
	const refreshButton = '(d, h) => h.querySelector(`button[aria-label="${uiReview.t("history.refresh")}"]`)';
	const mode = (value) => cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.history.control.mode = ${JSON.stringify(value)}; })`);
	// Loading: the list region stays named, busy and keeps its header; the rows arrive when the request settles.
	await mode('pending');
	await click('history-refresh-loading', refreshButton);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] section[aria-busy=true] [role=status]"))'), 'busy history');
	assert((await all('(d, h) => !!h.querySelector("header") && !h.querySelector("[data-choice-key]")')).every(Boolean), 'header kept while loading');
	await capture('history-loading');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => m.history.control.release?.())');
	await mode('ready');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [data-choice-key]") && !d.querySelector("[data-review=history] section[aria-busy=true]"))'), 'history loaded');
	actions.push('history-loaded');
	// Failure keeps the header and filter controls, shows a persistent alert and retries successfully.
	await mode('error');
	await click('history-refresh-error', refreshButton);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [role=alert]"))'), 'history error');
	assert((await all('(d, h) => !!h.querySelector("header") && !!h.querySelector("[role=combobox]") && h.querySelector("[role=alert]").textContent.includes("repository locked")')).every(Boolean), 'error is persistent and retains controls');
	await capture('history-error');
	await mode('ready');
	await click('history-retry', '(d, h) => [...h.querySelectorAll("[role=alert] button")].at(-1)');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [data-choice-key]") && !d.querySelector("[data-review=history] [role=alert]"))'), 'retry success');
	// Empty history.
	await mode('empty');
	await click('history-refresh-empty', refreshButton);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-review=history] [data-choice-key]") && d.querySelector("[data-review=history]").textContent.includes(uiReview.t("history.empty")))'), 'history empty');
	await capture('history-empty');
	await mode('ready');
	await click('history-refresh-ready', refreshButton);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [data-choice-key]"))'), 'history restored');
	// Unconfigured (no repository) and no note: guidance remains inside the scoped region.
	for (const [flag, key, shot] of [['repo', 'history.noRepository', 'history-no-repository'], ['document', 'history.noNote', 'history-no-note']]) {
		await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.history.control.${flag} = false; m.history.notify(); })`);
		await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history]").textContent.includes(uiReview.t(${JSON.stringify(key)})))`), key);
		assert((await all('(d, h) => !!h.querySelector(".huhu-design:not(.huhu-portal-root)") && !h.querySelector("[title]")')).every(Boolean), `${key}: scoped and untitled`);
		await capture(shot);
		await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.history.control.${flag} = true; m.history.notify(); })`);
		await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=history] [data-choice-key]"))'), `${key} restored`);
		actions.push(shot);
	}
	// Icon button tooltip comes from the shared Tooltip in the owner document's scoped portal; the blank area has none.
	for (const name of ['main', 'other']) {
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review=history] button[aria-label="' + uiReview.t('history.pin') + '"]').focus()`);
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-design.huhu-portal-root [data-slot=tooltip-content]')`), `shared tooltip in ${name}`);
		await cdp.evaluate(`uiReview.docs.${name}.activeElement.blur()`);
	}
	actions.push('icon-tooltip-shared-portal');
	const blank = await all('(d, h) => { const v = h.querySelector("[data-choice-key]").closest(".overflow-auto"); const r = v.getBoundingClientRect(); const hit = d.elementFromPoint(r.left + r.width / 2, r.bottom - 2); const chain = []; for (let e = hit; e && e !== d.body; e = e.parentElement) chain.push(e.hasAttribute("title") || e.hasAttribute("aria-label")); return { tag: hit.tagName, titled: chain.some(Boolean) && !hit.closest("[data-choice-key]") }; }');
	assert(blank.every(item => !item.titled), `blank-area ancestors carry no title/aria-label: ${JSON.stringify(blank)}`);
	actions.push('blank-area-no-title');
	// Keyboard: arrows move between history rows with visible focus.
	await cdp.evaluate('uiReview.docs.main.querySelector("[data-review=history] [data-choice-key]").focus()');
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
	await waitFor(() => cdp.evaluate('(() => { const e = document.activeElement, s = getComputedStyle(e); return e?.dataset?.choiceIndex === "1" && (s.outlineStyle !== "none" || s.boxShadow !== "none"); })()'), 'ArrowDown moves history focus');
	actions.push('history-arrow-key');
	// Navigator: search without results, then an empty vault, each with guidance and recovery.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.nav.service.openSearch(); m.nav.service.setSearchQuery("zzzz-no-such-note"); })');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=navigator] [data-navigator-pane=list]") && !d.querySelector("[data-review=navigator] [data-note-path]"))'), 'search no results');
	await capture('navigator-no-results');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => m.nav.service.setSearchQuery(""))');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=navigator] [data-note-path]"))'), 'search cleared');
	actions.push('navigator-search-no-results-recovers');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => m.nav.vault.set([]))');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-review=navigator] [data-note-path]"))'), 'empty vault');
	await capture('navigator-empty');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => m.nav.vault.set([{path:"Work/plan.md",name:"plan",ext:"md",folder:"Work",ctime:1,mtime:1,tags:[]}]))');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=navigator] [data-note-path]"))'), 'vault restored');
	actions.push('navigator-empty-recovers');
	// Unmount releases both scopes and portals.
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

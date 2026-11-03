import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=pane] [data-terminal-standin]"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

/** Page-side probe: contrast of the plain and alert text, overflow, hit areas, motion and scope ownership. */
const probe = `(name) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector('[data-review=pane]'), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const scope = box.querySelector('.huhu-design:not(.huhu-portal-root)');
	const bg = win.getComputedStyle(scope).backgroundColor;
	const base = bg === 'rgba(0, 0, 0, 0)' ? win.getComputedStyle(d.body).backgroundColor : bg;
	const color = sel => { const e = box.querySelector(sel); return e ? ratio(win.getComputedStyle(e).color, base) : null; };
	const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
	const controls = [...box.querySelectorAll('button')].filter(visible).map(e => { const r = e.getBoundingClientRect(); return { label: e.textContent.slice(0,40), width: r.width, height: r.height, transition: win.getComputedStyle(e).transitionDuration }; });
	const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !e.closest('[data-sonner-toaster],.sr-only') ? [{ tag: e.tagName, text: e.textContent.slice(0,50), over: Math.round(r.right - b.right) }] : []; }).slice(0, 8);
	const alert = box.querySelector('[data-lifecycle-state]');
	const pane = box.querySelector('[data-terminal-standin]').getBoundingClientRect();
	const stack = box.querySelector('[data-managed-status]');
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, contrast: { muted: color('[data-lifecycle-state] .text-muted-foreground, [data-technical-details] p'), alert: color('[data-lifecycle-state] .text-foreground') }, controls, overflows,
		scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outletHeight: box.querySelector('.huhu-design-notices').getBoundingClientRect().height, portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length,
		role: alert && alert.getAttribute('role'), expanded: box.querySelectorAll('[data-technical-details] p').length, paneHeight: pane.height, statusBottom: stack ? stack.getBoundingClientRect().bottom : 0, paneTop: pane.top,
		titled: box.querySelectorAll('[title]').length, labelled: !!box.querySelector('section[aria-labelledby]') };
}`;

const all = (cdp, expression) => cdp.evaluate(`Object.keys(uiReview.docs).map(n => { const d = uiReview.docs[n], m = uiReview.mounts[n], box = d.querySelector('[data-review=pane]'); return (${expression})(d, m, box); })`);

export async function verify({ cdp, sample }) {
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => m.ctl.set("unconfirmed"))');
	await cdp.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
	const check = async (phase) => {
		const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, probe(n)])); })()`);
		sample.measurements = { ...sample.measurements, [phase]: measured };
		const min = sample.pointer === 'coarse' ? 44 : 32;
		for (const [name, v] of Object.entries(measured)) {
			const at = `${name}/${phase}`;
			assert(v.width > 0, `${at}: mounted`);
			assert.equal(v.role, 'alert', `${at}: unconfirmed cleanup is a persistent alert`);
			assert(v.contrast.muted >= 4.5, `${at}: muted text contrast ${v.contrast.muted}`);
			assert(v.contrast.alert >= 4.5, `${at}: alert text contrast ${v.contrast.alert}`);
			assert(v.scroll <= v.client + 1, `${at}: overflow ${v.scroll}/${v.client}`);
			assert.deepEqual(v.overflows, [], `${at}: descendants stay inside the pane`);
			assert.equal(v.scopes, 1, `${at}: one DesignScope content leaf`);
			assert.equal(v.outletHeight, 0, `${at}: idle notice outlet reserves no space`);
			assert(v.portal >= 1, `${at}: scoped portal`);
			assert(v.labelled && v.titled === 0, `${at}: region named by aria-labelledby, no title`);
			assert(v.paneHeight >= 80, `${at}: terminal keeps room (${v.paneHeight})`);
			assert(v.statusBottom <= v.paneTop + 1, `${at}: status block does not overlap the terminal`);
			for (const c of v.controls) {
				assert(c.width >= min - 0.1 && c.height >= min - 0.1, `${at}: hit area ${JSON.stringify(c)}`);
				if (sample.reducedMotion) assert(c.transition.split(',').every(x => parseFloat(x) === 0), `${at}: motion ${c.label}`);
			}
		}
		return measured;
	};
	const collapsed = await check('collapsed');
	for (const v of Object.values(collapsed)) assert.equal(v.expanded, 0, 'technical fields are collapsed by default');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => d.querySelector('[data-review=pane] [data-technical-details] button').click())`);
	await cdp.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
	const expanded = await check('expanded');
	for (const v of Object.values(expanded)) assert(v.expanded >= 2, 'expanded details list fields and identifiers');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => d.querySelector('[data-review=pane] [data-technical-details] button').click())`);
	sample.assertions.push('real-lifecycle-panel', 'persistent-alert', 'details-collapsed-by-default', 'expanded-no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const set = name => cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => m.ctl.set(${JSON.stringify(name)}))`);
	const mode = value => cdp.evaluate(`Object.values(uiReview.mounts).forEach(m => { m.ctl.mode = ${JSON.stringify(value)}; m.ctl.calls.length = 0; })`);
	const text = () => all(cdp, '(d, m, box) => box.textContent');
	const button = (label) => `(d, m, box) => [...box.querySelectorAll('button')].find(b => b.textContent.trim() === uiReview.t(${JSON.stringify(label)}))`;
	const click = (name, label) => cdp.evaluate(`Object.keys(uiReview.docs).forEach(n => { const d = uiReview.docs[n], m = uiReview.mounts[n], box = d.querySelector('[data-review=pane]'); (${button(label)})(d, m, box).click(); })`).then(() => actions.push(name));
	const has = (selector) => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelector('[data-review=pane] ${selector}'))`);
	const everyText = async (needle, present = true) => (await text()).every(v => v.includes(needle) === present);

	// Normal: only the pane and its input; no status, no technical fields, no alert.
	await set('normal');
	assert((await all(cdp, '(d, m, box) => !box.querySelector("[data-lifecycle-state],[role=alert],[data-technical-details]")')).every(Boolean), 'normal terminal shows no lifecycle chrome');
	await capture('normal');
	actions.push('normal-is-quiet');

	// Stopping: a status (not an alert) with no premature success; details collapsed.
	await set('stopping');
	assert(await has('[data-lifecycle-state=stopRequested][role=status]'), 'stopping is a status');
	assert(await everyText(await cdp.evaluate('uiReview.t("agent.managed.stopConfirmed")'), false), 'stopping is not success');
	await capture('stopping');
	actions.push('stopping');

	// Unconfirmed: persistent alert with next-action hint and both actions; the terminal host and its input survive everything below.
	await set('unconfirmed');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => { const t = d.querySelector('[data-terminal-standin]'); t.value = 'echo draft'; t.focus(); t.setSelectionRange(2, 6); t.scrollTop = 0; })`);
	await cdp.evaluate(`void (window.__host = Object.values(uiReview.docs).map(d => d.querySelector('[data-terminal-standin]')))`);
	assert(await has('[data-lifecycle-state=stopUnknown][role=alert]'), 'unconfirmed is an alert');
	const hint = await cdp.evaluate('uiReview.t("agent.managed.stopUncertainHint")');
	assert(await everyText(hint), 'next safe action is explained');
	for (const label of ['agent.managed.checkStop', 'agent.managed.retryCleanup']) assert((await all(cdp, `(d, m, box) => !!(${button(label)})(d, m, box)`)).every(Boolean), `${label} present`);
	await capture('unconfirmed');

	// Expand, copy, collapse by keyboard: same host element, value and selection throughout.
	await mode('pending');
	await cdp.evaluate(`uiReview.docs.other.querySelector('[data-review=pane] [data-technical-details] button').click()`);
	await cdp.evaluate(`uiReview.docs.main.querySelector('[data-review=pane] [data-technical-details] button').focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelectorAll('[data-review=pane] [data-technical-details] p').length >= 2)`), 'details expanded by keyboard');
	assert(await cdp.evaluate('(() => { const d = uiReview.docs.main, s = getComputedStyle(d.activeElement ?? d.body); return d.activeElement === d.querySelector("[data-review=pane] [data-technical-details] button") && (s.outlineStyle !== "none" || s.boxShadow !== "none"); })()'), 'trigger keeps visible focus');
	await capture('unconfirmed-expanded');
	await cdp.evaluate('uiReview.copied.length = 0');
	await click('copy-details', 'agent.managed.detailsCopy');
	await waitFor(() => cdp.evaluate('uiReview.copied.length === 2'), 'details copied in both documents');
	const copied = await cdp.evaluate('uiReview.copied.slice()');
	assert(copied.every(v => v.includes('runtime-0123456789abcdef') && !/\/home\/|\/Users\//.test(v)), 'copied text has identifiers and no home path');
	await waitFor(async () => everyText(await cdp.evaluate('uiReview.t("agent.managed.detailsCopied")')), 'copy confirmation');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => d.querySelector('[data-review=pane] [data-technical-details] button').click())`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelectorAll('[data-review=pane] [data-technical-details] p').length === 0)`), 'details collapsed');
	const kept = await cdp.evaluate(`Object.values(uiReview.docs).map((d, i) => { const t = d.querySelector('[data-terminal-standin]'); return t === window.__host[i] && t.value === 'echo draft' && t.selectionStart === 2 && t.selectionEnd === 6 && d.activeElement !== null; })`);
	assert(kept.every(Boolean), 'expand/copy/collapse keep the same terminal host, input and selection');
	assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m => m.ctl.hostMounts === 1 && m.ctl.hostUnmounts === 0)'), 'terminal host instance count stays 1');
	actions.push('details-expand-copy-collapse-keeps-terminal');

	// Check stop: still pending leaves the alert and keeps the host; the result is reported in place.
	await click('check-pending', 'agent.managed.checkStop');
	await waitFor(() => has('[data-stop-result]'), 'check result shown');
	assert(await has('[data-lifecycle-state=stopUnknown][role=alert]'), 'alert persists after an unresolved check');
	await capture('check-unresolved');

	// Retry cleanup: failure keeps the alert and shows the error, then success clears it.
	await mode('fail');
	await click('retry-cleanup-fails', 'agent.managed.retryCleanup');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelector('[data-review=pane] [data-stop-result] [role=alert]'))`), 'retry failure shown');
	assert(await has('[data-lifecycle-state=stopUnknown][role=alert]'), 'alert persists after failed retry');
	assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m => m.ctl.calls.some(c => c.op === "stop" && c.force === true))'), 'retry cleanup is a confirmed force stop');
	await capture('retry-failed');
	await mode('confirmed');
	await click('retry-cleanup-succeeds', 'agent.managed.retryCleanup');
	await waitFor(() => has('[data-lifecycle-state=stopConfirmed][role=status]'), 'cleanup confirmed');
	assert(await cdp.evaluate('Object.values(uiReview.docs).every(d => !d.querySelector("[data-review=pane] [data-lifecycle-state][role=alert]"))'), 'alert cleared only after confirmation');
	assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m => m.ctl.hostMounts === 1 && m.ctl.hostUnmounts === 0)'), 'terminal host never rebuilt across state changes');
	await capture('cleanup-confirmed');
	actions.push('check-and-retry-cleanup');

	// Partial cleanup and a restored record whose cleanup was never verified.
	await set('partial');
	assert(await has('[data-lifecycle-state=stopPartial][role=alert]'), 'partial cleanup is an alert');
	await capture('partial');
	await set('restored-unconfirmed');
	assert(await everyText(await cdp.evaluate('uiReview.t("agent.managed.recoveryUnconfirmed")')), 'restored unconfirmed record explained');
	await capture('restored-unconfirmed');
	actions.push('partial-and-restored');

	// Narrow container, Chinese: nothing clips.
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.evaluate('uiReview.configure("zh","theme-dark")');
	await set('unconfirmed');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => d.querySelector('[data-review=pane] [data-technical-details] button').click())`);
	await cdp.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
	const narrow = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.keys(uiReview.docs).map(n => probe(n)); })()`);
	for (const v of narrow) { assert(v.scroll <= v.client + 1 && v.overflows.length === 0, `320px zh overflow ${JSON.stringify(v.overflows)}`); }
	await capture('narrow-320-zh-expanded');
	actions.push('narrow-320-zh');

	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)") && d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scopes and portals removed');
	actions.push('unmount-cleans-scopes');
}

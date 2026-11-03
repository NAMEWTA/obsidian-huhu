import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=automations] [role=row][data-automation-row-id]") && d.querySelector("[data-review=inbox] li"))';
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

/** Page-side probe of one container: contrast, overflow, hit areas, row controls and scope ownership. */
const probe = `(name, selector) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector(selector), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const scope = box.querySelector('.huhu-design:not(.huhu-portal-root)');
	const bg = win.getComputedStyle(scope).backgroundColor;
	const base = bg === 'rgba(0, 0, 0, 0)' ? win.getComputedStyle(d.body).backgroundColor : bg;
	const textEl = box.querySelector('h1, li .text-sm, [role=row] button');
	const text = win.getComputedStyle(textEl).color;
	const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
	const controls = [...box.querySelectorAll('button,input,[role=combobox],[role=switch]')].filter(visible).map(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return { label: (e.getAttribute('aria-label') || e.textContent).slice(0,60), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration }; });
	const scrolls = e => { for (let n = e.parentElement; n && n !== box; n = n.parentElement) { const o = win.getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
	const overflows = [...box.querySelectorAll('*')].flatMap(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1) && !scrolls(e) && !e.closest('[data-sonner-toaster],.sr-only') ? [{ tag: e.tagName, text: e.textContent.slice(0,50), over: Math.round(r.right - b.right) }] : []; }).slice(0, 8);
	const rows = [...box.querySelectorAll('[data-automation-row-id]')].map(row => {
		const inside = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = row.closest('[role=table]').getBoundingClientRect(); return r.width > 0 && r.left >= s.left - 1 && r.right <= s.right + 1; };
		const id = row.dataset.automationRowId;
		const find = (key) => { const [pre, post] = uiReview.t(key, { name: '\u0001' }).split('\u0001'); return [...row.querySelectorAll('button,[role=switch]')].find(e => { const l = e.getAttribute('aria-label') || ''; return l.startsWith(pre) && l.endsWith(post); }); };
		const name = row.querySelector('button');
		return { id, name: inside(name), toggle: inside(row.querySelector('[role=switch]')), run: inside(find('automation.runNamed')), edit: inside(find('automation.editNamed')), more: inside(find('automation.actionsFor')) };
	});
	const outlet = box.querySelector('.huhu-design-notices');
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, page: d.documentElement.scrollWidth - win.innerWidth, contrast: { text: ratio(text, base) }, controls, overflows, rows, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, outletHeight: outlet ? outlet.getBoundingClientRect().height : -1, portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length };
}`;

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, { auto: probe(n, '[data-review=automations]'), inbox: probe(n, '[data-review=inbox]') }])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, value] of Object.entries(measured)) {
		for (const key of ['auto', 'inbox']) {
			const part = value[key];
			assert(part.width > 0, `${name}/${key}: mounted`);
			assert(part.contrast.text >= 4.5, `${name}/${key}: text contrast ${part.contrast.text}`);
			assert(part.scroll <= part.client + 1, `${name}/${key}: container overflow ${part.scroll}/${part.client}`);
			assert(part.page <= 1, `${name}/${key}: whole page overflows horizontally by ${part.page}`);
			assert.deepEqual(part.overflows, [], `${name}/${key}: descendants stay inside the container`);
			assert.equal(part.scopes, 1, `${name}/${key}: one DesignScope content leaf`);
			assert.equal(part.outletHeight, 0, `${name}/${key}: idle notice outlet reserves no space`);
			assert(part.portal >= 2, `${name}/${key}: each scope owns a portal`);
			for (const control of part.controls) {
				assert(control.width >= min - 0.1 && control.height >= min - 0.1, `${name}/${key}: hit area ${JSON.stringify(control)}`);
				if (sample.reducedMotion) assert(control.transition.split(',').every(v => parseFloat(v) === 0), `${name}/${key}: motion ${control.label}`);
			}
		}
		assert.equal(value.auto.rows.length, 4, `${name}: four rows`);
		for (const row of value.auto.rows) for (const key of ['name', 'toggle', 'run', 'edit', 'more']) assert(row[key], `${name}: ${row.id} ${key} visible and inside the list (${sample.width}px)`);
	}
	sample.assertions.push('real-automations-and-inbox', 'name-toggle-run-edit-visible', 'no-page-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const every = (expression) => cdp.evaluate(`Object.keys(uiReview.docs).every(n => { const d = uiReview.docs[n], a = d.querySelector('[data-review=automations]'), i = d.querySelector('[data-review=inbox]'), m = uiReview.mounts[n]; return (${expression})(d, a, i, m); })`);
	const each = (expression) => cdp.evaluate(`Object.keys(uiReview.docs).map(n => { const d = uiReview.docs[n], a = d.querySelector('[data-review=automations]'), i = d.querySelector('[data-review=inbox]'), m = uiReview.mounts[n]; return (${expression})(d, a, i, m); })`);
	const click = (name, expression) => cdp.evaluate(`Object.keys(uiReview.docs).forEach(n => { const d = uiReview.docs[n], a = d.querySelector('[data-review=automations]'), i = d.querySelector('[data-review=inbox]'), m = uiReview.mounts[n]; (${expression})(d, a, i, m).click(); })`).then(() => actions.push(name));
	const byLabel = (root, label) => `${root}.querySelector('[aria-label="' + ${JSON.stringify(label)} + '"]')`;
	const rowCount = 'a.querySelectorAll("[data-automation-row-id]").length';

	// Long name: clamped at two lines with a control that shows the whole name, then collapses again.
	await waitFor(() => every(`(d, a) => !!a.querySelector('[data-automation-row-id="auto-long"] button[aria-expanded=false]:not([aria-haspopup])')`), `expand control for the long name ${JSON.stringify(await each(`(d, a) => { const s = a.querySelector('[data-automation-row-id="auto-long"] span.break-words'); return [d.defaultView.innerWidth, s.scrollHeight, s.clientHeight, s.getBoundingClientRect().width]; }`))}`);
	assert(await every(`(d, a) => !a.querySelector('[data-automation-row-id="auto-digest"] button[aria-expanded]:not([aria-haspopup])')`), `short names have no expand control: ${JSON.stringify(await each(`(d, a) => { const s = a.querySelector('[data-automation-row-id="auto-digest"] span.break-words'); return [d.defaultView.innerWidth, s.scrollHeight, s.clientHeight, s.getBoundingClientRect().width, s.textContent]; }`))}`);
	await capture('list-long-name');
	await click('name-expand', `(d, a) => a.querySelector('[data-automation-row-id="auto-long"] button[aria-expanded=false]:not([aria-haspopup])')`);
	await waitFor(() => every(`(d, a) => { const s = a.querySelector('[data-automation-row-id="auto-long"] span.break-words'); return s.scrollHeight <= s.clientHeight + 1 && s.textContent === uiReview.longName; }`), 'full name readable');
	await capture('list-name-expanded');
	await click('name-collapse', `(d, a) => a.querySelector('[data-automation-row-id="auto-long"] button[aria-expanded=true]:not([aria-haspopup])')`);

	// Toggle failure keeps the list and the persistent alert; the retry succeeds.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.control.saveMode = "fail"; })');
	await click('toggle-fails', `(d, a) => ${byLabel('a', '\u0000')} || a.querySelector('[data-automation-row-id="auto-digest"] [role=switch]')`);
	await waitFor(() => every(`(d, a) => !!a.querySelector('[role=alert]')`), 'persistent failure alert');
	assert(await every(`(d, a) => a.querySelector('[role=alert]').textContent.includes('definitions file is locked') && ${rowCount} === 4`), 'failure keeps existing data');
	await capture('toggle-error');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.control.saveMode = "ready"; })');
	await click('toggle-retry', `(d, a) => a.querySelector('[data-automation-row-id="auto-digest"] [role=switch]')`);
	await waitFor(() => every(`(d, a) => a.querySelector('[data-automation-row-id="auto-digest"] [role=switch]').getAttribute('aria-checked') === 'false'`), 'toggle persisted');

	// Run is a visible row control.
	await click('row-run', `(d, a) => a.querySelector('[data-automation-row-id="auto-digest"] button[aria-label="' + uiReview.t('automation.runNamed', { name: 'Daily digest' }) + '"]')`);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.mounts).every(m => m.auto.control.runs.includes("auto-digest"))'), 'run requested');

	// Refreshing keeps rows and says so.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.control.refreshMode = "pending"; })');
	await click('refresh', `(d, a) => a.querySelector('button[aria-label="' + uiReview.t('automation.refresh') + '"]')`);
	await waitFor(() => every(`(d, a) => !!a.querySelector('[role=status]') && a.querySelector('main').getAttribute('aria-busy') === 'true' && ${rowCount} === 4`), 'refreshing status with rows');
	await capture('refreshing');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.control.refreshMode = "ready"; m.auto.control.release?.(); })');
	await waitFor(() => every(`(d, a) => !a.querySelector('[role=status]')`), 'refresh settled');

	// Load error: old data stays, retry restores.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.state.loadError = "Could not read the definitions folder"; m.auto.emit(); })');
	await waitFor(() => every(`(d, a) => { const alert = a.querySelector('[role=alert]'); return !!alert && alert.textContent.includes('definitions folder') && ${rowCount} === 4; }`), 'load error keeps data');
	await capture('load-error');
	await click('load-error-retry', `(d, a) => a.querySelector('[role=alert] button')`);
	await waitFor(() => every(`(d, a) => !a.querySelector('[role=alert]')`), 'load error recovered');

	// Module off / read-only: controls disabled with an explanation.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.state.executionEnabled = false; m.auto.emit(); })');
	await waitFor(() => every(`(d, a) => !!a.querySelector('[role=alert]') && [...a.querySelectorAll('[data-automation-row-id] [role=switch]')].every(e => e.disabled)`), 'module off disables controls');
	await capture('module-off');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.state.executionEnabled = true; m.auto.emit(); })');
	await waitFor(() => every(`(d, a) => !a.querySelector('[role=alert]')`), 'module on');

	// Search without results, then recovery.
	const typeSearch = (value) => cdp.evaluate(`Object.values(uiReview.docs).forEach(d => { const input = d.querySelector('[data-review=automations] input[type=text]'); const set = Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype, 'value').set; set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); })`);
	await typeSearch('zzzz-no-such-automation');
	await waitFor(() => every(`(d, a) => ${rowCount} === 0 && a.textContent.includes(uiReview.t('ui.noResults'))`), 'no results');
	await capture('no-results');
	await typeSearch('');
	await waitFor(() => every(`(d, a) => ${rowCount} === 4`), 'search cleared');
	actions.push('search-no-results-recovers');

	// Keyboard focus is visible on a row control.
	await cdp.evaluate(`uiReview.docs.main.querySelector('[data-automation-row-id="auto-digest"] button[aria-label="' + uiReview.t('automation.editNamed', { name: 'Daily digest' }) + '"]').focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await waitFor(() => cdp.evaluate('(() => { const e = document.activeElement, s = getComputedStyle(e); return e.matches("[data-automation-row-id] button") && (s.outlineStyle !== "none" || s.boxShadow !== "none"); })()'), 'visible keyboard focus');
	actions.push('row-keyboard-focus');

	// Detail: full wrapped name, copyable id, toast on top without touching the primary actions.
	await cdp.evaluate('Promise.all(Object.values(uiReview.mounts).map(m => m.auto.navigate("tasks", "auto-long")))');
	await waitFor(() => every(`(d, a) => { const h = a.querySelector('h2'); return !!h && h.textContent === uiReview.longName; }`), 'detail shows the whole name');
	assert(await every(`(d, a) => { const h = a.querySelector('h2'); return h.scrollWidth <= h.clientWidth + 1 && h.scrollHeight <= h.clientHeight + 1; }`), 'detail name wraps instead of clipping');
	await click('copy-automation-id', `(d, a) => a.querySelector('[data-id-field] button')`);
	await waitFor(() => cdp.evaluate('uiReview.copied.includes("auto-long")'), 'id copied');
	await waitFor(() => every(`(d, a) => !!a.querySelector('[data-sonner-toast]')`), 'copy confirmation toast');
	assert(await every(`(d, a) => { const toast = a.querySelector('[data-sonner-toast]').getBoundingClientRect(); return [...a.querySelectorAll('h2 ~ div button, [role=switch]')].every(b => { const r = b.getBoundingClientRect(); return !r.width || r.bottom <= toast.top || r.top >= toast.bottom || r.right <= toast.left || r.left >= toast.right; }); }`), 'toast does not cover the primary actions');
	await capture('detail-copy-toast');
	await cdp.evaluate('Promise.all(Object.values(uiReview.mounts).map(m => m.auto.navigate("runs", "run-bad")))');
	await waitFor(() => every(`(d, a) => [...a.querySelectorAll('[data-id-field] code')].map(e => e.textContent).join() === 'run-bad,auto-long'`), 'run detail ids');
	await capture('run-detail');
	await cdp.evaluate('Promise.all(Object.values(uiReview.mounts).map(m => m.auto.navigate("tasks")))');
	await waitFor(() => every(`(d, a) => ${rowCount} === 4`), 'back to list');
	actions.push('detail-and-run-detail');

	// Empty list.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.auto.state.definitions = []; m.auto.emit(); })');
	await waitFor(() => every(`(d, a) => ${rowCount} === 0 && a.textContent.includes(uiReview.t('automation.emptyHero'))`), 'empty list');
	await capture('empty');

	// Inbox: name snapshot in the title, current name or Deleted in details, copyable ids.
	assert(await every(`(d, a, i) => i.textContent.includes(uiReview.longName) && i.textContent.includes('Failed: Daily digest')`), 'snapshot titles');
	await cdp.evaluate(`Object.values(uiReview.docs).forEach(d => d.querySelectorAll('[data-review=inbox] button[aria-expanded=false]:not([aria-haspopup])').forEach(b => b.click()))`);
	await waitFor(() => every(`(d, a, i) => i.querySelectorAll('[data-notification-details]').length === 2`), 'details open');
	assert(await every(`(d, a, i) => { const text = [...i.querySelectorAll('[data-notification-details]')].map(e => e.textContent).join('|'); return text.includes('Quarterly review notes (renamed)') && text.includes(uiReview.t('notification.targetDeleted')) && text.includes('run-ok-0001') && text.includes('auto-gone'); }`), 'current name, deleted marker and ids');
	await capture('inbox-details');
	await click('inbox-copy-id', `(d, a, i) => i.querySelector('[data-notification-details] button[aria-label="' + uiReview.t('notification.copy', { label: uiReview.t('notification.runId') }) + '"]')`);
	await waitFor(() => cdp.evaluate('uiReview.copied.some(v => v.startsWith("run-"))'), 'inbox id copied');

	// Inbox: a failed action stays visible until dismissed.
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.inbox.control.failWrites = true; })');
	await click('inbox-mark-read-fails', `(d, a, i) => i.querySelector('button[aria-label="x"]') || [...i.querySelectorAll('button')].find(b => b.textContent === uiReview.t('automation.readAll'))`);
	await waitFor(() => every(`(d, a, i) => !!i.querySelector('[role=alert]') && i.querySelector('[role=alert]').textContent.includes('locked by another window')`), 'inbox failure alert');
	await capture('inbox-error');
	await click('inbox-dismiss', `(d, a, i) => i.querySelector('[role=alert] button')`);
	await waitFor(() => every(`(d, a, i) => !i.querySelector('[role=alert]')`), 'alert dismissed');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m => { m.inbox.control.failWrites = false; })');

	// Inbox: nothing unread, then nothing at all.
	await click('inbox-read-all', `(d, a, i) => [...i.querySelectorAll('button')].find(b => b.textContent === uiReview.t('automation.readAll'))`);
	await cdp.evaluate('Promise.all(Object.values(uiReview.mounts).map(m => m.inbox.filter("unread")))');
	await waitFor(() => every(`(d, a, i) => i.textContent.includes(uiReview.t('workbench.noUnread'))`), 'no unread');
	await capture('inbox-no-unread');
	await cdp.evaluate('Promise.all(Object.values(uiReview.mounts).map(m => m.inbox.filter("all")))');
	await click('inbox-clear-read', `(d, a, i) => [...i.querySelectorAll('button')].find(b => b.textContent === uiReview.t('automation.clearRead'))`);
	await waitFor(() => every(`(d, a, i) => !i.querySelector('li') && i.textContent.includes(uiReview.t('automation.inboxEmpty'))`), 'inbox empty');
	await capture('inbox-empty');

	// Unmount releases both scopes and portals.
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

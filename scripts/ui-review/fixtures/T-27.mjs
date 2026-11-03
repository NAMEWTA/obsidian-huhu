import assert from 'node:assert/strict';
const SCENES = ['inbox-empty', 'inbox-items', 'inbox-failing', 'rss-none', 'rss-items', 'rss-failed', 'rss-read', 'reading-empty', 'reading-books', 'dataview-table', 'dataview-list', 'dataview-tasks', 'dataview-error', 'dataview-empty', 'dataview-blank', 'library-pinned'];
export const ready = `!!window.uiReview && Object.values(uiReview.docs).every(d => d.querySelectorAll("[data-review=content] [data-scene]").length === ${SCENES.length} && !d.querySelector("[data-review=content] [aria-busy=true]") && ["dataview-table","dataview-error","dataview-empty","dataview-blank"].every(id => d.querySelector('[data-scene='+id+'] table, [data-scene='+id+'] [role=alert], [data-scene='+id+'] [data-slot=empty-state]')) && d.querySelector('[data-scene=dataview-list] .dashboard-library-list, [data-scene=dataview-list] li, [data-scene=dataview-list] [class*=dataview-list]'))`;
export const layoutCSS = '[data-review]{width:100%;min-width:0;box-sizing:border-box}iframe{position:fixed}[data-review=content] .huhu-dashboard-root{height:auto;overflow:visible}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

/** What each scene must state in words (keys are resolved in the page, so both languages are checked). */
const EXPECT = {
	'inbox-empty': { keys: ['home.inbox.empty', 'home.inbox.todayEmpty'] },
	'rss-none': { keys: ['rss.noFeeds', 'rss.configureHint'] },
	'reading-empty': { keys: ['reading.empty'] },
	'dataview-empty': { keys: ['dataview.empty'] },
	'dataview-blank': { keys: ['dataview.emptyQuery'] },
	'rss-failed': { keys: ['rss.noItems'], alert: true },
	'rss-items': { alert: true },
	'dataview-error': { alert: true, retry: true },
};

const probe = `(name, expect) => {
	const d = uiReview.docs[name], win = d.defaultView, box = d.querySelector('[data-review=content]'), b = box.getBoundingClientRect();
	const canvas = d.createElement('canvas'), ctx = canvas.getContext('2d');
	const rgb = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
	const lum = c => c.slice(0,3).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
	const ratio = (a,k) => { const f=rgb(a), g=rgb(k), al=f[3]/255, x=lum(f.slice(0,3).map((v,i)=>v*al+g[i]*(1-al))), y=lum(g); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
	const backdrop = el => { for (let e = el; e; e = e.parentElement) { const c = win.getComputedStyle(e).backgroundColor; if (rgb(c)[3] === 255) return c; } return win.getComputedStyle(d.body).backgroundColor; };
	const scenes = Object.fromEntries([...box.querySelectorAll('[data-scene]')].map(a => {
		const id = a.dataset.scene, body = a.querySelector('[data-slot=widget-body]'), h = d.getElementById(a.getAttribute('aria-labelledby'));
		const texts = [...body.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 0 && !e.closest('[aria-hidden=true]'));
		const low = texts.map(e => { const s = win.getComputedStyle(e); return { text: e.textContent.trim().slice(0, 30), ratio: ratio(s.color, backdrop(e)), size: parseFloat(s.fontSize), op: s.opacity }; }).filter(x => x.ratio < 4.5 && !(x.size >= 18.66 && x.ratio >= 3));
		const keys = (expect[id] && expect[id].keys) || [];
		return [id, {
			named: !!h && h.textContent.trim().length > 0, ariaLabel: a.hasAttribute('aria-label'),
			titles: [...a.querySelectorAll('[title]')].filter(e => e.tagName !== 'TIME').length,
			overflow: body.scrollWidth - body.clientWidth, width: a.getBoundingClientRect().width,
			offenders: [...body.querySelectorAll('*')].filter(x => { const r = x.getBoundingClientRect(); return r.width && r.right > body.getBoundingClientRect().right + 1 && !x.closest('[data-local-scroll], .dashboard-dataview-body, .overflow-x-auto, .overflow-auto'); }).slice(0, 3).map(x => x.tagName + '.' + String(x.className).slice(0, 50)),
			text: body.textContent, missing: keys.filter(k => !body.textContent.includes(uiReview.t(k))),
			alerts: body.querySelectorAll('[role=alert]').length, retry: [...body.querySelectorAll('button')].some(x => x.textContent.trim() === uiReview.t('home.content.retry')),
			buttons: body.querySelectorAll('button').length, rows: body.querySelectorAll('li, tbody tr').length, low,
			controls: [...body.querySelectorAll('button,input,textarea,[role=combobox],[role=checkbox]')].flatMap(e => { const r = e.getBoundingClientRect(), p = win.getComputedStyle(e, '::before'); return r.width && r.height ? [{ label: (e.getAttribute('aria-label') || e.textContent).slice(0,40), width: Math.max(r.width, parseFloat(p.width)||0), height: Math.max(r.height, parseFloat(p.height)||0), transition: win.getComputedStyle(e).transitionDuration, unnamed: !(e.getAttribute('aria-label') || e.textContent.trim() || e.labels?.length || e.getAttribute('placeholder')) }] : []; }),
		}];
	}));
	return { width: b.width, scroll: box.scrollWidth, client: box.clientWidth, scenes, scopes: box.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length, portal: d.querySelectorAll('.huhu-design.huhu-portal-root').length, outletHeight: box.querySelector('.huhu-design-notices').getBoundingClientRect().height };
}`;

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => { const probe = ${probe}; const expect = ${JSON.stringify(EXPECT)}; return Object.fromEntries(Object.keys(uiReview.docs).map(n => [n, probe(n, expect)])); })()`);
	sample.measurements = measured;
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, v] of Object.entries(measured)) {
		assert(v.width > 0, `${name}: mounted`);
		assert(v.scroll <= v.client + 1, `${name}: page overflow ${v.scroll}/${v.client}`);
		assert.equal(v.scopes, 1, `${name}: one DesignScope content leaf`);
		assert(v.portal >= 1, `${name}: scope owns a portal`);
		assert.equal(v.outletHeight, 0, `${name}: idle notice outlet reserves no space`);
		assert.deepEqual(Object.keys(v.scenes), SCENES, `${name}: all scenes present`);
		for (const [id, s] of Object.entries(v.scenes)) {
			assert(s.named && !s.ariaLabel, `${id}: region named by its heading, not aria-label`);
			assert.equal(s.titles, 0, `${id}: no title attributes (AC-211)`);
			assert(s.overflow <= 1, `${id}: horizontal overflow ${s.overflow} ${JSON.stringify(s.offenders)}`);
			assert.deepEqual(s.missing, [], `${id}: states itself in words`);
			if (EXPECT[id]?.alert) assert(s.alerts > 0, `${id}: failure stays visible as an alert`);
			if (EXPECT[id]?.retry) assert(s.retry, `${id}: failure offers retry`);
			assert.deepEqual(s.low, [], `${id}: text contrast >= 4.5`);
			for (const c of s.controls) {
				assert(!c.unnamed, `${id}: control has a name ${JSON.stringify(c)}`);
				assert(c.width >= min - 0.1 && c.height >= min - 0.1, `${id}: hit area ${JSON.stringify(c)}`);
				if (sample.reducedMotion) assert(c.transition.split(',').every(x => parseFloat(x) === 0), `${id}: motion ${c.label}`);
			}
		}
		assert(v.scenes['inbox-items'].rows >= 6, `${name}: inbox lists items and captures`);
		assert(v.scenes['rss-items'].rows >= 4, `${name}: rss keeps cached articles beside the failing feed`);
		assert(v.scenes['reading-books'].rows >= 3, `${name}: three books`);
		assert(v.scenes['dataview-table'].rows >= 3, `${name}: table rows`);
	}
	sample.assertions.push('real-content-views', 'region-named-no-title', 'no-overflow', 'hit-area', 'reduced-motion', 'text-contrast', 'idle-notice-outlet', 'state-text', 'failure-visible-with-retry');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 600, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const both = expr => cdp.evaluate(`Object.keys(uiReview.docs).map(n => (${expr})(uiReview.docs[n], uiReview.docs[n].querySelector('[data-review=content]'), uiReview.mounts[n], n))`);
	const scene = (id) => `h.querySelector('[data-scene=${id}]')`;
	const type = (el, value) => `(() => { const target = ${el}; const set = Object.getOwnPropertyDescriptor(target.ownerDocument.defaultView[target.tagName === 'TEXTAREA' ? 'HTMLTextAreaElement' : 'HTMLInputElement'].prototype, 'value').set; set.call(target, ${JSON.stringify(value)}); target.dispatchEvent(new target.ownerDocument.defaultView.Event('input', { bubbles: true })); })()`;
	const key = (name) => `new (e.ownerDocument.defaultView.KeyboardEvent)('keydown', { key: ${JSON.stringify(name)}, bubbles: true, cancelable: true })`;

	// Inbox capture: IME composition does not send; a failed send stays on screen with the text kept; retry succeeds.
	await both(`(d, h, m) => { ${type(scene('inbox-failing') + ".querySelector('textarea')", '没发出去')}; }`);
	await both(`(d, h) => { const e = ${scene('inbox-failing')}.querySelector('textarea'); e.dispatchEvent(new (d.defaultView.KeyboardEvent)('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })); }`);
	assert((await both(`(d, h, m) => (m.calls['capture-try'] ?? []).length`)).every((n) => n === 0), 'IME composition Enter does not send');
	actions.push('capture-ime-guard');
	await both(`(d, h) => { const e = ${scene('inbox-failing')}.querySelector('textarea'); e.dispatchEvent(${key('Enter')}); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-scene=inbox-failing] [data-capture-failed][role=alert]'))`), 'capture failure shown in place');
	assert((await both(`(d, h) => ${scene('inbox-failing')}.querySelector('textarea').value`)).every((v) => v === '没发出去'), 'failed capture keeps the text');
	await capture('inbox-capture-failed');
	actions.push('capture-failure-persistent');
	await both(`(d, h, m, n) => { uiReview.inboxStores[n][2].store.heal('capture'); const b = [...${scene('inbox-failing')}.querySelectorAll('[data-capture-composer] button')].pop(); b.click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('[data-scene=inbox-failing] [data-capture-failed]') && d.querySelector('[data-scene=inbox-failing] textarea').value === '')`), 'capture retry clears failure');
	actions.push('capture-retry');

	// Inbox delete: confirmation, failure stays with retry, retry succeeds.
	await both(`(d, h) => { ${scene('inbox-failing')}.querySelector('[data-inbox-item] button[aria-label="' + uiReview.t('home.inbox.delete') + '"]').click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('.huhu-design.huhu-portal-root [role=alertdialog]'))`), 'delete confirmation');
	await both(`(d) => { [...d.querySelectorAll('.huhu-portal-root [role=alertdialog] button')].find(b => b.textContent === uiReview.t('common.confirm')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-scene=inbox-failing] [data-inbox-problem][role=alert]'))`), 'delete failure shown in place');
	await capture('inbox-delete-failed');
	await both(`(d, h, m, n) => { uiReview.inboxStores[n][2].store.heal('trash'); [...${scene('inbox-failing')}.querySelectorAll('[data-inbox-problem] button')].find(b => b.textContent === uiReview.t('home.content.retry')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('[data-scene=inbox-failing] [data-inbox-problem]'))`), 'delete retry succeeds');
	actions.push('inbox-delete-failure-retry');

	// Inbox new item: creation works, the follow-up open fails and stays dismissible.
	for (const name of ['main', 'other']) {
		// One document at a time: the field closes itself on blur while empty, and focus moves between the two documents.
		await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-scene=inbox-failing] [data-slot=widget-actions-inline] button').click()`);
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-scene=inbox-failing] [data-inbox-new] input')`), `new item field in ${name}`);
		await cdp.evaluate(type(`uiReview.docs.${name}.querySelector('[data-scene=inbox-failing] [data-inbox-new] input')`, 'Draft note'));
	}
	await both(`(d, h) => { ${scene('inbox-failing')}.querySelector('[data-inbox-new] input').dispatchEvent(new (d.defaultView.KeyboardEvent)('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-scene=inbox-failing] [data-inbox-problem]'))`), 'open failure shown');
	await both(`(d, h) => { [...${scene('inbox-failing')}.querySelectorAll('[data-inbox-problem] button')].find(b => b.textContent === uiReview.t('home.content.dismiss')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('[data-scene=inbox-failing] [data-inbox-problem]'))`), 'problem dismissed');
	actions.push('inbox-new-item-failure-dismiss');

	// RSS: failing feed keeps its articles and offers a retry that ends in the same visible state; reader opens in the scoped portal.
	assert((await both(`(d, h) => { const s = ${scene('rss-items')}; return [s.querySelector('[role=alert]').textContent.includes('Broken Blog') || s.querySelector('[role=alert]').textContent.includes('1'), s.querySelectorAll('li[data-guid]').length]; }`)).every(([named, n]) => named && n >= 4), 'failing feed named, articles kept');
	await both(`(d, h) => { [...${scene('rss-items')}.querySelectorAll('[role=alert] button')].find(b => b.textContent === uiReview.t('home.content.retry')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-scene=rss-items] [role=alert]') && !d.querySelector('[data-scene=rss-items] [aria-busy=true]'))`), 'retry settles with the failure still shown');
	actions.push('rss-feed-failure-retry');
	await both(`(d, h) => { ${scene('rss-items')}.querySelector('li[data-guid] button').click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('.huhu-design.huhu-portal-root [role=dialog] h2'))`), 'article reader');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('.huhu-portal-root [role=dialog] [role=status]'))`), 'article loaded');
	await capture('rss-reader');
	await cdp.evaluate(`(() => { window.focus(); uiReview.docs.main.querySelector('[role=dialog] button').focus(); })()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await waitFor(() => cdp.evaluate(`!uiReview.docs.main.querySelector('[role=dialog]')`), 'reader closed by Escape');
	await cdp.evaluate(`uiReview.docs.other.querySelector('[role=dialog] [data-slot=dialog-close], [role=dialog] button.huhu-close-target').click()`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !d.querySelector('[role=dialog]'))`), 'reader closed');
	actions.push('rss-reader-open-close');

	// RSS filter result: when everything is read, "mark all read" is disabled instead of silently doing nothing.
	assert((await both(`(d, h) => ${scene('rss-read')}.querySelector('button[aria-label="' + uiReview.t('rss.markAllRead') + '"]').disabled`)).every(Boolean), 'mark all read disabled when nothing is unread');
	actions.push('rss-mark-all-disabled');

	// Reading: start records, the list stays labelled, long title wraps within the card.
	await both(`(d, h) => { ${scene('reading-books')}.querySelector('li[data-book] button[aria-label="' + uiReview.t('reading.start') + '"]').click(); }`);
	assert((await both(`(d, h, m) => (m.calls.start ?? []).length`)).every((n) => n === 1), 'reading start recorded once');
	actions.push('reading-start');

	// Dataview: sorting is on a real button with aria-sort; a filter with no match says so; the failed query retries into the same error.
	await both(`(d, h) => { ${scene('dataview-table')}.querySelector('th button').click(); }`);
	assert((await both(`(d, h) => ${scene('dataview-table')}.querySelector('th[aria-sort]')?.getAttribute('aria-sort')`)).every((v) => v === 'ascending'), 'sort state is exposed');
	await both(`(d, h) => { ${type(scene('dataview-table') + ".querySelector('input')", 'zzz-no-such-row')}; }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => d.querySelector('[data-scene=dataview-table]').textContent.includes(uiReview.t('dataview.noMatch')))`), 'filter without a match says so');
	await capture('dataview-no-match');
	actions.push('dataview-sort-filter');
	await both(`(d, h) => { [...${scene('dataview-error')}.querySelectorAll('button')].find(b => b.textContent === uiReview.t('home.content.retry')).click(); }`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d => !!d.querySelector('[data-scene=dataview-error] [role=alert]'))`), 'dataview retry returns to the error');
	actions.push('dataview-error-retry');

	// Library pinned properties: toggle is exposed through aria-pressed.
	await both(`(d, h) => { const b = [...${scene('library-pinned')}.querySelectorAll('button')].find(b => b.textContent === 'rating'); b.click(); }`);
	assert((await both(`(d, h) => [...${scene('library-pinned')}.querySelectorAll('button')].find(b => b.textContent === 'rating').getAttribute('aria-pressed')`)).every((v) => v === 'true'), 'toggle pressed');
	actions.push('library-pin-toggle');

	// Keyboard focus is visible.
	await cdp.evaluate(`uiReview.docs.main.querySelector('[data-scene=reading-books] button').focus()`);
	assert(await cdp.evaluate(`(() => { const e = uiReview.docs.main.activeElement, s = getComputedStyle(e); return s.outlineStyle !== 'none' || s.boxShadow !== 'none'; })()`), 'focus visible');
	actions.push('focus-visible');

	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-design:not(.huhu-portal-root)"))'), 'scopes unmounted');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll(".huhu-design.huhu-portal-root").length===0)'), 'scoped portals removed');
	actions.push('unmount-cleans-scopes');
}

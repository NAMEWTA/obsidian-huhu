import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-diary-page]"))';
export const layoutCSS = '[data-review=diary]{width:100%;min-width:0;height:900px}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(theme.endsWith('dark') ? 'theme-dark' : 'theme-light')})`; }
export async function verify({ cdp, sample }) {
	const values = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const r=d.querySelector('[data-diary-reader]');return [name,{width:r.getBoundingClientRect().width,layout:r.dataset.layout,pages:r.querySelectorAll('[data-diary-page]').length,overflow:r.scrollWidth-r.clientWidth,labelled:!!r.querySelector('label[for]'),controls:[...r.querySelectorAll('button,input')].map(e=>({label:e.getAttribute('aria-label')||e.textContent||e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}]}))`);
	sample.measurements = values;
	for (const [name, value] of Object.entries(values)) {
		assert.equal(value.layout, value.width < 600 ? 'single' : 'double', `${name}: container layout`);
		assert(value.pages <= 2 && value.pages >= 1, `${name}: bounded pages`);
		assert(value.overflow <= 1, `${name}: no horizontal overflow`);
		assert(value.labelled, `${name}: calendar input labelled`);
		for (const control of value.controls) assert(control.label && control.height >= (value.width < 600 ? 44 : 32) - .1, `${name}: accessible target ${JSON.stringify(control)}`);
	}
	sample.assertions.push('DIARY-READER', 'wide-double-narrow-single', 'long-text-wrap', 'bounded-pages', 'labelled-calendar', 'hit-area');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const both = code => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{const r=d.querySelector('[data-diary-reader]');${code}})`);
	await both(`r.querySelector('button[aria-expanded]').click();`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('nav[aria-label="Month index"]'))`), 'month index');
	await capture('month-index'); result.interactions.push('month-index');
	await both(`const i=r.querySelector('input[type=date]');const set=Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype,'value').set;set.call(i,'2026-11-02');i.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));i.dispatchEvent(new d.defaultView.Event('change',{bubbles:true}));`);
	await both(`r.querySelector('form').requestSubmit();`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('No note for this date'))`), 'empty date');
	await capture('empty-date'); result.interactions.push('calendar-empty-zero-create');
	await both(`r.querySelector('nav button').click();`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('[data-diary-page]'))`), 'existing date');
	await both(`r.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));`);
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>{const r=d.querySelector('[data-diary-reader]');return r.querySelector('time')?.dateTime===(r.dataset.layout==='double'?'2026-10-31':'2026-11-03')})`), 'keyboard selected the next page');
	await capture('keyboard-next'); result.interactions.push('keyboard-reduced-motion');
	await both(`[...r.querySelectorAll('button')].find(b=>b.textContent==='Open original').click();`);
	assert(await cdp.evaluate(`Object.values(uiReview.mounts).every(m=>m.calls.length===1&&m.calls[0].options.create===false&&m.calls[0].date===(m.container.querySelector('[data-diary-reader]').dataset.layout==='double'?31:3)&&m.vault.writes===0)`), 'open same periodic note, never create');
	await cdp.evaluate('uiReview.hide(true)');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Reading paused')&&!d.querySelector('[data-diary-page]'))`), 'hidden');
	await capture('hidden'); result.interactions.push('hidden-no-pages');
	await cdp.evaluate('uiReview.hide(false); uiReview.scenario("error")');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('[role=alert]'))`), 'read error');
	await capture('error');
	await cdp.evaluate('uiReview.scenario("loading")');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('[aria-busy=true]'))`), 'loading');
	await capture('loading');
	await cdp.evaluate('uiReview.unmount()');
	result.interactions.push('error-loading-unmount');
}

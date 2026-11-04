import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-grid] article"))';
export const layoutCSS = '[data-review=belongings]{width:100%;min-width:0}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${theme.endsWith('dark') ? 'dark' : 'light'}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`; }
const both = (cdp, code) => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{${code}})`);
const click = (cdp, key) => both(cdp, `[...d.querySelectorAll('button')].find(e=>e.textContent===uiReview.t(${JSON.stringify(key)})).click();`);
async function measure(cdp) {
	return cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const r=d.querySelector('[data-belongings-page]');return [name,{width:r.getBoundingClientRect().width,overflow:r.scrollWidth-r.clientWidth,cards:r.querySelectorAll('[data-belongings-grid] article').length,controls:[...r.querySelectorAll('button,input')].map(e=>({name:e.getAttribute('aria-label')||e.textContent||e.id,height:e.getBoundingClientRect().height})),fields:[...r.querySelectorAll('input')].map(e=>{const s=d.defaultView.getComputedStyle(e);return {contentWidth:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)}})}]}))`);
}
function assertLayout(values) {
	for (const [name, value] of Object.entries(values)) {
		assert(value.overflow <= 1, `${name}: no horizontal overflow`);
		for (const control of value.controls) assert(control.name && control.height >= 43.9, `${name}: labelled 44px control ${JSON.stringify(control)}`);
		for (const field of value.fields) assert(field.contentWidth >= 100, `${name}: usable input content width ${field.contentWidth}`);
	}
}
export async function verify({ cdp, sample, waitFor }) {
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelectorAll("[data-belongings-grid] article").length===5)'), 'five archive cards');
	sample.measurements = await measure(cdp); assertLayout(sample.measurements);
	const currency = await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-kpis]").textContent.includes("CNY")&&d.querySelector("[data-belongings-kpis]").textContent.includes("USD"))');
	assert(currency, 'separate currencies');
	await both(cdp, `d.querySelector('[data-belongings-grid] article button').click();`);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-detail]"))'), 'detail');
	assertLayout(await measure(cdp));
	await click(cdp, 'archives.preset.belongingSold');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-transition]"))'), 'transition form');
	sample.writing = await measure(cdp); assertLayout(sample.writing);
	sample.assertions.push('BELONGINGS', 'shared-currency-summary', 'long-text-wrap', 'detail-transition', '44px-targets', 'usable-field-width');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-grid] article"))'), 'reset');
	await capture('money-edge');
	await both(cdp, `const i=d.querySelector('input');Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype,'value').set.call(i,'no-matches');i.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));`);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-slot=empty-state]"))'), 'no results');
	await capture('no-results');
	await click(cdp, 'archives.belongings.clear');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-grid] article"))'), 'clear filter');
	await cdp.evaluate(`uiReview.docs.other.querySelector('[data-belongings-grid] article button').click();document.querySelector('[data-belongings-grid] article button').focus();`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-detail]"))'), 'keyboard reachable detail');
	await capture('detail');
	await click(cdp, 'archives.preset.belongingSold');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("form"))'), 'dated transition');
	await click(cdp, 'archives.belongings.confirm');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>[...d.querySelectorAll("button")].some(e=>e.textContent==="Undo change"))'), 'committed transition');
	await capture('resold');
	await click(cdp, 'archives.belongings.undo');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Change undone."))'), 'owner compensation');
	await capture('undo');
	for (const [status, screenshot] of [['Discarded','discarded'], ['In use','returned']]) {
		await both(cdp, `[...d.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(status)}).click();`);
		await click(cdp, 'archives.belongings.confirm');
		await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-belongings-transition]"))'), 'transition commits');
		await capture(screenshot);
	}
	await cdp.evaluate('uiReview.external()');
	await click(cdp, 'archives.belongings.undo');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alert]")?.textContent.includes("changed elsewhere"))'), 'stale undo conflict');
	await capture('conflict');
	await cdp.evaluate('uiReview.refresh("error")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alert]"))'), 'read error');
	await capture('error');
	await cdp.evaluate('uiReview.refresh("default")');
	await cdp.evaluate('uiReview.refresh("loading")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[aria-busy=true]"))'), 'loading');
	await capture('loading');
	await cdp.evaluate('uiReview.refresh("default")');
	result.interactions.push('no-results-clear', 'detail-reduced-motion', 'dated-transition', 'resold-discarded-returned', 'owner-undo', 'stale-undo-conflict', 'read-error-loading');
	await cdp.evaluate('uiReview.empty()');
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-slot=empty-state]")?.textContent.includes("No belongings yet"))'), 'empty archive');
	await capture('empty');
	await cdp.evaluate('uiReview.unmount()');
}

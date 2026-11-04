import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-report-result]"))';
export const layoutCSS = '[data-review=belongings]{width:100%;min-width:0}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${theme.endsWith('dark') ? 'dark' : 'light'}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`; }
const both = (cdp, code) => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{${code}})`);
const click = (cdp, key) => both(cdp, `[...d.querySelectorAll('button')].find(e=>e.textContent===uiReview.t(${JSON.stringify(key)})).click();`);
const year = (cdp, value) => both(cdp, `const input=d.querySelector('[data-belongings-report] input');Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(value))});input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));`);
async function layout(cdp) {
	const values = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const r=d.querySelector('[data-belongings-report]');return [name,{overflow:r.scrollWidth-r.clientWidth,controls:[...r.querySelectorAll('button,input,summary')].filter(e=>e.getClientRects().length&&d.defaultView.getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent||e.id,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))}]}))`);
	for (const [name, value] of Object.entries(values)) {
		assert(value.overflow <= 1, `${name}: no horizontal overflow`);
		for (const control of value.controls) assert(control.name && control.height >= 43.9, `${name}: labelled 44px control ${JSON.stringify(control)}`);
		for (const control of value.controls.filter(control => control.tag === 'SUMMARY')) assert(control.width >= 43.9, `${name}: 44px summary width ${JSON.stringify(control)}`);
	}
	return values;
}
export async function verify({ cdp, sample, waitFor }) {
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-report-result]"))'), 'owner report');
	sample.measurements = await layout(cdp);
	assert(await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-testid=report-purchased-CNY]")&&d.querySelector("[data-testid=report-purchased-USD]"))'), 'currencies separate');
	sample.assertions.push('BELONGINGS-REPORT', 'owner-produced-statistics', 'separate-currencies', 'exact-tables', '44px-controls', 'long-text-wrap');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-report-result]"))'), 'report reset');
	await capture('money-edge');
	await both(cdp, `const summaries=[...d.querySelectorAll('[data-belongings-report] summary')];if(summaries.length===0)throw Error('Missing chart summary');if(summaries.some(summary=>summary.parentElement.open))throw Error('Chart data initially closed');`);
	await cdp.evaluate(`uiReview.docs.other.querySelector('[data-belongings-report] summary').click()`);
	await waitFor(() => cdp.evaluate('!!uiReview.docs.other.querySelector("[data-belongings-report] details[open]")'), 'other chart expanded');
	await cdp.evaluate(`document.querySelector('[data-belongings-report] summary').focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-report] details[open]"))'), 'keyboard chart data expanded');
	await layout(cdp);
	await capture('chart-data-expanded');
	await both(cdp, `d.querySelector('[data-belongings-report] details[open] summary').click()`);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-belongings-report] details[open]"))'), 'chart data collapsed');

	await year(cdp, 2025); await click(cdp, 'archives.report.update');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-report-year=\\"2025\\"]"))'), 'historical');
	assert(await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-testid=report-purchased-CNY]").textContent==="CNY 3200")'), 'actual year purchases');
	await capture('historical');
	await cdp.evaluate('uiReview.refresh("error")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alert]"))'), 'read error');
	assert(await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-report-year=\\"2025\\"]"))'), 'previous result retained');
	await capture('error');
	await cdp.evaluate('uiReview.refresh("default")');
	await cdp.evaluate('void uiReview.refresh("loading")');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[aria-busy=true]"))'), 'loading');
	await capture('loading');
	await cdp.evaluate('uiReview.refresh("default")');
	await year(cdp, 1900); await click(cdp, 'archives.report.update');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-slot=empty-state]"))'), 'empty year');
	await capture('empty');
	await cdp.evaluate(`[...uiReview.docs.other.querySelectorAll('button')].find(e=>e.textContent===uiReview.t('archives.report.back')).click()`);
	await waitFor(() => cdp.evaluate('!!uiReview.docs.other.querySelector("[data-belongings-page]")'), 'other document back');
	await cdp.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===uiReview.t('archives.report.back')).focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-belongings-page]"))'), 'keyboard back');
	assert(await cdp.evaluate('document.activeElement.textContent===uiReview.t("archives.report.title")'), 'return focus');
	result.interactions = ['default', 'historical', 'money-edge', 'loading', 'error-retains-result', 'empty', 'keyboard-back-focus', 'keyboard-chart-data', 'reduced-motion'];
	await cdp.evaluate('uiReview.unmount()');
}

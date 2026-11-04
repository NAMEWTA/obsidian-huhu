import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-health-page]"))';
export const layoutCSS = '[data-review=health]{width:100%;min-width:0}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(theme.endsWith('dark') ? 'theme-dark' : 'theme-light')})`; }
export async function verify({ cdp, sample }) {
	const measurements = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const r=d.querySelector('[data-health-page]');return [name,{page:r.dataset.pageId,width:r.getBoundingClientRect().width,overflow:r.scrollWidth-r.clientWidth,buttons:[...r.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height).map(e=>({label:e.textContent||e.getAttribute('aria-label'),height:e.getBoundingClientRect().height})),issueTextWidths:[...r.querySelectorAll('[data-health-issue] > div:first-child')].map(e=>e.getBoundingClientRect().width),stats:[...r.querySelectorAll('dl dd')].map(e=>({width:e.getBoundingClientRect().width,margin:d.defaultView.getComputedStyle(e).marginInlineStart,height:e.parentElement.getBoundingClientRect().height})),states:[...r.querySelectorAll('[data-slot=badge]')].map(e=>e.textContent)}]}))`);
	sample.measurements = measurements;
	for (const [name, value] of Object.entries(measurements)) {
		assert.equal(value.page, 'HEALTH-SCAN'); assert(value.overflow <= 1, `${name}: long identifiers wrap`);
		for (const button of value.buttons) assert(button.label && button.height >= (value.width < 600 ? 44 : 32) - .1, `${name}: labelled target`);
		for (const width of value.issueTextWidths) assert(width >= 64, `${name}: issue descriptions keep readable width beside actions`);
		assert.equal(value.stats.length, 4, `${name}: all report statistics visible`);
		for (const stat of value.stats) { assert(stat.width >= 64, `${name}: statistics retain readable content width at ${sample.zoom}x`); assert.equal(stat.margin, '0px', `${name}: no host dd indentation`); assert(stat.height < 200, `${name}: statistics do not become vertical text columns`); }
		assert(value.states.length >= 4, `${name}: provider states remain visible`);
	}
	sample.assertions.push('HEALTH-SCAN','real-production-components','scoped-provider-statuses','long-text-wrap','keyboard-controls','readable-statistics-at-200-percent');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	const verifyPortalTargets = async () => {
		const targets = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,[...(d.querySelector('[role=alertdialog],[role=dialog]')?.querySelectorAll('button')??[])].map(b=>({height:b.getBoundingClientRect().height,min:d.defaultView.getComputedStyle(b).minHeight,label:b.textContent}))]))`);
		for (const [name, buttons] of Object.entries(targets)) { assert(buttons.length, `${name}: production portal controls mounted`); for (const button of buttons) { assert(button.label && button.height >= 43.9, `${name}: portal target at least 44px`); assert(parseFloat(button.min) >= 44, `${name}: portal hit size remains effective`); } }
	};
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	const scene = async value => { await cdp.evaluate(`uiReview.scenario(${JSON.stringify(value)})`); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-health-page]"))'), value); await cdp.evaluate(settle); };
	for (const value of ['default','running','cancelled','incomplete','provider-error','unavailable','locked','stale','notification','unsupported','partial','repair-complete','repair-stale','conflict']) { await scene(value); await capture(value); actions.push(value); }
	await scene('repair');
	const click = label => cdp.evaluate(`Object.values(uiReview.docs).forEach(d=>[...(d.querySelector('[role=alertdialog]')||d).querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click())`);
	await scene('complete'); await click('View location');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=dialog]"))'), 'location');
	await verifyPortalTargets(); await capture('location'); await click('Close'); await scene('repair');
	await click('Generate repair plan');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Impact preview"))'), 'preview');
	assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m=>m.calls.commits===0)'), 'preview has zero commits'); await capture('preview');
	await click('Cancel'); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Cancelled; no pending plan"))'), 'plan cancelled'); await capture('repair-cancelled');
	await click('Generate repair plan'); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Impact preview"))'), 'new preview');
	await click('Review confirmation'); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alertdialog]"))'), 'confirmation'); await verifyPortalTargets(); await capture('confirm');
	await click('Cancel'); assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m=>m.calls.commits===0)'), 'cancel has zero commits');
	await click('Review confirmation'); await click('Confirm this repair');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Commit status unknown"))'), 'partial unknown receipt'); await capture('partial-after-confirm');
	await click('Review recovery'); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alertdialog]"))'), 'recovery'); await verifyPortalTargets(); await capture('restore');
	await click('Restore backup'); await waitFor(() => cdp.evaluate('Object.values(uiReview.mounts).every(m=>m.calls.recoveries===1)'), 'owner recovery');
	await scene('revalidating'); await click('Generate repair plan');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Impact preview"))'), 'revalidating preview');
	await click('Review confirmation'); await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alertdialog]"))'), 'revalidating confirmation'); await click('Confirm this repair');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.body.textContent.includes("Revalidating and repairing"))'), 'revalidating'); await capture('revalidating');
	await scene('default'); await cdp.evaluate("document.querySelector('[data-health-page] button').focus()"); await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	assert(await cdp.evaluate('document.activeElement.tagName==="BUTTON"'), 'keyboard reaches actual controls');
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await capture('keyboard-reduced-motion'); actions.push('preview-confirm-cancel-zero-write','unknown-commit-distinct','explicit-recovery','revalidating','keyboard-reduced-motion');
	await cdp.evaluate('uiReview.unmount()');
}

import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-safe-quick] [role=combobox]"))';
export const layoutCSS = '[data-review=content]{min-width:0}';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
export async function verify({ cdp, sample, waitFor }) {
	const read = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const box=d.querySelector('[data-safe-quick]'), input=box.querySelector('[role=combobox]'), dialog=d.querySelector('[role=dialog]'), r=dialog.getBoundingClientRect();return [name,{options:box.querySelectorAll('[role=option]').length,secret:d.body.innerHTML.includes('PRIVATE-SECRET'),width:r.width,viewport:d.defaultView.innerWidth,overflow:box.scrollWidth>box.clientWidth+1,selected:box.querySelector('[role=option][aria-selected=true]')?.textContent,input:!!input,scoped:!!box.closest('.huhu-design'),controls:[...box.querySelectorAll('button,input')].map(e=>{const s=d.defaultView.getComputedStyle(e),r=e.getBoundingClientRect();return {width:r.width,height:r.height,transition:s.transitionDuration}})}]}))`);
	for (const [name, value] of Object.entries(read)) {
		assert.equal(value.options, 3, `${name}: per-account results`); assert(!value.secret, `${name}: secret never appears in markup`); assert(value.input && value.scoped, `${name}: real scoped content`);
		assert(value.width <= value.viewport && !value.overflow, `${name}: long localized result fits narrow modal`);
		for (const control of value.controls) assert(control.height >= (sample.pointer === 'coarse' ? 44 : 32) - 1, `${name}: control hit height`);
	}
	const resultWidths = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,[...d.querySelectorAll('[data-safe-quick] [role=option]')].map(row=>({client:row.clientWidth,scroll:row.scrollWidth,labels:[...row.querySelectorAll('strong,span.font-mono')].map(label=>({client:label.clientWidth,scroll:label.scrollWidth}))}))]))`);
	for (const [name, rows] of Object.entries(resultWidths)) for (const row of rows) {
		assert(row.client > 0 && row.scroll <= row.client + 1, `${name}: result button wraps without clipping`);
		for (const label of row.labels) assert(label.client > 0 && label.scroll <= label.client + 1, `${name}: full platform and account text wraps`);
	}
	const resultHeights = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,[...d.querySelectorAll('[data-safe-quick] [role=option]')].map(row=>{const r=row.getBoundingClientRect();return {top:r.top,bottom:r.bottom,client:row.clientHeight,scroll:row.scrollHeight,labels:[...row.querySelectorAll('strong,span.font-mono')].map(label=>{const r=label.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})}})]))`);
	for (const [name, rows] of Object.entries(resultHeights)) for (const [index, row] of rows.entries()) {
		assert(row.client > 0 && row.scroll <= row.client + 1, `${name}: result button contains full text height`);
		for (const label of row.labels) assert(label.top >= row.top - 1 && label.bottom <= row.bottom + 1, `${name}: platform and account text stay inside their result button`);
		if (index > 0) assert(rows[index - 1].bottom <= row.top + 1, `${name}: adjacent results do not overlap`);
		for (let i = 1; i < row.labels.length; i++) assert(row.labels[i - 1].bottom <= row.labels[i].top + 1, `${name}: platform and account text do not overlap`);
	}
	sample.resultHeights = resultHeights;
	sample.resultWidths = resultWidths;
	sample.measurements = read;
	await cdp.evaluate('uiReview.scene("locked")');
	assert(await cdp.evaluate('!!document.querySelector("[data-safe-quick] input[type=password]")&&!document.querySelector("[role=combobox]")'), 'unlock precedes search');
	await cdp.evaluate('uiReview.unlock("main")');
	const beforeComposition = await cdp.evaluate('uiReview.fixtures.main.clipboard.writes.length');
	await cdp.evaluate(`(()=>{const e=document.querySelector('[role=combobox]');e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));})()`);
	assert(await cdp.evaluate('document.querySelector("[role=option][aria-selected=true]").textContent.includes("work-account")'), 'arrow key selects next account');
	assert.equal(await cdp.evaluate('uiReview.fixtures.main.clipboard.writes.length'), beforeComposition, 'IME Enter must not copy');
	await cdp.evaluate(`document.querySelector('[role=combobox]').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))`);
	await cdp.evaluate(`document.querySelector('[role=combobox]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);
	await waitFor(async () => await cdp.evaluate('uiReview.fixtures.main.clipboard.writes.length') > beforeComposition, 'explicit Enter copies selected account');
	await cdp.evaluate('uiReview.scene("no-results")');
	assert(await cdp.evaluate('!document.querySelector("[data-safe-quick] input[readonly]")'), 'no automatic password generation');
	await cdp.evaluate('uiReview.scene("generated")');
	assert(await cdp.evaluate('document.querySelector("[data-safe-quick] input[readonly]").value.length===12&&!document.querySelector("[data-safe-quick] input[readonly]").hasAttribute("value")'), 'explicit generation stays out of markup');
	await cdp.evaluate('uiReview.scene("error")'); assert(await cdp.evaluate('!!document.querySelector("[data-safe-quick] [role=alert]")'), 'failure remains visible');
	await cdp.evaluate('uiReview.scene("copied")'); assert(await cdp.evaluate('uiReview.fixtures.main.clipboard.text.length>0'), 'real service writes injected clipboard');
	await cdp.evaluate('uiReview.scene("loading")'); assert(await cdp.evaluate('!!document.querySelector("[data-safe-quick] [role=status]")&&!document.querySelector("[role=combobox]")'), 'loading state');
	await cdp.evaluate('uiReview.scene("closed")'); await waitFor(() => cdp.evaluate('!document.querySelector("[role=dialog]")'), 'closed modal');
	await cdp.evaluate('uiReview.scene("default")');
	if (sample.reducedMotion) assert(await cdp.evaluate('[...document.querySelectorAll("[data-safe-quick] button")].every(e=>getComputedStyle(e).transitionDuration.split(",").every(v=>parseFloat(v)<.01))'), 'reduced motion');
	await cdp.evaluate('document.querySelector("[role=combobox]").focus()');
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	assert(await cdp.evaluate('!!document.activeElement.closest("[role=dialog]")'), 'Tab stays inside modal');
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await waitFor(() => cdp.evaluate('!document.querySelector("[role=dialog]")'), 'Escape closes modal');
	await cdp.evaluate('uiReview.scene("default")');
	sample.actions = ['locked → unlock → per-account search', 'ArrowDown / IME guard', 'empty → explicit generation', 'copy error / success through real safe service', 'loading / close / keyboard Tab and Escape'];
}

/** Post-matrix lifecycle: locking one session closes its generated secret without closing another Document. */
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await cdp.evaluate('uiReview.scene("generated","main")');
	await waitFor(() => cdp.evaluate('!!document.querySelector("[data-safe-quick] input[readonly]")'), 'generated field before lock');
	await capture('quick-generated-before-lock');
	await cdp.evaluate('uiReview.fixtures.main.service.lock()');
	await waitFor(() => cdp.evaluate('!uiReview.docs.main.querySelector("[role=dialog]")'), 'locked session closes its picker');
	assert(await cdp.evaluate('!!uiReview.docs.other.querySelector("[role=combobox]")&&uiReview.fixtures.other.service.store.getState().status==="unlocked"'), 'another Document retains its own active picker');
	assert(await cdp.evaluate('!uiReview.docs.main.querySelector("[data-safe-quick]")&&!uiReview.docs.main.body.innerHTML.includes("PRIVATE-SECRET")'), 'locked picker leaves no content or secret markup');
	await capture('quick-lock-document-isolation');
	await cdp.evaluate('Object.values(uiReview.fixtures).forEach(f=>f.close?.())');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[role=dialog]")&&!d.querySelector("[data-safe-quick]"))'), 'both pickers close');
	result.interactions.push('generated-secret-lock-close', 'independent-document-session', 'both-pickers-closed');
}

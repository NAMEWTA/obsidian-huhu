import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-diary-page]"))';
export const layoutCSS = '[data-review=diary-tools]{width:100%;min-width:0;height:900px}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(theme.endsWith('dark') ? 'theme-dark' : 'theme-light')})`; }
const both = (cdp, code) => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{${code}})`);
const change = (cdp, label, value) => both(cdp, `const label=[...d.querySelectorAll('label')].find(e=>e.textContent===uiReview.t(${JSON.stringify(label)}));const el=d.getElementById(label.htmlFor);const proto=el.tagName==='TEXTAREA'?d.defaultView.HTMLTextAreaElement.prototype:d.defaultView.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));el.dispatchEvent(new d.defaultView.Event('change',{bubbles:true}));`);
const click = (cdp, key) => both(cdp, `[...d.querySelectorAll('button')].find(e=>!e.closest('[hidden]')&&e.textContent===uiReview.t(${JSON.stringify(key)})).click();`);
async function writingFields(cdp) {
	return cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const root=d.querySelector('[data-diary-tools]');const fields=[...root.querySelectorAll('input[type=date],textarea')].map(el=>{const style=d.defaultView.getComputedStyle(el);return {kind:el.tagName,value:el.value,width:el.getBoundingClientRect().width,contentWidth:el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),height:el.getBoundingClientRect().height}});return [name,{width:root.getBoundingClientRect().width,overflow:root.scrollWidth-root.clientWidth,fields}]}))`);
}
function assertWriting(writing) {
	for (const [name, value] of Object.entries(writing)) {
		assert(value.overflow <= 1, `${name}: writer does not overflow`);
		assert.equal(value.fields.length, 2, `${name}: date and text fields exist`);
		for (const field of value.fields) assert(field.contentWidth >= 100, `${name}: usable ${field.kind} content width ${field.contentWidth}px`);
	}
}
export async function verify({ cdp, sample, waitFor }) {
	if (await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("textarea"))')) await click(cdp, 'navigator.diary.tools.back');
	if (!await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-diary-tools]"))')) {
		await click(cdp, 'navigator.diary.tools.open');
		await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[data-diary-tools]"))'), 'search tools');
	}
	const values = await cdp.evaluate(`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{const r=d.querySelector('[data-diary-tools]');return [name,{width:r.getBoundingClientRect().width,overflow:r.scrollWidth-r.clientWidth,controls:[...r.querySelectorAll('button,input')].map(e=>({height:e.getBoundingClientRect().height,label:e.textContent||e.id}))}]}))`);
	sample.measurements = values;
	for (const value of Object.values(values)) { assert(value.overflow <= 1); for (const control of value.controls) assert(control.label && control.height >= (value.width<600?44:32)-.1, 'scoped controls'); }
	await click(cdp, 'navigator.diary.write.action');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("textarea"))'), 'writing fields');
	const writing = await writingFields(cdp);
	sample.writing = writing;
	assertWriting(writing);
	for (const [name, value] of Object.entries(writing)) assert.equal(value.fields[0].value, '2026-11-04', `${name}: date retained`);
	sample.assertions.push('DIARY-SEARCH-WRITE', 'scoped-controls', 'search-range-labels', 'no-overflow', 'writer-field-content-width');
}
export async function exercise({ cdp, waitFor, capture, result }) {
	result.interactions = [];
	result.writerStates = {};
	const captureState = async name => {
		if (await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("textarea"))')) { const fields = await writingFields(cdp); assertWriting(fields); result.writerStates[name] = fields; }
		return capture(name);
	};
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await click(cdp, 'navigator.diary.tools.back'); await click(cdp, 'navigator.diary.tools.open');
	await change(cdp, 'navigator.diary.search.query', 'no such phrase');
	assert(!await cdp.evaluate(`Object.values(uiReview.docs).some(d=>d.body.textContent.includes('No matches in the completed range'))`));
	await captureState('partial-range'); result.interactions.push('partial-not-no-results');
	await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m=>m.mode.delayed=true)`);
	await click(cdp, 'navigator.diary.search.scan');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Indexing'))`), 'indexing');
	await captureState('indexing'); await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.resume())');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('No matches in the completed range'))`), 'completed no results');
	await captureState('no-results'); result.interactions.push('complete-only-no-results');
	await click(cdp, 'navigator.diary.write.action');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('textarea'))`), 'writer');
	await change(cdp, 'navigator.diary.write.text', 'Draft retained · 中文正文 Averyveryverylongwordwithoutspaces');
	await both(cdp, `const el=d.querySelector('textarea');el.dispatchEvent(new d.defaultView.CompositionEvent('compositionstart',{bubbles:true}));el.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true,bubbles:true}));`);
	assert(await cdp.evaluate('Object.values(uiReview.mounts).every(m=>m.vault.writes===0)'));
	await both(cdp, `d.querySelector('textarea').dispatchEvent(new d.defaultView.CompositionEvent('compositionend',{bubbles:true}));`);
	await click(cdp, 'navigator.diary.tools.back');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("[role=alertdialog]"))'), 'discard confirmation');
	await captureState('discard-confirm'); await click(cdp, 'navigator.diary.write.keep');
	assert(await cdp.evaluate('Object.values(uiReview.docs).every(d=>d.querySelector("textarea").value.includes("Draft retained"))'));
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.mode.delaySave=true)');
	await click(cdp, 'navigator.diary.write.save');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Saving. Duplicate'))`), 'saving');
	await captureState('saving'); await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.resumeSave())');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Appended to periodic note'))`), 'saved');
	await captureState('saved');
	assert(await cdp.evaluate(`Object.values(uiReview.mounts).every(m=>m.vault.contents.get(m.path('2026-11-04')).includes('Original text')&&m.vault.contents.get(m.path('2026-11-04')).includes('Draft retained'))`));
	result.interactions.push('ime-no-submit', 'keep-writing', 'append-preserves-original');
	await click(cdp, 'navigator.diary.tools.back');
	await click(cdp, 'navigator.diary.tools.open'); await click(cdp, 'navigator.diary.write.action');
	await change(cdp, 'navigator.diary.write.date', '2026-11-02');
	await change(cdp, 'navigator.diary.write.text', 'Retained through every failure');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.mode.template="cancelled")');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('New text will be appended'))`), 'missing snapshot');
	await click(cdp, 'navigator.diary.write.save');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Template preparation cancelled'))`), 'template cancellation');
	await captureState('template-cancelled');
	assert(await cdp.evaluate(`Object.values(uiReview.mounts).every(m=>!m.vault.contents.has(m.path('2026-11-02')))`));
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.mode.template="unavailable")');
	await click(cdp, 'navigator.diary.write.recheck');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('New text will be appended'))`), 'retry snapshot');
	await click(cdp, 'navigator.diary.write.save');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Template or diary unavailable'))`), 'template unavailable');
	await captureState('template-unavailable');
	await change(cdp, 'navigator.diary.write.date', '2026-11-03');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('New text will be appended'))`), 'existing snapshot');
	await cdp.evaluate(`Object.values(uiReview.mounts).forEach(m=>m.vault.contents.set(m.path('2026-11-03'),'External edit'))`);
	await click(cdp, 'navigator.diary.write.save');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Unsaved editor or external change'))`), 'conflict');
	await captureState('conflict');
	await click(cdp, 'navigator.diary.write.recheck');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('New text will be appended'))`), 'review snapshot');
	await cdp.evaluate('Object.values(uiReview.mounts).forEach(m=>m.mode.writeFailure=true)');
	await click(cdp, 'navigator.diary.write.save');
	await waitFor(() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.body.textContent.includes('Save could not be verified'))`), 'write failure');
	await captureState('error');
	assert(await cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('textarea').value==='Retained through every failure')`));
	result.interactions.push('saving-duplicate-disabled', 'template-cancelled-zero-create', 'template-unavailable', 'external-conflict', 'write-error-draft-retained');
	await cdp.evaluate('uiReview.unmount()');
}

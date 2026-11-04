import assert from 'node:assert/strict';
export const ready = '!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-safe-workspace]"))';
export const layoutCSS = '[data-review=safe]{width:100%;height:calc(100dvh - 32px);min-width:0}';
export function configure({ language, theme }) { return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${theme.endsWith('dark') ? 'dark' : 'light'}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`; }
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
/** Scroll each action through its real clipping ancestors before checking pointer reachability. */
export async function verifyActionReachability({ cdp }) {
	const measurements = await cdp.evaluate(`(async()=>{const result=[];for(const [name,d] of Object.entries(uiReview.docs)){const detail=d.querySelector('[data-safe-detail]'),actions=detail.querySelector('[data-safe-detail-actions]');for(const button of actions.querySelectorAll('button')){button.scrollIntoView({block:'nearest',inline:'nearest'});await new Promise(resolve=>d.defaultView.requestAnimationFrame(()=>d.defaultView.requestAnimationFrame(resolve)));const r=button.getBoundingClientRect(),clip={top:0,left:0,right:d.defaultView.innerWidth,bottom:d.defaultView.innerHeight};let hiddenScrolled=false;for(let p=button.parentElement;p;p=p.parentElement){const s=d.defaultView.getComputedStyle(p),b=p.getBoundingClientRect();if((/hidden|clip/.test(s.overflowY)&&p.scrollTop!==0)||(/hidden|clip/.test(s.overflowX)&&p.scrollLeft!==0))hiddenScrolled=true;if(/auto|scroll|hidden|clip/.test(s.overflowY)){clip.top=Math.max(clip.top,b.top+p.clientTop);clip.bottom=Math.min(clip.bottom,b.top+p.clientTop+p.clientHeight)}if(/auto|scroll|hidden|clip/.test(s.overflowX)){clip.left=Math.max(clip.left,b.left+p.clientLeft);clip.right=Math.min(clip.right,b.left+p.clientLeft+p.clientWidth)}}const hit=d.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);result.push({document:name,label:button.textContent,top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,clip,hiddenScrolled,hit:!!hit&&(hit===button||button.contains(hit))})}}return result})()`);
	assert(measurements.length > 0, 'detail actions exist');
	for (const value of measurements) {
		assert(value.height >= 32 && value.top >= value.clip.top - 1 && value.bottom <= value.clip.bottom + 1 && value.left >= value.clip.left - 1 && value.right <= value.clip.right + 1, `${value.document}: action visible inside viewport and clipping ancestors: ${value.label}`);
		assert(!value.hiddenScrolled, `${value.document}: reaching action must not programmatically pan a non-scrollable ancestor: ${value.label}`);
		assert(value.hit, `${value.document}: action center hits its button: ${value.label}`);
	}
	return measurements;
}
export async function verify({ cdp, sample, waitFor }) {
	const both = expression => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{${expression}})`);
	await cdp.evaluate(`document.querySelector('[data-safe-entry="'+uiReview.ids.first+'"]').focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: String.fromCharCode(13) });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate('!!document.querySelector("[data-safe-detail]")'), 'keyboard opens account details');
	assert(await cdp.evaluate('!!document.activeElement.closest("[data-safe-detail]")'), 'keyboard selection moves focus into detail');
	await cdp.evaluate('uiReview.scene("detail","other")');
	const measurements = await both(`const w=d.querySelector('[data-safe-workspace]'), detail=d.querySelector('[data-safe-detail]'), list=d.querySelector('[data-safe-entries]'), scope=w.querySelector('aside'), r=detail.getBoundingClientRect(), scroll=detail.querySelector('[data-safe-detail-scroll]'), actions=detail.querySelector('[data-safe-detail-actions]'); const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};return {wide:scope.getBoundingClientRect().width>0,listVisible:list.getBoundingClientRect().width>0,container:w.clientWidth,width:w.clientWidth,overflow:w.scrollWidth-w.clientWidth,detail:rect(detail),scroll:rect(scroll),actions:rect(actions),fields:detail.textContent.includes(uiReview.ids.sourceAccount)&&detail.textContent.includes('+886 900 000 001')&&detail.textContent.includes('contact@example.test'),notes:[...detail.querySelectorAll('p[tabindex]')].map(e=>({client:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth})),controls:[...detail.querySelectorAll('button,input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>rect(e)),secret:d.body.innerHTML.includes('PRIVATE-SECRET')};`);
	for (const value of measurements) {
		assert.equal(value.wide, value.container >= 896, 'scope follows owning container width');
		assert.equal(value.listVisible, value.wide, 'wide three segments, narrow detail replaces list');
		assert(value.overflow<=1 && value.fields && !value.secret, 'full fields without horizontal overflow or secret markup');
		assert(value.actions.bottom <= value.detail.bottom + 1 && value.actions.top >= value.scroll.bottom - 1, 'actions outside scrolling details remain reachable');
		for (const note of value.notes) assert(note.scroll>note.client && note.scrollWidth<=note.width+1, 'long notes scroll and wrap without truncation');
		for (const control of value.controls) assert(control.height>= (sample.pointer==='coarse'?44:32)-1 && control.width<=value.detail.width, 'accessible detail controls fit');
	}
	sample.measurements=measurements;
	sample.actionReachability=await verifyActionReachability({ cdp });
	if (sample.reducedMotion) assert(await cdp.evaluate('[...document.querySelectorAll("[data-safe-detail] button")].every(e=>getComputedStyle(e).transitionDuration.split(",").every(v=>parseFloat(v)<.01))'), 'reduced motion');
	const before = await cdp.evaluate('Object.fromEntries(Object.entries(uiReview.fixtures).map(([name,f])=>[name,f.clipboard.writes.length]))');
	await both(`d.querySelector('[data-safe-detail-actions] button').click();`);
	await waitFor(() => cdp.evaluate(`Object.entries(uiReview.fixtures).every(([name,f])=>f.clipboard.writes.length>${JSON.stringify(before)}[name])`), 'explicit copy uses real service');
	sample.actions.push('keyboard selection', 'container-responsive details', 'full fields and long notes', 'explicit copy');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions=[];
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await cdp.evaluate('Object.values(uiReview.fixtures).forEach(f=>{f.owner.style.height="min(320px, calc(100dvh - 32px))"})');
	await cdp.evaluate('Promise.all(Object.keys(uiReview.docs).map(name=>uiReview.scene("detail",name)))');
	result.constrainedActions=await verifyActionReachability({ cdp });
	await capture('constrained-height-actions');
	result.interactions.push('constrained-height-actions-visible-and-hit');
	await cdp.evaluate('Object.values(uiReview.fixtures).forEach(f=>{f.owner.style.height=""});uiReview.configure("en","theme-light")');
	await cdp.evaluate('uiReview.fixtures.main.preferences.setViewMode("cards")');
	await waitFor(() => cdp.evaluate('[...document.querySelectorAll("[data-safe-entries] button")].some(b=>b.textContent==="1 more accounts")'), 'four-account card');
	assert(await cdp.evaluate('!document.querySelector(`[data-safe-account="${uiReview.ids.fourthAccount}"]`)'), 'fourth account starts behind more');
	await cdp.evaluate('[...document.querySelectorAll("[data-safe-entries] button")].find(b=>b.textContent==="1 more accounts").click()');
	await waitFor(() => cdp.evaluate('!!document.querySelector(`[data-safe-account="${uiReview.ids.fourthAccount}"]`)'), 'more expands remaining accounts');
	assert(await cdp.evaluate('!document.querySelector("[data-safe-detail]")'), 'more does not select first account');
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: String.fromCharCode(13) });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => cdp.evaluate('document.querySelector("[data-safe-detail]")?.textContent.includes(uiReview.ids.fourthAccount)'), 'fourth account opens by stable ID');
	await capture('cards-fourth-account');
	result.interactions.push('card-more-fourth-stable-id');
	await cdp.evaluate('uiReview.fixtures.main.preferences.setViewMode("list"); uiReview.scene("default")');
	await cdp.evaluate('document.querySelector("[data-safe-scope=favorites]").click()');
	await waitFor(() => cdp.evaluate('!document.querySelector(`[data-safe-entry="${uiReview.ids.second}"]`)'), 'favorite tag filters');
	await cdp.evaluate('uiReview.scene("invalid-relation")');
	assert(await cdp.evaluate('document.querySelector("[data-safe-detail]").textContent.includes("Target account unavailable")'), 'invalid relation diagnostic');
	await capture('relations-and-invalid-target');
	await cdp.evaluate('[...document.querySelectorAll("[data-safe-detail] button")].find(b=>b.textContent.includes("cloud@example.test")).click()');
	await waitFor(() => cdp.evaluate('document.querySelector("[data-safe-detail]").textContent.includes(uiReview.ids.targetAccount)'), 'stable relation jump');
	await cdp.evaluate('[...document.querySelectorAll("[data-safe-detail] button")].find(b=>b.textContent.includes("source@example.test")).click()');
	await waitFor(() => cdp.evaluate('document.querySelector("[data-safe-detail]").textContent.includes(uiReview.ids.sourceAccount)'), 'stable backlink jump');
	await capture('backlink-target');
	await cdp.evaluate('uiReview.fixtures.main.service.lock()');
	await waitFor(() => cdp.evaluate('!document.querySelector("[data-safe-detail]")&&!document.querySelector("[data-safe-workspace]")'), 'lock clears detail and list');
	for (const state of ['empty','loading','error','locked']) { await cdp.evaluate(`uiReview.scene(${JSON.stringify(state)})`); await capture(`workspace-${state}`); }
	result.interactions.push('favorite-tag', 'relation-and-backlink-stable-ids', 'invalid-target-diagnostic', 'lock-clears-detail', 'empty-loading-error-locked');
}

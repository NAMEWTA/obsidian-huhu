import assert from 'node:assert/strict';
import fs from 'node:fs';
export const ready =
	'!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-review=icon-picker] input[type=search]")&&d.querySelector("[data-review=icons-settings] [role=tab]")&&d.querySelector("[data-review=comments-settings] [data-slot=settings-row]")&&d.querySelector("article[data-thread-id]"))';
const moduleCSS = ['src/modules/comments/styles/comments.css', 'src/modules/icons/styles/host-icons.css'].map((f) => fs.readFileSync(new URL(`../../../${f}`, import.meta.url), 'utf8').replace(/\s+/g, ' ')).join('');
export const layoutCSS = moduleCSS + 'section[data-review]{width:100%;min-width:0;margin-bottom:12px}iframe{position:static;left:auto}';
export const settle =
	'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
const press = async (cdp, key, code = key, extra = {}) => {
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...extra });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...extra });
};
const setValue = (selector, value, doc = 'document') =>
	`(()=>{var e=${doc}.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.ownerDocument.defaultView.${selector.includes('textarea') ? 'HTMLTextAreaElement' : 'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`;
const pointerOpen = (selector, doc = 'document') =>
	`(()=>{var e=${doc}.querySelector(${JSON.stringify(selector)}),w=e.ownerDocument.defaultView;e.scrollIntoView();e.focus();e.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerType:'mouse',isPrimary:true}));})()`;

export async function verify({ cdp, sample, waitFor }) {
	const measured = await cdp.evaluate(`(() => Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{
 var win=d.defaultView,canvas=d.createElement('canvas'),ctx=canvas.getContext('2d');
 var rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
 var luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
 var ratio=(a,b)=>{var f=rgb(a),k=rgb(b),alpha=f[3]/255,x=luminance(f.slice(0,3).map((v,i)=>v*alpha+k[i]*(1-alpha))),y=luminance(k);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 var bg=e=>{for(;e;e=e.parentElement){var c=win.getComputedStyle(e).backgroundColor;if(rgb(c)[3]>250)return c}return win.getComputedStyle(d.body).backgroundColor};
 var scopes=[...d.querySelectorAll('.huhu-design:not(.huhu-portal-root)')];
 var out=scopes.map(scope=>{
  var box=scope.getBoundingClientRect();
  var label=scope.closest('[data-review]')?.dataset.review||'?';
  var texts=[...scope.querySelectorAll('p,span,h2,h3,label,[data-slot=label]')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getBoundingClientRect().width).slice(0,40);
  var contrastText=Math.min(...texts.map(e=>ratio(win.getComputedStyle(e).color,bg(e))),21);
  var inputs=[...scope.querySelectorAll('input:not([type=color]):not([type=range]),textarea,[role=combobox]')].filter(e=>e.getBoundingClientRect().width);
  var contrastInput=Math.min(...inputs.map(e=>ratio(win.getComputedStyle(e).borderTopColor,bg(e))),21);
  var controls=[...scope.querySelectorAll('button,input,textarea,[role=combobox],[role=checkbox],[role=switch],[role=radio],[role=tab],a[href]')].flatMap(e=>{var r=e.getBoundingClientRect(),s=win.getComputedStyle(e),p=win.getComputedStyle(e,'::before');return r.width&&r.height?[{label:(e.getAttribute('aria-label')||e.textContent||e.type).slice(0,60),role:e.getAttribute('role')||e.tagName,width:Math.max(r.width,parseFloat(p.width)||0),height:Math.max(r.height,parseFloat(p.height)||0),transition:s.transitionDuration}]:[]});
  var overflows=[...scope.querySelectorAll('*')].flatMap(e=>{var r=e.getBoundingClientRect();return r.width&&(r.right>box.right+1||r.left<box.left-1||e.scrollWidth>e.clientWidth+1&&!e.querySelector('button,[data-hit-control]')&&e.tagName!=='BUTTON'&&e.dataset.slot!=='slider-thumb'&&win.getComputedStyle(e).overflowX==='visible'&&e.tagName!=='svg'&&!e.closest('svg'))?[{sw:e.scrollWidth,cw:e.clientWidth,tag:e.tagName,slot:e.dataset.slot,cls:String(e.className).slice(0,80),text:e.textContent.slice(0,60),right:r.right-box.right,left:box.left-r.left}]:[]}).slice(-8);
  var widest=[...scope.querySelectorAll('*')].map(e=>{var r=e.getBoundingClientRect(),pw=parseFloat(win.getComputedStyle(e,'::before').width)||0;return {e,r:{width:r.width,right:r.right+Math.max(0,(pw-r.width)/2)}}}).filter(x=>x.r.width).sort((a,b)=>b.r.right-a.r.right)[0];
  return {widest:widest&&{tag:widest.e.tagName,slot:widest.e.dataset.slot,cls:String(widest.e.className).slice(0,100),text:widest.e.textContent.slice(0,40),over:widest.r.right-box.right},label,width:box.width,scroll:scope.scrollWidth,client:scope.clientWidth,contrastText,contrastInput,controls,overflows,notices:scope.querySelectorAll('.huhu-design-notices').length};
 });
 return [name,{scopes:out,portals:d.querySelectorAll('.huhu-design.huhu-portal-root').length,focusProbe:ratio(win.getComputedStyle(d.body).color,bg(d.body))}];
 })))()`);
	sample.measurements = measured;
	for (const [name, value] of Object.entries(measured)) {
		assert.equal(value.scopes.length, 4, `${name}: four owned content scopes`);
		assert.equal(value.portals, 4, `${name}: one owned portal per scope`);
		const min = sample.pointer === 'coarse' ? 44 : 32;
		for (const scope of value.scopes) {
			assert(scope.width > 0, `${name} ${scope.label}: real leaf`);
			assert(scope.scroll <= scope.client + 1, `${name} ${scope.label}: scope overflow ${scope.scroll}/${scope.client} ${JSON.stringify(scope.widest)}`);
			assert.deepEqual(scope.overflows, [], `${name} ${scope.label}: descendants overflow ${JSON.stringify(scope.overflows)}`);
			assert(scope.contrastText >= 4.5, `${name} ${scope.label}: text contrast ${scope.contrastText}`);
			assert(scope.contrastInput >= 3, `${name} ${scope.label}: control boundary contrast ${scope.contrastInput}`);
			assert.equal(scope.notices, 1, `${name} ${scope.label}: notice outlet`);
			for (const control of scope.controls) {
				assert(
					control.width >= min - 0.1 && control.height >= min - 0.1,
					`${name} ${scope.label}: hit area ${JSON.stringify(control)}`,
				);
				if (sample.reducedMotion)
					assert(
						control.transition.split(',').every((v) => parseFloat(v) === 0),
						`${name} ${scope.label}: motion ${control.label}`,
					);
			}
		}
	}
	sample.assertions.push(
		'real-comments-and-icons-leaves',
		'scope-no-overflow',
		'text-and-boundary-contrast',
		'owned-portals-two-documents',
		'hit-targets',
		'reduced-motion',
	);
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = (result.interactions = []);
	const q = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
	const click = (expression) => cdp.evaluate(`(()=>{var e=${expression};if(!e)throw new Error(${JSON.stringify('missing click target: ' + expression.slice(0, 160))});e.click()})()`);
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.evaluate(`uiReview.configure('en','theme-light')`);
	const panel = '[data-review=panel-main]';

	// Search without matches is not the empty state, and clearing restores rows.
	await cdp.evaluate(setValue(`${panel} input[aria-label="${'Search highlights and notes'}"]`, 'zzz-no-match'));
	await waitFor(() => cdp.evaluate(`!!${q(panel)}.textContent.includes(uiReview.t('editor.highlights.noResults'))`), 'no results');
	assert(await cdp.evaluate(`!${q(panel)}.textContent.includes(uiReview.t('editor.comments.empty'))`));
	assert(await cdp.evaluate(`${q(panel)}.querySelectorAll('article').length===0`));
	result.noResultsScreenshot = await capture('comments-no-results');
	await click(`[...${q(panel)}.querySelectorAll('button')].find(b=>b.textContent===uiReview.t('editor.highlights.clearFilters'))`);
	await waitFor(() => cdp.evaluate(`${q(panel)}.querySelectorAll('article').length===3`), 'rows restored');
	actions.push({ action: 'Search with no match shows no-results with Clear filters (not the empty state); clearing restores 3 cards' });

	// Storage failure is persistent and Retry recovers; the cards stay.
	await cdp.evaluate(`uiReview.mounts.main.service.state.setState({error:true})`);
	await waitFor(() => cdp.evaluate(`!!${q(panel)}.querySelector('[role=alert]')`), 'storage alert');
	assert(await cdp.evaluate(`${q(panel)}.querySelectorAll('article').length===3`));
	result.storageFailureScreenshot = await capture('comments-storage-failed');
	await click(`${q(panel)}.querySelector('[role=alert] button')`);
	await waitFor(() => cdp.evaluate(`!${q(panel)}.querySelector('[role=alert]')`), 'retry clears alert');
	actions.push({ action: 'Storage error keeps existing cards, shows persistent alert with Retry; Retry clears it' });

	// A failed durable card action keeps the card and is retryable.
	await cdp.evaluate(`uiReview.mounts.main.failWrites(true)`);
	await click(`${q(panel)}.querySelector('article button[aria-label="${'Pin or unpin'}"]')`);
	await waitFor(() => cdp.evaluate(`!!${q(panel)}.querySelector('article [role=alert]')`), 'card failure');
	assert(await cdp.evaluate(`${q(panel)}.querySelectorAll('article').length===3`));
	await cdp.evaluate(`uiReview.mounts.main.failWrites(false)`);
	await click(`${q(panel)}.querySelector('article button[aria-label="${'Pin or unpin'}"]')`);
	await waitFor(() => cdp.evaluate(`!${q(panel)}.querySelector('article [role=alert]')`), 'card retry');
	actions.push({ action: 'Failed Pin write shows card alert and keeps the card; retrying the action succeeds and clears it' });

	// Export: failure persists in the panel; success is an owned, non-overlapping notice.
	const openMore = async () => {
		await cdp.evaluate(pointerOpen(`${panel} button[aria-label="More comment actions"]`));
		await waitFor(() => cdp.evaluate(`!!document.querySelector('.huhu-design.huhu-portal-root [role=menu]')`), 'menu in owned portal');
	};
	const exportItem = `[...document.querySelectorAll('.huhu-design.huhu-portal-root [role=menuitem]')].find(e=>e.textContent.includes(uiReview.t('editor.highlights.export')))`;
	await cdp.evaluate(`uiReview.mounts.main.exportFails(true)`);
	await openMore();
	await click(exportItem);
	await waitFor(() => cdp.evaluate(`!![...${q(panel)}.querySelectorAll('[role=alert]')].find(e=>e.textContent===uiReview.t('editor.highlights.exportFailed'))`), 'export failure persistent');
	await cdp.evaluate(`uiReview.mounts.main.exportFails(false)`);
	await openMore();
	await click(exportItem);
	await waitFor(() => cdp.evaluate(`!!${q(panel)}.querySelector('[data-sonner-toast][data-mounted=true]')`), 'owned export notice');
	const notice = await cdp.evaluate(
		`(()=>{var n=${q(panel)}.querySelector('[data-sonner-toast]').getBoundingClientRect(),s=${q(panel)}.querySelector('input[aria-label="Search highlights and notes"]').getBoundingClientRect();return {bottom:n.bottom,primaryTop:s.top,other:uiReview.docs.other.querySelectorAll('[data-sonner-toast]').length}})()`,
	);
	assert(notice.bottom <= notice.primaryTop + 1 && notice.other === 0, JSON.stringify(notice));
	assert(await cdp.evaluate(`!${q(panel)}.querySelector('[role=alert]')`));
	result.noticeGeometry = notice;
	result.noticeScreenshot = await capture('comments-export-notice');
	actions.push({ action: 'Export failure persists as panel alert; success notice is owned by the panel and sits above the search field' });

	// Compose popover: IME guard, failed durable write retains the draft, Retry saves.
	await cdp.evaluate(`uiReview.mounts.main.channel.open({path:'a.md',ownerDocument:document,rect:()=>new DOMRect(24,300,90,20),mode:'compose',anchor:uiReview.createAnchor('compose target',0,14),pinned:true})`);
	const compose = '[data-comments-overlay=compose]';
	await waitFor(() => cdp.evaluate(`!!${q(`${compose} textarea`)}`), 'compose popover');
	const geometry = await cdp.evaluate(`(()=>{var r=${q(compose)}.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}})()`);
	assert(geometry.left >= -0.5 && geometry.right <= geometry.width + 0.5, `popover inside viewport ${JSON.stringify(geometry)}`);
	await cdp.evaluate(setValue(`${compose} textarea`, 'Draft that must survive'));
	await cdp.evaluate(`uiReview.mounts.main.failWrites(true)`);
	await cdp.evaluate(`${q(`${compose} textarea`)}.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true,bubbles:true,cancelable:true}))`);
	assert.equal(await cdp.evaluate(`uiReview.mounts.main.store.threadsFor('a.md').length`), 3);
	await cdp.evaluate(`${q(`${compose} textarea`)}.focus()`);
	await press(cdp, 'Enter', 'Enter', { modifiers: 2 });
	await waitFor(() => cdp.evaluate(`!!${q(`${compose} [role=alert]`)}`), 'compose failure alert');
	assert(await cdp.evaluate(`${q(`${compose} textarea`)}.value==='Draft that must survive'`));
	result.composeFailureScreenshot = await capture('comments-compose-failed');
	await cdp.evaluate(`uiReview.mounts.main.failWrites(false)`);
	await click(`[...${q(compose)}.querySelectorAll('button')].find(b=>b.textContent===uiReview.t('editor.comments.retry'))`);
	await waitFor(() => cdp.evaluate(`uiReview.mounts.main.channel.state.getState().request===null`), 'compose retry closes');
	assert(await cdp.evaluate(`uiReview.mounts.main.store.threadsFor('a.md').some(t=>t.messages[0]?.text==='Draft that must survive')`));
	actions.push({ action: 'Composer: IME Ctrl+Enter ignored; failed write keeps draft and shows alert; Retry persists once and closes' });

	// Icons settings: failed preference write is persistent; next write clears it.
	const icons = '[data-review=icons-settings]';
	await cdp.evaluate(
		`(()=>{var tab=[...${q(icons)}.querySelectorAll('[role=tab]')][1];tab.focus();tab.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0}));})()`,
	);
	await waitFor(() => cdp.evaluate(`!!${q(icons)}.querySelector('[role=tabpanel] [role=switch]')`), 'icon switches');
	await cdp.evaluate(`uiReview.mounts.main.failIcons(true)`);
	await click(`${q(icons)}.querySelector('[role=tabpanel] [role=switch]')`);
	await waitFor(() => cdp.evaluate(`!!${q(icons)}.querySelector('[role=tabpanel] [role=alert]')`), 'icon write failure');
	result.iconsFailureScreenshot = await capture('icons-write-failed');
	await cdp.evaluate(`uiReview.mounts.main.failIcons(false)`);
	await click(`${q(icons)}.querySelector('[role=tabpanel] [role=switch]')`);
	await waitFor(() => cdp.evaluate(`!${q(icons)}.querySelector('[role=alert]')`), 'icon retry clears alert');
	actions.push({ action: 'Icon preference write failure stays visible in the leaf; the next write clears it' });

	// Icon picker: search, keyboard selection, own-document Select portals.
	const picker = '[data-review=icon-picker]';
	await cdp.evaluate(`${q(`${picker} input[type=search]`)}.focus()`);
	await cdp.evaluate(setValue(`${picker} input[type=search]`, 'star'));
	await waitFor(() => cdp.evaluate(`${q(picker)}.querySelectorAll('button[aria-label]').length>0`), 'picker results');
	await press(cdp, 'Enter');
	await waitFor(() => cdp.evaluate(`uiReview.mounts.main.accepted.length===1`), 'picker accept');
	for (const name of ['main', 'other']) {
		await cdp.evaluate(`(()=>{var d=uiReview.docs.${name},w=d.defaultView,b=[...d.querySelectorAll('[data-review=icon-picker] [role=combobox]')][0];b.scrollIntoView();b.focus();b.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerType:'mouse',isPrimary:true}))})()`);
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-design.huhu-portal-root [role=listbox]')`), `${name} owned Select`);
		assert(await cdp.evaluate(`uiReview.docs.${name}.querySelector('[role=listbox]').ownerDocument===uiReview.docs.${name}`));
		await cdp.evaluate(`(()=>{var d=uiReview.docs.${name};d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))})()`);
		await waitFor(() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=listbox]')`), `${name} Select closes`);
	}
	actions.push({ action: 'Icon picker search plus Enter selects the first icon; Selects open and close in each owning Document' });

	// Keyboard modality shows the approved focus ring on owned controls.
	await cdp.evaluate(`${q(`${panel} input[aria-label="Search highlights and notes"]`)}.focus()`);
	await press(cdp, 'Tab', 'Tab');
	assert(
		await cdp.evaluate(
			`document.activeElement.matches(':focus-visible')&&!!document.activeElement.closest('.huhu-design')&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=3`,
		),
	);
	actions.push({ action: 'Keyboard Tab from search shows a 3px visible focus ring inside the owned scope' });

	// Wide zh layout, popover threads mode with a long card.
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.evaluate(`uiReview.configure('zh','theme-dark')`);
	const id = await cdp.evaluate(`uiReview.mounts.main.store.threadsFor('a.md')[0].id`);
	await cdp.evaluate(`uiReview.mounts.main.channel.open({path:'a.md',ownerDocument:document,rect:()=>new DOMRect(600,200,90,20),mode:'threads',threadIds:[${JSON.stringify(id)}],pinned:true})`);
	await waitFor(() => cdp.evaluate(`!!${q('[data-comments-overlay=threads] article')}`), 'threads popover');
	const threads = await cdp.evaluate(`(()=>{var p=${q('[data-comments-overlay=threads]')},r=p.getBoundingClientRect();return {scroll:p.scrollWidth,client:p.clientWidth,left:r.left,right:r.right,width:innerWidth}})()`);
	assert(threads.scroll <= threads.client + 1 && threads.left >= 0 && threads.right <= threads.width, JSON.stringify(threads));
	result.threadsScreenshot = await capture('comments-threads-zh-dark');
	await press(cdp, 'Escape');
	await cdp.evaluate(`uiReview.mounts.main.channel.close(false)`);
	actions.push({ action: 'Threads popover with a long unbroken card stays inside the viewport without horizontal overflow (zh, dark, 1440)' });

	result.states = {
		covered: ['initial', 'empty-vs-no-results', 'storage-error-retry', 'card-write-failure-retry', 'export-failure', 'export-success-notice', 'compose-busy-failure-retry', 'icon-write-failure', 'picker-search-select'],
		notApplicable: ['offline/permission/read-only/cancel: these modules read and write the local vault only; no such service state exists, so none is fabricated'],
		boundary: 'iframe ownership is not an Obsidian popout; MarkdownRenderer, vault and editor are stubs; host icon rendering and real CodeMirror marks are user-verified in the host',
	};
	await cdp.evaluate('uiReview.unmount()');
	assert(await cdp.evaluate(`Object.values(uiReview.docs).every(d=>!d.querySelector('.huhu-design.huhu-portal-root'))`));
	actions.push({ action: 'Both mounts unmounted and owned portals removed' });
}

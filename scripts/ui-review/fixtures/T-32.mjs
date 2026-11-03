import assert from 'node:assert/strict';
export const ready = "!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelectorAll(\".huhu-design:not(.huhu-portal-root)\").length===3&&d.querySelector(\"[data-review=archives] [data-resource-id], [data-review=archives] tbody tr, [data-review=archives] [data-slot=card]\"))";
export const layoutCSS = '.review-region{width:100%;min-width:0;height:620px;display:flex;flex-direction:column;overflow:auto;margin-bottom:16px;border:1px solid var(--background-modifier-border)}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
const measure = `(() => Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{
 var win=d.defaultView,canvas=d.createElement('canvas'),ctx=canvas.getContext('2d');
 var rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
 var lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
 var ratio=(a,b)=>{var f=rgb(a),k=rgb(b),al=f[3]/255,x=lum(f.slice(0,3).map((v,i)=>v*al+k[i]*(1-al))),y=lum(k);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 var body=win.getComputedStyle(d.body);
 var regions=Object.fromEntries([...d.querySelectorAll('[data-review]')].map(region=>{
  var scope=region.querySelector('.huhu-design:not(.huhu-portal-root)');
  if(!scope)return [region.dataset.review,{missing:true}];
  var box=scope.getBoundingClientRect(),regionBox=region.getBoundingClientRect();
  var clipped=e=>{for(var p=e.parentElement;p&&p!==scope;p=p.parentElement){var s=win.getComputedStyle(p);if(/(auto|scroll|hidden)/.test(s.overflowX))return true}return false};
  var overflows=[...scope.querySelectorAll('*')].flatMap(e=>{var r=e.getBoundingClientRect();return r.width&&(r.right>regionBox.right+1||r.left<regionBox.left-1)&&!clipped(e)?[{tag:e.tagName,cls:String(e.className).slice(0,80),text:e.textContent.slice(0,50),right:r.right-regionBox.right}]:[]}).slice(0,8);
  var controls=[...scope.querySelectorAll('button,input:not([type=hidden]),textarea,[role=combobox],[role=checkbox],[role=switch],a[href]')].flatMap(e=>{var r=e.getBoundingClientRect(),s=win.getComputedStyle(e),p=win.getComputedStyle(e,'::before');return r.width&&r.height&&s.visibility!=='hidden'?[{label:(e.getAttribute('aria-label')||e.textContent||e.placeholder||'').slice(0,50),tag:e.tagName,width:Math.max(r.width,parseFloat(p.width)||0),height:Math.max(r.height,parseFloat(p.height)||0),transition:s.transitionDuration,joined:!!e.closest('[data-hit-group]')&&e.matches('[data-hit-control]')}]:[]});
  var input=scope.querySelector('input'),btn=scope.querySelector('button');
  var contrast={};
  if(input){var s=win.getComputedStyle(input);contrast.text=ratio(s.color,body.backgroundColor);contrast.input=ratio(s.borderColor,body.backgroundColor)}
  var wide=[...scope.querySelectorAll('*')].flatMap(e=>{var r=e.getBoundingClientRect();return r.width&&r.right>box.right+1&&!clipped(e)?[{tag:e.tagName,cls:String(e.className).slice(0,60),text:e.textContent.slice(0,30),right:Math.round(r.right-box.right)}]:[]}).slice(0,6);
  return [region.dataset.review,{wide,scroll:scope.scrollWidth,client:scope.clientWidth,regionScroll:region.scrollWidth,regionClient:region.clientWidth,overflows,controls,contrast,scopeFont:win.getComputedStyle(scope).fontFamily.slice(0,30),hasTokens:win.getComputedStyle(scope).getPropertyValue('--ui-hit-desktop').trim()}]
 }));
 var probe=d.createElement('span');probe.style.color='var(--interactive-accent)';d.body.append(probe);var focus=ratio(win.getComputedStyle(probe).color,body.backgroundColor);probe.remove();
 return [name,{regions,focus,portals:d.querySelectorAll('.huhu-design.huhu-portal-root').length,scopes:d.querySelectorAll('.huhu-design:not(.huhu-portal-root)').length,pageOverflow:d.documentElement.scrollWidth>win.innerWidth+1}]
})))()`;
export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(measure);
	sample.measurements = Object.fromEntries(Object.entries(measured).map(([k, v]) => [k, { focus: v.focus, portals: v.portals, scopes: v.scopes, regions: Object.fromEntries(Object.entries(v.regions).map(([r, x]) => [r, { scroll: x.scroll, client: x.client, controls: x.controls?.length }])) }]));
	const min = sample.pointer === 'coarse' ? 44 : 32;
	for (const [name, value] of Object.entries(measured)) {
		assert.equal(value.scopes, 3, `${name}: three owned content scopes`);
		assert.equal(value.portals, 3, `${name}: one owned portal per scope`);
		assert(!value.pageOverflow, `${name}: page overflow`);
		assert(value.focus >= 3, `${name}: focus contrast ${value.focus}`);
		for (const [region, x] of Object.entries(value.regions)) {
			assert(!x.missing, `${name} ${region}: scope mounted`);
			assert(x.hasTokens, `${name} ${region}: design tokens`);
			assert(x.scroll <= x.client + 1, `${name} ${region}: leaf overflow ${x.scroll}/${x.client} ${JSON.stringify(x.wide)}`);
			assert(x.regionScroll <= x.regionClient + 1, `${name} ${region}: region overflow ${x.regionScroll}/${x.regionClient}`);
			assert.deepEqual(x.overflows, [], `${name} ${region}: child overflow`);
			if (x.contrast.text) assert(x.contrast.text >= 4.5 && x.contrast.input >= 3, `${name} ${region}: contrast ${JSON.stringify(x.contrast)}`);
			assert(x.controls.length > 0, `${name} ${region}: controls`);
			for (const c of x.controls) {
				// Joined items of a shared hit group keep their own inline partition (base.css); only block size is the full target.
				assert((c.joined || c.width >= min - 0.1) && c.height >= min - 0.1, `${name} ${region}: hit area ${JSON.stringify(c)}`);
				if (sample.reducedMotion) assert(c.transition.split(',').every(v => parseFloat(v) === 0), `${name} ${region}: motion ${c.label}`);
			}
		}
	}
	sample.assertions.push('real-vault-and-archives-content', 'owned-scopes-and-portals', 'no-leaf-overflow', 'hit-targets', 'reduced-motion', 'contrast');
}
export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = (result.interactions = []);
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
	await cdp.evaluate(`uiReview.configure('en','theme-light')`);
	await cdp.evaluate(`window.rv={
 region:n=>document.querySelector('[data-review='+n+']'),
 set(e,v){Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}))},
 button(root,text){return [...root.querySelectorAll('button,[role=menuitem]')].find(b=>(b.getAttribute('aria-label')||b.textContent).trim()===text||(b.getAttribute('aria-label')||'').startsWith(text))},
 click(root,text){var b=rv.button(root,text);if(!b)throw Error('no button '+text);b.scrollIntoView({block:'center'});b.click()},
 portal:()=>[...document.querySelectorAll('.huhu-design.huhu-portal-root')].find(p=>p.querySelector('[role=dialog],[role=alertdialog]'))
}`);
	// 1. Locked vault: failure keeps the page usable and a real retry unlocks.
	await cdp.evaluate(`var r=rv.region('safe-locked'),i=r.querySelector('input[type=password]');i.focus();rv.set(i,'wrong-password');r.querySelector('form').requestSubmit()`);
	await waitFor(() => cdp.evaluate(`!!rv.region('safe-locked').querySelector('[role=alert]')`), 'unlock failure persists in page');
	assert.equal(await cdp.evaluate(`rv.region('safe-locked').querySelector('[role=alert]').textContent`), await cdp.evaluate(`uiReview.t('safe.error.authentication')`));
	assert.equal(await cdp.evaluate('uiReview.behaviors.unlocks'), 1);
	result.lockedFailure = await capture('safe-unlock-failed');
	await cdp.evaluate(`uiReview.behaviors.unlock='ok';var r=rv.region('safe-locked'),i=r.querySelector('input[type=password]');rv.set(i,'right-password');r.querySelector('form').requestSubmit()`);
	await waitFor(() => cdp.evaluate(`!!rv.region('safe-locked').querySelector('[type=search]')`), 'retry unlocks');
	actions.push({ action: 'Locked vault: failed unlock keeps a persistent alert in the page; retry unlocks' });
	await cdp.evaluate(`uiReview.mounts.main.locked.lock();uiReview.behaviors.unlock='reject'`);
	// 2. Unlocked vault: no results, editor dialog, failure retention, IME, generate/copy, discard guard.
	await cdp.evaluate(`var r=rv.region('safe-unlocked');var s=r.querySelector('[type=search]');s.scrollIntoView();rv.set(s,'zzzz-none')`);
	await waitFor(() => cdp.evaluate(`rv.region('safe-unlocked').textContent.includes(uiReview.t('safe.noResults'))`), 'no results');
	await cdp.evaluate(`rv.set(rv.region('safe-unlocked').querySelector('[type=search]'),'')`);
	await waitFor(() => cdp.evaluate(`rv.region('safe-unlocked').textContent.includes('Private mailbox')`), 'results restored');
	await cdp.evaluate(`rv.click(rv.region('safe-unlocked'),uiReview.t('safe.addEntry'))`);
	await waitFor(() => cdp.evaluate(`!!rv.portal()`), 'entry dialog');
	assert(await cdp.evaluate(`!!rv.portal().querySelector('[role=dialog]')&&rv.portal().closest('body')===document.body`));
	await cdp.evaluate(`var d=rv.portal();var title=d.querySelector('input[aria-label="'+uiReview.t('safe.titleField')+'"]');title.focus();rv.set(title,'Draft 保留')`);
	assert(await cdp.evaluate(`!!document.activeElement.closest('[role=dialog]')`));
	// IME Enter never saves.
	await cdp.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}))`);
	assert.equal(await cdp.evaluate('uiReview.behaviors.saves'), 0);
	// Password: show/hide, generate, copy with visible confirmation.
	await cdp.evaluate(`var d=rv.portal();var f=d.querySelector('[role=dialog]');rv.click(f,uiReview.t('safe.generatePassword'))`);
	await cdp.evaluate(`var f=rv.portal().querySelector('[role=dialog]');rv.click(f,uiReview.t('safe.showPassword'))`);
	assert.equal(await cdp.evaluate(`rv.portal().querySelector('input[aria-label^="'+uiReview.t('safe.passwordField')+'"]').type`), 'text');
	assert.equal(await cdp.evaluate(`rv.portal().querySelector('input[aria-label^="'+uiReview.t('safe.passwordField')+'"]').value`), 'Aa2!Bb3@Cc4#');
	await cdp.evaluate(`rv.click(rv.portal().querySelector('[role=dialog]'),uiReview.t('safe.copyPassword'))`);
	await waitFor(() => cdp.evaluate(`!![...rv.portal().querySelectorAll('[role=status]')].find(e=>e.textContent===uiReview.t('safe.copiedPassword'))`), 'copy confirmation');
	// Rejected save retains every input and shows a persistent alert.
	await cdp.evaluate(`rv.portal().querySelector('[role=dialog] form').requestSubmit()`);
	await waitFor(() => cdp.evaluate(`!!rv.portal().querySelector('[role=dialog] [role=alert]')`), 'save failure alert');
	assert.equal(await cdp.evaluate(`rv.portal().querySelector('input[aria-label="'+uiReview.t('safe.titleField')+'"]').value`), 'Draft 保留');
	assert.equal(await cdp.evaluate('uiReview.behaviors.saves'), 1);
	await cdp.evaluate(settle);
	result.safeSaveFailure = await capture('safe-save-failed');
	// Escape with a dirty draft asks before discarding.
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await waitFor(() => cdp.evaluate(`!!rv.portal().querySelector('[role=alertdialog]')`), 'discard guard');
	await cdp.evaluate(`rv.click(rv.portal().querySelector('[role=alertdialog]'),uiReview.t('safe.keepEditing'))`);
	await waitFor(() => cdp.evaluate(`!rv.portal().querySelector('[role=alertdialog]')`), 'keep editing');
	assert.equal(await cdp.evaluate(`rv.portal().querySelector('input[aria-label="'+uiReview.t('safe.titleField')+'"]').value`), 'Draft 保留');
	await cdp.evaluate(`uiReview.behaviors.save='ok';rv.portal().querySelector('[role=dialog] form').requestSubmit()`);
	await waitFor(() => cdp.evaluate(`!document.querySelector('.huhu-design.huhu-portal-root [role=dialog]')`), 'retry saves and closes');
	assert.equal(await cdp.evaluate('uiReview.behaviors.saves'), 2);
	actions.push({ action: 'Vault editor: IME Enter ignored; generate/show/copy with visible confirmation; failed save keeps draft and alert; Escape guards dirty draft; retry saves' });
	// 3. Archives: new record, failed write keeps input, retry commits.
	await cdp.evaluate(`rv.click(rv.region('archives'),uiReview.t('archives.newRecord'))`);
	await waitFor(() => cdp.evaluate(`!!rv.region('archives').querySelector('form, [data-archive-editor], input')&&!![...rv.region('archives').querySelectorAll('button')].find(b=>b.textContent===uiReview.t('archives.saveActive'))`), 'archive editor');
	await cdp.evaluate(`var r=rv.region('archives');var i=r.querySelector('input');i.focus();rv.set(i,'Retained 名称');uiReview.mounts.main.archive.files.beforeWrite=()=>{throw new Error('disk full')}`);
	await cdp.evaluate(`rv.click(rv.region('archives'),uiReview.t('archives.saveActive'))`);
	await waitFor(() => cdp.evaluate(`!!rv.region('archives').querySelector('[role=alert]')`), 'archive save failure alert');
	assert.equal(await cdp.evaluate(`rv.region('archives').querySelector('input').value`), 'Retained 名称');
	result.archiveSaveFailure = await capture('archives-save-failed');
	await cdp.evaluate(`uiReview.mounts.main.archive.files.beforeWrite=undefined;rv.click(rv.region('archives'),uiReview.t('archives.saveActive'))`);
	await waitFor(() => cdp.evaluate(`!rv.region('archives').querySelector('[role=alert]')&&rv.region('archives').textContent.includes('Retained 名称')&&!![...rv.region('archives').querySelectorAll('button')].find(b=>b.textContent===uiReview.t('contacts.back'))`), 'archive retry commits to detail');
	result.archiveDetail = await capture('archives-detail');
	await cdp.evaluate(`rv.click(rv.region('archives'),uiReview.t('contacts.back'))`);
	await waitFor(() => cdp.evaluate(`!![...rv.region('archives').querySelectorAll('button')].find(b=>b.textContent===uiReview.t('archives.newRecord'))`), 'back to list');
	actions.push({ action: 'Archives: failed save keeps the typed name and shows a persistent alert; retry commits and opens the detail; back returns to the list' });
	// Keyboard focus visibility on a design control.
	await cdp.evaluate(`var i=rv.region('archives').querySelector('input');i.scrollIntoView({block:'center'});i.focus()`);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	assert(await cdp.evaluate(`document.activeElement.matches(':focus-visible')&&!!document.activeElement.closest('.huhu-design')&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2`));
	actions.push({ action: 'Real Tab shows a visible focus ring on an owned control' });
	// Owned scopes unmount cleanly.
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate(`document.querySelectorAll('.huhu-design.huhu-portal-root').length===0`), 'portals removed on unmount');
	actions.push({ action: 'Unmount removes every owned portal in both documents' });
}

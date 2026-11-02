import assert from 'node:assert/strict';

export const ready = '!!window.uiReview && !!uiReview.docs.other.querySelector("[data-review=input]")';
export const layoutCSS = '.review-row{display:flex;flex-wrap:wrap;gap:16px;margin-block:16px}[data-review=scope]>input{margin-block:12px}';
export const settle = 'Promise.all(Object.values(uiReview.docs).flatMap(d=>[...d.querySelectorAll("[data-review] input,[data-review=primary]")].flatMap(e=>e.getAnimations().filter(a=>a.effect.getTiming().iterations !== Infinity).map(a=>a.finished.catch(()=>{})))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}

export async function verify({ cdp, sample }) {
	const measured = await cdp.evaluate(`(() => {
		const styleKeys=['fontFamily','fontSize','lineHeight','letterSpacing','color','backgroundColor','borderColor','borderRadius','height','transitionDuration'];
		const docs=Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{
			const win=d.defaultView, read=e=>Object.fromEntries(styleKeys.map(key=>[key,win.getComputedStyle(e)[key]]));
			const control=d.querySelector('[data-review=control] input'),nested=d.querySelector('[data-review=nested] input'),input=d.querySelector('[data-review=input]'),button=d.querySelector('[data-review=primary]');
			const box=button.getBoundingClientRect(),pseudo=win.getComputedStyle(button,'::before');
			const targets=[...d.querySelectorAll('[data-slot=button],[data-slot=input],[data-slot=textarea],[data-slot=checkbox],[data-slot=switch],[data-slot=select-trigger],[data-slot=tabs-trigger]')].flatMap(e=>{const r=e.getBoundingClientRect(),p=win.getComputedStyle(e,'::before');return r.width&&r.height?[{slot:e.dataset.slot,tag:e.tagName,label:(e.getAttribute('aria-label')||e.textContent).slice(0,60),width:Math.max(r.width,parseFloat(p.width)||0),height:Math.max(r.height,parseFloat(p.height)||0)}]:[]});
			return [name,{targets,compactSelect:read(d.querySelector('[data-review=compact-select]')),error:read(d.querySelector('[data-review=scope] [aria-invalid=true]')),control:read(control),nested:read(nested),input:read(input),button:read(button),hit:[Math.max(box.width,parseFloat(pseudo.width)||0),Math.max(box.height,parseFloat(pseudo.height)||0)],scopePortals:d.querySelectorAll('.huhu-design.huhu-portal-root').length,legacyPortals:d.querySelectorAll('.huhu-portal-root:not(.huhu-design)').length}];
		}));
		const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
		const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
		const luminance=channels=>channels.slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
		const ratio=(a,b)=>{const front=rgb(a),back=rgb(b),alpha=front[3]/255;const x=luminance(front.slice(0,3).map((c,i)=>c*alpha+back[i]*(1-alpha))),y=luminance(back);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
		const focusProbe=document.createElement('span');focusProbe.style.color='var(--interactive-accent)';document.body.append(focusProbe);const focusColor=getComputedStyle(focusProbe).color;focusProbe.remove();
		const button=getComputedStyle(document.querySelector('[data-review=primary]')),input=getComputedStyle(document.querySelector('[data-review=input]')),body=getComputedStyle(document.body),checkbox=getComputedStyle(document.querySelector('[data-slot=checkbox][data-state=unchecked]:not(:disabled)')),track=getComputedStyle(document.querySelector('[data-slot=switch][data-state=unchecked]:not(:disabled)'));
		return {docs,stateNames:[...document.querySelectorAll('[data-review-state]')].map(e=>e.dataset.reviewState),overflow:document.documentElement.scrollWidth>innerWidth+1,contrast:{focus:ratio(focusColor,body.backgroundColor),checkbox:ratio(checkbox.borderColor,body.backgroundColor),switch:ratio(track.backgroundColor,body.backgroundColor),button:ratio(button.color,button.backgroundColor),text:ratio(input.color,body.backgroundColor),input:ratio(input.borderColor,body.backgroundColor)},gallery:!!document.querySelector('[data-slot=component-gallery]'),states:{disabled:!!document.querySelector('button:disabled'),busy:!!document.querySelector('[aria-busy=true]'),readonly:!!document.querySelector('input[readonly]'),error:!!document.querySelector('[aria-invalid=true]'),checked:!!document.querySelector('[data-state=checked]'),indeterminate:!!document.querySelector('[data-state=indeterminate]'),selected:!!document.querySelector('[aria-selected=true]')},slots:[...new Set([...document.querySelectorAll('[data-slot]')].map(e=>e.dataset.slot))]};
	})()`);
	sample.measurements = measured;
	assert(measured.gallery, 'Real production ComponentGallery mounted');
	assert.deepEqual(measured.stateNames, ['initial-loading','refreshing','empty','no-results','saving','success','failure','offline','unconfigured','permission','readonly','cancelling','cancelled','uncertain']);
	assert(!measured.overflow, 'No horizontal page overflow');
	for (const [name, doc] of Object.entries(measured.docs)) {
		assert.deepEqual(doc.nested, doc.control, `${name}: nested unopted surface typography, theme, border and geometry unchanged`);
		assert.equal(doc.error.height, doc.input.height, 'Error does not change input geometry');
		assert.equal(doc.compactSelect.height, sample.pointer === 'coarse' ? '44px' : '32px', 'Explicit compact Select size remains authoritative');
		for (const target of doc.targets) assert(target.width >= (sample.pointer === 'coarse' ? 44 : 32) && target.height >= (sample.pointer === 'coarse' ? 44 : 32), `${name}: ${JSON.stringify(target)}`);
		assert.equal(doc.input.borderRadius, '8px');
		assert.equal(doc.input.fontSize, '14px');
		assert.equal(doc.input.height, sample.pointer === 'coarse' ? '44px' : '36px');
		assert.equal(doc.button.transitionDuration, sample.reducedMotion ? '0s' : '0.12s');
		assert(doc.hit.every(size => size >= (sample.pointer === 'coarse' ? 44 : 32)), `${name}: minimum hit area`);
		assert(doc.scopePortals >= 1 && doc.legacyPortals === 1, `${name}: independent scoped and existing portals`);
	}
	assert(measured.contrast.button >= 4.5, 'Primary button text contrast >=4.5');
	assert(measured.contrast.text >= 4.5, 'Input text contrast >=4.5');
	assert(measured.contrast.input >= 3, 'Input boundary contrast >=3');
	assert(measured.contrast.checkbox >= 3, 'Unchecked checkbox boundary contrast >=3');
	assert(measured.contrast.switch >= 3, 'Unchecked switch track contrast >=3');
	assert(measured.contrast.focus >= 3, 'Focus indicator contrast >=3');
	assert(Object.values(measured.states).every(Boolean), 'All static state samples rendered');
	for (const slot of ['button','input','textarea','checkbox','switch','tabs','badge','skeleton','table','scroll-area']) assert(measured.slots.includes(slot), `Real ${slot} present`);
	sample.assertions.push('real-components-and-states','no-horizontal-overflow','nested-surface-isolation','independent-portals','approved-control-tokens','pointer-hit-area','reduced-motion','text-and-input-contrast');
}

export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = result.interactions = [];
	await cdp.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: false });
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.evaluate('window.scrollTo(0,0);uiReview.globalNotice();document.querySelector("[data-review=notice]").click()');
	await waitFor(() => cdp.evaluate('!!document.querySelector("[data-review=scope] [data-sonner-toast][data-mounted=true]")'), 'leaf notification mounted');
	await cdp.evaluate('window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(resolve))');
	const notices = await cdp.evaluate(`(()=>{const scope=document.querySelector('[data-review=scope]'),notice=scope.querySelector('[data-sonner-toast]'),primary=scope.querySelector('[data-review=primary]'),a=notice.getBoundingClientRect(),b=primary.getBoundingClientRect();return {top:a.top,bottom:a.bottom,primaryTop:b.top,inside:a.left>=scope.getBoundingClientRect().left && a.right<=scope.getBoundingClientRect().right,position:getComputedStyle(notice).position,global:document.querySelectorAll('.huhu-portal-root:not(.huhu-design) [data-sonner-toast]').length,otherScoped:uiReview.docs.other.querySelectorAll('.huhu-design [data-sonner-toast]').length}})()`);
	result.noticeGeometry = notices;
	assert(notices.top >= 0 && notices.bottom <= notices.primaryTop && notices.inside, 'Notification reserves space above primary action');
	assert.equal(notices.position, 'relative'); assert.equal(notices.global, 1); assert.equal(notices.otherScoped, 0);
	actions.push({ action: 'Owned notice reserves top space; existing global outlet and second window remain independent', measured: notices });
	result.noticeScreenshot = await capture('notice-narrow');
	await cdp.evaluate('uiReview.clearGlobalNotice()');
	const buttonBox = await cdp.evaluate(`(()=>{const r=document.querySelector('[data-review=primary]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: buttonBox.x + buttonBox.width / 2, y: buttonBox.y + buttonBox.height / 2 });
	assert(await cdp.evaluate(`document.querySelector('[data-review=primary]').matches(':hover')`));
	await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: buttonBox.x + buttonBox.width / 2, y: buttonBox.y + buttonBox.height / 2 });
	assert(await cdp.evaluate(`document.querySelector('[data-review=primary]').matches(':active')`));
	assert.deepEqual(await cdp.evaluate(`(()=>{const r=document.querySelector('[data-review=primary]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`), buttonBox);
	result.activeScreenshot = await capture('button-active');
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: buttonBox.x + buttonBox.width / 2, y: buttonBox.y + buttonBox.height / 2 });
	actions.push({ action: 'Actual pointer hover/active states preserve control geometry', measured: buttonBox });
	// Actual production IME handlers; event construction only supplies the OS input boundary.
	const ime = await cdp.evaluate(`(()=>{const e=document.querySelector('[data-review=input]');e.focus();const before=uiReview.events.enters;e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const blocked=!e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return {blocked,count:uiReview.events.enters-before,value:e.value}})()`);
	assert(ime.blocked && ime.count === 1); actions.push({ action: 'IME Enter guarded; ordinary Enter delivered once', measured: ime });
	// Keyboard modality yields the real :focus-visible rule, not a forced screenshot class.
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	const focus = await cdp.evaluate(`(()=>{const e=document.querySelector('[data-review=primary]');e.focus();const s=getComputedStyle(e);return {visible:e.matches(':focus-visible'),width:s.outlineWidth,offset:s.outlineOffset,style:s.outlineStyle}})()`);
	assert.deepEqual(focus, { visible: true, width: '3px', offset: '1px', style: 'solid' }); actions.push({ action: 'Keyboard focus', measured: focus });
	for (const name of ['main', 'other']) {
		await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},e=d.querySelector('[data-review=dialog]');e.focus();e.click()})()`);
		await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`), `${name} dialog opens`);
		const ownership = await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},e=d.querySelector('[role=dialog]');return {scoped:!!e.closest('.huhu-design'),focus:e.contains(d.activeElement),other:uiReview.docs.${name === 'main' ? 'other' : 'main'}.querySelectorAll('[role=dialog]').length,radius:d.defaultView.getComputedStyle(e).borderRadius}})()`);
		assert.deepEqual(ownership, { scoped: true, focus: true, other: 0, radius: '14px' });
		const trapped = await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},dialog=d.querySelector('[role=dialog]'),controls=[...dialog.querySelectorAll('input,button')];controls.at(-1).focus();d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));return dialog.contains(d.activeElement) && d.activeElement===controls[0]})()`);
		assert(trapped, `${name}: Tab wraps inside dialog`);
		if (name === 'main') result.dialogScreenshot = await capture('dialog-main');
		await cdp.evaluate(`(()=>{const d=uiReview.docs.${name};d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))})()`);
		await waitFor(() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog]')`), `${name} dialog closes`);
		assert(await cdp.evaluate(`uiReview.docs.${name}.activeElement === uiReview.docs.${name}.querySelector('[data-review=dialog]')`));
		actions.push({ action: `${name} Dialog portal, focus, Escape and return`, measured: ownership });
	}
	await cdp.evaluate(`(()=>{const first=document.querySelector('[role=tab]');first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}))})()`);
	await waitFor(() => cdp.evaluate(`document.querySelectorAll('[role=tab]')[1]?.getAttribute('aria-selected') === 'true'`), 'Tab arrow selects next item');
	actions.push({ action: 'Real Tabs ArrowRight changes selection and focus' });
	await cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent==='DropdownMenu');e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))})()`);
	await waitFor(() => cdp.evaluate('!!document.querySelector("[role=menu]")'), 'menu opens with Enter');
	await cdp.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}))`);
	await waitFor(() => cdp.evaluate('document.activeElement.matches("[role=menuitem],[role=menuitemcheckbox]")'), 'menu item receives keyboard focus');
	const menuBefore = await cdp.evaluate('document.activeElement.textContent');
	await cdp.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}))`);
	await waitFor(() => cdp.evaluate(`document.activeElement.textContent!==${JSON.stringify(menuBefore)}`), 'menu arrow moves to next item');
	result.menuScreenshot = await capture('menu-keyboard');
	await cdp.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);
	await waitFor(() => cdp.evaluate('!document.querySelector("[role=menu]")'), 'menu closes');
	actions.push({ action: 'Real menu Enter/ArrowDown/Escape' });
	await cdp.evaluate(`document.querySelector('[aria-label="Tooltip · tab-preview"]').focus()`);
	await waitFor(() => cdp.evaluate('!!document.querySelector("[data-slot=tooltip-content]")'), 'tooltip opens on keyboard focus');
	assert(await cdp.evaluate('!!document.querySelector("[data-slot=tooltip-content]").closest(".huhu-design")'));
	result.tooltipScreenshot = await capture('tooltip-focus');
	await cdp.evaluate(`document.activeElement.blur()`);
	await waitFor(() => cdp.evaluate('!document.querySelector("[data-slot=tooltip-content]")'), 'tooltip closes after blur');
	const tooltipPoint = await cdp.evaluate(`(()=>{const e=document.querySelector('[aria-label="Tooltip · tab-preview"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...tooltipPoint });
	await waitFor(() => cdp.evaluate('!!document.querySelector("[data-slot=tooltip-content]")'), 'tooltip opens on pointer hover');
	result.tooltipHoverScreenshot = await capture('tooltip-hover');
	await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
	await waitFor(() => cdp.evaluate('!document.querySelector("[data-slot=tooltip-content]")'), 'tooltip closes after pointer leaves');
	actions.push({ action: 'Real tooltip keyboard focus, pointer hover and owned portal' });
	await cdp.evaluate('document.querySelector("[data-review=confirm]").click()');
	await waitFor(() => cdp.evaluate('!!document.querySelector("[role=alertdialog]")'), 'confirmation opens');
	await cdp.evaluate('[...document.querySelectorAll("[role=alertdialog] button")].find(e=>e.textContent==="Confirm / 确认").click()');
	await waitFor(() => cdp.evaluate('document.querySelector("[role=alertdialog]")?.getAttribute("aria-busy") === "true"'), 'save pending');
	await cdp.evaluate('[...document.querySelectorAll("[role=alertdialog] button")].find(e=>e.textContent==="Confirm / 确认").click()');
	assert.equal(await cdp.evaluate('uiReview.events.saves'), 1, 'Pending action cannot submit twice');
	await cdp.evaluate('uiReview.settle("Offline / 离线")');
	await waitFor(() => cdp.evaluate('!!document.querySelector("[role=alert]")'), 'persistent failure shown');
	result.failureStateScreenshot = await capture('save-failure');
	assert.equal(await cdp.evaluate('document.querySelector("[data-review=input]").value'), ime.value);
	assert.equal(await cdp.evaluate('[...document.querySelectorAll("[role=alertdialog] button")].find(e=>e.textContent==="Confirm / 确认").disabled'), false);
	await cdp.evaluate('[...document.querySelectorAll("[role=alertdialog] button")].find(e=>e.textContent==="Confirm / 确认").click()');
	await waitFor(() => cdp.evaluate('uiReview.events.saves === 2'), 'retry starts');
	await cdp.evaluate('uiReview.settle()');
	await waitFor(() => cdp.evaluate('!document.querySelector("[role=alertdialog]")'), 'successful retry closes');
	actions.push({ action: 'Actual ConfirmDialog busy guard, persistent failure, retained input and retry', saves: 2 });
	// Host/user font priority: use distinct names rather than relying on installed font glyphs.
	const fonts = await cdp.evaluate(`(()=>{for(const d of Object.values(uiReview.docs)){d.body.style.setProperty('--huhu-font-sans-user','"Review User"');d.body.style.setProperty('--font-interface-override','"Review Host"')}return Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,{scope:d.defaultView.getComputedStyle(d.querySelector('[data-review=input]')).fontFamily,control:d.defaultView.getComputedStyle(d.querySelector('[data-review=control] input')).fontFamily,nested:d.defaultView.getComputedStyle(d.querySelector('[data-review=nested] input')).fontFamily}]))})()`);
	for (const values of Object.values(fonts)) { assert(values.scope.indexOf('Review Host') < values.scope.indexOf('Review User')); assert.equal(values.control, values.nested); }
	actions.push({ action: 'Host font precedes user font in both documents; frozen surface unchanged', measured: fonts });
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
	assert(await cdp.evaluate(`(()=>{for(const d of Object.values(uiReview.docs))d.body.style.setProperty('--anim-duration-fast','0ms');return Object.values(uiReview.docs).every(d=>d.defaultView.getComputedStyle(d.querySelector('[data-review=primary]')).transitionDuration==='0s')})()`), 'Host zero duration is respected without reduced-motion');
	actions.push({ action: 'Host 0ms duration respected' });
	await cdp.evaluate('uiReview.unmount()');
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector(".huhu-portal-root"))'), 'all owned portals released');
	actions.push({ action: 'Both document roots unmounted and portal resources released' });
	assert.equal(await cdp.evaluate('uiReview.scopedNotices()'), 0, 'Scope-owned notifications dismissed on unmount');
}

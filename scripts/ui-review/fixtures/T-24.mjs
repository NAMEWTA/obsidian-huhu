import assert from 'node:assert/strict';
export const ready =
	'!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector(".huhu-design fieldset"))';
export const layoutCSS =
	'[data-review=workbench]{width:100%;min-width:0}[data-review=workbench] iframe{position:static;left:auto}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))).then(()=>Promise.all(Object.values(uiReview.docs).flatMap(d=>d.getAnimations().map(a=>a.finished.catch(()=>undefined)))))';
export function configure({ language, theme }) {
	const mode = theme.endsWith('dark') ? 'dark' : 'light';
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${mode}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
export async function verify({ cdp, sample, waitFor }) {
	const measured = await cdp.evaluate(`(() => Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>{
 var scope=d.querySelector('.huhu-design:not(.huhu-portal-root)'),win=d.defaultView;
 var box=scope.getBoundingClientRect();
 var canvas=d.createElement('canvas'),ctx=canvas.getContext('2d');
 var rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
 var luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
 var ratio=(a,b)=>{var f=rgb(a),k=rgb(b),alpha=f[3]/255,x=luminance(f.slice(0,3).map((v,i)=>v*alpha+k[i]*(1-alpha))),y=luminance(k);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 var input=win.getComputedStyle(scope.querySelector('input')),button=win.getComputedStyle(d.querySelector('[data-review=intro] button')),body=win.getComputedStyle(d.body);
 var probe=d.createElement('span');probe.style.color='var(--interactive-accent)';scope.append(probe);var focus=win.getComputedStyle(probe).color;probe.remove();
 var contrast={text:ratio(input.color,body.backgroundColor),input:ratio(input.borderColor,body.backgroundColor),button:ratio(button.color,button.backgroundColor),focus:ratio(focus,body.backgroundColor)};
 
 var controls=[...scope.querySelectorAll('button,input,[role=combobox]'),...d.querySelectorAll('[data-review=intro] button')].flatMap(e=>{var r=e.getBoundingClientRect(),s=win.getComputedStyle(e),p=win.getComputedStyle(e,'::before');return r.width&&r.height?[{label:(e.getAttribute('aria-label')||e.textContent).slice(0,80),width:Math.max(r.width,parseFloat(p.width)||0),height:Math.max(r.height,parseFloat(p.height)||0),radius:s.borderRadius,transition:s.transitionDuration}]:[]});
 var shell=d.querySelector('.huhu-shell'),r=shell.getBoundingClientRect();
 var overflows=[...scope.querySelectorAll('*')].flatMap(e=>{var r=e.getBoundingClientRect();return r.right>box.right+1||r.left<box.left-1?[{tag:e.tagName,slot:e.dataset.slot,cls:e.className,text:e.textContent.slice(0,70),width:r.width,right:r.right-box.right}]:[]}).slice(-20);
 return [name,{contrast,overflows,width:box.width,scroll:scope.scrollWidth,client:scope.clientWidth,controls,portal:d.querySelectorAll('.huhu-design.huhu-portal-root').length,legacy:{width:r.width,layout:shell.dataset.layout,header:!!shell.querySelector('.huhu-page-header'),designAncestor:!!shell.closest('.huhu-design')}}];
 })))()`);
	sample.measurements = measured;
	for (const [name, value] of Object.entries(measured)) {
		assert(value.contrast.text >= 4.5 && value.contrast.button >= 4.5, `${name}: text contrast`);
		assert(value.contrast.input >= 3 && value.contrast.focus >= 3, `${name}: input/focus contrast`);
		assert(value.width > 0, `${name}: real appearance leaf`);
		assert(value.scroll <= value.client + 1, `${name}: content overflow ${value.scroll}/${value.client}`);
		assert(value.portal === 2, `${name}: owned leaf portal`);
		assert(!value.legacy.designAncestor, `${name}: shared Shell not opted into design`);
		const expected = value.legacy.width < 600 ? 'narrow' : value.legacy.width < 960 ? 'medium' : 'wide';
		assert.equal(value.legacy.layout, expected);
		const min = sample.pointer === 'coarse' ? 44 : 32;
		for (const control of value.controls) {
			assert(
				control.width >= min - 0.1 && control.height >= min - 0.1,
				`${name}: hit area ${JSON.stringify(control)}`,
			);
			if (sample.reducedMotion)
				assert(
					control.transition.split(',').every((value) => parseFloat(value) === 0),
					`${name}: motion ${control.label}`,
				);
		}
	}
	sample.contentLeaves = {};
	for (const section of ['general', 'about']) {
		await cdp.evaluate(
			`Promise.all(Object.values(uiReview.mounts).map(m=>m.surface.navigate({feature:'settings',section:'${section}'})))`,
		);
		await waitFor(
			() =>
				cdp.evaluate(
					`Object.values(uiReview.docs).every(d=>${section === 'about' ? "!!d.querySelector('.huhu-about')" : "d.querySelectorAll('[data-settings-scroll] .huhu-design').length===2"})`,
				),
			`${section} real content`,
		);
		const leaves = await cdp.evaluate(
			`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,[...d.querySelectorAll('[data-settings-scroll] .huhu-design')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth,overflowNodes:[...e.querySelectorAll('*')].flatMap(n=>{var r=n.getBoundingClientRect(),b=e.getBoundingClientRect();return n.scrollWidth>n.clientWidth+1||r.right>b.right+1?[{tag:n.tagName,cls:n.className,text:n.textContent.slice(0,100),scroll:n.scrollWidth,width:n.clientWidth,right:r.right-b.right}]:[]}).slice(-12),controls:[...e.querySelectorAll('button,input,a,[role=radio]')].map(b=>{var r=b.getBoundingClientRect(),p=d.defaultView.getComputedStyle(b,'::before');return {label:(b.getAttribute('aria-label')||b.textContent).slice(0,60),width:Math.max(r.width,parseFloat(p.width)||0),height:Math.max(r.height,parseFloat(p.height)||0)}})}))]))`,
		);
		sample.contentLeaves[section] = leaves;
		for (const [name, regions] of Object.entries(leaves))
			for (const leaf of regions) {
				assert(leaf.scroll <= leaf.width + 1, `${name} ${section}: overflow ${leaf.scroll}/${leaf.width}`);
				for (const control of leaf.controls)
					assert(
						control.width >= (sample.pointer === 'coarse' ? 44 : 32) - 0.1 &&
							control.height >= (sample.pointer === 'coarse' ? 44 : 32) - 0.1,
						`${name} ${section}: hit ${JSON.stringify(control)}`,
					);
			}
	}
	await cdp.evaluate(
		`Promise.all(Object.values(uiReview.mounts).map(m=>m.surface.navigate({feature:'settings',section:'appearance'})))`,
	);
	await waitFor(
		() => cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector('.huhu-design fieldset'))`),
		'appearance restored',
	);
	sample.assertions.push(
		'real-workbench-and-settings',
		'leaf-no-overflow',
		'owned-portals-two-documents',
		'legacy-shell-unscoped',
		'actual-container-breakpoints',
		'leaf-hit-targets',
		'reduced-motion',
	);
}
export async function exercise({ cdp, result, waitFor, capture }) {
	const actions = (result.interactions = []);
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 420,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await cdp.evaluate(`uiReview.configure('en','theme-light');`);
	await waitFor(
		() => cdp.evaluate(`document.querySelector('.huhu-shell').dataset.layout==='narrow'`),
		'narrow shell',
	);
	// Real service update remains pending; UI handlers, not fixture state setters, initiate it.
	await cdp.evaluate(
		`uiReview.mounts.main.hold(true); var e=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===uiReview.t('appearance.fontCustomLabel',{font:uiReview.t('appearance.fontText')}));e.scrollIntoView();e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Retained Example Font');e.dispatchEvent(new Event('input',{bubbles:true}));`,
	);
	await cdp.evaluate(
		`var e=document.activeElement;e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));`,
	);
	assert.equal(await cdp.evaluate('uiReview.mounts.main.calls()'), 0);
	await cdp.evaluate(
		`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));document.activeElement.blur();`,
	);
	await waitFor(() => cdp.evaluate('uiReview.mounts.main.calls()===1&&uiReview.mounts.main.saving()'), 'single save');
	assert(await cdp.evaluate(`document.querySelector('.huhu-design fieldset').disabled`));
	await cdp.evaluate(`uiReview.mounts.main.settle('disk failed')`);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('.huhu-design [role=alert]')`), 'persistent failure');
	assert(
		await cdp.evaluate(
			`document.querySelector('input[value="Retained Example Font"]')?.value==='Retained Example Font'`,
		),
	);
	assert(
		await cdp.evaluate(
			`uiReview.mounts.main.theme.get().fontTextCustom==='Retained Example Font'&&uiReview.mounts.main.files.vault.namespaces.theme.fontTextCustom===''&&uiReview.mounts.main.store.status==='error'`,
		),
	);
	await cdp.evaluate(`document.querySelector('.huhu-design [role=alert]').scrollIntoView()`);
	result.failureScreenshot = await capture('appearance-save-failed');
	await cdp.evaluate(
		`uiReview.mounts.main.hold(false);document.querySelector('.huhu-design [role=alert] button').click()`,
	);
	await waitFor(
		() =>
			cdp.evaluate(
				`uiReview.mounts.main.files.vault.namespaces.theme.fontTextCustom==='Retained Example Font'&&uiReview.mounts.main.store.status==='idle'&&!document.querySelector('.huhu-design [role=alert]')`,
			),
		'retry saves retained draft',
	);
	actions.push({ action: 'IME guarded; Enter+blur submits once; rejected save retains draft; real Retry succeeds' });
	await cdp.evaluate(
		`uiReview.mounts.main.hold(true);var e=document.querySelector('[role=slider]');e.scrollIntoView();e.focus();uiReview.sliderBefore=Number(e.getAttribute('aria-valuenow'))`,
	);
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key: 'ArrowRight',
		code: 'ArrowRight',
		windowsVirtualKeyCode: 39,
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp',
		key: 'ArrowRight',
		code: 'ArrowRight',
		windowsVirtualKeyCode: 39,
	});
	await waitFor(() => cdp.evaluate('uiReview.mounts.main.saving()'), 'slider first save pending');
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key: 'ArrowRight',
		code: 'ArrowRight',
		windowsVirtualKeyCode: 39,
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp',
		key: 'ArrowRight',
		code: 'ArrowRight',
		windowsVirtualKeyCode: 39,
	});
	await waitFor(
		() => cdp.evaluate('uiReview.mounts.main.theme.get().fontSize===uiReview.sliderBefore+2'),
		'slider latest memory value',
	);
	await cdp.evaluate('uiReview.mounts.main.hold(false);uiReview.mounts.main.settle()');
	await waitFor(
		() =>
			cdp.evaluate(
				'uiReview.mounts.main.files.vault.namespaces.theme.fontSize===uiReview.sliderBefore+2&&uiReview.mounts.main.store.status==="idle"',
			),
		'slider latest persisted value',
	);
	actions.push({ action: 'real ArrowRight twice while persistence pending retains and persists final slider value' });

	await cdp.evaluate(
		`var b=[...document.querySelectorAll('.huhu-design button')].find(b=>b.textContent===uiReview.t('appearance.export'));b.click();document.querySelector('[data-settings-scroll]').scrollTop=0`,
	);
	await waitFor(
		() => cdp.evaluate(`!!document.querySelector('.huhu-design [data-sonner-toast][data-mounted=true]')`),
		'owned notice',
	);
	const notice = await cdp.evaluate(
		`(()=>{var scope=document.querySelector('.huhu-design:not(.huhu-portal-root)'),n=scope.querySelector('[data-sonner-toast]'),p=scope.querySelector('fieldset'),a=n.getBoundingClientRect(),b=p.getBoundingClientRect();return {bottom:a.bottom,primaryTop:b.top,position:getComputedStyle(n).position,other:uiReview.docs.other.querySelectorAll('[data-sonner-toast]').length}})()`,
	);
	assert(notice.bottom <= notice.primaryTop + 1 && notice.position === 'relative' && notice.other === 0);
	result.noticeGeometry = notice;
	result.noticeScreenshot = await capture('appearance-owned-notice');
	// Open each real Select through its owner window, with independent Radix portals.
	for (const name of ['main', 'other']) {
		await cdp.evaluate(
			`(()=>{var d=uiReview.docs.${name},w=d.defaultView,b=[...d.querySelectorAll('[role=combobox]')].find(e=>e.getAttribute('aria-label')===uiReview.t('appearance.additionalThemes'));b.scrollIntoView();b.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerType:'mouse',isPrimary:true}));})()`,
		);
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-design.huhu-portal-root [role=listbox]')`),
			`${name} owned Select`,
		);
		assert(
			await cdp.evaluate(
				`uiReview.docs.${name}.querySelector('[role=listbox]').ownerDocument===uiReview.docs.${name}`,
			),
		);
		await cdp.evaluate(
			`(()=>{var d=uiReview.docs.${name};d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));})()`,
		);
		await waitFor(
			() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=listbox]')`),
			`${name} Select closes`,
		);
	}
	actions.push({ action: 'Both actual Select popups mount and close in their own Document' });
	await cdp.evaluate(
		`var e=[...document.querySelectorAll('.huhu-design input')].find(e=>e.getAttribute('aria-label')===uiReview.t('appearance.fontCustomLabel',{font:uiReview.t('appearance.fontText')}));e.scrollIntoView();e.focus()`,
	);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	assert(
		await cdp.evaluate(
			`document.activeElement.matches(':focus-visible')&&!!document.activeElement.closest('.huhu-design')&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=3`,
		),
	);
	actions.push({ action: 'Actual keyboard modality shows the approved visible focus on an owned leaf control' });
	// Open the production drawer, exercise focus ownership and Escape.
	await cdp.evaluate(
		`document.querySelector('.huhu-page-panel-toggle').focus();document.querySelector('.huhu-page-panel-toggle').click()`,
	);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('[role=dialog]')`), 'shell drawer');
	assert(await cdp.evaluate(`!!document.activeElement.closest('[role=dialog]')`));
	await cdp.evaluate(
		`var e=document.querySelector('[role=dialog] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'no-such-setting-长名称');e.dispatchEvent(new Event('input',{bubbles:true}))`,
	);
	await waitFor(
		() => cdp.evaluate(`document.querySelectorAll('[role=dialog] [data-panel-row]').length===0`),
		'panel no results',
	);
	await cdp.evaluate(
		`var e=document.querySelector('[role=dialog] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'');e.dispatchEvent(new Event('input',{bubbles:true}))`,
	);
	await waitFor(
		() => cdp.evaluate(`document.querySelectorAll('[role=dialog] [data-panel-row]').length===3`),
		'panel results restored',
	);
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key: 'Escape',
		code: 'Escape',
		windowsVirtualKeyCode: 27,
	});
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyUp',
		key: 'Escape',
		code: 'Escape',
		windowsVirtualKeyCode: 27,
	});
	await waitFor(() => cdp.evaluate(`!document.querySelector('[role=dialog]')`), 'drawer closed');
	assert(await cdp.evaluate(`document.activeElement.classList.contains('huhu-page-panel-toggle')`));
	actions.push({ action: 'Real narrow Sheet owns focus, Escape closes and restores its trigger' });
	// Navigate through actual WorkbenchSurface with a controlled service create promise.
	await cdp.evaluate(`void uiReview.mounts.main.surface.navigate({feature:'contacts'}).catch(()=>{})`);
	await waitFor(
		() => cdp.evaluate(`uiReview.mounts.main.navigations()===1&&!!document.querySelector('[role=status]')`),
		'navigation busy',
	);
	await cdp.evaluate(`uiReview.mounts.main.settleNavigation('service unavailable')`);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('.huhu-shell [role=alert]')`), 'navigation failure');
	assert(await cdp.evaluate(`!!document.querySelector('.huhu-design fieldset')`));
	await cdp.evaluate(`document.querySelector('.huhu-shell [role=alert] button').click()`);
	await waitFor(() => cdp.evaluate('uiReview.mounts.main.navigations()===2'), 'navigation retry');
	await cdp.evaluate('uiReview.mounts.main.settleNavigation()');
	await waitFor(
		() =>
			cdp.evaluate(
				`!!document.querySelector('input[aria-label="Retained service data"]:not([hidden])')&&!document.querySelector('.huhu-shell [role=alert]')`,
			),
		'navigation success',
	);
	actions.push({
		action: 'Actual WorkbenchSurface busy/failure preserves prior content, Retry creates and publishes service page',
	});
	await cdp.evaluate(
		`uiReview.mounts.main.available(false);void uiReview.mounts.main.surface.navigate({feature:'contacts'}).catch(()=>{})`,
	);
	await waitFor(
		() =>
			cdp.evaluate(`document.querySelector('.huhu-shell [role=status]')?.textContent.includes('Not configured')`),
		'unconfigured state',
	);
	actions.push({ action: 'Actual availability reason persists without pretending service ready' });
	await cdp.evaluate(`void uiReview.mounts.main.surface.navigate({feature:'settings',section:'general'})`);
	await waitFor(
		() => cdp.evaluate(`document.querySelectorAll('[data-settings-scroll] .huhu-design').length===2`),
		'general leaf scopes',
	);
	result.generalScreenshot = await capture('general-narrow');
	await cdp.evaluate(`void uiReview.mounts.main.surface.navigate({feature:'settings',section:'about'})`);
	await waitFor(() => cdp.evaluate(`!!document.querySelector('.huhu-about')`), 'about content');
	result.aboutScreenshot = await capture('about-narrow');
	// Supplement the paired matrix with the actual custom palette controls at 200% / coarse pointer.
	await cdp.evaluate(`uiReview.mounts.main.surface.navigate({feature:'settings',section:'appearance'})`);
	await waitFor(
		() => cdp.evaluate(`!!document.querySelector('.huhu-design fieldset')`),
		'appearance for custom palette',
	);
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 210,
		height: 500,
		deviceScaleFactor: 2,
		mobile: false,
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
	await cdp.evaluate(
		`[...document.querySelectorAll('.huhu-design button')].find(b=>b.getAttribute('aria-label')===uiReview.t('appearance.preset.custom')).click()`,
	);
	await waitFor(
		() =>
			cdp.evaluate(
				`!!document.querySelector('.huhu-design input[type=color]')&&!document.querySelector('.huhu-design fieldset').disabled`,
			),
		'custom palette persisted',
	);
	const colors = await cdp.evaluate(
		`(()=>{var s=document.querySelector('[data-settings-scroll] .huhu-design');return {width:s.clientWidth,scroll:s.scrollWidth,controls:[...s.querySelectorAll('input[type=color],input[aria-label$="(hex)"]')].map(e=>{var r=e.getBoundingClientRect();return {width:r.width,height:r.height}})}})()`,
	);
	assert(colors.scroll <= colors.width + 1, 'custom palette has no horizontal overflow');
	assert(
		colors.controls.length === 10 && colors.controls.every((r) => r.width >= 44 && r.height >= 44),
		'custom picker and hex targets remain touch accessible',
	);
	result.customPalette = colors;
	await cdp.evaluate(
		`var e=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===uiReview.t('appearance.customBackground')+' (hex)');e.scrollIntoView();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'#112233');e.dispatchEvent(new Event('input',{bubbles:true}))`,
	);
	await waitFor(
		() => cdp.evaluate(`uiReview.mounts.main.files.vault.namespaces.theme.custom.light.background==='#112233'`),
		'custom color persisted',
	);
	result.customPaletteScreenshot = await capture('custom-colors-coarse-2x');
	actions.push({
		action: 'Actual custom palette selection and hex editing persist through SettingsStore at narrow 200% with 44px targets',
	});
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	// Container boundary observations refer to unchanged shared Shell geometry.
	result.breakpoints = [];
	for (const width of [599, 600, 959, 960]) {
		await cdp.evaluate(`uiReview.mounts.main.contentEl.style.width='${width}px'`);
		await waitFor(
			() =>
				cdp.evaluate(
					`document.querySelector('.huhu-shell').dataset.layout==='${width < 600 ? 'narrow' : width < 960 ? 'medium' : 'wide'}'`,
				),
			`layout ${width}`,
		);
		result.breakpoints.push({
			width,
			layout: await cdp.evaluate(`document.querySelector('.huhu-shell').dataset.layout`),
		});
	}
	await cdp.evaluate(`uiReview.mounts.main.contentEl.style.width='100%';`);
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1440,
		height: 1000,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await waitFor(() => cdp.evaluate(`document.querySelector('.huhu-shell').dataset.layout==='wide'`), 'wide shell');
	await cdp.evaluate(`document.querySelector('[data-rail-button]').focus()`);
	const focusRegions = [];
	for (const key of ['ArrowDown', 'Home', 'End', 'F6', 'F6']) {
		await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key });
		await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
		assert(await cdp.evaluate('!!document.activeElement.closest("[data-shell-region]")'));
		focusRegions.push(
			await cdp.evaluate('document.activeElement.closest("[data-shell-region]").dataset.shellRegion'),
		);
	}
	assert.deepEqual(focusRegions, ['rail', 'rail', 'rail', 'panel', 'page']);
	actions.push({ action: 'Real Rail keyboard and F6 remain within live shell regions; 599/600/959/960 measured' });
	result.states = {
		covered: [
			'initial-loading',
			'busy',
			'failure',
			'retry',
			'success',
			'unconfigured',
			'general',
			'appearance',
			'about',
		],
		notApplicable: [
			'Shell has no approval, cancellation, offline or readonly service command; downstream module states are not fabricated',
		],
		boundary:
			'iframe ownership is not a real Obsidian popout; shared Browser-facing Shell geometry is observed, not migrated',
	};
	await cdp.evaluate('uiReview.unmount()');
	assert(
		await cdp.evaluate(`Object.values(uiReview.docs).every(d=>!d.querySelector('.huhu-design.huhu-portal-root'))`),
	);
	actions.push({ action: 'Both real workbenches unmounted and owned portals removed' });
}

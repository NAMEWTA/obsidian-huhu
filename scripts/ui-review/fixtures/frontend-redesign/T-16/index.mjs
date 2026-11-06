import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
import { diffsTransforms } from '../../../../diffs-owner-document.mjs';

export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
	diffs: Object.fromEntries(Object.keys(diffsTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready =
	'!!globalThis.uiReview && Object.values(uiReview.docs).every(doc=>doc.querySelector("[data-review=versioning]"))';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS =
	'body{padding:0;margin:0}main{width:100%;min-width:0;background:var(--hu-surface);color:var(--hu-fg)}[data-review=versioning]{display:flex;flex-direction:column;flex:1;min-height:0}';
const tick = (cdp) => cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
async function show(cdp, name, mode) {
	await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},${JSON.stringify(mode)})`);
	await tick(cdp);
}
async function visible(cdp, name) {
	await cdp.evaluate(
		`(()=>{const frame=document.querySelector('iframe');frame.style.left=${JSON.stringify(name === 'second' ? '0' : '-2000px')};frame.style.top='0';frame.style.height=innerHeight+'px';frame.style.zIndex='100';uiReview.docs.${name}.defaultView.scrollTo(0,0)})()`,
	);
	await tick(cdp);
}
async function trustedClick(cdp, name, selector, text) {
	await visible(cdp, name);
	// CodeView disables pointer events while its virtual scroll owner is moving.
	// Wait for that actual style lifecycle, not a fixed sleep or a successful-focus poll.
	await cdp.evaluate(`new Promise((resolve,reject)=>{const doc=uiReview.docs.${name},node=${text ? `[...doc.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)})` : `doc.querySelector(${JSON.stringify(selector)})`};if(!node)throw Error('Missing selector');node.scrollIntoView({block:'center'});if(doc.defaultView.getComputedStyle(node).pointerEvents!=='none'){resolve();return}let timer;const observer=new doc.defaultView.MutationObserver(()=>{if(!node.isConnected){done(new Error('Target recycled while waiting for pointer owner'));return}if(doc.defaultView.getComputedStyle(node).pointerEvents!=='none')done()});const done=error=>{observer.disconnect();doc.defaultView.clearTimeout(timer);error?reject(error):resolve()};for(let owner=node;owner;owner=owner.parentElement)observer.observe(owner,{attributes:true,attributeFilter:['style','class']});timer=doc.defaultView.setTimeout(()=>done(new Error('Virtual pointer owner did not become ready')),10000)})`);
	const point = await cdp.evaluate(
		`(()=>{const doc=uiReview.docs.${name},node=${text ? `[...doc.querySelectorAll(${JSON.stringify(selector)})].find(node=>node.textContent.trim()===${JSON.stringify(text)})` : `doc.querySelector(${JSON.stringify(selector)})`};if(!node)throw Error('Missing selector');const rect=node.getBoundingClientRect();return{x:rect.x+rect.width/2,y:rect.y+rect.height/2,hit:node.contains(doc.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))||[...doc.querySelectorAll('diffs-container')].some(host=>node.contains(host.shadowRoot?.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)))}})()`,
	);
	assert.equal(point.hit, true, JSON.stringify(point));
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mousePressed',
		x: point.x,
		y: point.y,
		button: 'left',
		clickCount: 1,
	});
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mouseReleased',
		x: point.x,
		y: point.y,
		button: 'left',
		clickCount: 1,
	});
	await tick(cdp);
}
export async function verify({ cdp, sample, waitFor }) {
	for (const name of ['main', 'second']) {
		await show(cdp, name, 'diff');
		await waitFor(
			() =>
				cdp.evaluate(
					`(()=>{const doc=uiReview.docs.${name};return doc.querySelector('diffs-container')?.shadowRoot?.textContent.includes('new one')})()`,
				),
			`${name} actual diff and parser worker`,
		);
		await waitFor(() => cdp.evaluate(`uiReview.resources().${name}.live===2`), `${name} owner highlighter pool`);
		const proof = await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name},host=doc.querySelector('main'),surface=host.querySelector('.huhu-versioning-diff'),element=host.querySelector('diffs-container');return{owner:element.ownerDocument===doc,sheets:element.shadowRoot.adoptedStyleSheets.length,shadowContent:element.shadowRoot.textContent.includes('new one'),keyboardGutters:element.shadowRoot.querySelectorAll('.huhu-diff-gutter[role=button][tabindex="0"]').length,narrow:surface.dataset.narrow,layout:surface.querySelector('[data-layout]')?.dataset.layout,overflow:host.scrollWidth>host.clientWidth+1,resources:uiReview.resources().${name}}})()`,
		);
		assert.equal(proof.owner, true);
		assert.ok(proof.sheets >= 1);
		assert.equal(proof.shadowContent, true);
		assert.ok(proof.keyboardGutters > 0);
		assert.equal(proof.overflow, false);
		assert.equal(proof.resources.urls, 0);
		if (sample.cssWidth < 600) assert.equal(proof.layout, 'stacked');
		sample.assertions.push({ document: name, diff: proof });
	}
	await visible(cdp, 'main');
}
async function assertShadowTargets(cdp, result, name) {
 await cdp.evaluate(`new Promise((resolve,reject)=>{const d=uiReview.docs.${name},root=d.querySelector('.huhu-versioning-diff'),ready=()=>[...root.querySelectorAll('diffs-container')].every(n=>d.defaultView.getComputedStyle(n).pointerEvents!=='none');if(ready()){resolve();return}let timer;const observer=new d.defaultView.MutationObserver(()=>{if(ready())done()});const done=error=>{observer.disconnect();d.defaultView.clearTimeout(timer);error?reject(error):resolve()};observer.observe(root,{subtree:true,attributes:true,attributeFilter:['style']});timer=d.defaultView.setTimeout(()=>done(new Error('Shadow pointer owner did not become ready')),10000)})`);
 const proof=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},coarse=d.defaultView.matchMedia('(pointer:coarse)').matches,min=coarse?44:32,out=[];for(const host of d.querySelectorAll('diffs-container')){const s=host.shadowRoot,targets=[...s.querySelectorAll('.huhu-diff-gutter,[data-expand-button],[data-expand-index] [data-separator-content]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&d.defaultView.getComputedStyle(e).visibility==='visible');for(const e of targets){const r=e.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2,kind=e.hasAttribute('data-expand-button')?'expand':e.hasAttribute('data-separator-content')?'expand-content':'line',parent=e.closest('[data-separator]')?.getBoundingClientRect(),wrap=s.querySelector('[data-diff],[data-file]')?.getBoundingClientRect();const clip={left:0,top:0,right:d.documentElement.clientWidth,bottom:d.defaultView.innerHeight};for(let a=e;a;a=a.parentElement??a.getRootNode().host){const cs=d.defaultView.getComputedStyle(a),b=a.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(cs.overflowX)&&b.width){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right)}if(/auto|scroll|hidden|clip/.test(cs.overflowY)&&b.height){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom)}}const fullyVisible=r.left>=clip.left&&r.right<=clip.right&&r.top>=clip.top&&r.bottom<=clip.bottom;const accessible=fullyVisible&&d.elementFromPoint(cx,cy)===host&&s.elementFromPoint(cx,cy)&&(e===s.elementFromPoint(cx,cy)||e.contains(s.elementFromPoint(cx,cy)));const points=accessible?[[-min/2+1,0],[min/2-1,0],[0,-min/2+1],[0,min/2-1]].map(([x,y])=>{const hit=s.elementFromPoint(cx+x,cy+y);return e===hit||e.contains(hit)}):[];const overlaps=targets.filter(other=>other!==e).some(other=>{const q=other.getBoundingClientRect();return Math.min(r.right,q.right)>Math.max(r.left,q.left)&&Math.min(r.bottom,q.bottom)>Math.max(r.top,q.top)});out.push({kind,fullyVisible,width:r.width,height:r.height,parentHeight:parent?.height,rect:r.toJSON(),row:wrap?.toJSON(),withinRow:r.x>=0&&r.right<=d.documentElement.clientWidth&&(!parent||(r.y>=parent.y&&r.bottom<=parent.bottom)),points,overlaps})}}const plain=d.createElement('div');plain.style.cssText='position:fixed;left:0;top:0;z-index:1000000';plain.innerHTML='<div data-plain-first style="height:'+min+'px;width:'+min+'px"></div><div style="height:'+min+'px;width:'+min+'px"></div>';d.body.append(plain);const plainHits=[1,min/2,min-1].map(y=>d.elementFromPoint(min/2,y)===plain.firstElementChild);plain.remove();return{name:'${name}',plainHits,coarse,fine:d.defaultView.matchMedia('(pointer:fine)').matches,none:d.defaultView.matchMedia('(pointer:none)').matches,min,targets:out}})()`);
 assert.ok(proof.plainHits.every(Boolean));for(const target of proof.targets){assert.ok(target.width>=proof.min&&target.height>=proof.min,JSON.stringify({proof,target}));assert.equal(target.overlaps,false,JSON.stringify(target));assert.equal(target.withinRow,true,JSON.stringify(target));assert.ok(target.points.every(Boolean),JSON.stringify(target));if(target.kind.startsWith('expand'))assert.ok(target.parentHeight>=proof.min);}
 assert.ok(proof.targets.some(target=>target.points.length));(result.shadowTargets??=[]).push(proof);
}
async function stableHunk(cdp,name,file,hunk) {
 const frames=await cdp.evaluate(`new Promise(resolve=>{const d=uiReview.docs.${name},read=()=>({file:d.activeElement?.dataset.huhuHunkFile,hunk:d.activeElement?.dataset.huhuHunkHeader,connected:d.activeElement?.isConnected,outline:d.defaultView.getComputedStyle(d.activeElement).outlineStyle,width:d.defaultView.getComputedStyle(d.activeElement).outlineWidth});d.defaultView.requestAnimationFrame(()=>d.defaultView.requestAnimationFrame(()=>{const first=read();d.defaultView.requestAnimationFrame(()=>resolve([first,read()]))}))})`);
 for(const frame of frames){assert.equal(frame.file,file,JSON.stringify(frame));assert.equal(frame.hunk,String(hunk),JSON.stringify(frame));assert.equal(frame.connected,true);assert.equal(frame.outline,'solid');assert.equal(frame.width,'2px');}return frames;
}
async function pressHunkKey(cdp,shift) {
 for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key:'F7',code:'F7',windowsVirtualKeyCode:118,nativeVirtualKeyCode:118,modifiers:shift?8:0});
}
async function exerciseVirtualHunks(cdp,result,waitFor) {
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 result.virtualHunks=[];
 for(const [width,scale] of [[1440,1],[320,2]]) {
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:scale,mobile:false});await cdp.evaluate(`uiReview.configure({language:'zh',theme:'paper',cssWidth:${width},source:'huhu',density:'compact',accent:'teal',motion:'reduce'})`);
  for(const name of ['main','second']){await show(cdp,name,'diff');await visible(cdp,name);await waitFor(()=>cdp.evaluate(`!!uiReview.docs.${name}.querySelector('diffs-container')?.shadowRoot?.querySelector('.huhu-diff-gutter')`),'shadow ready');await assertShadowTargets(cdp,result,name);}
  for(const route of ['button','keyboard']) {await show(cdp,'main','diff');await show(cdp,'main','target-long');await visible(cdp,'main');await waitFor(()=>cdp.evaluate("!!uiReview.docs.main.querySelector('.huhu-diff-gutter')||!!uiReview.docs.main.querySelector('diffs-container')?.shadowRoot?.querySelector('.huhu-diff-gutter')"),'virtual rows');
  if(route==='keyboard')await cdp.evaluate(`uiReview.docs.main.querySelector('[aria-label="下一处变化（F7）"]').focus({preventScroll:true})`);for(let index=0;index<4;index++){if(route==='button')await trustedClick(cdp,'main','[aria-label="下一处变化（F7）"]');else await pressHunkKey(cdp,false);const file=index<2?'long-a.md':'long-b.md',hunk=index%2;await waitFor(()=>cdp.evaluate(`uiReview.docs.main.activeElement?.dataset.huhuHunkFile==='${file}'&&uiReview.docs.main.activeElement?.dataset.huhuHunkHeader==='${hunk}'`),'virtual target');result.virtualHunks.push({width,scale,route,file,hunk,frames:await stableHunk(cdp,'main',file,hunk)});}
  if(route==='button')await trustedClick(cdp,'main','[aria-label="上一处变化（Shift+F7）"]');else await pressHunkKey(cdp,true);await waitFor(()=>cdp.evaluate("uiReview.docs.main.activeElement?.dataset.huhuHunkHeader==='0'"),'previous virtual target');await stableHunk(cdp,'main','long-b.md',0);
  await trustedClick(cdp,'main','button[aria-label*="long-b.md"]');await tick(cdp);if(route==='button')await trustedClick(cdp,'main','[aria-label="下一处变化（F7）"]');else await pressHunkKey(cdp,false);await waitFor(()=>cdp.evaluate("uiReview.docs.main.activeElement?.dataset.huhuHunkFile==='long-b.md'&&uiReview.docs.main.activeElement?.dataset.huhuHunkHeader==='1'"),'expanded target');await stableHunk(cdp,'main','long-b.md',1);
  await trustedClick(cdp,'main','[aria-label="折叠未变化行"]');await tick(cdp);await assertShadowTargets(cdp,result,'main');if(route==='button')await trustedClick(cdp,'main','[aria-label="下一处变化（F7）"]');else await pressHunkKey(cdp,false);await waitFor(()=>cdp.evaluate("uiReview.docs.main.activeElement?.dataset.huhuHunkFile==='long-a.md'&&uiReview.docs.main.activeElement?.dataset.huhuHunkHeader==='0'"),'collapsed context target');(result.contextHunks??=[]).push({width,scale,route,frames:await stableHunk(cdp,'main','long-a.md',0)});
 }
 }
}

export async function exercise({ cdp, result, waitFor, capture }) {
	result.versioningStates = [];
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	for (const width of [1440, 390])
		for (const theme of ['paper', 'ink']) {
			await cdp.send('Emulation.setDeviceMetricsOverride', {
				width,
				height: 1000,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await cdp.evaluate(
				`uiReview.configure(${JSON.stringify({ language: 'zh', theme, cssWidth: width, source: 'huhu', density: 'comfortable', accent: 'teal', motion: 'reduce' })})`,
			);
			await visible(cdp, 'main');
			const states = await cdp.evaluate('uiReview.states');
			for (const mode of states) {
				await show(cdp, 'main', mode);
				if (['diff', 'missing', 'empty', 'note-review', 'compare', 'conflict'].includes(mode))
					await waitFor(
						() =>
							cdp.evaluate(
								`!!uiReview.docs.main.querySelector('diffs-container')?.shadowRoot?.querySelector('pre')`,
							),
						`${mode} actual renderer`,
					);
				if (mode === 'history') {
					await waitFor(
						() =>
							cdp.evaluate(`!!uiReview.docs.main.querySelector('[data-choice-key="${'a'.repeat(40)}"]')`),
						'actual commit graph',
					);
					await trustedClick(cdp, 'main', `[data-choice-key="${'a'.repeat(40)}"]`);
				}
				if (mode === 'changes') {
					await trustedClick(cdp, 'main', '[data-choice-key="unstaged:notes/project.md"]');
					await waitFor(
						() =>
							cdp.evaluate(
								`!!uiReview.docs.main.querySelector('diffs-container')?.shadowRoot?.querySelector('pre')`,
							),
						'changes selected file',
					);
				}
				const proof = await cdp.evaluate(
					`(()=>{const doc=uiReview.docs.main,host=doc.querySelector('main');return{state:host.querySelector('[data-state]')?.dataset.state,overflow:host.scrollWidth>host.clientWidth+1,renderers:host.querySelectorAll('diffs-container').length,body:host.textContent.slice(0,300)}})()`,
				);
				assert.equal(proof.state, mode);
				assert.equal(proof.overflow, false, `${width}/${theme}/${mode}`);
				const screenshot = await capture(`t16-${width}-${theme}-${mode}`);
				result.versioningStates.push({ width, theme, mode, ...proof, screenshot });
			}
		}
	await show(cdp, 'main', 'render-limit');
	await trustedClick(cdp, 'main', 'button', '仍然渲染');
	await waitFor(() => cdp.evaluate('uiReview.resources().main.live===1'), 'actual large parser worker running');
	await trustedClick(cdp, 'main', 'button', '取消');
	await waitFor(
		() => cdp.evaluate('uiReview.resources().main.live===0'),
		'actual parser calculation terminated by cancellation',
	);
	assert.equal(await cdp.evaluate("!!uiReview.docs.main.querySelector('diffs-container')"), false);
	result.versioningStates.push({ largeParserCancellation: await cdp.evaluate('uiReview.resources().main') });
	// Actual shadow keyboard and trusted mouse hit in both Documents; no mock renderer.
	for (const name of ['main', 'second']) {
		await show(cdp, name, 'diff');
		await visible(cdp, name);
		await waitFor(
			() =>
				cdp.evaluate(
					`!!uiReview.docs.${name}.querySelector('diffs-container')?.shadowRoot?.querySelector('.huhu-diff-gutter')`,
				),
			`${name} keyboard gutter`,
		);
		await assertShadowTargets(cdp,result,name);
		await cdp.evaluate(
			`(()=>{const doc=uiReview.docs.${name},gutter=doc.querySelector('diffs-container').shadowRoot.querySelector('[data-additions] .huhu-diff-gutter')??doc.querySelector('diffs-container').shadowRoot.querySelector('.huhu-diff-gutter');gutter.focus()})()`,
		);
		(result.versioningKeyboardBefore ??= []).push(await cdp.evaluate(`(()=>{const doc=uiReview.docs.${name},el=doc.querySelector('diffs-container'),focused=el.shadowRoot.activeElement;return{name:'${name}',docFocus:doc.hasFocus(),hostActive:doc.activeElement?.tagName,focused:focused?.outerHTML?.slice(0,1600)}})()`));
		for (const type of ['keyDown', 'keyUp'])
			await cdp.send('Input.dispatchKeyEvent', {
				type,
				key: 'Enter',
				code: 'Enter',
				windowsVirtualKeyCode: 13,
				nativeVirtualKeyCode: 13,
				...(type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}),
			});
		await waitFor(
			() =>
				cdp.evaluate(
					`!![...uiReview.docs.${name}.querySelectorAll('button')].find(node=>node.textContent.includes('复制所选行'))`,
				),
			`${name} keyboard selection copy bar`,
		);
		// The library restores replaced gutter nodes in its owning onPostRender lifecycle.
		// Observe two consecutive paints after that lifecycle; never poll for one successful focus.
		const frames = await cdp.evaluate(
			`new Promise(resolve=>{const doc=uiReview.docs.${name},read=()=>{const element=doc.querySelector('diffs-container'),focus=element?.shadowRoot?.activeElement;return{keyboardFocus:focus?.classList.contains('huhu-diff-gutter')??false,outline:focus?doc.defaultView.getComputedStyle(focus).outlineStyle:'none',width:focus?doc.defaultView.getComputedStyle(focus).outlineWidth:'0',line:focus?.dataset.columnNumber,resources:uiReview.resources().${name}}};doc.defaultView.requestAnimationFrame(()=>doc.defaultView.requestAnimationFrame(()=>{const first=read();doc.defaultView.requestAnimationFrame(()=>resolve([first,read()]))}))})`,
		);
		for (const frame of frames) {
			assert.equal(frame.keyboardFocus, true, JSON.stringify(frame));
			assert.equal(frame.outline, 'solid');
			assert.equal(frame.width, '2px');
		}
		assert.equal(frames[0].line, frames[1].line);
		const proof = frames[1];
		result.versioningKeyboardAfter ??= []; result.versioningKeyboardAfter.push(proof);
		assert.equal(proof.keyboardFocus, true, JSON.stringify(proof));
		assert.equal(proof.outline, 'solid');
		result.versioningStates.push({ document: name, keyboard: proof });
		await trustedClick(cdp, name, '[aria-label="下一处变化（F7）"]');
		await waitFor(
			() => cdp.evaluate(`uiReview.docs.${name}.activeElement?.hasAttribute('data-huhu-hunk-header')`),
			`${name} actual hunk focus`,
		);
	}
	await exerciseVirtualHunks(cdp,result,waitFor);
	await cdp.evaluate('uiReview.dispose()');
	await tick(cdp);
	const cleanup = await cdp.evaluate('uiReview.resources()');
	for (const owner of Object.values(cleanup)) {
		assert.equal(owner.live, 0);
		assert.equal(owner.urls, 0);
		for (const count of Object.values(owner.listeners)) assert.equal(count, 0);
		assert.equal(owner.created, owner.terminated);
	}
	result.versioningCleanup = cleanup;
}

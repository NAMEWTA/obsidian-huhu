import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts={sonner:{'sonner/dist/index.mjs':1},radix:Object.fromEntries(Object.keys(modalTransforms).map(key=>[key,1]))};
export const startup='globalThis.uiReviewStartup';
export const ready='!!globalThis.uiReview&&Object.values(uiReview.docs).every(d=>d.querySelector("[data-home-greeting]"))';
export const configure=sample=>`uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS='html,body{margin:0;padding:0;min-width:0}main.huhu-ui{width:100%;height:100vh;min-width:0}';
async function show(cdp,name,state,width){
    await cdp.evaluate(`(()=>{const f=document.querySelector('iframe');f.style.cssText='position:fixed;top:0;height:100vh;border:0;z-index:100;left:${name==='second'?'0':'-3000px'};width:${width}px';})()`);
    await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},${JSON.stringify(state)})`);
    await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
export async function verify({cdp,sample,waitFor,capture}){
    assert.equal(await cdp.evaluate('uiReview.surfaces.length'),32,'authoritative registry has 18 widgets and 14 sections');
    for(const name of ['main','second']){
        for(const state of await cdp.evaluate('uiReview.states')){
            await show(cdp,name,state,sample.cssWidth);
            await waitFor(()=>cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review-state="${state}"]')`),'state mounted');
            if(state==='analytics-custom'){
                await click(cdp,name,null,'[data-slot=date-range-field] button[aria-haspopup=dialog]');
                await waitFor(()=>cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-slot=date-scroll-viewport]')`),'shared analytics range popup');
                await capture(`t08-${name}-${sample.cssWidth}-analytics-custom`);
            }
            const proof=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name};return{nativeDates:d.querySelectorAll('input[type=date],input[type=datetime-local]').length,nested:d.querySelectorAll('button button').length,overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,tiles:d.querySelectorAll('[data-tile]').length,regions:d.querySelectorAll('[data-slot=widget-header]').length,errors:[...d.querySelectorAll('[role=alert]')].map(n=>n.textContent)}})()`);
            assert.equal(proof.nativeDates,0,`${name}/${state}: shared dates`);assert.equal(proof.nested,0,`${name}/${state}: no nested buttons`);
            assert.equal(proof.overflow,false,`${name}/${state}: page overflow`);
            if(await cdp.evaluate(`uiReview.surfaces.some(s=>s.key===${JSON.stringify(state)})`))assert.ok(proof.tiles>=1,`${state}: production entry is mounted`);
            sample.assertions.push({name,state,proof});
        }
        await show(cdp,name,'default',sample.cssWidth);
        await capture(`t08-${name}-${sample.cssWidth}-default`);
    }
}
async function click(cdp,name,key,selector){
    const point=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},n=${selector?'d.querySelector('+JSON.stringify(selector)+')':"[...d.querySelectorAll('button')].find(n=>n.textContent.trim()===uiReview.text("+JSON.stringify(key)+"))"};if(!n)throw Error('Missing control');n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for(const type of ['mousePressed','mouseReleased']) await cdp.send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
}
async function arrow(cdp,key,code,modifiers=0){for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers});}
export async function exercise({cdp,result,capture,waitFor}){
    const proof=[];
    for(const width of [1440,390])for(const name of ['main','second']){
        await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
        await show(cdp,name,'default',width);
        await click(cdp,name,'home.layout.edit');
        await waitFor(()=>cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-grid-action=move]')`),'editing handles');
        await click(cdp,name,null,'[data-grid-action=move]');
        await arrow(cdp,'ArrowDown',40,width===1440?8:0);
        await capture(`t08-${name}-${width}-editing`);
        await click(cdp,name,'home.layout.cancel');
        await waitFor(()=>cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-grid-action=move]')`),'cancel layout');
        if(width===1440){
            const before=await cdp.evaluate(`uiReview.owners.${name}.vault.contents.get('.huhu/dashboards/Review.md')`);
            await click(cdp,name,'home.layout.edit');await click(cdp,name,null,'[data-grid-action=move]');await arrow(cdp,'ArrowDown',40,8);
            await cdp.evaluate(`uiReview.owners.${name}.fail=true`);await click(cdp,name,'home.layout.done');
            await waitFor(()=>cdp.evaluate(`uiReview.docs.${name}.querySelector('[role=alert]')?.textContent.includes('Controlled write rejection')`),'real failed layout persistence');
            assert.equal(await cdp.evaluate(`uiReview.owners.${name}.vault.contents.get('.huhu/dashboards/Review.md')`),before,'failed save retains disk');
            await capture(`t08-${name}-layout-save-failure`);
            await cdp.evaluate(`uiReview.owners.${name}.fail=false`);await click(cdp,name,'home.layout.done');
            await waitFor(()=>cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-grid-action=move]')`),'retry layout save');
            assert.notEqual(await cdp.evaluate(`uiReview.owners.${name}.vault.contents.get('.huhu/dashboards/Review.md')`),before,'retry persists actual geometry');
            const accepted=await cdp.evaluate(`JSON.stringify(uiReview.owners.${name}.store.state.getState().data.grid)`);
            await click(cdp,name,'home.layout.edit');await click(cdp,name,null,'[data-grid-action=move]');await arrow(cdp,'ArrowDown',40,8);
            await cdp.evaluate(`uiReview.owners.${name}.fail=true`);await click(cdp,name,'home.layout.done');
            await waitFor(()=>cdp.evaluate(`uiReview.docs.${name}.querySelector('[role=alert]')?.textContent.includes('Controlled write rejection')`),'cancel counter rejection');
            await cdp.evaluate(`uiReview.owners.${name}.fail=false`);await click(cdp,name,'home.layout.cancel');
            await waitFor(()=>cdp.evaluate(`!uiReview.docs.${name}.querySelector('[data-grid-action=move]')`),'cancel rejected layout');
            await cdp.evaluate(`uiReview.owners.${name}.store.sync.flush()`);
            assert.equal(await cdp.evaluate(`JSON.stringify(uiReview.owners.${name}.store.state.getState().data.grid)`),accepted,'cancelled geometry cannot return through flush');

        }
        proof.push({name,width,editCancel:true,realFailureRetry:width===1440});
    }
    await cdp.evaluate('uiReview.dispose()');
    await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    assert.equal(await cdp.evaluate('Object.values(uiReview.docs).some(doc=>doc.querySelector(".huhu-portal-root"))'),false,'unmount releases document portals');
    result.taskExercise={proof,boundaries:['Real BoardStore/SyncEngine and record applications with memory vault adapter','Trusted CDP pointer and key input; no real vault, CLI, audio, account or external write','Second Document is an iframe, not Obsidian popout']};
}

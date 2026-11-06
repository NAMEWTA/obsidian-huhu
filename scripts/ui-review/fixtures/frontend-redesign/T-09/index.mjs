import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = { sonner: { 'sonner/dist/index.mjs': 1 }, radix: Object.fromEntries(Object.keys(modalTransforms).map(key => [key, 1])) };
export const startup = 'globalThis.uiReviewStartup';
export const ready = '!!globalThis.uiReview && Object.keys(uiReview.owners).length===2';
export const configure = sample => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;height:100%;overflow:hidden}';
const tick = cdp => cdp.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
async function clickLabel(cdp, name, key) {
 await cdp.evaluate(`Promise.all([...uiReview.docs.${name}.querySelectorAll('[data-slot=sheet-overlay][data-state=closed]')].flatMap(node=>node.getAnimations()).map(animation=>animation.finished.catch(()=>{})))`);
 await tick(cdp);

 const p = await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},label=uiReview.text(${JSON.stringify(key)}),n=[...d.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===label&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0);if(!n)throw Error('Missing '+label);n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:n.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),target:n.outerHTML,actual:d.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML}})()`);
 assert.equal(p.hit, true, `${name}/${key}: trusted pointer target ${JSON.stringify(p)}`);
 for (const type of ['mousePressed','mouseReleased']) await cdp.send('Input.dispatchMouseEvent', {type,x:p.x,y:p.y,button:'left',clickCount:1});
 await tick(cdp);
}
async function escape(cdp) { for (const type of ['keyDown','keyUp']) await cdp.send('Input.dispatchKeyEvent', {type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await tick(cdp); }
export async function verify({ cdp, sample, waitFor, capture }) {
 for (const name of ['main', 'second']) {
  await cdp.evaluate(`(()=>{const f=document.querySelector('iframe');f.style.cssText='position:fixed;top:0;border:0;height:100vh;z-index:100;left:${name === 'second' ? '0' : '-3000px'};width:${sample.cssWidth}px'})()`);
  for (const state of await cdp.evaluate('uiReview.states')) {
   await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},${JSON.stringify(state)})`);
   await tick(cdp);
   if (state === 'info') await clickLabel(cdp, name, 'agent.sessionInfo');
   if (state === 'new') { await clickLabel(cdp, name, 'agent.workspace.newTab'); await cdp.send('Input.imeSetComposition', {text:'中文',selectionStart:2,selectionEnd:2}); await cdp.send('Input.imeSetComposition', {text:'',selectionStart:0,selectionEnd:0}); }
   await waitFor(() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review-state=${state}]')`), state);
   const result = await cdp.evaluate(`(()=>{const d=uiReview.docs.${name};return {overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,panels:d.querySelectorAll('[data-agent-workspace]').length,terminal:d.querySelectorAll('.xterm').length,waiting:!!d.querySelector('[data-agent-waiting-banner]'),errors:uiReview.owners.${name}.diagnostics}})()`);
   assert.equal(result.overflow, false, `${name}/${state}: no page overflow`);
   if (state === 'waiting') assert.equal(result.waiting, true, 'actual waiting state projects banner');
   if (['terminal', 'split', 'waiting'].includes(state)) assert.ok(result.terminal > 0, `${name}/${state}: real xterm screen`);
   assert.deepEqual(result.errors, [], `${name}/${state}: no unexpected fixture errors`);
   if (state === 'info') assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-agent-session-information]')`),true,'actual session detail');
   if (state === 'new') assert.equal(await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-new-tab-menu]')`),true,'actual new-session menu with IME');
   sample.assertions.push(`${name}/${state}: actual agent UI and existing ports, bounded viewport`);
   if ([1440, 390, 320].includes(sample.cssWidth)) await capture(`agent-${name}-${state}-${sample.id}`.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-'));
   if (state === 'new') await escape(cdp);
   if (state === 'info') { if (await cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=dialog]')`)) await escape(cdp); else await clickLabel(cdp,name,'agent.sessionInfo'); }
  }
  await cdp.evaluate(`uiReview.show('${name}','waiting')`); await tick(cdp);
  const before = await cdp.evaluate(`(()=>{const o=uiReview.owners.${name};return [...o.map.values()].map(s=>s.id)})()`);
  await cdp.evaluate(`uiReview.owners.${name}.hide(true)`); await tick(cdp);
  await cdp.evaluate(`uiReview.owners.${name}.hide(false)`); await tick(cdp);
  assert.deepEqual(await cdp.evaluate(`(()=>{const o=uiReview.owners.${name};return [...o.map.values()].map(s=>s.id)})()`), before, 'hidden/restored UI retains headless sessions');
  sample.actions.push(`${name}: hidden UI restores existing sessions`);
 }
}
export async function exercise({ cdp, result }) {
 await cdp.evaluate('uiReview.dispose()');
 assert.equal(await cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-agent-workspace],.xterm,.huhu-portal-root"))'), true);
 result.cleanup = 'Both document owners and terminal renderers disposed';
}

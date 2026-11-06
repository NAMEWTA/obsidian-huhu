import { modalTransforms } from '../../../../radix-owner-document.mjs';
import assert from 'node:assert/strict';
export const adapterCounts = { sonner: { 'sonner/dist/index.mjs': 1 }, radix: Object.fromEntries(Object.keys(modalTransforms).map(name => [name, 1])) };
export const startup='globalThis.uiReviewStartup';
export const ready='!!globalThis.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("button"))';
export const configure=sample=>`uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS=`body{padding:0}main{width:100%}
@keyframes repair-motion-probe{to{transform:translateX(1px)}}
[data-review="motion"], [data-review="motion"]::before, [data-review="motion"]::after,
[data-review="motion-root"]::before, [data-review="motion-root"]::after {
 content:"";position:absolute;width:0;height:0;pointer-events:none;
 animation:repair-motion-probe 2s linear infinite;transition:transform 2s;scroll-behavior:smooth;
}`;
function rgba(value) {
 const parts=value.match(/[\d.]+/g)?.map(Number);
 assert.ok(parts?.length>=3,`unsupported computed color ${value}`);
 return [...parts.slice(0,3),parts[3]??1];
}
function over(top,bottom) {return top.slice(0,3).map((channel,index)=>channel*top[3]+bottom[index]*(1-top[3]));}
function ratio(fg,bg) {
 const luminance=rgb=>rgb.slice(0,3).map(channel=>channel/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4).reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);
 const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export async function verify({cdp,sample,waitFor,capture}) {
 const result=await cdp.evaluate(`Object.values(uiReview.docs).map(doc=>{
 const root=doc.querySelector('.huhu-ui');const s=doc.defaultView.getComputedStyle(root);const portal=doc.querySelector('.huhu-portal-root');
 const probe=doc.querySelector('[data-review="motion"]');
 const motions=[[root,'::before'],[root,'::after'],[probe,null],[probe,'::before'],[probe,'::after']].map(([node,pseudo])=>{const style=doc.defaultView.getComputedStyle(node,pseudo);return {name:style.animationName,duration:style.animationDuration,transition:style.transitionDuration,scroll:style.scrollBehavior}});
 return {theme:root.dataset.theme,accent:root.dataset.accent,control:s.getPropertyValue('--hu-ctl-h').trim(),font:s.getPropertyValue('--hu-text-md').trim(),motion:s.getPropertyValue('--hu-dur-fast').trim(),portal:portal.dataset.theme,viewport:doc.documentElement.clientWidth,overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth+1,host:doc.body.style.getPropertyValue('--background-primary'),mapped:root.style.getPropertyValue('--hu-surface'),mappedAccent:root.style.getPropertyValue('--hu-accent-text'),save:doc.querySelector('[data-review="save"]').textContent,motions,systemReduce:doc.defaultView.matchMedia('(prefers-reduced-motion:reduce)').matches};})`);
 assert.equal(await cdp.evaluate('uiReview.getLanguage()'),sample.language);
 for(const [index,item] of result.entries()) {
  if(index===0)assert.ok(item.viewport<=sample.cssWidth && item.viewport>=sample.cssWidth-16,`viewport ${item.viewport}/${sample.cssWidth}`);
  assert.equal(item.theme,sample.theme);assert.equal(item.portal,sample.theme);assert.equal(item.accent,sample.accent);
  assert.equal(item.control,sample.density==='comfortable'?'36px':'32px');assert.equal(item.font,`${sample.uiSize}px`);
  assert.equal(item.save,sample.language==='en'?'Save':'保存');assert.equal(item.overflow,false);
  assert.equal(item.systemReduce,sample.reducedMotion);
  if(sample.reducedMotion||sample.motion==='reduce') {
   assert.equal(item.motion,'0ms');for(const motion of item.motions) {assert.equal(motion.name,'none');assert.equal(motion.duration,'0s');assert.equal(motion.transition,'0s');assert.equal(motion.scroll,'auto');}
  } else for(const motion of item.motions) {assert.equal(motion.name,'repair-motion-probe');assert.equal(motion.duration,'2s');}
  if(sample.source==='obsidian') {
   assert.equal(item.host,sample.theme==='ink'?'#1d1c19':'#ffffff');
   if(sample.hostMode==='safe'){assert.equal(item.mapped,item.host);assert.equal(item.mappedAccent,sample.theme==='ink'?'#eeeeee':'#111111');}
   else {assert.equal(item.mapped,'');assert.equal(item.mappedAccent,'');}
  } else {assert.equal(item.host,'');assert.equal(item.mapped,'');}
 }
 sample.overlays=[];
 for(const name of ['main','second']) {
  await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review="overlay"]').click()`);
  await waitFor(()=>cdp.evaluate(`!!uiReview.docs.${name}.querySelector('.huhu-portal-root [role="dialog"]')`),`${name} overlay`);
  await cdp.evaluate(`Promise.all([...uiReview.docs.${name}.querySelectorAll('[role="dialog"],[data-slot="dialog-overlay"]')].flatMap(node=>node.getAnimations()).filter(animation=>animation.effect.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished))`);
  const overlay=await cdp.evaluate(`(()=>{const doc=uiReview.docs.${name};const dialog=doc.querySelector('[role="dialog"]');const root=dialog.closest('.huhu-ui');const get=(selector)=>{const node=dialog.querySelector(selector);const style=doc.defaultView.getComputedStyle(node);return {fg:style.color,bg:style.backgroundColor,border:style.borderTopColor}};const style=doc.defaultView.getComputedStyle(dialog);return {owner:root.ownerDocument===doc,theme:root.dataset.theme,source:root.dataset.source,accent:root.dataset.accent,fg:style.color,bg:style.backgroundColor,selection:get('[data-review="overlay-selection"]'),input:get('[data-review="overlay-input"]'),primary:get('[data-review="overlay-primary"]'),close:dialog.querySelector('button[aria-label]')?.getAttribute('aria-label')??dialog.querySelector('[data-slot="dialog-close"]')?.textContent};})()`);
  assert.equal(overlay.owner,true);assert.equal(overlay.theme,sample.theme);assert.equal(overlay.source,sample.source);assert.equal(overlay.accent,sample.accent);
  const bg=rgba(overlay.bg),text=rgba(overlay.fg);
  const inputBg=over(rgba(overlay.input.bg),bg);
  const checks={body:ratio(text,bg),selection:ratio(rgba(overlay.selection.fg),over(rgba(overlay.selection.bg),bg)),input:ratio(rgba(overlay.input.fg),inputBg),boundary:ratio(rgba(overlay.input.border),inputBg),primary:ratio(rgba(overlay.primary.fg),rgba(overlay.primary.bg))};
  for(const [pair,value] of Object.entries(checks))assert.ok(value>=(pair==='body'?7:pair==='boundary'?3:4.5),`${sample.theme}/${sample.accent}/${sample.source}/${sample.hostMode}/${name}/${pair}: ${value}`);
  // The shared Dialog's own translated accessible close name also proves production locale subscription.
  assert.equal(overlay.close,sample.language==='en'?'Close':'关闭');
  sample.overlays.push({document:name,theme:overlay.theme,source:overlay.source,accent:overlay.accent,contrasts:checks,closeLabel:overlay.close});
  const suffix=`${sample.width}-${sample.language}-${sample.theme}-${sample.accent}-${sample.source}-${sample.hostMode??'none'}-${sample.density}-${sample.uiSize}-${sample.mobile?'mobile':'desktop'}-${sample.zoom}x-${name}`;
  if(name==='second')await cdp.evaluate("globalThis.reviewIframeStyle=document.querySelector('iframe').style.cssText;document.querySelector('iframe').style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9999'");
  await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  sample.overlays.at(-1).screenshot=await capture(`overlay-${suffix}`);
  if(name==='second')await cdp.evaluate("document.querySelector('iframe').style.cssText=globalThis.reviewIframeStyle");
  await cdp.evaluate(`uiReview.docs.${name}.querySelector('[role="dialog"] [data-slot="dialog-close"]').click()`);
  await waitFor(()=>cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role="dialog"]')`),`${name} closed`);
 }
 sample.assertions.push('real locale; mapped/fallback host groups; actual pseudo motion; open overlays and computed contrast in both owner Documents');
}
export async function exercise({result}) {result.interactions=['Every matrix sample opened and inspected real Dialog overlays in both Documents'];}

// A hidden page refuses to capture, a failed load shows an error state, and navigation recovers from it.
import { browserFixture } from './browser-fixture.mjs';
await browserFixture(async ({ runtime, url, evaluate, check }) => {
 await evaluate(`window.m=mountPage({url:${JSON.stringify(url)}});await m.page.native.ready;await m.page.native.initialLoad;true`);
 // The retained guest follows its placeholder on the next frames.
 await evaluate(`m.div.style.display='none';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));true`);
 const hidden = await evaluate(`m.page.native.screenshot().then(()=>'captured',e=>e.code??String(e))`);
 check('hidden-capture-fails-promptly', hidden === 'browser_capture_not_visible', hidden);
 await evaluate(`m.div.style.display='';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await m.page.native.navigate(${JSON.stringify(url + 'failure')}).catch(()=>{});true`);
 check('failed-load-has-visible-state', await evaluate('!!m.page.store.getState().error'));
 await evaluate(`await m.page.native.navigate(${JSON.stringify(url)});true`);
 check('navigation-recovers-after-load-error', await evaluate('m.page.store.getState().error===null'));
 await runtime.shot('browser-error-recovered');
 await evaluate(`host.disposePage(m.page.id);m.div.remove();true`);
});

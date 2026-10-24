// Native element reads, element picking, captures, viewport simulation and module lifecycle of the retained browser.
import { browserFixture } from './browser-fixture.mjs';

await browserFixture(async ({ runtime, url, p, evaluate, until, check, delay }) => {
 await evaluate(`window.m=mountPage({url:${JSON.stringify(url)}});await m.page.native.ready;await m.page.native.initialLoad;window.native=m.page.native;true`);
 const observed = await evaluate(`native.automation.execute('snapshot',{})`);
 check('native-snapshot-reads-page', observed.snapshot.includes('Browser fixture'));
 const ref = observed.refs.find(row => row.name === 'Read me');
 check('native-element-value', (await evaluate(`native.automation.execute('get',${JSON.stringify({ revision: observed.revision, element: ref.ref })})`)).text === 'Read me');
 const sensitive = observed.refs.find(row => row.name === 'Password');
 check('password-is-not-returned', !JSON.stringify(await evaluate(`native.automation.execute('get',${JSON.stringify({ revision: observed.revision, element: sensitive.ref })})`)).includes('fixture-secret'));
 await evaluate(`await native.automation.design(grab=>{window.picked=grab});true`);
 const point = await evaluate(`native.guest.executeJavaScript("(()=>{const r=document.querySelector('button').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()")`);
 const offset = await evaluate(`(()=>{const r=native.webview.getBoundingClientRect();return{x:r.x,y:r.y}})()`);
 for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
  await runtime.connection.send('Input.dispatchMouseEvent', { type, x: point.x + offset.x, y: point.y + offset.y, ...(type === 'mouseMoved' ? {} : { button: 'left', clickCount: 1 }) });
  await delay(100);
 }
 await until('!!window.picked');
 check('native-element-pick-captures-context-and-image', await evaluate(`picked.text==='Read me'&&picked.selector.includes('button')&&picked.screenshot.startsWith('data:image/png;base64,')`));
 const shot = await evaluate('native.screenshot()');
 check('visible-screenshot', shot.startsWith('data:image/png;base64,'));
 await evaluate(`native.automation.execute('viewport',{width:640,height:480})`);
 check('viewport-simulation', await evaluate(`native.guest.executeJavaScript('innerWidth')`) === 640);
 await evaluate(`native.automation.execute('viewport',{})`);
 await runtime.shot('browser-control');
 await evaluate(`await native.automation.design();host.disposePage(m.page.id);m.div.remove();true`);
 check('released-guest-is-disposed', await evaluate('native.disposed'));
 await evaluate(`${p}.setModuleEnabled('browser',false)`);
 check('module-disable-releases-guests', await evaluate(`!document.querySelector('webview')&&!${p}.services.peek({owner:'browser',id:'open'})`));
});

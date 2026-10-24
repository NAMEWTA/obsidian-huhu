// The retained browser restores its pages and profiles after a restart and when the module is switched off and on.
import { browserFixture } from './browser-fixture.mjs';
await browserFixture(async ({ runtime, url, p, evaluate, until, check, delay }) => {
 const tabs = `${p}.services.peek({owner:'agent',id:'browser-tabs'})`;
 const profile = await evaluate(`${p}.services.peek({owner:'browser',id:'profiles'}).create('Recovery profile')`);
 const id = await evaluate(`${p}.services.peek({owner:'browser',id:'open'}).open({url:${JSON.stringify(url)},profileId:${JSON.stringify(profile.id)}})`);
 await evaluate(`${tabs}.activate(${JSON.stringify(id)});app.workspace.requestSaveLayout();true`);
 await until(`!!document.querySelector('webview')`);
 await delay(1500); await runtime.restart();
 await until(`${tabs}?.list().some(t=>t.id===${JSON.stringify(id)})`);
 const tab = await evaluate(`${tabs}.list().find(t=>t.id===${JSON.stringify(id)})`);
 check('restart-retains-page-and-account', tab.url === url && tab.profileId === profile.id, tab);
 await evaluate(`${tabs}.activate(${JSON.stringify(id)});true`);
 const pageLoaded = `(()=>{try{return document.querySelector('webview')?.executeJavaScript('document.body.innerText').then(text=>text.includes('Browser fixture'),()=>false)}catch{return false}})()`;
 await until(pageLoaded);
 check('restart-loads-the-restored-page', true);
 await runtime.shot('browser-restored');
 await evaluate(`${p}.setModuleEnabled('browser',false)`);
 await until(`!document.querySelector('webview')`);
 check('disabled-module-releases-native-guest', true);
 await evaluate(`${p}.setModuleEnabled('browser',true)`);
 await until(`!!${tabs}?.list().some(t=>t.id===${JSON.stringify(id)})`);
 await evaluate(`${tabs}.activate(${JSON.stringify(id)});true`);
 await until(`!!document.querySelector('webview')`); await until(pageLoaded);
 check('reenable-restores-browser-page', true);
});

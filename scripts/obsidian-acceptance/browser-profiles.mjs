// Browser accounts (profiles) and real Electron guest sessions; all web traffic stays on a local fixture.
// Covers: sessions live inside the vault, accounts do not share cookies or local storage, a new-window link keeps its
// account, rename and delete (which clears only that account), and the labels after a restart.
import { browserFixture } from './browser-fixture.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

await browserFixture(async ({ runtime, url, p, evaluate, until, check, delay }) => {
 const bp = `${p}.services.peek({owner:'browser',id:'profiles'})`;
 const mount = async (profileId) => {
  const id = await evaluate(`window.mounted??={};const m=mountPage({url:${JSON.stringify(url)},profileId:${JSON.stringify(profileId)}});mounted[m.page.id]=m;await m.page.native.ready;await m.page.native.initialLoad;return m.page.id`);
  return id;
 };
 const script = (id, expression) => evaluate(`mounted[${JSON.stringify(id)}].page.native.guest.executeJavaScript(${JSON.stringify(expression)})`);
 const storage = (id) => evaluate(`require('@electron/remote').webContents.fromId(mounted[${JSON.stringify(id)}].page.native.webview.getWebContentsId()).session.storagePath`);
 const identity = JSON.parse(await fs.readFile(path.join(runtime.vault, '.huhu/config/identity.json'), 'utf8'));
 const device = Object.keys(identity.devices)[0], profileRoot = path.join(runtime.vault, '.huhu/browser', device, 'profiles');

 const original = await mount('default');
 check('default-session-is-inside-vault', await storage(original) === path.join(profileRoot, 'default', 'session'));
 await script(original, `document.cookie='account=default;path=/;max-age=86400';localStorage.account='default';true`);
 check('blank-label-is-rejected', await evaluate(`${bp}.create(' ').then(()=>false,()=>true)&&${bp}.list().length===1`));
 const work = (await evaluate(`${bp}.create('Work')`)).id, personal = (await evaluate(`${bp}.create('Personal')`)).id;
 check('two-isolated-accounts-are-created', work !== personal && await evaluate(`${bp}.list().length===3`));

 const workPage = await mount(work);
 check('new-work-account-has-no-default-cookie', (await script(workPage, 'document.cookie')) === '' && (await script(workPage, 'localStorage.account??null')) === null);
 await script(workPage, `document.cookie='account=work;path=/;max-age=86400';localStorage.account='work';true`);
 const personalPage = await mount(personal);
 check('second-account-has-no-other-account-data', (await script(personalPage, 'document.cookie')) === '' && (await script(personalPage, 'localStorage.account??null')) === null);
 check('accounts-retain-their-own-data', (await script(workPage, 'document.cookie')) === 'account=work' && (await script(original, 'document.cookie')) === 'account=default');
 const paths = [await storage(original), await storage(workPage), await storage(personalPage)];
 check('isolated-sessions-include-device-and-profile', new Set(paths).size === 3 && paths[1] === path.join(profileRoot, work, 'session') && paths[2] === path.join(profileRoot, personal, 'session'), paths);

 await evaluate(`${bp}.rename(${JSON.stringify(work)},'Research')`);
 check('rename-keeps-the-account', await evaluate(`${bp}.list().find(p=>p.id===${JSON.stringify(work)}).label==='Research'`));
 const saved = JSON.parse(await fs.readFile(path.join(runtime.vault, '.huhu/browser', device, 'profiles.json'), 'utf8'));
 check('metadata-is-durable-and-has-no-cookie-export', saved.profiles.length === 2 && !JSON.stringify(saved).includes('account=work'), saved);

 await runtime.restart();
 await evaluate(`window.host=${p}.services.peek({owner:'browser',id:'host'});window.mountPage=(init)=>{const div=document.body.createDiv();div.style.cssText='position:fixed;top:120px;left:300px;width:640px;height:420px;pointer-events:none';const page=host.createPage(init);page.mount(div);return {page,div}};true`);
 check('labels-survive-restart', await evaluate(`${bp}.list().find(p=>p.id===${JSON.stringify(work)})?.label==='Research'`));
 const restoredWork = await mount(work), restoredDefault = await mount('default');
 check('persisted-work-session-keeps-own-cookie', (await script(restoredWork, 'document.cookie')) === 'account=work');
 check('persisted-default-session-keeps-original-cookie', (await script(restoredDefault, 'document.cookie')) === 'account=default');

 // Deleting an account needs its open pages confirmed, closes them and clears only that account's session.
 check('delete-needs-the-current-page-set', await evaluate(`${bp}.remove(${JSON.stringify(work)},['not-a-page']).then(()=>false,e=>e.code==='browser_profile_pages_changed')`));
 await evaluate(`mounted[${JSON.stringify(restoredWork)}].div.remove();host.disposePage(${JSON.stringify(restoredWork)});${bp}.remove(${JSON.stringify(work)},[])`);
 await until(`!${bp}.list().some(p=>p.id===${JSON.stringify(work)})`);
 check('delete-clears-only-the-selected-session', await evaluate(`const s=require('@electron/remote').session.fromPath(${JSON.stringify(path.join(profileRoot, work, 'session'))});return (await s.cookies.get({url:${JSON.stringify(url)}})).length===0`));
 check('default-cookie-survives-other-account-delete', (await script(restoredDefault, 'document.cookie')) === 'account=default');
 await evaluate(`${p}.setModuleEnabled('browser',false)`);
 check('module-off-releases-profile-service', await evaluate(`!${p}.services.peek({owner:'browser',id:'profiles'})&&!document.querySelector('webview')`));
 await evaluate(`${p}.setModuleEnabled('browser',true)`);
 await until(`${bp}?.list().length===2`);
 check('reenable-retains-only-remaining-accounts', await evaluate(`${bp}.list().some(p=>p.id===${JSON.stringify(personal)})`));
});

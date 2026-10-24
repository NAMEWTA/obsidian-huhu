// Real Adapter and Markdown renderer: references survive moves, reuse and restart.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
const p='app.plugins.plugins.huhu', rows=[];
let runtime,c;
const check=(name,passed,detail)=>{rows.push({name,passed:!!passed,detail});assert.ok(passed,name);};
const until=async(expression)=>{for(let attempt=0;attempt<200;attempt++){if(await c.evaluate(expression))return;await delay(100);}throw Error(expression);};
const current=`[...document.querySelectorAll('textarea.font-mono')].find(e=>e.getBoundingClientRect().width>0)`;
const open=async resource=>{await c.evaluate(`${p}.openWorkbench({feature:'content',resourceId:${JSON.stringify(resource)}},window)`);await until(`!!${current}`);};
try {
 runtime=await launchFreshVault({root:process.argv[2],port:9443,files:{
  '.huhu/dashboards/Old/Note.md':'# Note\n![image](picture.svg)\n',
  '.huhu/dashboards/Old/picture.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="red"/></svg>',
  '.huhu/dashboards/New/picture.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="blue"/></svg>',
  '.huhu/dashboards/Ref.md':'[[Old/Note#Note|Keep target]]',
  'Ordinary.md':'[Keep target](Old/Note.md#Note)',
  'Archive/Done.md':'# Personal archive',
 },settings:{version:1,namespaces:{app:{language:'zh',introSeen:true,modules:Object.fromEntries(['home','agent','browser','archives','automations','notifications','icons','comments','sync'].map(id=>[id,false]))}}}});c=runtime.connection;
 check('ordinary-default-archive-keeps-its-owner',await fs.readFile(path.join(runtime.vault,'Archive/Done.md'),'utf8')==='# Personal archive');
 await open('.huhu/dashboards/Old/Note.md');
 await c.evaluate(`${p}.managedContent.rename(${p}.managedContent.getFileByPath('.huhu/dashboards/Old/Note.md'),'.huhu/dashboards/New/Note.md')`);
 await until(`${current}?.value.includes('/.huhu/dashboards/Old/picture.svg')`);
 check('open-editor-follows-rename-and-preserves-old-image',true);
 await c.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent==='预览').click();true`);
 await until(`!!document.querySelector('.markdown-rendered.huhu-native img')?.naturalWidth`);
 check('rewritten-absolute-image-renders-in-native-markdown',true);
 await c.evaluate(`${p}.managedContent.process('.huhu/dashboards/New/Note.md',text=>text+${JSON.stringify('\n![new](./picture.svg)')})`);
 check('new-relative-link-uses-the-current-directory',await c.evaluate(`${p}.managedContent.resolveLink('./picture.svg','.huhu/dashboards/New/Note.md').path==='.huhu/dashboards/New/picture.svg'`));
 await c.evaluate(`${p}.managedContent.rename(${p}.managedContent.getFileByPath('.huhu/dashboards/New/Note.md'),'.huhu/dashboards/Final/Note.md')`);
 await c.evaluate(`Promise.all([${p}.managedContent.create('.huhu/dashboards/Old/Note.md','Unrelated old path'),${p}.managedContent.create('.huhu/dashboards/New/Note.md','Unrelated intermediate path')])`);
 await until(`${p}.managedContent.getFileByPath('.huhu/dashboards/New/Note.md')!==null`);
 const reference=await fs.readFile(path.join(runtime.vault,'.huhu/dashboards/Ref.md'),'utf8');
 check('existing-incoming-links-follow-original-identity',reference==='[[/.huhu/dashboards/Final/Note.md#Note|Keep target]]');
 check('ordinary-incoming-link-preserves-the-target',await fs.readFile(path.join(runtime.vault,'Ordinary.md'),'utf8')==='[Keep target](</.huhu/dashboards/Final/Note.md#Note>)');
 await runtime.restart();c=runtime.connection;
 await open('.huhu/dashboards/Final/Note.md');
 check('restart-retains-both-image-targets',await c.evaluate(`${current}.value.includes('/.huhu/dashboards/Old/picture.svg')&&${current}.value.includes('/.huhu/dashboards/New/picture.svg')`));
 await c.evaluate(`(async()=>{const leaf=app.workspace.getLeaf('tab');await leaf.openFile(app.vault.getFileByPath('Ordinary.md'),{state:{mode:'preview'}})})()`);
 await until(`!!document.querySelector('.markdown-reading-view a[data-href=".huhu/dashboards/Final/Note.md#Note"]')`);
 await c.evaluate(`document.querySelector('.markdown-reading-view a[data-href=".huhu/dashboards/Final/Note.md#Note"]').click();true`);
 await until(`!!${current}`);await c.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent==='预览').click();true`);await until(`!!document.querySelector('.markdown-rendered.huhu-native h1')`);
 check('native-reference-opens-original-after-path-reuse',await c.evaluate(`document.querySelector('.markdown-rendered.huhu-native h1').textContent==='Note'`));
 await runtime.shot('renamed-content-links');
 check('no-runtime-errors',await c.evaluate('huhuAcceptanceErrors.length')===0,await c.evaluate('huhuAcceptanceErrors'));
 await fs.writeFile(path.join(runtime.evidence,'result.json'),JSON.stringify({platform:process.platform,rows},null,2));
}catch(error){if(runtime){await runtime.shot('failure');await fs.writeFile(path.join(runtime.evidence,'partial.json'),JSON.stringify({rows,error:String(error),errors:await c.evaluate('huhuAcceptanceErrors'),body:await c.evaluate('document.body.innerText')},null,2));}throw error;}
finally{if(runtime){console.log(JSON.stringify({evidence:runtime.evidence,checks:rows.length,failed:rows.filter(row=>!row.passed)}));await runtime.stop();}}

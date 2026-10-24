// Production Markdown renderer and clean native editor, including literal '%' identities.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
const p='app.plugins.plugins.huhu', rows=[];
let runtime,c;
const check=(name,passed,detail)=>{rows.push({name,passed:!!passed,detail});assert.ok(passed,name);};
const until=async expression=>{for(let attempt=0;attempt<200;attempt++){if(await c.evaluate(expression))return;await delay(100);}throw Error(expression);};
// The content page is React/Tailwind: its container is the visible workbench view.
const active="[...document.querySelectorAll('.workspace-leaf-content[data-type=huhu-workbench-view]')].find(e=>e.getBoundingClientRect().width>0)";
// Earlier pages stay mounted but hidden, so only a visible heading counts.
const shownTitle=title=>`[...${active}?.querySelectorAll('.markdown-rendered.huhu-native h1')??[]].some(e=>e.getBoundingClientRect().width>0&&e.textContent===${JSON.stringify(title)})`;
const code='    [[Old/Note]]\n\n> ```md\n> [[Old/Note]]\n> ```';
const source='[[A B|wiki space]]\n\n[[A%20B|wiki literal]]\n\n[markdown space](A%20B.md)\n\n[markdown literal](A%2520B.md)\n\n![picture](image(1).svg)';
const preview=async resource=>{
 await c.evaluate(`${p}.openWorkbench({feature:'content',resourceId:${JSON.stringify(resource)}},window)`);
 await until(`!!${active}`);
 await c.evaluate(`(()=>{const b=[...${active}.querySelectorAll('button')].find(e=>e.textContent==='预览');if(b)b.click()})()`);
};
try {
 runtime=await launchFreshVault({root:process.argv[2],port:9444,files:{
  '.huhu/dashboards/Old/Note.md':source,
  '.huhu/dashboards/Fault/Note.md':'![retained](../Old/image(1).svg)',
  '.huhu/dashboards/Old/A B.md':'# Space target',
  '.huhu/dashboards/Old/A%20B.md':'# Literal target',
  '.huhu/dashboards/Old/image(1).svg':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><rect width="14" height="14" fill="red"/></svg>',
  'Native.md':'[[Old/Note|native link]]\n\n'+code,
  'Archive/Done.md':'Personal archive',
 },settings:{version:1,namespaces:{app:{language:'zh',introSeen:true,modules:Object.fromEntries(['home','agent','browser','archives','automations','notifications','icons','comments','sync'].map(id=>[id,false]))}}}});c=runtime.connection;
 await c.evaluate(`(async()=>{window.nativeLeaf=app.workspace.getLeaf('tab');await nativeLeaf.openFile(app.vault.getFileByPath('Native.md'),{state:{mode:'source'}})})()`);
 await until(`window.nativeLeaf?.view.editor.getValue().includes('[[Old/Note|native link]]')`);
 await c.evaluate(`${p}.managedContent.rename(${p}.managedContent.getFileByPath('.huhu/dashboards/Old/Note.md'),'.huhu/dashboards/New/Note.md')`);
 await until(`window.nativeLeaf.view.editor.getValue().includes('[[/.huhu/dashboards/New/Note.md|native link]]')`);
 check('native-clean-editor-follows-reference-update',true);
 check('ordinary-code-examples-unchanged',(await fs.readFile(path.join(runtime.vault,'Native.md'),'utf8')).endsWith(code));
 await c.evaluate(`${p}.managedContent.prepareMetadata()`);
 const graph=await c.evaluate(`${p}.managedContent.resolvedLinks()['.huhu/dashboards/New/Note.md']`);
 check('rewritten-destinations-keep-distinct-identities',graph['.huhu/dashboards/Old/A B.md']===2&&graph['.huhu/dashboards/Old/A%20B.md']===2&&graph['.huhu/dashboards/Old/image(1).svg']===1,graph);
 await c.evaluate(`(async()=>{const adapter=app.vault.adapter,original=adapter.rename;let failed=false;adapter.rename=async function(from,to){await original.call(this,from,to);if(from==='.huhu/dashboards/Fault/Note.md'&&!failed){failed=true;throw Error('acceptance: moved before acknowledgement')}};try{await ${p}.managedContent.rename(${p}.managedContent.getFileByPath('.huhu/dashboards/Fault/Note.md'),'.huhu/dashboards/Recovered/Note.md')}catch(error){if(!String(error).includes('acceptance: moved before acknowledgement'))throw error}finally{adapter.rename=original}if(!failed)throw Error('fault was not injected')})()`);
 check('real-adapter-recovers-after-moving-a-document-with-outgoing-links',(await fs.readFile(path.join(runtime.vault,'.huhu/dashboards/Recovered/Note.md'),'utf8')).includes('/.huhu/dashboards/Old/image(1).svg'));
 await c.evaluate(`${p}.settingsNamespace('home').update(draft=>{draft.workspaces={files:['.huhu/dashboards/Old/Note'],names:['Recovered board'],active:0}},{persist:'immediate'})`);
 await runtime.restart();c=runtime.connection;
 check('ordinary-archive-stays-after-settings-save-and-restart',await fs.readFile(path.join(runtime.vault,'Archive/Done.md'),'utf8')==='Personal archive');
 await c.evaluate(`${p}.setModuleEnabled('home',true)`);
 check('home-activation-recovers-a-board-that-missed-the-rename-event',await c.evaluate(`${p}.settingsNamespace('home').get().dashboardFile==='.huhu/dashboards/New/Note'`));
 await c.evaluate(`${p}.setModuleEnabled('home',false)`);
 for(const [label,title] of [['wiki space','Space target'],['wiki literal','Literal target'],['markdown space','Space target'],['markdown literal','Literal target']]){
  await preview('.huhu/dashboards/New/Note.md');
  await until(`!![...${active}.querySelectorAll('a.internal-link')].find(e=>e.textContent===${JSON.stringify(label)})`);
  const links=await c.evaluate(`[...${active}.querySelectorAll('a.internal-link')].map(e=>({text:e.textContent,href:e.getAttribute('href'),data:e.dataset.href}))`);
  await c.evaluate(`[...${active}.querySelectorAll('a.internal-link')].find(e=>e.textContent===${JSON.stringify(label)}).click();true`);
  await until(`[...${active}?.querySelectorAll('textarea.font-mono')??[]].some(e=>e.getBoundingClientRect().width>0&&e.value===${JSON.stringify('# '+title)})||${shownTitle(title)}`);
  await c.evaluate(`(()=>{const b=[...${active}.querySelectorAll('button')].find(e=>e.textContent==='预览');if(b)b.click()})()`);
  await until(shownTitle(title));
  check('native-click-'+label,true,links);
 }
 await preview('.huhu/dashboards/New/Note.md');
 await until(`${active}?.querySelector('img')?.naturalWidth===14`);
 check('balanced-parenthesis-image-renders',true);await runtime.shot('markdown-identities');
 check('no-runtime-errors',await c.evaluate('huhuAcceptanceErrors.length')===0,await c.evaluate('huhuAcceptanceErrors'));
 await fs.writeFile(path.join(runtime.evidence,'result.json'),JSON.stringify({platform:process.platform,rows},null,2));
}catch(error){if(runtime){await runtime.shot('failure');await fs.writeFile(path.join(runtime.evidence,'partial.json'),JSON.stringify({rows,error:String(error),errors:await c.evaluate('huhuAcceptanceErrors'),body:await c.evaluate('document.body.innerText')},null,2));}throw error;}
finally{if(runtime){console.log(JSON.stringify({evidence:runtime.evidence,checks:rows.length,failed:rows.filter(row=>!row.passed)}));await runtime.stop();}}

// 真实 Obsidian：历史预览、保存/恢复/撤销、多叶、重启与弹出窗口。
// 从仓库根运行：HUHU_OBSIDIAN_EXECUTABLE=/absolute/obsidian node scripts/obsidian-acceptance/versioning-history.mjs /absolute/new-fixture-root
// root 必须不存在；支持 HUHU_PLUGIN_SOURCE 与 HUHU_ACCEPTANCE_PORT。仅创建本地 Git，未配置远端。
// 此处检查原生宿主边界；算法、常规组件交互和故障注入由相应 Vitest 覆盖。
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
import { connect } from './cdp.mjs';

const root = process.argv[2];
assert.ok(root && path.isAbsolute(root), 'Pass a new absolute fixture root as the first argument');
const source = process.env.HUHU_PLUGIN_SOURCE || process.cwd();
const historical = '# Note\n\nhistorical top\nTARGET\nhistorical bottom\n';
const current = '# Note\n\ncurrent top\nTARGET\ncurrent bottom\n';
const longBefore = Array.from({length:5000},(_,i)=>`Line ${i}: original text for worker validation.\n`).join('');
const longAfter = longBefore.replace('Line 100: original','Line 100: changed').replace('Line 4500: original','Line 4500: changed');
// Both the plugin Git commands and fixture Git use only this disposable config.
process.env.GIT_CONFIG_GLOBAL = path.join(root, 'gitconfig');
process.env.GIT_CONFIG_NOSYSTEM = '1';
let runtime, c, pop;
let environment;
const errorSessions = [];
const rows = [];
const check = (name, passed, details) => { rows.push({ name, passed: !!passed, details }); console.log(JSON.stringify({ name, passed: !!passed })); assert.ok(passed, name); };
const until = async (expression, timeout = 20000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await c.evaluate(`!!(${expression})`).catch(() => false)) return; await delay(100); } throw new Error('Timed out: ' + expression); };
const git = (...args) => execFileSync('git', ['-C', runtime.vault, ...args], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
const button = (label, scope = 'document') => `[...${scope}.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(label)}||button.getAttribute('aria-label')===${JSON.stringify(label)})`;
const click = async expression => { await c.evaluate(`(()=>{const element=${expression};if(!element)throw Error('Probe could not find action');element.click();return true})()`); };
const sidecars = async () => { const dir=path.join(runtime.vault,'.huhu/editor/comments/files'); return Promise.all((await fs.readdir(dir)).map(async file=>JSON.parse(await fs.readFile(path.join(dir,file),'utf8')))); };

try {
 runtime = await launchFreshVault({ root, port: 9363, files: { 'Note.md': historical, 'Long.md':longBefore, 'Other.md': 'Other window note\n', 'Staged.md': 'base staged\n', '.gitignore': '.obsidian/\n.huhu/\n.trash/\n' }, settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules: Object.fromEntries(['home','agent','browser','archives','automations','notifications','icons','navigator','versioning','safe'].map(id=>[id,false]).concat([['comments',true]])) } } } });
 c = runtime.connection;
 environment = await c.evaluate(`({obsidian:require('@electron/remote').app.getVersion(),platform:require('os').platform(),versions:require('process').versions})`);
 await c.evaluate(`require('@electron/remote').getCurrentWindow().setBounds({x:0,y:0,width:1500,height:1000});true`);
 await fs.writeFile(path.join(root,'gitconfig'),'[init]\n defaultBranch = main\n[user]\n name = HUHU acceptance\n email = acceptance@example.invalid\n[commit]\n gpgsign = false\n');
 const artifacts = {};
 for(const file of ['main.js','styles.css','manifest.json']) artifacts[file]=createHash('sha256').update(await fs.readFile(path.join(source,file))).digest('hex');
 await fs.writeFile(path.join(runtime.evidence,'artifacts.json'),JSON.stringify(artifacts,null,2));
 git('init','-q'); git('add','Note.md','Long.md','Other.md','Staged.md','.gitignore'); git('commit','-qm','Historical version');
 await c.evaluate(`app.vault.modify(app.vault.getFileByPath('Note.md'),${JSON.stringify(current)})`);
 await c.evaluate(`app.vault.modify(app.vault.getFileByPath('Long.md'),${JSON.stringify(longAfter)})`);
 git('add','Note.md','Long.md'); git('commit','-qm','Current version');
 await c.evaluate(`app.vault.modify(app.vault.getFileByPath('Staged.md'),'staged-only change\\n')`); git('add','Staged.md');
 const head=git('rev-parse','HEAD'), index=git('ls-files','--stage','-z');
 await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('versioning',true)`);
 await until(`app.plugins.plugins.huhu.moduleState('versioning')==='active' && app.plugins.plugins.huhu.moduleState('comments')==='active'`);
 await c.evaluate(`(async()=>{window.probeSource=app.workspace.getLeaf(false);await probeSource.openFile(app.vault.getFileByPath('Note.md'));await probeSource.setViewState({type:'markdown',state:{file:'Note.md',mode:'source'},active:true});app.workspace.setActiveLeaf(probeSource,{focus:true});return true})()`);
 await until(`!!probeSource.view.containerEl.querySelector('.huhu-comments-editor')`);
 await c.evaluate(`(()=>{window.probeSourceStateChanges=0;const original=probeSource.setViewState.bind(probeSource);probeSource.setViewState=(...args)=>{probeSourceStateChanges++;return original(...args)};return true})()`);
 await c.evaluate(`(()=>{const editor=probeSource.view.editor,at=editor.getValue().indexOf('TARGET');editor.setSelection(editor.offsetToPos(at),editor.offsetToPos(at+6));editor.focus();app.commands.executeCommandById('huhu:add-comment-to-selection');return true})()`);
 await until(`!!document.querySelector('[data-comments-overlay="compose"] textarea')`);
 await c.evaluate(`(()=>{const textarea=document.querySelector('[data-comments-overlay="compose"] textarea');Object.getOwnPropertyDescriptor(textarea.ownerDocument.defaultView.HTMLTextAreaElement.prototype,'value').set.call(textarea,'Preserve this comment');textarea.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
 await click(button('Comment',`document.querySelector('[data-comments-overlay="compose"]')`));
 await until(`!document.querySelector('[data-comments-overlay="compose"]')`);
 check('native-comment-created',(await sidecars()).some(doc=>doc.path==='Note.md'&&doc.threads[0]?.messages[0]?.text==='Preserve this comment'));
 await c.evaluate(`app.commands.executeCommandById('huhu:versioning-note-history');true`);
 await until(`!!document.querySelector('section[aria-label="Note history"] [data-choice-index]')`);
 const diskBeforePreview = await fs.readFile(path.join(runtime.vault,'Note.md'),'utf8');
 await click(`[...document.querySelectorAll('section[aria-label="Note history"] [data-choice-index]')].find(option=>option.textContent.includes('Historical version'))`);
 await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).some(surface=>surface.getViewType()==='huhu-version-review') && !!document.querySelector('[data-layout]')`);
 await c.evaluate(`(()=>{window.probeSurface=app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).find(surface=>surface.getViewType()==='huhu-version-review');window.probeHost=probeSurface.host;window.probeContext=probeHost.documents.current(window);return true})()`);
 check('preview-keeps-native-source-and-disk',await c.evaluate(`app.workspace.getLeavesOfType('markdown').includes(probeSource)&&probeSource.view.editor.getValue()===${JSON.stringify(current)}&&probeHost.documents.current(window).path==='Note.md'`) && diskBeforePreview===await fs.readFile(path.join(runtime.vault,'Note.md'),'utf8'));
 check('preview-never-replaces-source-markdown-view',await c.evaluate('probeSourceStateChanges===0'));
 check('preview-does-not-change-git',head===git('rev-parse','HEAD')&&index===git('ls-files','--stage','-z'));
 await until(`!!document.querySelector('[data-layout] .cm-content')`);
 check('readonly-diff-has-no-comment-extension',await c.evaluate(`(()=>{const section=document.querySelector('[data-layout]'),editors=[...section.querySelectorAll('.cm-content')];return !section.querySelector('.huhu-comments-editor')&&editors.length>0&&editors.every(el=>el.getAttribute('contenteditable')==='false')})()`));
 await click(`[...document.querySelectorAll('[role="radio"]')].find(el=>el.textContent.trim()==='Side by side')`);
 await until(`document.querySelector('[data-layout="side-by-side"]')`); await runtime.shot('history-side-by-side');
 await click(`[...document.querySelectorAll('[role="radio"]')].find(el=>el.textContent.trim()==='Stacked')`);
 await until(`document.querySelector('[data-layout="stacked"]')`); await runtime.shot('history-stacked');
 check('real-host-both-comparison-layouts',true);
 await click(button('Restore to current note')); await until(`document.querySelector('[role="alertdialog"]')`);
 await click(button('Cancel',`document.querySelector('[role="alertdialog"]')`)); await until(`!document.querySelector('[role="alertdialog"]')`);
 check('native-restore-dialog-cancel-is-readonly',await c.evaluate(`probeSource.view.editor.getValue()===${JSON.stringify(current)}&&!probeHost.sync.snapshot.device.restoreHold`));
 await click(button('Restore to current note')); await until(`document.querySelector('[role="alertdialog"]')`);
 await click(button('Restore',`document.querySelector('[role="alertdialog"]')`)); await until(`probeSource.view.editor.getValue()===${JSON.stringify(historical)}&&document.body.textContent.includes('Restored successfully')`);
 await click(button('Undo this restore')); await until(`probeSource.view.editor.getValue()===${JSON.stringify(current)}&&document.body.textContent.includes('Restore undone')`);
 check('native-dialog-confirm-and-undo-complete',await fs.readFile(path.join(runtime.vault,'Note.md'),'utf8')===current);
 const restored = await c.evaluate(`(async()=>{const editor=probeSource.view.editor;editor.replaceRange('UNSAVED ',{line:2,ch:0});const draft=editor.getValue();const plan=await probeHost.restores.prepare({source:{id:'probe-historical',text:${JSON.stringify(historical)},label:'Historical version'},targetPath:'Note.md',originLeafId:probeContext.leafId,mode:'replace-current'});const receipt=await probeHost.restores.apply(plan.id);window.probeReceipt=receipt;return{dirty:plan.dirty,draft,before:await probeHost.restores.readSnapshot(receipt.beforeObject),beforeDisk:await probeHost.restores.readSnapshot(receipt.beforeDiskObject),body:editor.getValue(),disk:await app.vault.read(probeSource.view.file),stage:receipt.stage,hold:probeHost.sync.snapshot.device.restoreHold}})()`);
 // Native autosave may finish between prepare and apply; either exact disk baseline is valid.
 check('restore-preserves-draft-and-current-disk-checkpoint',restored.dirty&&restored.before===restored.draft&&[current,restored.draft].includes(restored.beforeDisk),{...restored,autosaveCompleted:restored.beforeDisk===restored.draft});
 check('restore-verifies-native-save',restored.stage==='verified'&&restored.body===historical&&restored.disk===historical&&!!restored.hold,restored);
 let comments=(await sidecars()).find(doc=>doc.path==='Note.md').threads;
 check('restore-preserves-comment-text-and-anchor',comments[0].status==='open'&&comments[0].anchor.start===historical.indexOf('TARGET')&&comments[0].messages[0].text==='Preserve this comment',comments[0]);
 const inverse=await c.evaluate(`(async()=>{const receipt=await probeHost.restores.undo(probeReceipt.id);return{stage:receipt.stage,body:probeSource.view.editor.getValue(),disk:await app.vault.read(probeSource.view.file)}})()`);
 check('undo-restores-previous-unsaved-content',inverse.stage==='verified'&&inverse.body===restored.draft&&inverse.disk===restored.draft,inverse);
 const multi=await c.evaluate(`(async()=>{window.probeSecond=app.workspace.createLeafBySplit(probeSource,'vertical');await probeSecond.openFile(probeSource.view.file);const plan=await probeHost.restores.prepare({source:{id:'probe-multi',text:${JSON.stringify(historical)}},targetPath:'Note.md',originLeafId:probeContext.leafId,mode:'replace-current'});const receipt=await probeHost.restores.apply(plan.id);return{stage:receipt.stage,first:probeSource.view.editor.getValue(),second:probeSecond.view.editor.getValue(),disk:await app.vault.read(probeSource.view.file)}})()`);
 check('restore-verifies-multiple-native-leaves',multi.stage==='verified'&&multi.first===historical&&multi.second===historical&&multi.disk===historical,multi);
 // Make the race deterministic: the other native leaf changes after the plan is captured.
 const conflict=await c.evaluate(`(async()=>{const plan=await probeHost.restores.prepare({source:{id:'probe-conflict',text:'should not be applied'},targetPath:'Note.md',originLeafId:probeContext.leafId,mode:'replace-current'});probeSecond.view.editor.replaceRange('NEW DRAFT ',{line:2,ch:0});try{await probeHost.restores.apply(plan.id);return{blocked:false}}catch(error){probeHost.restores.cancel(plan.id);return{blocked:true,message:error.message,first:probeSource.view.editor.getValue(),second:probeSecond.view.editor.getValue()}}})()`);
 check('other-native-leaf-change-after-plan-blocks-restore',conflict.blocked&&conflict.second.includes('NEW DRAFT ')&&!conflict.first.includes('should not be applied')&&!conflict.second.includes('should not be applied'),conflict);
 await c.evaluate(`probeSecond.view.save()`);
 await until(`probeSource.view.editor.getValue()===probeSecond.view.editor.getValue()`);
 await c.evaluate(`probeSecond.detach();true`);
 check('restores-preserve-head-and-staged-index',head===git('rev-parse','HEAD')&&index===git('ls-files','--stage','-z'));
 await runtime.shot('restore-completed');
 const copies=await c.evaluate(`(async()=>{const plan=await probeHost.restores.prepare({source:{id:'probe-copy',text:${JSON.stringify(historical)}},targetPath:'Note.md',mode:'create-copy',copyPath:'Restored-copy.md'});const receipt=await probeHost.restores.apply(plan.id);const copied=await app.vault.read(app.vault.getFileByPath('Restored-copy.md'));const undo=await probeHost.restores.undo(receipt.id);return{copied,stage:undo.stage,removed:!app.vault.getFileByPath('Restored-copy.md'),source:probeSource.view.editor.getValue()}})()`);
 check('copy-and-undo-use-native-vault-apis',copies.copied===historical&&copies.stage==='verified'&&copies.removed&&copies.source.includes('NEW DRAFT '),copies);
 const journalFiles=await fs.readdir(path.join(runtime.vault,'.huhu/recovery/versioning'));
 check('durable-private-checkpoints-written',journalFiles.length>0,journalFiles);
 await c.evaluate(`(async()=>{window.probeNativeWorker=window.Worker;window.probeWorkerCount=0;window.Worker=class extends probeNativeWorker{constructor(...args){super(...args);probeWorkerCount++}};window.probeLong=app.workspace.getLeaf('tab');await probeLong.openFile(app.vault.getFileByPath('Long.md'));app.workspace.setActiveLeaf(probeLong,{focus:true});app.commands.executeCommandById('huhu:versioning-note-history');return true})()`);
 await until(`document.querySelector('section[aria-label="Note history"] header')?.textContent.includes('Long.md')&&[...document.querySelectorAll('section[aria-label="Note history"] [data-choice-index]')].some(el=>el.textContent.includes('Historical version'))`);
 await click(`[...document.querySelectorAll('section[aria-label="Note history"] [data-choice-index]')].find(el=>el.textContent.includes('Historical version'))`);
 await until(`window.probeWorkerCount>0&&app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).some(surface=>surface.getViewType()==='huhu-version-review'&&surface.host.reviews.get(surface.id)?.source.path==='Long.md'&&surface.contentEl.querySelector('[data-layout] .cm-content'))`);
 check('large-diff-runs-real-browser-worker',await c.evaluate(`probeWorkerCount>0`),{characters:longBefore.length,workers:await c.evaluate('probeWorkerCount')});
 await runtime.shot('history-large-worker'); await c.evaluate(`window.Worker=probeNativeWorker;true`);
 const held=await c.evaluate(`({hold:probeHost.sync.snapshot.device.restoreHold,receipts:probeHost.restores.receipts().length,panelTab:app.workspace.getLeavesOfType('huhu-comments-view')[0].view.getState().tab,reviewId:app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).find(surface=>surface.getViewType()==='huhu-version-review'&&surface.host.reviews.get(surface.id)?.source.path==='Long.md').id})`);
 errorSessions.push({session:'before-restart',errors:await c.evaluate('huhuAcceptanceErrors')});
 await runtime.restart(); c=runtime.connection;
 await until(`app.plugins.plugins.huhu.moduleState('versioning')==='active'`);
 await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).some(surface=>surface.getViewType()==='huhu-version-review')`);
 // Restored inactive Obsidian leaves can be DeferredView until explicitly loaded/revealed.
 await c.evaluate(`(async()=>{for(const leaf of app.workspace.getLeavesOfType('huhu-workbench-view'))await leaf.loadIfDeferred();const leaf=app.workspace.getLeavesOfType('huhu-workbench-view').find(leaf=>leaf.view.getNativeSurfaces?.().some(surface=>surface.id===${JSON.stringify(held.reviewId)}));if(!leaf)throw Error('Restored comparison leaf missing');await app.workspace.revealLeaf(leaf);await leaf.loadIfDeferred();window.probeRestoredSurface=leaf.view.getNativeSurfaces().find(surface=>surface.id===${JSON.stringify(held.reviewId)});return true})()`);
 await until(`probeRestoredSurface.contentEl.textContent.includes('This comparison session has ended.')`);
 const reopened=await c.evaluate(`(()=>{const surface=probeRestoredSurface;return{hold:surface.host.sync.snapshot.device.restoreHold,receipts:surface.host.restores.receipts().length,panelTab:app.workspace.getLeavesOfType('huhu-comments-view')[0].view.getState().tab,expired:!surface.host.reviews.get(surface.id)&&surface.contentEl.textContent.includes('This comparison session has ended.'),hasOldBody:!!surface.contentEl.querySelector('.cm-content')||surface.contentEl.textContent.includes('Line 100:')}})()`);
 check('restart-preserves-sync-hold-and-private-receipts',!!held.hold&&reopened.hold===held.hold&&reopened.receipts===held.receipts,{before:held,after:reopened});
 check('restart-persists-selected-history-panel',held.panelTab==='history'&&reopened.panelTab==='history',{before:held.panelTab,after:reopened.panelTab});
 check('restart-expires-temporary-comparison-without-old-body',reopened.expired&&!reopened.hasOldBody,reopened);
 await runtime.shot('history-restart');
 const beforePopTargets=new Set((await (await fetch(process.env.HUHU_CDP_URL+'/json')).json()).map(target=>target.id));
 await c.evaluate(`(async()=>{window.probeMainLeaf=app.workspace.getLeavesOfType('markdown').find(leaf=>leaf.view.file?.path==='Long.md')??app.workspace.getLeaf('tab');await probeMainLeaf.openFile(app.vault.getFileByPath('Long.md'));window.probePop=app.workspace.getLeaf('tab');await probePop.openFile(app.vault.getFileByPath('Other.md'));app.workspace.moveLeafToPopout(probePop,{width:1200,height:900});return true})()`);
 await until(`probePop.view.containerEl.ownerDocument!==document`);
 const popTarget=(await (await fetch(process.env.HUHU_CDP_URL+'/json')).json()).find(target=>target.type==='page'&&!beforePopTargets.has(target.id));
 assert.ok(popTarget,'Native popout must expose its own page target');
 pop=await connect(popTarget.url,popTarget.id);
 // Capture the separate renderer's errors before mounting its history/review surfaces.
 await pop.evaluate(`(()=>{if(window.huhuAcceptanceErrors)return;window.huhuAcceptanceErrors=[];const original=console.error;console.error=(...args)=>{huhuAcceptanceErrors.push(args.map(a=>a?.stack??String(a)).join(' '));original(...args)};window.addEventListener('unhandledrejection',event=>huhuAcceptanceErrors.push(event.reason?.stack??String(event.reason)));})()`);
 await c.evaluate(`(()=>{app.workspace.setActiveLeaf(probeMainLeaf,{focus:true});app.workspace.setActiveLeaf(probePop,{focus:true});app.commands.executeCommandById('huhu:versioning-note-history');return true})()`);
 await until(`app.workspace.getLeavesOfType('huhu-comments-view').some(leaf=>leaf.view.containerEl.ownerDocument===probePop.view.containerEl.ownerDocument&&leaf.view.containerEl.querySelector('section[aria-label="Note history"] header')?.textContent.includes('Other.md'))`);
 const popOwnership=await c.evaluate(`(()=>{window.probePopPanel=app.workspace.getLeavesOfType('huhu-comments-view').find(leaf=>leaf.view.containerEl.ownerDocument===probePop.view.containerEl.ownerDocument);return{popout:probePopPanel.view.containerEl.ownerDocument===probePop.view.containerEl.ownerDocument,source:app.plugins.plugins.huhu.documents.current(probePop.view.containerEl.win)?.path,main:app.plugins.plugins.huhu.documents.current(window)?.path,panelTab:probePopPanel.view.getState().tab}})()`);
 check('popout-history-panel-keeps-window-source',popOwnership.popout&&popOwnership.source==='Other.md'&&popOwnership.main==='Long.md'&&popOwnership.panelTab==='history',popOwnership);
 await until(`probePopPanel.view.containerEl.querySelector('[data-choice-index]')`);
 await click(`probePopPanel.view.containerEl.querySelector('[data-choice-index]')`);
 await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).some(surface=>surface.getViewType()==='huhu-version-review'&&surface.host.reviews.get(surface.id)?.source.path==='Other.md'&&surface.contentEl.ownerDocument===probePop.view.containerEl.ownerDocument&&surface.contentEl.querySelector('[data-layout] .cm-content'))`);
 await c.evaluate(`(()=>{window.probePopReview=app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).find(surface=>surface.getViewType()==='huhu-version-review'&&surface.host.reviews.get(surface.id)?.source.path==='Other.md'&&surface.contentEl.ownerDocument===probePop.view.containerEl.ownerDocument);return true})()`);
 check('popout-history-comparison-keeps-window-source',true);
 const {data}=await pop.send('Page.captureScreenshot',{format:'png'});
 await fs.writeFile(path.join(runtime.evidence,'history-popout.png'),Buffer.from(data,'base64'));
 const beforeRelease=await fs.readFile(path.join(runtime.vault,'Note.md'),'utf8');
 await click(button('Confirm restore and release sync hold','probePopReview.contentEl'));
 await until(`!probePopReview.host.sync.snapshot.device.restoreHold`);
 check('explicit-review-releases-sync-hold-without-note-or-git-write',
  beforeRelease===await fs.readFile(path.join(runtime.vault,'Note.md'),'utf8')&&head===git('rev-parse','HEAD')&&index===git('ls-files','--stage','-z')&&await c.evaluate(`probePopReview.host.restores.receipts().length===${held.receipts}`));
 errorSessions.push({session:'after-restart',errors:await c.evaluate('huhuAcceptanceErrors')},{session:'popout',errors:await pop.evaluate('huhuAcceptanceErrors')});
 await fs.writeFile(path.join(runtime.evidence,'host-errors.json'),JSON.stringify(errorSessions,null,2));
 check('no-unhandled-host-errors',errorSessions.every(session=>session.errors.length===0),errorSessions);
} catch(error) {
 rows.push({name:'host-acceptance-failure',passed:false,details:error.stack});
 if(runtime) {
  await runtime.shot('failure').catch(()=>{});
  await fs.writeFile(path.join(runtime.evidence,'failure-state.json'),JSON.stringify(await c?.evaluate(`({body:document.body.innerText,errors:window.huhuAcceptanceErrors,modules:app.plugins.plugins.huhu.moduleManifests().map(m=>({id:m.id,state:app.plugins.plugins.huhu.moduleState(m.id)})),surfaces:app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(leaf=>leaf.view.getNativeSurfaces?.()??[]).map(s=>({type:s.getViewType(),keys:Object.keys(s)}))})`).catch(()=>null),null,2));
 }
} finally {
 pop?.close();
 if(runtime) { await fs.writeFile(path.join(runtime.evidence,'result.json'),JSON.stringify({realObsidian:environment?.obsidian,environment,passed:rows.every(row=>row.passed),rows},null,2));await runtime.stop(); }
 console.log(JSON.stringify({evidence:runtime?.evidence,passed:rows.every(row=>row.passed),checks:rows.length},null,2));
}
assert.ok(rows.every(row=>row.passed),'Real Obsidian versioning acceptance failed');

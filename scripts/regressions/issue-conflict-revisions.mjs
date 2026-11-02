import { memoryVault } from '../fixtures/memory-vault.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SyncEngine } from '../../src/modules/home/platform/board/sync.ts';
import { DashboardSaveError } from '../../src/modules/home/core/board/save-state.ts';
import { observeBoardAction } from '../../src/modules/home/ui/board/actions.ts';
import { generateDefaultMarkdown } from '../../src/modules/home/core/board/parser/default-document.ts';
import { parse, serialize } from '../../src/modules/home/core/board/parser/index.ts';
import { setLanguage } from '../../src/shared/i18n/index.ts';
import { Notice } from '../obsidian-stub.ts';
globalThis.window=globalThis;
// The board's own first quick action stands in for the old banner quote as the representative local edit.
const setLocal=(engine,name)=>engine.replaceData({...engine.getData(),quickActions:[{name,icon:'file-text',type:'file',target:'x.md'}]});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function fixture(name='Board'){
 const boardPath = '.huhu/dashboards/' + name + '.md';
 const memory = memoryVault({ [boardPath]: generateDefaultMarkdown() });
 const copies = new Map(); let beforeWrite = async () => {};
 const write = memory.adapter.write;
 memory.adapter.write = async (p, text) => {
  if (p !== boardPath) { await beforeWrite(p, text); copies.set(p, text); }
  await write(p, text);
 };
 const app = memory.app;
 const engine = new SyncEngine(app, { dashboardFile: '.huhu/dashboards/' + name });
 await engine.init();
 return { engine, copies, app, get disk() { return memory.contents.get(boardPath); },
  set disk(text) { memory.contents.set(boardPath, text); }, set beforeWrite(fn) { beforeWrite = fn; },
  recovery() { return JSON.parse([...copies].find(([p]) => p.includes('/conflicts/'))[1]); } };
}
async function conflict(f){f.disk+='\n<!-- external edit -->\n';await assert.rejects(setLocal(f.engine,'local'));}
test('queued A/B/C revisions after a first conflict retain C and external bytes',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();let held=false;
 f.beforeWrite=async p=>{if(!held&&!p.includes('/conflicts/')){held=true;entered.resolve();await release.promise;}};
 const a=assert.rejects(setLocal(f.engine,'A'));await entered.promise;
 const b=assert.rejects(setLocal(f.engine,'B')),c=assert.rejects(setLocal(f.engine,'C'));f.disk+='\n<!-- outside -->';const outside=f.disk;release.resolve();await Promise.all([a,b,c]);
 assert.equal(f.disk,outside);assert.equal(parse(f.recovery().local).quickActions[0]?.name,'C');assert.equal(f.recovery().revision,f.engine.getSaveState().localRevision);assert.equal(f.engine.getSaveState().status,'conflict-saved');await f.engine.close();
});
test('an older recovery completion cannot mark a newer edit saved',async()=>{
 const f=await fixture();await conflict(f);const first=deferred(),release=deferred(),second=deferred(),releaseSecond=deferred();let index=0;
 f.beforeWrite=async p=>{if(p.includes('/conflicts/')){index++;if(index===1){first.resolve();await release.promise;}if(index===2){second.resolve();await releaseSecond.promise;}}};
 const a=assert.rejects(setLocal(f.engine,'older'));await first.promise;const b=assert.rejects(setLocal(f.engine,'latest'));release.resolve();await second.promise;
 assert.equal(f.engine.getSaveState().status,'conflict-pending');assert.ok(f.engine.getSaveState().recoveryRevision<f.engine.getSaveState().localRevision);
 releaseSecond.resolve();await Promise.all([a,b]);assert.equal(parse(f.recovery().local).quickActions[0]?.name,'latest');await f.engine.close();
});
test('recovery failure remains explicit; retry persists the latest snapshot',async()=>{
 const f=await fixture();await conflict(f);f.beforeWrite=async p=>{if(p.includes('/conflicts/'))throw Error('recovery disk unavailable');};
 await assert.rejects(setLocal(f.engine,'latest failed'));assert.equal(f.engine.getSaveState().status,'recovery-error');assert.notEqual(parse(f.recovery().local).quickActions[0]?.name,'latest failed');
 await assert.rejects(f.engine.reloadFromDisk());assert.equal(f.engine.getData().quickActions[0]?.name,'latest failed');
 f.beforeWrite=async()=>{};await f.engine.retrySave();assert.equal(parse(f.recovery().local).quickActions[0]?.name,'latest failed');assert.equal(f.engine.getSaveState().status,'conflict-saved');await f.engine.close();
});
test('normal close drains a quiet change into recovery and separate boards never share copies',async()=>{
 const a=await fixture('A'),b=await fixture('B');
 // Home's old demo Task card is gone: exercise its still-owned document collapse state instead.
 await a.engine.addCard(a.engine.getData().columns[1].name,{
   id:'quiet-doc-card',title:'Reference',type:'project',docs:[{path:'Notes/reference.md'}]
 });
 await conflict(a);await conflict(b);
 a.engine.toggleCollapseDocQuiet('quiet-doc-card',[0]);await a.engine.close();
 const recovered=parse(a.recovery().local);
 assert.equal(recovered.columns[1].cards.find(card=>card.id==='quiet-doc-card')?.docs[0]?.collapsed,true);
 assert.notEqual(a.recovery().id,b.recovery().id);await b.engine.close();
});
test('reload refuses to discard a newer revision admitted during recovery IO',async()=>{
 const f=await fixture();await conflict(f);const entered=deferred(),release=deferred();let held=false;
 f.beforeWrite=async p=>{if(p.includes('/conflicts/')&&!held){held=true;entered.resolve();await release.promise;}};
 const reload=assert.rejects(f.engine.reloadFromDisk(),e=>e instanceof DashboardSaveError&&e.code==='changed');await entered.promise;
 const edit=assert.rejects(setLocal(f.engine,'keep during reload'));release.resolve();await Promise.all([reload,edit]);assert.equal(f.engine.getData().quickActions[0]?.name,'keep during reload');assert.equal(parse(f.recovery().local).quickActions[0]?.name,'keep during reload');await f.engine.close();
});
test('observed UI promises still reject to awaiting callers but ignored events do not leak',async()=>{
 const failures=[];const listener=e=>failures.push(e);process.on('unhandledRejection',listener);
 try{const f=await fixture();f.disk+='\n<!-- external event edit -->';const promise=setLocal(f.engine,'React event');assert.equal(observeBoardAction(promise),promise);await assert.rejects(promise,e=>e instanceof DashboardSaveError);
 const onToggle=()=>{void observeBoardAction(setLocal(f.engine,'ignored React event').then(()=>assert.fail('conflict must not succeed')));};onToggle();await new Promise(r=>setImmediate(r));await f.engine.flush();assert.deepEqual(failures,[]);assert.equal(parse(f.recovery().local).quickActions[0]?.name,'ignored React event');await f.engine.close();}finally{process.off('unhandledRejection',listener);}
});
test('both languages show actual recovery path and no obsolete directory',async()=>{
 const f=await fixture();await conflict(f);for(const language of ['zh','en','zh']){setLanguage(language);const message=Notice.messages.at(-1);assert.ok(message.includes(f.engine.getSaveState().recoveryPath));assert.ok(!message.includes('.dashboard-backup'));}await f.engine.close();
});

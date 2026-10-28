import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardKind, canReceiveTask } from '../../src/modules/home/core/board/card-kind.ts';
import { isRecentUserDocument } from '../../src/modules/home/core/board/recent-doc-policy.ts';
import { DEFAULT_TASK_ARCHIVE_PATH, DEFAULT_HIGHLIGHT_IMPORT_PATH } from '../../src/modules/home/core/board/default-paths.ts';
import { generateDefaultMarkdown } from '../../src/modules/home/core/board/parser/default-document.ts';
import { parse, serialize } from '../../src/modules/home/core/board/parser/index.ts';
import { taskDomainFixture } from '../fixtures/task-domain.ts';
import { TASK_STORE_PATH } from '../../src/shared/storage/vault-layout.ts';
import { setLanguage } from '../../src/shared/i18n/index.ts';
import { memoryVault } from '../fixtures/memory-vault.ts';
import fs from 'node:fs';

for (const [section, type, expected] of [['todo','task',true],['sticky','task',true],['sticky','note',false],['memo','task',false],['projects','project',false],['projects','task',true],['todo','web',false],['todo','weather',false],['todo','tracker',false],['library','task',false]]) {
  test('task eligibility ' + section + '/' + type, () => assert.equal(canReceiveTask({name:'用户标题',sectionType:section},{type}), expected));
}
test('rendering semantics preserve memo precedence', () => { assert.equal(cardKind('memo','task'),'memo'); assert.equal(cardKind('sticky','task'),'task'); });
const scope = { dashboardFile:'Boards/Current', workspaceFiles:['Boards/Other.md'], contacts:{rootFolder:'People'} };
for (const p of ['huhu/习惯/a/习惯.md','huhu/番茄钟/活动.md','huhu/记账/records.md','huhu/阅读/a.md','.huhu/automation/definitions/a/操作.md','Boards/Current.md','Boards/Other.md','People/档案格式说明.md','People/个人档案/A/基本信息.md','People/企业档案/B/基本信息.md','.huhu/test.md','Notes/.hidden/note.md']) test('exclude exact managed scope ' + p,()=>assert.equal(isRecentUserDocument(p,scope),false));
for (const p of ['HUHU/技术笔记/note.md','HUHU-笔记/习惯.md','Notes/活动.md','Notes/dashboard.md','Notes/2026-10-04.md','People/个人档案/A/资料.md','People/个人档案/A/sub/基本信息.md']) test('keep user material ' + p,()=>assert.equal(isRecentUserDocument(p,scope),true));
test('custom roots and workspace preferences are evaluated, not cached globally',()=>{assert.equal(isRecentUserDocument('People/个人档案/A/基本信息.md',{contacts:{rootFolder:'Elsewhere'}}),true); assert.equal(isRecentUserDocument('Boards/Current.md',{}),true);});
test('new defaults are language neutral and React recent documents use their host scope',()=>{
  assert.equal(DEFAULT_TASK_ARCHIVE_PATH,'huhu/待办/已完成.md');assert.equal(DEFAULT_HIGHLIGHT_IMPORT_PATH,'huhu/微信读书/划线');
  assert.ok(fs.readFileSync('src/modules/home/ui/canvas/RecentWidget.tsx','utf8').includes('isRecentUserDocument(file.path, settings)'));
});
for (const language of ['zh','en','zh']) test('default document uses creation-time language '+language,()=>{
  setLanguage(language);const data=parse(generateDefaultMarkdown());
  assert.deepEqual(data.columns.map(c=>c.name),language==='zh'?['收件箱','项目']:['Inbox','Projects']);
  assert.equal(data.columns.some(c=>c.sectionType==='todo'),false,'Task is not a Home content section');
  assert.equal((data.widgets??[]).filter(widget=>widget.provider==='task'&&widget.kind==='tasks').length,1,'Task contributes the default board widget');
  // no example cards that depend on .huhu/: memos are files, a project is a folder the user picks
  assert.deepEqual(data.columns[1].cards.map(c=>c.title),[]);assert.deepEqual(data.columns[0].cards.map(c=>c.title),[]);
  assert.equal(data.columns[1].sectionType,'projects');
  for(const col of data.columns) for(const card of col.cards) assert.equal(card.column,col.name);
  const raw=serialize(data);setLanguage(language==='zh'?'en':'zh');assert.equal(serialize(parse(raw)),raw);
});
/** Home can display Task, but cannot own Task commands or their source data. */
const taskDraft = (title='One task') => ({ title, description:'', timezone:'Asia/Singapore', relations:[] });

test('Task domain does not ingest old board and Markdown checkboxes',async()=>{
  setLanguage('en');
  const board=generateDefaultMarkdown(), legacy='- [ ] Legacy checkbox', legacyTask='- [ ] Old task [due:: 2026-09-01]';
  const vault=memoryVault({
    '.huhu/dashboards/Board.md':board,
    'Notes/old.md':legacy,
    'huhu/待办/待办.md':legacyTask,
  });
  const domain=await taskDomainFixture(vault.app);
  try {
    assert.equal(domain.tasks.query({filter:'all'}).total,0,'Legacy files are not a second Task source');
    const created=await domain.tasks.execute({kind:'create',commandId:'new-domain',draft:taskDraft()});
    assert.equal(created.ok,true);
    assert.equal(domain.tasks.query({filter:'all'}).total,1);
    assert.ok(vault.contents.has(TASK_STORE_PATH),'New tasks persist only in the Task domain store');
    assert.equal(vault.contents.get('.huhu/dashboards/Board.md'),board,'Task commands never rewrite boards');
    assert.equal(vault.contents.get('Notes/old.md'),legacy,'Note checkboxes remain untouched');
    assert.equal(vault.contents.get('huhu/待办/待办.md'),legacyTask,'Old Task Markdown is not imported or destroyed');
  } finally {
    await domain.dispose();
  }
});

test('Task tool writes require host grants and replay idempotently',async()=>{
  const vault=memoryVault(), domain=await taskDomainFixture(vault.app);
  try {
    const command={commandId:'exactly-once',draft:taskDraft('From agent')};
    const denied=await domain.tools.call('task.create',command,{grants:['task:read']});
    assert.equal(denied.ok,false);
    assert.equal(denied.error.code,'forbidden');
    assert.equal(vault.contents.has(TASK_STORE_PATH),false,'Forbidden calls do not create a store');

    const first=await domain.tools.call('task.create',command,{grants:['task:write']});
    assert.equal(first.ok,true);
    assert.equal(first.receipt.taskId,'task:exactly-once');
    const saved=vault.contents.get(TASK_STORE_PATH);
    const retried=await domain.tools.call('task.create',command,{grants:['task:write']});
    assert.equal(retried.ok,true);
    assert.equal(retried.replayed,true);
    assert.equal(vault.contents.get(TASK_STORE_PATH),saved,'Idempotent replay writes no new data');
    assert.equal(domain.tasks.query({filter:'all'}).total,1);
    const conflict=await domain.tools.call(
      'task.create',{...command,draft:taskDraft('Different payload')},{grants:['task:write']}
    );
    assert.equal(conflict.ok,false);
    assert.equal(conflict.error.code,'idempotency-conflict');
    assert.equal(vault.contents.get(TASK_STORE_PATH),saved);

    const obsolete=await domain.tools.call('task.create',{
      ...command,commandId:'bad-target',cardId:'demo-todo-1',path:'.huhu/dashboards/Board.md'
    },{grants:['task:write']});
    assert.equal(obsolete.ok,false,'Obsolete board destinations are not Task tool arguments');
    assert.equal(obsolete.error.code,'invalid-input');
  } finally {
    await domain.dispose();
  }
});

test('Task module lifetime prevents stale writes after disposal',async()=>{
  const vault=memoryVault(), domain=await taskDomainFixture(vault.app);
  const first=await domain.tasks.execute({kind:'create',commandId:'live',draft:taskDraft()});
  assert.equal(first.ok,true);
  await domain.dispose();
  assert.equal(domain.tasks.snapshot().status,'unavailable');
  const saved=vault.contents.get(TASK_STORE_PATH);
  const after=await domain.tasks.execute({kind:'create',commandId:'late',draft:taskDraft('Too late')});
  assert.equal(after.ok,false);
  assert.equal(after.error.code,'unavailable');
  assert.equal(vault.contents.get(TASK_STORE_PATH),saved);
});

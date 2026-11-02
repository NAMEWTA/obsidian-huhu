// One-shot diagnostic: loads the actual service/model. No production mutation.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'huhu-split-diagnosis-'));
try {
 await build({stdin:{contents:`
import assert from 'node:assert/strict';
import { WorkspaceService } from './src/modules/agent/services/workspace-service';
import { emptyWorkspace } from './src/modules/agent/core/workspace/model';
import { openTab, splitGroupWithTab } from './src/modules/agent/core/workspace/ops';
const count=Number(process.argv[2]??1);
let state=emptyWorkspace();
for(let i=0;i<count;i++)state=openTab(state,'g',{kind:'terminal',id:'t'+i,title:'Shell',sessionIds:['s'+i],paneLayout:{kind:'pane',session:'s'+i},focusedSessionId:'s'+i,panes:{['s'+i]:{}},state:'unknown',unread:false,createdAt:1,updatedAt:1});
const before=state;let reports=[];let updates=0;const direct=process.argv[3]==='direct';
// Use real move + update, omitting unrelated constructor subscriptions/native sessions.
const service=Object.create(WorkspaceService.prototype);
Object.assign(service,{persistence:{},store:{getState:()=>state,setState:fn=>{updates++;state=fn(state)}},launch:{report:e=>reports.push(e)},disposed:false,closing:false});
let outcome; if(direct) state=splitGroupWithTab(state,'t0','g','right','new-g'); else outcome=service.move('t0',{split:'right',ofGroupId:'g'});
console.log(JSON.stringify({count,direct,updates,groupsBefore:before.groups.length,groupsAfter:state.groups.length,sameState:before===state,reports:reports.length,outcome:outcome??null}));
if(direct) assert.equal(state===before,count===1); else assert.ok(state!==before || reports.length>0 || outcome!=null,'split must change layout or expose a rejection reason; observed silent no-op');
`,resolveDir:process.cwd(),loader:'ts',sourcefile:'diagnostics/T-18/split-silent.ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'probe.mjs'),alias:{obsidian:path.resolve('scripts/obsidian-stub.ts')},loader:{'.md':'text','.svg':'text'}});
 await import(pathToFileURL(path.join(dir,'probe.mjs')).href);
} finally { await rm(dir,{recursive:true,force:true}); }

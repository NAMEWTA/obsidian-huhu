import { createHash } from 'node:crypto';
export const DEFAULT_SEED = 20261031;
export const hash = value => createHash('sha256').update(value).digest('hex');
/** Entirely fictional, deterministic bytes; no machine/user data or wall clock. */
export function generateFixture(size = 'small', seed = DEFAULT_SEED) {
 if (!['small','large'].includes(size) || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid fixture/seed');
 const count=size==='small'?100:10000, now=1793440800000;
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state.toString(16).padStart(8,'0');};
 const notes={},comments=[],archives={},history={version:1,paths:{},entries:{}},objects={};
 const tasks={version:1,revision:0,tasks:{},series:{},receipts:{},events:[]};
 for(let i=0;i<count;i++) {
  const id=String(i).padStart(5,'0'),path=`Notes/Note-${id}.md`,text=`# Fiction ${id}\n\nSeed ${random()} observation ${i%13}.\n`;
  notes[path]=text;
  comments.push({path,thread:{id:`comment-${id}`,kind:'range',status:'open',anchor:{kind:'range',text:`Fiction ${id}`,textHash:hash(`Fiction ${id}`),before:'',after:'',lineHint:1,start:2,end:15},messages:[],color:'yellow',note:`Observation ${i%13}`,tags:['fiction'],createdAt:'2026-10-31T10:00:00Z',updatedAt:'2026-10-31T10:00:00Z'}});
  const documentId=`document-${id}`;history.paths[path]=documentId;
  for(let v=0;v<2;v++) {const content=text+`\nVersion ${v}\n`,digest=hash(content),entryId=`history-${id}-${v}`;objects[digest]=content;history.entries[entryId]={id:entryId,documentId,path,hash:digest,byteLength:Buffer.byteLength(content),createdAt:now+v,trigger:'interval'};}
  tasks.tasks[`task-${id}`]={id:`task-${id}`,revision:1,status:'open',title:`Task ${id}`,description:'Fictional task',timezone:'UTC',relations:[],createdAt:now,updatedAt:now,deviceId:'fixture'};
  if(i%10===0) archives[`huhu/Archives/People/Person-${id}/Profile.md`]=`---\nhuhu-type: person\nhuhu-id: person-${id}\nname: Person ${id}\nregion: Fiction\naliases: []\nmobiles: []\nphones: []\nwechat: []\nemails: []\ntags: []\n---\n\n# Person ${id}\n`;
 }
 const data={schema:1,size,seed,count,now,notes,comments,archives,history,objects,tasks};
 const bytes=JSON.stringify(data);
 return {data,bytes,digest:hash(bytes),counts:{notes:count,comments:comments.length,archives:Object.keys(archives).length,tasks:count,history:Object.keys(history.entries).length},byteLength:Buffer.byteLength(bytes)};
}

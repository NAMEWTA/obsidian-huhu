import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { ContactsApplication } from './core/application';
import { archiveServices } from './services/archive-services';
import { archiveFrontmatter, archiveMarkdown } from './core/persist/v2/markdown';
import { newRecord } from './core/model';
import { createMarkdown, relativeLink } from './core/persist/markdown';
import { deletionContent } from './core/relation-deletion';
import { definitionSemantic } from './core/definition-graph';
import { textHash } from '../../shared/storage/text-edits';
import type { ContactsFile, ContactsFiles } from './core/files';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function fixture() {
	const directory = await mkdtemp(join(tmpdir(), 'huhu-relations-')), entries = new Map<string, ContactsFile>();
	cleanup.push(() => rm(directory, { recursive: true, force: true }));
	const update = async (path: string) => { const info = await stat(join(directory, path)); const file = entries.get(path) ?? { path, extension: 'md', stat: { mtime: 0, size: 0 } }; file.stat.mtime = info.mtimeMs; file.stat.size = info.size; entries.set(path, file); return file; };
	const scan = async (folder = ''): Promise<void> => { for (const item of await readdir(join(directory, folder), { withFileTypes: true })) { const path = folder ? folder + '/' + item.name : item.name; if (item.isDirectory()) await scan(path); else await update(path); } };
	const files: ContactsFiles = {
		formatGuide: '', ready: () => scan(), getMarkdownFiles: () => [...entries.values()], getFileByPath: (path) => entries.get(path) ?? null, getAbstractFileByPath: (path) => entries.get(path) ?? null,
		read: (file) => readFile(join(directory, file.path), 'utf8'), cachedRead: (file) => readFile(join(directory, file.path), 'utf8'),
		create: async (path, raw, guard) => { await mkdir(dirname(join(directory, path)), { recursive: true }); guard?.(); await writeFile(join(directory, path), raw, { flag: 'wx' }); return update(path); },
		process: async (file, patch, guard) => { const raw = await files.read(file); guard?.(); const next = patch(raw); await writeFile(join(directory, file.path), next); await update(file.path); return next; },
		mkdir: async (path) => { await mkdir(join(directory, path), { recursive: true }); }, createFolder: async () => {}, createBinary: async () => { throw new Error('unused'); }, listFolder: () => [], trashFolder: async () => {},
		checkFolderEditors: async () => () => {}, captureEditors: async () => () => {}, checkEditor: () => {},
	};
	let root = 'huhu/档案'; const app = () => { const application = new ContactsApplication(files, () => ({ rootFolder: root, maxColumns: 6, layouts: {} })); cleanup.push(async () => application.dispose()); return application; };
	const application = app(), services = archiveServices(() => application.archives);
	const put = async (path:string,raw:string) => { await mkdir(dirname(join(directory,path)),{recursive:true});await writeFile(join(directory,path),raw);return update(path); };
	return { directory, files, entries, put, app, application, services, changeRoot: (value: string) => { root = value; } };
}

test('real type, form and relation publishers expose portable committed heads distinct from staged revisions',async()=>{
 const f=await fixture(),type=await f.services.commands.publishType({typeId:'project',label:'Project',folder:'Projects',titleFieldId:'name',fields:[{fieldId:'name',storageKey:'project-name',label:'Name',codec:'text'}]});
 const initial=await f.services.catalog.forms('project'),forms=await f.services.commands.publishForms({typeId:'project',baseRevisionId:null,baseContentHash:null,schemaContentHash:type.contentHash,design:initial.design});
 const preset=(await f.services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='friend')!;const {revisionId:_revision,contentHash:_hash,parentRevisionIds:_parents,displayVersion:_version,...input}=preset;await f.services.commands.publishRelationType(input);
 const states=await f.services.catalog.definitionStates();expect(states.find(state=>state.family==='type'&&state.definitionId==='project')?.heads).toEqual([type.revisionId]);expect(states.find(state=>state.family==='form'&&state.definitionId==='project')?.heads).toEqual([forms.revisionId]);expect(states.find(state=>state.family==='relation'&&state.definitionId==='friend')?.heads).toEqual([preset.revisionId]);
 expect([...f.entries.keys()].filter(path=>path.includes('/发布/'))).toHaveLength(3);
 const reopened=archiveServices(()=>f.app().archives);expect((await reopened.catalog.definitionStates()).every(state=>!state.blocked)).toBe(true);
});
test('an explicit relation tombstone suppresses an old active fact after reopening without deleting its source file',async()=>{
 const f=await fixture(),person=(await f.services.commands.createEntity({typeId:'person',values:{name:'Person'}})).entity,other=(await f.services.commands.createEntity({typeId:'person',values:{name:'Other'}})).entity,type=(await f.services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='friend')!;
 const created=await f.services.commands.createRelation({id:'friend-one',operationId:'create-friend',relationTypeId:type.relationTypeId,schemaRevisionId:type.revisionId,schemaContentHash:type.contentHash,sourceId:person.id,targetId:other.id,values:{},status:'current',intent:'complete'});
 await f.services.commands.deleteRelation({base:await f.services.commands.beginRelationEdit(created.relation.id),operationId:'delete-friend'});
 expect(await f.files.read(f.entries.get(created.relation.path)!)).toBe(created.relation.raw);const snapshot=await archiveServices(()=>f.app().archives).query.relations(person.id);expect(snapshot.relations).toHaveLength(0);expect(snapshot.isComplete).toBe(true);expect(snapshot.deletions?.map(fact=>fact.relationId)).toEqual(['friend-one']);
});

const project = {typeId:'project',label:'Project',folder:'Projects',titleFieldId:'name',fields:[{fieldId:'name',storageKey:'project-name',label:'Name',codec:'text' as const}]};
async function copy(from:Awaited<ReturnType<typeof fixture>>,to:Awaited<ReturnType<typeof fixture>>,predicate=(path:string)=>!!path){for(const file of from.entries.values())if(predicate(file.path))await to.put(file.path,await from.files.read(file));to.application.archives.invalidate();}
async function branches(family:'type'|'form'|'relation'){
 const a=await fixture(),b=await fixture();const type=await a.services.commands.publishType(project);
 const entity=(await a.services.commands.createEntity({typeId:'project',values:{name:'Old exact revision'}})).entity;
 if(family==='form'){const initial=await a.services.catalog.forms('project');await a.services.commands.publishForms({typeId:'project',baseRevisionId:null,baseContentHash:null,schemaContentHash:type.contentHash,design:initial.design});}
 if(family==='relation'){const preset=(await a.services.catalog.relationTypes()).types.find(t=>t.relationTypeId==='friend')!;const {revisionId:_r,contentHash:_h,parentRevisionIds:_p,displayVersion:_v,...input}=preset;await a.services.commands.publishRelationType(input);}
 await copy(a,b);
 const publish=async(f:typeof a,label:string)=>{
 if(family==='type'){const current=(await f.services.catalog.snapshot()).types.find(t=>t.typeId==='project')!;return f.services.commands.publishType({...project,label,baseRevisionId:current.revisionId,baseContentHash:current.contentHash});}
 if(family==='form'){const current=await f.services.catalog.forms('project');current.design.forms[0]!.label=label;return f.services.commands.publishForms({typeId:'project',baseRevisionId:current.revisionId,baseContentHash:current.contentHash,schemaContentHash:type.contentHash,design:current.design});}
 const current=(await f.services.catalog.relationTypes()).types.find(t=>t.relationTypeId==='friend')!;const {revisionId,contentHash,parentRevisionIds:_p,displayVersion:_v,...input}=current;return f.services.commands.publishRelationType({...input,label,baseRevisionId:revisionId,baseContentHash:contentHash});
 };
 const left=await publish(a,'Left'),right=await publish(b,'Right'),id=family==='relation'?'friend':'project',directory=`huhu/档案/档案定义/${{type:'类型',form:'表单',relation:'关系'}[family]}/${id}`;
 return{a,b,left,right,id,directory,entity};
}
for(const family of ['type','form','relation']as const)test(`${family}: both same-parent published heads survive overwritten current and block only affected writes`,async()=>{
 const {a,b,left,right,id,directory,entity}=await branches(family);await copy(b,a,path=>path.startsWith(directory+'/'));
 const services=archiveServices(()=>a.app().archives),state=(await services.catalog.definitionStates()).find(s=>s.family===family&&s.definitionId===id)!;
 expect(state.heads).toEqual([left.revisionId,right.revisionId].sort());expect(state.blocked).toBe(true);expect(state.diagnostics.some(d=>d.code==='definitionFork')).toBe(true);
 expect((await services.query.snapshot()).entities.find(e=>e.id===entity.id)?.values.name).toBe('Old exact revision');expect((await services.catalog.forms('project',entity.schemaRevisionId)).type.revisionId).toBe(entity.schemaRevisionId);
 if(family!=='relation')await expect(services.commands.createEntity({typeId:'project',values:{name:'Blocked'}})).rejects.toMatchObject({code:'definitionFork'});
 await expect(services.commands.createEntity({typeId:'company',values:{name:'Unaffected'}})).resolves.toBeDefined();
 if(family==='relation'){const people=await Promise.all(['One','Two'].map(name=>services.commands.createEntity({typeId:'person',values:{name}})));const current=(await services.catalog.relationTypes()).types.find(t=>t.relationTypeId===id)!;await expect(services.commands.createRelation({id:'blocked-friend',operationId:'blocked-create',relationTypeId:id,schemaRevisionId:current.revisionId,schemaContentHash:current.contentHash,sourceId:people[0]!.entity.id,targetId:people[1]!.entity.id,values:{},status:'current',intent:'complete'})).rejects.toMatchObject({code:'definitionFork'});}
});
for(const family of ['type','form','relation']as const)test(`${family}: a committed publication remains effective when current pointer write fails`,async()=>{
 const f=await fixture(),create=f.files.create;f.files.create=async(path,raw,guard)=>{if(path.endsWith('/当前.md')&&path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/'))throw new Error('EIO current');return create(path,raw,guard);};
 if(family==='type')await expect(f.services.commands.publishType(project)).rejects.toMatchObject({commit:{state:'committed-unverified'}});
 if(family==='form'){await f.services.commands.publishType(project);const initial=await f.services.catalog.forms('project');await expect(f.services.commands.publishForms({typeId:'project',baseRevisionId:null,baseContentHash:null,schemaContentHash:initial.type.contentHash,design:initial.design})).rejects.toMatchObject({commit:{state:'committed-unverified'}});}
 if(family==='relation'){const current=(await f.services.catalog.relationTypes()).types.find(t=>t.relationTypeId==='friend')!,{revisionId:_r,contentHash:_h,parentRevisionIds:_p,displayVersion:_v,...input}=current;await expect(f.services.commands.publishRelationType(input)).rejects.toMatchObject({commit:{state:'committed-unverified'}});}
 const state=(await archiveServices(()=>f.app().archives).catalog.definitionStates()).find(s=>s.family===family)!;expect(state.blocked).toBe(false);expect(state.heads).toHaveLength(1);expect(state.effectiveRevisionId).toBe(state.heads[0]);expect(state.diagnostics.map(d=>d.code)).toContain('definitionPointerLag');
});
test('known failed staged revisions are distinct from unknown historical revisions and raw survives diagnostics',async()=>{
 const f=await fixture(),type=await f.services.commands.publishType(project),path=`huhu/档案/档案定义/类型/project/修订/orphan.md`,data=archiveFrontmatter(await f.files.read(f.entries.get(`huhu/档案/档案定义/类型/project/修订/${type.revisionId}.md`)!));
 const definition={...type,revisionId:'orphan',label:'Orphan'};definition.contentHash=await textHash(definitionSemantic('type',definition));data.definition=definition;await f.put(path,archiveMarkdown(data));
 let state=(await f.services.catalog.definitionStates()).find(s=>s.family==='type')!;expect(state.blocked).toBe(false);expect(state.revisions.find(r=>r.revisionId==='orphan')?.publication).toBe('staged');
 delete data['huhu-publication'];const unknown=archiveMarkdown(data)+'\nKeep original historical commentary\n';await f.put(path,unknown);state=(await f.services.catalog.definitionStates()).find(s=>s.family==='type')!;expect(state.blocked).toBe(true);expect(state.diagnostics.some(d=>d.code==='definitionPublicationUnknown')).toBe(true);expect(state.revisions.find(r=>r.revisionId==='orphan')?.raw).toBe(unknown);await expect(f.services.commands.createEntity({typeId:'project',values:{name:'No guess'}})).rejects.toMatchObject({code:'definitionPublicationUnknown'});
});

for(const family of ['type','form','relation']as const)test(`${family}: publication final guard rejects a staged edit before creating any publication fact`,async()=>{
 const f=await fixture();if(family==='form')await f.services.commands.publishType(project);
 const create=f.files.create;let injected=false;f.files.create=async(path,raw,guard)=>{if(path.includes('/发布/')&&path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')){injected=true;const file=[...f.entries.values()].find(file=>file.path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&file.path.includes('/修订/'))!;await f.put(file.path,(await f.files.read(file))+'\nExternal staged edit\n');}return create(path,raw,guard);};
 let action:Promise<unknown>;if(family==='type')action=f.services.commands.publishType(project);else if(family==='form'){const current=await f.services.catalog.forms('project');action=f.services.commands.publishForms({typeId:'project',baseRevisionId:null,baseContentHash:null,schemaContentHash:current.type.contentHash,design:current.design});}else{const preset=(await f.services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='friend')!,{revisionId:_r,contentHash:_h,parentRevisionIds:_p,displayVersion:_v,...draft}=preset;action=f.services.commands.publishRelationType(draft);}
 await expect(action).rejects.toBeDefined();expect(injected).toBe(true);expect([...f.entries.keys()].filter(path=>path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&(path.includes('/发布/')||path.endsWith('/当前.md')))).toEqual([]);
});
test('a new published branch arriving without an event at final entity create and update rejects both side effects',async()=>{
 const {a,b,directory,entity}=await branches('type');
 // Only keep the left branch until the precise final Vault write barrier.
 const create=a.files.create,process=a.files.process;let mode:'create'|'update'='create',injected=false;const inject=async()=>{if(injected)return;injected=true;await copy(b,a,path=>path.startsWith(directory+'/')&&!path.endsWith('/当前.md'));};
 a.files.create=async(path,raw,guard)=>{if(mode==='create'&&path.endsWith('/基本信息.md'))await inject();return create(path,raw,guard);};
 const before=[...a.entries.keys()];await expect(a.services.commands.createEntity({id:'late-create',typeId:'project',values:{name:'Must not write'}})).rejects.toBeDefined();expect([...a.entries.keys()].filter(path=>!before.includes(path)&&path.endsWith('/基本信息.md'))).toEqual([]);
 // Restore a single visible head, open the old exact revision, then inject the second branch at process.
 for(const file of b.entries.values())if(file.path.startsWith(directory+'/')&&!file.path.endsWith('/当前.md')){const data=archiveFrontmatter(await b.files.read(file)),revision=(data.definition as {revisionId?:string}|undefined)?.revisionId??data['huhu-revision-id'];if(revision&&revision!==(archiveFrontmatter(await a.files.read(a.entries.get(directory+'/当前.md')!))['huhu-schema-revision'])){ // remove only the right child, retain the shared root
 const state=(await b.services.catalog.definitionStates()).find(s=>s.family==='type')!;if(revision===state.heads[0]){a.entries.delete(file.path);await rm(join(a.directory,file.path));}
 }}
 a.application.archives.invalidate();const base=await a.services.commands.beginEdit(entity.id);mode='update';injected=false;a.files.process=async(file,patch,guard)=>{if(file.path===entity.path)await inject();return process(file,patch,guard);};
 await expect(a.services.commands.updateEntity({base,changes:{name:'Must not update'},intent:'draft'})).rejects.toBeDefined();expect(await a.files.read(a.entries.get(entity.path)!)).toBe(entity.raw);
});
test('missing parents, cycles and duplicate revision identities remain scoped and preserve exact source bytes',async()=>{
 const f=await fixture(),type=await f.services.commands.publishType(project),directory='huhu/档案/档案定义/类型/project';
 const install=async(id:string,parents:string[])=>{const definition={...type,revisionId:id,parentRevisionIds:parents};definition.contentHash=await textHash(definitionSemantic('type',definition));await f.put(`${directory}/修订/${id}.md`,archiveMarkdown({'huhu-type':'archive-type-definition','huhu-format-version':2,'huhu-publication':'staged',definition}));await f.put(`${directory}/发布/${id}.md`,archiveMarkdown({'huhu-type':'archive-definition-publication','huhu-format-version':2,'huhu-definition-family':'type','huhu-definition-id':'project','huhu-revision-id':id,'huhu-content-hash':definition.contentHash,'huhu-parent-revisions':parents}));};
 await install('child',['not-arrived']);let state=(await f.services.catalog.definitionStates()).find(s=>s.family==='type')!;expect(state.diagnostics.map(d=>d.code)).toContain('definitionParentMissing');
 await install('not-arrived',['child']);state=(await f.services.catalog.definitionStates()).find(s=>s.family==='type')!;expect(state.diagnostics.map(d=>d.code)).toContain('definitionCycle');
 const raw=await f.files.read(f.entries.get(`${directory}/修订/${type.revisionId}.md`)!);await f.put(`${directory}/修订/duplicate.md`,raw+'\nConflicting identity copy\n');state=(await f.services.catalog.definitionStates()).find(s=>s.family==='type')!;expect(state.diagnostics.map(d=>d.code)).toContain('definitionRevisionConflict');expect(state.diagnostics.some(d=>d.raw?.includes('Conflicting identity copy'))).toBe(true);
 await expect(f.services.commands.createEntity({typeId:'company',values:{name:'Independent scope'}})).resolves.toBeDefined();
});
async function related(){const f=await fixture(),one=(await f.services.commands.createEntity({typeId:'person',values:{name:'One'}})).entity,two=(await f.services.commands.createEntity({typeId:'person',values:{name:'Two'}})).entity,type=(await f.services.catalog.relationTypes()).types.find(t=>t.relationTypeId==='friend')!,request={id:'portable-relation',operationId:'portable-create',relationTypeId:type.relationTypeId,schemaRevisionId:type.revisionId,schemaContentHash:type.contentHash,sourceId:one.id,targetId:two.id,values:{},status:'current' as const,intent:'complete' as const};const receipt=await f.services.commands.createRelation(request),base=await f.services.commands.beginRelationEdit(receipt.relation.id);return{f,one,two,type,request,receipt,base};}
test('tombstone before active arrival stays deleted through rebuild, retry, and old active replay',async()=>{
 const {f,one,request,receipt,base}=await related(),deletion=await f.services.commands.deleteRelation({base,operationId:'portable-delete'}),target=await fixture();await copy(f,target,path=>path!==receipt.relation.path);
 let services=archiveServices(()=>target.app().archives);expect((await services.query.relations(one.id)).isComplete).toBe(true);await target.put(receipt.relation.path,receipt.relation.raw);services=archiveServices(()=>target.app().archives);expect((await services.query.relations(one.id)).relations).toEqual([]);await expect(services.commands.createRelation(request)).rejects.toMatchObject({code:'relationDeleted'});expect(await services.commands.deleteRelation({base,operationId:'portable-delete'})).toEqual(deletion);
});
test('a changed old active fact cannot revive a tombstoned relation or be reported as complete',async()=>{
 const {f,one,receipt,base}=await related();await f.services.commands.deleteRelation({base,operationId:'delete-changed'});await f.put(receipt.relation.path,receipt.relation.raw+'\nUser changed old active after delete\n');const result=await archiveServices(()=>f.app().archives).query.relations(one.id);expect(result.relations).toEqual([]);expect(result.isComplete).toBe(false);expect(result.diagnostics.some(d=>d.code==='relationDeletionConflict'&&d.raw?.includes('User changed'))).toBe(true);
});
for(const mutation of ['broken','future','same-operation']as const)test(`tombstone ${mutation} remains diagnosed and never authorizes revival`,async()=>{
 const {f,one,receipt,base,request}=await related(),fact=await f.services.commands.deleteRelation({base,operationId:'delete-broken'}),data=archiveFrontmatter(fact.raw);if(mutation==='broken')data.deletion={...(data.deletion as object),contentHash:'bad'};if(mutation==='future')data['huhu-format-version']=99;
 if(mutation==='same-operation'){const other={...fact,relationId:'other-relation'};const {path:_path,raw:_raw,contentHash:_hash,...content}=other;other.contentHash=await textHash(deletionContent(content));await f.put(fact.path.replace('/'+receipt.relation.id+'/','/other-relation/'),archiveMarkdown({...data,deletion:other}));}else await f.put(fact.path,archiveMarkdown(data));
 const services=archiveServices(()=>f.app().archives),result=await services.query.relations(one.id);expect(result.isComplete).toBe(false);expect(result.diagnostics.length).toBeGreaterThan(0);await expect(services.commands.createRelation(request)).rejects.toBeDefined();await expect(services.commands.updateRelation({base,changes:{status:'past'},intent:'draft'})).rejects.toBeDefined();
});

for(const order of [['publication','current','revision'],['revision','publication','current'],['current','revision','publication']]as const)test(`visible-only arrival ${order.join('→')} converges from missing facts to both heads`,async()=>{
 const {a,b,directory,left,right}=await branches('type'),target=await fixture();await copy(a,target);const files=order.map(kind=>[...b.entries.values()].find(file=>file.path===`${directory}/${kind==='current'?'当前.md':kind==='revision'?'修订/'+right.revisionId+'.md':'发布/'+right.revisionId+'.md'}`)!);
 for(let i=0;i<files.length;i++){const file=files[i]!;await target.put(file.path,await b.files.read(file));const service=archiveServices(()=>target.app().archives),state=(await service.catalog.definitionStates()).find(state=>state.family==='type')!;if(i===files.length-1){expect(state.heads).toEqual([left.revisionId,right.revisionId].sort());expect(state.blocked).toBe(true);}else expect(state.blocked||state.heads.length===1).toBe(true);}
});
for(const action of ['create','update','delete']as const)test(`a tombstone arriving at final relation ${action} guard refuses every candidate side effect`,async()=>{
 const {f,receipt,base,request}=await related(),third=(await f.services.commands.createEntity({typeId:'person',values:{name:'Third'}})).entity,remote=await fixture();await copy(f,remote);const fact=await remote.services.commands.deleteRelation({base,operationId:'remote-delete'}),create=f.files.create,process=f.files.process;let injected=false;const arrive=async()=>{if(injected)return;injected=true;await f.put(fact.path,fact.raw);};f.files.create=async(path,raw,guard)=>{if(path.includes('/关联记录/'))await arrive();return create(path,raw,guard);};f.files.process=async(file,patch,guard)=>{if(file.path===receipt.relation.path)await arrive();return process(file,patch,guard);};
 const result=action==='create'?f.services.commands.createRelation({...request,id:'second-relation',operationId:'second-create',targetId:third.id}):action==='update'?f.services.commands.updateRelation({base,changes:{status:'past'},intent:'draft'}):f.services.commands.deleteRelation({base,operationId:'local-delete'});await expect(result).rejects.toMatchObject({code:'relationChanged'});expect(injected).toBe(true);expect(await f.files.read(f.entries.get(receipt.relation.path)!)).toBe(receipt.relation.raw);expect([...f.entries.keys()].some(path=>path.includes('second-relation')||path.includes('local-delete'))).toBe(false);
});
async function migrated(){const f=await fixture(),company=(await f.services.commands.createEntity({typeId:'company',values:{name:'Company'}})).entity,record=newRecord('person');record.id='migrating-owner';record.fields.name='Owner';record.path='huhu/档案/个人档案/Owner/基本信息.md';record.employments=[{id:'employment-row',company:{id:company.id,label:'Company',link:relativeLink(record.path,company.path)},department:'',title:'Engineer',start:'2020-05',end:'',status:'current',keyRole:'',notes:''}];record.raw=createMarkdown(record);await f.put(record.path,record.raw);f.application.archives.invalidate();const preflight=await f.services.commands.preflightMigration(record.path);expect(preflight.canMigrate).toBe(true);const receipt=await f.services.commands.migrate({preflight,operationId:'sync-migration'});return{f,record,receipt,relation:(await f.services.query.relations(record.id)).relations[0]!};}
test('an activated migration with an absent owner retains active orphan facts and never falls back to staged',async()=>{
 const {f,record,receipt}=await migrated();await rm(join(f.directory,record.path));f.entries.delete(record.path);const service=archiveServices(()=>f.app().archives),relations=await service.query.relations();expect(relations.relations.map(row=>row.id)).toEqual(receipt.relations);expect(relations.isComplete).toBe(false);expect(relations.diagnostics.map(item=>item.code)).toContain('relationEndpoint');expect((await service.query.migrations())[0]?.phase).toBe('complete');
});
test('activated migration missing a relation stays incomplete until its explicit deletion fact arrives; old active replay never revives it',async()=>{
 const {f,record,relation:row}=await migrated(),base=await f.services.commands.beginRelationEdit(row.id),remote=await fixture();await copy(f,remote);const deletion=await remote.services.commands.deleteRelation({base,operationId:'migrated-delete'}),raw=await f.files.read(f.entries.get(row.path)!);await rm(join(f.directory,row.path));f.entries.delete(row.path);let services=archiveServices(()=>f.app().archives),snapshot=await services.query.relations(record.id);expect(snapshot.isComplete).toBe(false);expect(snapshot.diagnostics.map(item=>item.code)).toContain('migrationIncomplete');await f.put(deletion.path,deletion.raw);services=archiveServices(()=>f.app().archives);snapshot=await services.query.relations(record.id);expect(snapshot.relations).toEqual([]);expect(snapshot.isComplete).toBe(true);await f.put(row.path,raw);services=archiveServices(()=>f.app().archives);snapshot=await services.query.relations(record.id);expect(snapshot.relations).toEqual([]);expect(snapshot.isComplete).toBe(true);expect((await services.query.migrations())[0]?.phase).toBe('complete');
});
test('type publication binds the producer original staged bytes rather than adopting a later equal-semantic raw read',async()=>{
 const f=await fixture(),read=f.files.read;let stagedReads=0,injected=false;f.files.read=async(file)=>{if(file.path.includes('/类型/project/修订/')&&++stagedReads===1){injected=true;const raw=await read(file);await f.put(file.path,raw+'\nExternal commentary before graph capture\n');return raw;}return read(file);};
 await expect(f.services.commands.publishType(project)).rejects.toMatchObject({code:'definitionChanged'});expect(injected).toBe(true);expect([...f.entries.keys()].some(path=>path.includes('/发布/')||path.endsWith('/当前.md'))).toBe(false);
});

test('an explicit migrated relationship deletion prevents rollback from reviving its former inline fact',async()=>{const {f,record,relation}=await migrated(),base=await f.services.commands.beginRelationEdit(relation.id);await f.services.commands.deleteRelation({base,operationId:'before-rollback-delete'});const owner=await f.files.read(f.entries.get(record.path)!);await expect(f.services.commands.rollbackMigration('sync-migration')).rejects.toMatchObject({code:'migrationConflict'});expect(await f.files.read(f.entries.get(record.path)!)).toBe(owner);expect((await f.services.query.relations(record.id)).relations).toEqual([]);expect([...f.entries.keys()].some(path=>path.endsWith('-回退计划.md')||path.endsWith('-回退.md'))).toBe(false);});

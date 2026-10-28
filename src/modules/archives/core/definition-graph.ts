import { textHash } from '../../../shared/storage/text-edits';
import type { ContactsFiles, ContactsFile } from './files';
import { ContactsError } from './model';
import { archiveFrontmatter, archiveMarkdown } from './persist/v2/markdown';
import { canonicalRelation, relationId } from './relation-model';
import type { ArchiveDiagnostic } from './schema';
export type DefinitionFamily = 'type' | 'form' | 'relation';
export interface DefinitionRevision { revisionId: string; parentRevisionIds: string[]; contentHash: string; path: string; raw: string; publication: 'published' | 'staged' | 'unknown' }
export interface DefinitionState { family: DefinitionFamily; definitionId: string; heads: string[]; currentRevisionId?: string; effectiveRevisionId?: string; blocked: boolean; diagnostics: ArchiveDiagnostic[]; revisions: DefinitionRevision[]; affected: number }
const directories = { type: '类型', form: '表单', relation: '关系' };
const envelopes = { type: 'archive-type-definition', form: 'archive-form-definition', relation: 'archive-relation-type' };
const pointers = { type: ['archive-type-current', 'huhu-schema-revision'], form: ['archive-form-current', 'huhu-form-revision'], relation: ['archive-relation-current', 'huhu-schema-revision'] } as const;
interface Proof { file: ContactsFile; path: string; raw: string; mtime: number; size: number }
interface Scan { state: DefinitionState; proofs: Proof[]; check: () => void }
export class DefinitionPublicationError extends ContactsError {
 readonly commit: { state: 'committed-unverified'; revisionId: string; pointerPath: string; publicationPath: string };
 constructor(family: DefinitionFamily,id: string,revisionId: string,pointerPath: string,publicationPath: string,cause?:unknown) { super('definitionPublicationUnverified',`${family}:${id}:${revisionId}`); if(cause!==undefined){this.cause=cause;if(cause instanceof Error)this.message+=': '+cause.message;} this.commit={state:'committed-unverified',revisionId,pointerPath,publicationPath}; }
}
export function definitionSemantic(family: DefinitionFamily, value: Record<string,unknown>): string {
 if(family==='type') return canonicalRelation(Object.fromEntries(['typeId','label','folder','titleFieldId','fields','revisionId','parentRevisionIds','displayVersion'].map(key=>[key,value[key]])));
 const {contentHash:_hash,...content}=value; return canonicalRelation(content);
}
/** Only immutable publication facts (or an old unmarked current lineage) establish publication. Staged bytes alone are never a branch. */
export class DefinitionGraph {
 constructor(private files:ContactsFiles,private root:()=>string,private guard:(root:string)=>void,private generation:()=>number){}
 directory(family:DefinitionFamily,id:string):string {return `${this.root()}/档案定义/${directories[family]}/${id}`;}
 async families():Promise<Array<{family:DefinitionFamily;id:string}>> {
  const root=this.root();this.guard(root);const found=new Map<string,{family:DefinitionFamily;id:string}>();
  for(const file of this.files.getMarkdownFiles())for(const family of ['type','form','relation']as const){const prefix=`${root}/档案定义/${directories[family]}/`;if(!file.path.startsWith(prefix))continue;const id=file.path.slice(prefix.length).split('/')[0]!;if(relationId(id))found.set(family+':'+id,{family,id});}
  return [...found.values()];
 }
 private async scan(family:DefinitionFamily,id:string):Promise<Scan>{
  if(!relationId(id))throw new ContactsError('invalidDefinition');const root=this.root(),directory=this.directory(family,id),generation=this.generation();this.guard(root);
  const inventory=this.files.getMarkdownFiles().filter(file=>file.path.startsWith(directory+'/')).map(file=>({file,path:file.path,mtime:file.stat.mtime,size:file.stat.size}));
  const check=()=>{this.guard(root);if(generation!==this.generation()||inventory.length!==this.files.getMarkdownFiles().filter(file=>file.path.startsWith(directory+'/')).length||inventory.some(p=>this.files.getFileByPath(p.path)!==p.file||p.file.path!==p.path||p.mtime!==p.file.stat.mtime||p.size!==p.file.stat.size))throw new ContactsError('definitionChanged',directory);};
  const state:DefinitionState={family,definitionId:id,heads:[],blocked:false,diagnostics:[],revisions:[],affected:0},proofs:Proof[]=[],nodes=new Map<string,DefinitionRevision>(),descriptors=new Map<string,{hash:string;parents:string[]}>(),published=new Set<string>(),staged=new Set<string>();
  const fail=(path:string,code:string,detail='')=>{state.blocked=true;state.diagnostics.push({path,code,detail});};
  const fingerprints=new Map<string,string>();
  for(const item of inventory){let raw:string|undefined;try{raw=await this.files.read(item.file);proofs.push({...item,raw});check();const data=archiveFrontmatter(raw);if(data['huhu-format-version']!==2)throw new ContactsError('futureFormat');
   if(item.path===directory+'/当前.md'){if(data['huhu-type']!==pointers[family][0]||!relationId(data[pointers[family][1]]))throw new ContactsError('invalidDefinition');state.currentRevisionId=data[pointers[family][1]] as string;continue;}
   if(data['huhu-type']==='archive-definition-publication'){
    const revisionId=data['huhu-revision-id'],hash=data['huhu-content-hash'],parents=data['huhu-parent-revisions'];
    if(data['huhu-definition-family']!==family||data['huhu-definition-id']!==id||!relationId(revisionId)||typeof hash!=='string'||!Array.isArray(parents)||parents.some(parent=>!relationId(parent))||item.path!==`${directory}/发布/${revisionId}.md`)throw new ContactsError('definitionPublicationInvalid');
    descriptors.set(revisionId,{hash,parents:parents as string[]});published.add(revisionId);continue;
   }
   if(!item.path.startsWith(directory+'/修订/'))continue;
   if(data['huhu-type']!==envelopes[family])throw new ContactsError('invalidDefinition');const value=(family==='form'?data.revision:data.definition)as Record<string,unknown>,revisionId=value?.revisionId,parents=value?.parentRevisionIds;
   if(!relationId(revisionId)||!Array.isArray(parents)||parents.some(parent=>!relationId(parent))||new Set(parents).size!==parents.length||typeof value.contentHash!=='string')throw new ContactsError('invalidDefinition');
   const semantic=definitionSemantic(family,value),fingerprint=await textHash(semantic),previous=fingerprints.get(revisionId);fingerprints.set(revisionId,fingerprint);
   if(previous&&previous!==fingerprint)fail(item.path,'definitionRevisionConflict',revisionId);
   if(value.contentHash!==fingerprint)throw new ContactsError('invalidDefinition');
   if(item.path!==`${directory}/修订/${revisionId}.md`)throw new ContactsError('definitionRevisionConflict',revisionId);
   if(family!=='form'&&value[family==='type'?'typeId':'relationTypeId']!==id)throw new ContactsError('invalidDefinition');
   const node:DefinitionRevision={revisionId,parentRevisionIds:parents as string[],contentHash:fingerprint,path:item.path,raw,publication:data['huhu-publication']==='staged'?'staged':'unknown'};
   nodes.set(revisionId,node);if(node.publication==='staged')staged.add(revisionId);
  }catch(error){fail(item.path,error instanceof ContactsError?error.code:'readFailed',error instanceof ContactsError?error.detail:'');state.diagnostics[state.diagnostics.length-1]!.raw=raw;}}
  const legacy=[...(state.currentRevisionId&&!staged.has(state.currentRevisionId)?[state.currentRevisionId]:[]),...published];const visited=new Set<string>();
  while(legacy.length){const revision=legacy.pop()!;if(visited.has(revision))continue;visited.add(revision);const node=nodes.get(revision);if(node&&!staged.has(revision)){published.add(revision);legacy.push(...node.parentRevisionIds);}else if(node&&published.has(revision))legacy.push(...node.parentRevisionIds);}
  for(const revision of published){const node=nodes.get(revision),descriptor=descriptors.get(revision);if(!node){fail(directory,'definitionRevisionMissing',revision);continue;}node.publication='published';if(descriptor&&(descriptor.hash!==node.contentHash||canonicalRelation(descriptor.parents)!==canonicalRelation(node.parentRevisionIds)))fail(node.path,'definitionPublicationInvalid',revision);}
  for(const node of nodes.values())if(!published.has(node.revisionId)&&node.publication!=='staged')fail(node.path,'definitionPublicationUnknown',node.revisionId);
  const children=new Set<string>(),visiting=new Set<string>(),done=new Set<string>();
  const walk=(revision:string)=>{if(visiting.has(revision)){fail(nodes.get(revision)?.path??directory,'definitionCycle',revision);return;}if(done.has(revision))return;visiting.add(revision);const node=nodes.get(revision),parents=node?.parentRevisionIds??descriptors.get(revision)?.parents??[];for(const parent of parents){children.add(parent);if(!published.has(parent))fail(node?.path??directory,'definitionParentMissing',parent);else walk(parent);}visiting.delete(revision);done.add(revision);};
  for(const revision of published)walk(revision);state.heads=[...published].filter(revision=>!children.has(revision)).sort();
  if(state.heads.length>1)fail(directory,'definitionFork',state.heads.join(', '));
  if(state.currentRevisionId&&!published.has(state.currentRevisionId))fail(directory+'/当前.md','definitionPublicationPending',state.currentRevisionId);
  state.effectiveRevisionId=state.heads.length===1&&nodes.has(state.heads[0]!)?state.heads[0]:state.currentRevisionId&&published.has(state.currentRevisionId)&&nodes.has(state.currentRevisionId)?state.currentRevisionId:undefined;
  if(state.effectiveRevisionId!==state.currentRevisionId&&state.effectiveRevisionId)state.diagnostics.push({path:directory+'/当前.md',code:'definitionPointerLag',severity:'warning',detail:state.effectiveRevisionId});
  state.revisions=[...nodes.values()];check();return{state,proofs,check};
 }
 async read(family:DefinitionFamily,id:string):Promise<DefinitionState>{return structuredClone((await this.scan(family,id)).state);}
 assertWritable(state:DefinitionState):void {if(state.blocked)throw new ContactsError(state.diagnostics.find(item=>item.code!=='definitionPointerLag')?.code??'definitionFork',state.definitionId);}
 async capture(family:DefinitionFamily,id:string,expected:string|null,extra:Array<{path:string;raw:string}>=[]):Promise<()=>void>{
  const scan=await this.scan(family,id);this.assertWritable(scan.state);if((scan.state.effectiveRevisionId??null)!==expected)throw new ContactsError('definitionChanged',id);
  for(const item of extra){const proof=scan.proofs.find(proof=>proof.path===item.path);if(!proof||proof.raw!==item.raw)throw new ContactsError('definitionChanged',item.path);}
  const native=await this.files.captureEditors(scan.proofs.map(proof=>proof.file));scan.check();
  for(const proof of scan.proofs){if(await this.files.read(proof.file)!==proof.raw)throw new ContactsError('definitionChanged',proof.path);scan.check();}
  return()=>{scan.check();native();};
 }
 async publish(family:DefinitionFamily,id:string,revisionId:string,contentHash:string,previous:string|null,beforeCommit:()=>void,stagedRaw:string):Promise<void>{
  const directory=this.directory(family,id),state=await this.read(family,id),node=state.revisions.find(node=>node.revisionId===revisionId);if(node&&node.raw!==stagedRaw)throw new ContactsError('definitionChanged',node.path);if(!node||node.contentHash!==contentHash||canonicalRelation(node.parentRevisionIds)!==canonicalRelation(previous?[previous]:[]))throw new ContactsError('invalidDefinition');
  const path=`${directory}/发布/${revisionId}.md`,raw=archiveMarkdown({'huhu-type':'archive-definition-publication','huhu-format-version':2,'huhu-definition-family':family,'huhu-definition-id':id,'huhu-revision-id':revisionId,'huhu-content-hash':contentHash,'huhu-parent-revisions':node.parentRevisionIds});
  const present=this.files.getFileByPath(path);if(present){if(await this.files.read(present)!==raw)throw new ContactsError('definitionPublicationInvalid');return;}
  const proof=await this.capture(family,id,previous,[{path:node.path,raw:node.raw}]);
  try{const file=await this.files.create(path,raw,()=>{proof();beforeCommit();if(this.files.getFileByPath(path))throw new ContactsError('definitionChanged');});if(await this.files.read(file)!==raw)throw new Error('publication readback');}
  catch(error){if(this.files.getFileByPath(path))throw new DefinitionPublicationError(family,id,revisionId,directory+'/当前.md',path,error);throw error;}
 }
}

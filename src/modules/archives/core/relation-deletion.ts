import { textHash } from '../../../shared/storage/text-edits';
import type { ContactsFiles, ContactsFile } from './files';
import type { ArchiveDiagnostic } from './schema';
import { archiveFrontmatter, archiveMarkdown } from './persist/v2/markdown';
import { canonicalRelation, relationId } from './relation-model';
import { ContactsError } from './model';
export interface RelationDeletion { relationId:string; operationId:string; relationTypeId:string; sourceId:string; targetId:string; contextRefs:Record<string,string>; migrationId?:string; previousHash:string; contentHash:string; path:string; raw:string }
export interface DeleteRelation { base: import('./relation-model').RelationEditBase; operationId:string }
export const deletionContent=(fact:Omit<RelationDeletion,'path'|'raw'|'contentHash'>):string=>canonicalRelation(fact);
export function deletionMarkdown(fact:Omit<RelationDeletion,'path'|'raw'>):string{return archiveMarkdown({'huhu-type':'archive-relation-deletion','huhu-format-version':2,deletion:fact});}
export async function readRelationDeletions(files:ContactsFiles,root:string):Promise<{facts:RelationDeletion[];diagnostics:ArchiveDiagnostic[];blockedIds:Set<string>;unsafe:boolean;proofs:Array<{file:ContactsFile;path:string;raw:string;mtime:number;size:number}>}>{
 const result={facts:[]as RelationDeletion[],diagnostics:[]as ArchiveDiagnostic[],blockedIds:new Set<string>(),unsafe:false,proofs:[]as Array<{file:ContactsFile;path:string;raw:string;mtime:number;size:number}>};
 for(const file of files.getMarkdownFiles().filter(file=>file.path.startsWith(root+'/关联记录/删除事实/'))){let id:string|undefined,raw:string|undefined;
  try{const proof={file,path:file.path,mtime:file.stat.mtime,size:file.stat.size,raw:await files.read(file)};raw=proof.raw;result.proofs.push(proof);const data=archiveFrontmatter(raw),fact=data.deletion as Omit<RelationDeletion,'path'|'raw'>;id=relationId(fact?.relationId)?fact.relationId:undefined;
   if(data['huhu-type']!=='archive-relation-deletion'||data['huhu-format-version']!==2||!fact||!relationId(fact.relationId)||!relationId(fact.operationId)||!relationId(fact.relationTypeId)||!relationId(fact.sourceId)||!relationId(fact.targetId)||typeof fact.previousHash!=='string'||!fact.previousHash||!fact.contextRefs||typeof fact.contextRefs!=='object'||Array.isArray(fact.contextRefs)||Object.values(fact.contextRefs).some(value=>!relationId(value))||(fact.migrationId!==undefined&&!relationId(fact.migrationId))||file.path!==`${root}/关联记录/删除事实/${fact.relationId}/${fact.operationId}.md`)throw new ContactsError('relationDeletionInvalid');
   const {contentHash,...content}=fact;if(contentHash!==await textHash(deletionContent(content)))throw new ContactsError('relationDeletionInvalid');result.facts.push({...fact,path:file.path,raw});
  }catch(error){if(id)result.blockedIds.add(id);else result.unsafe=true;result.diagnostics.push({path:file.path,raw,code:error instanceof ContactsError?error.code:'readFailed',relationId:id});}
 }
 const identities=new Map<string,RelationDeletion[]>();for(const fact of result.facts)identities.set(fact.operationId,[...identities.get(fact.operationId)??[],fact]);
 for(const rows of identities.values())if(rows.length>1&&new Set(rows.map(row=>row.contentHash)).size>1)for(const fact of rows){result.blockedIds.add(fact.relationId);result.diagnostics.push({path:fact.path,raw:fact.raw,relationId:fact.relationId,code:'relationDeletionConflict'});}
 return result;
}

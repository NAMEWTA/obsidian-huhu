import { afterEach, expect, test, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { ContactsApplication } from '../../src/modules/archives/core/application';
import type { ContactsFile, ContactsFiles } from '../../src/modules/archives/core/files';
import { createMarkdown } from '../../src/modules/archives/core/persist/markdown';
import { newRecord } from '../../src/modules/archives/core/model';
import { setLanguage } from '../../src/shared/i18n';
afterEach(()=>{vi.useRealTimers();setLanguage('zh');});
test('migration manifest, original-byte backup, switched owner and portable receipt are reproducible visible Markdown',async()=>{
 setLanguage('en');vi.useFakeTimers({now:new Date('2026-10-27T00:00:00.000Z'),toFake:['Date']});
 const contents=new Map<string,string>(),entries=new Map<string,ContactsFile>();const files:ContactsFiles={formatGuide:'',ready:async()=>{},getMarkdownFiles:()=>[...entries.values()],getFileByPath:path=>entries.get(path)??null,getAbstractFileByPath:path=>entries.get(path)??null,
 read:async file=>contents.get(file.path)!,cachedRead:async file=>contents.get(file.path)!,create:async(path,raw,guard)=>{guard?.();if(entries.has(path))throw new Error('exists');const file={path,extension:'md',stat:{mtime:1,size:raw.length}};entries.set(path,file);contents.set(path,raw);return file;},process:async(file,update,guard)=>{guard?.();const raw=update(contents.get(file.path)!);contents.set(file.path,raw);file.stat.mtime++;file.stat.size=raw.length;return raw;},createBinary:async()=>{throw new Error('unused');},listFolder:()=>[],trashFolder:async()=>{},checkFolderEditors:async()=>()=>{},captureEditors:async()=>()=>{},createFolder:async()=>{},mkdir:async()=>{},checkEditor:()=>{}};
 const record=newRecord('company');record.id='company-001';record.path='huhu/档案/企业档案/Example/基本信息.md';record.fields.name='Example';record.prose.notes='Original company notes';const source=createMarkdown(record)+'\n![source attachment](source.pdf)\n';await files.create(record.path,source);
 const app=new ContactsApplication(files,()=>({rootFolder:'huhu/档案',maxColumns:6,layouts:{}}));
 const preflight=await app.archives.migrations.preflight(record.path);await app.archives.migrations.migrate({preflight,operationId:'migration-company-001'});
 const selected=[record.path,'huhu/档案/迁移记录/migration-company-001.md','huhu/档案/迁移恢复/migration-company-001/原始.md','huhu/档案/迁移记录/migration-company-001-完成.md'];
 await expect(selected.map(path=>`FILE ${path}\n${contents.get(path)}`).join('\n\n')).toMatchFileSnapshot(fileURLToPath(new URL('./__snapshots__/archive-migration-v2.md',import.meta.url)));
 expect(contents.get(selected[2]!)).toBe(source);expect((await app.archives.snapshot()).entities[0]?.createdAt).toBeNull();app.dispose();
});

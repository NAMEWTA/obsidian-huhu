import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { ContactsApplication } from './core/application';
import { archiveServices } from './services/archive-services';
import type { ContactsFile, ContactsFiles } from './core/files';
import { newRecord, cloneRecord } from './core/model';
import { createMarkdown, relativeLink } from './core/persist/markdown';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0))
    await close(); });
async function fixture() {
    const directory = await mkdtemp(join(tmpdir(), 'huhu-relations-')), entries = new Map<string, ContactsFile>();
    cleanup.push(() => rm(directory, { recursive: true, force: true }));
    const update = async (path: string) => { const info = await stat(join(directory, path)); const file = entries.get(path) ?? { path, extension: 'md', stat: { mtime: 0, size: 0 } }; file.stat.mtime = info.mtimeMs; file.stat.size = info.size; entries.set(path, file); return file; };
    const scan = async (folder = ''): Promise<void> => { for (const item of await readdir(join(directory, folder), { withFileTypes: true })) {
        const path = folder ? folder + '/' + item.name : item.name;
        if (item.isDirectory())
            await scan(path);
        else
            await update(path);
    } };
    const files: ContactsFiles = {
        formatGuide: '', ready: () => scan(), getMarkdownFiles: () => [...entries.values()], getFileByPath: (path) => entries.get(path) ?? null, getAbstractFileByPath: (path) => entries.get(path) ?? null,
        read: (file) => readFile(join(directory, file.path), 'utf8'), cachedRead: (file) => readFile(join(directory, file.path), 'utf8'),
        create: async (path, raw, guard) => { await mkdir(dirname(join(directory, path)), { recursive: true }); guard?.(); await writeFile(join(directory, path), raw, { flag: 'wx' }); return update(path); },
        process: async (file, patch, guard) => { const raw = await files.read(file); guard?.(); const next = patch(raw); await writeFile(join(directory, file.path), next); await update(file.path); return next; },
        mkdir: async (path) => { await mkdir(join(directory, path), { recursive: true }); }, createFolder: async () => { }, createBinary: async () => { throw new Error('unused'); }, listFolder: () => [], trashFolder: async () => { },
        checkFolderEditors: async () => () => { }, captureEditors: async () => () => { }, checkEditor: () => { },
    };
    let root = 'huhu/档案';
    const app = () => { const application = new ContactsApplication(files, () => ({ rootFolder: root, maxColumns: 6, layouts: {} })); cleanup.push(async () => application.dispose()); return application; };
    const application = app(), services = archiveServices(() => application.archives);
    return { directory, files, entries, app, application, services, changeRoot: (value: string) => { root = value; } };
}
async function legacy(f: Awaited<ReturnType<typeof fixture>>) {
    const company = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Company' } })).entity;
    const boss = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Boss' } })).entity;
    const record = newRecord('person');
    record.id = 'owner';
    record.fields.name = 'Owner';
    record.path = 'huhu/档案/个人档案/Owner/基本信息.md';
    record.folderPath = record.path.slice(0, -8);
    record.employments = [{ id: 'manual-0', company: { id: company.id, label: 'Company', link: relativeLink(record.path, company.path) }, department: '000123', title: 'Engineer', start: '2020-05', end: '2021-04', status: 'past', keyRole: '', notes: 'keep' }];
    record.relations = [{ id: 'row-leader', person: { id: boss.id, label: 'Boss', link: relativeLink(record.path, boss.path) }, kind: 'leader', company: { id: company.id, label: 'Company', link: relativeLink(record.path, company.path) }, notes: 'source' }];
    record.raw = createMarkdown(record).replace(/<!-- huhu:row [^>]+ -->/, '') + '\nFREE BODY ![attachment](scan.pdf)\n';
    await f.files.create(record.path, record.raw);
    f.application.archives.invalidate();
    return { record, company, boss };
}
test('preflight is pure and public migration survives reopen with stable facts, original identity/body and unknown creation date', async () => {
    const f = await fixture(), e = await legacy(f);
    const paths = [...f.entries.keys()];
    const preflight = await f.services.commands.preflightMigration(e.record.path);
    expect(preflight.canMigrate).toBe(true);
    expect(preflight.rows).toHaveLength(2);
    expect([...f.entries.keys()]).toEqual(paths);
    const receipt = await f.services.commands.migrate({ preflight, operationId: 'migration-1' });
    expect(receipt.phase).toBe('complete');
    expect(receipt.relations).toHaveLength(2);
    const reopened = archiveServices(() => f.app().archives), snapshot = await reopened.query.snapshot();
    const entity = snapshot.entities.find(x => x.id === 'owner')!;
    expect(entity.formatVersion).toBe(2);
    expect(entity.createdAt).toBeNull();
    expect(entity.path).toBe(e.record.path);
    expect(entity.raw).toContain('FREE BODY ![attachment](scan.pdf)');
    const relations = await reopened.query.relations('owner');
    expect(relations.isComplete).toBe(true);
    expect(relations.relations).toHaveLength(2);
    expect(relations.relations.find(x => x.relationTypeId === 'legacy-employment')?.values).toMatchObject({ department: '000123', keyRole: '' });
    expect(relations.relations.find(x => x.relationTypeId === 'legacy-reportsTo')).toMatchObject({ sourceId: 'owner', targetId: e.boss.id, contextRefs: { company: e.company.id } });
    expect((await reopened.commands.resumeMigration('migration-1')).relations).toEqual(receipt.relations);
});
test('legacy basic fields remain writable but inline edit and delete commands require explicit migration', async () => {
    const f = await fixture(), e = await legacy(f);
    await f.application.ensureLoaded();
    const base = await f.application.snapshot(e.record.path), next = cloneRecord(base);
    next.fields.region = 'new';
    await f.application.save(base, next);
    const current = await f.application.snapshot(e.record.path), edited = cloneRecord(current);
    edited.employments[0]!.title = 'not allowed';
    await expect(f.application.save(current, edited)).rejects.toMatchObject({ code: 'migrationRequired' });
    edited.employments = [];
    await expect(f.application.save(current, edited)).rejects.toMatchObject({ code: 'migrationRequired' });
    expect(await f.files.read(f.entries.get(e.record.path)!)).toContain('huhu-type: person');
 await expect(f.application.create(edited)).rejects.toMatchObject({code:'migrationRequired'});
});
for (const moment of ['before', 'after'] as const)
    for (let step = 1; step <= 15; step++)
        test(`migration resumes the same portable plan after ${moment} write ${step}`, async () => {
            const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path), create = f.files.create, process = f.files.process;
            let count = 0, failed = false;
            const boundary = () => { count++; return count === step; };
            f.files.create = async (path, raw, guard) => { const hit = boundary(); if (hit && moment === 'before') {
                failed = true;
                throw new Error('injected');
            } const file = await create(path, raw, guard); if (hit && moment === 'after') {
                failed = true;
                throw new Error('injected');
            } return file; };
            f.files.process = async (file, patch, guard) => { const hit = boundary(); if (hit && moment === 'before') {
                failed = true;
                throw new Error('injected');
            } const result = await process(file, patch, guard); if (hit && moment === 'after') {
                failed = true;
                throw new Error('injected');
            } return result; };
            await expect(f.services.commands.migrate({ preflight, operationId: 'interrupted' })).rejects.toThrow('injected');
            expect(failed).toBe(true);
            f.files.create = create;
            f.files.process = process;
            const before = (await f.services.query.migrations())[0];
            const partial = await f.services.query.relations();
            if (before?.phase === 'staged')
                expect(partial.relations).toHaveLength(0);
            if (before?.phase === 'switched')
                expect(partial.relations).toHaveLength(2);
            const reopened = archiveServices(() => f.app().archives), result = await reopened.commands.migrate({ preflight, operationId: 'interrupted' });
            expect(result.phase).toBe('complete');
            expect((await reopened.query.relations()).relations.map(row => row.id).sort()).toEqual([...result.relations].sort());
            expect([...f.entries.keys()].filter(path => path.includes('/关联记录/'))).toHaveLength(2);
        });
test('owner CAS remains an activation fact when completion receipt fails; missing relations never become an empty success', async () => {
    const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path), create = f.files.create;
    f.files.create = async (path, raw, guard) => { if (path.endsWith('-完成.md'))
        throw new Error('receipt offline'); return create(path, raw, guard); };
    await expect(f.services.commands.migrate({ preflight, operationId: 'receipt-failure' })).rejects.toThrow('receipt offline');
    f.files.create = create;
    const reopened = archiveServices(() => f.app().archives), active = await reopened.query.relations('owner');
    expect(active.isComplete).toBe(true);
    expect(active.relations).toHaveLength(2);
    const missing = active.relations[0]!;
    await rm(join(f.directory, missing.path));
    f.entries.delete(missing.path);
    f.application.archives.invalidate();
    const incomplete = await archiveServices(() => f.app().archives).query.relations('owner');
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.diagnostics.some(item => item.code === 'migrationIncomplete')).toBe(true);
    await expect(reopened.commands.resumeMigration('receipt-failure')).rejects.toThrow();
    expect(f.files.getFileByPath(missing.path)).toBeNull();
});
for (const fault of ['source', 'definition', 'endpoint', 'new-id', 'native', 'root', 'disabled'] as const)
    test(`final migration owner gate refuses ${fault} drift and keeps staged facts`, async () => {
        const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path), process = f.files.process, create = f.files.create;
        let native = false;
        f.files.captureEditors = async () => () => { if (native)
            throw new Error('native unsaved/ABA'); };
        f.files.process = async (file, patch, guard) => {
            if (file.path === e.record.path) {
                if (fault === 'source')
                    await process(file, raw => raw + '\nexternal body\n');
                if (fault === 'definition') {
                    const definition = [...f.entries.values()].find(file => file.path.includes('/档案定义/类型/') && file.path.includes('/修订/'))!;
                    await process(definition, raw => raw + '\nchanged definition\n');
                }
                if (fault === 'endpoint')
                    await process(f.entries.get(e.company.path)!, raw => raw.replace(e.company.id, 'different-id'));
                if (fault === 'new-id')
                    await create(e.record.path.replace('Owner/', 'Duplicate/'), e.record.raw);
                if (fault === 'native')
                    native = true;
                if (fault === 'root')
                    f.changeRoot('OtherRoot');
                if (fault === 'disabled')
                    f.application.dispose();
            }
            return process(file, patch, guard);
        };
        await expect(f.services.commands.migrate({ preflight, operationId: 'guarded' })).rejects.toThrow();
        expect(await f.files.read(f.entries.get(e.record.path)!)).toContain('huhu-type: person');
        expect([...f.entries.keys()].some(path => path.endsWith('guarded-完成.md'))).toBe(false);
        expect([...f.entries.keys()].filter(path => path.includes('/关联记录/'))).toHaveLength(2);
    });
test('verified rollback retires only unchanged migration facts, preserves files and permits later v1 basic edits', async () => {
    const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path);
    await f.services.commands.migrate({ preflight, operationId: 'rollback' });
    const before = [...f.entries.keys()].filter(path => path.includes('/关联记录/'));
    expect((await f.services.commands.rollbackMigration('rollback')).phase).toBe('rolled-back');
    expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
    expect([...f.entries.keys()].filter(path => path.includes('/关联记录/'))).toEqual(before);
    const reopened = f.app();
    expect((await reopened.archives.relations.query('owner')).relations).toHaveLength(0);
    await reopened.ensureLoaded();
    const base = await reopened.snapshot(e.record.path), draft = cloneRecord(base);
    draft.fields.region = 'After rollback';
    await reopened.save(base, draft);
    expect((await reopened.archives.relations.query('owner')).relations).toHaveLength(0);
    expect((await reopened.archives.relations.query('owner')).isComplete).toBe(true);
});
for (const fault of ['owner', 'relation', 'deleted', 'new'] as const)
    test(`rollback preserves post-migration ${fault} changes and refuses false success`, async () => {
        const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path), receipt = await f.services.commands.migrate({ preflight, operationId: 'conflict' }), rows = (await f.services.query.relations()).relations;
        if (fault === 'owner')
            await f.files.process(f.entries.get(e.record.path)!, raw => raw + '\nNEW USER BODY\n');
        if (fault === 'relation')
            await f.services.commands.updateRelation({ base: await f.services.commands.beginRelationEdit(rows[0]!.id), changes: { values: { notes: 'USER CHANGE' } }, intent: 'complete' });
        if (fault === 'deleted') {
            await rm(join(f.directory, rows[0]!.path));
            f.entries.delete(rows[0]!.path);
        }
        if (fault === 'new') {
            const type = (await f.services.catalog.relationTypes()).types.find(type => type.relationTypeId === 'participates')!;
            await f.services.commands.createRelation({ id: 'new-user-relation', operationId: 'new-user-op', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: 'owner', targetId: e.boss.id, values: { role: 'NEW USER' }, status: 'current', intent: 'complete' });
        }
        const before = await Promise.all([...f.entries.values()].map(async (file) => [file.path, await f.files.read(file)]));
        await expect(f.services.commands.rollbackMigration(receipt.migrationId)).rejects.toThrow();
        expect(await Promise.all([...f.entries.values()].map(async (file) => [file.path, await f.files.read(file)]))).toEqual(before);
    });
for (const moment of ['before', 'after'] as const)
    for (let step = 1; step <= 3; step++)
        test(`rollback resumes after ${moment} step ${step} without deleting migration files`, async () => {
            const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path);
            await f.services.commands.migrate({ preflight, operationId: 'rollback-interrupted' });
            const create = f.files.create, process = f.files.process;
            let count = 0;
            f.files.create = async (path, raw, guard) => { const hit = ++count === step; if (hit && moment === 'before')
                throw new Error('rollback fault'); const result = await create(path, raw, guard); if (hit && moment === 'after')
                throw new Error('rollback fault'); return result; };
            f.files.process = async (file, patch, guard) => { const hit = ++count === step; if (hit && moment === 'before')
                throw new Error('rollback fault'); const result = await process(file, patch, guard); if (hit && moment === 'after')
                throw new Error('rollback fault'); return result; };
            await expect(f.services.commands.rollbackMigration('rollback-interrupted')).rejects.toThrow('rollback fault');
            f.files.create = create;
            f.files.process = process;
            const reopened = archiveServices(() => f.app().archives);
            expect((await reopened.commands.rollbackMigration('rollback-interrupted')).phase).toBe('rolled-back');
            expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
            expect((await reopened.query.relations()).relations).toHaveLength(0);
            expect([...f.entries.keys()].filter(path => path.includes('/关联记录/'))).toHaveLength(2);
        });
for (const fault of ['missing-id', 'missing-ref', 'mismatch', 'duplicate', 'table', 'marker'] as const)
    test(`pure preflight diagnoses ${fault} from raw source without guessing`, async () => {
        const f = await fixture(), e = await legacy(f), file = f.entries.get(e.record.path)!;
        if (fault === 'missing-id')
            await f.files.process(file, raw => raw.replace('huhu-id: owner', 'huhu-id: null'));
        if (fault === 'missing-ref')
            await f.files.process(file, raw => raw.replace(`<!-- huhu:ref ${e.company.id} -->`, ''));
        if (fault === 'mismatch')
            await f.files.process(file, raw => raw.replace(`<!-- huhu:ref ${e.company.id} -->`, '<!-- huhu:ref wrong-id -->'));
        if (fault === 'duplicate')
            await f.files.create(e.company.path.replace('/Company/', '/Duplicate/'), e.company.raw);
        if (fault === 'table')
            await f.files.process(file, raw => raw.replace('| company |', '| missing |').replace('| 企业 |', '| 错误 |'));
        if (fault === 'marker')
            await f.files.process(file, raw => raw.replace('<!-- huhu:employments -->', '```md\n<!-- huhu:employments -->').replace('<!-- /huhu:employments -->', '<!-- /huhu:employments -->\n```'));
        const before = await Promise.all([...f.entries.values()].map(async (file) => [file.path, await f.files.read(file)])), preflight = await f.services.commands.preflightMigration(e.record.path);
        expect(preflight.canMigrate).toBe(false);
        expect(preflight.diagnostics.length).toBeGreaterThan(0);
        expect(await Promise.all([...f.entries.values()].map(async (file) => [file.path, await f.files.read(file)]))).toEqual(before);
    });
test('company aliases, custom names/report direction, original reminders and BOM/CRLF remain compatible through migration and rollback', async () => {
    const f = await fixture(), e = await legacy(f), record = cloneRecord(e.record), directReport = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Direct report' } })).entity;
    record.relations.push({ ...record.relations[0]!, person: { id: directReport.id, label: 'Direct report', link: relativeLink(record.path, directReport.path) }, id: 'row-report', kind: 'report' }, { ...record.relations[0]!, id: 'row-custom', kind: 'Research mentor' });
    const { patchReminders, readReminders } = await import('./core/reminders');
    const definition: import('../../shared/automation/types').AutomationDefinition = { id: 'reminder', name: 'Before', enabled: true, deviceId: 'test', revision: 1, schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Body' }, channels: [], notifyOn: 'never', graceMinutes: 0, createdAt: 1, updatedAt: 1, source: { kind: 'contacts', id: 'owner', path: record.path } };
    const raw = patchReminders('\uFEFF' + createMarkdown(record).replace('name: Owner', 'name: Owner # retain\nunknown: "000123" # keep').replaceAll('\n', '\r\n') + '\r\nFREE BODY\r\n', definition);
    await f.files.process(f.entries.get(record.path)!, () => raw);
    f.application.archives.invalidate();
    const preflight = await f.services.commands.preflightMigration(record.path);
    expect(preflight.counts.reminders).toBe(1);
    await f.services.commands.migrate({ preflight, operationId: 'all-semantics' });
    const ownerRaw = await f.files.read(f.entries.get(record.path)!);
    expect(ownerRaw.startsWith('\uFEFF')).toBe(true);
    expect(ownerRaw).toContain('unknown: "000123" # keep\r\n');
    expect(ownerRaw).toContain('FREE BODY\r\n');
    expect(readReminders(ownerRaw)).toEqual([definition]);
    const query = await f.services.query.relations();
    expect(query.relations.find(relation => relation.values.kind === 'Research mentor')).toMatchObject({ sourceId: 'owner', targetId: e.boss.id });
    expect(query.relations.some(relation => relation.sourceId === directReport.id && relation.targetId === 'owner')).toBe(true);
    await f.services.commands.migrate({ preflight: await f.services.commands.preflightMigration(e.company.path), operationId: 'company-migration' });
    expect((await f.services.query.relations()).isComplete).toBe(true);
    const changed = { ...definition, name: 'Edited after migration', revision: 2 };
    await f.application.saveReminder(changed);
    expect(readReminders(await f.files.read(f.entries.get(record.path)!))).toEqual([changed]);
    await f.application.saveReminder(changed, true);
    expect(readReminders(await f.files.read(f.entries.get(record.path)!))).toEqual([]);
    await expect(f.services.commands.rollbackMigration('all-semantics')).rejects.toThrow();
});
test('visible authority distinguishes missing owner, regressed owner, missing plan and explicit rollback after reopening', async () => {
    for (const fault of ['missing-owner', 'v1-owner', 'missing-plan'] as const) {
        const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path);
        await f.services.commands.migrate({ preflight, operationId: 'authority' });
        if (fault === 'missing-owner') {
            await rm(join(f.directory, e.record.path));
            f.entries.delete(e.record.path);
        }
        if (fault === 'v1-owner')
            await f.files.process(f.entries.get(e.record.path)!, () => e.record.raw);
        if (fault === 'missing-plan') {
            const path = 'huhu/档案/迁移记录/authority.md';
            await rm(join(f.directory, path));
            f.entries.delete(path);
            for (const file of [...f.entries.values()].filter(file => file.path.includes('/关联记录/'))) {
                await rm(join(f.directory, file.path));
                f.entries.delete(file.path);
            }
        }
        const reopened = archiveServices(() => f.app().archives), query = await reopened.query.relations('owner');
        expect(query.isComplete).toBe(false);
        if (fault !== 'missing-plan') {
            expect(query.relations).toHaveLength(2);
            expect(query.relations.every(row => row.readOnly)).toBe(true);
        }
        else
            expect((await reopened.query.snapshot()).entities.find(entity => entity.id === 'owner')?.readOnly).toBe(true);
    }
});
test('changing a visible manifest during native capture cannot authorize owner switch', async () => {
    const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path), capture = f.files.captureEditors, process = f.files.process;
    let armed = true;
    f.files.captureEditors = async (files) => { if (armed && files.some(file => file.path === 'huhu/档案/迁移记录/plan-drift.md')) {
        armed = false;
        await process(f.entries.get('huhu/档案/迁移记录/plan-drift.md')!, raw => raw + '\nEXTERNAL MANIFEST\n');
    } return capture(files); };
    await expect(f.services.commands.migrate({ preflight, operationId: 'plan-drift' })).rejects.toThrow();
    expect(await f.files.read(f.entries.get(e.record.path)!)).toContain('huhu-type: person');
});
test('one operation identity cannot be reused for a different owner', async () => {
    const f = await fixture(), e = await legacy(f), preflight = await f.services.commands.preflightMigration(e.record.path);
    await f.services.commands.migrate({ preflight, operationId: 'unique-operation' });
    const other = await f.services.commands.preflightMigration(e.company.path);
    await expect(f.services.commands.migrate({ preflight: other, operationId: 'unique-operation' })).rejects.toMatchObject({ code: 'migrationConflict' });
});

test('migrated reminders list once and keep the real open route to the same inherited identity',async()=>{
 const f=await fixture(),e=await legacy(f),{patchReminders}=await import('./core/reminders'),{remindersAutomationSource}=await import('./contrib/reminders-source'),{navigateContacts}=await import('./ui/navigate');
 const definition:import('../../shared/automation/types').AutomationDefinition={id:'open-reminder',name:'Inherited',enabled:true,deviceId:'test',revision:1,schedule:{kind:'manual'},action:{kind:'notify',body:'Body'},channels:[],notifyOn:'never',graceMinutes:0,createdAt:1,updatedAt:1,source:{kind:'contacts',id:'owner',path:e.record.path}};
 await f.files.process(f.entries.get(e.record.path)!,raw=>patchReminders(raw,definition));f.application.archives.invalidate();await f.application.ensureLoaded();await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'reminder-route'});
 const opened:string[]=[];const reopened=f.app();await reopened.ensureLoaded();
 const surface={controller:reopened,changeKind:()=>{},select:()=>{},openGeneric:(path?:string)=>{if(path)opened.push(path);}};
 const source=remindersAutomationSource(f.application as unknown as import('./platform/controller').ContactsController,{open:async target=>{await navigateContacts(surface,target,new AbortController().signal);}} as import('../../app/contracts/module').ShellAccess);
 const list=await source.list();expect(list.filter(item=>item.id==='open-reminder')).toHaveLength(1);await source.open?.(list.find(item=>item.id==='open-reminder')!.source!,{} as Window);expect(opened).toEqual([e.record.path]);
});

for(const moment of ['before-owner','before-receipt'] as const)test(`rollback final gate refuses a newly arrived user relation ${moment} and reports partial state honestly`,async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'rollback-arrival'});
 const type=(await f.services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='participates')!,external=(await f.services.commands.createRelation({id:'arrival',operationId:'arrival-op',relationTypeId:type.relationTypeId,schemaRevisionId:type.revisionId,schemaContentHash:type.contentHash,sourceId:'owner',targetId:e.boss.id,values:{role:'USER ARRIVAL'},status:'current',intent:'complete'})).relation;
 await rm(join(f.directory,external.path));f.entries.delete(external.path);f.application.archives.invalidate();const process=f.files.process,create=f.files.create;let arrived=false;
 const arrive=async()=>{if(!arrived){arrived=true;await create(external.path,external.raw);}};
 f.files.process=async(file,patch,guard)=>{if(moment==='before-owner'&&file.path===e.record.path)await arrive();return process(file,patch,guard);};
 f.files.create=async(path,raw,guard)=>{if(moment==='before-receipt'&&path.endsWith('-回退.md'))await arrive();return create(path,raw,guard);};
 await expect(f.services.commands.rollbackMigration('rollback-arrival')).rejects.toThrow();expect(arrived).toBe(true);expect(await f.files.read(f.entries.get(external.path)!)).toBe(external.raw);expect(f.files.getFileByPath('huhu/档案/迁移记录/rollback-arrival-回退.md')).toBeNull();
 const owner=await f.files.read(f.entries.get(e.record.path)!);expect(owner).toContain(moment==='before-owner'?'huhu-type: archive-record':'huhu-type: person');expect((await f.services.query.migrations())[0]?.phase).toBe('rollback-pending');
});
test('a wrong-kind rollback receipt cannot retire active relations or report successful rollback',async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'bad-receipt'});
 const complete=await f.files.read(f.entries.get('huhu/档案/迁移记录/bad-receipt-完成.md')!);await f.files.create('huhu/档案/迁移记录/bad-receipt-回退.md',complete);f.application.archives.invalidate();
 const relations=await f.services.query.relations();expect(relations.isComplete).toBe(false);expect(relations.relations).toHaveLength(2);expect(relations.diagnostics.some(item=>item.code==='migrationInvalid')).toBe(true);
 await expect(f.services.commands.resumeMigration('bad-receipt')).rejects.toMatchObject({code:'migrationInvalid'});await expect(f.services.commands.rollbackMigration('bad-receipt')).rejects.toMatchObject({code:'migrationInvalid'});expect((await f.services.query.migrations())[0]?.diagnostics.length).toBeGreaterThan(0);
});

test('a changed v1 source can explicitly confirm a new plan that retires only uncommitted staged facts',async()=>{
 const f=await fixture(),e=await legacy(f),preflight=await f.services.commands.preflightMigration(e.record.path),process=f.files.process;
 f.files.process=async(file,patch,guard)=>{if(file.path===e.record.path)throw new Error('before owner');return process(file,patch,guard);};await expect(f.services.commands.migrate({preflight,operationId:'old-plan'})).rejects.toThrow('before owner');f.files.process=process;
 const oldFiles=[...f.entries.values()].filter(file=>file.path.includes('/关联记录/')),oldRaw=await Promise.all(oldFiles.map(file=>f.files.read(file)));
 await f.files.process(f.entries.get(e.record.path)!,raw=>raw+'\nUSER SOURCE COMPARISON\n');f.application.archives.invalidate();await expect(f.services.commands.resumeMigration('old-plan')).rejects.toMatchObject({code:'migrationChanged'});
 const next=await f.services.commands.preflightMigration(e.record.path);expect(next.canMigrate).toBe(true);expect(next.supersedes).toEqual(['old-plan']);await f.services.commands.migrate({preflight:next,operationId:'new-plan'});
 const query=await f.services.query.relations('owner');expect(query.isComplete).toBe(true);expect(query.relations).toHaveLength(2);expect(query.relations.every(relation=>!oldFiles.some(file=>file.path===relation.path))).toBe(true);expect(await Promise.all(oldFiles.map(file=>f.files.read(file)))).toEqual(oldRaw);expect(await f.files.read(f.entries.get(e.record.path)!)).toContain('USER SOURCE COMPARISON');
 await f.services.commands.rollbackMigration('new-plan');expect(await f.files.read(f.entries.get(e.record.path)!)).toContain('USER SOURCE COMPARISON');expect((await f.services.query.relations('owner')).relations).toHaveLength(0);
});
test('contradictory legacy reports are diagnosed before any migration writes',async()=>{
 const f=await fixture(),e=await legacy(f),record=cloneRecord(e.record);record.relations.push({...record.relations[0]!,id:'contradiction',kind:'report'});await f.files.process(f.entries.get(record.path)!,()=>createMarkdown(record));f.application.archives.invalidate();
 const before=[...f.entries.keys()],preflight=await f.services.commands.preflightMigration(record.path);expect(preflight.canMigrate).toBe(false);expect(preflight.diagnostics.some(item=>item.code==='relationCycle')).toBe(true);expect([...f.entries.keys()]).toEqual(before);
});

for(const fault of ['completed','bad-complete','unreadable-complete','bad-backup','rollback-pending','changed-staged'] as const)test(`new confirmation cannot supersede ${fault} evidence`,async()=>{
 const f=await fixture(),e=await legacy(f),preflight=await f.services.commands.preflightMigration(e.record.path),process=f.files.process,create=f.files.create;
 if(fault!=='completed')f.files.process=async(file,patch,guard)=>{if(file.path===e.record.path)throw new Error('stop at owner');return process(file,patch,guard);};
 if(fault==='completed')await f.services.commands.migrate({preflight,operationId:'prior'});else await expect(f.services.commands.migrate({preflight,operationId:'prior'})).rejects.toThrow('stop at owner');f.files.process=process;
 if(fault==='completed')await process(f.entries.get(e.record.path)!,()=>e.record.raw);
 if(fault==='bad-complete'||fault==='unreadable-complete')await create('huhu/档案/迁移记录/prior-完成.md','---\nhuhu-type: wrong\n---\n');
 if(fault==='unreadable-complete'){const read=f.files.read;f.files.read=async file=>{if(file.path.endsWith('prior-完成.md'))throw new Error('unreadable receipt');return read(file);};}
 if(fault==='bad-backup')await process(f.entries.get('huhu/档案/迁移恢复/prior/原始.md')!,raw=>raw+'\nchanged backup\n');
 if(fault==='rollback-pending')await create('huhu/档案/迁移记录/prior-回退计划.md','---\nhuhu-type: archive-migration-rollback-intent\n---\n');
 if(fault==='changed-staged'){const relation=[...f.entries.values()].find(file=>file.path.includes('/关联记录/'))!;await process(relation,raw=>raw+'\nUSER STAGED EDIT\n');}
 f.application.archives.invalidate();const next=await f.services.commands.preflightMigration(e.record.path);expect(next.canMigrate).toBe(false);expect(next.supersedes).toEqual([]);expect(next.diagnostics.length).toBeGreaterThan(0);
 const owner=await f.files.read(f.entries.get(e.record.path)!);await expect(f.services.commands.migrate({preflight:next,operationId:'replacement'})).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(owner);expect(f.files.getFileByPath('huhu/档案/迁移记录/replacement.md')).toBeNull();
});

// T21 review repair: these are public consumer/recovery counterexamples, not isolated resolver mocks.
test('an activated migration stays incomplete and visible across two receipt failures and reopening',async()=>{
 const f=await fixture(),e=await legacy(f),create=f.files.create;
 f.files.create=async(path,raw,guard)=>{if(path.endsWith('-完成.md')||path.endsWith('-回退.md'))throw new Error('receipt EIO');return create(path,raw,guard);};
 await expect(f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'double-eio'})).rejects.toThrow('receipt EIO');
 await expect(f.services.commands.rollbackMigration('double-eio')).rejects.toThrow('receipt EIO');
 const reopened=f.app(),services=archiveServices(()=>reopened.archives),query=await services.query.relations('owner');
 expect(query.isComplete).toBe(false);expect(query.relations).toHaveLength(2);expect(query.diagnostics.some(item=>item.code==='migrationRollbackPending')).toBe(true);
 await reopened.ensureLoaded();expect(reopened.index.get('owner')?.employments).toHaveLength(0);expect(reopened.index.issues(reopened.index.get('owner')!)).toContain('migrationRollbackPending');
 f.files.create=create;expect((await services.commands.rollbackMigration('double-eio')).phase).toBe('rolled-back');await reopened.reload();
 const base=await reopened.snapshot(e.record.path),draft=cloneRecord(base);draft.fields.region='V1 restored';await reopened.save(base,draft);expect((await reopened.archives.relations.query('owner')).relations).toHaveLength(0);
});
test('legacy index, snapshot, basic save and reminder save obey a completed migration conflict',async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'regressed'});await f.files.process(f.entries.get(e.record.path)!,()=>e.record.raw);
 const reopened=f.app();await reopened.ensureLoaded();const indexed=reopened.index.get('owner')!;
 expect(indexed.employments).toHaveLength(0);expect(indexed.relations).toHaveLength(0);expect(reopened.index.issues(indexed)).toContain('migrationConflict');expect(reopened.index.members(e.company.id,'past')).toHaveLength(0);
 await expect(reopened.snapshot(e.record.path)).rejects.toMatchObject({code:'migrationConflict'});
 const next=cloneRecord(e.record);next.fields.region='BLOCKED';await expect(reopened.save(e.record,next)).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
 const definition:import('../../shared/automation/types').AutomationDefinition={id:'conflict-reminder',name:'Blocked',enabled:true,deviceId:'test',revision:1,schedule:{kind:'manual'},action:{kind:'notify',body:'Body'},channels:[],notifyOn:'never',graceMinutes:0,createdAt:1,updatedAt:1,source:{kind:'contacts',id:'owner',path:e.record.path}};
 await expect(reopened.saveReminder(definition)).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
});
for(const change of ['body','field','reminder']as const)test(`semantic switched phase survives a later ${change} change without relaxing hashes`,async()=>{
 const f=await fixture(),e=await legacy(f),create=f.files.create;f.files.create=async(path,raw,guard)=>{if(path.endsWith('-完成.md'))throw new Error('completion EIO');return create(path,raw,guard);};
 await expect(f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'semantic-phase'})).rejects.toThrow('completion EIO');f.files.create=create;
 if(change==='body')await f.files.process(f.entries.get(e.record.path)!,raw=>raw+'\nUSER AFTER SWITCH\n');
 if(change==='field')await f.services.commands.updateEntity({base:await f.services.commands.beginEdit('owner'),changes:{region:'USER FIELD'},intent:'complete'});
 if(change==='reminder'){const definition:import('../../shared/automation/types').AutomationDefinition={id:'after-switch',name:'User reminder',enabled:true,deviceId:'test',revision:1,schedule:{kind:'manual'},action:{kind:'notify',body:'Body'},channels:[],notifyOn:'never',graceMinutes:0,createdAt:1,updatedAt:1,source:{kind:'contacts',id:'owner',path:e.record.path}};await f.application.saveReminder(definition);}
 f.application.archives.invalidate();const receipt=(await f.services.query.migrations())[0]!;expect(receipt.phase).toBe('switched');expect(receipt.diagnostics.some(item=>item.code==='migrationChanged')).toBe(true);expect((await f.services.query.relations('owner')).relations).toHaveLength(2);
 const raw=await f.files.read(f.entries.get(e.record.path)!);await expect(f.services.commands.resumeMigration('semantic-phase')).rejects.toThrow();await expect(f.services.commands.rollbackMigration('semantic-phase')).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(raw);
});
test('a known unrelated v1 field error remains visible while a valid owner migrates and resumes as a batch',async()=>{
 const f=await fixture(),e=await legacy(f),path='huhu/档案/个人档案/Broken/基本信息.md',raw='---\nhuhu-type: person\nhuhu-id: broken\n---\n';await f.files.create(path,raw);f.application.archives.invalidate();
 const preflight=await f.services.commands.preflightMigration(e.record.path);expect(preflight.canMigrate).toBe(true);expect(preflight.diagnostics.some(item=>item.path===path&&item.code==='nameRequired')).toBe(true);
 expect((await f.services.commands.migrate({preflight,operationId:'valid-batch'})).phase).toBe('complete');expect((await archiveServices(()=>f.app().archives).commands.resumeMigration('valid-batch')).phase).toBe('complete');expect(await f.files.read(f.entries.get(path)!)).toBe(raw);expect((await f.services.query.snapshot()).diagnostics.some(item=>item.path===path)).toBe(true);
});

for(const fault of ['damaged','unreadable']as const)test(`unverified active rollback with ${fault} final receipt never reactivates legacy authority`,async()=>{
 const f=await fixture(),e=await legacy(f),create=f.files.create;f.files.create=async(path,raw,guard)=>{if(path.endsWith('-完成.md')||path.endsWith('-回退.md'))throw new Error('receipt EIO');return create(path,raw,guard);};await expect(f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'bad-final'})).rejects.toThrow();await expect(f.services.commands.rollbackMigration('bad-final')).rejects.toThrow();f.files.create=create;
 const path='huhu/档案/迁移记录/bad-final-回退.md';await create(path,'---\nhuhu-type: wrong\n---\n');if(fault==='unreadable'){const read=f.files.read;f.files.read=async file=>{if(file.path===path)throw new Error('receipt unreadable');return read(file);};}
 const app=f.app();await app.ensureLoaded();const query=await app.archives.relations.query('owner');expect(query.isComplete).toBe(false);expect(query.relations).toHaveLength(2);expect(query.relations.every(relation=>relation.readOnly)).toBe(true);expect(app.index.get('owner')?.employments).toHaveLength(0);await expect(app.snapshot(e.record.path)).rejects.toThrow();expect((await app.archives.migrations.list())[0]?.diagnostics.length).toBeGreaterThan(0);
});
test('a staged cancellation records its distinct pre-activation state and remains pending until verified',async()=>{
 const f=await fixture(),e=await legacy(f),process=f.files.process,create=f.files.create;f.files.process=async(file,patch,guard)=>{if(file.path===e.record.path)throw new Error('not switched');return process(file,patch,guard);};await expect(f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'cancel-staged'})).rejects.toThrow('not switched');f.files.process=process;f.files.create=async(path,raw,guard)=>{if(path.endsWith('-回退.md'))throw new Error('rollback receipt EIO');return create(path,raw,guard);};await expect(f.services.commands.rollbackMigration('cancel-staged')).rejects.toThrow();
 const {archiveFrontmatter}=await import('./core/persist/v2/markdown'),intent=archiveFrontmatter(await f.files.read(f.entries.get('huhu/档案/迁移记录/cancel-staged-回退计划.md')!));expect(intent['huhu-activation']).toMatchObject({sourcePhase:'staged'});
 const query=await archiveServices(()=>f.app().archives).query.relations('owner');expect(query.isComplete).toBe(false);expect(query.relations).toHaveLength(0);expect(query.diagnostics.some(item=>item.code==='migrationRollbackPending')).toBe(true);f.files.create=create;expect((await f.services.commands.rollbackMigration('cancel-staged')).phase).toBe('rolled-back');
});
for(const command of ['basic','reminder']as const)test(`a late completion fact is checked inside the actual legacy ${command} final callback`,async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'late-authority'});const path='huhu/档案/迁移记录/late-authority-完成.md',receipt=await f.files.read(f.entries.get(path)!);await f.files.process(f.entries.get(e.record.path)!,()=>e.record.raw);await rm(join(f.directory,path));f.entries.delete(path);
 const app=f.app();await app.ensureLoaded();const base=await app.snapshot(e.record.path),draft=cloneRecord(base);draft.fields.region='LATE MUST REJECT';const process=f.files.process,create=f.files.create;f.files.process=async(file,patch,guard)=>{if(file.path===e.record.path&&!f.entries.has(path))await create(path,receipt);return process(file,patch,guard);};
 const definition:import('../../shared/automation/types').AutomationDefinition={id:'late-reminder',name:'Blocked',enabled:true,deviceId:'test',revision:1,schedule:{kind:'manual'},action:{kind:'notify',body:'Body'},channels:[],notifyOn:'never',graceMinutes:0,createdAt:1,updatedAt:1,source:{kind:'contacts',id:'owner',path:e.record.path}};
 await expect(command==='basic'?app.save(base,draft):app.saveReminder(definition)).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
});
test('migration metadata events refresh the real legacy counts without an owner edit',async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'metadata-event'});const path='huhu/档案/迁移记录/metadata-event-完成.md',raw=await f.files.read(f.entries.get(path)!);await f.files.process(f.entries.get(e.record.path)!,()=>e.record.raw);await rm(join(f.directory,path));f.entries.delete(path);const app=f.app();await app.ensureLoaded();expect(app.index.get('owner')?.employments).toHaveLength(1);
 const arrived=await f.files.create(path,raw),changed=new Promise<void>(resolve=>{const off=app.subscribe(()=>{if(app.index.get('owner')?.errors.includes('migrationConflict')){off();resolve();}});});app.fileChanged(arrived);await changed;expect(app.index.get('owner')?.employments).toHaveLength(0);expect(app.index.members(e.company.id,'past')).toHaveLength(0);
});
for(const fault of ['unknown-id','unreadable','duplicate','endpoint']as const)test(`batch migration still refuses ${fault} risk before writing definitions`,async()=>{
 const f=await fixture(),e=await legacy(f),path='huhu/档案/个人档案/Risky/基本信息.md';
 if(fault==='unknown-id')await f.files.create(path,'---\nhuhu-type: person\nname: Unknown identity\n---\n');
 if(fault==='unreadable'){await f.files.create(path,'---\nhuhu-type: person\nhuhu-id: hidden\nname: Hidden\n---\n');const read=f.files.read,cached=f.files.cachedRead;f.files.read=async file=>{if(file.path===path)throw new Error('unreadable');return read(file);};f.files.cachedRead=async file=>{if(file.path===path)throw new Error('unreadable');return cached(file);};}
 if(fault==='duplicate')await f.files.create(path,e.company.raw);
 if(fault==='endpoint')await f.files.process(f.entries.get(e.company.path)!,raw=>raw.replace('name: Company','name: null'));
 f.application.archives.invalidate();const before=[...f.entries.keys()],preflight=await f.services.commands.preflightMigration(e.record.path);expect(preflight.canMigrate).toBe(false);await expect(f.services.commands.migrate({preflight,operationId:'unsafe-batch'})).rejects.toThrow();expect([...f.entries.keys()]).toEqual(before);
});

for(const command of ['field','reminder']as const)test(`migrated ${command} writes reject a late rollback intent in their final callback`,async()=>{
 const f=await fixture(),e=await legacy(f);await f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(e.record.path),operationId:'late-intent'});const {archiveFrontmatter,archiveMarkdown}=await import('./core/persist/v2/markdown'),plan=archiveFrontmatter(await f.files.read(f.entries.get('huhu/档案/迁移记录/late-intent.md')!)).plan as import('./core/migration-model').MigrationPlan;
 const raw=await f.files.read(f.entries.get(e.record.path)!),process=f.files.process,create=f.files.create,path='huhu/档案/迁移记录/late-intent-回退计划.md';f.files.process=async(file,patch,guard)=>{if(file.path===e.record.path&&!f.entries.has(path))await create(path,archiveMarkdown({'huhu-type':'archive-migration-rollback-intent','huhu-format-version':2,'huhu-plan-hash':plan.hash,'huhu-activation':{sourcePhase:'active',ownerId:plan.ownerId,migrationId:plan.migrationId,relationIds:plan.relations.map(row=>row.id),ownerHash:plan.owner.hash}}));return process(file,patch,guard);};
 const base=await f.services.commands.beginEdit('owner'),definition:import('../../shared/automation/types').AutomationDefinition={id:'late-v2-reminder',name:'Blocked',enabled:true,deviceId:'test',revision:1,schedule:{kind:'manual'},action:{kind:'notify',body:'Body'},channels:[],notifyOn:'never',graceMinutes:0,createdAt:1,updatedAt:1,source:{kind:'contacts',id:'owner',path:e.record.path}};
 await expect(command==='field'?f.services.commands.updateEntity({base,changes:{region:'BLOCKED'},intent:'complete'}):f.application.saveReminder(definition)).rejects.toThrow();expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(raw);
});

test('a zero-relation owner still proves global identities before switching after its plan is written',async()=>{
 const f=await fixture(),entity=(await f.services.commands.createEntity({typeId:'company',values:{name:'No rows'}})).entity,create=f.files.create;let injected=false;
 f.files.create=async(path,raw,guard)=>{const file=await create(path,raw,guard);if(path==='huhu/档案/迁移记录/zero-rows.md'){injected=true;await create(entity.path.replace('/No-rows/','/Duplicate/'),entity.raw);}return file;};
 await expect(f.services.commands.migrate({preflight:await f.services.commands.preflightMigration(entity.path),operationId:'zero-rows'})).rejects.toThrow();expect(injected).toBe(true);expect(await f.files.read(f.entries.get(entity.path)!)).toContain('huhu-type: company');expect(f.files.getFileByPath('huhu/档案/迁移记录/zero-rows-完成.md')).toBeNull();
});


async function moveMigrationFixture(f: Awaited<ReturnType<typeof fixture>>, oldPath: string, newPath: string, folder = false) {
 await mkdir(dirname(join(f.directory, newPath)), { recursive: true }); await rename(join(f.directory, oldPath), join(f.directory, newPath));
 const moved = [...f.entries].filter(([path]) => path === oldPath || folder && path.startsWith(oldPath + '/'));
 for (const [path, file] of moved) { const next = newPath + path.slice(oldPath.length); f.entries.delete(path); Object.defineProperty(file, 'path', { value: next, enumerable: true, configurable: true }); f.entries.set(next, file); }
 return folder ? null : f.entries.get(newPath)!;
}
function waitLegacyProjection(app: ContactsApplication, check: (record: ReturnType<ContactsApplication['index']['get']>) => boolean): Promise<void> {
 if (check(app.index.get('owner'))) return Promise.resolve();
 return new Promise(resolve => { const off = app.subscribe(() => { if (check(app.index.get('owner'))) { off(); resolve(); } }); });
}
for (const origin of ['Incoming/receipt.md', 'huhu/档案/Incoming/receipt.md']) test(`receipt rename from ${origin} updates legacy authority without an owner edit or fileChanged`, async () => {
 const f = await fixture(), e = await legacy(f), path = 'huhu/档案/迁移记录/rename-receipt-完成.md';
 await f.services.commands.migrate({ preflight: await f.services.commands.preflightMigration(e.record.path), operationId: 'rename-receipt' });
 const receipt = f.entries.get(path)!, receiptRaw = await f.files.read(receipt); await moveMigrationFixture(f, path, origin); await f.files.process(f.entries.get(e.record.path)!, () => e.record.raw);
 const app = f.app(); await app.ensureLoaded(); expect(app.index.get('owner')?.employments).toHaveLength(1); expect(app.index.get('owner')?.errors).toEqual([]);
 const arrived = waitLegacyProjection(app, record => record?.errors.includes('migrationConflict') === true && record.employments.length === 0);
 const moved = await moveMigrationFixture(f, origin, path); expect(moved).toBe(receipt); app.fileRenamed(moved, origin, path);
 expect((await app.archives.snapshot()).entities.find(entity => entity.id === 'owner')?.readOnly).toBe(true); await arrived;
 expect(app.index.members(e.company.id, 'past')).toHaveLength(0); expect(await f.files.read(receipt)).toBe(receiptRaw);
 const departed = waitLegacyProjection(app, record => record?.errors.length === 0 && record.employments.length === 1), outside = 'Incoming/removed-complete.md';
 const removed = await moveMigrationFixture(f, path, outside); app.fileRenamed(removed, path, outside); await departed;
 const base = await app.snapshot(e.record.path), draft = cloneRecord(base); draft.fields.region = 'Valid staged V1'; await app.save(base, draft); expect((await app.snapshot(e.record.path)).fields.region).toBe('Valid staged V1');
});
test('renaming the metadata directory in and out, then deleting it, refreshes the same legacy projection', async () => {
 const f = await fixture(), e = await legacy(f), metadata = 'huhu/档案/迁移记录', incoming = 'Incoming/metadata';
 await f.services.commands.migrate({ preflight: await f.services.commands.preflightMigration(e.record.path), operationId: 'rename-directory' }); await f.files.process(f.entries.get(e.record.path)!, () => e.record.raw);
 const identity = f.entries.get(metadata + '/rename-directory-完成.md')!, raw = await f.files.read(identity); await moveMigrationFixture(f, metadata, incoming, true);
 const app = f.app(); await app.ensureLoaded(); expect(app.index.get('owner')?.employments).toHaveLength(1);
 const arrived = waitLegacyProjection(app, record => record?.errors.includes('migrationConflict') === true && record.employments.length === 0); await moveMigrationFixture(f, incoming, metadata, true); app.fileRenamed(null, incoming, metadata); await arrived;
 expect(f.entries.get(metadata + '/rename-directory-完成.md')).toBe(identity); expect(await f.files.read(identity)).toBe(raw);
 const departed = waitLegacyProjection(app, record => record?.errors.length === 0 && record.employments.length === 1); await moveMigrationFixture(f, metadata, incoming, true); app.fileRenamed(null, metadata, incoming); await departed;
 const again = waitLegacyProjection(app, record => record?.errors.includes('migrationConflict') === true); await moveMigrationFixture(f, incoming, metadata, true); app.fileRenamed(null, incoming, metadata); await again;
 const deleted = waitLegacyProjection(app, record => record?.errors.length === 0 && record.employments.length === 1); await rm(join(f.directory, metadata), { recursive: true }); for (const path of [...f.entries.keys()]) if (path.startsWith(metadata + '/')) f.entries.delete(path); app.fileDeleted(metadata, true); await deleted;
 expect(await f.files.read(f.entries.get(e.record.path)!)).toBe(e.record.raw);
});
test('a verified rollback receipt arriving by rename restores legal V1 editing and deleting it returns to pending authority', async () => {
 const f = await fixture(), e = await legacy(f), path = 'huhu/档案/迁移记录/rollback-rename-回退.md', outside = 'Incoming/verified-rollback.md';
 await f.services.commands.migrate({ preflight: await f.services.commands.preflightMigration(e.record.path), operationId: 'rollback-rename' }); await f.services.commands.rollbackMigration('rollback-rename'); const identity = f.entries.get(path)!, raw = await f.files.read(identity); await moveMigrationFixture(f, path, outside);
 const app = f.app(); await app.ensureLoaded(); expect(app.index.get('owner')?.errors).toContain('migrationRollbackPending'); expect(app.index.get('owner')?.employments).toHaveLength(0);
 const arrived = waitLegacyProjection(app, record => record?.errors.length === 0 && record.employments.length === 1); const moved = await moveMigrationFixture(f, outside, path); app.fileRenamed(moved, outside, path); await arrived;
 const base = await app.snapshot(e.record.path), draft = cloneRecord(base); draft.fields.region = 'Verified rollback V1'; await app.save(base, draft); expect((await app.snapshot(e.record.path)).fields.region).toBe('Verified rollback V1'); expect(await f.files.read(identity)).toBe(raw);
 const deleted = waitLegacyProjection(app, record => record?.errors.includes('migrationRollbackPending') === true && record.employments.length === 0); await rm(join(f.directory, path)); f.entries.delete(path); app.fileDeleted(path, false); await deleted;
 await expect(app.snapshot(e.record.path)).rejects.toMatchObject({ code: 'migrationRollbackPending' });
});

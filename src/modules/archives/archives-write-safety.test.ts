import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test, vi } from 'vitest';
import {
	MarkdownView,
	TFile,
	TFolder,
	type App,
	type Component,
	type Editor,
	type TAbstractFile,
	type WorkspaceLeaf,
} from 'obsidian';
import { DocumentMutationCoordinator } from '../../host/obsidian/document-mutation';
import { vaultContactsFiles } from './platform/vault-files';
import { ContactsApplication } from './core/application';
import { archiveServices } from './services/archive-services';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
	for (const fn of cleanup.splice(0)) await fn();
});
async function fixture() {
	const directory = await mkdtemp(join(tmpdir(), 'huhu-archive-write-'));
	cleanup.push(() => rm(directory, { recursive: true, force: true }));
	const entries = new Map<string, TAbstractFile>(),
		leaves: WorkspaceLeaf[] = [];
	let onChange: ((editor: Editor) => void) | undefined, beforeProcess: ((file: TFile) => void | Promise<void>) | undefined;
	const ensureFolder = async (path: string): Promise<TFolder> => {
		const existing = entries.get(path);
		if (existing instanceof TFolder) return existing;
		if (path.includes('/')) await ensureFolder(path.slice(0, path.lastIndexOf('/')));
		await mkdir(join(directory, path), { recursive: true });
		const folder = Object.assign(Object.create(TFolder.prototype) as TFolder, {
			path,
			children: [] as TAbstractFile[],
		});
		entries.set(path, folder);
		const parent = entries.get(path.slice(0, path.lastIndexOf('/')));
		if (parent instanceof TFolder) parent.children.push(folder);
		return folder;
	};
	const put = async (path: string, text: string): Promise<TFile> => {
		const parent = await ensureFolder(path.slice(0, path.lastIndexOf('/')));
		await writeFile(join(directory, path), text);
		const file = Object.assign(Object.create(TFile.prototype) as TFile, {
			path,
			extension: 'md',
			stat: { size: text.length, mtime: 1 },
		});
		entries.set(path, file);
		parent.children.push(file);
		return file;
	};
	const app = {
		vault: {
			adapter: {},
			getFileByPath: (path: string) => (entries.get(path) instanceof TFile ? entries.get(path) : null),
			getAbstractFileByPath: (path: string) => entries.get(path) ?? null,
			getMarkdownFiles: () => [...entries.values()].filter((file) => file instanceof TFile),
			create: async (path: string, text: string) => {
				if (entries.has(path)) throw new Error('exists');
				return put(path, text);
			},
			createFolder: async (path: string) => {
				if (entries.has(path)) throw new Error('exists');
				return ensureFolder(path);
			},
			read: (file: TFile) => readFile(join(directory, file.path), 'utf8'),
			cachedRead: (file: TFile) => readFile(join(directory, file.path), 'utf8'),
			process: async (file: TFile, update: (raw: string) => string) => {
				await beforeProcess?.(file);
				const raw = await readFile(join(directory, file.path), 'utf8');
				const next = update(raw);
				await writeFile(join(directory, file.path), next);
				return next;
			},
		},
		workspace: {
			layoutReady: true,
			getLeavesOfType: () => leaves,
			on: (_event: string, listener: (editor: Editor) => void) => {
				onChange = listener;
				return {};
			},
		},
		fileManager: {
			trashFile: vi.fn(async (folder: TFolder) => {
				await rm(join(directory, folder.path), { recursive: true });
			}),
		},
	} as unknown as App;
	const documents = new DocumentMutationCoordinator(app, {
		lifetime: { registerEvent: () => {} } as unknown as Component,
		resolveLeaf: () => undefined,
	});
	const files = vaultContactsFiles(
		app,
		() => '',
		() => documents,
	);
	function open(file: TFile, initial: string) {
		let value = initial;
		const editor = { getValue: () => value } as unknown as Editor;
		const save = vi.fn(),
			view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { file, editor, save });
		leaves.push({ view } as unknown as WorkspaceLeaf);
		return {
			save,
			edit(text: string) {
				value = text;
				onChange?.(editor);
			},
		};
	}
	return {
		directory,
		app,
		files,
		put,
		open,
		leaves,
		setBeforeProcess(fn: (file: TFile) => void | Promise<void>) {
			beforeProcess = fn;
		},
	};
}

test('the production Vault port refuses dirty native leaves and never saves their buffers', async () => {
	const f = await fixture(),
		file = await f.put('档案/个人档案/A/基本信息.md', 'disk');
	const editor = f.open(file, 'unsaved native draft');
	expect(() => f.files.checkEditor(file, 'disk')).toThrow();
	await expect(f.files.process(file, () => 'structured write')).rejects.toMatchObject({ code: 'editorConflict' });
	expect(await readFile(join(f.directory, file.path), 'utf8')).toBe('disk');
	expect(editor.save).not.toHaveBeenCalled();
});

test('the production Vault process rejects multi-leaf disagreement and edits after preflight, including edit-and-undo', async () => {
	const f = await fixture(),
		file = await f.put('档案/个人档案/A/基本信息.md', 'disk');
	const main = f.open(file, 'disk'),
		popout = f.open(file, 'other draft');
	await expect(f.files.captureEditors([file])).rejects.toMatchObject({ code: 'editorConflict' });
	popout.edit('disk');
	f.setBeforeProcess(() => {
		main.edit('new text');
		main.edit('disk');
	});
	await expect(f.files.process(file, () => 'changed')).rejects.toMatchObject({ code: 'editorConflict' });
	expect(await readFile(join(f.directory, file.path), 'utf8')).toBe('disk');
	expect(main.save).not.toHaveBeenCalled();
	expect(popout.save).not.toHaveBeenCalled();
});

test('folder deletion checks nested native leaves and rechecks a captured preflight at commit', async () => {
	const f = await fixture(),
		file = await f.put('档案/个人档案/A/附件/资料.md', 'disk');
	const leaf = f.open(file, 'unsaved attachment');
	await expect(f.files.checkFolderEditors('档案/个人档案/A')).rejects.toMatchObject({ code: 'editorConflict' });
	await expect(f.files.trashFolder('档案/个人档案/A')).rejects.toMatchObject({ code: 'editorConflict' });
	leaf.edit('disk');
	const check = await f.files.checkFolderEditors('档案/个人档案/A');
	leaf.edit('later');
	leaf.edit('disk');
	await expect(f.files.trashFolder('档案/个人档案/A', check)).rejects.toMatchObject({ code: 'editorConflict' });
	expect(f.app.fileManager.trashFile).not.toHaveBeenCalled();
	expect(await readFile(join(f.directory, file.path), 'utf8')).toBe('disk');
	expect(leaf.save).not.toHaveBeenCalled();
});

test('the public v2 update reaches the production native guard and preserves its draft when buffers change', async () => {
	const f = await fixture(),
		application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', layouts: {}, maxColumns: 6 }));
	const services = archiveServices(() => application.archives);
	await services.commands.publishType({
		typeId: 'native',
		label: '原生门',
		folder: '原生档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'native-name', label: '名称', codec: 'text' }],
	});
	const created = await services.commands.createEntity({ typeId: 'native', values: { name: 'Before' } });
	const base = await services.commands.beginEdit(created.entity.id),
		file = f.app.vault.getFileByPath(created.entity.path)!;
	const leaf = f.open(file, created.entity.raw + '\nunsaved note');
	const changes = { name: 'After' };
	await expect(services.commands.updateEntity({ base, changes, intent: 'draft' })).rejects.toMatchObject({
		code: 'editorConflict',
	});
	leaf.edit(created.entity.raw);
	f.setBeforeProcess(() => leaf.edit(created.entity.raw + '\nlate native edit'));
	await expect(services.commands.updateEntity({ base, changes, intent: 'draft' })).rejects.toMatchObject({
		code: 'editorConflict',
	});
	expect(changes).toEqual({ name: 'After' });
	expect(await readFile(join(f.directory, file.path), 'utf8')).toBe(created.entity.raw);
	expect(leaf.save).not.toHaveBeenCalled();
	application.dispose();
});


test.each(['version', 'id', 'kind', 'root', 'disabled', 'native-aba'] as const)(
	'reminder final commit rejects changed %s and keeps the caller draft and disk bytes',
	async (change) => {
		const f = await fixture();
		const settings: import('../../shared/contacts-settings').ContactsSettings = { rootFolder: '档案', layouts: {}, maxColumns: 6 };
		const application = new ContactsApplication(f.files, () => settings);
		const created = await application.archives.createEntity({ typeId: 'person', values: { name: 'Reminder' } });
		await application.ensureLoaded();
		const file = f.app.vault.getFileByPath(created.entity.path)!;
		const leaf = change === 'native-aba' ? f.open(file, created.entity.raw) : undefined;
		const definition: import('../../shared/automation/types').AutomationDefinition = {
			id: 'reminder-one', name: 'Draft', enabled: true, deviceId: 'test', revision: 1,
			schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Body' }, channels: [],
			notifyOn: 'never', graceMinutes: 0, createdAt: 1, updatedAt: 1,
			source: { kind: 'contacts', id: created.entity.id, path: created.entity.path },
		};
		const draft = structuredClone(definition);
		let expected = created.entity.raw;
		f.setBeforeProcess(async () => {
			if (change === 'version') expected = expected.replace('huhu-type: person', 'huhu-type: person\nhuhu-format-version: 99');
			if (change === 'id') expected = expected.replace(created.entity.id, 'replacement-identity');
			if (change === 'kind') expected = expected.replace('huhu-type: person', 'huhu-type: company');
			if (change === 'root') settings.rootFolder = '另一档案';
			if (change === 'disabled') application.dispose();
			if (change === 'native-aba') { leaf!.edit('temporary draft'); leaf!.edit(created.entity.raw); }
			if (expected !== created.entity.raw) {
				await writeFile(join(f.directory, file.path), expected);
			}
		});
		await expect(application.saveReminder(definition)).rejects.toBeDefined();
		expect(await readFile(join(f.directory, file.path), 'utf8')).toBe(expected);
		expect(definition).toEqual(draft);
		if (leaf) expect(leaf.save).not.toHaveBeenCalled();
		application.dispose();
	},
);

test('normal reminder save/remove preserves free body and the caller draft', async () => {
	const f = await fixture();
	const application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', layouts: {}, maxColumns: 6 }));
	const created = await application.archives.createEntity({ typeId: 'person', values: { name: 'Reminder OK' } });
	const raw = created.entity.raw + '\nFree body with unknown content  \t\r\n\n';
	await writeFile(join(f.directory, created.entity.path), raw);
	const definition: import('../../shared/automation/types').AutomationDefinition = {
		id: 'reminder-ok', name: 'Draft', enabled: true, deviceId: 'test', revision: 1,
		schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Body' }, channels: [],
		notifyOn: 'never', graceMinutes: 0, createdAt: 1, updatedAt: 1,
		source: { kind: 'contacts', id: created.entity.id, path: created.entity.path },
	};
	const { readReminders } = await import('./core/reminders');
	await application.saveReminder(definition);
	const saved = await readFile(join(f.directory, created.entity.path), 'utf8');
	expect(saved.startsWith(raw)).toBe(true);
	expect(readReminders(saved)).toEqual([definition]);
	await application.saveReminder(definition, true);
	expect(readReminders(await readFile(join(f.directory, created.entity.path), 'utf8'))).toEqual([]);
	expect(definition.name).toBe('Draft');
	application.dispose();
});

test('form publication and entity updates share the production native gate for visible form definitions', async () => {
	const f = await fixture(), application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} }));
	const services = archiveServices(() => application.archives);
	const type = await services.commands.publishType({ typeId: 'native-forms', label: '原生表单', folder: '原生表单档案', titleFieldId: 'name', fields: [
		{ fieldId: 'name', storageKey: 'native-form-name', label: '名称', codec: 'text' },
	] });
	const initial = await services.catalog.forms(type.typeId);
	const published = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: initial.design });
	const created = await services.commands.createEntity({ typeId: type.typeId, values: { name: 'Before' }, formRevisionId: published.revisionId, formContentHash: published.contentHash });
	const pointer = f.app.vault.getFileByPath(`档案/档案定义/表单/${type.typeId}/当前.md`)!;
	const raw = await f.files.read(pointer), leaf = f.open(pointer, raw + '\nunsaved form draft');
	const changed = structuredClone(initial.design);
	changed.fieldSettings[0]!.label = 'Changed label';
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: published.revisionId, baseContentHash: published.contentHash, schemaContentHash: type.contentHash, design: changed })).rejects.toMatchObject({ code: 'editorConflict' });
	expect(await f.files.read(pointer)).toBe(raw);
	const base = await services.commands.beginEdit(created.entity.id), changes = { name: 'Draft' };
	await expect(services.commands.updateEntity({ base, changes, intent: 'draft', formRevisionId: published.revisionId, formContentHash: published.contentHash })).rejects.toMatchObject({ code: 'editorConflict' });
	expect(await readFile(join(f.directory, created.entity.path), 'utf8')).toBe(created.entity.raw);
	expect(changes).toEqual({ name: 'Draft' });
	expect(changed.fieldSettings[0]?.label).toBe('Changed label');
	expect(leaf.save).not.toHaveBeenCalled();
	leaf.edit(raw);
	const next = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: published.revisionId, baseContentHash: published.contentHash, schemaContentHash: type.contentHash, design: changed });
	expect(next.design.fieldSettings[0]?.label).toBe('Changed label');
	application.dispose();
});

test.each([false, true])('publication captures the new staged revision native leaf (existing=%s)', async (existing) => {
	const f = await fixture(), application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} }));
	const services = archiveServices(() => application.archives), initial = await services.catalog.forms('person');
	let previous = initial;
	if (existing) previous = await services.commands.publishForms({ typeId: 'person', baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design });
	const pointerPath = '档案/档案定义/表单/person/当前.md', pointer = f.files.getFileByPath(pointerPath), oldRaw = pointer ? await f.files.read(pointer) : null;
	const read = f.files.read; let leaf: ReturnType<typeof f.open> | undefined;
	f.files.read = async (file) => {
		const raw = await read(file);
		if (!leaf && file.path.includes('/表单/') && file.path.includes('/修订/') && !file.path.endsWith(`/${previous.revisionId}.md`)) leaf = f.open(file as TFile, raw + '\nunsaved staged definition');
		return raw;
	};
	await expect(services.commands.publishForms({ typeId: 'person', baseRevisionId: previous.revisionId, baseContentHash: previous.contentHash, schemaContentHash: initial.type.contentHash, design: initial.design })).rejects.toMatchObject({ code: 'editorConflict' });
	const latest = f.files.getFileByPath(pointerPath); expect(latest ? await read(latest) : null).toBe(oldRaw);
	expect(leaf).toBeDefined(); expect(leaf!.save).not.toHaveBeenCalled(); application.dispose();
});

test.each(['person', 'company'] as const)('legacy %s final create refuses a newly opened native form draft', async (kind) => {
	const f = await fixture(), application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} }));
	const services = archiveServices(() => application.archives), initial = await services.catalog.forms(kind);
	const forms = await services.commands.publishForms({ typeId: kind, baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design });
	const pointer = f.app.vault.getFileByPath(`档案/档案定义/表单/${kind}/当前.md`)!, raw = await f.files.read(pointer), create = f.files.create;
	let leaf: ReturnType<typeof f.open> | undefined;
	f.files.create = async (...args) => {
		if (!leaf && args[0].endsWith('/基本信息.md')) leaf = f.open(pointer, raw + '\nnew native draft');
		return create(...args);
	};
	const input = { typeId: kind, values: { name: 'Native final' }, formRevisionId: forms.revisionId, formContentHash: forms.contentHash };
	await expect(services.commands.createEntity(input)).rejects.toMatchObject({ code: 'editorConflict' });
	expect((await services.query.snapshot()).entities).toHaveLength(0); expect(input.values).toEqual({ name: 'Native final' });
	expect(leaf!.save).not.toHaveBeenCalled(); leaf!.edit(raw); f.files.create = create;
	const created = await services.commands.createEntity(input); expect(created.entity.formatVersion).toBe(1); application.dispose();
});

test('independent relation updates use the production coordinator for both endpoints, all leaves and native ABA without saving', async () => {
	const f = await fixture(), app = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} })), services = archiveServices(() => app.archives);
	const person = (await services.commands.createEntity({ typeId: 'person', values: { name: 'Person' } })).entity, company = (await services.commands.createEntity({ typeId: 'company', values: { name: 'Company' } })).entity;
	const type = (await services.catalog.relationTypes()).types.find((type) => type.relationTypeId === 'employment')!;
	const created = await services.commands.createRelation({ id: 'native-edge', operationId: 'native-operation', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: person.id, targetId: company.id, values: { title: 'Before' }, status: 'current', intent: 'complete' });
	const base = await services.commands.beginRelationEdit(created.relation.id), personFile = f.files.getFileByPath(person.path) as TFile, companyFile = f.files.getFileByPath(company.path) as TFile, relationFile = f.files.getFileByPath(created.relation.path) as TFile;
	const main = f.open(personFile, person.raw), popout = f.open(personFile, 'unsaved endpoint'), target = f.open(companyFile, company.raw), relationEditor = f.open(relationFile, created.relation.raw);
	await expect(services.commands.updateRelation({ base, changes: { values: { title: 'DRAFT' } }, intent: 'complete' })).rejects.toMatchObject({ code: 'editorConflict' });
	popout.edit(person.raw);
	f.setBeforeProcess((file) => { if (file.path === relationFile.path) { target.edit('edit'); target.edit(company.raw); } });
	await expect(services.commands.updateRelation({ base, changes: { values: { title: 'DRAFT' } }, intent: 'complete' })).rejects.toMatchObject({ code: 'editorConflict' });
	expect(await readFile(join(f.directory, relationFile.path), 'utf8')).toBe(created.relation.raw);
	for (const editor of [main, popout, target, relationEditor]) expect(editor.save).not.toHaveBeenCalled();
	app.dispose();
});

for (const fault of ['owner-divergence', 'staged-new-leaf', 'rollback-aba'] as const) test(`migration consumes the production all-leaf gate: ${fault}`, async () => {
 const f = await fixture(), application = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} })), services = archiveServices(() => application.archives);
 const person = (await services.commands.createEntity({typeId:'person',values:{name:'Native migration'}})).entity;
 const preflight = await services.commands.preflightMigration(person.path), file = f.files.getFileByPath(person.path) as TFile, clean=f.open(file,person.raw), another=f.open(file,person.raw);
 if (fault === 'rollback-aba') {
  await expect(services.commands.migrate({preflight,operationId:'native-migrate'})).rejects.toMatchObject({code:'editorConflict'}); const migrated=await f.files.read(file);expect(migrated).toContain('huhu-type: archive-record');clean.edit(migrated);another.edit(migrated);await services.commands.resumeMigration('native-migrate');
  f.setBeforeProcess(target=>{if(target.path===file.path){another.edit('changed');another.edit(migrated);}});
  await expect(services.commands.rollbackMigration('native-migrate')).rejects.toMatchObject({code:'editorConflict'});expect(await f.files.read(file)).toBe(migrated);
 } else {
  let staged: ReturnType<typeof f.open> | undefined;
  f.setBeforeProcess(target=>{if(target.path===file.path){if(fault==='owner-divergence')another.edit('unsaved divergent popout');else {const plan = f.files.getMarkdownFiles().find(file=>file.path==='档案/迁移记录/native-migrate.md')!;staged=f.open(plan as TFile,'unsaved visible plan');}}});
  await expect(services.commands.migrate({preflight,operationId:'native-migrate'})).rejects.toMatchObject({code:'editorConflict'});expect(await f.files.read(file)).toBe(person.raw);if(staged)expect(staged.save).not.toHaveBeenCalled();
 }
 expect(clean.save).not.toHaveBeenCalled();expect(another.save).not.toHaveBeenCalled();application.dispose();
});

test.each(['type','form','relation']as const)('a native editor opened immediately before the %s publication fact blocks its exclusive write',async(family)=>{
 const f=await fixture(),application=new ContactsApplication(f.files,()=>({rootFolder:'档案',maxColumns:6,layouts:{}})),services=archiveServices(()=>application.archives);cleanup.push(async()=>application.dispose());
 const create=f.files.create;let leaf:ReturnType<typeof f.open>|undefined;
 f.files.create=async(path,raw,guard)=>{if(path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&path.includes('/发布/')){const staged=f.files.getMarkdownFiles().find(file=>file.path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&file.path.includes('/修订/'))!;leaf=f.open(staged as TFile,(await f.files.read(staged))+'\nNative draft before commit');}return create(path,raw,guard);};
 let operation:Promise<unknown>;if(family==='type')operation=services.commands.publishType({typeId:'native-publish',label:'Native',folder:'Native',titleFieldId:'name',fields:[{fieldId:'name',storageKey:'native-name',label:'Name',codec:'text'}]});else if(family==='form'){const current=await services.catalog.forms('person');operation=services.commands.publishForms({typeId:'person',baseRevisionId:null,baseContentHash:null,schemaContentHash:current.type.contentHash,design:current.design});}else{const current=(await services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='friend')!,{revisionId:_r,parentRevisionIds:_p,contentHash:_h,displayVersion:_v,...draft}=current;operation=services.commands.publishRelationType(draft);}
 await expect(operation).rejects.toMatchObject({code:'editorConflict'});expect(leaf).toBeDefined();expect(leaf!.save).not.toHaveBeenCalled();expect(f.files.getMarkdownFiles().some(file=>file.path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&(file.path.includes('/发布/')||file.path.endsWith('/当前.md')))).toBe(false);
});

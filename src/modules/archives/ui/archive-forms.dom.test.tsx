import { ArchiveDraftOwner } from '../services/form-drafts';
import { CategoryContent } from '../../../app/settings/react/CategoryContent';
import type DashboardPlugin from '../../../app/main';
import { afterEach, expect, test } from 'vitest';
import { fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import { ContactsApplication } from '../core/application';
import type { ContactsFile, ContactsFiles } from '../core/files';
import { archiveServices } from '../services/archive-services';
import { archiveFrontmatter, archiveMarkdown } from '../core/persist/v2/markdown';
import { textHash } from '../../../shared/storage/text-edits';
import { definitionSemantic } from '../core/definition-graph';
import { ArchiveWorkspace } from './ArchiveWorkspace';
import { ArchiveRelations } from './ArchiveRelations';
import type { UpdateRelation } from '../api';
import { ContactsPresentation } from './contacts-presentation';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ArchiveEntityForm } from './ArchiveEntityForm';
import { ArchiveFieldControl, fieldRendererRegistry } from './field-renderers';
import { conditionMatches } from '../core/form-definitions';
import { archivesSettingsPage } from './settings-page';
import type { ContactsController } from '../platform/controller';
import { SettingsStore } from '../../../shared/settings/store';
import { archivesSettings } from '../settings';

afterEach(() => setLanguage('zh'));
function fixture(root: () => string = () => '档案') {
	const content = new Map<string, string>(), entries = new Map<string, ContactsFile>();
	const files: ContactsFiles = {
		formatGuide: '', ready: async () => {}, getMarkdownFiles: () => [...entries.values()],
		getFileByPath: (path) => entries.get(path) ?? null, getAbstractFileByPath: (path) => entries.get(path) ?? null,
		read: async (file) => { if (!content.has(file.path)) throw new Error('ENOENT'); return content.get(file.path)!; },
		cachedRead: async (file) => content.get(file.path)!,
		create: async (path, raw, beforeCommit) => {
			beforeCommit?.(); if (entries.has(path)) throw new Error('EEXIST');
			const file = { path, extension: 'md', stat: { size: raw.length, mtime: 1 } };
			entries.set(path, file); content.set(path, raw); return file;
		},
		process: async (file, update, beforeCommit) => { beforeCommit?.(); const raw = update(content.get(file.path)!); content.set(file.path, raw); file.stat.mtime++; file.stat.size = raw.length; return raw; },
		createBinary: async () => { throw new Error('unused'); }, listFolder: () => [], trashFolder: async () => {},
		checkFolderEditors: async () => () => {}, captureEditors: async () => () => {},
		createFolder: async () => {}, mkdir: async () => {}, checkEditor: () => {},
	};
	const application = new ContactsApplication(files, () => ({ rootFolder: root(), maxColumns: 6, layouts: {} }));
	return { application, files, content, entries, services: archiveServices(() => application.archives) };
}
async function select(label: string, option: string) {
	fireEvent.click(screen.getByRole('combobox', { name: label }));
	fireEvent.click(await screen.findByRole('option', { name: option }));
}
async function publishForms() {
	fireEvent.click(screen.getByRole('button', { name: t('contacts.previewPublish') }));
	const dialog = await screen.findByRole('dialog');
	fireEvent.click(within(dialog).getByRole('button', { name: t('contacts.publishForms') }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

test('the production workspace creates a third type, two forms and a template without code, then preserves shared values after presentation changes', async () => {
	setLanguage('en');
	const f = fixture();
	const mounted = render(<TestProviders><ArchiveWorkspace services={f.services} /></TestProviders>);
	await screen.findByRole('combobox', { name: 'Archive type' });
	fireEvent.click(screen.getByRole('button', { name: 'New archive type' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: 'Project' } });
	fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Field 2 label' }), { target: { value: 'Code' } });
	fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Field 3 label' }), { target: { value: 'Confirmed' } });
	await select('Field 3 type', 'Boolean');
	fireEvent.click(screen.getByRole('checkbox', { name: 'Confirmed: required for completion' }));
	fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
	fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publish type' }));
	await screen.findByRole('region', { name: 'Type and form designer' });
	const type = (await f.services.catalog.snapshot()).types.find((type) => type.label === 'Project')!;
	const codeId = type.fields.find((field) => field.label === 'Code')!.fieldId;
	fireEvent.change(screen.getByRole('textbox', { name: 'Form name' }), { target: { value: 'Overview' } });
	fireEvent.click(screen.getByRole('button', { name: 'Add form' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Form name' }), { target: { value: 'Delivery' } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Code: show in this form' }));
	fireEvent.click(screen.getByRole('button', { name: 'Add creation template' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Creation template name' }), { target: { value: 'Consulting' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Code' }), { target: { value: '000123' } });
	await select('Confirmed', 'No');
	fireEvent.change(screen.getByRole('textbox', { name: 'New archive body' }), { target: { value: '\nKeep this template body\n' } });
	await publishForms();
	fireEvent.click(screen.getByRole('button', { name: 'View archives' }));
	await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive' }).disabled).toBe(false));
	fireEvent.click(screen.getByRole('button', { name: 'New archive' }));
	await screen.findByRole('region', { name: 'Archive form' });
	await select('Creation template', 'Consulting');
	fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'A Project' } });
	await select('Form', 'Delivery');
	expect(screen.queryByRole('textbox', { name: 'Code' })).toBeNull();
	await select('Form', 'Overview');
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Code' }).value).toBe('000123');
	fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
	await screen.findByText('Draft saved');
	fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
	await waitFor(async () => expect((await f.services.query.snapshot()).entities[0]?.raw).toContain('huhu-state: active'));
	const entity = (await f.services.query.snapshot()).entities[0]!;
	expect(entity.values[codeId]).toBe('000123');
	expect(entity.raw).toContain('Keep this template body');
	fireEvent.click(screen.getByRole('button', { name: 'Back' }));
	fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
	await screen.findByRole('region', { name: 'Type and form designer' });
	fireEvent.change(screen.getByRole('textbox', { name: 'Name: display label' }), { target: { value: 'Project name' } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Code: disable input' }));
	await publishForms();
	expect(f.content.get(entity.path)).toBe(entity.raw);
	mounted.unmount();
	const reopened = new ContactsApplication(f.files, () => ({ rootFolder: '档案', maxColumns: 6, layouts: {} }));
	const services = archiveServices(() => reopened.archives);
	render(<TestProviders><ArchiveWorkspace services={services} /></TestProviders>);
	fireEvent.click(await screen.findByRole('button', { name: 'A Project' }));
	await screen.findByRole('textbox', { name: 'Project name' });
	expect(screen.queryByRole('textbox', { name: 'Code' })).toBeNull();
	fireEvent.click(screen.getByText('All retained field values'));
	expect(screen.getByText('000123')).toBeTruthy();
	expect((await services.query.snapshot()).entities[0]?.values[codeId]).toBe('000123');
	reopened.dispose(); f.application.dispose();
});

test('entity forms keep dirty fields on conflict, schema/form changes and incomplete completion; keyboard leave is explicit', async () => {
	setLanguage('en');
	const f = fixture();
	await f.services.commands.publishType({ typeId: 'session', label: 'Session', folder: 'Session', titleFieldId: 'name', fields: [
		{ fieldId: 'name', storageKey: 'session-name', label: 'Name', codec: 'text', required: true },
		{ fieldId: 'needed', storageKey: 'session-needed', label: 'Needed', codec: 'text', required: true },
	] });
	const created = await f.services.commands.createEntity({ typeId: 'session', values: { name: 'Before' } });
	const forms = await f.services.catalog.forms('session'), base = await f.services.commands.beginEdit(created.entity.id);
	const mounted = render(<TestProviders><ArchiveEntityForm snapshot={forms} base={base} commands={f.services.commands} onSaved={() => {}} onLeave={() => {}} /></TestProviders>);
	fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Draft' } });
	fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
	await screen.findByRole('alert');
	await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save draft' }).disabled).toBe(false));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' }).value).toBe('Draft');
	const file = f.files.getFileByPath(created.entity.path)!;
	f.content.set(file.path, created.entity.raw.replace(/^session-name:.*$/m, 'session-name: External'));
	fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(t('contacts.conflict')));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' }).value).toBe('Draft');
	const comparison = await screen.findByRole('region', { name: 'Field conflict comparison' });
	expect(within(comparison).getByText('Before')).toBeTruthy();
	expect(within(comparison).getByText('External')).toBeTruthy();
	expect(within(comparison).getByText('Draft')).toBeTruthy();
	await act(async () => { await f.services.commands.publishForms({ typeId: 'session', baseRevisionId: null, baseContentHash: null, schemaContentHash: forms.type.contentHash, design: forms.design }); });
	fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(t('contacts.formChanged')));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' }).value).toBe('Draft');
	await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }));
	expect(screen.getByRole('button', { name: 'Keep editing' })).toBeTruthy();
	mounted.unmount(); f.application.dispose();
});

test('settings exposes the same real designer and renderer/condition registries remain closed', async () => {
	setLanguage('en');
	const f = fixture(), store = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: (fn, ms) => setTimeout(fn, ms), clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>) }, debounceMs: 0 });
	await store.load(); const settings = store.bind('archives', archivesSettings);
	const Page = archivesSettingsPage({ workspace: { containerEl: document.body }, vault: { on: () => ({}), offref: () => {}, getAllLoadedFiles: () => [] } } as never, {} as ContactsController, settings, f.services);
	const mounted = render(<TestProviders><Page /></TestProviders>);
	expect(await screen.findByRole('button', { name: 'New archive type' })).toBeTruthy();
	expect(Object.keys(fieldRendererRegistry)).toHaveLength(13);
	expect(conditionMatches({ op: 'and', conditions: [{ op: 'eq', fieldId: 'flag', value: false }, { op: 'contains', fieldId: 'tags', value: 'A' }] }, { flag: false, tags: ['A'] })).toBe(true);
	expect(() => conditionMatches({ op: 'script', script: 'throw new Error()' } as never, {})).toThrow();
	mounted.unmount();
	render(<TestProviders><ArchiveFieldControl field={{ fieldId: 'bad', storageKey: 'bad', label: 'Bad codec', codec: 'script' as never }} value="draft" onChange={() => {}} /></TestProviders>);
	expect(screen.getByRole('alert').textContent).toContain('Bad codec');
	await store.dispose(); f.application.dispose();
});


test('the real settings category switch restores a new type draft without publishing it', async () => {
	setLanguage('en'); const f = fixture();
	const store = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: (fn, ms) => setTimeout(fn, ms), clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>) } });
	await store.load(); const settings = store.bind('archives', archivesSettings);
	const drafts = new ArchiveDraftOwner();
	const instance = { settingsPage: async () => archivesSettingsPage({ workspace: { containerEl: document.body }, vault: { on: () => ({}), offref: () => {}, getAllLoadedFiles: () => [] } } as never, {} as ContactsController, settings, f.services, drafts) };
	const plugin = { manifest: { version: 'test' }, moduleInstance: () => instance, activateModule: async () => {} } as unknown as DashboardPlugin;
	const node = (id: string) => <TestProviders><CategoryContent plugin={plugin} section={{ id, label: id }} navigate={() => {}} /></TestProviders>;
	const mounted = render(node('contacts'));
	fireEvent.click(await screen.findByRole('button', { name: 'New archive type' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: 'UNSAVED TYPE DRAFT' } });
	mounted.rerender(node('about')); mounted.rerender(node('contacts'));
	expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Type name' })).value).toBe('UNSAVED TYPE DRAFT');
	expect((await f.services.catalog.snapshot()).types.some((type) => type.label === 'UNSAVED TYPE DRAFT')).toBe(false);
	mounted.unmount(); await store.dispose(); f.application.dispose();
});

test('duplicate identity rows browse the exact selected file and remain read-only', async () => {
	setLanguage('en'); const f = fixture();
	const created = await f.services.commands.createEntity({ typeId: 'person', values: { name: 'FIRST' } });
	await f.files.create('档案/个人档案/SECOND/基本信息.md', created.entity.raw.replaceAll('FIRST', 'SECOND'));
	f.application.archives.invalidate();
	render(<TestProviders><ArchiveWorkspace services={f.services} /></TestProviders>);
	fireEvent.click(await screen.findByRole('button', { name: /^SECOND .*Read-only$/ }));
	const form = await screen.findByRole('region', { name: 'Archive form' });
	expect(within(form).getAllByText('SECOND').length).toBeGreaterThan(0);
	expect(within(form).getByRole<HTMLButtonElement>('button', { name: 'Save draft' }).disabled).toBe(true);
	f.application.dispose();
});

async function categoryHarness(f: ReturnType<typeof fixture>, drafts = new ArchiveDraftOwner()) {
	const store = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: (fn, ms) => setTimeout(fn, ms), clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>) } });
	await store.load(); const settings = store.bind('archives', archivesSettings);
	const instance = { settingsPage: async () => archivesSettingsPage({ workspace: { containerEl: document.body }, vault: { on: () => ({}), offref: () => {}, getAllLoadedFiles: () => [] } } as never, {} as ContactsController, settings, f.services, drafts) };
	const plugin = { manifest: { version: 'test' }, moduleInstance: () => instance, activateModule: async () => {} } as unknown as DashboardPlugin;
	const node = (id: string) => <TestProviders><CategoryContent plugin={plugin} section={{ id, label: id }} navigate={() => {}} /></TestProviders>;
	return { node, store, settings, drafts };
}

test('settings category navigation retains definition and template drafts; explicit discard and root isolation are real owner operations', async () => {
	setLanguage('en'); const f = fixture(), h = await categoryHarness(f);
	const mounted = render(h.node('contacts'));
	const label = await screen.findByRole('textbox', { name: 'Name: display label' });
	fireEvent.change(label, { target: { value: 'UNSAVED LABEL' } });
	fireEvent.click(screen.getByRole('button', { name: 'Add creation template' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Creation template name' }), { target: { value: 'UNSAVED TEMPLATE' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'UNSAVED DEFAULT VALUE' } });
	mounted.rerender(h.node('about')); mounted.rerender(h.node('contacts'));
	expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('UNSAVED LABEL');
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Creation template name' }).value).toBe('UNSAVED TEMPLATE');
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' }).value).toBe('UNSAVED DEFAULT VALUE');
	expect((await f.services.catalog.forms('person')).revisionId).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
	await waitFor(() => expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name: display label' }).value).toBe('Name'));
	expect(screen.queryByRole('textbox', { name: 'Creation template name' })).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'New archive type' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: 'ROOT A DRAFT' } });
	mounted.rerender(h.node('about'));
	const root = h.settings.get().rootFolder;
	await act(async () => { await h.settings.update((settings) => { settings.rootFolder = 'AnotherRoot'; }); });
	mounted.rerender(h.node('contacts'));
	await screen.findByRole('button', { name: 'New archive type' });
	expect(screen.queryByRole('textbox', { name: 'Type name' })).toBeNull();
	mounted.rerender(h.node('about'));
	await act(async () => { await h.settings.update((settings) => { settings.rootFolder = root; }); });
	mounted.rerender(h.node('contacts'));
	expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Type name' })).value).toBe('ROOT A DRAFT');
	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
	await screen.findByRole('button', { name: 'New archive type' });
	fireEvent.click(screen.getByRole('button', { name: 'New archive type' }));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Type name' }).value).toBe('');
	mounted.unmount(); h.drafts.dispose(); await h.store.dispose(); f.application.dispose();
});

test.each([
	{ mode: 'type', fail: false }, { mode: 'type', fail: true },
	{ mode: 'forms', fail: false }, { mode: 'forms', fail: true },
])('settings navigation during $mode publication retains its actual result (failure=$fail) without replay', async ({ mode, fail }) => {
	setLanguage('en'); const f = fixture(), h = await categoryHarness(f);
	let release!: () => void, entered!: () => void, calls = 0;
	const barrier = new Promise<void>((resolve) => { release = resolve; }), enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
	if (mode === 'type') {
		const original = f.services.commands.publishType;
		f.services.commands.publishType = async (input) => { calls++; entered(); await barrier; if (fail) throw new Error('injected EIO'); return original(input); };
	} else {
		const original = f.services.commands.publishForms;
		f.services.commands.publishForms = async (input) => { calls++; entered(); await barrier; if (fail) throw new Error('injected EIO'); return original(input); };
	}
	const mounted = render(h.node('contacts'));
	await screen.findByRole('button', { name: 'New archive type' });
	if (mode === 'type') {
		fireEvent.click(screen.getByRole('button', { name: 'New archive type' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: 'BUSY TYPE' } });
	} else fireEvent.change(await screen.findByRole('textbox', { name: 'Name: display label' }), { target: { value: 'BUSY LABEL' } });
	fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
	fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: mode === 'type' ? 'Publish type' : 'Publish forms' }));
	await enteredPromise; mounted.rerender(h.node('about')); mounted.rerender(h.node('contacts'));
	const restored = await screen.findByRole<HTMLInputElement>('textbox', { name: mode === 'type' ? 'Type name' : 'Name: display label' });
	expect(restored.value).toBe(mode === 'type' ? 'BUSY TYPE' : 'BUSY LABEL');
	expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Preview publication impact' }).disabled).toBe(true);
	expect(calls).toBe(1); await act(async () => { release(); });
	if (fail) {
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('injected EIO'));
		expect(screen.getByRole<HTMLInputElement>('textbox', { name: mode === 'type' ? 'Type name' : 'Name: display label' }).value).toBe(mode === 'type' ? 'BUSY TYPE' : 'BUSY LABEL');
	} else if (mode === 'type') {
		await screen.findByRole('region', { name: 'Type and form designer' });
		expect((await f.services.catalog.snapshot()).types.some((type) => type.label === 'BUSY TYPE')).toBe(true);
	} else await waitFor(async () => expect((await f.services.catalog.forms('person')).design.fieldSettings[0]?.label).toBe('BUSY LABEL'));
	mounted.rerender(h.node('about')); mounted.rerender(h.node('contacts'));
	await screen.findByRole('button', { name: 'New archive type' }); expect(calls).toBe(1);
	if (fail) await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('injected EIO'));
	mounted.unmount(); h.drafts.dispose(); await h.store.dispose(); f.application.dispose();
});

test('explicit module draft-owner disposal clears pending drafts and ignores late async completions', async () => {
	setLanguage('en'); const f = fixture(), h = await categoryHarness(f);
	let release!: () => void;
	const barrier = new Promise<void>((resolve) => { release = resolve; }), original = f.services.commands.publishType;
	f.services.commands.publishType = async (input) => { await barrier; return original(input); };
	const mounted = render(h.node('contacts'));
	fireEvent.click(await screen.findByRole('button', { name: 'New archive type' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: 'DISPOSED DRAFT' } });
	fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
	fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publish type' }));
	mounted.unmount(); h.drafts.dispose(); f.application.dispose();
	await act(async () => { release(); });
	const scope = 'settings:' + h.settings.get().rootFolder;
	expect(h.drafts.get(scope + '/new/name', 'CLEARED')).toBe('CLEARED');
	expect(h.drafts.get(scope + '/new/error', 'CLEARED')).toBe('CLEARED');
	await h.store.dispose();
});

test('same-name duplicate files open by exact path and become normally editable only after ambiguity is removed', async () => {
	setLanguage('en'); const f = fixture();
	const created = await f.services.commands.createEntity({ typeId: 'person', values: { name: 'SAME NAME' } });
	const secondPath = '档案/个人档案/Second exact path/基本信息.md';
	await f.files.create(secondPath, created.entity.raw + '\nSECOND FILE SOURCE\n'); f.application.archives.invalidate();
	let editableReads = 0; const beginEdit = f.services.commands.beginEdit;
	f.services.commands.beginEdit = async (id) => { editableReads++; return beginEdit(id); };
	render(<TestProviders><ArchiveWorkspace services={f.services} /></TestProviders>);
	fireEvent.click(await screen.findByRole('button', { name: 'SAME NAME ' + secondPath + ' Read-only' }));
	let form = await screen.findByRole('region', { name: 'Archive form' });
	expect(within(form).getByText(secondPath)).toBeTruthy(); expect(form.textContent).toContain('SECOND FILE SOURCE'); expect(editableReads).toBe(0);
	fireEvent.click(screen.getByRole('button', { name: 'Back' }));
	fireEvent.click(await screen.findByRole('button', { name: 'SAME NAME ' + created.entity.path + ' Read-only' }));
	form = await screen.findByRole('region', { name: 'Archive form' }); expect(within(form).getByText(created.entity.path)).toBeTruthy(); expect(form.textContent).not.toContain('SECOND FILE SOURCE');
	fireEvent.click(screen.getByRole('button', { name: 'Back' }));
	await act(async () => { f.entries.delete(secondPath); f.content.delete(secondPath); f.application.archives.invalidate(); });
	fireEvent.click(await screen.findByRole('button', { name: 'SAME NAME' }));
	await screen.findByRole('textbox', { name: 'Name' }); expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save draft' }).disabled).toBe(false);
	expect(editableReads).toBe(1); f.application.dispose();
});


async function workbenchHarness() {
	const store = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: (fn, ms) => setTimeout(fn, ms), clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>) } });
	await store.load(); const settings = store.bind('archives', archivesSettings), rootA = settings.get().rootFolder;
	const f = fixture(() => settings.get().rootFolder), drafts = new ArchiveDraftOwner();
	const controller = { get root() { return settings.get().rootFolder; }, get loading() { return f.application.loading; }, get index() { return f.application.index; }, get error() { return f.application.error; }, subscribe: (listener: () => void) => f.application.subscribe(listener), ensureLoaded: () => f.application.ensureLoaded() } as unknown as ContactsController;
	const contentEl = document.createElement('div'); document.body.append(contentEl);
	contentEl.addClass = (...names) => contentEl.classList.add(...names);
	contentEl.removeClass = (...names) => contentEl.classList.remove(...names);
	const surface = new ContactsPresentation({ contentEl, containerEl: contentEl, app: { workspace: { requestSaveLayout: () => {} } }, leaf: {}, close: () => {} } as unknown as NativeSurfaceContext, { controller, drafts, archives: f.services, settings });
	const cleanup: Array<() => void> = [];
	// Obsidian's Component stub has no lifecycle primitives; keep their real registration/disposal semantics here.
	surface.register = (dispose) => { cleanup.push(dispose); };
	surface.registerDomEvent = (element: EventTarget, name: string, handler: EventListener, options?: boolean | AddEventListenerOptions) => { element.addEventListener(name, handler, options); cleanup.push(() => element.removeEventListener(name, handler, options)); };
	await act(async () => { surface.openGeneric(); await surface.onOpen(); });
	return { ...f, surface, settings, drafts, rootA,
		async root(value: string) { await act(async () => { await settings.update((current) => { current.rootFolder = value; }); }); },
		async close() { await act(async () => { await surface.onClose(); }); cleanup.reverse().forEach((dispose) => dispose()); contentEl.remove(); drafts.dispose(); f.application.dispose(); await store.dispose(); },
	};
}

test('the real workbench root switch isolates dirty locks and leave confirmation while restoring the original root draft', async () => {
	setLanguage('en'); const h = await workbenchHarness();
	try {
		await screen.findByRole('combobox', { name: 'Archive type' });
		fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
		fireEvent.change(await screen.findByRole('textbox', { name: 'Name: display label' }), { target: { value: 'ROOT A LABEL DRAFT' } });
		let leave!: Promise<boolean>;
		await act(async () => { leave = h.surface.leaveEditor(); });
		expect(screen.getByRole('alert').textContent).toContain(t('contacts.unsavedForm'));
		await h.root('RootB');
		await screen.findByRole('combobox', { name: 'Archive type' });
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Types and forms' }).disabled).toBe(false);
		expect(screen.queryByRole('alert')).toBeNull(); expect(await leave).toBe(false);
		fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('Name');
		await h.root(h.rootA);
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('ROOT A LABEL DRAFT');
		expect(screen.queryByRole('alert')).toBeNull();
	} finally { await h.close(); }
});

test.each([
	{ mode: 'type', fail: false }, { mode: 'type', fail: true },
	{ mode: 'forms', fail: false }, { mode: 'forms', fail: true },
])('the real workbench keeps late root A $mode publication results out of root B (failure=$fail)', async ({ mode, fail }) => {
	setLanguage('en'); const h = await workbenchHarness();
	let release!: () => void, entered!: () => void, calls = 0;
	const barrier = new Promise<void>((resolve) => { release = resolve; }), committed = new Promise<void>((resolve) => { entered = resolve; });
	if (mode === 'type') {
		const original = h.services.commands.publishType;
		h.services.commands.publishType = async (input) => { calls++; const result = fail ? undefined : await original(input); entered(); await barrier; if (fail) throw new Error('ROOT A EIO'); return result!; };
	} else {
		const original = h.services.commands.publishForms;
		h.services.commands.publishForms = async (input) => { calls++; const result = fail ? undefined : await original(input); entered(); await barrier; if (fail) throw new Error('ROOT A EIO'); return result!; };
	}
	try {
		await screen.findByRole('combobox', { name: 'Archive type' });
		fireEvent.click(screen.getByRole('button', { name: mode === 'type' ? 'New archive type' : 'Types and forms' }));
		fireEvent.change(await screen.findByRole('textbox', { name: mode === 'type' ? 'Type name' : 'Name: display label' }), { target: { value: 'ROOT A BUSY DRAFT' } });
		fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
		fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: mode === 'type' ? 'Publish type' : 'Publish forms' }));
		await act(async () => { await committed; });
		await h.root('RootB');
		await screen.findByRole('combobox', { name: 'Archive type' });
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Types and forms' }).disabled).toBe(false);
		expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByRole('alert')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('Name');
		await act(async () => { release(); await barrier; });
		expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name: display label' }).value).toBe('Name');
		expect(screen.queryByRole('alert')).toBeNull(); expect(screen.queryByRole('textbox', { name: 'Type name' })).toBeNull();
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		expect((await h.services.catalog.snapshot()).types.some((type) => type.label === 'ROOT A BUSY DRAFT')).toBe(false);
		expect((await h.services.catalog.forms('person')).design.fieldSettings[0]?.label).toBe('Name');
		await h.root(h.rootA);
		if (fail) {
			expect((await screen.findByRole<HTMLInputElement>('textbox', { name: mode === 'type' ? 'Type name' : 'Name: display label' })).value).toBe('ROOT A BUSY DRAFT');
			await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('ROOT A EIO'));
		} else if (mode === 'type') {
			await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Type name' })).toBeNull());
			await screen.findByRole('region', { name: 'Type and form designer' });
			expect((await h.services.catalog.snapshot()).types.some((type) => type.label === 'ROOT A BUSY DRAFT')).toBe(true);
		} else await waitFor(() => expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name: display label' }).value).toBe('ROOT A BUSY DRAFT'));
		expect(calls).toBe(1);
	} finally { release(); await h.close(); }
});

test.each([false, true])('the real workbench ignores late root A form requests and errors in root B (failure=%s)', async (fail) => {
	setLanguage('en'); const h = await workbenchHarness();
	let release!: () => void, entered!: () => void;
	const barrier = new Promise<void>((resolve) => { release = resolve; }), pending = new Promise<void>((resolve) => { entered = resolve; });
	try {
		await screen.findByRole('combobox', { name: 'Archive type' });
		fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
		fireEvent.change(await screen.findByRole('textbox', { name: 'Name: display label' }), { target: { value: 'ROOT A CACHED DRAFT' } });
		await h.root('RootB'); await screen.findByRole('combobox', { name: 'Archive type' });
		const original = h.services.catalog.forms;
		const old = await original('person');
		await h.services.commands.publishForms({ typeId: 'person', baseRevisionId: old.revisionId, baseContentHash: old.contentHash, schemaContentHash: old.type.contentHash,
			design: { ...old.design, fieldSettings: old.design.fieldSettings.map((field) => field.fieldId === 'name' ? { ...field, label: 'ROOT B LABEL' } : field) } });
		let held = false;
		h.services.catalog.forms = async (id) => {
			const root = h.settings.get().rootFolder, result = await original(id);
			if (root === h.rootA && !held) { held = true; entered(); await barrier; if (fail) throw new Error('OLD ROOT A REQUEST'); }
			return result;
		};
		await h.root(h.rootA); await pending;
		await h.root('RootB');
		fireEvent.click(await screen.findByRole('button', { name: 'Types and forms' }));
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('ROOT B LABEL');
		await act(async () => { release(); });
		expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name: display label' }).value).toBe('ROOT B LABEL');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		await h.root(h.rootA);
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('ROOT A CACHED DRAFT');
		expect(screen.queryByRole('alert')).toBeNull();
	} finally { release?.(); await h.close(); }
});

test('the real workbench consumes an unchanged publication without leaving a dirty lock or resetting a later draft', async () => {
	setLanguage('en'); const h = await workbenchHarness();
	try {
		await screen.findByRole('combobox', { name: 'Archive type' });
		fireEvent.click(screen.getByRole('button', { name: 'Types and forms' }));
		await screen.findByRole('textbox', { name: 'Name: display label' });
		await publishForms();
		await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false));
		expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Name: display label' }).value).toBe('Name');
		fireEvent.change(screen.getByRole('textbox', { name: 'Name: display label' }), { target: { value: 'LATER DRAFT' } });
		await h.root('RootB'); await screen.findByRole('combobox', { name: 'Archive type' });
		await h.root(h.rootA);
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Name: display label' })).value).toBe('LATER DRAFT');
	} finally { await h.close(); }
});

test('the real workspace relation dialog creates one fact, edits it from the inverse endpoint and archives without changing v1 owners', async () => {
	setLanguage('en'); const f = fixture();
	const person = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Relation Person' } })).entity;
	const company = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Relation Company' } })).entity;
	await f.services.commands.publishType({ typeId: 'project', label: 'Project', folder: 'Projects', titleFieldId: 'name', fields: [{ fieldId: 'name', storageKey: 'project-name', label: 'Name', codec: 'text' }] });
	const project = (await f.services.commands.createEntity({ typeId: 'project', values: { name: 'Relation Project' } })).entity;
	const drafts = new ArchiveDraftOwner();
	const node = (path: string) => <TestProviders><ArchiveWorkspace key={path} services={f.services} drafts={drafts} draftScope={path} initialPath={path} /></TestProviders>;
	const mounted = render(node(project.path));
	await screen.findByRole('region', { name: 'Independent relations' });
	await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add relationship' }).disabled).toBe(false));
	fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }));
	await select('Relation type', 'Participates in');
	await select('Related archive', 'Relation Person');
	fireEvent.change(screen.getByRole('textbox', { name: 'Role' }), { target: { value: 'Lead' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Valid from' }), { target: { value: '2024-05' } });
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	const relation = (await f.services.query.relations()).relations[0]!;
	expect(relation.validFrom).toEqual({ value: '2024-05', precision: 'month' });
	mounted.rerender(node(person.path));
	await screen.findByText('Relation Project · Participants');
	fireEvent.click(screen.getByRole('button', { name: 'Edit · ' + relation.id }));
	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Role' }).value).toBe('Lead');
	fireEvent.change(within(dialog).getByRole('textbox', { name: 'Role' }), { target: { value: 'Coordinator' } });
	fireEvent.click(within(dialog).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect((await f.services.query.relations(project.id)).relations[0]?.values.role).toBe('Coordinator');
	fireEvent.click(screen.getByRole('button', { name: 'Edit · ' + relation.id }));
	fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Archive relation' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect((await f.services.query.relations()).relations).toHaveLength(1);
	expect((await f.services.query.relations()).relations[0]?.lifecycle).toBe('archived');
	expect(f.content.get(person.path)).toBe(person.raw); expect(f.content.get(company.path)).toBe(company.raw);
	mounted.unmount(); drafts.dispose(); f.application.dispose();
});

test('the real legacy detail entry opens the same relation editor and root switches preserve its draft without locking the other root', async () => {
	setLanguage('en'); const h = await workbenchHarness();
	try {
		const person = (await h.services.commands.createEntity({ typeId: 'person', values: { name: 'Legacy relation owner' } })).entity;
		await screen.findByRole('button', { name: 'New archive type' });
		fireEvent.click(screen.getByRole('button', { name: 'Back' }));
		await act(async () => { h.surface.select(person.path); });
		fireEvent.click(await screen.findByRole('button', { name: 'Independent relations' }));
		await screen.findByRole('region', { name: 'Independent relations' });
		await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add relationship' }).disabled).toBe(false));
		fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }));
		await select('Relation type', 'Employment');
		fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'UNSAVED RELATION ROLE' } });
		await h.root('RootB');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		await h.root(h.rootA);
		expect((await screen.findByRole<HTMLInputElement>('textbox', { name: 'Title' })).value).toBe('UNSAVED RELATION ROLE');
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('contacts.discardDraft') }));
		expect((await h.services.query.relations()).relations).toHaveLength(0);
	} finally { await h.close(); }
});

test('relation command failures retain the original dialog values and explicit retry identity; a no-code custom relationship type is usable', async () => {
	setLanguage('en'); const f = fixture(), drafts = new ArchiveDraftOwner();
	const person = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Person' } })).entity, company = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Company' } })).entity;
	const mounted = render(<TestProviders><ArchiveWorkspace services={f.services} drafts={drafts} initialPath={person.path} /></TestProviders>);
	await screen.findByRole('region', { name: 'Independent relations' });
	await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New relation type' }).disabled).toBe(false));
	fireEvent.click(screen.getByRole('button', { name: 'New relation type' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Relation type name' }), { target: { value: 'Advises' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Inverse display name' }), { target: { value: 'Advisers' } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Source archive types · Any archive type' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Source archive types · ' + t('contacts.person') }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Target archive types · Any archive type' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Target archive types · ' + t('contacts.company') }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Forbid cycles during overlapping effective periods' }));
	await select('Count relations in', 'Current relations');
	fireEvent.change(screen.getByRole('textbox', { name: 'Maximum targets per source' }), { target: { value: '1' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Maximum sources per target' }), { target: { value: '2' } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Include drafts in cardinality and duplicate checks' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Role: required for completion' }));
	fireEvent.click(screen.getByRole('button', { name: 'Add relation attribute' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Attribute 2 name' }), { target: { value: 'Fee' } });
	await select('Attribute 2 type', 'Money');
	fireEvent.click(screen.getByRole('button', { name: 'Add context role' }));
	fireEvent.change(screen.getByRole('textbox', { name: 'Context role 1 name' }), { target: { value: 'Contract company' } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Context role 1 archive types · Any archive type' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Context role 1 archive types · ' + t('contacts.company') }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Context role 1 is required for completion' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Compare context: Contract company' }));
	await select('When a referenced archive is deleted', 'Restrict archive deletion');
	fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
		fireEvent.click(screen.getByRole('button', { name: 'Publish relation type' }));
	await screen.findByRole('combobox', { name: 'Relation type' });
	await select('Related archive', 'Company');
	await select('Context · Contract company', 'Company');
	fireEvent.change(screen.getByRole('textbox', { name: 'Role' }), { target: { value: 'DRAFT ROLE' } });
	const requests: Array<{ id: string; operationId: string }> = [], original = f.services.commands.createRelation;
	let fail = true;
	f.services.commands.createRelation = async (request) => { requests.push(request); if (fail) throw new Error('native endpoint changed'); return original(request); };
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('native endpoint changed'));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Role' }).value).toBe('DRAFT ROLE');
	fail = false;
	await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole<HTMLButtonElement>('button', { name: 'Mark complete' }).disabled).toBe(false));
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(requests[0]?.id).toBe(requests[1]?.id); expect(requests[0]?.operationId).toBe(requests[1]?.operationId);
	expect((await f.services.query.relations(company.id)).projections[0]?.label).toBe('Advisers');
	const definition = (await f.services.catalog.relationTypes()).types.find((type) => type.label === 'Advises')!;
	expect(definition.sourceTypes).toEqual(['person']); expect(definition.targetTypes).toEqual(['company']);
	expect(definition.cardinality).toEqual({ scope: 'current', includeDrafts: true, sourceMax: 1, targetMax: 2 });
	expect(definition.fields.find((field) => field.label === 'Fee')?.codec).toBe('money'); expect(definition.fields[0]?.required).toBe(true);
	expect(definition.contextRoles[0]).toMatchObject({ label: 'Contract company', types: ['company'], required: true });
	expect(definition.duplicates.contextRoles).toEqual([definition.contextRoles[0]!.role]);
	expect(definition).toMatchObject({ temporal: true, acyclic: true, allowSelf: false, deletePolicy: 'restrict', direction: 'directed' });
	mounted.unmount(); drafts.dispose(); f.application.dispose();
});

test.each([{ mode: 'relation', fail: false }, { mode: 'relation', fail: true }, { mode: 'definition', fail: false }, { mode: 'definition', fail: true }])('late $mode results belong to the original workbench root and never replay (failure=$fail)', async ({ mode, fail }) => {
	setLanguage('en'); const h = await workbenchHarness(); let release!: () => void, entered!: () => void, calls = 0;
	const barrier = new Promise<void>((resolve) => { release = resolve; }), pending = new Promise<void>((resolve) => { entered = resolve; });
	try {
		const person = (await h.services.commands.createEntity({ typeId: 'person', values: { name: 'Busy Person' } })).entity;
		await h.services.commands.createEntity({ typeId: 'company', values: { name: 'Busy Company' } });
		await act(async () => { h.surface.openGeneric(person.path); });
		await screen.findByRole('region', { name: 'Independent relations' });
		await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add relationship' }).disabled).toBe(false));
		if (mode === 'relation') {
			const original = h.services.commands.createRelation;
			h.services.commands.createRelation = async (input) => { calls++; const result = fail ? undefined : await original(input); entered(); await barrier; if (fail) throw new Error('ROOT A RELATION EIO'); return result!; };
			fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }));
			await select('Related archive', 'Busy Company');
			fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'BUSY ROLE' } });
			fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
		} else {
			const original = h.services.commands.publishRelationType;
			h.services.commands.publishRelationType = async (input) => { calls++; const result = fail ? undefined : await original(input); entered(); await barrier; if (fail) throw new Error('ROOT A RELATION EIO'); return result!; };
			fireEvent.click(screen.getByRole('button', { name: 'New relation type' }));
			fireEvent.change(screen.getByRole('textbox', { name: 'Relation type name' }), { target: { value: 'BUSY DEFINITION' } });
			fireEvent.change(screen.getByRole('textbox', { name: 'Inverse display name' }), { target: { value: 'BUSY INVERSE' } });
			fireEvent.click(screen.getByRole('button', { name: 'Preview publication impact' }));
		fireEvent.click(screen.getByRole('button', { name: 'Publish relation type' }));
		}
		await act(async () => { await pending; });
		await h.root('RootB');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'New archive type' }).disabled).toBe(false);
		await act(async () => { release(); });
		expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByRole('alert')).toBeNull();
		await h.root(h.rootA);
		await screen.findByRole('region', { name: 'Independent relations', hidden: true });
		if (fail) {
			await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('ROOT A RELATION EIO'));
			expect(screen.getByRole<HTMLInputElement>('textbox', { name: mode === 'relation' ? 'Title' : 'Relation type name' }).value).toBe(mode === 'relation' ? 'BUSY ROLE' : 'BUSY DEFINITION');
		} else if (mode === 'relation') { await screen.findByText('title: BUSY ROLE'); expect((await h.services.query.relations()).relations).toHaveLength(1); }
		else { await screen.findByRole('combobox', { name: 'Relation type' }); expect((await h.services.catalog.relationTypes()).types.some((type) => type.label === 'BUSY DEFINITION')).toBe(true); }
		expect(calls).toBe(1);
	} finally { release?.(); await h.close(); }
});

test('symmetric relation projections retain the declared inverse display name without creating another fact', async () => {
	setLanguage('en'); const f = fixture();
	const first = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Peer A' } })).entity, second = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Peer B' } })).entity;
	const type = await f.services.commands.publishRelationType({ relationTypeId: 'mutual', label: 'Peer of', inverseLabel: 'Peers', direction: 'symmetric', sourceTypes: ['person'], targetTypes: ['person'], fields: [], temporal: true, allowSelf: false, acyclic: false,
		cardinality: { sourceMax: 1, targetMax: 1, scope: 'current', includeDrafts: false }, duplicates: { policy: 'overlap', fieldIds: [], contextRoles: [] }, contextRoles: [], deletePolicy: 'retain' });
	await f.services.commands.createRelation({ id: 'mutual-1', operationId: 'mutual-operation', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: first.id, targetId: second.id, values: {}, status: 'current', intent: 'complete' });
	const mounted = render(<TestProviders><ArchiveWorkspace services={f.services} initialPath={second.path} /></TestProviders>);
	await screen.findByText('Peer A · Peers');
	expect((await f.services.query.relations(second.id)).relations).toHaveLength(1);
	mounted.unmount(); f.application.dispose();
});


async function relationUiFixture() {
	const f = fixture(), person = (await f.services.commands.createEntity({ typeId: 'person', values: { name: 'Merge Person' } })).entity,
		company = (await f.services.commands.createEntity({ typeId: 'company', values: { name: 'Merge Company' } })).entity;
	const type = await f.services.commands.publishRelationType({ relationTypeId: 'merge-relation', label: 'Works with', inverseLabel: 'Collaborators', direction: 'directed', sourceTypes: ['person'], targetTypes: ['company'], fields: [{ fieldId: 'role', storageKey: 'merge-role', label: 'Role', codec: 'text' }], temporal: true, allowSelf: false, acyclic: false,
		cardinality: { scope: 'current', includeDrafts: false }, duplicates: { policy: 'allow', fieldIds: [], contextRoles: [] }, contextRoles: [{ role: 'company', label: 'Company context', types: ['company'], required: false }], deletePolicy: 'retain' });
	const created = await f.services.commands.createRelation({ id: 'merge-edge', operationId: 'merge-operation', relationTypeId: type.relationTypeId, schemaRevisionId: type.revisionId, schemaContentHash: type.contentHash, sourceId: person.id, targetId: company.id, values: { role: 'Before' }, contextRefs: { company: company.id }, status: 'current', validFrom: { value: '2024-05', precision: 'month' }, intent: 'complete' });
	return { ...f, person, company, created, drafts: new ArchiveDraftOwner() };
}
test.each(['empty', 'error', 'diagnostics'])('a late old relation %s load cannot overwrite a newer inverse-end success', async (oldOutcome) => {
	setLanguage('en'); const f = await relationUiFixture();
	const base = await f.services.commands.beginRelationEdit(f.created.relation.id);
	await f.services.commands.updateRelation({ base, changes: { values: { role: 'LATEST' } }, intent: 'complete' });
	const latest = await f.services.query.relations(f.company.id), original = f.services.query.relations;
	let release!: () => void, first = true, notify!: () => void;
	const barrier = new Promise<void>((resolve) => { release = resolve; });
	f.services.query.relations = async (id) => { if (!first) return original(id); first = false; await barrier; if (oldOutcome === 'error') throw new Error('OLD READ FAILURE'); return { relations: [], projections: [], diagnostics: oldOutcome === 'diagnostics' ? [{ path: 'old.md', code: 'relationIncomplete' }] : [], isComplete: oldOutcome !== 'diagnostics' }; };
	f.services.query.subscribe = (listener) => { notify = listener; return () => {}; };
	const mounted = render(<TestProviders><ArchiveRelations services={f.services} entity={f.company} drafts={f.drafts} scope="load-order" /></TestProviders>);
	await act(async () => { notify(); });
	await screen.findByText('role: LATEST');
	await act(async () => { release(); });
	expect(screen.getByText('role: LATEST')).toBeTruthy(); expect(screen.queryByText('No independent relations yet.')).toBeNull();
	expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add relationship' }).disabled).toBe(false);
	expect(latest.projections[0]?.direction).toBe('incoming');
	mounted.unmount(); f.drafts.dispose(); f.application.dispose();
});

test.each(['status', 'validFrom', 'validTo', 'contextRefs'])('the real relation form merges a role edit with an external %s change by omitting untouched metadata', async (key) => {
	setLanguage('en'); const f = await relationUiFixture();
	const mounted = render(<TestProviders><ArchiveRelations services={f.services} entity={f.person} drafts={f.drafts} scope="merge" /></TestProviders>);
	fireEvent.click(await screen.findByRole('button', { name: 'Edit · merge-edge' }));
	await screen.findByRole('dialog');
	const base = await f.services.commands.beginRelationEdit('merge-edge');
	const external: UpdateRelation['changes'] = key === 'status' ? { status: 'past' } : key === 'validFrom' ? { validFrom: { value: '2023-04', precision: 'month' } }
		: key === 'validTo' ? { status: 'past', validTo: { value: '2025-06', precision: 'month' } } : { contextRefs: {} };
	await act(async () => { await f.services.commands.updateRelation({ base, changes: external, intent: 'complete' }); });
	let submitted: UpdateRelation | undefined; const update = f.services.commands.updateRelation;
	f.services.commands.updateRelation = async (request) => { submitted = request; return update(request); };
	fireEvent.change(screen.getByRole('textbox', { name: 'Role' }), { target: { value: 'USER ROLE' } });
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(Object.keys(submitted!.changes)).toEqual(['values']);
	const current = (await f.services.query.relations()).relations[0]!;
	expect(current.values.role).toBe('USER ROLE');
	for (const [key, value] of Object.entries(external)) expect(Reflect.get(current, key)).toEqual(value);
	mounted.unmount(); f.drafts.dispose(); f.application.dispose();
});

test('the real relation form submits explicit date/context clears and preserves a genuinely conflicting metadata draft', async () => {
	setLanguage('en'); const f = await relationUiFixture();
	const base = await f.services.commands.beginRelationEdit('merge-edge');
	await f.services.commands.updateRelation({ base, changes: { status: 'past', validTo: { value: '2025-06', precision: 'month' } }, intent: 'complete' });
	const mounted = render(<TestProviders><ArchiveRelations services={f.services} entity={f.person} drafts={f.drafts} scope="clear" /></TestProviders>);
	fireEvent.click(await screen.findByRole('button', { name: 'Edit · merge-edge' }));
	await screen.findByRole('dialog');
	fireEvent.change(screen.getByRole('textbox', { name: 'Valid from' }), { target: { value: '' } });
	fireEvent.change(screen.getByRole('textbox', { name: 'Valid to' }), { target: { value: '' } });
	await select('Context · Company context', t('contacts.unfilled'));
	let submitted: UpdateRelation | undefined; const update = f.services.commands.updateRelation;
	f.services.commands.updateRelation = async (request) => { submitted = request; return update(request); };
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(submitted!.changes).toEqual({ values: {}, contextRefs: {}, validFrom: null, validTo: null });
	let current = (await f.services.query.relations()).relations[0]!;
	expect(current.validFrom).toBeUndefined(); expect(current.validTo).toBeUndefined(); expect(current.contextRefs).toEqual({}); expect(current.status).toBe('past');
	fireEvent.click(screen.getByRole('button', { name: 'Edit · merge-edge' }));
	await screen.findByRole('dialog');
	fireEvent.change(screen.getByRole('textbox', { name: 'Valid from' }), { target: { value: '2022-03' } });
	const latestBase = await f.services.commands.beginRelationEdit('merge-edge');
	await act(async () => { await update({ base: latestBase, changes: { validFrom: { value: '2023-04', precision: 'month' } }, intent: 'complete' }); });
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark complete' }));
	await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain(t('contacts.conflict')));
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Valid from' }).value).toBe('2022-03');
	current = (await f.services.query.relations()).relations[0]!; expect(current.validFrom?.value).toBe('2023-04');
	mounted.unmount(); f.drafts.dispose(); f.application.dispose();
});

test('PAGE002 public workspace preflight cancels without writes, resumes receipt failure and explicitly verifies rollback', async () => {
 setLanguage('en');const f=fixture(),entity=(await f.services.commands.createEntity({typeId:'person',values:{name:'Migrate me'}})).entity,create=f.files.create;
 const mounted=render(<TestProviders><ArchiveWorkspace services={f.services}/></TestProviders>);
 fireEvent.click(await screen.findByRole('button',{name:'Legacy archive migration'}));
 await select('Legacy archive','Migrate me');const before=[...f.content.entries()];fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));
 fireEvent.click(await screen.findByRole('button',{name:'Cancel'}));expect([...f.content.entries()]).toEqual(before);
 fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));
 f.files.create=async(path,raw,guard)=>{if(path.endsWith('-完成.md'))throw new Error('offline completion');return create(path,raw,guard);};
 fireEvent.click(await screen.findByRole('button',{name:'Confirm backup and migrate'}));await screen.findByText(/offline completion/);
 expect(f.content.get(entity.path)).toContain('huhu-type: archive-record');expect(f.content.get(entity.path)).toContain('huhu-created-at: null');
 f.files.create=create;fireEvent.click(await screen.findByRole('button',{name:'Verify and resume'}));await waitFor(()=>expect(screen.queryByText(/offline completion/)).toBeNull());
 await waitFor(()=>expect(screen.getByRole<HTMLButtonElement>('button',{name:'Review rollback'}).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Review rollback'}));fireEvent.click(screen.getByRole('button',{name:'Confirm verified rollback'}));
 await waitFor(()=>expect(f.content.get(entity.path)).toBe(entity.raw));await screen.findByText(/Verified rollback complete/);
 mounted.unmount();f.application.dispose();
});

test('a legacy form keeps its dirty value and gates migration until its draft is saved', async () => {
 setLanguage('en');const f=fixture(),entity=(await f.services.commands.createEntity({typeId:'person',values:{name:'Dirty owner'}})).entity;
 render(<TestProviders><ArchiveWorkspace services={f.services} initialPath={entity.path}/></TestProviders>);
 const input=await screen.findByRole('textbox',{name:'Name'});fireEvent.change(input,{target:{value:'DIRTY OWNER'}});
 expect(screen.getByRole<HTMLButtonElement>('button',{name:'Run migration preflight'}).disabled).toBe(true);
 expect(screen.getByRole<HTMLInputElement>('textbox',{name:'Name'}).value).toBe('DIRTY OWNER');fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(screen.getByRole<HTMLButtonElement>('button',{name:'Run migration preflight'}).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));await screen.findByRole('button',{name:'Confirm backup and migrate'});expect(f.content.get(entity.path)).toContain('huhu-type: person');f.application.dispose();
});

test('the real presentation restores a migrated reminder identity and changes exact record contexts without reusing another session', async () => {
 setLanguage('en');const h=await workbenchHarness();try {
  Object.assign(h.surface.app.workspace,{layoutReady:true});Object.assign(h.surface.controller!,{archives:h.application.archives});
  const first=(await h.services.commands.createEntity({typeId:'person',values:{name:'Restored migrated first'}})).entity;
  const second=(await h.services.commands.createEntity({typeId:'person',values:{name:'Restored migrated second'}})).entity;
  for(const entity of [first,second]){await h.services.commands.migrate({preflight:await h.services.commands.preflightMigration(entity.path),operationId:'migrate-'+entity.id});h.application.fileChanged(h.entries.get(entity.path)!);}
  await waitFor(()=>expect(h.application.index.get(first.id)).toBeUndefined());await waitFor(()=>expect(h.application.index.get(second.id)).toBeUndefined());
  await act(async()=>{await h.surface.setState({...h.surface.getState(),selectedId:first.id,selectedPath:first.path},{} as import('obsidian').ViewStateResult);});
  expect((await screen.findByRole<HTMLInputElement>('textbox',{name:'Name'})).value).toBe('Restored migrated first');
  const {navigateContacts}=await import('./navigate');await act(async()=>{await navigateContacts(h.surface,{feature:'contacts',resourceId:second.id},new AbortController().signal);});
  expect((await screen.findByRole<HTMLInputElement>('textbox',{name:'Name'})).value).toBe('Restored migrated second');
 }finally{await h.close();}
});

test('a busy migration stays with its root and retains its refusal after the workbench returns',async()=>{
 setLanguage('en');const h=await workbenchHarness();let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});let entered!:()=>void;const pending=new Promise<void>(resolve=>{entered=resolve;});
 try{
  const entity=(await h.services.commands.createEntity({typeId:'person',values:{name:'Root A migration'}})).entity,process=h.files.process;let calls=0;
  h.files.process=async(file,patch,guard)=>{if(file.path===entity.path){calls++;entered();await barrier;}return process(file,patch,guard);};
  fireEvent.click(await screen.findByRole('button',{name:'Legacy archive migration'}));await select('Legacy archive','Root A migration');fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm backup and migrate'}));await pending;
  await h.root('RootB');await screen.findByRole('combobox',{name:'Archive type'});expect(screen.getByRole<HTMLButtonElement>('button',{name:'New archive type'}).disabled).toBe(false);expect(screen.queryByRole('alert')).toBeNull();
  await act(async()=>{release();});expect([...h.content.keys()].some(path=>path.startsWith('RootB/'))).toBe(false);await h.root(h.rootA);
  await screen.findByRole('alert');expect(h.content.get(entity.path)).toContain('huhu-type: person');expect(calls).toBe(1);expect(screen.getByRole<HTMLButtonElement>('button',{name:'Confirm backup and migrate'}).disabled).toBe(false);
 }finally{release?.();await h.close();}
});

test('migration busy locks the actual entity input, save and back until the owner result is consumed',async()=>{
 setLanguage('en');const f=fixture(),entity=(await f.services.commands.createEntity({typeId:'person',values:{name:'Locked migration'}})).entity,drafts=new ArchiveDraftOwner();let entered!:()=>void,release!:()=>void;const pending=new Promise<void>(resolve=>{entered=resolve;}),barrier=new Promise<void>(resolve=>{release=resolve;}),process=f.files.process;
 f.files.process=async(file,patch,guard)=>{if(file.path===entity.path){entered();await barrier;}return process(file,patch,guard);};const mounted=render(<TestProviders><ArchiveWorkspace services={f.services} initialPath={entity.path} drafts={drafts}/></TestProviders>);
 try{await screen.findByRole('textbox',{name:'Name'});fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm backup and migrate'}));await pending;
  const name=screen.getByRole<HTMLInputElement>('textbox',{name:'Name'});expect(name.closest('fieldset')?.disabled).toBe(true);await userEvent.setup().type(name,'USER DURING MIGRATION');expect(name.value).toBe('Locked migration');expect(screen.getByRole<HTMLButtonElement>('button',{name:'Save draft'}).disabled).toBe(true);expect(screen.getByRole<HTMLButtonElement>('button',{name:'Back'}).disabled).toBe(true);expect(screen.getByRole<HTMLButtonElement>('button',{name:'Mark complete'}).disabled).toBe(true);
  await act(async()=>{release();});await waitFor(()=>expect(f.content.get(entity.path)).toContain('huhu-type: archive-record'));
 }finally{release?.();mounted.unmount();f.application.dispose();drafts.dispose();}
});

for(const fail of [false,true])test(`migration busy restores the same entity lock across roots and preserves other root drafts (failure=${fail})`,async()=>{
 setLanguage('en');const h=await workbenchHarness();let release!:()=>void,entered!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;}),pending=new Promise<void>(resolve=>{entered=resolve;});
 try{
  const entity=(await h.services.commands.createEntity({typeId:'person',values:{name:'Root A locked'}})).entity,process=h.files.process;let calls=0;
  h.files.process=async(file,patch,guard)=>{if(file.path===entity.path){calls++;entered();await barrier;if(fail)throw new Error('MIGRATION A EIO');}return process(file,patch,guard);};
  await act(async()=>{h.surface.openGeneric(entity.path);});await screen.findByRole('textbox',{name:'Name'});fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm backup and migrate'}));await pending;
  await h.root('RootB');fireEvent.click(await screen.findByRole('button',{name:'New archive type'}));fireEvent.change(await screen.findByRole('textbox',{name:'Type name'}),{target:{value:'ROOT B SAFE DRAFT'}});
  await h.root(h.rootA);const input=await screen.findByRole<HTMLInputElement>('textbox',{name:'Name'});expect(input.closest('fieldset')?.disabled).toBe(true);await userEvent.setup().type(input,'USER DURING MIGRATION');expect(input.value).toBe('Root A locked');expect(screen.getByRole<HTMLButtonElement>('button',{name:'Back'}).disabled).toBe(true);
  await act(async()=>{release();});if(fail){await screen.findByText(/MIGRATION A EIO/);await waitFor(()=>expect(screen.getByRole<HTMLInputElement>('textbox',{name:'Name'}).closest('fieldset')?.disabled).toBe(false));fireEvent.change(screen.getByRole('textbox',{name:'Name'}),{target:{value:'USER AFTER REFUSAL'}});expect(screen.getByRole<HTMLInputElement>('textbox',{name:'Name'}).value).toBe('USER AFTER REFUSAL');expect(h.content.get(entity.path)).toContain('huhu-type: person');}
  else await waitFor(()=>expect(h.content.get(entity.path)).toContain('huhu-type: archive-record'));
  await h.root('RootB');expect((await screen.findByRole<HTMLInputElement>('textbox',{name:'Type name'})).value).toBe('ROOT B SAFE DRAFT');expect(calls).toBe(1);
  await h.root(h.rootA);if(fail)expect((await screen.findByRole<HTMLInputElement>('textbox',{name:'Name'})).value).toBe('USER AFTER REFUSAL');expect(calls).toBe(1);
 }finally{release?.();await h.close();}
});

test('the real session can explicitly finish a pending active rollback after both receipt writes failed',async()=>{
 setLanguage('en');const f=fixture(),entity=(await f.services.commands.createEntity({typeId:'person',values:{name:'Continue rollback'}})).entity,create=f.files.create;let fail=true;
 f.files.create=async(path,raw,guard)=>{if(fail&&(path.endsWith('-完成.md')||path.endsWith('-回退.md')))throw new Error('COMBINED RECEIPT EIO');return create(path,raw,guard);};const mounted=render(<TestProviders><ArchiveWorkspace services={f.services} initialPath={entity.path}/></TestProviders>);
 try{
  await screen.findByRole('textbox',{name:'Name'});fireEvent.click(screen.getByRole('button',{name:'Run migration preflight'}));fireEvent.click(await screen.findByRole('button',{name:'Confirm backup and migrate'}));await screen.findByText(/COMBINED RECEIPT EIO/);
  await waitFor(()=>expect(screen.getByRole<HTMLButtonElement>('button',{name:'Review rollback'}).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Review rollback'}));fireEvent.click(screen.getByRole('button',{name:'Confirm verified rollback'}));await waitFor(()=>expect(f.content.get(entity.path)).toBe(entity.raw));await waitFor(()=>expect(screen.getByRole<HTMLButtonElement>('button',{name:'Review rollback'}).disabled).toBe(false));
  expect((await f.services.query.migrations())[0]?.phase).toBe('rollback-pending');fail=false;fireEvent.click(screen.getByRole('button',{name:'Review rollback'}));fireEvent.click(screen.getByRole('button',{name:'Confirm verified rollback'}));
  fireEvent.click(await screen.findByRole('button',{name:'Continue rollback'}));expect((await screen.findByRole<HTMLInputElement>('textbox',{name:'Name'})).value).toBe('Continue rollback');expect(screen.getByRole<HTMLButtonElement>('button',{name:'Save draft'}).disabled).toBe(false);
 }finally{mounted.unmount();f.application.dispose();}
});

test('PAGE-002 reads portable fork heads, parents, impact and original Markdown through the actual workspace and recheck entry',async()=>{
 setLanguage('en');const f=fixture(),type=await f.services.commands.publishType({typeId:'sync-project',label:'Sync project',folder:'Sync',titleFieldId:'name',fields:[{fieldId:'name',storageKey:'sync-name',label:'Name',codec:'text'}]});await f.services.commands.createEntity({typeId:type.typeId,values:{name:'Existing'}});
 const install=async(id:string)=>{const definition={...type,revisionId:id,label:id,parentRevisionIds:[type.revisionId],displayVersion:2};definition.contentHash=await textHash(definitionSemantic('type',definition));const directory='档案/档案定义/类型/'+type.typeId;await f.files.create(directory+'/修订/'+id+'.md',archiveMarkdown({'huhu-type':'archive-type-definition','huhu-format-version':2,'huhu-publication':'staged',definition})+'\nRetained branch '+id+'\n');await f.files.create(directory+'/发布/'+id+'.md',archiveMarkdown({'huhu-type':'archive-definition-publication','huhu-format-version':2,'huhu-definition-family':'type','huhu-definition-id':type.typeId,'huhu-revision-id':id,'huhu-content-hash':definition.contentHash,'huhu-parent-revisions':[type.revisionId]}));};await install('left-head');await install('right-head');f.application.archives.invalidate();
 const mounted=render(<TestProviders><ArchiveWorkspace services={f.services} settings /></TestProviders>),region=await screen.findByRole('region',{name:'Definition sync diagnostics'});await within(region).findByText(/^Published heads: left-head, right-head$/);expect(within(region).getByText('1 affected records')).toBeDefined();expect(within(region).getAllByText(/Parent revisions/).length).toBe(3);expect(within(region).getAllByText(/Retained branch left-head/).length).toBeGreaterThan(0);
 const before=[...f.content.entries()];fireEvent.click(within(region).getByRole('button',{name:'Recheck definitions'}));await within(region).findByText(/^Published heads: left-head, right-head$/);expect([...f.content.entries()]).toEqual(before);expect(screen.queryByRole('button',{name:/Resolve|Merge/})).toBeNull();mounted.unmount();f.application.dispose();
});
for(const family of ['type','form','relation']as const)test(`committed ${family} publication failure survives the actual UI remount and explicit verification without another revision`,async()=>{
 setLanguage('en');const f=fixture(),create=f.files.create;let fail=true;f.files.create=async(path,raw,guard)=>{if(fail&&path.endsWith('/当前.md')&&path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/'))throw new Error('EIO current hint');return create(path,raw,guard);};
 const owner=new ArchiveDraftOwner();let mounted=render(<TestProviders><ArchiveWorkspace services={f.services} drafts={owner} draftScope="sync-recovery" settings={family==='form'} /></TestProviders>);
 if(family==='type'){await screen.findByRole('button',{name:'New archive type'});fireEvent.click(screen.getByRole('button',{name:'New archive type'}));fireEvent.change(screen.getByRole('textbox',{name:'Type name'}),{target:{value:'Recovery project'}});fireEvent.click(screen.getByRole('button',{name:'Preview publication impact'}));fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Publish type'}));}
 if(family==='form'){await screen.findByRole('region',{name:'Type and form designer'});fireEvent.change(screen.getByRole('textbox',{name:'Form name'}),{target:{value:'Recovery form'}});await publishForms();}
 if(family==='relation'){
  mounted.unmount();const one=(await f.services.commands.createEntity({typeId:'person',values:{name:'One'}})).entity;mounted=render(<TestProviders><ArchiveRelations services={f.services} entity={one} drafts={owner} scope="sync-relation" /></TestProviders>);await waitFor(()=>expect(screen.getByRole<HTMLButtonElement>('button',{name:'New relation type'}).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'New relation type'}));fireEvent.change(screen.getByRole('textbox',{name:'Relation type name'}),{target:{value:'Recovery relation'}});fireEvent.change(screen.getByRole('textbox',{name:'Inverse display name'}),{target:{value:'Reverse recovery'}});fireEvent.click(screen.getByRole('button',{name:'Preview publication impact'}));fireEvent.click(screen.getByRole('button',{name:'Publish relation type'}));
 }
 await screen.findByRole('button',{name:'Verify committed publication'});const revisions=()=>[...f.entries.keys()].filter(path=>path.includes('/'+{type:'类型',form:'表单',relation:'关系'}[family]+'/')&&path.includes('/修订/'));expect(revisions()).toHaveLength(1);mounted.unmount();fail=false;
 if(family==='relation'){const one=(await f.services.query.snapshot()).entities[0]!;mounted=render(<TestProviders><ArchiveRelations services={f.services} entity={one} drafts={owner} scope="sync-relation" /></TestProviders>);}else mounted=render(<TestProviders><ArchiveWorkspace services={f.services} drafts={owner} draftScope="sync-recovery" settings={family==='form'} /></TestProviders>);
 fireEvent.click(await screen.findByRole('button',{name:'Verify committed publication'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Verify committed publication'})).toBeNull());expect(revisions()).toHaveLength(1);expect((await f.services.catalog.definitionStates()).filter(state=>state.family===family).every(state=>!state.blocked)).toBe(true);mounted.unmount();f.application.dispose();
});

test('both real endpoint relation surfaces converge to a portable deletion fact and retain its raw provenance',async()=>{
 setLanguage('en');const f=fixture(),one=(await f.services.commands.createEntity({typeId:'person',values:{name:'One'}})).entity,two=(await f.services.commands.createEntity({typeId:'person',values:{name:'Two'}})).entity,type=(await f.services.catalog.relationTypes()).types.find(type=>type.relationTypeId==='friend')!;await f.services.commands.createRelation({id:'dom-deleted',operationId:'dom-create',relationTypeId:type.relationTypeId,schemaRevisionId:type.revisionId,schemaContentHash:type.contentHash,sourceId:one.id,targetId:two.id,values:{},status:'current',intent:'complete'});const base=await f.services.commands.beginRelationEdit('dom-deleted'),owner=new ArchiveDraftOwner(),mounted=render(<TestProviders><ArchiveRelations services={f.services} entity={one} drafts={owner} scope="one"/><ArchiveRelations services={f.services} entity={two} drafts={owner} scope="two"/></TestProviders>);await waitFor(()=>expect(screen.getAllByRole('button',{name:/Edit · dom-deleted/})).toHaveLength(2));await act(async()=>{await f.services.commands.deleteRelation({base,operationId:'dom-delete'});});await waitFor(()=>expect(screen.queryByRole('button',{name:/Edit · dom-deleted/})).toBeNull());expect(screen.getAllByText('1 visible relationship deletion facts')).toHaveLength(2);expect(screen.getAllByText(/archive-relation-deletion/).length).toBe(2);expect((await f.services.query.relations(one.id)).isComplete).toBe(true);expect((await f.services.query.relations(two.id)).isComplete).toBe(true);mounted.unmount();f.application.dispose();
});

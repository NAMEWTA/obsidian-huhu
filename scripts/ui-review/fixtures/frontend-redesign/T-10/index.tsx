import { configureFixtureHost } from '../shared/fixture-theme';
import { createRoot } from 'react-dom/client';
import { Component, type Plugin } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { memoryVault } from '../../../../fixtures/memory-vault';
import { ThemeRuntime } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { setLanguage, registerMessages } from '../../../../../src/shared/i18n';
import { messages as navigatorMessages } from '../../../../../src/modules/navigator/i18n';
import { messages as commentsMessages } from '../../../../../src/modules/comments/i18n';
import { VisibilityContext } from '../../../../../src/ui/react/contexts';
import { ContainerProviders } from '../../../../../src/ui/react/providers';
import { DiaryWorkspace } from '../../../../../src/modules/navigator/ui/diary/DiaryWorkspace';
import { createDiarySearch } from '../../../../../src/modules/navigator/services/diary-search';
import { createDiaryWriting } from '../../../../../src/modules/navigator/services/diary-writing';
import { CalendarPanel } from '../../../../../src/modules/navigator/ui/Calendar';
import { NavigatorContext } from '../../../../../src/modules/navigator/ui/hooks';
import { NavigatorRoot } from '../../../../../src/modules/navigator/ui/NavigatorRoot';
import { navigatorSettingsPage } from '../../../../../src/modules/navigator/ui/settings-page';
import { commentsSettingsPage } from '../../../../../src/modules/comments/ui/settings-page';
import { createMemoryCache } from '../../../../../src/modules/navigator/platform/cache-store';
import { PreviewStore } from '../../../../../src/modules/navigator/platform/preview-store';
import { createNavigatorService, type IndexPort, type OpsPort } from '../../../../../src/modules/navigator/services/navigator';
import { FolderCounts } from '../../../../../src/modules/navigator/core/folder-counts';
import type { NoteEntry } from '../../../../../src/modules/navigator/core/types';
import { navigatorSchema } from '../../../../../src/modules/navigator/settings';
import type { NavigatorEnv } from '../../../../../src/modules/navigator/ui/env';
import type { NavigatorPeriodicService } from '../../../../../src/modules/navigator/api';
import { calendarIso } from '../../../../../src/ui/components/huhu/calendar/CalendarMonth';
import { startOfPeriod, type Period } from '../../../../../src/shared/periodic-paths';
import { CommentStore } from '../../../../../src/modules/comments/core/store';
import { createAnchor } from '../../../../../src/modules/comments/core/anchor';
import { createCommentsService } from '../../../../../src/modules/comments/services/comments';
import { createOverlayChannel } from '../../../../../src/modules/comments/services/overlay';
import { COMMENTS_PANEL } from '../../../../../src/modules/comments/api';
import { CommentsPanel } from '../../../../../src/modules/comments/ui/panel/CommentsPanel';
import { CommentPopover } from '../../../../../src/modules/comments/ui/popover/CommentPopover';
import { DEFAULT_COMMENTS_SETTINGS, commentsSettings } from '../../../../../src/modules/comments/settings';
import type { CommentsEnv } from '../../../../../src/modules/comments/ui/env';
import { SettingsStore } from '../../../../../src/shared/settings/store';
import { mountEditorPanelHost } from '../../../../../src/app/editor-panel/panel-host';
import type { EditorContextAccess } from '../../../../../src/app/contracts/editor-context';
import type { ServiceAccess } from '../../../../../src/app/contracts/module';
let docs: { main: Document; second: Document }, theme = themeSettings.defaults();
const entries: Record<string, Awaited<ReturnType<typeof makeEntry>>> = {}, events: unknown[] = [], subscribers = new Set<() => void>(), cleanup: Array<() => void> = [];
export function note(path: string, mtime = 1, tags: string[] = [], extra: Partial<NoteEntry> = {}): NoteEntry {
	const slash = path.lastIndexOf('/');
	return { path, name: path.slice(slash + 1).replace(/\.md$/, ''), ext: 'md', folder: slash < 0 ? '/' : path.slice(0, slash), ctime: mtime, mtime, tags, ...extra };
}

export class FakeVault implements IndexPort {
	version = 1;
	private listeners = new Set<() => void>();
	constructor(public files: NoteEntry[], public folderList: string[] = ['/']) {}
	notes() { return this.files; }
	folders() { return this.folderList; }
	counts() { return FolderCounts.from(this.files); }
	get(path: string) { return this.files.find((entry) => entry.path === path); }
	subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
	change(files: NoteEntry[]) { this.files = files; this.version++; for (const listener of this.listeners) listener(); }
}

export function fakeOps(vault: FakeVault, overrides: Partial<OpsPort> = {}) {
	const calls: Array<[string, ...unknown[]]> = [];
	const ops: OpsPort = {
		open: (path, options) => { calls.push(['open', path, options]); return Promise.resolve(); },
		activePath: () => undefined,
		isFolder: (path) => vault.folderList.includes(path),
		createNote: (folder, tag) => { calls.push(['createNote', folder, tag]); const path = `${folder ?? ''}/Untitled.md`.replace(/^\//, ''); vault.change([...vault.files, note(path, 9)]); return Promise.resolve(path); },
		createFolder: (parent) => { calls.push(['createFolder', parent]); return Promise.resolve(`${parent}/New`); },
		rename: (path, name) => { calls.push(['rename', path, name]); if (name === 'taken') return Promise.reject(new Error('exists')); const next = path.replace(/[^/]*$/, `${name}.md`); vault.change(vault.files.map((entry) => (entry.path === path ? note(next, entry.mtime, [...entry.tags]) : entry))); return Promise.resolve(next); },
		duplicate: (path) => { calls.push(['duplicate', path]); return Promise.resolve(path); },
		move: (paths, folder) => {
			calls.push(['move', paths, folder]);
			const moved = new Map(paths.filter((path) => !path.includes('clash')).map((path): [string, string] => [path, `${folder}/${path.slice(path.lastIndexOf('/') + 1)}`]));
			vault.change(vault.files.map((entry) => (moved.has(entry.path) ? note(moved.get(entry.path)!, entry.mtime, [...entry.tags]) : entry)));
			return Promise.resolve({ moved, skipped: paths.filter((path) => path.includes('clash')) });
		},
		notifySkipped: (paths) => { calls.push(['skipped', paths]); },
		chooseFolder: () => Promise.resolve('Target'),
		ensureFolder: (path) => { calls.push(['ensureFolder', path]); if (!vault.folderList.includes(path)) vault.folderList = [...vault.folderList, path]; return Promise.resolve(); },
		askName: (_title, value) => { calls.push(['askName', value]); return Promise.resolve(value); },
		notify: (key, params) => { calls.push(['notify', key, params]); },
		confirmDelete: () => Promise.resolve(true),
		trash: (paths) => { calls.push(['trash', paths]); vault.change(vault.files.filter((entry) => !paths.includes(entry.path))); return Promise.resolve(); },
		addTag: (paths, tag) => { calls.push(['addTag', paths, tag]); return Promise.resolve(); },
		copyPath: (path) => { calls.push(['copyPath', path]); },
		report: (error) => { calls.push(['report', error]); },
		...overrides,
	};
	return { ops, calls };
}


function hostDOM(doc: Document) {
 Object.assign(Component.prototype,{load(){},unload(){}});
 Object.assign(doc.defaultView!.HTMLElement.prototype,{empty(this:HTMLElement){this.replaceChildren();},setText(this:HTMLElement,text:string){this.textContent=text;}});
	const win = doc.defaultView!;
	Object.defineProperty(win.Node.prototype, 'instanceOf', {
		configurable: true,
		value(this: Node, type: typeof HTMLElement) {
			return this instanceof type;
		},
	});
	for (const [method, add] of [
		['addClass', true],
		['removeClass', false],
	] as const)
		Object.defineProperty(win.HTMLElement.prototype, method, {
			configurable: true,
			value(this: HTMLElement, ...classes: string[]) {
				for (const cls of classes)
					if (add) this.classList.add(cls);
					else this.classList.remove(cls);
			},
		});
	Object.defineProperty(win.HTMLElement.prototype, 'createDiv', {
		configurable: true,
		value(this: HTMLElement, options: { cls?: string; text?: string } = {}) {
			const child = this.ownerDocument.createElement('div');
			child.className = options.cls ?? ''; child.textContent=options.text??'';
			this.append(child);
			return child;
		},
	});
	Object.defineProperty(win.HTMLElement.prototype, 'win', {
		configurable: true,
		get(this: HTMLElement) {
			return this.ownerDocument.defaultView;
		},
	});
}
async function makeEntry(name: string) {
 const doc = docs[name as keyof typeof docs];
 const mem = memoryVault({ 'Journal/day/2026-11-04.md': 'A quiet morning.\n\n今天把想法写下来。', 'Journal/day/2026-11-03.md': 'A second page.', 'Journal/week/2026-11-02.md': 'Weekly reflection.', 'Journal/month/2026-11-01.md': 'Monthly reflection.', 'Journal/quarter/2026-10-01.md': 'Quarterly reflection.', 'Journal/year/2026-01-01.md': 'Yearly reflection.' }, doc.defaultView);
 Object.assign(mem.app.vault,{getAllLoadedFiles:()=>{const folders=new Set<string>();for(const file of mem.app.vault.getFiles()){const parts=file.path.split('/');for(let i=1;i<parts.length;i++)folders.add(parts.slice(0,i).join('/'));}return [...mem.app.vault.getFiles(),...[...folders].map(path=>({path,children:[]}))];}});
 const getEntry=mem.app.vault.getAbstractFileByPath.bind(mem.app.vault);Object.assign(mem.app.vault,{getAbstractFileByPath:(path:string)=>{const entry=getEntry(path);return entry&&!mem.app.vault.getFileByPath(path)?{...entry,children:[]}:entry;}});
 const workspaceEvents = new Map<object, { event: string; callback: (...args: unknown[]) => void }>();
 Object.assign(mem.app.workspace, {
  on(event: string, callback: (...args: unknown[]) => void) { const ref = {}; workspaceEvents.set(ref, { event, callback }); return ref; },
  offref(ref: object) { workspaceEvents.delete(ref); },
  getLeavesOfType: () => [], // This component fixture has no native Markdown editor buffers.
 });
 const io = { failRead: false, failWrite: false, open: [] as unknown[], readGate: null as Promise<void> | null, releaseRead: null as (() => void) | null, writeGate:null as Promise<void>|null, releaseWrite:null as (()=>void)|null };
 const notify = new Set<() => void>();
 const inspect = (period: Period, date: Date) => { const value = calendarIso(startOfPeriod(period, date, 1)), path = `Journal/${period}/${value}.md`; return { period, date: value, path, title: value, active: false, status: mem.app.vault.getFileByPath(path) ? 'existing' as const : 'missing' as const }; };
 const periodic: NavigatorPeriodicService = {
  root: () => 'Journal', template: () => undefined, weekStart: () => 1, display: () => ({ weeks: 6, weekNumbers: true, images: false }), inspect,
  preview: async (period, date) => ({ ...inspect(period, date), summary: 'Periodic note preview', summaryStatus: 'ready' }),
  list: async (period, from, to) => { if(io.readGate)await io.readGate; if (io.failRead) throw Error('Fixture read failed'); return mem.app.vault.getFiles().filter(file => file.path.startsWith(`Journal/${period}/`)).map(file => ({ ...inspect(period, new Date(Number(file.basename.slice(0,4)),Number(file.basename.slice(5,7))-1,Number(file.basename.slice(8,10)))), summary: '', summaryStatus: 'ready' as const, status:'existing' as const })).filter(row => row.date >= calendarIso(from) && row.date <= calendarIso(to)); },
  subscribe: fn => { notify.add(fn); return () => notify.delete(fn); }, active: () => undefined,
  prepare: async (period, date) => ({ status: 'ready', path: inspect(period, date).path, content: '# Diary\n' }),
  open: async (period, date, options) => { io.open.push({period, date:calendarIso(date), options}); return true; }, ensure: async () => undefined,
 };
 const port = { periodic, read: async (path: string) => { if(io.failRead) throw Error('Fixture read failed'); return mem.app.vault.read(mem.app.vault.getFileByPath(path)!); } };
 const write = mem.app.vault.process.bind(mem.app.vault);
 mem.app.vault.process = async (...args) => { if(io.writeGate)await io.writeGate; if (io.failWrite) throw Error('Fixture write failed'); const result = await write(...args); notify.forEach(fn=>fn()); return result; };
 const create=mem.app.vault.create.bind(mem.app.vault);mem.app.vault.create=async(...args)=>{if(io.writeGate)await io.writeGate;if(io.failWrite)throw Error('Fixture create failed');const result=await create(...args);notify.forEach(fn=>fn());return result;};
 const diarySearch = createDiarySearch(port), diaryWriting = createDiaryWriting(mem.app, periodic);
 const fake = new FakeVault([note('Work/Plan.md', 30, ['plan']), note('Work/Ideas.md', 20), note('Home/Notes.md',10)], ['/', 'Work', 'Home']);
 const navStore=new SettingsStore({load:async()=>null,save:async(_scope,file)=>file},{timers:{set:callback=>{queueMicrotask(callback);return 0;},clear:()=>{}}});await navStore.load();const navSettings=navStore.bind('navigator',navigatorSchema);await navSettings.update(draft=>{draft.layout='single';draft.calendarOpen=true;});const {ops,calls}=fakeOps(fake);const nav={settings:navSettings,calls,service:createNavigatorService({settings:navSettings,index:fake,ops,isMac:false,labels:()=>({folders:'Folders',tags:'Tags',untagged:'Untagged',root:'Vault',shortcuts:'Shortcuts',recent:'Recent',properties:'Properties'})})};
 const previews = new PreviewStore({ cache:createMemoryCache(), source:{mtime:()=>1,isMarkdown:()=>true,readText:async path=>`Preview ${path}`,propertyImage:()=>undefined,resolveImage:()=>null,title:()=>'',metadataReady:()=>true}, scheduler:{now:()=>Date.now(),yield:async()=>{},later:callback=>{const timer=doc.defaultView!.setTimeout(callback,0);return()=>doc.defaultView!.clearTimeout(timer);}},imageProperties:()=>[] });
 const env: NavigatorEnv = { app:mem.app, service:nav.service, previews, periodic, isMac:false, resolveIcon:()=>({icon:null,emoji:false,color:null}), subscribeIcons:()=>()=>{}, imageUrl:path=>path, copyPath:()=>{}, openSettings:()=>events.push('settings'),openAppearance:()=>{},askName:async(_title,value)=>value,report:error=>events.push(String(error)),canSplit:true };
 const files = new Map<string,string>();
 const store = new CommentStore({exists:async path=>files.has(path),read:async path=>files.get(path)!,write:async(path,text)=>{if(io.failWrite)throw Error('Fixture write failed');files.set(path,text);},remove:async path=>{files.delete(path);}}, {timers:{set:cb=>doc.defaultView!.setTimeout(cb,100000),clear:handle=>doc.defaultView!.clearTimeout(handle as number)}});
 const comments = createCommentsService(store,()=>DEFAULT_COMMENTS_SETTINGS), channel=createOverlayChannel();
 const first=await store.add('Journal/day/2026-11-04.md',{anchor:createAnchor('A quiet morning.',0,15),text:'Keep this thought.'});
 await store.reply(first.id,'A reply to the thought.');
 const orphan=await store.add('Journal/day/2026-11-04.md',{anchor:createAnchor('Missing anchor',0,14),text:'Needs a new anchor.'});
 orphan.status='orphaned';
 await store.flush(); await comments.refresh(); comments.setPath('Journal/day/2026-11-04.md');
 const commentEnv={app:mem.app,service:comments,editors:new Set(),alive:()=>true,overlay:()=>channel,open:request=>channel.open(request),openSettings:()=>events.push('comment settings'),exportHighlights:async()=> 'huhu/export.md'} as CommentsEnv;
 const documents:EditorContextAccess={current:()=>({id:name,path:'Journal/day/2026-11-04.md',leafId:name,ownerWindow:doc.defaultView!,generation:0}),get:()=>undefined,capture:()=>{throw Error('No native editor in component fixture');},resolveLeaf:()=>undefined,resolveView:()=>undefined,returnTo:async()=>{},subscribe:()=>()=>{}};
 const host=doc.createElement('div'); host.dataset.huhuLeaf='';host.style.cssText='height:100vh;min-width:0;overflow:auto';doc.body.append(host);
 const settingsStore=new SettingsStore({load:async()=>null,save:async(_scope,file)=>file},{timers:{set:callback=>{queueMicrotask(callback);return 0;},clear:()=>{}}});await settingsStore.load();const commentSettings=settingsStore.bind('comments',commentsSettings);
 let unmount=()=>{};
 const scene=async(value:string)=>{
  unmount();host.replaceChildren();host.dataset.scene=value;
  if(value==='host'){
   const panel={mount:(element:HTMLElement,_documents:EditorContextAccess,visible=true)=>{const root=createRoot(element);const render=(value:boolean)=>root.render(<ContainerProviders container={element}><VisibilityContext.Provider value={value}><CommentsPanel env={commentEnv} documents={documents} container={element}/></VisibilityContext.Provider></ContainerProviders>);render(visible);return{setVisible:render,dispose:()=>root.unmount()};}};
   const services={peek:key=>key===COMMENTS_PANEL?panel:undefined,watch:()=>()=>{},acquire:async()=>undefined} as ServiceAccess;
   unmount=mountEditorPanelHost({container:host,services,documents,initialTab:'comments',select:tab=>events.push(tab),openSettings:()=>{}});return;
  }
  const root=createRoot(host);unmount=()=>root.unmount();
  const Settings=navigatorSettingsPage(nav.settings,()=>undefined,mem.app), CommentsSettings=commentsSettingsPage(commentSettings);
  root.render(<ContainerProviders container={host}><NavigatorContext.Provider value={env}>{value==='navigator'?<NavigatorRoot/>:value==='calendar'?<CalendarPanel/>:value==='navigator-settings'?<Settings/>:value==='comments-settings'?<CommentsSettings/>:value==='comments'?<CommentsPanel env={commentEnv} documents={documents} container={host}/>:value==='overlay'?<CommentPopover env={commentEnv} channel={channel}/>:<DiaryWorkspace key={value} port={port} search={diarySearch} writing={diaryWriting} initialDate={value==='empty-date'?'2026-11-02':'2026-11-04'}/>}</NavigatorContext.Provider></ContainerProviders>);
 };
 await scene('diary');
 return {host,io,nav,store,comments,channel,first,orphan,scene,periodic,mem,holdWrite(){io.writeGate=new Promise(resolve=>{io.releaseWrite=()=>{io.writeGate=null;io.releaseWrite=null;resolve();};});},holdRead(){io.readGate=new Promise(resolve=>{io.releaseRead=()=>{io.readGate=null;io.releaseRead=null;resolve();};});},async dispose(){io.releaseRead?.();io.releaseWrite?.();unmount();diarySearch.dispose();diaryWriting.dispose();if(workspaceEvents.size)throw Error('Fixture workspace listeners were not disposed');await previews.dispose();nav.service.dispose();await navStore.dispose();await settingsStore.dispose();comments.dispose();channel.dispose();await store.close();host.remove();}};
}
async function mount(name:string,scene='diary'){await entries[name]?.dispose();entries[name]=await makeEntry(name);if(scene!=='diary')await entries[name].scene(scene);}
async function bootstrap() {
	docs = await readyDocuments(document);
	Object.values(docs).forEach(hostDOM);
	registerMessages(navigatorMessages); registerMessages(commentsMessages);
	const handle: ConstructorParameters<typeof ThemeRuntime>[0] = {
		get: () => theme,
		subscribe: (fn) => {
			subscribers.add(fn);
			return () => {
				subscribers.delete(fn);
			};
		},
		async update(recipe) {
			const draft = structuredClone(theme);
			theme = recipe(draft) ?? draft;
			subscribers.forEach((fn) => fn());
		},
		select(selector, listener, equal = Object.is) {
			let before = selector(theme);
			const fn = () => {
				const next = selector(theme);
				if (!equal(next, before)) {
					const previous = before;
					before = next;
					listener(next, previous);
				}
			};
			subscribers.add(fn);
			return () => {
				subscribers.delete(fn);
			};
		},
		async touch() {
			subscribers.forEach((fn) => fn());
		},
	};
	new ThemeRuntime(handle).attach({
		app: {
			workspace: {
				iterateAllLeaves: (visit: (leaf: unknown) => void) =>
					visit({ view: { containerEl: docs.second.body } }),
				on: () => ({}),
			},
		},
		registerEvent: () => {},
		register: (fn: () => void) => cleanup.push(fn),
	} as unknown as Plugin);
	await mount('main');
	await mount('second');
	Object.assign(globalThis, {
		uiReview: {
			docs,
			entries,
			events,
			async configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				await mount('main');
				await mount('second');
				theme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					source: sample.source,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion ?? 'system',
				});
				Object.values(docs).forEach((doc) => {
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
				});
				configureFixtureHost(docs,sample);
subscribers.forEach((fn) => fn());
			},
			async scenario(value: string) { for(const name of ['main','second']) await entries[name]!.scene(value); },
   async dispose() { for(const entry of Object.values(entries)) await entry.dispose(); cleanup.forEach(fn=>fn()); },
  },
 });
}
Object.assign(globalThis,{uiReviewStartup:bootstrap()});

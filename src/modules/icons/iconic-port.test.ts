// Fixed time zone: the Iconic 1.1.10 oracle outcomes were recorded in UTC.
process.env.TZ = 'UTC';
import { createIconicDialogs } from '../../modules/icons/ui/dialog-factory';
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { App, Component as ObsidianComponent, Plugin, Command } from 'obsidian';
import { TFile, TFolder, Menu } from 'obsidian';
import { Component } from '../../../scripts/iconic-obsidian-stub';
import fixture from '../../../scripts/fixtures/iconic/upstream-1.1.10.json';
import RuleManager, { type RuleItem } from '../../modules/icons/platform/managers/rule-manager';
import MenuManager from '../../modules/icons/platform/managers/menu-manager';
import IconicController, { type IconicHost } from '../../modules/icons/platform/host/controller';
import { IconicStore } from '../../modules/icons/platform/persistence/store';
import { DEFAULT_ICONIC_SETTINGS } from '../../modules/icons/core/settings/model';
import { FOLDER_PALETTE } from '../../shared/folder-colors';
import { iconicTranslations as startupIconic } from '../../shared/i18n/iconic';
import { messages as iconsMessages } from './i18n';

/** Iconic strings live partly in startup (commands, settings headings) and partly in the module dictionary. */
const iconicOnly = (dictionary: Record<string, string>) => Object.fromEntries(Object.entries(dictionary).filter(([key]) => key.startsWith('iconic.')));
const iconicTranslations = {
	en: { ...startupIconic.en, ...iconicOnly(iconsMessages.en) } as Record<string, string>,
	zh: { ...startupIconic.zh, ...iconicOnly(iconsMessages.zh) } as Record<string, string>,
};
import { setLanguage } from '../../shared/i18n/index';
import type { FileItem } from '../../modules/icons/core/types';

Object.assign(String, { isString: (value: unknown) => typeof value === 'string' });
Object.assign(Number, { isNumber: (value: unknown) => typeof value === 'number' });
Object.assign(globalThis, { isBoolean: (value: unknown) => typeof value === 'boolean', window: globalThis });

function storage() {
	const files = new Map<string, string>();
	const mtimes = new Map<string, number>();
	const writes: string[] = [];
	const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
	const events = {
		on(name: string, fn: (...args: unknown[]) => void) {
			const set = handlers.get(name) ?? new Set();
			handlers.set(name, set);
			set.add(fn);
			return { off: () => set.delete(fn) };
		},
		emit(name: string, ...args: unknown[]) {
			for (const fn of handlers.get(name) ?? []) fn(...args);
		},
	};
	const win = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
	const doc = Object.assign(new EventTarget(), { defaultView: win, visibilityState: 'visible' });
	const adapter = {
		mkdir: async () => {},
		exists: async (p: string) => files.has(p),
		read: async (p: string) => {
			if (!files.has(p)) throw Error('ENOENT ' + p);
			return files.get(p)!;
		},
		write: async (p: string, text: string) => {
			writes.push(p);
			files.set(p, text);
			mtimes.set(p, Date.now());
			events.emit('raw', p);
		},
		stat: async (p: string) => (files.has(p) ? { mtime: mtimes.get(p) ?? 0 } : null),
		remove: async (p: string) => {
			files.delete(p);
			mtimes.delete(p);
		},
		copy: async (from: string, to: string) => {
			files.set(to, files.get(from)!);
			mtimes.set(to, Date.now());
		},
		rename: async (from: string, to: string) => {
			files.set(to, files.get(from)!);
			mtimes.set(to, mtimes.get(from)!);
			files.delete(from);
			mtimes.delete(from);
		},
	};
	const app = {
		vault: { configDir: '.custom', adapter, ...events },
		metadataCache: { ...events },
		workspace: { containerEl: { ownerDocument: doc }, ...events },
	} as unknown as App;
	return { app, files, mtimes, writes, events, handlers, store: new IconicStore(app, { id: 'huhu' }) };
}
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test('defaults, all locale values, command ids and resource bytes match pinned upstream', () => {
	// HUHU adds two settings on top of the pinned upstream defaults.
	assert.deepEqual(DEFAULT_ICONIC_SETTINGS, { ...fixture.defaults, showDefaultFileTypeIcons: true, colorTopFolders: true });
	const locales = structuredClone(fixture.locales);
	// Reviewed HUHU copy changes. The upstream oracle remains immutable.
	locales.en['iconic.menu.changeIcon'] = 'Change icon…';
	locales.en['iconic.backups.backupNotice'] = 'HUHU could not load icon settings.';
	for (const key of Object.keys(locales.zh) as Array<keyof typeof locales.zh>)
		locales.zh[key] = locales.zh[key].replaceAll('……', '…');
	locales.zh['iconic.backups.backupNotice'] = 'HUHU 无法加载图标设置。';
	locales.zh['iconic.settings.minimalFolderIcons.name'] = '极简文件夹图标';
	const defaultIcons = {
		en: {
			'iconic.settings.showDefaultFileTypeIcons.name': 'Show default file type icons',
			'iconic.settings.showDefaultFileTypeIcons.desc': 'Files and folders without a custom icon show an icon for their type (such as .pdf, .md or .pptx), in the file list and in the note navigator.',
			'iconic.settings.colorTopFolders.name': 'Color folders by top-level folder',
			'iconic.settings.colorTopFolders.desc': 'Each folder directly in the vault gets its own color, in order, and every folder inside it keeps that color. Folders you color yourself are not changed. Needs the default file type icons.',
		},
		zh: {
			'iconic.settings.showDefaultFileTypeIcons.name': '显示默认文件类型图标',
			'iconic.settings.showDefaultFileTypeIcons.desc': '没有自定义图标的文件和文件夹按类型显示图标（例如 .pdf、.md、.pptx），文件列表和笔记导航器都适用。',
			'iconic.settings.colorTopFolders.name': '按一级文件夹着色',
			'iconic.settings.colorTopFolders.desc': '库根目录下的每个一级文件夹按顺序使用不同颜色，其内所有子文件夹（任意深度）保持同色；你手动设置过颜色的文件夹不受影响。需要开启“显示默认文件类型图标”。',
		},
	};
	locales.zh['iconic.commands.toggleQuickSwitcherIcons'] = '切换快速切换器图标';
	assert.deepEqual(iconicTranslations, {
		en: {
			...locales.en,
			...defaultIcons.en,
			// The settings entry is a HUHU module command; the upstream controller ids remain pinned below.
			'iconic.openSettings': 'Open icon settings',
			'iconic.ruleEditor.enabled.name': 'Enable rule',
			'iconic.ruleEditor.enabled.desc': 'Apply this rule to matching items.',
		},
		zh: {
			...locales.zh,
			...defaultIcons.zh,
			'iconic.openSettings': '打开图标设置',
			'iconic.ruleEditor.enabled.name': '启用规则',
			'iconic.ruleEditor.enabled.desc': '将此规则应用到匹配的项目。',
		},
	});
	for (const [name, hash] of Object.entries(fixture.hashes)) {
		const text = readFileSync('src/modules/icons/core/res/' + name, 'utf8').replaceAll('\r\n', '\n');
		// The pinned upstream text is LF; checkout line endings may differ.
		for (const content of [text, text.replaceAll('\n', '\r\n')])
			assert.equal(createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex'), hash, name);
	}
	const ids: string[] = [];
	const f = storage();
	const lifetime = new Component();
	const host = {
		app: f.app,
		manifest: { id: 'huhu', name: 'HUHU' },
		commands: {
			add: (command: Command) => {
				ids.push(command.id);
				return command;
			},
		},
		editor: { addExtension: () => {}, addPostProcessor: () => {} },
		lifetime,
	} as unknown as IconicHost;
	const controller = new IconicController(host, createIconicDialogs);
	// Commands register when the controller loads, even if activation is deferred.
	const internals = controller as unknown as { activate: () => Promise<void> };
	internals.activate = async () => {};
	return controller.onload().then(async () => {
		assert.deepEqual(
			ids,
			fixture.commands.map((id) => (id === 'toggle-minimal.folder-icons' ? 'toggle-minimal-folder-icons' : id)),
		);
	});
});

test('137 rule outcomes match the original 1.1.10 implementation', () => {
	const manager = Object.create(RuleManager.prototype) as RuleManager;
	const tfile = Object.assign(new TFile(), { path: fixture.file.id, stat: fixture.stat });
	Object.assign(manager, {
		plugin: {
			splitFilePath: IconicController.prototype.splitFilePath,
			app: {
				vault: { getAbstractFileByPath: () => tfile },
				metadataCache: { getFileCache: () => fixture.metadata },
			},
		},
	});
	for (const entry of fixture.cases) {
		const rule = {
			id: 'fixture',
			name: 'fixture',
			category: 'rule',
			iconDefault: 'lucide-file',
			icon: null,
			color: null,
			match: 'all',
			enabled: true,
			...entry,
		} as RuleItem;
		assert.equal(
			manager.judgeFile(fixture.file as FileItem, rule, new Date(fixture.now)),
			entry.expected,
			entry.label,
		);
	}
});

test('saves coalesce for 300ms, isolate data.json and own their defaults', async () => {
	const f = storage();
	f.files.set('.custom/plugins/huhu/data.json', '{"unrelated":true}');
	await f.store.load();
	f.store.settings.fileIcons['Z.md'] = { icon: 'lucide-star' };
	const promise = f.store.save();
	f.store.settings.fileIcons['A.md'] = { color: 'red' };
	assert.equal(f.store.save(), promise);
	assert.equal(f.writes.length, 0);
	await promise;
	assert.deepEqual(Object.keys(JSON.parse(f.files.get(f.store.path)!).fileIcons), ['A.md', 'Z.md']);
	assert.equal(f.files.get('.custom/plugins/huhu/data.json'), '{"unrelated":true}');
	assert.deepEqual(f.writes.filter(path => path === f.store.path), [f.store.path]);
	assert.equal(f.files.get(f.store.path + '.backup1'), f.files.get(f.store.path));
	const second = storage();
	await second.store.load();
	assert.deepEqual(second.store.settings.fileIcons, {});
});

test('backup rotation, 0/2/9 limits, corrupt and missing primary recovery', async () => {
	for (const max of [0, 2, 9]) {
		const f = storage();
		f.files.set(f.store.path, JSON.stringify({ ...fixture.defaults, maxBackups: max }));
		await f.store.load();
		for (let index = 1; index <= 9; index++) {
			f.files.set(
				f.store.path + '.backup' + index,
				JSON.stringify({ ...fixture.defaults, maxBackups: max, maxSearchResults: index }),
			);
			f.mtimes.set(f.store.path + '.backup' + index, 1);
		}
		await f.store.saveBackup();
		assert.equal([...f.files.keys()].filter((key) => key.includes('.backup')).length, max);
		if (max > 0) {
			assert.equal(JSON.parse(f.files.get(f.store.path + '.backup1')!).maxBackups, max);
			assert.equal(JSON.parse(f.files.get(f.store.path + '.backup2')!).maxSearchResults, 1);
		}
	}
	for (const corrupt of [true, false]) {
		const f = storage();
		if (corrupt) f.files.set(f.store.path, '{broken');
		f.files.set(f.store.path + '.backup1', JSON.stringify({ ...fixture.defaults, maxSearchResults: 73 }));
		await f.store.load();
		assert.equal(f.store.settings.maxSearchResults, 73);
	}
});

test('raw file watcher reloads external edits, ignores own writes, cancels on disable', async () => {
	const f = storage();
	await f.store.load();
	const scope = new Component();
	let changes = 0;
	f.store.watch(scope as unknown as ObsidianComponent, () => changes++);
	await f.store.save();
	await wait(350);
	await f.store.flush();
	assert.equal(changes, 0);
	f.files.set(f.store.path, JSON.stringify({ ...fixture.defaults, maxSearchResults: 57 }));
	f.events.emit('raw', f.store.path);
	await wait(350);
	await f.store.flush();
	assert.equal(changes, 1);
	assert.equal(f.store.settings.maxSearchResults, 57);
	f.events.emit('raw', f.store.path);
	scope.unload();
	await wait(350);
	assert.equal(changes, 1);
	assert.ok([...f.handlers.values()].every((set) => set.size === 0));
});

test('menu patch restores after ten cycles and preserves later patches', () => {
	const original = Menu.prototype.showAtPosition;
	for (let i = 0; i < 10; i++) {
		const manager = new MenuManager();
		assert.notEqual(Menu.prototype.showAtPosition, original);
		manager.unload();
		assert.equal(Menu.prototype.showAtPosition, original);
	}
	const manager = new MenuManager();
	const later = function (this: Menu) {
		return this;
	};
	Menu.prototype.showAtPosition = later;
	manager.unload();
	assert.equal(Menu.prototype.showAtPosition, later);
	Menu.prototype.showAtPosition = original;
});

test('disable before layout-ready cancels startup; every restart is a new controller and releases its registrations', async () => {
	const f = storage();
	const callbacks: Array<() => void> = [];
	Object.assign(f.app.workspace, { onLayoutReady: (callback: () => void) => callbacks.push(callback) });
	const live = { commands: 0, extensions: 0, processors: 0 };
	let starts = 0;
	const create = () => {
		const lifetime = new Component();
		lifetime.load();
		const track = (key: keyof typeof live) => { live[key]++; lifetime.register(() => { live[key]--; }); };
		const host = {
			app: f.app,
			manifest: { id: 'huhu', name: 'HUHU' },
			commands: { add: (command: Command) => { track('commands'); return command; } },
			editor: { addExtension: () => track('extensions'), addPostProcessor: () => track('processors') },
			lifetime,
		} as unknown as IconicHost;
		const controller = new IconicController(host, createIconicDialogs);
		Object.assign(controller, { startManagers: () => { starts++; }, stopManagers: () => {}, refreshBody: () => {} });
		return { controller, lifetime };
	};
	// Turned off before the layout is ready: nothing starts.
	let run = create();
	await run.controller.onload();
	await run.controller.dispose();
	run.lifetime.unload();
	callbacks.splice(0).forEach((callback) => callback());
	assert.equal(starts, 0);
	assert.deepEqual(live, { commands: 0, extensions: 0, processors: 0 });
	for (let i = 0; i < 10; i++) {
		run = create();
		await run.controller.onload();
		assert.deepEqual(live, { commands: 14, extensions: 1, processors: 1 });
		callbacks.splice(0).forEach((callback) => callback());
		await run.controller.dispose();
		run.lifetime.unload();
		assert.deepEqual(live, { commands: 0, extensions: 0, processors: 0 });
	}
	assert.equal(starts, 10);
	assert.ok([...f.handlers.values()].every((set) => set.size === 0));
	run = create();
	const pending = run.controller.onload();
	const disposing = run.controller.dispose();
	await pending;
	await disposing;
	callbacks.splice(0).forEach((callback) => callback());
	assert.equal(starts, 10);
	assert.equal(run.controller.isActive(), false);
});

test('default file-type icons: files and folders resolve a typed icon, custom icons win, the setting off restores the old behavior', () => {
	const file = (path: string) => Object.assign(new TFile(), { path });
	const folder = (path: string) => Object.assign(new TFolder(), { path, name: path.slice(path.lastIndexOf('/') + 1), children: [] });
	const entries = new Map<string, TFile | TFolder>([
		['a/report.PDF', file('a/report.PDF')],
		['a/note.md', file('a/note.md')],
		['a/x.pdf', file('a/x.pdf')],
		['日志', folder('日志')],
		['a', folder('a')],
	]);
	const controller = Object.create(IconicController.prototype) as IconicController;
	Object.assign(controller, {
		active: true,
		store: { settings: structuredClone(DEFAULT_ICONIC_SETTINGS) },
		host: { app: { vault: { getAbstractFileByPath: (path: string) => entries.get(path) ?? null, getRoot: () => ({ children: [...entries.values()].filter((entry) => !entry.path.includes('/')) }) } } },
	});
	const define = (id: string) => (controller as unknown as { defineFileItem: (f: unknown, id: string) => FileItem }).defineFileItem(entries.get(id), id);

	assert.deepEqual(controller.resolveIcon({ kind: 'file', key: 'a/report.PDF' }), { icon: 'lucide-file-text', emoji: false, color: 'var(--color-red)', isDefault: true });
	assert.equal(controller.resolveIcon({ kind: 'file', key: 'a/deck.pptx' }).icon, 'lucide-presentation');
	assert.equal(controller.resolveIcon({ kind: 'folder', key: '日志' }).icon, 'lucide-calendar-days');
	assert.equal(controller.resolveIcon({ kind: 'folder', key: 'a' }).icon, 'lucide-folder-closed');
	assert.deepEqual(controller.resolveIcon({ kind: 'tag', key: 'x' }), { icon: null, emoji: false, color: null });
	// A per-item color alone keeps the default icon in that color; a per-item icon replaces the default entirely.
	controller.settings.fileIcons['a/report.PDF'] = { color: 'crimson' };
	assert.equal(controller.resolveIcon({ kind: 'file', key: 'a/report.PDF' }).isDefault, true);
	assert.notEqual(controller.resolveIcon({ kind: 'file', key: 'a/report.PDF' }).color, 'var(--color-red)');
	controller.settings.fileIcons['a/report.PDF'] = { icon: 'lucide-star' };
	assert.deepEqual(controller.resolveIcon({ kind: 'file', key: 'a/report.PDF' }), { icon: 'lucide-star', emoji: false, color: null });

	// The file list items carry the same default and its color; folders get the closed variant.
	delete controller.settings.fileIcons['a/report.PDF'];
	assert.equal(define('a/report.PDF').iconDefault, 'lucide-file-text');
	assert.equal(define('a/report.PDF').colorDefault, 'var(--color-red)');
	assert.equal(define('a/note.md').iconDefault, 'lucide-file-text');
	assert.equal(define('日志').iconDefault, 'lucide-calendar-days');
	assert.equal(define('a').iconDefault, 'lucide-folder-closed');

	// Off: no default icons, and the previous neutral defaults return.
	controller.settings.showDefaultFileTypeIcons = false;
	assert.deepEqual(controller.resolveIcon({ kind: 'file', key: 'a/report.PDF' }), { icon: null, emoji: false, color: null });
	assert.equal(define('a/note.md').iconDefault, null);
	assert.equal(define('a').iconDefault, null);
	controller.settings.showAllFileIcons = true;
	assert.equal(define('a/x.pdf').iconDefault, 'lucide-file-text');
	assert.equal(define('a/note.md').iconDefault, 'lucide-file');
	assert.equal(define('a/note.md').colorDefault, null);
});

test('top-level folders take palette colors in order and every folder below keeps its top-level color', () => {
	const folder = (path: string) => Object.assign(new TFolder(), { path, name: path.slice(path.lastIndexOf('/') + 1), children: [] });
	const paths = ['Inbox', 'Archive', 'Projects', 'Projects/Alpha', 'Projects/Alpha/Deep', 'Archive/2025'];
	const entries = new Map<string, TFolder>(paths.map((path) => [path, folder(path)]));
	const topLevel = () => [...entries.values()].filter((entry) => !entry.path.includes('/'));
	const controller = Object.create(IconicController.prototype) as IconicController;
	Object.assign(controller, {
		active: true,
		store: { settings: structuredClone(DEFAULT_ICONIC_SETTINGS) },
		host: { app: { vault: { getAbstractFileByPath: (path: string) => entries.get(path) ?? null, getRoot: () => ({ children: topLevel() }) } } },
	});
	const color = (key: string) => controller.resolveIcon({ kind: 'folder', key }).color;
	const define = (id: string) => (controller as unknown as { defineFileItem: (f: unknown, id: string) => FileItem }).defineFileItem(entries.get(id), id);

	// Name order: Archive, Inbox, Projects.
	assert.equal(color('Archive'), FOLDER_PALETTE[0]);
	assert.equal(color('Inbox'), FOLDER_PALETTE[1]);
	assert.equal(color('Projects'), FOLDER_PALETTE[2]);
	assert.equal(color('Projects/Alpha'), FOLDER_PALETTE[2]);
	assert.equal(color('Projects/Alpha/Deep'), FOLDER_PALETTE[2]);
	assert.equal(color('Archive/2025'), FOLDER_PALETTE[0]);
	// The Obsidian file list gets the same color for the default folder icon.
	assert.equal(define('Projects/Alpha/Deep').colorDefault, FOLDER_PALETTE[2]);
	assert.equal(define('Inbox').iconDefault, 'lucide-folder-closed');
	// A folder the user colored keeps its own color; a rule color or an own icon color also wins over the palette.
	controller.settings.fileIcons['Projects/Alpha'] = { color: 'crimson' };
	assert.notEqual(color('Projects/Alpha'), FOLDER_PALETTE[2]);
	assert.equal(color('Projects/Alpha/Deep'), FOLDER_PALETTE[2]);
	// A new top-level folder shifts the folders after it; the palette wraps around.
	entries.set('Admin', folder('Admin'));
	assert.equal(color('Archive'), FOLDER_PALETTE[1]);
	assert.equal(color('Admin'), FOLDER_PALETTE[0]);
	for (let n = 0; n < FOLDER_PALETTE.length; n++) entries.set(`Z${n}`, folder(`Z${n}`));
	assert.equal(color('Z0'), FOLDER_PALETTE[4]);
	// Off: the default table's own colors return.
	controller.settings.colorTopFolders = false;
	assert.equal(color('Projects/Alpha/Deep'), null);
	assert.equal(define('Projects/Alpha/Deep').colorDefault, null);
});

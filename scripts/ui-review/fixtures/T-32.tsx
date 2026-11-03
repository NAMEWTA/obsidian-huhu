/** Real archives page content and vault page. Only vault I/O, encryption and the clipboard are substituted. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { App } from 'obsidian';
import { createStore } from 'zustand/vanilla';
import { registerMessages, setLanguage, t } from '../../../src/shared/i18n';
import { HuhuProviders } from '../../../src/ui/react/providers';
import { messages as safeMessages } from '../../../src/modules/safe/i18n';
import { messages as archiveMessages } from '../../../src/modules/archives/i18n';
import { SafePage } from '../../../src/modules/safe/ui/SafePage';
import { SafeError, type EntryInput, type SafeEntry } from '../../../src/modules/safe/core/model';
import { DEFAULT_LOCK_POLICY } from '../../../src/modules/safe/core/policy';
import type { SafePreferences, SafeViewMode } from '../../../src/modules/safe/services/preferences';
import type { SafeService, SafeState } from '../../../src/modules/safe/services/safe-service';
import { ArchivesContent } from '../../../src/modules/archives/ui/generic/workbench-page';
import type { ArchivePageState } from '../../../src/modules/archives/ui/generic/page-state';
import type { GenericArchivesHost } from '../../../src/modules/archives/services/generic/page-host';
import { ArchivesApplication } from '../../../src/modules/archives/services/generic/application';
import { memoryArchives } from '../../../src/modules/archives/services/generic/test-port';
import { PERSON } from '../../../src/modules/archives/core/schema/presets';

// The production graph also contains the command palette's Radix copy; the owner-document adapter checks that complete graph.
import '../../../src/ui/components/command';
registerMessages(safeMessages);
registerMessages(archiveMessages);
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
for (const doc of Object.values(docs))
	Object.defineProperty(doc.body, 'createDiv', { value: (options?: { cls?: string }) => {
		const element = doc.createElement('div'); element.className = options?.cls ?? ''; doc.body.append(element); return element;
	} });
const stamp = '2026-10-21T00:00:00.000Z';
const credential = (n: number, username: string, notes = '') => ({
	id: `c000000${n}-1111-4111-8111-111111111111`, username, password: `fixture-secret-${n}`, notes, phone: '', email: '', relations: [], updatedAt: stamp,
});
const entry = (n: number, title: string, url: string, tags: string[], credentials = [credential(n, `person${n}@example.test`)]): SafeEntry => ({
	id: `e000000${n}-3986-4c8c-a7ef-4349727dfdf3`, title, url, notes: '', icon: null, tags, credentials, createdAt: stamp, updatedAt: stamp, deletedAt: null,
});
const entries = [
	entry(1, 'Private mailbox', 'https://private.example.test', ['mail', 'personal']),
	entry(2, 'A deliberately long vault record title that must wrap or truncate without moving the actions / 一个很长的保险箱记录名称必须折行或省略', 'https://very-long-subdomain.example.test/account/settings/security/recovery', ['work', 'longer-tag-name-for-narrow-layout'], [credential(2, 'first.person.with.a.long.address@example.test', '主账号'), credential(3, 'second@example.test', '备用')]),
	entry(4, 'Bank', 'https://bank.example.test', ['finance']),
];

const behaviors = { unlock: 'reject' as 'reject' | 'ok', save: 'reject' as 'reject' | 'ok', saves: 0, unlocks: 0, copies: 0 };
function safeService(status: SafeState['status']) {
	const store = createStore<SafeState>(() => ({ status, entries: status === 'unlocked' ? entries : [], busy: false, error: null, generation: 1, upgraded: false }));
	const set = (next: SafeState['status']) => store.setState(state => ({ status: next, entries: next === 'unlocked' ? entries : [], generation: state.generation + 1, busy: false, error: null }));
	const stub = {
		store,
		lock: () => set('locked'),
		checkDeadline: () => true, touch() {}, clearError() {}, leave() {},
		lockPolicy: () => DEFAULT_LOCK_POLICY, subscribePolicy: () => () => {},
		saveEntry: async (_input: EntryInput) => {
			behaviors.saves++;
			if (behaviors.save === 'reject') throw new SafeError('storage');
		},
		generatePassword: () => 'Aa2!Bb3@Cc4#',
		renameTag: async () => {}, trashEntry: async () => {}, restoreEntry: async () => {}, deleteEntry: async () => {},
		changePassword: async () => {},
		copy: async () => { behaviors.copies++; },
		openUrl: async () => {},
		exportBackup: async () => true, pickBackup: async () => null,
		prepareRestore: async () => ({ token: 't', entryCount: 3 }), commitRestore: async () => {}, cancelRestore() {},
		prepareImport: async () => { throw new SafeError('invalid-format'); }, commitImport: async () => { throw new SafeError('invalid-format'); }, cancelImport() {},
		probe: async () => {},
		create: async () => {},
		unlock: async () => {
			behaviors.unlocks++;
			if (behaviors.unlock === 'reject') throw new SafeError('unlock-failed');
			set('unlocked');
		},
	};
	return stub as unknown as SafeService;
}
function preferences(): SafePreferences {
	let mode: SafeViewMode = 'list';
	const listeners = new Set<() => void>();
	return { viewMode: () => mode, setViewMode(next) { mode = next; listeners.forEach(fn => fn()); }, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
}

function ArchivesHarness({ host }: { host: GenericArchivesHost }) {
	const [state, setState] = useState<ArchivePageState>({ search: '', offset: 0, scroll: 0 });
	return <ArchivesContent
		host={host}
		app={{ vault: { getFileByPath: () => null }, workspace: { containerEl: document.body } } as unknown as App}
		owner={document.body}
		state={state}
		updateState={value => setState(previous => ({ ...previous, ...value }))}
		open={async (section, resourceId) => setState(previous => ({ search: '', offset: 0, scroll: 0, section: section ?? previous.section, selectedId: resourceId }))}
		guard={() => {}}
	/>;
}

async function mount(doc: Document) {
	const archive = await memoryArchives();
	const application = new ArchivesApplication(archive.runtime);
	const names = ['Alice Example', '一个很长的人员姓名用于检查窄容器中的折行 With A Very Long Latin Name That Keeps Going', 'Bob Example'];
	for (const [index, name] of names.entries())
		await application.commands.create({ operationId: `fixture-${index}`, typeId: PERSON.id, values: { name, region: index === 1 ? 'Taipei / 台北' : 'Shanghai' } });
	const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6, rootFolder: '' }), update: async () => {} } } as unknown as GenericArchivesHost;
	const locked = safeService('locked'), unlocked = safeService('unlocked');
	const container = doc.createElement('main');
	container.innerHTML = ['safe-locked', 'safe-unlocked', 'archives'].map(name => `<section data-review="${name}" class="huhu-ui review-region"></section>`).join('');
	doc.body.append(container);
	const region = (name: string) => container.querySelector<HTMLElement>(`[data-review=${name}]`)!;
	const roots = [
		[region('safe-locked'), <SafePage service={locked} preferences={preferences()} />],
		[region('safe-unlocked'), <SafePage service={unlocked} preferences={preferences()} />],
		[region('archives'), <ArchivesHarness host={host} />],
	] as const;
	const mounted = roots.map(([element, node]) => {
		const root = createRoot(element);
		root.render(<HuhuProviders ownerDocument={doc}>{node}</HuhuProviders>);
		return root;
	});
	return { archive, application, locked, unlocked, unmount: () => mounted.forEach(root => root.unmount()) };
}

void (async () => {
	const mounts = { main: await mount(docs.main), other: await mount(docs.other) };
	Object.assign(window, { uiReview: {
		docs, mounts, behaviors, t,
		configure(language: 'en' | 'zh', theme: string) {
			setLanguage(language);
			for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
		},
		unmount() { for (const mounted of Object.values(mounts)) mounted.unmount(); },
	} });
})();

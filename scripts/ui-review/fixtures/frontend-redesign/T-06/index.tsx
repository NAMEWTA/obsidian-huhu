import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { App } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { ArchivesContent } from '../../../../../src/modules/archives/ui/generic/workbench-page';
import {
	restoreArchivePageState,
	type ArchivePageState,
} from '../../../../../src/modules/archives/ui/generic/page-state';
import { genericArchivesWorkbench } from '../../../../../src/modules/archives/services/generic/workbench';
import { ArchivesApplication } from '../../../../../src/modules/archives/services/generic/application';
import { memoryArchives } from '../../../../../src/modules/archives/services/generic/test-port';
import { encodeEntity } from '../../../../../src/modules/archives/core/generic/markdown';
import { PERSON } from '../../../../../src/modules/archives/core/schema/presets';
import type { ArchiveTypeDefinition } from '../../../../../src/modules/archives/core/schema/model';
import { archivesSettingsPage } from '../../../../../src/modules/archives/ui/settings-page';
import { archivesSettings } from '../../../../../src/modules/archives/settings';
import { SettingsStore } from '../../../../../src/shared/settings/store';
import { SidePanel } from '../../../../../src/shell/panel/SidePanel';
import { messages } from '../../../../../src/modules/archives/i18n';
import { registerMessages, setLanguage, t } from '../../../../../src/shared/i18n';
import { applyInterfaceTheme } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import type { WorkbenchTarget } from '../../../../../src/app/contracts/workbench';

const field = (
	fieldId: string,
	kind: ArchiveTypeDefinition['fields'][number]['kind'],
	extra: Partial<ArchiveTypeDefinition['fields'][number]> = {},
) => ({ fieldId, storageKey: 'review-' + fieldId, label: fieldId, kind, ...extra });
const type: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'review-type',
	label: 'Review records',
	icon: 'files',
	folder: 'review',
	enabled: true,
	nameFieldId: 'name',
	fields: [
		field('name', 'text', { required: true }),
		field('markdown', 'markdown'),
		field('integer', 'integer'),
		field('decimal', 'decimal'),
		field('money', 'money'),
		field('boolean', 'boolean'),
		field('day', 'date', { precision: 'day' }),
		field('month', 'date', { precision: 'month' }),
		field('mixed', 'date', { precision: 'mixed' }),
		field('datetime', 'datetime'),
		field('select', 'select', {
			options: [
				{ id: 'option-a', value: 'A', label: 'A' },
				{ id: 'option-b', value: 'B', label: 'B' },
			],
		}),
		field('multiselect', 'multiselect', { options: [{ id: 'multi-a', value: 'A', label: 'A' }] }),
		field('strings', 'strings'),
		field('file', 'file'),
		field('table', 'table', { columns: [field('child', 'text')] }),
	],
};
function hostDOM(doc: Document) {
	const prototype = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	Object.defineProperties(prototype, {
		win: {
			configurable: true,
			get(this: HTMLElement) {
				return this.ownerDocument.defaultView;
			},
		},
		doc: {
			configurable: true,
			get(this: HTMLElement) {
				return this.ownerDocument;
			},
		},
	});
	Object.assign(prototype, {
		empty(this: HTMLElement) {
			this.replaceChildren();
		},
		addClass(this: HTMLElement, ...names: string[]) {
			this.classList.add(...names);
		},
		removeClass(this: HTMLElement, ...names: string[]) {
			this.classList.remove(...names);
		},
		createDiv(this: HTMLElement, options: { cls?: string } = {}) {
			const n = this.ownerDocument.createElement('div');
			n.className = options.cls ?? '';
			this.append(n);
			return n;
		},
	});
}
type Leaf = {
	element: HTMLElement;
	main: HTMLElement;
	side: HTMLElement;
	roots: Root[];
	state: ArchivePageState;
	visible: boolean;
	mode: 'archives' | 'settings';
	leave?: () => Promise<boolean>;
	render: () => void;
	navigate: (section?: string, id?: string) => Promise<void>;
	dispose: () => void;
};
const leaves: Record<string, Leaf> = {};
let theme = themeSettings.normalize({});
async function bootstrap() {
	const docs = await readyDocuments(document);
	Object.values(docs).forEach(hostDOM);
	registerMessages(messages);
	const base = await memoryArchives();
	const initialApp = new ArchivesApplication(base.runtime);
	const publication = await initialApp.commands.publishDefinition({
		operationId: 'review-type-v1',
		expectedHeads: [],
		definition: type,
	});
	await initialApp.commands.publishDefinition({
		operationId: 'review-empty-v1',
		expectedHeads: [],
		definition: {
			...type,
			id: 'review-empty-type',
			label: 'Empty records',
			folder: 'empty-review',
			fields: [field('name', 'text', { required: true })],
		},
	});
	const seed = new Map(base.files.text);
	for (let i = 0; i < 1201; i++) {
		const id = 'review-' + String(i).padStart(4, '0'),
			path = 'huhu/archives/review/' + id + '/profile.md';
		seed.set(
			path,
			encodeEntity(
				{
					id,
					typeId: type.id,
					schemaRevisionId: publication.revision.revisionId,
					lifecycle: 'active',
					values: {
						name: 'Record ' + String(i).padStart(4, '0'),
						markdown: i === 1200 ? 'Search beyond500' : '',
					},
					path,
					contentHash: '',
					modified: 0,
				},
				type,
			),
		);
	}
	base.runtime.dispose();
	const memory = await memoryArchives(seed);
	const application = new ArchivesApplication(memory.runtime);
	await application.personJournal.install();
	await application.commands.belongings.install();
	const belonging = await application.commands.create({
		operationId: 'review-camera',
		typeId: 'type-belonging',
		values: { name: 'Review camera', purchaseDate: '2026-01-01', purchase: { amount: '100.00', currency: 'CNY' } },
	});
	const person = await application.commands.create({
		operationId: 'review-person',
		typeId: PERSON.id,
		values: { name: 'Review person', birthday: '2000-02-29' },
	});
	const friend = await application.commands.create({
		operationId: 'review-friend',
		typeId: PERSON.id,
		values: { name: 'Review friend' },
	});
	await application.commands.createRelation({
		operationId: 'review-friendship',
		relationTypeId: 'relation-friend',
		sourceId: person.id,
		targetId: friend.id,
		values: {},
		contextRefs: {},
	});
	memory.files.seed('review-attachment.txt', 'Review attachment');
	for (let i = 0; i < 65; i++)
		memory.files.seed(
			'huhu/archives/review/review-0000/Resource-' + String(i).padStart(2, '0') + '.txt',
			'Review resource',
		);
	const sample = await application.commands.beginEdit('review-0000');
	sample.draft = {
		...sample.draft,
		markdown: '**Markdown**\nSecond line',
		integer: 0,
		decimal: 1.25,
		money: { amount: '001.20', currency: 'CNY' },
		boolean: false,
		day: '2026-11-05',
		month: '2026-11',
		mixed: '2026-11',
		datetime: '2026-11-01T01:30:05.120-04:00',
		select: 'A',
		multiselect: ['A'],
		strings: ['0012'],
		file: 'review-attachment.txt',
		table: [{ rowId: 'row-one', values: { child: 'Child' } }],
	};
	// Money uses canonical decimal grammar; preserve spelling in the valid definition.
	(sample.draft.money as { amount: string }).amount = '1.20';
	sample.dirtyFields = Object.keys(sample.draft);
	await application.commands.save({ operationId: 'review-initial-values', session: sample });
	const settingsStore = new SettingsStore(
		{ load: async () => null, save: async (_scope, file) => file },
		{
			timers: {
				set: (callback, ms) => docs.main.defaultView!.setTimeout(callback, ms),
				clear: (handle) => docs.main.defaultView!.clearTimeout(handle as number),
			},
			debounceMs: 0,
		},
	);
	const settings = settingsStore.bind('archives', archivesSettings);
	const app = {
		vault: {
			on: () => ({}),
			offref: () => {},
			getAllLoadedFiles: () => [{ path: 'huhu/archives', children: [] }],
			getFileByPath: (path: string) => memory.files.getFileByPath(path),
			getFiles: () => [...memory.files.files.values()],
		},
		workspace: { layoutReady: true, containerEl: docs.main.body },
	} as unknown as App;
	const errors: string[] = [];
	const workbench = genericArchivesWorkbench(() => application);
	for (const [name, doc] of Object.entries(docs)) {
		const element = doc.createElement('div');
		element.dataset.huhuLeaf = '';
		element.className = 'huhu-ui';
		element.dataset.reviewLeaf = name;
		element.style.cssText = 'display:flex;width:100%;height:100vh;min-width:0;overflow:hidden';
		doc.body.append(element);
		const side = doc.createElement('div');
		side.dataset.reviewSide = '';
		side.style.cssText = 'width:272px;min-width:272px;height:100%';
		element.append(side);
		const main = doc.createElement('div');
		main.dataset.reviewMain = '';
		main.style.cssText = 'flex:1;min-width:0;overflow:auto;height:100%';
		element.append(main);
		const roots = [createRoot(side), createRoot(main)];
		const settingsApp = { ...app, workspace: { ...app.workspace, containerEl: doc.body } } as App;
		const SettingsPage = archivesSettingsPage(
			settingsApp,
			{
				countFolder: async (root: string) =>
					[...memory.files.files.keys()].filter((path) => path.startsWith(root + '/')).length,
				queue: { settled: async () => {} },
				reload: () => memory.runtime.reload(),
			} as unknown as Parameters<typeof archivesSettingsPage>[1],
			settings,
		);
		const leaf: Leaf = {
			element,
			side,
			main,
			roots,
			state: restoreArchivePageState({ section: type.id }),
			visible: true,
			mode: 'archives',
			render() {
				const target: WorkbenchTarget = {
					feature: 'contacts',
					section: leaf.state.section,
					resourceId: leaf.state.selectedId,
				};
				flushSync(() => {
					roots[0]!.render(
						<HuhuProviders ownerDocument={element.ownerDocument} visible={leaf.visible}>
							<SidePanel
								title={t('workbench.contacts')}
								customRef={() => {}}
								model={workbench.panel(target)}
								current={target}
								onNavigate={(next) => {
									void leaf.navigate(next.section, next.resourceId);
								}}
								report={(error) => errors.push(String(error))}
							/>
						</HuhuProviders>,
					);
					roots[1]!.render(
						<HuhuProviders ownerDocument={element.ownerDocument} visible={leaf.visible}>
							{leaf.mode === 'settings' ? (
								<SettingsPage />
							) : (
								<ArchivesContent
									host={{ application, settings }}
									app={app}
									owner={element}
									state={leaf.state}
									updateState={(patch) => {
										leaf.state = { ...leaf.state, ...patch };
										leaf.render();
									}}
									open={leaf.navigate}
									guard={(callback) => {
										leaf.leave = callback;
									}}
								/>
							)}
						</HuhuProviders>,
					);
				});
				element.hidden = !leaf.visible;
				for (const node of element.ownerDocument.querySelectorAll<HTMLElement>('.huhu-ui'))
					applyInterfaceTheme(node, theme);
			},
			async navigate(section, id) {
				leaf.mode = 'archives';
				if (leaf.leave && !(await leaf.leave())) return;
				leaf.leave = undefined;
				leaf.state = { ...leaf.state, section: section ?? leaf.state.section, selectedId: id };
				leaf.render();
			},
			dispose() {
				roots.forEach((root) => root.unmount());
				element.remove();
			},
		};
		leaves[name] = leaf;
		leaf.render();
	}
	let active = true,
		queued = false;
	const unsubscribe = application.catalog.subscribe(() => {
		if (queued) return;
		queued = true;
		queueMicrotask(() => {
			queued = false;
			if (active) Object.values(leaves).forEach((leaf) => leaf.render());
		});
	});
	Object.assign(globalThis, {
		uiReview: {
			sequence: 0,
			docs,
			leaves,
			application,
			memory,
			errors,
			text: (key: string, params?: Record<string, string | number>) => t(key, params),
			type,
			personId: person.id,
			belongingId: belonging.id,
			settings,
			settingsPage: (name: string) => {
				leaves[name]!.mode = 'settings';
				leaves[name]!.render();
			},
			navigate: (name: string, section?: string, id?: string) => leaves[name]!.navigate(section, id),
			failWrite() {
				let first = true;
				memory.files.beforeWrite = () => {
					if (first) {
						first = false;
						throw new Error('Review write failure');
					}
				};
			},
			clearFault() {
				memory.files.beforeWrite = undefined;
			},
			async reloadFailure() {
				const original = memory.files.read.bind(memory.files);
				memory.files.read = () => Promise.reject(new Error('Review read failure'));
				try {
					await memory.runtime.reload();
				} finally {
					memory.files.read = original;
				}
			},
			reload: () => memory.runtime.reload(),
			resize: (name: string, width: number | null) => {
				leaves[name]!.element.style.width = width === null ? '100%' : width + 'px';
				leaves[name]!.side.hidden = (width ?? leaves[name]!.element.getBoundingClientRect().width) < 960;
			},
			visible: (name: string, visible: boolean) => {
				leaves[name]!.visible = visible;
				leaves[name]!.render();
			},
			async dispose() {
				active = false;
				unsubscribe();
				Object.values(leaves).forEach((leaf) => leaf.dispose());
				memory.runtime.dispose();
				await settingsStore.dispose();
			},
			configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				theme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					source: sample.source,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion ?? (sample.reducedMotion ? 'reduce' : 'system'),
				});
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = String(sample.language);
					doc.body.className =
						(sample.theme === 'ink' ? 'theme-dark' : 'theme-light') + (sample.mobile ? ' is-mobile' : '');
					const dark = sample.theme === 'ink',
						surface = dark ? '#1d1c19' : '#ffffff';
					const colors: Record<string, string> = {
						'background-primary': surface,
						'background-secondary': surface,
						'background-secondary-alt': surface,
						'text-normal': dark ? '#eeeeee' : '#111111',
						'text-muted': dark ? '#cccccc' : '#444444',
						'interactive-accent': dark ? '#6fb4af' : '#24575a',
						'text-on-accent': dark ? '#0f1f1e' : '#ffffff',
						'text-accent':
							sample.hostMode === 'unsafe' ? (dark ? surface : '#767676') : dark ? '#eeeeee' : '#111111',
					};
					for (const [key, value] of Object.entries(colors)) {
						doc.body.style.removeProperty('--' + key);
						if (sample.source === 'obsidian') doc.body.style.setProperty('--' + key, value);
					}
				}
				Object.values(leaves).forEach((leaf) => leaf.render());
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });

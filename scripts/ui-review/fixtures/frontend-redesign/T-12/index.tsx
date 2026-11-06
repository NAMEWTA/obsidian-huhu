import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Component } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { DesignScope } from '../../../../../src/ui/react/design-scope';
import { SidePanel } from '../../../../../src/shell/panel/SidePanel';
import { settingsPanel } from '../../../../../src/app/workbench/settings-categories';
import type { WorkbenchTarget } from '../../../../../src/app/contracts/workbench';
import { SettingsPage } from '../../../../../src/app/settings/react/SettingsPage';
import { IconicSettings, ICONIC_SETTINGS_PAGES } from '../../../../../src/modules/icons/ui/settings/sections';
import { RulePickerContent } from '../../../../../src/modules/icons/ui/dialogs/rule-picker';
import { RuleEditorContent } from '../../../../../src/modules/icons/ui/dialogs/rule-editor';
import { IconPickerContent } from '../../../../../src/modules/icons/ui/dialogs/icon-picker';
import { PathList } from '../../../../../src/modules/icons/ui/dialogs/PathList';
import { DEFAULT_ICONIC_SETTINGS } from '../../../../../src/modules/icons/core/settings/model';
import RuleManager from '../../../../../src/modules/icons/platform/managers/rule-manager';
import type IconicController from '../../../../../src/modules/icons/platform/host/controller';
import { appSchema } from '../../../../../src/app/settings/app-schema';
import { installFixtureTheme } from '../shared/fixture-theme';
import { registerMessages, setLanguage, t } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/modules/icons/i18n';
import type DashboardPlugin from '../../../../../src/app/main';
import { MANIFESTS } from '../../../../../src/app/manifests';
import { ICONS } from '../../../../../src/modules/icons/platform/resources';

registerMessages(messages);
Object.assign(Component.prototype, { load() {}, unload() {} });
ICONS.set('lucide-file', ['File', ['document']]);
ICONS.set('lucide-folder', ['Folder', ['directory']]);
const states = [
	'appearance',
	'appearance-custom',
	'appearance-suliworld',
	'appearance-fonts',
	'general',
	'about',
	'search',
	...ICONIC_SETTINGS_PAGES,
	'rules',
	'rule-editor',
	'rule-editor-date',
	'rule-editor-datetime',
	'rule-editor-time',
	'icon-picker',
	'icon-picker-multi',
	'rule-checker',
	'usage-checker',
	'usage-empty',
];
async function bootstrap() {
	const docs = await readyDocuments(document);
 const themeIO={failNext:false,attempts:0,saved:0,savedMotion:null as string|null};
 const fixtureTheme=await installFixtureTheme(docs,{save:async(_scope,file)=>{themeIO.attempts++;if(themeIO.failNext){themeIO.failNext=false;throw Error('Fixture disk unavailable');}themeIO.saved++;const motion=file.namespaces.theme?.motion;if(typeof motion==='string')themeIO.savedMotion=motion;return file;}});
	Object.defineProperty(globalThis, 'activeWindow', { configurable: true, get: () => docs.main.defaultView });
	const owners: Record<string, ReturnType<typeof makeOwner>> = {};
	function makeOwner(doc: Document) {
		const win = doc.defaultView as Window & typeof globalThis;
		Object.defineProperties(win.HTMLElement.prototype, {
			doc: {
				configurable: true,
				get(this: HTMLElement) {
					return this.ownerDocument;
				},
			},
			win: {
				configurable: true,
				get(this: HTMLElement) {
					return this.ownerDocument.defaultView;
				},
			},
		});
		Object.assign(win.HTMLElement.prototype, {
			createDiv(this: HTMLElement, options: { text?: string; cls?: string } = {}) {
				const n = doc.createElement('div');
				n.textContent = options.text ?? '';
				n.className = options.cls ?? '';
				this.append(n);
				return n;
			},
			empty(this: HTMLElement) {
				this.replaceChildren();
			},
		});
		const host = doc.createElement('main');
		host.className = 'huhu-ui';
		host.setAttribute('data-huhu-leaf', '');
		doc.body.append(host);
		const root = createRoot(host);
		const store = fixtureTheme.store;
		const theme = fixtureTheme.settings;
		const appSettings = store.bind('app', appSchema('en'));
		const listeners = new Set<() => void>();
		const app = {
			workspace: { containerEl: host, on: () => ({}), offref() {} },
			vault: { getFiles: () => [], getAllFolders: () => [], adapter: { exists: async () => false } },
		};
		const plugin = {
			app,
			theme,
			appSettings,
			manifest: { version: '0.0.3' },
			moduleManifests: () => MANIFESTS,
			moduleEnabled: () => false,
			moduleState: () => 'disabled',
			moduleInstance: () => undefined,
			onModuleChanged: (fn: () => void) => {
				listeners.add(fn);
				return () => listeners.delete(fn);
			},
			changeLanguage: async (language: 'en' | 'zh') => {
				setLanguage(language);
				await appSettings.update((draft) => {
					draft.language = language;
				});
			},
			setModuleEnabled: async () => {},
			activateModule: async () => {},
			openWorkbench: async () => {},
		} as unknown as DashboardPlugin;
		const settings = structuredClone(DEFAULT_ICONIC_SETTINGS);
		const icon = {
			settings,
			app,
			manifest: { dir: '' },
			dialogCommands: [],
			isActive: () => true,
			saveSettings: async () => {},
			updatePreference: async (key: string, value: unknown) => {
				Object.assign(settings, { [key]: value });
			},
			updateDialogState: (patch: object) => Object.assign(settings.dialogState, patch),
			refreshBody() {},
			refreshManagers() {},
			getFileItems: () => [],
			getFolderItems: () => [],
			isSettingEnabled: (key: keyof typeof settings) => settings[key] === 'on' || settings[key] === 'desktop',
			getPropertyItems: () => [],
			getPropertyItem: () => null,
			splitFilePath: (path: string) => ({
				tree: path.slice(0, path.lastIndexOf('/') + 1),
				basename: path.split('/').at(-1)?.replace(/\.md$/, '') ?? '',
				extension: 'md',
			}),
			saveFileIcon() {},
		} as unknown as IconicController;
		icon.ruleManager = new RuleManager(icon);
		const rule = icon.ruleManager.newRule('file');
		const item = {
			items: null,
			id: 'huhu/notes/Review.md',
			name: 'Review',
			category: 'file' as const,
			icon: 'lucide-file',
			iconDefault: 'lucide-file',
			color: null,
		};
		let searchTarget: WorkbenchTarget = { feature: 'settings', section: 'general' };
		let mode = 'appearance',
			revision = 0;
		const render = () =>
			flushSync(() =>
				root.render(
					<HuhuProviders ownerDocument={doc}>
						<DesignScope className="@container min-w-0 p-4">
							<div key={`${mode}-${revision}`} data-review-state={mode}>
								{mode === 'search' ? (
									<div className="grid min-w-0 gap-4 @min-[600px]:grid-cols-[17rem_minmax(0,1fr)]">
										<SidePanel
											title={t('workbench.settings')}
											model={settingsPanel(plugin, searchTarget.section)}
											current={searchTarget}
											customRef={() => {}}
											onNavigate={(target) => {
												searchTarget = target;
												render();
											}}
											report={(error) => {
												throw error;
											}}
										/>
										<SettingsPage
											plugin={plugin}
											category={searchTarget.section ?? 'general'}
											resourceId={searchTarget.resourceId}
											focusId={searchTarget.focusId}
											focusToken={revision}
											navigate={(target) => {
												searchTarget = target;
												render();
											}}
										/>
									</div>
								) : mode.startsWith('iconic-') ? (
									<IconicSettings plugin={icon} section={mode} />
								) : mode === 'rules' ? (
									<RulePickerContent plugin={icon} />
								) : mode.startsWith('rule-editor') ? (
									<RuleEditorContent
										plugin={icon}
										page="file"
										initial={
											mode === 'rule-editor'
												? rule
												: {
														...rule,
														conditions: [
															{
																source: 'created',
																operator: mode.endsWith('datetime')
																	? 'datetimeIs'
																	: mode.endsWith('time')
																		? 'timeIs'
																		: 'dateIs',
																value: mode.endsWith('datetime')
																	? '2026-11-06T09:30'
																	: mode.endsWith('time')
																		? '09:30'
																		: '2026-11-06',
															},
														],
													}
										}
										accept={() => {}}
										close={() => {}}
									/>
								) : mode.startsWith('icon-picker') ? (
									<IconPickerContent
										plugin={icon}
										items={
											mode.endsWith('multi')
												? [item, { ...item, id: 'Other.md', name: 'Other' }]
												: [item]
										}
										accept={() => {}}
										close={() => {}}
									/>
								) : ['rule-checker', 'usage-checker', 'usage-empty'].includes(mode) ? (
									<PathList
										plugin={icon}
										initial={mode === 'usage-empty' ? [] : [item]}
										page={mode === 'rule-checker' ? 'file' : undefined}
										unused={mode !== 'rule-checker'}
									/>
								) : (
									<SettingsPage
										plugin={plugin}
										category={mode.startsWith('appearance') ? 'appearance' : mode}
										navigate={() => {}}
									/>
								)}
							</div>
						</DesignScope>
					</HuhuProviders>,
				),
			);
		return {
			host,
			root,
			store,
			theme,
 themeIO,
			appSettings,
			icon,
			plugin,
			get mode() {
				return mode;
			},
			fail() {
				themeIO.failNext = true;
			},
			async show(next: string) {
				mode = next;
				revision++;
				if (mode.startsWith('appearance'))
					await theme.update((draft) => {
						draft.editor =
							mode === 'appearance-custom'
								? 'custom'
								: mode === 'appearance-suliworld'
									? 'suliworld'
									: 'follow';
						if (mode === 'appearance-fonts') {
							draft.fontText = 'custom';
							draft.fontMono = 'custom';
							draft.fontInterface = 'custom';
						}
					});
				render();
			},
			render,
			async dispose() {
				root.unmount();
				icon.ruleManager?.unload();
				host.remove();
			},
		};
	}
	for (const [name, doc] of Object.entries(docs)) {
		owners[name] = makeOwner(doc);
		owners[name]!.render();
	}
	Object.assign(globalThis, {
		uiReview: {
			docs,
			owners,
			states,
			text: t,
			async show(name: string, state: string) {
				await owners[name]!.show(state);
			},
			async configure(sample: Record<string, unknown>) {
 setLanguage(sample.language === 'zh' ? 'zh' : 'en');
 await fixtureTheme.configure(sample);
 for(const [name,doc]of Object.entries(docs)){doc.documentElement.lang=String(sample.language);owners[name]!.render();}
 },
			async dispose() {
				await Promise.all(Object.values(owners).map((owner) => owner.dispose()));
 await fixtureTheme.dispose();
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });

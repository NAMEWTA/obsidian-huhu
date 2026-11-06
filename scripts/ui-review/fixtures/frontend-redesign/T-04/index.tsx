import { useLayoutEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { Component, Platform } from 'obsidian';
import type { App } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { ReactSurface } from '../../../../../src/ui/react/surface';
import { createWorkbenchSurface } from '../../../../../src/shell/host/workbench-surface';
import type {
	WorkbenchHost,
	WorkbenchLeafView,
	WorkbenchSurface,
} from '../../../../../src/app/contracts/workbench-host';
import type { WorkbenchFeature, WorkbenchTarget } from '../../../../../src/app/contracts/workbench';
import { WORKBENCH_UI_SCHEMA } from '../../../../../src/app/contracts/workbench-state';
import { useLeafMetrics } from '../../../../../src/ui/react/use-leaf-metrics';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { useT } from '../../../../../src/ui/react/hooks';
import { Button } from '../../../../../src/ui/components/button';
import { Input } from '../../../../../src/ui/components/input';
import { DetailPane } from '../../../../../src/ui/components/huhu/DetailPane';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../../../../src/ui/components/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '../../../../../src/ui/components/popover';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../../../src/ui/components/dialog';
import { ContentOverview } from '../../../../../src/app/content/ContentPanel';
import { mountIntroContent } from '../../../../../src/app/intro-content';
import { chooseVaultDevice } from '../../../../../src/app/device-choice';
import { applyInterfaceTheme } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { setLanguage, t } from '../../../../../src/shared/i18n';

// The browser fixture has no Obsidian host. Only its native lifetime/DOM capabilities
// are adapted here; the workbench, independent React roots and overlays are production code.
const cleanups = new WeakMap<object, (() => void)[]>();
Object.assign(Component.prototype, {
	register(this: object, cleanup: () => void) {
		const list = cleanups.get(this) ?? [];
		list.push(cleanup);
		cleanups.set(this, list);
	},
	unload(this: object) {
		for (const cleanup of cleanups.get(this) ?? []) cleanup();
		cleanups.delete(this);
	},
});
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
		addClass(this: HTMLElement, ...names: string[]) {
			this.classList.add(...names);
		},
		removeClass(this: HTMLElement, ...names: string[]) {
			this.classList.remove(...names);
		},
		empty(this: HTMLElement) {
			this.replaceChildren();
		},
		createDiv(this: HTMLElement, options: { cls?: string } = {}) {
			const node = this.ownerDocument.createElement('div');
			node.className = options.cls ?? '';
			this.append(node);
			return node;
		},
		onWindowMigrated(this: HTMLElement, callback: () => void) {
			this.addEventListener('review-window-migrated', callback);
			return () => this.removeEventListener('review-window-migrated', callback);
		},
	});
}
type RecordState = {
	mounts: number;
	unmounts: number;
	selections: string[];
	errors: string[];
	primary: number;
	saves: number;
	devices: unknown[];
	deviceCancellations: string[];
	detached: number;
	opens: unknown[];
};
const state: Record<string, RecordState> = {};
const leaves: Record<
	string,
	{
		element: HTMLElement;
		surface: WorkbenchSurface;
		app: App;
		pages: Map<WorkbenchFeature, Page>;
		intro?: { element: HTMLElement; dispose: () => void };
	}
> = {};
function record(name: string): RecordState {
	const value = state[name];
	if (!value) throw new Error(`Unknown fixture state: ${name}`);
	return value;
}
function owner(name: string) {
	const value = leaves[name];
	if (!value) throw new Error(`Unknown fixture leaf: ${name}`);
	return value;
}
const adoptionTrail: { name: string; before: number[]; afterDOM: number[]; afterEvent: number[] }[] = [];
// 051 persists 050's paired native-owner protocol using production primitives.
type DocumentName = 'main' | 'second';
const layerRoots = new Map<string, { root: Root; host: HTMLElement; name: DocumentName }>();
const layerCounts = { main: { mounted: 0, unmounted: 0 }, second: { mounted: 0, unmounted: 0 } };
function closeLayerControl(key: string) {
	const entry = layerRoots.get(key);
	if (!entry) return;
	flushSync(() => entry.root.unmount());
	entry.host.remove();
	layerRoots.delete(key);
	layerCounts[entry.name].unmounted++;
}
function layerHost(name: DocumentName, doc: Document, key: string, parent: HTMLElement) {
	closeLayerControl(key);
	const host = doc.createElement('div');
	host.className = 'huhu-ui';
	parent.append(host);
	applyInterfaceTheme(host, theme);
	const root = createRoot(host);
	layerRoots.set(key, { root, host, name });
	layerCounts[name].mounted++;
	return root;
}
function openLayerPopup(name: DocumentName, doc: Document, physicalOwner: boolean) {
	const parent = physicalOwner
		? doc.querySelector<HTMLElement>('[role="dialog"] [data-shell-region="panel"]')
		: doc.body;
	if (!parent) throw new Error('Missing physical navigation owner');
	const root = layerHost(name, doc, name + ':popup', parent);
	flushSync(() =>
		root.render(
			<HuhuProviders ownerDocument={doc}>
				<DropdownMenu open modal={false}>
					<DropdownMenuTrigger asChild>
						<Button style={{ position: 'fixed', left: 70, top: 130 }}>{t('workbench.more')}</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent data-review="layer-menu" onCloseAutoFocus={(event) => event.preventDefault()}>
						<DropdownMenuItem data-review="layer-item">{t('ui.save')}</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</HuhuProviders>,
		),
	);
}
function openUpperOwner(name: DocumentName, doc: Document) {
	const root = layerHost(name, doc, name + ':upper', doc.body);
	flushSync(() =>
		root.render(
			<HuhuProviders ownerDocument={doc}>
				<Dialog open>
					<DialogContent data-review="upper-owner-dialog">
						<DialogTitle>{t('workbench.navigation')}</DialogTitle>
						<DialogDescription>{t('ui.commandDescription')}</DialogDescription>
						<Button>{t('ui.save')}</Button>
					</DialogContent>
				</Dialog>
			</HuhuProviders>,
		),
	);
}
let theme = themeSettings.normalize({});
const pageRows = Array.from({ length: 201 }, (_, i) => ({
	path: `huhu/review/note-${i}.md`,
	label: `Note ${i}`,
	folder: 'huhu/review',
	mtime: Date.now(),
	icon: 'file-text',
}));
function PageContent({ page }: { page: Page }) {
	const translate = useT();
	const [limit, setLimit] = useState(200);
	const [detail, setDetail] = useState(false);
	const [dirty, setDirty] = useState(false);
	const { width: leafWidth, ref: anchor } = useLeafMetrics();
	useLayoutEffect(() => {
		record(page.name).mounts++;
		return () => {
			record(page.name).unmounts++;
		};
	}, [page]);
	const navigation =
		page.context.navigationEl &&
		createPortal(
			<div data-review="custom-navigation" style={{ padding: 12 }}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button data-review="custom-menu">{translate('workbench.more')}</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem onSelect={() => record(page.name).selections.push('custom-menu')}>
							{translate('ui.save')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Popover>
					<PopoverTrigger asChild>
						<Button data-review="custom-popover">{translate('ui.search')}</Button>
					</PopoverTrigger>
					<PopoverContent>
						<Input aria-label={translate('ui.search')} />
					</PopoverContent>
				</Popover>
			</div>,
			page.context.navigationEl,
		);
	return (
		<div ref={anchor} data-review="page-content" style={{ display: 'flex', height: '100%', minHeight: 0 }}>
			<div
				style={{
					display: 'flex',
					flex: 1,
					flexDirection: 'column',
					minWidth: 0,
					minHeight: 0,
					gap: 12,
					padding: 16,
				}}
			>
				{navigation}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
					<Button data-review="detail-open" onClick={() => setDetail(true)}>
						{translate('ui.open')}
					</Button>
					<Button
						data-review="device-open"
						variant="secondary"
						onClick={() => {
							void chooseVaultDevice(
								page.app,
								[{ id: 'review-device', label: 'Review device' }],
								page.controller.signal,
							).then(
								(value) => record(page.name).devices.push(value),
								(error) => record(page.name).deviceCancellations.push(String(error)),
							);
						}}
					>
						{translate('storage.chooseDevice')}
					</Button>
				</div>
				<ContentOverview
					folder="huhu/review"
					rows={pageRows.slice(0, limit)}
					total={201}
					onLoadMore={() => setLimit(400)}
					onOpen={(path) => {
						record(page.name).selections.push(path);
					}}
				/>
			</div>
			<DetailPane
				open={detail}
				leafWidth={leafWidth}
				onOpenChange={setDetail}
				title={translate('ui.rename')}
				dirty={dirty}
				onDiscard={() => setDirty(false)}
			>
				<div style={{ minHeight: 1000 }}>
					<Input
						data-review="draft"
						aria-label={translate('ui.rename')}
						defaultValue="before"
						onChange={() => setDirty(true)}
					/>
				</div>
			</DetailPane>
		</div>
	);
}
class Page extends ReactSurface {
	readonly controller = new AbortController();
	override async onOpen(): Promise<void> {
		await super.onOpen();
		applyInterfaceTheme(this.contentEl, theme);
	}
	override onClose(): Promise<void> {
		this.controller.abort();
		return super.onClose();
	}
	constructor(
		context: ConstructorParameters<typeof ReactSurface>[0],
		readonly name: string,
		readonly feature: WorkbenchFeature,
	) {
		super(context);
	}
	getViewType() {
		return 'review-page';
	}
	getDisplayText() {
		return t(this.feature === 'settings' ? 'workbench.settings' : 'workbench.title');
	}
	getIcon() {
		return 'file';
	}
	protected renderContent() {
		return <PageContent page={this} />;
	}
}
async function makeLeaf(name: string, doc: Document) {
	hostDOM(doc);
	state[name] = {
		mounts: 0,
		unmounts: 0,
		selections: [],
		errors: [],
		primary: 0,
		saves: 0,
		devices: [],
		deviceCancellations: [],
		detached: 0,
		opens: [],
	};
	const element = doc.createElement('div');
	element.dataset.review = 'leaf';
	element.dataset.reviewOwner = name;
	element.style.cssText = 'width:100%;height:720px;min-width:0';
	doc.body.prepend(element);
	const app = {
		workspace: {
			requestSaveLayout() {
				record(name).saves++;
			},
			getActiveViewOfType: () => ({ containerEl: element }),
			containerEl: element,
		},
	} as unknown as App;
	const leaf = {
		detach() {
			record(name).detached++;
		},
		getContainer: () => ({}),
	};
	const view = {
		contentEl: element,
		containerEl: element,
		app,
		leaf,
		addChild: (child: unknown) => child,
		removeChild: (child: Component) => child.unload(),
	} as unknown as WorkbenchLeafView;
	const pages = new Map<WorkbenchFeature, Page>();
	const host: WorkbenchHost = {
		statusSegments: () => [
			{
				id: 'review-status',
				icon: 'save',
				label: t('shell.saveError'),
				count: 2,
				order: 10,
				target: { feature: 'content' },
			},
		],
		contributions: (['dashboard', 'settings', 'content'] as WorkbenchFeature[]).map((feature) => ({
			id: feature,
			navigation: {
				id: feature,
				labelKey:
					feature === 'settings'
						? 'workbench.settings'
						: feature === 'content'
							? 'content.title'
							: 'workbench.title',
				icon: feature === 'settings' ? 'settings' : 'files',
			},
			rail: { slot: feature === 'settings' ? ('bottom' as const) : ('top' as const) },
			stateKeys: [],
			navigationContext: feature === 'settings',
			availability: () => ({ enabled: true, supported: true, ready: true }),
			panel:
				feature === 'dashboard'
					? () => ({
							primary: {
								label: t('ui.create'),
								icon: 'plus',
								run: async () => {
									record(name).primary++;
								},
							},
							searchable: true,
							sections: [
								{
									id: 'review',
									items: [
										{
											id: 'first',
											label: t('ui.optionA'),
											target: { feature: 'dashboard', section: 'first' },
										},
										{
											id: 'second',
											label: t('ui.optionB'),
											target: { feature: 'dashboard', section: 'second' },
										},
									],
								},
							],
						})
					: undefined,
			create: async (context) => {
				const page = new Page(context, name, feature);
				pages.set(feature, page);
				return { surface: page, navigate: async () => {} };
			},
		})),
		subscribe: () => () => {},
		failed: () => false,
		report: (error) => record(name).errors.push(String(error)),
		openSettings: () => {},
		openFocus: async (target, value, placement, ownerWindow) => {
			record(name).opens.push({
				target,
				value,
				placement,
				owner: ownerWindow === element.ownerDocument.defaultView,
			});
		},
		openInWorkbench: async (target, value, ownerWindow) => {
			record(name).opens.push({ target, value, owner: ownerWindow === element.ownerDocument.defaultView });
		},
	};
	const surface = createWorkbenchSurface(view, host, {
		schema: WORKBENCH_UI_SCHEMA,
		route: { feature: 'dashboard' },
	});
	leaves[name] = { element, surface, app, pages };
	await surface.ensureActivePage();
	const intro = doc.createElement('section');
	intro.dataset.review = 'intro';
	doc.body.append(intro);
	const disposeIntro = mountIntroContent(intro, () => {
		intro.hidden = true;
	});
	owner(name).intro = { element: intro, dispose: disposeIntro };
}
async function bootstrap() {
	const docs = await readyDocuments(document);
	for (const [name, doc] of Object.entries(docs)) await makeLeaf(name, doc);
	Object.assign(globalThis, {
		uiReview: {
			docs,
			leaves,
			state,
			adoptionTrail,
			layerCounts,
			layerPopup(name: DocumentName, physicalOwner: boolean) {
				openLayerPopup(name, docs[name], physicalOwner);
			},
			layerUpper(name: DocumentName) {
				openUpperOwner(name, docs[name]);
			},
			closeLayer(name: DocumentName, kind: 'popup' | 'upper') {
				closeLayerControl(name + ':' + kind);
			},
			closeAllLayers() {
				for (const key of [...layerRoots.keys()]) closeLayerControl(key);
			},

			async navigate(name: string, target: WorkbenchTarget) {
				await owner(name).surface.navigate(target);
			},
			adopt(name: string, destination: 'main' | 'second') {
				const target = docs[destination],
					item = owner(name);
				const lists = [...item.element.querySelectorAll<HTMLElement>('[data-content-overview]')];
				const before = lists.map((n) => n.scrollTop);
				target.body.prepend(item.element);
				const afterDOM = lists.map((n) => n.scrollTop);
				item.element.dispatchEvent(
					new (target.defaultView as Window & typeof globalThis).Event('review-window-migrated'),
				);
				adoptionTrail.push({ name, before, afterDOM, afterEvent: lists.map((n) => n.scrollTop) });
			},

			resize(name: string, width: number | null) {
				owner(name).element.style.width = width === null ? '100%' : `${width}px`;
			},
			setMotion(motion: 'system' | 'reduce') {
				theme = themeSettings.normalize({ ...theme, motion });
				for (const doc of Object.values(docs))
					for (const node of doc.querySelectorAll<HTMLElement>('.huhu-ui')) applyInterfaceTheme(node, theme);
			},

			async configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				Object.assign(Platform, { isMobile: sample.mobile === true });
				theme = themeSettings.normalize({
					preset: sample.theme,
					accent: sample.accent,
					source: sample.source,
					density: sample.density,
					uiSize: sample.uiSize,
					motion: sample.motion ?? 'system',
				});
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = String(sample.language);
					doc.body.className = `${sample.theme === 'ink' ? 'theme-dark' : 'theme-light'}${sample.mobile ? ' is-mobile' : ''}`;
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
						doc.body.style.removeProperty(`--${key}`);
						if (sample.source === 'obsidian') doc.body.style.setProperty(`--${key}`, value);
					}

					for (const node of doc.querySelectorAll<HTMLElement>('.huhu-ui')) applyInterfaceTheme(node, theme);
				}
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });

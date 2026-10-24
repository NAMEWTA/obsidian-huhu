import { Component, MarkdownRenderer, getIcon, type App } from 'obsidian';
import type { t as translate } from '../../../../shared/i18n';
import {
	THEME_CLASS_PREFIXES,
	THEME_VARS,
	resolveTheme,
	themeBodyState,
	type ThemeSettings,
} from '../../../../theme/settings';

/** No scripts, note paths or external resources are allowed in the sample document. */
export const PREVIEW_DOCUMENT =
	'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\' \'unsafe-inline\' app: obsidian: data: blob:; font-src \'self\' app: obsidian: data: blob:; img-src data:;"></head><body></body></html>';

/** One isolated Reading preview, using the owner's actual stylesheets and the runtime resolver.
 * Static chrome uses Obsidian's selectors; MarkdownRenderer owns the document content.
 * Returning to the default removes our classes in this document just as it does in the host. */
export function mountStylePreview({
	app,
	source,
	target,
	settings,
	mode,
	narrow,
	language,
	t,
}: {
	app: App;
	source: Document;
	target: Document;
	settings: ThemeSettings;
	mode: 'light' | 'dark';
	narrow: boolean;
	language: string;
	t: typeof translate;
}): () => void {
	const component = new Component();
	let disposed = false;
	target.documentElement.lang = language;
	target.title = t('appearance.previewTitle');
	for (const previous of target.head.querySelectorAll('[data-huhu-preview-style]')) previous.remove();
	for (const node of source.head.querySelectorAll('style, link[rel="stylesheet"]')) {
		const clone = target.importNode(node, true) as HTMLElement;
		clone.setAttribute('data-huhu-preview-style', '');
		// A cloned relative link would otherwise resolve against about:srcdoc.
		if (node.tagName === 'LINK') clone.setAttribute('href', (node as HTMLLinkElement).href);
		target.head.appendChild(clone);
	}
	target.body.className = [...source.body.classList]
		.filter(
			(name) =>
				name !== 'theme-light' &&
				name !== 'theme-dark' &&
				!THEME_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix)),
		)
		.join(' ');
	target.body.classList.add(`theme-${mode}`, 'huhu-appearance-preview');
	if (narrow) target.body.classList.add('is-mobile', 'is-phone');
	target.body.style.cssText = source.body.style.cssText;
	for (const name of THEME_VARS) target.body.style.removeProperty(name);
	const state = themeBodyState(resolveTheme(settings), mode);
	target.body.classList.add(...state.classes);
	for (const [name, value] of Object.entries(state.vars)) target.body.style.setProperty(name, value);
	target.body.replaceChildren();
	const el = (parent: HTMLElement, tag: string, className: string, text?: string) => {
		const child = target.createElement(tag);
		child.className = className;
		if (text) child.textContent = text;
		parent.appendChild(child);
		return child;
	};
	const appContainer = el(target.body, 'div', 'app-container');
	const workspace = el(appContainer, 'div', 'workspace');
	const sidebar = el(workspace, 'aside', 'workspace-split mod-sidedock');
	sidebar.setAttribute('aria-label', t('appearance.previewSidebar'));
	el(sidebar, 'div', 'nav-folder-title', t('appearance.previewVault'));
	el(sidebar, 'div', 'nav-file-title is-active', t('appearance.previewNote'));
	el(sidebar, 'div', 'nav-file-title', t('appearance.previewArchive'));
	const root = el(workspace, 'div', 'workspace-split mod-root');
	// Phone layouts hide native tab groups unless they are the visible group.
	const tabs = el(root, 'div', 'workspace-tabs mod-visible');
	const tabBar = el(tabs, 'div', 'workspace-tab-header-container');
	const tabInner = el(tabBar, 'div', 'workspace-tab-header-container-inner');
	const tab = (active: boolean, title: string, pinned: boolean) => {
		const header = el(tabInner, 'div', `workspace-tab-header${active ? ' is-active' : ''}`);
		const inner = el(header, 'div', 'workspace-tab-header-inner');
		const icon = el(inner, 'span', 'workspace-tab-header-inner-icon');
		const fileIcon = getIcon('file-text');
		if (fileIcon) icon.appendChild(target.importNode(fileIcon, true));
		el(inner, 'div', 'workspace-tab-header-inner-title', title);
		if (pinned) {
			const pin = el(inner, 'span', 'workspace-tab-header-status-icon');
			const pinIcon = getIcon('pin');
			if (pinIcon) pin.appendChild(target.importNode(pinIcon, true));
			pin.setAttribute('aria-label', t('appearance.previewPinned'));
		} else el(inner, 'span', 'workspace-tab-header-inner-close-button', '×');
		return header;
	};
	tab(true, t('appearance.previewNote'), true);
	tab(false, t('appearance.previewArchive'), false);
	const tabContainer = el(tabs, 'div', 'workspace-tab-container');
	const leaf = el(tabContainer, 'div', 'workspace-leaf');
	const leafContent = el(leaf, 'div', 'workspace-leaf-content');
	leafContent.dataset.type = 'markdown';
	const view = el(leafContent, 'div', 'view-content');
	const reading = el(view, 'div', 'markdown-reading-view');
	const preview = el(reading, 'div', 'markdown-preview-view markdown-rendered huhu-native');
	const sizer = el(preview, 'div', 'markdown-preview-sizer');
	const properties = el(sizer, 'div', 'metadata-container');
	el(properties, 'span', 'metadata-property-key', t('appearance.previewTopics'));
	const pills = el(properties, 'div', 'multi-select-container');
	for (const label of t('appearance.previewTopicValues').split('|')) el(pills, 'span', 'multi-select-pill', label);
	const status = el(sizer, 'p', 'huhu-appearance-preview-status', t('appearance.previewLoading'));
	status.setAttribute('role', 'status');
	const sample = el(sizer, 'div', 'huhu-appearance-preview-sample');
	// Obsidian installs helpers such as HTMLElement.find in its own window realm.
	// A scriptless iframe has native elements without those helpers, so run the
	// host renderer in its owning document and copy only the finished static DOM.
	const rendered = source.createElement('div');
	const blockNavigation = (event: Event) => {
		const origin = event.target as Element | null;
		if (origin?.nodeType === 1 && origin.closest('a, button, input, summary, [contenteditable]')) {
			if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return;
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	};
	for (const type of ['click', 'auxclick', 'keydown']) target.addEventListener(type, blockNavigation, true);
	component.load();
	// render() can throw before returning its Promise (including post-processors).
	// Keep such failures inside the preview instead of the settings error boundary.
	void Promise.resolve()
		.then(() => {
			if (disposed) return;
			return MarkdownRenderer.render(app, t('appearance.previewMarkdown'), rendered, '', component);
		})
		.then(() => {
			if (disposed) {
				component.unload();
				return;
			}
			for (const input of rendered.querySelectorAll('input')) input.disabled = true;
			// A renderer/plugin may attach resource elements; the fixed sample never requests files.
			for (const link of rendered.querySelectorAll('a')) link.setAttribute('aria-disabled', 'true');
			// The fixed embed is an illustration, with no vault path to resolve. Add its
			// visual classes only after the renderer's real embed loader has finished.
			for (const embed of rendered.querySelectorAll('[data-huhu-preview-embed]'))
				embed.classList.add('internal-embed', 'markdown-embed');
			sample.replaceChildren(...Array.from(rendered.childNodes, (node) => target.importNode(node, true)));
			status.remove();
		})
		.catch(() => {
			component.unload();
			if (disposed) return;
			sample.replaceChildren();
			status.textContent = t('appearance.previewUnavailable');
		});
	return () => {
		disposed = true;
		for (const type of ['click', 'auxclick', 'keydown']) target.removeEventListener(type, blockNavigation, true);
		component.unload();
	};
}

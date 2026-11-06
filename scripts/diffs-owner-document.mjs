import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardedAdapter, patchText } from './ui-adapter-guard.mjs';

export const DIFFS_WEB_COMPONENTS = '@pierre/diffs/dist/components/web-components.js';
export const DIFFS_INTERACTION = '@pierre/diffs/dist/managers/InteractionManager.js';
const componentPath = path.join(path.dirname(fileURLToPath(import.meta.resolve('@pierre/diffs'))), 'components/web-components.js');

/** @pierre/diffs 1.6.4 (Apache-2.0), components/web-components.ts.
 * Native adoption drops the original realm's constructed sheet. Keep the vendor
 * element and CSS, registering its constructor and base sheet in each owner realm.
 * Source and graph guards apply before this build-only replacement; packages are untouched.
 * Upstream: https://diffs.com/docs
 */
export function adaptDiffsWebComponents(source) {
	const patch = patchText(source, 'diffs owner-document');
	for (const anchor of [
		'if (typeof HTMLElement !== "undefined" && customElements.get("diffs-container") == null) {',
		'let sheet;', 'new CSSStyleSheet()', 'connectedCallback() {',
	]) patch.replace(anchor, anchor);
	return `import { DIFFS_TAG_NAME } from "../constants.js";
import style_default from "../style.js";
import { getMeasuredScrollbarGutter } from "../utils/scrollbarGutter.js";
const sheets = new WeakMap();
const ownedSheets = new WeakSet();
function installStyles(host) {
 const doc = host.ownerDocument, win = doc.defaultView;
 const shadow = host.shadowRoot ?? host.attachShadow({mode: "open"});
 let sheet = sheets.get(doc);
 if (!sheet) {
  sheet = new win.CSSStyleSheet(); sheet.replaceSync(style_default);
  sheets.set(doc, sheet); ownedSheets.add(sheet);
 }
 if (!shadow.adoptedStyleSheets.includes(sheet))
  shadow.adoptedStyleSheets = [sheet, ...shadow.adoptedStyleSheets.filter(value => !ownedSheets.has(value))];
 return shadow;
}
export function ensureDiffsOwnerDocument(doc) {
 const win = doc.defaultView;
 if (!win || win.customElements.get(DIFFS_TAG_NAME)) return;
 class FileDiffContainer extends win.HTMLElement {
  constructor() { super(); installStyles(this); }
  connectedCallback() { getMeasuredScrollbarGutter(installStyles(this)); }
  adoptedCallback() { ensureDiffsOwnerDocument(this.ownerDocument); installStyles(this); }
 }
 win.customElements.define(DIFFS_TAG_NAME, FileDiffContainer);
}
if (typeof document !== "undefined") ensureDiffsOwnerDocument(document);
const DiffsContainerLoaded = true;
export { DiffsContainerLoaded };`;
}

export function adaptDiffsInteraction(source) {
	return patchText(source, 'diffs pointer owner')
		.replace('attachDocumentPointerListeners() {\n\t\tif (this.hasDocumentPointerListeners) return;',
			'attachDocumentPointerListeners() {\n\t\tif (this.hasDocumentPointerListeners) return;\n\t\tthis.pointerDocument = this.pre?.ownerDocument;\n\t\tif (!this.pointerDocument) return;')
		.replace('document.addEventListener(', 'this.pointerDocument.addEventListener(', 3)
		.replace('document.removeEventListener(', 'this.pointerDocument?.removeEventListener(', 3)
		.replace('this.hasDocumentPointerListeners = false;\n\t}\n\tclearPointerSession()',
			'this.hasDocumentPointerListeners = false;\n\t\tthis.pointerDocument = undefined;\n\t}\n\tclearPointerSession()')
		.source;
}
export const diffsTransforms = { [DIFFS_WEB_COMPONENTS]: adaptDiffsWebComponents, [DIFFS_INTERACTION]: adaptDiffsInteraction };
export function createDiffsOwnerDocument(graphCounts) {
	const guard = guardedAdapter('diffs-owner-document', diffsTransforms, graphCounts);
	return {
		name: 'diffs-owner-document',
		setup(build) {
			build.onResolve({ filter: /^virtual:diffs-owner-document$/ }, () => ({ path: componentPath }));
			guard.setup(build);
		},
	};
}
export const diffsOwnerDocument = createDiffsOwnerDocument();

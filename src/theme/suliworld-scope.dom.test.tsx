import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';

const css = ['../ui/styles/tokens.css', './styles/presets.css', './styles/suliworld-ui.css']
	.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const cleanup: Array<() => void> = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); });

function documentSurface(doc: Document) {
	const previous = doc.body.className;
	const style = doc.createElement('style');
	style.textContent = css;
	doc.head.append(style);
	const surface = doc.createElement('div');
	// The navigator's .huhu-ui mount is outside its bg-sidebar root. These probes use
	// the same semantic variables as CalendarMonth, Agenda, Input and Checkbox.
	surface.innerHTML = '<aside class="workspace-split mod-sidedock"></aside><main class="mod-root"><article class="huhu-ui"><p data-note style="color:var(--foreground);background-color:var(--background)">Note</p></article></main><div class="huhu-ui huhu-portal-root"><div data-preview style="color:var(--popover-foreground);background-color:var(--popover)"><span data-preview-muted style="color:var(--muted-foreground)">Preview</span></div></div>';
	doc.body.append(surface);
	doc.body.className = 'huhu-themed huhu-theme--suliworld huhu-theme-variant--forest theme-light';
	cleanup.push(() => { surface.remove(); style.remove(); doc.body.className = previous; });
	return surface;
}

function navigatorMount(doc: Document) {
	const mount = doc.createElement('div');
	mount.className = 'huhu-ui';
	mount.innerHTML = '<div data-navigator-root style="background-color:var(--sidebar)"><section data-calendar-month style="color:var(--foreground)"><span data-muted style="color:var(--muted-foreground)">Month</span><span data-status style="color:var(--status-error)">Error</span><span data-selected style="color:var(--primary-foreground);background-color:var(--primary)">Today</span></section><section data-calendar-agenda style="color:var(--foreground)"><input data-input style="color:var(--foreground);background-color:var(--background);border-top-color:var(--input)"><span data-checkbox style="background-color:var(--background);border-top-color:var(--border)"></span></section></div>';
	cleanup.push(() => mount.remove());
	return mount;
}

const computed = (scope: ParentNode, selector: string) => {
	const el = scope.querySelector<HTMLElement>(selector)!;
	return el.ownerDocument.defaultView!.getComputedStyle(el);
};

function expectForest(mount: HTMLElement) {
	expect(computed(mount, '[data-navigator-root]').backgroundColor).toBe('#1f3b2d');
	for (const selector of ['[data-calendar-month]', '[data-calendar-agenda]', '[data-input]'])
		expect(computed(mount, selector).color, selector).toBe('#fbf7f0');
	expect(computed(mount, '[data-muted]').color).toBe('#c9d8ce');
	expect(computed(mount, '[data-status]').color).toBe('#ffad9b');
	expect(computed(mount, '[data-selected]').color).toBe('#151412');
	expect(computed(mount, '[data-selected]').backgroundColor).toBe('#ff8a63');
	for (const selector of ['[data-input]', '[data-checkbox]']) {
		expect(computed(mount, selector).backgroundColor, selector).toBe('#1f3b2d');
		expect(computed(mount, selector).borderTopColor, selector).toBe('#507560');
	}
}

function expectSeparateSurfaces(scope: ParentNode) {
	expect(computed(scope, '[data-note]').color).toBe('#1b1a17');
	expect(computed(scope, '[data-note]').backgroundColor).toBe('#fbf7f0');
	expect(computed(scope, '[data-preview]').color).toBe('#1b1a17');
	expect(computed(scope, '[data-preview]').backgroundColor).toBe('#ffffff');
	expect(computed(scope, '[data-preview-muted]').color).toBe('#5b574f');
}

test('Forest navigator keeps its own semantic surface when reparented from a dock to a center leaf and another document', () => {
	const source = documentSurface(document), mount = navigatorMount(document);
	source.querySelector('aside')!.append(mount);
	expectForest(mount);
	expectSeparateSurfaces(source);
	source.querySelector('main')!.prepend(mount);
	expect(mount.closest('.mod-sidedock')).toBeNull();
	expectForest(mount);
	expectSeparateSurfaces(source);

	const frame = document.createElement('iframe');
	document.body.append(frame);
	cleanup.push(() => frame.remove());
	const targetDoc = frame.contentDocument!, target = documentSurface(targetDoc);
	target.querySelector('main')!.prepend(targetDoc.adoptNode(mount));
	expect(mount.ownerDocument).toBe(targetDoc);
	expect(mount.closest('.mod-sidedock')).toBeNull();
	expectForest(mount);
	expectSeparateSurfaces(target);
});

test.each([
	{ variant: 'cream', mode: 'light', foreground: '#1b1a17', muted: '#5b574f', background: '#ffffff', input: '#d4c8b5' },
	{ variant: 'forest', mode: 'dark', foreground: '#f4efe6', muted: '#ada595', background: '#211f1b', input: '#514a3e' },
])('navigator uses its own $variant $mode surface instead of Forest light colours', ({ variant, mode, foreground, muted, background, input }) => {
	const surface = documentSurface(document), mount = navigatorMount(document);
	document.body.className = `huhu-themed huhu-theme--suliworld huhu-theme-variant--${variant} theme-${mode}`;
	surface.querySelector('main')!.prepend(mount);
	expect(computed(mount, '[data-calendar-month]').color).toBe(foreground);
	expect(computed(mount, '[data-muted]').color).toBe(muted);
	expect(computed(mount, '[data-input]').backgroundColor).toBe(background);
	expect(computed(mount, '[data-input]').borderTopColor).toBe(input);
});

import { afterEach, expect, test } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { DRAG_CANCEL, DRAG_HANDLE, useGridWidth } from './grid-config';

const frames: HTMLIFrameElement[] = [];
afterEach(() => {
	cleanup();
	for (const frame of frames.splice(0)) frame.remove();
});

/** A ResizeObserver stand-in per window that records what it observed and lets the test fire it. */
function observers(win: Window & typeof globalThis) {
	const seen: { target: Element; fire(): void; closed: boolean }[] = [];
	win.ResizeObserver = class {
		private entry?: (typeof seen)[number];
		constructor(private readonly callback: () => void) {}
		observe(target: Element) {
			this.entry = { target, fire: () => this.callback(), closed: false };
			seen.push(this.entry);
		}
		disconnect() {
			if (this.entry) this.entry.closed = true;
		}
		unobserve() {}
	} as unknown as typeof ResizeObserver;
	return seen;
}

function Probe({ out }: { out: { width: number } }) {
	const { ref, width } = useGridWidth();
	out.width = width;
	return <div ref={ref} />;
}

test('the grid width is measured by the window that owns the view, and again after a popout adopts it', () => {
	const main = observers(window as unknown as Window & typeof globalThis);
	const frame = document.createElement('iframe');
	document.body.append(frame);
	frames.push(frame);
	const other = observers(frame.contentWindow as unknown as Window & typeof globalThis);
	const out = { width: -1 };
	let width = 640;
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
	const view = (doc: Document) => (
		<TestProviders ownerDocument={doc}>
			<Probe out={out} />
		</TestProviders>
	);
	const { rerender } = render(view(document));
	expect(out.width).toBe(640);
	expect(main).toHaveLength(1);
	width = 900;
	act(() => main[0]!.fire());
	expect(out.width).toBe(900);
	// the view is adopted by another window: the old observer is released and that window's observer takes over
	width = 1100;
	rerender(view(frame.contentDocument!));
	expect(main[0]!.closed).toBe(true);
	expect(other).toHaveLength(1);
	expect(out.width).toBe(1100);
	width = 1200;
	act(() => other[0]!.fire());
	expect(out.width).toBe(1200);
});

test('the drag handle is the title bar and the cancel list names fields, controls and the body', () => {
	expect(DRAG_HANDLE).toBe('.huhu-widget-handle');
	for (const part of ['button', 'a', 'input', 'textarea', 'select', '.huhu-widget-body']) expect(DRAG_CANCEL.split(', ')).toContain(part);
});

import { act, fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { WorkbenchHost, WorkbenchLeafView, WorkbenchSurface } from '../../app/contracts/workbench-host';
import { NativeSurface } from '../../ui/native-surface';
import { createWorkbenchSurface } from './workbench-surface';

vi.mock('obsidian', async (original) => ({
	...(await original<typeof import('obsidian')>()),
	Component: class {
		private cleanups: (() => void)[] = [];
		register(cleanup: () => void) {
			this.cleanups.push(cleanup);
		}
		unload() {
			for (const cleanup of this.cleanups.splice(0)) cleanup();
		}
	},
}));
afterEach(() => vi.restoreAllMocks());

test('native migration restores owned visible and hidden scroll without recording foreign resets, then removes capture on dispose', async () => {
	vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
		new DOMRect(0, 0, 400, 400),
	] as unknown as DOMRectList);
	const contentEl = document.createElement('div');
	document.body.append(contentEl);
	let migrated = () => {};
	Object.assign(contentEl, {
		addClass: (...names: string[]) => contentEl.classList.add(...names),
		removeClass: (...names: string[]) => contentEl.classList.remove(...names),
		onWindowMigrated: (callback: () => void) => {
			migrated = callback;
			return () => {
				migrated = () => {};
			};
		},
	});
	Object.defineProperty(contentEl, 'win', { get: () => contentEl.ownerDocument.defaultView });
	const add = vi.spyOn(contentEl, 'addEventListener'),
		remove = vi.spyOn(contentEl, 'removeEventListener');
	const view = {
		contentEl,
		app: { workspace: { requestSaveLayout: vi.fn() } },
		addChild: (child: unknown) => child,
		removeChild: (child: { unload(): void }) => child.unload(),
	} as unknown as WorkbenchLeafView;
	const scrollers = new Map<string, HTMLElement>();
	class Page extends NativeSurface {
		getViewType() {
			return 'scroll-proof';
		}
		getDisplayText() {
			return 'Scroll';
		}
		getIcon() {
			return 'file';
		}
		override onOpen() {
			const node = this.contentEl.ownerDocument.createElement('div');
			node.style.cssText = 'height:200px;overflow:auto';
			this.contentEl.append(node);
			scrollers.set(this.context.contentEl.dataset.feature!, node);
			return Promise.resolve();
		}
	}
	const host: WorkbenchHost = {
		contributions: (['dashboard', 'settings'] as const).map((id) => ({
			id,
			navigation: { id, labelKey: 'workbench.title', icon: 'file' },
			availability: () => ({ enabled: true, supported: true, ready: true }),
			stateKeys: [],
			create: async (context) => {
				context.contentEl.dataset.feature = id;
				return { surface: new Page(context), navigate: async () => {} };
			},
		})),
		subscribe: () => () => {},
		failed: () => false,
		report: vi.fn(),
		openSettings: vi.fn(),
		openFocus: async () => {},
		openInWorkbench: async () => {},
	};
	let surface!: WorkbenchSurface;
	await act(async () => {
		surface = createWorkbenchSurface(view, host, {
			schema: 'huhu-workbench-ui/1',
			route: { feature: 'dashboard' },
		});
		await surface.ensureActivePage();
	});
	const capture = add.mock.calls.filter(([name, , options]) => name === 'scroll' && options === true).at(-1)![1];
	const first = scrollers.get('dashboard')!;
	first.scrollTop = 180;
	fireEvent.scroll(first);
	await act(async () => surface.navigate({ feature: 'settings' }));
	const second = scrollers.get('settings')!;
	second.scrollTop = 80;
	second.scrollLeft = 12;
	fireEvent.scroll(second);
	const frame = document.createElement('iframe');
	document.body.append(frame);
	try {
		await act(async () => {
			frame.contentDocument!.body.append(contentEl);
			// A render may follow adoption before the native migration event.
			surface.setVisible(false);
			surface.setVisible(true);
			first.scrollTop = 0;
			second.scrollTop = 0;
			second.scrollLeft = 0;
			// Browser adoption resets precede Obsidian's migration callback.
			fireEvent.scroll(second);
			migrated();
		});
		expect(second.scrollTop).toBe(80);
		expect(second.scrollLeft).toBe(12);
		expect(first.scrollTop).toBe(0);
		await act(async () => surface.navigate({ feature: 'dashboard' }));
		expect(scrollers.get('dashboard')).toBe(first);
		expect(first.scrollTop).toBe(180);
		first.scrollTop = 0;
		fireEvent.scroll(first);
		await act(async () => {
			document.body.append(contentEl);
			first.scrollTop = 0;
			second.scrollTop = 0;
			second.scrollLeft = 0;
			fireEvent.scroll(first);
			migrated();
		});
		expect(first.scrollTop).toBe(0);
		await act(async () => surface.navigate({ feature: 'settings' }));
		expect(second.scrollTop).toBe(80);
		expect(second.scrollLeft).toBe(12);
	} finally {
		await act(async () => surface.dispose());
		expect(remove).toHaveBeenCalledWith('scroll', capture, true);
		contentEl.remove();
		frame.remove();
	}
});

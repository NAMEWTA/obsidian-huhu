import { expect, test, vi } from 'vitest';
import type { ItemView } from 'obsidian';
import type { WorkbenchContribution, WorkbenchPageBinding } from '../../app/contracts/workbench-host';
import { NativeSurface } from '../../ui/native-surface';
import { WorkbenchPages } from './workbench-pages';

class Page extends NativeSurface {
	getViewType() {
		return 'fixture';
	}
	getDisplayText() {
		return 'Fixture';
	}
	getIcon() {
		return 'globe';
	}
}

function setup(options: {
	closeResource: (id?: string) => Promise<void>;
	unmountedClose?: (id?: string) => Promise<void>;
	failCreate?: boolean;
	delayCreate?: Promise<void>;
}) {
	const root = document.createElement('div');
	const owner = { app: {}, leaf: {}, addChild: (c: unknown) => c, removeChild: () => {} } as unknown as ItemView;
	const navigate = vi.fn(async () => {});
	const report = vi.fn();
	const changed = vi.fn();
	const contribution: WorkbenchContribution = {
		id: 'browser',
		resourcePages: true,
		navigation: { id: 'browser', labelKey: 'workbench.browser', icon: 'globe', target: { feature: 'browser' } },
		availability: () => ({ enabled: true, supported: true, ready: true }),
		stateKeys: ['pageId'],
		closeResource: (target) => (options.unmountedClose ?? options.closeResource)(target.resourceId),
		create: async (context, target) => {
			if (options.delayCreate) await options.delayCreate;
			if (options.failCreate) {
				await new Promise((resolve) => setTimeout(resolve, 20));
				throw new Error('activation failed');
			}
			const surface = new Page(context);
			Object.assign(surface, { onOpen: async () => {}, onClose: async () => {}, setVisible: () => {} });
			const binding: WorkbenchPageBinding = {
				surface,
				getTarget: () => target,
				navigate: async () => {},
				closeResource: () => options.closeResource(target.resourceId),
			};
			return binding;
		},
	};
	const pages = new WorkbenchPages(owner, root, [contribution], navigate, report, changed);
	return { pages, navigate, changed };
}

const target = (resourceId: string) => ({ feature: 'browser' as const, resourceId });

test('explicit close of a mounted Browser page removes the persisted resource once', async () => {
	const removed = vi.fn(async () => {});
	const { pages } = setup({ closeResource: removed });
	const entry = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(entry);
	await Promise.all([pages.closeResource('browser', 'a'), pages.closeResource('browser', 'a')]);
	expect(removed).toHaveBeenCalledTimes(1);
	expect(removed).toHaveBeenCalledWith('a');
	expect(pages.list('browser')).toEqual([]);
	await pages.closeResource('browser', 'a');
	expect(removed).toHaveBeenCalledTimes(1);
});

test('closing a saved but unmounted Browser page removes its resource', async () => {
	const mounted = vi.fn(async () => {});
	const unmounted = vi.fn(async () => {});
	const { pages } = setup({ closeResource: mounted, unmountedClose: unmounted });
	pages.restore([{ target: target('b'), state: {} }]);
	await pages.closeResource('browser', 'b');
	expect(unmounted).toHaveBeenCalledWith('b');
	expect(mounted).not.toHaveBeenCalled();
	expect(pages.list('browser')).toEqual([]);
});

test('hiding, switching and disposing the shell never delete Browser resources', async () => {
	const removed = vi.fn(async () => {});
	const { pages } = setup({ closeResource: removed });
	const a = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(a);
	const b = await pages.prepare(target('b'), new AbortController().signal);
	pages.show(b);
	pages.setVisible(false);
	pages.show(undefined);
	await pages.refreshAvailability(new Set(['browser']));
	expect(
		pages
			.list('browser')
			.map((p) => p.target.resourceId)
			.sort(),
	).toEqual(['a', 'b']);
	await pages.dispose();
	expect(removed).not.toHaveBeenCalled();
});

test('a failed removal keeps the tab and the record, then a retry can succeed', async () => {
	const removed = vi.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined);
	const { pages } = setup({ closeResource: removed });
	const entry = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(entry);
	await expect(pages.closeResource('browser', 'a')).rejects.toThrow('disk');
	expect(pages.list('browser')).toHaveLength(1);
	expect(pages.getSurfaces()).toHaveLength(1);
	await pages.closeResource('browser', 'a');
	expect(removed).toHaveBeenCalledTimes(2);
	expect(pages.list('browser')).toEqual([]);
});

test('a failed removal of an unmounted page keeps it saved', async () => {
	const { pages } = setup({
		closeResource: async () => {},
		unmountedClose: async () => {
			throw new Error('disk');
		},
	});
	pages.restore([{ target: target('c'), state: {} }]);
	await expect(pages.closeResource('browser', 'c')).rejects.toThrow('disk');
	expect(pages.list('browser')).toHaveLength(1);
});

test('closing a page that is still opening removes its resource through the contribution', async () => {
	const removed = vi.fn(async () => {});
	const { pages } = setup({ closeResource: async () => {}, unmountedClose: removed, failCreate: true });
	const opening = pages.prepare(target('d'), new AbortController().signal);
	const closing = pages.closeResource('browser', 'd');
	await Promise.allSettled([opening, closing]);
	expect(removed).toHaveBeenCalledTimes(1);
	expect(removed).toHaveBeenCalledWith('d');
	expect(pages.list('browser')).toEqual([]);
});

test('a saved page being removed is not revived by a concurrent navigation', async () => {
	let finish!: () => void;
	const unmounted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
	const { pages } = setup({ closeResource: async () => {}, unmountedClose: unmounted });
	pages.restore([{ target: target('e'), state: {} }]);
	const closing = pages.closeResource('browser', 'e');
	expect(await pages.prepare(target('e'), new AbortController().signal)).toBeUndefined();
	finish();
	await closing;
	expect(pages.list('browser')).toEqual([]);
	expect(pages.getSurfaces()).toEqual([]);
});

test('concurrent closes of the active page share one removal and one follow-up navigation', async () => {
	const removed = vi.fn(async () => {});
	const { pages, navigate } = setup({ closeResource: removed });
	const entry = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(entry);
	const key = JSON.stringify(['browser', '', 'a']);
	await Promise.all([pages.close(key), pages.close(key)]);
	expect(removed).toHaveBeenCalledTimes(1);
	expect(navigate).toHaveBeenCalledTimes(1);
});

test('a failed opening of a restored page does not leave it saved after its record is removed', async () => {
	const removed = vi.fn(async () => {});
	const { pages } = setup({ closeResource: async () => {}, unmountedClose: removed, failCreate: true });
	pages.restore([{ target: target('f'), state: {} }]);
	const opening = pages.prepare(target('f'), new AbortController().signal);
	const closing = pages.closeResource('browser', 'f');
	await Promise.allSettled([opening, closing]);
	expect(removed).toHaveBeenCalledTimes(1);
	expect(pages.list('browser')).toEqual([]);
});

test('an aborted opening of a restored page does not leave it saved after its record is removed', async () => {
	let release!: () => void;
	const delayCreate = new Promise<void>((resolve) => (release = resolve));
	const removed = vi.fn(async () => {});
	const { pages } = setup({ closeResource: removed, delayCreate });
	pages.restore([{ target: target('g'), state: {} }]);
	const controller = new AbortController();
	const opening = pages.prepare(target('g'), controller.signal);
	const closing = pages.closeResource('browser', 'g');
	controller.abort();
	release();
	await Promise.allSettled([opening, closing]);
	expect(removed).toHaveBeenCalledTimes(1);
	expect(pages.list('browser')).toEqual([]);
});

test('an availability change during a removal does not keep the removed page saved', async () => {
	let finish!: () => void;
	const removed = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
	const { pages } = setup({ closeResource: removed });
	const entry = await pages.prepare(target('h'), new AbortController().signal);
	pages.show(entry);
	const closing = pages.closeResource('browser', 'h');
	await pages.refreshAvailability(new Set(['browser']));
	expect(pages.list('browser')).toHaveLength(1);
	finish();
	await closing;
	expect(pages.list('browser')).toEqual([]);
});

test('closing an inactive mounted page redraws the strip and keeps the active page', async () => {
	const { pages, navigate, changed } = setup({ closeResource: async () => {} });
	const a = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(a);
	const b = await pages.prepare(target('b'), new AbortController().signal);
	pages.show(b);
	changed.mockClear();
	await pages.closeResource('browser', 'a');
	expect(changed).toHaveBeenCalled();
	expect(navigate).not.toHaveBeenCalled();
	expect(pages.list('browser').map((p) => p.target.resourceId)).toEqual(['b']);
});

test('a page shown while its removal is pending still navigates to a neighbour afterwards', async () => {
	let finish!: () => void;
	const removed = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
	const { pages, navigate } = setup({ closeResource: removed });
	const a = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(a);
	const b = await pages.prepare(target('b'), new AbortController().signal);
	pages.show(b);
	const closing = pages.closeResource('browser', 'a');
	pages.show(a);
	finish();
	await closing;
	expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'b' }));
});

test('a declined removal keeps the mounted tab and the saved record', async () => {
	const decline = vi.fn(async () => false as const);
	const { pages } = setup({ closeResource: decline as never });
	const entry = await pages.prepare(target('a'), new AbortController().signal);
	pages.show(entry);
	await pages.closeResource('browser', 'a');
	expect(decline).toHaveBeenCalledTimes(1);
	expect(pages.list('browser')).toHaveLength(1);
	expect(pages.getSurfaces()).toHaveLength(1);
});

test('a declined removal of an unmounted page keeps it saved', async () => {
	const { pages } = setup({ closeResource: async () => {}, unmountedClose: (async () => false) as never });
	pages.restore([{ target: target('c'), state: {} }]);
	await pages.closeResource('browser', 'c');
	expect(pages.list('browser')).toHaveLength(1);
});

test('removing the saved page that was just shown continues on a neighbour', async () => {
	let finish!: () => void;
	const unmounted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
	const { pages, navigate } = setup({ closeResource: async () => {}, unmountedClose: unmounted });
	pages.restore([
		{ target: target('x'), state: {} },
		{ target: target('y'), state: {} },
	]);
	// 'y' was the last page shown (restore records it); removal of it must not leave the workbench blank.
	const closing = pages.closeResource('browser', 'y');
	finish();
	await closing;
	expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'x' }));
});

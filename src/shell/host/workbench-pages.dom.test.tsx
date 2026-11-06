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

function setup(options: { failCreate?: boolean; canClose?: () => Promise<boolean>; onClose?: () => Promise<void> } = {}) {
	const root = document.createElement('div');
	const owner = { app: {}, leaf: {}, addChild: (c: unknown) => c, removeChild: () => {} } as unknown as ItemView;
	const navigate = vi.fn(async () => {});
	const report = vi.fn();
	const changed = vi.fn();
	const closed = vi.fn();
	const contribution = (id: 'dashboard' | 'contacts'): WorkbenchContribution => ({
		id,
		navigation: { id, labelKey: 'workbench.' + id, icon: 'home', target: { feature: id } },
		availability: () => ({ enabled: true, supported: true, ready: true }),
		stateKeys: ['filter'],
		create: async (context, target) => {
			if (options.failCreate) {
				await new Promise((resolve) => setTimeout(resolve, 20));
				throw new Error('activation failed');
			}
			const surface = new Page(context);
			Object.assign(surface, { onOpen: async () => {}, onClose: async () => { closed(id); await options.onClose?.(); }, setVisible: () => {} });
			const binding: WorkbenchPageBinding = { surface, getTarget: () => target, navigate: async () => {}, canClose: options.canClose };
			return binding;
		},
	});
	const pages = new WorkbenchPages(owner, root, [contribution('dashboard'), contribution('contacts')], navigate, report, changed);
	return { pages, navigate, changed, closed };
}

const key = (feature: string) => JSON.stringify([feature, '']);
const signal = () => new AbortController().signal;

test('hiding, switching and disposing the shell keep saved pages until an explicit close', async () => {
	const { pages } = setup();
	pages.show(await pages.prepare({ feature: 'dashboard' }, signal()));
	pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
	pages.setVisible(false);
	pages.show(undefined);
	await pages.refreshAvailability(new Set(['contacts']));
	expect(pages.list().map((p) => p.target.feature).sort()).toEqual(['contacts', 'dashboard']);
	await pages.dispose();
});

test('concurrent closes of the active page share one removal and one follow-up navigation', async () => {
	const { pages, navigate, closed } = setup();
	pages.show(await pages.prepare({ feature: 'dashboard' }, signal()));
	pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
	await Promise.all([pages.close(key('contacts')), pages.close(key('contacts'))]);
	expect(closed).toHaveBeenCalledTimes(1);
	expect(navigate).toHaveBeenCalledTimes(1);
	expect(navigate).toHaveBeenCalledWith({ feature: 'dashboard' });
	expect(pages.list('contacts')).toEqual([]);
});

test('closing an inactive page keeps the active page', async () => {
	const { pages, navigate } = setup();
	pages.show(await pages.prepare({ feature: 'dashboard' }, signal()));
	pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
	await pages.close(key('dashboard'));
	expect(navigate).not.toHaveBeenCalled();
	expect(pages.list().map((p) => p.target.feature)).toEqual(['contacts']);
});

test('closing a page that is still opening does not leave it saved', async () => {
	const { pages } = setup({ failCreate: true });
	const opening = pages.prepare({ feature: 'dashboard' }, signal());
	const closing = pages.close(key('dashboard'));
	await Promise.allSettled([opening, closing]);
	expect(pages.list('dashboard')).toEqual([]);
});


function decision() {
 let resolve!: (value: boolean) => void;
 const promise = new Promise<boolean>((finish) => { resolve = finish; });
 return { promise, resolve };
}

test('concurrent user closes await one decision and a veto keeps the page intact', async () => {
 const gate = decision(), canClose = vi.fn(() => gate.promise);
 const { pages, closed, navigate, changed } = setup({ canClose });
 const entry = await pages.prepare({ feature: 'contacts' }, signal());
 pages.show(entry);
 const first = pages.close(key('contacts')), second = pages.close(key('contacts'));
 expect(first).toBe(second);
 expect(canClose).toHaveBeenCalledTimes(1);
 expect(closed).not.toHaveBeenCalled();
 gate.resolve(false);
 await first;
 expect(pages.getCurrent()).toBe(entry?.binding);
 expect(pages.list('contacts')).toHaveLength(1);
 expect(closed).not.toHaveBeenCalled();
 expect(navigate).not.toHaveBeenCalled();
 expect(changed).not.toHaveBeenCalled();
 await pages.dispose();
 expect(canClose).toHaveBeenCalledTimes(1);
});

test('accepted user close acts on current visibility after the pending decision', async () => {
 const gate = decision(), canClose = vi.fn(() => gate.promise);
 const { pages, closed, navigate } = setup({ canClose });
 pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
 const pending = pages.close(key('contacts'));
 pages.show(await pages.prepare({ feature: 'dashboard' }, signal()));
 pages.setVisible(false);
 expect(canClose).toHaveBeenCalledTimes(1);
 expect(closed).not.toHaveBeenCalled();
 gate.resolve(true);
 await pending;
 expect(closed).toHaveBeenCalledExactlyOnceWith('contacts');
 expect(navigate).not.toHaveBeenCalled();
 expect(pages.getCurrent()?.getTarget?.().feature).toBe('dashboard');
 await pages.dispose();
});

test('forced disposal does not await a pending user decision or run it again', async () => {
 const gate = decision(), canClose = vi.fn(() => gate.promise);
 const { pages, closed, navigate } = setup({ canClose });
 pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
 const pending = pages.close(key('contacts'));
 await pages.dispose();
 expect(canClose).toHaveBeenCalledTimes(1);
 expect(closed).toHaveBeenCalledExactlyOnceWith('contacts');
 gate.resolve(true);
 await pending;
 expect(closed).toHaveBeenCalledTimes(1);
 expect(navigate).not.toHaveBeenCalled();
});

test('a stale decision cannot close a replacement page with the same key', async () => {
 const old = decision(), next = decision();
 const canClose = vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => next.promise);
 const { pages, closed, navigate } = setup({ canClose });
 pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
 const staleClose = pages.close(key('contacts'));
 await pages.refreshAvailability(new Set(['contacts']));
 const replacement = await pages.prepare({ feature: 'contacts' }, signal());
 pages.show(replacement);
 const currentClose = pages.close(key('contacts'));
 expect(canClose).toHaveBeenCalledTimes(2);
 old.resolve(true);
 await staleClose;
 expect(pages.getCurrent()).toBe(replacement?.binding);
 expect(pages.list('contacts')).toHaveLength(1);
 expect(closed).toHaveBeenCalledTimes(1);
 expect(navigate).not.toHaveBeenCalled();
 next.resolve(false);
 await currentClose;
 expect(pages.getCurrent()).toBe(replacement?.binding);
 await pages.dispose();
});


test('without a close guard concurrent closes both await the real surface teardown', async () => {
 const gate = decision();
 let teardownFinished = false;
 const { pages, closed, navigate } = setup({ onClose: async () => { await gate.promise; teardownFinished = true; } });
 pages.show(await pages.prepare({ feature: 'contacts' }, signal()));
 const first = pages.close(key('contacts')), second = pages.close(key('contacts'));
 let secondSettled = false;
 void second.then(() => { secondSettled = true; });
 await Promise.resolve();
 await Promise.resolve();
 expect(closed).toHaveBeenCalledTimes(1);
 expect(teardownFinished).toBe(false);
 expect(secondSettled).toBe(false);
 expect(second).toBe(first);
 gate.resolve(true);
 await Promise.all([first, second]);
 expect(teardownFinished).toBe(true);
 expect(navigate).toHaveBeenCalledTimes(1);
 await pages.dispose();
});

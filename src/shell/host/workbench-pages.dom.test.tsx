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

function setup(options: { failCreate?: boolean } = {}) {
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
			Object.assign(surface, { onOpen: async () => {}, onClose: async () => closed(id), setVisible: () => {} });
			const binding: WorkbenchPageBinding = { surface, getTarget: () => target, navigate: async () => {} };
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

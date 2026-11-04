import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { VisibilityContext } from '../../../src/ui/react/contexts';
import { setLanguage, t, registerMessages } from '../../../src/shared/i18n';
import { messages } from '../../../src/modules/navigator/i18n';
import type { NavigatorPeriodicService, PeriodicNoteListEntry } from '../../../src/modules/navigator/api';
import { DiaryReader } from '../../../src/modules/navigator/ui/diary/DiaryReader';
import { memoryVault } from '../../fixtures/memory-vault';
import { Command } from '../../../src/ui/components/command';
import { Select } from '../../../src/ui/components/select';
import { DropdownMenu } from '../../../src/ui/components/dropdown-menu';
import { Dialog } from '../../../src/ui/components/dialog';

async function boot() {
const frame = document.querySelector('iframe')!;
if (!frame.contentDocument?.body || frame.contentDocument.readyState !== 'complete') await new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
registerMessages(messages);
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
for (const doc of Object.values(docs)) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	Object.defineProperty(proto, 'createDiv', { configurable: true, value(this: HTMLElement, options?: { cls?: string }) {
		const element = this.ownerDocument.createElement('div');
		if (options?.cls) element.className = options.cls;
		this.append(element); return element;
	} });
}
const dates = ['2026-11-04', '2026-11-03', '2026-10-31', '2026-10-30'];
const entries: PeriodicNoteListEntry[] = dates.map((date) => ({ period: 'day', date, path: `huhu/journal/daily/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`, title: date, status: 'existing', active: false, summary: date, summaryStatus: 'ready' }));
const mounts = Object.fromEntries(Object.entries(docs).map(([name, doc]) => {
	const container = doc.createElement('main'); container.className = 'huhu-ui'; container.dataset.review = 'diary'; doc.body.append(container);
	const root = createRoot(container);
	const vault = memoryVault(Object.fromEntries(entries.map((entry) => [entry.path, `${entry.date}\n\n早上沿着河边走了很长一段路。\n\nA long walk by the river. ${'长中文正文与 Averyveryverylongwordwithoutspaces '.repeat(24)}`])), doc.defaultView);
	const calls: unknown[] = [];
	const mode = { visible: true, state: 'default', revision: 0 };
	const port = {
		periodic: {
			list: async () => { if (mode.state === 'error') throw new Error('fixture read failed'); if (mode.state === 'loading') return new Promise<PeriodicNoteListEntry[]>(() => {}); return entries; },
			inspect: (_period, date) => entries.find(entry => entry.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`) ?? { status: 'missing' }, subscribe: () => () => {},
			open: async (period, date, options) => { calls.push({ period, date: date.getDate(), options }); return true; },
		} as Pick<NavigatorPeriodicService, 'list' | 'inspect' | 'open' | 'subscribe'>,
		read: async (path: string) => { const file = vault.app.vault.getFileByPath(path); if (!file) throw new Error('missing'); return vault.app.vault.read(file); },
	};
	const draw = () => root.render(<ContainerProviders container={container}><VisibilityContext.Provider value={mode.visible}><DiaryReader key={mode.revision} port={port} initialDate="2026-11-04" /></VisibilityContext.Provider></ContainerProviders>);
	draw();
	return [name, { container, root, calls, mode, draw, vault }];
}));
// The shared runner audits both bundled Radix copies, including cmdk's modal primitives.
Object.assign(window, { uiReviewAdapters: { Command, Select, DropdownMenu, Dialog }, uiReview: {
	docs, mounts, t,
	configure(language: 'en' | 'zh', theme: string) { setLanguage(language); for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; } },
	hide(value: boolean) { for (const mount of Object.values(mounts)) { mount.mode.visible = !value; mount.draw(); } },
	scenario(value: string) { for (const mount of Object.values(mounts)) { mount.mode.state = value; mount.mode.revision++; mount.draw(); } },
	unmount() { for (const mount of Object.values(mounts)) mount.root.unmount(); },
} });

}
void boot();

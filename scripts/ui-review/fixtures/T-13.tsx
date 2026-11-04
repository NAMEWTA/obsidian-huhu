/** Real diary page and mutation coordinator; only the Vault, periodic template and host leaf edges are supplied. */
import type { NativeSurfaceContext } from '../../../src/ui/native-surface';
import { createDiaryPage } from '../../../src/modules/navigator/ui/diary/workbench-page';
import { setLanguage, registerMessages, t } from '../../../src/shared/i18n';
import { messages } from '../../../src/modules/navigator/i18n';
import type { DiaryPagePort } from '../../../src/modules/navigator/ui/diary/types';
import type { PeriodicNoteListEntry, PeriodicPreparation } from '../../../src/modules/navigator/api';
import { memoryVault } from '../../fixtures/memory-vault';
import { Command } from '../../../src/ui/components/command';
import { Select } from '../../../src/ui/components/select';
import { DropdownMenu } from '../../../src/ui/components/dropdown-menu';
import { Dialog } from '../../../src/ui/components/dialog';

async function boot() {
	const frame = document.querySelector('iframe')!;
	if (!frame.contentDocument?.body || frame.contentDocument.readyState !== 'complete') await new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
	registerMessages(messages);
	const docs = { main: document, other: frame.contentDocument! };
	for (const doc of Object.values(docs)) {
		const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
		Object.defineProperty(proto, 'createDiv', { configurable: true, value(this: HTMLElement, options?: { cls?: string }) { const el = this.ownerDocument.createElement('div'); if (options?.cls) el.className = options.cls; this.append(el); return el; } });
		Object.defineProperty(proto, 'addClass', { configurable: true, value(this: HTMLElement, ...classes: string[]) { this.classList.add(...classes); } });
		Object.defineProperty(proto, 'removeClass', { configurable: true, value(this: HTMLElement, ...classes: string[]) { this.classList.remove(...classes); } });
	}
	const mounts = Object.fromEntries(await Promise.all(Object.entries(docs).map(async ([name, doc]) => {
		const container = doc.createElement('main'); container.className = 'huhu-ui'; container.dataset.review = 'diary-tools'; doc.body.append(container);
		const path = (date: string) => `huhu/journal/daily/2026/11/${date}.md`;
		const vault = memoryVault({ [path('2026-11-04')]: `Original text · 河边的早晨 ${'Averyveryverylongwordwithoutspaces 长中文正文 '.repeat(15)}`, [path('2026-11-03')]: 'Another entry' }, doc.defaultView);
		Object.assign(vault.app.workspace, { on: vault.app.vault.on, offref: vault.app.vault.offref });
		const abstract = vault.app.vault.getAbstractFileByPath;
		vault.app.vault.getAbstractFileByPath = input => { const item = abstract(input); return item && !('stat' in item) ? Object.assign(item, { children: [] }) : item; };
		const listeners = new Set<() => void>(), calls: unknown[] = [];
		const mode = { template: 'ready', delayed: false, delaySave: false, writeFailure: false };
		let finishSave: (() => void) | undefined;
		const process = vault.app.vault.process;
		vault.app.vault.process = async (file, change) => {
			calls.push({ action: 'process' });
			if (mode.writeFailure) throw new Error('Fixture write failure');
			if (mode.delaySave) await new Promise<void>(resolve => { finishSave = resolve; });
			return process(file, change);
		};
		let resume: (() => void) | undefined;
		const info = (date: Date) => { const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return { period: 'day' as const, date: iso, path: path(iso), title: iso, active: false, status: vault.contents.has(path(iso)) ? 'existing' as const : 'missing' as const }; };
		const port: DiaryPagePort = {
			periodic: {
				inspect: (_period, date) => info(date), subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
				list: async (_period, from, to) => {
					if (mode.delayed) await new Promise<void>(resolve => { resume = resolve; });
					return [...vault.contents].flatMap(([file]) => { const date = file.split('/').at(-1)!.slice(0, 10); const current = info(new Date(`${date}T00:00:00`)); return current.path === file && new Date(`${date}T00:00:00`) >= from && new Date(`${date}T00:00:00`) <= to ? [{ ...current, status: 'existing', summaryStatus: 'ready' } as PeriodicNoteListEntry] : []; }).sort((a, b) => b.date.localeCompare(a.date));
				},
				prepare: async (_period, _date, options): Promise<PeriodicPreparation> => { calls.push({ action: 'prepare' }); return mode.template === 'ready' ? { status: 'ready', path: options!.path!, content: '# Template' } : { status: mode.template === 'cancelled' ? 'cancelled' : 'unavailable', code: 'template-input-required' }; },
				open: async (_period, date, options) => { calls.push({ action: 'open', path: info(date).path, options }); return info(date).status === 'existing'; },
			},
			read: async file => { const found = vault.app.vault.getFileByPath(file); if (!found) throw new Error('Missing fixture note'); return vault.app.vault.read(found); },
		};
		const context = { app: vault.app, contentEl: container, containerEl: container, close() {} } as unknown as NativeSurfaceContext;
		const binding = await createDiaryPage(port)(context, { feature: 'navigator', section: 'diary' }, { date: '2026-11-04' }, new AbortController().signal);
		await binding.surface.onOpen();
		return [name, { binding, container, calls, mode, vault, path, resumeSave() { mode.delaySave = false; finishSave?.(); }, resume() { mode.delayed = false; resume?.(); } }];
	})));
	Object.assign(window, { uiReviewAdapters: { Command, Select, DropdownMenu, Dialog }, uiReview: {
		docs, mounts, t,
		configure(language: 'en' | 'zh', theme: string) { setLanguage(language); for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; } },
		unmount() { return Promise.all(Object.values(mounts).map(mount => mount.binding.surface.onClose())); },
	} });
}
void boot();

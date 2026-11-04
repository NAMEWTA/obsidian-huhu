/** Production archives content and owner commands; only the file port and host shell edges are supplied. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { App } from 'obsidian';
import { registerMessages, setLanguage, t } from '../../../src/shared/i18n';
import { messages } from '../../../src/modules/archives/i18n';
import { Command } from '../../../src/ui/components/command';
import { DropdownMenu } from '../../../src/ui/components/dropdown-menu';
import { HuhuProviders } from '../../../src/ui/react/providers';
import { ArchivesContent } from '../../../src/modules/archives/ui/generic/workbench-page';
import type { ArchivePageState } from '../../../src/modules/archives/ui/generic/page-state';
import type { GenericArchivesHost } from '../../../src/modules/archives/services/generic/page-host';
import { memoryArchives } from '../../../src/modules/archives/services/generic/test-port';
import { ArchivesApplication } from '../../../src/modules/archives/services/generic/application';
import { BELONGING_TYPE_ID } from '../../../src/modules/archives/api';

async function boot() {
	const frame = document.querySelector('iframe')!;
	if (!frame.contentDocument?.body || frame.contentDocument.readyState !== 'complete') await new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
	registerMessages(messages);
	const docs = { main: document, other: frame.contentDocument! };
	const mounts = await Promise.all(Object.entries(docs).map(async ([name, doc]) => {
		const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
		Object.defineProperty(proto, 'createDiv', { configurable: true, value(this: HTMLElement, options?: { cls?: string }) { const child = doc.createElement('div'); child.className = options?.cls ?? ''; this.append(child); return child; } });
		const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
		await application.commands.belongings.install();
		const long = 'Camera · veryveryveryverylongwordwithoutanyspaces 一个很长的中文物品名称用于验证换行';
		const records = [
			{ name: long, purchaseDate: '2026-03-02', purchase: { amount: '3200', currency: 'CNY' }, specification: 'Black · 黑色', notes: 'Retained long note. 很长的物品备注。'.repeat(12), receipt: 'huhu/archives/receipt-camera.pdf' },
			{ name: 'E-reader · 阅读器', purchaseDate: '2024-06', purchase: { amount: '899', currency: 'CNY' } },
			{ name: 'Bag · 背包', purchaseDate: '2026-01-12', purchase: { amount: '89', currency: 'USD' } },
			{ name: 'Unknown proceeds · 未知售价', purchaseDate: '2026-01-01', purchase: { amount: '10', currency: 'CNY' } },
			{ name: 'Negative net · 负净成本', purchaseDate: '2026-01-01', purchase: { amount: '10', currency: 'USD' } },
		];
		for (const [index, values] of records.entries()) {
			const receipt = await application.commands.create({ operationId: `review-item-${index}`, typeId: BELONGING_TYPE_ID, values });
			if (index >= 3) await application.commands.belongings.transition({ operationId: `review-sale-${index}`, id: receipt.id, expectedHash: receipt.contentHash, status: 'sold', date: '2026-01-02', ...(index === 4 ? { sale: { amount: '20', currency: 'USD' } } : {}) });
		}
		const container = doc.createElement('main'); container.dataset.review = 'belongings'; doc.body.append(container);
		const root = createRoot(container), host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
		function Page() {
			const [state, setState] = useState<ArchivePageState>({ section: BELONGING_TYPE_ID, search: '', offset: 0, scroll: 0 });
			return <HuhuProviders ownerDocument={doc}><ArchivesContent host={host} app={{} as App} owner={container} state={state} updateState={patch => setState(value => ({ ...value, ...patch }))} open={async (section, resourceId) => { const item = resourceId ? await application.query.entity(resourceId) : undefined; setState(value => ({ ...value, section: section ?? item?.typeId ?? value.section, selectedId: resourceId })); }} guard={() => {}} />{/* Keep the shared command/menu adapter graph mounted, matching production page chrome. */}<div hidden data-review-adapters><Command /><DropdownMenu /></div></HuhuProviders>;
		}
		let version = 0, release: (() => void) | undefined, pending: Promise<void> | undefined;
		const read = f.files.read.bind(f.files);
		return { name, doc, ...f, application, root, container,
			reset() { root.render(<Page key={++version} />); },
			async refresh(mode: string) {
				if (mode === 'loading') {
					const gate = new Promise<void>(resolve => { release = resolve; });
					f.files.read = async file => { await gate; return read(file); };
					pending = f.runtime.reload().catch(() => {});
				} else if (mode === 'error') {
					f.files.read = () => Promise.reject(new Error('Fixture read failure'));
					await f.runtime.reload().catch(() => {});
				} else { release?.(); release = undefined; f.files.read = read; await pending; pending = undefined; await f.runtime.reload(); }
			},
			async empty() { for (const item of (await application.query.belongings()).items) {
				const session = await application.commands.beginEdit(item.id);
				await application.commands.setState({ operationId: crypto.randomUUID(), id: item.id, expectedHash: session.baseHash, lifecycle: 'archived' });
			} },
			async external() { const session = await application.commands.beginEdit('review-item-0'); session.draft.category = 'External edit'; session.dirtyFields = ['category']; await application.commands.save({ operationId: crypto.randomUUID(), session }); },
		};
	}));
	const configure = (language: 'en' | 'zh', theme: string) => {
		setLanguage(language);
		for (const mount of mounts) { mount.doc.body.className = theme; mount.reset(); }
	};
	Object.assign(window, { uiReview: { docs, mounts, t, configure, refresh: (mode: string) => Promise.all(mounts.map(mount => mount.refresh(mode))), external: () => Promise.all(mounts.map(mount => mount.external())), empty: () => Promise.all(mounts.map(mount => mount.empty())), unmount: () => mounts.forEach(mount => { mount.root.unmount(); mount.runtime.dispose(); }) } });
	configure('en', 'theme-light');
}
void boot();

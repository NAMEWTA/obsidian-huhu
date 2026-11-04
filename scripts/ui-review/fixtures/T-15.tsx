/** Production person route and T-14 commands; memory file port and Obsidian shell edges only. */
import { useCallback, useRef, useState } from 'react';
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

async function boot() {
	const frame = document.querySelector('iframe')!;
	if (!frame.contentDocument?.body || frame.contentDocument.readyState !== 'complete')
		await new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
	registerMessages(messages);
	const docs = { main: document, other: frame.contentDocument! };
	const mounts = await Promise.all(
		Object.entries(docs).map(async ([name, doc]) => {
			const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
			Object.defineProperty(proto, 'createDiv', {
				configurable: true,
				value(this: HTMLElement, options?: { cls?: string }) {
					const child = doc.createElement('div');
					child.className = options?.cls ?? '';
					this.append(child);
					return child;
				},
			});
			const f = await memoryArchives(),
				application = new ArchivesApplication(f.runtime);
			await application.personJournal.install();
			const long = 'Same name · 同名人物 veryveryveryverylongwordwithoutanyspaces 一个很长的人物名称用于验证换行';
			for (const id of ['review-person-a', 'review-person-b']) {
				const receipt = await application.commands.create({
					operationId: id,
					typeId: 'type-person',
					values: { name: long, notes: 'Long retained profile. 保留的长资料。'.repeat(20) },
				});
				if (id.endsWith('a'))
					await application.personJournal.add({
						operationId: 'review-journal',
						entityId: receipt.id,
						expectedHash: receipt.contentHash,
						rowId: 'review-row',
						values: {
							date: '2026-11-04',
							title: 'A long journal title · 一条很长的纪事标题',
							content: 'A memory without generated content. 保留原始纪事内容。'.repeat(18),
							relatedEntityIds: ['review-person-b'],
						},
					});
			}
			await application.commands.createRelation({
				operationId: 'review-friend',
				relationTypeId: 'relation-friend',
				sourceId: 'review-person-a',
				targetId: 'review-person-b',
				values: {},
				contextRefs: {},
			});
			await application.commands.create({
				operationId: 'review-company',
				typeId: 'type-company',
				values: { name: 'Company · 企业' },
			});
			const container = doc.createElement('main');
			container.dataset.review = 'person';
			doc.body.append(container);
			const root = createRoot(container),
				host = {
					application,
					settings: { get: () => ({ layouts: {}, maxColumns: 6 }) },
				} as unknown as GenericArchivesHost;
			let select: (id: string) => Promise<void> = async () => {};
			function Page() {
				const [state, setState] = useState<ArchivePageState>({
					section: 'type-person',
					selectedId: 'review-person-a',
					search: '',
					offset: 0,
					scroll: 0,
				});
				const leave = useRef<(() => Promise<boolean>) | undefined>(undefined);
				const guard = useCallback((next?: () => Promise<boolean>) => {
					leave.current = next;
				}, []);
				const open = async (section?: string, id?: string) => {
					if (leave.current && !(await leave.current())) return;
					const entity = id ? await application.query.entity(id) : undefined;
					setState((value) => ({
						...value,
						section: section ?? entity?.typeId ?? value.section,
						selectedId: id,
					}));
				};
				select = async (id) => open(undefined, id);
				return (
					<HuhuProviders ownerDocument={doc}>
						<ArchivesContent
							host={host}
							app={{ vault: { getFileByPath: () => null } } as unknown as App}
							owner={container}
							state={state}
							updateState={(patch) => setState((value) => ({ ...value, ...patch }))}
							open={open}
							guard={guard}
						/>
						<div hidden data-review-adapters>
							<Command />
							<DropdownMenu />
						</div>
					</HuhuProviders>
				);
			}
			let version = 0,
				release: (() => void) | undefined,
				pending: Promise<void> | undefined;
			const read = f.files.read.bind(f.files);
			return {
				name,
				doc,
				...f,
				application,
				root,
				container,
				reset() {
					root.render(<Page key={++version} />);
				},
				select: (id: string) => select(id),
				async refresh(mode: string) {
					if (mode === 'loading') {
						const gate = new Promise<void>((resolve) => {
							release = resolve;
						});
						f.files.read = async (file) => {
							await gate;
							return read(file);
						};
						pending = f.runtime.reload().catch(() => {});
					} else if (mode === 'error') {
						f.files.read = () => Promise.reject(new Error('Fixture read failure'));
						await f.runtime.reload().catch(() => {});
					} else {
						release?.();
						release = undefined;
						f.files.read = read;
						await pending;
						pending = undefined;
						await f.runtime.reload();
					}
				},
				failNextSave() {
					f.files.beforeProcess = () => {
						f.files.beforeProcess = undefined;
						throw new Error('Fixture write failure');
					};
				},
				async external() {
					const entity = await application.query.entity('review-person-a');
					await application.personJournal.update({
						operationId: crypto.randomUUID(),
						entityId: entity!.id,
						expectedHash: entity!.contentHash,
						rowId: 'review-row',
						values: {
							date: '2026-11-04',
							title: 'External change',
							content: 'External source is preserved',
							relatedEntityIds: [],
						},
					});
				},
			};
		}),
	);
	Object.assign(window, {
		uiReview: {
			docs,
			mounts,
			t,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const mount of mounts) {
					mount.doc.body.className = theme;
					mount.reset();
				}
			},
			select: (id: string) => Promise.all(mounts.map((mount) => mount.select(id))),
			refresh: (mode: string) => Promise.all(mounts.map((mount) => mount.refresh(mode))),
			external: () => Promise.all(mounts.map((mount) => mount.external())),
			failNextSave: () => mounts.forEach((mount) => mount.failNextSave()),
			unmount: () =>
				mounts.forEach((mount) => {
					mount.root.unmount();
					mount.runtime.dispose();
				}),
		},
	});
	(window as unknown as { uiReview: { configure: (language: string, theme: string) => void } }).uiReview.configure(
		'en',
		'theme-light',
	);
}
void boot();

import { type NativeSurfaceContext } from '../../../ui/native-surface';
import { Component, MarkdownRenderer, Menu, Notice, Platform, TFile, TFolder, type ViewStateResult } from 'obsidian';
import { ReactSurface } from '../../../ui/react/surface';
import { ArchiveEditor, type ArchiveEditorHandle, type ArchiveEditorProps } from './forms';
import { emptyQuery } from '../core/index-store';
import type { ContactsLayoutMode } from './panel-contract';
import { applyLayout, contactsTarget, emptyPanelState, restoreContactsState, showContactKind } from './panel-state';
import { ContactsError, newRecord, type ArchiveRecord, type RecordKind } from '../core/model';
import { type ContactsController } from '../platform/controller';
import { t } from '../../../shared/i18n/index';
import { onLeafLanguageChanged } from '../../../host/obsidian/workspace-title';
import { confirm, ct, deleteRow, editBase, errorText, FilterModal, type EditScope } from './forms';
import type { ContactsHost } from '../services/page-host';
import type { ContactsPanelState } from './panel-contract';
import { ArchiveWorkspace } from './ArchiveWorkspace';
import { ContactsSurface } from './surface';
import { ArchiveNoteModal } from './note-modal';
import type { ArchiveResource } from '../core/resources';

export const CONTACTS_PAGE_TYPE = 'huhu-contacts-view';
export class ContactsPresentation extends ReactSurface {
	state: ContactsPanelState = emptyPanelState();
	controller?: ContactsController;
	private unsubscribe?: () => void;
	private history: Array<{ path: string; id: string }> = [];
	private editor?: Omit<ArchiveEditorProps, 'ref'>;
	private editorKey = 0;
	private generic = false;
	private genericPath?: string;
	private readonly draftContext = crypto.randomUUID();
	private genericLeave?: () => Promise<boolean>;
	openGeneric = (path?: string): void => { this.genericPath = path; this.generic = true; this.render(); this.context.changed?.(); };
	private closeGeneric = (): void => { this.generic = false; this.genericLeave = undefined; this.render(); this.context.changed?.(); };
	private registerArchiveLeave = (check: (() => Promise<boolean>) | undefined): void => { this.genericLeave = check; };
	private editorRequest = 0;
	private editorOrigin?: { path: string; scroll: number };
	private editorHandle: { current: ArchiveEditorHandle | null } = { current: null };
	private pendingInput?: HTMLInputElement;
	constructor(
		context: NativeSurfaceContext,
		private host: ContactsHost,
	) {
		super(context);
		this.state = emptyPanelState(host.settings.get().layouts);
	}
	mountMarkdown(target: HTMLElement, text: string, path: string): () => void {
		const child = this.addChild(new Component());
		const body = target.createDiv();
		void MarkdownRenderer.render(this.app, text, body, path, child).catch(() => body.setText(text));
		return () => {
			this.removeChild(child);
			body.remove();
		};
	}
	/** The page exists only while the archives module is active. */
	get enabled(): boolean {
		return true;
	}
	get columns(): number {
		return this.host.settings.get().maxColumns;
	}
	getViewType(): string {
		return CONTACTS_PAGE_TYPE;
	}
	getDisplayText(): string {
		return ct('title');
	}
	getIcon(): string {
		return 'contact-round';
	}
	onOpen(): Promise<void> {
		void super.onOpen();
		this.register(this.host.settings.subscribe(() => this.render()));
		if (Platform.isPhone) {
			const navbar = this.contentEl.doc.querySelector('.mobile-navbar');
			if (navbar) {
				const measure = () =>
					this.contentEl.style.setProperty(
						'--huhu-contacts-navbar-height',
						`${navbar.getBoundingClientRect().height}px`,
					);
				const observer = new ResizeObserver(measure);
				observer.observe(navbar);
				measure();
				this.register(() => observer.disconnect());
			}
		}
		this.register(onLeafLanguageChanged(this.app, this.leaf, () => this.render()));
		this.registerDomEvent(this.contentEl, 'scroll', () => {
			if (this.editor || this.state.selectedPath) return;
			this.state.scroll = this.contentEl.scrollTop;
			const path = this.firstVisible();
			if (!path) return;
			const kind = this.state.query.kind;
			this.state.anchors[kind][this.state.layout[kind]] = path;
		});
		this.bindController();
		return Promise.resolve();
	}
	bindController(): void {
		this.unsubscribe?.();
		this.controller = this.host.controller;
		if (this.enabled && this.controller) {
			this.unsubscribe = this.controller.subscribe(() => this.render());
			void this.controller.ensureLoaded().catch((error: unknown) => new Notice(errorText(error)));
		}
		this.render();
	}
	render(): void {
		if (!this.state.selectedPath && this.controller && !this.controller.loading) {
			const pages = Math.max(1, Math.ceil(this.controller.index.query(this.state.query).length / 60));
			this.state.page = Math.min(this.state.page, pages - 1);
		}
		if (this.state.selectedPath && this.controller) {
			const tracked = this.state.selectedId
				? this.controller.index.get(this.state.selectedId)
				: this.controller.index.byPath.get(this.state.selectedPath);
			if (tracked) {
				this.state.selectedPath = tracked.path;
				this.state.selectedId = tracked.id;
			}
		}
		this.rerender();
	}
	onClose(): Promise<void> {
		this.disposeSurface();
		return super.onClose();
	}
	disposeSurface(): void {
		this.editorRequest++;
		this.editor = undefined;
		this.editorOrigin = undefined;
		this.pendingInput?.remove();
		this.pendingInput = undefined;
		this.unsubscribe?.();
		this.unsubscribe = undefined;
	}
	protected renderContent() {
		const draftScope = this.draftContext + ":" + this.host.controller.root + (this.genericPath ? ":" + this.genericPath : "");
		return this.generic ? <ArchiveWorkspace initialPath={this.genericPath} key={draftScope} drafts={this.host.drafts} draftScope={draftScope} services={this.host.archives} onClose={this.closeGeneric} registerLeave={this.registerArchiveLeave} /> : this.editor ? (
			<ArchiveEditor key={this.editorKey} {...this.editor} ref={this.editorHandle} />
		) : (
			<ContactsSurface view={this} />
		);
	}
	getState(): Record<string, unknown> {
		return { ...this.state };
	}
	getTarget() {
		const target = contactsTarget(this.state);
		// A form is a distinct live route so clicking its current category is not
		// swallowed by the shell's repeated-target shortcut. No draft is serialized.
		return this.editor || this.generic ? { ...target, focusId: 'archive-editor' } : target;
	}
	async setState(raw: Record<string, unknown>, result: ViewStateResult): Promise<void> {
		this.state = restoreContactsState(raw, this.host.settings.get().layouts);
		const state = this.state, controller = this.controller, root = controller?.root;
		if (this.app.workspace.layoutReady) await controller?.ensureLoaded();
		if (this.state !== state || this.controller !== controller || controller?.root !== root) return;
		if (
			this.app.workspace.layoutReady &&
			this.controller &&
			this.state.selectedPath &&
			!this.controller.index.byPath.has(this.state.selectedPath) &&
			!this.controller.index.get(this.state.selectedId)
		) {
			const matches = (await this.controller.archives.snapshot()).entities.filter(entity => entity.formatVersion === 2 && ['type-person', 'type-company'].includes(entity.typeId) && (entity.path === this.state.selectedPath || entity.id === this.state.selectedId));
			if (this.state !== state || this.controller !== controller || controller?.root !== root) return;
			if (matches.length === 1) { this.generic = true; this.genericPath = matches[0]!.path; }
			else { this.state.selectedPath = ''; this.state.selectedId = ''; this.persist(); }
		}
		this.render();
		await super.setState(raw, result);
		if (!this.state.selectedPath) this.restoreScroll();
	}
	private firstVisible(): string {
		const top = this.contentEl.getBoundingClientRect().top;
		const nodes = this.contentEl.querySelectorAll<HTMLElement>('[data-path]');
		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index]!;
			if (node.getBoundingClientRect().bottom > top + 1) return node.dataset.path ?? '';
		}
		return '';
	}
	private scrollToPath(path: string): void {
		if (!path) return;
		const node = this.contentEl.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
		node?.scrollIntoView({ block: 'start' });
	}
	private restoreScroll(): void {
		const kind = this.state.query.kind;
		const anchor = this.state.anchors[kind][this.state.layout[kind]];
		this.contentEl.win.requestAnimationFrame(() => {
			if (anchor && this.controller?.index.query(this.state.query).some((record) => record.path === anchor))
				this.scrollToPath(anchor);
			else this.contentEl.scrollTop = this.state.scroll;
		});
	}
	private persist(): void {
		this.app.workspace.requestSaveLayout();
	}
	select(path: string, focus = ''): void {
		if (this.state.selectedPath) this.history.push({ path: this.state.selectedPath, id: this.state.selectedId });
		this.state.selectedPath = path;
		this.state.selectedId = this.controller?.index.byPath.get(path)?.id ?? '';
		this.state.focus = focus;
		this.contentEl.scrollTop = 0;
		this.render();
		this.persist();
		this.context.changed?.();
	}
	back(): void {
		const previous = this.history.pop();
		this.state.selectedPath = previous?.path ?? '';
		this.state.selectedId = previous?.id ?? '';
		this.state.focus = '';
		this.render();
		if (this.state.selectedPath) this.contentEl.scrollTop = 0;
		else this.restoreScroll();
		this.persist();
		this.context.changed?.();
	}
	layout(mode: ContactsLayoutMode): void {
		const next = applyLayout(this.state, mode, this.firstVisible());
		if (next === this.state) return;
		this.state = next;
		const kind = next.query.kind;
		void this.host.settings.update((draft) => {
			draft.layouts = { ...draft.layouts, [kind]: mode };
		});
		this.render();
		this.scrollToPath(this.state.anchors[this.state.query.kind][mode]);
		this.persist();
	}
	setScope(value: 'record' | 'fields'): void {
		if (this.state.query.scope === value) return;
		this.state.query = { ...this.state.query, scope: value };
		this.state.page = 0;
		this.render();
		this.persist();
	}
	changeKind(kind: RecordKind): void {
		if (kind === this.state.query.kind && !this.state.selectedPath) return;
		this.history = [];
		this.state = showContactKind(this.state, kind);
		this.render();
		this.restoreScroll();
		this.persist();
		this.context.changed?.();
	}
	search(value: string): void {
		this.state.query.search = value;
		this.state.page = 0;
		this.render();
		this.persist();
	}
	sort(): void {
		this.state.query.sort = this.state.query.sort === 'name' ? 'modified' : 'name';
		this.state.page = 0;
		this.render();
		this.persist();
	}
	page(value: number): void {
		this.state.page = value;
		this.render();
		this.contentEl.scrollTop = 0;
		this.persist();
	}
	clearFilters(): void {
		this.state.query = {
			...emptyQuery(),
			kind: this.state.query.kind,
			search: this.state.query.search,
			sort: this.state.query.sort,
			scope: this.state.query.scope,
		};
		this.state.page = 0;
		this.render();
		this.persist();
	}
	filters(): void {
		if (this.controller)
			new FilterModal(this.controller, this.state.query, (query) => {
				this.state.query = query;
				this.state.page = 0;
				this.render();
				this.persist();
			}).open();
	}
	add(kind: RecordKind): void {
		const leaving = this.leaveEditor(), request = this.editorRequest;
		void leaving.then((allowed) => {
			if (allowed && request === this.editorRequest)
				this.openEditor(newRecord(kind), 'basic', undefined, (record) => this.select(record.path));
		});
	}
	edit(record: ArchiveRecord, scope: EditScope, id?: string): void {
		const controller = this.controller;
		if (!controller) return;
		const leaving = this.leaveEditor(), request = this.editorRequest;
		void leaving.then(async (allowed) => {
			if (!allowed || request !== this.editorRequest) return;
			const base = await editBase(controller, record, scope, id);
			if (request === this.editorRequest && this.controller === controller)
				this.openEditor(base, scope, id, () => this.render());
		})
			.catch((error: unknown) => new Notice(errorText(error)));
	}
	/** Show the record form in place of the list or detail. */
	private openEditor(
		base: ArchiveRecord,
		scope: EditScope,
		rowId: string | undefined,
		done: (record: ArchiveRecord) => void,
	): void {
		const controller = this.controller;
		if (!controller) return;
		this.editorOrigin = { path: this.state.selectedPath, scroll: this.contentEl.scrollTop };
		this.editorKey++;
		const editor = { controller, base, scope, rowId, done, exit: () => { if (this.editor === editor) this.closeEditor(); } };
		this.editor = editor;
		this.contentEl.scrollTop = 0;
		this.render();
		this.context.changed?.();
	}
	private closeEditor(): void {
		const origin = this.editorOrigin, state = this.state;
		this.editor = undefined;
		this.editorOrigin = undefined;
		this.render();
		this.context.changed?.();
		this.contentEl.win.requestAnimationFrame(() => {
			if (!this.editor && this.state === state && origin?.path === state.selectedPath) this.contentEl.scrollTop = origin.scroll;
		});
	}

	/** Leave an open form first (asking about unsaved changes); used before navigating elsewhere in the page. */
	leaveEditor(): Promise<boolean> {
		this.editorRequest++;
		if (this.generic) return this.genericLeave?.() ?? Promise.resolve(false);
		return this.editor ? this.editorHandle.current?.close() ?? Promise.resolve(false) : Promise.resolve(true);
	}
	deleteRow(record: ArchiveRecord, scope: 'employment' | 'relation', id: string): void {
		if (this.controller) void deleteRow(this.controller, record, scope, id);
	}
	resources(record: ArchiveRecord): ArchiveResource[] {
		try {
			return this.controller?.resources(record.id) ?? [];
		} catch {
			return [];
		}
	}
	/** A note opens in a new tab of Obsidian's own editor; a folder is revealed in the file explorer. */
	private async openVaultPath(path: string): Promise<void> {
		const target = this.app.vault.getAbstractFileByPath(path);
		if (target instanceof TFile) await this.app.workspace.getLeaf('tab').openFile(target);
		else if (target instanceof TFolder) {
			const explorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
			(explorer?.view as { revealInFolder?: (entry: TFolder) => void } | undefined)?.revealInFolder?.(target);
			if (explorer) await this.app.workspace.revealLeaf(explorer);
		} else throw new ContactsError('missing');
	}
	newNote(record: ArchiveRecord): void {
		const controller = this.controller;
		if (!controller) return;
		new ArchiveNoteModal(this.app, async (name) => {
			const path = await controller.createNote(record.id, name);
			await this.openVaultPath(path);
		}).open();
	}
	openResource(path: string, _line?: number): void {
		void this.openVaultPath(path).catch((error: unknown) => new Notice(errorText(error)));
	}
	revealFolder(record: ArchiveRecord): void {
		void this.openVaultPath(record.folderPath).catch((error: unknown) => new Notice(errorText(error)));
	}
	addResources(record: ArchiveRecord, files?: File[]): void {
		const controller = this.controller;
		if (!controller) return;
		const importFiles = (selected: File[]) => {
			void controller
				.importResources(
					record.id,
					selected.map((file) => ({ name: file.name, read: () => file.arrayBuffer() })),
				)
				.then((results) => {
					new Notice(
						results
							.map((result) => `${result.name}: ${result.error ? ct(result.error) : ct('imported')}`)
							.join('\n'),
						10000,
					);
				})
				.catch((error: unknown) => new Notice(errorText(error)));
		};
		if (files) {
			importFiles(files);
			return;
		}
		this.pendingInput?.remove();
		const input = this.contentEl.createEl('input', { type: 'file' });
		this.pendingInput = input;
		input.hidden = true;
		input.multiple = true;
		input.addEventListener(
			'change',
			() => {
				const selected = Array.from(input.files ?? []);
				input.remove();
				if (selected.length) importFiles(selected);
			},
			{ once: true },
		);
		input.addEventListener('cancel', () => input.remove(), { once: true });
		input.click();
	}
	private async remove(record: ArchiveRecord): Promise<void> {
		if (!this.controller) return;
		try {
			const base = await this.controller.deletion(record.id);
			const index = this.controller.index;
			const count =
				record.kind === 'person'
					? index.relationsFor(record.id).length
					: new Set(
							[...index.members(record.id, 'current'), ...index.members(record.id, 'past')].map(
								(r) => r.id,
							),
						).size;
			if (
				!(await confirm(
					this.app,
					ct('deleteFolderPrompt', {
						name: record.fields.name,
						count: count + (base.relations ?? 0),
						folder: base.folderPath,
						resources: base.resources,
					}),
				))
			)
				return;
			await this.controller.remove(base);
			if (this.state.selectedId === record.id) {
				this.state.selectedPath = '';
				this.state.selectedId = '';
				this.persist();
			}
			this.history = this.history.filter((entry) => entry.id !== record.id);
			this.render();
		} catch (error) {
			new Notice(errorText(error));
			if (
				error instanceof ContactsError &&
				error.code === 'deleteChanged' &&
				this.enabled &&
				this.contentEl.isConnected
			) {
				const current = this.controller?.index.get(record.id);
				if (current) await this.remove(current);
			}
		}
	}
	recordActions(record: ArchiveRecord) {
		return [
			{
				title: ct('editBasic'),
				icon: 'pencil',
				disabled: !!this.controller?.index.issues(record).length,
				run: () => this.edit(record, 'basic'),
			},
			{ title: ct('revealFolder'), icon: 'folder-open', run: () => this.revealFolder(record) },
			{
				title: t('automation.new'),
				icon: 'bell-plus',
				disabled: !this.host.newReminder,
				run: () => {
					this.host.newReminder?.(record);
				},
			},
			{
				title: ct('source'),
				icon: 'file-text',
				run: () => {
					void this.openVaultPath(record.path).catch((error) => new Notice(String(error)));
				},
			},
			{
				title: ct('delete'),
				icon: 'trash-2',
				disabled: !!this.controller?.index.issues(record).length,
				run: () => {
					void this.remove(record);
				},
			},
		];
	}
	private recordMenu(menu: Menu, record: ArchiveRecord): void {
		for (const action of this.recordActions(record))
			menu.addItem((item) =>
				item.setTitle(action.title).setIcon(action.icon).setDisabled(!!action.disabled).onClick(action.run),
			);
	}

	onPaneMenu(menu: Menu, source: string): void {
		if (this.enabled) {
			menu.addItem((i) =>
				i
					.setTitle(ct('addPerson'))
					.setIcon('user-plus')
					.onClick(() => this.add('person')),
			);
			menu.addItem((i) =>
				i
					.setTitle(ct('addCompany'))
					.setIcon('building-2')
					.onClick(() => this.add('company')),
			);
			menu.addItem((i) =>
				i
					.setTitle(ct('filter'))
					.setIcon('list-filter')
					.onClick(() => this.filters()),
			);
			menu.addItem((i) =>
				i
					.setTitle(ct('sort'))
					.setIcon('arrow-down-wide-narrow')
					.onClick(() => this.sort()),
			);
			const record = this.controller?.index.byPath.get(this.state.selectedPath);
			if (record) this.recordMenu(menu, record);
		}
		super.onPaneMenu(menu, source);
	}
}

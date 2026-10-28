import { Component, TFile, TFolder, type App, type TAbstractFile } from 'obsidian';
import { ContactsApplication } from '../core/application';
import { vaultContactsFiles } from './vault-files';
import guide from '../core/persist/format-guide.md';
import englishGuide from '../core/persist/format-guide-en.md';
import type { ContactsSettings } from '../../../shared/contacts-settings';
import { getLanguage } from '../../../shared/i18n';
import { DocumentMutationCoordinator } from '../../../host/obsidian/document-mutation';
import { ContactsError } from '../core/model';
/** Native lifecycle, Vault IO and protection of unsaved editor content. */
export class ContactsController extends Component {
	private readonly application: ContactsApplication;
	private documents?: DocumentMutationCoordinator;
	constructor(
		readonly app: App,
		getSettings: () => ContactsSettings,
	) {
		super();
		const files = vaultContactsFiles(
			app,
			() => (getLanguage() === 'en' ? englishGuide : guide),
			() => {
				if (!this.documents) throw new ContactsError('disabled');
				return this.documents;
			},
		);
		this.application = new ContactsApplication(files, getSettings);
	}
	get archives() {
		return this.application.archives;
	}
	get index() {
		return this.application.index;
	}
	get queue() {
		return this.application.queue;
	}
	get root() {
		return this.application.root;
	}
	get error() {
		return this.application.error;
	}
	get loading() {
		return this.application.loading;
	}
	/** Events for paths under the archive root only; the vault announces every file at startup, which waits for the first scan. */
	private under(path: string): boolean {
		const root = this.application.root;
		return path === root || path.startsWith(root + '/');
	}
	onload(): void {
		this.documents = new DocumentMutationCoordinator(this.app, { lifetime: this, resolveLeaf: () => undefined });
		this.application.activate();
		const { vault } = this.app;
		const changed = (file: TAbstractFile) => {
			if (this.app.workspace.layoutReady && file instanceof TFile && this.under(file.path))
				this.application.fileChanged(file);
		};
		this.registerEvent(vault.on('create', changed));
		this.registerEvent(vault.on('modify', changed));
		this.registerEvent(
			vault.on('delete', (file) => {
				if (this.app.workspace.layoutReady && this.under(file.path))
					this.application.fileDeleted(file.path, file instanceof TFolder);
			}),
		);
		this.registerEvent(
			vault.on('rename', (file, oldPath) => {
				if (this.app.workspace.layoutReady && (this.under(file.path) || this.under(oldPath)))
					this.application.fileRenamed(file instanceof TFile ? file : null, oldPath, file.path);
			}),
		);
	}
	onunload(): void {
		this.application.dispose();
		this.documents = undefined;
	}
	saveReminder = (
		...args: Parameters<ContactsApplication['saveReminder']>
	): ReturnType<ContactsApplication['saveReminder']> => this.application.saveReminder(...args);
	subscribe = (...args: Parameters<ContactsApplication['subscribe']>): ReturnType<ContactsApplication['subscribe']> =>
		this.application.subscribe(...args);
	ensureLoaded = (
		...args: Parameters<ContactsApplication['ensureLoaded']>
	): ReturnType<ContactsApplication['ensureLoaded']> => this.application.ensureLoaded(...args);
	reload = (...args: Parameters<ContactsApplication['reload']>): ReturnType<ContactsApplication['reload']> =>
		this.application.reload(...args);
	snapshot = (...args: Parameters<ContactsApplication['snapshot']>): ReturnType<ContactsApplication['snapshot']> =>
		this.application.snapshot(...args);
	save = (...args: Parameters<ContactsApplication['save']>): ReturnType<ContactsApplication['save']> =>
		this.application.save(...args);
	create = (...args: Parameters<ContactsApplication['create']>): ReturnType<ContactsApplication['create']> =>
		this.application.create(...args);
	remove = (...args: Parameters<ContactsApplication['remove']>): ReturnType<ContactsApplication['remove']> =>
		this.application.remove(...args);
	deletion = (...args: Parameters<ContactsApplication['deletion']>) => this.application.deletion(...args);
	resources = (...args: Parameters<ContactsApplication['resources']>) => this.application.resources(...args);
	createNote = (...args: Parameters<ContactsApplication['createNote']>) => this.application.createNote(...args);
	importResources = (...args: Parameters<ContactsApplication['importResources']>) =>
		this.application.importResources(...args);
	ref = (...args: Parameters<ContactsApplication['ref']>): ReturnType<ContactsApplication['ref']> =>
		this.application.ref(...args);
	choices = (...args: Parameters<ContactsApplication['choices']>): ReturnType<ContactsApplication['choices']> =>
		this.application.choices(...args);
	countFolder = (
		...args: Parameters<ContactsApplication['countFolder']>
	): ReturnType<ContactsApplication['countFolder']> => this.application.countFolder(...args);
}

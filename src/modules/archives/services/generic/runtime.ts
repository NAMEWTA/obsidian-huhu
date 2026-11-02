import { WriteQueue } from '../../../../shared/storage/write-queue';
import type { ContactsFile, ContactsFiles } from '../../core/files';
import { ArchiveIndex, type IndexedArchive } from '../../core/generic/index';
import { ARCHIVE_PATHS, assertRoot, definitionPath, isDiscoveryPath, underRoot } from '../../core/generic/paths';
import {
	COLLECTION_TAG,
	decodeDefinition,
	encodeDefinition,
	HEAD_TAG,
	patchProperties,
} from '../../core/generic/markdown';
import {
	ArchiveError,
	type CommandReceipt,
	type DefinitionRevision,
	type EntityRecord,
	type FieldDefinition,
	type Values,
} from '../../core/schema/model';
import { presetRevisions } from '../../core/schema/presets';
import { copy, digest, identifier, object } from '../../core/schema/value';

export interface ArchiveWriteContext {
	epoch: number;
	root: string;
	signal?: AbortSignal;
}
export interface ArchiveDraftStore {
	list(root: string): Promise<unknown[]>;
	write(root: string, id: string, value: unknown): Promise<void>;
	remove(root: string, id: string): Promise<void>;
}
/** IO/lifecycle boundary. All mutation services share this queue and revalidate immediately before a write. */
export class ArchiveRuntime {
	index: ArchiveIndex;
	private epoch = 0;
	private active = true;
	private loaded = false;
	private loadPromise?: Promise<void>;
	private eventPromise?: Promise<void>;
	private readonly dirty = new Map<string, number>();
	private readonly versions = new Map<string, number>();
	private observedCollection = false;
	private readonly listeners = new Set<() => void>();
	private readonly schemaDependents = new Map<string, Set<string>>();
	private readonly fileDependents = new Map<string, Set<string>>();
	private readonly referencesByPath = new Map<string, { schema?: string; files: string[] }>();
	private constructor(
		readonly files: ContactsFiles,
		private readonly getRoot: () => string,
		readonly presets: readonly DefinitionRevision[],
		readonly queue: WriteQueue,
		readonly drafts?: ArchiveDraftStore,
	) {
		this.index = new ArchiveIndex(getRoot(), presets);
	}
	static async create(
		files: ContactsFiles,
		getRoot: () => string,
		queue = new WriteQueue(),
		drafts?: ArchiveDraftStore,
	): Promise<ArchiveRuntime> {
		return new ArchiveRuntime(files, getRoot, await presetRevisions(), queue, drafts);
	}
	get root(): string {
		return this.index.root;
	}
	get loading(): boolean {
		return this.index.loading;
	}
	get ready(): boolean {
		return this.active && this.loaded && this.root === this.getRoot();
	}
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	private emit(): void {
		if (this.active) for (const listener of [...this.listeners]) listener();
	}
	context(signal?: AbortSignal): ArchiveWriteContext {
		return { epoch: this.epoch, root: this.root, signal };
	}
	assert(context: ArchiveWriteContext, write = false): void {
		if (!this.active || context.epoch !== this.epoch || context.root !== this.root || this.getRoot() !== this.root)
			throw new ArchiveError('unavailable');
		if (context.signal?.aborted) throw new ArchiveError('cancelled');
		assertRoot(this.root);
		if (write && !this.loaded) throw new ArchiveError('not-ready');
	}
	async ensureLoaded(): Promise<void> {
		if (this.root !== this.getRoot()) return this.reload();
		if (this.loaded) return;
		if (this.loadPromise) return this.loadPromise;
		const context = this.context();
		this.assert(context);
		this.index.loading = true;
		this.emit();
		const load = async () => {
			await this.files.ready();
			this.assert(context);
			const files = this.files.getMarkdownFiles().filter((file) => isDiscoveryPath(this.root, file.path));
			// Canonical definition directories first; metadata discovery still recognizes moved definitions elsewhere.
			files.sort(
				(a, b) =>
					Number(b.path.includes(`/${ARCHIVE_PATHS.definitions}/`)) -
					Number(a.path.includes(`/${ARCHIVE_PATHS.definitions}/`)),
			);
			for (let start = 0; start < files.length; start += 16) {
				const entries = await Promise.all(
					files.slice(start, start + 16).map((file) => this.readEntry(file, context)),
				);
				this.assert(context);
				for (const entry of entries) if (entry) this.apply(entry, true);
			}
			// Only unresolved schema dependents need another read after definitions arrived out of order.
			for (const path of this.index.paths()) {
				const entry = this.index.entry(path),
					record = entry?.entity ?? entry?.relation;
				if (
					record &&
					this.index.schema(record.schemaRevisionId) &&
					Object.keys(record.values).length === 0 &&
					!entry?.legacy
				) {
					const file = this.files.getFileByPath(path);
					if (file) {
						const next = await this.readEntry(file, context);
						if (next) this.apply(next, true);
					}
				}
			}
			this.assert(context);
			this.index.refreshAllLegacy();
			this.index.loading = false;
			this.loaded = true;
			this.emit();
			await this.flushEvents();
		};
		this.loadPromise = load()
			.catch((error) => {
				if (this.active && context.epoch === this.epoch) {
					this.index.loading = false;
					this.emit();
				}
				throw error;
			})
			.finally(() => {
				if (context.epoch === this.epoch) this.loadPromise = undefined;
			});
		return this.loadPromise;
	}
	async reload(): Promise<void> {
		if (!this.active) throw new ArchiveError('unavailable');
		this.epoch++;
		this.loaded = false;
		this.loadPromise = undefined;
		this.eventPromise = undefined;
		this.dirty.clear();
		this.versions.clear();
		this.schemaDependents.clear();
		this.fileDependents.clear();
		this.referencesByPath.clear();
		this.index = new ArchiveIndex(this.getRoot(), this.presets);
		this.observedCollection = false;
		this.emit();
		return this.ensureLoaded();
	}
	dispose(): void {
		this.active = false;
		this.epoch++;
		this.dirty.clear();
		this.listeners.clear();
	}
	fileChanged(file: ContactsFile): void {
		if (!this.active) return;
		for (const owner of this.fileDependents.get(file.path) ?? []) this.mark(owner);
		if (isDiscoveryPath(this.root, file.path)) this.mark(file.path);
		this.scheduleEvents();
	}
	fileDeleted(path: string, folder = false): void {
		if (!this.active) return;
		for (const [target, owners] of this.fileDependents)
			if (target === path || (folder && target.startsWith(path + '/')))
				for (const owner of owners) this.mark(owner);
		const paths = folder
			? this.index.paths().filter((item) => item === path || item.startsWith(path + '/'))
			: [path];
		for (const item of paths) {
			const previous = this.index.entry(item);
			this.bump(item);
			this.dirty.delete(item);
			this.untrack(item);
			if (previous?.definition)
				for (const dependent of this.schemaDependents.get(previous.definition.revisionId) ?? [])
					this.mark(dependent);
		}
		this.index.delete(path, folder);
		this.emit();
		this.scheduleEvents();
	}
	fileRenamed(file: ContactsFile | null, oldPath: string, newPath: string): void {
		this.fileDeleted(oldPath, !file);
		if (file) this.fileChanged(file);
		else
			for (const candidate of this.files.getMarkdownFiles())
				if (candidate.path.startsWith(newPath + '/')) this.fileChanged(candidate);
	}
	private bump(path: string): number {
		const version = (this.versions.get(path) ?? 0) + 1;
		this.versions.set(path, version);
		return version;
	}
	private mark(path: string): void {
		this.dirty.set(path, this.bump(path));
	}
	private scheduleEvents(): void {
		if (this.loaded && !this.eventPromise && this.dirty.size)
			void this.flushEvents().catch((error) => {
				if (this.active) console.error('[HUHU archives]', error);
			});
	}
	async flushEvents(): Promise<void> {
		if (!this.loaded || !this.active) return;
		if (this.eventPromise) return this.eventPromise;
		const context = this.context();
		const pending = Promise.resolve()
			.then(async () => {
				while (this.dirty.size) {
					this.assert(context);
					const batch = [...this.dirty].slice(0, 32);
					for (const [path] of batch) this.dirty.delete(path);
					const entries = await Promise.all(
						batch.map(async ([path, version]) => {
							const file = this.files.getFileByPath(path);
							const entry = file ? await this.readEntry(file, context) : undefined;
							return { path, version, entry };
						}),
					);
					this.assert(context);
					for (const { path, version, entry } of entries)
						if (this.versions.get(path) === version) {
							const previous = this.index.entry(path);
							if (entry) this.apply(entry);
							else {
								this.untrack(path);
								this.index.delete(path);
							}
							if (entry?.definition || previous?.definition)
								for (const id of new Set([
									entry?.definition?.revisionId,
									previous?.definition?.revisionId,
								]))
									if (id)
										for (const dependent of this.schemaDependents.get(id) ?? [])
											this.mark(dependent);
						}
					this.emit();
				}
			})
			.finally(() => {
				if (this.eventPromise === pending) {
					this.eventPromise = undefined;
					if (this.active && this.dirty.size) this.scheduleEvents();
				}
			});
		this.eventPromise = pending;
		return pending;
	}
	private async readEntry(file: ContactsFile, context: ArchiveWriteContext): Promise<IndexedArchive | undefined> {
		const path = file.path,
			version = this.versions.get(path) ?? 0;
		try {
			const raw = await this.files.read(file);
			this.assert(context);
			const entry = await this.index.parse(path, raw, file.stat.mtime);
			this.assert(context);
			if (file.path !== path || (this.versions.get(path) ?? 0) !== version || !this.files.getFileByPath(path))
				return undefined;
			return entry;
		} catch (error) {
			this.assert(context);
			return {
				...this.index.entry(path),
				path,
				hash: this.index.entry(path)?.hash ?? '',
				modified: file.stat.mtime,
				tag: this.index.entry(path)?.tag ?? '',
				diagnostics: [{ code: 'read-failed', path, detail: String(error) }],
			};
		}
	}
	private untrack(path: string): void {
		const old = this.referencesByPath.get(path);
		if (old?.schema) {
			const dependents = this.schemaDependents.get(old.schema);
			dependents?.delete(path);
			if (!dependents?.size) this.schemaDependents.delete(old.schema);
		}
		for (const file of old?.files ?? []) {
			const dependents = this.fileDependents.get(file);
			dependents?.delete(path);
			if (!dependents?.size) this.fileDependents.delete(file);
		}
		this.referencesByPath.delete(path);
	}
	private apply(entry: IndexedArchive, deferLegacy = false): void {
		this.untrack(entry.path);
		const record = entry.entity ?? entry.relation,
			references: string[] = [];
		if (record) {
			const paths = this.schemaDependents.get(record.schemaRevisionId) ?? new Set();
			paths.add(entry.path);
			this.schemaDependents.set(record.schemaRevisionId, paths);
			const definition = this.index.schema(record.schemaRevisionId)?.definition;
			const collect = (fields: readonly FieldDefinition[], values: Values): void => {
				for (const field of fields) {
					const value = values[field.fieldId];
					if (field.kind === 'file' && typeof value === 'string' && value) {
						references.push(value);
						if (!this.files.getFileByPath(value))
							entry.diagnostics.push({
								code: 'missing-file',
								path: entry.path,
								id: record.id,
								detail: value,
							});
					} else if (field.kind === 'table' && Array.isArray(value)) {
						for (const row of value)
							if (object(row) && object(row.values)) collect(field.columns ?? [], row.values);
					}
				}
			};
			if (definition?.kind === 'type' || definition?.kind === 'relation-type')
				collect(definition.fields, record.values);
		}
		for (const target of references) {
			const paths = this.fileDependents.get(target) ?? new Set();
			paths.add(entry.path);
			this.fileDependents.set(target, paths);
		}
		this.referencesByPath.set(entry.path, { schema: record?.schemaRevisionId, files: references });
		this.index.apply(entry, deferLegacy);
		if (entry.collectionId) this.observedCollection = true;
	}
	/** Arguments are owned before queueing. An AbortSignal stays live and is checked before each commit. */
	command<I, O>(
		input: I,
		run: (owned: I, context: ArchiveWriteContext) => Promise<O>,
		signal?: AbortSignal,
	): Promise<O> {
		let owned: I;
		try {
			owned = copy(input);
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		const admitted = this.context(signal);
		return this.queue.run(
			`archives:${admitted.root}`,
			async () => {
				this.assert(admitted);
				await this.ensureLoaded();
				await this.flushEvents();
				this.assert(admitted, true);
				return run(owned, admitted);
			},
			'archives command',
		);
	}
	async read(path: string, context = this.context(), guardEditor = false): Promise<string> {
		this.assert(context);
		if (!underRoot(this.root, path)) throw new ArchiveError('outside-root');
		const file = this.files.getFileByPath(path);
		if (!file) throw new ArchiveError('missing-file', path);
		const raw = await this.files.read(file);
		this.assert(context);
		if (file.path !== path) throw new ArchiveError('file-moved');
		if (guardEditor) this.files.checkEditor(file, raw);
		return raw;
	}
	async refresh(path: string, context = this.context()): Promise<void> {
		const file = this.files.getFileByPath(path);
		if (!file) {
			this.index.delete(path);
			return;
		}
		const entry = await this.readEntry(file, context);
		this.assert(context);
		if (entry) this.apply(entry);
		this.emit();
	}
	async entity(
		idOrPath: string,
		context = this.context(),
		guardEditor = true,
	): Promise<{ entity: EntityRecord; raw: string }> {
		this.assert(context, true);
		const entity = this.index.entity(idOrPath);
		if (!entity) throw new ArchiveError('missing-or-duplicate-id', idOrPath);
		const raw = await this.read(entity.path, context, guardEditor),
			parsed = await this.index.parse(entity.path, raw, entity.modified);
		this.assert(context);
		if (
			!parsed.entity ||
			parsed.entity.id !== entity.id ||
			parsed.diagnostics.some((item) => item.code !== 'missing-endpoint' && item.code !== 'missing-file')
		)
			throw new ArchiveError('invalid-record');
		this.apply(parsed);
		return { entity: copy(parsed.entity), raw };
	}
	async patch(
		path: string,
		update: (latest: string) => string,
		context: ArchiveWriteContext,
	): Promise<{ raw: string; hash: string }> {
		this.assert(context, true);
		if (!underRoot(this.root, path)) throw new ArchiveError('outside-root');
		const file = this.files.getFileByPath(path);
		if (!file) throw new ArchiveError('missing-file', path);
		let committed = '';
		const raw = await this.files.process(file, (latest) => {
			this.assert(context, true);
			if (file.path !== path) throw new ArchiveError('file-moved');
			this.files.checkEditor(file, latest);
			committed = update(latest);
			return committed;
		});
		if (raw !== committed) throw new ArchiveError('write-verification-failed', path);
		return this.finishWrite(path, raw, context);
	}
	async writeExact(
		path: string,
		before: string | undefined,
		after: string,
		context: ArchiveWriteContext,
	): Promise<{ raw: string; hash: string }> {
		this.assert(context, true);
		if (!underRoot(this.root, path)) throw new ArchiveError('outside-root');
		if (before !== undefined)
			return this.patch(
				path,
				(latest) => {
					if (latest !== before) throw new ArchiveError('write-conflict', path);
					return after;
				},
				context,
			);
		if (this.files.getAbstractFileByPath(path)) throw new ArchiveError('path-exists', path);
		const file = await this.files.create(path, after);
		if (file.path !== path) throw new ArchiveError('file-moved');
		return this.finishWrite(path, after, context);
	}
	private async finishWrite(
		path: string,
		raw: string,
		context: ArchiveWriteContext,
	): Promise<{ raw: string; hash: string }> {
		const file = this.files.getFileByPath(path);
		if (!file || (await this.files.read(file)) !== raw) throw new ArchiveError('write-verification-failed', path);
		const hash = await digest(raw);
		// Do not turn an already committed single-file write into a false failure on module shutdown.
		if (this.active && context.epoch === this.epoch && context.root === this.root && this.getRoot() === this.root) {
			const entry = await this.index.parse(path, raw, file.stat.mtime);
			if (this.active && context.epoch === this.epoch) {
				this.apply(entry);
				this.emit();
			}
		}
		return { raw, hash };
	}
	receipt(operationId: string, id: string, path: string, hash: string): CommandReceipt {
		return { operationId, id, path, contentHash: hash, committed: true };
	}
	async verifySchema(id: string, context: ArchiveWriteContext): Promise<DefinitionRevision> {
		const schema = this.index.schema(id);
		if (!schema) throw new ArchiveError('missing-definition', id);
		const paths = this.index.definitionPaths(id);
		if (paths.length > 1) throw new ArchiveError('duplicate-id', id);
		if (paths.length === 0) {
			if (!this.index.collectionIds().length && this.presets.some((preset) => preset.revisionId === id))
				return schema;
			throw new ArchiveError('missing-definition', id);
		}
		const current = await decodeDefinition(await this.read(paths[0]!, context, true));
		this.assert(context);
		if (current.contentHash !== schema.contentHash || current.revisionId !== id)
			throw new ArchiveError('schema-conflict');
		return current;
	}
	async bootstrap(context: ArchiveWriteContext): Promise<string> {
		this.assert(context, true);
		const ids = this.index.collectionIds();
		if (ids.length > 1) throw new ArchiveError('duplicate-collection');
		const collectionPath = this.index.collectionPaths()[0] ?? `${this.root}/${ARCHIVE_PATHS.collection}`;
		let id = ids[0],
			collectionRaw: string;
		if (!id) {
			if (
				this.observedCollection ||
				this.index.paths().some((path) => {
					const entry = this.index.entry(path);
					return entry?.definition || entry?.relation || entry?.entity?.format === 2 || entry?.operation;
				})
			)
				throw new ArchiveError('missing-collection');
			id = crypto.randomUUID();
			collectionRaw = patchProperties('', {
				'huhu-format-version': 2,
				'huhu-type': COLLECTION_TAG,
				'huhu-id': id,
				'huhu-presets-ready': false,
			});
			await this.writeExact(collectionPath, undefined, collectionRaw, context);
		} else {
			collectionRaw = await this.read(collectionPath, context, true);
			const parsed = await this.index.parse(collectionPath, collectionRaw);
			if (parsed.collectionId !== id) throw new ArchiveError('collection-conflict');
			// Once bootstrapped, deleting a definition is an error to diagnose, not an invitation to recreate it.
			if (parsed.collectionReady) return id;
		}
		for (const revision of this.presets) {
			const path = definitionPath(
					this.root,
					revision.definition.kind,
					revision.definition.id,
					revision.revisionId,
				),
				raw = encodeDefinition(revision);
			if (!this.files.getFileByPath(path)) await this.writeExact(path, undefined, raw, context);
			else {
				const existing = await this.read(path, context);
				const entry = await this.index.parse(path, existing);
				if (
					entry.definition?.contentHash !== revision.contentHash ||
					entry.definition.revisionId !== revision.revisionId
				)
					throw new ArchiveError('preset-conflict', path);
				this.apply(entry);
			}
			const headPath = definitionPath(this.root, revision.definition.kind, revision.definition.id);
			if (!this.files.getAbstractFileByPath(headPath))
				await this.writeExact(
					headPath,
					undefined,
					patchProperties('', {
						'huhu-format-version': 2,
						'huhu-type': HEAD_TAG,
						'huhu-id': revision.definition.id,
						'huhu-revision-id': revision.revisionId,
					}),
					context,
				);
		}
		await this.writeExact(
			collectionPath,
			collectionRaw,
			patchProperties(collectionRaw, { 'huhu-presets-ready': true }),
			context,
		);
		if (!identifier(id)) throw new ArchiveError('invalid-collection');
		return id;
	}
}

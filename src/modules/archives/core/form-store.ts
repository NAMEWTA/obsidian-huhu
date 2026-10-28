import { DefinitionGraph, DefinitionPublicationError } from './definition-graph';
import { textHash } from '../../../shared/storage/text-edits';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import type { ContactsFiles } from './files';
import { ContactsError } from './model';
import { archiveFrontmatter, archiveMarkdown } from './persist/v2/markdown';
import { patchYamlValues } from './persist/yaml-values';
import { defaultFormDesign, validateFormDesign, type ArchiveFormDesign, type ArchiveFormSnapshot, type PublishArchiveForms } from './form-definitions';
import type { ArchiveTypeDefinition } from './schema';

interface Revision {
	revisionId: string;
	parentRevisionIds: string[];
	displayVersion: number;
	contentHash: string;
	design: ArchiveFormDesign;
}
/** The pointer write completed; a subsequent read failed. Callers must inspect/reload, never blindly replay publication. */
export class ArchiveFormPublicationError extends ContactsError {
	readonly commit: { state: 'committed-unverified'; revisionId: string; pointerPath: string };
	constructor(revisionId: string, pointerPath: string) {
		super('formPublicationUnverified', `${pointerPath}:${revisionId}`);
		this.commit = { state: 'committed-unverified', revisionId, pointerPath };
	}
}
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
	: value && typeof value === 'object' ? `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}` : JSON.stringify(value);
const content = (revision: Omit<Revision, 'contentHash'>) => canonical(revision);
/** Visible immutable form revisions with a CAS current pointer. Pre-commit failures retain unreferenced revisions; post-commit read failures identify the committed pointer. */
export class ArchiveFormStore {
	constructor(private files: ContactsFiles, private queue: WriteQueue, private root: () => string,
		private guard: (root: string) => void,
		private captureType: (type: ArchiveTypeDefinition) => Promise<() => void>,
		private invalidate: () => void, private generation: () => number, private graph: DefinitionGraph) {}
	private directory(typeId: string): string { return `${this.root()}/档案定义/表单/${typeId}`; }
	async capture(type: ArchiveTypeDefinition, revisionId: string | null, contentHash: string | null): Promise<() => void> {
		const root = this.root(), directory = this.directory(type.typeId), pointerPath = `${directory}/当前.md`,
			pointer = this.files.getFileByPath(pointerPath), revision = revisionId ? this.files.getFileByPath(`${directory}/修订/${revisionId}.md`) : null;
		const proofs = [pointer, revision].flatMap((file) => file ? [{ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size }] : []);
		const snapshot = await this.read(type);
		if (snapshot.blockedReason) throw new ContactsError(snapshot.blockedReason, type.typeId);
		const graph = await this.graph.capture('form', type.typeId, revisionId);
		if (snapshot.revisionId !== revisionId || snapshot.contentHash !== contentHash) throw new ContactsError('formChanged');
		const editors = await this.files.captureEditors(proofs.map((proof) => proof.file));
		const check = () => {
			this.guard(root); editors(); graph();
			if (this.files.getFileByPath(pointerPath) !== pointer || proofs.some((proof) =>
				this.files.getFileByPath(proof.path) !== proof.file || proof.file.stat.mtime !== proof.mtime || proof.file.stat.size !== proof.size)) throw new ContactsError('formChanged');
		};
		check(); return check;
	}
	async read(type: ArchiveTypeDefinition): Promise<ArchiveFormSnapshot> {
		const root = this.root(); this.guard(root);
		const directory = this.directory(type.typeId), state = await this.graph.read('form', type.typeId);
		const selected = state.effectiveRevisionId;
		if (!selected) return { type: structuredClone(type), design: defaultFormDesign(type), revisionId: null, contentHash: null, definitionState: state, blockedReason: state.blocked ? state.diagnostics[0]?.code : undefined };
		const revisionId = selected, file = this.files.getFileByPath(`${directory}/修订/${revisionId}.md`);
		if (!file) throw new ContactsError('missingDefinition');
		const stored = archiveFrontmatter(await this.files.read(file));
		const revision = stored.revision as Revision;
		if (stored['huhu-type'] !== 'archive-form-definition' || stored['huhu-format-version'] !== 2 || !revision || revision.revisionId !== revisionId ||
			!Array.isArray(revision.parentRevisionIds) || !revision.parentRevisionIds.every((id) => typeof id === 'string' && /^[\w-]+$/.test(id)) ||
			!Number.isSafeInteger(revision.displayVersion) || revision.displayVersion < 1) throw new ContactsError('invalidDefinition');
		if (revision.contentHash !== await textHash(content({ revisionId, parentRevisionIds: revision.parentRevisionIds, displayVersion: revision.displayVersion, design: revision.design }))) throw new ContactsError('invalidDefinition');
		if(revision.design.schemaRevisionId !== type.revisionId) return {type:structuredClone(type),design:defaultFormDesign(type),revisionId,contentHash:revision.contentHash,definitionState:state,blockedReason:'formSchemaPinned'};
		validateFormDesign(revision.design, type);
		if (revision.contentHash !== await textHash(content({ revisionId, parentRevisionIds: revision.parentRevisionIds, displayVersion: revision.displayVersion, design: revision.design })))
			throw new ContactsError('invalidDefinition');
		this.guard(root);
		return { type: structuredClone(type), design: structuredClone(revision.design), revisionId, contentHash: revision.contentHash, definitionState: state, blockedReason: state.blocked ? state.diagnostics.find(item => item.code !== 'definitionPointerLag')?.code : undefined };
	}
	async publish(input: PublishArchiveForms, type: ArchiveTypeDefinition): Promise<ArchiveFormSnapshot> {
		const request = structuredClone(input), root = this.root();
		validateFormDesign(request.design, type);
		if (request.typeId !== type.typeId || request.schemaContentHash !== type.contentHash) throw new ContactsError('definitionConflict');
		return this.queue.run('archives:definitions', async () => {
			this.guard(root);
			const previous = await this.read(type);
			if (previous.blockedReason) throw new ContactsError(previous.blockedReason, type.typeId);
			if (previous.revisionId !== request.baseRevisionId || previous.contentHash !== request.baseContentHash) throw new ContactsError('definitionConflict');
			const directory = this.directory(type.typeId), pointerPath = `${directory}/当前.md`, pointer = this.files.getFileByPath(pointerPath);
			const pointerRaw = pointer ? await this.files.read(pointer) : null;
			const revisionId = crypto.randomUUID(), revision = {
				revisionId, parentRevisionIds: previous.revisionId ? [previous.revisionId] : [],
				displayVersion: previous.revisionId ? (archiveFrontmatter(await this.files.read(this.files.getFileByPath(`${directory}/修订/${previous.revisionId}.md`)!)).revision as Revision).displayVersion + 1 : 1,
				design: request.design,
			};
			const published: Revision = { ...revision, contentHash: await textHash(content(revision)) };
			const path = `${directory}/修订/${revisionId}.md`, raw = archiveMarkdown({ 'huhu-type': 'archive-form-definition', 'huhu-format-version': 2, 'huhu-publication': 'staged', revision: published });
			const rawHash = await textHash(raw);
			this.guard(root);
			await this.files.create(path, raw);
			const file = this.files.getFileByPath(path);
			if (!file) throw new ContactsError('writeUnverified', path);
			const staged = { mtime: file.stat.mtime, size: file.stat.size, generation: this.generation() };
			const checkStaged = () => {
				this.guard(root);
				if (this.files.getFileByPath(path) !== file || file.path !== path || file.stat.mtime !== staged.mtime ||
					file.stat.size !== staged.size || this.generation() !== staged.generation) throw new ContactsError('definitionConflict', path);
			};
			const readBack = await this.files.read(file);
			if (readBack !== raw || await textHash(readBack) !== rawHash) throw new ContactsError('writeUnverified', path);
			checkStaged();
			const checkStagedEditors = await this.files.captureEditors([file]);
			checkStaged();
			// Revalidate the schema after the staged file's own Vault events, then freeze that verified proof.
			const checkType = await this.captureType(type), checkForms = await this.capture(type, previous.revisionId, previous.contentHash);
			const latestStaged = await this.files.read(file);
			checkStaged(); checkStagedEditors();
			if (latestStaged !== raw || await textHash(latestStaged) !== rawHash) throw new ContactsError('definitionConflict', path);
			const beforePublication = () => { this.guard(root); checkStaged(); checkStagedEditors(); checkType(); checkForms(); };
			try { await this.graph.publish('form', type.typeId, revisionId, published.contentHash, previous.revisionId, beforePublication,raw); } catch (error) { if (error instanceof DefinitionPublicationError) throw new ArchiveFormPublicationError(revisionId, pointerPath); throw error; }
			try {
				const graph = await this.graph.capture('form', type.typeId, revisionId, [{ path, raw }]), schema = await this.captureType(type);
				const beforeCommit = () => { this.guard(root); graph(); schema(); if (this.files.getFileByPath(path) !== file || file.stat.mtime !== staged.mtime || file.stat.size !== staged.size || this.files.getFileByPath(pointerPath) !== pointer) throw new ContactsError('definitionConflict'); };
				beforeCommit();
				if (pointer) await this.files.process(pointer, latest => { beforeCommit(); if (latest !== pointerRaw) throw new ContactsError('definitionConflict'); return patchYamlValues(latest, new Map([['huhu-form-revision', revisionId]])); }, beforeCommit);
				else await this.files.create(pointerPath, archiveMarkdown({ 'huhu-type': 'archive-form-current', 'huhu-format-version': 2, 'huhu-form-revision': revisionId }), beforeCommit);
			} catch { throw new ArchiveFormPublicationError(revisionId, pointerPath); }

			try {
				const result = await this.read(type);
				if (result.blockedReason || result.revisionId !== revisionId) throw new ContactsError('writeUnverified', pointerPath);
				return result;
			} catch { throw new ArchiveFormPublicationError(revisionId, pointerPath); }
		}).finally(this.invalidate);
	}
}

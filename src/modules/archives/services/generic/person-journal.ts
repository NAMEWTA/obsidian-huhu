import { ArchiveError, type FormSession, type CommandReceipt, type Definition } from '../../core/schema/model';
import { copy, requiredId, equal } from '../../core/schema/value';
import { changeJournal, type WriteJournal, type JournalTarget } from '../../core/person-journal/journal';
import type { ArchivesCatalog, ArchivesCommands, ArchivesQuery } from '../../api';
import { PERSON, defaultForms, presetRevisionId } from '../../core/schema/presets';
import { PERSON_WITH_JOURNAL, PERSON_JOURNAL_REVISION_ID } from '../../core/person-journal/preset';

function supportsJournal(definition: Definition | undefined): boolean {
	if (definition?.kind !== 'type' || definition.id !== PERSON.id) return false;
	const field = definition.fields.find(field => field.fieldId === 'journal');
	return !!field && field.kind === 'table' && !field.archived && [
		['date', 'date'], ['title', 'text'], ['content', 'markdown'], ['relatedEntityIds', 'strings'],
	].every(([id, kind]) => field.columns?.some(column => column.fieldId === id && column.kind === kind && !column.archived));
}

/** Archives-local facade over the existing ARCHIVES_COMMANDS publication/save/recovery boundary.
 * CRUD identifies entity/row IDs, never names. expectedHash must match when opening the session;
 * save then merges unrelated concurrent fields and rejects conflicts in the journal field.
 */
export class PersonJournalService {
	constructor(private readonly catalog: ArchivesCatalog, private readonly query: ArchivesQuery, private readonly commands: ArchivesCommands) {}
	async install(signal?: AbortSignal): Promise<{ installed: boolean; preserved: boolean; revisionId?: string }> {
		await this.commands.initialize(signal);
		const summary = this.catalog.snapshot().types.find(type => type.id === PERSON.id);
		const current = summary ? await this.query.definition(summary.revisionId) : undefined;
		if (!current || (current.revisionId !== PERSON_JOURNAL_REVISION_ID && (current.revisionId !== presetRevisionId(PERSON.id) || !equal(current.definition, PERSON))))
			return { installed: false, preserved: true, revisionId: current?.revisionId };
		if (current.revisionId === PERSON_JOURNAL_REVISION_ID && !equal(current.definition, PERSON_WITH_JOURNAL)) return { installed: false, preserved: true, revisionId: current.revisionId };
		let installed = false, preserved = false;
		if (current.revisionId !== PERSON_JOURNAL_REVISION_ID) {
			await this.commands.publishDefinition({ operationId: PERSON_JOURNAL_REVISION_ID, definition: PERSON_WITH_JOURNAL, expectedHeads: [current.revisionId] }, signal);
			installed = true;
		}
		for (const definition of defaultForms(PERSON_WITH_JOURNAL)) {
			const previous = this.catalog.snapshot().forms.find(item => item.definition.id === definition.id);
			if (previous && equal(previous.definition, definition)) continue;
			const baseline = defaultForms(PERSON).find(item => item.id === definition.id);
			if (!previous || previous.revisionId !== presetRevisionId(definition.id) || !equal(previous.definition, baseline)) { preserved = true; continue; }
			await this.commands.publishDefinition({ operationId: `preset-${definition.id}-journal-v3`, definition, expectedHeads: [previous.revisionId] }, signal);
			installed = true;
		}
		return { installed, preserved, revisionId: PERSON_JOURNAL_REVISION_ID };
	}
	/** Prepare only: the caller must confirm and use ARCHIVES_COMMANDS.resumeOperation; the original entity stays unchanged until then. */
	async prepareUpgrade(input: Omit<JournalTarget, 'rowId'>, signal?: AbortSignal): ReturnType<ArchivesCommands['prepareUpgrade']> {
		const owned = copy(input);
		requiredId(owned.operationId); requiredId(owned.entityId);
		signal?.throwIfAborted();
		const session = await this.commands.beginEdit(owned.entityId);
		if (session.entityId !== owned.entityId || session.typeId !== PERSON.id) throw new ArchiveError('invalid-person');
		if (session.baseHash !== owned.expectedHash) throw new ArchiveError('write-conflict');
		const summary = this.catalog.snapshot().types.find(type => type.id === PERSON.id);
		const revision = summary ? await this.query.definition(summary.revisionId) : undefined;
		if (!revision || !supportsJournal(revision.definition)) throw new ArchiveError('person-journal-upgrade-required');
		return this.commands.prepareUpgrade({ operationId: owned.operationId, id: owned.entityId, expectedHash: owned.expectedHash, revisionId: revision.revisionId, values: session.draft }, signal);
	}
	private async begin(entityId: string, expectedHash: string): Promise<FormSession> {
		requiredId(entityId);
		const session = await this.commands.beginEdit(entityId);
		if (session.entityId !== entityId || session.typeId !== PERSON.id) throw new ArchiveError('invalid-person');
		if (session.baseHash !== expectedHash) throw new ArchiveError('write-conflict');
		const revision = await this.query.definition(session.schemaRevisionId);
		if (!supportsJournal(revision?.definition)) throw new ArchiveError('person-journal-upgrade-required');
		return session;
	}
	private async change(input: JournalTarget & Partial<Pick<WriteJournal, 'values'>>, action: 'add' | 'update' | 'remove', signal?: AbortSignal): Promise<CommandReceipt> {
		const owned = copy(input);
		requiredId(owned.operationId);
		signal?.throwIfAborted();
		const session = await this.begin(owned.entityId, owned.expectedHash);
		session.draft = { ...session.draft, journal: changeJournal(session.draft.journal, owned.rowId, action, owned.values) };
		session.dirtyFields = ['journal'];
		return this.commands.save({ operationId: owned.operationId, session }, signal);
	}
	add(input: WriteJournal, signal?: AbortSignal): Promise<CommandReceipt> { return this.change(input, 'add', signal); }
	update(input: WriteJournal, signal?: AbortSignal): Promise<CommandReceipt> { return this.change(input, 'update', signal); }
	remove(input: JournalTarget, signal?: AbortSignal): Promise<CommandReceipt> { return this.change(input, 'remove', signal); }

}

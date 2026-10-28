import type { ArchivesCatalog, ArchivesCommands, ArchivesQuery } from '../api';
import type { ArchiveRepository } from '../core/catalog';
import { ContactsError } from '../core/model';

export function archiveServices(source: () => ArchiveRepository | undefined): {
	catalog: ArchivesCatalog;
	query: ArchivesQuery;
	commands: ArchivesCommands;
} {
	const owner = () => {
		const value = source();
		if (!value) throw new ContactsError('disabled');
		return value;
	};
	return {
		catalog: { definitionStates: () => owner().definitionStates(), relationTypes: () => owner().relations.catalog(), forms: (id, revision) => owner().forms(id, revision), snapshot: () => owner().catalog(), subscribe: (listener) => owner().subscribe(listener) },
		query: { migrations: () => owner().migrations.list(), relations: (id) => owner().relations.query(id), snapshot: () => owner().snapshot(), subscribe: (listener) => owner().subscribe(listener) },
		commands: {
			deleteRelation: (input) => owner().relations.delete(input),
			preflightMigration: (path) => owner().migrations.preflight(path),
			migrate: (input) => owner().migrations.migrate(input),
			resumeMigration: (id) => owner().migrations.resume(id),
			rollbackMigration: (id) => owner().migrations.rollback(id),
			publishRelationType: (input) => owner().relations.publishType(input),
			createRelation: (input) => owner().relations.create(input),
			beginRelationEdit: (id) => owner().relations.beginEdit(id),
			updateRelation: (input) => owner().relations.update(input),
			publishForms: (input) => owner().publishForms(input),
			publishType: (input) => owner().publishType(input),
			createEntity: (input) => owner().createEntity(input),
			beginEdit: (id) => owner().beginEdit(id),
			updateEntity: (input) => owner().updateEntity(input),
		},
	};
}

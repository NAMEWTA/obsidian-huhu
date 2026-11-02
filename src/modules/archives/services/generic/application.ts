import type { ArchivesCatalog, ArchivesCommands, ArchivesQuery } from '../../api';
import type { ArchiveRuntime } from './runtime';
import { EntityCommands } from './entities';
import { RelationCommands } from './relation-commands';
import { DefinitionCommands } from './definitions';
import { RecoveryCommands } from './recovery';
/** One command boundary shared by UI, automation and future tools; no mutable index crosses the public API. */
export class ArchivesApplication {
	readonly entities: EntityCommands;
	readonly relations: RelationCommands;
	readonly definitions: DefinitionCommands;
	readonly recovery: RecoveryCommands;
	readonly catalog: ArchivesCatalog;
	readonly query: ArchivesQuery;
	readonly commands: ArchivesCommands;
	constructor(readonly runtime: ArchiveRuntime) {
		this.entities = new EntityCommands(runtime);
		this.relations = new RelationCommands(runtime);
		this.definitions = new DefinitionCommands(runtime);
		this.recovery = new RecoveryCommands(runtime);
		const loaded = async () => {
			await runtime.ensureLoaded();
			const context = runtime.context();
			await runtime.flushEvents();
			runtime.assert(context, true);
		};
		this.catalog = {
			snapshot: () => runtime.index.catalog(),
			subscribe: (listener) => runtime.subscribe(listener),
		};
		this.query = {
			entities: async (query) => {
				await loaded();
				return runtime.index.query(query);
			},
			entity: async (id) => {
				await loaded();
				return runtime.index.get(id);
			},
			relations: async (id) => {
				await loaded();
				return runtime.index.relations(id);
			},
			definition: async (id) => {
				await loaded();
				return runtime.index.schema(id);
			},
			revisions: async (id) => {
				await loaded();
				return runtime.index.revisions(id);
			},
			classify: (path) => runtime.index.classify(path),
			subscribe: (listener) => runtime.subscribe(listener),
		};
		this.commands = {
			initialize: (signal) => runtime.command({}, (_input, context) => runtime.bootstrap(context), signal),
			create: (input, signal) => this.entities.create(input, signal),
			beginEdit: (id) => this.entities.beginEdit(id),
			save: (input, signal) => this.entities.save(input, signal),
			setState: (input, signal) => this.entities.setState(input, signal),
			impact: (id) => this.entities.impact(id),
			createRelation: (input, signal) => this.relations.create(input, signal),
			updateRelation: (input, signal) => this.relations.update(input, signal),
			publishDefinition: (input, signal) => this.definitions.publish(input, signal),
			previewDefinition: (definition) => this.definitions.preview(definition),
			preflightMigrations: () => this.recovery.preflight(),
			prepareMigration: (input, signal) => this.recovery.prepareMigration(input, signal),
			prepareUpgrade: (input, signal) => this.recovery.prepareUpgrade(input, signal),
			resumeOperation: (input, signal) => this.recovery.execute(input, signal),
			rollbackOperation: (input, signal) => this.recovery.rollback(input, signal),
			operations: async () => {
				await loaded();
				return runtime.index.operations();
			},
			drafts: () => this.entities.drafts(),
			saveDraft: (session) => this.entities.saveDraft(session),
			discardDraft: (id) => this.entities.discardDraft(id),
		};
	}
}

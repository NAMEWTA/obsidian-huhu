import { serviceKey } from '../../app/contracts/module';
import type { PanelModel, WorkbenchTarget } from '../../app/contracts/workbench';

/** What the workbench shows for the archives: the side panel tree, the page title and a change signal. */
export interface ArchivesWorkbench {
	/** The people / companies tree for the side panel; rows go to the list or straight to a record. */
	panel(target: WorkbenchTarget): PanelModel;
	title(target: WorkbenchTarget): string | undefined;
	/** Runs when the archive index changes; returns the unsubscribe function. */
	subscribe(listener: () => void): () => void;
}

export const ARCHIVES_WORKBENCH = serviceKey<ArchivesWorkbench>('archives', 'workbench');

export type {
	ArchiveField,
	ArchiveValue,
	FieldCodecId,
	ArchiveTypeDefinition,
	PublishArchiveType,
	ArchiveEntity,
	ArchiveDiagnostic,
	ArchiveCatalogSnapshot,
	ArchiveQuerySnapshot,
	CreateArchiveEntity,
	ArchiveCreateReceipt,
	ArchiveEditBase,
	UpdateArchiveEntity,
	ArchiveUpdateReceipt,
} from './core/schema';
import type {
	ArchiveCatalogSnapshot,
	ArchiveQuerySnapshot,
	ArchiveTypeDefinition,
	PublishArchiveType,
	CreateArchiveEntity,
	ArchiveCreateReceipt,
	ArchiveEditBase,
	UpdateArchiveEntity,
	ArchiveUpdateReceipt,
} from './core/schema';

import type { ArchiveFormSnapshot, PublishArchiveForms } from './core/form-definitions';

import type { PublishRelationType, RelationType, CreateRelation, RelationEditBase, UpdateRelation, RelationReceipt, RelationCatalogSnapshot, RelationQuerySnapshot } from './core/relation-model';

/** Reads visible definitions. Snapshots are detached values; reads neither publish definitions nor migrate legacy records. */
export interface ArchivesCatalog {
	definitionStates(): Promise<import('./core/definition-graph').DefinitionState[]>;
	relationTypes(): Promise<RelationCatalogSnapshot>;
	forms(typeId: string, revisionId?: string): Promise<ArchiveFormSnapshot>;
	snapshot(): Promise<ArchiveCatalogSnapshot>;
	subscribe(listener: () => void): () => void;
}
/** Legacy and v2 records share this read surface. Diagnostics and isComplete distinguish missing data from an empty result. */
export interface ArchivesQuery {
	migrations(): Promise<MigrationReceipt[]>;
	/** One row per independent fact. Endpoint/context projections share the same relation identity; legacy inline rows remain on the v1 read surface. */
	relations(entityId?: string): Promise<RelationQuerySnapshot>;
	snapshot(): Promise<ArchiveQuerySnapshot>;
	subscribe(listener: () => void): () => void;
}
/** Commands use the owner's Vault port and serial write queue. Invalid/future/ambiguous inputs reject with a stable error code.
 * Publication creates an immutable revision and a visible current pointer; failures can leave a verified revision for diagnosis.
 * Creation never overwrites an existing identity or implicitly migrates v1. Caller-supplied identities are not retry tokens.
 * Services become unavailable on module disposal; callers must reacquire the service after activation.
 */
export interface ArchivesCommands {
	deleteRelation(input: import('./core/relation-deletion').DeleteRelation): Promise<import('./core/relation-deletion').RelationDeletion>;
	preflightMigration(path: string): Promise<MigrationPreflight>;
	migrate(input: MigrateArchive): Promise<MigrationReceipt>;
	resumeMigration(migrationId: string): Promise<MigrationReceipt>;
	rollbackMigration(migrationId: string): Promise<MigrationReceipt>;
	publishRelationType(input: PublishRelationType): Promise<RelationType>;
	/** Both IDs are stable retry tokens. Reusing either for a different request rejects; a verified existing fact returns replayed=true. */
	createRelation(input: CreateRelation): Promise<RelationReceipt>;
	beginRelationEdit(id: string): Promise<RelationEditBase>;
	updateRelation(input: UpdateRelation): Promise<RelationReceipt>;
	publishForms(input: PublishArchiveForms): Promise<ArchiveFormSnapshot>;
	publishType(input: PublishArchiveType): Promise<ArchiveTypeDefinition>;
	createEntity(input: CreateArchiveEntity): Promise<ArchiveCreateReceipt>;
	/** Captures a form baseline from disk without publishing, migrating or saving native buffers. */
	beginEdit(entityId: string): Promise<ArchiveEditBase>;
	/** Three-way field updates retain omitted fields and reject same-field/schema/native-leaf conflicts. Failure leaves the caller's draft untouched. Draft checks structure; complete additionally checks required fields. v1 keeps its original codec and validation. */
	updateEntity(input: UpdateArchiveEntity): Promise<ArchiveUpdateReceipt>;
}
export const ARCHIVES_CATALOG = serviceKey<ArchivesCatalog>('archives', 'catalog');
export const ARCHIVES_QUERY = serviceKey<ArchivesQuery>('archives', 'query');
export const ARCHIVES_COMMANDS = serviceKey<ArchivesCommands>('archives', 'commands');

export type { ArchiveCondition, ArchiveFormControl, ArchiveFormTemplate, ArchiveRecordTemplate, ArchiveFormDesign, ArchiveFormSnapshot, PublishArchiveForms } from './core/form-definitions';

export type { RelationDate, PublishRelationType, RelationType, ArchiveRelation, CreateRelation, RelationEditBase, UpdateRelation, RelationReceipt, RelationCatalogSnapshot, RelationProjection, RelationQuerySnapshot } from './core/relation-model';

import type { MigrationPreflight, MigrationReceipt, MigrateArchive } from './core/migration-model';
export type { MigrationPreflight, MigrationReceipt, MigrateArchive, MigrationRow } from './core/migration-model';

export type { DefinitionState, DefinitionRevision, DefinitionFamily } from './core/definition-graph';

export type { DeleteRelation, RelationDeletion } from './core/relation-deletion';

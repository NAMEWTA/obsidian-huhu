import { serviceKey } from '../../app/contracts/module';
import type { NavigationItem, PanelModel, WorkbenchTarget } from '../../app/contracts/workbench';

/** What the workbench shows for the archives: the side panel tree, the page title and a change signal. */
export interface ArchivesWorkbench {
	/** User-provided labels are literal data; types and views are stable-ID routes. */
	navigation?(): readonly NavigationItem[];
	/** The people / companies tree for the side panel; rows go to the list or straight to a record. */
	panel(target: WorkbenchTarget): PanelModel;
	title(target: WorkbenchTarget): string | undefined;
	/** Runs when the archive index changes; returns the unsubscribe function. */
	subscribe(listener: () => void): () => void;
}

export const ARCHIVES_WORKBENCH = serviceKey<ArchivesWorkbench>('archives', 'workbench');

// Public domain boundary: independent snapshots, typed queries and preconditioned commands.
// `contacts` is only the preserved workbench/automation wire name; identities below are definition IDs.
export type {
	ArchiveTypeDefinition,
	FieldDefinition,
	FormTemplate,
	RecordTemplate,
	ViewDefinition,
	RelationTypeDefinition,
	EntityRecord,
	EntitySummary,
	RelationRecord,
	DefinitionRevision,
	FormSession,
	EntityQuery,
	QueryResult,
	RelationResult,
	CatalogSnapshot,
	CommandReceipt,
	ArchiveDiagnostic,
	Values,
	ResourceClass,
} from './core/schema/model';
export type {
	CreateEntity,
	SaveEntity,
	RelationInput,
	UpdateRelation,
	PublishDefinition,
	DefinitionPublication,
	MigrationPreflight,
	PrepareMigration,
	PrepareUpgrade,
	RecoveryResult,
	ArchiveImpact,
} from './core/schema/commands';
import type {
	CatalogSnapshot,
	DefinitionRevision,
	EntityQuery,
	EntitySummary,
	QueryResult,
	RelationResult,
	ResourceClass,
	FormSession,
	CommandReceipt,
	EntityState,
	Definition,
} from './core/schema/model';
import type {
	CreateEntity,
	SaveEntity,
	RelationInput,
	UpdateRelation,
	PublishDefinition,
	DefinitionPublication,
	MigrationPreflight,
	PrepareMigration,
	PrepareUpgrade,
	RecoveryResult,
	ArchiveImpact,
} from './core/schema/commands';
import type { ArchiveOperation } from './core/generic/operations';

export interface ArchivesCatalog {
	snapshot(): CatalogSnapshot;
	subscribe(listener: () => void): () => void;
}
export interface ArchivesQuery {
	entities(query: EntityQuery): Promise<QueryResult>;
	entity(idOrPath: string): Promise<EntitySummary | undefined>;
	relations(entityId: string): Promise<RelationResult>;
	definition(revisionId: string): Promise<DefinitionRevision | undefined>;
	revisions(definitionId?: string): Promise<DefinitionRevision[]>;
	/** Synchronous classification from the current index; never invokes a schema editor or imports UI. */
	classify(path: string): ResourceClass;
	subscribe(listener: () => void): () => void;
}
export interface ArchivesCommands {
	initialize(signal?: AbortSignal): Promise<string>;
	create(input: CreateEntity, signal?: AbortSignal): Promise<CommandReceipt>;
	beginEdit(idOrPath: string): Promise<FormSession>;
	save(input: SaveEntity, signal?: AbortSignal): Promise<CommandReceipt>;
	setState(
		input: { operationId: string; id: string; expectedHash: string; lifecycle: EntityState },
		signal?: AbortSignal,
	): Promise<CommandReceipt>;
	impact(id: string): Promise<ArchiveImpact>;
	createRelation(input: RelationInput, signal?: AbortSignal): Promise<CommandReceipt>;
	updateRelation(input: UpdateRelation, signal?: AbortSignal): Promise<CommandReceipt>;
	publishDefinition(input: PublishDefinition, signal?: AbortSignal): Promise<DefinitionPublication>;
	previewDefinition(definition: Definition): {
		incompatibleFields: string[];
		affectedIds: string[];
		fingerprint: string;
	};
	preflightMigrations(): Promise<MigrationPreflight>;
	prepareMigration(input: PrepareMigration, signal?: AbortSignal): Promise<ArchiveOperation>;
	prepareUpgrade(input: PrepareUpgrade, signal?: AbortSignal): Promise<ArchiveOperation>;
	resumeOperation(input: { operationId: string }, signal?: AbortSignal): Promise<RecoveryResult>;
	rollbackOperation(input: { operationId: string }, signal?: AbortSignal): Promise<RecoveryResult>;
	operations(): Promise<ArchiveOperation[]>;
	drafts(): Promise<FormSession[]>;
	saveDraft(session: FormSession): Promise<void>;
	discardDraft(sessionId: string): Promise<void>;
}
export const ARCHIVES_CATALOG = serviceKey<ArchivesCatalog>('archives', 'catalog');
export const ARCHIVES_QUERY = serviceKey<ArchivesQuery>('archives', 'query');
export const ARCHIVES_COMMANDS = serviceKey<ArchivesCommands>('archives', 'commands');

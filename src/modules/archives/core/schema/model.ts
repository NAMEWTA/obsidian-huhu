/** v2 archive protocol. Labels and paths are hints; IDs are identities. */
export type FieldKind =
	| 'text'
	| 'markdown'
	| 'integer'
	| 'decimal'
	| 'money'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'select'
	| 'multiselect'
	| 'strings'
	| 'file'
	| 'table';
export type Values = Record<string, unknown>;
export type Condition =
	| { all: Condition[] }
	| { any: Condition[] }
	| { fieldId: string; op: 'eq' | 'ne' | 'contains' | 'present'; value?: unknown };
export interface FieldOption {
	id: string;
	value: string;
	label: string;
	archived?: boolean;
}
export interface FieldDefinition {
	fieldId: string;
	storageKey: string;
	label: string;
	kind: FieldKind;
	required?: boolean;
	archived?: boolean;
	options?: FieldOption[];
	precision?: 'month' | 'day' | 'mixed';
	uniqueItems?: boolean;
	columns?: FieldDefinition[];
	help?: string;
}
export interface FormControl {
	fieldId: string;
	readOnly?: boolean;
	visibleWhen?: Condition;
	help?: string;
}
export interface FormGroup {
	id: string;
	label: string;
	columns: 1 | 2 | 3;
	controls: FormControl[];
	visibleWhen?: Condition;
}
export interface ArchiveTypeDefinition {
	kind: 'type';
	id: string;
	label: string;
	icon: string;
	folder: string;
	enabled: boolean;
	nameFieldId: string;
	fields: FieldDefinition[];
	defaultFormId?: string;
	defaultTemplateId?: string;
}
export interface FormTemplate {
	kind: 'form';
	id: string;
	typeId: string;
	label: string;
	groups: FormGroup[];
}
export interface RecordTemplate {
	kind: 'template';
	id: string;
	typeId: string;
	label: string;
	defaults: Values;
	body: string;
}
export interface Cardinality {
	max?: number;
	scope: 'active' | 'all';
}
export interface RelationTypeDefinition {
	kind: 'relation-type';
	id: string;
	label: string;
	enabled: boolean;
	sourceTypes: string[];
	targetTypes: string[];
	directed: boolean;
	forwardLabel: string;
	inverseLabel: string;
	sourceCardinality: Cardinality;
	targetCardinality: Cardinality;
	allowSelf: boolean;
	acyclic: boolean;
	onDelete: 'restrict' | 'retain';
	duplicatePolicy: 'allow' | 'endpoints' | 'values';
	activeWhen?: Condition;
	fields: FieldDefinition[];
	contextRoles: { role: string; label: string; typeIds: string[]; required?: boolean }[];
}
export type Filter =
	| { all: Filter[] }
	| { any: Filter[] }
	| { fieldId: string; op: 'eq' | 'ne' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'present'; value?: unknown }
	| { relationTypeId: string; direction: 'out' | 'in' | 'either'; targetId?: string };
export interface EntityQuery {
	typeId?: string;
	search?: string;
	filter?: Filter;
	states?: EntityState[];
	sort?: { fieldId: string; direction: 'asc' | 'desc' };
	offset?: number;
	limit?: number;
}
export interface ViewDefinition {
	kind: 'view';
	id: string;
	typeId: string;
	label: string;
	layout: 'table' | 'card';
	columns: string[];
	query: Omit<EntityQuery, 'offset' | 'limit'>;
}
export type Definition =
	ArchiveTypeDefinition | FormTemplate | RecordTemplate | RelationTypeDefinition | ViewDefinition;
export interface DefinitionRevision {
	revisionId: string;
	parentRevisionIds: string[];
	contentHash: string;
	displayVersion: number;
	definition: Definition;
}
export interface DefinitionHead {
	kind: Definition['kind'];
	id: string;
	revisionId: string;
}
export type EntityState = 'draft' | 'active' | 'archived';
export interface PrecisionDate {
	value: string;
	precision: 'month' | 'day';
}
export interface EntityRecord {
	id: string;
	typeId: string;
	schemaRevisionId: string;
	lifecycle: EntityState;
	values: Values;
	path: string;
	contentHash: string;
	modified: number;
	format: 1 | 2;
	migrationId?: string;
	expectedRelationIds?: string[];
}
export interface MigrationProvenance {
	migrationId: string;
	legacyOwnerId: string;
	legacySection: 'employments' | 'relations';
	legacyRowId: string;
}
export interface RelationRecord {
	id: string;
	relationTypeId: string;
	schemaRevisionId: string;
	sourceId: string;
	targetId: string;
	values: Values;
	lifecycle: 'draft' | 'active' | 'archived' | 'deleted';
	validFrom?: PrecisionDate;
	validTo?: PrecisionDate;
	contextRefs: Record<string, string>;
	provenance?: MigrationProvenance;
	path: string;
	contentHash: string;
	modified: number;
	/** Virtual v1 projections are read-only and never counted as extra stored facts. */
	legacy?: { ownerId: string; section: 'employments' | 'relations'; rowId: string };
}
export type DiagnosticCode =
	| 'invalid-format'
	| 'future-format'
	| 'missing-definition'
	| 'schema-fork'
	| 'schema-parent-missing'
	| 'duplicate-id'
	| 'missing-endpoint'
	| 'reference-conflict'
	| 'invalid-value'
	| 'cardinality'
	| 'duplicate-relation'
	| 'cycle'
	| 'pending-migration'
	| 'migration-conflict'
	| 'read-failed'
	| 'unknown-record'
	| 'missing-file'
	| 'invalid-definition';
export interface ArchiveDiagnostic {
	code: DiagnosticCode;
	path: string;
	id?: string;
	detail?: string;
	relatedIds?: string[];
}
export interface EntitySummary extends EntityRecord {
	name: string;
	diagnostics: ArchiveDiagnostic[];
	isComplete: boolean;
}
export interface QueryResult {
	items: EntitySummary[];
	total: number;
	offset: number;
	limit: number;
	entityRevision: number;
	schemaRevision: number;
	isComplete: boolean;
	diagnostics: ArchiveDiagnostic[];
}
export interface RelationResult {
	items: RelationRecord[];
	entityRevision: number;
	schemaRevision: number;
	isComplete: boolean;
	diagnostics: ArchiveDiagnostic[];
}
export interface FormSession {
	id: string;
	entityId: string;
	typeId: string;
	schemaRevisionId: string;
	baseHash: string;
	baseValues: Values;
	baseLifecycle: EntityState;
	baseRaw: string;
	path: string;
	draft: Values;
	dirtyFields: string[];
	/** Local-only editor state for a not-yet-created entity; never a persisted archive record. */
	creating?: boolean;
	templateId?: string;
	relationContext?: {
		relationTypeId: string;
		sourceId: string;
		targetId: string;
		contextRefs: Record<string, string>;
		validFrom?: PrecisionDate;
		validTo?: PrecisionDate;
		lifecycle: RelationRecord['lifecycle'];
		expectedHash?: string;
		operationId: string;
	};
}
export class ArchiveError extends Error {
	constructor(
		readonly code: string,
		readonly detail = '',
		readonly fields: string[] = [],
	) {
		super(code);
		this.name = 'ArchiveError';
	}
}
export interface CommandReceipt {
	operationId: string;
	id: string;
	path: string;
	contentHash: string;
	committed: true;
}
export interface CatalogType {
	id: string;
	label: string;
	icon: string;
	enabled: boolean;
	revisionId: string;
	count: number;
	diagnostics: ArchiveDiagnostic[];
}
export interface CatalogSnapshot {
	types: CatalogType[];
	forms: DefinitionRevision[];
	views: DefinitionRevision[];
	relationTypes: DefinitionRevision[];
	templates: DefinitionRevision[];
	schemaRevision: number;
	isComplete: boolean;
	diagnostics: ArchiveDiagnostic[];
}
export type ResourceClass =
	'entity' | 'relation' | 'definition' | 'collection' | 'migration' | 'attachment' | 'ordinary';

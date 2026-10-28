/** Portable values retain decimal and partial-date precision instead of coercing through JavaScript numbers/dates. */
export type ArchiveValue = string | number | boolean | null | ArchiveValue[] | { [key: string]: ArchiveValue };
export type FieldCodecId =
	| 'text'
	| 'markdown'
	| 'integer'
	| 'decimal'
	| 'money'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'choice'
	| 'multi-choice'
	| 'string-list'
	| 'file'
	| 'subtable';
export interface ArchiveField {
	fieldId: string;
	storageKey: string;
	label: string;
	codec: FieldCodecId;
	required?: boolean;
	options?: Array<{ id: string; label: string; disabled?: boolean }>;
	columns?: ArchiveField[];
}
export interface PublishArchiveType {
	baseRevisionId?: string;
	baseContentHash?: string;
	typeId: string;
	label: string;
	folder: string;
	titleFieldId: string;
	fields: ArchiveField[];
}
export interface ArchiveTypeDefinition extends PublishArchiveType {
	revisionId: string;
	parentRevisionIds: string[];
	contentHash: string;
	displayVersion: number;
	legacy?: boolean;
}
export interface ArchiveEntity {
	id: string;
	typeId: string;
	schemaRevisionId: string;
	formatVersion: 1 | 2;
	path: string;
	folderPath: string;
	values: Record<string, ArchiveValue>;
	createdAt: string | null;
	updatedAt: string | null;
	raw: string;
	readOnly: boolean;
}
export interface ArchiveDiagnostic {
	relationId?: string;
	severity?: 'warning' | 'error';
	definitionFamily?: import('./definition-graph').DefinitionFamily;
	definitionId?: string;
	raw?: string;
	path: string;
	code: string;
	detail?: string;
	entityId?: string;
}
export interface ArchiveCatalogSnapshot {
	definitionStates?: import('./definition-graph').DefinitionState[];
	types: ArchiveTypeDefinition[];
	diagnostics: ArchiveDiagnostic[];
}
export interface ArchiveQuerySnapshot {
	entities: ArchiveEntity[];
	diagnostics: ArchiveDiagnostic[];
	isComplete: boolean;
}
export interface CreateArchiveEntity {
	formRevisionId?: string | null;
	formContentHash?: string | null;
	templateId?: string;
	intent?: 'draft' | 'complete';
	typeId: string;
	values: Record<string, ArchiveValue>;
	/** A caller can preallocate an identity; an existing identity is never silently overwritten. */
	id?: string;
}
export interface ArchiveCreateReceipt {
	entity: ArchiveEntity;
	operationId: string;
}

/** A detached form baseline. The owner validates its raw/hash/schema again; changes never mutate this object. */
export interface ArchiveEditBase {
	entity: ArchiveEntity;
	contentHash: string;
	schemaContentHash: string;
}
export interface UpdateArchiveEntity {
	formRevisionId?: string | null;
	formContentHash?: string | null;
	base: ArchiveEditBase;
	/** Only explicitly touched fields participate. Omitted fields keep their current disk value. */
	changes: Record<string, ArchiveValue>;
	intent: 'draft' | 'complete';
}
export interface ArchiveUpdateReceipt {
	operationId: string;
	entity: ArchiveEntity;
	contentHash: string;
}

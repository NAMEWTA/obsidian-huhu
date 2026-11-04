import type {
	CommandReceipt,
	Definition,
	DefinitionRevision,
	EntityState,
	FormSession,
	PrecisionDate,
	RelationRecord,
	Values,
} from './model';
import type { ArchiveOperation } from '../generic/operations';
export interface CreateEntity {
	operationId: string;
	typeId: string;
	values: Values;
	lifecycle?: EntityState;
	templateId?: string;
}
export interface SaveEntity {
	operationId: string;
	session: FormSession;
	lifecycle?: EntityState;
}
export interface ArchiveImpact {
	id: string;
	path: string;
	contentHash: string;
	relations: number;
	contexts: number;
	attachments: number;
	reminders: number;
	restricted: boolean;
}
export interface PublishDefinition {
	operationId: string;
	definition: Definition;
	expectedHeads: string[];
}
export interface DefinitionPublication {
	revision: DefinitionRevision;
	receipt: CommandReceipt;
	pointer: 'updated' | 'conflict';
	incompatibleFields: string[];
}
export interface RelationInput {
	operationId: string;
	relationTypeId: string;
	sourceId: string;
	targetId: string;
	values: Values;
	contextRefs?: Record<string, string>;
	validFrom?: PrecisionDate;
	validTo?: PrecisionDate;
	lifecycle?: RelationRecord['lifecycle'];
}
export interface UpdateRelation {
	operationId: string;
	id: string;
	expectedHash: string;
	values: Values;
	contextRefs: Record<string, string>;
	validFrom?: PrecisionDate;
	validTo?: PrecisionDate;
	lifecycle: RelationRecord['lifecycle'];
}
export interface PrepareUpgrade {
	operationId: string;
	id: string;
	expectedHash: string;
	revisionId: string;
	values: Values;
}
export interface RecoveryResult {
	operation: ArchiveOperation;
	receipt: CommandReceipt;
}

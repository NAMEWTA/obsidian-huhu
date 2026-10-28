import type { ArchiveDiagnostic, ArchiveTypeDefinition } from './schema';
import type { ArchiveRelation } from './relation-model';
import type { RecordKind } from './model';
export interface MigrationRow {
    section: 'employments' | 'relations';
    rowId: string;
    position: number;
    manual: boolean;
    relationTypeId: string;
    sourceId: string;
    targetId: string;
    values: ArchiveRelation['values'];
    contextRefs: Record<string, string>;
    status: 'current' | 'past';
    validFrom?: ArchiveRelation['validFrom'];
    validTo?: ArchiveRelation['validTo'];
    legacyKind?: string;
}
export interface MigrationPreflight {
    root: string;
    path: string;
    ownerId: string;
    kind: RecordKind;
    sourceHash: string;
    canMigrate: boolean;
    rows: MigrationRow[];
    diagnostics: ArchiveDiagnostic[];
    counts: {
        valid: number;
        damaged: number;
        duplicates: number;
        employments: number;
        relations: number;
        reminders: number;
    };
    supersedes: string[];
    dependencies: string[];
    dependencyHashes: Array<{
        path: string;
        hash: string;
    }>;
    newFiles: number;
    backupDirectory: string;
}
export interface MigrationFile {
    path: string;
    raw: string;
    hash: string;
}
export interface MigrationPlan {
    migrationId: string;
    operationId: string;
    root: string;
    ownerId: string;
    kind: RecordKind;
    ownerPath: string;
    sourceHash: string;
    supersedes: string[];
    backupPath: string;
    type: ArchiveTypeDefinition;
    owner: MigrationFile;
    relations: Array<MigrationFile & {
        id: string;
        row: MigrationRow;
    }>;
    dependencies: Array<{
        path: string;
        hash: string;
    }>;
    hash: string;
}
export interface MigrationReceipt {
    migrationId: string;
    phase: 'staged' | 'switched' | 'complete' | 'rollback-pending' | 'rolled-back' | 'conflict' | 'superseded';
    ownerPath: string;
    relations: string[];
    verified: number;
    total: number;
    diagnostics: ArchiveDiagnostic[];
}
export interface MigrateArchive {
    preflight: MigrationPreflight;
    operationId: string;
}
export const migrationPaths = (root: string, id: string) => ({ plan: `${root}/迁移记录/${id}.md`, complete: `${root}/迁移记录/${id}-完成.md`, rollbackIntent: `${root}/迁移记录/${id}-回退计划.md`, rollback: `${root}/迁移记录/${id}-回退.md`, backup: `${root}/迁移恢复/${id}/原始.md` });

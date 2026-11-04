import { ArchiveError } from '../schema/model';
import { identifier, object, safeRelativePath } from '../schema/value';
import { envelope, frontmatter, MIGRATION_TAG, patchProperties } from './markdown';

export interface OperationWrite {
	path: string;
	beforeHash: string;
	afterHash: string;
	after: string;
	backupPath?: string;
}
export interface ArchiveOperation {
	id: string;
	kind: 'schema-upgrade' | 'relation-upgrade';
	collectionId: string;
	ownerId: string;
	schemaRevisionId: string;
	state: 'prepared' | 'staging' | 'committing' | 'committed' | 'rolling-back' | 'rolled-back';
	createdAt: number;
	owner: OperationWrite;
	/** Readback evidence, not a replacement for checking the current bytes during resume/rollback. */
	verified: string[];
}
export function encodeOperation(operation: ArchiveOperation): string {
	return patchProperties('', {
		'huhu-format-version': 2,
		'huhu-type': MIGRATION_TAG,
		'huhu-id': operation.id,
		operation,
	});
}
export function decodeOperation(raw: string): ArchiveOperation {
	const properties = frontmatter(raw);
	envelope(properties, MIGRATION_TAG);
	const value = properties.operation;
	if (
		!object(value) ||
		value.id !== properties['huhu-id'] ||
		!identifier(value.collectionId) ||
		!identifier(value.ownerId) ||
		!identifier(value.schemaRevisionId) ||
		!['schema-upgrade', 'relation-upgrade'].includes(String(value.kind)) ||
		!['prepared', 'staging', 'committing', 'committed', 'rolling-back', 'rolled-back'].includes(
			String(value.state),
		) ||
		typeof value.createdAt !== 'number' ||
		!Number.isFinite(value.createdAt) ||
		!Array.isArray(value.verified) ||
		!value.verified.every((item) => typeof item === 'string')
	)
		throw new ArchiveError('invalid-operation');
	const write = (item: unknown) => {
		if (
			!object(item) ||
			!safeRelativePath(item.path) ||
			typeof item.beforeHash !== 'string' ||
			(item.beforeHash !== '' && !/^[a-f0-9]{64}$/.test(item.beforeHash)) ||
			typeof item.afterHash !== 'string' ||
			!/^[a-f0-9]{64}$/.test(item.afterHash) ||
			typeof item.after !== 'string' ||
			item.after.length > 8 * 1024 * 1024 ||
			(item.backupPath !== undefined && !safeRelativePath(item.backupPath))
		)
			throw new ArchiveError('invalid-operation');
	};
	write(value.owner);
	return value as unknown as ArchiveOperation;
}

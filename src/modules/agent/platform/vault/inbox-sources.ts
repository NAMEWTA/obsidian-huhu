import {
	validateVaultFileReference,
	type VaultFileReference,
} from '../../core/inbox/model';

export interface VaultFileMetadata {
	readonly path: string;
	readonly size?: number;
	readonly mtime?: number;
	readonly kind?: 'file';
}

export interface VaultInboxSourcePort {
	readonly vaultId: string;
	getFileByPath(path: string): unknown;
	stat?(file: unknown): Promise<Readonly<{ size?: number; mtime?: number }> | undefined>;
}

export interface ValidatedVaultReference {
	readonly reference: VaultFileReference;
	readonly metadata: VaultFileMetadata;
}

/** Validate a metadata-only reference without reading or copying file content. */
export async function validateInboxSource(
	port: VaultInboxSourcePort,
	reference: unknown,
): Promise<ValidatedVaultReference> {
	if (!validateVaultFileReference(reference, port.vaultId)) throw new Error('inbox-source-invalid');
	const file = port.getFileByPath(reference.path);
	if (!file) throw new Error('inbox-source-missing');
	const stats = port.stat ? await port.stat(file) : undefined;
	const metadata = {
		path: reference.path,
		kind: 'file' as const,
		...(stats?.size === undefined ? {} : { size: stats.size }),
		...(stats?.mtime === undefined ? {} : { mtime: stats.mtime }),
	};
	if (reference.version?.size !== undefined && metadata.size !== undefined && reference.version.size !== metadata.size)
		throw new Error('inbox-source-changed');
	if (reference.version?.mtime !== undefined && metadata.mtime !== undefined && reference.version.mtime !== metadata.mtime)
		throw new Error('inbox-source-changed');
	return { reference: structuredClone(reference), metadata };
}

export function validateInboxSourcePath(path: unknown): path is string {
	if (typeof path !== 'string' || !path || path.includes('\u0000') || path.includes('\\') || path.startsWith('/')) return false;
	if (/^[A-Za-z]:[\\/]/.test(path)) return false;
	return !path.split('/').some((part) => part === '..');
}

/** Return metadata for a saved reference; callers may choose to open it explicitly later. */
export async function inspectInboxSource(
	port: VaultInboxSourcePort,
	reference: VaultFileReference,
): Promise<VaultFileMetadata | { status: 'missing' | 'changed' | 'unavailable' }> {
	try {
		return (await validateInboxSource(port, reference)).metadata;
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		if (reason === 'inbox-source-missing') return { status: 'missing' };
		if (reason === 'inbox-source-changed') return { status: 'changed' };
		return { status: 'unavailable' };
	}
}

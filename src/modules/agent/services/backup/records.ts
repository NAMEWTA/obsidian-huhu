import type { DirectoryPort } from '../../core/space/ports';
import type { DirectoryGrant, PhysicalDirectory, SpaceRecord, VaultBinding } from '../../core/space/model';
import { InvalidSection } from '../../core/backup/transforms';
import { validateInboxDocument } from '../../core/inbox/model';
import { isWorkbenchRecords, type WorkbenchRecords } from '../spaces/records';

export interface RebaseContext {
	/** The vault and device that will own the records. Nothing of the source binding survives. */
	readonly target: VaultBinding;
	/** Read-only physical lookup of a vault-relative directory on this machine. Absent: nothing can be verified. */
	readonly directories?: Pick<DirectoryPort, 'bindVaultDirectory'>;
	/** Import Spaces whose vault directory is missing here as archived instead of reporting them as a problem. */
	readonly archiveMissing: boolean;
	/** Package creation time: fixed per package so repeating an import writes identical bytes. */
	readonly at: number;
}
export interface SpaceNote {
	readonly spaceId: string;
	readonly name: string;
	readonly path: string;
}
export interface RebasedRecords {
	readonly text: string;
	readonly spaces: number;
	readonly sessions: number;
	readonly messages: number;
	/** Vault-relative Space directories that do not exist on this machine. */
	readonly missing: readonly SpaceNote[];
	/** Spaces whose external directory must be authorized again here. */
	readonly reauthorize: readonly SpaceNote[];
}

/**
 * Re-binds Space records to this vault and device (contracts section 6): the source device is provenance only, the
 * physical vault identity is this machine's, vault directories are looked up again, and every external directory
 * grant is kept as a declaration but marked revoked so nothing is authorized by the import. Business ids, layouts,
 * annotations, mailbox messages and acknowledgements are left exactly as they were.
 */
export async function rebaseRecords(text: string, context: RebaseContext): Promise<RebasedRecords> {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new InvalidSection('records:not-json');
	}
	if (!isWorkbenchRecords(raw)) throw new InvalidSection('records:invalid');
	const records = structuredClone(raw);
	const { target } = context;
	const sourceVault = records.vaultId;
	const missing: SpaceNote[] = [];
	const reauthorize: SpaceNote[] = [];
	const spaces: Record<string, SpaceRecord> = {};
	for (const [id, space] of Object.entries(records.spaces).sort(([a], [b]) => a.localeCompare(b))) {
		if (space.directory.kind === 'vault') {
			const relativePath = space.directory.relativePath;
			let bound: PhysicalDirectory | undefined;
			try {
				bound = (await context.directories?.bindVaultDirectory(target, relativePath))?.target;
			} catch {
				bound = undefined;
			}
			if (bound) spaces[id] = { ...space, directory: { kind: 'vault', relativePath, target: bound } };
			else {
				missing.push({ spaceId: id, name: space.name, path: relativePath });
				// Kept fail-closed: the old physical identity cannot match this machine, so the Space cannot start.
				spaces[id] = { ...space, archived: context.archiveMissing ? true : space.archived };
			}
		} else {
			const grant = records.grants[space.directory.grantId];
			reauthorize.push({ spaceId: id, name: space.name, path: grant?.selectedPath ?? '' });
			spaces[id] = space;
		}
	}
	const grants: Record<string, DirectoryGrant> = {};
	for (const [id, grant] of Object.entries(records.grants)) {
		grants[id] = {
			...grant,
			deviceId: target.deviceId,
			vaultRoot: target.root,
			// A grant is a decision of the person on one machine; it is never carried over as active.
			revokedAt: grant.revokedAt ?? context.at,
		};
	}
	const next: WorkbenchRecords = {
		...records,
		vaultId: target.vaultId,
		deviceId: target.deviceId,
		physicalRoot: target.root,
		spaces,
		grants,
	};
	if (sourceVault !== target.vaultId) rebaseVaultReferences(next, sourceVault, target.vaultId);
	if (next.inbox !== undefined && !validateInboxDocument(next.inbox, { vaultId: target.vaultId }))
		throw new InvalidSection('records:inbox-invalid');
	if (!isWorkbenchRecords(next)) throw new InvalidSection('records:rebased-invalid');
	const messages = (next.inbox as { messages?: unknown[] } | undefined)?.messages?.length ?? 0;
	return {
		text: JSON.stringify(next),
		spaces: Object.keys(spaces).length,
		sessions: Object.keys(next.sessions).length,
		messages,
		missing,
		reauthorize,
	};
}

/** Vault-file references name the vault they were made in. They are rebound to this vault; paths stay as written. */
function rebaseVaultReferences(value: unknown, from: string, to: string): void {
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) node.forEach(visit);
		else if (node && typeof node === 'object') {
			const row = node as Record<string, unknown>;
			if (row.kind === 'vault-file' && row.vaultId === from) row.vaultId = to;
			for (const child of Object.values(row)) visit(child);
		}
	};
	visit(value);
}

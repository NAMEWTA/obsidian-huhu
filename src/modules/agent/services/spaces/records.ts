import type { ActivityCompletionHint } from '../../core/workspace/managed-runtime';
import type { TerminationEvidence } from '../../../../shared/native/host';
import { parseTerminationEvidence, terminationConfirmed } from '../../../../shared/native/termination';
import type { AgentId } from '../../core/launch/types';
import { AGENT_CATALOG } from '../../core/launch/catalog';
import type { DirectoryGrant, PhysicalDirectory, SpaceRecord, VaultBinding } from '../../core/space/model';
import { SHELL_CHOICES, type ShellChoice } from '../../core/terminal/settings';
import { emptyWorkspace, type WorkspaceState } from '../../core/workspace/model';
import { validateInboxDocument, type InboxDocument } from '../../core/inbox/model';

export interface SessionAttempt {
	readonly runtimeId: string;
	readonly acceptedAt: number;
	readonly state: 'unconfirmed' | 'not-started' | 'settled';
	readonly stopRequestedAt?: number;
	readonly termination?: TerminationEvidence;
}
/** Why a Session exists for a native conversation: the exact source it was explicitly bound from. */
export interface NativeImportEvidence {
	readonly sourceRef: string;
	readonly accountKey: string;
	readonly deviceId: string;
	readonly importedAt: number;
	/** Written only when this import creates the Session; cleared atomically at its first launch admission. */
	readonly neverStarted?: true;
}
export interface SessionRecord {
	readonly id: string;
	readonly spaceId: string;
	readonly kind: 'shell' | 'agent';
	readonly title: string;
	readonly agentId?: AgentId;
	readonly accountId?: string;
	readonly shell?: ShellChoice;
	readonly nativeSessionId?: string;
	readonly transcriptPath?: string;
	readonly createdAt: number;
	readonly archived?: boolean;
	readonly lastAttempt?: SessionAttempt;
	readonly completionHint?: ActivityCompletionHint;
	/** Present when the Session was created from, or adopted, a native history source by an explicit import. */
	readonly nativeImport?: NativeImportEvidence;
}
/** Provenance adoption cannot supply this proof for an older Session with unknown runtime history. */
export function isNeverStartedImport(record: Pick<SessionRecord, 'nativeImport' | 'lastAttempt'>): boolean {
	return !record.lastAttempt && record.nativeImport?.neverStarted === true;
}
export interface WorkbenchRecords {
	version: 2;
	vaultId: string;
	deviceId: string;
	physicalRoot: PhysicalDirectory;
	spaces: Record<string, SpaceRecord>;
	sessions: Record<string, SessionRecord>;
	grants: Record<string, DirectoryGrant>;
	layouts: Record<string, WorkspaceState>;
	sharedLayout: WorkspaceState;
	/** Durable sourceRef ownership for history rows. Never inferred from cwd or UI selection. */
	historyOwners?: Record<string, string>;
	selectedSpaceId?: string;
	/** Optional so records written before the inbox existed remain readable without migration. */
	inbox?: InboxDocument;
}
export function emptyRecords(vault: VaultBinding): WorkbenchRecords {
	return {
		version: 2,
		vaultId: vault.vaultId,
		deviceId: vault.deviceId,
		physicalRoot: vault.root,
		spaces: {},
		sessions: {},
		grants: {},
		layouts: {},
		sharedLayout: emptyWorkspace(),
		historyOwners: {},
	};
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 4096;
const stamp = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const optionalText = (v: unknown): boolean => v === undefined || (typeof v === 'string' && v.length <= 8192);
const sessionFields = new Set([
	'id',
	'spaceId',
	'kind',
	'title',
	'agentId',
	'accountId',
	'shell',
	'nativeSessionId',
	'transcriptPath',
	'createdAt',
	'archived',
	'lastAttempt',
	'completionHint',
	'nativeImport',
]);
const importFields = new Set(['sourceRef', 'accountKey', 'deviceId', 'importedAt', 'neverStarted']);
function nativeImport(v: unknown): v is NativeImportEvidence {
	return (
		object(v) &&
		text(v.sourceRef) &&
		text(v.accountKey) &&
		text(v.deviceId) &&
		stamp(v.importedAt) &&
		(v.neverStarted === undefined || v.neverStarted === true) &&
		Object.keys(v).every((key) => importFields.has(key))
	);
}
const attemptFields = new Set(['runtimeId', 'acceptedAt', 'state', 'stopRequestedAt', 'termination']);
function attempt(v: unknown): boolean {
	if (
		!object(v) ||
		!text(v.runtimeId) ||
		!stamp(v.acceptedAt) ||
		(v.stopRequestedAt !== undefined && !stamp(v.stopRequestedAt)) ||
		!Object.keys(v).every((key) => attemptFields.has(key))
	)
		return false;
	if (v.state !== 'unconfirmed' && v.state !== 'not-started' && v.state !== 'settled') return false;
	if (v.termination === undefined) return v.state === 'unconfirmed';
	const evidence = parseTerminationEvidence(v.termination);
	if (!evidence) return false;
	if (v.state === 'unconfirmed') return !terminationConfirmed(evidence);
	return (
		terminationConfirmed(evidence) && evidence.root.state === (v.state === 'not-started' ? 'not-started' : 'exited')
	);
}

function physical(v: unknown): v is PhysicalDirectory {
	return (
		object(v) && text(v.canonicalPath) && text(v.dev) && /^\d+$/.test(v.dev) && text(v.ino) && /^\d+$/.test(v.ino)
	);
}
function workspace(v: unknown): v is WorkspaceState {
	return object(v) && v.version === 1 && object(v.tabs) && Array.isArray(v.groups) && Array.isArray(v.closedTabs);
}
function rows<T>(v: unknown, valid: (row: Record<string, unknown>, key: string) => boolean): v is Record<string, T> {
	return (
		object(v) &&
		Object.keys(v).length <= 10000 &&
		Object.entries(v).every(([id, row]) => text(id) && object(row) && valid(row, id))
	);
}
export function isWorkbenchRecords(v: unknown): v is WorkbenchRecords {
	if (!object(v) || v.version !== 2 || !text(v.vaultId) || !text(v.deviceId) || !physical(v.physicalRoot))
		return false;
	if (
		!rows<SpaceRecord>(
			v.spaces,
			(s, id) =>
				s.id === id &&
				text(s.name) &&
				s.name.length <= 200 &&
				typeof s.archived === 'boolean' &&
				stamp(s.createdAt) &&
				stamp(s.updatedAt) &&
				object(s.directory) &&
				(s.directory.kind === 'vault'
					? typeof s.directory.relativePath === 'string' && physical(s.directory.target)
					: s.directory.kind === 'external' && text(s.directory.grantId)),
		)
	)
		return false;
	const spaces = v.spaces;
	if (
		!rows<DirectoryGrant>(
			v.grants,
			(g, id) =>
				g.id === id &&
				text(g.selectedPath) &&
				physical(g.target) &&
				physical(g.vaultRoot) &&
				text(g.deviceId) &&
				stamp(g.createdAt) &&
				(g.revokedAt === undefined || stamp(g.revokedAt)),
		)
	)
		return false;
	if (
		!rows<SessionRecord>(
			v.sessions,
			(s, id) =>
				s.id === id &&
				text(s.spaceId) &&
				Object.hasOwn(spaces, s.spaceId) &&
				(s.kind === 'shell' || s.kind === 'agent') &&
				text(s.title) &&
				s.title.length <= 200 &&
				stamp(s.createdAt) &&
				(s.agentId === undefined
					? s.kind === 'shell'
					: AGENT_CATALOG.some((agent) => agent.id === s.agentId)) &&
				(s.shell === undefined || SHELL_CHOICES.some((shell) => shell === s.shell)) &&
				optionalText(s.accountId) &&
				optionalText(s.nativeSessionId) &&
				optionalText(s.transcriptPath) &&
				(s.archived === undefined || typeof s.archived === 'boolean') &&
				(s.lastAttempt === undefined || attempt(s.lastAttempt)) &&
				(s.completionHint === undefined || validActivityHint(s.completionHint)) &&
				(s.nativeImport === undefined || (nativeImport(s.nativeImport) && (!s.nativeImport.neverStarted || s.lastAttempt === undefined))) &&
				Object.keys(s).every((key) => sessionFields.has(key)),
		)
	)
		return false;
	if (
		!object(v.layouts) ||
		!Object.entries(v.layouts).every(([id, layout]) => Object.hasOwn(spaces, id) && workspace(layout))
	)
		return false;
	if (v.inbox !== undefined && !validateInboxDocument(v.inbox, { vaultId: v.vaultId })) return false;
	if (
		v.historyOwners !== undefined &&
		(!object(v.historyOwners) ||
			Object.keys(v.historyOwners).length > 10000 ||
			!Object.entries(v.historyOwners).every(
				([sourceRef, spaceId]) => text(sourceRef) && text(spaceId) && Object.hasOwn(spaces, spaceId),
			))
	)
		return false;
	return (
		workspace(v.sharedLayout) &&
		(v.selectedSpaceId === undefined ||
			(typeof v.selectedSpaceId === 'string' && Object.hasOwn(v.spaces, v.selectedSpaceId)))
	);
}

export function validActivityHint(value: unknown): value is ActivityCompletionHint {
	if (
		!object(value) ||
		!Object.keys(value).every((k) => ['runtimeId', 'activitySequence', 'observedAt', 'seenThrough'].includes(k))
	)
		return false;
	return (
		typeof value.runtimeId === 'string' &&
		value.runtimeId.length > 0 &&
		value.runtimeId.length <= 256 &&
		new TextEncoder().encode(value.runtimeId).length <= 256 &&
		typeof value.activitySequence === 'number' &&
		Number.isSafeInteger(value.activitySequence) &&
		value.activitySequence > 0 &&
		typeof value.seenThrough === 'number' &&
		Number.isSafeInteger(value.seenThrough) &&
		value.seenThrough >= 0 &&
		value.seenThrough <= value.activitySequence &&
		typeof value.observedAt === 'number' &&
		Number.isFinite(value.observedAt) &&
		value.observedAt >= 0
	);
}

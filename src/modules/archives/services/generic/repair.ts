import type { HealthRepairOwner, HealthRepairSelection, HealthRepairProposal, HealthRepairReceipt } from '../../../health/api';
import { BELONGING_TYPE_ID } from '../../api';
import { parseBelonging, BELONGING_FIELDS } from '../../core/belongings/lifecycle';
import { ArchiveError, type EntityRecord, type FieldDefinition } from '../../core/schema/model';
import { copy, digest, requiredId, object, equal, canonical, identifier } from '../../core/schema/value';
import { patchValues, frontmatter, decodeEntity } from '../../core/generic/markdown';
import { backupPath, migrationPath, isDiscoveryPath, underRoot, ARCHIVE_PATHS } from '../../core/generic/paths';
import { decodeOperation, encodeOperation, type ArchiveOperation } from '../../core/generic/operations';
import { RecoveryCommands } from './recovery';
import type { ArchiveRuntime, ArchiveWriteContext } from './runtime';

type Location = { path: string; id?: string; expectedHash?: string; generation?: number };
type Proposal = { public: HealthRepairProposal; context: ArchiveWriteContext; path?: string; before?: string; after?: string; ownerId?: string; revisionId?: string; expires: number };
/** Owner-only validation and transaction admission. Reuses the existing single-record
 * recovery journal (same-schema schema-upgrade), not prepareUpgrade or generic save.
 * No history rows or schema are changed; originals and the journal remain recoverable.
 */
export class ArchiveRepairService implements HealthRepairOwner {
	private readonly proposals = new Map<string, Proposal>();
	constructor(private readonly runtime: ArchiveRuntime, private readonly resolve: (reference: string) => Location | undefined, private readonly generation?: () => number) {}
	dispose(): void { this.proposals.clear(); }
	async fingerprint(context = this.runtime.context()): Promise<string> {
		const entries: Array<[string, string]> = [];
		for (const file of this.runtime.files.getMarkdownFiles().filter(file => isDiscoveryPath(context.root, file.path)).sort((a, b) => a.path.localeCompare(b.path)))
			entries.push([file.path, await digest(await this.runtime.read(file.path, context, true))]);
		return digest(JSON.stringify(entries));
	}
	preview(selection: HealthRepairSelection, signal?: AbortSignal): Promise<HealthRepairProposal> {
		return this.runtime.command(selection, async (input, context) => {
			for (const [id, plan] of this.proposals) if (Date.now() >= plan.expires) this.proposals.delete(id);
			if (this.proposals.size >= 100) throw new ArchiveError('repair-budget');
			const location = input.reference ? this.resolve(input.reference) : undefined;
			let plan: Proposal;
			if (input.kind === 'rebuild-index' && input.providerId === 'archives.integrity') {
				if (location?.generation !== undefined && location.generation !== this.generation?.()) throw new ArchiveError('write-conflict');
				if (input.reference && !location) throw new ArchiveError('repair-reference-expired');
				const expectedHash = await this.fingerprint(context);
				if (location?.expectedHash && location.expectedHash !== expectedHash) throw new ArchiveError('write-conflict');
				plan = { public: { id: crypto.randomUUID(), kind: input.kind, expectedHash, affected: this.runtime.files.getMarkdownFiles().filter(file => isDiscoveryPath(context.root, file.path)).length }, context: { epoch: context.epoch, root: context.root }, expires: Date.now() + 300000 };
			} else if (input.kind === 'belonging-projection' && input.providerId === 'archives.belongings' && location?.id) {
				const { entity, raw } = await this.runtime.entity(location.id, context);
				if (entity.typeId !== BELONGING_TYPE_ID || entity.path !== location.path) throw new ArchiveError('invalid-repair');
				if (!location.expectedHash || entity.contentHash !== location.expectedHash) throw new ArchiveError('write-conflict');
				const schema = await this.runtime.verifySchema(entity.schemaRevisionId, context);
				if (schema.definition.kind !== 'type' || schema.definition.id !== BELONGING_TYPE_ID) throw new ArchiveError('invalid-repair');
				const after = projectionRepair(entity, raw, schema.definition.fields);
				if (after.length > 8 * 1024 * 1024) throw new ArchiveError('repair-budget');
				if (after === raw) throw new ArchiveError('repair-not-needed');
				plan = { public: { id: crypto.randomUUID(), kind: input.kind, expectedHash: entity.contentHash, affected: 1 }, context: { epoch: context.epoch, root: context.root },
					path: entity.path, before: raw, after, ownerId: entity.id, revisionId: entity.schemaRevisionId, expires: Date.now() + 300000 };
			} else throw new ArchiveError('unsupported-repair');
			this.runtime.assert(context, true);
			this.proposals.set(plan.public.id, plan);
			return copy(plan.public);
		}, signal);
	}
	async commit(input: { proposalId: string; expectedHash: string; operationId: string }, signal?: AbortSignal): Promise<HealthRepairReceipt> {
		input = { ...input };
		const plan = this.proposals.get(input.proposalId);
		if (!plan) throw new ArchiveError('repair-plan-expired');
		const receipt: HealthRepairReceipt = { operationId: input.operationId, kind: plan.public.kind, status: 'failed', committed: false, rechecked: false };
		let prepared = false, observedCommit = false, attempted = false;
		const unsubscribe = this.runtime.subscribeCommitted(
			(path, raw) => { if (path === plan.path && raw === plan.after) observedCommit = true; },
			(path, raw) => { if (path === plan.path && raw === plan.after) attempted = true; },
		);
		try {
			await this.runtime.command(input, async (input, context) => {
				requiredId(input.operationId);
				this.runtime.assert(plan.context, true);
				if (Date.now() >= plan.expires || plan.public.expectedHash !== input.expectedHash) throw new ArchiveError('write-conflict');
				if (plan.public.kind === 'rebuild-index') {
					if (await this.fingerprint(context) !== input.expectedHash) throw new ArchiveError('write-conflict');
					await this.runtime.rebuildDerivedIndex(signal);
					if (await this.fingerprint(this.runtime.context(signal)) !== input.expectedHash) throw new ArchiveError('write-conflict');
					return;
				}
				const current = await this.runtime.entity(plan.ownerId!, context);
				if (current.raw !== plan.before || current.entity.contentHash !== input.expectedHash) throw new ArchiveError('write-conflict');
				if (this.runtime.index.operations().some(op => op.ownerId === plan.ownerId && !['committed', 'rolled-back'].includes(op.state))) throw new ArchiveError('pending-migration');
				const collectionIds = this.runtime.index.collectionIds();
				if (collectionIds.length !== 1) throw new ArchiveError('collection-conflict');
				const operation: ArchiveOperation & { healthRepair: 'belonging-projection' } = { healthRepair: 'belonging-projection', id: input.operationId, kind: 'schema-upgrade', collectionId: collectionIds[0]!, ownerId: plan.ownerId!, schemaRevisionId: plan.revisionId!, state: 'prepared', createdAt: Date.now(), verified: [],
					owner: { path: plan.path!, beforeHash: input.expectedHash, afterHash: await digest(plan.after!), after: plan.after!, backupPath: backupPath(context.root, input.operationId, plan.ownerId!) } };
				await this.runtime.writeExact(repairRegistrationPath(context.root, input.operationId), undefined, JSON.stringify(registrationFor(operation, context.root)), context);
				await this.runtime.writeExact(migrationPath(context.root, input.operationId), undefined, encodeOperation(operation), context);
				prepared = true;
				// Recovery.execute verifies and writes the backup before touching the owner, with atomic CAS.
			}, signal);
			if (plan.public.kind === 'rebuild-index') return { ...receipt, committed: true, rechecked: true, status: 'verified' };
			const result = await new RecoveryCommands(this.runtime).execute({ operationId: input.operationId }, signal);
			observedCommit = true;
			const { entity } = await this.runtime.entity(result.operation.ownerId, this.runtime.context(signal));
			parseBelonging(entity);
			return { ...receipt, committed: true, rechecked: true, status: 'verified', recoveryId: input.operationId };
		} catch (error) {
			// A crash after atomic owner commit is not an uncommitted item, even if journal finalization failed.
			let committed: HealthRepairReceipt['committed'] = observedCommit;
			if (!observedCommit && attempted && plan.path) {
				try {
					const file = this.runtime.files.getFileByPath(plan.path);
					const raw = file ? await this.runtime.files.read(file) : undefined;
					committed = raw === plan.after ? true : raw === plan.before ? false : 'unknown';
				} catch { committed = 'unknown'; }
			}
			return { ...receipt, committed, status: signal?.aborted ? 'cancelled' : error instanceof Error && ['write-conflict', 'source-changed', 'source-changed-before-backup'].includes(error.message) ? 'conflict' : 'failed', ...(prepared ? { recoveryId: input.operationId } : {}) };
		} finally { unsubscribe(); this.proposals.delete(input.proposalId); }
	}
	async recover(input: { recoveryId: string; action: 'resume' | 'rollback' }, signal?: AbortSignal): Promise<HealthRepairReceipt> {
		input = { ...input };
		requiredId(input.recoveryId);
		if (input.action !== 'resume' && input.action !== 'rollback') throw new ArchiveError('invalid-repair');
		const context = this.runtime.context(signal);
		await this.runtime.ensureLoaded();
		if (!await readRepairRegistration(this.runtime, input.recoveryId, context)) throw new ArchiveError('unregistered-repair');
		const operation = decodeOperation(await this.runtime.read(migrationPath(context.root, input.recoveryId), context, true));
		const revision = await this.runtime.verifySchema(operation.schemaRevisionId, context);
		if (operation.kind !== 'schema-upgrade' || revision.definition.id !== BELONGING_TYPE_ID) throw new ArchiveError('invalid-repair');
		const recovery = new RecoveryCommands(this.runtime);
		const result = input.action === 'resume' ? await recovery.execute({ operationId: input.recoveryId }, signal) : await recovery.rollback({ operationId: input.recoveryId }, signal);
		if (input.action === 'resume') parseBelonging((await this.runtime.entity(result.operation.ownerId, this.runtime.context(signal))).entity);
		return { operationId: input.recoveryId, recoveryId: input.recoveryId, kind: 'belonging-projection', committed: true, rechecked: true, status: input.action === 'resume' ? 'verified' : 'rolled-back' };
	}
}

/** Separate owner record: journals can neither select nor rewrite their repair authority. */
export function repairRegistrationPath(root: string, operationId: string): string {
	requiredId(operationId);
	return `${root}/${ARCHIVE_PATHS.migrations}/${operationId}/health-repair.json`;
}
export function isRepairRegistrationPath(root: string, path: string): boolean {
	const prefix = `${root}/${ARCHIVE_PATHS.migrations}/`;
	if (!path.startsWith(prefix)) return false;
	const parts = path.slice(prefix.length).split('/');
	return parts.length === 2 && identifier(parts[0]) && parts[1] === 'health-repair.json';
}
function registrationFor(operation: ArchiveOperation, root: string) {
	return { version: 1, kind: 'belonging-projection', root, operationId: operation.id, collectionId: operation.collectionId,
		ownerId: operation.ownerId, schemaRevisionId: operation.schemaRevisionId, path: operation.owner.path,
		beforeHash: operation.owner.beforeHash, afterHash: operation.owner.afterHash, backupPath: operation.owner.backupPath };
}
async function readRepairRegistration(runtime: ArchiveRuntime, id: string, context: ArchiveWriteContext): Promise<Record<string, unknown> | undefined> {
	const path = repairRegistrationPath(context.root, id);
	if (!runtime.files.getFileByPath(path)) return undefined;
	const raw = await runtime.read(path, context, true);
	if (raw.length > 16 * 1024) throw new ArchiveError('invalid-repair-registration');
	let value: unknown;
	try { value = JSON.parse(raw); } catch { throw new ArchiveError('invalid-repair-registration'); }
	if (!object(value)) throw new ArchiveError('invalid-repair-registration');
	return value;
}

/** Recover by owner registration and actual differences, never by journal classification.
 * Runtime binds the regenerated bytes to this command's atomic process callback.
 */
export async function healthRepairProof(runtime: ArchiveRuntime, raw: string, context: ArchiveWriteContext, journalPath: string): Promise<{ path: string; before: string; after: string } | undefined> {
	const id = journalPath.slice(journalPath.lastIndexOf('/') + 1, -3);
	const registration = await readRepairRegistration(runtime, id, context);
	const data = frontmatter(raw);
	if (!object(data.operation)) {
		if (registration) throw new ArchiveError('invalid-repair');
		return undefined;
	}
	const operation = decodeOperation(raw);
	if (journalPath !== migrationPath(context.root, operation.id) ||
		!underRoot(context.root, operation.owner.path) || operation.owner.path.startsWith(`${context.root}/${ARCHIVE_PATHS.migrations}/`) ||
		operation.owner.backupPath !== backupPath(context.root, operation.id, operation.ownerId)) throw new ArchiveError('invalid-repair');
	if (registration && canonical(registration) !== canonical(registrationFor(operation, context.root))) throw new ArchiveError('invalid-repair-registration');
	if (!registration && data.operation.healthRepair !== undefined) throw new ArchiveError('unregistered-repair');
	const source = runtime.files.getFileByPath(operation.owner.backupPath) ? operation.owner.backupPath : operation.owner.path;
	const before = await runtime.read(source, context, true), beforeData = frontmatter(before);
	if (!registration && beforeData['huhu-archive-type-id'] !== BELONGING_TYPE_ID) return undefined;
	if (await digest(before) !== operation.owner.beforeHash) throw new ArchiveError('backup-conflict');
	const revisionId = beforeData['huhu-schema-revision'];
	if (typeof revisionId !== 'string') throw new ArchiveError('invalid-repair');
	const previous = await runtime.verifySchema(revisionId, context);
	const entity = decodeEntity(before, operation.owner.path, operation.owner.beforeHash, 0, previous);
	if (entity.typeId !== BELONGING_TYPE_ID || entity.id !== operation.ownerId) throw new ArchiveError('invalid-repair');
	const schema = await runtime.verifySchema(operation.schemaRevisionId, context);
	if (schema.definition.kind !== 'type' || schema.definition.id !== BELONGING_TYPE_ID) throw new ArchiveError('invalid-repair');
	if (!registration) {
		// Legitimate generic upgrades may edit ordinary fields and change schema, but never lifecycle authority.
		const next = decodeEntity(operation.owner.after, operation.owner.path, operation.owner.afterHash, 0, schema);
		for (const field of BELONGING_FIELDS) if (!equal(entity.values[field], next.values[field])) throw new ArchiveError('belonging-transition-required');
		parseBelonging(next);
		return { path: operation.owner.path, before, after: operation.owner.after };
	}
	if (operation.kind !== 'schema-upgrade' || entity.schemaRevisionId !== operation.schemaRevisionId) throw new ArchiveError('invalid-repair');
	const after = projectionRepair(entity, before, schema.definition.fields);
	if (after !== operation.owner.after || await digest(after) !== operation.owner.afterHash) throw new ArchiveError('invalid-repair');
	return { path: operation.owner.path, before, after };
}

function projectionRepair(entity: EntityRecord, raw: string, fields: readonly FieldDefinition[]): string {
	const events = entity.values.events;
	if (!Array.isArray(events)) throw new ArchiveError('invalid-belonging-history');
	const last: unknown = events.at(-1);
	if (last !== undefined && (!object(last) || !object(last.values))) throw new ArchiveError('invalid-belonging-history');
	const values = last === undefined ? {} : (last as { values: Record<string, unknown> }).values;
	const projection = { status: values.status ?? 'using', exitDate: values.exitDate ?? '', sale: values.sale ?? null };
	parseBelonging({ ...entity, values: { ...copy(entity.values), ...projection } });
	return patchValues(raw, fields, projection, ['status', 'exitDate', 'sale']);
}

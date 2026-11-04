import type { PrepareUpgrade, RecoveryResult } from '../../core/schema/commands';
export type { PrepareUpgrade, RecoveryResult } from '../../core/schema/commands';
import { ArchiveError } from '../../core/schema/model';
import { digest, identifier, requiredId, own } from '../../core/schema/value';
import { validateValues } from '../../core/schema/fields';
import { backupPath, migrationPath, underRoot } from '../../core/generic/paths';
import {
	decodeEntity,
	decodeRelation,
	encodeEntity,
	encodeRelation,
	frontmatter,
	patchProperties,
} from '../../core/generic/markdown';
import {
	decodeOperation,
	encodeOperation,
	type ArchiveOperation,
	type OperationWrite,
} from '../../core/generic/operations';
import { validateRelation } from '../../core/generic/relations';
import type { ArchiveRuntime, ArchiveWriteContext } from './runtime';

export class RecoveryCommands {
	constructor(readonly runtime: ArchiveRuntime) {}
	prepareUpgrade(input: PrepareUpgrade, signal?: AbortSignal): Promise<ArchiveOperation> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				requiredId(input.id);
				requiredId(input.revisionId);
				const existing = await this.existing(input.operationId, context);
				if (existing) {
					if (
						existing.ownerId !== input.id ||
						existing.owner.beforeHash !== input.expectedHash ||
						existing.schemaRevisionId !== input.revisionId
					)
						throw new ArchiveError('command-id-conflict');
					return existing;
				}
				this.noPending(input.id);
				const entity = this.runtime.index.entity(input.id),
					relation = entity ? undefined : this.runtime.index.relation(input.id);
				if (!entity && !relation) throw new ArchiveError('missing-or-duplicate-id');
				const record = (entity ?? relation)!,
					raw = await this.runtime.read(record.path, context, true);
				if ((await digest(raw)) !== input.expectedHash || record.contentHash !== input.expectedHash)
					throw new ArchiveError('write-conflict');
				const revision = await this.runtime.verifySchema(input.revisionId, context),
					previous = await this.runtime.verifySchema(record.schemaRevisionId, context);
				const type = revision.definition,
					old = previous.definition,
					typeId = entity?.typeId ?? relation!.relationTypeId;
				if (
					(type.kind !== 'type' && type.kind !== 'relation-type') ||
					old.kind !== type.kind ||
					type.id !== typeId ||
					this.runtime.index.definition(typeId)?.revisionId !== revision.revisionId
				)
					throw new ArchiveError('missing-or-forked-definition');
				if (old.kind !== 'type' && old.kind !== 'relation-type') throw new ArchiveError('missing-definition');
				for (const key of Object.keys(record.values))
					if (!own(input.values, key)) throw new ArchiveError('conversion-required', key);
				validateValues(type.fields, input.values, record.lifecycle === 'active', record.values);
				const properties = frontmatter(raw);
				for (const field of type.fields)
					if (
						field.kind !== 'markdown' &&
						own(properties, field.storageKey) &&
						!old.fields.some((old) => old.kind !== 'markdown' && old.storageKey === field.storageKey)
					)
						throw new ArchiveError('unknown-property-conflict', field.storageKey);
				let after = raw;
				for (const field of old.fields) {
					const next = type.fields.find((next) => next.fieldId === field.fieldId);
					if (next && field.storageKey !== next.storageKey && field.kind !== 'markdown')
						after = patchProperties(after, { [field.storageKey]: undefined });
				}
				if (entity && type.kind === 'type')
					after = encodeEntity(
						{ ...entity, schemaRevisionId: revision.revisionId, values: input.values },
						type,
						after,
						type.fields.map((field) => field.fieldId),
					);
				else if (relation && type.kind === 'relation-type') {
					const next = { ...relation, schemaRevisionId: revision.revisionId, values: input.values };
					validateRelation(
						next,
						type,
						{
							entity: (id) => this.runtime.index.entity(id),
							relations: (id) => this.runtime.index.allRelations(id),
						},
						relation,
					);
					after = encodeRelation(
						next,
						type,
						after,
						type.fields.map((field) => field.fieldId),
					);
				} else throw new ArchiveError('definition-kind-conflict');
				const collectionId = await this.runtime.bootstrap(context);
				const operation: ArchiveOperation = {
					id: input.operationId,
					kind: entity ? 'schema-upgrade' : 'relation-upgrade',
					collectionId,
					ownerId: record.id,
					schemaRevisionId: input.revisionId,
					state: 'prepared',
					createdAt: Date.now(),
					owner: {
						path: record.path,
						beforeHash: input.expectedHash,
						afterHash: await digest(after),
						after,
						backupPath: backupPath(this.runtime.root, input.operationId, record.id),
					},
					verified: [],
				};
				await this.runtime.writeExact(
					migrationPath(this.runtime.root, operation.id),
					undefined,
					encodeOperation(operation),
					context,
				);
				await this.ensureBackup(operation, context, raw);
				return operation;
			},
			signal,
		);
	}
	private noPending(id: string): void {
		if (
			this.runtime.index
				.operations()
				.some(
					(operation) => operation.ownerId === id && !['committed', 'rolled-back'].includes(operation.state),
				)
		)
			throw new ArchiveError('pending-migration');
	}
	private async existing(id: string, context: ArchiveWriteContext): Promise<ArchiveOperation | undefined> {
		const path = migrationPath(this.runtime.root, id);
		return this.runtime.files.getFileByPath(path)
			? decodeOperation(await this.runtime.read(path, context, true))
			: undefined;
	}
	private async validatePlan(operation: ArchiveOperation, context: ArchiveWriteContext): Promise<void> {
		this.runtime.assert(context, true);
		if (
			this.runtime.index.collectionIds().length !== 1 ||
			this.runtime.index.collectionIds()[0] !== operation.collectionId
		)
			throw new ArchiveError('collection-conflict');
		if (
			!underRoot(context.root, operation.owner.path) ||
			operation.owner.backupPath !== backupPath(context.root, operation.id, operation.ownerId) ||
			!identifier(operation.ownerId)
		)
			throw new ArchiveError('invalid-operation');
		if ((await digest(operation.owner.after)) !== operation.owner.afterHash || !underRoot(context.root, operation.owner.path))
			throw new ArchiveError('invalid-operation');
		const revision = await this.runtime.verifySchema(operation.schemaRevisionId, context);
		const owner =
			operation.kind === 'relation-upgrade'
				? decodeRelation(operation.owner.after, operation.owner.path, operation.owner.afterHash, 0, revision)
				: decodeEntity(operation.owner.after, operation.owner.path, operation.owner.afterHash, 0, revision);
		if (owner.id !== operation.ownerId || owner.schemaRevisionId !== operation.schemaRevisionId)
			throw new ArchiveError('invalid-operation');
	}
	private async update(
		operation: ArchiveOperation,
		previousRaw: string,
		context: ArchiveWriteContext,
	): Promise<string> {
		const raw = encodeOperation(operation);
		await this.runtime.writeExact(migrationPath(context.root, operation.id), previousRaw, raw, context);
		return raw;
	}
	private async ensureBackup(
		operation: ArchiveOperation,
		context: ArchiveWriteContext,
		captured?: string,
	): Promise<string> {
		const path = operation.owner.backupPath!;
		if (this.runtime.files.getFileByPath(path)) {
			const raw = await this.runtime.read(path, context);
			if ((await digest(raw)) !== operation.owner.beforeHash) throw new ArchiveError('backup-conflict');
			return raw;
		}
		const raw = captured ?? (await this.runtime.read(operation.owner.path, context, true));
		if ((await digest(raw)) !== operation.owner.beforeHash) throw new ArchiveError('source-changed-before-backup');
		await this.runtime.writeExact(path, undefined, raw, context);
		return raw;
	}
	private async observed(write: OperationWrite, context: ArchiveWriteContext): Promise<string | undefined> {
		if (!this.runtime.files.getFileByPath(write.path)) return undefined;
		return this.runtime.read(write.path, context, true);
	}
	execute(input: { operationId: string }, signal?: AbortSignal): Promise<RecoveryResult> {
		return this.runtime.command(
			input,
			async ({ operationId }, context) => {
				requiredId(operationId);
				const path = migrationPath(context.root, operationId);
				let planRaw = await this.runtime.read(path, context, true),
					operation = decodeOperation(planRaw);
				await this.validatePlan(operation, context);
				if (operation.state === 'rolled-back' || operation.state === 'rolling-back')
					throw new ArchiveError('operation-rolled-back');
				if (operation.state === 'committed') {
					// Retrying an already committed upgrade never overwrites later user edits.
					const current = await this.runtime.read(operation.owner.path, context),
						data = frontmatter(current);
					if (data['huhu-id'] !== operation.ownerId) throw new ArchiveError('operation-conflict');
					return {
						operation,
						receipt: this.runtime.receipt(
							operation.id,
							operation.ownerId,
							operation.owner.path,
							await digest(current),
						),
					};
				}
				await this.ensureBackup(operation, context);
				const observedOwner = await this.observed(operation.owner, context);
				if (
					observedOwner === undefined ||
					((await digest(observedOwner)) !== operation.owner.beforeHash &&
						observedOwner !== operation.owner.after)
				)
					throw new ArchiveError('source-changed');
				operation = { ...operation, state: 'staging' };
				planRaw = await this.update(operation, planRaw, context);
				if (operation.kind === 'relation-upgrade') {
					const schema = await this.runtime.verifySchema(operation.schemaRevisionId, context);
					if (schema.definition.kind !== 'relation-type') throw new ArchiveError('missing-definition');
					const next = decodeRelation(
						operation.owner.after,
						operation.owner.path,
						operation.owner.afterHash,
						0,
						schema,
					);
					if (next.lifecycle === 'active')
						for (const id of [next.sourceId, next.targetId, ...Object.values(next.contextRefs)])
							await this.runtime.entity(id, context, false);
					validateRelation(
						next,
						schema.definition,
						{
							entity: (id) => this.runtime.index.entity(id),
							relations: (id) => this.runtime.index.allRelations(id),
						},
						next,
					);
				}
				operation.state = 'committing';
				planRaw = await this.update(operation, planRaw, context);
				const before = await this.observed(operation.owner, context);
				if (before === undefined) throw new ArchiveError('missing-owner');
				if (before !== operation.owner.after) {
					if ((await digest(before)) !== operation.owner.beforeHash) throw new ArchiveError('source-changed');
					await this.runtime.writeExact(operation.owner.path, before, operation.owner.after, context);
				}
				if ((await this.runtime.read(operation.owner.path, context)) !== operation.owner.after)
					throw new ArchiveError('owner-verification-failed');
				if (!operation.verified.includes(operation.owner.path)) operation.verified.push(operation.owner.path);
				operation.state = 'committed';
				await this.update(operation, planRaw, context);
				return {
					operation,
					receipt: this.runtime.receipt(
						operation.id,
						operation.ownerId,
						operation.owner.path,
						operation.owner.afterHash,
					),
				};
			},
			signal,
		);
	}
	rollback(input: { operationId: string }, signal?: AbortSignal): Promise<RecoveryResult> {
		return this.runtime.command(
			input,
			async ({ operationId }, context) => {
				requiredId(operationId);
				const path = migrationPath(context.root, operationId);
				let planRaw = await this.runtime.read(path, context, true);
				const operation = decodeOperation(planRaw);
				await this.validatePlan(operation, context);
				if (operation.state === 'rolled-back')
					return {
						operation,
						receipt: this.runtime.receipt(
							operation.id,
							operation.ownerId,
							operation.owner.path,
							operation.owner.beforeHash,
						),
					};
				const ownerRaw = await this.observed(operation.owner, context);
				const afterCommit =
					operation.state === 'committed' ||
					operation.verified.includes(operation.owner.path) ||
					ownerRaw === operation.owner.after;
				if (ownerRaw === undefined) throw new ArchiveError('rollback-owner-missing');
				if (
					afterCommit &&
					ownerRaw !== operation.owner.after &&
					(await digest(ownerRaw)) !== operation.owner.beforeHash
				)
					throw new ArchiveError('rollback-conflict', operation.owner.path);
				const backups = this.runtime.files.getFileByPath(operation.owner.backupPath!)
					? await this.runtime.read(operation.owner.backupPath!, context)
					: undefined;
				if (afterCommit && (!backups || (await digest(backups)) !== operation.owner.beforeHash))
					throw new ArchiveError('backup-conflict');
				operation.state = 'rolling-back';
				planRaw = await this.update(operation, planRaw, context);
				const latest = await this.observed(operation.owner, context);
				if (latest === undefined) throw new ArchiveError('rollback-owner-missing');
				if (afterCommit && latest !== backups) {
					if (latest !== operation.owner.after)
						throw new ArchiveError('rollback-conflict', operation.owner.path);
					await this.runtime.writeExact(operation.owner.path, latest, backups!, context);
				}
				operation.state = 'rolled-back';
				await this.update(operation, planRaw, context);
				return {
					operation,
					receipt: this.runtime.receipt(
						operation.id,
						operation.ownerId,
						operation.owner.path,
						await digest(afterCommit ? backups! : latest),
					),
				};
			},
			signal,
		);
	}
}

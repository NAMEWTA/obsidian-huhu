import type {
	MigrationPreflightEntry,
	MigrationPreflight,
	PrepareMigration,
	PrepareUpgrade,
	RecoveryResult,
} from '../../core/schema/commands';
export type {
	MigrationPreflightEntry,
	MigrationPreflight,
	PrepareMigration,
	PrepareUpgrade,
	RecoveryResult,
} from '../../core/schema/commands';
import { ArchiveError, type EntityRecord, type RelationRecord } from '../../core/schema/model';
import { copy, digest, equal, identifier, requiredId, own } from '../../core/schema/value';
import { validateValues } from '../../core/schema/fields';
import { projectLegacy } from '../../core/generic/legacy';
import { parseRecord } from '../../core/persist/markdown';
import { backupPath, migrationPath, relationPath, underRoot } from '../../core/generic/paths';
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
import { readReminders } from '../../core/reminders';
import type { ArchiveRuntime, ArchiveWriteContext } from './runtime';

export class RecoveryCommands {
	constructor(readonly runtime: ArchiveRuntime) {}
	async preflight(): Promise<MigrationPreflight> {
		await this.runtime.ensureLoaded();
		await this.runtime.flushEvents();
		const context = this.runtime.context(),
			entries: MigrationPreflightEntry[] = [];
		const diagnostics = this.runtime.index.diagnostics();
		let v2 = 0;
		for (const entity of this.runtime.index.allEntities()) {
			if (entity.format === 2) {
				v2++;
				continue;
			}
			const entry: MigrationPreflightEntry = {
				id: entity.id,
				path: entity.path,
				hash: entity.contentHash,
				rows: 0,
				manualRows: 0,
				reminders: 0,
				diagnostics: diagnostics.filter((item) => item.path === entity.path || item.id === entity.id),
			};
			try {
				const raw = await this.runtime.read(entity.path, context, true),
					legacy = parseRecord(raw, entity.path);
				entry.hash = await digest(raw);
				if (!legacy || legacy.id !== entity.id || legacy.errors.length)
					throw new ArchiveError('invalid-legacy');
				const projection = projectLegacy(legacy, {
					byId: (id) => this.runtime.index.entitiesById(id),
					byPath: (path) => this.runtime.index.entity(path),
				});
				entry.rows = legacy.employments.length + legacy.relations.length;
				entry.manualRows = [...legacy.employments, ...legacy.relations].filter((row) =>
					row.id.startsWith('manual-'),
				).length;
				entry.reminders = readReminders(raw).length;
				entry.diagnostics.push(...projection.diagnostics);
				if (projection.relations.length !== entry.rows) throw new ArchiveError('unresolved-rows');
				const schema = this.runtime.index.schema(entity.schemaRevisionId);
				if (schema?.definition.kind !== 'type') throw new ArchiveError('missing-definition');
				validateValues(schema.definition.fields, entity.values, true, entity.values);
			} catch (error) {
				entry.diagnostics.push({
					code: 'invalid-value',
					id: entity.id,
					path: entity.path,
					detail: error instanceof Error ? error.message : String(error),
				});
			}
			entries.push(entry);
		}
		return {
			entries,
			diagnostics,
			legacy: entries.length,
			v2,
			relations: entries.reduce((sum, entry) => sum + entry.rows, 0),
			manualRows: entries.reduce((sum, entry) => sum + entry.manualRows, 0),
			blocked: entries.filter((entry) => entry.diagnostics.length).length,
			entityRevision: this.runtime.index.entityRevision,
			schemaRevision: this.runtime.index.schemaRevision,
		};
	}
	prepareMigration(input: PrepareMigration, signal?: AbortSignal): Promise<ArchiveOperation> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				requiredId(input.id);
				const existing = await this.existing(input.operationId, context);
				if (existing) {
					if (
						existing.ownerId !== input.id ||
						existing.owner.beforeHash !== input.expectedHash ||
						existing.kind !== 'migration'
					)
						throw new ArchiveError('command-id-conflict');
					return existing;
				}
				this.noPending(input.id);
				const { entity, raw } = await this.runtime.entity(input.id, context);
				if (entity.format !== 1) throw new ArchiveError('not-legacy');
				if ((await digest(raw)) !== input.expectedHash) throw new ArchiveError('write-conflict');
				const legacy = parseRecord(raw, entity.path);
				if (!legacy || legacy.errors.length) throw new ArchiveError('invalid-legacy');
				const projection = projectLegacy(legacy, {
					byId: (id) => this.runtime.index.entitiesById(id),
					byPath: (path) => this.runtime.index.entity(path),
				});
				if (
					projection.diagnostics.length ||
					projection.relations.length !== legacy.employments.length + legacy.relations.length
				)
					throw new ArchiveError(
						'unresolved-rows',
						projection.diagnostics.map((item) => item.detail).join(', '),
					);
				const collectionId = await this.runtime.bootstrap(context),
					schema = await this.runtime.verifySchema(entity.schemaRevisionId, context);
				if (schema.definition.kind !== 'type') throw new ArchiveError('missing-definition');
				const edges: ArchiveOperation['edges'] = [];
				for (const virtual of projection.relations) {
					const identity = virtual.legacy!;
					requiredId(identity.rowId);
					const id = crypto.randomUUID(),
						path = relationPath(this.runtime.root, virtual.relationTypeId, id);
					const record: RelationRecord = {
						...copy(virtual),
						id,
						path,
						legacy: undefined,
						provenance: {
							migrationId: input.operationId,
							legacyOwnerId: entity.id,
							legacySection: identity.section,
							legacyRowId: identity.rowId,
						},
					};
					const revision = await this.runtime.verifySchema(record.schemaRevisionId, context),
						type = revision.definition;
					if (type.kind !== 'relation-type') throw new ArchiveError('missing-definition');
					validateRelation(
						record,
						type,
						{
							entity: (id) => this.runtime.index.entity(id),
							relations: (typeId) => [
								...this.runtime.index
									.allRelations(typeId)
									.filter((edge) => edge.legacy?.ownerId !== entity.id),
								...edges
									.filter((edge) => edge.record.relationTypeId === typeId)
									.map((edge) => edge.record),
							],
						},
						record,
					);
					const after = encodeRelation(record, type);
					record.contentHash = await digest(after);
					edges.push({
						rowId: identity.rowId,
						section: identity.section,
						record,
						write: { path, beforeHash: '', afterHash: record.contentHash, after },
					});
				}
				const next: EntityRecord = {
					...entity,
					format: 2,
					migrationId: input.operationId,
					expectedRelationIds: edges.map((edge) => edge.record.id),
				};
				const after = encodeEntity(next, schema.definition, raw),
					backup = backupPath(this.runtime.root, input.operationId, entity.id);
				const operation: ArchiveOperation = {
					id: input.operationId,
					kind: 'migration',
					collectionId,
					ownerId: entity.id,
					schemaRevisionId: entity.schemaRevisionId,
					state: 'prepared',
					createdAt: Date.now(),
					owner: {
						path: entity.path,
						beforeHash: input.expectedHash,
						afterHash: await digest(after),
						after,
						backupPath: backup,
					},
					edges,
					verified: [],
				};
				// The source is still v1. A persisted plan freezes the row mapping before any edge is written.
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
						existing.schemaRevisionId !== input.revisionId ||
						existing.kind === 'migration'
					)
						throw new ArchiveError('command-id-conflict');
					return existing;
				}
				this.noPending(input.id);
				const entity = this.runtime.index.entity(input.id),
					relation = entity ? undefined : this.runtime.index.relation(input.id);
				if (!entity && !relation) throw new ArchiveError('missing-or-duplicate-id');
				if (entity?.format === 1 || relation?.legacy) throw new ArchiveError('migration-required');
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
					edges: [],
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
		if (this.runtime.index.diagnostics().some((item) => item.id === id && item.code === 'migration-conflict'))
			throw new ArchiveError('migration-conflict');
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
		for (const write of [operation.owner, ...operation.edges.map((edge) => edge.write)])
			if ((await digest(write.after)) !== write.afterHash || !underRoot(context.root, write.path))
				throw new ArchiveError('invalid-operation');
		const revision = await this.runtime.verifySchema(operation.schemaRevisionId, context);
		const owner =
			operation.kind === 'relation-upgrade'
				? decodeRelation(operation.owner.after, operation.owner.path, operation.owner.afterHash, 0, revision)
				: decodeEntity(operation.owner.after, operation.owner.path, operation.owner.afterHash, 0, revision);
		if (
			owner.id !== operation.ownerId ||
			owner.schemaRevisionId !== operation.schemaRevisionId ||
			(operation.kind === 'migration' &&
				(!('format' in owner) ||
					owner.migrationId !== operation.id ||
					!equal(
						owner.expectedRelationIds,
						operation.edges.map((edge) => edge.record.id),
					)))
		)
			throw new ArchiveError('invalid-operation');
		const mappings = new Set<string>();
		for (const edge of operation.edges) {
			const mapping = `${edge.section}:${edge.rowId}`;
			if (mappings.has(mapping)) throw new ArchiveError('invalid-operation');
			mappings.add(mapping);
			const schema = await this.runtime.verifySchema(edge.record.schemaRevisionId, context),
				parsed = decodeRelation(edge.write.after, edge.write.path, edge.write.afterHash, 0, schema);
			if (!equal(parsed, { ...edge.record, modified: 0, contentHash: edge.write.afterHash, legacy: undefined }))
				throw new ArchiveError('invalid-operation');
			if (
				edge.write.beforeHash !== '' ||
				edge.write.path !== relationPath(context.root, parsed.relationTypeId, parsed.id) ||
				parsed.id !== edge.record.id ||
				parsed.provenance?.migrationId !== operation.id ||
				parsed.provenance.legacyOwnerId !== operation.ownerId ||
				parsed.provenance.legacyRowId !== edge.rowId ||
				parsed.provenance.legacySection !== edge.section
			)
				throw new ArchiveError('invalid-operation');
		}
		if (operation.kind !== 'migration' && operation.edges.length) throw new ArchiveError('invalid-operation');
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
					// Retrying an already committed migration never overwrites later user edits.
					const current = await this.runtime.read(operation.owner.path, context),
						data = frontmatter(current);
					if (
						data['huhu-id'] !== operation.ownerId ||
						(operation.kind === 'migration' && data['huhu-migration-id'] !== operation.id)
					)
						throw new ArchiveError('migration-conflict');
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
				for (const edge of operation.edges) {
					const current = await this.observed(edge.write, context);
					if (current === undefined)
						await this.runtime.writeExact(edge.write.path, undefined, edge.write.after, context);
					else if (current !== edge.write.after)
						throw new ArchiveError('staged-edge-changed', edge.record.id);
					const verified = await this.runtime.read(edge.write.path, context);
					if (verified !== edge.write.after || (await digest(verified)) !== edge.write.afterHash)
						throw new ArchiveError('edge-verification-failed');
					if (!operation.verified.includes(edge.write.path)) operation.verified.push(edge.write.path);
					planRaw = await this.update(operation, planRaw, context);
				}
				// Revalidate endpoints immediately before flipping authority, excluding this owner's virtual/staged copies.
				for (const edge of operation.edges) {
					const schema = await this.runtime.verifySchema(edge.record.schemaRevisionId, context),
						type = schema.definition;
					if (type.kind !== 'relation-type') throw new ArchiveError('missing-definition');
					for (const id of new Set([
						edge.record.sourceId,
						edge.record.targetId,
						...Object.values(edge.record.contextRefs),
					]))
						await this.runtime.entity(id, context, false);
					validateRelation(
						edge.record,
						type,
						{
							entity: (id) => this.runtime.index.entity(id),
							relations: (typeId) => [
								...this.runtime.index
									.allRelations(typeId)
									.filter(
										(item) =>
											item.legacy?.ownerId !== operation.ownerId &&
											item.provenance?.migrationId !== operation.id,
									),
								...operation.edges
									.filter((item) => item.record.relationTypeId === typeId)
									.map((item) => item.record),
							],
						},
						edge.record,
					);
				}
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
				const tombstones = new Map<string, string>();
				// Check every touched file first, then CAS each step again. A conflict never overwrites newer user content.
				for (const edge of operation.edges) {
					const current = await this.observed(edge.write, context),
						tombstone = patchProperties(edge.write.after, {
							'huhu-state': 'deleted',
							'huhu-rollback-operation': operation.id,
						});
					tombstones.set(edge.write.path, tombstone);
					if (current !== undefined && current !== edge.write.after && current !== tombstone)
						throw new ArchiveError('rollback-conflict', edge.write.path);
					if (afterCommit && current === undefined)
						throw new ArchiveError('rollback-edge-missing', edge.write.path);
				}
				operation.state = 'rolling-back';
				planRaw = await this.update(operation, planRaw, context);
				for (const edge of operation.edges) {
					const current = await this.observed(edge.write, context),
						tombstone = tombstones.get(edge.write.path)!;
					if (current === undefined) continue;
					if (current !== edge.write.after && current !== tombstone)
						throw new ArchiveError('rollback-conflict', edge.write.path);
					if (current !== tombstone)
						await this.runtime.writeExact(edge.write.path, current, tombstone, context);
				}
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

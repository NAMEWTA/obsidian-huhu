import type { RelationInput, UpdateRelation } from '../../core/schema/commands';
export type { RelationInput, UpdateRelation } from '../../core/schema/commands';
import { ArchiveError, type CommandReceipt, type RelationRecord } from '../../core/schema/model';
import { canonical, digest, requiredId } from '../../core/schema/value';
import { decodeRelation, encodeRelation, frontmatter, patchProperties } from '../../core/generic/markdown';
import { relationPath } from '../../core/generic/paths';
import { validateRelation } from '../../core/generic/relations';
import type { ArchiveRuntime, ArchiveWriteContext } from './runtime';

export class RelationCommands {
	constructor(readonly runtime: ArchiveRuntime) {}
	private async verifyEndpoints(record: RelationRecord, context: ArchiveWriteContext): Promise<void> {
		if (record.lifecycle !== 'active') return;
		for (const id of new Set([record.sourceId, record.targetId, ...Object.values(record.contextRefs)]))
			await this.runtime.entity(id, context, false);
	}
	create(input: RelationInput, signal?: AbortSignal): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				requiredId(input.relationTypeId);
				requiredId(input.sourceId);
				requiredId(input.targetId);
				const fingerprint = await digest(canonical({ kind: 'create-relation', input }));
				const previous = this.runtime.index.relation(input.operationId);
				if (previous) {
					const raw = await this.runtime.read(previous.path, context),
						data = frontmatter(raw);
					if (data['huhu-create-command'] !== input.operationId || data['huhu-create-hash'] !== fingerprint)
						throw new ArchiveError('command-id-conflict');
					return this.runtime.receipt(input.operationId, previous.id, previous.path, await digest(raw));
				}
				if (this.runtime.index.relationCount(input.operationId)) throw new ArchiveError('duplicate-id');
				await this.runtime.bootstrap(context);
				const revision = this.runtime.index.definition(input.relationTypeId);
				if (!revision) throw new ArchiveError('missing-or-forked-definition');
				const type = (await this.runtime.verifySchema(revision.revisionId, context)).definition;
				if (type.kind !== 'relation-type' || !type.enabled) throw new ArchiveError('type-disabled');
				const path = relationPath(this.runtime.root, type.id, input.operationId);
				const record: RelationRecord = {
					id: input.operationId,
					relationTypeId: type.id,
					schemaRevisionId: revision.revisionId,
					sourceId: input.sourceId,
					targetId: input.targetId,
					values: input.values,
					contextRefs: input.contextRefs ?? {},
					validFrom: input.validFrom,
					validTo: input.validTo,
					lifecycle: input.lifecycle ?? 'active',
					path,
					contentHash: '',
					modified: Date.now(),
				};
				await this.verifyEndpoints(record, context);
				validateRelation(record, type, {
					entity: (id) => this.runtime.index.entity(id),
					relations: (typeId) => this.runtime.index.allRelations(typeId),
				});
				const raw = patchProperties(encodeRelation(record, type), {
					'huhu-create-command': input.operationId,
					'huhu-create-hash': fingerprint,
				});
				const written = await this.runtime.writeExact(path, undefined, raw, context);
				return this.runtime.receipt(input.operationId, record.id, path, written.hash);
			},
			signal,
		);
	}
	update(input: UpdateRelation, signal?: AbortSignal): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				requiredId(input.id);
				const previous = this.runtime.index.relation(input.id);
				if (!previous) throw new ArchiveError('missing-or-duplicate-id');
				if (previous.legacy) throw new ArchiveError('migration-required');
				const raw = await this.runtime.read(previous.path, context, true);
				if ((await digest(raw)) !== input.expectedHash) throw new ArchiveError('write-conflict');
				const revision = await this.runtime.verifySchema(previous.schemaRevisionId, context),
					type = revision.definition;
				if (type.kind !== 'relation-type') throw new ArchiveError('missing-definition');
				const current = decodeRelation(raw, previous.path, input.expectedHash, previous.modified, revision);
				if (current.id !== input.id) throw new ArchiveError('identity-conflict');
				if (current.lifecycle === 'deleted' && input.lifecycle !== 'deleted')
					throw new ArchiveError('relation-tombstoned');
				const next: RelationRecord = {
					...current,
					values: input.values,
					contextRefs: input.contextRefs,
					validFrom: input.validFrom,
					validTo: input.validTo,
					lifecycle: input.lifecycle,
				};
				await this.verifyEndpoints(next, context);
				validateRelation(
					next,
					type,
					{
						entity: (id) => this.runtime.index.entity(id),
						relations: (typeId) => this.runtime.index.allRelations(typeId),
					},
					current,
				);
				const written = await this.runtime.writeExact(
					current.path,
					raw,
					encodeRelation(
						next,
						type,
						raw,
						type.fields.map((field) => field.fieldId),
					),
					context,
				);
				return this.runtime.receipt(input.operationId, next.id, next.path, written.hash);
			},
			signal,
		);
	}
}

import type { PublishDefinition, DefinitionPublication } from '../../core/schema/commands';
export type { PublishDefinition, DefinitionPublication } from '../../core/schema/commands';
import {
	ArchiveError,
	type Definition,
	type ArchiveTypeDefinition,
	type RelationTypeDefinition,
} from '../../core/schema/model';
import {
	assertPropertyCompatibility,
	createRevision,
	incompatibleFields,
	revisionGraph,
	validateDefinition,
} from '../../core/schema/definitions';
import { canonical, digest, equal, requiredId } from '../../core/schema/value';
import { definitionPath } from '../../core/generic/paths';
import { encodeDefinition, HEAD_TAG, patchProperties } from '../../core/generic/markdown';
import type { ArchiveRuntime } from './runtime';

export class DefinitionCommands {
	constructor(readonly runtime: ArchiveRuntime) {}
	publish(input: PublishDefinition, signal?: AbortSignal): Promise<DefinitionPublication> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				await this.runtime.bootstrap(context);
				const types = this.runtime.index
					.definitions()
					.map((item) => item.definition)
					.filter((item): item is ArchiveTypeDefinition => item.kind === 'type');
				validateDefinition(input.definition, types);
				if (!Array.isArray(input.expectedHeads)) throw new ArchiveError('invalid-parents');
				input.expectedHeads.forEach((parent) => requiredId(parent));
				if (input.definition.kind === 'type' || input.definition.kind === 'relation-type') {
					const otherTypes = this.runtime.index
						.revisions()
						.map((item) => item.definition)
						.filter(
							(item): item is ArchiveTypeDefinition | RelationTypeDefinition =>
								item.kind === 'type' || item.kind === 'relation-type',
						);
					assertPropertyCompatibility(input.definition, otherTypes);
				}
				if (
					input.definition.kind === 'relation-type' &&
					[
						...input.definition.sourceTypes,
						...input.definition.targetTypes,
						...input.definition.contextRoles.flatMap((role) => role.typeIds),
					].some((id) => !types.some((type) => type.id === id))
				)
					throw new ArchiveError('missing-endpoint-type');
				if ('typeId' in input.definition) {
					const typeId = input.definition.typeId;
					if (!types.some((type) => type.id === typeId)) throw new ArchiveError('missing-definition');
				}
				const versions = this.runtime.index.revisions(input.definition.id),
					heads = revisionGraph(versions);
				const existing = this.runtime.index.schema(input.operationId);
				if (existing) {
					if (
						!equal(existing.definition, input.definition) ||
						!equal([...existing.parentRevisionIds].sort(), [...input.expectedHeads].sort())
					)
						throw new ArchiveError('command-id-conflict');
					const path = definitionPath(
							this.runtime.root,
							existing.definition.kind,
							existing.definition.id,
							existing.revisionId,
						),
						raw = await this.runtime.read(path, context);
					return {
						revision: existing,
						receipt: this.runtime.receipt(
							input.operationId,
							existing.definition.id,
							path,
							await digest(raw),
						),
						pointer: 'conflict',
						incompatibleFields: [],
					};
				}
				if (!equal([...input.expectedHeads].sort(), heads.heads) || heads.cycle || heads.missing.length)
					throw new ArchiveError('schema-conflict');
				if (versions.some((version) => version.definition.kind !== input.definition.kind))
					throw new ArchiveError('definition-kind-conflict');
				// Dropping a field destroys its historical meaning. Archive it instead, even during a breaking revision.
				if (input.definition.kind === 'type' || input.definition.kind === 'relation-type')
					for (const version of versions) {
						if (version.definition.kind !== 'type' && version.definition.kind !== 'relation-type') continue;
						for (const field of version.definition.fields)
							if (!input.definition.fields.some((next) => next.fieldId === field.fieldId))
								throw new ArchiveError('archive-field-instead', field.fieldId);
					}
				const revision = await createRevision(
					input.definition,
					input.expectedHeads,
					1 + Math.max(0, ...versions.map((version) => version.displayVersion)),
					input.operationId,
				);
				const path = definitionPath(
						this.runtime.root,
						revision.definition.kind,
						revision.definition.id,
						revision.revisionId,
					),
					pointerPath = definitionPath(this.runtime.root, revision.definition.kind, revision.definition.id);
				const oldPointer = this.runtime.files.getFileByPath(pointerPath)
					? await this.runtime.read(pointerPath, context, true)
					: undefined;
				if (!equal(revisionGraph(this.runtime.index.revisions(input.definition.id)).heads, heads.heads))
					throw new ArchiveError('schema-conflict');
				const written = await this.runtime.writeExact(path, undefined, encodeDefinition(revision), context);
				let pointer: DefinitionPublication['pointer'] = 'updated';
				try {
					await this.runtime.writeExact(
						pointerPath,
						oldPointer,
						patchProperties(oldPointer ?? '', {
							'huhu-format-version': 2,
							'huhu-type': HEAD_TAG,
							'huhu-id': revision.definition.id,
							'huhu-revision-id': revision.revisionId,
						}),
						context,
					);
				} catch {
					pointer = 'conflict';
				}
				// Creating the immutable revision is the commit point. A failed convenience pointer is reported, not disguised as no publication.
				const previous = versions.find((version) => heads.heads.includes(version.revisionId))?.definition;
				const breaking =
					(previous?.kind === 'type' || previous?.kind === 'relation-type') &&
					(revision.definition.kind === 'type' || revision.definition.kind === 'relation-type')
						? incompatibleFields(previous, revision.definition)
						: [];
				return {
					revision,
					receipt: this.runtime.receipt(input.operationId, input.definition.id, path, written.hash),
					pointer,
					incompatibleFields: breaking,
				};
			},
			signal,
		);
	}
	/** A read-only field-level change preview, including every pinned record that would require explicit conversion. */
	preview(definition: Definition): { incompatibleFields: string[]; affectedIds: string[]; fingerprint: string } {
		validateDefinition(definition);
		const previous = this.runtime.index.definition(definition.id)?.definition;
		const fields =
			(previous?.kind === 'type' || previous?.kind === 'relation-type') &&
			(definition.kind === 'type' || definition.kind === 'relation-type')
				? incompatibleFields(previous, definition)
				: [];
		return {
			incompatibleFields: fields,
			affectedIds:
				definition.kind === 'type'
					? this.runtime.index
							.allEntities()
							.filter((record) => record.typeId === definition.id)
							.map((record) => record.id)
					: definition.kind === 'relation-type'
						? this.runtime.index
								.allRelations(definition.id, true)
								.filter((record) => !record.legacy)
								.map((record) => record.id)
						: [],
			fingerprint: canonical(definition),
		};
	}
}

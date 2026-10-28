import type { CreateEntity, SaveEntity, ArchiveImpact } from '../../core/schema/commands';
export type { CreateEntity, SaveEntity, ArchiveImpact } from '../../core/schema/commands';
import {
	ArchiveError,
	type CommandReceipt,
	type EntityRecord,
	type EntityState,
	type FormSession,
} from '../../core/schema/model';
import { incompatibleFields } from '../../core/schema/definitions';
import { mergeValues, validateValues } from '../../core/schema/fields';
import {
	canonical,
	copy,
	digest,
	equal,
	displayName,
	identifier,
	requiredId,
	safeRelativePath,
} from '../../core/schema/value';
import { decodeEntity, encodeEntity, frontmatter, patchProperties } from '../../core/generic/markdown';
import { adaptLegacy, patchLegacy } from '../../core/generic/legacy';
import { parseRecord } from '../../core/persist/markdown';
import { entityPath, underRoot } from '../../core/generic/paths';
import {
	safeArchiveName,
	type ArchiveImport,
	type ArchiveImportResult,
	type ArchiveResource,
} from '../../core/resources';
import { patchReminders, readReminders } from '../../core/reminders';
import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { ArchiveRuntime } from './runtime';

const states: readonly EntityState[] = ['draft', 'active', 'archived'];
export class EntityCommands {
	constructor(readonly runtime: ArchiveRuntime) {}
	private noPendingOperation(id: string): void {
		if (
			this.runtime.index
				.operations()
				.some(
					(operation) =>
						operation.ownerId === id &&
						operation.state !== 'committed' &&
						operation.state !== 'rolled-back',
				)
		)
			throw new ArchiveError('pending-migration');
		if (this.runtime.index.diagnostics().some((item) => item.id === id && item.code === 'migration-conflict'))
			throw new ArchiveError('migration-conflict');
	}
	create(input: CreateEntity, signal?: AbortSignal): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				requiredId(input.typeId);
				if (input.lifecycle !== undefined && !states.includes(input.lifecycle))
					throw new ArchiveError('invalid-state');
				const fingerprint = await digest(canonical({ kind: 'create-entity', input }));
				const existing = this.runtime.index.entity(input.operationId);
				if (existing) {
					const raw = await this.runtime.read(existing.path, context),
						data = frontmatter(raw);
					if (data['huhu-create-command'] !== input.operationId || data['huhu-create-hash'] !== fingerprint)
						throw new ArchiveError('command-id-conflict');
					return this.runtime.receipt(input.operationId, existing.id, existing.path, await digest(raw));
				}
				if (this.runtime.index.entitiesById(input.operationId).length) throw new ArchiveError('duplicate-id');
				await this.runtime.bootstrap(context);
				const revision = this.runtime.index.definition(input.typeId);
				if (!revision || revision.definition.kind !== 'type')
					throw new ArchiveError('missing-or-forked-definition');
				const type = (await this.runtime.verifySchema(revision.revisionId, context)).definition;
				if (type.kind !== 'type' || !type.enabled) throw new ArchiveError('type-disabled');
				let values = input.values,
					body = '';
				const templateId = input.templateId ?? type.defaultTemplateId;
				if (templateId) {
					const template = this.runtime.index.definition(templateId)?.definition;
					if (template?.kind !== 'template' || template.typeId !== type.id)
						throw new ArchiveError('invalid-template');
					values = { ...copy(template.defaults), ...values };
					body = template.body;
				}
				const lifecycle = input.lifecycle ?? 'active';
				validateValues(type.fields, values, lifecycle === 'active');
				const name = displayName(values[type.nameFieldId], type.label),
					path = entityPath(this.runtime.root, type.folder, name, input.operationId);
				const record: EntityRecord = {
					id: input.operationId,
					typeId: type.id,
					schemaRevisionId: revision.revisionId,
					lifecycle,
					values,
					path,
					contentHash: '',
					modified: Date.now(),
					format: 2,
				};
				let raw = encodeEntity(record, type, body);
				raw = patchProperties(raw, {
					'huhu-create-command': input.operationId,
					'huhu-create-hash': fingerprint,
				});
				if (this.runtime.index.definition(type.id)?.revisionId !== revision.revisionId)
					throw new ArchiveError('schema-conflict');
				const written = await this.runtime.writeExact(path, undefined, raw, context);
				return this.runtime.receipt(input.operationId, record.id, path, written.hash);
			},
			signal,
		);
	}
	async beginEdit(idOrPath: string): Promise<FormSession> {
		await this.runtime.ensureLoaded();
		await this.runtime.flushEvents();
		const context = this.runtime.context();
		const { entity, raw } = await this.runtime.entity(idOrPath, context);
		this.noPendingOperation(entity.id);
		const revision = await this.runtime.verifySchema(entity.schemaRevisionId, context);
		if (revision.definition.kind !== 'type' || revision.definition.id !== entity.typeId)
			throw new ArchiveError('missing-definition');
		return {
			id: crypto.randomUUID(),
			entityId: entity.id,
			typeId: entity.typeId,
			schemaRevisionId: entity.schemaRevisionId,
			baseHash: await digest(raw),
			baseRaw: raw,
			baseValues: copy(entity.values),
			baseLifecycle: entity.lifecycle,
			path: entity.path,
			draft: copy(entity.values),
			dirtyFields: [],
		};
	}
	save(input: SaveEntity, signal?: AbortSignal): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async ({ operationId, session, lifecycle }, context) => {
				if (session.creating || session.relationContext) throw new ArchiveError('invalid-session');
				requiredId(operationId);
				requiredId(session.id);
				requiredId(session.entityId);
				this.noPendingOperation(session.entityId);
				if (
					!Array.isArray(session.dirtyFields) ||
					session.dirtyFields.length > 200 ||
					!session.dirtyFields.every(identifier) ||
					new Set(session.dirtyFields).size !== session.dirtyFields.length ||
					!states.includes(lifecycle ?? session.baseLifecycle)
				)
					throw new ArchiveError('invalid-session');
				if ((await digest(session.baseRaw)) !== session.baseHash) throw new ArchiveError('invalid-session');
				const baseRevision = await this.runtime.verifySchema(session.schemaRevisionId, context),
					baseType = baseRevision.definition;
				if (baseType.kind !== 'type' || baseType.id !== session.typeId)
					throw new ArchiveError('invalid-session');
				const baseLegacy = parseRecord(session.baseRaw, session.path),
					base = baseLegacy
						? adaptLegacy(baseLegacy, session.baseHash)
						: decodeEntity(session.baseRaw, session.path, session.baseHash, 0, baseRevision);
				if (
					base.id !== session.entityId ||
					base.typeId !== session.typeId ||
					base.schemaRevisionId !== session.schemaRevisionId ||
					base.lifecycle !== session.baseLifecycle ||
					!equal(base.values, session.baseValues)
				)
					throw new ArchiveError('invalid-session');
				const { entity } = await this.runtime.entity(session.entityId, context);
				const latestRevision = await this.runtime.verifySchema(entity.schemaRevisionId, context),
					type = latestRevision.definition;
				if (type.kind !== 'type' || type.id !== session.typeId || incompatibleFields(baseType, type).length)
					throw new ArchiveError('schema-conflict');
				for (const id of session.dirtyFields)
					if (!type.fields.some((field) => field.fieldId === id)) throw new ArchiveError('unknown-field', id);
				const written = await this.runtime.patch(
					entity.path,
					(latest) => {
						if (entity.format === 1) {
							if (lifecycle && lifecycle !== 'active') throw new ArchiveError('migration-required');
							return patchLegacy(
								latest,
								session.baseRaw,
								entity.path,
								session.draft,
								session.dirtyFields,
							);
						}
						const current = decodeEntity(latest, entity.path, '', entity.modified, latestRevision);
						if (
							current.id !== session.entityId ||
							current.typeId !== session.typeId ||
							current.schemaRevisionId !== entity.schemaRevisionId
						)
							throw new ArchiveError('schema-conflict');
						const state = lifecycle ?? session.baseLifecycle;
						if (current.lifecycle !== session.baseLifecycle && current.lifecycle !== state)
							throw new ArchiveError('state-conflict');
						const values = mergeValues(
							session.baseValues,
							current.values,
							session.draft,
							session.dirtyFields,
						);
						validateValues(type.fields, values, state === 'active', current.values);
						return encodeEntity(
							{ ...current, values, lifecycle: state },
							type,
							latest,
							session.dirtyFields,
						);
					},
					context,
				);
				// A save is committed before optional draft cleanup. Cleanup failure must not cause duplicate user effects.
				if (this.runtime.drafts)
					void this.runtime.drafts
						.remove(context.root, session.id)
						.catch((error) => console.warn('[HUHU archives draft cleanup]', error));
				return this.runtime.receipt(operationId, session.entityId, entity.path, written.hash);
			},
			signal,
		);
	}
	setState(
		input: { operationId: string; id: string; expectedHash: string; lifecycle: EntityState },
		signal?: AbortSignal,
	): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				if (!states.includes(input.lifecycle)) throw new ArchiveError('invalid-state');
				const { entity, raw } = await this.runtime.entity(input.id, context);
				this.noPendingOperation(entity.id);
				if (entity.format === 1) throw new ArchiveError('migration-required');
				if ((await digest(raw)) !== input.expectedHash) throw new ArchiveError('write-conflict');
				const revision = await this.runtime.verifySchema(entity.schemaRevisionId, context);
				if (revision.definition.kind !== 'type') throw new ArchiveError('missing-definition');
				validateValues(revision.definition.fields, entity.values, input.lifecycle === 'active', entity.values);
				const written = await this.runtime.writeExact(
					entity.path,
					raw,
					patchProperties(raw, { 'huhu-state': input.lifecycle }),
					context,
				);
				return this.runtime.receipt(input.operationId, entity.id, entity.path, written.hash);
			},
			signal,
		);
	}
	async impact(id: string): Promise<ArchiveImpact> {
		await this.runtime.ensureLoaded();
		await this.runtime.flushEvents();
		const { entity, raw } = await this.runtime.entity(id, this.runtime.context(), false),
			edges = this.runtime.index.relations(entity.id).items;
		return {
			id: entity.id,
			path: entity.path,
			contentHash: await digest(raw),
			relations: edges.filter((edge) => edge.sourceId === entity.id || edge.targetId === entity.id).length,
			contexts: edges.filter((edge) => Object.values(edge.contextRefs).includes(entity.id)).length,
			attachments: this.resources(entity.id).length,
			reminders: readReminders(raw).length,
			restricted: edges.some((edge) => {
				const type = this.runtime.index.schema(edge.schemaRevisionId)?.definition;
				return type?.kind !== 'relation-type' || type.onDelete === 'restrict';
			}),
		};
	}
	resources(id: string): ArchiveResource[] {
		const entity = this.runtime.index.entity(id);
		if (!entity) throw new ArchiveError('missing-or-duplicate-id');
		const folder = entity.path.slice(0, entity.path.lastIndexOf('/'));
		return this.runtime.files
			.listFolder(folder)
			.filter(
				(file) =>
					!file.folder &&
					file.path !== entity.path &&
					['attachment', 'ordinary'].includes(this.runtime.index.classify(file.path)),
			)
			.map((file) => ({
				path: file.path,
				relativePath: file.path.slice(folder.length + 1),
				name: file.path.split('/').pop()!,
				extension: file.path.split('.').pop() ?? '',
				size: file.size,
				modified: file.modified,
			}));
	}
	createNote(
		input: { operationId: string; id: string; name: string; body: string },
		signal?: AbortSignal,
	): Promise<CommandReceipt> {
		return this.runtime.command(
			input,
			async (input, context) => {
				requiredId(input.operationId);
				const { entity } = await this.runtime.entity(input.id, context);
				const path = `${entity.path.slice(0, entity.path.lastIndexOf('/'))}/${safeArchiveName(input.name.replace(/\.md$/i, ''))}-${input.operationId}.md`;
				if (typeof input.body !== 'string' || input.body.length > 8 * 1024 * 1024)
					throw new ArchiveError('invalid-input');
				const existing = this.runtime.files.getFileByPath(path);
				if (existing) {
					const raw = await this.runtime.read(path, context);
					if (raw !== input.body) throw new ArchiveError('command-id-conflict');
					return this.runtime.receipt(input.operationId, entity.id, path, await digest(raw));
				}
				const written = await this.runtime.writeExact(path, undefined, input.body, context);
				return this.runtime.receipt(input.operationId, entity.id, path, written.hash);
			},
			signal,
		);
	}
	/** Each imported item returns its real result. A later failure never rolls back an already imported attachment. */
	importResources(id: string, inputs: readonly ArchiveImport[]): Promise<ArchiveImportResult[]> {
		const frozen = inputs.map((input) => ({ name: input.name, read: () => input.read() }));
		return this.runtime.command({ id }, async ({ id }, context) => {
			const { entity } = await this.runtime.entity(id, context),
				folder = entity.path.slice(0, entity.path.lastIndexOf('/')),
				results: ArchiveImportResult[] = [];
			for (const input of frozen) {
				try {
					const name = safeArchiveName(input.name),
						path = `${folder}/${name}`;
					this.runtime.assert(context, true);
					if (this.runtime.files.getAbstractFileByPath(path)) throw new ArchiveError('path-exists');
					const bytes = await input.read();
					this.runtime.assert(context, true);
					if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 100 * 1024 * 1024)
						throw new ArchiveError('invalid-attachment');
					const current = this.runtime.index.entity(id);
					if (!current || current.path !== entity.path) throw new ArchiveError('file-moved');
					await this.runtime.files.createBinary(path, bytes);
					results.push({ name: input.name, path });
				} catch (error) {
					results.push({ name: input.name, error: error instanceof Error ? error.message : String(error) });
				}
			}
			return results;
		});
	}
	async reminders(): Promise<AutomationDefinition[]> {
		await this.runtime.ensureLoaded();
		const context = this.runtime.context(),
			result: AutomationDefinition[] = [];
		for (const entity of this.runtime.index.allEntities()) {
			if (entity.lifecycle !== 'active' || this.runtime.index.entitiesById(entity.id).length !== 1) continue;
			const raw = await this.runtime.read(entity.path, context);
			result.push(
				...readReminders(raw).map((definition) => ({
					...definition,
					source: { kind: 'contacts' as const, path: entity.path, id: entity.id },
				})),
			);
		}
		this.runtime.assert(context);
		return result;
	}
	saveReminder(definition: AutomationDefinition, remove = false): Promise<void> {
		return this.runtime.command({ definition, remove }, async ({ definition, remove }, context) => {
			if (!definition.source || definition.source.kind !== 'contacts') throw new ArchiveError('invalid-source');
			const { entity } = await this.runtime.entity(definition.source.id || definition.source.path, context);
			this.noPendingOperation(entity.id);
			await this.runtime.patch(
				entity.path,
				(latest) => {
					if (frontmatter(latest)['huhu-id'] !== entity.id) throw new ArchiveError('identity-conflict');
					return patchReminders(
						latest,
						{ ...definition, source: { kind: 'contacts', path: entity.path, id: entity.id } },
						remove,
					);
				},
				context,
			);
		});
	}
	async drafts(): Promise<FormSession[]> {
		await this.runtime.ensureLoaded();
		const context = this.runtime.context(),
			drafts = (await this.runtime.drafts?.list(this.runtime.root)) ?? [];
		this.runtime.assert(context);
		return drafts.flatMap((value) => {
			try {
				this.validateDraft(value as FormSession);
				return [copy(value as FormSession)];
			} catch {
				return [];
			}
		});
	}
	private validateDraft(value: FormSession): void {
		if (
			!value ||
			!identifier(value.id) ||
			!identifier(value.entityId) ||
			!identifier(value.typeId) ||
			!identifier(value.schemaRevisionId) ||
			!safeRelativePath(value.path) ||
			!underRoot(this.runtime.root, value.path) ||
			typeof value.baseRaw !== 'string' ||
			value.baseRaw.length > 8 * 1024 * 1024 ||
			typeof value.baseHash !== 'string' ||
			!Array.isArray(value.dirtyFields) ||
			!value.dirtyFields.every(identifier)
		)
			throw new ArchiveError('invalid-draft');
		canonical(value);
	}
	saveDraft(input: FormSession): Promise<void> {
		// Capture and authorize the private recovery write synchronously. It may finish after unload;
		// unlike an entity command it cannot mutate visible records or a newly selected root.
		try {
			const session = copy(input),
				context = this.runtime.context();
			this.runtime.assert(context, true);
			this.validateDraft(session);
			const store = this.runtime.drafts;
			if (!store) throw new ArchiveError('drafts-unavailable');
			return (async () => {
				if ((await digest(session.baseRaw)) !== session.baseHash) throw new ArchiveError('invalid-draft');
				await store.write(context.root, session.id, session);
			})();
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
	}
	discardDraft(id: string): Promise<void> {
		return this.runtime.command({ id }, async ({ id }, context) => {
			requiredId(id);
			await this.runtime.drafts?.remove(context.root, id);
		});
	}
}

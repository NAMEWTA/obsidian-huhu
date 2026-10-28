import { t } from '../../../shared/i18n';
import { listFields, legacyFieldKeys, type ArchiveRecord, type RecordKind } from './model';
import { archiveCategories } from './resources';
import type { ArchiveEntity, ArchiveTypeDefinition } from './schema';

/** The fixed v1 schema is interpreted in code; observing it does not manufacture published v2 definitions on disk. */
export function legacyArchiveTypes(): ArchiveTypeDefinition[] {
	return (['person', 'company'] as const).map((kind) => ({
		typeId: kind,
		label: t(`contacts.${kind}`),
		folder: archiveCategories[kind],
		titleFieldId: 'name',
		revisionId: 'legacy-v1',
		parentRevisionIds: [],
		contentHash: '',
		displayVersion: 1,
		legacy: true,
		fields: [
			...legacyFieldKeys[kind]
				.filter((fieldId) => !listFields.includes(fieldId as (typeof listFields)[number]))
				.map((fieldId) => ({
					fieldId,
					storageKey: fieldId,
					label: t(`contacts.${fieldId}`),
					codec: 'text' as const,
				})),
			...listFields
				.filter((fieldId) => legacyFieldKeys[kind].includes(fieldId))
				.map((fieldId) => ({
					fieldId,
					storageKey: fieldId,
					label: t(`contacts.${fieldId}`),
					codec: 'string-list' as const,
				})),
		],
	}));
}
export function legacyArchiveEntity(record: ArchiveRecord): ArchiveEntity {
	return {
		id: record.id,
		typeId: record.kind,
		schemaRevisionId: 'legacy-v1',
		formatVersion: 1,
		path: record.path,
		folderPath: record.folderPath,
		values: Object.fromEntries(
			Object.entries(record.fields).filter(([key]) =>
				legacyFieldKeys[record.kind].includes(key as keyof ArchiveRecord['fields']),
			),
		),
		createdAt: null,
		updatedAt: record.modified > 0 ? new Date(record.modified).toISOString() : null,
		raw: record.raw,
		readOnly: record.errors.length > 0,
	};
}
export type LegacyArchiveCreator = (
	kind: RecordKind,
	id: string,
	values: ArchiveEntity['values'],
	prepareCommit?: () => Promise<() => void>,
) => Promise<ArchiveRecord>;

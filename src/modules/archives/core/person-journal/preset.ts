// Manual-event concept adapted from yeshimei/bz (MIT), d76a0870329403247917a00c43019e203a2560a4.
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/types.ts (ManualEvent).
// Copyright (c) 2026 叫我包仔
// HUHU: stable archive entityId/rowId, dated table fields, explicit schema publication; no separate people store or AI metadata.
import type { ArchiveTypeDefinition, FieldDefinition } from '../schema/model';
import { PERSON } from '../schema/presets';

export const PERSON_JOURNAL_REVISION_ID = 'preset-type-person-journal-v3';
export const PERSON_JOURNAL_FIELD: FieldDefinition = {
	fieldId: 'journal', storageKey: 'person-journal', label: 'Journal', labelKey: 'archives.preset.personJournal', kind: 'table',
	columns: [
		{ fieldId: 'date', storageKey: 'date', label: 'Date', labelKey: 'archives.preset.journalDate', kind: 'date', precision: 'day', required: true },
		{ fieldId: 'title', storageKey: 'title', label: 'Title', labelKey: 'archives.preset.journalTitle', kind: 'text', required: true },
		{ fieldId: 'content', storageKey: 'content', label: 'Content', labelKey: 'archives.preset.journalContent', kind: 'markdown' },
		{ fieldId: 'relatedEntityIds', storageKey: 'relatedEntityIds', label: 'Related entities', labelKey: 'archives.preset.journalRelatedEntities', kind: 'strings', uniqueItems: true },
	],
};
/** v2 stays immutable. This definition is published explicitly, never substituted for an existing entity's schema. */
export const PERSON_WITH_JOURNAL: ArchiveTypeDefinition = { ...PERSON, fields: [...PERSON.fields, PERSON_JOURNAL_FIELD] };

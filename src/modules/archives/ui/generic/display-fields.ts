import type { ArchiveTypeDefinition } from '../../core/schema/model';

export function displayFields(type: ArchiveTypeDefinition): string[] {
	return (type.displayFields ?? type.fields.filter((field) => !field.archived).slice(0, 5).map((field) => field.fieldId))
		.filter((id) => id !== type.nameFieldId && type.fields.some((field) => field.fieldId === id && !field.archived));
}

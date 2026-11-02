import { ARCHIVE_PATHS } from '../../../../shared/storage/vault-layout';
import type { LocalizedLabel } from './labels';
const presetLabel = (label: string, labelKey: LocalizedLabel['labelKey']): LocalizedLabel => ({ label, labelKey });
import type {
	ArchiveTypeDefinition,
	Definition,
	DefinitionRevision,
	FieldDefinition,
	FormTemplate,
	RelationTypeDefinition,
} from './model';
import { createRevision } from './definitions';

const field = (
	fieldId: string,
	label: LocalizedLabel,
	kind: FieldDefinition['kind'] = 'text',
	extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({ fieldId, storageKey: fieldId, ...label, kind, ...extra });
const basics = [
	field('name', presetLabel('Name', 'archives.preset.name'), 'text', { required: true }),
	field('aliases', presetLabel('Aliases', 'archives.preset.aliases'), 'strings'),
	field('region', presetLabel('Region', 'archives.preset.region')),
	field('phones', presetLabel('Phone numbers', 'archives.preset.phones'), 'strings'),
	field('emails', presetLabel('Email addresses', 'archives.preset.emails'), 'strings'),
	field('tags', presetLabel('Tags', 'archives.preset.tags'), 'strings', { uniqueItems: true }),
];
export const PERSON: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'type-person',
	label: 'People',
	labelKey: 'archives.preset.person',
	icon: 'user',
	folder: ARCHIVE_PATHS.people,
	enabled: true,
	nameFieldId: 'name',
	defaultFormId: 'form-person-full',
	fields: [
		...basics,
		field('birthday', presetLabel('Birthday', 'archives.preset.birthday'), 'date', { precision: 'day' }),
		field('birthplace', presetLabel('Birthplace', 'archives.preset.birthplace')),
		field('mobiles', presetLabel('Mobile numbers', 'archives.preset.mobiles'), 'strings'),
		field('wechat', presetLabel('WeChat', 'archives.preset.wechat'), 'strings'),
		field('website', presetLabel('Website', 'archives.preset.website')),
		field('traits', presetLabel('Personality', 'archives.preset.traits'), 'markdown'),
		field('habits', presetLabel('Interests and habits', 'archives.preset.habits'), 'markdown'),
		field('notes', presetLabel('Notes', 'archives.preset.notes'), 'markdown'),
	],
};
export const COMPANY: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'type-company',
	label: 'Companies',
	labelKey: 'archives.preset.company',
	icon: 'building-2',
	folder: ARCHIVE_PATHS.companies,
	enabled: true,
	nameFieldId: 'name',
	defaultFormId: 'form-company-full',
	fields: [
		...basics,
		field('website', presetLabel('Website', 'archives.preset.website')),
		field('birthday', presetLabel('Date', 'archives.preset.date'), 'date', { precision: 'day' }),
		field('birthplace', presetLabel('Place', 'archives.preset.place')),
		field('mobiles', presetLabel('Mobile numbers', 'archives.preset.mobiles'), 'strings'),
		field('wechat', presetLabel('WeChat', 'archives.preset.wechat'), 'strings'),
		field('traits', presetLabel('Characteristics', 'archives.preset.characteristics'), 'markdown'),
		field('habits', presetLabel('Habits', 'archives.preset.companyHabits'), 'markdown'),
		field('notes', presetLabel('Company notes', 'archives.preset.companyNotes'), 'markdown'),
	],
};
const relationBase = {
	kind: 'relation-type' as const,
	enabled: true,
	sourceCardinality: { scope: 'active' as const },
	targetCardinality: { scope: 'active' as const },
	allowSelf: false,
	acyclic: false,
	onDelete: 'retain' as const,
	duplicatePolicy: 'values' as const,
	contextRoles: [],
};
export const EMPLOYMENT: RelationTypeDefinition = {
	...relationBase,
	id: 'relation-employment',
	label: 'Employment',
	labelKey: 'archives.preset.employment',
	activeWhen: { fieldId: 'status', op: 'eq', value: 'current' },
	sourceTypes: [PERSON.id],
	targetTypes: [COMPANY.id],
	directed: true,
	forwardLabel: 'Employed at',
	forwardLabelKey: 'archives.preset.employedAt',
	inverseLabel: 'Employees',
	inverseLabelKey: 'archives.preset.employees',
	fields: [
		field('department', presetLabel('Department', 'archives.preset.department')),
		field('title', presetLabel('Job title', 'archives.preset.title')),
		field('status', presetLabel('Employment status', 'archives.preset.status'), 'select', {
			required: true,
			options: [
				{ id: 'current', value: 'current', label: 'Current', labelKey: 'archives.preset.current' },
				{ id: 'past', value: 'past', label: 'Past', labelKey: 'archives.preset.past' },
			],
		}),
		field('keyRole', presetLabel('Key role', 'archives.preset.keyRole'), 'select', {
			options: [
				{ id: 'none', value: '', label: 'Unspecified', labelKey: 'archives.preset.none' },
				{ id: 'leader', value: 'leader', label: 'Leader', labelKey: 'archives.preset.leader' },
				{ id: 'contact', value: 'contact', label: 'Contact', labelKey: 'archives.preset.contact' },
			],
		}),
		field('notes', presetLabel('Notes', 'archives.preset.notes'), 'markdown'),
	],
};
const personal = (
	id: string,
	label: LocalizedLabel,
	directed: boolean,
	inverseLabel = label,
): RelationTypeDefinition => ({
	...relationBase,
	id,
	...label,
	sourceTypes: [PERSON.id],
	targetTypes: [PERSON.id],
	directed,
	forwardLabel: label.label,
	forwardLabelKey: label.labelKey,
	inverseLabel: inverseLabel.label,
	inverseLabelKey: inverseLabel.labelKey,
	contextRoles: [
		{
			role: 'company',
			label: 'Related company',
			labelKey: 'archives.preset.relatedCompany',
			typeIds: [COMPANY.id],
		},
	],
	fields: [
		field('label', presetLabel('Original relationship', 'archives.preset.originalRelation')),
		field('notes', presetLabel('Notes', 'archives.preset.notes'), 'markdown'),
	],
});
export const RELATION_PRESETS: RelationTypeDefinition[] = [
	EMPLOYMENT,
	personal(
		'relation-reports-to',
		presetLabel('Reports to', 'archives.preset.reportsTo'),
		true,
		presetLabel('Direct reports', 'archives.preset.reports'),
	),
	personal('relation-colleague', presetLabel('Colleague', 'archives.preset.colleague'), false),
	personal('relation-friend', presetLabel('Friend', 'archives.preset.friend'), false),
	personal(
		'relation-custom',
		presetLabel('Relationship (original)', 'archives.preset.customRelation'),
		true,
		presetLabel('Related by (original)', 'archives.preset.customInverse'),
	),
];
export function defaultForms(type: ArchiveTypeDefinition): FormTemplate[] {
	const stem = type.id.replace(/^type-/, '');
	return [
		{
			kind: 'form',
			id: `form-${stem}-quick`,
			typeId: type.id,
			label: 'Quick entry',
			labelKey: 'archives.preset.quick',
			groups: [
				{
					id: 'basic',
					label: 'Basic information',
					labelKey: 'archives.preset.basic',
					columns: 1,
					controls: [{ fieldId: type.nameFieldId }],
				},
			],
		},
		{
			kind: 'form',
			id: `form-${stem}-full`,
			typeId: type.id,
			label: 'Full profile',
			labelKey: 'archives.preset.full',
			groups: [
				{
					id: 'basic',
					label: 'Details',
					labelKey: 'archives.preset.details',
					columns: 2,
					controls: type.fields
						.filter((field) => !field.archived)
						.map((field) => ({ fieldId: field.fieldId })),
				},
			],
		},
	];
}
export async function presetRevisions(): Promise<DefinitionRevision[]> {
	const definitions: Definition[] = [
		PERSON,
		COMPANY,
		...defaultForms(PERSON),
		...defaultForms(COMPANY),
		...RELATION_PRESETS,
	];
	return Promise.all(
		definitions.map((definition) => createRevision(definition, [], 1, presetRevisionId(definition.id))),
	);
}
export function legacyTypeId(kind: 'person' | 'company'): string {
	return kind === 'person' ? PERSON.id : COMPANY.id;
}
export function legacySchemaId(kind: 'person' | 'company'): string {
	return presetRevisionId(legacyTypeId(kind));
}

/** New immutable preset generation; existing v1 definitions remain their own on-disk authority. */
export function presetRevisionId(id: string): string {
	return `preset-${id}-v2`;
}

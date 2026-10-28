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
	label: string,
	kind: FieldDefinition['kind'] = 'text',
	extra: Partial<FieldDefinition> = {},
): FieldDefinition => ({ fieldId, storageKey: fieldId, label, kind, ...extra });
const basics = [
	field('name', '名称', 'text', { required: true }),
	field('aliases', '别名', 'strings'),
	field('region', '地区'),
	field('phones', '电话', 'strings'),
	field('emails', '邮箱', 'strings'),
	field('tags', '标签', 'strings', { uniqueItems: true }),
];
export const PERSON: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'type-person',
	label: '个人档案',
	icon: 'user',
	folder: '个人档案',
	enabled: true,
	nameFieldId: 'name',
	defaultFormId: 'form-person-full',
	fields: [
		...basics,
		field('birthday', '生日', 'date', { precision: 'day' }),
		field('birthplace', '籍贯'),
		field('mobiles', '手机', 'strings'),
		field('wechat', '微信', 'strings'),
		field('website', '网站'),
		field('traits', '性格特点', 'markdown'),
		field('habits', '爱好习惯', 'markdown'),
		field('notes', '备注', 'markdown'),
	],
};
export const COMPANY: ArchiveTypeDefinition = {
	kind: 'type',
	id: 'type-company',
	label: '企业档案',
	icon: 'building-2',
	folder: '企业档案',
	enabled: true,
	nameFieldId: 'name',
	defaultFormId: 'form-company-full',
	fields: [
		...basics,
		field('website', '网站'),
		field('birthday', '日期', 'date', { precision: 'day' }),
		field('birthplace', '地点'),
		field('mobiles', '手机', 'strings'),
		field('wechat', '微信', 'strings'),
		field('traits', '特点', 'markdown'),
		field('habits', '习惯', 'markdown'),
		field('notes', '企业备注', 'markdown'),
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
	label: '任职经历',
	activeWhen: { fieldId: 'status', op: 'eq', value: 'current' },
	sourceTypes: [PERSON.id],
	targetTypes: [COMPANY.id],
	directed: true,
	forwardLabel: '任职于',
	inverseLabel: '任职人员',
	fields: [
		field('department', '部门'),
		field('title', '职位'),
		field('status', '任职状态', 'select', {
			required: true,
			options: [
				{ id: 'current', value: 'current', label: '在职' },
				{ id: 'past', value: 'past', label: '离任' },
			],
		}),
		field('keyRole', '关键角色', 'select', {
			options: [
				{ id: 'none', value: '', label: '未指定' },
				{ id: 'leader', value: 'leader', label: '负责人' },
				{ id: 'contact', value: 'contact', label: '联系人' },
			],
		}),
		field('notes', '备注', 'markdown'),
	],
};
const personal = (id: string, label: string, directed: boolean, inverseLabel = label): RelationTypeDefinition => ({
	...relationBase,
	id,
	label,
	sourceTypes: [PERSON.id],
	targetTypes: [PERSON.id],
	directed,
	forwardLabel: label,
	inverseLabel,
	contextRoles: [{ role: 'company', label: '相关企业', typeIds: [COMPANY.id] }],
	fields: [field('label', '原关系文字'), field('notes', '备注', 'markdown')],
});
export const RELATION_PRESETS: RelationTypeDefinition[] = [
	EMPLOYMENT,
	personal('relation-reports-to', '汇报给', true, '下属'),
	personal('relation-colleague', '同事', false),
	personal('relation-friend', '朋友', false),
	personal('relation-custom', '关系（原文）', true, '被关联（原文）'),
];
export function defaultForms(type: ArchiveTypeDefinition): FormTemplate[] {
	const stem = type.id.replace(/^type-/, '');
	return [
		{
			kind: 'form',
			id: `form-${stem}-quick`,
			typeId: type.id,
			label: '快速录入',
			groups: [{ id: 'basic', label: '基本信息', columns: 1, controls: [{ fieldId: type.nameFieldId }] }],
		},
		{
			kind: 'form',
			id: `form-${stem}-full`,
			typeId: type.id,
			label: '完整资料',
			groups: [
				{
					id: 'basic',
					label: '资料',
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
		definitions.map((definition) => createRevision(definition, [], 1, `preset-${definition.id}-v1`)),
	);
}
export function legacyTypeId(kind: 'person' | 'company'): string {
	return kind === 'person' ? PERSON.id : COMPANY.id;
}
export function legacySchemaId(kind: 'person' | 'company'): string {
	return `preset-${legacyTypeId(kind)}-v1`;
}

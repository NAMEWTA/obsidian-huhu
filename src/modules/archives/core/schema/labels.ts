import { t } from '../../../../shared/i18n';

export const PRESET_LABEL_KEYS = [
	'archives.preset.personJournal',
	'archives.preset.journalDate',
	'archives.preset.journalTitle',
	'archives.preset.journalContent',
	'archives.preset.journalRelatedEntities',
	'archives.preset.name',
	'archives.preset.aliases',
	'archives.preset.region',
	'archives.preset.phones',
	'archives.preset.emails',
	'archives.preset.tags',
	'archives.preset.person',
	'archives.preset.company',
	'archives.preset.birthday',
	'archives.preset.birthplace',
	'archives.preset.mobiles',
	'archives.preset.wechat',
	'archives.preset.website',
	'archives.preset.traits',
	'archives.preset.habits',
	'archives.preset.notes',
	'archives.preset.date',
	'archives.preset.place',
	'archives.preset.characteristics',
	'archives.preset.companyHabits',
	'archives.preset.companyNotes',
	'archives.preset.employment',
	'archives.preset.employedAt',
	'archives.preset.employees',
	'archives.preset.department',
	'archives.preset.title',
	'archives.preset.status',
	'archives.preset.current',
	'archives.preset.past',
	'archives.preset.keyRole',
	'archives.preset.none',
	'archives.preset.leader',
	'archives.preset.contact',
	'archives.preset.relatedCompany',
	'archives.preset.originalRelation',
	'archives.preset.reportsTo',
	'archives.preset.reports',
	'archives.preset.colleague',
	'archives.preset.friend',
	'archives.preset.customRelation',
	'archives.preset.customInverse',
	'archives.preset.quick',
	'archives.preset.basic',
	'archives.preset.full',
	'archives.preset.details',
	'archives.preset.belongingBelonging',
	'archives.preset.belongingCategory',
	'archives.preset.belongingImage',
	'archives.preset.belongingSpecification',
	'archives.preset.belongingPurchaseDate',
	'archives.preset.belongingPurchase',
	'archives.preset.belongingExitDate',
	'archives.preset.belongingSale',
	'archives.preset.belongingOwnerId',
	'archives.preset.belongingRelatedPeople',
	'archives.preset.belongingCompanyId',
	'archives.preset.belongingReceipt',
	'archives.preset.belongingEvents',
	'archives.preset.belongingEventDate',
	'archives.preset.belongingCommandHash',
	'archives.preset.belongingUsing',
	'archives.preset.belongingStatus',
	'archives.preset.belongingIdle',
	'archives.preset.belongingSold',
	'archives.preset.belongingDiscard',
] as const;
export type PresetLabelKey = (typeof PRESET_LABEL_KEYS)[number];
export interface LocalizedLabel {
	label: string;
	labelKey?: PresetLabelKey;
}
export function isPresetLabelKey(value: unknown): value is PresetLabelKey {
	return typeof value === 'string' && PRESET_LABEL_KEYS.some((key) => key === value);
}
export function displayLabel(value: { label: string; labelKey?: string } | undefined, fallback = ''): string {
	return value ? (isPresetLabelKey(value.labelKey) ? t(value.labelKey) : value.label) : fallback;
}
export function customLabel<T extends object>(
	value: T,
	label: string,
	property: 'label' | 'forwardLabel' | 'inverseLabel' = 'label',
): T {
	const result = { ...value, [property]: label } as T & Record<string, unknown>;
	delete result[`${property}Key`];
	return result;
}
export function displayRelationLabel(
	value: { forwardLabel: string; inverseLabel: string; forwardLabelKey?: string; inverseLabelKey?: string },
	forward: boolean,
): string {
	return displayLabel({
		label: forward ? value.forwardLabel : value.inverseLabel,
		labelKey: forward ? value.forwardLabelKey : value.inverseLabelKey,
	});
}

import { BELONGING_TYPE_ID } from '../../api';
import type { ArchiveTypeDefinition, FieldDefinition, RecordTemplate } from '../schema/model';
import type { PresetLabelKey } from '../schema/labels';
import { initialBelongingValues } from './lifecycle';
const field = (fieldId: string, label: string, labelKey: PresetLabelKey, kind: FieldDefinition['kind'] = 'text', extra: Partial<FieldDefinition> = {}): FieldDefinition => ({ fieldId, storageKey: fieldId, label, labelKey, kind, ...extra });
const stateOptions = ['using', 'idle', 'sold', 'discard'].map(value => ({ id: value, value, label: value, labelKey: `archives.preset.belonging${value[0]!.toUpperCase()}${value.slice(1)}` as PresetLabelKey }));
export const BELONGING: ArchiveTypeDefinition = {
	kind: 'type', id: BELONGING_TYPE_ID, label: 'Belongings', labelKey: 'archives.preset.belongingBelonging', icon: 'package',
	folder: 'belongings', enabled: true, nameFieldId: 'name', defaultFormId: 'form-belonging-full', defaultTemplateId: 'template-belonging-default', fields: [
		field('name', 'Name', 'archives.preset.name', 'text', { required: true }),
		field('category', 'Category', 'archives.preset.belongingCategory'),
		field('image', 'Image', 'archives.preset.belongingImage', 'file'),
		field('specification', 'Specification', 'archives.preset.belongingSpecification', 'markdown'),
		field('notes', 'Notes', 'archives.preset.notes', 'markdown'),
		field('purchaseDate', 'Purchase date', 'archives.preset.belongingPurchaseDate', 'date', { precision: 'mixed' }),
		field('purchase', 'Purchase amount', 'archives.preset.belongingPurchase', 'money'),
		field('status', 'Status', 'archives.preset.belongingStatus', 'select', { required: true, options: stateOptions }),
		field('exitDate', 'Exit date', 'archives.preset.belongingExitDate', 'date', { precision: 'day' }),
		field('sale', 'Resale proceeds', 'archives.preset.belongingSale', 'money'),
		field('receipt', 'Receipt', 'archives.preset.belongingReceipt', 'file'),
		field('ownerId', 'Owner ID', 'archives.preset.belongingOwnerId'),
		field('relatedPeople', 'Related people IDs', 'archives.preset.belongingRelatedPeople', 'strings', { uniqueItems: true }),
		field('companyId', 'Company ID', 'archives.preset.belongingCompanyId'),
		field('events', 'Lifecycle events', 'archives.preset.belongingEvents', 'table', { columns: [
			field('status', 'Status', 'archives.preset.belongingStatus', 'select', { required: true, options: stateOptions }),
			field('date', 'Effective date', 'archives.preset.belongingEventDate', 'date', { required: true, precision: 'day' }),
			field('exitDate', 'Exit date', 'archives.preset.belongingExitDate', 'date', { precision: 'day' }),
			field('sale', 'Resale proceeds', 'archives.preset.belongingSale', 'money'),
			field('commandHash', 'Operation hash', 'archives.preset.belongingCommandHash', 'text', { required: true }),
		] }),
	],
};
export const BELONGING_TEMPLATE: RecordTemplate = {
	kind: 'template', id: 'template-belonging-default', typeId: BELONGING_TYPE_ID,
	label: 'Belongings', labelKey: 'archives.preset.belongingBelonging', defaults: initialBelongingValues({}), body: '',
};

import type { PublishRelationType } from './relation-model';
const base = (id: string, label: string, inverseLabel: string, sourceTypes: string[], targetTypes: string[]): PublishRelationType => ({
	relationTypeId: id, label, inverseLabel, sourceTypes, targetTypes, direction: 'directed', fields: [], temporal: true, allowSelf: false, acyclic: false,
	cardinality: { scope: 'overlap', includeDrafts: false }, duplicates: { policy: 'overlap', fieldIds: [], contextRoles: [] }, contextRoles: [], deletePolicy: 'retain',
});
/** Stable preset semantics; presentation translations must not change the persisted definition hash. No legacy row is converted here. */
export function relationPresets(): PublishRelationType[] {
	const employment = base('employment', 'Employment', 'Employees', ['person'], ['company']);
	employment.fields = [
		{ fieldId: 'department', storageKey: 'department', label: 'Department', codec: 'text' },
		{ fieldId: 'title', storageKey: 'job-title', label: 'Title', codec: 'text' },
		{ fieldId: 'keyRole', storageKey: 'key-role', label: 'Key role', codec: 'choice', options: [{ id: 'none', label: 'None' }, { id: 'leader', label: 'Leader' }, { id: 'contact', label: 'Contact' }] },
		{ fieldId: 'notes', storageKey: 'employment-notes', label: 'Notes', codec: 'markdown' },
	];
	employment.duplicates.fieldIds = ['department', 'title'];
	const reports = base('reportsTo', 'Reports to', 'Direct reports', ['person'], ['person']); reports.acyclic = true;
	const friends = base('friend', 'Friend', 'Friend', ['person'], ['person']); friends.direction = 'symmetric';
	const colleague = { ...structuredClone(friends), relationTypeId: 'colleague', label: 'Colleague', inverseLabel: 'Colleague', contextRoles: [{ role: 'company', types: ['company'], required: false }] };
	colleague.duplicates.contextRoles = ['company'];
	const participates = base('participates', 'Participates in', 'Participants', ['*'], ['*']);
	participates.fields = [{ fieldId: 'role', storageKey: 'participation-role', label: 'Role', codec: 'text' }]; participates.duplicates.fieldIds = ['role'];
	const responsible = base('responsible', 'Responsible person', 'Responsible for', ['*'], ['person']); responsible.cardinality.sourceMax = 1;
	return [employment, reports, friends, colleague, participates, responsible, base('partner', 'Partner', 'Partner of', ['*'], ['*'])];
}

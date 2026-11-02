import { afterEach, describe, expect, test } from 'vitest';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import { messages } from '../../i18n';
import { customLabel, displayLabel, displayRelationLabel } from './labels';
import { validateDefinition } from './definitions';
import { PERSON, presetRevisions } from './presets';
registerMessages(messages);
afterEach(() => setLanguage('zh'));

describe('built-in label metadata', () => {
	test('language changes presentation without changing definitions, paths or revision identity', async () => {
		setLanguage('en');
		const english = await presetRevisions();
		expect(displayLabel(PERSON)).toBe('People');
		expect(displayLabel(PERSON.fields[0])).toBe('Name');
		setLanguage('zh');
		const chinese = await presetRevisions();
		expect(displayLabel(PERSON)).toBe('个人档案');
		expect(displayLabel(PERSON.fields[0])).toBe('名称');
		expect(chinese).toEqual(english);
		expect(PERSON.folder).toBe('people');
		for (const revision of chinese) validateDefinition(revision.definition, [PERSON]);
	});
	test('raw legacy/user labels are never inferred from their text; editing removes only the corresponding key', () => {
		expect(displayLabel({ label: 'People' })).toBe('People');
		expect(displayLabel({ label: '个人档案' })).toBe('个人档案');
		const custom = customLabel(PERSON, '我的 客户');
		expect(custom).not.toHaveProperty('labelKey');
		setLanguage('en');
		expect(displayLabel(custom)).toBe('我的 客户');
		setLanguage('zh');
		expect(displayLabel(custom)).toBe('我的 客户');
		const relation = {
			forwardLabel: 'Employed at',
			forwardLabelKey: 'archives.preset.employedAt',
			inverseLabel: 'Employees',
			inverseLabelKey: 'archives.preset.employees',
		};
		expect(displayRelationLabel(relation, true)).toBe('任职于');
		const renamed = customLabel(relation, '合作', 'forwardLabel');
		expect(displayRelationLabel(renamed, true)).toBe('合作');
		expect(displayRelationLabel(renamed, false)).toBe('任职人员');
	});
	test('only known preset metadata is accepted, including nested fields and options', () => {
		expect(() => validateDefinition({ ...PERSON, labelKey: 'workbench.contacts' })).toThrow();
		expect(() =>
			validateDefinition({ ...PERSON, fields: [{ ...PERSON.fields[0], labelKey: 'archives.preset.typo' }] }),
		).toThrow();
		expect(() =>
			validateDefinition({
				...PERSON,
				fields: [
					{
						...PERSON.fields[0],
						kind: 'select',
						options: [{ id: 'a', value: 'a', label: 'A', labelKey: 'untrusted' }],
					},
				],
			}),
		).toThrow();
		expect(displayLabel({ label: 'raw', labelKey: 'workbench.contacts' })).toBe('raw');
	});
});

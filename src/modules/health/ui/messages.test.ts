import { expect, test } from 'vitest';
import { messages } from './messages';
import { messages as moduleMessages } from '../i18n';
test('lazy health page dictionary has matching bilingual keys and interpolation fields', () => {
	expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.zh).sort());
	for (const key of Object.keys(messages.en) as Array<keyof typeof messages.en>) {
		const fields = (text: string) => [...text.matchAll(/\{([\w#]+)\}/g)].map(match => match[1]).sort();
		expect(fields(messages.en[key]), key).toEqual(fields(messages.zh[key]));
	}
});

test('health notification dictionary keeps bilingual keys and placeholders aligned', () => {
	expect(Object.keys(moduleMessages.en).sort()).toEqual(Object.keys(moduleMessages.zh).sort());
	for (const key of Object.keys(moduleMessages.en) as Array<keyof typeof moduleMessages.en>) {
		const fields = (text: string) => [...text.matchAll(/\{([\w#]+)\}/g)].map(match => match[1]).sort();
		expect(fields(moduleMessages.en[key]), key).toEqual(fields(moduleMessages.zh[key]));
	}
});

import { expect, test } from 'vitest';
import { messages as page } from './i18n';
import { messages as activation } from '../../i18n';

test('deferred diary strings retain both languages and matching placeholders while the rail title stays eager', () => {
	expect(Object.keys(page.en).sort()).toEqual(Object.keys(page.zh).sort());
	const placeholders = (value: string) => [...value.matchAll(/\{([\w#]+)\}/g)].map(match => match[1]).sort();
	for (const key of Object.keys(page.en) as Array<keyof typeof page.en>) {
		expect(page.en[key]).not.toBe(''); expect(page.zh[key]).not.toBe('');
		expect(placeholders(page.en[key])).toEqual(placeholders(page.zh[key]));
	}
	expect(activation.en['navigator.diary.title']).toBe('Diary book');
	expect(activation.zh['navigator.diary.title']).toBe('书页日记');
	expect(Object.keys(activation.en).filter(key => key.startsWith('navigator.diary.'))).toEqual(['navigator.diary.title']);
});

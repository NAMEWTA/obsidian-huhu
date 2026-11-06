import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { moment } from 'obsidian';
import { momentOf, nowMoment } from './datetime';

// Exercise the host boundary with the real package supplied by Obsidian.
vi.mock('obsidian', async () => {
	const { createRequire } = await import('node:module');
	const require = createRequire(createRequire(import.meta.url).resolve('obsidian/package.json'));
	const real: unknown = require('moment');
	require('moment/locale/zh-cn');
	return { moment: real };
});

let previousLocale: string;
beforeEach(() => {
	previousLocale = moment.locale();
	moment.locale('en');
	vi.useFakeTimers({ now: new Date(2026, 10, 5, 13, 7, 9), toFake: ['Date'] });
});
afterEach(() => {
	moment.locale(previousLocale);
	vi.useRealTimers();
});

test('preserves custom Git date formats, escaped text and the local clock', () => {
	expect(nowMoment().format('[git] YYYY/MM/DD HH:mm:ss [Q]Q')).toBe('git 2026/11/05 13:07:09 Q4');
	expect(nowMoment().format('YYYY-MM-DD HH:mm:ss')).toBe('2026-11-05 13:07:09');
});

test('uses the host Moment locale for relative time without changing it', () => {
	const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
	expect(momentOf(twoHoursAgo).fromNow()).toBe('2 hours ago');
	moment.locale('zh-cn');
	expect(momentOf(twoHoursAgo).fromNow()).toBe('2 小时前');
	expect(moment.locale()).toBe('zh-cn');
});

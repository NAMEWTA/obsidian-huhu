import { describe, expect, it } from 'vitest';
import { CookieImportError } from '../../core/cookies';
import { describeImportError, describeImportResult } from './result-message';

const t = (key: string, params: Record<string, string | number> = {}) =>
	key + JSON.stringify(params).replace(/[{}"]/g, '');
const base = { imported: 0, skipped: 0, googleSkipped: 0, decryptFailed: 0, source: 'Google Chrome (Ying)' };

describe('Cookie import messages', () => {
	it('leads with the success count and hides zero counts', () => {
		const m = describeImportResult({ ...base, imported: 5 }, 'Default', t);
		expect(m.kind).toBe('success');
		expect(m.title).toContain('browser.cookie.result');
		expect(m.lines).toEqual([]);
	});
	it('lists each reason on its own line with its own next step', () => {
		const m = describeImportResult(
			{
				...base,
				googleSkipped: 24,
				decryptFailed: 78,
				skipped: 2,
				warning: 'app-bound-encryption',
				fallback: 'locked',
			},
			'Default',
			t,
		);
		expect(m.kind).toBe('warning');
		expect(m.title).toContain('browser.cookie.resultNone');
		expect(m.lines).toHaveLength(4);
		expect(m.lines[2]).toContain('browser.cookie.decrypt.app-bound-encryption');
		expect(m.lines[2]).toContain('browser:Google Chrome');
	});
	it('offers retry for lock and browser failures only', () => {
		expect(describeImportError(new CookieImportError('locked', 'EBUSY'), t)).toMatchObject({
			code: 'locked',
			retry: true,
		});
		expect(describeImportError(new CookieImportError('browser-missing', 'x'), t).retry).toBe(false);
		const raw = describeImportError(new Error('EBUSY: resource busy'), t);
		expect(raw.text).toBe('browser.cookie.error.unknown');
		expect(raw.text).not.toContain('EBUSY');
	});
});

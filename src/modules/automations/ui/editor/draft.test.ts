import { beforeEach, expect, test } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { definition } from '../test-fixture';
import { draftError } from './draft';
import { normalizeUrl, urlError } from '../../core/actions/open-url';

beforeEach(() => setLanguage('en'));
const openUrl = (url: string) => ({ ...definition('Link'), action: { kind: 'open-url' as const, url } });

test('a bare host is read as an https address; other input is left alone', () => {
	expect(normalizeUrl(' example.com/a ')).toBe('https://example.com/a');
	expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
	expect(normalizeUrl('two words')).toBe('two words');
	expect(normalizeUrl('')).toBe('');
});
test('open-url asks for an address, not a prompt, and only accepts http and https', () => {
	expect(urlError('')).toBe(t('automation.urlRequired'));
	expect(draftError(openUrl(''), [], '/vault')).toBe(t('automation.urlRequired'));
	expect(draftError(openUrl('ftp://example.com'), [], '/vault')).toBe(t('automation.urlInvalid'));
	expect(draftError(openUrl('javascript:alert(1)'), [], '/vault')).toBe(t('automation.urlInvalid'));
	expect(draftError(openUrl('not a url'), [], '/vault')).toBe(t('automation.urlInvalid'));
	expect(draftError(openUrl('https://example.com'), [], '/vault')).toBeUndefined();
	expect(draftError(openUrl('example.com'), [], '/vault')).toBeUndefined();
});

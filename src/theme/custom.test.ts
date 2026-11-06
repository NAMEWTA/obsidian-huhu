import { expect, test } from 'vitest';
import { DEFAULT_CUSTOM, normalizeCustom } from './custom';
test('explicit user colors remain validated user data without a UI palette expansion', () => {
	expect(normalizeCustom({ light: { background: '#FFEEDD', foreground: 'url(evil)' } })).toEqual({
		light: { ...DEFAULT_CUSTOM.light, background: '#ffeedd' },
		dark: DEFAULT_CUSTOM.dark,
	});
});

import { expect, test } from 'vitest';
import { withTaskCompletion } from './completion';
test('completion stamps replace old dates, clear on undo, and preserve reminder/identity suffixes', () => {
	const now = new Date(2026, 9, 24, 9, 7);
	const line = '- [x] Work [due:: 2026-10-20] ✅ 2026-10-21 ⏰ 2026-10-24 10:00 <!--identity-->';
	const result = withTaskCompletion(line, true, now);
	expect(result).toBe(
		'- [x] [completion:: 2026-10-24 09:07] Work [due:: 2026-10-20] ⏰ 2026-10-24 10:00 <!--identity-->',
	);
	expect(withTaskCompletion(result, true, now)).toBe(result);
	expect(withTaskCompletion(result, false)).toBe('- [x] Work [due:: 2026-10-20] ⏰ 2026-10-24 10:00 <!--identity-->');
});

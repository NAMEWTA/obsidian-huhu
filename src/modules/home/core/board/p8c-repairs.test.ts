import { expect, test } from 'vitest';
import { retainSkillAssignments, skillGroup } from '../skills/groups';
test('deleted and already-orphaned group assignments remain visible in the ungrouped bucket', () => {
	const config = {
		groups: [
			{ id: 'gone', name: 'Gone' },
			{ id: 'keep', name: 'Keep', keywords: 'review' },
		],
		assignments: { review: 'gone', other: 'keep', orphan: 'old' },
	};
	const groups = config.groups.filter((g) => g.id !== 'gone');
	expect(skillGroup('review', { ...config, groups })).toBe('_none');
	expect(retainSkillAssignments(config, groups)).toEqual({ review: '_none', other: 'keep', orphan: '_none' });
	expect(skillGroup('new-review', { ...config, groups })).toBe('keep');
});

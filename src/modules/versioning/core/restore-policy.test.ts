import { expect, test } from 'vitest';
import { assertOrdinaryRestore } from './restore-policy';

test('ordinary Markdown properties and body mentions remain restorable', () => {
	for (const raw of ['plain huhu-type: archive-record', '---\ntitle: Note\ntags: [one]\n---\nbody', ''])
		expect(() => assertOrdinaryRestore(raw, raw)).not.toThrow();
});

test.each([
	'---\nhuhu-type: archive-record\n---\nbody',
	'---\n"huhu-type": archive-relation\n---\nbody',
	'\uFEFF---\r\nhuhu-type: archive-definition\r\n---\r\nbody',
	'---\nhuhu-type: null\n---\nbody',
	'---\nhuhu-type: [broken\n---\nbody',
	'---\nhuhu-type: archive-record\nbody',
])('managed or malformed properties cannot bypass restore admission: %s', raw => {
	expect(() => assertOrdinaryRestore(raw, null)).toThrow('versioning.restore.managed-record');
	expect(() => assertOrdinaryRestore(null, raw)).toThrow('versioning.restore.managed-record');
});

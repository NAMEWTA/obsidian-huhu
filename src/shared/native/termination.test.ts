import { expect, test } from 'vitest';
import fixtures from '../../../test/fixtures/native/terminal-termination-v1.json';
import { parseTerminationNotice } from './termination';

test('termination v1 accepts only negotiated, current and cross-field consistent scope evidence', () => {
	for (const row of fixtures.cases) {
		const parsed = parseTerminationNotice(row.wire, row.context);
		expect(!!parsed, row.name).toBe(row.valid);
		if (row.valid) {
			expect(parsed?.version, row.name).toBe(1);
			expect(parsed?.sequence, row.name).toBe(row.wire.sequence);
			expect(parsed?.evidence, row.name).toEqual(row.wire.evidence);
		}
	}
});

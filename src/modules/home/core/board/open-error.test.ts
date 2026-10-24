import { expect, test } from 'vitest';
import { BoardOpenError } from './open-error';
import { setDiagnosticRoots } from '../../../../shared/diagnostics/roots';

test('board failures identify their stage, retain the system code and redact absolute roots', () => {
	setDiagnosticRoots({ vault: 'C:\\Users\\tester\\Vault' });
	try {
		const cause = Object.assign(new Error('EACCES: C:\\Users\\tester\\Vault\\.huhu\\dashboards\\a.md'), {
			code: 'EACCES',
		});
		const error = new BoardOpenError('create', '.huhu/dashboards/a.md', cause);
		expect(error.stage).toBe('create');
		expect(error.message).toContain('.huhu/dashboards/a.md');
		expect(error.cause).toMatchObject({ code: 'EACCES', message: expect.stringContaining('<vault>') });
		expect(JSON.stringify(error.cause)).not.toContain('tester');
		expect(new BoardOpenError('path', 'C:\\Users\\tester\\Vault', cause).message).not.toContain('tester');
	} finally {
		setDiagnosticRoots({ vault: undefined });
	}
});

import { expect, test, vi } from 'vitest';
import { temporaryVault } from '../../../../../test/golden/temporary-vault';
import { createLedgerExport } from './ledger-csv';

test('CSV export preserves existing files, directories and a competing create', async () => {
	const vault = temporaryVault({ 'huhu/exports/expense-export-2026-10-31.csv': 'first' });
	try {
		await vault.app.vault.createFolder('huhu/exports/expense-export-2026-10-31-2.csv');
		const original = vault.app.vault.create.bind(vault.app.vault);
		let competed = false;
		vi.spyOn(vault.app.vault, 'create').mockImplementation(async (path, text) => {
			if (!competed) {
				competed = true;
				await original(path, 'concurrent');
			}
			return original(path, text);
		});
		expect(await createLedgerExport(vault.app, 'new', '2026-10-31')).toBe(
			'huhu/exports/expense-export-2026-10-31-4.csv',
		);
		expect(vault.read('huhu/exports/expense-export-2026-10-31.csv')).toBe('first');
		expect(vault.read('huhu/exports/expense-export-2026-10-31-3.csv')).toBe('concurrent');
		expect(vault.read('huhu/exports/expense-export-2026-10-31-4.csv')).toBe('new');
	} finally {
		vault.close();
	}
});

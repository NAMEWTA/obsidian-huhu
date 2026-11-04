import type { App } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../../shared/i18n';
import { BELONGING_TYPE_ID } from '../../../api';
import { memoryArchives } from '../../../services/generic/test-port';
import { ArchivesApplication } from '../../../services/generic/application';
import type { GenericArchivesHost } from '../../../services/generic/page-host';
import { ArchivesContent } from '../../generic/workbench-page';
import BelongingsReport from './BelongingsReport';
import { messages } from './report-i18n';

// Canvas drawing is verified by the Lead-owned browser runner; owner queries and DOM remain real.
vi.mock('chart.js/auto', () => ({ default: class { destroy() {} } }));

afterEach(() => { cleanup(); setLanguage('zh'); vi.useRealTimers(); });
test('real belonging entry opens an annual report, changes year, preserves data on errors and returns', async () => {
	vi.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z'), toFake: ['Date'] });
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	try {
		await application.commands.belongings.install();
		await application.commands.create({ operationId: 'old-camera', typeId: BELONGING_TYPE_ID, values: { name: 'Camera', category: 'Photography', purchaseDate: '2025-12-01', purchase: { amount: '100', currency: 'CNY' } } });
		await application.commands.create({ operationId: 'new-bag', typeId: BELONGING_TYPE_ID, values: { name: 'Bag', category: 'Everyday', purchaseDate: '2026-02-01', purchase: { amount: '20', currency: 'USD' } } });
		const writes = f.files.writes.length;
		const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
		render(<TestProviders><ArchivesContent host={host} app={{} as App} owner={document.body} state={{ section: BELONGING_TYPE_ID, search: '', offset: 0, scroll: 0 }} updateState={() => {}} open={async () => {}} guard={() => {}} /></TestProviders>);
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Annual report' }));
		await screen.findByRole('heading', { name: 'Annual report' });
		expect((await screen.findByTestId('report-purchased-USD')).textContent).toBe('USD 20');
		expect(screen.queryByTestId('report-purchased-CNY')).toBeNull();
		await user.clear(screen.getByLabelText('Report year'));
		await user.type(screen.getByLabelText('Report year'), '2025');
		await user.click(screen.getByRole('button', { name: 'Update report' }));
		expect((await screen.findByTestId('report-purchased-CNY')).textContent).toBe('CNY 100');
		expect(screen.getByText('Photography')).toBeTruthy();
		const read = f.files.read.bind(f.files);
		f.files.read = () => Promise.reject(new Error('Read failure'));
		await f.runtime.reload();
		expect((await screen.findByRole('alert')).textContent).toContain('Previous valid report');
		expect(screen.getByTestId('report-purchased-CNY').textContent).toBe('CNY 100');
		f.files.read = read;
		await user.click(screen.getByRole('button', { name: 'Retry' }));
		await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
		await user.clear(screen.getByLabelText('Report year'));
		await user.type(screen.getByLabelText('Report year'), '1900');
		await user.click(screen.getByRole('button', { name: 'Update report' }));
		expect(await screen.findByText('No records for this year')).toBeTruthy();
		await user.tab();
		await user.click(screen.getByRole('button', { name: 'Back to belongings' }));
		expect(await screen.findByRole('heading', { name: 'Inventory cost' })).toBeTruthy();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annual report' }));
		expect(f.files.writes.length).toBe(writes);
	} finally { cleanup(); f.runtime.dispose(); }
});


test('report loading waits for real file reads and local labels have complete bilingual placeholders', async () => {
	setLanguage('en');
	expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.zh).sort());
	for (const key of Object.keys(messages.en) as Array<keyof typeof messages.en>) {
		expect([...messages.en[key].matchAll(/\{(\w+)\}/g)].map(match => match[1])).toEqual([...messages.zh[key].matchAll(/\{(\w+)\}/g)].map(match => match[1]));
		for (const language of ['en', 'zh'] as const) { setLanguage(language); expect(t(key)).toBe(messages[language][key]); }
	}
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	let release = () => {};
	try {
		await application.commands.belongings.install();
		const read = f.files.read.bind(f.files), gate = new Promise<void>(resolve => { release = resolve; });
		f.files.read = async file => { await gate; return read(file); };
		const loading = f.runtime.reload();
		render(<TestProviders><BelongingsReport application={application} back={() => {}} /></TestProviders>);
		expect(await screen.findByRole('status')).toBeTruthy();
		expect(screen.queryByText('No records for this year')).toBeNull();
		release(); await loading;
		expect(await screen.findByText('No records for this year')).toBeTruthy();
		setLanguage('zh');
		expect(await screen.findByRole('heading', { name: '年度报告' })).toBeTruthy();
	} finally { release(); cleanup(); f.runtime.dispose(); }
});

test('report renders separate currencies and explicit unknown, zero-day and negative-cost states', async () => {
	vi.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z'), toFake: ['Date'] });
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	try {
		await application.commands.belongings.install();
		for (const [name, currency, price, proceeds] of [['Unknown sale', 'CNY', '10', null], ['Zero sale', 'CNY', '0', '0'], ['Negative net', 'USD', '10', '20']] as const) {
			const created = await application.commands.create({ operationId: name.replaceAll(' ', '-'), typeId: BELONGING_TYPE_ID, values: { name, purchaseDate: '2026-01-01', purchase: { amount: price, currency } } });
			await application.commands.belongings.transition({ operationId: `${created.id}-sold`, id: created.id, expectedHash: created.contentHash, status: 'sold', date: '2026-01-01', sale: proceeds === null ? null : { amount: proceeds, currency } });
		}
		await application.commands.create({ operationId: 'partial', typeId: BELONGING_TYPE_ID, values: { name: 'Partial date', purchaseDate: '2025-12' } });
		render(<TestProviders><BelongingsReport application={application} back={() => {}} /></TestProviders>);
		expect((await screen.findByTestId('report-purchased-CNY')).textContent).toBe('CNY 10');
		expect(screen.getByTestId('report-purchased-USD').textContent).toBe('USD 10');
		expect(screen.getByTestId('report-recovered-CNY').textContent).toBe('CNY 0');
		expect(screen.getByTestId('report-recovered-USD').textContent).toBe('USD 20');
		expect(screen.getByText('Negative net cost · recovery exceeds purchase')).toBeTruthy();
		expect(screen.getAllByText('Zero holding days · daily cost unavailable')).toHaveLength(3);
		expect(screen.getAllByText('Unknown sale proceeds: 1 · known recovery only')).toHaveLength(2);
		expect(screen.getByText('Unknown or imprecise holding days excluded from median: 1')).toBeTruthy();
	} finally { cleanup(); f.runtime.dispose(); }
});

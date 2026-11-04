import type { App } from 'obsidian';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { BELONGING_TYPE_ID } from '../../api';
import { memoryArchives } from '../../services/generic/test-port';
import { ArchivesApplication } from '../../services/generic/application';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import { ArchivesContent } from '../generic/workbench-page';
import type { ArchivePageState } from '../generic/page-state';
import { useState } from 'react';

afterEach(() => { cleanup(); setLanguage('zh'); });
async function setup() {
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	await application.commands.belongings.install();
	const item = await application.commands.create({ operationId: 'camera', typeId: BELONGING_TYPE_ID, values: { name: 'Camera', purchaseDate: '2026-01-01', purchase: { amount: '100', currency: 'CNY' } } });
	const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
	function Page() {
		const [state, setState] = useState<ArchivePageState>({ section: BELONGING_TYPE_ID, search: '', offset: 0, scroll: 0 });
		return <ArchivesContent host={host} app={{} as App} owner={document.body} state={state} updateState={patch => setState(value => ({ ...value, ...patch }))} open={async (section, resourceId) => { setState(value => ({ ...value, section: section ?? value.section, selectedId: resourceId })); }} guard={() => {}} />;
	}
	return { ...f, application, item, Page };
}

test('production belonging route uses shared statistics for KPIs, cards and detail', async () => {
	const f = await setup();
	try {
		render(<TestProviders><f.Page /></TestProviders>);
		expect(await screen.findByRole('heading', { name: 'Inventory cost' })).toBeTruthy();
		const stats = (await f.application.query.belongings()).statistics;
		expect(screen.getByTestId('inventory-CNY').textContent).toBe(`CNY ${stats.summary.currencies[0]!.inventory}`);
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Camera' }));
		expect((await screen.findByTestId('detail-net-cost')).textContent).toBe('CNY 100');
		await user.click(screen.getByRole('button', { name: 'Edit full archive' }));
		await user.click(await screen.findByRole('button', { name: 'Edit' }));
		expect(await screen.findByLabelText('Name *', { selector: 'input' })).toBeTruthy();
	} finally { cleanup(); f.runtime.dispose(); }
});

test('dated transitions undo through the real owner and a later edit conflicts without being overwritten', async () => {
	const f = await setup();
	try {
		render(<TestProviders><f.Page /></TestProviders>);
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Camera' }));
		await user.click(await screen.findByRole('button', { name: 'Sold' }));
		await user.type(screen.getByLabelText('Resale proceeds'), '40');
		await user.click(screen.getByRole('button', { name: 'Confirm change' }));
		await waitFor(() => expect(screen.getByTestId('detail-net-cost').textContent).toBe('CNY 60'));
		await user.click(await screen.findByRole('button', { name: 'Undo change' }));
		await waitFor(() => expect(screen.getByTestId('detail-net-cost').textContent).toBe('CNY 100'));
		expect((await f.application.query.belongings()).items[0]?.events).toHaveLength(2);
		await user.click(screen.getByRole('button', { name: 'Idle' }));
		await user.click(screen.getByRole('button', { name: 'Confirm change' }));
		await screen.findByRole('button', { name: 'Undo change' });
		const session = await f.application.commands.beginEdit(f.item.id);
		session.draft.category = 'Other writer'; session.dirtyFields = ['category'];
		await f.application.commands.save({ operationId: 'dom-external', session });
		await waitFor(() => expect(screen.getByText('Other writer')).toBeTruthy());
		const writes = f.files.writes.length;
		await user.click(screen.getByRole('button', { name: 'Undo change' }));
		expect((await screen.findByRole('alert')).textContent).toContain('changed elsewhere');
		expect(f.files.writes.length).toBe(writes);
		expect((await f.application.query.belongings()).items[0]).toMatchObject({ category: 'Other writer', status: 'idle' });
	} finally { cleanup(); f.runtime.dispose(); }
});

test('uninstalled preset has a reachable route, browses without writes and installs only on request', async () => {
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	const { genericArchivesWorkbench } = await import('../../services/generic/workbench');
	const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
	try {
		expect(genericArchivesWorkbench(() => application).navigation!().some(item => item.target?.section === BELONGING_TYPE_ID)).toBe(true);
		render(<TestProviders><ArchivesContent host={host} app={{} as App} owner={document.body} state={{ section: BELONGING_TYPE_ID, search: '', offset: 0, scroll: 0 }} updateState={() => {}} open={async () => {}} guard={() => {}} /></TestProviders>);
		await screen.findByText('No belongings yet');
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add item in archive' }).disabled).toBe(true);
		expect(f.files.writes).toHaveLength(0);
		let release = () => {};
		const installed = new Promise<void>(resolve => { release = application.catalog.subscribe(() => {
			if (application.catalog.snapshot().templates.some(item => item.definition.id === 'template-belonging-default')) { release(); resolve(); }
		}); });
		try {
			await userEvent.setup().click(screen.getByRole('button', { name: 'Install belonging preset' }));
			await installed;
		} finally { release(); }
		await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add item in archive' }).disabled).toBe(false));
		expect(f.runtime.index.definition(BELONGING_TYPE_ID)).toBeTruthy();
	} finally { cleanup(); f.runtime.dispose(); }
});

test('file read diagnostics preserve previously loaded belongings instead of showing a false empty state', async () => {
	const f = await setup();
	try {
		render(<TestProviders><f.Page /></TestProviders>);
		await screen.findByRole('button', { name: 'Camera' });
		const read = f.files.read.bind(f.files);
		f.files.read = () => Promise.reject(new Error('Read failure'));
		await f.runtime.reload();
		expect((await screen.findByRole('alert')).textContent).toContain('Read failed');
		expect(screen.getByRole('button', { name: 'Camera' })).toBeTruthy();
		expect(screen.queryByText('No belongings yet')).toBeNull();
		f.files.read = read; await f.runtime.reload();
		await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
	} finally { cleanup(); f.runtime.dispose(); }
});

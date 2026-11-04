import type { App } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { BELONGING_TYPE_ID } from '../../api';
import { ArchivePage } from '../../ui/generic/ArchivePage';
import { ValueForm } from '../../ui/generic/FieldRenderer';
import { at } from '../../ui/generic/common';
import { ArchivesApplication } from './application';
import { memoryArchives } from './test-port';
import type { GenericArchivesHost } from './page-host';

afterEach(() => { cleanup(); setLanguage('zh'); });

test('installed belonging defaults allow active creation through the real archive page and editor', async () => {
	setLanguage('en');
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	try {
		await application.commands.belongings.install();
		const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
		const navigate = vi.fn(async () => {});
		render(<TestProviders><ArchivePage host={host} app={{} as App} owner={document.body}
			state={{ section: BELONGING_TYPE_ID, search: '', offset: 0, scroll: 0 }} updateState={() => {}}
			navigate={navigate} guard={() => {}} /></TestProviders>);
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: at('newRecord') }));
		fireEvent.change(await screen.findByLabelText('Name *', { selector: 'input' }), { target: { value: 'Created through default form' } });
		await user.click(screen.getByRole('button', { name: at('saveActive') }));
		await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
		await waitFor(() => expect(application.catalog.snapshot().types.find(type => type.id === BELONGING_TYPE_ID)?.count).toBe(1));
		const result = await application.query.belongings();
		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toMatchObject({ name: 'Created through default form', status: 'using', exitDate: '', sale: null, events: [] });
	} finally { cleanup(); f.runtime.dispose(); }
});

test.each([['en', 'Status'], ['zh', '状态']] as const)('belonging status labels render in %s without reusing employment labels', async (language, label) => {
	setLanguage(language);
	const f = await memoryArchives(), application = new ArchivesApplication(f.runtime);
	try {
		await application.commands.belongings.install();
		const snapshot = application.catalog.snapshot(), summary = snapshot.types.find(type => type.id === BELONGING_TYPE_ID)!;
		const revision = await application.query.definition(summary.revisionId);
		if (revision?.definition.kind !== 'type') throw new Error('Expected belonging type');
		const type = revision.definition, form = snapshot.forms.find(item => item.definition.id === type.defaultFormId)?.definition;
		if (form?.kind !== 'form') throw new Error('Expected default form');
		render(<TestProviders><ValueForm fields={type.fields} form={form} values={{ status: 'using', events: [{ rowId: 'history', values: { status: 'sold' } }] }} onChange={() => {}} /></TestProviders>);
		const statuses = screen.queryAllByRole<HTMLButtonElement>('combobox', { name: label });
		expect(statuses).toHaveLength(2);
		expect(statuses.every(control => control.disabled)).toBe(true);
		expect(screen.queryByText(t('archives.preset.status'), { exact: false })).toBeNull();
	} finally { cleanup(); f.runtime.dispose(); }
});

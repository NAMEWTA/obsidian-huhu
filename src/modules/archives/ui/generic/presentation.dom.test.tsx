import type { App } from 'obsidian';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { memoryArchives } from '../../services/generic/test-port';
import { ArchivesApplication } from '../../services/generic/application';
import { PERSON } from '../../core/schema/presets';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import { ArchivePage } from './ArchivePage';
import { displayFields } from './display-fields';

afterEach(() => { cleanup(); setLanguage('zh'); });

test('list and cards share type fields and timestamps while hidden record values survive', async () => {
	setLanguage('en');
	const { runtime } = await memoryArchives();
	try {
		const application = new ArchivesApplication(runtime);
		const type = { ...PERSON, id: 'projection', folder: 'Projection', displayFields: ['region'] };
		await application.commands.publishDefinition({ operationId: 'projection-v1', expectedHeads: [], definition: type });
		await application.commands.create({ operationId: 'projected', typeId: type.id, values: { name: 'Shared projection', region: 'Shanghai', phones: ['Secret phone'] } });
		const host = { application, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as unknown as GenericArchivesHost;
		const page = (layout: 'table' | 'card') => <TestProviders><ArchivePage host={host} app={{} as App} owner={document.body}
			state={{ section: type.id, search: '', offset: 0, scroll: 0, layout }} updateState={() => {}} navigate={async () => {}} guard={() => {}} /></TestProviders>;
		const view = render(page('table'));
		await screen.findByRole('button', { name: 'Shared projection' });
		expect(screen.getByRole('columnheader', { name: 'Created' })).toBeTruthy();
		expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeTruthy();
		expect(screen.getByText('Shanghai')).toBeTruthy();
		expect(screen.queryByText('Secret phone')).toBeNull();
		view.rerender(page('card'));
		await waitFor(() => expect(view.container.querySelector('article')?.textContent).toContain('Shanghai'));
		expect(view.container.querySelector('article')?.textContent).toContain('Created');
		expect(view.container.querySelector('article')?.textContent).toContain('Updated');
		expect((await application.query.entity('projected'))?.values.phones).toEqual(['Secret phone']);
		view.unmount();
	} finally { runtime.dispose(); }
});

test('default fields, explicit empty selection and archived fields have one projection rule', () => {
	expect(displayFields({ ...PERSON, displayFields: [] })).toEqual([]);
	expect(displayFields({ ...PERSON, displayFields: ['name', 'region'], fields: PERSON.fields.map(field => field.fieldId === 'region' ? { ...field, archived: true } : field) })).toEqual([]);
	expect(displayFields(PERSON)).not.toContain('name');
});

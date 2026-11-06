import { test, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { EntityPicker } from './RelationPanel';
import { ArchivesApplication } from '../../services/generic/application';
import { memoryArchives } from '../../services/generic/test-port';
import { setLanguage } from '../../../../shared/i18n';
test('all same-name valid relation targets remain reachable beyond page one', async () => {
	setLanguage('en');
	const m = await memoryArchives(),
		a = new ArchivesApplication(m.runtime);
	try {
		const type = {
			kind: 'type' as const,
			id: 'review-many',
			label: 'Review many',
			icon: 'files',
			folder: 'review-many',
			enabled: true,
			nameFieldId: 'name',
			fields: [
				{ fieldId: 'name', storageKey: 'review-name', label: 'Name', kind: 'text' as const, required: true },
			],
		};
		await a.commands.publishDefinition({ operationId: 'review-many-schema', expectedHeads: [], definition: type });
		for (let i = 0; i < 121; i++)
			await a.commands.create({ operationId: 'review-many-' + i, typeId: type.id, values: { name: 'Same' } });
		const all = await a.query.entities({ typeId: type.id, states: ['active', 'draft'], limit: 500 }),
			page = await a.query.entities({ typeId: type.id, states: ['active', 'draft'], limit: 50 });
		expect(all.total).toBe(121);
		const missing = all.items.find((x) => !page.items.some((y) => y.id === x.id))!;
		const idSearch = await a.query.entities({
			typeId: type.id,
			states: ['active', 'draft'],
			search: missing.id,
			limit: 50,
		});
		const pathSearch = await a.query.entities({
			typeId: type.id,
			states: ['active', 'draft'],
			search: missing.path,
			limit: 50,
		});
		render(
			<TestProviders>
				<EntityPicker application={a} typeIds={[type.id]} label="Target" value="" change={() => {}} />
			</TestProviders>,
		);

		await waitFor(() => expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(false));
		for (let pageIndex = 0; pageIndex < 3; pageIndex++) {
			if (pageIndex) {
				fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
				fireEvent.click(screen.getByRole('button', { name: 'Next' }));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(false),
				);
			}
			fireEvent.click(screen.getByRole('combobox', { name: 'Target' }));
			const expected = all.items.slice(pageIndex * 50, (pageIndex + 1) * 50);
			await waitFor(() => expect(screen.getAllByRole('option').length).toBe(expected.length + 1));
			for (const item of expected)
				expect(
					screen.getByRole('option', {
						name: `${item.name} · ${item.typeId} · ${item.id.slice(0, 8)} · ${item.path}`,
					}),
				).toBeTruthy();
		}
		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
		expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
		cleanup();
		render(
			<TestProviders>
				<EntityPicker application={a} typeIds={[type.id]} label="Target" value={missing.id} change={() => {}} />
			</TestProviders>,
		);
		await waitFor(() =>
			expect(screen.getByRole('combobox', { name: 'Target' }).textContent).toContain(missing.path),
		);
	} finally {
		cleanup();
		m.runtime.dispose();
	}
});

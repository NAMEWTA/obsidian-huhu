import { test, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { RelationPanel } from './RelationPanel';
import { ArchivesApplication } from '../../services/generic/application';
import { memoryArchives } from '../../services/generic/test-port';
import { EMPLOYMENT, PERSON } from '../../core/schema/presets';
import { setLanguage } from '../../../../shared/i18n';
beforeEach(() => setLanguage('en'));
test('a custom relation editor retains its session during reload and completes confirmed discard', async () => {
	const memory = await memoryArchives(),
		application = new ArchivesApplication(memory.runtime);
	let release = () => {};
	let reload: Promise<void> | undefined;
	try {
		const type = {
			...EMPLOYMENT,
			id: 'review-custom-relation',
			label: 'Custom relation',
			labelKey: undefined,
			sourceTypes: [PERSON.id],
			targetTypes: [PERSON.id],
			activeWhen: undefined,
			fields: [{ fieldId: 'memo', storageKey: 'memo', label: 'Memo', kind: 'text' as const }],
		};
		delete type.labelKey;
		delete type.activeWhen;
		await application.commands.publishDefinition({
			operationId: 'custom-relation-schema',
			expectedHeads: [],
			definition: type,
		});
		const receipt = await application.commands.create({
			operationId: 'relation-source',
			typeId: PERSON.id,
			values: { name: 'Source' },
		});
		const entity = (await application.query.entity(receipt.id))!;
		const view = render(
			<TestProviders>
				<RelationPanel
					application={application}
					entity={entity}
					app={{} as never}
					owner={document.body}
					guard={() => {}}
					open={() => {}}
				/>
			</TestProviders>,
		);
		// Choose the custom type through the actual selector.
		fireEvent.click(screen.getByRole('combobox', { name: 'Relationship type' }));
		fireEvent.click(await screen.findByRole('option', { name: 'Custom relation' }));
		fireEvent.click(screen.getByRole('button', { name: 'Add relationship' }));
		const input = await screen.findByLabelText('Memo', { selector: 'input' });
		fireEvent.change(input, { target: { value: 'Unsaved relation' } });
		input.focus();
		await waitFor(async () =>
			expect((await application.commands.drafts())[0]?.draft.memo).toBe('Unsaved relation'),
		);
		const read = memory.files.read.bind(memory.files),
			gate = new Promise<void>((resolve) => {
				release = resolve;
			});
		memory.files.read = async (file) => {
			await gate;
			return read(file);
		};
		await act(async () => {
			reload = memory.runtime.reload();
			await Promise.resolve();
		});
		expect(input.isConnected).toBe(true);
		expect(document.activeElement).toBe(input);
		await act(async () => {
			release();
			await reload;
		});
		expect(await screen.findByLabelText('Memo', { selector: 'input' })).toBe(input);
		expect((input as HTMLInputElement).value).toBe('Unsaved relation');
		let complete = () => {};
		const pending = new Promise<void>((resolve) => {
			complete = resolve;
		});
		const discard = vi.spyOn(application.commands, 'discardDraft').mockImplementation(() => pending);
		fireEvent.click(screen.getByRole('button', { name: 'Discard local draft' }));
		fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard local draft' }));
		await waitFor(() => expect(discard).toHaveBeenCalledOnce());
		await act(async () => {
			complete();
			await pending;
		});
		expect(await screen.findByRole('button', { name: 'Add relationship' })).toBeTruthy();
		view.unmount();
	} finally {
		release();
		if (reload) await reload;
		cleanup();
		memory.runtime.dispose();
	}
});

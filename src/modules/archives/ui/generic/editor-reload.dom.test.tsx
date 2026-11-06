import { test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { ArchivePage } from './ArchivePage';
import { ArchivesApplication } from '../../services/generic/application';
import { memoryArchives } from '../../services/generic/test-port';
import { setLanguage } from '../../../../shared/i18n';
beforeEach(() => setLanguage('en'));
test.each([false, true])('a custom-type live editor survives real reload and failed retry=%s', async (fail) => {
	const m = await memoryArchives(),
		a = new ArchivesApplication(m.runtime);
	let release = () => {};
	let reload: Promise<void> | undefined;
	try {
		const type = {
			kind: 'type' as const,
			id: 'review-custom',
			label: 'Review custom',
			icon: 'files',
			folder: 'review-custom',
			enabled: true,
			nameFieldId: 'name',
			fields: [
				{ fieldId: 'name', storageKey: 'review-name', label: 'Name', kind: 'text' as const, required: true },
			],
		};
		await a.commands.publishDefinition({ operationId: 'review-schema', expectedHeads: [], definition: type });
		const entity = await a.commands.create({
			operationId: 'review-entity',
			typeId: type.id,
			values: { name: 'Before' },
		});
		render(
			<TestProviders>
				<ArchivePage
					host={{ application: a, settings: { get: () => ({ layouts: {}, maxColumns: 6 }) } } as never}
					app={{} as never}
					owner={document.body}
					state={{ section: type.id, selectedId: entity.id, search: '', offset: 0, scroll: 0 }}
					updateState={() => {}}
					navigate={async () => {}}
					guard={() => {}}
				/>
			</TestProviders>,
		);
		fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
		const input = await screen.findByLabelText('Name *', { selector: 'input' });
		fireEvent.change(input, { target: { value: 'Unsaved changed' } });
		input.focus();
		const save = vi.spyOn(a.commands, 'save');
		await waitFor(async () => expect((await a.commands.drafts())[0]?.draft.name).toBe('Unsaved changed'));
		const read = m.files.read.bind(m.files),
			gate = new Promise<void>((r) => {
				release = r;
			});
		m.files.read = async (f) => {
			await gate;
			if (fail) throw new Error('read failure');
			return read(f);
		};
		await act(async () => {
			reload = m.runtime.reload();
			await Promise.resolve();
		});
		const heldConnected = input.isConnected;
		expect(document.activeElement).toBe(input);
		fireEvent.click(screen.getByRole('button', { name: 'Save active record' }));
		expect(save).not.toHaveBeenCalled();
		await act(async () => {
			release();
			await reload;
		});
		const after = await screen.findByLabelText('Name *', { selector: 'input' });
		expect(heldConnected).toBe(true);
		expect(after).toBe(input);
		expect((after as HTMLInputElement).value).toBe('Unsaved changed');
		expect(document.activeElement).toBe(input);
		if (fail) {
			fireEvent.click(screen.getByRole('button', { name: 'Save active record' }));
			expect(save).not.toHaveBeenCalled();
			m.files.read = read;
			await act(async () => {
				await m.runtime.reload();
			});
			expect(await screen.findByLabelText('Name *', { selector: 'input' })).toBe(input);
			expect((input as HTMLInputElement).value).toBe('Unsaved changed');
			expect(document.activeElement).toBe(input);
		}
	} finally {
		release();
		if (reload)
			await act(async () => {
				await reload;
			});
		cleanup();
		m.runtime.dispose();
	}
});

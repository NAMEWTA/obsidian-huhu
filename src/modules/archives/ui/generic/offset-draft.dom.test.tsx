import { useState } from 'react';
import { test, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordEditor } from './RecordEditor';
import { ArchivesApplication } from '../../services/generic/application';
import { memoryArchives } from '../../services/generic/test-port';
import type { ArchiveTypeDefinition } from '../../core/schema/model';
import { ValueForm } from './FieldRenderer';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
beforeEach(() => setLanguage('en'));
test.each(['typing', 'atomic'])('offset can be replaced without moving its draft into time: %s', async (how) => {
	let latest = '';
	function Form() {
		const [stamp, setStamp] = useState('2026-11-01T01:30:05.120-04:00');
		latest = stamp;
		return (
			<ValueForm
				fields={[{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' }]}
				values={{ stamp }}
				onChange={(_id, v) => setStamp(v as string)}
			/>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	const group = screen.getByRole('group', { name: 'Stamp' });
	const offset = within(group).getByDisplayValue('-04:00');
	if (how === 'atomic') fireEvent.change(offset, { target: { value: '+05:30' } });
	else {
		const user = userEvent.setup();
		await user.clear(offset);
		for (const char of '+05:30') await user.type(offset, char);
	}
	expect(latest).toBe('2026-11-01T01:30:05.120+05:30');
	expect(within(group).getByDisplayValue('01:30:05.120')).toBeTruthy();
	expect((offset as HTMLInputElement).value).toBe('+05:30');
});
test('an unfinished offset stays in its own input across a committed render', () => {
	function Form() {
		const [stamp, setStamp] = useState('2026-11-01T01:30:05.120-04:00');
		return (
			<ValueForm
				fields={[{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' }]}
				values={{ stamp }}
				onChange={(_id, v) => setStamp(v as string)}
			/>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	const group = screen.getByRole('group', { name: 'Stamp' });
	const offset = within(group).getByDisplayValue('-04:00');
	fireEvent.change(offset, { target: { value: '+' } });
	expect((offset as HTMLInputElement).value).toBe('+');
	expect(within(group).getByDisplayValue('01:30:05.120')).toBeTruthy();
});
test('independent invalid date, time and offset drafts survive renders and external reset', () => {
	let reset = (_value: string) => {};
	let latest = '';
	function Form() {
		const [stamp, setStamp] = useState('2026-11-01T01:30:05.120Z');
		reset = setStamp;
		latest = stamp;
		return (
			<ValueForm
				fields={[{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' }]}
				values={{ stamp }}
				onChange={(_id, value) => setStamp(value as string)}
			/>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	const group = screen.getByRole('group', { name: 'Stamp' });
	const date = within(group).getByDisplayValue('2026-11-01'),
		time = within(group).getByDisplayValue('01:30:05.120'),
		offset = within(group).getByDisplayValue('Z');
	fireEvent.change(offset, { target: { value: '+' } });
	fireEvent.change(date, { target: { value: '2026-02-31' } });
	fireEvent.change(time, { target: { value: '01:' } });
	expect(latest).toBe('2026-02-31T01:+');
	expect((date as HTMLInputElement).value).toBe('2026-02-31');
	expect((time as HTMLInputElement).value).toBe('01:');
	expect((offset as HTMLInputElement).value).toBe('+');
	act(() => reset('2027-01-02T23:59:03.50Z'));
	expect(within(group).getByDisplayValue('2027-01-02')).toBe(date);
	expect(within(group).getByDisplayValue('23:59:03.50')).toBe(time);
	expect(within(group).getByDisplayValue('Z')).toBe(offset);
	act(() => reset('2027-01-02T23:59:03.50+05:'));
	expect(within(group).getByDisplayValue('23:59:03.50')).toBe(time);
	expect(within(group).getByDisplayValue('+05:')).toBe(offset);
});

test.each(['+', '-', '+0', '-04', '+05:', '-04:0', 'Z', '+05:30', '-04:00'])(
	'restored actual recovery draft keeps offset %s separate from time',
	async (offset) => {
		const memory = await memoryArchives();
		const application = new ArchivesApplication(memory.runtime);
		try {
			const type: ArchiveTypeDefinition = {
				kind: 'type',
				id: 'offset-recovery',
				label: 'Offset recovery',
				icon: 'files',
				folder: 'offset-recovery',
				enabled: true,
				nameFieldId: 'name',
				fields: [
					{ fieldId: 'name', storageKey: 'name', label: 'Name', kind: 'text', required: true },
					{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' },
				],
			};
			await application.commands.publishDefinition({
				operationId: 'offset-type',
				expectedHeads: [],
				definition: type,
			});
			const original = '2026-11-01T01:30:05.120-04:00';
			const entity = await application.commands.create({
				operationId: 'offset-entity',
				typeId: type.id,
				values: { name: 'Test', stamp: original },
			});
			const initial = await application.commands.beginEdit(entity.id);
			const editor = (session: typeof initial) => (
				<TestProviders>
					<RecordEditor
						application={application}
						initial={session}
						type={type}
						forms={[]}
						owner={document.body}
						app={{} as never}
						guard={() => {}}
						committed={() => {}}
						cancel={() => {}}
					/>
				</TestProviders>
			);
			const view = render(editor(initial));
			const group = screen.getByRole('group', { name: 'Stamp' });
			fireEvent.change(within(group).getByDisplayValue('-04:00'), { target: { value: offset } });
			// The unchanged negative-offset control still needs a real recovery write.
			if (offset === '-04:00')
				fireEvent.change(screen.getByDisplayValue('Test'), { target: { value: 'Changed' } });
			await waitFor(async () =>
				expect((await application.commands.drafts())[0]?.draft.stamp).toBe(`2026-11-01T01:30:05.120${offset}`),
			);
			view.unmount();
			const restored = (await application.commands.drafts())[0]!;
			const recoveredView = render(editor(restored));
			expect(
				within(screen.getByRole('group', { name: 'Stamp' }))
					.getAllByRole('textbox')
					.map((input) => (input as HTMLInputElement).value),
			).toEqual(['2026-11-01', '01:30:05.120', offset]);
			if (!['Z', '+05:30', '-04:00'].includes(offset)) {
				fireEvent.click(screen.getByRole('button', { name: 'Save active record' }));
				await waitFor(() =>
					expect(
						within(recoveredView.container)
							.getAllByRole('alert')
							.some((alert) => alert.textContent?.includes('invalid-value')),
					).toBe(true),
				);
				expect(application.runtime.index.get(entity.id)?.values.stamp).toBe(original);
				expect((await application.commands.drafts())[0]?.draft.stamp).toBe(`2026-11-01T01:30:05.120${offset}`);
			}
		} finally {
			cleanup();
			memory.runtime.dispose();
		}
	},
);

import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import type { FieldDefinition, Values } from '../../core/schema/model';
import { validateValues } from '../../core/schema/fields';
import { ValueForm } from './FieldRenderer';

afterEach(() => {
	cleanup();
	setLanguage('zh');
});
function harness(fields: FieldDefinition[], initial: Values) {
	setLanguage('en');
	let latest = initial;
	function Form() {
		const [values, setValues] = useState(initial);
		latest = values;
		return (
			<ValueForm
				fields={fields}
				values={values}
				onChange={(id, value) => setValues((previous) => ({ ...previous, [id]: value }))}
			/>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	return () => latest;
}
test('offset datetime keeps seconds, fraction and offset spelling when one component changes', () => {
	const fields: FieldDefinition[] = [{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' }];
	const latest = harness(fields, { stamp: '2026-11-01T01:30:05.120-04:00' });
	const group = screen.getByRole('group', { name: 'Stamp' });
	const time = within(group).getByDisplayValue('01:30:05.120');
	fireEvent.change(time, { target: { value: '01:31:05.120' } });
	expect(latest().stamp).toBe('2026-11-01T01:31:05.120-04:00');
	fireEvent.change(within(group).getByDisplayValue('-04:00'), { target: { value: 'Z' } });
	expect(latest().stamp).toBe('2026-11-01T01:31:05.120Z');
	expect(() => validateValues(fields, latest(), true)).not.toThrow();
});
test('invalid datetime and day drafts reach domain validation rather than saving an old valid value', () => {
	const fields: FieldDefinition[] = [
		{ fieldId: 'stamp', storageKey: 'stamp', label: 'Stamp', kind: 'datetime' },
		{ fieldId: 'date', storageKey: 'date', label: 'Date', kind: 'date', precision: 'day' },
	];
	const latest = harness(fields, { stamp: '2026-11-05T09:00+08:00', date: '2026-11-05' });
	fireEvent.change(within(screen.getByRole('group', { name: 'Stamp' })).getByDisplayValue('09:00'), {
		target: { value: '25:00' },
	});
	expect(latest().stamp).toBe('2026-11-05T25:00+08:00');
	expect(() => validateValues(fields, latest(), true)).toThrow();
	fireEvent.change(screen.getByRole('textbox', { name: 'Date' }), { target: { value: '2026-02-31' } });
	expect(latest().date).toBe('2026-02-31');
});

test('month and mixed precision preserve month strings and never invent the first day', async () => {
	const fields: FieldDefinition[] = [
		{ fieldId: 'month', storageKey: 'month', label: 'Month value', kind: 'date', precision: 'month' },
		{ fieldId: 'mixed', storageKey: 'mixed', label: 'Mixed value', kind: 'date', precision: 'mixed' },
	];
	const latest = harness(fields, { month: '2026-02', mixed: '2026-02' });
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Month value' }).value).toBe('2026-02');
	fireEvent.change(screen.getByRole('textbox', { name: 'Month value' }), { target: { value: '2026-13' } });
	expect(latest().month).toBe('2026-13');
	expect(() => validateValues(fields, latest(), true)).toThrow();
	const group = screen.getByRole('radiogroup', { name: 'Mixed value · Month or day' });
	fireEvent.click(within(group).getByRole('radio', { name: 'Day' }));
	expect(latest().mixed).toBe('2026-02-');
	expect(latest().mixed).not.toBe('2026-02-01');
});

test('a raw invalid date is retained in the actual recovery session and blocks the production save', async () => {
	const { memoryArchives } = await import('../../services/generic/test-port');
	const { ArchivesApplication } = await import('../../services/generic/application');
	const { RecordEditor } = await import('./RecordEditor');
	const { waitFor } = await import('@testing-library/react');
	const { vi } = await import('vitest');
	setLanguage('en');
	const memory = await memoryArchives(),
		application = new ArchivesApplication(memory.runtime);
	try {
		const type = {
			kind: 'type' as const,
			id: 'precision-type',
			label: 'Precision',
			icon: 'files',
			folder: 'precision',
			enabled: true,
			nameFieldId: 'name',
			fields: [
				{ fieldId: 'name', storageKey: 'precision-name', label: 'Name', kind: 'text' as const, required: true },
				{
					fieldId: 'date',
					storageKey: 'precision-date',
					label: 'Date',
					kind: 'date' as const,
					precision: 'day' as const,
				},
			],
		};
		await application.commands.publishDefinition({
			operationId: 'precision-schema',
			expectedHeads: [],
			definition: type,
		});
		const entity = await application.commands.create({
			operationId: 'precision-record',
			typeId: type.id,
			values: { name: 'Record', date: '2026-11-05' },
		});
		const initial = await application.commands.beginEdit(entity.id),
			save = vi.spyOn(application.commands, 'save'),
			committed = vi.fn();
		render(
			<TestProviders>
				<RecordEditor
					application={application}
					initial={initial}
					type={type}
					forms={[]}
					owner={document.body}
					app={{} as never}
					guard={() => {}}
					committed={committed}
					cancel={() => {}}
				/>
			</TestProviders>,
		);
		fireEvent.change(screen.getByRole('textbox', { name: 'Date' }), { target: { value: '2026-02-31' } });
		expect(document.querySelector('[data-archive-dirty]')?.getAttribute('data-archive-dirty')).toBe('true');
		fireEvent.click(screen.getByRole('button', { name: 'Save active record' }));
		await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
		expect(save).not.toHaveBeenCalled();
		expect(committed).not.toHaveBeenCalled();
		await waitFor(async () => expect((await application.commands.drafts())[0]?.draft.date).toBe('2026-02-31'));
		expect((await application.query.entity(entity.id))?.values.date).toBe('2026-11-05');
	} finally {
		cleanup();
		memory.runtime.dispose();
	}
});

test('hiding a dirty editor closes its single confirmation while preserving the same draft control', async () => {
	const { memoryArchives } = await import('../../services/generic/test-port');
	const { ArchivesApplication } = await import('../../services/generic/application');
	const { PERSON } = await import('../../core/schema/presets');
	const { RecordEditor } = await import('./RecordEditor');
	const { VisibilityContext } = await import('../../../../ui/react/contexts');
	const { act, waitFor } = await import('@testing-library/react');
	setLanguage('en');
	const memory = await memoryArchives(),
		application = new ArchivesApplication(memory.runtime);
	try {
		const entity = await application.commands.create({
				operationId: 'visibility-record',
				typeId: PERSON.id,
				values: { name: 'Before' },
			}),
			initial = await application.commands.beginEdit(entity.id);
		let changeVisibility: (value: boolean) => void = () => {};
		function Editor() {
			const [visible, setVisible] = useState(true);
			changeVisibility = setVisible;
			return (
				<div hidden={!visible}>
					<VisibilityContext.Provider value={visible}>
						<RecordEditor
							application={application}
							initial={initial}
							type={PERSON}
							forms={[]}
							owner={document.body}
							app={{} as never}
							guard={() => {}}
							committed={() => {}}
							cancel={() => {}}
						/>
					</VisibilityContext.Provider>
				</div>
			);
		}
		render(
			<TestProviders>
				<Editor />
			</TestProviders>,
		);
		const input = screen.getByLabelText('Name *', { selector: 'input' });
		fireEvent.change(input, { target: { value: 'Unsaved' } });
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		await screen.findByRole('dialog');
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		act(() => changeVisibility(false));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		act(() => changeVisibility(true));
		expect(screen.getByLabelText('Name *', { selector: 'input' })).toBe(input);
		expect((input as HTMLInputElement).value).toBe('Unsaved');
	} finally {
		cleanup();
		memory.runtime.dispose();
	}
});

test('editing a table child keeps other row identity and unknown or invalid recovery data for validation', () => {
	const fields: FieldDefinition[] = [
		{
			fieldId: 'rows',
			storageKey: 'rows',
			label: 'Rows',
			kind: 'table',
			columns: [{ fieldId: 'child', storageKey: 'child', label: 'Child', kind: 'text' }],
		},
	];
	const first = { rowId: 'row-a', values: { child: 'A' }, retainedMetadata: true },
		second = { rowId: 'row-b', values: { child: 'B' } };
	const latest = harness(fields, { rows: [first, second, 'invalid recovery row'] });
	fireEvent.change(screen.getAllByRole('textbox', { name: 'Child' })[0]!, { target: { value: 'Changed' } });
	expect(latest().rows).toEqual([{ ...first, values: { child: 'Changed' } }, second, 'invalid recovery row']);
	expect((latest().rows as unknown[])[1]).toBe(second);
	expect(() => validateValues(fields, latest(), true)).toThrow();
});

test('external precision resets remain authoritative after a previously emitted day is restored', async () => {
	const { PrecisionDateControl } = await import('./PrecisionDateControl');
	setLanguage('en');
	let value = '2026-11-05';
	const show = () => (
		<TestProviders>
			<PrecisionDateControl
				label="Precision reset"
				value={value}
				onChange={(next) => {
					value = next;
					view.rerender(show());
				}}
			/>
		</TestProviders>
	);
	const view = render(show());
	fireEvent.change(screen.getByRole('textbox', { name: 'Precision reset' }), { target: { value: '2026-11-06' } });
	value = '2026-11';
	view.rerender(show());
	expect(screen.getByRole('radio', { name: 'Month' }).getAttribute('aria-checked')).toBe('true');
	value = '2026-11-06';
	view.rerender(show());
	expect(screen.getByRole('radio', { name: 'Day' }).getAttribute('aria-checked')).toBe('true');
});

test('generated belonging fields stay read-only even when the all-fields form is used', async () => {
	const { memoryArchives } = await import('../../services/generic/test-port');
	const { ArchivesApplication } = await import('../../services/generic/application');
	const { RecordEditor } = await import('./RecordEditor');
	setLanguage('en');
	const memory = await memoryArchives(),
		application = new ArchivesApplication(memory.runtime);
	try {
		await application.commands.belongings.install();
		const entity = await application.commands.create({
				operationId: 'readonly-belonging',
				typeId: 'type-belonging',
				values: { name: 'Owned item' },
			}),
			initial = await application.commands.beginEdit(entity.id),
			revision = await application.query.definition(initial.schemaRevisionId);
		if (revision?.definition.kind !== 'type') throw new Error('type required');
		render(
			<TestProviders>
				<RecordEditor
					application={application}
					initial={initial}
					type={revision.definition}
					forms={[]}
					owner={document.body}
					app={{} as never}
					guard={() => {}}
					committed={() => {}}
					cancel={() => {}}
				/>
			</TestProviders>,
		);
		for (const id of ['status', 'exitDate', 'sale', 'events']) {
			const group = document.querySelector('[data-field-id="' + id + '"]')!;
			const controls = [...group.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button,textarea')];
			expect(controls.length).toBeGreaterThan(0);
			expect(controls.every((control) => control.disabled)).toBe(true);
		}
		expect(screen.getByLabelText<HTMLInputElement>('Name *', { selector: 'input' }).disabled).toBe(false);
	} finally {
		cleanup();
		memory.runtime.dispose();
	}
});

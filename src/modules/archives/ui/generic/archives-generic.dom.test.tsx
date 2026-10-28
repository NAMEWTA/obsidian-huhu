import { act, useState } from 'react';
import type { App } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { ArchiveRuntime } from '../../services/generic/runtime';
import { memoryArchives } from '../../services/generic/test-port';
import { ArchivesApplication } from '../../services/generic/application';
import { PERSON, defaultForms } from '../../core/schema/presets';
import type { FieldDefinition, FormTemplate, Values } from '../../core/schema/model';
import { patchProperties } from '../../core/generic/markdown';
import { ValueForm } from './FieldRenderer';
import { RecordEditor } from './RecordEditor';
import { DefinitionStudio } from './DefinitionStudio';
import { Resources } from './ArchivePage';
import { at, ct } from './common';
const runtimes: ArchiveRuntime[] = [];
afterEach(() => {
	cleanup();
	for (const runtime of runtimes.splice(0)) runtime.dispose();
	setLanguage('zh');
});
async function fixture() {
	setLanguage('en');
	const result = await memoryArchives();
	runtimes.push(result.runtime);
	return { ...result, application: new ArchivesApplication(result.runtime) };
}
function valueHarness(fields: FieldDefinition[], initial: Values, form?: FormTemplate) {
	let latest = initial;
	function Harness() {
		const [values, setValues] = useState(initial);
		latest = values;
		return (
			<ValueForm
				fields={fields}
				values={values}
				form={form}
				onChange={(id, value) =>
					setValues((previous) => {
						const next = { ...previous };
						if (value === undefined) delete next[id];
						else next[id] = value;
						return next;
					})
				}
			/>
		);
	}
	const view = render(
		<TestProviders>
			<Harness />
		</TestProviders>,
	);
	return { ...view, latest: () => latest };
}
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
	await user.click(screen.getByRole('combobox', { name: label }));
	await user.click(screen.getByRole('option', { name: option }));
}
test('typed controls preserve leading zeros, false, zero and explicit missing/null/empty values', async () => {
	setLanguage('en');
	const fields: FieldDefinition[] = [
		{ fieldId: 'code', storageKey: 'code', label: 'Code', kind: 'text' },
		{ fieldId: 'enabled', storageKey: 'enabled', label: 'Enabled', kind: 'boolean' },
		{ fieldId: 'count', storageKey: 'count', label: 'Count', kind: 'integer' },
	];
	const view = valueHarness(fields, { code: '0012', enabled: false, count: 0 }),
		user = userEvent.setup();
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Code' }).value).toBe('0012');
	expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Enabled' }).checked).toBe(false);
	fireEvent.change(screen.getByLabelText('Count', { selector: 'input' }), { target: { value: '0' } });
	expect(view.latest().count).toBe(0);
	await choose(user, `Code · ${at('fieldState')}`, at('null'));
	expect(view.latest().code).toBeNull();
	await choose(user, `Code · ${at('fieldState')}`, at('value'));
	expect(view.latest().code).toBe('');
	await choose(user, `Code · ${at('fieldState')}`, at('missing'));
	expect(Object.hasOwn(view.latest(), 'code')).toBe(false);
});
test('money stays a decimal string; a removed child row does not change another row identity', () => {
	setLanguage('en');
	const fields: FieldDefinition[] = [
		{ fieldId: 'budget', storageKey: 'budget', label: 'Budget', kind: 'money' },
		{
			fieldId: 'items',
			storageKey: 'items',
			label: 'Items',
			kind: 'table',
			columns: [{ fieldId: 'name', storageKey: 'name', label: 'Line', kind: 'text' }],
		},
	];
	const view = valueHarness(fields, {
		budget: { amount: '12345678901234567890.01', currency: 'CNY' },
		items: [
			{ rowId: 'row-a', values: { name: 'A' } },
			{ rowId: 'row-b', values: { name: 'B' } },
		],
	});
	const amount = screen.getByLabelText(at('amount'), { selector: 'input' });
	expect((amount as HTMLInputElement).value).toBe('12345678901234567890.01');
	fireEvent.change(amount, { target: { value: 'invalid' } });
	expect(view.latest().budget).toEqual({ amount: 'invalid', currency: 'CNY' });
	fireEvent.click(screen.getAllByRole('button', { name: at('remove') })[0]!);
	expect(view.latest().items).toEqual([{ rowId: 'row-b', values: { name: 'B' } }]);
});
test('conditional visibility and read-only controls never erase hidden values', () => {
	const fields: FieldDefinition[] = [
		{ fieldId: 'flag', storageKey: 'flag', label: 'Flag', kind: 'boolean' },
		{ fieldId: 'secret', storageKey: 'secret', label: 'Note', kind: 'text' },
	];
	const form: FormTemplate = {
		kind: 'form',
		id: 'form-test',
		label: 'Conditional',
		typeId: 'type-test',
		groups: [
			{
				id: 'group',
				label: 'Fields',
				columns: 1,
				controls: [
					{ fieldId: 'flag', readOnly: true },
					{ fieldId: 'secret', visibleWhen: { fieldId: 'flag', op: 'eq', value: true } },
				],
			},
		],
	};
	const view = valueHarness(fields, { flag: false, secret: 'retained' }, form);
	expect(screen.queryByLabelText('Note', { selector: 'input' })).toBeNull();
	expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Flag' }).disabled).toBe(true);
	expect(view.latest().secret).toBe('retained');
});
test('two real forms share one draft, save through the domain and reopen with hidden fields intact', async () => {
	const { application } = await fixture();
	const receipt = await application.commands.create({
		operationId: 'forms-person',
		typeId: PERSON.id,
		values: { name: 'Original', region: 'Taipei' },
	});
	const initial = await application.commands.beginEdit(receipt.id),
		committed = vi.fn(),
		user = userEvent.setup();
	render(
		<TestProviders>
			<RecordEditor
				application={application}
				initial={initial}
				type={PERSON}
				forms={defaultForms(PERSON)}
				app={{} as App}
				owner={document.body}
				guard={() => {}}
				committed={committed}
				cancel={() => {}}
			/>
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('名称 *', { selector: 'input' }), { target: { value: '0012 Project' } });
	await choose(user, at('formPicker'), '快速录入');
	expect(screen.queryByLabelText('地区', { selector: 'input' })).toBeNull();
	expect(screen.getByLabelText<HTMLInputElement>('名称 *', { selector: 'input' }).value).toBe('0012 Project');
	await user.click(screen.getByRole('button', { name: at('saveActive') }));
	await waitFor(() => expect(committed).toHaveBeenCalledOnce());
	const reopened = await application.commands.beginEdit(receipt.id);
	expect(reopened.draft).toEqual({ name: '0012 Project', region: 'Taipei' });
});
test('same-field concurrent save reports a conflict and retains both the visible draft and private recovery copy', async () => {
	const { application, files } = await fixture(),
		receipt = await application.commands.create({
			operationId: 'conflict-person',
			typeId: PERSON.id,
			values: { name: 'Original' },
		});
	const initial = await application.commands.beginEdit(receipt.id),
		committed = vi.fn();
	render(
		<TestProviders>
			<RecordEditor
				application={application}
				initial={initial}
				type={PERSON}
				forms={[]}
				app={{} as App}
				owner={document.body}
				guard={() => {}}
				committed={committed}
				cancel={() => {}}
			/>
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText('名称 *', { selector: 'input' }), { target: { value: 'My draft' } });
	files.external(receipt.path, patchProperties(files.text.get(receipt.path)!, { name: 'Other writer' }));
	fireEvent.click(screen.getByRole('button', { name: at('saveActive') }));
	await waitFor(() =>
		expect(screen.getAllByRole('alert').some((node) => node.textContent?.includes('field-conflict'))).toBe(true),
	);
	expect(committed).not.toHaveBeenCalled();
	expect(screen.getByLabelText<HTMLInputElement>('名称 *', { selector: 'input' }).value).toBe('My draft');
	expect((await application.commands.drafts())[0]?.draft.name).toBe('My draft');
});
test('the visual designer publishes a third type without a JSON editor and creates a portable entity', async () => {
	const { application, files } = await fixture(),
		publication = vi.spyOn(application.commands, 'publishDefinition'),
		user = userEvent.setup();
	render(
		<TestProviders>
			<DefinitionStudio application={application} owner={document.body} app={{} as App} guard={() => {}} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: at('newDefinition') }));
	fireEvent.change(screen.getAllByLabelText(at('label'), { selector: 'input' })[0]!, {
		target: { value: 'Projects' },
	});
	fireEvent.change(screen.getByLabelText(at('folder'), { selector: 'input' }), { target: { value: 'Projects' } });
	expect(screen.getByRole<HTMLButtonElement>('button', { name: at('publish') }).disabled).toBe(true);
	await user.click(screen.getByRole('button', { name: at('preview') }));
	await user.click(screen.getByRole('button', { name: at('publish') }));
	expect(publication).toHaveBeenCalledTimes(1);
	// Publication writes and verifies multiple immutable documents; await the command, not a polling deadline.
	await act(async () => {
		await publication.mock.results[0]!.value;
	});
	expect(screen.queryByRole('alert')?.textContent).toBeUndefined();
	expect(screen.getByRole('status').textContent).toBe(at('published'));
	const summary = application.catalog.snapshot().types.find((type) => type.label === 'Projects')!;
	expect(summary).toBeTruthy();
	const type = (await application.query.definition(summary.revisionId))!.definition;
	if (type.kind !== 'type') throw new Error('type expected');
	const receipt = await application.commands.create({
		operationId: 'project-001',
		typeId: type.id,
		values: { [type.nameFieldId]: '0012' },
	});
	const reopened = await memoryArchives(files.text);
	runtimes.push(reopened.runtime);
	expect(reopened.runtime.index.get(receipt.id)?.name).toBe('0012');
	expect(reopened.runtime.index.get(receipt.id)?.typeId).toBe(type.id);
});
test('resource search and pagination remain available after the generic page replacement', async () => {
	const { application, files } = await fixture(),
		receipt = await application.commands.create({
			operationId: 'resource-person',
			typeId: PERSON.id,
			values: { name: 'Resources' },
		});
	const folder = receipt.path.slice(0, receipt.path.lastIndexOf('/'));
	for (let i = 0; i < 65; i++) files.seed(`${folder}/report-${i}.pdf`, 'PDF fixture');
	const entity = (await application.query.entity(receipt.id))!;
	render(
		<TestProviders>
			<Resources application={application} entity={entity} app={{} as App} owner={document.body} />
		</TestProviders>,
	);
	expect(document.querySelectorAll('[data-resource-path]')).toHaveLength(60);
	fireEvent.click(screen.getByRole('button', { name: ct('next') }));
	expect(document.querySelectorAll('[data-resource-path]')).toHaveLength(5);
	fireEvent.change(screen.getByLabelText(ct('searchResources')), { target: { value: 'report-64' } });
	expect(document.querySelectorAll('[data-resource-path]')).toHaveLength(1);
});

import { useCallback, useRef, useState } from 'react';
import type { App } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { memoryArchives } from '../../services/generic/test-port';
import { PERSON } from '../../core/schema/presets';
import { ArchivesApplication } from '../../services/generic/application';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import { ArchivesContent } from '../generic/workbench-page';
import type { ArchivePageState } from '../generic/page-state';

afterEach(() => {
	cleanup();
	setLanguage('zh');
});
async function setup(typeId = 'type-person', legacy = false) {
	setLanguage('en');
	const f = await memoryArchives(),
		application = new ArchivesApplication(f.runtime);
	await application.commands.initialize();
	if (!legacy) await application.personJournal.install();
	if (typeId === 'custom-person-like')
		await application.commands.publishDefinition({
			operationId: 'custom-schema',
			expectedHeads: [],
			definition: {
				kind: 'type',
				id: typeId,
				label: 'People',
				icon: 'user',
				folder: 'custom-people',
				enabled: true,
				nameFieldId: 'name',
				fields: [
					...PERSON.fields,
					{ fieldId: 'custom', storageKey: 'custom', label: 'Custom profile field', kind: 'text' },
				],
			},
		});
	const item = await application.commands.create({ operationId: 'person-a', typeId, values: { name: 'Same name' } });
	const other = await application.commands.create({ operationId: 'person-b', typeId, values: { name: 'Same name' } });
	const host = {
		application,
		settings: { get: () => ({ layouts: {}, maxColumns: 6 }) },
	} as unknown as GenericArchivesHost;
	let navigate: (section?: string, id?: string) => Promise<void> = async () => {};
	function Page() {
		const [state, setState] = useState<ArchivePageState>({
			section: typeId,
			selectedId: item.id,
			search: '',
			offset: 0,
			scroll: 0,
		});
		const leave = useRef<(() => Promise<boolean>) | undefined>(undefined);
		const guard = useCallback((next?: () => Promise<boolean>) => {
			leave.current = next;
		}, []);
		const open = async (section?: string, resourceId?: string) => {
			if (leave.current && !(await leave.current())) return;
			setState((value) => ({ ...value, section: section ?? value.section, selectedId: resourceId }));
		};
		navigate = open;
		return (
			<>
				<button
					onClick={() => {
						void open(typeId, other.id);
					}}
				>
					Other record
				</button>
				<ArchivesContent
					host={host}
					app={{ vault: { getFileByPath: () => null } } as unknown as App}
					owner={document.body}
					state={state}
					updateState={(patch) => setState((value) => ({ ...value, ...patch }))}
					open={open}
					guard={guard}
				/>
			</>
		);
	}
	return { ...f, application, item, other, Page, otherRecord: () => navigate(typeId, other.id) };
}

test('real person route offers four views without writes; profile uses existing editor and same-name IDs stay distinct', async () => {
	const f = await setup();
	try {
		const before = f.files.writes.length;
		render(
			<TestProviders>
				<f.Page />
			</TestProviders>,
		);
		const user = userEvent.setup();
		expect(await screen.findByRole('radiogroup', { name: 'Person views' })).toBeTruthy();
		for (const name of ['Overview', 'Profile', 'Relations', 'Journal'])
			expect(screen.getByRole('radio', { name })).toBeTruthy();
		await user.click(screen.getByRole('radio', { name: 'Profile' }));
		expect(screen.getByText(f.item.id, { exact: false })).toBeTruthy();
		expect(f.files.writes.length).toBe(before);
		await user.click(screen.getByRole('button', { name: 'Other record' }));
		await waitFor(() =>
			expect(document.querySelector('[data-person-id]')?.getAttribute('data-person-id')).toBe(f.other.id),
		);
		await user.click(screen.getByRole('button', { name: 'Edit' }));
		expect(await screen.findByLabelText('Name *', { selector: 'input' })).toBeTruthy();
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('company stays in the generic detail layout', async () => {
	const f = await setup('type-company');
	try {
		render(
			<TestProviders>
				<f.Page />
			</TestProviders>,
		);
		await screen.findByRole('heading', { name: 'Same name' });
		expect(screen.queryByRole('navigation', { name: 'Person views' })).toBeNull();
		expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

async function journalPage(f: Awaited<ReturnType<typeof setup>>) {
	render(
		<TestProviders>
			<f.Page />
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.click(await screen.findByRole('radio', { name: 'Journal' }));
	return user;
}
test('journal add/update/delete use the owner service; cancel deletion leaves the entry and other fields intact', async () => {
	const f = await setup();
	try {
		const user = await journalPage(f);
		await user.click(screen.getByRole('button', { name: 'Add journal entry' }));
		await user.type(screen.getByLabelText('Title'), 'Met today');
		await user.type(screen.getByLabelText('Content'), 'A retained memory');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await screen.findByRole('heading', { name: 'Met today' });
		await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]!);
		await user.clear(screen.getByLabelText('Title'));
		await user.type(screen.getByLabelText('Title'), 'Updated title');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await screen.findByRole('heading', { name: 'Updated title' });
		await user.click(screen.getByRole('button', { name: 'Delete journal entry' }));
		await user.click(await screen.findByRole('button', { name: 'Cancel' }));
		expect(screen.getByRole('heading', { name: 'Updated title' })).toBeTruthy();
		await user.click(screen.getByRole('button', { name: 'Delete journal entry' }));
		await screen.findByRole('dialog');
		await user.click(screen.getAllByRole('button', { name: 'Delete journal entry' }).at(-1)!);
		await waitFor(() => expect(screen.queryByRole('heading', { name: 'Updated title' })).toBeNull());
		const entity = await f.application.query.entity(f.item.id);
		expect(entity?.values).toMatchObject({ name: 'Same name', journal: [] });
		expect((await f.application.query.entity(f.other.id))?.values.journal).toBeUndefined();
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('external journal edit conflicts, retains draft, and cancelled navigation keeps editing', async () => {
	const f = await setup();
	try {
		const user = await journalPage(f);
		await user.click(screen.getByRole('button', { name: 'Add journal entry' }));
		await user.type(screen.getByLabelText('Title'), 'Local draft');
		await f.application.personJournal.add({
			operationId: 'external',
			entityId: f.item.id,
			expectedHash: f.item.contentHash,
			rowId: 'external-row',
			values: { date: '2026-01-01', title: 'Other writer', content: '', relatedEntityIds: [] },
		});
		await screen.findByRole('heading', { name: 'Other writer' });
		const writes = f.files.writes.length;
		await user.click(screen.getByRole('button', { name: 'Save' }));
		expect((await screen.findByRole('alert')).textContent).toContain('changed elsewhere');
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Local draft');
		expect(f.files.writes.length).toBe(writes);
		await user.click(screen.getByRole('radio', { name: 'Profile' }));
		await user.click(await screen.findByRole('button', { name: 'Cancel' }));
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Local draft');
		await user.click(screen.getByRole('button', { name: 'Other record' }));
		await user.click(await screen.findByRole('button', { name: 'Discard journal draft' }));
		await waitFor(() =>
			expect(document.querySelector('[data-person-id]')?.getAttribute('data-person-id')).toBe(f.other.id),
		);
		expect(screen.queryByLabelText('Title')).toBeNull();
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('legacy journal reads without upgrading and only explicit confirmation upgrades this entity', async () => {
	const f = await setup('type-person', true);
	try {
		const previous = (await f.application.query.entity(f.other.id))!.schemaRevisionId;
		const writes = f.files.writes.length,
			user = await journalPage(f);
		expect(f.files.writes.length).toBe(writes);
		await user.click(screen.getByRole('button', { name: 'Enable journal for this person' }));
		await user.click(await screen.findByRole('button', { name: 'Cancel' }));
		expect(f.files.writes.length).toBe(writes);
		await user.click(screen.getByRole('button', { name: 'Enable journal for this person' }));
		await screen.findByRole('dialog');
		await user.click(screen.getAllByRole('button', { name: 'Enable journal for this person' }).at(-1)!);
		await screen.findByRole('button', { name: 'Add journal entry' });
		expect((await f.application.query.entity(f.item.id))?.schemaRevisionId).toBe('preset-type-person-journal-v3');
		expect((await f.application.query.entity(f.other.id))?.schemaRevisionId).toBe(previous);
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('a custom type named People keeps its generic layout and dynamic form', async () => {
	const f = await setup('custom-person-like');
	try {
		render(
			<TestProviders>
				<f.Page />
			</TestProviders>,
		);
		await screen.findByRole('heading', { name: 'Same name' });
		expect(document.querySelector('[data-person-id]')).toBeNull();
		await userEvent.setup().click(screen.getByRole('button', { name: 'Edit' }));
		expect(await screen.findByLabelText('Custom profile field', { selector: 'input' })).toBeTruthy();
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('person relations reuse independent relation records and navigate by target ID', async () => {
	const f = await setup();
	try {
		await f.application.commands.createRelation({
			operationId: 'friendship',
			relationTypeId: 'relation-friend',
			sourceId: f.item.id,
			targetId: f.other.id,
			values: {},
			contextRefs: {},
		});
		render(
			<TestProviders>
				<f.Page />
			</TestProviders>,
		);
		const user = userEvent.setup();
		await user.click(await screen.findByRole('radio', { name: 'Relations' }));
		await user.click(await screen.findByRole('button', { name: 'Same name' }));
		await waitFor(() =>
			expect(document.querySelector('[data-person-id]')?.getAttribute('data-person-id')).toBe(f.other.id),
		);
		expect((await f.application.query.relations(f.item.id)).items[0]?.id).toBe('friendship');
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

for (const legacy of [false, true])
	test(`pending ${legacy ? 'upgrade' : 'delete'} confirmation is cancelled when navigating to another person`, async () => {
		const f = await setup('type-person', legacy);
		try {
			if (!legacy)
				await f.application.personJournal.add({
					operationId: 'seed-note',
					entityId: f.item.id,
					expectedHash: f.item.contentHash,
					rowId: 'seed-row',
					values: { date: '2026-11-04', title: 'Keep me', content: '', relatedEntityIds: [] },
				});
			const remove = vi.spyOn(f.application.personJournal, 'remove'),
				install = vi.spyOn(f.application.personJournal, 'install');
			const user = await journalPage(f);
			const name = legacy ? 'Enable journal for this person' : 'Delete journal entry';
			await user.click(screen.getByRole('button', { name }));
			await screen.findByRole('dialog');
			const staleConfirm = screen.getAllByRole('button', { name }).at(-1)!;
			const writes = f.files.writes.length;
			await act(() => f.otherRecord());
			await waitFor(() =>
				expect(document.querySelector('[data-person-id]')?.getAttribute('data-person-id')).toBe(f.other.id),
			);
			// Retain the exact old DOM reference: a late queued activation must never write.
			fireEvent.click(staleConfirm);
			await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
			expect(remove).not.toHaveBeenCalled();
			expect(install).not.toHaveBeenCalled();
			expect(f.files.writes.length).toBe(writes);
		} finally {
			cleanup();
			f.runtime.dispose();
		}
	});

test('unmount closes pending confirmation and duplicate clicks create a single dialog', async () => {
	const f = await setup('type-person', true);
	try {
		await journalPage(f);
		const opener = screen.getByRole('button', { name: 'Enable journal for this person' });
		fireEvent.click(opener);
		fireEvent.click(opener);
		await screen.findByRole('dialog');
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		cleanup();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('journal draft and leave guard survive a real reload, read failure and recovery', async () => {
	const f = await setup();
	let release = () => {};
	let pending: Promise<void> | undefined;
	const read = f.files.read.bind(f.files);
	try {
		const user = await journalPage(f);
		await user.click(screen.getByRole('button', { name: 'Add journal entry' }));
		await user.type(screen.getByLabelText('Title'), 'Unsaved before reload');
		const writes = f.files.writes.length;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		f.files.read = async (file) => {
			await gate;
			return read(file);
		};
		await act(async () => {
			pending = f.runtime.reload();
			await Promise.resolve();
		});
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Unsaved before reload');
		expect(screen.getByLabelText('Title').closest('form')?.closest('fieldset')?.disabled).toBe(true);
		fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
		expect(f.files.writes.length).toBe(writes);
		expect(document.querySelector('[data-person-id]')?.getAttribute('aria-busy')).toBe('true');
		await act(async () => {
			release();
			await pending;
		});
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Unsaved before reload');
		f.files.read = () => Promise.reject(new Error('Fixture read failure'));
		await act(() => f.runtime.reload());
		expect((await screen.findByRole('alert')).textContent).toContain('input is retained');
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Unsaved before reload');
		expect(screen.getByLabelText('Title').closest('form')?.closest('fieldset')?.disabled).toBe(true);
		fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
		expect(f.files.writes.length).toBe(writes);
		f.files.read = read;
		await act(() => f.runtime.reload());
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Unsaved before reload');
		expect(f.files.writes.length).toBe(writes);
		await user.click(screen.getByRole('radio', { name: 'Profile' }));
		await user.click(await screen.findByRole('button', { name: 'Cancel' }));
		expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Unsaved before reload');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await screen.findByRole('heading', { name: 'Unsaved before reload' });
	} finally {
		release();
		f.files.read = read;
		await pending?.catch(() => {});
		cleanup();
		f.runtime.dispose();
	}
});

test('overview shows recent journal and independent relationships with view actions and empty states', async () => {
	const f = await setup();
	try {
		await f.application.personJournal.add({
			operationId: 'seed-recent',
			entityId: f.item.id,
			expectedHash: f.item.contentHash,
			rowId: 'recent-row',
			values: { date: '2026-11-04', title: 'Recent memory', content: '', relatedEntityIds: [] },
		});
		await f.application.commands.createRelation({
			operationId: 'overview-friend',
			relationTypeId: 'relation-friend',
			sourceId: f.item.id,
			targetId: f.other.id,
			values: {},
			contextRefs: {},
		});
		render(
			<TestProviders>
				<f.Page />
			</TestProviders>,
		);
		await screen.findByRole('heading', { name: 'Recent notes' });
		expect(screen.getByText('Recent memory')).toBeTruthy();
		await screen.findByText('Friend');
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'View all notes' }));
		await screen.findByRole('heading', { name: 'Recent memory' });
		await user.click(screen.getByRole('radio', { name: 'Overview' }));
		await user.click(screen.getByRole('button', { name: 'View relationships' }));
		await screen.findByRole('button', { name: 'Same name' });
		await act(() => f.otherRecord());
		await screen.findByText('No journal entries yet.');
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

test('activating a delete confirmation twice submits one owner command', async () => {
	const f = await setup();
	try {
		await f.application.personJournal.add({
			operationId: 'seed-double',
			entityId: f.item.id,
			expectedHash: f.item.contentHash,
			rowId: 'double-row',
			values: { date: '2026-11-04', title: 'Delete once', content: '', relatedEntityIds: [] },
		});
		const remove = vi.spyOn(f.application.personJournal, 'remove');
		const user = await journalPage(f);
		await user.click(screen.getByRole('button', { name: 'Delete journal entry' }));
		await screen.findByRole('dialog');
		const accept = screen.getAllByRole('button', { name: 'Delete journal entry' }).at(-1)!;
		fireEvent.click(accept);
		fireEvent.click(accept);
		await screen.findByText('No journal entries yet.');
		expect(remove).toHaveBeenCalledTimes(1);
	} finally {
		cleanup();
		f.runtime.dispose();
	}
});

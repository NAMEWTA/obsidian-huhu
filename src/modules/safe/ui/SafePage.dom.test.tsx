import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { registerMessages, setLanguage } from '../../../shared/i18n';
import { TestProviders } from '../../../ui/react/test-providers';
import { VisibilityContext } from '../../../ui/react/contexts';
import { DEFAULT_LOCK_POLICY, lockPolicyOf } from '../core/policy';
import { SafeError, type EntryInput, type SafeEntry } from '../core/model';
import type { MergeSummary } from '../core/merge';
import type { SafePreferences, SafeViewMode } from '../services/preferences';
import type { SafeService, SafeState } from '../services/safe-service';
import { messages } from '../i18n';
import { SafePage } from './SafePage';

const cred = (n: number, username: string, password: string, notes = '') => ({ id: `c000000${n}-1111-4111-8111-111111111111`, username, password, notes, updatedAt: '2026-10-21T00:00:00.000Z' });
const entry: SafeEntry = {
	id: 'e164e6ed-3986-4c8c-a7ef-4349727dfdf3',
	title: 'Private mailbox', url: 'https://private.example.test', notes: '', icon: null,
	credentials: [cred(1, 'person@example.test', 'secret-password-sentinel', '仅在内存中检索')],
	createdAt: '2026-10-21T00:00:00.000Z', updatedAt: '2026-10-21T00:00:00.000Z', deletedAt: null,
};
const apple: SafeEntry = {
	...entry, id: 'a164e6ed-3986-4c8c-a7ef-4349727dfdf3', title: 'Apple', url: 'https://appleid.apple.com',
	credentials: [cred(2, 'first@icloud.test', 'apple-secret-one', '主账号'), cred(3, 'second@icloud.test', 'apple-secret-two', '孩子的')],
	updatedAt: '2026-10-22T00:00:00.000Z',
};

function setup(status: SafeState['status'] = 'unlocked', entries: SafeEntry[] = [entry], mode: SafeViewMode = 'list') {
	const store = createStore<SafeState>(() => ({ status, entries: status === 'unlocked' ? entries : [], busy: false, error: null, generation: 1, upgraded: false }));
	let policy = DEFAULT_LOCK_POLICY;
	const stub = {
		store,
		lock: vi.fn(() => store.setState(state => ({ status: 'locked', entries: [], generation: state.generation + 1, busy: false }))),
		checkDeadline: vi.fn(() => true), touch: vi.fn(), clearError: vi.fn(), leave: vi.fn(),
		lockPolicy: vi.fn(() => policy), subscribePolicy: vi.fn(() => () => {}),
		saveEntry: vi.fn(async (_input: EntryInput, _base?: SafeEntry) => {}),
		trashEntry: vi.fn(async (_entry: SafeEntry) => {}),
		restoreEntry: vi.fn(async (_entry: SafeEntry) => {}),
		deleteEntry: vi.fn(async (_entry: SafeEntry) => {}),
		changePassword: vi.fn(async (_old: string, _next: string) => {}),
		copy: vi.fn(async (_value: string, _win: Window) => {}),
		openUrl: vi.fn(async (_value: string, _win: Window) => {}),
		exportBackup: vi.fn(async (_win: Window) => true),
		pickBackup: vi.fn(async (_win: Window): Promise<string | null> => 'encrypted-backup-sentinel'),
		prepareRestore: vi.fn(async (_raw: string, _password: string) => ({ token: 'verified-token', entryCount: 3 })),
		commitRestore: vi.fn(async (_token: string) => {}),
		cancelRestore: vi.fn(),
		prepareImport: vi.fn(async (_raw: string, _password: string) => ({ token: 'import-token', entryCount: 4, summary: { addedEntries: 2, mergedEntries: 1, skippedEntries: 1, addedCredentials: 1, updatedCredentials: 0, skippedCredentials: 0, skippedTrashed: 0 } as MergeSummary })),
		commitImport: vi.fn(async (_token: string) => ({ addedEntries: 2, mergedEntries: 1, skippedEntries: 1, addedCredentials: 1, updatedCredentials: 0, skippedCredentials: 0, skippedTrashed: 0 } as MergeSummary)),
		cancelImport: vi.fn(),
		probe: vi.fn(async () => {}),
		create: vi.fn(async (_password: string) => {}),
		unlock: vi.fn(async (_password: string) => {}),
	};
	let current = mode;
	const prefs: SafePreferences = { viewMode: () => current, setViewMode: vi.fn(next => { current = next; }), subscribe: () => () => {} };
	const service = stub as unknown as SafeService;
	const page = (visible: boolean) => <StrictMode><TestProviders><VisibilityContext value={visible}><SafePage service={service} preferences={prefs} /></VisibilityContext></TestProviders></StrictMode>;
	const view = render(page(true));
	return { ...stub, service, prefs, setVisible: (visible: boolean) => view.rerender(page(visible)), setPolicy: (next: typeof policy) => { policy = next; } };
}

beforeEach(() => { registerMessages(messages); setLanguage('en'); });

test('search matches notes and account fields, excludes passwords, and never renders a secret in the list', async () => {
	setup('unlocked', [entry, apple]);
	expect(document.body.innerHTML).not.toContain(entry.credentials[0]!.password);
	expect(document.body.innerHTML).not.toContain('apple-secret-one');
	const search = screen.getByRole('searchbox', { name: 'Search records' });
	fireEvent.change(search, { target: { value: 'mailbox 内存' } });
	expect(screen.getByRole('button', { name: /Private mailbox/ })).toBeTruthy();
	expect(screen.queryByRole('button', { name: /^Apple/ })).toBeNull();
	fireEvent.change(search, { target: { value: 'second@icloud 孩子' } });
	expect(screen.getByRole('button', { name: /^Apple/ })).toBeTruthy();
	fireEvent.change(search, { target: { value: 'apple-secret-two' } });
	expect(screen.getByText('No matching records')).toBeTruthy();
});

test('the list shows the account count, expands to each account and copies from the nearest button', async () => {
	const service = setup('unlocked', [entry, apple]);
	expect(screen.getByText('person@example.test')).toBeTruthy();
	const expand = screen.getByRole('button', { name: 'Show accounts of Apple' });
	expect(expand.textContent).toContain('2 accounts');
	expect(screen.queryByText('second@icloud.test')).toBeNull();
	await userEvent.click(expand);
	expect(screen.getByText('second@icloud.test')).toBeTruthy();
	const rows = screen.getAllByRole('listitem').filter(item => item.textContent?.includes('second@icloud.test'));
	await userEvent.click(within(rows.at(-1)!).getByRole('button', { name: 'Copy password' }));
	expect(service.copy).toHaveBeenCalledWith('apple-secret-two', window);
	expect(document.body.innerHTML).not.toContain('apple-secret-two');
});

test('the card view lists accounts with copy buttons and the choice is remembered through preferences', async () => {
	const service = setup('unlocked', [apple], 'cards');
	expect(screen.getByText('first@icloud.test')).toBeTruthy();
	await userEvent.click(screen.getAllByRole('button', { name: 'Copy username' })[1]!);
	expect(service.copy).toHaveBeenCalledWith('second@icloud.test', window);
	await userEvent.click(screen.getByRole('radio', { name: 'List' }));
	expect(service.prefs.setViewMode).toHaveBeenCalledWith('list');
});

test('the editor masks secrets, preserves exact input and removes every sensitive subtree when the session locks', async () => {
	const service = setup();
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	const password = screen.getByLabelText('Password 1') as HTMLInputElement;
	expect(password.type).toBe('password');
	expect(password.value).toBe(entry.credentials[0]!.password);
	expect(password.hasAttribute('value')).toBe(false);
	await userEvent.click(screen.getByRole('button', { name: 'Show password 1' }));
	expect(password.type).toBe('text');
	const exact = '  密码 🔐 é  ';
	fireEvent.change(password, { target: { value: exact } });
	await userEvent.click(screen.getByRole('button', { name: 'Copy password 1' }));
	expect(service.copy).toHaveBeenCalledWith(exact, window);
	await userEvent.click(screen.getByRole('button', { name: /^Save$/ }));
	expect(service.saveEntry).toHaveBeenCalledWith({
		title: entry.title, url: entry.url, notes: '', icon: null,
		credentials: [{ id: entry.credentials[0]!.id, username: 'person@example.test', password: exact, notes: '仅在内存中检索' }],
	}, entry);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	const removedInput = screen.getByLabelText('Password 1') as HTMLInputElement;
	await act(async () => service.lock());
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(screen.queryByRole('searchbox')).toBeNull();
	expect(document.body.textContent).not.toContain('person@example.test');
	expect(document.body.innerHTML).not.toContain(entry.credentials[0]!.password);
	expect(removedInput.value).toBe('');
});

test('hiding discards the editor and decrypted DOM while keeping a session allowed by the switch policy', async () => {
	const f = setup();
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	const input = screen.getByLabelText('Password 1') as HTMLInputElement;
	fireEvent.change(input, { target: { value: 'unsaved secret' } });
	f.setVisible(false);
	expect(f.leave).toHaveBeenCalledWith('switch');
	expect(f.leave).not.toHaveBeenCalledWith('close');
	expect(f.store.getState().status).toBe('unlocked');
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(screen.queryByRole('searchbox')).toBeNull();
	expect(document.body.textContent).not.toContain('person@example.test');
	expect(input.value).toBe('');
	f.setVisible(true);
	expect(screen.getByRole('button', { name: /Private mailbox/ })).toBeTruthy();
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(f.saveEntry).not.toHaveBeenCalled();
});

test('accounts can be added, reordered and removed in the editor, and the last one cannot be removed', async () => {
	const service = setup('unlocked', [apple]);
	await userEvent.click(screen.getByRole('button', { name: /^Apple/ }));
	expect(screen.getAllByRole('group', { name: /^Account \d$/ })).toHaveLength(2);
	await userEvent.click(screen.getByRole('button', { name: 'Add account' }));
	const third = screen.getByLabelText('Username 3');
	fireEvent.change(third, { target: { value: 'third@icloud.test' } });
	fireEvent.change(screen.getByLabelText('Password 3'), { target: { value: 'apple-secret-three' } });
	await userEvent.click(screen.getByRole('button', { name: 'Move up 3' }));
	await userEvent.click(screen.getByRole('button', { name: 'Remove account 1' }));
	expect((screen.getByLabelText('Username 1') as HTMLInputElement).value).toBe('third@icloud.test');
	await userEvent.click(screen.getByRole('button', { name: /^Save$/ }));
	const saved = service.saveEntry.mock.calls[0]![0];
	expect(saved.credentials.map(item => item.username)).toEqual(['third@icloud.test', 'second@icloud.test']);
	expect(saved.credentials[0]!.id).not.toBe(apple.credentials[0]!.id);
});

test('an entry with one account cannot lose it, and a blank account is refused with a fixed message', async () => {
	const service = setup();
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	expect((screen.getByRole('button', { name: 'Remove account 1' }) as HTMLButtonElement).disabled).toBe(true);
	await userEvent.click(screen.getByRole('button', { name: 'Add account' }));
	await userEvent.click(screen.getByRole('button', { name: /^Save$/ }));
	expect(service.saveEntry).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toMatch(/required fields/);
});

test('IME Enter does not save, and failed saving keeps the draft without showing raw errors', async () => {
	const service = setup();
	service.saveEntry.mockRejectedValue(new Error('secret-file-path-and-password'));
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	const notes = screen.getByLabelText('Notes 1');
	fireEvent.change(notes, { target: { value: '未保存草稿' } });
	fireEvent.compositionStart(notes);
	expect(fireEvent.keyDown(notes, { key: 'Enter', isComposing: true })).toBe(false);
	expect(service.saveEntry).not.toHaveBeenCalled();
	fireEvent.compositionEnd(notes);
	await userEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
	expect(screen.getByRole('alertdialog')).toBeTruthy();
	await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
	await userEvent.click(screen.getByRole('button', { name: /^Save$/ }));
	expect(screen.getByRole('dialog')).toBeTruthy();
	expect((screen.getByLabelText('Notes 1') as HTMLTextAreaElement).value).toBe('未保存草稿');
	expect(document.body.textContent).not.toContain('secret-file-path-and-password');
	expect(screen.getByRole('alert').textContent).toMatch(/could not be completed/);
});

test('a chosen picture becomes the entry icon through the decoder, and an unusable one shows a fixed message', async () => {
	setup();
	await userEvent.click(screen.getByRole('button', { name: /Private mailbox/ }));
	const input = screen.getByLabelText('Upload icon…', { selector: 'input' }) as HTMLInputElement;
	fireEvent.change(input, { target: { files: [new File(['x'], 'doc.txt', { type: 'text/plain' })] } });
	await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not be used as an icon/));
});

test('the lock screen states the rules that are actually in force', async () => {
	setup('locked');
	expect(screen.getByText('Locks after 20 minutes without activity.')).toBeTruthy();
	expect(screen.getByText('Stays unlocked when you switch to another page or tab.')).toBeTruthy();
	expect(screen.getByText('Stays unlocked when the safe page is closed.')).toBeTruthy();
	expect(screen.getByText('Always locks when Obsidian closes or the plugin unloads.')).toBeTruthy();
});

test('the lock screen follows custom rules', async () => {
	const service = setup('locked');
	expect(service.lockPolicy).toHaveBeenCalled();
	expect(lockPolicyOf({ idlePreset: 'never', idleCustomMinutes: 30, lockOnSwitch: true, lockOnClose: true }).idleMs).toBeNull();
});

test('creation requires matching master passwords and unlocking displays only the fixed authentication error', async () => {
	const service = setup('absent');
	fireEvent.change(screen.getByLabelText('Master password', { exact: true }), { target: { value: 'long master password' } });
	fireEvent.change(screen.getByLabelText('Confirm master password'), { target: { value: 'different password' } });
	await userEvent.click(screen.getByRole('button', { name: 'Create safe' }));
	expect(service.create).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toMatch(/do not match/);
	await act(async () => service.store.setState(state => ({ status: 'locked', generation: state.generation + 1 })));
	service.unlock.mockRejectedValue(new SafeError('unlock-failed'));
	fireEvent.change(screen.getByLabelText('Master password', { exact: true }), { target: { value: 'wrong secret' } });
	await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));
	expect(screen.getByRole('alert').textContent).toMatch(/incorrect or the encrypted file/);
	expect((screen.getByLabelText('Master password', { exact: true }) as HTMLInputElement).value).toBe('');
	expect(document.body.innerHTML).not.toContain('wrong secret');
});

test('replacing the safe authenticates the backup and needs an explicit in-page confirmation', async () => {
	const service = setup('locked');
	await userEvent.click(screen.getByRole('button', { name: 'Restore encrypted backup' }));
	await userEvent.click(screen.getByRole('button', { name: 'Choose backup file' }));
	fireEvent.change(screen.getByLabelText('Backup master password'), { target: { value: 'backup master password' } });
	await userEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
	expect(service.prepareRestore).toHaveBeenCalledWith('encrypted-backup-sentinel', 'backup master password');
	expect(service.commitRestore).not.toHaveBeenCalled();
	expect(screen.getByText(/verified backup contains 3 records/)).toBeTruthy();
	expect(document.body.innerHTML).not.toContain('backup master password');
	const replace = screen.getByRole('button', { name: 'Restore and replace' }) as HTMLButtonElement;
	expect(replace.disabled).toBe(true);
	await userEvent.click(screen.getByRole('checkbox'));
	await userEvent.click(replace);
	expect(service.commitRestore).toHaveBeenCalledWith('verified-token');
});

test('a merge import previews the result, then reports what was added, merged and skipped', async () => {
	const service = setup();
	await userEvent.click(screen.getByRole('button', { name: 'Safe actions' }));
	await userEvent.click(screen.getByRole('menuitem', { name: /Import encrypted backup/ }));
	await userEvent.click(screen.getByRole('button', { name: 'Choose backup file' }));
	fireEvent.change(screen.getByLabelText('Backup master password'), { target: { value: 'backup master password' } });
	await userEvent.click(screen.getByRole('button', { name: 'Verify backup' }));
	expect(service.prepareImport).toHaveBeenCalledWith('encrypted-backup-sentinel', 'backup master password');
	expect(service.commitImport).not.toHaveBeenCalled();
	expect(screen.getByText('Add 2 new entries')).toBeTruthy();
	await userEvent.click(screen.getByRole('button', { name: 'Import' }));
	expect(service.commitImport).toHaveBeenCalledWith('import-token');
	expect(screen.getByText('Import finished')).toBeTruthy();
	expect(screen.getByText(/Merge into 1 existing entries/)).toBeTruthy();
	await userEvent.click(screen.getByRole('button', { name: 'Done' }));
	expect(screen.getByText('Imported: 2 added, 1 merged, 1 skipped.')).toBeTruthy();
	expect(document.body.innerHTML).not.toContain('backup master password');
});

test('a file dialog resolving after lock cannot reopen a backup form or restore a stale session', async () => {
	const service = setup('locked');
	let resolve!: (value: string) => void;
	service.pickBackup.mockImplementation(() => new Promise<string>(done => { resolve = done; }));
	await userEvent.click(screen.getByRole('button', { name: 'Restore encrypted backup' }));
	await userEvent.click(screen.getByRole('button', { name: 'Choose backup file' }));
	await act(async () => service.lock());
	await act(async () => resolve('late-ciphertext'));
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(service.prepareRestore).not.toHaveBeenCalled();
	expect(service.cancelRestore).toHaveBeenCalled();
});

test('trash requires confirmation before permanent deletion and sanitizes a failed deletion', async () => {
	const service = setup();
	service.deleteEntry.mockRejectedValue(new Error('private-path-and-secret'));
	await act(async () => service.store.setState({ entries: [{ ...entry, deletedAt: entry.updatedAt }] }));
	await userEvent.click(screen.getByRole('button', { name: 'Safe actions' }));
	await userEvent.click(screen.getByRole('menuitem', { name: 'Trash' }));
	await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
	expect(service.deleteEntry).not.toHaveBeenCalled();
	await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete permanently' }));
	expect(service.deleteEntry).toHaveBeenCalledOnce();
	expect(screen.getByRole('alertdialog')).toBeTruthy();
	expect(document.body.textContent).not.toContain('private-path-and-secret');
});

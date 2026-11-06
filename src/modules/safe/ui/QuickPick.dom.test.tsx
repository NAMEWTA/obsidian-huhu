import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { registerMessages, setLanguage } from '../../../shared/i18n';
import { TestProviders } from '../../../ui/react/test-providers';
import { messages } from '../i18n';
import { QuickPick } from './QuickPick';
import { QUICK_PICK_MASTER, QUICK_PICK_SECRET, quickPickFixture } from './quick-pick.test-support';

const fixtures: Awaited<ReturnType<typeof quickPickFixture>>[] = [];
beforeEach(() => {
	registerMessages(messages);
	setLanguage('en');
});
afterEach(() => {
	for (const f of fixtures.splice(0)) f.dispose();
});
async function setup(unlocked = true) {
	const f = await quickPickFixture(window, unlocked);
	fixtures.push(f);
	const view = render(
		<TestProviders>
			<QuickPick service={f.service} onClose={() => {}} />
		</TestProviders>,
	);
	return { ...f, view };
}

test('quick search shows each account, searches platform and username, and excludes secrets and notes', async () => {
	await setup();
	const search = screen.getByRole('combobox');
	expect(screen.getAllByRole('option')).toHaveLength(3);
	fireEvent.change(search, { target: { value: 'github work-account' } });
	expect(screen.getAllByRole('option')).toHaveLength(1);
	expect(screen.getByRole('option').textContent).toContain('work-account');
	fireEvent.change(search, { target: { value: 'portal.example.test' } });
	expect(screen.getByRole('option').textContent).toContain('cloud@example.test');
	for (const value of [QUICK_PICK_SECRET, 'do-not-search-notes']) {
		fireEvent.change(search, { target: { value } });
		expect(screen.queryAllByRole('option')).toHaveLength(0);
	}
	fireEvent.change(search, { target: { value: '' } });
	expect(document.body.innerHTML).not.toContain(QUICK_PICK_SECRET);
});

test('arrow keys select accounts; composition Enter does not copy but intentional Enter does', async () => {
	const f = await setup();
	const search = screen.getByRole('combobox');
	fireEvent.keyDown(search, { key: 'ArrowDown' });
	expect(screen.getByRole('option', { selected: true }).textContent).toContain('work-account');
	fireEvent.compositionStart(search);
	fireEvent.keyDown(search, { key: 'Enter', isComposing: true });
	expect(f.clipboard.writes).toEqual([]);
	fireEvent.compositionEnd(search);
	fireEvent.keyDown(search, { key: 'Enter' });
	await waitFor(() => expect(f.clipboard.text).toBe('OTHER-PRIVATE-SECRET'));
	expect(f.feedback).toContain('Password copied. The clipboard is cleared after 30 seconds only if it is unchanged.');
	expect(document.body.innerHTML).not.toContain('OTHER-PRIVATE-SECRET');
});

test('arrow navigation from a focused result moves focus with the selected account', async () => {
	const f = await setup();
	const rows = screen.getAllByRole('option');
	await act(async () => rows[0]!.focus());
	fireEvent.keyDown(rows[0]!, { key: 'ArrowDown' });
	expect(document.activeElement).toBe(rows[1]);
	expect(rows[1]?.getAttribute('aria-selected')).toBe('true');
	fireEvent.keyDown(rows[1]!, { key: 'Enter' });
	await waitFor(() => expect(f.clipboard.text).toBe('OTHER-PRIVATE-SECRET'));
});

test('the picker requires unlock before exposing account search', async () => {
	const f = await setup(false);
	expect(screen.queryByRole('combobox')).toBeNull();
	const password = screen.getByLabelText('Master password');
	fireEvent.change(password, { target: { value: QUICK_PICK_MASTER } });
	fireEvent.submit(password.closest('form')!);
	await screen.findByRole('combobox');
	expect((password as HTMLInputElement).value).toBe('');
	expect(f.service.store.getState().status).toBe('unlocked');
	expect(f.publications).toEqual([]);
});

test('a no-result search generates only on request, never persists or copies automatically, and clears on unmount', async () => {
	const f = await setup();
	fireEvent.change(screen.getByRole('combobox'), { target: { value: 'not-a-record' } });
	expect(screen.queryByLabelText('Generated password (not saved)')).toBeNull();
	expect(f.publications).toEqual([]);
	expect(f.clipboard.writes).toEqual([]);
	fireEvent.click(screen.getByRole('button', { name: 'Generate new password' }));
	const generated = screen.getByLabelText('Generated password (not saved)') as HTMLInputElement;
	expect(generated.value).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w]).{12}$/);
	expect(generated.getAttribute('value')).toBeNull();
	expect(document.body.innerHTML).not.toContain(generated.value);
	expect(f.publications).toEqual([]);
	expect(f.clipboard.writes).toEqual([]);
	f.view.unmount();
	expect(generated.value).toBe('');
});

function gate() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

test('unmount cancels a delayed clipboard write, clears the query input, and suppresses late success', async () => {
	const f = await setup();
	const entered = gate(),
		release = gate();
	f.clipboard.beforeWrite = async (value) => {
		if (value) {
			entered.resolve();
			await release.promise;
		}
	};
	const search = screen.getByRole('combobox') as HTMLInputElement;
	fireEvent.change(search, { target: { value: 'source@example.test' } });
	fireEvent.keyDown(search, { key: 'Enter' });
	await entered.promise;
	f.view.unmount();
	expect(search.value).toBe('');
	release.resolve();
	await waitFor(() => expect(f.clipboard.writes).toEqual([QUICK_PICK_SECRET, '']));
	expect(f.clipboard.text).toBe('');
	expect(f.feedback).toEqual([]);
	expect(f.service.store.getState().status).toBe('unlocked');
});

test('external lock removes the picker and its generated secret even while a copy is pending', async () => {
	const f = await setup();
	fireEvent.change(screen.getByRole('combobox'), { target: { value: 'missing' } });
	fireEvent.click(screen.getByRole('button', { name: 'Generate new password' }));
	const secret = screen.getByLabelText('Generated password (not saved)') as HTMLInputElement;
	const entered = gate(),
		release = gate();
	f.clipboard.beforeWrite = async (value) => {
		if (value) {
			entered.resolve();
			await release.promise;
		}
	};
	fireEvent.click(screen.getByRole('button', { name: 'Copy password' }));
	await entered.promise;
	await act(async () => f.service.lock());
	expect(screen.queryByRole('combobox')).toBeNull();
	expect(secret.value).toBe('');
	release.resolve();
	await waitFor(() => expect(f.clipboard.writes.at(-1)).toBe(''));
	expect(f.feedback).toEqual([]);
});

test('Escape closes and clears the picker while preserving an already unlocked session', async () => {
	const f = await setup();
	const search = screen.getByRole('combobox') as HTMLInputElement;
	fireEvent.change(search, { target: { value: 'source' } });
	fireEvent.keyDown(search, { key: 'Escape' });
	expect(screen.queryByRole('combobox')).toBeNull();
	expect(search.value).toBe('');
	expect(f.service.store.getState().status).toBe('unlocked');
});

test('clipboard failure preserves results, permits retry and never exposes raw host errors', async () => {
	const f = await setup();
	f.clipboard.fail = true;
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
	await screen.findByRole('alert');
	expect(screen.getAllByRole('option')).toHaveLength(3);
	expect(f.feedback).toContain('The clipboard could not be accessed.');
	expect(f.feedback.join()).not.toContain(QUICK_PICK_SECRET);
	expect(document.body.innerHTML).not.toContain(QUICK_PICK_SECRET);
	f.clipboard.fail = false;
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
	await waitFor(() => expect(f.clipboard.text).toBe(QUICK_PICK_SECRET));
	expect(f.publications).toEqual([]);
});

test('closing the owner window removes all picker state and cancels pending unlock', async () => {
	const f = await setup(false);
	const entered = gate(),
		release = gate();
	f.io.beforeRead = async (name) => {
		if (name === 'vault.enc') {
			entered.resolve();
			await release.promise;
		}
	};
	const password = screen.getByLabelText('Master password') as HTMLInputElement;
	fireEvent.change(password, { target: { value: QUICK_PICK_MASTER } });
	fireEvent.submit(password.closest('form')!);
	await entered.promise;
	fireEvent(window, new Event('unload'));
	expect(password.value).toBe('');
	expect(screen.queryByRole('combobox')).toBeNull();
	release.resolve();
	await waitFor(() => expect(f.service.store.getState().busy).toBe(false));
	expect(f.service.store.getState()).toMatchObject({ status: 'locked', entries: [] });
	expect(f.feedback).toEqual([]);
});

test('the shared WebKit IME fallback does not copy on keyCode 229', async () => {
	const f = await setup();
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 229 });
	expect(f.clipboard.writes).toEqual([]);
});

test('Shift Enter copies the selected username through the existing safe clipboard port', async () => {
	const f = await setup();
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', shiftKey: true });
	await waitFor(() => expect(f.clipboard.text).toBe('source@example.test'));
	expect(f.clipboard.writes).toEqual(['source@example.test']);
});

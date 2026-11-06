import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { SafePage } from './SafePage';
import { quickPickFixture, QUICK_PICK_SECRET } from './quick-pick.test-support';
import { setLanguage } from '../../../shared/i18n';
let fixtures: Awaited<ReturnType<typeof quickPickFixture>>[] = [];
beforeEach(() => setLanguage('en'));
afterEach(() => {
	cleanup();
	fixtures.forEach((f) => f.dispose());
	fixtures = [];
});
async function safePage() {
	const f = await quickPickFixture(window);
	fixtures.push(f);
	const view = render(
		<TestProviders>
			<SafePage
				service={f.service}
				preferences={{ viewMode: () => 'list', setViewMode: () => {}, subscribe: () => () => {} }}
			/>
		</TestProviders>,
	);
	return { ...f, view };
}
test('in-page QuickPick can copy a password through its real SafeService', async () => {
	const f = await safePage();
	fireEvent.click(screen.getByRole('button', { name: /Quick/ }));
	const search = await screen.findByRole('combobox');
	fireEvent.keyDown(search, { key: 'Enter' });
	await waitFor(() => expect(f.clipboard.text).toBe(QUICK_PICK_SECRET));
	expect(screen.queryByRole('alert')).toBeNull();
});

test.each(['shift-enter', 'button'] as const)(
	'in-page picker copies usernames by %s across service busy renders',
	async (mode) => {
		const f = await safePage();
		fireEvent.click(screen.getByRole('button', { name: 'Quick access' }));
		const search = await screen.findByRole('combobox');
		if (mode === 'shift-enter') fireEvent.keyDown(search, { key: 'Enter', shiftKey: true });
		else fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy username' }));
		await waitFor(() => expect(f.clipboard.text).toBe('source@example.test'));
		expect(screen.queryByRole('alert')).toBeNull();
	},
);
test('in-page clipboard failure remains retryable and retains external clipboard ownership on lock', async () => {
	const f = await safePage();
	f.clipboard.fail = true;
	fireEvent.click(screen.getByRole('button', { name: 'Quick access' }));
	const dialog = await screen.findByRole('dialog');
	fireEvent.click(within(dialog).getByRole('button', { name: 'Copy password' }));
	await screen.findByRole('alert');
	expect(f.clipboard.writes).toEqual([]);
	f.clipboard.fail = false;
	fireEvent.click(within(dialog).getByRole('button', { name: 'Copy password' }));
	await waitFor(() => expect(f.clipboard.text).toBe(QUICK_PICK_SECRET));
	f.clipboard.text = 'EXTERNAL-OWNER-TEXT';
	await act(async () => f.service.lock());
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(f.clipboard.text).toBe('EXTERNAL-OWNER-TEXT');
	expect(f.clipboard.writes).toEqual([QUICK_PICK_SECRET]);
});

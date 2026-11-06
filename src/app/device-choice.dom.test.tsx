import type { App } from 'obsidian';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { chooseVaultDevice } from './device-choice';
import { t } from '../shared/i18n';
function start(controller = new AbortController()) {
	const owner = document.createElement('main');
	document.body.append(owner);
	const app = { workspace: { containerEl: owner } } as unknown as App;
	let result: ReturnType<typeof chooseVaultDevice>;
	act(() => {
		result = chooseVaultDevice(app, [{ id: 'exact-device-id', label: 'My device' }], controller.signal);
	});
	const outcome = result!.then(
		(value) => ({ value, error: undefined }),
		(error) => ({ value: undefined, error }),
	);
	return { owner, outcome };
}
test('device sharing requires an explicit existing-device action and selection survives close', async () => {
	const { owner, outcome } = start();
	const user = userEvent.setup();
	expect(await screen.findByRole('dialog')).toBeTruthy();
	await user.click(await screen.findByRole('option', { name: /My device/ }));
	expect((await outcome).value).toBe('exact-device-id');
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	owner.remove();
});
test('new device requires a nonblank explicit name before creation', async () => {
	const { owner, outcome } = start();
	const user = userEvent.setup();
	await user.click(await screen.findByRole('option', { name: t('storage.newDevice') }));
	const create = screen.getByRole('button', { name: t('ui.create') }) as HTMLButtonElement;
	expect(create.disabled).toBe(true);
	await user.type(screen.getByRole('textbox', { name: t('storage.deviceName') }), ' My new device ');
	await user.click(create);
	expect((await outcome).value).toEqual({ label: 'My new device' });
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	owner.remove();
});
test('cancelling never implicitly shares an existing device', async () => {
	const { owner, outcome } = start();
	expect(await screen.findByRole('dialog')).toBeTruthy();
	await userEvent.setup().keyboard('{Escape}');
	expect((await outcome).error).toBeInstanceOf(Error);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	owner.remove();
});

test('plugin abort disposes the real overlay while its native owner remains connected', async () => {
	const controller = new AbortController();
	const { owner, outcome } = start(controller);
	expect(await screen.findByRole('dialog')).toBeTruthy();
	await act(async () => controller.abort());
	expect((await outcome).error).toBeInstanceOf(Error);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(owner.isConnected).toBe(true);
	expect(document.body.style.pointerEvents).toBe('');
	await waitFor(() => expect(document.querySelector('.huhu-portal-root')).toBeNull());
	owner.remove();
});
test('owner removal rejects selection and releases the real dialog', async () => {
	const { owner, outcome } = start();
	expect(await screen.findByRole('dialog')).toBeTruthy();
	await act(async () => owner.remove());
	expect((await outcome).error).toBeInstanceOf(Error);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(document.body.style.pointerEvents).toBe('');
});

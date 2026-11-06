import type { App } from 'obsidian';
import type { ReactElement } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { chooseVaultDevice } from './device-choice';
import { openReactDialog } from '../ui/react/dialog';
vi.mock('../ui/react/dialog', () => ({ dialogOwner: vi.fn(() => ({})), openReactDialog: vi.fn() }));
afterEach(() => vi.clearAllMocks());
function choice(signal: AbortSignal = new AbortController().signal) {
	let options!: Parameters<typeof openReactDialog>[1];
	const close = vi.fn(() => options.onClose?.());
	vi.mocked(openReactDialog).mockImplementation((_owner, value) => {
		options = value;
		return { close };
	});
	const result = chooseVaultDevice({} as App, [{ id: 'device', label: 'My device' }], signal);
	const element = options.content(close) as ReactElement<{
		onChoose: (value: string | { label: string }) => void;
		onCancel: () => void;
	}>;
	return { result, element, close };
}
test('explicit selection settles before close cleanup can reject it', async () => {
	const { result, element, close } = choice();
	element.props.onChoose('device');
	await expect(result).resolves.toBe('device');
	expect(close).toHaveBeenCalledOnce();
});
test('cancel rejects without choosing the available device', async () => {
	const { result, element } = choice();
	element.props.onCancel();
	await expect(result).rejects.toThrow();
});
test('explicit named creation resolves its label rather than a device id', async () => {
	const { result, element } = choice();
	element.props.onChoose({ label: '我的设备' });
	await expect(result).resolves.toEqual({ label: '我的设备' });
});

test('aborting the owner rejects and closes without selecting; late callbacks cannot choose', async () => {
	const owner = new AbortController();
	const { result, element, close } = choice(owner.signal);
	const rejected = expect(result).rejects.toThrow();
	owner.abort();
	await rejected;
	expect(close).toHaveBeenCalledOnce();
	element.props.onChoose('device');
	expect(close).toHaveBeenCalledOnce();
});
test('an already aborted owner never creates a dialog', async () => {
	const owner = new AbortController();
	owner.abort();
	await expect(chooseVaultDevice({} as App, [], owner.signal)).rejects.toThrow();
	expect(openReactDialog).not.toHaveBeenCalled();
});

test('a native owner failure rejects and removes the abort listener', async () => {
	const controller = new AbortController();
	const remove = vi.spyOn(controller.signal, 'removeEventListener');
	vi.mocked(openReactDialog).mockImplementation(() => {
		throw new Error('Owner unavailable');
	});
	await expect(chooseVaultDevice({} as App, [], controller.signal)).rejects.toThrow('Owner unavailable');
	expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});

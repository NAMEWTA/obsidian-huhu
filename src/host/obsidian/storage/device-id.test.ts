import type { App } from 'obsidian';
import { expect, test } from 'vitest';
import { deviceId, initializeDevice } from './device-id';

test('the device identity exists only after the vault copy was written, and a failed write can be retried', async () => {
	const files = new Map<string, string>();
	let fail = true;
	const app = { vault: { adapter: {
		exists: async (path: string) => files.has(path), read: async (path: string) => files.get(path)!, mkdir: async () => {},
		write: async (path: string, text: string) => { if (fail) throw new Error('disk'); files.set(path, text); },
	} } } as unknown as App;
	const options = { machineIdentity: async () => 'machine:user', label: 'Test', chooseDevice: async () => ({ label: 'Manual' }) };
	expect(() => deviceId(app)).toThrow('not-initialized');
	await expect(initializeDevice(app, options)).rejects.toThrow('disk');
	expect(() => deviceId(app)).toThrow('not-initialized');
	fail = false;
	const identity = await initializeDevice(app, options);
	expect(deviceId(app)).toBe(identity.deviceId);
	expect(files.has('.huhu/config/identity.json')).toBe(true);
});

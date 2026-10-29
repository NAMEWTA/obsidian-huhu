import { expect, test, vi } from 'vitest';
import { AgentController } from './controller';

vi.mock('electron', () => ({ shell: {}, webUtils: {} }));
vi.mock('../platform/desktop/detection/shell-path', () => ({
	loginShellEnvironment: async () => ({}),
	loginShellPath: async () => '',
}));

test('prepare waits for the Space store, so a dispatch right after activation never sees a valid Space as missing', async () => {
	let loaded!: () => void;
	const ready = new Promise<void>((resolve) => {
		loaded = resolve;
	});
	const self = {
		stopped: false,
		preparing: undefined,
		dialogs: {},
		adoptLegacyDefaultAccounts: async () => {},
		agents: { refresh: async () => {} },
		spaces: { ready },
	};
	let done = false;
	const preparing = AgentController.prototype.prepare.call(self as unknown as AgentController).then(() => {
		done = true;
	});
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(done).toBe(false);
	loaded();
	await preparing;
	expect(done).toBe(true);
});

test('a Space store that failed to load does not break preparing the rest of the module', async () => {
	const self = {
		stopped: false,
		preparing: undefined,
		dialogs: {},
		adoptLegacyDefaultAccounts: async () => {},
		agents: { refresh: async () => {} },
		spaces: { ready: Promise.reject(new Error('load failed')) },
	};
	await expect(AgentController.prototype.prepare.call(self as unknown as AgentController)).resolves.toBeUndefined();
});

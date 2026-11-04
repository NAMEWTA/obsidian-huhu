import { expect, test, vi } from 'vitest';
import { LazyHealthRepairs } from './lazy-repairs';

test('idle repair facade has no provider activity and disposal cancels pending lazy initialization', async () => {
	const providers = vi.fn(async () => []);
	const repairs = new LazyHealthRepairs({ providers, acquire: async () => undefined, report: () => undefined, now: Date.now, id: () => crypto.randomUUID(), notify: async () => {} });
	expect(repairs.results).toEqual([]); expect(providers).not.toHaveBeenCalled();
	const pending = repairs.plan('report', []);
	repairs.dispose();
	await expect(pending).rejects.toThrow('health-disposed');
	expect(providers).not.toHaveBeenCalled(); expect(repairs.results).toEqual([]);
	await expect(repairs.recover({ providerId: 'archives.belongings', recoveryId: 'unused', action: 'resume' })).rejects.toThrow('health-disposed');
});

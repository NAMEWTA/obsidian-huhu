import { expect, it, vi } from 'vitest';
import { BrowserEngine, PageHandle } from './host';
import { newPageState } from '../core/model';
it('switches an inactive page profile lazily without requiring an existing guest', async () => {
	const host = {
		requireProfile: vi.fn((id: string) => {
			if (id === 'missing') throw Error('missing profile');
		}),
	} as unknown as BrowserEngine;
	const page = new PageHandle(host, newPageState('page', { url: 'https://example.com', profileId: 'default' }));
	await expect(page.setProfile('secondary')).resolves.toBeUndefined();
	expect(page.profileId).toBe('secondary');
	expect(page.native).toBeUndefined();
	await expect(page.setProfile('missing')).rejects.toThrow('missing profile');
	expect(page.profileId).toBe('secondary');
});

it('closePage keeps the native page alive when the workspace removal fails, and disposes it after success', async () => {
	const close = vi.fn().mockRejectedValueOnce(new Error('write failed')).mockResolvedValue(undefined);
	const disposePage = vi.fn();
	const engine = { workspace: { close }, disposePage } as unknown as BrowserEngine;
	await expect(BrowserEngine.prototype.closePage.call(engine, 'p')).rejects.toThrow('write failed');
	expect(disposePage).not.toHaveBeenCalled();
	await BrowserEngine.prototype.closePage.call(engine, 'p');
	expect(disposePage).toHaveBeenCalledExactlyOnceWith('p');
});

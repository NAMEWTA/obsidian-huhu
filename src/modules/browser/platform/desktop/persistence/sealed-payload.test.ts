import { describe, expect, it } from 'vitest';
import { openPayload, sealPayload } from './sealed-payload';
import { TestBrowserProtector } from '../../../../../../test/fixtures/browser-protector';

describe('sealed browser data', () => {
	it('wraps only an encryption key and authenticates a large body with its exact purpose', async () => {
		const protector = new TestBrowserProtector(), text = 'secret🔒'.repeat(200000), sealed = await sealPayload(protector, text, 'vault:A');
		expect(sealed).not.toContain('secret'); expect(await openPayload(protector, sealed, 'vault:A')).toBe(text);
		await expect(openPayload(protector, sealed, 'vault:B')).rejects.toMatchObject({ code: 'storage_corrupt' });
		const changed = JSON.parse(sealed) as Record<string, unknown>; const key = Object.keys(changed).find((name) => typeof changed[name] === 'string' && String(changed[name]).length > 100)!;
		changed[key] = `${(changed[key] as string).slice(0, -8)}AAAAAA==`; await expect(openPayload(protector, JSON.stringify(changed), 'vault:A')).rejects.toMatchObject({ code: 'storage_corrupt' });
	});
	it.each(['unavailable', 'weak-provider'] as const)('refuses %s instead of writing a weaker envelope', async (provider) => {
		const protector = new TestBrowserProtector(); protector.provider = provider;
		await expect(sealPayload(protector, 'value', 'purpose')).rejects.toMatchObject({ code: provider === 'unavailable' ? 'key_unavailable' : 'weak_provider' });
	});
});

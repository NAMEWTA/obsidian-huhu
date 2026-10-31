import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SecretProtector } from '../../src/host/desktop/secret-protector';

/** Authenticated stand-in for the OS boundary; these tests do not claim to exercise an OS keyring. */
export class TestBrowserProtector implements SecretProtector {
	provider: 'available' | 'unavailable' | 'weak-provider' = 'available';
	private readonly key = randomBytes(32);
	async status(): Promise<'available' | 'unavailable' | 'weak-provider'> { return this.provider; }
	async protect(text: string, purpose: string): Promise<string> {
		if (this.provider !== 'available') throw new Error('provider unavailable');
		const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv); cipher.setAAD(Buffer.from(purpose));
		return Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64');
	}
	async unprotect(text: string, purpose: string): Promise<string> {
		if (this.provider !== 'available') throw new Error('provider unavailable');
		const bytes = Buffer.from(text, 'base64'), cipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
		cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(bytes.subarray(-16));
		return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString('utf8');
	}
}

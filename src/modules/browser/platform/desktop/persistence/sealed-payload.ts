import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SecretProtector } from '../../../../../host/desktop/secret-protector';
import { AgentBrowserError } from '../../../core/contracts';

const MAX_BYTES = 64 * 1024 * 1024;
const decode = (value: unknown, size?: number): Buffer => {
	if (typeof value !== 'string' || value.length > MAX_BYTES * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new AgentBrowserError('storage_corrupt');
	const buffer = Buffer.from(value, 'base64');
	if (buffer.toString('base64') !== value || (size !== undefined && buffer.length !== size)) throw new AgentBrowserError('storage_corrupt');
	return buffer;
};
async function available(protector: SecretProtector): Promise<void> {
	const status = await protector.status();
	if (status !== 'available') throw new AgentBrowserError(status === 'weak-provider' ? 'weak_provider' : 'key_unavailable');
}
export async function sealPayload(protector: SecretProtector, text: string, purpose: string): Promise<string> {
	await available(protector);
	const key = randomBytes(32), iv = randomBytes(12), plain = Buffer.from(text);
	try {
		if (plain.length > MAX_BYTES) throw new AgentBrowserError('storage_quota');
		const wrappedKey = await protector.protect(key.toString('base64'), purpose);
		const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(Buffer.from(purpose));
		const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
		return JSON.stringify({ version: 1, wrappedKey, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: encrypted.toString('base64') });
	} finally { key.fill(0); plain.fill(0); }
}
export async function openPayload(protector: SecretProtector, text: string, purpose: string): Promise<string> {
	await available(protector);
	let key: Buffer | undefined, plain: Buffer | undefined;
	try {
		if (text.length > MAX_BYTES * 2) throw new Error();
		const raw = JSON.parse(text) as Record<string, unknown>;
		if (!raw || raw.version !== 1 || typeof raw.wrappedKey !== 'string' || raw.wrappedKey.length > 262144) throw new Error();
		key = decode(await protector.unprotect(raw.wrappedKey, purpose), 32);
		const decipher = createDecipheriv('aes-256-gcm', key, decode(raw.iv, 12));
		decipher.setAAD(Buffer.from(purpose)); decipher.setAuthTag(decode(raw.tag, 16));
		plain = Buffer.concat([decipher.update(decode(raw.ciphertext)), decipher.final()]);
		if (plain.length > MAX_BYTES) throw new Error();
		return new TextDecoder('utf-8', { fatal: true }).decode(plain);
	} catch { throw new AgentBrowserError('storage_corrupt'); }
	finally { key?.fill(0); plain?.fill(0); }
}

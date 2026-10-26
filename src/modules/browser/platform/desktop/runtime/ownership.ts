import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AgentBrowserError } from '../../../core/contracts';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile } from '../persistence/private-files';

export const managedId = (id: string): boolean => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id);
export interface ManagedOwner {
	version: 2;
	root: string;
	spaceId: string;
	runtimeId: string;
	purpose: 'space' | 'staging';
	ephemeral: boolean;
}
function canonical(value: Record<string, unknown>): string {
	return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))));
}
export async function ownershipKey(dataRoot: string, userData: string): Promise<{ key: string; rootHash: string }> {
	const actual = await privateDirectory(dataRoot);
	if (actual !== path.resolve(dataRoot)) throw new AgentBrowserError('browser_storage_path_invalid');
	const rootHash = createHash('sha256').update(actual).digest('hex');
	const hostRoot = await fs.realpath(userData);
	const directory = path.join(hostRoot, 'huhu', 'browser-runtime-ownership');
	if ((await privateDirectory(directory)) !== directory) throw new AgentBrowserError('browser_ownership_key_invalid');
	await fs.chmod(directory, 0o700);
	const file = path.join(directory, rootHash + '.key');
	let bytes: Buffer;
	try {
		bytes = await readPrivateFile(file, 32);
	} catch (error) {
		if (!isMissing(error)) throw new AgentBrowserError('browser_ownership_key_invalid');
		const fresh = randomBytes(32);
		try {
			await atomicPrivateFile(file, fresh, true);
		} catch (writeError) {
			if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError;
		} finally {
			fresh.fill(0);
		}
		bytes = await readPrivateFile(file, 32);
	}
	if (bytes.length !== 32 || (await fs.stat(file)).mode & 0o077) {
		bytes.fill(0);
		throw new AgentBrowserError('browser_ownership_key_invalid');
	}
	const key = bytes.toString('hex');
	bytes.fill(0);
	return { key, rootHash };
}
export function authenticatedRecord(bytes: Uint8Array, key: string): Record<string, unknown> {
	try {
		const envelope = JSON.parse(Buffer.from(bytes).toString('utf8')) as { data: unknown; mac: unknown };
		if (
			!envelope.data ||
			typeof envelope.data !== 'object' ||
			Array.isArray(envelope.data) ||
			typeof envelope.mac !== 'string' ||
			!/^[a-f\d]{64}$/.test(envelope.mac)
		)
			throw new Error();
		const expected = createHmac('sha256', Buffer.from(key, 'hex'))
			.update(canonical(envelope.data as Record<string, unknown>))
			.digest();
		if (!timingSafeEqual(expected, Buffer.from(envelope.mac, 'hex'))) throw new Error();
		return envelope.data as Record<string, unknown>;
	} catch {
		throw new AgentBrowserError('browser_owner_authentication_failed');
	}
}
export async function writeManagedOwner(profile: string, owner: ManagedOwner, key: string): Promise<void> {
	const data = owner as unknown as Record<string, unknown>;
	const mac = createHmac('sha256', Buffer.from(key, 'hex')).update(canonical(data)).digest('hex');
	await atomicPrivateFile(profile + '.huhu-owner.json', JSON.stringify({ data, mac }));
}
export async function readManagedOwner(
	profile: string,
	key: string,
	rootHash: string,
	spaceId: string,
	purpose: 'space' | 'staging',
): Promise<ManagedOwner | undefined> {
	let bytes: Buffer;
	try {
		bytes = await readPrivateFile(profile + '.huhu-owner.json', 8192);
	} catch (error) {
		if (isMissing(error)) return;
		throw error;
	}
	const value = authenticatedRecord(bytes, key);
	if (
		value.version !== 2 ||
		value.root !== rootHash ||
		value.spaceId !== spaceId ||
		value.purpose !== purpose ||
		typeof value.runtimeId !== 'string' ||
		!managedId(value.runtimeId) ||
		typeof value.ephemeral !== 'boolean' ||
		Object.keys(value).length !== 6
	)
		throw new AgentBrowserError('browser_owner_invalid');
	return value as unknown as ManagedOwner;
}

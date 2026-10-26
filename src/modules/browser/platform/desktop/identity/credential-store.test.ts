import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBrowserProtector } from '../../../../../../test/fixtures/browser-protector';
import { DesktopCredentialStore } from './credential-store';
import type { IdentityVersion } from '../../../core/identity';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const version = (): IdentityVersion => ({ id: 'seed-A', identityId: 'identity-A', label: 'Personal secret title', source: 'cookie-file', createdAt: 1000, seed: { format: 'huhu-browser-identity', version: 1, origins: [], cookies: [{ name: 'sid', value: 'top-secret-cookie', domain: 'example.com', hostOnly: true, path: '/', secure: true, httpOnly: true, session: true }] } });
async function setup() { const directory = await fs.mkdtemp(path.join(tmpdir(), 'huhu-credentials-')); roots.push(directory); const protector = new TestBrowserProtector(); return { directory, protector, store: new DesktopCredentialStore({ directory, protector, vaultId: 'vault', deviceId: 'device' }) }; }
describe('immutable encrypted identity versions', () => {
	it('publishes only verified ciphertext, survives restart and cannot overwrite an existing version', async () => {
		const { store, directory, protector } = await setup(); const original = version(), saving = store.create(original); original.seed.cookies[0]!.value = 'mutated'; await saving;
		const bytes = await fs.readFile(path.join(directory, 'seed-A.sealed'), 'utf8'); expect(bytes).not.toContain('top-secret-cookie'); expect(bytes).not.toContain('Personal secret');
		const reopened = new DesktopCredentialStore({ directory, protector, vaultId: 'vault', deviceId: 'device' }); expect((await reopened.read('seed-A')).seed.cookies[0]?.value).toBe('top-secret-cookie');
		await expect(store.create(version())).rejects.toMatchObject({ code: 'identity_exists' }); expect(await store.listIds()).toEqual(['seed-A']);
		if (process.platform !== 'win32') expect((await fs.stat(path.join(directory, 'seed-A.sealed'))).mode & 0o777).toBe(0o600);
	});
	it('rejects another vault, ciphertext corruption and symlink reads', async () => {
		const { store, directory, protector } = await setup(); await store.create(version());
		const wrong = new DesktopCredentialStore({ directory, protector, vaultId: 'other', deviceId: 'device' }); await expect(wrong.read('seed-A')).rejects.toMatchObject({ code: 'identity_corrupt' });
		const file = path.join(directory, 'seed-A.sealed'); await fs.rename(file, path.join(directory, 'outside')); await fs.symlink(path.join(directory, 'outside'), file); await expect(store.read('seed-A')).rejects.toMatchObject({ code: 'identity_corrupt' });
	});
	it('refuses weak protection, and locking during an asynchronous seal prevents publication', async () => {
		const { store, directory, protector } = await setup(); protector.provider = 'weak-provider'; await expect(store.create(version())).rejects.toMatchObject({ code: 'weak_provider' }); expect(await fs.readdir(directory)).toEqual([]);
		protector.provider = 'available'; const original = protector.protect.bind(protector); let release!: () => void, entered!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; }), started = new Promise<void>((resolve) => { entered = resolve; });
		protector.protect = async (...args) => { entered(); await gate; return original(...args); };
		const saving = store.create(version()); await started; store.lock(); release(); await expect(saving).rejects.toMatchObject({ code: 'identity_locked' }); expect(await fs.readdir(directory)).toEqual([]);
	});
});

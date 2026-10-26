import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBrowserProtector } from '../../../../../../test/fixtures/browser-protector';
import { DesktopBrowserPersistence } from './browser-persistence';

const roots: string[] = [], stores: DesktopBrowserPersistence[] = [];
afterEach(async () => { await Promise.all(stores.splice(0).map((store) => store.dispose())); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
async function setup() { const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-storage-')); roots.push(root); const protector = new TestBrowserProtector(); const store = new DesktopBrowserPersistence({ root, protector }); stores.push(store); await store.initialize(); return { root, protector, store }; }
describe('exclusive browser persistence', () => {
	it('retains encrypted records, stable owner identity and keyed digests across restart', async () => {
		const { root, protector, store } = await setup(); const ownerId = store.ownerId, digest = await store.digest('request-private'); await store.write('catalog', { label: 'private-url', secret: 'cookie-value' });
		expect(await store.keys('cat')).toEqual(['catalog']); const filename = path.join(root, 'records', `${Buffer.from('catalog').toString('hex')}.sealed`); expect(await fs.readFile(filename, 'utf8')).not.toContain('private-url');
		await store.dispose(); const next = new DesktopBrowserPersistence({ root, protector }); stores.push(next); await next.initialize();
		expect(next.ownerId).toBe(ownerId); expect(await next.digest('request-private')).toBe(digest); expect(await next.read('catalog')).toEqual({ label: 'private-url', secret: 'cookie-value' });
	});
	it('a second owner cannot read secrets or mutate, including a canonical parent alias', async () => {
		const { root, protector, store } = await setup(); await store.write('catalog', { secret: 'first' });
		const container = await fs.mkdtemp(path.join(tmpdir(), 'huhu-alias-')); roots.push(container); await fs.symlink(path.dirname(root), path.join(container, 'parent'));
		const other = new DesktopBrowserPersistence({ root: path.join(container, 'parent', path.basename(root)), protector }); stores.push(other); await other.initialize(); expect(other.readOnly).toBe(true);
		await expect(other.read('catalog')).rejects.toMatchObject({ code: 'owned_by_other_instance' }); await expect(other.write('catalog', {})).rejects.toMatchObject({ code: 'owned_by_other_instance' });
	});
	it('missing digest key and replaced records directory fail closed instead of producing fresh empty data', async () => {
		const { root, protector, store } = await setup(); await store.write('operations/A', { secret: 'x' }); await store.dispose(); await fs.unlink(path.join(root, 'digest-key.sealed'));
		const next = new DesktopBrowserPersistence({ root, protector }); stores.push(next); await expect(next.initialize()).rejects.toMatchObject({ code: 'key_unavailable' });
		const other = await setup(); await fs.rename(path.join(other.root, 'records'), path.join(other.root, 'records-old')); await fs.symlink(path.join(other.root, 'records-old'), path.join(other.root, 'records'));
		await expect(other.store.keys('')).rejects.toMatchObject({ code: 'storage_owner_lost' });
	});
	it('weak providers remain memory-only and cannot unlock existing encrypted records', async () => {
		const { root, protector, store } = await setup(); await store.write('catalog', { data: 'x' }); await store.dispose(); protector.provider = 'weak-provider';
		const locked = new DesktopBrowserPersistence({ root, protector }); stores.push(locked); await expect(locked.initialize()).rejects.toMatchObject({ code: 'credential_store_locked' });
		const memoryRoot = await fs.mkdtemp(path.join(tmpdir(), 'huhu-memory-')); roots.push(memoryRoot); const memory = new DesktopBrowserPersistence({ root: memoryRoot, protector }); stores.push(memory); await memory.initialize();
		expect(await memory.security()).toBe('unavailable'); await memory.write('catalog', { temporary: true }); expect(await memory.read('catalog')).toEqual({ temporary: true }); expect(await fs.readdir(memoryRoot)).toEqual([]);
	});
	it('bounds operation payloads and aggregate ciphertext before further writes', async () => {
		const { store, root, protector } = await setup(); await expect(store.write('operations/oversized', { result: 'x'.repeat(9 * 1024 * 1024) })).rejects.toMatchObject({ code: 'storage_quota' }); await store.dispose();
		for (let index = 0; index < 3; index++) { const file = await fs.open(path.join(root, 'records', `${Buffer.from(`large-${index}`).toString('hex')}.sealed`), 'w'); await file.truncate(90 * 1024 * 1024); await file.close(); }
		const next = new DesktopBrowserPersistence({ root, protector }); stores.push(next); await expect(next.initialize()).rejects.toMatchObject({ code: 'storage_quota' });
	});
});

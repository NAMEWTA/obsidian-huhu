import { afterEach, expect, test, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ownershipKey, writeManagedOwner } from './ownership';
import { createMainFactory, type MainFactory } from './host-main';

const host = vi.hoisted(() => ({ userData: '' }));
vi.mock('electron', () => ({
	app: { getPath: () => host.userData },
	webContents: {
		fromId: () => ({ isDestroyed: () => false, once: () => undefined, removeListener: () => undefined }),
	},
	utilityProcess: {
		fork: () => {
			throw Error('Unexpected process launch');
		},
	},
}));
const roots: string[] = [],
	factories: MainFactory[] = [];
afterEach(async () => {
	for (const factory of factories.splice(0)) await factory.dispose();
	for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const nativeTest = test.skipIf(process.platform !== 'linux' || process.arch !== 'x64');
async function setup() {
	const directory = await fs.mkdtemp(path.join(tmpdir(), 'huhu-browser-recovery-'));
	roots.push(directory);
	host.userData = path.join(directory, 'host');
	await fs.mkdir(host.userData);
	const dataRoot = path.join(directory, 'browser'),
		credentials = await ownershipKey(dataRoot, host.userData);
	const factory = createMainFactory({ dataRoot, ownerId: 1, workerHash: '0'.repeat(64) });
	factories.push(factory);
	async function profile(spaceId: string, ephemeral: boolean) {
		const file = path.join(dataRoot, 'profiles', spaceId);
		await fs.mkdir(file, { recursive: true });
		await fs.writeFile(path.join(file, 'fixture'), 'synthetic profile');
		await writeManagedOwner(
			file,
			{ version: 2, root: credentials.rootHash, spaceId, runtimeId: randomUUID(), purpose: 'space', ephemeral },
			credentials.key,
		);
		return file;
	}
	return { factory, dataRoot, profile };
}
nativeTest('startup recovery removes only authenticated previous-activation ephemeral profiles', async () => {
	const f = await setup(),
		ephemeral = await f.profile(randomUUID(), true),
		persistent = await f.profile(randomUUID(), false);
	await f.factory.recoverEphemeral();
	await expect(fs.stat(ephemeral)).rejects.toMatchObject({ code: 'ENOENT' });
	expect(await fs.readFile(path.join(persistent, 'fixture'), 'utf8')).toBe('synthetic profile');
});
nativeTest('retry cleanup preserves every ID claimed by the current activation, including partial start', async () => {
	const f = await setup(),
		id = randomUUID();
	await expect(f.factory.start({ spaceId: id, runtimeId: randomUUID(), ephemeral: true })).rejects.toBeDefined();
	const current = await f.profile(id, true);
	await f.factory.recoverEphemeral();
	expect(await fs.readFile(path.join(current, 'fixture'), 'utf8')).toBe('synthetic profile');
});
nativeTest('unknown nonempty profiles remain intact and produce retryable cleanup pending', async () => {
	const f = await setup(),
		unknown = path.join(f.dataRoot, 'profiles', randomUUID());
	await fs.mkdir(unknown, { recursive: true });
	await fs.writeFile(path.join(unknown, 'fixture'), 'unclaimed');
	await expect(f.factory.recoverEphemeral()).rejects.toMatchObject({ code: 'browser_cleanup_pending' });
	expect(await fs.readFile(path.join(unknown, 'fixture'), 'utf8')).toBe('unclaimed');
});

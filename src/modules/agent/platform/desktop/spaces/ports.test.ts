import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { freeWriterPorts } from './free-writer-port.fixture';
import { createDesktopSpacePorts } from './ports';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-t02-b-factory-'));
	roots.push(root);
	const vaultRoot = path.join(root, 'vault');
	const selectedPath = path.join(root, 'selected');
	await mkdir(vaultRoot);
	await mkdir(selectedPath);
	return { root, vaultRoot, selectedPath };
}

test('factory lazily uses only its owner window native directory chooser, and returns the actual canonical cwd', async () => {
	const { vaultRoot, selectedPath } = await fixture();
	const owner = {};
	const showOpenDialog = vi.fn(async () => ({ canceled: false, filePaths: [selectedPath] }));
	const require = vi.fn(() => ({ getCurrentWindow: () => owner, dialog: { showOpenDialog } }));
	const ports = createDesktopSpacePorts({ vaultRoot, vaultId: 'vault', deviceId: 'device', win: { require } as unknown as Window, writerPort: freeWriterPorts() });
	expect(require).not.toHaveBeenCalled();
	const vault = await ports.directories.inspectVault();
	expect(require).not.toHaveBeenCalled();
	expect(await readdir(vaultRoot)).toEqual([]);
	const choice = await ports.directories.chooseExternalDirectory(vault);
	expect(require).toHaveBeenCalledWith('@electron/remote');
	expect(showOpenDialog).toHaveBeenCalledExactlyOnceWith(owner, { properties: ['openDirectory'] });
	const grant = { ...choice!, id: 'confirmed', createdAt: 10 };
	await expect(ports.directories.resolveDirectory(vault, { kind: 'external', grantId: grant.id }, grant)).resolves.toEqual({ cwd: choice!.target.canonicalPath });
	const lease = await ports.owners.acquire(vault, 'owner');
	try { await expect(lease.assertHeld()).resolves.toBeUndefined(); }
	finally { await lease.close(); }
});

test('native cancellation, unavailable remote, and late modal selection never create directory authorization', async () => {
	const { vaultRoot, selectedPath } = await fixture();
	let finish!: (value: { canceled: boolean; filePaths: string[] }) => void;
	const chooser = vi.fn(() => new Promise<{ canceled: boolean; filePaths: string[] }>(resolve => { finish = resolve; }));
	const ports = createDesktopSpacePorts({ vaultRoot, vaultId: 'vault', deviceId: 'device', win: { require: () => ({ getCurrentWindow: () => ({}), dialog: { showOpenDialog: chooser } }) } as unknown as Window });
	const vault = await ports.directories.inspectVault();
	const abort = new AbortController();
	const pending = ports.directories.chooseExternalDirectory(vault, abort.signal);
	await vi.waitFor(() => expect(chooser).toHaveBeenCalledOnce());
	abort.abort();
	expect(await pending).toBeUndefined();
	finish({ canceled: false, filePaths: [selectedPath] });
	const cancelled = ports.directories.chooseExternalDirectory(vault);
	await vi.waitFor(() => expect(chooser).toHaveBeenCalledTimes(2));
	finish({ canceled: true, filePaths: [selectedPath] });
	expect(await cancelled).toBeUndefined();
	const cause = new Error('remote unavailable');
	const unavailable = createDesktopSpacePorts({ vaultRoot, vaultId: 'vault', deviceId: 'device', win: { require: () => { throw cause; } } as unknown as Window });
	await expect(unavailable.directories.chooseExternalDirectory(vault)).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE', reason: 'chooser-unavailable', cause });
	expect(await readdir(vaultRoot)).toEqual([]);
});

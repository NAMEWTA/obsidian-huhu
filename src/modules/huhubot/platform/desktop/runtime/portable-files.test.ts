import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { PortableFiles } from './portable-files';

it('reads only an opaque Go-owned artifact and validates its exact size', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-portable-'));
	try {
		const directory = path.join(root, 'portable', 'artifacts'); await mkdir(directory, { recursive: true });
		const bytes = Buffer.from('{"formatVersion":1}'), id = 'a'.repeat(32);
		await writeFile(path.join(directory, `${id}.json`), bytes);
		const bridge = new PortableFiles(root, () => true), ref = { artifactId: `artifact:${id}`, mediaType: 'application/vnd.huhu.portable+json', size: String(bytes.length) };
		expect(await bridge.read(ref)).toEqual(bytes);
		await expect(bridge.read({ ...ref, size: '1' })).rejects.toThrow('HUHUBOT_PORTABLE_FILE_CHANGED');
		await expect(bridge.read({ ...ref, artifactId: 'artifact:../../profile.sqlite3' })).rejects.toThrow('HUHUBOT_PORTABLE_REF_INVALID');
	} finally { await rm(root, { recursive: true, force: true }); }
});

it('rejects a managed ancestor link before reading an artifact', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-portable-link-'));
	const outside = await mkdtemp(path.join(tmpdir(), 'huhu-portable-outside-'));
	try {
		await symlink(outside, path.join(root, 'portable'), process.platform === 'win32' ? 'junction' : 'dir');
		await expect(new PortableFiles(root, () => true).read({ artifactId: `artifact:${'a'.repeat(32)}`, mediaType: 'application/vnd.huhu.portable+json', size: '2' })).rejects.toThrow('HUHUBOT_PORTABLE_ROOT_INVALID');
	} finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});

it('never overwrites Profile storage even if it is chosen as an export destination', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-portable-export-'));
	try {
		await mkdir(path.join(root, 'data'));
		const database = path.join(root, 'data', 'profile.sqlite3');
		await writeFile(database, 'PRESERVED');
		const bridge = new PortableFiles(root, () => true), ref = { artifactId: `artifact:${'a'.repeat(32)}`, mediaType: 'application/vnd.huhu.portable+json', size: '2' };
		const win = { require: () => ({ getCurrentWindow: () => undefined, dialog: { showSaveDialog: async () => ({ canceled: false, filePath: database }) } }) } as unknown as Window;
		await expect(bridge.save(ref, win)).rejects.toThrow('HUHUBOT_PORTABLE_DESTINATION_INVALID');
		expect(await readFile(database, 'utf8')).toBe('PRESERVED');
	} finally { await rm(root, { recursive: true, force: true }); }
});

it('hands an explicitly selected file to the Go upload owner without writing a Profile artifact', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-portable-upload-'));
	try {
		const selected = path.join(root, 'chosen.json'), profile = path.join(root, 'profile');
		await mkdir(profile); await writeFile(selected, '{"version":1}');
		let uploaded = '';
		const ref = { artifactId: `artifact:${'a'.repeat(32)}`, mediaType: 'application/vnd.huhu.portable+json', size: '13' };
		const bridge = new PortableFiles(profile, () => true, async bytes => { uploaded = new TextDecoder().decode(bytes); return ref; });
		const win = { require: () => ({ getCurrentWindow: () => undefined, dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [selected] }) } }) } as unknown as Window;
		expect(await bridge.choose(win)).toEqual(ref);
		expect(uploaded).toBe('{"version":1}');
		expect(await readdir(profile)).toEqual([]);
	} finally { await rm(root, { recursive: true, force: true }); }
});

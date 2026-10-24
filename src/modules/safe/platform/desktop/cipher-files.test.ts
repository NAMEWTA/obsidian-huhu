import { afterEach, describe, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, truncate, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { MAX_CONTAINER_BYTES } from '../../core/model';
import { createCipherFiles, readCipherFile } from './cipher-files';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function fixture() {
	const root = await mkdtemp(path.join(os.tmpdir(), 'huhu-safe-files-'));
	roots.push(root);
	return { root, directory: path.join(root, '.huhu', 'safe'), files: createCipherFiles(root) };
}

describe('desktop ciphertext files', () => {
	test('probing missing storage does not create a safe or its directory', async () => {
		const { root, files } = await fixture();
		expect(await files.read('vault.enc')).toBeNull();
		expect(await readdir(root)).toEqual([]);
	});

	test('stages private ciphertext and atomically replaces an existing primary', async () => {
		const { directory, files } = await fixture();
		const first = await files.stage('first cipher');
		await files.publish(first, 'vault.enc');
		const next = await files.stage('second cipher');
		expect(await files.read('vault.enc')).toBe('first cipher');
		expect(await files.read(next)).toBe('second cipher');
		await files.publish(next, 'vault.enc');
		expect(await files.read('vault.enc')).toBe('second cipher');
		expect(await readdir(directory)).toEqual(['vault.enc']);
		if (process.platform !== 'win32') {
			expect((await stat(directory)).mode & 0o777).toBe(0o700);
			expect((await stat(path.join(directory, 'vault.enc'))).mode & 0o777).toBe(0o600);
		}
	});

	test('a failed rename never deletes the destination first', async () => {
		const { directory, files } = await fixture();
		const staged = await files.stage('candidate cipher');
		await mkdir(path.join(directory, 'vault.enc'));
		await writeFile(path.join(directory, 'vault.enc', 'keep'), 'existing data');
		await expect(files.publish(staged, 'vault.enc')).rejects.toMatchObject({ code: 'storage' });
		expect(await readFile(path.join(directory, 'vault.enc', 'keep'), 'utf8')).toBe('existing data');
		expect(await files.read(staged)).toBe('candidate cipher');
	});

	test('limits the file before reading its content and preserves oversized data', async () => {
		const { root } = await fixture();
		const file = path.join(root, 'large.enc');
		await writeFile(file, '');
		await truncate(file, MAX_CONTAINER_BYTES + 1);
		await expect(readCipherFile(file)).rejects.toMatchObject({ code: 'too-large' });
		expect((await stat(file)).size).toBe(MAX_CONTAINER_BYTES + 1);
	});

	test('rejects malformed UTF-8 instead of silently changing the baseline bytes', async () => {
		const { root } = await fixture();
		const file = path.join(root, 'invalid.enc');
		await writeFile(file, Buffer.from([0xff, 0xfe]));
		await expect(readCipherFile(file)).rejects.toMatchObject({ code: 'invalid-format' });
		expect(await readFile(file)).toEqual(Buffer.from([0xff, 0xfe]));
	});

	test('preserves a UTF-8 BOM in the raw baseline instead of silently removing it', async () => {
		const { root, files } = await fixture();
		const raw = '\uFEFF{"format":"huhu-safe"}';
		const file = path.join(root, 'bom.enc');
		await writeFile(file, raw, 'utf8');
		expect(await readCipherFile(file)).toBe(raw);
		const staged = await files.stage(raw);
		await files.publish(staged, 'vault.enc');
		expect(await files.read('vault.enc')).toBe(raw);
		expect(await readFile(path.join(root, '.huhu', 'safe', 'vault.enc'))).toEqual(Buffer.from(raw, 'utf8'));
	});

	test('does not treat an existing directory as a missing file', async () => {
		const { root } = await fixture();
		await expect(readCipherFile(root)).rejects.toMatchObject({ code: 'storage' });
	});

	test('accepts exactly the names the safe writes, including the kept upgrade and import copies', async () => {
		const { files } = await fixture();
		const id = '00000000-0000-4000-8000-000000000001';
		for (const name of ['vault.enc', 'vault.enc.backup', `conflict-${id}.enc`, `preserved-${id}.enc`, `preupgrade-${id}.enc`, `preimport-${id}.enc`]) {
			const staged = await files.stage(`cipher for ${name}`);
			await files.publish(staged, name);
			expect(await files.read(name)).toBe(`cipher for ${name}`);
		}
		for (const name of [`other-${id}.enc`, 'preimport-short.enc', `preimport-${id}.enc.bak`]) {
			await expect(files.read(name)).rejects.toMatchObject({ code: 'storage' });
		}
	});

	test('discards only its own temporary names and rejects traversal', async () => {
		const { files } = await fixture();
		const staged = await files.stage('cipher');
		await files.discard(staged);
		expect(await files.read(staged)).toBeNull();
		await expect(files.read('../foreign.enc')).rejects.toMatchObject({ code: 'storage' });
		await expect(files.discard('vault.enc')).rejects.toMatchObject({ code: 'storage' });
	});

	test.skipIf(process.platform === 'win32')('rejects symlinks inside managed storage without modifying the target', async () => {
		const { root, directory, files } = await fixture();
		await mkdir(directory, { recursive: true });
		const foreign = path.join(root, 'foreign.enc');
		await writeFile(foreign, 'foreign cipher');
		await symlink(foreign, path.join(directory, 'vault.enc'));
		await expect(files.read('vault.enc')).rejects.toMatchObject({ code: 'storage' });
		await expect(files.stage('candidate cipher')).rejects.toMatchObject({ code: 'storage' });
		expect(await readFile(foreign, 'utf8')).toBe('foreign cipher');
	});
});

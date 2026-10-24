import { describe, expect, test } from 'vitest';
import { SafeError } from '../core/model';
import type { CipherFiles } from '../platform/desktop/cipher-files';
import { CipherRepository } from './cipher-repository';

const MAIN = 'vault.enc', BACKUP = 'vault.enc.backup';
const OLD = '{"key":"old-cipher-key","payload":"old-cipher-payload"}';
const NEXT = '{"key":"new-cipher-key","payload":"new-cipher-payload"}';
const FOREIGN = '{"key":"foreign-cipher-key","payload":"foreign-cipher-payload"}';

class MemoryFiles implements CipherFiles {
	readonly values = new Map<string, string>();
	readonly published: string[] = [];
	beforeRead?: (name: string) => void;
	beforePublish?: (name: string) => void;
	afterPublish?: (name: string) => void;
	private counter = 0;
	async read(name: string): Promise<string | null> {
		this.beforeRead?.(name);
		return this.values.get(name) ?? null;
	}
	async stage(raw: string): Promise<string> {
		const name = `.tmp-${++this.counter}`;
		this.values.set(name, raw);
		return name;
	}
	async publish(staged: string, name: string): Promise<void> {
		this.beforePublish?.(name);
		const raw = this.values.get(staged);
		if (raw === undefined) throw new SafeError('storage');
		this.values.set(name, raw);
		this.values.delete(staged);
		this.published.push(name);
		this.afterPublish?.(name);
	}
	async discard(staged: string): Promise<void> { this.values.delete(staged); }
}

function setup(main: string | null = OLD, backup: string | null = OLD) {
	const files = new MemoryFiles();
	if (main !== null) files.values.set(MAIN, main);
	if (backup !== null) files.values.set(BACKUP, backup);
	let id = 0;
	const repository = new CipherRepository(files, () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`);
	return { files, repository };
}

describe('ciphertext repository', () => {
	test('creates a complete backup before the first primary file', async () => {
		const { files, repository } = setup(null, null);
		await repository.create(NEXT);
		expect(files.published).toEqual([BACKUP, MAIN]);
		expect(await repository.probe()).toEqual({ main: NEXT, backup: NEXT });
	});

	test('an interrupted first creation leaves recoverable ciphertext and refuses reinitialization', async () => {
		const { files, repository } = setup(null, null);
		files.beforePublish = name => { if (name === MAIN) throw new Error('disk unavailable'); };
		await expect(repository.create(NEXT)).rejects.toMatchObject({ code: 'storage' });
		expect(files.values.get(BACKUP)).toBe(NEXT);
		expect(files.values.has(MAIN)).toBe(false);
		await expect(repository.create(OLD)).rejects.toMatchObject({ code: 'exists' });
	});

	test('writes a single prior-version backup before publishing the replacement', async () => {
		const { files, repository } = setup();
		await repository.commit(NEXT, OLD);
		expect(files.values.get(MAIN)).toBe(NEXT);
		expect(files.values.get(BACKUP)).toBe(OLD);
		expect(files.published).toEqual([BACKUP, MAIN]);
		expect([...files.values.keys()].some(name => name.startsWith('.tmp-'))).toBe(false);
	});

	test('preserves the entire candidate instead of overwriting an external version', async () => {
		const { files, repository } = setup(FOREIGN);
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(FOREIGN);
		const conflict = [...files.values].find(([name]) => name.startsWith('conflict-'));
		expect(conflict?.[1]).toBe(NEXT);
		expect(files.values.get(BACKUP)).toBe(OLD);
	});

	test('compares raw bytes, without treating equivalent JSON as the same version', async () => {
		const { files, repository } = setup(OLD + '\n');
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(OLD + '\n');
	});

	test('rechecks the primary after preparing its backup', async () => {
		const { files, repository } = setup();
		files.afterPublish = name => { if (name === BACKUP) files.values.set(MAIN, FOREIGN); };
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(FOREIGN);
		expect([...files.values].find(([name]) => name.startsWith('conflict-'))?.[1]).toBe(NEXT);
	});

	test('never reports a preserved conflict until its write has been verified', async () => {
		const { files, repository } = setup(FOREIGN);
		files.beforePublish = name => { if (name.startsWith('conflict-')) throw new Error('no space'); };
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'conflict-unsaved' });
		expect(files.values.get(MAIN)).toBe(FOREIGN);
		expect([...files.values.keys()].some(name => name.startsWith('conflict-'))).toBe(false);
	});

	test('a failed backup write leaves the old primary untouched', async () => {
		const { files, repository } = setup(OLD, FOREIGN);
		files.beforePublish = name => { if (name === BACKUP) throw new Error('disk unavailable'); };
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'storage' });
		expect(files.values.get(MAIN)).toBe(OLD);
		expect(files.values.get(BACKUP)).toBe(FOREIGN);
		expect(files.published).toEqual([]);
	});

	test('resolves an uncertain rename result by readback, without publishing twice', async () => {
		const { files, repository } = setup();
		files.afterPublish = name => { if (name === MAIN) throw new Error('directory sync unavailable'); };
		await repository.commit(NEXT, OLD);
		expect(files.values.get(MAIN)).toBe(NEXT);
		expect(files.published.filter(name => name === MAIN)).toHaveLength(1);
	});

	test('failed readback does not produce a success result', async () => {
		const { files, repository } = setup();
		files.afterPublish = name => { if (name === MAIN) files.values.set(MAIN, FOREIGN); };
		await expect(repository.commit(NEXT, OLD)).rejects.toMatchObject({ code: 'storage' });
		expect(files.values.get(MAIN)).toBe(FOREIGN);
	});

	test('a read failure is never interpreted as an empty safe', async () => {
		const { files, repository } = setup(null, null);
		files.beforeRead = () => { throw new SafeError('storage'); };
		await expect(repository.probe()).rejects.toMatchObject({ code: 'storage' });
		await expect(repository.create(NEXT)).rejects.toMatchObject({ code: 'storage' });
		expect(files.published).toEqual([]);
	});

	test('restoration preserves the displaced primary and keeps the sole good backup', async () => {
		const { files, repository } = setup(FOREIGN, OLD);
		await repository.restore(NEXT, FOREIGN);
		expect(files.values.get(MAIN)).toBe(NEXT);
		expect(files.values.get(BACKUP)).toBe(OLD);
		expect([...files.values].find(([name]) => name.startsWith('preserved-'))?.[1]).toBe(FOREIGN);
	});

	test('restores a missing primary without trying to preserve a missing file', async () => {
		const { files, repository } = setup(null, OLD);
		await repository.restore(OLD, null);
		expect(await repository.probe()).toEqual({ main: OLD, backup: OLD });
		expect(files.published).toEqual([MAIN]);
	});

	test('keeps the file a bulk change starts from as its own copy, then publishes like an ordinary commit', async () => {
		const { files, repository } = setup();
		await repository.commitKeeping('preupgrade', NEXT, OLD);
		expect(files.values.get(MAIN)).toBe(NEXT);
		expect(files.values.get(BACKUP)).toBe(OLD);
		expect([...files.values].filter(([name]) => name.startsWith('preupgrade-')).map(([, raw]) => raw)).toEqual([OLD]);
		expect(files.published).toEqual(['preupgrade-00000000-0000-4000-8000-000000000001.enc', BACKUP, MAIN]);
		// A later ordinary save rotates the single backup but the kept copy stays.
		await repository.commit(FOREIGN, NEXT);
		expect(files.values.get(BACKUP)).toBe(NEXT);
		expect([...files.values].filter(([name]) => name.startsWith('preupgrade-')).map(([, raw]) => raw)).toEqual([OLD]);
	});

	test('a kept copy that cannot be written stops the change before anything else is touched', async () => {
		const { files, repository } = setup(OLD, FOREIGN);
		files.beforePublish = name => { if (name.startsWith('preimport-')) throw new Error('disk full'); };
		await expect(repository.commitKeeping('preimport', NEXT, OLD)).rejects.toMatchObject({ code: 'storage' });
		expect(files.values.get(MAIN)).toBe(OLD);
		expect(files.values.get(BACKUP)).toBe(FOREIGN);
		expect([...files.values.keys()].some(name => name.startsWith('preimport-'))).toBe(false);
	});

	test('does not keep a copy or publish when the primary changed outside', async () => {
		const { files, repository } = setup(FOREIGN);
		await expect(repository.commitKeeping('preimport', NEXT, OLD)).rejects.toMatchObject({ code: 'conflict' });
		expect(files.values.get(MAIN)).toBe(FOREIGN);
		expect([...files.values.keys()].some(name => name.startsWith('preimport-'))).toBe(false);
	});
});

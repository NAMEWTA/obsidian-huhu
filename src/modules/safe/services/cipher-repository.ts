import { SafeError } from '../core/model';
import type { CipherFiles } from '../platform/desktop/cipher-files';
import { huhuPath } from '../../../shared/storage/huhu-paths';

export const SAFE_MAIN_PATH = huhuPath('safe', 'vault.enc');
const MAIN = 'vault.enc';
const BACKUP = 'vault.enc.backup';

/**
 * Ciphertext publication only: no decryption, merging, automatic recovery or
 * nested queue. The service authenticates candidates and serializes every call.
 */
export class CipherRepository {
	constructor(private readonly files: CipherFiles, private readonly uuid: () => string = () => crypto.randomUUID()) {}

	readCurrent(): Promise<string | null> {
		return this.files.read(MAIN);
	}

	readBackup(): Promise<string | null> {
		return this.files.read(BACKUP);
	}

	async probe(): Promise<{ main: string | null; backup: string | null }> {
		const main = await this.readCurrent();
		const backup = await this.readBackup();
		return { main, backup };
	}

	async create(raw: string): Promise<void> {
		const current = await this.probe();
		if (current.main !== null || current.backup !== null) throw new SafeError('exists');
		// A crash before main publication leaves a complete recoverable backup.
		await this.write(BACKUP, raw);
		await this.checkCurrent(raw, null);
		await this.replace(raw, null);
	}

	async commit(raw: string, expectedRaw: string): Promise<void> {
		await this.checkCurrent(raw, expectedRaw);
		const staged = await this.files.stage(raw);
		try {
			await this.write(BACKUP, expectedRaw);
			await this.checkCurrent(raw, expectedRaw);
			await this.publish(staged, MAIN, raw);
		} finally {
			await this.files.discard(staged).catch(() => {});
		}
	}

	/**
	 * A commit that first keeps the file it starts from as its own encrypted copy. `vault.enc.backup` is replaced by
	 * every later save, so changes that rewrite many records at once (the schema upgrade, a merge import) leave a
	 * copy that stays until the user removes it. Nothing is deleted automatically.
	 */
	async commitKeeping(kind: 'preupgrade' | 'preimport', raw: string, expectedRaw: string): Promise<void> {
		await this.checkCurrent(raw, expectedRaw);
		await this.write(`${kind}-${this.uuid()}.enc`, expectedRaw);
		await this.commit(raw, expectedRaw);
	}

	async restore(raw: string, expectedRaw: string | null): Promise<void> {
		await this.checkCurrent(raw, expectedRaw);
		// Keep the sole known-good backup intact. Missing main is a valid recovery.
		if (expectedRaw !== null) await this.write(`preserved-${this.uuid()}.enc`, expectedRaw);
		await this.replace(raw, expectedRaw);
	}

	private async replace(raw: string, expectedRaw: string | null): Promise<void> {
		const staged = await this.files.stage(raw);
		try {
			await this.checkCurrent(raw, expectedRaw);
			await this.publish(staged, MAIN, raw);
		} finally {
			await this.files.discard(staged).catch(() => {});
		}
	}

	private async checkCurrent(candidate: string, expectedRaw: string | null): Promise<void> {
		if (await this.readCurrent() === expectedRaw) return;
		try {
			await this.write(`conflict-${this.uuid()}.enc`, candidate);
		} catch {
			throw new SafeError('conflict-unsaved');
		}
		throw new SafeError('conflict');
	}

	private async write(name: string, raw: string): Promise<void> {
		const staged = await this.files.stage(raw);
		try {
			await this.publish(staged, name, raw);
		} finally {
			await this.files.discard(staged).catch(() => {});
		}
	}

	private async publish(staged: string, name: string, raw: string): Promise<void> {
		try {
			await this.files.publish(staged, name);
		} catch {
			// Rename may have succeeded before directory sync failed. Resolve the
			// uncertain result by reading; never blindly repeat a write.
			if (await this.files.read(name) === raw) return;
			throw new SafeError('storage');
		}
		if (await this.files.read(name) !== raw) throw new SafeError('storage');
	}
}

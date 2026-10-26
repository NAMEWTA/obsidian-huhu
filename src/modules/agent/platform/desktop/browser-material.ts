import path from 'node:path';
import { mkdir, open, realpath, rm } from 'node:fs/promises';
import type { BrowserMaterial } from '../../../browser/api';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { BROWSER_MATERIALS_ROOT } from '../../../../shared/storage/vault-layout';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_IMAGES = 16;

/** Private copies live only for this Agent activation; no website chooses a host path. */
export class BrowserMaterialFiles {
	private readonly relative = `${BROWSER_MATERIALS_ROOT}/activation-${crypto.randomUUID()}`;
	private directory?: Promise<string>;
	private closed = false;
	private bytes = 0;
	private entries = new Map<string, number>();
	constructor(private readonly vault: string) {}

	private async root(): Promise<string> {
		this.directory ??= (async () => {
			const directory = await absoluteHuhuPath(this.vault, this.relative);
			await mkdir(directory, { recursive: true, mode: 0o700 });
			if ((await realpath(directory)) !== directory) throw new Error('material_storage_invalid');
			return directory;
		})();
		return this.directory;
	}

	async prepare(
		image: BrowserMaterial['image'],
		signal: AbortSignal,
	): Promise<{ files: string[]; release(): Promise<void> }> {
		if (this.closed || signal.aborted) throw new Error('material_cancelled');
		if (!image) return { files: [], release: async () => {} };
		const data = new Uint8Array(image.data);
		const png =
			image.mime === 'image/png' &&
			[137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value);
		const jpeg = image.mime === 'image/jpeg' && data[0] === 255 && data[1] === 216 && data[2] === 255;
		if ((!png && !jpeg) || !data.length || data.length > MAX_IMAGE_BYTES) throw new Error('capture_unavailable');
		if (this.entries.size >= MAX_IMAGES || this.bytes + data.length > MAX_TOTAL_BYTES)
			throw new Error('capture_quota');
		const key = `${crypto.randomUUID()}.${png ? 'png' : 'jpg'}`;
		this.entries.set(key, data.length);
		this.bytes += data.length;
		let file: string | undefined;
		const release = async () => {
			const length = this.entries.get(key);
			if (length === undefined) return;
			if (file) await rm(file, { force: true });
			this.entries.delete(key);
			this.bytes -= length;
		};
		try {
			const directory = await this.root();
			if (this.closed || signal.aborted) throw new Error('material_cancelled');
			file = path.join(directory, key);
			const handle = await open(file, 'wx', 0o600);
			try {
				await handle.writeFile(data);
			} finally {
				await handle.close();
			}
			if (this.closed || signal.aborted) throw new Error('material_cancelled');
			return { files: [file], release };
		} catch (error) {
			await release();
			throw error;
		} finally {
			data.fill(0);
		}
	}

	async dispose(): Promise<void> {
		this.closed = true;
		const directory = await this.directory?.catch(() => undefined);
		if (directory) await rm(directory, { recursive: true, force: true });
		this.entries.clear();
		this.bytes = 0;
	}
}

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
		input: BrowserMaterial | BrowserMaterial['image'],
		signal: AbortSignal,
	): Promise<{ files: string[]; preview: string; release(): Promise<void> }> {
		const check = () => { if (this.closed || signal.aborted) throw new Error('material_cancelled'); };
		check();
		const material: BrowserMaterial = input && 'mime' in input ? { title: '', text: '', image: input } : input ?? { title: '', text: '' };
		const artifacts: Array<{ key: string; data: Uint8Array; file?: string }> = [];
		if (material.image) {
			const data = new Uint8Array(material.image.data), png = material.image.mime === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value), jpeg = material.image.mime === 'image/jpeg' && data[0] === 255 && data[1] === 216 && data[2] === 255;
			if ((!png && !jpeg) || !data.length || data.length > MAX_IMAGE_BYTES) throw new Error('capture_unavailable');
			artifacts.push({ key: `${crypto.randomUUID()}.${png ? 'png' : 'jpg'}`, data });
		}
		if (material.text.length > 16000 || material.styles) {
			const data = new TextEncoder().encode(JSON.stringify({ title: material.title, text: material.text, source: material.source, styles: material.styles }));
			if (data.length > 512 * 1024) throw new Error('capture_quota');
			artifacts.push({ key: `${crypto.randomUUID()}.json`, data });
		}
		const total = artifacts.reduce((size, item) => size + item.data.length, 0);
		if (this.entries.size + artifacts.length > MAX_IMAGES || this.bytes + total > MAX_TOTAL_BYTES) throw new Error('capture_quota');
		for (const item of artifacts) this.entries.set(item.key, item.data.length);
		this.bytes += total;
		const release = async () => {
			for (const item of artifacts) {
				const length = this.entries.get(item.key); if (length === undefined) continue;
				if (item.file) await rm(item.file, { force: true });
				this.entries.delete(item.key); this.bytes -= length;
			}
		};
		try {
			if (artifacts.length) {
				const directory = await this.root(); check();
				for (const item of artifacts) {
					if (await realpath(directory) !== directory) throw new Error('material_storage_invalid'); check();
					item.file = path.join(directory, item.key);
					const handle = await open(item.file, 'wx', 0o600);
					try { check(); await handle.writeFile(item.data); } finally { await handle.close(); }
					check();
				}
			}
			return { files: artifacts.map(item => item.file!), preview: material.text.length > 16000 ? material.text.slice(0, 15999) + '…' : material.text, release };
		} catch (error) { await release(); throw error; }
		finally { for (const item of artifacts) item.data.fill(0); }
	}

	async dispose(): Promise<void> {
		this.closed = true;
		const directory = await this.directory?.catch(() => undefined);
		if (directory) await rm(directory, { recursive: true, force: true });
		this.entries.clear();
		this.bytes = 0;
	}
}

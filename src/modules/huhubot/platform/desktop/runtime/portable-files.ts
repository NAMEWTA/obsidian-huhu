import { constants } from 'node:fs';
import { lstat, open, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { t } from '../../../../../shared/i18n';
import type { ArtifactRef } from '../../../api';

const MAX_BYTES = 16 * 1024 * 1024;
const MEDIA_TYPE = 'application/vnd.huhu.portable+json';
interface NativeDialogs {
	getCurrentWindow(): unknown;
	dialog: {
		showOpenDialog(owner: unknown, options: unknown): Promise<{ canceled: boolean; filePaths: string[] }>;
		showSaveDialog(owner: unknown, options: unknown): Promise<{ canceled: boolean; filePath?: string }>;
	};
}
function within(root: string, target: string): boolean {
	const value = path.relative(root, target);
	return !path.isAbsolute(value) && value !== '..' && !value.startsWith(`..${path.sep}`);
}
async function readRegular(file: string): Promise<Buffer> {
	const before = await lstat(file);
	if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > MAX_BYTES || before.nlink !== 1) throw new Error('HUHUBOT_PORTABLE_FILE_INVALID');
	const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try {
		const current = await handle.stat();
		if (before.dev !== current.dev || before.ino !== current.ino) throw new Error('HUHUBOT_PORTABLE_FILE_CHANGED');
		const bytes = await handle.readFile();
		if (bytes.length !== current.size || bytes.length > MAX_BYTES) throw new Error('HUHUBOT_PORTABLE_FILE_CHANGED');
		return bytes;
	} finally { await handle.close(); }
}

/** The desktop bridge handles only explicit user files and opaque package artifacts.
 * It never reads SQLite or accepts a wire path; Go remains the package/permission authority.
 */
export class PortableFiles {
	constructor(private readonly profileDirectory: string, private readonly active: () => boolean, private readonly upload?: (bytes: Uint8Array) => Promise<ArtifactRef>) {}
	private check(): void { if (!this.active()) throw new Error('HUHUBOT_RUNTIME_CLOSED'); }
	private async directory(): Promise<string> {
		this.check();
		const root = await realpath(this.profileDirectory);
		if (!(await lstat(this.profileDirectory)).isDirectory() || (await lstat(this.profileDirectory)).isSymbolicLink()) throw new Error('HUHUBOT_PORTABLE_ROOT_INVALID');
		let current = root;
		for (const segment of ['portable', 'artifacts']) {
			current = path.join(current, segment);
			const info = await lstat(current);
			if (!info.isDirectory() || info.isSymbolicLink() || !within(root, await realpath(current))) throw new Error('HUHUBOT_PORTABLE_ROOT_INVALID');
		}
		this.check();
		return current;
	}
	async read(ref: ArtifactRef): Promise<Buffer> {
		if (!/^artifact:[a-f0-9]{32}$/.test(ref.artifactId) || ref.mediaType !== MEDIA_TYPE || !/^[1-9][0-9]{0,7}$/.test(ref.size) || Number(ref.size) > MAX_BYTES) throw new Error('HUHUBOT_PORTABLE_REF_INVALID');
		const bytes = await readRegular(path.join(await this.directory(), `${ref.artifactId.slice(9)}.json`));
		this.check();
		if (String(bytes.length) !== ref.size) throw new Error('HUHUBOT_PORTABLE_FILE_CHANGED');
		return bytes;
	}
	async save(ref: ArtifactRef, win: Window): Promise<boolean> {
		this.check();
		const native = win.require('@electron/remote') as NativeDialogs;
		const selected = await native.dialog.showSaveDialog(native.getCurrentWindow(), { title: t('huhubot.data.export'), defaultPath: `huhu-bot-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'HUHU Bot', extensions: ['json'] }] });
		if (selected.canceled || !selected.filePath) return false;
		this.check();
		const destination = selected.filePath;
		if (!path.isAbsolute(destination)) throw new Error('HUHUBOT_PORTABLE_DESTINATION_INVALID');
		const parent = await realpath(path.dirname(destination));
		const target = path.join(parent, path.basename(destination));
		if (within(await realpath(this.profileDirectory), target)) throw new Error('HUHUBOT_PORTABLE_DESTINATION_INVALID');
		try { const current = await lstat(target); if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1) throw new Error('HUHUBOT_PORTABLE_DESTINATION_INVALID'); }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
		const bytes = await this.read(ref);
		const temporary = path.join(parent, `.huhu-export-${randomBytes(16).toString('hex')}`);
		await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
		try { this.check(); await rename(temporary, target); } finally { await rm(temporary, { force: true }); }
		return true;
	}
	async choose(win: Window): Promise<ArtifactRef | undefined> {
		this.check();
		const native = win.require('@electron/remote') as NativeDialogs;
		const selected = await native.dialog.showOpenDialog(native.getCurrentWindow(), { title: t('huhubot.data.importHeading'), properties: ['openFile'], filters: [{ name: 'HUHU Bot', extensions: ['json'] }] });
		if (selected.canceled || !selected.filePaths[0]) return undefined;
		this.check();
		if (!this.upload) throw new Error('HUHUBOT_PORTABLE_UPLOAD_UNAVAILABLE');
		const bytes = await readRegular(selected.filePaths[0]);
		try { this.check(); return await this.upload(bytes); } finally { bytes.fill(0); }
	}
}

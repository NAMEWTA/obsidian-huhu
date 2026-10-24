import { open, lstat, realpath, rename, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { t } from '../../../../shared/i18n/index';
import { normalizeWebUrl } from '../../../../shared/web-url';
import { MAX_CONTAINER_BYTES, SafeError } from '../../core/model';
import { readCipherFile, SAFE_DIRECTORY, syncCipherDirectory } from './cipher-files';

export interface SafeClipboard {
	readText(): Promise<string>;
	writeText(value: string): Promise<void>;
}

export interface SafeDesktopActions {
	pickBackup(): Promise<string | null>;
	pickExport(): Promise<string | null>;
	exportCiphertext(destination: string, raw: string): Promise<void>;
	readonly clipboard: SafeClipboard;
	openUrl(url: string): Promise<void>;
}

interface DesktopRemote {
	getCurrentWindow(): unknown;
	dialog: {
		showOpenDialog(owner: unknown, options: {
			title: string;
			properties: ['openFile'];
			filters: { name: string; extensions: string[] }[];
		}): Promise<{ canceled: boolean; filePaths: string[] }>;
		showSaveDialog(owner: unknown, options: {
			title: string;
			defaultPath: string;
			filters: { name: string; extensions: string[] }[];
		}): Promise<{ canceled: boolean; filePath?: string }>;
	};
	clipboard: {
		readText(): string | Promise<string>;
		writeText(value: string): void | Promise<void>;
	};
	shell: { openExternal(url: string): void | Promise<void> };
}

function missing(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function within(directory: string, target: string): boolean {
	const relative = path.relative(directory, target);
	return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

/** Reject lexical, symlink and hardlink aliases of managed storage. */
export async function validateExportTarget(vaultRoot: string, destination: string): Promise<string> {
	try {
		if (!path.isAbsolute(destination)) throw new SafeError('export-target');
		const safe = await absoluteHuhuPath(vaultRoot, SAFE_DIRECTORY);
		const parent = await realpath(path.dirname(destination));
		const target = path.join(parent, path.basename(destination));
		if (within(safe, path.resolve(destination)) || within(safe, target)) throw new SafeError('export-target');
		try {
			const targetEntry = await lstat(target);
			if (!targetEntry.isFile() && !targetEntry.isSymbolicLink()) throw new SafeError('export-target');
			const resolved = await realpath(target);
			if (within(safe, resolved)) throw new SafeError('export-target');
			const info = await stat(target);
			if (!info.isFile()) throw new SafeError('export-target');
			for (const name of ['vault.enc', 'vault.enc.backup']) {
				try {
					const managed = await stat(await absoluteHuhuPath(vaultRoot, `${SAFE_DIRECTORY}/${name}`));
					if (info.dev === managed.dev && info.ino === managed.ino) throw new SafeError('export-target');
				} catch (error) {
					if (!missing(error)) throw error;
				}
			}
		} catch (error) {
			if (!missing(error)) throw error;
		}
		return target;
	} catch (error) {
		throw error instanceof SafeError ? error : new SafeError('storage');
	}
}

/** User-selected external export uses the same durable, same-directory pattern. */
export async function exportCiphertext(vaultRoot: string, destination: string, raw: string): Promise<void> {
	if (Buffer.byteLength(raw, 'utf8') > MAX_CONTAINER_BYTES) throw new SafeError('too-large');
	const target = await validateExportTarget(vaultRoot, destination);
	const temporary = path.join(path.dirname(target), `.huhu-safe-export-${randomUUID()}.tmp`);
	let handle;
	let created = false;
	try {
		handle = await open(temporary, 'wx', 0o600);
		created = true;
		await handle.writeFile(raw, 'utf8');
		await handle.sync();
		await handle.close();
		handle = undefined;
		if (await readCipherFile(temporary) !== raw) throw new SafeError('storage');
		if (await validateExportTarget(vaultRoot, destination) !== target) throw new SafeError('export-target');
		try {
			await rename(temporary, target);
			await syncCipherDirectory(path.dirname(target));
		} catch {
			if (await readCipherFile(target) === raw) return;
			throw new SafeError('storage');
		}
		if (await readCipherFile(target) !== raw) throw new SafeError('storage');
	} catch (error) {
		throw error instanceof SafeError ? error : new SafeError('storage');
	} finally {
		await handle?.close().catch(() => {});
		if (created) await unlink(temporary).catch(() => {});
	}
}

/** Resolve native APIs from the owning window, never from a captured global. */
export function createDesktopActions(vaultRoot: string, ownerWindow: Window): SafeDesktopActions {
	const remote = () => ownerWindow.require('@electron/remote') as DesktopRemote;
	const guarded = async <T>(run: () => Promise<T>): Promise<T> => {
		try { return await run(); }
		catch (error) { throw error instanceof SafeError ? error : new SafeError('storage'); }
	};
	return {
		pickBackup: () => guarded(async () => {
			const native = remote();
			const result = await native.dialog.showOpenDialog(native.getCurrentWindow(), {
				title: t('safe.restore'), properties: ['openFile'],
				filters: [{ name: t('safe.fileFilter'), extensions: ['enc', 'backup'] }],
			});
			const selected = result.filePaths[0];
			if (result.canceled || !selected) return null;
			const raw = await readCipherFile(await realpath(selected));
			if (raw === null) throw new SafeError('missing');
			return raw;
		}),
		pickExport: () => guarded(async () => {
			const native = remote();
			const result = await native.dialog.showSaveDialog(native.getCurrentWindow(), {
				title: t('safe.export'),
				defaultPath: `huhu-safe-${new Date().toISOString().slice(0, 10)}-${randomUUID()}.enc`,
				filters: [{ name: t('safe.fileFilter'), extensions: ['enc'] }],
			});
			return result.canceled ? null : result.filePath ?? null;
		}),
		exportCiphertext: (destination, raw) => exportCiphertext(vaultRoot, destination, raw),
		clipboard: {
			readText: () => guarded(async () => remote().clipboard.readText()),
			writeText: value => guarded(async () => { await remote().clipboard.writeText(value); }),
		},
		openUrl: url => guarded(async () => {
			const normalized = normalizeWebUrl(url);
			if (!normalized || !/^https?:\/\//i.test(normalized)) throw new SafeError('invalid-url');
			await remote().shell.openExternal(normalized);
		}),
	};
}

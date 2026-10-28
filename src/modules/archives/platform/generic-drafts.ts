import type { App } from 'obsidian';
import { privateVaultStorage } from '../../../host/obsidian/storage/private-storage';
import { deviceId } from '../../../host/obsidian/storage/device-id';
import { ARCHIVES_DRAFT_ROOT } from '../../../shared/storage/vault-layout';
import { storageWriteQueue } from '../../../shared/storage/write-queue';
import { digest, identifier } from '../core/schema/value';
import { ArchiveError } from '../core/schema/model';

/** Per-device drafts are recoverable UI state, never a second source of entity truth. */
export function archiveDraftStore(app: App) {
	const storage = privateVaultStorage(app),
		queue = storageWriteQueue(app.vault.adapter);
	const directory = async (root: string) => `${ARCHIVES_DRAFT_ROOT}/${deviceId(app)}/${await digest(root)}`;
	const pathFor = async (root: string, id: string) => {
		if (!identifier(id)) throw new ArchiveError('invalid-draft');
		return `${await directory(root)}/${id}.json`;
	};
	const mkdir = async (path: string) => {
		let current = '';
		for (const part of path.split('/')) {
			current = current ? `${current}/${part}` : part;
			if (!(await storage.exists(current))) await storage.mkdir(current);
		}
	};
	return {
		async list(root: string): Promise<unknown[]> {
			const folder = await directory(root);
			if (!(await storage.exists(folder))) return [];
			const files = (await app.vault.adapter.list(folder)).files.filter(
				(path) => path.startsWith(folder + '/') && path.endsWith('.json'),
			);
			if (files.length > 200) throw new ArchiveError('too-many-drafts');
			const result: unknown[] = [];
			for (const path of files) {
				const raw = await storage.read(path);
				if (raw.length > 16 * 1024 * 1024) throw new ArchiveError('invalid-draft');
				try {
					result.push(JSON.parse(raw));
				} catch {
					console.error('[HUHU archives] invalid draft retained', path);
				}
			}
			return result;
		},
		async write(root: string, id: string, value: unknown): Promise<void> {
			const path = await pathFor(root, id),
				raw = JSON.stringify(value);
			if (raw.length > 16 * 1024 * 1024) throw new ArchiveError('invalid-draft');
			await queue.run(`archive-draft:${path}`, async () => {
				await mkdir(path.slice(0, path.lastIndexOf('/')));
				if (storage.updateAtomically) await storage.updateAtomically(path, () => raw);
				else await storage.write(path, raw);
				if ((await storage.read(path)) !== raw) throw new ArchiveError('write-verification-failed');
			});
		},
		async remove(root: string, id: string): Promise<void> {
			const path = await pathFor(root, id);
			await queue.run(`archive-draft:${path}`, async () => {
				if (await storage.exists(path)) await app.vault.adapter.remove(path);
			});
		},
	};
}

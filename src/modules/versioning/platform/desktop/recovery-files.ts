import { lstat, readdir, unlink } from 'node:fs/promises';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { VERSIONING_RECOVERY_ROOT } from '../../../../shared/storage/vault-layout';
import type { RecoveryFile, RecoveryFiles } from '../../core/history-retention';

/** Enumerates only this device's owned recovery tree. Links and unknown artifacts stop collection. */
export function createRecoveryFiles(vaultRoot: string, device: string): RecoveryFiles {
	if (!/^[a-zA-Z0-9_-]{1,120}$/.test(device)) throw new Error('versioning.localHistory.retentionCorrupt');
	const root = `${VERSIONING_RECOVERY_ROOT}/${device}`;
	const stamp = (stat: Awaited<ReturnType<typeof lstat>>) => `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
	return {
		async inventory() {
			const files: RecoveryFile[] = [];
			const visit = async (relative: string) => {
				let entries;
				try { entries = await readdir(await absoluteHuhuPath(vaultRoot, relative), { withFileTypes: true }); }
				catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
				for (const entry of entries) {
					const path = `${relative}/${entry.name}`;
					if (entry.isDirectory() && (path === `${root}/objects` || path === `${root}/history`)) { await visit(path); continue; }
					if (!entry.isFile()) throw new Error('versioning.localHistory.retentionCorrupt');
					const hash = relative === `${root}/objects` ? /^([a-f0-9]{64})\.txt$/.exec(entry.name)?.[1] : undefined;
					const metadata = path === `${root}/journal.json` || path === `${root}/journal.json.backup`
						|| path === `${root}/history/index.json` || path === `${root}/history/index.json.backup`
						|| path === `${root}/retention.json` || path === `${root}/retention.json.backup`;
					if (!hash && !metadata) throw new Error('versioning.localHistory.retentionCorrupt');
					const stat = await lstat(await absoluteHuhuPath(vaultRoot, path));
					if (!stat.isFile()) throw new Error('versioning.localHistory.retentionChanged');
					files.push({ path, byteLength: stat.size, stamp: stamp(stat), ...(hash ? { hash } : {}) });
				}
			};
			await visit(root); return files;
		},
		async remove(file) {
			if (!file.hash || file.path !== `${root}/objects/${file.hash}.txt`) throw new Error('versioning.localHistory.retentionCorrupt');
			const absolute = await absoluteHuhuPath(vaultRoot, file.path);
			try {
				const stat = await lstat(absolute);
				if (!stat.isFile() || stamp(stat) !== file.stamp) throw new Error('versioning.localHistory.retentionChanged');
				await unlink(absolute);
			} catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
		},
	};
}

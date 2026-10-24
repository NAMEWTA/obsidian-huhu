// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { parentFolder, ROOT_FOLDER } from './types';

/**
 * Per-folder file counts for the whole vault: `direct` counts the files in a folder itself, `total` those of its
 * whole subtree. Built once from all files (one pass, every file adds one to each of its ancestors), then kept
 * current by +1/-1 along the ancestor chain, so the folder tree never recounts while rendering.
 */
export class FolderCounts {
	private readonly directCounts = new Map<string, number>();
	private readonly totalCounts = new Map<string, number>();

	static from(files: Iterable<{ folder: string }>): FolderCounts {
		const counts = new FolderCounts();
		for (const file of files) counts.add(file.folder);
		return counts;
	}

	/** Count one more file inside `folder` ('/' is the vault root). */
	add(folder: string): void {
		this.shift(folder, 1);
	}

	/** Count one file less inside `folder`. */
	remove(folder: string): void {
		this.shift(folder, -1);
	}

	/** A file moved from folder `from` to folder `to`. */
	move(from: string, to: string): void {
		if (from === to) return;
		this.shift(from, -1);
		this.shift(to, 1);
	}

	clear(): void {
		this.directCounts.clear();
		this.totalCounts.clear();
	}

	/** Files directly in `folder`. */
	direct(folder: string): number {
		return this.directCounts.get(key(folder)) ?? 0;
	}

	/** Files in `folder` and in every folder below it. */
	total(folder: string): number {
		return this.totalCounts.get(key(folder)) ?? 0;
	}

	private shift(folder: string, delta: 1 | -1): void {
		const start = key(folder);
		bump(this.directCounts, start, delta);
		for (let path = start; ; path = parentFolder(path)) {
			bump(this.totalCounts, path, delta);
			if (path === ROOT_FOLDER) break;
		}
	}
}

const key = (folder: string): string => (folder === '' ? ROOT_FOLDER : folder);

function bump(map: Map<string, number>, path: string, delta: number): void {
	const next = (map.get(path) ?? 0) + delta;
	if (next > 0) map.set(path, next); else map.delete(path);
}

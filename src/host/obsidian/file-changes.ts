// Adapted from yeshimei/bz (MIT), commit d76a0870329403247917a00c43019e203a2560a4:
// src/core/obsidian-adapter.ts. Copyright (c) 2026 叫我包仔.
// HUHU changes: instance-owned typed batches, all file/folder paths, bounded coalescing and lifecycle cleanup.
import { TFolder, type App, type TAbstractFile } from 'obsidian';
import { domainEventKey, type DomainEvents } from '../../shared/events/domain-events';

/** Paths are invalidation hints. Read current content from its owner; metadata has a separate readiness event. */
export type FileChange = { kind: 'create' | 'modify' | 'delete' | 'rename' | 'metadata' | 'invalidate'; path: string; folder: boolean; oldPath?: string };
export interface FileChangeBatch { readonly changes: readonly FileChange[]; readonly rescan: boolean }
export const FILE_CHANGES = domainEventKey<FileChangeBatch>('host:file-changes');
export interface ChangeTimers { set(callback: () => void, ms: number): unknown; clear(handle: unknown): void; now(): number }
export interface FileChangesOptions { readonly debounceMs?: number; readonly maxWaitMs?: number; readonly capacity?: number }

/** One adapter per plugin. Rename/delete retain their identity; overflow replaces detail with a conservative rescan. */
export class FileChanges {
	private readonly pending = new Map<string, FileChange>();
	private readonly cleanups: Array<() => void> = [];
	private timer?: unknown;
	private started?: number;
	private rescan = false;
	private closed = false;
	private readonly delay: number;
	private readonly maxWait: number;
	private readonly capacity: number;

	constructor(
		app: Pick<App, 'vault' | 'metadataCache'>,
		private readonly events: Pick<DomainEvents, 'emit'>,
		options: FileChangesOptions = {},
		private readonly timers: ChangeTimers = {
			set: (callback, ms) => window.setTimeout(callback, ms),
			clear: handle => window.clearTimeout(handle as number), now: Date.now,
		},
	) {
		this.delay = Math.max(0, options.debounceMs ?? 40);
		this.maxWait = Math.max(this.delay, options.maxWaitMs ?? 200);
		this.capacity = Math.max(1, options.capacity ?? 2048);
		const capture = (kind: FileChange['kind'], file: TAbstractFile, oldPath?: string) => {
			const change: FileChange = { kind, path: file.path, folder: file instanceof TFolder };
			if (oldPath !== undefined) change.oldPath = oldPath;
			this.enqueue(change);
		};
		const vault = app.vault;
		if (typeof vault.on !== 'function') return;
		try {
			const created = vault.on('create', file => capture('create', file));
			this.cleanups.push(() => vault.offref(created));
			const modified = vault.on('modify', file => capture('modify', file));
			this.cleanups.push(() => vault.offref(modified));
			const deleted = vault.on('delete', file => capture('delete', file));
			this.cleanups.push(() => vault.offref(deleted));
			const renamed = vault.on('rename', (file, oldPath) => capture('rename', file, oldPath));
			this.cleanups.push(() => vault.offref(renamed));
			// Narrow harnesses may omit metadata; raw events still work because archives reads the file itself.
			const metadata = app.metadataCache;
			if (metadata) {
				const indexed = metadata.on('changed', file => capture('metadata', file));
				this.cleanups.push(() => metadata.offref(indexed));
			}
		} catch (error) {
			this.dispose();
			throw error;
		}
	}
	private enqueue(change: FileChange): void {
		if (this.closed) return;
		if (!this.rescan) {
			const key = JSON.stringify([change.kind, change.path, change.oldPath, change.folder]);
			this.pending.delete(key);
			this.pending.set(key, change);
			if (this.pending.size > this.capacity) {
				this.pending.clear();
				this.rescan = true;
			}
		}
		this.started ??= this.timers.now();
		if (this.timer !== undefined) this.timers.clear(this.timer);
		const wait = Math.max(0, Math.min(this.delay, this.maxWait - (this.timers.now() - this.started)));
		this.timer = this.timers.set(() => this.flush(), wait);
	}
	/** Publish the captured paths, not mutable TFile references. No asynchronous reads can escape adapter disposal. */
	flush(): void {
		if (this.timer !== undefined) this.timers.clear(this.timer);
		this.timer = undefined;
		this.started = undefined;
		if (this.closed || (!this.pending.size && !this.rescan)) return;
		const batch = { changes: [...this.pending.values()], rescan: this.rescan };
		this.pending.clear();
		this.rescan = false;
		this.events.emit(FILE_CHANGES, batch);
	}
	dispose(): void {
		if (this.closed) return;
		this.closed = true;
		if (this.timer !== undefined) this.timers.clear(this.timer);
		this.timer = undefined;
		this.pending.clear();
		for (const cleanup of this.cleanups.splice(0)) cleanup();
	}
}

import type { RecoveryStorage } from '../../src/shared/storage/recovery-contracts';

export class Crash extends Error {
	constructor() {
		super('simulated power loss');
		this.name = 'Crash';
	}
}

/** In-memory vault storage with a power-loss switch and per-path write failures. Isolated: never touches disk. */
export class FaultStorage implements RecoveryStorage {
	readonly files: Map<string, string>;
	readonly dirs: Set<string>;
	mutations = 0;
	/** 1-based index of the mutating call that loses power; `torn` leaves half the bytes on disk. */
	crashAt?: number;
	torn = false;
	dead = false;
	failWrite?: (path: string) => boolean;
	/** The write lands on disk and then throws (host reports an error after the bytes were written). */
	landThenThrow?: (path: string) => boolean;
	/** Reads of the path throw (read-back verification fails after a landed write). */
	failRead?: (path: string) => boolean;
	/** Runs after a successful write: lets a test play a foreign process editing between two steps. */
	afterWrite?: (path: string) => void;
	constructor(files: Map<string, string> = new Map(), dirs: Set<string> = new Set()) {
		this.files = files;
		this.dirs = dirs;
	}
	/** A new process over the same bytes. */
	reboot(): FaultStorage {
		return new FaultStorage(this.files, this.dirs);
	}
	private tick(path: string, text?: string): void {
		if (this.dead) throw new Crash();
		this.mutations++;
		if (this.crashAt !== undefined && this.mutations === this.crashAt) {
			this.dead = true;
			if (this.torn && text !== undefined) this.files.set(path, text.slice(0, Math.floor(text.length / 2)));
			throw new Crash();
		}
	}
	async exists(path: string): Promise<boolean> {
		if (this.dead) throw new Crash();
		return this.files.has(path) || this.dirs.has(path);
	}
	async read(path: string): Promise<string> {
		if (this.dead) throw new Crash();
		if (this.failRead?.(path)) throw new Error('EBUSY ' + path);
		const text = this.files.get(path);
		if (text === undefined) throw new Error('ENOENT ' + path);
		return text;
	}
	async write(path: string, content: string): Promise<void> {
		if (this.failWrite?.(path)) throw new Error('ENOSPC ' + path);
		this.tick(path, content);
		this.files.set(path, content);
		this.afterWrite?.(path);
		if (this.landThenThrow?.(path)) throw new Error('EPERM after write ' + path);
	}
	async remove(path: string): Promise<void> {
		this.tick(path);
		this.files.delete(path);
	}
	async mkdir(path: string): Promise<void> {
		if (this.dead) throw new Crash();
		this.dirs.add(path);
	}
	snapshot(paths: readonly string[]): Record<string, string | null> {
		return Object.fromEntries(paths.map((p) => [p, this.files.get(p) ?? null]));
	}
}

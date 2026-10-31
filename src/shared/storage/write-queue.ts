import { storageTimers } from './timers';

export interface WriteQueueOptions {
	/** A task that holds its key this long is reported once; it is never released early. */
	holdWarnMs?: number;
	warn?: (message: string, detail: { key: string; label: string; heldMs: number }) => void;
}

export const HOLD_WARN_MS = 15000;

export class WriteQueue {
	private tails = new Map<string, Promise<unknown>>();
	private readonly holdWarnMs: number;
	private readonly warn: NonNullable<WriteQueueOptions['warn']>;
	constructor(options: WriteQueueOptions = {}) {
		this.holdWarnMs = options.holdWarnMs ?? HOLD_WARN_MS;
		this.warn = options.warn ?? ((message, detail) => console.warn('[HUHU storage]', message, detail));
	}
	/** Tasks of one key run strictly in order; the optional label names the task in the held-too-long report. */
	run<T>(key: string, task: () => Promise<T>, label = key): Promise<T> {
		const execute = () => this.hold(key, label, task);
		const result = (this.tails.get(key) ?? Promise.resolve()).then(execute, execute);
		const tail = result.then(
			() => undefined,
			() => undefined,
		);
		this.tails.set(key, tail);
		void tail.then(() => {
			if (this.tails.get(key) === tail) this.tails.delete(key);
		});
		return result;
	}
	private async hold<T>(key: string, label: string, task: () => Promise<T>): Promise<T> {
		const started = Date.now();
		const timers = storageTimers();
		const timer = timers?.setTimeout(() => this.warn('queue task still running', { key, label, heldMs: Date.now() - started }), this.holdWarnMs);
		try {
			return await task();
		} finally {
			if (timer !== undefined) timers?.clearTimeout(timer);
		}
	}
	async settled(): Promise<void> {
		await Promise.all(this.tails.values());
	}
}

const storageQueueKey = Symbol.for('huhu.storage.write-queue');
/** The native storage object survives plugin reload, so admitted writes keep their ordering. */
export function storageWriteQueue(storage: object): WriteQueue {
	const existing = Reflect.get(storage, storageQueueKey) as WriteQueue | undefined;
	if (existing) return existing;
	const queue = new WriteQueue();
	Object.defineProperty(storage, storageQueueKey, { value: queue, configurable: true });
	return queue;
}


export interface StorageRecoveryState {
	/** Present until both an interrupted operation and its late adapter/owner cleanup have settled. */
	lease?: Promise<void>;
}
const storageRecoveryKey = Symbol.for('huhu.storage.recovery-state');

/** Recovery isolation follows the adapter's existing queue across wrapper reconstruction and plugin module reload. */
export function storageRecoveryState(storage: object): StorageRecoveryState {
	const queue = storageWriteQueue(storage);
	const existing = Reflect.get(queue, storageRecoveryKey) as StorageRecoveryState | undefined;
	if (existing) return existing;
	const state: StorageRecoveryState = {};
	Object.defineProperty(queue, storageRecoveryKey, { value: state });
	return state;
}

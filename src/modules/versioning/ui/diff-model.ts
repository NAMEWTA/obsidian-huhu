import { Chunk } from '@codemirror/merge';
import { Text } from '@codemirror/state';

export type DiffLayout = 'side-by-side' | 'stacked' | 'unified';
export type DiffSide = 'a' | 'b';

export interface DiffChange {
	readonly fromA: number;
	readonly toA: number;
	readonly fromB: number;
	readonly toB: number;
}

export interface DiffChunk extends DiffChange {
	/** Absolute document offsets, unlike CodeMirror's chunk-relative changes. */
	readonly changes: readonly DiffChange[];
	readonly precise: boolean;
}

export interface DiffModel {
	readonly id: string;
	/** Display text only. Recovery always uses the original TextSnapshot. */
	readonly left: string;
	readonly right: string;
	readonly chunks: readonly DiffChunk[];
	readonly precise: boolean;
}

export interface DiffWorkerRequest {
	readonly id: string;
	readonly left: string;
	readonly right: string;
}

export type DiffWorkerResponse =
	{ readonly id: string; readonly model: DiffModel } | { readonly id: string; readonly error: string };

/** Large comparisons must use the worker; the main thread only handles bounded notes. */
export const MAIN_THREAD_DIFF_LIMIT = 120_000;
export const DIFF_DISPLAY_LIMIT = 2_000_000;

export function displayText(text: string): string {
	return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function calculateDiff(request: DiffWorkerRequest): DiffModel {
	const left = displayText(request.left);
	const right = displayText(request.right);
	const chunks = Chunk.build(Text.of(left.split('\n')), Text.of(right.split('\n')), {
		scanLimit: 2_000,
		timeout: 150,
	}).map((chunk): DiffChunk => ({
		fromA: chunk.fromA,
		toA: chunk.toA,
		fromB: chunk.fromB,
		toB: chunk.toB,
		precise: chunk.precise,
		changes: chunk.changes.map((change) => ({
			fromA: change.fromA + chunk.fromA,
			toA: change.toA + chunk.fromA,
			fromB: change.fromB + chunk.fromB,
			toB: change.toB + chunk.fromB,
		})),
	}));
	return { id: request.id, left, right, chunks, precise: chunks.every((chunk) => chunk.precise) };
}

/** Map a document anchor through hunks, retaining exact offsets in unchanged stretches. */
export function mapDiffAnchor(
	chunks: readonly DiffChunk[],
	position: number,
	side: DiffSide,
	targetLength: number,
): number {
	let sourceEnd = 0;
	let targetEnd = 0;
	for (const chunk of chunks) {
		const from = side === 'a' ? chunk.fromA : chunk.fromB;
		const to = side === 'a' ? chunk.toA : chunk.toB;
		const otherFrom = side === 'a' ? chunk.fromB : chunk.fromA;
		const otherTo = side === 'a' ? chunk.toB : chunk.toA;
		if (position < from) break;
		if (position <= to) {
			const progress = to === from ? 0 : (position - from) / (to - from);
			return Math.max(0, Math.min(targetLength, Math.round(otherFrom + progress * (otherTo - otherFrom))));
		}
		sourceEnd = to;
		targetEnd = otherTo;
	}
	return Math.max(0, Math.min(targetLength, targetEnd + position - sourceEnd));
}

export class DiffLimitError extends Error {
	constructor(readonly reason: 'worker-required' | 'display-limit') {
		super(reason);
		this.name = 'DiffLimitError';
	}
}

export function isCancelled(error: unknown): boolean {
	return error instanceof Error && (error.name === 'AbortError' || error.name === 'CancelledError');
}

/** Each comparison owns its worker. Replacing/closing it terminates in-flight computation. */
export function computeDiff(
	request: DiffWorkerRequest,
	signal: AbortSignal,
	createWorker?: () => Worker,
): Promise<DiffModel> {
	if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
	const size = request.left.length + request.right.length;
	if (size > DIFF_DISPLAY_LIMIT) return Promise.reject(new DiffLimitError('display-limit'));
	if (!createWorker) {
		if (size > MAIN_THREAD_DIFF_LIMIT) return Promise.reject(new DiffLimitError('worker-required'));
		return Promise.resolve().then(() => {
			if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
			return calculateDiff(request);
		});
	}
	return new Promise<DiffModel>((resolve, reject) => {
		let worker: Worker;
		try {
			worker = createWorker();
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
			return;
		}
		const finish = () => {
			signal.removeEventListener('abort', abort);
			worker.onmessage = null;
			worker.onerror = null;
			worker.onmessageerror = null;
			worker.terminate();
		};
		const abort = () => {
			finish();
			reject(new DOMException('Aborted', 'AbortError'));
		};
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (event: MessageEvent<DiffWorkerResponse>) => {
			if (event.data.id !== request.id) return;
			finish();
			if ('error' in event.data) reject(new Error(event.data.error));
			else if (event.data.model.id === request.id) resolve(event.data.model);
			else reject(new Error('Invalid diff response'));
		};
		worker.onerror = (event) => {
			finish();
			reject(new Error(event.message));
		};
		worker.onmessageerror = () => {
			finish();
			reject(new Error('Invalid diff response'));
		};
		try {
			worker.postMessage(request);
		} catch (error) {
			finish();
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}

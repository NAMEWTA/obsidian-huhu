import { parseDiffFromFile, type FileContents, type FileDiffMetadata } from '@pierre/diffs';

export const RENDER_THRESHOLD = 200_000;
export function parseComparison(
	oldFile: FileContents | null,
	newFile: FileContents | null,
	signal: AbortSignal,
	createWorker?: () => Worker,
): Promise<FileDiffMetadata> {
	if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
	if (!createWorker) {
		if ((oldFile?.contents.length ?? 0) + (newFile?.contents.length ?? 0) > 120_000)
			return Promise.reject(new Error('versioning.diff.workerRequired'));
		return Promise.resolve().then(() => {
			if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
			return parseDiffFromFile(oldFile, newFile, { context: 2 }, true);
		});
	}
	return new Promise((resolve, reject) => {
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
		if (signal.aborted) {
			abort();
			return;
		}
		signal.addEventListener('abort', abort, { once: true });
		worker.onmessage = (event: MessageEvent<{ fileDiff?: FileDiffMetadata; error?: string }>) => {
			finish();
			if (event.data.fileDiff) resolve(event.data.fileDiff);
			else reject(new Error(event.data.error ?? 'Invalid parser response'));
		};
		worker.onerror = (event) => {
			finish();
			reject(new Error(event.message));
		};
		worker.onmessageerror = () => {
			finish();
			reject(new Error('Invalid parser response'));
		};
		try {
			worker.postMessage({ oldFile, newFile });
		} catch (error) {
			finish();
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}

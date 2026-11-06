import { decodeAsset } from './compressed-asset';
import parseSource from 'virtual:versioning-parse-worker';
import highlightSource from 'virtual:versioning-diff-worker';

/** The mounted owner creates both workers. Consumers terminate them; URLs are released after construction. */
function createWorker(ownerWindow: Window, source: string, name: string): Worker {
	const owner = ownerWindow as Window & { Worker: typeof Worker; Blob: typeof Blob; URL: typeof URL };
	const url = owner.URL.createObjectURL(new owner.Blob([decodeAsset(source)], { type: 'text/javascript' }));
	try {
		return new owner.Worker(url, { name });
	} finally {
		owner.URL.revokeObjectURL(url);
	}
}
export const createDiffWorker = (ownerWindow: Window) => createWorker(ownerWindow, parseSource, 'huhu-diff-parser');
export const createHighlightWorker = (ownerWindow: Window) =>
	createWorker(ownerWindow, highlightSource, 'huhu-diff-highlighter');

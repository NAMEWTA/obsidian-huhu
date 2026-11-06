import { parseDiffFromFile, type FileContents } from '@pierre/diffs';

/** One calculation per disposable worker: terminate() cancels the synchronous library parser. */
const scope = self as unknown as {
	onmessage: ((event: MessageEvent<{ oldFile: FileContents | null; newFile: FileContents | null }>) => void) | null;
	postMessage(value: unknown): void;
};
scope.onmessage = (event) => {
	try {
		scope.postMessage({
			fileDiff: parseDiffFromFile(event.data.oldFile, event.data.newFile, { context: 2 }, true),
		});
	} catch (error) {
		scope.postMessage({ error: error instanceof Error ? error.message : String(error) });
	}
};

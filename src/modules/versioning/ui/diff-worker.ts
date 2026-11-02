import { calculateDiff, type DiffWorkerRequest, type DiffWorkerResponse } from './diff-model';

/** Bundled as a dedicated worker by the host; no editor DOM or vault access crosses this boundary. */
const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<DiffWorkerRequest>) => void) | null;
	postMessage: (message: DiffWorkerResponse) => void;
};
workerScope.onmessage = (event) => {
	const request = event.data;
	try {
		workerScope.postMessage({ id: request.id, model: calculateDiff(request) });
	} catch (error) {
		workerScope.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) });
	}
};

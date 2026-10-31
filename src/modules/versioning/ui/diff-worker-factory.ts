import source from 'virtual:versioning-diff-worker';

/** Called from a mounted comparison, using that window's realm. The consumer owns worker termination. */
export function createDiffWorker(ownerWindow: Window): Worker {
	const owner = ownerWindow as Window & { Worker: typeof Worker; Blob: typeof Blob; URL: typeof URL };
	const url = owner.URL.createObjectURL(new owner.Blob([source], { type: 'text/javascript' }));
	try {
		return new owner.Worker(url, { name: 'huhu-version-diff' });
	} finally {
		owner.URL.revokeObjectURL(url);
	}
}

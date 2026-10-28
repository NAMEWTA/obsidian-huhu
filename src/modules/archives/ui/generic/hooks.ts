import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ArchivesApplication } from '../../services/generic/application';
export function useArchiveVersion(application: ArchivesApplication): string {
	return useSyncExternalStore(
		(listener) => application.catalog.subscribe(listener),
		() =>
			`${application.runtime.index.entityRevision}:${application.runtime.index.schemaRevision}:${application.runtime.loading}:${application.runtime.ready}`,
	);
}
/** Late results cannot replace a newer selection or update an unmounted page. */
export function useArchiveData<T>(
	load: () => Promise<T>,
	key: string,
): { data?: T; error?: unknown; loading: boolean } {
	const [state, setState] = useState<{ key: string; data?: T; error?: unknown; loading: boolean }>({
		key,
		loading: true,
	});
	useEffect(() => {
		let current = true;
		void load().then(
			(data) => {
				if (current) setState({ key, data, loading: false });
			},
			(error) => {
				if (current) setState({ key, error, loading: false });
			},
		);
		return () => {
			current = false;
		};
	}, [key, load]);
	return state.key === key ? state : { loading: true };
}

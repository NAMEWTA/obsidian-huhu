import { useSyncExternalStore } from 'react';
import { diffPreferenceStore } from './preferences';

export function useDiffPreferences() {
	return [
		useSyncExternalStore(diffPreferenceStore.subscribe, diffPreferenceStore.get),
		diffPreferenceStore.set,
	] as const;
}

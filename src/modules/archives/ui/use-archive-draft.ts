import { useCallback, useRef, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import type { ArchiveDraftOwner } from '../services/form-drafts';

/** Every edit is written synchronously to the module owner, including async command results after this component unmounts. */
export function useArchiveDraft<T>(owner: ArchiveDraftOwner, key: string, create: () => T): [T, Dispatch<SetStateAction<T>>] {
	const initial = useRef<{ owner: ArchiveDraftOwner; key: string; value: T } | undefined>(undefined);
	if (!initial.current || initial.current.owner !== owner || initial.current.key !== key) {
		initial.current = { owner, key, value: create() };
		owner.seed(key, initial.current.value);
	}
	const value = initial.current.value;
	const subscribe = useCallback((listener: () => void) => owner.subscribe(key, listener), [owner, key]);
	const snapshot = useCallback(() => owner.get(key, value), [owner, key, value]);
	const state = useSyncExternalStore(subscribe, snapshot);
	const setState = useCallback((next: SetStateAction<T>) => owner.set(key, value, next), [owner, key, value]);
	return [state, setState];
}

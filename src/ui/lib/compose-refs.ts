import { useMemo, type Ref, type RefCallback } from 'react';
/** React19 detach honors a returned cleanup; legacy callbacks still receive null. */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
	return (node) => {
		const cleanups = refs.map((ref) => {
			if (typeof ref === 'function') return ref(node);
			if (ref) ref.current = node;
		});
		if (node === null) return;
		return () => {
			refs.forEach((ref, index) => {
				const cleanup = cleanups[index];
				if (typeof cleanup === 'function') cleanup();
				else if (typeof ref === 'function') ref(null);
				else if (ref) ref.current = null;
			});
		};
	};
}
export function useComposedRefs<T>(first: Ref<T> | undefined, second: Ref<T> | undefined): RefCallback<T> {
	return useMemo(() => composeRefs(first, second), [first, second]);
}

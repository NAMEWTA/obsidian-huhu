export type DiffLayout = 'side-by-side' | 'stacked';
export interface DiffPreferences {
	readonly layout?: DiffLayout;
	readonly swapped: boolean;
	readonly wrap?: boolean;
	readonly wordDiff?: boolean;
	readonly collapse?: boolean;
}
export const DEFAULT_DIFF_PREFERENCES: DiffPreferences = { swapped: false, wrap: true, wordDiff: true, collapse: true };
export const displayText = (text: string) => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
export const isCancelled = (error: unknown) =>
	error instanceof Error && ['AbortError', 'CancelledError'].includes(error.name);

/** Presentation preferences are shared by all diff entry points; subscribers own their React lifetimes. */
const listeners = new Set<() => void>();
let preferences = DEFAULT_DIFF_PREFERENCES;
export const diffPreferenceStore = {
	get: () => preferences,
	set: (next: DiffPreferences) => {
		preferences = next;
		for (const listener of listeners) listener();
	},
	subscribe: (listener: () => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};

/** How the unlocked safe lists its entries. Remembered per device in the `safe` settings namespace. */
export type SafeViewMode = 'list' | 'cards';

export interface SafePreferences {
	viewMode(): SafeViewMode;
	setViewMode(mode: SafeViewMode): void;
	subscribe(listener: () => void): () => void;
}

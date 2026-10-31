/** Module settings contain only current, independent Browser behavior. */
export interface BrowserSettings {
	interceptNoteLinks: boolean;
}
export function normalizeBrowserSettings(raw: unknown): BrowserSettings {
	const value = raw as Partial<BrowserSettings> | null;
	return { interceptNoteLinks: value?.interceptNoteLinks === true };
}

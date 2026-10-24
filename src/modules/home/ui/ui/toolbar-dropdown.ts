

export interface ToolbarDropdownItem {
	/** Stable key handed to onPick. */
	key: string;
	/** Full label shown in the menu. */
	label: string;
	/** Icon (Lucide name) shown on the collapsed button and in the menu. */
	icon?: string;
	/** Short text shown on the collapsed button when the item has no icon
	 *  (e.g. the S/M/L size letters). */
	short?: string;
}

// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import type { LucideIcon } from 'lucide-react';

export interface MenuEntry {
	id: string;
	label: string;
	icon?: LucideIcon;
	/** An Obsidian icon id, for the entries Obsidian and other plugins contribute. */
	iconName?: string;
	danger?: boolean;
	disabled?: boolean;
	checked?: boolean;
	separatorBefore?: boolean;
	/** A submenu: the entry opens it instead of running. */
	children?: MenuEntry[];
	run(): void | Promise<unknown>;
}

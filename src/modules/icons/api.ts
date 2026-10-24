// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { serviceKey } from '../../app/contracts/module';

/** What an icon is attached to. `key` is a vault path (file/folder), a tag without `#`, or a property name. */
export interface IconTarget {
	kind: 'file' | 'folder' | 'tag' | 'property';
	key: string;
}

/**
 * The icon and color the rule book gives a target (rules win over per-item icons).
 * `icon` is a Lucide icon id (for `setIcon`) or an emoji; `color` is a CSS color ready for `style.color`.
 * Files and folders with neither get the default file-type icon (`isDefault`) while "show default file type icons" is on.
 */
export interface ResolvedIcon {
	icon: string | null;
	emoji: boolean;
	color: string | null;
	/** True when the icon comes from the default file-type table rather than a rule or a per-item choice. */
	isDefault?: boolean;
}

/** Icon lookup for other modules (service `icons.resolve`), available while the icons module is active. */
export interface IconsService {
	resolve(target: IconTarget): ResolvedIcon;
	/** Runs after any icon, color or rule change; returns the unsubscribe function. */
	subscribe(listener: () => void): () => void;
}

export const ICONS_SERVICE = serviceKey<IconsService>('icons', 'resolve');

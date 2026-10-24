// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { Hash, Tag } from 'lucide-react';
import { ObsidianIcon } from '../../../ui/components/huhu/ObsidianIcon';
import { defaultFileIcon, defaultFolderIcon, lucideIconId } from '../../../shared/file-type-icons';
import type { IconTarget } from '../../icons/api';
import type { NavigatorEnv } from './env';

const ICON = 'size-4 shrink-0';

/**
 * Folder, tag or file icon: the icons module's rule-book icon when it has one, otherwise the default file-type icon.
 * The shared table decides the default (also while the icons module is off), so the navigator and the file list agree.
 */
export function EntryIcon({ env, target, open, version }: { env: NavigatorEnv; target: IconTarget; open?: boolean; version: number }) {
	void version;
	const resolved = env.resolveIcon(target);
	const style = resolved.color ? { color: resolved.color } : undefined;
	// The service's default (`isDefault`) is the same table as below, except that the folder here knows whether it is open.
	const custom = resolved.icon && !resolved.isDefault;
	if (custom && resolved.emoji) {
		return <span aria-hidden className="inline-flex size-4 shrink-0 items-center justify-center text-[13px] leading-none" style={style}>{resolved.icon}</span>;
	}
	if (custom && resolved.icon) return <span className="inline-flex shrink-0" style={style}><ObsidianIcon name={resolved.icon} className={ICON} /></span>;
	const tone = resolved.color ? undefined : 'text-muted-foreground';
	switch (target.kind) {
		case 'folder':
		case 'file': {
			// A custom color without a custom icon recolors the default icon; otherwise the default's own color applies.
			const fallback = target.kind === 'folder' ? defaultFolderIcon(target.key, !!open) : defaultFileIcon(target.key);
			const color = resolved.color ?? fallback.color;
			return (
				<span className={`inline-flex shrink-0 ${color ? '' : 'text-muted-foreground'}`} style={color ? { color } : undefined}>
					<ObsidianIcon name={lucideIconId(fallback.icon)} className={ICON} />
				</span>
			);
		}
		case 'tag':
			return <Hash className={`${ICON} ${tone ?? ''}`} style={style} aria-hidden />;
		default:
			return <Tag className={`${ICON} ${tone ?? ''}`} style={style} aria-hidden />;
	}
}

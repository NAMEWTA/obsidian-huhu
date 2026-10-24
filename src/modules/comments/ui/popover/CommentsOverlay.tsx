// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/ui/thread-popover.ts
import { createRoot } from 'react-dom/client';
import type { OverlayChannel } from '../../services/overlay';
import { HuhuProviders } from '../../../../ui/react/providers';
import { acquirePortalRoot, releasePortalRoot } from '../../../../ui/react/portal';
import type { CommentsEnv } from '../env';
import { CommentPopover } from './CommentPopover';
export function mountCommentsOverlay(doc: Document, channel: OverlayChannel, env: CommentsEnv) {
	const container = acquirePortalRoot(doc).createDiv({ cls: 'huhu-comments-overlay-root' });
	const root = createRoot(container);
	root.render(<HuhuProviders ownerDocument={doc}><CommentPopover env={env} channel={channel} /></HuhuProviders>);
	return () => { root.unmount(); container.remove(); releasePortalRoot(doc); };
}

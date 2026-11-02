import type { BrowserWorkspace } from '../api';
import { SpaceViewer } from './SpaceViewer';

export function renderBrowserViewer(api: BrowserWorkspace, target: { spaceId: string; pageId: string }) {
	return <SpaceViewer api={api} spaceId={target.spaceId} pageId={target.pageId} />;
}

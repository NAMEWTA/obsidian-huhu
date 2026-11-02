import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../../ui/react/providers';
import type { CommentsEnv } from '../env';
import { CommentsPanel } from './CommentsPanel';
import type { EditorContextAccess } from '../../../../app/contracts/editor-context';
export function mountCommentsPanel(container: HTMLElement, env: CommentsEnv, documents?: EditorContextAccess) {
	container.addClass('huhu-ui');
	const root = createRoot(container);
	root.render(<ContainerProviders container={container}><CommentsPanel env={env} documents={documents} container={container} /></ContainerProviders>);
	return () => { root.unmount(); container.removeClass('huhu-ui'); };
}

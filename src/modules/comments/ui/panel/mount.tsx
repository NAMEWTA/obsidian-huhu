import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../../ui/react/providers';
import type { CommentsEnv } from '../env';
import { CommentsPanel } from './CommentsPanel';
import type { EditorContextAccess, EditorPanelHandle } from '../../../../app/contracts/editor-context';
export function mountCommentsPanel(container: HTMLElement, env: CommentsEnv, documents: EditorContextAccess, initialVisible: boolean): EditorPanelHandle {
	container.addClass('huhu-ui');
	const root = createRoot(container);
	let visible = initialVisible, disposed = false;
	const render = () => root.render(<ContainerProviders container={container} visible={visible}><CommentsPanel env={env} documents={documents} container={container} /></ContainerProviders>);
	render();
	return {
		setVisible(next) { if (disposed || next === visible) return; visible = next; render(); },
		dispose() { if (disposed) return; disposed = true; root.unmount(); container.removeClass('huhu-ui'); },
	};
}

import '../i18n';
import type { EditorPanelHandle } from '../../../../app/contracts/editor-context';
import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../../ui/react/providers';
import { NoteHistoryPanel, type NoteHistoryHost } from './NoteHistoryPanel';

export function mountNoteHistoryPanel(container: HTMLElement, host: NoteHistoryHost, initialVisible: boolean): EditorPanelHandle {
	container.addClass('huhu-ui');
	const root = createRoot(container);
	let visible = initialVisible, disposed = false;
	const render = () => root.render(
		<ContainerProviders container={container} visible={visible}>
			<NoteHistoryPanel host={host} />
		</ContainerProviders>,
	);
	render();
	return {
		setVisible(next) { if (disposed || visible === next) return; visible = next; render(); },
		dispose() { if (disposed) return; disposed = true; root.unmount(); container.removeClass('huhu-ui'); },
	};
}

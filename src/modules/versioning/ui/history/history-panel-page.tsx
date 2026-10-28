import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../../ui/react/providers';
import { NoteHistoryPanel, type NoteHistoryHost } from './NoteHistoryPanel';

export function mountNoteHistoryPanel(container: HTMLElement, host: NoteHistoryHost): () => void {
	container.addClass('huhu-ui');
	const root = createRoot(container);
	root.render(
		<ContainerProviders container={container}>
			<NoteHistoryPanel host={host} />
		</ContainerProviders>,
	);
	return () => {
		root.unmount();
		container.removeClass('huhu-ui');
	};
}

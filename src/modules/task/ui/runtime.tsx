import { createRoot } from 'react-dom/client';
import type { TaskResources, TaskService, TaskViews } from '../api';
import { openReactDialog } from '../../../ui/react/dialog';
import { ContainerProviders } from '../../../ui/react/providers';
import { t } from '../../../shared/i18n';
import { TaskEditor } from './TaskEditor';
import { TaskPage } from './TaskPage';
export function mountTasks(
	host: HTMLElement,
	tasks: TaskService,
	resources: TaskResources,
	views: TaskViews,
	compact = false,
): () => void {
	const root = createRoot(host);
	let closed = false;
	root.render(
		<ContainerProviders container={host}>
			<TaskPage tasks={tasks} resources={resources} views={views} compact={compact} />
		</ContainerProviders>,
	);
	return () => {
		if (closed) return;
		closed = true;
		root.unmount();
	};
}
export function editTask(
	request: Parameters<TaskViews['edit']>[0],
	tasks: TaskService,
	resources: TaskResources,
	signal: AbortSignal,
): Promise<void> {
	if (signal.aborted) return Promise.resolve();
	return new Promise((resolve) => {
		const controller = new AbortController();
		const dialog = openReactDialog(request.owner, {
			title: t(request.id ? 'task.edit' : 'task.new'),
			className: 'sm:max-w-2xl',
			content: (close) => (
				<TaskEditor
					tasks={tasks}
					resources={resources}
					id={request.id}
					initial={request.draft}
					close={close}
					onSaved={request.onSaved}
					signal={controller.signal}
				/>
			),
			onClose: () => {
				controller.abort();
				signal.removeEventListener('abort', abort);
				resolve();
			},
		});
		const abort = () => {
			controller.abort();
			dialog.close();
		};
		signal.addEventListener('abort', abort, { once: true });
		if (signal.aborted) abort();
	});
}

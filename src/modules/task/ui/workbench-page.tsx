import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import type { TaskService, TaskResources, TaskViews } from '../api';
import { ReactSurface } from '../../../ui/react/surface';
import { t } from '../../../shared/i18n';
import { TaskPage } from './TaskPage';
class TaskPresentation extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private tasks: TaskService,
		private resources: TaskResources,
		private views: TaskViews,
		private selected?: string,
	) {
		super(context);
	}
	getViewType() {
		return 'huhu-task-surface';
	}
	getDisplayText() {
		return t('task.title');
	}
	getIcon() {
		return 'list-checks';
	}
	select(id?: string) {
		this.selected = id;
		this.rerender();
	}
	protected renderContent() {
		return <TaskPage tasks={this.tasks} resources={this.resources} views={this.views} selectedId={this.selected} />;
	}
}
export const taskPage =
	(tasks: TaskService, resources: TaskResources, views: TaskViews): PageCreate =>
	async (context, target) => {
		const surface = new TaskPresentation(context, tasks, resources, views, target.resourceId);
		return {
			surface,
			getTarget: () => target,
			navigate: async (next) => {
				target = next;
				surface.select(next.resourceId);
			},
		};
	};

/** Lazy presentation entry used by the shell and compact consumers. */
export { editTask, mountTasks } from './runtime';

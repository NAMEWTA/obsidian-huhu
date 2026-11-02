import type { PageCreate } from '../../../../app/contracts/workbench-host';
import { ReactSurface } from '../../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { t } from '../../../../shared/i18n';
import { createElement } from 'react';
import type { BotTaskHost } from './TasksPage';
import { TasksPage } from './TasksPage';

export class TasksSurface extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly host: BotTaskHost,
		private runId?: string,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-bot-tasks';
	}
	getDisplayText(): string {
		return t('huhubot.tasks.title');
	}
	getIcon(): string {
		return 'list-tree';
	}
	navigate(id?: string): void {
		this.runId = id;
		this.rerender();
	}
	override getState(): Record<string, unknown> {
		return this.runId ? { runId: this.runId } : {};
	}
	protected renderContent() {
		return createElement(TasksPage, { key: this.runId ?? 'list', host: this.host, runId: this.runId });
	}
}
export const createTasksPage =
	(host: BotTaskHost): PageCreate =>
	async (context, target, state, signal) => {
		if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
		const runId = typeof state.runId === 'string' ? state.runId : target.resourceId;
		const surface = new TasksSurface(context, host, runId);
		return {
			surface,
			getTarget: () => target,
			getState: () => surface.getState(),
			navigate: async (next) => {
				if (next.resourceId) surface.navigate(next.resourceId);
			},
		};
	};
